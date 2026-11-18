// localStorage save: cash, missions done, player position, health and ammo.
import { SAVE_KEY } from './config.js';

export function saveGame(state) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: state.cash, missionIndex: state.missionIndex, completed: state.completed,
      x: state.x, z: state.z, health: state.health, ammo: state.ammo, savedAt: Date.now(),
    }));
    return true;
  } catch { return false; }
}
export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (typeof d.cash !== 'number' || typeof d.missionIndex !== 'number') return null;
    return d;
  } catch { return null; }
}
export function clearSave() { try { window.localStorage.removeItem(SAVE_KEY); } catch {} }
