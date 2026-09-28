// Build 11: the game's first persistent data, the Ambush personal best (best wave reached, best points banked), kept in
// the browser's localStorage under one key per kind of run (solo, co-op) as one small JSON object each. No accounts, no server. Every storage access is
// guarded: a private window, blocked or cleared storage, or a full quota must never break the game (the run simply is
// not remembered). Self-contained so a later save system (SAVE-01) can absorb it: nothing else reads the key.
import './build.js'; // DEPLOY-01 upgrade guard

export const BEST_KEY = 'dustline.ambush.best';
// Build 16: a two-player run is recorded under its own key, so it can never overwrite or be compared with the solo best.
export const BEST_KEY_COOP = 'dustline.ambush.best.coop';
// The browser's localStorage when it can be used, else null (Safari with cookies blocked throws on access).
export function storageOf() { try { const s = globalThis.localStorage; return s && typeof s.getItem === 'function' && typeof s.setItem === 'function' ? s : null; } catch { return null; } }
// The stored best, validated, or null when there is none or it cannot be read.
export function readBest(storage = storageOf(), key = BEST_KEY) {
  try { if (!storage) return null; const raw = storage.getItem(key); if (!raw) return null; const b = JSON.parse(raw);
    if (!b || !Number.isInteger(b.wave) || b.wave < 1 || !Number.isInteger(b.banked) || b.banked < 0) return null; return {wave: b.wave, banked: b.banked}; } catch { return null; }
}
// Records a finished run. The stored best changes only when the run improves it (or on the first recorded run).
// Returns the best after this run (null when nothing can be stored and nothing was stored), what improved, and whether
// this write reached storage.
export function recordBest(run, storage = storageOf(), key = BEST_KEY) {
  const wave = Math.max(1, Math.floor(Number(run?.wave) || 1)), banked = Math.max(0, Math.round(Number(run?.banked) || 0));
  const prev = readBest(storage, key), improvedWave = !!prev && wave > prev.wave, improvedBank = !!prev && banked > prev.banked, first = !prev;
  const best = prev ? {wave: Math.max(prev.wave, wave), banked: Math.max(prev.banked, banked)} : {wave, banked};
  let saved = false;
  if (storage && (first || improvedWave || improvedBank)) { try { storage.setItem(key, JSON.stringify(best)); saved = true; } catch { saved = false; } }
  return {best: prev || saved ? best : null, previous: prev, improvedWave, improvedBank, first: first && saved, saved};
}
