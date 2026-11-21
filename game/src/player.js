// Rio — pemain jalan kaki. Model low-poly sederhana (badan, kepala, topi),
// gerak WASD relatif kamera, lari Shift, pukul Space/F, kamera third-person
// mengikuti dari belakang. Tabrakan gedung dicek lewat city.hitsBuilding.
import { CFG } from './config.js';

const T = () => window.THREE;

export function createPlayer(scene) {
  const THREE = T();
  const group = new THREE.Group();

  const jacket = new THREE.MeshLambertMaterial({ color: 0xc0392b });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe0ac69 });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
  const hat = new THREE.MeshLambertMaterial({ color: 0xf1c40f });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, 0.6), jacket);
  body.position.y = 1.35;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10), skin);
  head.position.y = 2.45;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.48, 0.22, 12), hat);
  cap.position.y = 2.78;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.0, 0.42), pants);
  legL.position.set(-0.3, 0.5, 0);
  const legR = legL.clone();
  legR.position.x = 0.3;
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.1, 0.32), jacket);
  armL.position.set(-0.78, 1.4, 0);
  const armR = armL.clone();
  armR.position.x = 0.78;
  group.add(body, head, cap, legL, legR, armL, armR);
  scene.add(group);

  const p = {
    group, legL, legR, armL, armR,
    pos: new THREE.Vector3(CFG.spots.plaza.x, 0, CFG.spots.plaza.z),
    heading: 0, // radian, 0 = menghadap -z
    speed: 0,
    health: CFG.maxHealth,
    armor: 0,
    money: 0,
    onFoot: true,
    punchTimer: 0,
    punchAnim: 0,
    walkPhase: 0,
    alive: true,
    camYaw: 0,
    camPitch: 0.32,

    reset(spawn) {
      p.pos.set(spawn.x, 0, spawn.z);
      p.heading = 0;
      p.health = CFG.maxHealth;
      p.armor = 0;
      p.onFoot = true;
      p.alive = true;
      p.punchTimer = 0;
    },

    takeDamage(amount) {
      if (!p.alive) return;
      let rest = amount;
      if (p.armor > 0) {
        const absorbed = Math.min(p.armor, rest);
        p.armor -= absorbed;
        rest -= absorbed;
      }
      p.health -= rest;
      if (p.health <= 0) { p.health = 0; p.alive = false; }
    },

    heal(amount) {
      p.health = Math.min(CFG.maxHealth, p.health + amount);
    },

    // Pukul: mengembalikan true bila ada target dalam jangkauan & arah depan.
    tryPunch(targets) {
      if (p.punchTimer > 0 || !p.onFoot) return null;
      p.punchTimer = CFG.punchCooldown;
      p.punchAnim = 0.25;
      const fx = -Math.sin(p.heading), fz = -Math.cos(p.heading);
      let best = null, bestD = CFG.punchRange;
      for (const t of targets) {
        if (!t || t.dead) continue;
        const dx = t.pos.x - p.pos.x, dz = t.pos.z - p.pos.z;
        const d = Math.hypot(dx, dz);
        if (d > CFG.punchRange) continue;
        const dot = (dx * fx + dz * fz) / (d || 1);
        if (dot < 0.3) continue;
        if (d < bestD) { bestD = d; best = t; }
      }
      return best;
    },

    update(dt, input, city) {
      p.punchTimer = Math.max(0, p.punchTimer - dt);
      p.punchAnim = Math.max(0, p.punchAnim - dt);
      if (!p.alive || !p.onFoot) {
        p.speed = 0;
        return;
      }
      // Arah gerak relatif kamera (camYaw): W maju menjauhi kamera.
      const fwdX = -Math.sin(p.camYaw), fwdZ = -Math.cos(p.camYaw);
      const rightX = Math.cos(p.camYaw), rightZ = -Math.sin(p.camYaw);
      let mx = 0, mz = 0;
      if (input.forward) { mx += fwdX; mz += fwdZ; }
      if (input.back) { mx -= fwdX; mz -= fwdZ; }
      if (input.left) { mx -= rightX; mz -= rightZ; }
      if (input.right) { mx += rightX; mz += rightZ; }
      const len = Math.hypot(mx, mz);
      const target = len > 0 ? (input.run ? CFG.runSpeed : CFG.walkSpeed) : 0;
      p.speed += (target - p.speed) * Math.min(1, dt * 10);
      if (len > 0) {
        mx /= len; mz /= len;
        const nx = p.pos.x + mx * p.speed * dt;
        const nz = p.pos.z + mz * p.speed * dt;
        // Tabrakan: coba sumbu x lalu z secara terpisah supaya bisa selip.
        if (!city.hitsBuilding(nx, p.pos.z)) p.pos.x = nx;
        if (!city.hitsBuilding(p.pos.x, nz)) p.pos.z = nz;
        const clamped = city.clampToWorld(p.pos.x, p.pos.z);
        p.pos.x = clamped.x; p.pos.z = clamped.z;
        p.heading = Math.atan2(-mx, -mz);
        p.walkPhase += dt * p.speed * 1.6;
      }
      // Animasi jalan: kaki & lengan berayun, lengan kanan terangkat saat pukul.
      // Saat diam, ayunan mereda ke nol supaya Rio tidak "berjalan di tempat".
      const still = Math.min(1, p.speed / CFG.walkSpeed);
      const swing = Math.sin(p.walkPhase) * still * 0.7;
      p.legL.rotation.x = swing;
      p.legR.rotation.x = -swing;
      p.armL.rotation.x = -swing;
      p.armR.rotation.x = p.punchAnim > 0 ? -2.2 : swing;
      group.position.copy(p.pos);
      group.rotation.y = p.heading;
    },
  };
  group.position.copy(p.pos);
  return p;
}
