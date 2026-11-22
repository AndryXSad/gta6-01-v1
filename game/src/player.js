// Rio on foot: a simple box-built character, camera-relative WASD movement,
// running, punching, and getting in and out of cars.
import { PLAYER, WORLD } from './config.js';

const THREE = window.THREE;

export function createPlayer(scene) {
  const group = new THREE.Group();
  const jacket = new THREE.MeshLambertMaterial({ color: 0x2e86de });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe0ac69 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.05, 0.5), jacket);
  body.position.y = 1.15;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), skin);
  head.position.y = 1.95;
  group.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 0.7), new THREE.MeshLambertMaterial({ color: 0xc0392b }));
  cap.position.y = 2.2;
  group.add(cap);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.62, 0.36), pants);
  legL.position.set(-0.2, 0.31, 0);
  group.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.62, 0.36), pants);
  legR.position.set(0.2, 0.31, 0);
  group.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.8, 0.28), jacket);
  armL.position.set(-0.56, 1.2, 0);
  group.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.8, 0.28), jacket);
  armR.position.set(0.56, 1.2, 0);
  group.add(armR);
  scene.add(group);
  return {
    mesh: group,
    legL,
    legR,
    armL,
    armR,
    x: 0,
    z: 56,
    heading: 0,
    speed: 0,
    health: PLAYER.maxHealth,
    walkPhase: 0,
    punchTimer: 0,
    inCar: null,
  };
}

// Move on foot. Input is camera-relative: forward follows the camera yaw.
export function updateOnFoot(player, input, cameraYaw, dt, collide) {
  let mx = 0;
  let mz = 0;
  if (input.forward) mz += 1;
  if (input.back) mz -= 1;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  const moving = mx !== 0 || mz !== 0;
  const speed = input.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
  if (moving) {
    const len = Math.hypot(mx, mz);
    mx /= len;
    mz /= len;
    const sin = Math.sin(cameraYaw);
    const cos = Math.cos(cameraYaw);
    const wx = mx * cos - mz * sin;
    const wz = mx * sin + mz * cos;
    const nx = player.x + wx * speed * dt;
    const nz = player.z + wz * speed * dt;
    const fixed = collide(nx, nz, PLAYER.radius);
    player.x = Math.max(-WORLD.bound, Math.min(WORLD.bound, fixed.x));
    player.z = Math.max(-WORLD.bound, Math.min(WORLD.bound, fixed.z));
    player.heading = Math.atan2(wx, wz);
    player.walkPhase += dt * speed * 1.6;
    player.speed = speed;
  } else {
    player.speed = 0;
  }
  player.mesh.position.set(player.x, 0, player.z);
  player.mesh.rotation.y = player.heading;
  const swing = moving ? Math.sin(player.walkPhase) * 0.55 : 0;
  player.legL.rotation.x = swing;
  player.legR.rotation.x = -swing;
  player.armL.rotation.x = -swing * 0.7;
  player.armR.rotation.x = swing * 0.7;
  if (player.punchTimer > 0) {
    player.punchTimer -= dt;
    player.armR.rotation.x = -1.4;
  }
}

// A punch: anything punchable within range and in front takes damage.
export function tryPunch(player, targets) {
  if (player.punchTimer > 0 || player.inCar) return null;
  player.punchTimer = PLAYER.punchCooldown;
  const fx = Math.sin(player.heading);
  const fz = Math.cos(player.heading);
  let hit = null;
  for (const t of targets) {
    const dx = t.x - player.x;
    const dz = t.z - player.z;
    const d = Math.hypot(dx, dz);
    if (d < PLAYER.punchRange && (dx * fx + dz * fz) > 0) {
      hit = t;
      break;
    }
  }
  return hit;
}
