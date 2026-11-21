// SOLMAR — konstanta kota & gameplay. Satu tempat untuk semua angka yang
// dipakai modul lain, supaya tuning tidak tersebar di belasan file.
export const CFG = {
  // Dunia: kota 560x560 meter, dikelilingi laut di selatan & barat.
  worldHalf: 280,
  groundY: 0,
  // Kecepatan (meter/detik)
  walkSpeed: 5.2,
  runSpeed: 9.0,
  driveAccel: 26,
  driveTop: 42,
  driveReverseTop: 12,
  brake: 34,
  // Pemain
  maxHealth: 100,
  maxArmor: 50,
  punchRange: 2.4,
  punchDamage: 18,
  punchCooldown: 0.45,
  // Wanted 1..5
  wantedMax: 5,
  wantedDecaySeconds: 26,
  // Polisi
  policeShootStars: 3,
  // Kamera third-person
  camDistance: 11,
  camHeight: 5.2,
  camDriveDistance: 14,
  camDriveHeight: 6.0,
  // Jam kota: 1 detik nyata = 1 menit kota, mulai 09:40.
  clockStartMinutes: 9 * 60 + 40,
  clockRate: 1,
  // Pickup kembali muncul sekian detik setelah diambil.
  pickupRespawnSeconds: 20,
  // Warna kota Solmar: matahari, laut, beton hangat, atap warna-warni.
  colors: {
    sky: 0x8ec9ee,
    fog: 0xa8d4ee,
    ground: 0x9a9a8e,
    road: 0x3a3d44,
    roadLine: 0xf5d76e,
    sidewalk: 0xb9b3a4,
    sand: 0xe8d29a,
    sea: 0x2f7fb8,
    harbor: 0x6e6a63,
    grass: 0x7fae62,
    roofA: 0xd96a4a,
    roofB: 0x4a90d9,
    roofC: 0xe8b13c,
    roofD: 0x7fb069,
    wallA: 0xf2e6d0,
    wallB: 0xe3cfa8,
    wallC: 0xcfd8dc,
    palm: 0x3f8f4f,
    trunk: 0x8a6b4a,
    containerA: 0xc0392b,
    containerB: 0x2471a3,
    containerC: 0x229954,
    containerD: 0xd4ac0d,
  },
  // Titik penting kota (x, z). Sumbu z positif = ke arah laut selatan.
  spots: {
    plaza: { x: 0, z: -10 },
    harbor: { x: -190, z: 150 },
    garage: { x: 120, z: -120 },
    boulevard: { x: 60, z: 205 },
    highwayNorth: { x: -40, z: -235 },
    beach: { x: 190, z: 190 },
    market: { x: -90, z: -60 },
    overlook: { x: 150, z: -200 },
  },
  // Jalan grid pusat kota: jalan vertikal x = -120,-60,0,60,120 dan
  // horizontal z = -180,-120,-60,0,60,120,180 (selain itu highway lingkar).
  gridXs: [-120, -60, 0, 60, 120],
  gridZs: [-180, -120, -60, 0, 60, 120, 180],
  roadWidth: 12,
};

// Nama jalan & toko orisinal Solmar (tidak ada nama dari game lain).
export const STREET_NAMES = [
  'Jalan Ombak', 'Jalan Kestrel', 'Jalan Pelabuhan', 'Jalan Merdeka Raya',
  'Jalan Palem', 'Jalan Karang', 'Jalan Senja', 'Jalan Dermaga',
];
export const SHOP_NAMES = [
  'Warung Ombak', 'Toko Kestrel', 'Bengkel Surya', 'Kios Pelita',
  'Pasar Ikan Solmar', 'Kafe Senja', 'Toko Roda Dua', 'Laundry Biru',
];
