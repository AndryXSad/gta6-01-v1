// Rio — the player on foot. Low-poly figure (torso, head, cap, legs, arms),
// WASD movement relative to the camera, Shift to run, Space to punch.
// Building collision resolves axis by axis so Rio slides along walls
// instead of sticking to them.
import { PLAYER } from './config.js';
import { hitsCollider, clampToWorld } from './city.js';

function limb(mat, w, h, d, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}

export function createPlayer(scene) {
  const group = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xe8b98a });
  const shirt = new THREE.MeshLambertMaterial({ color: 0x2a9d8f });
  const pants = new THREE.MeshLambertMaterial({ color: 0x264653 });
  const capMat = new THREE.MeshLambertMaterial({ color: 0xe63946 });

  group.add(limb(shirt, 0.72, 0.85, 0.4, 0, 1.05, 0)); // torso
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), skin);
  head.position.y = 1.72;
  group.add(head);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.14, 10), capMat);
  hat.position.y = 1.95;
  group.add(hat);
  group.add(limb(capMat, 0.5, 0.06, 0.3, 0, 1.9, 0.32)); // cap brim
  const legL = limb(pants, 0.26, 0.7, 0.3, -0.19, 0.35, 0);
  const legR = limb(pants, 0.26, 0.7, 0.3, 0.19, 0.35, 0);
  const armL = limb(shirt, 0.2, 0.7, 0.24, -0.48, 1.05, 0);
  const armR = limb(shirt, 0.2, 0.7, 0.24, 0.48, 1.05, 0);
  group.add(legL, legR, armL, armR);

  scene.add(group);
  return {
    mesh: group,
    legL,
    legR,
    armL,
    armR,
    x: 0,
    z: 30,
    heading: 0,
    health: PLAYER.maxHealth,
    speed: 0,
    punchTimer: 0,
    walkPhase: 0,
    inCar: null,
  };
}

// Turn an angle difference into the [-PI, PI] range.
function wrapAngle(dh) {
  while (dh > Math.PI) dh -= Math.PI * 2;
  while (dh < -Math.PI) dh += Math.PI * 2;
  return dh;
}

// keys: {w,a,s,d,shift,space} — space triggers a punch swing.
// camYaw: camera heading; movement is relative to it.
// Returns 'punched' when a punch swing starts, else null.
export function updatePlayer(p, dt, keys, camYaw, colliders) {
  p.punchTimer = Math.max(0, p.punchTimer - dt);
  let mx = 0;
  let mz = 0;
  if (keys.w) mz += 1;
  if (keys.s) mz -= 1;
  if (keys.a) mx -= 1;
  if (keys.d) mx += 1;
  const moving = mx !== 0 || mz !== 0;
  const run = keys.shift ? PLAYER.runSpeed : PLAYER.walkSpeed;
  if (moving) {
    const len = Math.hypot(mx, mz);
    mx /= len;
    mz /= len;
    // camera-relative: forward follows the camera yaw
    const sin = Math.sin(camYaw);
    const cos = Math.cos(camYaw);
    const wx = mx * cos - mz * sin;
    const wz = mx * sin + mz * cos;
    const targetHeading = Math.atan2(wx, wz);
    const dh = wrapAngle(targetHeading - p.heading);
    p.heading += Math.max(-PLAYER.turnSpeed * dt, Math.min(PLAYER.turnSpeed * dt, dh));
    p.speed = run;
    const nx = p.x + Math.sin(p.heading) * run * dt;
    const nz = p.z + Math.cos(p.heading) * run * dt;
    // slide along walls: try x and z separately
    if (!hitsCollider(colliders, nx, p.z, PLAYER.radius)) p.x = nx;
    if (!hitsCollider(colliders, p.x, nz, PLAYER.radius)) p.z = nz;
    const [cx, cz] = clampToWorld(p.x, p.z);
    p.x = cx;
    p.z = cz;
    p.walkPhase += dt * run * 1.7; // leg swing speed scales with pace
  } else {
    p.speed = 0;
  }
  p.mesh.position.set(p.x, 0, p.z);
  p.mesh.rotation.y = p.heading;
  const swing = moving ? Math.sin(p.walkPhase) * 0.45 : 0;
  p.legL.rotation.x = swing;
  p.legR.rotation.x = -swing;
  p.armL.rotation.x = -swing * 0.8;
  p.armR.rotation.x = swing * 0.8;
  if (keys.space && p.punchTimer <= 0) {
    p.punchTimer = PLAYER.punchCooldown;
    p.armR.rotation.x = -1.9; // snap the right arm forward for the swing
    return 'punched';
  }
  return null;
}

// Melee hit test: nearest target in front of Rio within punch range.
// targets: [{x, z, health, onHit}] — onHit(damage) is called for the victim.
export function tryPunch(p, targets) {
  const fx = Math.sin(p.heading);
  const fz = Math.cos(p.heading);
  let best = null;
  let bestD = PLAYER.punchRange;
  for (const t of targets) {
    const dx = t.x - p.x;
    const dz = t.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d > PLAYER.punchRange) continue;
    // must be roughly ahead of Rio
    if (d > 0.01 && (dx * fx + dz * fz) / d < 0.35) continue;
    if (d < bestD) {
      best = t;
      bestD = d;
    }
  }
  if (!best) return null;
  best.health -= PLAYER.punchDamage;
  if (best.onHit) best.onHit(PLAYER.punchDamage);
  return best;
}
