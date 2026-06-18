import { SAVE_VERSION } from '../engine/state';
import type { GameState } from '../engine/types';

const KEY = 'gigarack.save.v1';

/** Load a saved game, or null if none / incompatible / corrupt. */
export function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as GameState;
    if (data.version !== SAVE_VERSION) return null; // future: migrate
    // Defensive defaults for forward-compat.
    data.owned ??= {};
    data.loans ??= [];
    data.seenLessons ??= [];
    return data;
  } catch {
    return null;
  }
}

export function writeSave(state: GameState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable — non-fatal */
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
