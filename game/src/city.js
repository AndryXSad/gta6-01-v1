// Kota Solmar: grid jalan pusat kota, pelabuhan, pantai + laut, highway
// lingkar, gedung low-poly, palem, lampu jalan, kontainer. Semua geometri
// prosedural (Box/Cylinder/Sphere) — tanpa aset eksternal.
// Mengembalikan objek kota: colliders AABB untuk tabrakan, daftar jalan
// untuk traffic, dan titik spawn.
import { CFG, SHOP_NAMES } from './config.js';
import { range, pick, pickInt } from './random.js';

const T = () => window.THREE;

function boxMat(color) {
  return new T().MeshLambertMaterial({ color });
}

function addBox(scene, mats, x, y, z, w, h, d, color, ry = 0) {
  const m = new T().Mesh(new T().BoxGeometry(w, h, d), mats.get(color) || boxMat(color));
  if (!mats.get(color)) mats.set(color, m.material);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  scene.add(m);
  return m;
}

function addCyl(scene, mats, x, y, z, rTop, rBot, h, color, seg = 10) {
  const m = new T().Mesh(new T().CylinderGeometry(rTop, rBot, h, seg), mats.get(color) || boxMat(color));
  if (!mats.get(color)) mats.set(color, m.material);
  m.position.set(x, y, z);
  scene.add(m);
  return m;
}

export function buildCity(scene, rng) {
  const THREE = T();
  const mats = new Map();
  const colliders = [];
  const roads = [];
  const palms = [];
  const lamps = [];
  const C = CFG.colors;
  const H = CFG.worldHalf;

  scene.background = new THREE.Color(C.sky);
  scene.fog = new THREE.Fog(C.fog, 180, 620);

  const sun = new THREE.DirectionalLight(0xfff2d0, 1.15);
  sun.position.set(120, 180, 60);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0xbfd9ff, 0.55));

  // Tanah dasar + laut selatan/barat + pasir pantai.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(H * 2 + 260, H * 2 + 260),
    new THREE.MeshLambertMaterial({ color: C.ground }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 260),
    new THREE.MeshLambertMaterial({ color: C.sea }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -0.4, H + 110);
  scene.add(sea);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(560, 42),
    new THREE.MeshLambertMaterial({ color: C.sand }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.05, H - 14);
  scene.add(sand);

  // Jalan grid: strip aspal + garis tengah kuning putus-putus.
  const roadMat = new THREE.MeshLambertMaterial({ color: C.road });
  const lineMat = new THREE.MeshLambertMaterial({ color: C.roadLine });
  const walkMat = new THREE.MeshLambertMaterial({ color: C.sidewalk });
  for (const x of CFG.gridXs) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(CFG.roadWidth, H * 2), roadMat);
    r.rotation.x = -Math.PI / 2; r.position.set(x, 0.08, 0); scene.add(r);
    roads.push({ axis: 'z', at: x, from: -H, to: H });
    for (let z = -H + 10; z < H; z += 22) {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 7), lineMat);
      l.rotation.x = -Math.PI / 2; l.position.set(x, 0.12, z); scene.add(l);
    }
  }
  for (const z of CFG.gridZs) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(H * 2, CFG.roadWidth), roadMat);
    r.rotation.x = -Math.PI / 2; r.position.set(0, 0.08, z); scene.add(r);
    roads.push({ axis: 'x', at: z, from: -H, to: H });
    for (let x = -H + 10; x < H; x += 22) {
      const l = new THREE.Mesh(new THREE.PlaneGeometry(7, 0.7), lineMat);
      l.rotation.x = -Math.PI / 2; l.position.set(x, 0.12, z); scene.add(l);
    }
  }
  // Highway lingkar utara (lebar, dua jalur).
  const hw = new THREE.Mesh(new THREE.PlaneGeometry(H * 2, 20),
    new THREE.MeshLambertMaterial({ color: 0x2e3138 }));
  hw.rotation.x = -Math.PI / 2; hw.position.set(0, 0.09, -H + 8); scene.add(hw);
  roads.push({ axis: 'x', at: -H + 8, from: -H, to: H, highway: true });

  // Gedung: blok di antara jalan grid, tinggi acak, atap warna-warni,
  // papan nama toko orisinal di beberapa blok.
  const roofPalette = [C.roofA, C.roofB, C.roofC, C.roofD];
  const wallPalette = [C.wallA, C.wallB, C.wallC];
  let shopIdx = 0;
  for (const gx of CFG.gridXs) {
    for (const gz of CFG.gridZs) {
      const cx = gx + 30, cz = gz + 30;
      if (cx > H - 40 || cz > H - 60) continue;
      if (rng() < 0.18) { // taman kecil / alun-alun
        const g = new THREE.Mesh(new THREE.PlaneGeometry(44, 44),
          new THREE.MeshLambertMaterial({ color: C.grass }));
        g.rotation.x = -Math.PI / 2; g.position.set(cx, 0.07, cz); scene.add(g);
        for (let p = 0; p < 3; p++) {
          const px = cx + range(rng, -16, 16), pz = cz + range(rng, -16, 16);
          addCyl(scene, mats, px, 2.2, pz, 0.5, 0.7, 4.4, C.trunk, 7);
          const crown = new THREE.Mesh(new THREE.SphereGeometry(2.6, 8, 6),
            mats.get(C.palm) || boxMat(C.palm));
          if (!mats.get(C.palm)) mats.set(C.palm, crown.material);
          crown.position.set(px, 5.4, pz); scene.add(crown);
          palms.push({ x: px, z: pz });
        }
        continue;
      }
      const w = range(rng, 18, 30), d = range(rng, 18, 30), h = range(rng, 12, 52);
      const wall = pick(rng, wallPalette), roof = pick(rng, roofPalette);
      addBox(scene, mats, cx, h / 2, cz, w, h, d, wall);
      addBox(scene, mats, cx, h + 0.8, cz, w + 1.2, 1.6, d + 1.2, roof);
      // Jendela: strip gelap di sisi depan.
      addBox(scene, mats, cx, h * 0.55, cz + d / 2 + 0.15, w * 0.7, h * 0.5, 0.3, 0x2b3a4a);
      colliders.push({ x: cx, z: cz, hx: w / 2 + 1, hz: d / 2 + 1 });
      if (rng() < 0.5) {
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(10, 2.2),
          new THREE.MeshBasicMaterial({ color: pick(rng, [0x1f6f8b, 0x8b1f2d, 0x2d6a4f]) }));
        sign.position.set(cx, 4.2, cz + d / 2 + 0.35);
        scene.add(sign);
        shopIdx++;
      }
    }
  }

  // Pelabuhan barat-daya: dermaga beton, kontainer warna-warni, crane.
  const pier = new THREE.Mesh(new THREE.PlaneGeometry(150, 90),
    new THREE.MeshLambertMaterial({ color: C.harbor }));
  pier.rotation.x = -Math.PI / 2; pier.position.set(-195, 0.1, 150); scene.add(pier);
  const contPalette = [C.containerA, C.containerB, C.containerC, C.containerD];
  for (let i = 0; i < 16; i++) {
    const cx = -240 + (i % 4) * 26 + range(rng, -4, 4);
    const cz = 115 + Math.floor(i / 4) * 24 + range(rng, -3, 3);
    const stacked = rng() < 0.4;
    addBox(scene, mats, cx, 1.4, cz, 20, 2.8, 7, pick(rng, contPalette));
    if (stacked) addBox(scene, mats, cx, 4.2, cz, 20, 2.8, 7, pick(rng, contPalette));
    colliders.push({ x: cx, z: cz, hx: 11, hz: 4.5 });
  }
  // Crane pelabuhan (dua tiang + lengan).
  addBox(scene, mats, -180, 14, 120, 2, 28, 2, 0xd4ac0d);
  addBox(scene, mats, -180, 14, 140, 2, 28, 2, 0xd4ac0d);
  addBox(scene, mats, -180, 27, 130, 2, 2, 44, 0xd4ac0d);
  colliders.push({ x: -180, z: 130, hx: 3, hz: 12 });

  // Palem di boulevard pantai + lampu jalan di tiap persimpangan grid.
  for (let x = -200; x <= 200; x += 40) {
    const px = x + range(rng, -6, 6);
    addCyl(scene, mats, px, 2.2, 196, 0.5, 0.7, 4.4, C.trunk, 7);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(3.2, 4.5, 8),
      mats.get(C.palm) || boxMat(C.palm));
    if (!mats.get(C.palm)) mats.set(C.palm, crown.material);
    crown.position.set(px, 6.2, 196); scene.add(crown);
    palms.push({ x: px, z: 196 });
  }
  for (const gx of CFG.gridXs) {
    for (const gz of CFG.gridZs) {
      if (rng() < 0.55) continue;
      addCyl(scene, mats, gx + 8, 3, gz + 8, 0.18, 0.18, 6, 0x222222, 6);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
      bulb.position.set(gx + 8, 6.1, gz + 8); scene.add(bulb);
      lamps.push({ x: gx + 8, z: gz + 8 });
    }
  }

  // Pickup kesehatan & armor tersebar (kotak bercahaya, dipakai player.js).
  const pickups = [];
  const pickupSpots = [
    { x: 30, z: 30, kind: 'health' }, { x: -90, z: 90, kind: 'armor' },
    { x: 150, z: -90, kind: 'health' }, { x: -150, z: -150, kind: 'armor' },
    { x: 60, z: 205, kind: 'health' }, { x: -190, z: 150, kind: 'armor' },
  ];
  for (const p of pickupSpots) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6),
      new THREE.MeshBasicMaterial({ color: p.kind === 'health' ? 0x2ecc71 : 0x3498db }));
    mesh.position.set(p.x, 1.2, p.z);
    scene.add(mesh);
    pickups.push({ ...p, mesh, taken: false, timer: 0 });
  }

  return {
    colliders, roads, palms, lamps, pickups,
    shopCount: shopIdx,
    bounds: H,
    // Tabrakan sederhana: kembalikan true bila titik (x,z) menabrak gedung.
    hitsBuilding(x, z, pad = 0.8) {
      for (const c of colliders) {
        if (Math.abs(x - c.x) < c.hx + pad && Math.abs(z - c.z) < c.hz + pad) return true;
      }
      return false;
    },
    clampToWorld(x, z) {
      return {
        x: Math.max(-H + 4, Math.min(H - 4, x)),
        z: Math.max(-H + 4, Math.min(H - 4, z)),
      };
    },
  };
}
