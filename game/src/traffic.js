// Traffic Solmar: mobil NPC mengikuti loop jalan grid + pejalan kaki di
// trotoar. Pejalan kaki kabur bila mobil pemain melaju kencang di dekatnya;
// mobil traffic mengerem bila ada mobil di depannya.
import { CFG } from './config.js';
import { pick, range, pickInt } from './random.js';
import { buildCarMesh, CAR_COLORS } from './vehicles.js';

const T = () => window.THREE;

function makePedestrian(scene, color) {
  const THREE = T();
  const g = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe0ac69 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.5), shirt);
  body.position.y = 1.25;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), skin);
  head.position.y = 2.2;
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.9, 0.34), new THREE.MeshLambertMaterial({ color: 0x333333 }));
  legL.position.set(-0.22, 0.45, 0);
  const legR = legL.clone(); legR.position.x = 0.22;
  g.add(body, head, legL, legR);
  scene.add(g);
  return { group: g, legL, legR };
}

export function createTraffic(scene, city, rng) {
  const THREE = T();
  const gridRoads = city.roads.filter((r) => !r.highway);
  const cars = [];
  for (let i = 0; i < 9; i++) {
    const road = pick(rng, gridRoads);
    const along = range(rng, -200, 200);
    const color = pick(rng, CAR_COLORS);
    const group = buildCarMesh(color);
    const pos = road.axis === 'z'
      ? { x: road.at - 3.2, z: along, heading: Math.PI }
      : { x: along, z: road.at - 3.2, heading: -Math.PI / 2 };
    group.position.set(pos.x, 0, pos.z);
    group.rotation.y = pos.heading;
    scene.add(group);
    cars.push({
      group, road, pos: group.position, heading: pos.heading,
      speed: range(rng, 7, 12), baseSpeed: 0, color, dead: false,
    });
    cars[cars.length - 1].baseSpeed = cars[cars.length - 1].speed;
  }

  const pedColors = [0x1abc9c, 0xe67e22, 0x8e44ad, 0x16a085, 0xc0392b, 0x2c3e50];
  const peds = [];
  for (let i = 0; i < 14; i++) {
    const road = pick(rng, gridRoads);
    const along = range(rng, -220, 220);
    const side = rng() < 0.5 ? -8.5 : 8.5;
    const mesh = makePedestrian(scene, pick(rng, pedColors));
    const pos = road.axis === 'z'
      ? { x: road.at + side, z: along }
      : { x: along, z: road.at + side };
    mesh.group.position.set(pos.x, 0, pos.z);
    peds.push({
      ...mesh, pos: mesh.group.position, heading: range(rng, 0, Math.PI * 2),
      speed: range(rng, 1.2, 2.2), flee: 0, phase: range(rng, 0, 6),
      road, side, dead: false, scared: false,
    });
  }

  return {
    cars, peds,

    update(dt, player, playerCar) {
      // Mobil traffic: maju di jalurnya, putar balik di ujung kota.
      for (const c of cars) {
        let target = c.baseSpeed;
        // Erem bila mobil pemain / traffic lain tepat di depan.
        const fx = -Math.sin(c.heading), fz = -Math.cos(c.heading);
        const ahead = [playerCar, ...cars].filter(Boolean);
        for (const o of ahead) {
          if (o === c) continue;
          const dx = o.pos.x - c.pos.x, dz = o.pos.z - c.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 9 && dist > 0.1 && (dx * fx + dz * fz) / dist > 0.7) { target = 0; break; }
        }
        c.speed += (target - c.speed) * Math.min(1, dt * 3);
        c.pos.x += -Math.sin(c.heading) * c.speed * dt;
        c.pos.z += -Math.cos(c.heading) * c.speed * dt;
        if (c.pos.x < -CFG.worldHalf + 8 || c.pos.x > CFG.worldHalf - 8 ||
            c.pos.z < -CFG.worldHalf + 8 || c.pos.z > CFG.worldHalf - 8) {
          c.heading += Math.PI; // putar balik
          c.group.rotation.y = c.heading;
        }
      }
      // Pejalan kaki: jalan di trotoar, kabur dari mobil kencang.
      for (const p of peds) {
        p.flee = Math.max(0, p.flee - dt);
        let sp = p.speed;
        if (playerCar && !player.onFoot) {
          const d = Math.hypot(playerCar.pos.x - p.pos.x, playerCar.pos.z - p.pos.z);
          if (d < 14 && Math.abs(playerCar.speed) > 12) {
            p.flee = 1.6;
            p.scared = true;
          }
        }
        if (p.flee > 0) {
          sp = 5.5;
          // Lari menjauhi jalan (ke arah trotoar luar).
          const away = p.road.axis === 'z'
            ? Math.sign(p.pos.x - p.road.at) : 0;
          const awayZ = p.road.axis === 'x'
            ? Math.sign(p.pos.z - p.road.at) : 0;
          p.pos.x += away * sp * dt;
          p.pos.z += awayZ * sp * dt;
        } else {
          // Jalan lurus di trotoar, berbalik di ujung.
          const dirX = p.road.axis === 'z' ? 0 : Math.cos(p.heading);
          const dirZ = p.road.axis === 'z' ? Math.sin(p.heading) : 0;
          p.pos.x += dirX * sp * dt;
          p.pos.z += dirZ * sp * dt;
          if (Math.abs(p.pos.x) > CFG.worldHalf - 10 || Math.abs(p.pos.z) > CFG.worldHalf - 10) {
            p.heading += Math.PI;
          }
        }
        p.phase += dt * sp * 2.4;
        p.legL.rotation.x = Math.sin(p.phase) * 0.6;
        p.legR.rotation.x = -Math.sin(p.phase) * 0.6;
        p.group.position.copy(p.pos);
        // Pejalan kaki menghadap arah jalannya (trotoar sejajar jalan).
        p.group.rotation.y = p.road.axis === 'z'
          ? (Math.sin(p.heading) >= 0 ? 0 : Math.PI)
          : (Math.cos(p.heading) >= 0 ? -Math.PI / 2 : Math.PI / 2);
      }
    },
  };
}
