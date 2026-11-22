// Traffic: cars that cruise the road grid (turning at intersections) and
// pedestrians who wander the sidewalks, plus parked cars the player can steal.
import { TRAFFIC, WORLD } from './config.js';
import { makeCar, randomCarColor, syncCarMesh } from './vehicles.js';
import { range } from './random.js';

const THREE = window.THREE;

function makePedMesh(random) {
  const group = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: [0xd35400, 0x2e86c1, 0x7d3c98, 0x229954, 0xc0392b, 0x5d6d7e][Math.floor(random() * 6)] });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.05, 0.42), shirt);
  body.position.y = 1.05;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshLambertMaterial({ color: 0xe0ac69 }));
  head.position.y = 1.85;
  group.add(head);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 0.36), new THREE.MeshLambertMaterial({ color: 0x2c3e50 }));
  legs.position.y = 0.28;
  group.add(legs);
  return group;
}

export function createTraffic(scene, rng, city) {
  const lines = city.roadLines;
  const cars = [];
  for (let i = 0; i < TRAFFIC.cars; i += 1) {
    const axis = rng() < 0.5 ? 'x' : 'z';
    const line = lines[Math.floor(rng() * lines.length)];
    const dir = rng() < 0.5 ? 1 : -1;
    const s = range(rng, -WORLD.half, WORLD.half);
    const car = makeCar(scene, 0, 0, 0, randomCarColor(rng), 'traffic');
    car.axis = axis;
    car.line = line;
    car.s = s;
    car.dir = dir;
    car.speed = range(rng, TRAFFIC.carSpeedMin, TRAFFIC.carSpeedMax);
    car.lane = dir > 0 ? 3.5 : -3.5;
    cars.push(car);
  }
  const parked = [];
  for (let i = 0; i < TRAFFIC.parked; i += 1) {
    const axis = rng() < 0.5 ? 'x' : 'z';
    const line = lines[Math.floor(rng() * lines.length)];
    const s = range(rng, -WORLD.half + 20, WORLD.half - 20);
    const x = axis === 'x' ? s : line + 5.6;
    const z = axis === 'x' ? line + 5.6 : s;
    const heading = axis === 'x' ? Math.PI / 2 : 0;
    const car = makeCar(scene, x, z, heading, randomCarColor(rng), 'parked');
    car.axis = axis;
    car.line = line;
    car.s = s;
    parked.push(car);
  }
  const peds = [];
  for (let i = 0; i < TRAFFIC.peds; i += 1) {
    const mesh = makePedMesh(rng);
    scene.add(mesh);
    const line = lines[Math.floor(rng() * lines.length)];
    const along = range(rng, -WORLD.half, WORLD.half);
    const side = rng() < 0.5 ? 9.5 : -9.5;
    const ped = {
      mesh,
      x: rng() < 0.5 ? along : line + side,
      z: rng() < 0.5 ? line + side : along,
      tx: 0,
      tz: 0,
      speed: range(rng, TRAFFIC.pedSpeedMin, TRAFFIC.pedSpeedMax),
      heading: 0,
    };
    pickPedTarget(ped, rng, lines);
    peds.push(ped);
  }
  return { cars, parked, peds };
}

function pickPedTarget(ped, rng, lines) {
  const line = lines[Math.floor(rng() * lines.length)];
  const along = range(rng, -WORLD.half, WORLD.half);
  const side = rng() < 0.5 ? 9.5 : -9.5;
  if (rng() < 0.5) { ped.tx = along; ped.tz = line + side; }
  else { ped.tx = line + side; ped.tz = along; }
}

export function updateTraffic(traffic, dt, rng, city) {
  const lines = city.roadLines;
  for (const car of traffic.cars) {
    car.s += car.dir * car.speed * dt;
    if (car.s > WORLD.half) car.s = -WORLD.half;
    if (car.s < -WORLD.half) car.s = WORLD.half;
    // At an intersection, sometimes turn onto the cross street.
    for (const cross of lines) {
      if (Math.abs(car.s - cross) < car.speed * dt * 0.6 && rng() < 0.22) {
        const oldAxis = car.axis;
        car.axis = oldAxis === 'x' ? 'z' : 'x';
        car.line = cross;
        car.s = oldAxis === 'x' ? car.line + car.lane : car.line + car.lane;
        car.dir = rng() < 0.5 ? 1 : -1;
        car.lane = car.dir > 0 ? 3.5 : -3.5;
        break;
      }
    }
    if (car.axis === 'x') {
      car.x = car.s;
      car.z = car.line + car.lane;
      car.heading = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      car.z = car.s;
      car.x = car.line + car.lane;
      car.heading = car.dir > 0 ? 0 : Math.PI;
    }
    syncCarMesh(car);
  }
  for (const ped of traffic.peds) {
    const dx = ped.tx - ped.x;
    const dz = ped.tz - ped.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1.2) {
      pickPedTarget(ped, rng, lines);
    } else {
      ped.heading = Math.atan2(dx, dz);
      ped.x += (dx / dist) * ped.speed * dt;
      ped.z += (dz / dist) * ped.speed * dt;
    }
    ped.mesh.position.set(ped.x, 0, ped.z);
    ped.mesh.rotation.y = ped.heading;
    ped.mesh.position.y = Math.abs(Math.sin(performance.now() * 0.004 + ped.x)) * 0.04;
  }
}

// The nearest stealable car (traffic or parked) within reach of a point.
export function nearestStealable(traffic, x, z, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of [...traffic.cars, ...traffic.parked]) {
    const d = Math.hypot(car.x - x, car.z - z);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}
