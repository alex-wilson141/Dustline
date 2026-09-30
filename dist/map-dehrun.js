// Build 22: Dehrun Terraces, map 2 (working name), as a description the game loads: a hill town built in terraces,
// fictional like everything in DUSTLINE. This build holds one street block of it, the look slice: three terraces of a
// street that climbs north by two flights of steps, eight houses, yards, and what stands in them.
// Build 25: south of the block's gate, a walled square with the customs house in it (house K): the building meant to
// be the Ambush arena, three storeys of rooms and corridors, two stairs and a roof, with a street all round it.
// It is loaded only when it is asked for (dist/maps.js); Kohar Valley never fetches this file, the kit or a single
// asset of this map.
// Like map-kohar.js it says where everything is; dist/terraces.js is the kit that builds it and holds no place.
// Since Build 24 a body walks what the kit built (dist/space.js): stairs, ladders, floors and roofs; `height` is the
// ground under it all.
import {buildTerraces} from './terraces.js';
import './build.js'; // DEPLOY-01 upgrade guard

// Build 28: the whole town. Six terraces climb north (metres above the block's lowest terrace: -1.6, 0, 1.6, 3.2, 4.8, 6.4),
// each ending at a line z where the next begins; steps join them where a lane crosses the line (the block's street at
// x 0, and lanes at x -48 and 48 in the districts). `LEVEL`, `RISE`, `EDGES`, `RUN` and `LANE` are what Build 22 named.
const LEVEL = [0, 1.6, 3.2], RISE = 1.6, EDGES = [17, -6], RUN = 3, LANE = 1.7, BASE = -1.6;
const TERRACES = [80, 17, -6, -55, -80], LANES = {80: [0], 17: [0, -48, 48], '-6': [0, -48, 48], '-55': [0, -48, 48], '-80': [0]};
const clamp = v => Math.min(1, Math.max(0, v)), smooth = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
// Where a body stands: the terraces, and the steps as ramps. Within the block it is what it was.
const height = (x, z) => { let h = BASE; for (const e of TERRACES) { const lane = LANES[e].some(l => Math.abs(x - l) <= LANE); h += lane ? RISE * clamp((e + RUN - z) / RUN) : z < e ? RISE : 0; } return h; };
const level = z => { let h = BASE; for (const e of TERRACES) if (z < e) h += RISE; return h; };
// The ground that is drawn: under the town it lies below everything that is built; around it, the hill.
const BLOCK = {x: 71.9, z: [-99.9, 104.9]};
// Around the town the hill follows the terraces from a little below, so that it never rises through a yard.
const surface = (x, z) => { if (Math.abs(x) <= BLOCK.x && z >= BLOCK.z[0] && z <= BLOCK.z[1]) return -3.3;
  const far = Math.max(0, Math.abs(x) - 74, z - 107, -102 - z), roll = Math.min(1, far / 30); let h = BASE - .3;
  for (const e of TERRACES) h += RISE * smooth((e - 1 - z) / 10);
  return h + .09 * Math.max(0, -102 - z) + .06 * Math.max(0, Math.abs(x) - 76) + roll * (.9 * Math.sin(x * .07 + 1) * Math.cos(z * .06) + .4 * Math.sin(z * .17)); };

// The sun: where the light comes from (south-west, 27 degrees up), and the sky turned so that the sun in its picture
// stands there too (in the picture it stands at 36 degrees round from +x, 18 degrees up).
const SUN_ROUND = 2.33, SUN_UP = .47, SKY_SUN = .629, SUN = [Math.cos(SUN_ROUND) * Math.cos(SUN_UP), Math.sin(SUN_UP), Math.sin(SUN_ROUND) * Math.cos(SUN_UP)], SKY_TURN = SUN_ROUND - SKY_SUN + Math.PI;

const W = 'window', D = 'door';
const win = (at, o = {}) => ({kind: W, at, width: 1.1, sill: .9, head: 2.05, ...o}), door = (at, o = {}) => ({kind: D, at, width: 1.3, head: 2.1, ...o});   // Build 26: 1.3 m, as the customs house (user decision, E41); the block's doors were 1.05 m
// Build 25: the customs house's doors are 1.3 m wide, for enemies as much as for the player (an enemy asks for .45 m
// either side of its line; see the roadmap, E41). A room is a rectangle; the storeys' rooms tile the inside of the house.
const wide = (at, o = {}) => ({kind: D, at, width: 1.3, head: 2.3, leaf: 'planks', open: 1.7, ...o}), room = (id, x, z) => ({id, x, z});
// Build 27: the corridor is 3 m wide (was 2.2) and the rooms fewer and larger, so that it plays as an arena and not a warren.
// Build 28: the stair wells are 3.5 m wide (flights of 1.7 m: two bodies pass on them).
const K = {x: [-13, 13], z: [53, 71], in: {x: [-12.6, 12.6], z: [53.4, 70.6]}, corridor: [59.8, 62.8], stairW: {x: [-12.6, -9], z: [55.5, 59.8]}, stairE: {x: [9, 12.6], z: [62.8, 67.1]}};
// A doorway between rooms is a bare frame (no leaf: a leaf stops nobody and only hides the view); the street doors keep their leaves.
const way = (x, z, o = {}) => ({at: [x, z], door: false, ...o});
const kRooms = (north, south) => [room('stair W', K.stairW.x, K.stairW.z), room('closet W', K.stairW.x, [K.in.z[0], K.stairW.z[0]]), ...north, room('corridor', K.in.x, K.corridor), ...south, room('stair E', K.stairE.x, K.stairE.z), room('closet E', K.stairE.x, [K.stairE.z[1], K.in.z[1]])];
const nRoom = (id, x) => room(id, x, [K.in.z[0], K.corridor[0]]), sRoom = (id, x, z = [K.corridor[1], K.in.z[1]]) => room(id, x, z);

// Beyond the walls: the rest of the town and its fields, to be seen and not reached. A house stands on the hill where
// it is put; a field wall follows the hill in lengths of eight metres.
const stands = (x, z) => Math.min(surface(x[0], z[0]), surface(x[1], z[0]), surface(x[0], z[1]), surface(x[1], z[1]), surface((x[0] + x[1]) / 2, (z[0] + z[1]) / 2)) + .05;
const far = (id, x, z, storeys, faces = {}) => ({id, x, z, plain: true, base: stands(x, z), beamEnds: Object.keys(faces).slice(0, 1), roof: {parapet: .5}, storeys: storeys.map(([height, surface, band], n) => ({height, surface, band,
  ...Object.fromEntries(Object.entries(faces).map(([side, places]) => [side, places.map(at => n ? win(at, {sill: .8, open: [2.75, 1 + (at * 7 % 3) * .8]}) : win(at, {bars: true}))]))}))});
const fieldWall = (z, from, to) => { const out = []; for (let a = from; a < to; a += 8) { const b = Math.min(to, a + 8); out.push({axis: 'x', at: z, from: a, to: b, base: Math.min(surface(a, z), surface(b, z)) - .1, height: 1.15 + .25 * Math.sin(a * .9), thick: .55, foot: 1.5, surface: 'drystone'}); } return out; };

// ---- The town's districts (Build 28), as grey-box: streets, yards, retaining walls at every terrace line with steps on
// the lanes, walls round the town, gates through the block's and the square's walls, and houses of one to three storeys
// (plain shells, and in every district one that can be entered, with an outside stair to its roof). No dressing.
const DIST = {grounds: [], walls: [], steps: [], arches: [], houses: [], flights: []};
const RW = {thick: .6, surface: 'drystone', coping: 'slab'};
const lanesOf = e => LANES[e].map(l => [l - 1.96, l + 1.96]).sort((p, q) => p[0] - q[0]);
// Retaining walls along a terrace line, from x0 to x1, leaving the lanes open; on the lower terrace, 2.5 m high (the rise
// and a .9 m parapet), as the block's.
const retaining = (e, x0, x1) => { const lv = level(e + 1); let c = x0; for (const [a, b] of lanesOf(e)) { if (a > c && a < x1) DIST.walls.push({axis: 'x', at: e - .25, from: c, to: a, base: lv, height: 2.5, foot: 1.5 + (lv - BASE), ...RW}); if (b > c) c = b; } if (c < x1) DIST.walls.push({axis: 'x', at: e - .25, from: c, to: x1, base: lv, height: 2.5, foot: 1.5 + (lv - BASE), ...RW}); };
const stepsAt = (e, l) => DIST.steps.push({x: [l - LANE, l + LANE], z: [e, e + RUN], low: level(e + 1), high: level(e - 1), count: 8, sides: {thick: .25, above: .6, surface: 'drystone'}});
for (const e of [80, -55, -80]) { retaining(e, -72, 72); for (const l of LANES[e]) stepsAt(e, l); }
for (const e of [17, -6]) { retaining(e, -72, -23.4); retaining(e, 23.4, 72); for (const l of LANES[e]) if (l !== 0) stepsAt(e, l); }   // into the ends of the block's own retaining walls
// Ground: every terrace across the town's width outside the block and the square (whose ground is their own), trodden,
// with cobbled streets on the lanes and across the terraces.
const deep = lv => lv - BASE + 1.9;
const ground = (x0, x1, z0, z1, lv, surface = 'trail', lift = 0) => DIST.grounds.push({x: [x0, x1], z: [z0, z1], level: lv, surface, deep: lift ? .3 : deep(lv), ...(lift ? {lift} : {})});
const bands = [[-100, -80, 6.4], [-80, -55, 4.8], [-55, -30, 3.2], [-30, -6, 3.2], [-6, 17, 1.6], [17, 44, 0], [44, 80, 0], [80, 105, -1.6]];
for (const [z0, z1, lv] of bands) { const own = (z0 >= -30 && z1 <= 44) || (z0 >= 44 && z1 <= 80), east = z0 >= 44 && z1 <= 80 ? 22.3 : 24;
  const za = z0 === 80 ? 80.3 : z0 - .3, zb = z1 === -30 ? -30.3 : z1 + .3;   /* against the block and the square the ground stops at their own ground's end */
  if (!own) ground(-72.3, 72.3, za, zb, lv); else { ground(-72.3, -east, za, zb, lv); ground(east, 72.3, za, zb, lv); }
  if (!own) ground(-3, 3, za + .15, zb - .15, lv, 'cobble', .012);
  for (const l of [-48, 48]) if (z1 <= 80 && z0 >= -55) ground(l - 3, l + 3, z0 - .15, z1 + .15, lv, 'cobble', .012); }   // the cobbles end short of the trodden ground's ends: no two surfaces in one plane
// Cross streets along the terraces (east-west), cobbled, laid over the trodden ground.
for (const [z, lv] of [[30, 0], [5, 1.6], [-18, 3.2], [-68, 4.8], [-90, 6.4], [92, -1.6]]) { ground(-71.8, -24.2, z - 2.5, z + 2.5, lv, 'cobble', .012); ground(24.2, 71.8, z - 2.5, z + 2.5, lv, 'cobble', .012); if (lv >= 4.8 || lv < 0) ground(-23.8, 23.8, z - 2.5, z + 2.5, lv, 'cobble', .012); }
// The walls round the town, and the gates through the block's and the square's walls into the districts.
for (const [z0, z1, lv] of bands) DIST.walls.push({axis: 'z', at: -72, from: z0, to: z1, base: lv, height: 3.1, thick: .4, foot: 1.5 + (lv - BASE), surface: 'plaster', coping: 'slab'}, {axis: 'z', at: 72, from: z0, to: z1, base: lv, height: 3.1, thick: .4, foot: 1.5 + (lv - BASE), surface: 'ochre', coping: 'slab'});
DIST.walls.push({axis: 'x', at: 105, from: -72, to: 72, base: -1.6, height: 3.1, thick: .4, foot: 1.5, surface: 'plaster', coping: 'slab'}, {axis: 'x', at: -100, from: -72, to: 72, base: 6.4, height: 3.1, thick: .4, foot: 9.5, surface: 'ochre', coping: 'slab'});
const gate = (axis, at, mid, lv, out = 1) => DIST.arches.push({axis, at, from: mid - 4, to: mid + 4, width: 3, base: lv, height: 3.9, clear: 2.9, thick: .5, surface: 'masonry', gate: null, out});
for (const [z, lv] of [[30, 0], [5, 1.6], [-18, 3.2]]) { gate('z', -24, z, lv); gate('z', 24, z, lv); } gate('z', -22, 62, 0); gate('z', 22, 62, 0);
// Houses: [id, x, z, storeys [[height, surface, band], ...], options]. An `open` house is entered by a door on the street
// side and climbed by an outside stair along its south face to a gap in its parapet.
const H = (id, x, z, storeys, o = {}) => { const base = level((z[0] + z[1]) / 2), faces = o.faces || {};
  if (o.open) { const w = x[1] - x[0], d = z[1] - z[0], side = o.side || 'west', top = storeys.reduce((s, t) => s + t[0], 0), doorAt = side === 'west' || side === 'east' ? z[0] + d / 2 : x[0] + w / 2;
    DIST.houses.push({id, x, z, base, enter: true, beamEnds: [side], roof: {parapet: .5, surface: 'gravel', gaps: [{side: 'south', from: x[0] + .35, to: x[0] + 2.25}]}, storeys: storeys.map(([h, sf, band], n) => ({height: h, surface: sf, band, ...(n === 0 ? {lining: 'room', floor: 'slab', [side]: [door(doorAt, {leaf: 'planks', open: 1.7})], north: [win(x[0] + w * .7, {bars: true})]} : {})}))});
    // The stair takes the house's whole south face: treads at least .355 m deep (a body climbs by its edge; the
    // enemies' rule brushes treads within .66 m), the rise per tread from what is left (5.8 m in 27 treads on a
    // 12 m house, 21 on a 10 m one).
    const run = w - 1.9 - .5, count = Math.min(Math.round(top / .2), Math.floor(run / .355));
    DIST.flights.push({axis: 'x', at: z[1] + .2, from: x[0] + 2.2 + run, to: x[0] + 2.2, low: base, high: base + top, width: 1.7, count, out: 1, landing: 1.9}); return; }
  DIST.houses.push({id, x, z, plain: true, base, beamEnds: ['south'], roof: {parapet: .5}, storeys: storeys.map(([h, sf, band], n) => ({height: h, surface: sf, band, ...Object.fromEntries(Object.entries(faces).map(([f, places]) => [f, places.map(at => n ? win(at, {sill: .8, open: [2.75, 1 + (Math.abs(at) * 7 % 3) * .8]}) : win(at, {bars: true}))]))}))}); };
const P = ['masonry', 'plaster', 'ochre', 'white'];
const rows = [
  // the lower terrace, level 0 (z 17..80): lanes at x -48 / 48, cross street z 30
  ['WL1', [-66, -56], [20, 28], [[3, P[0]], [2.8, P[1], 'white']], {faces: {east: [22, 26]}}], ['WL2', [-42, -32], [19, 27], [[3, P[2]]], {faces: {west: [22]}}], ['WL3', [-66, -58], [34, 44], [[3, P[1]], [2.7, P[3], 'ochre']], {faces: {east: [37, 41]}}],
  ['WL4', [-42, -30], [36, 46], [[3, P[0]], [2.8, P[1]]], {open: true, side: 'west'}], ['WL5', [-66, -56], [56, 66], [[3, P[2]], [2.8, P[3]]], {faces: {east: [59, 63]}}], ['WL6', [-42, -34], [52, 60], [[3, P[1]]], {faces: {west: [55]}}], ['WL7', [-42, -32], [66, 76], [[3, P[3]], [2.7, P[2], 'white']], {faces: {west: [69, 73]}}],
  ['EL1', [56, 66], [20, 28], [[3, P[1]], [2.8, P[0], 'ochre']], {faces: {west: [22, 26]}}], ['EL2', [32, 42], [19, 27], [[3, P[3]]], {faces: {east: [22]}}], ['EL3', [58, 66], [34, 44], [[3, P[2]], [2.7, P[1]]], {faces: {west: [37, 41]}}],
  ['EL4', [30, 42], [36, 46], [[3, P[1]], [2.8, P[3]]], {open: true, side: 'east'}], ['EL5', [56, 66], [56, 66], [[3, P[0]], [2.8, P[2]]], {faces: {west: [59, 63]}}], ['EL6', [34, 42], [52, 60], [[3, P[3]]], {faces: {east: [55]}}], ['EL7', [32, 42], [66, 76], [[3, P[2]], [2.7, P[0], 'white']], {faces: {east: [69, 73]}}],
  // the middle terrace, 1.6 (z -6..17)
  ['WM1', [-66, -56], [-3, 3], [[3, P[3]], [2.8, P[1]]], {faces: {east: [-1, 1]}}], ['WM2', [-42, -32], [-3, 3], [[3, P[0]], [2.8, P[2], 'white']], {open: true, side: 'west'}], ['WM3', [-66, -56], [8, 15], [[3, P[1]]], {faces: {east: [10, 13]}}], ['WM4', [-42, -32], [8, 15], [[3, P[2]], [2.7, P[3]]], {faces: {west: [10, 13]}}],
  ['EM1', [56, 66], [-3, 3], [[3, P[2]], [2.8, P[0]]], {faces: {west: [-1, 1]}}], ['EM2', [32, 42], [-3, 3], [[3, P[1]], [2.8, P[3], 'ochre']], {open: true, side: 'east'}], ['EM3', [56, 66], [8, 15], [[3, P[0]]], {faces: {west: [10, 13]}}], ['EM4', [32, 42], [8, 15], [[3, P[3]], [2.7, P[1]]], {faces: {east: [10, 13]}}],
  // the terrace at 3.2 (z -55..-6)
  ['WT1', [-66, -56], [-30, -22], [[3, P[0]], [2.8, P[2]]], {faces: {east: [-28, -24]}}], ['WT2', [-42, -32], [-30, -22], [[3, P[3]]], {faces: {west: [-26]}}], ['WT3', [-66, -56], [-48, -38], [[3, P[1]], [2.8, P[0], 'white'], [2.7, P[3]]], {faces: {east: [-45, -41]}}], ['WT4', [-42, -30], [-48, -38], [[3, P[2]], [2.8, P[1]]], {open: true, side: 'west'}],
  ['ET1', [56, 66], [-30, -22], [[3, P[3]], [2.8, P[1]]], {faces: {west: [-28, -24]}}], ['ET2', [32, 42], [-30, -22], [[3, P[0]]], {faces: {east: [-26]}}], ['ET3', [56, 66], [-48, -38], [[3, P[2]], [2.8, P[3], 'ochre'], [2.7, P[1]]], {faces: {west: [-45, -41]}}], ['ET4', [30, 42], [-48, -38], [[3, P[1]], [2.8, P[0]]], {open: true, side: 'east'}],
  ['NT1', [-18, -6], [-50, -40], [[3, P[1]], [2.8, P[3], 'white']], {faces: {south: [-15, -9]}}], ['NT2', [6, 18], [-50, -40], [[3, P[2]], [2.8, P[0]]], {faces: {south: [9, 15]}}],
  // the terrace at 4.8 (z -80..-55)
  ['N1', [-60, -48], [-76, -66], [[3, P[0]], [2.8, P[1]]], {faces: {south: [-57, -51]}}], ['N2', [-38, -26], [-76, -66], [[3, P[3]]], {faces: {south: [-35, -29]}}], ['N3', [-16, -6], [-76, -68], [[3, P[2]], [2.8, P[3], 'ochre']], {faces: {south: [-13, -9]}}], ['N4', [6, 16], [-76, -68], [[3, P[1]], [2.8, P[0]]], {open: true, side: 'west'}],
  ['N5', [26, 38], [-76, -66], [[3, P[0]]], {faces: {south: [29, 35]}}], ['N6', [48, 60], [-76, -66], [[3, P[3]], [2.8, P[2], 'white']], {faces: {south: [51, 57]}}],
  // the top, 6.4 (z -100..-80)
  ['H1', [-64, -52], [-97, -86], [[3, P[1]], [2.8, P[0]]], {faces: {south: [-61, -55]}}], ['H2', [-40, -28], [-97, -87], [[3, P[2]]], {faces: {south: [-37, -31]}}], ['H3', [-16, -6], [-97, -87], [[3, P[3]], [2.8, P[1], 'ochre'], [2.7, P[0]]], {faces: {south: [-13, -9]}}],
  ['H4', [6, 16], [-97, -87], [[3, P[0]], [2.8, P[2]]], {faces: {south: [9, 13]}}], ['H5', [28, 40], [-97, -87], [[3, P[1]], [2.8, P[3]]], {open: true, side: 'west'}], ['H6', [52, 64], [-97, -86], [[3, P[2]], [2.8, P[1], 'white']], {faces: {south: [55, 61]}}],
  // the lower town, -1.6 (z 80..105)
  ['S1', [-66, -54], [84, 92], [[3, P[3]], [2.8, P[2]]], {faces: {north: [-63, -57]}}], ['S2', [-44, -32], [96, 104], [[3, P[0]]], {faces: {north: [-41, -35]}}], ['S3', [-20, -8], [96, 104], [[3, P[1]], [2.8, P[3], 'white']], {faces: {north: [-17, -11]}}],
  ['S4', [8, 20], [93.5, 101.5], [[3, P[2]], [2.8, P[0]]], {open: true, side: 'west'}], ['S5', [32, 44], [96, 104], [[3, P[3]]], {faces: {north: [35, 41]}}], ['S6', [54, 66], [84, 92], [[3, P[1]], [2.8, P[2], 'ochre']], {faces: {north: [57, 63]}}], ['S7', [-20, -8], [84, 91], [[3, P[0]]], {faces: {north: [-17, -11]}}], ['S8', [8, 20], [84, 91], [[3, P[3]]], {faces: {north: [11, 17]}}],
];
for (const [id, x, z, st, o] of rows) H(id, x, z, st, o);

export const DEHRUN = {
  id: 'dehrun', name: 'Dehrun Terraces',
  // A map to walk and look at: no mission, nobody else. The words the game shows there.
  look: {lamp: 2.4, title: 'DEHRUN TERRACES', line: 'Look slice: the block and the customs house', note: 'NO MISSION · NOBODY ELSE HERE', button: 'WALK THE BLOCK →', brief: 'A street in the hill town, and the customs house.', text: 'One street block of Dehrun Terraces and, through the gate at the south end of the street, the square with the customs house: three storeys of rooms and corridors, two stairs, a roof. Walk in by any of its four doors; the stairs come out on the roof.', radio: 'Dehrun Terraces, look slice. Nobody else is here. The street climbs north; behind you, through the south gate, stands the customs house. Its doors are open and both stairs go up to the roof.',
    // Build 28: Skirmish on the town. The relay stands on the square before the customs house; you start on the block's top terrace.
    skirmish: {brief: 'Control the relay on the square.', text: 'Skirmish in Dehrun Terraces. The relay stands on the square below the customs house; you start on the block\'s top terrace with your squad. Fight down the street, clear the square and hold the relay for 45 seconds. Reinforcements come through the gates.', button: 'DEPLOY TO THE TERRACES →'},
    // Build 26: with `?foes=1` these enemies are in the customs house and on the square, on the loops named, hunting you.
    foes: [{at: [-8, 9.83, 58], loop: 'ROOF'}, {at: [8, 9.83, 68], loop: 'ROOF'}, {at: [0, 6.6, 61.3], loop: 'UPPER'}, {at: [6, 6.6, 57], loop: 'UPPER'}, {at: [-15, 0, 50], loop: 'SQUARE'}, {at: [15, 0, 74], loop: 'SQUARE'}]},
  height,
  terrain: {size: 400, segments: 100, surface},
  // A clear sky with a low sun: `background` and `environment` are how bright the sky is drawn and how much it lights,
  // `ambient` the light from all around; the sun's `colour` and `power`.
  sky: {asset: 'dehrun/syferfontein_18d_clear_puresky_1k.hdr', colour: '#c4c0b2', fog: '#cdbfa3', fogDensity: .0021, background: 1.25, environment: .8, ambient: 1.85, turn: SKY_TURN},
  sun: {at: [SUN[0] * 70, SUN[1] * 70, SUN[2] * 70 + 25], target: [0, 0, 25], reach: 60, near: 1, far: 220, colour: '#ffdcae', power: 3.5},   // Build 25: aimed at the middle of the block and the square, which is longer now
  ridge: {sectors: 220, bands: 26, inner: 150, step: 20},
  edges: {x: [-71.6, 71.6], z: [-99.6, 104.6]},
  nav: {origin: -102, step: 2, cells: 105},
  reach: {x: 80, z: 115},
  // Heights on the M map are given above this (the lowest terrace).
  levels: {base: 0},
  // Nothing of Kohar Valley's village stands here.
  buildings: [], lowWalls: [], sandbags: [], poles: [], brickWalls: [], stalls: [], crates: [], trucks: [], trees: [], props: [],
  rocks: {count: 0, x: [-20, 20], z: [-20, 20], clear: 0}, shrubs: {count: 0, x: [-20, 20], z: [-20, 20], clear: 0},
  pebbles: {count: 1, x: [-60, -59], z: [-60, -59]},
  dust: {count: 260, x: [-70, 70], y: [.3, 12], z: [-98, 103]},
  wire: [[-4.2, 7.6, 4.2], [0, 6.9, 5.4], [4.2, 5.1, 6.6]],
  // The game's objectives have places on every map; here they are out of the way and not shown.
  relay: [8, 76],   // Build 28: Skirmish's relay stands on the square before the customs house
  log: {at: [-8.4, 7.2], lies: [0, -5, 0], reach: [0, 0], door: [-3.4, 5]},
  extraction: [0, 100],
  starts: {player: [0, 37], guest: [1.5, 38], squad: [[-1.5, 39], [0, 40.5], [1.5, 39.5]], mate: [1.5, 40.5],
    // Build 28: Skirmish begins on the block's top terrace and fights down to the square.
    skirmish: {player: [0, -20], guest: [2, -22], squad: [[-2, -23], [0, -25], [2, -24]], mate: [2, -22]}},
  enemies: {
    // Build 28: Skirmish's enemies hold the square and the lower town; reinforcements come through the gates.
    spawns: [[-15, 50], [15, 50], [4, 74], [-18, 70], [18, 70], [-4, 93], [4, 93]],
    // Build 26: a loop's node may carry its height [x, z, y]; these are the customs house's, for the foes of `?foes=1`.
    loops: {UP: [[0, -10], [0, -24], [-2, -17]], RING: [[-2, -12], [2, -12], [2, -24], [-2, -24]],
      ROOF: [[-8, 58, 9.83], [8, 58, 9.83], [8, 68, 9.83], [-8, 68, 9.83]], LOWER: [[-30, 92], [30, 92], [0, 98]], WEST: [[-48, 30], [-48, 60], [-30, 30]], EAST: [[48, 30], [48, 60], [30, 30]], UPPER: [[-9, 61.3, 6.6], [10, 61.3, 6.6], [8, 57, 6.6], [-5, 57, 6.6]], HALLS: [[-9, 61.3, .05], [10, 61.3, .05], [0, 66, .05], [-8, 66, .05]], SQUARE: [[-18, 48, 0], [18, 48, 0], [18, 76, 0], [-18, 76, 0]]},
    assign: ['SQUARE', 'SQUARE', 'GARRISON', 'GARRISON', 'LOWER', 'LOWER', 'SQUARE'], leave: 'LOWER',
    reinforceLoops: {0: ['SQUARE'], 1: ['SQUARE'], 2: ['LOWER'], skirmish: ['SQUARE', 'LOWER', 'WEST', 'EAST']},
    reinforcePoints: [{chain: [[0, 98], [0, 84]], stages: [0, 1, 2]}, {chain: [[-50, 62], [-30, 62]], stages: [0, 1, 2]}, {chain: [[50, 62], [30, 62]], stages: [0, 1, 2]}, {chain: [[-48, 24], [-30, 30]], stages: [1]}, {chain: [[48, 24], [30, 30]], stages: [1]}],
  },
  ambush: {start: [0, 30], firstArea: 1, walls: [], areas: [{id: 1, name: 'Lower street', x: [-23, 23], z: [20, 79]}], gates: [], stations: [], chart: {x: [-72, 72], z: [-100, 105]}, spots: {x: [-70, 70], z: [-98, 103], step: 4}},

  build: ctx => buildTerraces(ctx, DEHRUN),

  block: {
    outside: {surface: 'trail', repeat: 110, tint: '#d9cfbb'},
    // The ground of each terrace: the cobbled street, the yards either side, the square at the top.
    grounds: [
      {x: [-3, 3], z: [20, 44.3], level: 0, surface: 'cobble'}, {x: [-3, -1.95], z: [17, 20], level: 0, surface: 'cobble'}, {x: [1.95, 3], z: [17, 20], level: 0, surface: 'cobble'},
      {x: [-24.3, -3], z: [17, 44.3], level: 0, surface: 'trail'}, {x: [3, 24.3], z: [17, 44.3], level: 0, surface: 'trail'},
      {x: [-3, 3], z: [-3, 17], level: 1.6, surface: 'cobble', deep: 3}, {x: [-3, -1.95], z: [-6, -3], level: 1.6, surface: 'cobble', deep: 3}, {x: [1.95, 3], z: [-6, -3], level: 1.6, surface: 'cobble', deep: 3},
      {x: [-24.3, -3], z: [-6, 17], level: 1.6, surface: 'trail', deep: 3}, {x: [3, 24.3], z: [-6, 17], level: 1.6, surface: 'trail', deep: 3},
      {x: [-3, 3], z: [-30.3, -6], level: 3.2, surface: 'cobble', deep: 4.6}, {x: [-24.3, -3], z: [-30.3, -6], level: 3.2, surface: 'trail', deep: 4.6}, {x: [3, 24.3], z: [-30.3, -6], level: 3.2, surface: 'trail', deep: 4.6},
      // Paving along the fronts of the houses.
      {x: [-4.2, -3], z: [1.4, 13.6], level: 1.6, surface: 'slab', deep: .3, lift: .018}, {x: [3, 4.2], z: [5.4, 14.6], level: 1.6, surface: 'slab', deep: .3, lift: .018}, {x: [3, 5], z: [23.4, 34.6], level: 0, surface: 'slab', deep: .3, lift: .018}, {x: [-5.2, -3], z: [24.4, 32.6], level: 0, surface: 'slab', deep: .3, lift: .018},
      {x: [-5, -3], z: [-22.6, -9.4], level: 3.2, surface: 'slab', deep: .3, lift: .018}, {x: [3, 4.5], z: [-20.6, -8.4], level: 3.2, surface: 'slab', deep: .3, lift: .018}, {x: [-5.4, -3], z: [-5.6, 1], level: 1.6, surface: 'slab', deep: .3, lift: .018}, {x: [13.2, 14.5], z: [36.2, 43.4], level: 0, surface: 'slab', deep: .3, lift: .018},
      {x: [-5.5, 5.5], z: [-28.5, -22.5], level: 3.2, surface: 'slab', deep: .3, lift: .012},
      {x: [-.35, .35], z: [20, 44], level: 0, surface: 'slab', deep: .3, lift: .01}, {x: [-.35, .35], z: [-3, 17], level: 1.6, surface: 'slab', deep: .3, lift: .01}, {x: [-.35, .35], z: [-22.5, -6], level: 3.2, surface: 'slab', deep: .3, lift: .01},
      // Build 25: the square south of the gate, cobbled, with paving round the customs house and the street's line across it.
      {x: [-22.3, 22.3], z: [44.3, 80.3], level: 0, surface: 'cobble'},
      {x: [-14.6, 14.6], z: [51.4, 53], level: 0, surface: 'slab', deep: .3, lift: .018}, {x: [-14.6, 14.6], z: [71, 72.6], level: 0, surface: 'slab', deep: .3, lift: .018}, {x: [-14.6, -13], z: [53, 71], level: 0, surface: 'slab', deep: .3, lift: .018}, {x: [13, 14.6], z: [53, 71], level: 0, surface: 'slab', deep: .3, lift: .018},
      {x: [-.35, .35], z: [44.3, 51.4], level: 0, surface: 'slab', deep: .3, lift: .01}, {x: [-.35, .35], z: [72.6, 80], level: 0, surface: 'slab', deep: .3, lift: .01},
      ...DIST.grounds,
    ],
    // Retaining walls of dry stone with a parapet on the upper side, and the walls around the block.
    walls: [
      {axis: 'x', at: 16.75, from: -24, to: -1.96, base: 0, height: 2.5, thick: .6, surface: 'drystone', coping: 'slab'}, {axis: 'x', at: 16.75, from: 1.96, to: 24, base: 0, height: 2.5, thick: .6, surface: 'drystone', coping: 'slab'},
      {axis: 'x', at: -6.25, from: -24, to: -1.96, base: 1.6, height: 2.5, thick: .6, foot: 2.8, surface: 'drystone', coping: 'slab'}, {axis: 'x', at: -6.25, from: 1.96, to: 24, base: 1.6, height: 2.5, thick: .6, foot: 2.8, surface: 'drystone', coping: 'slab'},
      // Build 28: each of the block's side walls has a gate in it (an arch at z 30, 5 and -18) onto the district beyond.
      {axis: 'z', at: -24, from: 17, to: 26, base: 0, height: 3.1, thick: .4, surface: 'ochre', coping: 'slab'}, {axis: 'z', at: -24, from: 34, to: 44, base: 0, height: 3.1, thick: .4, surface: 'ochre', coping: 'slab'}, {axis: 'z', at: -24, from: -6, to: 1, base: 1.6, height: 3.1, thick: .4, foot: 2.8, surface: 'plaster', coping: 'slab'}, {axis: 'z', at: -24, from: 9, to: 17, base: 1.6, height: 3.1, thick: .4, foot: 2.8, surface: 'plaster', coping: 'slab'}, {axis: 'z', at: -24, from: -30, to: -22, base: 3.2, height: 3.1, thick: .4, foot: 4.4, surface: 'ochre', coping: 'slab'}, {axis: 'z', at: -24, from: -14, to: -6, base: 3.2, height: 3.1, thick: .4, foot: 4.4, surface: 'ochre', coping: 'slab'},
      {axis: 'z', at: 24, from: 17, to: 26, base: 0, height: 3.1, thick: .4, surface: 'plaster', coping: 'slab'}, {axis: 'z', at: 24, from: 34, to: 44, base: 0, height: 3.1, thick: .4, surface: 'plaster', coping: 'slab'}, {axis: 'z', at: 24, from: -6, to: 1, base: 1.6, height: 3.1, thick: .4, foot: 2.8, surface: 'ochre', coping: 'slab'}, {axis: 'z', at: 24, from: 9, to: 17, base: 1.6, height: 3.1, thick: .4, foot: 2.8, surface: 'ochre', coping: 'slab'}, {axis: 'z', at: 24, from: -30, to: -22, base: 3.2, height: 3.1, thick: .4, foot: 4.4, surface: 'plaster', coping: 'slab'}, {axis: 'z', at: 24, from: -14, to: -6, base: 3.2, height: 3.1, thick: .4, foot: 4.4, surface: 'plaster', coping: 'slab'},
      {axis: 'x', at: 44, from: -24, to: -5, base: 0, height: 3.1, thick: .4, surface: 'plaster', coping: 'slab'}, {axis: 'x', at: 44, from: 5, to: 24, base: 0, height: 3.1, thick: .4, surface: 'ochre', coping: 'slab'},
      {axis: 'x', at: -30, from: -24, to: -5, base: 3.2, height: 3.1, thick: .4, foot: 4.4, surface: 'plaster', coping: 'slab'}, {axis: 'x', at: -30, from: 5, to: 24, base: 3.2, height: 3.1, thick: .4, foot: 4.4, surface: 'plaster', coping: 'slab'},
      // Low yard walls.
      {axis: 'x', at: 20.6, from: -14, to: -5.2, base: 0, height: 1.1, thick: .4, surface: 'drystone', coping: 'slab'}, {axis: 'z', at: -14, from: 20.6, to: 24, base: 0, height: 1.1, thick: .4, surface: 'drystone', coping: 'slab'},
      {axis: 'z', at: 13.2, from: -1, to: 5.6, base: 1.6, height: 1.2, thick: .4, surface: 'drystone', coping: 'slab'},
      {axis: 'x', at: -24.2, from: 8, to: 14, base: 3.2, height: 1, thick: .4, surface: 'drystone', coping: 'slab'},
      // Build 25: the walls round the square, with a gate at its south end.
      {axis: 'z', at: -22, from: 44.2, to: 58, base: 0, height: 3.1, thick: .4, surface: 'plaster', coping: 'slab'}, {axis: 'z', at: -22, from: 66, to: 80, base: 0, height: 3.1, thick: .4, surface: 'plaster', coping: 'slab'}, {axis: 'z', at: 22, from: 44.2, to: 58, base: 0, height: 3.1, thick: .4, surface: 'ochre', coping: 'slab'}, {axis: 'z', at: 22, from: 66, to: 80, base: 0, height: 3.1, thick: .4, surface: 'ochre', coping: 'slab'},   // Build 28: gates at z 62 onto the districts
      {axis: 'x', at: 80, from: -22, to: -6, base: 0, height: 3.1, thick: .4, surface: 'ochre', coping: 'slab'}, {axis: 'x', at: 80, from: 6, to: 22, base: 0, height: 3.1, thick: .4, surface: 'plaster', coping: 'slab'},
      ...DIST.walls,
    ],
    arches: [
      {axis: 'x', at: 44, from: -5, to: 5, width: 3.2, base: 0, height: 3.9, clear: 2.9, thick: .5, surface: 'masonry', gate: 'planks', ajar: 1.3, out: -1},   // Build 25: the gate stands open onto the square
      {axis: 'x', at: 80, from: -6, to: 6, width: 3.2, base: 0, height: 3.9, clear: 2.9, thick: .5, surface: 'masonry', gate: 'planks', ajar: 1.3, out: 1},   // Build 28: open, onto the lower town
      {axis: 'x', at: -30, from: -5, to: 5, width: 3, base: 3.2, height: 3.9, clear: 2.8, thick: .5, surface: 'masonry', gate: 'blue', ajar: 1.3, out: 1},   // Build 28: open, onto the upper town
      ...DIST.arches,
    ],
    steps: [
      {x: [-LANE, LANE], z: [17, 20], low: 0, high: 1.6, count: 8, sides: {thick: .25, above: .6, surface: 'drystone'}},
      {x: [-LANE, LANE], z: [-6, -3], low: 1.6, high: 3.2, count: 8, sides: {thick: .25, above: .6, surface: 'drystone'}},
      ...DIST.steps,
    ],
    houses: [
      // A: the open house, west of the middle terrace. Stone below, plaster above, a balcony over the street.
      // Build 24: its upper floor is a room, reached by the stair through a well in the floor; a hatch and a ladder lead to the roof.
      {id: 'A', x: [-13, -4.2], z: [2, 13], base: 1.6, enter: true, beamEnds: ['east', 'south'], roof: {parapet: .6, tanks: [[-10.5, 4.5]]}, wells: [{x: [-12.66, -10.9], z: [6.2, 11.7], storeys: [0]}, {x: [-5.7, -4.62], z: [3, 4.2], storeys: [1]}], storeys: [
        {height: 3, surface: 'masonry', east: [door(5, {awning: ['#7c5a48', 1.4, 'brackets'], open: 1.8}), win(9.5, {width: 1.3, bars: true})], south: [win(-9)], north: [win(-8.5, {open: [2.75, 1.3]})]},
        {height: 2.8, surface: 'plaster', band: 'white', room: true, east: [win(4.4, {sill: .8}), door(7.5, {width: .95, leaf: 'blue', closed: true}), win(10.6, {sill: .8, open: [1.1, 2.75]})], south: [win(-8.5, {sill: .8})], north: [win(-9, {sill: .8})], west: [win(7.5, {sill: .8})]}]},
      // B: the shop across the street, open, with its counter and rolling shutter.
      {id: 'B', x: [4.2, 11], z: [6, 14], base: 1.6, enter: true, beamEnds: ['west'], roof: {parapet: .5, gaps: [{side: 'west', from: 7.4, to: 9}], tanks: [[9, 12]]}, storeys: [
        {height: 3.1, surface: 'ochre', floor: 'floor', west: [door(7.1, {leaf: 'blue', open: 1.9}), {kind: 'shop', at: 10.9, width: 3.4, head: 2.45, drop: .3, counter: true, awning: ['#4f6672', 1.7, 'posts']}], south: [win(8, {bars: true, shutters: false})], east: [win(10, {sill: 1})]}]},
      // C: two storeys on the lowest terrace, with a stair up its south side.
      {id: 'C', x: [5, 13], z: [24, 34], base: 0, beamEnds: ['west'], roof: {parapet: .55}, storeys: [
        {height: 3, surface: 'plaster', west: [door(26.8, {leaf: 'blue'}), win(31, {bars: true, open: [2.75, .9]})], north: [win(9)], south: []},
        {height: 2.8, surface: 'white', band: 'ochre', west: [win(26.2, {sill: .8}), win(29, {sill: .8}), win(32, {sill: .8, open: [1.4, 2.75]})], south: [door(6.2, {leaf: 'planks'})], north: [win(9, {sill: .8})]}]},
      // D: an open-fronted workshop.
      {id: 'D', x: [-12, -5.2], z: [25, 32], base: 0, enter: true, roof: {parapet: .4, surface: 'gravel'}, storeys: [
        {height: 2.7, surface: 'ochre', lining: 'room', floor: 'slab', east: [{kind: 'shop', at: 28.5, width: 4.2, head: 2.3, drop: .9}], south: [win(-8.5, {shutters: false, bars: true})]}]},
      // E: the tall house at the top, three storeys.
      {id: 'E', x: [-14, -5], z: [-22, -10], base: 3.2, beamEnds: ['east', 'south'], roof: {parapet: .6, tanks: [[-11, -19]]}, storeys: [
        {height: 3, surface: 'masonry', east: [door(-13, {leaf: 'planks', width: 1.3, head: 2.2, awning: ['#a08343', 1.3, 'brackets']}), win(-17.5, {bars: true}), win(-20, {bars: true})], south: [win(-9.5, {bars: true})]},
        {height: 2.8, surface: 'plaster', band: 'white', east: [win(-12, {sill: .8}), win(-15.5, {sill: .8, open: [2.75, 1]}), win(-19.5, {sill: .8})], south: [win(-11, {sill: .8}), win(-8, {sill: .8})]},
        {height: 2.8, surface: 'white', band: 'ochre', east: [win(-12, {sill: .8}), door(-16, {leaf: 'blue', width: .95}), win(-19.8, {sill: .8})], south: [win(-9.5, {sill: .8, open: [1.2, 2.75]})]}]},
      // F: across from it, a house over a shuttered shop.
      {id: 'F', x: [4.5, 13], z: [-20, -9], base: 3.2, beamEnds: ['west'], roof: {parapet: .5, tanks: [[10.5, -17]]}, storeys: [
        {height: 3, surface: 'ochre', west: [door(-10.6, {leaf: 'planks'}), {kind: 'shop', at: -15.4, width: 3.6, head: 2.4, drop: 2.38}], south: [win(9, {bars: true})]},
        {height: 2.7, surface: 'plaster', band: 'ochre', west: [win(-11, {sill: .8}), door(-14.5, {leaf: 'blue', width: .95}), win(-18, {sill: .8, open: [2.75, 1.5]})], south: [win(8.5, {sill: .8})]}]},
      // G: a storehouse under the upper retaining wall.
      {id: 'G', x: [-12, -5.4], z: [-5.2, .4], base: 1.6, beamEnds: ['east'], roof: {parapet: .35, surface: 'gravel'}, storeys: [
        {height: 2.7, surface: 'white', east: [door(-3.6, {leaf: 'blue', width: 1.3, head: 2.15}), win(-1, {width: .8, sill: 1.3, head: 2, bars: true, shutters: false})], south: [win(-8.5, {width: .8, sill: 1.3, head: 2, shutters: false, bars: true})]}]},
      // H: a low house by the south gate.
      {id: 'H', x: [14.5, 22], z: [36.5, 43], base: 0, beamEnds: ['west'], roof: {parapet: .45}, storeys: [
        {height: 2.9, surface: 'ochre', west: [door(38.2, {leaf: 'planks', awning: ['#7c5a48', 1.2, 'brackets']}), win(41, {open: [2.75, 1.2]})], north: [win(18)]}]},
      // K (Build 25): the customs house on the square, 26 by 18 m, three storeys and a roof; the building meant to be the
      // Ambush arena (E38). A corridor runs east-west through every storey; two stairs, in the north-west and the
      // south-east corners, climb from the ground to the roof and come out through stair heads. Doors on all four
      // sides. Every door and doorway in it is 1.3 m wide.
      {id: 'K', x: K.x, z: K.z, base: 0, thick: .4, enter: true, beamEnds: ['north', 'south'], roof: {parapet: .6, tanks: [[-6, 66.5], [5, 56]]}, door: {width: 1.6, head: 2.3},
        stairs: [{axis: 'z', x: K.stairW.x, z: [K.stairW.z[1], K.stairW.z[0]], storeys: [0, 1, 2], head: {}}, {axis: 'z', x: K.stairE.x, z: [K.stairE.z[0], K.stairE.z[1]], storeys: [0, 1, 2], head: {}}],
        storeys: [
        {height: 3.4, surface: 'masonry', room: true, floor: 'slab',
          rooms: kRooms([nRoom('north-west room', [-9, -2]), nRoom('north hall', [-2, 12.6])], [sRoom('south-west room', [-12.6, -4]), sRoom('south hall', [-4, 4]), sRoom('south-east room', [4, 9])]),
          doors: [way(-6, 59.8), way(0, 59.8), way(8, 59.8), way(-8, 62.8), way(0, 62.8), way(7, 62.8), way(-9, 54.8, {width: 1.3}), way(9, 68.5, {width: 1.3}), way(4, 67, {width: 1.3}), way(-2, 56.5, {width: 1.3}), way(-4, 67, {width: 1.3})],
          west: [wide(61.3), win(55, {bars: true}), win(65, {bars: true}), win(68.5, {bars: true})], east: [wide(61.3), win(56, {bars: true}), win(59, {bars: true}), win(68.5, {bars: true})],
          north: [wide(3), win(-11.2, {bars: true}), win(-7, {bars: true}), win(-.5, {bars: true}), win(7, {bars: true}), win(11, {bars: true})], south: [wide(0), win(-10, {bars: true}), win(-7, {bars: true}), win(2, {bars: true}), win(7, {bars: true}), win(11.2, {bars: true})]},
        {height: 3.2, surface: 'plaster', band: 'white', room: true,
          rooms: kRooms([nRoom('north-west room', [-9, -3]), nRoom('north room', [-3, 5]), nRoom('north-east room', [5, 12.6])], [sRoom('south-west room', [-12.6, -5]), sRoom('south room', [-5, 4]), sRoom('south-east room', [4, 9])]),
          doors: [way(-6, 59.8), way(1, 59.8), way(9, 59.8), way(-3, 56.5, {width: 1.3}), way(-8, 62.8), way(0, 62.8), way(7, 62.8), way(4, 67, {width: 1.3}), way(-9, 54.8, {width: 1.3}), way(9, 68.5, {width: 1.3})],
          west: [win(55, {sill: .8}), win(64.5, {sill: .8}), win(68.5, {sill: .8, open: [2.75, 1.2]})], east: [win(56, {sill: .8}), win(59, {sill: .8, open: [1.1, 2.75]}), win(68.5, {sill: .8})],
          north: [win(-11.2, {sill: .8}), win(-6.5, {sill: .8}), win(0, {sill: .8, open: [2.75, 1.4]}), win(3, {sill: .8}), win(8, {sill: .8}), win(11, {sill: .8})], south: [win(-10.5, {sill: .8}), win(-7.5, {sill: .8}), win(-3, {sill: .8, open: [1.3, 2.75]}), win(1, {sill: .8}), win(7, {sill: .8}), win(11.2, {sill: .8})]},
        {height: 3.2, surface: 'white', band: 'ochre', room: true,
          rooms: kRooms([nRoom('loft', [-9, 12.6])], [sRoom('south-west room', [-12.6, -3]), sRoom('south room', [-3, 4]), sRoom('south-east room', [4, 9])]),
          doors: [way(-5, 59.8), way(7, 59.8), way(-8, 62.8), way(0, 62.8), way(7, 62.8), way(4, 67, {width: 1.3}), way(-3, 67, {width: 1.3}), way(-9, 54.8, {width: 1.3}), way(9, 68.5, {width: 1.3})],
          west: [win(55, {sill: .8}), win(65, {sill: .8}), win(68.5, {sill: .8})], east: [win(56, {sill: .8, open: [2.75, 1]}), win(59, {sill: .8}), win(68.5, {sill: .8})],
          north: [win(-11.2, {sill: .8}), win(-7, {sill: .8}), win(-2.5, {sill: .8}), win(2, {sill: .8}), win(6.5, {sill: .8, open: [1.2, 2.75]}), win(11, {sill: .8})], south: [win(-10, {sill: .8}), win(-6, {sill: .8}), win(-1.5, {sill: .8}), win(1.5, {sill: .8}), win(7, {sill: .8, open: [2.75, 1.3]}), win(11.2, {sill: .8})]}]},
      ...DIST.houses,
    ],
    balconies: [
      {axis: 'z', at: -4.2, from: 3.4, to: 11.8, y: 4.6, out: 1}, {axis: 'z', at: -5, from: -18.6, to: -13.4, y: 9, out: 1, depth: 1}, {axis: 'z', at: 4.5, from: -17.2, to: -11.8, y: 6.2, out: -1},
    ],
    // Outside and inside stairs: geometry until height is built.
    flights: [
      {axis: 'x', at: 34, from: 12.8, to: 7.4, low: 0, high: 3, width: 1.7, count: 15, out: 1, landing: 1.9},   // Build 28: 1.7 m
      {axis: 'z', at: -12.66, from: 11.6, to: 6.6, low: 1.6, high: 4.6, width: 1.7, count: 14, out: 1, surface: 'room', tread: 'planks'},   // Build 28: 1.7 m (Build 26 made it 1.05 for an enemy): two bodies pass
      ...DIST.flights,
    ],
    // Ladders [where it stands, which way the climber faces it from, its foot and top, where the climber steps off].
    ladders: [
      {x: -4.72, z: 3.6, dir: [-1, 0], bottom: 4.6, top: 7.55, exit: [-5.15, 4.75]},
      {x: -9, z: .3, dir: [0, 1], bottom: 1.6, top: 4.75, exit: [-9, -.4]},
      {x: 8, z: -5.9, dir: [0, 1], bottom: 1.6, top: 4.25, exit: [8, -7.15]},
    ],
    leanTos: [
      {x: [4.5, 10.6], z: [.4, 5.8], base: 1.6, high: 2.95, low: 2.3, fall: 'z-'},
      {x: [-5.2, -3.3], z: [25.2, 31.8], base: 0, high: 2.62, low: 2.1, fall: 'x+', surface: 'tiles', posts: [.04, .96]},
      {x: [14.6, 19.4], z: [-29.6, -26.2], base: 3.2, high: 2.8, low: 2.2, fall: 'z+', free: false},
    ],
    // Single pieces [size, place, surface]: a water trough, benches of stone, a well head, door steps.
    pieces: [
      {size: [2.2, .75, 1], at: [-17, 3.57, -25.2], surface: 'masonry', solid: true}, {size: [1.9, .12, .7], at: [-17, 3.9, -25.2], surface: 'dark', seen: false},
      {size: [2.4, .45, .5], at: [3.6, 3.42, -24], surface: 'slab', solid: true}, {size: [2.4, .45, .5], at: [-3.6, 3.42, -26.5], surface: 'slab', solid: true},
      {size: [1.5, .16, .6], at: [-3.85, 1.68, 5], surface: 'slab', seen: false}, {size: [1.4, .16, .6], at: [3.85, 1.68, 7.1], surface: 'slab', seen: false}, {size: [1.4, .16, .6], at: [4.65, .08, 26.8], surface: 'slab', seen: false},
      {size: [1.5, .16, .6], at: [-4.65, 3.28, -13], surface: 'slab', seen: false}, {size: [1.3, .16, .6], at: [4.15, 3.28, -10.6], surface: 'slab', seen: false},
      // The cords the lanterns hang by.
      {size: [.02, .38, .02], at: [-8.2, 4.18, 9.4], surface: 'dark', seen: false}, {size: [.02, .5, .02], at: [4.05, 4.43, 10.9], surface: 'dark', seen: false},
      {size: [.9, 1.0, .9], at: [17, 2.1, 10], surface: 'masonry', solid: true}, {size: [1.1, .1, 1.1], at: [17, 2.65, 10], surface: 'slab', seen: false},
    ],
    beyond: {
      houses: [
        far('W1', [-96, -86], [21, 30], [[3, 'masonry'], [2.8, 'plaster', 'white']], {east: [23.5, 27.5], south: [-91]}), far('W2', [-94, -84], [3, 11], [[3, 'ochre']], {east: [5, 9]}),
        far('W3', [-98, -88], [-17, -7], [[3, 'masonry'], [2.8, 'plaster'], [2.7, 'white', 'ochre']], {east: [-14.5, -9.5], south: [-93]}), far('W4', [-92, -82], [-52, -44], [[3, 'plaster'], [2.7, 'white']], {east: [-50, -46], south: [-87]}),
        far('E1', [86, 96], [24, 33], [[3, 'ochre'], [2.8, 'plaster', 'white']], {west: [26.5, 30.5], south: [91]}), far('E2', [84, 94], [-2, 8], [[3, 'masonry'], [2.8, 'white']], {west: [0.5, 5.5]}),
        far('E3', [88, 98], [-24, -14], [[3, 'plaster'], [2.8, 'plaster', 'white'], [2.7, 'white']], {west: [-21.5, -16.5], south: [93]}), far('N1', [-15, -6], [-122, -113], [[3, 'masonry'], [2.8, 'plaster', 'white']], {south: [-12.5, -8.5], east: [-117.5]}),
        far('N2', [7, 16], [-124, -115], [[3, 'ochre'], [2.8, 'white'], [2.7, 'white', 'ochre']], {south: [9.5, 13.5], west: [-119.5]}), far('N3', [-40, -30], [-120, -112], [[3, 'plaster'], [2.8, 'white']], {south: [-37, -33]}),
        far('S1', [-17, -8], [118, 126], [[3, 'plaster'], [2.8, 'white', 'ochre']], {north: [-14.5, -10.5]}), far('S2', [9, 18], [119, 127], [[3, 'ochre']], {north: [11.5, 15.5]}),
      ],
      walls: [...fieldWall(-112, -140, -20), ...fieldWall(-112, 20, 140), ...fieldWall(-130, -150, 150), ...fieldWall(116, -60, 60), ...fieldWall(132, -140, 140), ...fieldWall(40, -150, -100), ...fieldWall(40, 100, 150), ...fieldWall(-40, -150, -104), ...fieldWall(-40, 104, 150)],
    },
    wires: [{between: [[-4.2, 7.3, 11], [4.3, 4.6, 12.5]], sag: .6}, {between: [[5, 5.6, 25], [-5.2, 2.7, 26]], sag: .7}, {between: [[-5, 11.6, -12], [4.5, 8.8, -11]], sag: .8}, {between: [[-4.2, 4.5, 3], [-5.4, 4.2, .4]], sag: .2}],
    // Lamp glow [x, y, z, size]: by the hanging lanterns and the wall lamps.
    lamps: [[-8.2, 3.72, 9.4, .045], [4.05, 3.92, 10.9, .045], [4.86, 2.48, 25.9, .05], [-4.86, 5.78, -11.8, .05]],

    // What stands in the way [width, depth, height]; the rest can be walked through.
    // A colour laid over a model's own (the rock is a moon rock, photographed grey-white).
    tints: {moon_rock_02: '#a8957a'},
    hardProps: {barrel_03: [.66, .66, .93], wine_barrel_01: [.78, .78, .87], wooden_crate_02: [.56, 1.18, .47], wooden_crate_01: [.84, .42, .35], painted_wooden_table: [2.4, 1.14, .96], vintage_day_bed: [1.98, .86, .6], painted_wooden_cabinet: [1.2, .64, 1.2], painted_wooden_bench: [1.17, .5, .5], wooden_table_02: [1.14, .72, .8], wooden_ladder_02: [1, .64, 1.7], propane_tank: [.36, .36, .55], moon_rock_02: [.9, .9, .6]},
    // [model, x, z, turned (degrees), lifted (metres above the ground), scale, tipped (degrees)].
    props: [
      // Lowest terrace: the street by house C.
      ['barrel_03', 4.45, 24.6], ['barrel_03', 4.4, 25.35, 40], ['wine_barrel_01', 4.35, 32.9, 15], ['wooden_crate_02', 4.35, 22.3], ['wooden_crate_01', 4.35, 22.3, 90, .47],
      ['potted_plant_04', 4.45, 28.3, 0, 0, 2.4], ['planter_pot_clay', 4.5, 29.1, 30, 0, 2.1], ['painted_wooden_bench', 4.4, 33.7, -90], ['industrial_wall_lamp', 4.98, 25.9, -90, 2.5],
      // The yard and the workshop on the west side.
      ['old_tyre', -4.5, 23.4, 0, .085, 1, 90], ['old_tyre', -4.45, 23.45, 40, .25, 1, 90], ['old_tyre', -5.6, 23.2, 0, .3, 1, 0], ['cement_bag', -4.2, 33.4, 10], ['cement_bag', -4.25, 33.45, -20, .18], ['cement_bag', -5, 33.6, 80],
      ['propane_tank', -11.2, 31.2], ['wooden_table_02', -9, 31.2], ['wooden_bucket_01', -6.6, 25.9, 20], ['wooden_ladder_02', -11, 26.4, 90], ['wooden_crate_02', -7.2, 31.2, 90], ['barrel_03', -5.9, 31.3, 10],
      ['moon_rock_02', -8, 18.3, 20, -.14, 3.6], ['moon_rock_02', 10.5, 18.4, 70, -.18, 4.4], ['moon_rock_02', -17, 22, 200, -.20, 5],
      // Middle terrace: the open house, its door and the street in front.
      ['painted_wooden_bench', -3.6, 7.6, 90], ['painted_wooden_stool', -3.6, 9], ['planter_pot_clay', -3.75, 10, 0, 0, 2], ['potted_plant_04', -3.7, 10.7, 60, 0, 2],
      ['painted_wooden_table', -8.2, 9.4], ['painted_wooden_chair_01', -8.9, 8.35, 190], ['painted_wooden_chair_01', -7.5, 8.4, 170], ['painted_wooden_chair_01', -8.3, 10.5, 5], ['painted_wooden_bench', -4.95, 10.4, -90], ['vintage_day_bed', -7.4, 12.12, 180],
      ['painted_wooden_cabinet', -9.4, 2.78, 0, .38], ['painted_wooden_shelves', -6.4, 2.37], ['wooden_table_02', -5.3, 3.5, 90], ['vintage_oil_lamp', -5.3, 3.4, 0, .8, .55], ['wooden_bowl_02', -8.5, 9.3, 0, .96, 2.2], ['brass_pot_02', -7.6, 9.7, 30, .96], ['metal_jug', -11.9, 5.4, 0, 0, 1.7],
      ['ceramic_pot', -12, 12.1, 40], ['wooden_lantern_01', -8.2, 9.4, 30, 2],
      // The shop: goods on the counter and the shelves, barrels at the door.
      ['ceramic_vase_04', 4.3, 9.7, 0, .96], ['brass_pot_02', 4.35, 10.5, 50, .96], ['ceramic_pot', 4.35, 11.6, 0, .96, .8], ['planter_pot_clay', 4.3, 12.2, 0, .96, 1.3],
      ['painted_wooden_shelves', 10.62, 8.2, -90], ['painted_wooden_shelves', 10.62, 9, -90], ['painted_wooden_shelves', 10.62, 12.4, -90], ['barrel_03', 9.8, 6.95, 20], ['wooden_crate_01', 7.6, 13.2, 10], ['painted_wooden_stool', 6.4, 11],
      ['wooden_lantern_01', 4.05, 10.9, 0, 2.2], ['wooden_crate_02', 3.55, 13.3, 8], ['barrel_03', 3.5, 5.1, 0],
      // The lean-to yard north of the shop.
      ['wooden_crate_02', 9.8, 1.4, 90], ['old_tyre', 5.1, 1, 25, .3], ['barrel_03', 5.2, 5.1], ['barrel_03', 5.95, 5.2, 70], ['cement_bag', 8.6, 3.2, 40],
      ['moon_rock_02', 15, -4.9, 10, -.14, 3.4], ['moon_rock_02', -17, -4.8, 100, -.17, 4.2], ['metal_jug', -5, -1.2, 0, 0, 1.7], ['ceramic_pot', -5, -2, 70],
      // Top terrace.
      ['painted_wooden_bench', -4.4, -16, 90], ['planter_pot_clay', -4.5, -14.4, 0, 0, 2.2], ['painted_wooden_stool', -4.4, -11.6, 30], ['industrial_wall_lamp', -4.98, -11.8, 90, 2.6],
      ['wooden_crate_01', 3.9, -18.6, 5], ['wine_barrel_01', 3.95, -12.6], ['propane_tank', 4, -19.6],
      ['wooden_bucket_01', -15.4, -24.8, 0], ['barrel_03', 17.6, -28.4], ['cement_bag', 15.4, -28.6, 30],
      // Build 25: the customs house, storey by storey (the lift is the storey's floor: 3.4, 6.6, and the roof at 9.83).
      // Light models only: the whole map is to stay under 700,000 triangles (a lantern alone is 8,300). Build 27: placed
      // again for the wider corridor and the larger rooms, against the walls, clear of every doorway.
      ['painted_wooden_table', 6, 55.5, 90], ['painted_wooden_chair_01', 5.2, 55.5, 90], ['painted_wooden_chair_01', 6.9, 55.7, -80],
      ['wooden_table_02', -6.5, 54.5], ['painted_wooden_stool', -7.5, 55.2], ['ceramic_pot', -9.3, 59.2], ['wooden_crate_02', 12.32, 54.2], ['wooden_crate_01', 12.32, 54.2, 90, .47], ['barrel_03', 11.9, 59], ['cement_bag', 10, 54, 30],
      ['wooden_lantern_01', -6, 61.3, 0, 2.3], ['barrel_03', -11.9, 69.8], ['barrel_03', -11.2, 70], ['cement_bag', -11.8, 64.3, 10],
      ['painted_wooden_bench', -1.5, 70.1, 0], ['painted_wooden_bench', 3.4, 64.5, -90], ['painted_wooden_shelves', 9.66, 64, -90], ['painted_wooden_shelves', 9.66, 64.8, -90], ['wooden_crate_02', 4.8, 70.1, 0],
      ['barrel_03', 9.2, 70, 15], ['barrel_03', 8.4, 70.2, 40],
      ['painted_wooden_table', -5.5, 56.5, 0, 3.4], ['painted_wooden_chair_01', -6.3, 55.5, 190, 3.4], ['painted_wooden_chair_01', -4.7, 57.6, 10, 3.4],
      ['vintage_day_bed', 1, 53.94, 0, 3.4], ['painted_wooden_stool', 3.5, 54.5, 20, 3.4], ['painted_wooden_cabinet', 11.85, 55, 0, 3.78], ['painted_wooden_shelves', 12.56, 58, -90, 3.4],
      ['wooden_table_02', -9, 69.6, 90, 3.4], ['painted_wooden_stool', -8, 68.5, 0, 3.4], ['ceramic_pot', -12.2, 64.2, 40, 3.4], ['painted_wooden_bench', -4.5, 66, 90, 3.4], ['planter_pot_clay', -1, 70, 0, 3.4, 2],
      ['wooden_crate_02', 5.2, 70.1, 0, 3.4], ['barrel_03', 9.3, 70, 10, 3.4], ['barrel_03', 8.5, 70.1, 50, 3.4], ['wooden_lantern_01', 0, 61.3, 0, 5.7],
      ['wooden_crate_02', 12.32, 54.1, 0, 6.6], ['wooden_crate_01', 12.32, 54.1, 90, 7.07], ['barrel_03', 8, 54, 0, 6.6], ['barrel_03', 8.7, 54.3, 60, 6.6], ['cement_bag', 2, 54, 30, 6.6], ['cement_bag', 2.1, 54.1, -20, 6.78], ['propane_tank', -8.5, 54, 0, 6.6],
      ['vintage_day_bed', -8, 70.06, 180, 6.6], ['painted_wooden_table', 0, 68.5, 0, 6.6], ['painted_wooden_chair_01', -.8, 67.5, 190, 6.6], ['painted_wooden_chair_01', .7, 69.5, 5, 6.6], ['wooden_lantern_01', 0, 66.5, 30, 8.6],
      ['painted_wooden_shelves', 9.66, 68, -90, 6.6], ['planter_pot_clay', 6, 70.1, 0, 6.6, 1.3],
      ['barrel_03', -3, 69, 0, 9.83], ['cement_bag', 3, 68.6, 20, 9.83], ['cement_bag', 3.1, 68.7, -30, 10.01],
    ],
  },
};
