// Solmar police — wanted level 1–5, patrol cars plus foot officers.
// Stars rise when the player steals a car, hits a pedestrian or punches a
// cop; they fall when the player stays out of sight long enough. At 3+ stars
// foot cops open fire; a patrol ram hurts. Touch a foot cop while wanted and
// Rio gets busted.
import { WANTED, PALETTE } from './config.js';
import { spawnCar } from './vehicles.js';

export function createPolice(scene, rng) {
  return {
    scene,
    rng,
    wanted: 0,
    unseen: 0,
    patrols: [],
    cops: [],
    shootTimer: 0,
    busted: false,
  };
}

function spawnPatrol(pol, x, z) {
  const car = spawnCar(pol.scene, pol.rng, x, z, 0, { police: true, owner: 'police' });
  pol.patrols.push(car);
  return car;
}

function spawnCop(pol, x, z) {
  const g = new THREE.Group();
  const navy = new THREE.MeshLambertMaterial({ color: PALETTE.carPolice });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe8b98a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.85, 0.4), navy);
  body.position.y = 1.05;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), skin);
  head.position.y = 1.72;
  g.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.12, 10), navy);
  cap.position.y = 1.95;
  g.add(cap);
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.7, 0.3), navy);
  leg.position.set(-0.19, 0.35, 0);
  g.add(leg);
  const leg2 = leg.clone();
  leg2.position.x = 0.19;
  g.add(leg2);
  g.position.set(x, 0, z);
  pol.scene.add(g);
  const cop = { mesh: g, x, z, heading: 0, speed: 5.2, health: 100, onHit: null };
  pol.cops.push(cop);
  return cop;
}

export function addHeat(pol, n) {
  pol.wanted = Math.max(0, Math.min(WANTED.max, pol.wanted + n));
  pol.unseen = 0;
}

export function setWanted(pol, n) {
  pol.wanted = Math.max(0, Math.min(WANTED.max, n));
  pol.unseen = 0;
}

// dt step. player: {x, z, inCar, car, health}. events: {onBusted, onShot, onRam}
export function updatePolice(pol, dt, player, events = {}) {
  const px = player.x;
  const pz = player.z;

  // keep the right number of patrol cars for the wanted level
  const wantPatrols = WANTED.patrols[pol.wanted] || 0;
  while (pol.patrols.length < wantPatrols) {
    const a = pol.rng.range(0, Math.PI * 2);
    spawnPatrol(pol, px + Math.sin(a) * 55, pz + Math.cos(a) * 55);
  }
  while (pol.patrols.length > wantPatrols) {
    const c = pol.patrols.pop();
    pol.scene.remove(c.mesh);
  }
  const wantCops = pol.wanted >= 2 ? 1 : 0;
  while (pol.cops.length < wantCops) {
    const a = pol.rng.range(0, Math.PI * 2);
    spawnCop(pol, px + Math.sin(a) * 30, pz + Math.cos(a) * 30);
  }
  while (pol.cops.length > wantCops) {
    const c = pol.cops.pop();
    pol.scene.remove(c.mesh);
  }

  // patrol cars chase: steer toward the player, ram on contact
  let nearest = Infinity;
  for (const c of pol.patrols) {
    const dx = px - c.x;
    const dz = pz - c.z;
    const d = Math.hypot(dx, dz);
    nearest = Math.min(nearest, d);
    const target = Math.atan2(dx, dz);
    let dh = target - c.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    c.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
    const speed = Math.min(30, 13 + pol.wanted * 3.2);
    c.x += Math.sin(c.heading) * speed * dt;
    c.z += Math.cos(c.heading) * speed * dt;
    c.mesh.position.set(c.x, 0, c.z);
    c.mesh.rotation.y = c.heading;
    const spin = (speed * dt) / 0.36;
    for (const w of c.wheels) w.rotation.x += spin;
    if (d < 3.4) {
      if (player.inCar && player.car) {
        player.car.speed *= 0.5;
        player.health -= WANTED.ramDamage * dt * 3;
        if (events.onRam) events.onRam();
      } else {
        player.health -= WANTED.ramDamage * dt * 2;
      }
      // bounce the patrol car back so it does not sit on top of the player
      c.x -= Math.sin(c.heading) * 3;
      c.z -= Math.cos(c.heading) * 3;
    }
  }

  // foot cops chase on foot; at 3+ stars they shoot from range
  pol.shootTimer -= dt;
  for (const cop of pol.cops) {
    if (cop.health <= 0) {
      cop.mesh.rotation.x = -Math.PI / 2;
      cop.mesh.position.y = 0.3;
      continue;
    }
    const dx = px - cop.x;
    const dz = pz - cop.z;
    const d = Math.hypot(dx, dz);
    nearest = Math.min(nearest, d);
    cop.heading = Math.atan2(dx, dz);
    if (d > WANTED.bustDistance) {
      cop.x += Math.sin(cop.heading) * cop.speed * dt;
      cop.z += Math.cos(cop.heading) * cop.speed * dt;
    }
    cop.mesh.position.set(cop.x, 0, cop.z);
    cop.mesh.rotation.y = cop.heading;
    if (!player.inCar && d <= WANTED.bustDistance) {
      pol.busted = true;
      if (events.onBusted) events.onBusted();
    }
    if (pol.wanted >= WANTED.copShootAt && d < 34 && d > 4 && pol.shootTimer <= 0) {
      pol.shootTimer = WANTED.shootInterval;
      player.health -= WANTED.shootDamage;
      if (events.onShot) events.onShot();
    }
  }

  // wanted decay: unseen long enough drops one star
  if (pol.wanted > 0) {
    if (nearest > 60) {
      pol.unseen += dt;
      if (pol.unseen >= WANTED.decaySeconds) {
        pol.wanted -= 1;
        pol.unseen = 0;
      }
    } else {
      pol.unseen = 0;
    }
  }
  return pol.wanted;
}

export function clearPolice(pol) {
  for (const c of pol.patrols) pol.scene.remove(c.mesh);
  for (const c of pol.cops) pol.scene.remove(c.mesh);
  pol.patrols = [];
  pol.cops = [];
  pol.wanted = 0;
  pol.unseen = 0;
  pol.busted = false;
}
