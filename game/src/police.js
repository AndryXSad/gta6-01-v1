// Wanted level and police: the heat of Solmar. Crimes add heat, heat sets
// the stars, stars set how many patrol cars and foot officers come after
// the player — and at three stars they start shooting. Lay low, stay out
// of sight, and the heat cools off on its own.

import { WANTED } from './config.js';
import { makeCar } from './vehicles.js';
import { CFG } from './config.js';

export function createPolice(scene, rng, colliders) {
  const state = {
    heat: 0,
    stars: 0,
    lastCrimeAt: -99,
    cars: [],
    cops: [],
    shotAt: -99,
  };

  function addCrime(amount, time) {
    state.heat = Math.min(100, state.heat + amount);
    state.lastCrimeAt = time;
    state.stars = Math.min(WANTED.maxStars, Math.ceil(state.heat / 20));
  }

  function wantedCarCount() {
    return Math.min(state.stars, 3);
  }

  function spawnPatrolNear(target, minDist = 55, maxDist = 80) {
    const road = rng.pick(CFG.roadCenters);
    const vertical = rng.chance(0.5);
    const along = rng.range(-200, 200);
    let x = vertical ? road : along;
    let z = vertical ? along : road;
    const d = Math.hypot(x - target.x, z - target.z);
    if (d < minDist) { x = target.x + (x > target.x ? maxDist : -maxDist); }
    const car = makeCar(scene, { police: true, x, z, heading: rng.range(0, Math.PI * 2) });
    car.driver = 'police';
    car.cruise = 26;
    state.cars.push(car);
    return car;
  }

  function spawnCopNear(target) {
    const g = new THREE.Group();
    const uniform = new THREE.MeshLambertMaterial({ color: 0x1d4ed8 });
    const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.05, 0.48), uniform);
    body.position.y = 1.15; body.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), skin);
    head.position.y = 1.95;
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.14, 10), uniform);
    hat.position.y = 2.18;
    g.add(body, head, hat);
    const a = rng.range(0, Math.PI * 2);
    const x = target.x + Math.cos(a) * rng.range(25, 40);
    const z = target.z + Math.sin(a) * rng.range(25, 40);
    g.position.set(x, 0, z);
    scene.add(g);
    const cop = { group: g, pos: new THREE.Vector3(x, 0, z), speed: 0, grabAt: -99 };
    state.cops.push(cop);
    return cop;
  }

  // Exact placement (used by screenshot staging): a patrol car / foot
  // officer at a chosen spot instead of a random one nearby.
  function placePatrol(x, z, heading = 0) {
    const car = makeCar(scene, { police: true, x, z, heading });
    car.driver = 'police';
    car.cruise = 26;
    state.cars.push(car);
    return car;
  }

  function placeCop(x, z) {
    const g = new THREE.Group();
    const uniform = new THREE.MeshLambertMaterial({ color: 0x1d4ed8 });
    const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.05, 0.48), uniform);
    body.position.y = 1.15; body.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), skin);
    head.position.y = 1.95;
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.14, 10), uniform);
    hat.position.y = 2.18;
    g.add(body, head, hat);
    g.position.set(x, 0, z);
    scene.add(g);
    const cop = { group: g, pos: new THREE.Vector3(x, 0, z), speed: 0, grabAt: -99 };
    state.cops.push(cop);
    return cop;
  }

  function clear() {
    for (const c of state.cars) c.group.parent?.remove(c.group);
    for (const c of state.cops) c.group.parent?.remove(c.group);
    // mutate in place so live references held elsewhere stay valid
    state.cars.length = 0;
    state.cops.length = 0;
    state.heat = 0;
    state.stars = 0;
  }

  // One frame of the chase. Returns events main.js should react to:
  // { rammed, shotHit, grabbed }.
  function update(dt, time, player, playerCar, tracerGroup) {
    const events = { rammed: false, shotHit: false, grabbed: false };
    // heat cools when the player has been quiet and no police is close
    const nearestPolice = state.cars.length
      ? Math.min(...state.cars.map((c) => Math.hypot(c.pos.x - player.pos.x, c.pos.z - player.pos.z)))
      : Infinity;
    if (time - state.lastCrimeAt > WANTED.quietSeconds && nearestPolice > 60) {
      state.heat = Math.max(0, state.heat - WANTED.decayPerSec * dt);
      state.stars = Math.min(WANTED.maxStars, Math.ceil(state.heat / 20));
    }
    // keep the right number of patrol cars on the road
    while (state.cars.length < wantedCarCount()) spawnPatrolNear(player.pos);
    while (state.cars.length > wantedCarCount()) {
      const old = state.cars.pop();
      old.group.parent?.remove(old.group);
    }
    const wantCops = state.stars >= 2 ? state.stars - 1 : 0;
    while (state.cops.length < wantCops) spawnCopNear(player.pos);
    while (state.cops.length > wantCops) {
      const old = state.cops.pop();
      old.group.parent?.remove(old.group);
    }

    const target = playerCar ? playerCar.pos : player.pos;
    const targetSpeed = playerCar ? Math.abs(playerCar.speed) : player.speed;

    for (const car of state.cars) {
      car.flashLights(time);
      const dx = target.x - car.pos.x;
      const dz = target.z - car.pos.z;
      const dist = Math.hypot(dx, dz) || 1;
      const wantHeading = Math.atan2(dx, dz);
      let dh = wantHeading - car.heading;
      while (dh > Math.PI) dh -= Math.PI * 2;
      while (dh < -Math.PI) dh += Math.PI * 2;
      car.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
      // chase faster than the player drives, slower when far away is fine
      const chaseSpeed = Math.min(38, 14 + targetSpeed * 1.05 + state.stars * 1.5);
      car.speed += (chaseSpeed - car.speed) * Math.min(1, 1.6 * dt);
      car.pos.x += Math.sin(car.heading) * car.speed * dt;
      car.pos.z += Math.cos(car.heading) * car.speed * dt;
      car.group.position.copy(car.pos);
      car.group.rotation.y = car.heading;
      for (const w of car.wheels) w.rotation.x += (car.speed * dt) / 0.38;

      // ramming: a hard hit hurts and counts as a crime against the player
      if (dist < 3.4) {
        if (playerCar) {
          playerCar.speed *= 0.55;
          events.rammed = true;
        } else if (time - state.shotAt > 0.8) {
          state.shotAt = time;
          events.rammed = true;
        }
        // bounce the patrol car off so it does not stick to the player
        car.pos.x -= Math.sin(car.heading) * 3;
        car.pos.z -= Math.cos(car.heading) * 3;
      }

      // shooting: at 3+ stars, a patrol car at range fires in bursts
      if (state.stars >= WANTED.shootAtStars && dist > 18 && dist < 55 && time - state.shotAt > 0.9) {
        state.shotAt = time;
        fireTracer(tracerGroup, car.pos, target, time);
        if (rng.chance(0.4)) events.shotHit = true;
      }
    }

    for (const cop of state.cops) {
      const dx = player.pos.x - cop.pos.x;
      const dz = player.pos.z - cop.pos.z;
      const dist = Math.hypot(dx, dz) || 1;
      const speed = dist < 25 ? 7.5 : 5;
      cop.pos.x += (dx / dist) * speed * dt;
      cop.pos.z += (dz / dist) * speed * dt;
      cop.group.position.copy(cop.pos);
      cop.group.rotation.y = Math.atan2(dx, dz);
      // grabbing: a cop that stays on the player for a moment makes the bust
      if (dist < 1.6) {
        if (cop.grabAt < 0) cop.grabAt = time;
        if (time - cop.grabAt > 1.2) events.grabbed = true;
      } else {
        cop.grabAt = -99;
      }
    }
    return events;
  }

  // A short-lived tracer line from a police muzzle to the player.
  function fireTracer(tracerGroup, from, to, time) {
    if (!tracerGroup) return;
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(from.x, 1.2, from.z),
      new THREE.Vector3(to.x, 1.2 + (to.y || 0), to.z),
    ]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9 }));
    line.userData.born = time;
    tracerGroup.add(line);
  }

  function clearTracers(tracerGroup, time) {
    if (!tracerGroup) return;
    for (const line of [...tracerGroup.children]) {
      if (time - line.userData.born > 0.18) {
        tracerGroup.remove(line);
        line.geometry.dispose();
        line.material.dispose();
      }
    }
  }

  // Live view: heat, stars and the patrol lists are read through getters
  // so the HUD and the minimap always see the current values.
  const api = { addCrime, update, clear, fireTracer, clearTracers, spawnPatrolNear, spawnCopNear, placePatrol, placeCop };
  Object.defineProperties(api, {
    heat: { get: () => state.heat },
    stars: { get: () => state.stars },
    cars: { get: () => state.cars },
    cops: { get: () => state.cops },
    lastCrimeAt: { get: () => state.lastCrimeAt },
  });
  return api;
}
