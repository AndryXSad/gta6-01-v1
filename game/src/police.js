// Polisi & wanted level 1–5: mobil patroli mengejar & menabrak, petugas jalan
// kaki mengejar & menangkap (busted), menembak di bintang ≥3. Bintang turun bila
// lolos cukup lama tanpa kejahatan baru.
// Jumlah patroli mengikuti bintang supaya tekanan naik bertahap, bukan mendadak.
import { CFG } from './config.js';
import { makeCarMesh } from './vehicles.js';

const THREE = window.THREE;

export function createPolice(scene) {
  return {
    wanted: 0, decayTimer: 0, bustedTimer: 0, shootTimer: 0,
    cars: [], cops: [], tracers: [],
    scene,
  };
}

function spawnPoliceCar(pol, rng, near) {
  const mesh = makeCarMesh(0xecf0f1, true);
  const a = rng() * Math.PI * 2;
  mesh.position.set(near.x + Math.sin(a) * 55, 0, near.z + Math.cos(a) * 55);
  pol.scene.add(mesh);
  pol.cars.push({ mesh, heading: 0, speed: 0, sirenPhase: rng() * 6 });
}

function spawnCop(pol, rng, near) {
  const g = new THREE.Group();
  const navy = new THREE.MeshLambertMaterial({ color: 0x1a5276 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), navy);
  body.position.y = 1.15; g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55),
    new THREE.MeshLambertMaterial({ color: 0xd9a066 }));
  head.position.y = 2.0; g.add(head);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.18, 8), navy);
  hat.position.y = 2.32; g.add(hat);
  const a = rng() * Math.PI * 2;
  g.position.set(near.x + Math.sin(a) * 25, 0, near.z + Math.cos(a) * 25);
  pol.scene.add(g);
  pol.cops.push({ mesh: g, speed: 5.2 });
}

export function addWanted(pol, n, rng, playerPos) {
  pol.wanted = Math.min(CFG.maxWanted, pol.wanted + n);
  pol.decayTimer = CFG.wantedDecay;
  const wantCars = Math.min(pol.wanted, 4);
  while (pol.cars.length < wantCars) spawnPoliceCar(pol, rng, playerPos);
  const wantCops = pol.wanted >= 2 ? Math.min(pol.wanted - 1, 3) : 0;
  while (pol.cops.length < wantCops) spawnCop(pol, rng, playerPos);
}

export function clearWanted(pol) {
  pol.wanted = 0; pol.decayTimer = 0; pol.bustedTimer = 0;
  for (const c of pol.cars) pol.scene.remove(c.mesh);
  for (const c of pol.cops) pol.scene.remove(c.mesh);
  pol.cars = []; pol.cops = [];
}

function fireTracer(pol, from, to) {
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffee88 }));
  pol.scene.add(line);
  pol.tracers.push({ line, life: 0.12 });
  setTimeout(() => { pol.scene.remove(line); }, 130);
}

// Update pengejaran. cb: {onBusted, onShot(dmg), onRam}.
// Mengembalikan true bila pemain tertangkap (busted).
export function updatePolice(pol, dt, rng, playerPos, playerInCar, playerSpeed, cb) {
  if (pol.wanted <= 0) return false;
  pol.decayTimer -= dt;
  if (pol.decayTimer <= 0) { clearWanted(pol); return false; }
  const target = playerPos;
  for (const c of pol.cars) {
    const dx = target.x - c.mesh.position.x, dz = target.z - c.mesh.position.z;
    const d = Math.hypot(dx, dz);
    const want = Math.atan2(dx, dz);
    let dh = want - c.mesh.rotation.y;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    c.mesh.rotation.y += Math.max(-2.6 * dt, Math.min(2.6 * dt, dh));
    const sp = Math.min(CFG.policeCarSpeed, 14 + pol.wanted * 3.5);
    c.speed = d > 8 ? sp : sp * 0.6;
    c.mesh.position.x += Math.sin(c.mesh.rotation.y) * c.speed * dt;
    c.mesh.position.z += Math.cos(c.mesh.rotation.y) * c.speed * dt;
    // Lampu sirene berkedip.
    c.sirenPhase += dt * 8;
    if (c.mesh.userData.lightBar) {
      c.mesh.userData.lightBar.material.color.setHex(
        Math.sin(c.sirenPhase) > 0 ? 0xff0000 : 0x0000ff);
    }
    for (const w of c.mesh.userData.wheels) w.rotation.x += c.speed * dt * 2;
    // Menabrak pemain (di mobil): guncangan & wanted tetap.
    if (d < 3.6 && playerInCar && Math.abs(playerSpeed) < 20) cb.onRam && cb.onRam();
  }
  // Petugas jalan kaki mengejar pemain yang jalan kaki.
  let busted = false;
  for (const cop of pol.cops) {
    const dx = target.x - cop.mesh.position.x, dz = target.z - cop.mesh.position.z;
    const d = Math.hypot(dx, dz);
    const want = Math.atan2(dx, dz);
    cop.mesh.rotation.y = want;
    if (d > 1.6) {
      cop.mesh.position.x += Math.sin(want) * cop.speed * dt;
      cop.mesh.position.z += Math.cos(want) * cop.speed * dt;
    }
    if (!playerInCar && d < 2.2) {
      pol.bustedTimer += dt;
      if (pol.bustedTimer > CFG.bustedTime) { busted = true; break; }
    }
  }
  if (playerInCar || pol.cops.length === 0) pol.bustedTimer = 0;
  // Menembak di bintang ≥3 (hit-scan sederhana).
  if (pol.wanted >= 3) {
    pol.shootTimer -= dt;
    if (pol.shootTimer <= 0) {
      pol.shootTimer = 1.4;
      const shooter = pol.cars[0] || pol.cops[0];
      if (shooter) {
        const from = shooter.mesh.position.clone(); from.y = 1.5;
        const to = new THREE.Vector3(target.x, 1.4, target.z);
        const d = from.distanceTo(to);
        if (d < CFG.policeShootRange) {
          fireTracer(pol, from, to);
          if (rng() < 0.45) cb.onShot && cb.onShot(CFG.policeShotDamage);
        }
      }
    }
  }
  return busted;
}
