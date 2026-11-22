// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between menu, playing,
// paused, busted and finished screens.
//
// ?seed=N fixes the city and traffic. ?shot=chase|city|mission|police (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.
import { CLOCK, MISSIONS, PALETTE, PLAYER, STEP, WORLD } from './config.js';
import { createRandom } from './random.js';
import { buildCity } from './city.js';
import { createTraffic, nearestStealable, updateTraffic } from './traffic.js';
import { createPlayer, tryPunch, updateOnFoot } from './player.js';
import { driveCar, syncCarMesh } from './vehicles.js';
import { addWanted, createPolice, nearestPolice, updatePolice } from './police.js';
import { createMissions, currentMission, placeBeacon, updateMissions } from './missions.js';
import { createHud, drawMinimap, updateHud } from './hud.js';
import { createAudio } from './audio.js';
import { clearSave, loadSave, storeSave } from './save.js';
import { stageShot } from './shots.js';

const THREE = window.THREE;
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const hud = createHud();
const audio = createAudio();

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.sky);
scene.fog = new THREE.Fog(PALETTE.fog, 180, 520);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
scene.add(new THREE.HemisphereLight(0xcfe5ff, 0x5d6b52, 1.05));
const sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
sun.position.set(120, 190, 60);
scene.add(sun);

const G = {
  scene, camera, renderer, hud, audio,
  rng: createRandom(seed),
  city: null, traffic: null, player: null, police: null, missions: null,
  state: 'menu',
  money: 0,
  elapsed: 0,
  cameraYaw: Math.PI,
  cameraPitch: 0.32,
  camTarget: new THREE.Vector3(0, 4, 70),
  shotTimer: 0,
  keys: {},
  drag: null,
};

function announce(message) {
  status.textContent = message;
}

// (Re)build the whole world from a seed: city, traffic, player, police,
// missions. Shot mode calls this fresh; the normal game calls it once.
G.buildWorld = function buildWorld(worldSeed) {
  if (G.worldGroup) {
    scene.remove(G.worldGroup);
  }
  G.worldGroup = new THREE.Group();
  scene.add(G.worldGroup);
  G.rng = createRandom(worldSeed);
  G.city = buildCity(G.worldGroup, G.rng);
  G.traffic = createTraffic(G.worldGroup, G.rng, G.city);
  G.player = createPlayer(G.worldGroup);
  G.police = createPolice(G.worldGroup);
  G.missions = createMissions(G.worldGroup);
  G.missions.index = 0;
  placeBeacon(G.missions);
  G.money = 0;
  G.elapsed = 0;
  G.shotTimer = 0;
  G.cameraYaw = Math.PI;
  G.camTarget.set(0, 4, 70);
};

G.addWanted = function addWantedLevel(amount) {
  addWanted(G.police, amount);
};

function enterCar() {
  const player = G.player;
  if (player.inCar) {
    const car = player.inCar;
    player.inCar = null;
    player.x = car.x - Math.cos(car.heading) * 3.4;
    player.z = car.z + Math.sin(car.heading) * 3.4;
    player.heading = car.heading;
    player.mesh.visible = true;
    player.mesh.position.set(player.x, 0, player.z);
    announce('Keluar dari mobil.');
    return;
  }
  const car = nearestStealable(G.traffic, player.x, player.z, 5.5);
  if (!car) {
    announce('Tidak ada mobil di dekat sini.');
    return;
  }
  const fromParked = G.traffic.parked.indexOf(car);
  if (fromParked !== -1) G.traffic.parked.splice(fromParked, 1);
  const fromTraffic = G.traffic.cars.indexOf(car);
  if (fromTraffic !== -1) G.traffic.cars.splice(fromTraffic, 1);
  car.kind = 'player';
  player.inCar = car;
  player.mesh.visible = false;
  player.x = car.x;
  player.z = car.z;
  G.addWanted(1);
  audio.blip(520);
  announce('Mobil dicuri! Polisi mengejarmu.');
}

function punch() {
  const player = G.player;
  if (player.inCar) return;
  const targets = [...G.traffic.peds, ...G.police.officers];
  const hit = tryPunch(player, targets);
  if (!hit) return;
  audio.thud();
  if (hit.mesh && G.police.officers.includes(hit)) {
    hit.x -= Math.sin(player.heading) * 3;
    hit.z -= Math.cos(player.heading) * 3;
    hit.stun = 1.2;
    G.addWanted(1);
    announce('Kau memukul polisi! Bintang naik.');
    return;
  }
  // A pedestrian goes down: they get up far away, and witnesses call it in.
  const lines = G.city.roadLines;
  hit.x = lines[Math.floor(G.rng() * lines.length)] + 9.5;
  hit.z = (G.rng() - 0.5) * WORLD.half * 2;
  if (nearestPolice(G.police, player.x, player.z) < 45) {
    G.addWanted(1);
    announce('Saksi melihatmu memukul pejalan kaki!');
  }
}

// One fixed step of the whole simulation.
G.stepWorld = function stepWorld(dt, input) {
  const player = G.player;
  if (player.inCar) {
    driveCar(player.inCar, input, dt, G.city.collide);
    player.x = player.inCar.x;
    player.z = player.inCar.z;
    player.heading = player.inCar.heading;
    // Bump traffic cars aside instead of passing through them.
    for (const car of G.traffic.cars) {
      const d = Math.hypot(car.x - player.x, car.z - player.z);
      if (d < 4.4 && d > 0.01) {
        const push = (4.4 - d) * 0.5;
        car.x += ((car.x - player.x) / d) * push;
        car.z += ((car.z - player.z) / d) * push;
        player.inCar.speed *= 0.82;
        syncCarMesh(car);
      }
    }
    // Running over a pedestrian: they scatter, and it draws heat.
    for (const ped of G.traffic.peds) {
      if (Math.hypot(ped.x - player.x, ped.z - player.z) < 2.6) {
        ped.x += (G.rng() - 0.5) * 30;
        ped.z += (G.rng() - 0.5) * 30;
        player.inCar.speed *= 0.7;
        G.addWanted(1);
      }
    }
  } else {
    updateOnFoot(player, input, G.cameraYaw, dt, G.city.collide);
  }

  updateTraffic(G.traffic, dt, G.rng, G.city);
  const copInfo = updatePolice(G.police, dt, G.rng, player, G.city.collide);

  // Police ramming and, at 3+ stars, shooting hurt.
  if (G.police.wanted > 0) {
    for (const car of G.police.cars) {
      if (Math.hypot(car.x - player.x, car.z - player.z) < 3.6) {
        player.health -= 14 * dt;
        if (player.inCar) player.inCar.speed *= 0.94;
      }
    }
    if (G.police.wanted >= 3 && copInfo.nearestCop < 48) {
      G.shotTimer -= dt;
      if (G.shotTimer <= 0) {
        G.shotTimer = 1.15;
        player.health -= 7;
        audio.shot();
      }
    }
  }
  for (const officer of G.police.officers) {
    if (officer.stun > 0) {
      officer.stun -= dt;
      continue;
    }
    if (Math.hypot(officer.x - player.x, officer.z - player.z) < 2.2) {
      player.health -= 10 * dt;
    }
  }
  if (G.police.wanted === 0 && player.health < PLAYER.maxHealth) {
    player.health = Math.min(PLAYER.maxHealth, player.health + 3 * dt);
  }

  const reward = updateMissions(G.missions, player, dt);
  if (reward > 0) {
    G.money += reward;
    audio.blip(880);
    storeSave({ money: G.money, mission: G.missions.index, best: G.best || 0 });
    if (G.missions.done) {
      hud.done.style.display = 'flex';
      announce('Semua misi selesai! Utang lunas.');
    }
  }

  G.elapsed += dt;
  if (player.health <= 0) {
    G.state = 'busted';
    player.health = PLAYER.maxHealth;
    G.money = Math.max(0, G.money - 100);
    G.police.wanted = 0;
    G.police.quietTimer = 0;
    if (player.inCar) {
      player.inCar.kind = 'parked';
      G.traffic.parked.push(player.inCar);
      player.inCar = null;
      player.mesh.visible = true;
    }
    player.x = 0;
    player.z = 112;
    player.mesh.position.set(player.x, 0, player.z);
    hud.busted.style.display = 'flex';
    announce('Tertangkap! Denda $100.');
    storeSave({ money: G.money, mission: G.missions.index, best: G.best || 0 });
  }
};

function updateCamera(dt, snap) {
  const player = G.player;
  const dist = player.inCar ? 13.5 : 8.5;
  const height = player.inCar ? 6.4 : 5;
  // Ease the orbit yaw behind a driven car; on foot it stays where dragged.
  if (player.inCar) {
    let diff = player.heading - G.cameraYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    G.cameraYaw += diff * Math.min(1, dt * 1.6);
  }
  const cx = player.x - Math.sin(G.cameraYaw) * dist;
  const cz = player.z - Math.cos(G.cameraYaw) * dist;
  const desired = new THREE.Vector3(cx, height, cz);
  if (snap) G.camTarget.copy(desired);
  else G.camTarget.lerp(desired, 1 - Math.exp(-6 * dt));
  camera.position.copy(G.camTarget);
  camera.position.y = height + Math.sin(G.cameraPitch) * 2;
  camera.lookAt(player.x, 2.2, player.z);
}

G.snapCamera = function snapCamera() {
  updateCamera(1, true);
};

G.renderFrame = function renderFrame() {
  const player = G.player;
  const mission = currentMission(G.missions);
  updateHud(hud, {
    health: player.health,
    money: G.money,
    wanted: G.police.wanted,
    speed: player.inCar ? player.inCar.speed : 0,
    missionIndex: G.missions.index,
    dialog: G.missions.dialog,
    toast: G.missions.toastTimer > 0 ? G.missions.toast : '',
    elapsed: G.elapsed,
    inCar: !!player.inCar,
  });
  drawMinimap(hud, {
    buildings: G.city.buildings,
    trafficCars: G.traffic.cars,
    policeDots: [...G.police.cars, ...G.police.officers],
    playerX: player.x,
    playerZ: player.z,
    playerHeading: player.heading,
    missionTarget: mission ? mission.target : null,
  });
  renderer.render(scene, camera);
};

function readInput() {
  const k = G.keys;
  return {
    forward: !!(k.KeyW || k.ArrowUp),
    back: !!(k.KeyS || k.ArrowDown),
    left: !!(k.KeyA || k.ArrowLeft),
    right: !!(k.KeyD || k.ArrowRight),
    run: !!(k.ShiftLeft || k.ShiftRight),
    throttle: (k.KeyW || k.ArrowUp ? 1 : 0) + (k.KeyS || k.ArrowDown ? -1 : 0),
    steer: (k.KeyA || k.ArrowLeft ? -1 : 0) + (k.KeyD || k.ArrowRight ? 1 : 0),
    handbrake: !!k.Space,
  };
}

function runShot(name) {
  G.best = 0;
  stageShot(name, G);
  let painted = 0;
  function paint() {
    G.renderFrame();
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  G.buildWorld(seed);
  const saved = loadSave();
  G.best = saved ? saved.best : 0;
  if (saved && (saved.money > 0 || saved.mission > 0)) {
    hud.btnContinue.style.display = 'inline-block';
  } else {
    hud.btnContinue.style.display = 'none';
  }
  let accumulator = 0;
  let last = performance.now();

  function startGame(fromSave) {
    audio.ensure();
    if (fromSave && saved) {
      G.money = saved.money;
      G.missions.index = Math.min(saved.mission, MISSIONS.length - 1);
      placeBeacon(G.missions);
    } else {
      clearSave();
      G.money = 0;
      G.missions.index = 0;
      placeBeacon(G.missions);
    }
    hud.menu.style.display = 'none';
    hud.done.style.display = 'none';
    G.state = 'playing';
    announce('Solmar. Ikuti penanda misi kuning.');
  }

  hud.btnContinue.addEventListener('click', () => startGame(true));
  hud.btnNew.addEventListener('click', () => startGame(false));
  hud.btnRetry.addEventListener('click', () => {
    hud.busted.style.display = 'none';
    G.state = 'playing';
    announce('Bebas lagi. Hati-hati di jalan.');
  });
  hud.btnAgain.addEventListener('click', () => {
    hud.done.style.display = 'none';
    G.state = 'playing';
  });

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') event.preventDefault();
    G.keys[event.code] = true;
    audio.ensure();
    if (event.code === 'KeyE' && G.state === 'playing') enterCar();
    if ((event.code === 'KeyF') && G.state === 'playing') punch();
    if (event.code === 'KeyP' && (G.state === 'playing' || G.state === 'paused')) {
      G.state = G.state === 'playing' ? 'paused' : 'playing';
      hud.paused.style.display = G.state === 'paused' ? 'flex' : 'none';
    }
    if (event.code === 'Enter' && G.state === 'menu') startGame(false);
  });
  window.addEventListener('keyup', (event) => {
    G.keys[event.code] = false;
  });
  let downAt = null;
  canvas.addEventListener('pointerdown', (event) => {
    downAt = { x: event.clientX, y: event.clientY };
    G.drag = { x: event.clientX, y: event.clientY, moved: 0 };
  });
  window.addEventListener('pointermove', (event) => {
    if (!G.drag) return;
    const dx = event.clientX - G.drag.x;
    const dy = event.clientY - G.drag.y;
    G.drag.x = event.clientX;
    G.drag.y = event.clientY;
    G.drag.moved += Math.abs(dx) + Math.abs(dy);
    G.cameraYaw -= dx * 0.005;
    G.cameraPitch = Math.max(-0.1, Math.min(0.7, G.cameraPitch + dy * 0.003));
  });
  window.addEventListener('pointerup', (event) => {
    if (G.drag && G.drag.moved < 6 && G.state === 'playing') punch();
    G.drag = null;
    downAt = null;
  });
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.state === 'playing') {
      G.state = 'paused';
      hud.paused.style.display = 'flex';
    }
  });

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    if (G.state === 'playing') {
      while (accumulator >= STEP) {
        G.stepWorld(STEP, readInput());
        accumulator -= STEP;
        if (G.state !== 'playing') break;
      }
      updateCamera(STEP, false);
    } else if (G.state === 'menu') {
      // Slow orbit around downtown behind the title screen.
      const t = now * 0.00004;
      camera.position.set(Math.sin(t) * 150, 70, Math.cos(t) * 150);
      camera.lookAt(0, 0, 0);
      updateTraffic(G.traffic, STEP, G.rng, G.city);
    }
    audio.engine(G.player.inCar ? Math.abs(G.player.inCar.speed) / 40 : 0, !!G.player.inCar);
    audio.siren(G.police.wanted > 0 && G.state === 'playing');
    G.renderFrame();
  }

  announce('Solmar. Tekan Enter atau pilih New Game untuk mulai.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
