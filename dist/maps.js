// Build 21: the maps the game knows and the one it is using. A map is a description (see dist/map-kohar.js); the game
// builds its world from the active map when the page loads, and the modules that hold map-dependent rules (the Ambush
// arena, the enemy posts, the village props) follow the active map through onMap(). Kohar Valley is map 1 and the
// map that is always there; it is active unless another is chosen before the game is loaded (Build 22: ?map=dehrun).
import {KOHAR} from './map-kohar.js';
import './build.js'; // DEPLOY-01 upgrade guard

const maps = new Map(), followers = [];
let active = null;
export function registerMap(map) { if (!map || typeof map.id !== 'string' || typeof map.height !== 'function') throw new Error('a map needs an id and a height function'); maps.set(map.id, map); return map; }
export function selectMap(id) { const map = maps.get(id); if (!map) throw new Error(`unknown map: ${id}`); active = map; for (const f of followers) f(map); return map; }
export const activeMap = () => active;
export const mapIds = () => [...maps.keys()];
// Maps beside Kohar Valley are fetched when they are asked for and not before: their description, their kit, their
// model loader and their assets. The specifiers are plain, so the import map gives them the build's version.
const LATER = {dehrun: () => import('./map-dehrun.js').then(m => m.DEHRUN)};
export const laterMaps = () => Object.keys(LATER);
export async function loadMap(id) { if (!maps.has(id)) { if (!LATER[id]) throw new Error(`unknown map: ${id}`); registerMap(await LATER[id]()); } return selectMap(id); }
// Calls `follow` with the active map now and again whenever another map is chosen.
export function onMap(follow) { followers.push(follow); follow(active); }
registerMap(KOHAR); selectMap(KOHAR.id);
// In a browser the map is chosen by the address: ?map=dehrun. Anything else, or a map that does not arrive, is Kohar Valley.
const asked = typeof location === 'object' && location ? new URLSearchParams(location.search).get('map') : null;
if (asked && asked !== KOHAR.id) { try { await loadMap(asked); } catch (e) { console.warn('DUSTLINE: map not loaded, Kohar Valley it is:', e?.message || e); selectMap(KOHAR.id); } }
