// Solmar city builder: turns a seed into a whole coastal city — downtown
// grid, harbour, beach boulevard, ring highway, palms and lamps — out of
// low-poly boxes, cylinders and a few canvas textures. It returns the
// collision boxes and the named places the rest of the game needs.

import { CFG, COLOURS } from './config.js';

function windowTexture(base, lit) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 64, 128);
  for (let y = 8; y < 120; y += 14) {
    for (let x = 6; x < 58; x += 12) {
      g.fillStyle = Math.random() < 0.45 ? lit : 'rgba(20,28,38,0.85)';
      g.fillRect(x, y, 8, 9);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function lambert(color, opts = {}) {
  return new THREE.MeshLambertMaterial({ color, ...opts });
}

export function buildCity(scene, rng) {
  const colliders = [];
  const group = new THREE.Group();
  group.name = 'city';
  scene.add(group);

  const add = (mesh, x = 0, y = 0, z = 0) => {
    mesh.position.set(x, y, z);
    group.add(mesh);
    return mesh;
  };
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  const cyl = (rt, rb, h, mat, seg = 10) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);

  // --- ground, beach, water -------------------------------------------------
  const ground = add(new THREE.Mesh(new THREE.PlaneGeometry(700, 700), lambert(COLOURS.ground)), 0, 0, 0);
  ground.rotation.x = -Math.PI / 2;
  const sand = add(new THREE.Mesh(new THREE.PlaneGeometry(500, 26), lambert(COLOURS.sand)), 0, 0.05, 240);
  sand.rotation.x = -Math.PI / 2;
  const sea = add(new THREE.Mesh(new THREE.PlaneGeometry(700, 260), lambert(COLOURS.water)), 0, 0.02, 380);
  sea.rotation.x = -Math.PI / 2;
  const harbourWater = add(new THREE.Mesh(new THREE.PlaneGeometry(220, 560), lambert(COLOURS.water)), 360, 0.02, 0);
  harbourWater.rotation.x = -Math.PI / 2;
  const dock = add(new THREE.Mesh(new THREE.PlaneGeometry(30, 480), lambert(COLOURS.dock)), 238, 0.06, 0);
  dock.rotation.x = -Math.PI / 2;

  // --- roads ----------------------------------------------------------------
  const roadMat = lambert(COLOURS.road);
  const lineMat = lambert(COLOURS.roadLine);
  const walkMat = lambert(COLOURS.sidewalk);
  for (const c of CFG.roadCenters) {
    const v = add(new THREE.Mesh(new THREE.PlaneGeometry(CFG.roadWidth, 490), roadMat), c, 0.08, 0);
    v.rotation.x = -Math.PI / 2;
    const h = add(new THREE.Mesh(new THREE.PlaneGeometry(490, CFG.roadWidth), roadMat), 0, 0.08, c);
    h.rotation.x = -Math.PI / 2;
    // pavements hugging both sides of each road
    for (const s of [-1, 1]) {
      const pv = add(new THREE.Mesh(new THREE.PlaneGeometry(4, 490), walkMat), c + s * (CFG.roadWidth / 2 + 2), 0.07, 0);
      pv.rotation.x = -Math.PI / 2;
      const ph = add(new THREE.Mesh(new THREE.PlaneGeometry(490, 4), walkMat), 0, 0.07, c + s * (CFG.roadWidth / 2 + 2));
      ph.rotation.x = -Math.PI / 2;
    }
    // dashed centre lines
    for (let t = -238; t < 238; t += 14) {
      add(box(0.6, 0.05, 5, lineMat), c, 0.1, t);
      add(box(5, 0.05, 0.6, lineMat), t, 0.1, c);
    }
  }

  // --- buildings ------------------------------------------------------------
  const glassTex = windowTexture('#5b7d94', '#ffd98a');
  const warmTex = windowTexture('#8a6a52', '#ffe6a8');
  const paleTex = windowTexture('#9aa0a0', '#cfe8ff');
  const glassMat = new THREE.MeshLambertMaterial({ map: glassTex });
  const warmMat = new THREE.MeshLambertMaterial({ map: warmTex });
  const paleMat = new THREE.MeshLambertMaterial({ map: paleTex });
  const brickMat = lambert(COLOURS.buildingBrick);
  const roofMat = lambert(0x4a4d55);
  const mats = [glassMat, warmMat, paleMat, brickMat];
  const centres = CFG.roadCenters;
  for (let bi = 0; bi < centres.length - 1; bi++) {
    for (let bj = 0; bj < centres.length - 1; bj++) {
      const cx = (centres[bi] + centres[bi + 1]) / 2;
      const cz = (centres[bj] + centres[bj + 1]) / 2;
      // the harbour block (east column) stays open for docks and containers
      if (cx > 200) continue;
      // the beach block (south row) stays open for sand and palms
      if (cz > 200) continue;
      const downtown = Math.abs(cx) <= 75 && Math.abs(cz) <= 75;
      const count = downtown ? rng.int(2, 4) : rng.int(1, 3);
      for (let k = 0; k < count; k++) {
        const w = rng.range(12, 22);
        const d = rng.range(12, 22);
        const h = downtown ? rng.range(18, 58) : rng.range(8, 26);
        const ox = rng.range(-14, 14);
        const oz = rng.range(-14, 14);
        const x = cx + ox;
        const z = cz + oz;
        if (Math.abs(x) > 218 || Math.abs(z) > 218) continue;
        const m = box(w, h, d, rng.pick(mats));
        m.castShadow = true; m.receiveShadow = true;
        add(m, x, h / 2, z);
        // rooftop plant box
        if (rng.chance(0.6)) add(box(w * 0.3, 2, d * 0.3, roofMat), x, h + 1, z);
        colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
      }
    }
  }

  // --- harbour: containers, cranes, piers ------------------------------------
  const containerCols = [COLOURS.containerRed, COLOURS.containerBlue, COLOURS.containerGreen, COLOURS.containerYellow];
  for (let i = 0; i < 26; i++) {
    const w = rng.range(8, 14);
    const stack = rng.int(1, 3);
    const x = rng.range(226, 246);
    const z = rng.range(-220, 220);
    for (let s = 0; s < stack; s++) {
      const c = box(w, 3, 4, lambert(rng.pick(containerCols)));
      c.castShadow = true;
      add(c, x, 1.5 + s * 3, z);
    }
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - 2, maxZ: z + 2 });
  }
  for (const cz of [-120, 40, 170]) {
    // gantry crane: two legs, a beam and a hanging hook block
    const legMat = lambert(0xd8a020);
    add(box(1.6, 34, 1.6, legMat), 246, 17, cz - 8);
    add(box(1.6, 34, 1.6, legMat), 246, 17, cz + 8);
    add(box(2, 2, 26, legMat), 246, 33, cz);
    add(box(30, 1.6, 1.6, legMat), 260, 33, cz);
    add(box(3, 4, 3, lambert(0x333333)), 272, 29, cz);
  }
  for (const pz of [-160, -40, 90]) {
    add(box(26, 1.2, 10, lambert(0x6e6a5e)), 262, 0.6, pz);
  }

  // --- palms along the beach boulevard ---------------------------------------
  const trunkMat = lambert(COLOURS.palmTrunk);
  const leafMat = lambert(COLOURS.palmLeaf);
  for (let x = -220; x <= 220; x += 22) {
    if (rng.chance(0.25)) continue;
    const h = rng.range(7, 11);
    add(cyl(0.35, 0.55, h, trunkMat, 7), x + rng.range(-3, 3), h / 2, 232);
    for (let f = 0; f < 6; f++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4.5, 4), leafMat);
      const a = (f / 6) * Math.PI * 2;
      leaf.position.set(x + Math.cos(a) * 1.8, h + 0.6, 232 + Math.sin(a) * 1.8);
      leaf.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1);
      group.add(leaf);
    }
  }

  // --- street lamps -----------------------------------------------------------
  const lampHeadMat = new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0xffdf8a });
  const poleMat = lambert(0x2c2f36);
  for (const c of CFG.roadCenters) {
    for (let t = -196; t <= 196; t += 56) {
      add(cyl(0.12, 0.16, 7, poleMat, 6), c + 9.5, 3.5, t);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), lampHeadMat), c + 9.5, 7.2, t);
      add(cyl(0.12, 0.16, 7, poleMat, 6), t, 3.5, c + 9.5);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), lampHeadMat), t, 7.2, c + 9.5);
    }
  }

  // --- traffic lights at the downtown crossings -------------------------------
  const redMat = new THREE.MeshLambertMaterial({ color: 0xff2a2a, emissive: 0x881111 });
  const greenMat = new THREE.MeshLambertMaterial({ color: 0x2aff66, emissive: 0x0a661f });
  for (const cx of [-70, 0, 70]) {
    for (const cz of [-70, 0, 70]) {
      add(box(0.5, 4.5, 0.5, poleMat), cx + 10, 2.25, cz + 10);
      add(box(1, 2.2, 0.8, lambert(0x222222)), cx + 10, 5.2, cz + 10);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), redMat), cx + 10, 5.8, cz + 10.4);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), greenMat), cx + 10, 4.8, cz + 10.4);
    }
  }

  // --- benches and planters on the boulevard ----------------------------------
  const benchMat = lambert(0x6b4a2f);
  for (let x = -200; x <= 200; x += 40) {
    add(box(4, 0.5, 1.2, benchMat), x, 0.8, 224);
    add(box(0.4, 0.8, 1.2, poleMat), x - 1.7, 0.4, 224);
    add(box(0.4, 0.8, 1.2, poleMat), x + 1.7, 0.4, 224);
  }

  return {
    colliders,
    // handy named places for missions and spawning
    places: {
      downtown: { x: 0, z: 0 },
      docks: { x: 236, z: -40 },
      boulevard: { x: -70, z: 236 },
      safehouse: { x: -140, z: -140 },
      hospital: { x: 70, z: 70 },
      highwayNorth: { x: 0, z: -210 },
    },
  };
}

// Circle-vs-AABB push-out used by the player, cars and pedestrians. Returns
// how far the circle was pushed (0 when there was no overlap).
export function resolveCircleVsBuildings(x, z, radius, colliders) {
  let pushed = 0;
  for (const b of colliders) {
    const cx = Math.max(b.minX, Math.min(x, b.maxX));
    const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
    const dx = x - cx;
    const dz = z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      const d = Math.sqrt(d2) || 0.001;
      const push = radius - d;
      const nx = dx / d;
      const nz = dz / d;
      x += nx * push;
      z += nz * push;
      pushed += push;
    }
  }
  return { x, z, pushed };
}

export function clampToWorld(x, z, margin = 4) {
  const m = CFG.worldHalf - margin;
  return { x: Math.max(-m, Math.min(m, x)), z: Math.max(-m, Math.min(m, z)) };
}
