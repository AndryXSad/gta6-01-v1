// Story missions: four jobs for Madame Kestrel, in order. Each has a target
// point in the city, a glowing beacon the player can see from far away, and
// a cash reward. Some jobs need the player to be in a car when they arrive.
import { MISSIONS } from './config.js';

const THREE = window.THREE;

export function createMissions(scene) {
  const beaconGeo = new THREE.CylinderGeometry(1.6, 1.6, 60, 12, 1, true);
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xf2c94c, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  const beacon = new THREE.Mesh(beaconGeo, beaconMat);
  beacon.position.y = 30;
  beacon.visible = false;
  scene.add(beacon);
  const ringGeo = new THREE.TorusGeometry(7, 0.5, 8, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xf2c94c });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.4;
  ring.visible = false;
  scene.add(ring);
  return { index: 0, done: false, beacon, ring, toast: '', toastTimer: 0, dialog: MISSIONS[0].dialog };
}

export function currentMission(missions) {
  if (missions.index >= MISSIONS.length) return null;
  return MISSIONS[missions.index];
}

export function placeBeacon(missions) {
  const mission = currentMission(missions);
  if (!mission) {
    missions.beacon.visible = false;
    missions.ring.visible = false;
    return;
  }
  missions.beacon.position.set(mission.target.x, 30, mission.target.z);
  missions.ring.position.set(mission.target.x, 0.4, mission.target.z);
  missions.beacon.visible = true;
  missions.ring.visible = true;
}

// Returns the reward earned this step, or 0.
export function updateMissions(missions, player, dt) {
  if (missions.toastTimer > 0) missions.toastTimer -= dt;
  missions.beacon.rotation.y += dt * 0.8;
  const pulse = 1 + Math.sin(performance.now() * 0.003) * 0.12;
  missions.ring.scale.set(pulse, pulse, 1);
  const mission = currentMission(missions);
  if (!mission) return 0;
  const d = Math.hypot(player.x - mission.target.x, player.z - mission.target.z);
  const inCarOk = !mission.needsCar || player.inCar;
  if (d < 9 && inCarOk) {
    missions.index += 1;
    const next = currentMission(missions);
    missions.dialog = next ? next.dialog : 'Kestrel: "Utangmu lunas, Rio. Solmar milikmu sekarang."';
    missions.toast = `Misi selesai: ${mission.title}  +$${mission.reward}`;
    missions.toastTimer = 4;
    if (!next) missions.done = true;
    placeBeacon(missions);
    return mission.reward;
  }
  return 0;
}
