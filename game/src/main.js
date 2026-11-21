// SOLMAR — loop utama & state machine (menu / bermain / jeda / mati).
// Merakit semua modul, membaca input, menggerakkan kamera third-person,
// dan menghubungkan sistem (mencuri → wanted, pukul → wanted, misi → uang).
import { CFG } from './config.js';
import { mulberry32, hashSeed } from './random.js';
import { buildCity } from './city.js';
import { createPlayer } from './player.js';
import { createVehicles } from './vehicles.js';
import { createTraffic } from './traffic.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { loadSave, saveGame, clearSave } from './save.js';
import { parseShot, applyShot } from './shots.js';

const THREE = window.THREE;

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);

const rng = mulberry32(hashSeed('solmar-world-1'));
const city = buildCity(scene, rng);
const player = createPlayer(scene);
const police = createPolice(scene, city, rng);
const vehicles = createVehicles(scene, city, rng, () => {
  police.addHeat(22, 'steal');
  audio.steal();
  missions.setToast('Mobil dicuri! Wanted naik.', 3);
});
const traffic = createTraffic(scene, city, rng);
const missions = createMissions(scene);
const hud = createHud(document);
const audio = createAudio();

const game = { player, vehicles, police, missions, traffic, city, scene, camera };

// ---- Input ----
const input = {
  forward: false, back: false, left: false, right: false,
  run: false, handbrake: false,
};
const KEYMAP = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'run', ShiftRight: 'run',
  Space: 'handbrake',
};
window.addEventListener('keydown', (e) => {
  if (KEYMAP[e.code] !== undefined) { input[KEYMAP[e.code]] = true; e.preventDefault(); }
  if (e.code === 'Space' && state === 'playing' && player.onFoot) doPunch();
  if (e.code === 'KeyE' && state === 'playing') doEnterExit();
  if ((e.code === 'KeyP' || e.code === 'Escape') && state === 'playing') pauseGame();
  if ((e.code === 'KeyP' || e.code === 'Escape') && state === 'paused') resumeGame();
  audio.unlock();
});
window.addEventListener('keyup', (e) => {
  if (KEYMAP[e.code] !== undefined) input[KEYMAP[e.code]] = false;
});
// Drag mouse = putar kamera.
let dragging = false, lastX = 0, lastY = 0;
canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; audio.unlock(); });
window.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  player.camYaw -= (e.clientX - lastX) * 0.005;
  player.camPitch = Math.max(0.08, Math.min(0.9, player.camPitch + (e.clientY - lastY) * 0.003));
  lastX = e.clientX; lastY = e.clientY;
});
window.addEventListener('pointerup', () => { dragging = false; });
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- State ----
let state = 'menu'; // menu | playing | paused | dead
let minutes = CFG.clockStartMinutes;
let saveTimer = 0;
let deadTimer = 0;
let frozenShot = null;

function doEnterExit() {
  if (!player.onFoot) {
    vehicles.exitCar(player);
    return;
  }
  const car = vehicles.nearestCar(player.pos, 4.5);
  if (car) {
    vehicles.enterCar(car, player);
    hud.setPrompt('');
  }
}

function doPunch() {
  const targets = [
    ...police.officers.map((o) => ({ pos: o.pos, dead: o.dead, kind: 'officer', ref: o })),
    ...traffic.peds.map((p) => ({ pos: p.pos, dead: p.dead, kind: 'ped', ref: p })),
  ];
  const hit = player.tryPunch(targets);
  if (!hit) { audio.punch(); return; }
  audio.punch();
  if (hit.kind === 'officer') {
    hit.ref.dead = true;
    scene.remove(hit.ref.group);
    police.officers = police.officers.filter((o) => o !== hit.ref);
    police.addHeat(18, 'hit-officer');
    missions.setToast('Petugas dipukul! Wanted naik.', 3);
  } else {
    hit.ref.flee = 2.5;
    hit.ref.scared = true;
    police.addHeat(8, 'hit-ped');
  }
}

function startGame(fresh) {
  if (fresh) {
    clearSave();
    missions.index = 0;
    missions.done = false;
    missions.completedCount = 0;
    missions.earned = 0;
    player.money = 0;
    player.reset(CFG.spots.plaza);
    police.clearWanted();
    if (vehicles.current) vehicles.exitCar(player);
  } else {
    const s = loadSave();
    if (s) {
      missions.index = Math.min(s.missionIndex, missions.defs.length);
      missions.done = missions.index >= missions.defs.length;
      missions.completedCount = s.completed || 0;
      player.money = s.money || 0;
      player.health = s.health ?? CFG.maxHealth;
      player.armor = s.armor || 0;
      player.pos.set(s.x ?? CFG.spots.plaza.x, 0, s.z ?? CFG.spots.plaza.z);
      player.group.position.copy(player.pos);
      if (s.stars > 0) police.addHeat(s.stars * 20, 'save');
    }
  }
  state = 'playing';
  hud.showMenu(false);
  audio.unlock();
}

function pauseGame() { state = 'paused'; hud.showMenu(true); setMenuNote('Jeda — tekan P untuk lanjut.'); }
function resumeGame() { state = 'playing'; hud.showMenu(false); }

function setMenuNote(text) {
  const note = document.getElementById('menu-note');
  if (note) note.textContent = text;
}

document.getElementById('btn-start')?.addEventListener('click', () => startGame(true));
document.getElementById('btn-continue')?.addEventListener('click', () => startGame(false));
document.getElementById('btn-resume')?.addEventListener('click', () => resumeGame());

// Tombol Continue hanya aktif bila ada save.
const saved = loadSave();
const btnContinue = document.getElementById('btn-continue');
if (btnContinue && !saved) btnContinue.style.display = 'none';
if (saved) setMenuNote(`Save ditemukan: misi ${saved.missionIndex + 1}/4, $${saved.money}.`);

// ---- Kamera third-person ----
function updateCamera(dt) {
  const driving = !player.onFoot && vehicles.current;
  const dist = driving ? CFG.camDriveDistance : CFG.camDistance;
  const height = driving ? CFG.camDriveHeight : CFG.camHeight;
  const yaw = player.camYaw;
  const tx = player.pos.x + Math.sin(yaw) * dist * Math.cos(player.camPitch);
  const tz = player.pos.z + Math.cos(yaw) * dist * Math.cos(player.camPitch);
  const ty = height * (0.6 + player.camPitch);
  camera.position.x += (tx - camera.position.x) * Math.min(1, dt * 7);
  camera.position.y += (ty - camera.position.y) * Math.min(1, dt * 7);
  camera.position.z += (tz - camera.position.z) * Math.min(1, dt * 7);
  camera.lookAt(player.pos.x, 2.2, player.pos.z);
}

// ---- Pickup & tabrakan mobil-pejalan kaki ----
function checkPickups(dt) {
  for (const p of city.pickups) {
    if (p.taken) {
      p.timer -= dt;
      if (p.timer <= 0) { p.taken = false; p.mesh.visible = true; }
      continue;
    }
    p.mesh.rotation.y += dt * 2;
    p.mesh.position.y = 1.2 + Math.sin(performance.now() * 0.003) * 0.25;
    const d = Math.hypot(player.pos.x - p.x, player.pos.z - p.z);
    if (d < 2.6 && player.alive) {
      p.taken = true; p.timer = 20; p.mesh.visible = false;
      if (p.kind === 'health') { player.heal(40); missions.setToast('Health +40', 2); }
      else { player.armor = Math.min(CFG.maxArmor, player.armor + 25); missions.setToast('Armor +25', 2); }
      audio.pickup();
    }
  }
}

function checkCarPedHits() {
  const car = vehicles.current;
  if (!car || player.onFoot) return;
  if (Math.abs(car.speed) < 9) return;
  for (const p of traffic.peds) {
    if (p.dead) continue;
    const d = Math.hypot(car.pos.x - p.pos.x, car.pos.z - p.pos.z);
    if (d < 2.6) {
      p.dead = true;
      p.group.visible = false;
      police.addHeat(14, 'hit-ped-car');
      audio.crash();
      missions.setToast('Pejalan kaki tertabrak! Wanted naik.', 3);
    }
  }
}

// ---- Loop ----
const clock = new THREE.Clock();
let framesRendered = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (state === 'playing' && !frozenShot) {
    minutes += dt * CFG.clockRate;
    player.update(dt, input, city);
    vehicles.update(dt, input, player, city);
    traffic.update(dt, player, vehicles.current);
    police.update(dt, player, vehicles.current, city, (dmg) => {
      player.takeDamage(dmg);
      audio.gunshot();
    });
    const before = missions.completedCount;
    missions.update(dt, player, vehicles);
    if (missions.completedCount > before) { audio.missionDone(); saveGame({ player, police, missions }); }
    checkPickups(dt);
    checkCarPedHits();
    // Suara mesin mengikuti kecepatan mobil; sirene mengikuti wanted.
    audio.engine(vehicles.current ? Math.abs(vehicles.current.speed) / CFG.driveTop : 0);
    audio.siren(dt, police.stars);
    // Prompt konteks: E masuk mobil / pukul.
    if (player.onFoot) {
      const near = vehicles.nearestCar(player.pos, 4.5);
      hud.setPrompt(near ? (near.stolen || near.isPlayerCar ? 'E — Masuk mobil' : 'E — Curi mobil') : '');
    } else {
      hud.setPrompt('E — Keluar mobil   •   Space — Rem tangan');
    }
    // Mati: kembali ke menu setelah 2 detik.
    if (!player.alive) {
      deadTimer += dt;
      if (deadTimer > 2) {
        state = 'dead';
        deadTimer = 0;
        police.clearWanted();
        player.reset(CFG.spots.plaza);
        if (vehicles.current) vehicles.exitCar(player);
        hud.showMenu(true);
        setMenuNote('Rio tumbang. Utang belum lunas — coba lagi dari plaza.');
        audio.busted();
      }
    }
    saveTimer += dt;
    if (saveTimer > 12) { saveTimer = 0; saveGame({ player, police, missions }); }
    updateCamera(dt);
    hud.update({
      player, police, missions, traffic, vehicles,
      minutes, speedKmh: Math.abs(vehicles.current?.speed || 0) * 3.6,
      driving: !!vehicles.current,
    });
  } else if (frozenShot) {
    // Shot beku: kamera diposisikan sekali, render terus tanpa update.
    updateCamera(0.016);
    hud.update({
      player, police, missions, traffic, vehicles,
      minutes, speedKmh: Math.abs(vehicles.current?.speed || 0) * 3.6,
      driving: !!vehicles.current,
    });
  }
  renderer.render(scene, camera);
  framesRendered++;
}

// ---- Boot: mode shot langsung main, selain itu tampilkan menu ----
const shotInfo = parseShot();
if (shotInfo) {
  const applied = applyShot(game, shotInfo);
  if (applied) {
    frozenShot = applied;
    state = 'playing';
    hud.showMenu(false);
    // Kamera awal di belakang subjek shot.
    updateCamera(0.016);
  }
}
animate();
window.__solmar = { game, get state() { return state; }, framesRendered: () => framesRendered };
