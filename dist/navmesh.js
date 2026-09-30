// Build 26: where the enemies can go on a map with height (Dehrun Terraces). Kohar Valley has its flat grid in game.js
// and never loads this file (only the kit imports it).
// The navigation is a flood of standing places over the map's space (dist/space.js) by a body of the enemies' width,
// under the enemies' own stair rule: from the starts, half a metre at a time, up steps and stairs, through doorways
// (each doorway has places of its own on its line, so that a door narrower than the grid is never missed), off edges
// no higher than `safeDrop` (one way), and up and down ladders. What comes out is a graph of places in layers, joined by
// walks, drops and ladders; paths are found on it by A*.
import * as THREE from './three.module.js';
import './build.js'; // DEPLOY-01 upgrade guard

// The enemies' body for walking: wider than the player's (the game's NAV_R), as tall; `climb` is their ladder speed.
export const FOE = {radius: .45, height: 1.8, step: .5, climb: 1.5, safeDrop: 3, budget: 40000};

// A binary heap of {f} for the A*.
class Heap { constructor() { this.a = []; } get length() { return this.a.length; }
  push(v) { const a = this.a; a.push(v); let i = a.length - 1; while (i > 0) { const j = (i - 1) >> 1; if (a[j].f <= a[i].f) break; [a[i], a[j]] = [a[j], a[i]]; i = j; } }
  pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l].f < a[m].f) m = l; if (r < a.length && a[r].f < a[m].f) m = r; if (m === i) break; [a[i], a[m]] = [a[m], a[i]]; i = m; } } return top; } }

export function makeNav(space, {region, doors = [], ladders = [], starts = [], radius = FOE.radius, height = FOE.height, step = FOE.step, safeDrop = FOE.safeDrop}) {
  const B = space.body, nodes = [], byKey = new Map(), cells = new Map(), stats = {places: 0, walks: 0, drops: 0, ladders: 0, doors: doors.length, levels: {}};
  const key = (x, z, y) => `${Math.round(x / step)},${Math.round(z / step)},${Math.round(y * 20)}`, cellKey = (x, z) => `${Math.floor(x / 2)},${Math.floor(z / 2)}`;
  const within = (x, z) => !region || x >= region.x[0] && x <= region.x[1] && z >= region.z[0] && z <= region.z[1];
  const free = (x, z, y) => space.stands(x, z, y + B.step, y + height, radius, true) && Math.abs(space.floor(x, z, y + B.step, B.lean, y).y - y) < .05;
  const moveBody = (p, dx, dz) => space.move(p, dx, dz, height, radius, {stairs: true});
  function place(x, z, y, exact = false) { const k = exact ? `e${Math.round(x * 100)},${Math.round(z * 100)},${Math.round(y * 20)}` : key(x, z, y); let n = byKey.get(k); if (n) return n;   // a doorway's own place and a square of the grid never share a key
    n = {id: nodes.length, x: exact ? x : Math.round(x / step) * step, z: exact ? z : Math.round(z / step) * step, y, edges: []}; nodes.push(n); byKey.set(k, n); const c = cellKey(n.x, n.z); if (!cells.has(c)) cells.set(c, []); cells.get(c).push(n);
    const lv = Math.round(y * 2) / 2; stats.levels[lv] = (stats.levels[lv] || 0) + 1; return n; }
  function link(a, b, kind, cost, extra) { if (a === b || a.edges.some(e => e.to === b)) return; a.edges.push({to: b, kind, cost, ...extra}); stats[kind === 'walk' ? 'walks' : kind === 'drop' ? 'drops' : 'ladders']++; }
  // The nearest square of the grid a body fits on, after it has been pushed clear of something (the push leaves the grid).
  function snap(x, z, y) { const gx = Math.round(x / step) * step, gz = Math.round(z / step) * step; if (free(gx, gz, y)) return [gx, gz];
    const ax = x > gx ? gx + step : gx - step, az = z > gz ? gz + step : gz - step; for (const [a, b] of [[ax, gz], [gx, az], [ax, az]]) if (free(a, b, y)) return [a, b]; return null; }
  // Where a body over (x, z) whose feet were at y comes to rest: on its feet if it still stands there (a lean past an edge
  // included), else fallen to what is straight under it and pushed clear; null where it would be wedged.
  function rest(x, z, y) { let stand = space.floor(x, z, y + B.step, B.lean, y).y;
    if (stand >= y - B.step) { for (let i = 0; i < 4; i++) { const again = space.floor(x, z, stand + B.step, B.lean, stand).y; if (Math.abs(again - stand) < 1e-6) break; stand = again; } return stand < y - 1e-6 && !space.stands(x, z, stand + B.step, stand + height, radius, true) ? null : {x, z, y: stand, drop: 0}; }   /* Build 29: settled lower than the mover left it (it leant on the tread above), the body must be clear there too: beside a flight's top a floor's edge is not */   // as the game settles it tick by tick: a lean over a lower tread ends on that tread
    const f = space.floor(x, z, y + .02).y, s = space.settle(x, z, f + B.step, f + height, radius); if (!s) return null; const g = snap(s.x, s.z, f); return g ? {x: g[0], z: g[1], y: f, drop: y - f} : null; }
  // The doorways' own places: on the line of the door and .7 m to either side of it.
  const extras = []; for (const d of doors) { if (d.shut) continue; const pts = d.axis === 'x' ? [[d.x, d.z], [d.x, d.z - .7], [d.x, d.z + .7]] : [[d.x, d.z], [d.x - .7, d.z], [d.x + .7, d.z]]; for (const [x, z] of pts) { const f = space.floor(x, z, d.y + B.step + .3, 0).y; if (Math.abs(f - d.y) < .4 && space.stands(x, z, f + B.step, f + height, radius, true)) extras.push({x, z, y: f}); } }
  const extraCells = new Map(); for (const e of extras) { const c = cellKey(e.x, e.z); if (!extraCells.has(c)) extraCells.set(c, []); extraCells.get(c).push(e); }
  const extrasNear = (x, z, y) => { const out = []; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const e of extraCells.get(`${Math.floor(x / 2) + i},${Math.floor(z / 2) + j}`) || []) { const d = Math.hypot(e.x - x, e.z - z); if (d > .05 && d <= 1.1 && Math.abs(e.y - y) < .6) out.push(e); } return out; };
  // The flood, from the starts; then from the top of every ladder whose foot was reached (a roof that only a ladder
  // leads to is flooded from there), until nothing new is reached.
  const queue = [], p = {x: 0, y: 0, z: 0}, seed = (x, z, y) => { const r = rest(x, z, y); if (r && within(r.x, r.z)) { const n = place(r.x, r.z, r.y); if (!n.done) queue.push(n); return n; } return null; };
  for (const s of starts) seed(s.x, s.z, space.floor(s.x, s.z, s.y + 1, 0).y);
  for (let round = 0; round < 4; round++) { flood();
    let more = false; for (const l of ladders) { const foot = nearest(l.standX, l.standZ, l.bottom, 1.2), top = nearest(l.exit[0], l.exit[1], l.top, 1.2); if (foot && !(top && Math.abs(top.y - l.top) < 1.3) && seed(l.exit[0], l.exit[1], space.floor(l.exit[0], l.exit[1], l.top + .6, 0).y)) more = true; } if (!more) break; }
  function flood() { while (queue.length) { const n = queue.pop(); if (n.done) continue; n.done = true;
    // From a square of the grid, its four neighbours; from a doorway's own place, the four squares around it (a place
    // is only ever recorded where it was tried, never moved onto the grid afterwards).
    const targets = n.exact ? [] : [[n.x + step, n.z], [n.x - step, n.z], [n.x, n.z + step], [n.x, n.z - step]]; targets.push(...extrasNear(n.x, n.z, n.y).map(e => [e.x, e.z, true]));
    if (n.exact) for (const [gx, gz] of [[Math.floor(n.x / step) * step, Math.floor(n.z / step) * step], [Math.ceil(n.x / step) * step, Math.floor(n.z / step) * step], [Math.floor(n.x / step) * step, Math.ceil(n.z / step) * step], [Math.ceil(n.x / step) * step, Math.ceil(n.z / step) * step]]) targets.push([gx, gz]);
    for (const [tx, tz, exact] of targets) { if (!within(tx, tz)) continue; const dx = tx - n.x, dz = tz - n.z, d = Math.hypot(dx, dz); if (d < .05) continue; p.x = n.x; p.y = n.y; p.z = n.z;
      if (moveBody(p, dx, dz) < d - .02) continue; const r = rest(p.x, p.z, p.y); if (!r || !within(r.x, r.z)) continue;
      if (r.drop > safeDrop || n.y - r.y > safeDrop) continue;   /* the drop as the place above sees it too (the mover may have stepped down a tread on the way) */ if (!exact && r.drop === 0 && (Math.abs(r.x - tx) > 1e-6 || Math.abs(r.z - tz) > 1e-6)) continue; const m = place(r.x, r.z, r.y, exact && r.drop === 0); if (exact) m.exact = true;
      link(n, m, r.drop > B.step ? 'drop' : 'walk', d + (r.drop > B.step ? r.drop * 2 : Math.abs(r.y - n.y))); if (!m.done) queue.push(m); } } }
  // Ladders: from the place at the foot to the place at the top, and back down.
  for (const l of ladders) { const foot = nearest(l.standX, l.standZ, l.bottom, 1.2), top = nearest(l.exit[0], l.exit[1], l.top, 1.2); if (!foot || !top) continue;
    link(foot, top, 'ladder', (l.top - l.bottom) / FOE.climb * 2 + 1.5, {ladder: l, up: true}); link(top, foot, 'ladder', (l.top - l.bottom) / FOE.climb * 2 + 1.5, {ladder: l, up: false}); }
  stats.places = nodes.length;

  // The nearest place to (x, z) at about the height y: the same layer is preferred, others cost two metres a metre.
  function nearest(x, z, y, reach = 6) { let best = null, bd = 1e9; const cx = Math.floor(x / 2), cz = Math.floor(z / 2), r = Math.ceil(reach / 2);
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) for (const n of cells.get(`${cx + i},${cz + j}`) || []) { const d = Math.hypot(n.x - x, n.z - z) + 2 * Math.abs(n.y - y); if (d < bd && Math.hypot(n.x - x, n.z - z) <= reach) { bd = d; best = n; } }
    return best; }
  // A* from one place to another; where the far place cannot be reached, the way to the nearest place reached.
  function path(from, to, budget = FOE.budget) {
    const a = nearest(from.x, from.z, from.y), b = nearest(to.x, to.z, to.y); if (!a || !b) return [];
    const h = n => Math.hypot(n.x - b.x, n.z - b.z) + Math.abs(n.y - b.y), open = new Heap(), g = new Map([[a, 0]]), parent = new Map(), closed = new Set(); let best = a, bestH = h(a), seen = 0; open.push({n: a, f: h(a)});
    while (open.length && seen++ < budget) { const {n} = open.pop(); if (closed.has(n)) continue; closed.add(n);
      const hn = h(n); if (hn < bestH) { bestH = hn; best = n; } if (n === b) break;
      for (const e of n.edges) { if (closed.has(e.to)) continue; const c = g.get(n) + e.cost; if (c >= (g.get(e.to) ?? Infinity)) continue; g.set(e.to, c); parent.set(e.to, {n, e}); open.push({n: e.to, f: c + h(e.to)}); } }
    const out = []; for (let n = best; n !== a && parent.has(n); n = parent.get(n).n) { const {e} = parent.get(n), v = new THREE.Vector3(n.x, n.y, n.z); v.kind = e.kind; if (e.kind === 'ladder') { v.ladder = e.ladder; v.up = e.up; } out.push(v); }
    return out.reverse(); }
  // Whether a body walks straight from a to b on one layer (steps and stairs on the way included).
  // Whether a body walks straight from a to b on one layer (steps and stairs on the way included), in the small pieces
  // a frame moves it by: a diagonal that only one axis of can be walked at a time is not straight.
  function walkable(a, b) { const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz); if (d < .01) return true; p.x = a.x; p.y = a.y; p.z = a.z; const n = Math.ceil(d / .1);
    for (let i = 0; i < n; i++) { if (moveBody(p, dx / n, dz / n) < d / n - .005) return false; const f = space.floor(p.x, p.z, p.y + B.step, B.lean, p.y); if (f.y < p.y - B.step) return false; p.y = f.y; }
    return Math.abs(p.y - b.y) < .6; }
  return {nodes, stats, nearest, path, walkable, free, move: moveBody, rest, radius, height, climb: FOE.climb, doors: extras.length,
    // Where a body walking at (x, z) with its feet at y stands, as the game's height rules see it.
    floor: (x, z, y) => space.floor(x, z, y + B.step, B.lean, y)};
}
