// SOLMAR city builder — everything procedural: a downtown road grid, a
// harbour with cranes and containers in the south, a beach boulevard, a
// ring highway, low-poly towers with lit windows, palms and street lamps.
// Returns the colliders and the road lines the traffic drives on.
import { WORLD, PALETTE } from './config.js';

// A tiny canvas texture: a facade tint with a grid of lit / dark windows.
function facadeTexture(rng, baseHex, litRatio) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = baseHex;
  g.fillRect(0, 0, 64, 128);
  for (let y = 8; y < 120; y += 14) {
    for (let x = 6; x < 58; x += 12) {
      g.fillStyle = rng.chance(litRatio) ? '#ffe08a' : '#2b3440';
      g.fillRect(x, y, 8, 9);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function plantPalm(scene, rng, x, z) {
  const palm = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.4, 5.5, 6),
    new THREE.MeshLambertMaterial({ color: PALETTE.trunk }),
  );
  trunk.position.y = 2.75;
  trunk.rotation.z = rng.range(-0.12, 0.12);
  palm.add(trunk);
  const leafMat = new THREE.MeshLambertMaterial({ color: PALETTE.tree });
  for (let i = 0; i < 5; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3.4, 5), leafMat);
    const a = (i / 5) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 1.1, 5.6, Math.sin(a) * 1.1);
    leaf.rotation.z = Math.cos(a) * 1.1;
    leaf.rotation.x = -Math.sin(a) * 1.1;
    palm.add(leaf);
  }
  palm.position.set(x, 0, z);
  scene.add(palm);
}

export function buildCity(scene, rng) {
  const colliders = [];
  const roadsV = []; // x positions of north-south roads
  const roadsH = []; // z positions of east-west roads
  const addCollider = (x, z, hw, hd) =>
    colliders.push({ minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd });

  const flat = (w, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  };

  // --- ground, sand, sea ---------------------------------------------------
  flat(WORLD.size + 120, WORLD.size + 120, new THREE.MeshLambertMaterial({ color: PALETTE.ground }), 0, 0, 10);
  flat(WORLD.size + 120, 30, new THREE.MeshLambertMaterial({ color: PALETTE.sand }), 0, 0.02, (WORLD.beachAt + WORLD.waterAt) / 2);
  flat(WORLD.size + 160, 90, new THREE.MeshLambertMaterial({ color: PALETTE.sea }), 0, 0.01, WORLD.waterAt - 42);

  // --- ring highway --------------------------------------------------------
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(WORLD.highwayRadius - 6, WORLD.highwayRadius + 6, 64),
    new THREE.MeshLambertMaterial({ color: PALETTE.road, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  scene.add(ring);

  // --- road grid (short dashes; none drawn inside intersections) -----------
  const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.road });
  const lineMat = new THREE.MeshBasicMaterial({ color: PALETTE.roadLine });
  const cityMin = -207;
  const cityMax = 207;
  const onRoad = (v) => Math.abs(((v - cityMin) % WORLD.roadGap + WORLD.roadGap) % WORLD.roadGap) < WORLD.roadWidth;
  for (let x = cityMin; x <= cityMax; x += WORLD.roadGap) {
    roadsV.push(x);
    flat(WORLD.roadWidth, cityMax - cityMin + WORLD.roadWidth, roadMat, x, 0.04, 0);
    for (let z = cityMin; z <= cityMax; z += 12) {
      if (onRoad(z)) continue; // keep intersections clean
      flat(0.4, 3.0, lineMat, x, 0.06, z);
    }
  }
  for (let z = cityMin; z <= cityMax; z += WORLD.roadGap) {
    roadsH.push(z);
    flat(cityMax - cityMin + WORLD.roadWidth, WORLD.roadWidth, roadMat, 0, 0.04, z);
    for (let x = cityMin; x <= cityMax; x += 12) {
      if (onRoad(x)) continue;
      flat(3.2, 0.4, lineMat, x, 0.06, z);
    }
  }

  // --- buildings -----------------------------------------------------------
  const facades = PALETTE.building.map((col) => {
    const hex = '#' + col.toString(16).padStart(6, '0');
    return facadeTexture(rng, hex, 0.45);
  });
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let gx = cityMin + WORLD.roadGap / 2; gx < cityMax; gx += WORLD.roadGap) {
    for (let gz = cityMin + WORLD.roadGap / 2; gz < cityMax; gz += WORLD.roadGap) {
      if (gz < WORLD.beachAt + 8) continue; // harbour strip stays open
      if (rng.chance(0.16)) continue; // empty lot / small park
      const towers = rng.int(1, 2);
      for (let t = 0; t < towers; t++) {
        const w = rng.range(13, 22);
        const d = rng.range(13, 22);
        const h = rng.range(14, 62) * (rng.chance(0.2) ? 1.8 : 1);
        const cx = gx + rng.range(-7, 7) + (t ? 3.2 : -3.2);
        const cz = gz + rng.range(-7, 7);
        const mat = new THREE.MeshLambertMaterial({ map: facades[rng.int(0, facades.length - 1)] });
        const b = new THREE.Mesh(boxGeo, mat);
        b.scale.set(w, h, d);
        b.position.set(cx, h / 2, cz);
        scene.add(b);
        addCollider(cx, cz, w / 2 + 0.5, d / 2 + 0.5);
      }
      if (rng.chance(0.6)) plantPalm(scene, rng, gx + rng.range(-12, 12), gz + rng.range(-12, 12));
    }
  }

  // --- harbour: containers + cranes ----------------------------------------
  const crateGeo = new THREE.BoxGeometry(6, 2.6, 2.6);
  const crateCols = [0xc1666b, 0x4a7fa5, 0xe0a458, 0x7fb069];
  for (let i = 0; i < 26; i++) {
    const mat = new THREE.MeshLambertMaterial({ color: crateCols[i % crateCols.length] });
    const crate = new THREE.Mesh(crateGeo, mat);
    const cx = -180 + (i % 9) * 42 + rng.range(-4, 4);
    const cz = -216 + Math.floor(i / 9) * 9;
    crate.position.set(cx, 1.3 + (i % 3 === 0 ? 2.6 : 0), cz);
    crate.rotation.y = rng.chance(0.5) ? 0 : Math.PI / 2;
    scene.add(crate);
    addCollider(cx, cz, 3.4, 3.4);
  }
  for (const cx of [-140, -20, 110]) {
    const crane = new THREE.Group();
    const legMat = new THREE.MeshLambertMaterial({ color: 0xd8d23a });
    const legGeo = new THREE.BoxGeometry(1.4, 26, 1.4);
    for (const [lx, lz] of [[-4, -3], [4, -3], [-4, 3], [4, 3]]) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, 13, lz);
      crane.add(leg);
    }
    const arm = new THREE.Mesh(new THREE.BoxGeometry(34, 1.6, 1.6), legMat);
    arm.position.set(6, 26, 0);
    crane.add(arm);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(5, 4, 4), new THREE.MeshLambertMaterial({ color: 0x33363b }));
    cab.position.set(0, 24, 0);
    crane.add(cab);
    crane.position.set(cx, 0, -222);
    scene.add(crane);
    addCollider(cx, -222, 6, 5);
  }

  // --- beach palms + lamps ---------------------------------------------------
  for (let x = -220; x <= 220; x += 26) {
    plantPalm(scene, rng, x + rng.range(-4, 4), -196 + rng.range(-3, 3));
  }
  const lampGeo = new THREE.CylinderGeometry(0.12, 0.16, 6, 6);
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x55595e });
  const bulbMat = new THREE.MeshBasicMaterial({ color: PALETTE.lamp });
  const bulbGeo = new THREE.SphereGeometry(0.5, 8, 6);
  for (const x of roadsV) {
    for (const z of roadsH) {
      if (rng.chance(0.5)) continue;
      const px = x + WORLD.roadWidth / 2 + 1;
      const pz = z + WORLD.roadWidth / 2 + 1;
      const pole = new THREE.Mesh(lampGeo, lampMat);
      pole.position.set(px, 3, pz);
      scene.add(pole);
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.set(px, 6.2, pz);
      scene.add(bulb);
    }
  }

  // --- hospital (busted respawn landmark) ----------------------------------
  const hosp = new THREE.Mesh(
    new THREE.BoxGeometry(26, 12, 18),
    new THREE.MeshLambertMaterial({ color: PALETTE.hospital }),
  );
  hosp.position.set(92, 6, 138);
  scene.add(hosp);
  addCollider(92, 138, 13.5, 9.5);

  return { colliders, roadsV, roadsH };
}

// Circle-vs-AABB test used by the player, cars and police.
export function hitsCollider(colliders, x, z, r) {
  for (const c of colliders) {
    const cx = Math.max(c.minX, Math.min(x, c.maxX));
    const cz = Math.max(c.minZ, Math.min(z, c.maxZ));
    const dx = x - cx;
    const dz = z - cz;
    if (dx * dx + dz * dz < r * r) return c;
  }
  return null;
}

export function clampToWorld(x, z) {
  const lim = WORLD.size / 2 - 4;
  return [Math.max(-lim, Math.min(lim, x)), Math.max(-lim, Math.min(lim, z))];
}
