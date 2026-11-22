// Solmar shared constants: one place for every number the systems agree on.
// Nothing here is secret or clever — it just keeps city, cars, police and
// missions measuring the same world.

export const CFG = {
  worldHalf: 245, // playable square is -245..245 on x and z
  roadWidth: 16,
  roadCenters: [-210, -140, -70, 0, 70, 140, 210],
  blockPitch: 70,
  laneOffset: 4.2, // right-hand traffic offset from a road centre line
  waterEast: 252, // harbour water starts here (x > waterEast)
  waterSouth: 252, // sea starts here (z > waterSouth)
  beachSouth: 228, // sand strip z in [beachSouth, waterSouth]
  dockEast: 224, // concrete dock strip x in [dockEast, waterEast]
  seed: 1,
};

export const COLOURS = {
  sky: 0x87b5e0,
  fog: 0x9fc3e2,
  ground: 0x5d7a4a,
  sand: 0xd9c08a,
  water: 0x2e7fb8,
  dock: 0x8d8f96,
  road: 0x2e3138,
  roadLine: 0xd8d8c8,
  sidewalk: 0x9aa0a8,
  buildingGlass: 0x3d6f8f,
  buildingWarm: 0xc98d5f,
  buildingPale: 0xd8cfc0,
  buildingBrick: 0x9c5f4a,
  palmTrunk: 0x7a5a38,
  palmLeaf: 0x3f8f4f,
  containerRed: 0xb23a2e,
  containerBlue: 0x2e5fa3,
  containerGreen: 0x3a7d44,
  containerYellow: 0xc9a227,
  policeWhite: 0xf2f2f2,
  policeBlue: 0x1d4ed8,
  taxiYellow: 0xf2c200,
  rioJacket: 0xc22e2e,
};

export const PLAYER = {
  walkSpeed: 6,
  runSpeed: 10.5,
  radius: 0.7,
  health: 100,
  punchRange: 2.4,
  punchDamage: 34,
  punchCooldown: 0.45,
  regenDelay: 5,
  regenRate: 2.5,
};

export const CAR = {
  accel: 16,
  brake: 34,
  maxSpeed: 40,
  maxReverse: 11,
  steerRate: 2.1,
  grip: 7,
  handbrakeGrip: 1.6,
  radius: 1.9,
};

export const WANTED = {
  stealHeat: 35,
  hitPedHeat: 25,
  punchCopHeat: 30,
  ramCopHeat: 20,
  decayPerSec: 3.2,
  quietSeconds: 5, // no crime for this long before heat starts to cool
  maxStars: 5,
  shootAtStars: 3,
};

export const MONEY = {
  start: 120,
  bustedCut: 0.2, // fraction of cash lost when busted
};

export const MISSIONS = [
  {
    id: 'parcel',
    title: '1 · The Parcel',
    brief: 'Madame Kestrel: "A crate came in at the east docks. Pick it up and bring it to the drop — no questions."',
    target: { x: 236, z: -40, r: 7 },
    targetLabel: 'EAST DOCKS',
    reward: 250,
    done: 'Parcel delivered. Kestrel nods. "One down."',
  },
  {
    id: 'hotcar',
    title: '2 · Hot Car',
    brief: 'Kestrel: "I need wheels that cannot be traced. Take any car — then lose the tail on the ring highway."',
    target: { x: 0, z: -210, r: 9 },
    targetLabel: 'RING HIGHWAY',
    reward: 400,
    needCar: true,
    done: 'Clean getaway. The car is yours now — for a while.',
  },
  {
    id: 'pickup',
    title: '3 · The Pickup',
    brief: 'Kestrel: "My friend Marisol is waiting on the boulevard, and the heat is on. Fetch her — in a car."',
    target: { x: -70, z: 236, r: 7 },
    targetLabel: 'BOULEVARD',
    reward: 550,
    needCar: true,
    pickup: true,
    dropoff: { x: -140, z: -140, r: 8 },
    dropoffLabel: 'SAFEHOUSE',
    done: 'Marisol is safe. Kestrel owes you one — she hates that.',
  },
  {
    id: 'getaway',
    title: '4 · The Getaway',
    brief: 'Kestrel: "Last job. Three checkpoints, one timer, the whole city watching. Drive like you mean it."',
    target: { x: 210, z: 0, r: 9 },
    targetLabel: 'CHECKPOINT 1/3',
    reward: 900,
    needCar: true,
    timer: 90,
    checkpoints: [
      { x: 210, z: 0, r: 9, label: 'CHECKPOINT 1/3' },
      { x: 0, z: 210, r: 9, label: 'CHECKPOINT 2/3' },
      { x: -210, z: -70, r: 9, label: 'CHECKPOINT 3/3' },
    ],
    done: 'Debt paid. Solmar is yours now, Rio.',
  },
];
