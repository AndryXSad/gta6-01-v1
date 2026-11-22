// Rio on foot: a simple third-person walker with run, punch and health.
// The player object owns its mesh, its position and heading; main.js asks
// it to move each frame and reads back where it ended up.

import { PLAYER } from './config.js';
import { resolveCircleVsBuildings, clampToWorld } from './city.js';

export function createPlayer(scene) {
  const group = new THREE.Group();
  group.name = 'rio';

  const jacket = new THREE.MeshLambertMaterial({ color: 0xc22e2e });
  const jeans = new THREE.MeshLambertMaterial({ color: 0x2c3e60 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
  const hair = new THREE.MeshLambertMaterial({ color: 0x1c1410 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.05, 0.5), jacket);
  torso.position.y = 1.15; torso.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), skin);
  head.position.y = 1.95; head.castShadow = true;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.33, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), hair);
  cap.position.y = 2.0;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.75, 0.36), jeans);
  legL.position.set(-0.22, 0.38, 0);
  const legR = legL.clone();
  legR.position.x = 0.22;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.85, 0.28), jacket);
  armL.position.set(-0.58, 1.2, 0);
  const armR = armL.clone();
  armR.position.x = 0.58;

  group.add(torso, head, cap, legL, legR, armL, armR);
  scene.add(group);

  const state = {
    group,
    pos: new THREE.Vector3(0, 0, 30),
    heading: Math.PI, // facing north (towards -z is 0 in our convention below)
    health: PLAYER.health,
    lastDamageAt: -99,
    punchAt: -99,
    punchDidHit: false,
    walkPhase: 0,
    moving: false,
    speed: 0,
  };
  group.position.copy(state.pos);

  function move(dt, input, colliders, time) {
    // input.forward/right are -1..1 in camera space; heading turns the body.
    const run = input.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
    const mx = input.right;
    const mz = input.forward;
    const len = Math.hypot(mx, mz);
    state.moving = len > 0.01;
    if (state.moving) {
      const nx = mx / (len || 1);
      const nz = mz / (len || 1);
      state.pos.x += nx * run * dt;
      state.pos.z += nz * run * dt;
      state.heading = Math.atan2(nx, nz);
      state.speed = run;
      state.walkPhase += dt * run * 1.6;
      const swing = Math.sin(state.walkPhase) * 0.5;
      legL.rotation.x = swing;
      legR.rotation.x = -swing;
      armL.rotation.x = -swing * 0.8;
      armR.rotation.x = swing * 0.8;
    } else {
      state.speed = 0;
      legL.rotation.x *= 0.8;
      legR.rotation.x *= 0.8;
      armL.rotation.x *= 0.8;
      armR.rotation.x *= 0.8;
    }
    group.rotation.y = state.heading;
    // walls, then the edge of the world
    const fixed = resolveCircleVsBuildings(state.pos.x, state.pos.z, PLAYER.radius, colliders);
    state.pos.x = fixed.x; state.pos.z = fixed.z;
    const clamped = clampToWorld(state.pos.x, state.pos.z);
    state.pos.x = clamped.x; state.pos.z = clamped.z;
    group.position.copy(state.pos);
    // slow health regen once the heat of the moment has passed
    if (time - state.lastDamageAt > PLAYER.regenDelay && state.health < PLAYER.health) {
      state.health = Math.min(PLAYER.health, state.health + PLAYER.regenRate * dt);
    }
  }

  function damage(amount, time) {
    state.health = Math.max(0, state.health - amount);
    state.lastDamageAt = time;
    return state.health <= 0;
  }

  function tryPunch(time) {
    if (time - state.punchAt < PLAYER.punchCooldown) return false;
    state.punchAt = time;
    state.punchDidHit = false;
    armR.rotation.x = -1.9; // a visible swing for this frame's render
    return true;
  }

  function resetTo(x, z, heading = Math.PI, heal = true) {
    state.pos.set(x, 0, z);
    state.heading = heading;
    if (heal) state.health = PLAYER.health;
    state.lastDamageAt = -99;
    group.position.copy(state.pos);
    group.rotation.y = heading;
  }

  // Live view: main.js reads pos/heading/health through getters so it
  // always sees the current values, not a copy from creation time.
  const api = { group, move, damage, tryPunch, resetTo };
  for (const key of ['pos', 'heading', 'health', 'speed', 'moving', 'walkPhase', 'lastDamageAt', 'punchAt']) {
    Object.defineProperty(api, key, { get: () => state[key] });
  }
  return api;
}
