// Misi & cerita: 4 misi berurutan Rio vs Madame Kestrel. Penanda beacon 3D
// berdenyut + panah arah, dialog singkat, hadiah uang, layar misi selesai.
import { MISSIONS } from './config.js';

const THREE = window.THREE;

export function createMissions(scene) {
  // Beacon: silinder cahaya + cincin di tanah di titik objektif.
  const beacon = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.2, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xf1c40f, transparent: true, opacity: 0.28, side: THREE.DoubleSide }));
  beam.position.y = 30; beacon.add(beam);
  const ring = new THREE.Mesh(new THREE.RingGeometry(3, 4.5, 32),
    new THREE.MeshBasicMaterial({ color: 0xf1c40f, transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.15; beacon.add(ring);
  beacon.visible = false;
  scene.add(beacon);
  // Penanda rekan (Sari) — sosok menunggu di boulevard.
  const sari = new THREE.Group();
  const dress = new THREE.MeshLambertMaterial({ color: 0x1abc9c });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.1, 0.5), dress);
  body.position.y = 1.15; sari.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55),
    new THREE.MeshLambertMaterial({ color: 0x8d5524 }));
  head.position.y = 2.0; sari.add(head);
  sari.position.set(138, 0, 20);
  sari.visible = false;
  scene.add(sari);
  return {
    index: 0, beacon, sari, done: false, phase: 'go', // go | return
    stolenCar: null, dialog: '', dialogTimer: 0,
  };
}

export function currentMission(m) {
  return m.index < MISSIONS.length ? MISSIONS[m.index] : null;
}

export function missionTarget(m) {
  const cur = currentMission(m);
  if (!cur) return null;
  return new THREE.Vector3(cur.target[0], 0, cur.target[2]);
}

export function startMission(m, idx) {
  m.index = idx; m.done = false; m.phase = 'go'; m.stolenCar = null;
  const cur = currentMission(m);
  if (!cur) return;
  m.beacon.position.set(cur.target[0], 0, cur.target[2]);
  m.beacon.visible = true;
  m.sari.visible = cur.id === 'jemput';
  m.dialog = cur.brief; m.dialogTimer = 7;
}

// Update misi. state: {playerPos, inCar, car, stolenThisRun, wanted}.
// cb: {onComplete(mission, reward), onStealNeeded()}. Kembalikan event string.
export function updateMissions(m, dt, state, cb) {
  const cur = currentMission(m);
  if (!cur) return null;
  m.dialogTimer = Math.max(0, m.dialogTimer - dt);
  // Denyut beacon.
  const s = 1 + Math.sin(performance.now() / 300) * 0.15;
  m.beacon.scale.set(s, 1, s);
  const t = missionTarget(m);
  const d = Math.hypot(state.playerPos.x - t.x, state.playerPos.z - t.z);
  if (cur.needSteal && !m.stolenCar) {
    if (state.stolenThisRun) {
      m.stolenCar = state.car;
      m.dialog = 'Mobil didapat. Sekarang bawa ke garasi Ombak — cepat, sebelum polisi mengepung!';
      m.dialogTimer = 6;
    }
    return null;
  }
  if (cur.needCar && !state.inCar) return null;
  if (d < cur.radius) {
    const reward = cur.reward;
    m.index += 1;
    m.beacon.visible = false;
    cb.onComplete && cb.onComplete(cur, reward);
    if (currentMission(m)) {
      startMission(m, m.index);
    } else {
      m.done = true;
      m.dialog = 'SELESAI — Rio lolos. Utang lunas, Solmar masih miliknya. (Semua misi selesai!)';
      m.dialogTimer = 12;
    }
    return 'complete';
  }
  return null;
}
