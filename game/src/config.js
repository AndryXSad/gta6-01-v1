// Solmar — tuning constants for the whole game.
// One place for every number a designer would tweak: world size, speeds,
// wanted escalation, mission rewards, colours. Nothing here touches the DOM.
export const WORLD = {
  size: 520,          // playable ground, metres, centred on 0,0
  roadGap: 46,        // distance between parallel roads
  roadWidth: 11,
  blockSize: 35,
  sidewalk: 2.2,
  waterAt: -232,      // harbour waterline (south edge, z < waterAt is sea)
  beachAt: -206,      // sand strip between city and sea
  highwayRadius: 236, // ring road around the city
};

export const PALETTE = {
  sky: 0x8ec9ee,
  fog: 0xa8c8e0,
  ground: 0x3f7a4e,
  sand: 0xd9c28a,
  sea: 0x2a6f9e,
  road: 0x33363b,
  roadLine: 0xd8d23a,
  sidewalk: 0x9aa0a3,
  building: [0xb08968, 0x8d99ae, 0xc1666b, 0x7fb069, 0xe0a458, 0x6d6875, 0x84a59d],
  windowLit: 0xffe08a,
  windowDark: 0x2b3440,
  lamp: 0xffe9a8,
  tree: 0x2f6b3a,
  trunk: 0x6b4a2f,
  carPlayer: 0xe63946,
  carPolice: 0x1d3557,
  carTaxi: 0xf4d35e,
  beacon: 0xffd60a,
  hospital: 0xf1faee,
};

export const PLAYER = {
  walkSpeed: 7.5,
  runSpeed: 12,
  turnSpeed: 9,
  radius: 0.9,
  maxHealth: 100,
  punchDamage: 34,
  punchRange: 2.4,
  punchCooldown: 0.45,
};

export const CAR = {
  accel: 16,
  brake: 30,
  maxSpeed: 34,
  reverseSpeed: 10,
  steer: 2.1,
  grip: 0.94,
  enterRadius: 4.2,
};

export const TRAFFIC = {
  carCount: 14,
  pedCount: 22,
  carSpeed: 9,
  pedSpeed: 2.2,
};

export const WANTED = {
  max: 5,
  decaySeconds: 14,      // seconds unseen before one star drops
  stealHeat: 1,           // stealing a car adds a star
  hitPedHeat: 1,
  ramCopHeat: 1,
  // patrol cars per wanted level
  patrols: [0, 1, 2, 3, 4, 5],
  copShootAt: 3,          // stars at which foot cops open fire
  shootDamage: 6,
  shootInterval: 1.1,
  bustDistance: 2.2,
  ramDamage: 8,
};

export const MISSIONS = [
  {
    id: 'courier',
    title: 'Paket Pelabuhan',
    brief: 'Madame Kestrel: antar paket ini ke dermaga selatan. Jangan berhenti.',
    target: [12, -196],
    radius: 9,
    reward: 250,
  },
  {
    id: 'hotwire',
    title: 'Mobil Panas',
    brief: 'Curi mobil apa saja, lalu bawa ke garasi utara. Polisi sudah curiga.',
    target: [-92, 92],
    radius: 9,
    reward: 400,
    needCar: true,
  },
  {
    id: 'pickup',
    title: 'Jemput Rekan',
    brief: 'Jemput Dara di boulevard pantai. Bawa dia pergi sebelum polisi datang.',
    target: [138, -160],
    radius: 9,
    reward: 550,
  },
  {
    id: 'getaway',
    title: 'Getaway Terakhir',
    brief: 'Highway lingkar. Hilangkan bintang wanted, lalu sampai ke ujung barat.',
    target: [-210, 40],
    radius: 11,
    reward: 900,
  },
];

export const SAVE_KEY = 'solmar-save-v1';
export const START_CASH = 120;
export const BUST_FINE = 150;
