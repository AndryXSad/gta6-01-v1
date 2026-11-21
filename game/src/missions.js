// Misi Solmar: 4 pekerjaan Rio untuk Madame Kestrel. Tiap misi punya
// penanda beacon (silinder cahaya) + dialog singkat + hadiah uang.
// Selesai semua = epilog "bebas utang" + bonus.
import { CFG } from './config.js';

const T = () => window.THREE;

export const MISSION_DEFS = [
  {
    id: 'paket',
    title: 'Paket Pelabuhan',
    giver: 'Madame Kestrel',
    text: 'Antar paket ini ke dermaga barat. Jangan berhenti di tengah jalan.',
    target: CFG.spots.harbor,
    reward: 120,
    need: 'reach',
    hint: 'Ikuti penanda kuning ke pelabuhan.',
  },
  {
    id: 'curi',
    title: 'Mobil untuk Ombak',
    giver: 'Madame Kestrel',
    text: 'Ombak butuh mobil bagus. Curi satu, bawa ke garasi timur. Polisi akan marah.',
    target: CFG.spots.garage,
    reward: 250,
    need: 'stolenCar',
    hint: 'Tekan E di dekat mobil parkir, lalu bawa ke garasi.',
  },
  {
    id: 'jemput',
    title: 'Jemput Sari',
    giver: 'Sari',
    text: 'Aku di boulevard pantai. Jemput aku sebelum patroli lewat sini!',
    target: CFG.spots.boulevard,
    reward: 200,
    need: 'reach',
    hint: 'Ke boulevard pantai di selatan.',
  },
  {
    id: 'getaway',
    title: 'Getaway Terakhir',
    giver: 'Madame Kestrel',
    text: 'Terakhir: bawa Sari lewat highway utara dan hilang. Utangmu lunas.',
    target: CFG.spots.highwayNorth,
    reward: 500,
    need: 'reach',
    hint: 'Highway utara — gas pol, jangan berhenti.',
  },
];

export function createMissions(scene) {
  const THREE = T();
  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0xf5d76e, transparent: true, opacity: 0.45,
  });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 30, 18, 1, true), beaconMat);
  beacon.position.set(0, 15, 0);
  scene.add(beacon);
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.4, 3.4, 24),
    new THREE.MeshBasicMaterial({ color: 0xf5d76e, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.2;
  scene.add(ring);

  const m = {
    defs: MISSION_DEFS,
    index: 0,
    done: false,
    completedCount: 0,
    earned: 0,
    toast: '',
    toastTimer: 0,
    beacon, ring,

    current() {
      return m.index < m.defs.length ? m.defs[m.index] : null;
    },

    objectiveText() {
      const cur = m.current();
      if (m.done) return 'Semua misi selesai — Rio bebas utang!';
      return cur ? `${cur.title}: ${cur.hint}` : '';
    },

    dialogText() {
      const cur = m.current();
      if (m.done) return 'Kestrel: "Utang lunas. Solmar milikmu sekarang, Rio."';
      return cur ? `${cur.giver}: "${cur.text}"` : '';
    },

    setToast(text, seconds = 4) {
      m.toast = text;
      m.toastTimer = seconds;
    },

    completeCurrent(player) {
      const cur = m.current();
      if (!cur) return;
      player.money += cur.reward;
      m.earned += cur.reward;
      m.completedCount += 1;
      m.setToast(`Misi selesai: ${cur.title}  +$${cur.reward}`, 4.5);
      m.index += 1;
      if (m.index >= m.defs.length) {
        m.done = true;
        player.money += 300;
        m.earned += 300;
        m.setToast('SEMUA MISI SELESAI — bonus $300. Rio bebas utang!', 6);
      }
    },

    // Dipanggil tiap frame: cek kedatangan di penanda.
    update(dt, player, vehicles) {
      m.toastTimer = Math.max(0, m.toastTimer - dt);
      const cur = m.current();
      if (!cur) {
        beacon.visible = false;
        ring.visible = false;
        return;
      }
      beacon.position.set(cur.target.x, 15, cur.target.z);
      ring.position.set(cur.target.x, 0.2, cur.target.z);
      beacon.rotation.y += dt * 0.8;
      const pulse = 0.35 + Math.sin(performance.now() * 0.004) * 0.12;
      beaconMat.opacity = pulse;
      const d = Math.hypot(player.pos.x - cur.target.x, player.pos.z - cur.target.z);
      if (cur.need === 'reach' && d < 7) {
        m.completeCurrent(player);
      } else if (cur.need === 'stolenCar' && d < 9) {
        const inStolen = vehicles.current && vehicles.current.stolen;
        if (inStolen) m.completeCurrent(player);
        else if (!vehicles.current) m.setToast('Bawa mobil curian ke sini — bukan jalan kaki!', 2);
      }
    },
  };
  return m;
}
