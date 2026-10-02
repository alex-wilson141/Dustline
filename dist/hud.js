// Build 40: the HUD's panel (F.17), the pure part. What the bottom-right corner shows is worked out here from the game's own
// state, and written into the page by game.js (`panelDraw`): the weapon in hand (name, calibre, rounds, reserve, fire mode,
// what it is doing), the other weapon, the knife, the three throwables, the dressings, each with its key, and in Ambush at a
// crate what can be bought, for how much, and whether it can be. Nothing here touches the page, a seeded number or the game:
// the same state always gives the same panel, and a check can compare every value with the state it was made from.
import './build.js'; // DEPLOY-01 upgrade guard

export const PANEL = {
  low: .25,            // a magazine at or under this share of its capacity is LOW (the rounds are shown as a warning)
  digits: 3,           // the rounds and the reserve have room for this many digits; more is shown as the largest that fits
};
const key = (keys, name) => (keys[name] || '').replace(/^(Key|Digit)/, '');
const fit = n => String(Math.max(0, Math.min(10 ** PANEL.digits - 1, Math.floor(Number.isFinite(n) ? n : 0))));

// What the weapon in hand is doing, in one word and a share done (0 to 1; -1 where there is nothing to measure).
// The order matters: a reload shows over a draw, a dressing over an empty magazine.
export function weaponState(s) {
  if (s.down) return {id: 'down', text: 'DOWN', done: -1};
  if (s.reloadRemaining > 0) return {id: 'reloading', text: 'RELOADING', done: Math.max(0, Math.min(1, 1 - s.reloadRemaining / (s.reloadTime || 1))), left: s.reloadRemaining.toFixed(1)};
  if (s.healing > 0) return {id: 'dressing', text: 'DRESSING', done: -1};
  if (s.drawing > 0) return {id: 'drawing', text: 'DRAWING', done: -1};
  if (s.cooking) return {id: 'cooking', text: `${s.itemNames[s.cooking]} IN HAND`, done: -1};
  if (s.ammo === 0 && s.reserve === 0) return {id: 'out', text: 'NO AMMUNITION', done: -1};
  if (s.ammo === 0) return {id: 'empty', text: 'RELOAD', done: -1};
  return {id: 'ready', text: '', done: -1};
}

// One thing on sale at a crate: its key, its price and whether it can be bought ('ok'), costs more than the player has
// ('short': `need` says how much more) or cannot be carried ('full').
const offer = (keyName, price, full, points) => ({key: keyName, price, state: full ? 'full' : points >= price ? 'ok' : 'short', text: full ? 'FULL' : String(price), need: full ? 0 : Math.max(0, price - points)});

// The whole panel. `s`: the weapon in hand {gun, name, calibre, ammo, reserve, capacity, automatic, reloadRemaining,
// reloadTime}, `other` (the weapon not in hand: {gun, name, ammo, reserve}), `drawing`, `healing`, `cooking` (a throwable's
// kind or null), `item` (the throwable chosen), `kit` (counts), `order` (the throwables' order), `itemNames`, `bandages`,
// `keys` (the game's KEYS), `down`, and `shop`: null, or what the crate the player stands at sells {points, rifle: {name,
// price} | null, mag: {price, full}, dressing: {price, full}, items: {kind: {price, full}}}.
export function panelModel(s) {
  const st = weaponState(s), low = s.ammo > 0 && s.ammo <= Math.ceil(s.capacity * PANEL.low);
  const weapon = {gun: s.gun, name: s.name, calibre: s.calibre, rounds: fit(s.ammo), reserve: fit(s.reserve), mode: s.automatic ? 'AUTO' : 'SEMI', key: key(s.keys, 'reload'),
    state: st.id, stateText: st.text, done: st.done, left: st.left || '', level: s.ammo === 0 ? 'empty' : low ? 'low' : 'ok', reserveLevel: s.reserve === 0 ? 'empty' : 'ok',
    // the key to reload is pressed for attention when there is something to reload with and the magazine wants it
    urge: s.reserve > 0 && s.ammo < s.capacity && (s.ammo === 0 || low) && st.id !== 'reloading'};
  const other = {gun: s.other.gun, name: s.other.name, rounds: fit(s.other.ammo), reserve: fit(s.other.reserve), key: key(s.keys, 'swap'), level: s.other.ammo === 0 && s.other.reserve === 0 ? 'empty' : 'ok'};
  const items = s.order.map(k => ({id: k, name: s.itemNames[k], count: fit(s.kit[k]), chosen: k === s.item, key: k === s.item ? key(s.keys, 'throw') : '', level: s.kit[k] > 0 ? 'ok' : 'empty', live: s.cooking === k}));
  const dressing = {count: fit(s.bandages), key: key(s.keys, 'heal'), level: s.bandages > 0 ? 'ok' : 'empty', live: s.healing > 0};
  const knife = {key: key(s.keys, 'melee')};
  let shop = null;
  if (s.shop) { const p = s.shop.points;
    shop = {rifle: s.shop.rifle ? {...offer(key(s.keys, 'interact'), s.shop.rifle.price, false, p), name: s.shop.rifle.name} : null,
      mag: offer(key(s.keys, 'ammo'), s.shop.mag.price, s.shop.mag.full, p), dressing: offer(key(s.keys, 'dressingBuy'), s.shop.dressing.price, s.shop.dressing.full, p),
      items: Object.fromEntries(s.order.map(k => [k, offer(key(s.keys, 'buy' + k[0].toUpperCase() + k.slice(1)), s.shop.items[k].price, s.shop.items[k].full, p)]))}; }
  return {weapon, other, knife, items, cycle: key(s.keys, 'item'), dressing, shop, down: !!s.down};
}
