// Kendaraan: bangun mobil low-poly, parkir + NPC, masuk/keluar (E), mencuri,
// fisika mengemudi arcade (akselerasi, belok, rem tangan, tabrakan kotak).
import { CFG } from './config.js';
import { pick, range } from './random.js';
import { collideCircle } from './city.js';

const THREE = window.THREE;

export function makeCarMesh(color, police) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x1a2530 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.75, 4.4), bodyMat);
  body.position.y = 0.65; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.65, 2.2), glassMat);
  cabin.position.set(0, 1.25, -0.2); g.add(cabin);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheels = [];
  for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10), wheelMat);
    w.rotation.z = Math.PI / 2; w.position.set(x, 0.42, z); g.add(w); wheels.push(w);
  }
  // Lampu depan & belakang.
  const hl = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  for (const x of [-0.6, 0.6]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1), hl);
    l.position.set(x, 0.7, 2.21); g.add(l);
  }
  if (police) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.4),
      new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    bar.position.set(0, 1.65, -0.2); g.add(bar);
    g.userData.lightBar = bar;
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.2, 4.42),
      new THREE.MeshLambertMaterial({ color: 0x111111 }));
    stripe.position.y = 0.85; g.add(stripe);
  }
  g.userData.wheels = wheels;
  return g;
}

export function spawnCars(scene, rng, colliders) {
  const cars = [];
  // Mobil parkir di tepi jalan (bisa dicuri) — sejajar jalan, di luar badan jalan.
  const spots = [];
  for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
    spots.push([i * CFG.block + 7, j * CFG.block + 14]);
    spots.push([i * CFG.block - 7, j * CFG.block - 14]);
    spots.push([i * CFG.block + 14, j * CFG.block + 7]);
    spots.push([i * CFG.block - 14, j * CFG.block - 7]);
  }
  for (let i = 0; i < 12; i++) {
    const [x, z] = spots[Math.floor(rng() * spots.length)];
    const color = pick(rng, CFG.carColors);
    const mesh = makeCarMesh(color, false);
    mesh.position.set(x + range(rng, -1, 1), 0, z + range(rng, -1, 1));
    mesh.rotation.y = rng() < 0.5 ? 0 : Math.PI / 2;
    scene.add(mesh);
    cars.push({ mesh, x: mesh.position.x, z: mesh.position.z, heading: mesh.rotation.y,
      speed: 0, parked: true, stolen: false, npc: false, color });
  }
  return cars;
}

// Cari mobil terdekat dalam jangkauan masuk.
export function nearestCar(cars, pos, maxDist) {
  let best = null, bd = maxDist;
  for (const c of cars) {
    const d = Math.hypot(c.mesh.position.x - pos.x, c.mesh.position.z - pos.z);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

// Fisika mengemudi arcade. Mengembalikan info tabrakan (untuk wanted & suara).
export function driveCar(car, input, dt, colliders, others) {
  const fwd = new THREE.Vector3(Math.sin(car.heading), 0, Math.cos(car.heading));
  if (input.f) car.speed += CFG.carAccel * dt;
  if (input.b) car.speed -= (car.speed > 0.5 ? CFG.carBrake : CFG.carAccel * 0.5) * dt;
  if (!input.f && !input.b) car.speed *= Math.max(0, 1 - 1.4 * dt);
  if (input.handbrake) car.speed *= Math.max(0, 1 - 4 * dt);
  car.speed = Math.max(-CFG.carMaxReverse, Math.min(CFG.carMaxSpeed, car.speed));
  const steer = (input.l ? 1 : 0) - (input.r ? 1 : 0);
  const dir = car.speed >= 0 ? 1 : -1;
  car.heading += steer * CFG.carSteer * dt * Math.min(1, Math.abs(car.speed) / 8) * dir;
  const nx = car.mesh.position.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.mesh.position.z + Math.cos(car.heading) * car.speed * dt;
  const before = { x: car.mesh.position.x, z: car.mesh.position.z };
  const pos = new THREE.Vector3(nx, 0, nz);
  collideCircle(pos, 1.6, colliders);
  let hit = false;
  if (Math.abs(pos.x - nx) > 0.01 || Math.abs(pos.z - nz) > 0.01) {
    hit = Math.abs(car.speed) > 6; car.speed *= 0.4;
  }
  car.mesh.position.set(pos.x, 0, pos.z);
  car.mesh.rotation.y = car.heading;
  // Tabrakan antar mobil: dorong pelan.
  for (const o of others) {
    if (o === car) continue;
    const dx = car.mesh.position.x - o.mesh.position.x;
    const dz = car.mesh.position.z - o.mesh.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 3.4 && d > 0.01) {
      car.mesh.position.x += (dx / d) * (3.4 - d) * 0.5;
      car.mesh.position.z += (dz / d) * (3.4 - d) * 0.5;
      if (Math.abs(car.speed) > 8) { hit = true; car.speed *= 0.6; }
    }
  }
  // Putar roda.
  for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 2;
  return { hit, moved: Math.hypot(car.mesh.position.x - before.x, car.mesh.position.z - before.z) };
}
