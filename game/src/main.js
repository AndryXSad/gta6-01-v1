// SOLMAR — main loop & state machine (menu / playing / busted).
// Wires every module: city, player, cars, traffic, police, missions, HUD,
// audio, save and the deterministic screenshot mode. THREE comes from the
// vendored UMD build (game/vendor/three.min.js) as a global.
import { WORLD, PALETTE, PLAYER, CAR, START_CASH, BUST_FINE, MISSIONS } from './config.js';
import { makeRng } from './random.js';
import { buildCity } from './city.js';
import { createPlayer, updatePlayer, tryPunch } from './player.js';
import { spawnCar, driveCar, nearestCar, parkCars } from './vehicles.js';
import { createTraffic, updateTraffic } from './traffic.js';
import { createPolice, updatePolice, addHeat, setWanted, clearPolice } from './police.js';
import { createMissions, startMission, updateMissions, missionObjective, missionBrief } from './missions.js';
import { createHud, updateHud, drawMinimap, showToast, showBanner } from './hud.js';
import { audio } from './audio.js';
import { loadSave, storeSave, clearSave, hasSave, saveSummary, defaultSave } from './save.js';
import { parseShot, applyShot } from './shots.js';

const shot = parseShot();
const rng = makeRng(shot ? `solmar-shot-${shot.seed}` : 'solmar-2026');

// --- renderer / scene ------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.sky);
scene.fog = new THREE.Fog(PALETTE.fog, 90, 420);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 900);
camera.position.set(0, 8, -14);

scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x3f7a4e, 0.95));
const sun = new THREE.DirectionalLight(0xfff2cc, 1.15);
sun.position.set(120, 180, -80);
scene.add(sun);

// --- world -----------------------------------------------------------------
const city = buildCity(scene, rng);
const player = createPlayer(scene);
const parked = parkCars(scene, rng, city.roadsV, city.roadsH, 9);
const traffic = createTraffic(scene, rng, city);
const police = createPolice(scene, rng);
const missions = createMissions(scene);
const hud = createHud();
const allCars = [...parked, ...traffic.cars];

// player starts with his own red car parked near the spawn
const homeCar = spawnCar(scene, rng, 6, 44, Math.PI, { color: PALETTE.carPlayer, owner: 'parked' });
allCars.push(homeCar);

const state = {
  started: false,
  paused: false,
  shotMode: false,
  cash: START_CASH,
  clockMin: 600, // 10:00
  camDist: 12,
  camHeight: 5,
  saveTimer: 0,
  frames: 0,
};

const game = {
  player,
  cars: allCars,
  police,
  missions,
  traffic,
  state,
  camYaw: 0,
  startMission: (i) => startMission(missions, i),
};

// --- input -------------------------------------------------------------------
const keys = { w: false, a: false, s: false, d: false, shift: false, space: false };
let camYaw = 0;
let dragging = false;
let lastX = 0;

addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'w' || k === 'arrowup') keys.w = true;
  if (k === 'a' || k === 'arrowleft') keys.a = true;
  if (k === 's' || k === 'arrowdown') keys.s = true;
  if (k === 'd' || k === 'arrowright') keys.d = true;
  if (k === 'shift') keys.shift = true;
  if (k === ' ') {
    keys.space = true;
    e.preventDefault();
  }
  if (k === 'e') tryEnterExitCar();
  if (k === 'p') togglePause();
  if (k === 'm') audio.sirenStop();
});
addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'w' || k === 'arrowup') keys.w = false;
  if (k === 'a' || k === 'arrowleft') keys.a = false;
  if (k === 's' || k === 'arrowdown') keys.s = false;
  if (k === 'd' || k === 'arrowright') keys.d = false;
  if (k === 'shift') keys.shift = false;
  if (k === ' ') keys.space = false;
});
renderer.domElement.addEventListener('pointerdown', (e) => {
  dragging = true;
  lastX = e.clientX;
  audio.unlock();
});
addEventListener('pointerup', () => {
  dragging = false;
});
addEventListener('pointermove', (e) => {
  if (!dragging) return;
  camYaw -= (e.clientX - lastX) * 0.005;
  lastX = e.clientX;
});
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// --- car enter / exit --------------------------------------------------------
function tryEnterExitCar() {
  if (!state.started || state.paused) return;
  if (player.inCar) {
    const car = player.inCar;
    car.speed = 0;
    car.owner = 'parked';
    player.inCar = null;
    player.mesh.visible = true;
    player.x = car.x + Math.cos(car.heading) * 3;
    player.z = car.z - Math.sin(car.heading) * 3;
    player.heading = car.heading;
    audio.engineStop();
    return;
  }
  const car = nearestCar(allCars.filter((c) => !c.police), player.x, player.z, CAR.enterRadius);
  if (!car) return;
  const stolen = car.owner !== 'player';
  car.owner = 'player';
  player.inCar = car;
  player.mesh.visible = false;
  player.x = car.x;
  player.z = car.z;
  player.heading = car.heading;
  audio.engineStart();
  if (stolen) {
    car.stolen = true;
    addHeat(police, 1);
    showToast(hud, 'Mobil dicuri! Polisi mengejar — ★ naik', 3);
  }
}

// --- pause / busted ----------------------------------------------------------
function togglePause() {
  if (!state.started) return;
  state.paused = !state.paused;
  hud.help.textContent = state.paused
    ? 'JEDA — tekan P untuk lanjut. WASD gerak · E masuk/keluar mobil · Spasi pukul · drag mouse putar kamera.'
    : 'WASD gerak · E masuk/keluar mobil · Spasi pukul · P jeda · drag mouse putar kamera.';
}

function bustPlayer(reason) {
  const fine = Math.min(state.cash, BUST_FINE);
  state.cash -= fine;
  player.health = PLAYER.maxHealth;
  setWanted(police, 0);
  clearPolice(police);
  if (player.inCar) {
    player.inCar.speed = 0;
    player.inCar.owner = 'parked';
    player.inCar = null;
    player.mesh.visible = true;
  }
  player.x = 92;
  player.z = 120;
  player.heading = Math.PI;
  camYaw = Math.PI;
  audio.engineStop();
  audio.sirenStop();
  showBanner(hud, `${reason} — denda $${fine}. Rio bangun di rumah sakit.`, 4);
  saveNow();
}

// --- missions ---------------------------------------------------------------
function onMissionComplete(done) {
  state.cash += done.reward;
  audio.missionDone();
  showBanner(hud, `Misi selesai: ${done.title} — +$${done.reward}`, 3.5);
  if (missions.allDone) {
    state.cash += 500;
    showBanner(hud, 'SEMUA MISI SELESAI — Rio bebas utang! Bonus $500', 5);
  }
  saveNow();
}

function saveNow() {
  storeSave({
    missionIndex: missions.index,
    cash: state.cash,
    health: player.health,
    wanted: police.wanted,
    x: player.x,
    z: player.z,
    heading: player.heading,
    completed: missions.done,
  });
}

// --- menu --------------------------------------------------------------------
function applyLoadedSave(save) {
  state.cash = save.cash;
  player.health = save.health;
  player.x = save.x;
  player.z = save.z;
  player.heading = save.heading;
  camYaw = save.heading;
  setWanted(police, save.wanted);
  missions.done = save.completed.slice();
  startMission(missions, save.missionIndex);
}

function beginGame(fromSave) {
  const save = fromSave ? loadSave() : null;
  if (save) applyLoadedSave(save);
  else {
    const fresh = defaultSave();
    state.cash = fresh.cash;
    player.health = fresh.health;
    player.x = fresh.x;
    player.z = fresh.z;
    player.heading = fresh.heading;
    startMission(missions, 0);
  }
  state.started = true;
  hud.menu.style.display = 'none';
  audio.unlock();
  audio.sirenStop();
  showToast(hud, missionBrief(missions), 5);
}

document.getElementById('btn-new').addEventListener('click', () => {
  clearSave();
  beginGame(false);
});
document.getElementById('btn-continue').addEventListener('click', () => beginGame(true));
if (hasSave()) {
  hud.menuSummary.textContent = saveSummary(loadSave());
  document.getElementById('btn-continue').style.display = 'inline-block';
}

// --- shot mode ---------------------------------------------------------------
let shotPreset = { dist: 12, height: 5, yawOffset: 0 };
if (shot) {
  shotPreset = applyShot(game, shot) || shotPreset;
  state.camDist = shotPreset.dist;
  state.camHeight = shotPreset.height;
  camYaw = game.camYaw;
  hud.menu.style.display = 'none';
  hud.help.style.display = 'none';
  // keep the mission banner visible for the shot
  showBanner(hud, `${missionObjective(missions)} — ${missionBrief(missions)}`, 30);
}

// --- main loop ---------------------------------------------------------------
const clock = new THREE.Clock();
let hudTimer = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  state.frames += 1;

  if (state.started && !state.paused) {
    state.clockMin += dt * 1.5;
    // --- player / car ------------------------------------------------------
    if (player.inCar) {
      driveCar(player.inCar, dt, keys, city.colliders);
      player.x = player.inCar.x;
      player.z = player.inCar.z;
      player.heading = player.inCar.heading;
      audio.engine(Math.abs(player.inCar.speed) / 34, true);
      // steer the camera behind the car
      let dh = player.heading - camYaw;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      camYaw += dh * Math.min(1, dt * 1.4);
    } else {
      const acted = updatePlayer(player, dt, keys, camYaw, city.colliders);
      if (acted === 'punched') {
        audio.punch();
        const targets = [
          ...traffic.peds.filter((p) => p.health > 0).map((p) => ({
            x: p.x,
            z: p.z,
            health: p.health,
            onHit: (dmg) => {
              p.health -= dmg;
              if (p.health <= 0) addHeat(police, 1);
            },
          })),
          ...police.cops.filter((c) => c.health > 0).map((c) => ({
            x: c.x,
            z: c.z,
            health: c.health,
            onHit: (dmg) => {
              c.health -= dmg;
              addHeat(police, 1);
            },
          })),
        ];
        tryPunch(player, targets);
      }
      audio.engine(0, false);
    }

    // --- systems -----------------------------------------------------------
    updateTraffic(traffic, dt, player.inCar, player, () => addHeat(police, 1));
    updatePolice(
      police,
      dt,
      { x: player.x, z: player.z, inCar: !!player.inCar, car: player.inCar, health: player.health },
      {
        onBusted: () => bustPlayer('DITANGKAP POLISI'),
        onShot: () => audio.gunshot(),
        onRam: () => audio.punch(),
      },
    );
    if (police.wanted > 0) audio.sirenStart();
    else audio.sirenStop();
    const done = updateMissions(missions, dt, { x: player.x, z: player.z, inCar: !!player.inCar }, {
      onComplete: onMissionComplete,
    });
    if (done && missions.bannerTimer > 0) showBanner(hud, missions.banner, 3);

    // slow health regen while clean
    if (police.wanted === 0 && player.health < PLAYER.maxHealth) {
      player.health = Math.min(PLAYER.maxHealth, player.health + 2 * dt);
    }
    if (player.health <= 0) bustPlayer('RIO TUMBANG');

    // autosave
    state.saveTimer += dt;
    if (state.saveTimer > 6) {
      state.saveTimer = 0;
      saveNow();
    }

    // --- HUD ---------------------------------------------------------------
    hudTimer += dt;
    if (hudTimer > 0.12) {
      hudTimer = 0;
      updateHud(hud, hudTimer, {
        health: player.health,
        maxHealth: PLAYER.maxHealth,
        cash: state.cash,
        wanted: police.wanted,
        clockMin: state.clockMin,
        objective: missionObjective(missions),
        brief: missionBrief(missions),
      });
      drawMinimap(hud, {
        playerX: player.x,
        playerZ: player.z,
        heading: player.heading,
        inCar: !!player.inCar,
        target: missions.active ? missions.active.target : null,
        police: police.patrols,
        traffic: traffic.cars,
      });
    }
  }

  // --- camera ---------------------------------------------------------------
  const dist = state.shotMode ? shotPreset.dist : player.inCar ? 13 : 11;
  const height = state.shotMode ? shotPreset.height : player.inCar ? 5.2 : 4.4;
  const yaw = camYaw + (state.shotMode ? shotPreset.yawOffset : 0);
  const tx = player.x - Math.sin(yaw) * dist;
  const tz = player.z - Math.cos(yaw) * dist;
  camera.position.x += (tx - camera.position.x) * Math.min(1, dt * 6 + 0.08);
  camera.position.y += (height - camera.position.y) * Math.min(1, dt * 6 + 0.08);
  camera.position.z += (tz - camera.position.z) * Math.min(1, dt * 6 + 0.08);
  camera.lookAt(player.x + Math.sin(player.heading) * 3, 1.6, player.z + Math.cos(player.heading) * 3);

  renderer.render(scene, camera);

  if (state.shotMode && state.frames === 50) {
    window.__shotReady = true;
    document.title = 'solmar-shot-ready';
  }
}

startMission(missions, 0);
animate();
window.__solmar = { game, state, player, police, missions };
