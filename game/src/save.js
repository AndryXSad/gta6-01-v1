// Save: one small JSON blob in localStorage — cash, which mission the
// player is on, and how many jobs are done. Nothing else leaves the game.

const KEY = 'solmar-save-v1';

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.money !== 'number' || typeof data.missionIndex !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      money: Math.floor(data.money),
      missionIndex: data.missionIndex,
      savedAt: new Date().toISOString(),
    }));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try { localStorage.removeItem(KEY); } catch { /* private mode — ignore */ }
}
