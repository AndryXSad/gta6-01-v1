// Rio — pemain jalan kaki: gerak WASD relatif kamera, lari, pukul jarak dekat,
// kamera third-person orbit (drag mouse / panah). Model low-poly prosedural.
import { CFG, collideCircle } from './config.js';

const THREE = window.THREE;

export function createPlayer(scene) {
  const g = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: 0xc68642 });
  const shirt = new THREE.MeshLambertMaterial({ color: 0xe74c3c });
  const pants = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), shirt);
  body.position.y = 1.15; g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.55), skin);
  head.position.y = 2.0; g.add(head);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.16, 0.6),
    new THREE.MeshLambertMaterial({ color: 0xf1c40f }));
  cap.position.y = 2.32; g.add(cap);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.9, 0.36), pants);
  legL.position.set(-0.22, 0.45, 0); g.add(legL);
  const legR = legL.clone(); legR.position.x = 0.22; g.add(legR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.9, 0.3), shirt);
  armL.position.set(-0.58, 1.2, 0); g.add(armL);
  const armR = armL.clone(); armR.position.x = 0.58; g.add(armR);
  // Efek pukulan: tinju kilat di depan.
  const fist = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
  fist.visible = false; fist.position.set(0, 1.4, 1.1); g.add(fist);
  scene.add(g);
  return {
    mesh: g, legL, legR, armL, armR, fist,
    pos: new THREE.Vector3(10, 0, 30), heading: 0, speed: 0,
    punchTimer: 0, punchCd: 0, walkPhase: 0, inCar: false, visible: true,
  };
}

// Gerak jalan kaki + kamera. input: {f,b,l,r,run,punch,mouseDX,camYaw}.
// Mengembalikan true bila sedang memukul (untuk combat di main).
export function updatePlayer(p, input, dt, colliders, camYaw) {
  if (p.inCar) { p.mesh.visible = false; return false; }
  p.mesh.visible = true;
  const run = input.run ? CFG.runSpeed : CFG.walkSpeed;
  let mx = 0, mz = 0;
  if (input.f) mz -= 1; if (input.b) mz += 1;
  if (input.l) mx -= 1; if (input.r) mx += 1;
  const len = Math.hypot(mx, mz);
  let punching = false;
  p.punchCd = Math.max(0, p.punchCd - dt);
  if (input.punch && p.punchCd <= 0) {
    p.punchTimer = 0.22; p.punchCd = CFG.punchCooldown; punching = true;
  }
  p.punchTimer = Math.max(0, p.punchTimer - dt);
  p.fist.visible = p.punchTimer > 0;
  if (len > 0) {
    mx /= len; mz /= len;
    const sin = Math.sin(camYaw), cos = Math.cos(camYaw);
    const wx = mx * cos - mz * sin, wz = mx * sin + mz * cos;
    p.pos.x += wx * run * dt; p.pos.z += wz * run * dt;
    p.heading = Math.atan2(wx, wz);
    p.walkPhase += dt * run * 1.4;
    p.speed = run;
  } else p.speed = 0;
  collideCircle(p.pos, 0.7, colliders);
  p.mesh.position.copy(p.pos);
  p.mesh.rotation.y = p.heading;
  // Animasi jalan: ayun kaki & lengan.
  const sw = p.speed > 0 ? Math.sin(p.walkPhase) * 0.5 : 0;
  p.legL.rotation.x = sw; p.legR.rotation.x = -sw;
  p.armL.rotation.x = p.punchTimer > 0 ? -1.4 : -sw;
  p.armR.rotation.x = p.punchTimer > 0 ? -1.4 : sw;
  return punching;
}

// Kamera third-person di belakang pemain (atau mobil bila inCar + carPos).
export function updateCamera(camera, targetPos, heading, camYaw, camPitch, inCar, speed01) {
  const dist = CFG.camDist + speed01 * 4;
  const h = CFG.camHeight + speed01 * 1.2;
  const cx = targetPos.x - Math.sin(camYaw) * dist;
  const cz = targetPos.z - Math.cos(camYaw) * dist;
  camera.position.set(cx, targetPos.y + h + camPitch, cz);
  camera.lookAt(targetPos.x, targetPos.y + 1.6, targetPos.z);
}
