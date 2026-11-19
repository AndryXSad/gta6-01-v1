// Kota Solmar: grid jalan, gedung low-poly bertekstur jendela prosedural,
// pelabuhan (kontainer + crane), pantai + laut, highway lingkar, lampu & palem.
// Prinsip layout: gedung selalu di dalam blok (di antara jalan) supaya jalan
// tetap bersih untuk mengemudi; trotoar & garis jalan digambar di atas tanah.
import { CFG } from './config.js';
import { pick, range, rangeInt } from './random.js';

const THREE = window.THREE;

function windowTexture(rng, base, lit) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 64, 128);
  for (let y = 8; y < 120; y += 14) for (let x = 6; x < 58; x += 14) {
    g.fillStyle = rng() < 0.35 ? lit : '#2c3e50';
    g.fillRect(x, y, 9, 10);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildCity(scene, rng) {
  const group = new THREE.Group();
  const colliders = []; // {x, z, r} kotak gedung untuk tabrakan sederhana
  const mats = {};

  // Langit & kabut siang pesisir.
  scene.background = new THREE.Color(0x8ec9e8);
  scene.fog = new THREE.Fog(0x9fd0e8, 180, 420);
  const hemi = new THREE.HemisphereLight(0xcfe8ff, 0x8a7a5a, 0.95);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d0, 1.6);
  sun.position.set(120, 180, 60);
  scene.add(sun);

  // Tanah dasar: rumput kota, pasir pantai timur, aspal pelabuhan selatan.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 560),
    new THREE.MeshLambertMaterial({ color: 0x7da05c }));
  ground.rotation.x = -Math.PI / 2; group.add(ground);
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 560),
    new THREE.MeshLambertMaterial({ color: 0xe8d5a3 }));
  sand.rotation.x = -Math.PI / 2; sand.position.set(190, 0.05, 0); group.add(sand);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(120, 560),
    new THREE.MeshLambertMaterial({ color: 0x2e86c1 }));
  sea.rotation.x = -Math.PI / 2; sea.position.set(290, 0.02, 0); group.add(sea);
  const portGround = new THREE.Mesh(
    new THREE.PlaneGeometry(360, 90),
    new THREE.MeshLambertMaterial({ color: 0x5d6d7e }));
  portGround.rotation.x = -Math.PI / 2; portGround.position.set(0, 0.04, 165); group.add(portGround);

  // Jalan: strip aspal di grid + garis tengah putus-putus.
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x2f3542 });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf5d76e });
  const walkMat = new THREE.MeshLambertMaterial({ color: 0xb8b0a0 });
  const half = CFG.cityHalf;
  for (let i = -2; i <= 2; i++) {
    const c = i * CFG.block;
    for (const [w, l, x, z] of [
      [CFG.road, half * 2 + 40, c, 0], [half * 2 + 40, CFG.road, 0, c],
    ]) {
      const r = new THREE.Mesh(new THREE.PlaneGeometry(w, l), roadMat);
      r.rotation.x = -Math.PI / 2; r.position.set(x, 0.06, z); group.add(r);
      const s = new THREE.Mesh(new THREE.PlaneGeometry(w + 3, l + 3), walkMat);
      s.rotation.x = -Math.PI / 2; s.position.set(x, 0.03, z); group.add(s);
    }
    // Garis tengah putus-putus di jalan vertikal & horizontal.
    for (let d = -half; d <= half; d += 12) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 4), lineMat);
      dash.rotation.x = -Math.PI / 2; dash.position.set(c, 0.08, d); group.add(dash);
      const dash2 = dash.clone(); dash2.rotation.z = Math.PI / 2; dash2.position.set(d, 0.08, c); group.add(dash2);
    }
  }

  // Highway lingkar (cincin jalan di luar kota).
  const ring = new THREE.Mesh(new THREE.RingGeometry(CFG.highwayR - 6, CFG.highwayR + 6, 64),
    roadMat);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; group.add(ring);

  // Gedung: 1-3 per blok, tinggi & warna bervariasi, tekstur jendela.
  const texA = windowTexture(rng, '#e8dcc0', '#ffe9a8');
  const texB = windowTexture(rng, '#7fa8c9', '#cfe8ff');
  const texC = windowTexture(rng, '#d98a6a', '#ffd9a8');
  const texs = [texA, texB, texC];
  // Gedung: 1-3 per blok. Blok berpusat DI ANTARA jalan (pusat = kelipatan 40 + 20)
  // supaya gedung tidak pernah menutupi jalan — mobil bisa melaju di jalan.
  for (let bx = -3; bx <= 1; bx++) for (let bz = -3; bz <= 1; bz++) {
    if (bx === 0 && bz === 0) continue; // blok timur laut alun-alun dibiarkan lapang
    const cx = bx * CFG.block + 20, cz = bz * CFG.block + 20;
    const n = rangeInt(rng, 1, 3);
    for (let k = 0; k < n; k++) {
      const w = range(rng, 10, 16), d = range(rng, 10, 16);
      const h = range(rng, 9, bx <= -2 || bz <= -2 ? 42 : 26);
      const x = cx + range(rng, -6, 6), z = cz + range(rng, -6, 6);
      const mat = new THREE.MeshLambertMaterial({
        map: pick(rng, texs), color: pick(rng, CFG.palette),
      });
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      b.position.set(x, h / 2, z); group.add(b);
      // Atap: AC box kecil.
      const ac = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 2),
        new THREE.MeshLambertMaterial({ color: 0x666666 }));
      ac.position.set(x + w / 4, h + 0.5, z); group.add(ac);
      colliders.push({ x, z, hw: w / 2 + 0.6, hd: d / 2 + 0.6 });
    }
  }

  // Alun-alun pusat: air mancur + bangku.
  const fountain = new THREE.Mesh(new THREE.CylinderGeometry(6, 7, 1.2, 16),
    new THREE.MeshLambertMaterial({ color: 0x95a5a6 }));
  fountain.position.set(0, 0.6, 0); group.add(fountain);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 0.4, 16),
    new THREE.MeshLambertMaterial({ color: 0x3498db }));
  water.position.set(0, 1.1, 0); group.add(water);
  colliders.push({ x: 0, z: 0, hw: 7, hd: 7 });

  // Pelabuhan: kontainer warna-warni + crane + gudang.
  const contColors = [0xc0392b, 0x2980b9, 0x27ae60, 0xe67e22, 0x8e44ad];
  for (let i = 0; i < 26; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(8, 3, 3),
      new THREE.MeshLambertMaterial({ color: pick(rng, contColors) }));
    const x = range(rng, -120, 120), z = range(rng, 138, 185);
    c.position.set(x, 1.5 + (rng() < 0.3 ? 3 : 0), z);
    c.rotation.y = rng() < 0.5 ? 0 : Math.PI / 2;
    group.add(c);
    colliders.push({ x, z, hw: 4.5, hd: 4.5 });
  }
  for (const cx of [-60, 0, 60]) {
    const crane = new THREE.Group();
    const legMat = new THREE.MeshLambertMaterial({ color: 0xf39c12 });
    for (const [lx, lz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(1.2, 26, 1.2), legMat);
      leg.position.set(lx, 13, lz); crane.add(leg);
    }
    const arm = new THREE.Mesh(new THREE.BoxGeometry(30, 1.5, 1.5), legMat);
    arm.position.set(8, 26, 0); crane.add(arm);
    crane.position.set(cx, 0, 158); group.add(crane);
    colliders.push({ x: cx, z: 158, hw: 5, hd: 5 });
  }
  const warehouse = new THREE.Mesh(new THREE.BoxGeometry(30, 10, 16),
    new THREE.MeshLambertMaterial({ color: 0x95a5a6 }));
  warehouse.position.set(-90, 5, 150); group.add(warehouse);
  colliders.push({ x: -90, z: 150, hw: 16, hd: 9 });

  // Pantai: palem + payung + kursi.
  const palmTrunk = new THREE.MeshLambertMaterial({ color: 0x8a6d3b });
  const palmLeaf = new THREE.MeshLambertMaterial({ color: 0x27ae60 });
  for (let i = 0; i < 18; i++) {
    const x = range(rng, 132, 165), z = range(rng, -140, 140);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 7, 6), palmTrunk);
    trunk.position.set(x, 3.5, z); trunk.rotation.z = range(rng, -0.12, 0.12); group.add(trunk);
    for (let l = 0; l < 5; l++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.9, 4, 4), palmLeaf);
      leaf.position.set(x, 7.2, z);
      leaf.rotation.set(range(rng, 0.6, 1.2), l * 1.26, 0);
      group.add(leaf);
    }
  }
  for (let i = 0; i < 8; i++) {
    const x = range(rng, 140, 168), z = range(rng, -120, 120);
    const umb = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.2, 8),
      new THREE.MeshLambertMaterial({ color: pick(rng, [0xe74c3c, 0xf1c40f, 0x3498db]) }));
    umb.position.set(x, 2.2, z); group.add(umb);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 6), palmTrunk);
    pole.position.set(x, 1.2, z); group.add(pole);
  }

  // Lampu jalan di tiap persimpangan + rambu nama jalan (sprite teks).
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
  const lampGlow = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (let ix = -2; ix <= 2; ix++) for (let iz = -2; iz <= 2; iz++) {
    const x = ix * CFG.block + 6, z = iz * CFG.block + 6;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 6, 6), lampMat);
    pole.position.set(x, 3, z); group.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), lampGlow);
    bulb.position.set(x, 6.1, z); group.add(bulb);
  }

  // Pickup kesehatan & armor tersebar di kota.
  const pickups = [];
  const mkPickup = (x, z, kind) => {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.4, 1.4),
      new THREE.MeshLambertMaterial({ color: kind === 'health' ? 0x2ecc71 : 0x3498db, emissive: 0x222222 }));
    m.position.set(x, 1.2, z); m.rotation.y = Math.PI / 4;
    group.add(m);
    pickups.push({ mesh: m, x, z, kind, taken: false });
  };
  for (let i = 0; i < 6; i++) mkPickup(range(rng, -100, 100), range(rng, -100, 100), 'health');
  for (let i = 0; i < 4; i++) mkPickup(range(rng, -100, 100), range(rng, -100, 100), 'armor');

  scene.add(group);
  return { group, colliders, pickups };
}

// Tabrakan kotak sederhana (gedung/kontainer): geser posisi keluar dari kotak.
export function collideCircle(pos, r, colliders) {
  for (const c of colliders) {
    const dx = pos.x - c.x, dz = pos.z - c.z;
    if (Math.abs(dx) < c.hw + r && Math.abs(dz) < c.hd + r) {
      const px = c.hw + r - Math.abs(dx), pz = c.hd + r - Math.abs(dz);
      if (px < pz) pos.x = c.x + Math.sign(dx || 1) * (c.hw + r);
      else pos.z = c.z + Math.sign(dz || 1) * (c.hd + r);
    }
  }
  // Batas dunia: jangan lari ke laut / luar highway.
  const lim = CFG.highwayR + 30;
  pos.x = Math.max(-lim, Math.min(lim, pos.x));
  pos.z = Math.max(-lim, Math.min(lim, pos.z));
}
