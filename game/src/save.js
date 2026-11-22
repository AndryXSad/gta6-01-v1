// Solmar save — progress (mission, cash, health, position, wanted) in
// localStorage under a versioned key, so a corrupt or stale save can never
// break a fresh game. Everything is validated on load.
import { SAVE_KEY, START_CASH, PLAYER } from './config.js';

export function defaultSave() {
  return {
    version: 1,
    missionIndex: 0,
    cash: START_CASH,
    health: PLAYER.maxHealth,
    wanted: 0,
    x: 0,
    z: 30,
    heading: 0,
    completed: [],
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    const clean = defaultSave();
    clean.missionIndex = Number.isInteger(data.missionIndex) ? Math.max(0, data.missionIndex) : 0;
    clean.cash = Number.isFinite(data.cash) ? Math.max(0, Math.floor(data.cash)) : START_CASH;
    clean.health = Number.isFinite(data.health)
      ? Math.max(1, Math.min(PLAYER.maxHealth, data.health))
      : PLAYER.maxHealth;
    clean.wanted = Number.isInteger(data.wanted) ? Math.max(0, Math.min(5, data.wanted)) : 0;
    clean.x = Number.isFinite(data.x) ? data.x : 0;
    clean.z = Number.isFinite(data.z) ? data.z : 30;
    clean.heading = Number.isFinite(data.heading) ? data.heading : 0;
    clean.completed = Array.isArray(data.completed) ? data.completed.filter((m) => typeof m === 'string') : [];
    return clean;
  } catch (e) {
    return null;
  }
}

export function storeSave(state) {
  try {
    const data = {
      version: 1,
      missionIndex: state.missionIndex,
      cash: Math.floor(state.cash),
      health: Math.round(state.health),
      wanted: state.wanted,
      x: Math.round(state.x * 10) / 10,
      z: Math.round(state.z * 10) / 10,
      heading: Math.round(state.heading * 100) / 100,
      completed: state.completed.slice(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {}
}

export function hasSave() {
  return loadSave() !== null;
}

// One-line summary for the start screen ("Continue — Misi 2, $370").
export function saveSummary(save) {
  if (!save) return '';
  const done = save.completed.length;
  return `Misi ${save.missionIndex + 1} dari 4 · ${done} selesai · $${save.cash}`;
}
