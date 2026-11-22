// SOLMAR — main loop: builds the world, reads the input, and ties every
// system together (player, cars, traffic, police, missions, HUD, audio,
// save). One file, one job: orchestration. Everything else lives in its
// own module.

import { CFG, MONEY, PLAYER, WANTED } from './config.js';
import { makeRng } from './random.js';
import { buildCity } from './city.js';
import { createPlayer } from './player.js';
import { makeCar } from './vehicles.js';
import { createTraffic, createPedestrians } from './traffic.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { loadSave, writeSave, clearSave } from './save.js';
import { getShotName, applyShot } from './shots.js';

const errBox = document.getElementById('err');
window.addEventListener('error', (e) => {
  errBox.style.display = 'block';
  errBox.textContent += `${e.message}\n`;
});

const rng = makeRng(CFG.seed);
const shotName = getShotName();
const shotMode = shotName !== null;

// --- renderer / scene -------------------------------------------------------
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b5e0);
scene.fog = new THREE.Fog(0x9fc3e2, 130, 560);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1000);

const hemi = new THREE.HemisphereLight(0xbfd9ff, 0x8a7a5a, 0.95);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe8c0, 1.7);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -170;
sun.shadow.camera.right = 170;
sun.shadow.camera.top = 170;
sun.shadow.camera.bottom = -170;
sun.shadow.camera.far = 600;
sun.shadow.bias = -0.0006;
scene.add(sun);
scene.add(sun.target);

const tracerGroup = new THREE.Group();
scene.add(tracerGroup);

// --- world ------------------------------------------------------------------
const city = buildCity(scene, rng);
const colliders = city.colliders;
const player = createPlayer(scene);
const audio = createAudio();
const hud = createHud();
const police = createPolice(scene, rng, colliders);
const traffic = createTraffic(scene, rng, colliders, 14);
const peds = createPedestrians(scene, rng, 26);

// parked cars to steal — the red one by the kerb is Rio's usual ride
const parkedSpots = [
  { x: 10, z: -60, heading: 0, color: 0xc22e2e },
  { x: -10, z: 40, heading: Math.PI, color: 0x2e5fa3 },
  { x: 80, z: -10, heading: Math.PI / 2, color: 0xe8e8e8 },
  { x: -80, z: 10, heading: -Math.PI / 2, color: 0xd8a020 },
  { x: 150, z: 60, heading: 0, color: 0x3a7d44 },
  { x: -150, z: -140, heading: Math.PI, color: 0x222831 },
];
const parkedCars = parkedSpots.map((s) => {
  const car = makeCar(scene, { color: s.color, x: s.x, z: s.z, heading: s.heading });
  car.driver = null;
  return car;
});

// --- game state ---------------------------------------------------------------
const save = loadSave();
let money = save ? save.money : MONEY.start;
let missionIndex = save ? save.missionIndex : 0;
let state = 'menu'; // menu | playing | paused | busted
let playerCar = null;
let clockMinutes = 9 * 60 + 41;
let camYaw = 0;
let camPitch = 0.42;
let camDist = 11;
let lastNeedCarAt = -99;
let time = 0;
let framesRendered = 0;

const missions = createMissions(scene, (ev) => {
  if (ev.type === 'brief') {
    hud.showBanner(ev.mission.brief, 6);
    if (ev.mission.id === 'pickup') spawnFriendPed();
  }
  else if (ev.type === 'complete') {
    money += ev.mission.reward;
    missionIndex += 1;
    hud.showToast(`JOB DONE  +$${ev.mission.reward}`, 3);
    hud.showBanner(ev.mission.done, 5);
    audio.jingle();
    writeSave({ money, missionIndex });
  } else if (ev.type === 'need-car') {
    if (time - lastNeedCarAt > 4) {
      lastNeedCarAt = time;
      hud.showBanner('This job needs a car — press E near one.', 3);
    }
  } else if (ev.type === 'picked-up') {
    hud.showBanner('Marisol: "Drive! They are right behind us!"', 4);
    removeFriendPed();
  } else if (ev.type === 'checkpoint') {
    hud.showToast(`CHECKPOINT ${ev.at}/${ev.of}`, 2);
    audio.pickup();
  } else if (ev.type === 'failed') {
    hud.showBanner('Out of time — Kestrel restarts the job.', 4);
    audio.fail();
  } else if (ev.type === 'story-done') {
    hud.showBanner('DEBT PAID. Solmar is yours now, Rio.', 8);
    audio.jingle();
    writeSave({ money, missionIndex });
  }
});
missions.resetTo(missionIndex);

// Marisol, waiting on the boulevard for mission 3
let friendPed = null;
function spawnFriendPed() {
  if (friendPed) return;
  const g = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: 0x2aff66 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xc98d5f });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.42), shirt);
  body.position.y = 1.05; body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), skin);
  head.position.y = 1.8;
  g.add(body, head);
  g.position.set(-70, 0, 236);
  scene.add(g);
  friendPed = g;
}
function removeFriendPed() {
  if (!friendPed) return;
  scene.remove(friendPed);
  friendPed = null;
}

// --- world controls used by screenshot staging -------------------------------
const world = {
  shots: { redCar: parkedCars[0], blueCar: parkedCars[1] },
  shotCamera: null,
  placePlayerOnFoot(x, z, heading) {
    exitCar(true);
    player.resetTo(x, z, heading);
    camYaw = heading + Math.PI;
  },
  placePlayerInCar(car, x, z, heading, speed = 0) {
    exitCar(true);
    car.pos.set(x, 0, z);
    car.heading = heading;
    car.speed = speed;
    car.group.position.copy(car.pos);
    car.group.rotation.y = heading;
    car.driver = 'player';
    playerCar = car;
    player.group.visible = false;
    player.pos.set(x, 0, z);
    camYaw = heading + Math.PI;
  },
  setWanted(stars) {
    police.addCrime(stars * 20, time);
  },
  spawnPoliceCar(x, z, heading) { police.placePatrol(x, z, heading); },
  spawnCop(x, z) { police.placeCop(x, z); },
  setMission(index) {
    missions.resetTo(index);
    missions.start();
    if (index === 2) spawnFriendPed();
  },
  setClock(minutes) { clockMinutes = minutes; },
};

// --- input --------------------------------------------------------------------
const keys = {};
let dragging = false;
let lastMouse = { x: 0, y: 0 };
let mouseMoved = 0;

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') e.preventDefault();
  if (keys[e.code]) return;
  keys[e.code] = true;
  if (e.code === 'KeyE' && state === 'playing') toggleCar();
  if (e.code === 'KeyF' && state === 'playing' && !playerCar) doPunch();
  if (e.code === 'KeyM') audio.setMuted(!audio.muted);
  if (e.code === 'Escape') {
    if (state === 'playing') pauseGame();
    else if (state === 'paused') resumeGame();
  }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
renderer.domElement.addEventListener('pointerdown', (e) => {
  dragging = true;
  mouseMoved = 0;
  lastMouse = { x: e.clientX, y: e.clientY };
  audio.ensure();
});
window.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const dx = e.clientX - lastMouse.x;
  const dy = e.clientY - lastMouse.y;
  mouseMoved += Math.abs(dx) + Math.abs(dy);
  lastMouse = { x: e.clientX, y: e.clientY };
  camYaw -= dx * 0.005;
  camPitch = Math.max(0.08, Math.min(1.2, camPitch + dy * 0.004));
});
window.addEventListener('pointerup', (e) => {
  if (dragging && mouseMoved < 6 && state === 'playing' && !playerCar) doPunch();
  dragging = false;
});
renderer.domElement.addEventListener('wheel', (e) => {
  e.preventDefault();
  camDist = Math.max(6, Math.min(18, camDist + Math.sign(e.deltaY)));
}, { passive: false });
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- menu / pause / busted ------------------------------------------------------
const menuEl = document.getElementById('menu');
const pauseEl = document.getElementById('pause');
const bustedEl = document.getElementById('busted');
document.getElementById('btnContinue').style.display = save ? 'inline-block' : 'none';
document.getElementById('btnNew').addEventListener('click', () => {
  clearSave();
  money = MONEY.start;
  missionIndex = 0;
  missions.resetTo(0);
  player.resetTo(0, 30, Math.PI);
  police.clear();
  startPlaying();
});
document.getElementById('btnContinue').addEventListener('click', () => {
  missions.resetTo(missionIndex);
  player.resetTo(0, 30, Math.PI);
  startPlaying();
});
document.getElementById('btnResume').addEventListener('click', resumeGame);
document.getElementById('btnQuit').addEventListener('click', () => {
  state = 'menu';
  pauseEl.classList.add('hidden');
  menuEl.classList.remove('hidden');
  hud.hide();
});
document.getElementById('btnBusted').addEventListener('click', () => {
  bustedEl.classList.add('hidden');
  player.resetTo(city.places.hospital.x, city.places.hospital.z, Math.PI);
  state = 'playing';
});

function startPlaying() {
  menuEl.classList.add('hidden');
  pauseEl.classList.add('hidden');
  hud.show();
  state = 'playing';
  missions.start();
  audio.ensure();
}
function pauseGame() {
  state = 'paused';
  pauseEl.classList.remove('hidden');
}
function resumeGame() {
  state = 'playing';
  pauseEl.classList.add('hidden');
}

function bustPlayer(reason) {
  if (state !== 'playing') return;
  const lost = Math.floor(money * WANTED_BUSTED_CUT);
  money -= lost;
  document.getElementById('bustedText').textContent =
    `The Solmar police dragged you in (${reason}). Madame Kestrel took her cut: -$${lost}.`;
  police.clear();
  exitCar(true);
  player.resetTo(city.places.hospital.x, city.places.hospital.z, Math.PI);
  state = 'busted';
  bustedEl.classList.remove('hidden');
  writeSave({ money, missionIndex });
}
const WANTED_BUSTED_CUT = 0.2;

// --- car enter / exit -----------------------------------------------------------
function nearestCar(maxDist) {
  let best = null;
  let bd = maxDist;
  const all = [...parkedCars, ...traffic.cars];
  for (const car of all) {
    if (car.driver === 'player') continue;
    const d = Math.hypot(car.pos.x - player.pos.x, car.pos.z - player.pos.z);
    if (d < bd) { bd = d; best = car; }
  }
  return best;
}

function toggleCar() {
  if (playerCar) { exitCar(); return; }
  const car = nearestCar(4);
  if (!car) return;
  if (!car.stolen) {
    car.stolen = true;
    police.addCrime(35, time); // taking a car that is not yours
    hud.showToast('CAR STOLEN — the law noticed', 2);
  }
  if (car.driver === 'npc') {
    const i = traffic.cars.indexOf(car);
    if (i >= 0) traffic.cars.splice(i, 1);
  }
  car.driver = 'player';
  playerCar = car;
  player.group.visible = false;
  audio.pickup();
}

function exitCar(silent = false) {
  if (!playerCar) return;
  const car = playerCar;
  car.driver = null;
  playerCar = null;
  const side = 2.6;
  player.resetTo(car.pos.x + Math.cos(car.heading) * side, car.pos.z - Math.sin(car.heading) * side, car.heading, false);
  player.group.visible = true;
  if (!silent) audio.pickup();
}

// --- combat ---------------------------------------------------------------------
function doPunch() {
  if (!player.tryPunch(time)) return;
  audio.punch();
  const fx = Math.sin(player.heading);
  const fz = Math.cos(player.heading);
  // pedestrians in front, within reach, get knocked down and run
  for (const p of peds.peds) {
    const dx = p.pos.x - player.pos.x;
    const dz = p.pos.z - player.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < PLAYER.punchRange && (dx * fx + dz * fz) / (d || 1) > 0.2) {
      p.pos.x += (dx / (d || 1)) * 4;
      p.pos.z += (dz / (d || 1)) * 4;
      p.fleeing = true;
      p.fleeUntil = time + 4;
      police.addCrime(WANTED.hitPedHeat, time);
      break;
    }
  }
  // a cop in front gets shoved back — and remembers it
  for (const cop of police.cops) {
    const dx = cop.pos.x - player.pos.x;
    const dz = cop.pos.z - player.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < PLAYER.punchRange + 0.4) {
      cop.pos.x += (dx / (d || 1)) * 3;
      cop.pos.z += (dz / (d || 1)) * 3;
      cop.grabAt = -99;
      police.addCrime(WANTED.punchCopHeat, time);
      break;
    }
  }
}

// --- per-frame update -------------------------------------------------------------
function updatePlaying(dt) {
  clockMinutes += dt * 0.5;
  const fwdKey = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
  const rightKey = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);

  if (playerCar) {
    playerCar.drive(dt, {
      forward: fwdKey,
      right: rightKey,
      handbrake: !!keys.Space,
    }, colliders);
    player.pos.set(playerCar.pos.x, 0, playerCar.pos.z);
    // running a pedestrian over is a crime, and the pedestrian flees
    for (const p of peds.peds) {
      const d = Math.hypot(p.pos.x - playerCar.pos.x, p.pos.z - playerCar.pos.z);
      if (d < 2.4 && Math.abs(playerCar.speed) > 6 && time - (p.lastHitAt || -99) > 2) {
        p.lastHitAt = time;
        p.fleeing = true;
        p.fleeUntil = time + 4;
        p.pos.x += (p.pos.x - playerCar.pos.x) * 0.8;
        p.pos.z += (p.pos.z - playerCar.pos.z) * 0.8;
        police.addCrime(WANTED.hitPedHeat, time);
        audio.punch();
      }
    }
  } else {
    // camera-relative movement on foot
    const fx = Math.sin(camYaw);
    const fz = Math.cos(camYaw);
    const fwdX = -fx;
    const fwdZ = -fz;
    const rightX = -fwdZ;
    const rightZ = fwdX;
    player.move(dt, {
      // player.move takes world-space components: forward is the z part,
      // right is the x part
      forward: fwdZ * fwdKey + rightZ * rightKey,
      right: fwdX * fwdKey + rightX * rightKey,
      run: !!(keys.ShiftLeft || keys.ShiftRight),
    }, colliders, time);
    // traffic that hits Rio on foot hurts
    for (const car of traffic.cars) {
      const d = Math.hypot(car.pos.x - player.pos.x, car.pos.z - player.pos.z);
      if (d < 2.2 && Math.abs(car.speed) > 3 && time - (car.lastHitAt || -99) > 1.5) {
        car.lastHitAt = time;
        car.speed *= 0.3;
        if (player.damage(12, time)) bustPlayer('run over');
      }
    }
  }

  traffic.update(dt, player.pos, playerCar ? Math.abs(playerCar.speed) : 0);
  const dangerPos = playerCar ? playerCar.pos : player.pos;
  const dangerSpeed = playerCar ? Math.abs(playerCar.speed) : player.speed;
  peds.update(dt, dangerPos, dangerSpeed > 8 ? 9 : 3.5, time);

  const ev = police.update(dt, time, player, playerCar, tracerGroup);
  police.clearTracers(tracerGroup, time);
  if (ev.rammed && !playerCar) {
    if (player.damage(10, time)) bustPlayer('beaten by the patrol');
  } else if (ev.rammed && playerCar) {
    if (player.damage(4, time)) bustPlayer('wrecked by the patrol');
  }
  if (ev.shotHit) {
    audio.gunshot();
    if (player.damage(6, time)) bustPlayer('shot');
  }
  if (ev.grabbed) bustPlayer('caught by an officer');

  missions.update(dt, player.pos, !!playerCar, time);
  audio.update(!!playerCar, playerCar ? Math.abs(playerCar.speed) / 40 : 0, police.stars, time);
}

// --- camera -----------------------------------------------------------------------
function updateCamera(dt) {
  const target = playerCar ? playerCar.pos : player.pos;
  // the sun follows the player so shadows stay crisp wherever they go —
  // including in screenshot staging, where the camera never moves
  sun.position.set(target.x + 120, 180, target.z + 60);
  sun.target.position.set(target.x, 0, target.z);
  if (world.shotCamera) {
    camera.position.set(...world.shotCamera.pos);
    camera.lookAt(new THREE.Vector3(...world.shotCamera.look));
    return;
  }
  if (state === 'menu') {
    const a = time * 0.05;
    camera.position.set(Math.cos(a) * 130, 62, Math.sin(a) * 130);
    camera.lookAt(0, 8, 0);
    return;
  }
  const target = playerCar ? playerCar.pos : player.pos;
  let wantYaw = camYaw;
  let wantPitch = camPitch;
  let wantDist = camDist;
  if (playerCar) {
    // chase camera: settle behind the car, a little above it
    let targetYaw = playerCar.heading + Math.PI;
    let dy = targetYaw - camYaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    camYaw += dy * Math.min(1, 2.2 * dt);
    wantYaw = camYaw;
    wantPitch = 0.34;
    wantDist = 12;
  }
  const cx = target.x + Math.sin(wantYaw) * Math.cos(wantPitch) * wantDist;
  const cz = target.z + Math.cos(wantYaw) * Math.cos(wantPitch) * wantDist;
  const cy = 1.6 + Math.sin(wantPitch) * wantDist;
  camera.position.set(cx, cy, cz);
  camera.lookAt(target.x, 2.2, target.z);
}

// --- HUD view -------------------------------------------------------------------------
function updateHud() {
  const m = missions.current();
  const t = missions.targetNow();
  let objectiveHtml = 'All jobs done — Solmar is yours.';
  if (m && t) {
    const dist = Math.round(Math.hypot(player.pos.x - t.x, player.pos.z - t.z));
    objectiveHtml = `<b>${m.title}</b><br>${t.label} — ${dist}m` +
      (m.timer ? ` · ⏱ ${Math.max(0, Math.ceil(missions.timeLeft))}s` : '');
  } else if (m) {
    objectiveHtml = `<b>${m.title}</b><br>${m.brief}`;
  }
  hud.update({
    health: player.health,
    money,
    stars: police.stars,
    clockMinutes,
    objectiveHtml,
    driving: !!playerCar,
    speedKmh: playerCar ? Math.abs(playerCar.speed) * 3.6 : 0,
    minimap: {
      playerX: player.pos.x,
      playerZ: player.pos.z,
      playerHeading: playerCar ? playerCar.heading : player.heading,
      trafficCars: traffic.cars,
      policeCars: police.cars,
      missionTarget: t,
    },
  }, time);
}

// --- main loop ---------------------------------------------------------------------------
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  time += dt;
  if (state === 'playing') updatePlaying(dt);
  updateCamera(dt);
  if (state === 'playing') updateHud();
  renderer.render(scene, camera);
  framesRendered += 1;
  if (shotMode && framesRendered === 12) {
    window.__shotReady = true;
    document.title = 'shot-ready';
  }
}

// --- boot ----------------------------------------------------------------------------------
if (shotMode) {
  menuEl.classList.add('hidden');
  hud.show();
  state = 'playing';
  applyShot(shotName, world);
  if (missions.current()) missions.start();
} else if (save) {
  document.getElementById('btnContinue').style.display = 'inline-block';
}
loop();
