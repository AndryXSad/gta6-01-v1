// Deterministic screenshot scenes behind ?shot=chase|city|mission|police.
// Each one plays the real rules forward from a fresh world for a fixed
// number of steps with a scripted driver, so the frame is what a short game
// really looks like and the same seed always gives the same frame.
import { STEP } from './config.js';

// Drive straight ahead for a fixed number of steps.
function driveForward(G, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    G.stepWorld(STEP, { throttle: 1, steer: 0, handbrake: false, forward: false, back: false, left: false, right: false, run: false });
  }
}

// Walk forward for a fixed number of steps.
function walkForward(G, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    G.stepWorld(STEP, { throttle: 0, steer: 0, handbrake: false, forward: true, back: false, left: false, right: false, run: false });
  }
}

// Put the player into a car at a chosen spot, as if they had just stolen it.
function putInCar(G, x, z, heading) {
  const car = G.traffic.parked[0] || G.traffic.cars[0];
  const idx = G.traffic.parked.indexOf(car);
  if (idx !== -1) G.traffic.parked.splice(idx, 1);
  const idx2 = G.traffic.cars.indexOf(car);
  if (idx2 !== -1) G.traffic.cars.splice(idx2, 1);
  car.x = x;
  car.z = z;
  car.heading = heading;
  car.speed = 0;
  car.kind = 'player';
  G.player.inCar = car;
  G.player.x = x;
  G.player.z = z;
  G.player.heading = heading;
  G.player.mesh.visible = false;
}

export function stageShot(name, G) {
  G.buildWorld(1);
  G.state = 'playing';
  G.hud.menu.style.display = 'none';
  G.money = 150;

  if (name === 'city') {
    // On foot downtown, traffic and pedestrians all around.
    G.player.x = -56;
    G.player.z = 84;
    G.player.heading = Math.PI;
    G.cameraYaw = Math.PI;
    walkForward(G, 3);
  } else if (name === 'mission') {
    // Driving to the harbour for mission 1, objective marker ahead.
    G.missions.index = 0;
    G.missions.dialog = 'Kestrel: "Paket itu harus sampai sebelum kapal berangkat, Rio."';
    putInCar(G, -112, -140, Math.PI);
    G.cameraYaw = Math.PI;
    driveForward(G, 2.5);
  } else if (name === 'police') {
    // Wanted 4, three patrol cars and two officers closing in.
    G.missions.index = 1;
    putInCar(G, 56, 28, Math.PI / 2);
    G.addWanted(4);
    G.cameraYaw = Math.PI / 2;
    driveForward(G, 4);
  } else {
    // Chase (cover): driving fast down the main avenue, wanted 3, two
    // patrol cars on the tail, minimap and mission objective on screen.
    G.missions.index = 1;
    putInCar(G, 0, -84, 0);
    G.addWanted(3);
    G.cameraYaw = 0;
    driveForward(G, 5);
  }
  G.snapCamera();
  G.renderFrame();
}
