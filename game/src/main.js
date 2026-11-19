// SOLMAR — game open-world crime orisinal (three.js, low-poly, tanpa network).
// Loop utama, state machine (menu / bermain / jeda / busted / tamat), wiring
// semua sistem: kota, pemain, kendaraan, traffic, polisi, misi, HUD, audio, save.
import { CFG, MISSIONS, STORY_INTRO } from './config.js';
import { makeRng } from './random.js';
import { buildCity, collideCircle } from './city.js';
import { createPlayer, updatePlayer, updateCamera } from './player.js';
import { spawnCars, nearestCar, driveCar } from './vehicles.js';
import { spawnTraffic, updateTraffic, checkPedHit } from './traffic.js';
import { createPolice, addWanted, clearWanted, updatePolice } from './police.js';
import { createMissions, currentMission, missionTarget, startMission, updateMissions } from './missions.js';
import { createHud, updateHud, showToast } from './hud.js';
import { ensureAudio, engineSound, sfx, setSiren } from './audio.js';
import { saveGame, loadGame, hasSave, clearSave } from './save.js';
import { parseShot, applyShot, afterPreroll } from './shots.js';

const THREE = window.THREE;
const { shot, seed } = parseShot();
const rng = makeRng(seed * 7919 + 13);

// ---------- state ----------
const state = {
  mode: 'menu', // menu | play | pause | busted | done
  cash: CFG.startCash, health: CFG.startHealth, armor: 0,
  missionIndex: 0, completedMissions: [],
  clockMinutes: 9 * 60 + 15, // pagi Solmar 09:15
  time: 0, saveTimer: 0, punchHitDone: false,
};
const S = { rng, state, fns: { startMission }, addWanted: null,
  setCar: (c) => { currentCar = c; } };

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
document.getElementById('game').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 900);

const city = buildCity(scene, rng);
const player = createPlayer(scene);
const vehicles = { parked: spawnCars(scene, rng, city.colliders) };
const traffic = spawnTraffic(scene, rng);
const police = createPolice(scene);
const missions = createMissions(scene);
const hud = createHud();

S.player = player; S.vehicles = vehicles; S.traffic = traffic;
S.police = police; S.missions = missions;
S.addWanted = (n) => addWanted(police, n, rng, player.pos);

let currentCar = null;
let frozen = false; // mode screenshot: bekukan simulasi setelah pre-roll agar frame stabil
let camYaw = Math.PI, camPitch = 0;
let keys = {};
let dragging = false, lastX = 0, lastY = 0;
let stolenThisRun = false;

// ---------- input ----------
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  keys[e.code] = true;
  ensureAudio();
  if (state.mode === 'play') {
    if (e.code === 'KeyE') tryEnterCar();
    if (e.code === 'Escape' || e.code === 'KeyP') setMode('pause');
    if (e.code === 'Space') e.preventDefault();
  } else if (state.mode === 'pause' && (e.code === 'Escape' || e.code === 'KeyP')) setMode('play');
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
renderer.domElement.addEventListener('mousedown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; ensureAudio(); });
addEventListener('mouseup', () => { dragging = false; });
addEventListener('mousemove', (e) => {
  if (!dragging) return;
  camYaw -= (e.clientX - lastX) * 0.005;
  camPitch = Math.max(-2, Math.min(6, camPitch + (e.clientY - lastY) * 0.01));
  lastX = e.clientX; lastY = e.clientY;
});
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- menu ----------
const menu = document.getElementById('menu');
const menuTitle = document.getElementById('menu-title');
const menuStory = document.getElementById('menu-story');
const btnContinue = document.getElementById('btn-continue');
const btnNew = document.getElementById('btn-new');
menuStory.textContent = STORY_INTRO;
if (hasSave()) btnContinue.style.display = 'inline-block';
btnContinue.onclick = () => { ensureAudio(); loadInto(loadGame()); setMode('play'); };
btnNew.onclick = () => { ensureAudio(); clearSave(); newGame(); setMode('play'); };
document.getElementById('btn-resume').onclick = () => setMode('play');
document.getElementById('btn-quit-menu').onclick = () => { saveNow(); setMode('menu'); };
document.getElementById('btn-restart').onclick = () => { location.reload(); };

function newGame() {
  state.cash = CFG.startCash; state.health = CFG.startHealth; state.armor = 0;
  state.missionIndex = 0; state.completedMissions = [];
  player.pos.set(10, 0, 30); player.heading = 0; player.inCar = false;
  clearWanted(police);
  missions.index = 0;
  startMission(missions, 0);
  showToast(hud, 'Selamat datang di Solmar, Rio.');
}
function loadInto(d) {
  if (!d) { newGame(); return; }
  state.cash = d.cash; state.health = d.health; state.missionIndex = d.missionIndex;
  state.completedMissions = d.completed || [];
  state.clockMinutes = d.time || state.clockMinutes;
  if (d.pos) player.pos.set(d.pos[0], 0, d.pos[2]);
  player.inCar = false;
  clearWanted(police);
  startMission(missions, Math.min(d.missionIndex, MISSIONS.length - 1));
  if (d.missionIndex >= MISSIONS.length) missions.done = true;
  showToast(hud, 'Save dimuat — lanjutkan pekerjaanmu.');
}
function saveNow() {
  saveGame({ cash: state.cash, missionIndex: missions.index, health: state.health,
    completedMissions: state.completedMissions,
    playerPos: [player.pos.x, player.pos.y, player.pos.z], clockMinutes: state.clockMinutes });
}

function setMode(m) {
  state.mode = m;
  menu.style.display = m === 'menu' ? 'flex' : 'none';
  document.getElementById('pause').style.display = m === 'pause' ? 'flex' : 'none';
  document.getElementById('endcard').style.display = (m === 'busted' || m === 'done') ? 'flex' : 'none';
  document.getElementById('hud').style.display = m === 'play' ? 'block' : 'none';
  if (m === 'busted') {
    document.getElementById('end-title').textContent = 'TERTANGKAP!';
    document.getElementById('end-text').textContent =
      'Polisi Solmar menangkap Rio. Denda $100 — Kestrel tidak senang, tapi utang tetap jalan.';
    sfx.busted();
  }
  if (m === 'done') {
    document.getElementById('end-title').textContent = 'SOLMAR MILIKMU';
    document.getElementById('end-text').textContent =
      'Semua misi selesai. Utang lunas. Rio bebas — dan kota ini masih menyimpan banyak pekerjaan.';
    sfx.mission();
  }
}

// ---------- aksi ----------
function tryEnterCar() {
  if (player.inCar) {
    // Keluar mobil.
    const c = currentCar;
    player.inCar = false;
    player.pos.set(c.mesh.position.x + Math.sin(c.heading + Math.PI / 2) * 2.5, 0,
      c.mesh.position.z + Math.cos(c.heading + Math.PI / 2) * 2.5);
    player.mesh.position.copy(player.pos);
    currentCar = null;
    sfx.door();
    return;
  }
  const car = nearestCar(vehicles.parked, player.pos, CFG.carEnterRange);
  if (!car) return;
  currentCar = car;
  player.inCar = true;
  car.parked = false;
  if (!car.stolen) {
    car.stolen = true;
    stolenThisRun = true;
    sfx.steal();
    addWanted(police, 1, rng, player.pos);
    showToast(hud, 'Mobil dicuri! Wanted ★ — kabur dari polisi.');
  } else sfx.door();
}

function damagePlayer(dmg) {
  if (state.armor > 0) {
    const absorbed = Math.min(state.armor, dmg);
    state.armor -= absorbed; dmg -= absorbed;
  }
  state.health -= dmg;
  sfx.hurt();
  if (state.health <= 0) {
    state.health = CFG.startHealth; state.armor = 0;
    state.cash = Math.max(0, state.cash - 100);
    clearWanted(police);
    player.pos.set(10, 0, 30);
    if (player.inCar) { player.inCar = false; currentCar = null; }
    setMode('busted');
  }
}

// ---------- loop ----------
const clock = new THREE.Clock();
let shotCam = null;

function inputState() {
  // Di shot chase, mobil "digas" selama pre-roll agar terlihat melaju.
  const shotGas = shot === 'chase' && !frozen;
  return {
    f: keys.KeyW || keys.ArrowUp || shotGas, b: keys.KeyS || keys.ArrowDown,
    l: keys.KeyA || keys.ArrowLeft, r: keys.KeyD || keys.ArrowRight,
    run: keys.ShiftLeft || keys.ShiftRight,
    punch: keys.Space || keys.KeyF,
    handbrake: keys.Space,
  };
}

function step(dt) {
  state.time += dt;
  state.clockMinutes = (state.clockMinutes + dt * 0.35) % (24 * 60);
  const inp = inputState();
  const inCar = player.inCar;

  // Pemain / mobil.
  let punching = false;
  if (inCar && currentCar) {
    const res = driveCar(currentCar, inp, dt, city.colliders, vehicles.parked);
    player.pos.copy(currentCar.mesh.position);
    if (res.hit) { addWanted(police, 0, rng, player.pos); sfx.punch(); }
    const hit = checkPedHit(traffic, currentCar.mesh.position, Math.abs(currentCar.speed));
    if (hit) { addWanted(police, 2, rng, player.pos); showToast(hud, 'Pejalan kaki tertabrak! Wanted naik.'); }
    engineSound(Math.abs(currentCar.speed) / CFG.carMaxSpeed, true);
  } else {
    punching = updatePlayer(player, inp, dt, city.colliders, camYaw);
    engineSound(0, false);
  }

  // Combat jarak dekat: pukul pejalan kaki / polisi di depan.
  if (punching && !state.punchHitDone) {
    state.punchHitDone = true;
    const fx = player.pos.x + Math.sin(player.heading) * 1.6;
    const fz = player.pos.z + Math.cos(player.heading) * 1.6;
    for (const p of traffic.peds) {
      if (Math.hypot(p.x - fx, p.z - fz) < 1.6) {
        p.scared = 3; p.mesh.rotation.x = Math.PI / 2; p.mesh.position.y = 0.4;
        setTimeout(() => { p.mesh.visible = false; }, 4000);
        sfx.punch();
        if (police.wanted > 0 || police.cops.some((c) => c.mesh.position.distanceTo(player.pos) < 25))
          addWanted(police, 1, rng, player.pos);
        showToast(hud, 'Kena! Pejalan kaki itu tidak akan lupa wajahmu.');
      }
    }
    for (const cop of police.cops) {
      if (cop.mesh.position.distanceTo(player.pos) < 2.2) {
        cop.mesh.position.y = -2; // polisi tumbang sebentar
        setTimeout(() => { cop.mesh.position.y = 0; }, 3000);
        addWanted(police, 1, rng, player.pos);
        sfx.punch();
      }
    }
  }
  if (!inp.punch) state.punchHitDone = false;

  updateTraffic(traffic, dt, player.pos, inCar ? Math.abs(currentCar.speed) : player.speed);
  const busted = updatePolice(police, dt, rng, player.pos, inCar,
    inCar ? Math.abs(currentCar.speed) : 0, {
      onShot: (d) => damagePlayer(d),
      onRam: () => { if (currentCar) currentCar.speed *= 0.7; },
    });
  if (busted) { setMode('busted'); return; }
  setSiren(police.wanted > 0);

  // Pickup kesehatan/armor.
  for (const pk of city.pickups) {
    if (pk.taken) continue;
    pk.mesh.rotation.y += dt * 2;
    pk.mesh.position.y = 1.2 + Math.sin(state.time * 3) * 0.2;
    if (Math.hypot(pk.x - player.pos.x, pk.z - player.pos.z) < 1.8 && !inCar) {
      pk.taken = true; pk.mesh.visible = false;
      if (pk.kind === 'health') state.health = Math.min(100, state.health + 30);
      else state.armor = Math.min(100, state.armor + 50);
      sfx.pickup();
      showToast(hud, pk.kind === 'health' ? '+30 Health' : '+50 Armor');
    }
  }

  // Misi.
  const ev = updateMissions(missions, dt, {
    playerPos: player.pos, inCar, car: currentCar, stolenThisRun,
    wanted: police.wanted,
  }, {
    onComplete: (m, reward) => {
      state.cash += reward;
      state.completedMissions.push(m.id);
      sfx.cash(); sfx.mission();
      showToast(hud, `Misi selesai: ${m.title} — +$${reward}`);
      saveNow();
    },
  });
  if (missions.done && state.mode === 'play') { saveNow(); setMode('done'); }

  // Kamera.
  const target = inCar && currentCar ? currentCar.mesh.position : player.pos;
  const speed01 = inCar && currentCar ? Math.abs(currentCar.speed) / CFG.carMaxSpeed : player.speed / CFG.runSpeed;
  if (shotCam) {
    camera.position.set(
      target.x - Math.sin(shotCam.camYaw) * 14,
      target.y + 6.5 + shotCam.camPitch,
      target.z - Math.cos(shotCam.camYaw) * 14);
    camera.lookAt(target.x, target.y + 1.5, target.z);
  } else {
    updateCamera(camera, target, player.heading, camYaw, camPitch, inCar, speed01);
  }

  // HUD.
  const cur = currentMission(missions);
  const tgt = missionTarget(missions);
  const hh = Math.floor(state.clockMinutes / 60), mm = Math.floor(state.clockMinutes % 60);
  const policePos = [...police.cars.map((c) => ({ x: c.mesh.position.x, z: c.mesh.position.z })),
    ...police.cops.map((c) => ({ x: c.mesh.position.x, z: c.mesh.position.z }))];
  let prompt = '';
  if (!inCar && nearestCar(vehicles.parked, player.pos, CFG.carEnterRange)) prompt = '[E] Masuk mobil';
  if (inCar) prompt = '[E] Keluar mobil  •  [Space] Rem tangan';
  updateHud(hud, {
    health: state.health, armor: state.armor, cash: state.cash,
    wanted: police.wanted, inCar,
    speedKmh: inCar && currentCar ? currentCar.speed * 3.2 : 0,
    objective: cur ? `${cur.title} — ${cur.hint}` : 'Semua misi selesai!',
    clock: `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`,
    dialog: missions.dialogTimer > 0 ? missions.dialog : '',
    prompt, player: player.pos, heading: player.heading,
    missionTarget: tgt, police: policePos,
  });

  // Autosave berkala.
  state.saveTimer += dt;
  if (state.saveTimer > 15) { state.saveTimer = 0; saveNow(); }
}

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (state.mode === 'play' && !frozen) step(dt);
  renderer.render(scene, camera);
}

// ---------- boot ----------
newGame();
if (shot) {
  // Mode screenshot: lewati menu, terapkan setup deterministik, mainkan langsung.
  shotCam = applyShot(shot, S);
  if (shotCam) { camYaw = shotCam.camYaw; camPitch = shotCam.camPitch; }
  setMode('play');
  // Biarkan simulasi berjalan beberapa detik agar traffic/polisi tersebar.
  for (let i = 0; i < 90; i++) step(1 / 60);
  afterPreroll(shot, S);
  frozen = true; // bekukan frame — screenshot stabil, tidak ada yang tertangkap
  state.mode = 'play';
}
loop();
