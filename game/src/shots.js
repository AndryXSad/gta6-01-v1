// Mode screenshot deterministik Solmar: ?shot=chase|city|mission|police&seed=N
// Menata adegan (posisi pemain, mobil, wanted, misi aktif) lalu membekukan
// simulasi supaya tiap screenshot bisa diulang persis. Dipakai main.js
// sebelum loop pertama; saat shot aktif, input & HUD menu dimatikan.
import { CFG } from './config.js';
import { hashSeed, mulberry32 } from './random.js';

export function parseShot() {
  const q = new URLSearchParams(window.location.search);
  const shot = q.get('shot');
  if (!shot) return null;
  const seed = Number(q.get('seed') || '1') || 1;
  return { shot, seed, rng: mulberry32(hashSeed(`solmar-${shot}-${seed}`)) };
}

// Posisikan dunia untuk tiap shot. Mengembalikan {frozen:true} bila shot
// dikenali — main.js lalu merender beberapa frame lalu berhenti update.
export function applyShot(game, info) {
  const { shot } = info;
  const { player, vehicles, police, missions, traffic, city } = game;
  const setPlayer = (x, z, heading) => {
    player.pos.set(x, 0, z);
    player.heading = heading;
    player.camYaw = heading + Math.PI;
    player.group.position.copy(player.pos);
    player.group.rotation.y = heading;
  };
  if (shot === 'chase') {
    // Cover: Rio mengemudi dikejar 2 patroli, wanted 3, misi getaway aktif.
    // Mobil pemain di highway utara (z -140) menghadap selatan (+z) supaya
    // kamera di belakangnya menangkap jalan lurus + patroli di belakang.
    missions.index = 3;
    const car = vehicles.heroCar;
    vehicles.enterCar(car, player);
    car.pos.set(-20, 0, -140);
    car.heading = Math.PI;
    car.speed = 26;
    car.group.position.copy(car.pos);
    car.group.rotation.y = car.heading;
    player.camYaw = Math.PI;
    police.addHeat(60, 'shot-chase');
    police.syncUnits();
    police.patrols.forEach((p, i) => {
      p.pos.set(-20 + (i === 0 ? -7 : 8), 0, -140 + 26 + i * 10);
      p.heading = Math.PI;
      p.speed = 22;
    });
    missions.setToast('Getaway Terakhir: lolos lewat highway utara!', 99);
    return { frozen: true, note: 'chase' };
  }
  if (shot === 'city') {
    // Rio jalan kaki di pusat kota, traffic + pejalan kaki di sekitar.
    setPlayer(6, 6, Math.PI * 0.75);
    missions.index = 0;
    traffic.peds.slice(0, 6).forEach((p, i) => {
      p.pos.set(10 + i * 5, 0, 14 + (i % 2) * 6);
      p.group.position.copy(p.pos);
    });
    traffic.cars.slice(0, 4).forEach((c, i) => {
      c.pos.set(-30 + i * 22, 0, 0);
      c.heading = -Math.PI / 2;
      c.group.rotation.y = c.heading;
    });
    return { frozen: true, note: 'city' };
  }
  if (shot === 'mission') {
    // Momen misi 1: Rio tiba di pelabuhan, beacon + dialog Kestrel.
    setPlayer(-168, 132, Math.PI * 0.9);
    missions.index = 0;
    missions.setToast('Paket Pelabuhan: antar paket ke dermaga barat.', 99);
    traffic.cars.slice(0, 2).forEach((c, i) => {
      c.pos.set(-150 + i * 18, 0, 120);
      c.heading = Math.PI / 2;
      c.group.rotation.y = c.heading;
    });
    return { frozen: true, note: 'mission' };
  }
  if (shot === 'police') {
    // Polisi mengejar Rio jalan kaki di plaza, wanted 2.
    setPlayer(0, -10, 0);
    missions.index = 1;
    police.addHeat(30, 'shot-police');
    police.syncUnits();
    police.officers.forEach((o, i) => {
      o.pos.set(-12 + i * 9, 0, -26);
      o.group.position.copy(o.pos);
    });
    police.patrols.forEach((p, i) => {
      p.pos.set(14 + i * 10, 0, -34);
      p.heading = Math.PI;
      p.speed = 8;
    });
    missions.setToast('Wanted ★★ — polisi mengejar!', 99);
    return { frozen: true, note: 'police' };
  }
  return null;
}

// Nama file screenshot yang diharapkan (cocok shots.json di repo).
export const SHOT_FILES = ['1-chase.jpg', '2-city.jpg', '3-mission.jpg', '4-police.jpg'];
export const SHOT_NAMES = ['chase', 'city', 'mission', 'police'];
