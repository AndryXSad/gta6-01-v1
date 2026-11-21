// Polisi Solmar: wanted level 1–5, mobil patroli + petugas jalan kaki.
// Bintang naik saat mencuri mobil / menabrak pejalan kaki / memukul polisi;
// turun bila pemain lolos cukup lama. Bintang ≥3: polisi menembak.
import { CFG } from './config.js';
import { buildCarMesh } from './vehicles.js';

const T = () => window.THREE;

function makeOfficer(scene) {
  const THREE = T();
  const g = new THREE.Group();
  const navy = new THREE.MeshLambertMaterial({ color: 0x1a2a4a });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe0ac69 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.4, 0.55), navy);
  body.position.y = 1.3;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), skin);
  head.position.y = 2.35;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.2, 10), navy);
  cap.position.y = 2.66;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.9, 0.36), navy);
  legL.position.set(-0.25, 0.45, 0);
  const legR = legL.clone(); legR.position.x = 0.25;
  g.add(body, head, cap, legL, legR);
  scene.add(g);
  return { group: g, legL, legR };
}

export function createPolice(scene, city, rng) {
  const THREE = T();
  const pol = {
    stars: 0,
    heat: 0, // 0..100, menentukan naik/turun bintang
    quietTimer: 0,
    shootTimer: 0,
    patrols: [],
    officers: [],
    bustedFlash: 0,

    addHeat(amount, reason) {
      pol.heat = Math.min(100, pol.heat + amount);
      pol.quietTimer = 0;
      const want = pol.heat >= 85 ? 5 : pol.heat >= 65 ? 4 : pol.heat >= 45 ? 3
        : pol.heat >= 25 ? 2 : pol.heat >= 8 ? 1 : 0;
      if (want > pol.stars) pol.stars = want;
      pol.syncUnits();
      return reason;
    },

    clearWanted() {
      pol.stars = 0;
      pol.heat = 0;
      pol.syncUnits();
    },

    // Jumlah unit aktif mengikuti bintang: 1 bintang = 1 patroli, dst.
    syncUnits() {
      const wantPatrols = Math.min(4, pol.stars);
      while (pol.patrols.length < wantPatrols) {
        const group = buildCarMesh(0x111111, true);
        const a = Math.random() * Math.PI * 2;
        group.position.set(Math.cos(a) * 60, 0, Math.sin(a) * 60);
        scene.add(group);
        pol.patrols.push({
          group, pos: group.position, heading: 0, speed: 0, stuck: 0,
        });
      }
      while (pol.patrols.length > wantPatrols) {
        const p = pol.patrols.pop();
        scene.remove(p.group);
      }
      const wantOfficers = pol.stars >= 2 ? Math.min(3, pol.stars - 1) : 0;
      while (pol.officers.length < wantOfficers) {
        const m = makeOfficer(scene);
        m.group.position.set(20 + pol.officers.length * 8, 0, -30);
        pol.officers.push({
          ...m, pos: m.group.position, heading: 0, speed: 0, phase: 0,
          punchCooldown: 0, dead: false,
        });
      }
      while (pol.officers.length > wantOfficers) {
        const o = pol.officers.pop();
        scene.remove(o.group);
      }
    },

    update(dt, player, playerCar, city, onPlayerShot) {
      if (pol.stars === 0) {
        pol.quietTimer = 0;
        return;
      }
      pol.quietTimer += dt;
      // Lolos: bintang turun satu per satu bila lama tak terlihat nakal.
      if (pol.quietTimer > CFG.wantedDecaySeconds) {
        pol.stars -= 1;
        pol.heat = Math.max(0, pol.heat - 22);
        pol.quietTimer = 0;
        pol.syncUnits();
      }
      const target = player.pos;
      const aggression = 0.55 + pol.stars * 0.16;
      for (const p of pol.patrols) {
        const dx = target.x - p.pos.x, dz = target.z - p.pos.z;
        const dist = Math.hypot(dx, dz) || 1;
        const wantHeading = Math.atan2(-dx, -dz);
        let dh = wantHeading - p.heading;
        while (dh > Math.PI) dh -= Math.PI * 2;
        while (dh < -Math.PI) dh += Math.PI * 2;
        p.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, dh));
        const desired = dist > 7 ? 15 + pol.stars * 3.5 : 6;
        p.speed += (desired - p.speed) * Math.min(1, dt * 2);
        const nx = p.pos.x + -Math.sin(p.heading) * p.speed * dt;
        const nz = p.pos.z + -Math.cos(p.heading) * p.speed * dt;
        if (!city.hitsBuilding(nx, p.pos.z, 2.2)) p.pos.x = nx;
        if (!city.hitsBuilding(p.pos.x, nz, 2.2)) p.pos.z = nz;
        const clamped = city.clampToWorld(p.pos.x, p.pos.z);
        p.pos.x = clamped.x; p.pos.z = clamped.z;
        p.group.rotation.y = p.heading;
        // Menabrak pemain yang jalan kaki = tangkap / lukai.
        if (dist < 3.2 && player.onFoot && player.alive) {
          player.takeDamage(26 * dt * aggression);
          pol.bustedFlash = 0.4;
        }
        // Menabrak mobil pemain = dorong & perlambat.
        if (playerCar && dist < 4.5) {
          playerCar.speed *= (1 - 0.9 * dt);
        }
      }
      // Petugas jalan kaki mengejar & menangkap.
      for (const o of pol.officers) {
        const dx = target.x - o.pos.x, dz = target.z - o.pos.z;
        const dist = Math.hypot(dx, dz) || 1;
        const sp = 6.4 + pol.stars * 0.4;
        o.pos.x += (dx / dist) * sp * dt;
        o.pos.z += (dz / dist) * sp * dt;
        o.phase += dt * sp * 1.8;
        o.legL.rotation.x = Math.sin(o.phase) * 0.7;
        o.legR.rotation.x = -Math.sin(o.phase) * 0.7;
        o.group.position.copy(o.pos);
        o.group.rotation.y = Math.atan2(-dx, -dz);
        o.punchCooldown = Math.max(0, o.punchCooldown - dt);
        if (dist < 2.2 && player.onFoot && player.alive && o.punchCooldown <= 0) {
          o.punchCooldown = 1.1;
          player.takeDamage(10);
          pol.bustedFlash = 0.3;
        }
      }
      // Tembakan polisi di bintang ≥3 (hit-scan sederhana, ada jeda).
      // Tembakan hanya bila ada patroli yang cukup dekat; kalau tidak ada
      // patroli di jangkauan, timer pendek supaya tidak menembak dari jauh.
      pol.shootTimer -= dt;
      if (pol.stars >= CFG.policeShootStars && player.alive && pol.shootTimer <= 0) {
        const nearest = pol.patrols.reduce((best, p) => {
          const d = Math.hypot(target.x - p.pos.x, target.z - p.pos.z);
          return d < best ? d : best;
        }, Infinity);
        if (nearest < 55) {
          pol.shootTimer = 1.4;
          if (onPlayerShot) onPlayerShot(6 + pol.stars * 2);
        } else {
          pol.shootTimer = 0.5;
        }
      }
      pol.bustedFlash = Math.max(0, pol.bustedFlash - dt);
    },
  };
  return pol;
}
