// SOLMAR cars — one low-poly car factory (body, cabin, wheels, lights)
// plus arcade driving for the player's car. Parked cars can be stolen
// with E; stealing is reported through onSteal so police can raise heat.
import { CAR, PALETTE } from './config.js';
import { hitsCollider, clampToWorld } from './city.js';

const CAR_COLORS = [0xe63946, 0x457b9d, 0xf4d35e, 0x8d99ae, 0x2a9d8f, 0xe0a458, 0x6d6875, 0xf1faee, 0x3a6b4f];

export function makeCarMesh(color, isPolice) {
  const g = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1d3557 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x22252a });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.3), paint);
  body.position.y = 0.55;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.55, 2.1), glass);
  cabin.position.set(0, 1.1, -0.25);
  g.add(cabin);

  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 10);
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, dark);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.36, wz);
    g.add(w);
    wheels.push(w);
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff6c9 });
  for (const lx of [-0.65, 0.65]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.16, 0.08), lightMat);
    lamp.position.set(lx, 0.62, 2.16);
    g.add(lamp);
  }

  let beacon = null;
  let beaconMat = null;
  if (isPolice) {
    beaconMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
    beacon = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.18, 0.5), beaconMat);
    beacon.position.set(0, 1.45, -0.25);
    g.add(beacon);
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.02, 0.18, 4.32),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    stripe.position.y = 0.72;
    g.add(stripe);
  }
  return { group: g, wheels, beacon, beaconMat };
}

export function spawnCar(scene, rng, x, z, heading, opts = {}) {
  const color = opts.color ?? (opts.police ? PALETTE.carPolice : rng.pick(CAR_COLORS));
  const built = makeCarMesh(color, !!opts.police);
  built.group.position.set(x, 0, z);
  built.group.rotation.y = heading;
  scene.add(built.group);
  return {
    mesh: built.group,
    wheels: built.wheels,
    beacon: built.beacon,
    beaconMat: built.beaconMat,
    x,
    z,
    heading,
    speed: 0,
    police: !!opts.police,
    stolen: false,
    owner: opts.owner ?? 'parked', // 'parked' | 'traffic' | 'police' | 'player'
    flash: 0,
  };
}

// Arcade driving: W/S accelerate / brake-reverse, A/D steer (stronger at
// speed). Returns the speed change this frame (engine sound / HUD use).
export function driveCar(car, dt, keys, colliders) {
  const prev = car.speed;
  if (keys.w) car.speed += CAR.accel * dt;
  if (keys.s) car.speed -= (car.speed > 0.5 ? CAR.brake : CAR.accel * 0.6) * dt;
  if (!keys.w && !keys.s) car.speed *= Math.pow(0.4, dt); // coast down
  car.speed = Math.max(-CAR.reverseSpeed, Math.min(CAR.maxSpeed, car.speed));
  const steerInput = (keys.a ? 1 : 0) - (keys.d ? 1 : 0);
  const dir = car.speed >= 0 ? 1 : -1;
  car.heading += steerInput * CAR.steer * dt * Math.min(1, Math.abs(car.speed) / 8) * dir;
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  if (!hitsCollider(colliders, nx, nz, 2.0)) {
    car.x = nx;
    car.z = nz;
  } else {
    car.speed *= -0.25; // bounce off the wall, keep a little speed
  }
  const [cx, cz] = clampToWorld(car.x, car.z);
  car.x = cx;
  car.z = cz;
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  const spin = (car.speed * dt) / 0.36;
  for (const w of car.wheels) w.rotation.x += spin;
  if (car.beaconMat) {
    car.flash += dt * 6;
    car.beaconMat.color.setHex(Math.sin(car.flash) > 0 ? 0xff2222 : 0x2266ff);
  }
  return Math.abs(car.speed - prev);
}

export function nearestCar(cars, x, z, radius) {
  let best = null;
  let bestD = radius;
  for (const c of cars) {
    const d = Math.hypot(c.x - x, c.z - z);
    if (d < bestD) {
      best = c;
      bestD = d;
    }
  }
  return best;
}

// Park a few stealable cars along the roads for the player to grab.
export function parkCars(scene, rng, roadsV, roadsH, count) {
  const parked = [];
  const spots = [];
  for (const x of roadsV) for (const z of roadsH) spots.push([x, z]);
  for (let i = 0; i < count; i++) {
    const [rx, rz] = rng.pick(spots);
    const vertical = rng.chance(0.5);
    const x = vertical ? rx + 6.8 : rx + rng.range(-16, 16);
    const z = vertical ? rz + rng.range(-16, 16) : rz + 6.8;
    if (Math.abs(z) < -190) continue;
    parked.push(spawnCar(scene, rng, x, z, vertical ? 0 : Math.PI / 2, {}));
  }
  return parked;
}
