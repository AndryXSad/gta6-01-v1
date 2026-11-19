// Solmar — kota pesisir orisinal. Semua konstanta dunia & gameplay di satu tempat
// agar tuning tidak tersebar. Bukan tiruan kota, nama, atau aset game komersial apa pun.
// Catatan tuning: kecepatan & wanted di sini yang menentukan rasa kejar-kejaran.
export const CFG = {
  // Dunia: grid kota 5x5 blok, jalan tiap 40 unit, lebar jalan 10.
  block: 40, road: 10, cityHalf: 110,
  // Pelabuhan di selatan (z positif), pantai di timur (x positif).
  portZ: 150, beachX: 150, highwayR: 165,
  // Pemain jalan kaki.
  walkSpeed: 7, runSpeed: 12, punchRange: 2.4, punchDamage: 34, punchCooldown: 0.45,
  // Mobil.
  carAccel: 22, carBrake: 34, carMaxSpeed: 38, carMaxReverse: 10, carSteer: 1.9,
  carEnterRange: 4.5,
  // Wanted 1-5. Naik saat mencuri (+1), menabrak pejalan kaki (+2), memukul di
  // depan polisi (+1). Turun setelah 18 detik tanpa kejahatan.
  wantedDecay: 18, maxWanted: 5,
  // Polisi.
  policeCarSpeed: 30, policeShootRange: 42, policeShotDamage: 7, bustedTime: 2.2,
  // Misi & uang.
  missionRewards: [150, 200, 250, 500],
  startCash: 50, startHealth: 100,
  // Kamera.
  camDist: 9, camHeight: 4.2,
  // Warna kota (palet hangat pesisir, siang terik).
  palette: [0xe8b04b, 0xd97b4f, 0x7fb3d5, 0xf2e3c6, 0xc96f5a, 0x8fae8b, 0xe0a458, 0x5d8aa8],
  carColors: [0xc0392b, 0x2e86c1, 0xf1c40f, 0x27ae60, 0x8e44ad, 0xe67e22, 0xecf0f1, 0x2c3e50],
  // Nama jalan & toko orisinal Solmar.
  streets: ['Av. del Faro', 'Calle Coral', 'Paseo Brisa', 'Rua do Porto', 'Av. Palma', 'Calle Marea'],
  shops: ['Café Brisa', 'Toko Pancing Nelayan', 'Bengkel Ombak', 'Pasar Ikan Solmar', 'Kios Koran Pelita', 'Warung Senja'],
};

// Misi berurutan — cerita orisinal Rio, kurir pelabuhan yang berutang pada fixer "Madame Kestrel".
export const MISSIONS = [
  {
    id: 'paket', title: 'Misi 1 — Paket Pelabuhan',
    brief: 'Madame Kestrel: "Antar paket ini ke gudang pelabuhan. Jangan dibuka."',
    target: [0, 0, 148], radius: 6, reward: 150,
    hint: 'Ikuti penanda kuning ke pelabuhan di selatan.',
  },
  {
    id: 'curian', title: 'Misi 2 — Mobil Curian',
    brief: 'Kestrel: "Butuh mobil cepat. Curi satu, bawa ke garasi Ombak. Polisi? Itu urusanmu."',
    target: [-84, 0, -84], radius: 7, reward: 200, needCar: true, needSteal: true,
    hint: 'Tekan E di dekat mobil untuk mencuri. Wanted naik — kabur ke garasi barat laut.',
  },
  {
    id: 'jemput', title: 'Misi 3 — Jemputan Boulevard',
    brief: 'Kestrel: "Jemput Sari di boulevard pantai. Dia membawa kunci brankas. Jangan telat."',
    target: [138, 0, 20], radius: 6, reward: 250,
    hint: 'Sari menunggu di boulevard timur, dekat pantai.',
  },
  {
    id: 'getaway', title: 'Misi 4 — Getaway Terakhir',
    brief: 'Kestrel: "Polisi sudah mengepung. Bawa Sari ke checkpoint highway. Ini jalan keluar kita."',
    target: [0, 0, -168], radius: 8, reward: 500, wantPolice: true,
    hint: 'Tembus highway utara. Polisi mengejar — jangan berhenti.',
  },
];

export const STORY_INTRO =
  'Solmar, kota pesisir yang disinari matahari. Rio, kurir pelabuhan, berutang besar ' +
  'pada Madame Kestrel, fixer yang menguasai dermaga. Empat pekerjaan. Satu jalan keluar.';
