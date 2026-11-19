// Traffic: mobil mengikuti loop persegi di jalan kota; pejalan kaki menyusuri
// trotoar, kabur saat ketakutan (tabrakan / pukulan / tembakan di dekatnya).
// Loop traffic selalu tepat di atas jalan supaya mobil tidak memotong gedung.
import { CFG } from './config.js';
import { pick, range } from './random.js';
import { makeCarMesh } from './vehicles.js';

const THREE = window.THREE;

function roadLoop(cx, cz, r) {
  // Loop persegi sekeliling satu blok, searah jarum jam.
  return [
    [cx - r, cz - r], [cx + r, cz - r], [cx + r, cz + r], [cx - r, cz + r],
  ];
}

export function spawnTraffic(scene, rng) {
  const cars = [];
  for (let i = 0; i < 10; i++) {
    // Loop persegi mengelilingi satu blok, tepat di atas jalan (pusat blok + 20, r 22).
    const bx = Math.floor(range(rng, -3, 2)), bz = Math.floor(range(rng, -3, 2));
    if (bx === 0 && bz === 0) { i--; continue; } // jangan lewati air mancur
    const loop = roadLoop(bx * CFG.block + 20, bz * CFG.block + 20, CFG.block / 2 + 2);
    const mesh = makeCarMesh(pick(rng, CFG.carColors), false);
    const wi = Math.floor(rng() * 4);
    mesh.position.set(loop[wi][0], 0, loop[wi][1]);
    scene.add(mesh);
    cars.push({ mesh, loop, wi, speed: range(rng, 7, 11), t: rng() });
  }
  // Pejalan kaki: warna baju acak, jalan di trotoar.
  const peds = [];
  const shirtCols = [0x9b59b6, 0x1abc9c, 0xe67e22, 0x34495e, 0xd35400, 0x16a085];
  for (let i = 0; i < 22; i++) {
    const g = new THREE.Group();
    const shirt = new THREE.MeshLambertMaterial({ color: pick(rng, shirtCols) });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1, 0.45), shirt);
    body.position.y = 1.05; g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xd9a066 }));
    head.position.y = 1.85; g.add(head);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.32),
      new THREE.MeshLambertMaterial({ color: 0x2c3e50 }));
    leg.position.set(-0.2, 0.4, 0); g.add(leg);
    const leg2 = leg.clone(); leg2.position.x = 0.2; g.add(leg2);
    const x = range(rng, -100, 100), z = range(rng, -100, 100);
    g.position.set(x, 0, z);
    scene.add(g);
    peds.push({ mesh: g, x, z, heading: range(rng, 0, Math.PI * 2),
      speed: range(rng, 1.2, 2.2), scared: 0, leg, leg2, phase: rng() * 6 });
  }
  return { cars, peds };
}

export function updateTraffic(t, dt, playerPos, playerSpeed) {
  for (const c of t.cars) {
    const target = c.loop[(c.wi + 1) % 4];
    const dx = target[0] - c.mesh.position.x, dz = target[1] - c.mesh.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 1.2) { c.wi = (c.wi + 1) % 4; continue; }
    const want = Math.atan2(dx, dz);
    let dh = want - c.mesh.rotation.y;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    c.mesh.rotation.y += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
    c.mesh.position.x += Math.sin(c.mesh.rotation.y) * c.speed * dt;
    c.mesh.position.z += Math.cos(c.mesh.rotation.y) * c.speed * dt;
    for (const w of c.mesh.userData.wheels) w.rotation.x += c.speed * dt * 2;
  }
  for (const p of t.peds) {
    // Takut: lari menjauh dari pemain bila pemain ngebut / dekat.
    const dx = p.x - playerPos.x, dz = p.z - playerPos.z;
    const d = Math.hypot(dx, dz);
    if (d < 6 && playerSpeed > 4) p.scared = 2;
    if (p.scared > 0) {
      p.scared -= dt;
      p.heading = Math.atan2(dx, dz);
      p.speed = 5;
    } else p.speed = 1.6;
    p.x += Math.sin(p.heading) * p.speed * dt;
    p.z += Math.cos(p.heading) * p.speed * dt;
    // Belok acak di persimpangan.
    if (Math.abs(p.x % CFG.block) < 1 && Math.random() < 0.002) p.heading += Math.PI / 2;
    p.x = Math.max(-115, Math.min(165, p.x));
    p.z = Math.max(-115, Math.min(165, p.z));
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.heading;
    p.phase += dt * p.speed * 2;
    p.leg.rotation.x = Math.sin(p.phase) * 0.5;
    p.leg2.rotation.x = -Math.sin(p.phase) * 0.5;
  }
}

// Pejalan kaki yang tertabrak mobil pemain: jatuh (terbaring) & menghilang.
export function checkPedHit(t, carPos, carSpeed) {
  if (carSpeed < 5) return null;
  for (const p of t.peds) {
    const d = Math.hypot(p.x - carPos.x, p.z - carPos.z);
    if (d < 2.2) {
      p.mesh.rotation.x = Math.PI / 2; // terbaring
      p.mesh.position.y = 0.4;
      p.speed = 0; p.scared = 0;
      setTimeout(() => { p.mesh.visible = false; }, 4000);
      return p;
    }
  }
  return null;
}
