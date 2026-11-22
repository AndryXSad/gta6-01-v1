// Screenshot staging: deterministic setups for ?shot=<name>&seed=1.
// Each shot puts Rio, the cars, the police and the mission into a scene
// that shows several systems at once, then lets the game run a few frames
// so traffic, tracers and the HUD settle before the picture is taken.

export function getShotName() {
  const q = new URLSearchParams(location.search);
  return q.get('shot') || null;
}

export function applyShot(name, w) {
  const S = w.shots;
  if (!S) return;
  if (name === 'chase') {
    // cover: Rio fleeing south down the ring highway in the red car, two
    // patrol cars on his tail, 3 stars, the final getaway already running
    w.placePlayerInCar(S.redCar, 0, -196, 0, 30);
    w.setWanted(3);
    w.spawnPoliceCar(-8, -224, 0);
    w.spawnPoliceCar(9, -230, 0);
    w.setMission(3);
    w.setClock(17 * 60 + 52);
    w.shotCamera = { pos: [-18, 8, -248], look: [2, 2, -180] };
  } else if (name === 'city') {
    // on foot downtown: traffic, pedestrians and towers in one frame
    w.placePlayerOnFoot(-6, 34, Math.PI);
    w.setClock(10 * 60 + 15);
    w.shotCamera = { pos: [-10, 5.5, 52], look: [4, 3, -40] };
  } else if (name === 'mission') {
    // the first job: Rio on foot at the east docks, beacon overhead,
    // briefing on the banner, containers and a crane behind him
    w.placePlayerOnFoot(224, -24, Math.PI / 2);
    w.setMission(0);
    w.setClock(9 * 60 + 41);
    w.shotCamera = { pos: [212, 6, -8], look: [236, 4, -40] };
  } else if (name === 'police') {
    // 4 stars: a roadblock of patrol cars and foot officers closing in
    // on Rio's car at a downtown crossing
    w.placePlayerInCar(S.blueCar, 2, -8, Math.PI, 0);
    w.setWanted(4);
    w.spawnPoliceCar(2, 14, Math.PI);
    w.spawnPoliceCar(-12, 2, Math.PI / 2);
    w.spawnCop(-6, 4);
    w.spawnCop(10, 6);
    w.setClock(12 * 60 + 5);
    w.shotCamera = { pos: [24, 6, -30], look: [0, 1.5, 0] };
  }
}
