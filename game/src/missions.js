// SOLMAR missions — four jobs Rio runs for Madame Kestrel, the harbour
// fixer he owes. Each mission has a light beacon at its target, a short
// brief and a cash reward. Finish all four and Rio is out of debt.
import { MISSIONS, PALETTE } from './config.js';

export function createMissions(scene) {
  const beaconMat = new THREE.MeshBasicMaterial({
    color: PALETTE.beacon,
    transparent: true,
    opacity: 0.32,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 55, 20, 1, true), beaconMat);
  beacon.position.y = 27;
  beacon.visible = false;
  scene.add(beacon);

  const ringMat = new THREE.MeshBasicMaterial({ color: PALETTE.beacon, transparent: true, opacity: 0.85 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(6.5, 8.5, 28), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.12;
  ring.visible = false;
  scene.add(ring);

  return {
    scene,
    beacon,
    ring,
    index: 0,
    active: null, // current mission def
    done: [],
    allDone: false,
    banner: '',
    bannerTimer: 0,
  };
}

export function startMission(m, index) {
  m.index = index;
  m.active = MISSIONS[index] || null;
  m.allDone = !m.active;
  if (m.active) {
    m.beacon.position.set(m.active.target[0], 27, m.active.target[1]);
    m.beacon.visible = true;
    m.ring.position.set(m.active.target[0], 0.12, m.active.target[1]);
    m.ring.visible = true;
    m.banner = m.active.title;
    m.bannerTimer = 3.2;
  } else {
    m.beacon.visible = false;
    m.ring.visible = false;
  }
  return m.active;
}

// Returns the completed mission def when the player reaches the target.
export function updateMissions(m, dt, player, events = {}) {
  if (m.bannerTimer > 0) m.bannerTimer -= dt;
  if (!m.active) return null;
  m.beacon.rotation.y += dt * 0.8;
  m.beacon.material.opacity = 0.24 + Math.sin(performance.now() / 280) * 0.08;
  const dx = player.x - m.active.target[0];
  const dz = player.z - m.active.target[1];
  if (Math.hypot(dx, dz) > m.active.radius) return null;
  if (m.active.needCar && !player.inCar) {
    m.banner = 'Butuh mobil — curi satu dulu (E di dekat mobil).';
    m.bannerTimer = 2.5;
    return null;
  }
  const done = m.active;
  m.done.push(done.id);
  if (events.onComplete) events.onComplete(done);
  startMission(m, m.index + 1);
  return done;
}

export function missionObjective(m) {
  if (m.allDone) return 'Semua misi selesai — Rio bebas utang!';
  if (!m.active) return '';
  return `Misi ${m.index + 1}/4: ${m.active.title}`;
}

export function missionBrief(m) {
  if (m.allDone) return 'Madame Kestrel tersenyum. "Lunas. Solmar milikmu sekarang."';
  return m.active ? m.active.brief : '';
}
