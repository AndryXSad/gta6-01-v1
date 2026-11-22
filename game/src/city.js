// Builds Solmar: the road grid, downtown blocks, harbour to the north,
// beach boulevard to the south and the ring highway. Every solid building
// registers an axis-aligned box the cars and the player collide with.
import { PALETTE, WORLD } from './config.js';
import { pick, range, rangeInt } from './random.js';

const THREE = window.THREE;

function box(w, h, d, color, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
  mesh.position.set(x, y, z);
  return mesh;
}

function lambert(color) {
  return new THREE.MeshLambertMaterial({ color });
}

export function buildCity(scene, rng) {
  const group = new THREE.Group();
  scene.add(group);
  const buildings = [];

  // Ground: grass base for the whole playable area.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.bound * 2 + 120, WORLD.bound * 2 + 160), lambert(PALETTE.ground));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 0);
  group.add(ground);

  // Roads: dark strips along every grid line, plus centre dashes.
  const lines = WORLD.roadLines;
  for (const line of lines) {
    for (const horizontal of [true, false]) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.half * 2 + WORLD.roadWidth, WORLD.roadWidth), lambert(PALETTE.road));
      road.rotation.x = -Math.PI / 2;
      if (horizontal) road.position.set(0, 0, line);
      else { road.rotation.z = Math.PI / 2; road.position.set(line, 0, 0); }
      group.add(road);
      for (let d = -WORLD.half + 14; d < WORLD.half; d += 14) {
        const dash = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.6), lambert(PALETTE.roadLine));
        dash.rotation.x = -Math.PI / 2;
        if (horizontal) dash.position.set(d, 0.01, line);
        else { dash.rotation.z = Math.PI / 2; dash.position.set(line, 0.01, d); }
        group.add(dash);
      }
    }
  }

  // Ring highway: a flat rectangular loop around the city.
  const hw = WORLD.highway;
  const hwMat = lambert(PALETTE.road);
  const hwLen = hw * 2 + WORLD.roadWidth;
  for (const [w, h, x, z] of [[hwLen, WORLD.roadWidth, 0, -hw], [hwLen, WORLD.roadWidth, 0, hw], [WORLD.roadWidth, hwLen, -hw, 0], [WORLD.roadWidth, hwLen, hw, 0]]) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(w, h), hwMat);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(x, 0, z);
    group.add(strip);
  }

  // Harbour water to the north, with docks, containers and cranes.
  const water = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.bound * 2 + 120, 90), lambert(PALETTE.water));
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.02, WORLD.waterZ - 10);
  group.add(water);
  for (const dockX of [-140, -40, 60, 150]) {
    const dock = box(34, 1.2, 16, 0x8a7a5a, dockX, 0.6, -206);
    group.add(dock);
    buildings.push({ minX: dockX - 17, maxX: dockX + 17, minZ: -214, maxZ: -198 });
    for (let i = 0; i < 3; i += 1) {
      const c = box(7, 3.2, 3.2, pick(rng, [0xb8442c, 0x2c6e8a, 0xc9a227, 0x5a7a3a]), dockX - 10 + i * 9, 2.8, -204);
      group.add(c);
    }
  }
  for (const craneX of [-90, 10, 110]) {
    const legA = box(1.4, 26, 1.4, 0xd8b13a, craneX - 4, 13, -200);
    const legB = box(1.4, 26, 1.4, 0xd8b13a, craneX + 4, 13, -200);
    const arm = box(24, 1.6, 1.6, 0xd8b13a, craneX + 6, 25, -200);
    group.add(legA, legB, arm);
  }

  // Beach sand and palms along the south boulevard.
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.bound * 2 + 120, 44), lambert(PALETTE.sand));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.02, WORLD.beachZ + 20);
  group.add(sand);
  for (let i = 0; i < 16; i += 1) {
    const px = -220 + i * 29 + range(rng, -6, 6);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 9, 6), lambert(0x7a5230));
    trunk.position.set(px, 4.5, WORLD.beachZ + 14);
    trunk.rotation.z = range(rng, -0.14, 0.14);
    const top = new THREE.Mesh(new THREE.SphereGeometry(3.4, 7, 5), lambert(0x3f8f4f));
    top.position.set(px, 9.6, WORLD.beachZ + 14);
    top.scale.y = 0.55;
    group.add(trunk, top);
  }

  // Downtown blocks: 1-4 buildings per block, varied heights and colours,
  // each with a lit window strip so the skyline reads at a glance.
  for (let ix = 0; ix < lines.length - 1; ix += 1) {
    for (let iz = 0; iz < lines.length - 1; iz += 1) {
      const cx = (lines[ix] + lines[ix + 1]) / 2;
      const cz = (lines[iz] + lines[iz + 1]) / 2;
      const count = rangeInt(rng, 1, 4);
      for (let b = 0; b < count; b += 1) {
        const w = range(rng, 10, 18);
        const d = range(rng, 10, 18);
        const h = range(rng, 8, ix === 3 && iz === 3 ? 52 : 34);
        const ox = range(rng, -9, 9);
        const oz = range(rng, -9, 9);
        const bx = cx + ox;
        const bz = cz + oz;
        const color = pick(rng, PALETTE.building);
        const mesh = box(w, h, d, color, bx, h / 2, bz);
        group.add(mesh);
        const winH = Math.min(2.2, h * 0.16);
        const win = box(w * 0.72, winH, 0.3, PALETTE.window, bx, h * 0.72, bz + d / 2 + 0.05);
        group.add(win);
        const win2 = box(0.3, winH, d * 0.72, PALETTE.window, bx + w / 2 + 0.05, h * 0.72, bz);
        group.add(win2);
        buildings.push({ minX: bx - w / 2, maxX: bx + w / 2, minZ: bz - d / 2, maxZ: bz + d / 2 });
      }
      // A tree or two on quieter blocks.
      if (rng() < 0.5) {
        const tx = cx + range(rng, -14, 14);
        const tz = cz + range(rng, -14, 14);
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 3.4, 6), lambert(0x6b4a26));
        trunk.position.set(tx, 1.7, tz);
        const top = new THREE.Mesh(new THREE.SphereGeometry(2.6, 7, 5), lambert(0x4d8a44));
        top.position.set(tx, 4.6, tz);
        group.add(trunk, top);
      }
    }
  }

  // Street lamps along the roads.
  for (const line of lines) {
    for (let d = -168; d <= 168; d += 56) {
      for (const [x, z] of [[d, line + 8], [line + 8, d]]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 7, 6), lambert(0x2c313a));
        pole.position.set(x, 3.5, z);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.7, 6, 5), lambert(PALETTE.lamp));
        bulb.position.set(x, 7.1, z);
        group.add(pole, bulb);
      }
    }
  }

  // Push a circle (player or car) out of every solid box it overlaps.
  function collide(x, z, radius) {
    let px = x;
    let pz = z;
    for (const b of buildings) {
      const nx = Math.max(b.minX, Math.min(px, b.maxX));
      const nz = Math.max(b.minZ, Math.min(pz, b.maxZ));
      const dx = px - nx;
      const dz = pz - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 < radius * radius) {
        if (d2 > 0.0001) {
          const d = Math.sqrt(d2);
          px = nx + (dx / d) * radius;
          pz = nz + (dz / d) * radius;
        } else {
          pz = b.maxZ + radius;
        }
      }
    }
    return { x: px, z: pz };
  }

  return { group, buildings, collide, roadLines: lines };
}
