// Save and load: cash, mission progress and best run, kept in localStorage.
// Storage can be off (private windows); then progress lasts the visit only.
import { SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return {
      money: Number.isFinite(data.money) ? data.money : 0,
      mission: Number.isFinite(data.mission) ? data.mission : 0,
      best: Number.isFinite(data.best) ? data.best : 0,
    };
  } catch {
    return null;
  }
}

export function storeSave(data) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: data.money || 0,
      mission: data.mission || 0,
      best: data.best || 0,
    }));
  } catch {
    // Storage off: ignore.
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Ignore.
  }
}
