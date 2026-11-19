// Save/load localStorage — progresi Rio: uang, misi terbuka, health, posisi.
const KEY = 'solmar-save-v1';

export function saveGame(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      cash: state.cash, missionIndex: state.missionIndex,
      health: state.health, completed: state.completedMissions,
      pos: state.playerPos, time: state.clockMinutes, savedAt: Date.now(),
    }));
  } catch (e) { /* penyimpanan penuh / privat: game tetap jalan */ }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (typeof d.cash !== 'number' || typeof d.missionIndex !== 'number') return null;
    return d;
  } catch (e) { return null; }
}

export function hasSave() { return loadGame() !== null; }
export function clearSave() { try { localStorage.removeItem(KEY); } catch (e) {} }
