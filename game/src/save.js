// SOLMAR save — progress (mission, cash, health, position, wanted) in
// localStorage under a versioned key, so a corrupt or stale save can never
// break a fresh game. Every field is validated on load.
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

function cleanNumber(value, fallback, min, max) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    const clean = defaultSave();
    clean.missionIndex = Number.isInteger(data.missionIndex) ? Math.max(0, data.missionIndex) : 0;
    clean.cash = cleanNumber(Math.floor(data.cash), START_CASH, 0, 999999);
    clean.health = cleanNumber(data.health, PLAYER.maxHealth, 1, PLAYER.maxHealth);
    clean.wanted = Number.isInteger(data.wanted) ? Math.max(0, Math.min(5, data.wanted)) : 0;
    clean.x = cleanNumber(data.x, 0, -260, 260);
    clean.z = cleanNumber(data.z, 30, -260, 260);
    clean.heading = cleanNumber(data.heading, 0, -Math.PI * 4, Math.PI * 4);
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

// One-line summary for the start screen ("Misi 2 dari 4 · 1 selesai · $370").
export function saveSummary(save) {
  if (!save) return '';
  return `Misi ${save.missionIndex + 1} dari 4 · ${save.completed.length} selesai · $${save.cash}`;
}
