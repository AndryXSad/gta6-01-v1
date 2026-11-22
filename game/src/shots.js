// Deterministic screenshot mode: ?shot=chase|city|mission|police&seed=N
// Stages one scene per shot (player spot, car, wanted level, active
// mission), then lets the game run a few fixed frames so traffic and
// police settle. main.js calls applyShot() once at boot and sets
// window.__shotReady when the scene has rendered enough frames for a
// headless capture.
export function parseShot() {
  const q = new URLSearchParams(location.search);
  const shot = q.get('shot');
  if (!shot) return null;
  return { name: shot, seed: Number(q.get('seed') || 1) };
}

function stage(game, index) {
  game.missions.index = index;
  game.startMission(index);
}

// game: the object main.js builds {player, cars, police, missions, state, ...}
// Returns the camera preset for this shot: {dist, height, yawOffset}.
export function applyShot(game, shot) {
  const { player, police, state } = game;
  state.shotMode = true;
  state.paused = false;
  state.started = true;

  const putPlayerInCar = (car) => {
    player.inCar = car;
    car.owner = 'player';
    player.x = car.x;
    player.z = car.z;
    player.heading = car.heading;
    player.mesh.visible = false;
  };

  if (shot.name === 'chase') {
    // cover: Rio fleeing in a red car, wanted 3, patrol cars closing in,
    // mission 2 (hotwire) active so the objective shows in the HUD.
    const car = game.cars.find((c) => c.owner === 'parked') || game.cars[0];
    car.x = 0;
    car.z = -40;
    car.heading = Math.PI;
    car.speed = 22;
    putPlayerInCar(car);
    game.camYaw = Math.PI;
    state.cash = 370;
    stage(game, 1);
    police.wanted = 3;
    police.unseen = 0;
    game.police.patrols.length = 0; // fresh patrols spawn behind the player
    return { dist: 13, height: 5.2, yawOffset: 0 };
  }

  if (shot.name === 'city') {
    // on foot downtown, traffic and pedestrians around, camera pulled back
    player.x = 23;
    player.z = 23;
    player.heading = Math.PI * 0.75;
    game.camYaw = Math.PI * 0.75;
    state.cash = 120;
    stage(game, 0);
    police.wanted = 0;
    return { dist: 12, height: 5.4, yawOffset: 0 };
  }

  if (shot.name === 'mission') {
    // standing at the harbour beacon with the mission brief in the HUD
    player.x = 12;
    player.z = -178;
    player.heading = Math.PI;
    game.camYaw = Math.PI;
    state.cash = 120;
    stage(game, 0);
    police.wanted = 0;
    return { dist: 11, height: 5, yawOffset: 0 };
  }

  if (shot.name === 'police') {
    // wanted 4: patrol cars closing in from two sides, Rio on foot
    player.x = -46;
    player.z = 0;
    player.heading = Math.PI / 2;
    game.camYaw = Math.PI / 2;
    state.cash = 620;
    stage(game, 2);
    police.wanted = 4;
    police.unseen = 0;
    return { dist: 15, height: 6, yawOffset: 0.5 };
  }

  // unknown shot name: fall back to a plain city view
  stage(game, 0);
  return { dist: 12, height: 5.4, yawOffset: 0 };
}
