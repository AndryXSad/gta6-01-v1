// Save Solmar: progres (misi, uang, HP, posisi, wanted) di localStorage.
// Kunci berversi supaya save lama yang rusak tidak merusak game baru.
const KEY = 'solmar-save-v1';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    if (typeof data.missionIndex !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function saveGame(state) {
  try {
    const data = {
      missionIndex: state.missions.index,
      money: state.player.money,
      health: Math.round(state.player.health),
      armor: Math.round(state.player.armor),
      x: Math.round(state.player.pos.x * 10) / 10,
      z: Math.round(state.player.pos.z * 10) / 10,
      stars: state.police.stars,
      completed: state.missions.completedCount,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try { window.localStorage.removeItem(KEY); } catch { /* abaikan */ }
}

export function hasSave() {
  return loadSave() !== null;
}

// Ringkasan save untuk menu (dipakai main.js saat boot).
export function saveSummary() {
  const s = loadSave();
  if (!s) return null;
  return `Misi ${s.missionIndex + 1}/4 · $${s.money} · HP ${s.health}`;
}
