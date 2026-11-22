// Cars: one builder for every car in Solmar — the player's rides, parked
// cars to steal, traffic and police — plus the arcade driving model the
// player steers with. A car is a group with a body, a cabin, four wheels
// and lights; its state is speed and heading, not a physics engine.

import { CAR } from './config.js';
import { resolveCircleVsBuildings, clampToWorld } from './city.js';

const PALETTE = [0xc22e2e, 0x2e5fa3, 0xe8e8e8, 0x222831, 0xd8a020, 0x3a7d44, 0x7a4a9c, 0xc96a1e];

export function makeCar(scene, { color, police = false, x = 0, z = 0, heading = 0 } = {}) {
  const group = new THREE.Group();
  group.name = police ? 'police-car' : 'car';

  const paint = new THREE.MeshLambertMaterial({ color: police ? 0xf2f2f2 : color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1a2733 });
  const tyre = new THREE.MeshLambertMaterial({ color: 0x141414 });
  const trim = new THREE.MeshLambertMaterial({ color: police ? 0x1d4ed8 : 0x30343a });

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.62, 4.4), paint);
  body.position.y = 0.55; body.castShadow = true;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2.2), glass);
  cabin.position.set(0, 1.1, -0.2); cabin.castShadow = true;
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.18, 4.42), trim);
  stripe.position.y = 0.62;
  group.add(body, cabin, stripe);

  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, tyre);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.38, wz);
    group.add(w);
    wheels.push(w);
  }

  // headlights and taillights so cars read at night and from behind
  const headMat = new THREE.MeshLambertMaterial({ color: 0xfff6c8, emissive: 0x998800 });
  const tailMat = new THREE.MeshLambertMaterial({ color: 0xff2a2a, emissive: 0x771111 });
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.08), headMat);
    h.position.set(s * 0.62, 0.62, 2.22);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.08), tailMat);
    t.position.set(s * 0.62, 0.62, -2.22);
    group.add(h, t);
  }

  // a police light bar — the one thing that says "run" from a distance
  let barA = null;
  let barB = null;
  if (police) {
    barA = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xff2020, emissive: 0xaa0000 }));
    barA.position.set(-0.4, 1.5, -0.2);
    barB = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x2040ff, emissive: 0x0000aa }));
    barB.position.set(0.4, 1.5, -0.2);
    group.add(barA, barB);
  }

  group.position.set(x, 0, z);
  group.rotation.y = heading;
  scene.add(group);

  const car = {
    group, wheels, barA, barB,
    pos: new THREE.Vector3(x, 0, z),
    heading,
    speed: 0,
    steer: 0,
    police,
    stolen: false,
    driver: null, // 'player' | 'npc' | null (parked)
    flashAt: 0,
  };

  // Arcade step: accelerate, steer, slide a little, then walls and bounds.
  function drive(dt, input, colliders) {
    const throttle = input.forward; // -1..1
    const steering = input.right; // -1..1
    if (throttle > 0) car.speed += CAR.accel * throttle * dt;
    else if (throttle < 0) {
      car.speed += (car.speed > 0.5 ? -CAR.brake : CAR.accel * 0.6) * dt;
    } else {
      car.speed -= Math.sign(car.speed) * 6 * dt;
      if (Math.abs(car.speed) < 0.2) car.speed = 0;
    }
    car.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, car.speed));
    const grip = input.handbrake ? CAR.handbrakeGrip : CAR.grip;
    const steerTarget = steering * CAR.steerRate * Math.min(1, Math.abs(car.speed) / 8);
    car.steer += (steerTarget - car.steer) * Math.min(1, grip * dt);
    car.heading += car.steer * dt * Math.sign(car.speed || 1);
    // forward is +z rotated by heading; velocity blends toward it (drift)
    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    car.pos.x += fx * car.speed * dt;
    car.pos.z += fz * car.speed * dt;
    const fixed = resolveCircleVsBuildings(car.pos.x, car.pos.z, CAR.radius, colliders);
    if (fixed.pushed > 0) car.speed *= 0.45;
    car.pos.x = fixed.x; car.pos.z = fixed.z;
    const clamped = clampToWorld(car.pos.x, car.pos.z, 2);
    if (clamped.x !== car.pos.x || clamped.z !== car.pos.z) car.speed *= 0.3;
    car.pos.x = clamped.x; car.pos.z = clamped.z;
    group.position.copy(car.pos);
    group.rotation.y = car.heading;
    // wheels spin with speed; front wheels yaw with steering
    for (const w of wheels) w.rotation.x += (car.speed * dt) / 0.38;
    wheels[0].rotation.y = car.steer * 0.35;
    wheels[1].rotation.y = car.steer * 0.35;
  }

  function flashLights(time) {
    if (!police || !barA || !barB) return;
    const on = Math.floor(time * 4) % 2 === 0;
    barA.material.emissive.setHex(on ? 0xff0000 : 0x220000);
    barB.material.emissive.setHex(on ? 0x000022 : 0x0000ff);
  }

  // Return the live car object itself (not a copy) so speed, heading and
  // position stay current for whoever holds the reference.
  car.drive = drive;
  car.flashLights = flashLights;
  car.colour = police ? 0xf2f2f2 : color;
  return car;
}

export function randomCarColour(rng) {
  return rng.pick(PALETTE);
}
