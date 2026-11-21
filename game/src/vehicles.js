// Mobil Solmar: pabrik mesh mobil low-poly + mobil parkir/NPC + mengemudi
// pemain. Mencuri mobil parkir menaikkan wanted (ditangani police.js lewat
// callback onSteal). E masuk/keluar mobil.
import { CFG } from './config.js';
import { pick, range } from './random.js';

const T = () => window.THREE;

export const CAR_COLORS = [0xd64545, 0x3a7bd5, 0xf2c14e, 0x7fb069, 0x9b59b6, 0xe67e22, 0xecf0f1, 0x2c3e50];

// Satu mobil low-poly: badan, kabin, 4 roda, lampu. Dipakai pemain,
// traffic, dan polisi (polisi menimpa warna + lampu).
export function buildCarMesh(color, isPolice = false) {
  const THREE = T();
  const g = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color: isPolice ? 0x1a1a1a : color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x9fc5e8 });
  const tire = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.75, 4.4), paint);
  body.position.y = 0.75;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.65, 2.2), glass);
  cabin.position.set(0, 1.4, -0.2);
  g.add(body, cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.32, 12);
  for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, tire);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.42, z);
    g.add(w);
  }
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff6c0 });
  for (const x of [-0.65, 0.65]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.1), lampMat);
    lamp.position.set(x, 0.85, -2.22);
    g.add(lamp);
  }
  if (isPolice) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    bar.position.set(0, 1.85, -0.2);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x0044ff }));
    bar2.position.set(0, 1.85, 0.35);
    g.add(bar, bar2);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.3, 4.42),
      new THREE.MeshBasicMaterial({ color: 0xffffff }));
    stripe.position.y = 0.95;
    g.add(stripe);
  }
  return g;
}

function placeOnRoad(rng, city) {
  // Pilih jalan grid acak + posisi di sepanjangnya, di jalur kanan.
  const road = pick(rng, city.roads.filter((r) => !r.highway));
  const along = range(rng, -CFG.worldHalf + 30, CFG.worldHalf - 30);
  if (road.axis === 'z') return { x: road.at + 3.2, z: along, heading: rng() < 0.5 ? 0 : Math.PI };
  return { x: along, z: road.at + 3.2, heading: rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2 };
}

export function createVehicles(scene, city, rng, onSteal) {
  const THREE = T();
  const cars = [];
  // 10 mobil parkir di tepi jalan + 1 mobil pemain di plaza.
  for (let i = 0; i < 10; i++) {
    const spot = placeOnRoad(rng, city);
    const color = pick(rng, CAR_COLORS);
    const group = buildCarMesh(color);
    group.position.set(spot.x, 0, spot.z);
    group.rotation.y = spot.heading;
    scene.add(group);
    cars.push({
      group, color, parked: true, stolen: false, isPlayerCar: false,
      pos: group.position, heading: spot.heading, speed: 0, steer: 0,
    });
  }
  const hero = buildCarMesh(0xd64545);
  hero.position.set(CFG.spots.plaza.x + 6, 0, CFG.spots.plaza.z + 4);
  hero.rotation.y = Math.PI / 2;
  scene.add(hero);
  const heroCar = {
    group: hero, color: 0xd64545, parked: true, stolen: false, isPlayerCar: true,
    pos: hero.position, heading: Math.PI / 2, speed: 0, steer: 0,
  };
  cars.push(heroCar);

  const v = {
    cars,
    current: null, // mobil yang sedang dikemudikan pemain
    heroCar,

    nearestCar(pos, maxDist = 4.5) {
      let best = null, bestD = maxDist;
      for (const c of cars) {
        if (v.current === c) continue;
        const d = Math.hypot(c.pos.x - pos.x, c.pos.z - pos.z);
        if (d < bestD) { bestD = d; best = c; }
      }
      return best;
    },

    enterCar(car, player) {
      if (!car) return false;
      v.current = car;
      car.parked = false;
      player.onFoot = false;
      player.group.visible = false;
      if (!car.isPlayerCar && !car.stolen) {
        car.stolen = true;
        if (onSteal) onSteal(car);
      }
      return true;
    },

    exitCar(player) {
      if (!v.current) return false;
      const car = v.current;
      v.current = null;
      player.onFoot = true;
      player.group.visible = true;
      // Turun di sisi kiri mobil.
      const sideX = car.pos.x + Math.cos(car.heading) * 2.2;
      const sideZ = car.pos.z - Math.sin(car.heading) * 2.2;
      const clamped = city.clampToWorld(sideX, sideZ);
      player.pos.set(clamped.x, 0, clamped.z);
      player.group.position.copy(player.pos);
      player.heading = car.heading;
      return true;
    },

    update(dt, input, player, city) {
      const car = v.current;
      if (!car || player.onFoot) return;
      // Kemudi: A/D, gas W, rem/mundur S, rem tangan Space.
      const steerTarget = (input.left ? 1 : 0) - (input.right ? 1 : 0);
      car.steer += (steerTarget * 0.55 - car.steer) * Math.min(1, dt * 8);
      if (input.forward) car.speed += CFG.driveAccel * dt;
      else if (input.back) {
        car.speed -= (car.speed > 0.5 ? CFG.brake : CFG.driveAccel * 0.55) * dt;
      } else {
        car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 9 * dt);
      }
      if (input.handbrake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 30 * dt);
      car.speed = Math.max(-CFG.driveReverseTop, Math.min(CFG.driveTop, car.speed));
      if (Math.abs(car.speed) > 0.1) {
        car.heading += (car.steer * car.speed * 0.045) * dt * (car.speed >= 0 ? 1 : -1);
      }
      const nx = car.pos.x + -Math.sin(car.heading) * car.speed * dt;
      const nz = car.pos.z + -Math.cos(car.heading) * car.speed * dt;
      if (!city.hitsBuilding(nx, car.pos.z, 2.2)) car.pos.x = nx;
      else car.speed *= 0.4;
      if (!city.hitsBuilding(car.pos.x, nz, 2.2)) car.pos.z = nz;
      else car.speed *= 0.4;
      const clamped = city.clampToWorld(car.pos.x, car.pos.z);
      car.pos.x = clamped.x; car.pos.z = clamped.z;
      car.group.rotation.y = car.heading;
      // Pemain "menempel" di mobil; kamera mengikuti mobil.
      player.pos.copy(car.pos);
      player.heading = car.heading;
    },
  };
  return v;
}
