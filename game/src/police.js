// The wanted system: stars 0-5, police patrol cars that chase and ram, and
// officers on foot at higher heat. Heat cools off when no police can see you.
import { PALETTE, WANTED, WORLD } from './config.js';
import { makeCar, syncCarMesh } from './vehicles.js';
import { range } from './random.js';

const THREE = window.THREE;

export function createPolice(scene) {
  return {
    wanted: 0,
    heat: 0,
    quietTimer: 0,
    cars: [],
    officers: [],
    scene,
  };
}

export function addWanted(police, amount) {
  police.wanted = Math.max(0, Math.min(WANTED.max, police.wanted + amount));
  police.quietTimer = 0;
  if (police.wanted > 0) police.heat = 1;
}

function spawnCopCar(police, rng, nearX, nearZ) {
  const angle = rng() * Math.PI * 2;
  const x = Math.max(-WORLD.half, Math.min(WORLD.half, nearX + Math.cos(angle) * 46));
  const z = Math.max(-WORLD.half, Math.min(WORLD.half, nearZ + Math.sin(angle) * 46));
  const car = makeCar(police.scene, x, z, 0, PALETTE.police, 'police');
  car.speed = 0;
  police.cars.push(car);
  return car;
}

function spawnOfficer(police, rng, nearX, nearZ) {
  const group = new THREE.Group();
  const navy = new THREE.MeshLambertMaterial({ color: 0x1c2733 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.05, 0.5), navy);
  body.position.y = 1.15;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), new THREE.MeshLambertMaterial({ color: 0xe0ac69 }));
  head.position.y = 1.95;
  group.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.7), new THREE.MeshLambertMaterial({ color: 0x101820 }));
  cap.position.y = 2.2;
  group.add(cap);
  const angle = rng() * Math.PI * 2;
  const x = nearX + Math.cos(angle) * 14;
  const z = nearZ + Math.sin(angle) * 14;
  group.position.set(x, 0, z);
  police.scene.add(group);
  const officer = { mesh: group, x, z, heading: 0, speed: 5.4 };
  police.officers.push(officer);
  return officer;
}

export function updatePolice(police, dt, rng, target, collide) {
  const wanted = police.wanted;
  const wantCars = wanted === 0 ? 0 : Math.min(3, wanted);
  while (police.cars.length < wantCars) spawnCopCar(police, rng, target.x, target.z);
  while (police.cars.length > wantCars) {
    const car = police.cars.pop();
    police.scene.remove(car.mesh);
  }
  const wantOfficers = wanted >= 2 ? Math.min(2, wanted - 1) : 0;
  while (police.officers.length < wantOfficers) spawnOfficer(police, rng, target.x, target.z);
  while (police.officers.length > wantOfficers) {
    const officer = police.officers.pop();
    police.scene.remove(officer.mesh);
  }

  let nearest = Infinity;
  for (const car of police.cars) {
    // Pursuit steering: aim at the target, faster with more stars.
    const dx = target.x - car.x;
    const dz = target.z - car.z;
    const dist = Math.hypot(dx, dz);
    nearest = Math.min(nearest, dist);
    const wantHeading = Math.atan2(dx, dz);
    let diff = wantHeading - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    const topSpeed = WANTED.copCarSpeed + wanted * 1.6;
    car.speed += WANTED.copCarAccel * dt;
    if (car.speed > topSpeed) car.speed = topSpeed;
    const nx = car.x + Math.sin(car.heading) * car.speed * dt;
    const nz = car.z + Math.cos(car.heading) * car.speed * dt;
    const fixed = collide(nx, nz, 2.3);
    if (fixed.x !== nx || fixed.z !== nz) car.speed *= 0.5;
    car.x = fixed.x;
    car.z = fixed.z;
    syncCarMesh(car);
  }
  for (const officer of police.officers) {
    const dx = target.x - officer.x;
    const dz = target.z - officer.z;
    const dist = Math.hypot(dx, dz);
    nearest = Math.min(nearest, dist);
    if (dist > 0.5) {
      officer.heading = Math.atan2(dx, dz);
      officer.x += (dx / dist) * officer.speed * dt;
      officer.z += (dz / dist) * officer.speed * dt;
    }
    officer.mesh.position.set(officer.x, 0, officer.z);
    officer.mesh.rotation.y = officer.heading;
  }

  // Cool off: no police close for long enough drops one star.
  if (wanted > 0) {
    if (nearest > WANTED.decayDistance) {
      police.quietTimer += dt;
      if (police.quietTimer > WANTED.decaySeconds) {
        police.wanted -= 1;
        police.quietTimer = 0;
      }
    } else {
      police.quietTimer = 0;
    }
  }
  return { nearestCop: nearest };
}

// How close the nearest police unit is, for the HUD and the siren.
export function nearestPolice(police, x, z) {
  let best = Infinity;
  for (const car of police.cars) best = Math.min(best, Math.hypot(car.x - x, car.z - z));
  for (const o of police.officers) best = Math.min(best, Math.hypot(o.x - x, o.z - z));
  return best;
}

export { range };
