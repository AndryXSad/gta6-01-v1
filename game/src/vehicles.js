// Cars: one box-built mesh shared by the player car, traffic, parked cars
// and police, plus the arcade driving physics every driven car uses.
import { CAR, PALETTE, WORLD } from './config.js';

const THREE = window.THREE;

const CAR_COLORS = [0xc0392b, 0x2471a3, 0xd4ac0d, 0x7d3c98, 0x1e8449, 0xca6f1e, 0x95a5a6, 0x2c3e50, 0xe8e8e8];

export function createCarMesh(color, isPolice) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x1a2733 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.4), bodyMat);
  body.position.y = 0.65;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 2.2), glassMat);
  cabin.position.set(0, 1.3, -0.2);
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  for (const [x, z] of [[-1.05, 1.45], [1.05, 1.45], [-1.05, -1.45], [1.05, -1.45]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.42, z);
    group.add(wheel);
  }
  const lightMat = new THREE.MeshLambertMaterial({ color: 0xfff2b0 });
  for (const x of [-0.7, 0.7]) {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), lightMat);
    light.position.set(x, 0.7, 2.21);
    group.add(light);
  }
  if (isPolice) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.5), new THREE.MeshLambertMaterial({ color: 0x223344 }));
    bar.position.set(0, 1.72, -0.2);
    group.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.24, 0.52), new THREE.MeshLambertMaterial({ color: 0xe33a2c }));
    red.position.set(-0.32, 1.72, -0.2);
    group.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.24, 0.52), new THREE.MeshLambertMaterial({ color: 0x2c6fe3 }));
    blue.position.set(0.32, 1.72, -0.2);
    group.add(blue);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.3, 4.42), new THREE.MeshLambertMaterial({ color: 0xe8e8e8 }));
    stripe.position.y = 0.62;
    group.add(stripe);
  }
  return group;
}

export function makeCar(scene, x, z, heading, color, kind) {
  const mesh = createCarMesh(color, kind === 'police');
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  scene.add(mesh);
  return { mesh, x, z, heading, speed: 0, color, kind: kind || 'traffic', steer: 0 };
}

export function syncCarMesh(car) {
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
}

// Arcade driving: throttle, brake/reverse, steering that bites harder at
// speed, drag, and a push-out against buildings and the world edge.
export function driveCar(car, input, dt, collide) {
  const forward = input.throttle;
  const steerInput = input.steer;
  if (forward > 0) car.speed += CAR.accel * forward * dt;
  else if (forward < 0) {
    if (car.speed > 0.5) car.speed -= CAR.brake * dt;
    else car.speed -= CAR.accel * 0.7 * dt;
  }
  if (input.handbrake) car.speed -= Math.sign(car.speed) * CAR.brake * 1.4 * dt;
  car.speed -= car.speed * CAR.drag * dt;
  if (car.speed > CAR.maxSpeed) car.speed = CAR.maxSpeed;
  if (car.speed < -CAR.maxReverse) car.speed = -CAR.maxReverse;
  if (Math.abs(car.speed) < 0.05 && forward === 0) car.speed = 0;
  const steerAmount = steerInput * CAR.steer * dt * Math.min(1, Math.abs(car.speed) / 8 + 0.25) * (car.speed >= 0 ? 1 : -1);
  car.heading += steerAmount;
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const fixed = collide(nx, nz, CAR.radius);
  if (fixed.x !== nx || fixed.z !== nz) car.speed *= 0.55;
  car.x = Math.max(-WORLD.bound, Math.min(WORLD.bound, fixed.x));
  car.z = Math.max(-WORLD.bound, Math.min(WORLD.bound, fixed.z));
  syncCarMesh(car);
}

export function randomCarColor(random) {
  return CAR_COLORS[Math.floor(random() * CAR_COLORS.length)];
}

export { PALETTE };
