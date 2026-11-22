// Solmar traffic — NPC cars looping the road grid and pedestrians strolling
// the sidewalks. Cars brake for the car ahead; pedestrians scatter when the
// player's car barrels past them at speed.
import { TRAFFIC } from './config.js';
import { spawnCar } from './vehicles.js';

function makePedestrian(scene, color) {
  const g = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe8b98a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.36), shirt);
  body.position.y = 1.0;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 8, 6), skin);
  head.position.y = 1.62;
  g.add(head);
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.62, 0.26), new THREE.MeshLambertMaterial({ color: 0x33363b }));
  leg.position.set(-0.16, 0.31, 0);
  g.add(leg);
  const leg2 = leg.clone();
  leg2.position.x = 0.16;
  g.add(leg2);
  scene.add(g);
  return g;
}

export function createTraffic(scene, rng, roads) {
  const cars = [];
  for (let i = 0; i < TRAFFIC.carCount; i++) {
    const vertical = rng.chance(0.5);
    const line = vertical ? rng.pick(roads.roadsV) : rng.pick(roads.roadsH);
    const lane = rng.sign() * 2.6;
    const along = rng.range(-200, 200);
    const heading = vertical ? (lane > 0 ? 0 : Math.PI) : lane > 0 ? Math.PI / 2 : -Math.PI / 2;
    const car = spawnCar(
      scene,
      rng,
      vertical ? line + lane : along,
      vertical ? along : line + lane,
      heading,
      { owner: 'traffic', color: rng.chance(0.14) ? 0xf4d35e : undefined },
    );
    car.traffic = { vertical, line, lane, speed: TRAFFIC.carSpeed * rng.range(0.8, 1.25) };
    cars.push(car);
  }

  const peds = [];
  const pedColors = [0xc1666b, 0x457b9d, 0x7fb069, 0xe0a458, 0x8d99ae, 0xf1faee];
  for (let i = 0; i < TRAFFIC.pedCount; i++) {
    const mesh = makePedestrian(scene, rng.pick(pedColors));
    const vertical = rng.chance(0.5);
    const line = vertical ? rng.pick(roads.roadsV) : rng.pick(roads.roadsH);
    const side = rng.sign() * 7.4;
    peds.push({
      mesh,
      x: vertical ? line + side : rng.range(-200, 200),
      z: vertical ? rng.range(-200, 200) : line + side,
      heading: rng.range(0, Math.PI * 2),
      speed: TRAFFIC.pedSpeed * rng.range(0.7, 1.3),
      health: 100,
      vertical,
      line,
      side,
      flee: 0,
      walkPhase: rng.range(0, 6),
      onHit: null,
    });
  }
  return { cars, peds };
}

export function updateTraffic(t, dt, playerCar, playerPos, onPedHit) {
  // NPC cars: cruise their road line, wrap at the city edge, brake for the
  // car directly ahead on the same line.
  for (const c of t.cars) {
    const tr = c.traffic;
    let want = tr.speed;
    for (const o of t.cars) {
      if (o === c || !o.traffic || o.traffic.line !== tr.line || o.traffic.vertical !== tr.vertical) continue;
      const ahead = tr.vertical ? (o.z - c.z) * Math.cos(c.heading) : (o.x - c.x) * Math.sin(c.heading);
      const side = tr.vertical ? Math.abs(o.x - c.x) : Math.abs(o.z - c.z);
      if (ahead > 0 && ahead < 9 && side < 3) want = 0;
    }
    if (playerCar) {
      const dx = playerCar.x - c.x;
      const dz = playerCar.z - c.z;
      const ahead = tr.vertical ? dz * Math.cos(c.heading) : dx * Math.sin(c.heading);
      const side = tr.vertical ? Math.abs(dx) : Math.abs(dz);
      if (ahead > 0 && ahead < 10 && side < 3.5) want = 0;
    }
    const step = want * dt;
    if (tr.vertical) c.z += Math.cos(c.heading) * step;
    else c.x += Math.sin(c.heading) * step;
    if (c.z > 215) c.z = -215;
    if (c.z < -215) c.z = 215;
    if (c.x > 215) c.x = -215;
    if (c.x < -215) c.x = 215;
    c.mesh.position.set(c.x, 0, c.z);
    const spin = (want * dt) / 0.36;
    for (const w of c.wheels) w.rotation.x += spin;
  }

  // Pedestrians: amble along the sidewalk; flee the player's car; a hard hit
  // by a fast player car knocks one down and reports it (wanted heat).
  for (const p of t.peds) {
    if (p.health <= 0) {
      p.mesh.rotation.x = -Math.PI / 2; // lying down
      p.mesh.position.y = 0.3;
      continue;
    }
    let fleeing = false;
    if (playerCar && Math.abs(playerCar.speed) > 8) {
      const d = Math.hypot(p.x - playerCar.x, p.z - playerCar.z);
      if (d < 7) {
        fleeing = true;
        p.flee = 1.2;
        const dx = p.x - playerCar.x;
        const dz = p.z - playerCar.z;
        p.heading = Math.atan2(dx, dz);
      } else if (d < 3.5 && Math.abs(playerCar.speed) > 12) {
        p.health = 0;
        if (onPedHit) onPedHit(p);
      }
    }
    if (p.flee > 0) p.flee -= dt;
    const speed = fleeing ? p.speed * 2.4 : p.speed;
    p.x += Math.sin(p.heading) * speed * dt;
    p.z += Math.cos(p.heading) * speed * dt;
    // wander: at intersections, sometimes turn onto the crossing road
    if (Math.abs(p.x) % 46 < 1.2 || Math.abs(p.z) % 46 < 1.2) {
      if (Math.random() < dt * 0.25) p.heading += (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
    }
    if (p.x > 215 || p.x < -215 || p.z > 215 || p.z < -215) p.heading += Math.PI;
    p.walkPhase += dt * speed * 2.2;
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.heading;
    p.mesh.rotation.z = Math.sin(p.walkPhase) * 0.06;
  }
}
