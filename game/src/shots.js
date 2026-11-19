// Mode screenshot deterministik: ?shot=chase|city|mission|police & ?seed=1.
// Menyiapkan posisi pemain/polisi/misi + sudut kamera agar tiap screenshot
// menunjukkan sistem game yang berbeda — render asli dari kode game, tanpa edit.
export function parseShot() {
  const q = new URLSearchParams(location.search);
  const shot = q.get('shot');
  const seed = parseInt(q.get('seed') || '1', 10) || 1;
  return { shot, seed };
}

// Terapkan setup shot ke state game. Dipanggil sekali setelah dunia dibangun,
// sebelum loop pertama. Mengembalikan {camYaw, camPitch} untuk kamera.
export function applyShot(shot, S) {
  if (!shot) return null;
  const P = S.player, V = S.vehicles, T = S.traffic, POL = S.police, M = S.missions;
  const putInCar = (car, x, z, heading, speed) => {
    car.parked = false; car.stolen = true;
    car.mesh.position.set(x, 0, z); car.heading = heading; car.mesh.rotation.y = heading;
    car.speed = speed;
    S.setCar(car); P.inCar = true;
    P.pos.set(x, 0, z);
  };
  const placePolice = (n, x, z) => {
    // Patroli mengejar dari belakang (arah +z), berbaris agar tidak menabrak pemain.
    for (let i = 0; i < n; i++) {
      const mesh = POL.cars[i] ? POL.cars[i].mesh : null;
      if (!mesh) break;
      mesh.position.set(x + (i % 2 === 0 ? -5 : 5), 0, z + 16 + i * 10);
      mesh.rotation.y = Math.PI;
    }
  };
  if (shot === 'chase') {
    // Kejar-kejaran: Rio di mobil curian, wanted 3, 2 patroli di belakang, misi 2 aktif.
    const car = V.parked[2];
    putInCar(car, 0, 70, Math.PI, 18);
    S.missions.index = 1;
    const { startMission } = S.fns;
    startMission(M, 1);
    S.missions.stolenCar = car; // sudah dicuri — objektif langsung "bawa ke garasi"
    S.addWanted(3);
    placePolice(2, 0, 88);
    S.state.cash = 350;
    // Kamera dari depan-samping: mobil melaju ke arah kamera, patroli mengejar di belakangnya.
    return { camYaw: 0.45, camPitch: 1.0 };
  }
  if (shot === 'city') {
    // Jalan kaki di pusat kota: traffic + pejalan kaki + gedung di sekeliling.
    P.pos.set(14, 0, 26); P.heading = Math.PI * 0.75;
    T.peds.slice(0, 8).forEach((p, i) => {
      p.x = 14 + Math.sin(i * 1.3) * (6 + i); p.z = 26 + Math.cos(i * 0.9) * (5 + i * 0.5);
    });
    T.cars.slice(0, 4).forEach((c, i) => {
      c.mesh.position.set(-20 + i * 14, 0, 40 - i * 6);
      c.mesh.rotation.y = Math.PI / 2;
    });
    return { camYaw: Math.PI * 0.75, camPitch: 0.5 };
  }
  if (shot === 'mission') {
    // Momen misi 1: Rio di pelabuhan, beacon kuning + dialog Kestrel di HUD.
    // Kamera di utara pemain, menghadap selatan ke beacon & kontainer.
    P.pos.set(-6, 0, 132); P.heading = 0;
    M.index = 0;
    S.fns.startMission(M, 0);
    S.state.cash = 50;
    return { camYaw: 0, camPitch: 1 };
  }
  if (shot === 'police') {
    // Polisi mengejar: wanted 4, patroli + petugas jalan kaki mengepung Rio.
    // Rio di persimpangan jalan (0,-40) — kamera bebas gedung dari sudut ini.
    P.pos.set(0, 0, -40); P.heading = Math.PI * 0.25;
    S.addWanted(4);
    placePolice(3, 0, -24);
    POL.cops.forEach((c, i) => {
      c.mesh.position.set((i - 1) * 6, 0, -48);
    });
    S.state.health = 62;
    return { camYaw: Math.PI * 0.25, camPitch: 0.5 };
  }
  return null;
}

// Setelah pre-roll: posisikan polisi relatif terhadap posisi AKHIR pemain,
// supaya patroli terlihat mengejar di dalam frame (kamera ada di belakang pemain).
export function afterPreroll(shot, S) {
  const P = S.player, POL = S.police;
  if (shot === 'chase') {
    const px = P.pos.x, pz = P.pos.z;
    POL.cars.forEach((c, i) => {
      c.mesh.position.set(px + (i === 0 ? -7 : 7), 0, pz + 16 + i * 9);
      c.mesh.rotation.y = Math.PI;
    });
  }
  if (shot === 'police') {
    const px = P.pos.x, pz = P.pos.z;
    POL.cars.forEach((c, i) => {
      c.mesh.position.set(px + (i === 0 ? -9 : 9), 0, pz + 13 + i * 8);
      c.mesh.rotation.y = Math.PI * 0.25;
    });
    POL.cops.forEach((c, i) => {
      c.mesh.position.set(px + (i - 1) * 5, 0, pz + 7);
    });
  }
}
