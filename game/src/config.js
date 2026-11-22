// Every tuning number, colour and story beat in one place. Solmar is a
// coastal city on a 7x7 road grid; the harbour sits to the north, the beach
// boulevard to the south, and a ring highway circles the whole city.
export const STEP = 1 / 60;

export const WORLD = {
  roadLines: [-168, -112, -56, 0, 56, 112, 168],
  roadWidth: 14,
  blockSize: 42,
  half: 196,
  highway: 232,
  bound: 262,
  waterZ: -238,
  beachZ: 218,
};

export const PALETTE = {
  sky: 0x87bfe8,
  fog: 0xa8c8e0,
  ground: 0x5d6b52,
  road: 0x3a3f46,
  roadLine: 0xd8d23a,
  sidewalk: 0x9aa0a3,
  water: 0x2e6f9e,
  sand: 0xdcc48f,
  building: [0xc96f4a, 0x7a9cc6, 0xd8b25a, 0x8fa98f, 0xb08bb0, 0x6b7f99, 0xe0d6c0, 0x9c6b52],
  window: 0x2a3542,
  lamp: 0xf2e2a0,
  player: 0x2e86de,
  police: 0x1c2733,
  taxi: 0xe8b90c,
};

export const PLAYER = {
  walkSpeed: 6,
  runSpeed: 10.5,
  radius: 0.9,
  maxHealth: 100,
  punchRange: 2.4,
  punchDamage: 25,
  punchCooldown: 0.45,
};

export const CAR = {
  accel: 16,
  brake: 30,
  maxSpeed: 40,
  maxReverse: 13,
  steer: 1.9,
  drag: 0.55,
  radius: 2.3,
};

export const TRAFFIC = { cars: 14, peds: 18, parked: 8, carSpeedMin: 8, carSpeedMax: 14, pedSpeedMin: 1.2, pedSpeedMax: 2.4 };

export const WANTED = { max: 5, decaySeconds: 12, decayDistance: 34, copCarSpeed: 17, copCarAccel: 20 };

export const MISSIONS = [
  {
    id: 1,
    title: 'Paket Pelabuhan',
    text: 'Antar paket Madame Kestrel ke dermaga utara.',
    dialog: 'Kestrel: "Paket itu harus sampai sebelum kapal berangkat, Rio."',
    target: { x: -112, z: -196, label: 'Dermaga Utara' },
    reward: 250,
    needsCar: false,
  },
  {
    id: 2,
    title: 'Mobil Curian',
    text: 'Curi sebuah mobil, lalu kabur ke highway lingkar.',
    dialog: 'Kestrel: "Polisi mengincarmu. Jangan berhenti di lampu merah."',
    target: { x: 232, z: 0, label: 'Highway Timur' },
    reward: 400,
    needsCar: true,
  },
  {
    id: 3,
    title: 'Jemput Rekan',
    text: 'Jemput Dara di boulevard pantai selatan.',
    dialog: 'Dara: "Akhirnya! Aku sudah menunggu setengah jam di sini."',
    target: { x: 56, z: 196, label: 'Boulevard Pantai' },
    reward: 350,
    needsCar: false,
  },
  {
    id: 4,
    title: 'Getaway Terakhir',
    text: 'Lolos lewat gerbang highway barat. Jangan sampai tertangkap.',
    dialog: 'Kestrel: "Sekali jalan ini selesai, utangmu lunas, Rio."',
    target: { x: -232, z: 56, label: 'Gerbang Barat' },
    reward: 600,
    needsCar: true,
  },
];

export const CLOCK = { startHour: 9, minutesPerSecond: 0.5 };

export const SAVE_KEY = 'solmar.save.v1';

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
