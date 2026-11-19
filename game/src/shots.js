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
    S.currentCar = car; P.inCar = true;
    P.pos.set(x, 0, z);
  };
  const placePolice = (n, x, z) => {
    for (let i = 0; i < n; i++) {
      const rng = S.rng;
      const a = (i / n) * Math.PI * 2;
      const mesh = POL.cars[i] ? POL.cars[i].mesh : null;
      if (!mesh) break;
      mesh.position.set(x + Math.sin(a) * 14, 0, z + Math.cos(a) * 14);
    }
  };
  if (shot === 'chase') {
    // Kejar-kejaran: Rio di mobil curian, wanted 3, 2 patroli di belakang, misi 2 aktif.
    const car = V.parked[2];
    putInCar(car, 0, 40, Math.PI, 16);
    S.missions.index = 1;
    const { startMission } = S.fns;
    startMission(M, 1);
    S.missions.stolenCar = car; // sudah dicuri — objektif langsung "bawa ke garasi"
    S.addWanted(3);
    placePolice(2, 0, 58);
    S.state.cash = 350;
    return { camYaw: Math.PI, camPitch: 1.5 };
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
    P.pos.set(-6, 0, 132); P.heading = Math.PI;
    M.index = 0;
    S.fns.startMission(M, 0);
    S.state.cash = 50;
    return { camYaw: Math.PI, camPitch: 1 };
  }
  if (shot === 'police') {
    // Polisi mengejar: wanted 4, patroli + petugas jalan kaki mengepung Rio.
    P.pos.set(-20, 0, -20); P.heading = Math.PI * 0.25;
    S.addWanted(4);
    placePolice(3, -20, -6);
    POL.cops.forEach((c, i) => {
      c.mesh.position.set(-20 + (i - 1) * 6, 0, -28);
    });
    S.state.health = 62;
    return { camYaw: Math.PI * 0.25, camPitch: 0.5 };
  }
  return null;
}
