// Ambush mode (Build 09): wave survival in the west district of Kohar Valley. No win condition: survive as long as
// possible, then either die (nothing banked) or extract between waves (the run's points banked with a multiplier).
// This module holds the data and the pure rules; game.js wires them to the world, the AI and the HUD. Everything is
// built from the game's existing materials (no new assets), and only exists while Ambush is being played.
import * as THREE from './three.module.js';
import {mergeGeometries} from './BufferGeometryUtils.js';
import './build.js'; // DEPLOY-01 upgrade guard

export const AMBUSH = {
  start: [-30, 20],            // player start, in the courtyard (area 1)
  startPoints: 500, killPoints: 100, headshotBonus: 50,
  firstBreak: 10, breakTime: 12, afterStay: 5,
  // From the end of this wave on, each wave ends with a timed choice: extract (bank the run) or stay for the next wave.
  decisionFrom: 5, decisionTime: 10, bankStep: .25,
  outOfBounds: 5,              // seconds outside the open arena before the run ends
  spawnMargin: 6,              // spawns stay at least this far outside the open arena ...
  spawnMinDist: 35, spawnMaxDist: 85, spawnTests: 24, // ... and 35-85 m from the player, unseen (up to 24 nearest tested per attempt)
  // Build 11: a spot whose walking route to the player is longer than spawnMaxRoute cells (2 m each) is skipped, so nobody
  // arrives by a 90 m detour around a closed barricade; at most spawnRouteTests routes are computed per attempt.
  spawnMaxRoute: 36, spawnRouteTests: 6,
  // Each wave arrives from one direction: spawns within sectorSpread degrees of the wave's bearing (seen from where the
  // player stood when it began), widened by 30 degrees after every sectorWiden spawn attempts that find no spot.
  sectorSpread: 40, sectorWiden: 6,
  // Attack (Build 10). Enemies move up on the player to their own spot holdRange from you; seeing you within the wave's
  // fight range they stop and fire for fightTime, then move up again; every boundTime of advancing they may duck into
  // cover that gains ground, for coverTime, then rise and fire for fireTime. Failsafe: no closeStep of progress for
  // pushAfter seconds and they push straight in until within pushStop. Last resort: no progress for recycleAfter
  // seconds while unseen and the enemy is withdrawn and sent again.
  holdRange: 7, fightTime: [2.5, 4], boundTime: [3, 5], coverTime: [.6, 1.2], fireTime: [1, 2], coverSearch: 10,
  coverRunLimit: 4, lostSight: 1.2, replan: 1.5, pushAfter: 8, closeStep: 3, pushStop: 6, recycleAfter: 30,
  coverOnRoute: 5,        // Build 11: cover is taken only within this distance of one of the next five route cells
  // Stuck watchdog: an enemy on the move (advancing or running to cover, route still ahead of it) that has not shifted
  // stallStep metres in stallTime seconds is grinding on a corner (its .34 m body against a route planned at .45 m
  // clearance); it steps to the nearest navigable spot, takes a different slot and re-routes.
  stallTime: 3, stallStep: 1,
  arenaWallHeight: 1.2,   // the arena's brick walls in Ambush: over a standing eye (1.7 m) you see and fire; crouched you hide
  // Build 11 difficulty: the alive cap rises with the wave, 4 at wave 1 to aliveCeiling at wave 17 (see waveSpec); enemyPool
  // enemy actors exist in Ambush (the seven Story soldiers plus extras attached only while Ambush is played), leaving room
  // for corpseMax bodies to lie while the cap is full.
  // Build 12: Ambush is solo (no AI squad), so the cap starts at 2 and tops out at 9 from wave 15; the pool of 16 leaves room
  // for corpseMax bodies plus spares.
  aliveCeiling: 9, enemyPool: 16,
  // Build 11 economy: a bought rifle comes loaded with one magazine and rifleMagazines - 1 in reserve; a magazine costs
  // magBase points per 100 hp it can deal (capacity × damage), × (1 + magWaveStep per wave after the first) up to magWaveCap.
  rifleMagazines: 5, magBase: 6, magWaveStep: .1, magWaveCap: 2.5,
  // Build 12: a field dressing (+50 hp, H) can be bought at any crate for dressingBase points × the same wave scale as
  // magazines; the kit holds at most dressingMax.
  dressingBase: 150, dressingMax: 5,
};
// The brick walls in and around the arena ([x, z, width, depth], 1.7 m tall elsewhere), lowered to arenaWallHeight in Ambush.
export const ARENA_WALLS = [[-40, 14, .6, 24], [-40, 2, 12, .6], [-36, 27, 8, .6], [-48, -35, 18, .6]];

// The four areas (axis-aligned rectangles, x and z ranges in metres). Area 1 is open from the start.
export const AREAS = [
  {id: 1, name: 'Courtyard', x: [-40, -19], z: [2, 28]},
  {id: 2, name: 'Field office yard', x: [-40, -12], z: [-24, 2]},
  {id: 3, name: 'West lane', x: [-58, -40], z: [-24, 2]},
  {id: 4, name: 'North houses', x: [-52, -12], z: [-54, -24]},
];
// Purchasable barricades: a sandbag line along the border with a timber section at the purchase point. Buying
// removes the whole line and opens `opens`; it can be bought from inside `from` once that area is open.
export const GATES = [
  {id: 'g12', from: 1, opens: 2, price: 750, a: [-34, 2], b: [-19, 2], station: [-26.5, 2]},
  {id: 'g23', from: 2, opens: 3, price: 1000, a: [-40, -24], b: [-40, 2], station: [-40, -8]},
  {id: 'g24', from: 2, opens: 4, price: 1250, a: [-40, -24], b: [-12, -24], station: [-26, -24]},
];
// One weapon crate per area, selling one of the four class rifles (unchanged weapon stats). Buying the weapon you
// already hold refills its ammunition for half the price.
export const STATIONS = [
  {area: 1, weapon: 'medic', price: 500, at: [-36, 24]},
  {area: 2, weapon: 'assault', price: 750, at: [-24, -1]},
  {area: 3, weapon: 'marksman', price: 1000, at: [-50, -3]},
  {area: 4, weapon: 'support', price: 1250, at: [-20, -46]},
];
// Build 11 economy. A magazine's price follows the damage it can deal (capacity × damage), so every rifle pays about the
// same per potential kill, and it rises with the wave up to magWaveCap: CQB/carbine 70 → 175, DMR 100 → 250, automatic
// rifle 160 → 400 points (wave 1 → wave 16+). Rounds are added to the reserve up to the rifle's reserve limit.
export function magazinePrice(config, wave) { const scale = Math.min(AMBUSH.magWaveCap, 1 + AMBUSH.magWaveStep * (Math.max(1, wave) - 1)); return Math.ceil(config.capacity * config.damage / 100 * AMBUSH.magBase * scale / 10) * 10; }
// Price of one field dressing at wave `wave` (Build 12): 150 at wave 1 rising like magazines to 380 from wave 16.
export function dressingPrice(wave) { const scale = Math.min(AMBUSH.magWaveCap, 1 + AMBUSH.magWaveStep * (Math.max(1, wave) - 1)); return Math.ceil(AMBUSH.dressingBase * scale / 10) * 10; }
// Magazines a rifle comes with when bought at a crate: rifleMagazines, but never more reserve than the rifle can carry
// (the automatic rifle's 225-round reserve holds three drums, so it arrives with four).
export const rifleMagazines = config => 1 + Math.min(AMBUSH.rifleMagazines - 1, Math.floor(config.reserve / config.capacity));
// What a rifle really does, read from its live config (never hard-coded text): damage per hit, rounds per minute,
// magazine, reserve limit, fire mode, reload time.
export function weaponFacts(config) { return {damage: config.damage, rpm: Math.round(60 / config.interval), mag: config.capacity, reserve: config.reserve, auto: !!config.automatic, reload: config.reload}; }
// The trade-off of a rifle for sale against the rifle held, in plain words (Build 12): the two largest relative differences
// among damage, rate of fire, magazine size and reload time that reach TRADEOFF_MIN (a change of fire mode counts as a
// 50 % difference, so it shows unless two bigger ones outrank it), in the fixed order damage, fire, magazine, mode,
// reload; nothing when the rifles are alike.
export const TRADEOFF_MIN = .1;
export function weaponTradeoff(config, held) {
  const a = weaponFacts(config), b = weaponFacts(held), rel = (x, y) => (x - y) / y;
  const items = [
    {order: 0, size: Math.abs(rel(a.damage, b.damage)), words: rel(a.damage, b.damage) > 0 ? 'MORE DAMAGE' : 'LESS DAMAGE'},
    {order: 1, size: Math.abs(rel(a.rpm, b.rpm)), words: rel(a.rpm, b.rpm) > 0 ? 'FASTER FIRE' : 'SLOWER FIRE'},
    {order: 2, size: Math.abs(rel(a.mag, b.mag)), words: rel(a.mag, b.mag) > 0 ? 'BIGGER MAGAZINE' : 'SMALLER MAGAZINE'},
    {order: 3, size: a.auto === b.auto ? 0 : .5, words: a.auto ? 'FULL-AUTO' : 'SEMI-AUTO'},
    {order: 4, size: Math.abs(rel(a.reload, b.reload)), words: rel(a.reload, b.reload) > 0 ? 'SLOWER RELOAD' : 'FASTER RELOAD'},
  ].filter(i => i.size >= TRADEOFF_MIN);
  return items.sort((u, v) => v.size - u.size).slice(0, 2).sort((u, v) => u.order - v.order).map(i => i.words).join(' · ');
}

// Escalation by count, spawn pressure and aggression only. Enemy accuracy, damage and fire rate are never touched.
export function waveSpec(n) {
  const k = Math.max(0, n - 1);
  return {
    count: Math.min(4 + 2 * n, 40),                 // 6, 8, 10 ... capped at 40 (wave 18)
    aliveCap: Math.min(AMBUSH.aliveCeiling, 1 + Math.ceil(n / 2)), // 2, 2, 3, 3, 4, 4 ... 9 from wave 15 (Build 12, solo)
    spawnGap: Math.max(1, 4.5 - .3 * k),            // seconds between arrivals (floor 1 s from wave 12; Build 12, solo)
    fightRange: Math.max(14, 26 - k),               // they come this close before stopping to fire
    pauseScale: Math.max(.5, 1 - .05 * k),          // their stops to fire and duck into cover get shorter
  };
}
// The enemy AI tunables for wave n: the normal ones (movement speeds, sensing), the Ambush attack values with the
// wave's aggression applied, and corpse limits that leave the enemyPool room for the alive cap and bodies that still lie in view (20 = 12 alive + 4 lying + 4 spare).
export function aiTuningFor(n, base) {
  const w = waveSpec(n), s = r => [r[0] * w.pauseScale, r[1] * w.pauseScale];
  return {...base, reinforce: false, engageLeash: 200, corpseMax: 4, corpseLife: 20, fightRange: w.fightRange,
    fightTime: s(AMBUSH.fightTime), coverTime: s(AMBUSH.coverTime), fireTime: s(AMBUSH.fireTime)};
}
// Extracting after surviving wave w banks the points earned times this (x1 at the first offer, +0.25 per wave after).
export const bankMultiplier = survived => survived < AMBUSH.decisionFrom ? 0 : 1 + AMBUSH.bankStep * (survived - AMBUSH.decisionFrom);

export const inArea = (area, x, z, pad = 0) => x >= area.x[0] - pad && x <= area.x[1] + pad && z >= area.z[0] - pad && z <= area.z[1] + pad;
export const areaById = id => AREAS.find(a => a.id === id);
export const inArena = (open, x, z, pad = 0) => [...open].some(id => inArea(areaById(id), x, z, pad));
export function distToArena(open, x, z) {
  let best = Infinity;
  for (const id of open) { const a = areaById(id), dx = Math.max(a.x[0] - x, 0, x - a.x[1]), dz = Math.max(a.z[0] - z, 0, z - a.z[1]); best = Math.min(best, Math.hypot(dx, dz)); }
  return best;
}

// The arena's edge: every stretch of an open area's border that does not face another open area and is not covered
// by a closed barricade. Returned as axis-aligned segments [x1, z1, x2, z2].
export function arenaEdges(open, closedGates) {
  // A barricade only cancels the edge pieces lying along it (a perpendicular barricade ending at a corner does not).
  const segs = [], step = .5, onGate = (x, z, horizontal) => closedGates.some(g => {
    const [ax, az] = g.a, [bx, bz] = g.b;
    if ((az === bz) !== horizontal) return false;
    return ax === bx ? Math.abs(x - ax) < .3 && z >= Math.min(az, bz) - .01 && z <= Math.max(az, bz) + .01 : Math.abs(z - az) < .3 && x >= Math.min(ax, bx) - .01 && x <= Math.max(ax, bx) + .01;
  });
  for (const id of open) {
    const {x: [x0, x1], z: [z0, z1]} = areaById(id);
    for (const [ax, az, bx, bz, nx, nz] of [[x0, z0, x1, z0, 0, -1], [x0, z1, x1, z1, 0, 1], [x0, z0, x0, z1, -1, 0], [x1, z0, x1, z1, 1, 0]]) {
      const len = Math.hypot(bx - ax, bz - az), n = Math.round(len / step); let run = null;
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n, mx = ax + (bx - ax) * (t0 + t1) / 2, mz = az + (bz - az) * (t0 + t1) / 2;
        const edge = !inArena(open, mx + nx * .2, mz + nz * .2) && !onGate(mx, mz, az === bz);
        if (edge) { if (!run) run = [ax + (bx - ax) * t0, az + (bz - az) * t0]; run[2] = ax + (bx - ax) * t1; run[3] = az + (bz - az) * t1; }
        else if (run) { segs.push(run); run = null; }
      }
      if (run) segs.push(run);
    }
  }
  return segs;
}

const merged = (list, material) => { const g = mergeGeometries(list, false); list.forEach(x => x.dispose()); const m = new THREE.Mesh(g, material); m.castShadow = m.receiveShadow = true; return m; };
const boxAt = (w, h, d, x, y, z, rot = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (rot) g.rotateY(rot); g.translate(x, y, z); return g; };

// Edge markers: a hazard-striped ground line (unlit, so it reads in shade and at distance) and a marker post every
// 3 m with a red cap, like a cordon without the tape: enemies walk between the posts, nothing is faked.
export function buildEdgeMarkers(segs, groundY, mats) {
  const group = new THREE.Group(), stripes = [[], []], posts = [], caps = [];
  let dash = 0;
  for (const [x1, z1, x2, z2] of segs) {
    const len = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.round(len / .75)), ux = (x2 - x1) / len, uz = (z2 - z1) / len, px = -uz * .16, pz = ux * .16;
    for (let i = 0; i < n; i++) {
      const ax = x1 + (x2 - x1) * i / n, az = z1 + (z2 - z1) * i / n, bx = x1 + (x2 - x1) * (i + 1) / n, bz = z1 + (z2 - z1) * (i + 1) / n;
      const g = new THREE.BufferGeometry(), ya = groundY(ax, az) + .045, yb = groundY(bx, bz) + .045;
      g.setAttribute('position', new THREE.Float32BufferAttribute([ax - px, ya, az - pz, ax + px, ya, az + pz, bx + px, yb, bz + pz, bx - px, yb, bz - pz], 3));
      g.setIndex([0, 2, 1, 0, 3, 2]); g.computeVertexNormals(); stripes[dash++ % 2].push(g);
    }
    const posts_n = Math.max(1, Math.round(len / 3));
    for (let i = 0; i <= posts_n; i++) {
      const x = x1 + (x2 - x1) * i / posts_n, z = z1 + (z2 - z1) * i / posts_n, y = groundY(x, z);
      posts.push(boxAt(.08, 1.05, .08, x, y + .525, z)); caps.push(boxAt(.12, .16, .12, x, y + 1.1, z));
    }
  }
  if (stripes[0].length) group.add(merged(stripes[0], mats.tape));
  if (stripes[1].length) group.add(merged(stripes[1], mats.tapeDark));
  if (posts.length) { group.add(merged(posts, mats.metal)); group.add(merged(caps, mats.cap)); }
  group.children.forEach(m => { m.castShadow = false; m.userData.arenaEdge = true; });
  return group;
}

// A barricade line: sandbag rows every metre plus a timber section at the purchase point. Collision per 3 m stretch
// (unrotated boxes, like every solid in the game) and an invisible box occluder per stretch for bullets and sight.
export function buildBarricade(gate, groundY, mats) {
  const [ax, az] = gate.a, [bx, bz] = gate.b, len = Math.hypot(bx - ax, bz - az), along = Math.abs(bx - ax) > Math.abs(bz - az);
  const bags = [], timber = [], solids = [], occluders = [], H = .84;
  for (let i = 0, n = Math.round(len); i < n; i++) for (let row = 0; row < 3; row++) {
    const t = (i + .5 + (row % 2 ? .25 : -.25)) / n, x = ax + (bx - ax) * Math.min(1, Math.max(0, t)), z = az + (bz - az) * Math.min(1, Math.max(0, t));
    if (Math.hypot(x - gate.station[0], z - gate.station[1]) < 1.9) continue;
    bags.push(boxAt(along ? 1.02 : .62, .28, along ? .62 : 1.02, x, groundY(x, z) + .14 + row * .27, z));
  }
  const [sx, sz] = gate.station, sy = groundY(sx, sz);
  for (const h of [.35, .8, 1.25]) timber.push(boxAt(along ? 3.6 : .12, .22, along ? .12 : 3.6, sx, sy + h, sz));
  for (const o of [-1.7, 0, 1.7]) timber.push(boxAt(.14, 1.5, .14, sx + (along ? o : 0), sy + .75, sz + (along ? 0 : o)));
  timber.push(boxAt(along ? 3.4 : .1, .1, along ? .1 : 3.4, sx, sy + 1.02, sz, along ? .32 : 0));
  const group = new THREE.Group(); group.add(merged(bags, mats.sand)); group.add(merged(timber, mats.wood));
  for (let s = 0, n = Math.ceil(len / 3); s < n; s++) {
    const t0 = s / n, t1 = (s + 1) / n, cx = ax + (bx - ax) * (t0 + t1) / 2, cz = az + (bz - az) * (t0 + t1) / 2, l = len / n;
    const w = along ? l : .7, d = along ? .7 : l;
    solids.push({x: cx, z: cz, w: w / 2, d: d / 2});
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, 1.5, d), mats.plaster); o.position.set(cx, groundY(cx, cz) + (Math.hypot(cx - sx, cz - sz) < 2.5 ? .75 : H / 2), cz);
    if (Math.hypot(cx - sx, cz - sz) >= 2.5) o.scale.y = H / 1.5;
    o.userData.noDecal = true; o.updateMatrixWorld(true); o.geometry.computeBoundingBox(); occluders.push(o);
  }
  return {group, solids, occluders};
}

// A weapon crate: a timber crate with the rifle laid on top and a metal band, at the station.
export function buildStation(st, groundY, mats) {
  const [x, z] = st.at, y = groundY(x, z);
  const group = new THREE.Group();
  group.add(merged([boxAt(1.1, .75, .6, x, y + .375, z), boxAt(1.16, .06, .66, x, y + .72, z)], mats.wood));
  group.add(merged([boxAt(.95, .07, .09, x, y + .8, z), boxAt(.26, .12, .08, x - .1, y + .86, z), boxAt(.07, .14, .07, x + .08, y + .74, z)], mats.metal));
  return {group, solid: {x, z, w: .6, d: .35}};
}

// ---- Build 13/14: finding barricades and crates. Pure state first: the map and the in-world markings all read it.
// State of every barricade, area and crate for a set of open areas and the ids of the barricades still standing:
// a barricade is 'open' (bought), 'purchasable' (standing, and the area it is bought from is open) or 'locked'.
export function ambushState(open, standing) {
  const has = id => (standing.has ? standing.has(id) : standing.includes(id));
  return {
    gates: GATES.map(g => ({id: g.id, a: g.a, b: g.b, station: g.station, price: g.price, from: g.from, opens: g.opens, name: areaById(g.opens).name, fromName: areaById(g.from).name,
      state: !has(g.id) ? 'open' : open.has(g.from) ? 'purchasable' : 'locked'})),
    areas: AREAS.map(a => ({id: a.id, name: a.name, x: a.x, z: a.z, open: open.has(a.id)})),
    crates: STATIONS.map(s => ({weapon: s.weapon, at: s.at, area: s.area, price: s.price, open: open.has(s.area)})),
  };
}
// ---- Build 14: the full-screen map. One layout, worked out from the state alone, is what the map draws and what the tests
// check: north (-z) is up, the whole arena fits, and every label gets a box that overlaps no other label or marker and lies
// inside the canvas. Text is drawn with the box width as its limit, so a label can never spill out of its box.
export const MAP = {w: 1000, h: 1600, pad: 70, bounds: {x: [-62, -8], z: [-58, 32]}, fontArea: 32, fontLabel: 28, fontState: 26, gap: 8, shown: .86, arrow: 40};
// Width of `text` at `size` px, estimated generously for bold Arial capitals and digits (the draw also limits the width).
export const textWidth = (text, size) => Math.ceil([...String(text)].reduce((w, ch) => w + (ch === ' ' ? .3 : ch === '·' ? .4 : /[0-9]/.test(ch) ? .6 : .74), 0) * size);
const overlaps = (a, b, gap = 0) => a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
export function mapLayout(state, segs, player, weaponName) {
  const {w, h, pad, bounds: {x: [x0, x1], z: [z0, z1]}} = MAP, scale = Math.min((w - 2 * pad) / (x1 - x0), (h - 2 * pad) / (z1 - z0));
  const ox = (w - scale * (x1 - x0)) / 2, oy = (h - scale * (z1 - z0)) / 2, X = x => ox + (x - x0) * scale, Y = z => oy + (z - z0) * scale;
  const areas = state.areas.map(a => ({id: a.id, name: a.name, open: a.open, rect: {x: X(a.x[0]), y: Y(a.z[0]), w: (a.x[1] - a.x[0]) * scale, h: (a.z[1] - a.z[0]) * scale}}));
  const gates = state.gates.filter(g => g.state !== 'open').map(g => ({id: g.id, state: g.state, price: g.price, name: g.name, line: [X(g.a[0]), Y(g.a[1]), X(g.b[0]), Y(g.b[1])], at: [X(g.station[0]), Y(g.station[1])]}));
  const crates = state.crates.map(c => ({weapon: c.weapon, open: c.open, price: c.price, at: [X(c.at[0]), Y(c.at[1])]}));
  const edge = segs.map(([ax, az, bx, bz]) => [X(ax), Y(az), X(bx), Y(bz)]);
  // Markers and barricade lines are obstacles for labels; a label may sit beside its own marker but never on any.
  const blocks = [...gates.map(g => ({x: Math.min(g.line[0], g.line[2]) - 5, y: Math.min(g.line[1], g.line[3]) - 5, w: Math.abs(g.line[2] - g.line[0]) + 10, h: Math.abs(g.line[3] - g.line[1]) + 10})), ...gates.map(g => ({x: g.at[0] - 11, y: g.at[1] - 11, w: 22, h: 22})), ...crates.map(c => ({x: c.at[0] - 11, y: c.at[1] - 11, w: 22, h: 22}))];
  const labels = [], free = box => box.x >= 8 && box.y >= 8 && box.x + box.w <= w - 8 && box.y + box.h <= h - 8 && !labels.some(l => overlaps(l, box, MAP.gap)) && !blocks.some(b => overlaps(b, box, 2));
  const put = (kind, id, text, size, candidates) => { const tw = textWidth(text, size), th = Math.ceil(size * 1.25); for (const [cx, cy] of candidates(tw, th)) { const box = {x: Math.round(cx), y: Math.round(cy), w: tw, h: th}; if (free(box)) { labels.push({kind, id, text, size, ...box}); return true; } } labels.push({kind, id, text, size, x: 0, y: 0, w: tw, h: th, unplaced: true}); return false; };
  const around = (px, py) => (tw, th) => { const out = []; for (const d of [18, 34, 54, 80, 110]) out.push([px + d, py - th / 2], [px - d - tw, py - th / 2], [px - tw / 2, py - d - th], [px - tw / 2, py + d], [px + d, py - d - th], [px - d - tw, py - d - th], [px + d, py + d], [px - d - tw, py + d]); return out; };
  for (const a of areas) { const r = a.rect, inside = (tw, th) => [.5, .25, .75].flatMap(f => [14, 60, 110, 170].map(dy => [r.x + r.w * f - tw / 2, r.y + dy]));
    put('area', a.id, a.name.toUpperCase(), MAP.fontArea, inside); const name = labels.at(-1);
    put('state', a.id, a.open ? 'OPEN' : 'CLOSED', MAP.fontState, (tw, th) => [[name.x + name.w / 2 - tw / 2, name.y + name.h + 2], ...inside(tw, th)]); }
  for (const g of gates) put('gate', g.id, `${g.price} PTS`, MAP.fontLabel, around(...g.at));
  for (const c of crates) put('crate', c.weapon, `${weaponName(c.weapon)} · ${c.price}`, MAP.fontLabel, around(...c.at));
  const dir = [-Math.sin(player.yaw), -Math.cos(player.yaw)], at = [X(player.x), Y(player.z)];
  return {w, h, scale, origin: [ox, oy], areas, gates, crates, edge, labels, player: {at, dir, tip: [at[0] + dir[0] * MAP.arrow, at[1] + dir[1] * MAP.arrow]}, toMap: (x, z) => [X(x), Y(z)]};
}
// The legend beside the map: short lines, one per area with its state and what opening it costs, and a second line for a
// barricade that cannot be bought yet saying where it is bought from. Rifles and their prices are on the map itself.
export function mapLegend(state) {
  return state.areas.flatMap(a => { const g = state.gates.find(g => g.opens === a.id), name = a.name.toUpperCase();
    return a.open ? [`${name} · OPEN`] : g.state === 'purchasable' ? [`${name} · CLOSED · ${g.price} PTS`] : [`${name} · CLOSED · ${g.price} PTS`, `   BOUGHT FROM THE ${g.fromName.toUpperCase()}`]; });
}

// ---- Build 14: in-world markings that belong in the village, in place of the Build 13 masts. A barricade's timber section
// carries a band of amber paint on its top rail, a painted price board and an oil lantern on its middle post; a crate
// carries a band of green paint, a painted board with its rifle's name and a lantern on a short post beside it. The lantern
// is lit (unlit glass material, no light source) while the thing can be bought: a barricade whose area of purchase is open,
// a crate whose area is open. `label` is the painted text; mats.label(text, kind) makes the board's material.
export function buildMarking(kind, id, [x, z], along, groundY, mats, label, lit) {
  const y = groundY(x, z), group = new THREE.Group(), paint = kind === 'gate' ? mats.tape : mats.crateFlag, gate = kind === 'gate';
  const lx = gate ? x : x + .85, lz = z, top = gate ? 2.3 : 1.85, by = gate ? 1.72 : 1.08, bz = gate ? 0 : -.27, bw = gate ? 1.0 : .95, bh = .42;
  group.add(merged([boxAt(.07, gate ? top - 1.5 : top, .07, lx, y + (gate ? 1.5 + (top - 1.5) / 2 : top / 2), lz), boxAt(.2, .04, .2, lx, y + top + .02, lz), boxAt(.2, .04, .2, lx, y + top + .3, lz), boxAt(.05, .1, .05, lx, y + top + .37, lz),
    boxAt(gate && !along ? .05 : bw + .08, bh + .08, gate && !along ? bw + .08 : .05, x, y + by, z + bz), ...(gate ? [] : [boxAt(.05, .3, .05, x - .4, y + .9, z + bz), boxAt(.05, .3, .05, x + .4, y + .9, z + bz)])], mats.wood));
  group.add(merged(gate ? [boxAt(along ? 3.62 : .16, .05, along ? .16 : 3.62, x, y + 1.385, z)] : [boxAt(1.13, .12, .63, x, y + .5, z)], paint));
  const glass = new THREE.Mesh(new THREE.BoxGeometry(.15, .24, .15), lit ? mats.lampLit : mats.lampOff); glass.position.set(lx, y + top + .16, lz); glass.userData.lantern = true; group.add(glass);
  for (const side of [1, -1]) { const face = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), mats.label(label, kind)); face.position.set(x + (gate && !along ? side * .03 : 0), y + by, z + bz + (gate && !along ? 0 : side * .03)); face.rotation.y = (gate && !along ? Math.PI / 2 : 0) + (side < 0 ? Math.PI : 0); face.userData.board = true; group.add(face); }
  group.children.forEach(m => { m.castShadow = false; m.userData.marking = true; });
  group.userData = {marking: true, kind, id, at: [x, z], label, lit, lantern: [lx, y + top + .16, lz], height: top + .42};
  return group;
}
