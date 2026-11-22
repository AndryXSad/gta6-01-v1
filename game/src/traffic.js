// Traffic and pedestrians: the city breathing. Cars loop the road grid on
// right-hand lanes and turn at crossings; pedestrians walk the pavements
// and run from trouble. Everything is seeded, so a screenshot can be
// staged the same way twice.

import { CFG } from './config.js';
import { makeCar, randomCarColour } from './vehicles.js';
import { resolveCircleVsBuildings, clampToWorld } from './city.js';

const DIRS = [
  { x: 0, z: -1 }, // north
  { x: 1, z: 0 }, // east
  { x: 0, z: 1 }, // south
  { x: -1, z: 0 }, // west
];

function nearestRoadCoord(v, roads) {
  let best = roads[0];
  let bd = Infinity;
  for (const r of roads) {
    const d = Math.abs(v - r);
    if (d < bd) { bd = d; best = r; }
  }
  return best;
}

export function createTraffic(scene, rng, colliders, count = 14) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const vertical = rng.chance(0.5);
    const road = rng.pick(CFG.roadCenters);
    const along = rng.range(-220, 220);
    const dir = rng.int(0, 3);
    const lane = CFG.laneOffset * (dir === 0 || dir === 3 ? 1 : -1);
    const x = vertical ? road + lane : along;
    const z = vertical ? along : road + lane;
    const car = makeCar(scene, {
      color: randomCarColour(rng),
      x, z,
      heading: Math.atan2(DIRS[dir].x, DIRS[dir].z),
    });
    car.driver = 'npc';
    car.cruise = rng.range(9, 15);
    car.dir = dir;
    car.vertical = vertical;
    car.road = road;
    cars.push(car);
  }

  function update(dt, playerPos, playerSpeed) {
    for (const car of cars) {
      const d = DIRS[car.dir];
      // slow down for a car ahead on the same lane
      let target = car.cruise;
      for (const other of cars) {
        if (other === car) continue;
        const dx = other.pos.x - car.pos.x;
        const dz = other.pos.z - car.pos.z;
        const ahead = dx * d.x + dz * d.z;
        const side = Math.abs(dx * -d.z + dz * d.x);
        if (ahead > 0 && ahead < 12 && side < 3) target = Math.min(target, 3);
      }
      // ...and for the player, when the player is right in front
      const pdx = playerPos.x - car.pos.x;
      const pdz = playerPos.z - car.pos.z;
      const pAhead = pdx * d.x + pdz * d.z;
      const pSide = Math.abs(pdx * -d.z + pdz * d.x);
      if (pAhead > 0 && pAhead < 10 && pSide < 3) target = Math.min(target, 2);
      car.speed += (target - car.speed) * Math.min(1, 2 * dt);
      car.pos.x += d.x * car.speed * dt;
      car.pos.z += d.z * car.speed * dt;

      // at a crossing, sometimes turn; at the edge of the grid, turn around
      const atCrossing = Math.abs(car.pos.x - nearestRoadCoord(car.pos.x, CFG.roadCenters)) < 1.2
        && Math.abs(car.pos.z - nearestRoadCoord(car.pos.z, CFG.roadCenters)) < 1.2;
      const offGrid = Math.abs(car.pos.x) > 225 || Math.abs(car.pos.z) > 225;
      if ((atCrossing && rng.chance(dt * 0.25)) || offGrid) {
        const turn = offGrid ? 2 : rng.pick([-1, 1]);
        car.dir = (car.dir + turn + 4) % 4;
        const nd = DIRS[car.dir];
        car.vertical = nd.x === 0;
        car.road = car.vertical
          ? nearestRoadCoord(car.pos.x, CFG.roadCenters)
          : nearestRoadCoord(car.pos.z, CFG.roadCenters);
        car.heading = Math.atan2(nd.x, nd.z);
        car.group.rotation.y = car.heading;
        // snap onto the new lane so turns look clean
        const lane = CFG.laneOffset * (car.dir === 0 || car.dir === 3 ? 1 : -1);
        if (car.vertical) car.pos.x = car.road + lane;
        else car.pos.z = car.road + lane;
      }
      car.group.position.copy(car.pos);
      for (const w of car.wheels) w.rotation.x += (car.speed * dt) / 0.38;
    }
  }

  return { cars, update };
}

export function createPedestrians(scene, rng, count = 26) {
  const peds = [];
  const shirtCols = [0xe8e8e8, 0x3a7d44, 0xd8a020, 0x7a4a9c, 0x2e5fa3, 0xc96a1e, 0x8a5a3a];
  for (let i = 0; i < count; i++) {
    const g = new THREE.Group();
    const shirt = new THREE.MeshLambertMaterial({ color: rng.pick(shirtCols) });
    const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.42), shirt);
    body.position.y = 1.05; body.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), skin);
    head.position.y = 1.8;
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.6, 0.3), new THREE.MeshLambertMaterial({ color: 0x2c3e60 }));
    legL.position.set(-0.18, 0.3, 0);
    const legR = legL.clone(); legR.position.x = 0.18;
    g.add(body, head, legL, legR);
    const road = rng.pick(CFG.roadCenters);
    const vertical = rng.chance(0.5);
    const along = rng.range(-220, 220);
    const side = rng.pick([-1, 1]) * (CFG.roadWidth / 2 + 2);
    const x = vertical ? road + side : along;
    const z = vertical ? along : road + side;
    g.position.set(x, 0, z);
    scene.add(g);
    peds.push({
      group: g, legL, legR,
      pos: new THREE.Vector3(x, 0, z),
      dir: rng.int(0, 3),
      speed: rng.range(1.2, 2.2),
      vertical,
      road,
      phase: rng.range(0, 6),
      fleeing: false,
      fleeUntil: 0,
    });
  }

  function update(dt, dangerPos, dangerRadius, time) {
    for (const p of peds) {
      const dx = p.pos.x - dangerPos.x;
      const dz = p.pos.z - dangerPos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < dangerRadius) {
        p.fleeing = true;
        p.fleeUntil = time + 2.5;
        p.dir = Math.abs(dx) > Math.abs(dz)
          ? (dx > 0 ? 1 : 3)
          : (dz > 0 ? 2 : 0);
      } else if (time > p.fleeUntil) {
        p.fleeing = false;
      }
      const speed = p.fleeing ? 5.5 : p.speed;
      const d = DIRS[p.dir];
      p.pos.x += d.x * speed * dt;
      p.pos.z += d.z * speed * dt;
      p.phase += dt * speed * 2.4;
      const swing = Math.sin(p.phase) * 0.45;
      p.legL.rotation.x = swing;
      p.legR.rotation.x = -swing;
      // turn at crossings, turn around at the grid edge
      const atCrossing = Math.abs(p.pos.x - nearestRoadCoord(p.pos.x, CFG.roadCenters)) < 1
        && Math.abs(p.pos.z - nearestRoadCoord(p.pos.z, CFG.roadCenters)) < 1;
      if ((atCrossing && rng.chance(dt * 0.2)) || Math.abs(p.pos.x) > 232 || Math.abs(p.pos.z) > 232) {
        if (!p.fleeing) p.dir = rng.int(0, 3);
      }
      p.group.position.copy(p.pos);
      p.group.rotation.y = Math.atan2(d.x, d.z);
      const fixed = resolveCircleVsBuildings(p.pos.x, p.pos.z, 0.5, []);
      p.pos.x = fixed.x; p.pos.z = fixed.z;
      const clamped = clampToWorld(p.pos.x, p.pos.z, 2);
      p.pos.x = clamped.x; p.pos.z = clamped.z;
    }
  }

  return { peds, update };
}
