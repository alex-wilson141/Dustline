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

// The three terraces (metres above the lowest), the lines where one ends (z), the run of the steps and half their width.
const LEVEL = [0, 1.6, 3.2], RISE = 1.6, EDGES = [17, -6], RUN = 3, LANE = 1.7;
const clamp = v => Math.min(1, Math.max(0, v)), smooth = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
// Where a body stands: the terraces, and the steps as ramps.
const height = (x, z) => { let h = 0; for (const e of EDGES) h += Math.abs(x) <= LANE ? RISE * clamp((e + RUN - z) / RUN) : z < e ? RISE : 0; return h; };
// The ground that is drawn: under the block it lies below everything that is built; around it, the hill.
const BLOCK = {x: 23.9, z: [-29.9, 80.4]};
// Around the block the hill follows the terraces from a little below, so that it never rises through a yard.
const surface = (x, z) => { if (Math.abs(x) <= BLOCK.x && z >= BLOCK.z[0] && z <= BLOCK.z[1]) return -1.3;
  const far = Math.max(0, Math.abs(x) - 26, z - 82, -32 - z), roll = Math.min(1, far / 30);
  return RISE * smooth((EDGES[0] - 1 - z) / 10) + RISE * smooth((EDGES[1] - 1 - z) / 10) - .3 + .09 * Math.max(0, -32 - z) + .06 * Math.max(0, Math.abs(x) - 28) + roll * (.9 * Math.sin(x * .07 + 1) * Math.cos(z * .06) + .4 * Math.sin(z * .17)); };

// The sun: where the light comes from (south-west, 27 degrees up), and the sky turned so that the sun in its picture
// stands there too (in the picture it stands at 36 degrees round from +x, 18 degrees up).
const SUN_ROUND = 2.33, SUN_UP = .47, SKY_SUN = .629, SUN = [Math.cos(SUN_ROUND) * Math.cos(SUN_UP), Math.sin(SUN_UP), Math.sin(SUN_ROUND) * Math.cos(SUN_UP)], SKY_TURN = SUN_ROUND - SKY_SUN + Math.PI;

const W = 'window', D = 'door';
const win = (at, o = {}) => ({kind: W, at, width: 1.1, sill: .9, head: 2.05, ...o}), door = (at, o = {}) => ({kind: D, at, width: 1.3, head: 2.1, ...o});   // Build 26: 1.3 m, as the customs house (user decision, E41); the block's doors were 1.05 m
// Build 25: the customs house's doors are 1.3 m wide, for enemies as much as for the player (an enemy asks for .45 m
// either side of its line; see the roadmap, E41). A room is a rectangle; the storeys' rooms tile the inside of the house.
const wide = (at, o = {}) => ({kind: D, at, width: 1.3, head: 2.3, leaf: 'planks', open: 1.7, ...o}), room = (id, x, z) => ({id, x, z});
const K = {x: [-13, 13], z: [53, 71], in: {x: [-12.6, 12.6], z: [53.4, 70.6]}, corridor: [60.3, 62.5], stairW: {x: [-12.6, -9.8], z: [56, 60.3]}, stairE: {x: [9.8, 12.6], z: [62.5, 66.8]}};
const kRooms = (north, south) => [room('stair W', K.stairW.x, K.stairW.z), room('closet W', K.stairW.x, [K.in.z[0], K.stairW.z[0]]), ...north, room('corridor', K.in.x, K.corridor), ...south, room('stair E', K.stairE.x, K.stairE.z), room('closet E', K.stairE.x, [K.stairE.z[1], K.in.z[1]])];
const nRoom = (id, x) => room(id, x, [K.in.z[0], K.corridor[0]]), sRoom = (id, x, z = [K.corridor[1], K.in.z[1]]) => room(id, x, z);

// Beyond the walls: the rest of the town and its fields, to be seen and not reached. A house stands on the hill where
// it is put; a field wall follows the hill in lengths of eight metres.
const stands = (x, z) => Math.min(surface(x[0], z[0]), surface(x[1], z[0]), surface(x[0], z[1]), surface(x[1], z[1]), surface((x[0] + x[1]) / 2, (z[0] + z[1]) / 2)) + .05;
const far = (id, x, z, storeys, faces = {}) => ({id, x, z, plain: true, base: stands(x, z), beamEnds: Object.keys(faces).slice(0, 1), roof: {parapet: .5}, storeys: storeys.map(([height, surface, band], n) => ({height, surface, band,
  ...Object.fromEntries(Object.entries(faces).map(([side, places]) => [side, places.map(at => n ? win(at, {sill: .8, open: [2.75, 1 + (at * 7 % 3) * .8]}) : win(at, {bars: true}))]))}))});
const fieldWall = (z, from, to) => { const out = []; for (let a = from; a < to; a += 8) { const b = Math.min(to, a + 8); out.push({axis: 'x', at: z, from: a, to: b, base: Math.min(surface(a, z), surface(b, z)) - .1, height: 1.15 + .25 * Math.sin(a * .9), thick: .55, foot: 1.5, surface: 'drystone'}); } return out; };

export const DEHRUN = {
  id: 'dehrun', name: 'Dehrun Terraces',
  // A map to walk and look at: no mission, nobody else. The words the game shows there.
  look: {lamp: 2.4, title: 'DEHRUN TERRACES', line: 'Look slice: the block and the customs house', note: 'NO MISSION · NOBODY ELSE HERE', button: 'WALK THE BLOCK →', brief: 'A street in the hill town, and the customs house.', text: 'One street block of Dehrun Terraces and, through the gate at the south end of the street, the square with the customs house: three storeys of rooms and corridors, two stairs, a roof. Walk in by any of its four doors; the stairs come out on the roof.', radio: 'Dehrun Terraces, look slice. Nobody else is here. The street climbs north; behind you, through the south gate, stands the customs house. Its doors are open and both stairs go up to the roof.',
    // Build 26: with `?foes=1` these enemies are in the customs house and on the square, on the loops named, hunting you.
    foes: [{at: [-8, 9.83, 58], loop: 'ROOF'}, {at: [8, 9.83, 68], loop: 'ROOF'}, {at: [0, 6.6, 61.4], loop: 'UPPER'}, {at: [6, 6.6, 57], loop: 'UPPER'}, {at: [-15, 0, 50], loop: 'SQUARE'}, {at: [15, 0, 74], loop: 'SQUARE'}]},
  height,
  terrain: {size: 400, segments: 100, surface},
  // A clear sky with a low sun: `background` and `environment` are how bright the sky is drawn and how much it lights,
  // `ambient` the light from all around; the sun's `colour` and `power`.
  sky: {asset: 'dehrun/syferfontein_18d_clear_puresky_1k.hdr', colour: '#c4c0b2', fog: '#cdbfa3', fogDensity: .0021, background: 1.25, environment: .8, ambient: 1.85, turn: SKY_TURN},
  sun: {at: [SUN[0] * 70, SUN[1] * 70, SUN[2] * 70 + 25], target: [0, 0, 25], reach: 60, near: 1, far: 220, colour: '#ffdcae', power: 3.5},   // Build 25: aimed at the middle of the block and the square, which is longer now
  ridge: {sectors: 220, bands: 26, inner: 150, step: 20},
  edges: {x: [-23.6, 23.6], z: [-29.6, 79.6]},
  nav: {origin: -46, step: 2, cells: 64},
  reach: {x: 30, z: 90},
  // Heights on the M map are given above this (the lowest terrace).
  levels: {base: 0},
  // Nothing of Kohar Valley's village stands here.
  buildings: [], lowWalls: [], sandbags: [], poles: [], brickWalls: [], stalls: [], crates: [], trucks: [], trees: [], props: [],
  rocks: {count: 0, x: [-20, 20], z: [-20, 20], clear: 0}, shrubs: {count: 0, x: [-20, 20], z: [-20, 20], clear: 0},
  pebbles: {count: 1, x: [-60, -59], z: [-60, -59]},
  dust: {count: 160, x: [-22, 22], y: [.3, 9], z: [-28, 78]},
  wire: [[-4.2, 7.6, 4.2], [0, 6.9, 5.4], [4.2, 5.1, 6.6]],
  // The game's objectives have places on every map; here they are out of the way and not shown.
  relay: [-15.6, -25.2],
  log: {at: [-8.4, 7.2], lies: [0, -5, 0], reach: [0, 0], door: [-3.4, 5]},
  extraction: [0, 40],
  starts: {player: [0, 37], guest: [1.5, 38], squad: [[-1.5, 39], [0, 40.5], [1.5, 39.5]], mate: [1.5, 40.5]},
  enemies: {
    spawns: [[-2, -12], [2, -14], [-1, -18], [1, -22], [-2, -25], [2, -26], [0, -9]],
    // Build 26: a loop's node may carry its height [x, z, y]; these are the customs house's, for the foes of `?foes=1`.
    loops: {UP: [[0, -10], [0, -24], [-2, -17]], RING: [[-2, -12], [2, -12], [2, -24], [-2, -24]],
      ROOF: [[-8, 58, 9.83], [8, 58, 9.83], [8, 68, 9.83], [-8, 68, 9.83]], UPPER: [[-9, 61.4, 6.6], [10, 61.4, 6.6], [8, 57, 6.6], [-5, 57, 6.6]], HALLS: [[-9, 61.4, .05], [10, 61.4, .05], [0, 66, .05], [-8, 66, .05]], SQUARE: [[-18, 48, 0], [18, 48, 0], [18, 76, 0], [-18, 76, 0]]},
    assign: ['UP', 'UP', 'UP', 'UP', 'GARRISON', 'GARRISON', 'UP'],
    reinforceLoops: {0: ['UP'], 1: ['RING'], 2: ['UP'], skirmish: ['RING']},
    reinforcePoints: [{chain: [[0, -27], [0, -20]], stages: [0, 1, 2]}],
  },
  ambush: {start: [0, 30], firstArea: 1, walls: [], areas: [{id: 1, name: 'Lower street', x: [-23, 23], z: [20, 79]}], gates: [], stations: [], chart: {x: [-24, 24], z: [-30, 81]}, spots: {x: [-22, 22], z: [-28, 78], step: 4}},

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
    ],
    // Retaining walls of dry stone with a parapet on the upper side, and the walls around the block.
    walls: [
      {axis: 'x', at: 16.75, from: -24, to: -1.96, base: 0, height: 2.5, thick: .6, surface: 'drystone', coping: 'slab'}, {axis: 'x', at: 16.75, from: 1.96, to: 24, base: 0, height: 2.5, thick: .6, surface: 'drystone', coping: 'slab'},
      {axis: 'x', at: -6.25, from: -24, to: -1.96, base: 1.6, height: 2.5, thick: .6, foot: 2.8, surface: 'drystone', coping: 'slab'}, {axis: 'x', at: -6.25, from: 1.96, to: 24, base: 1.6, height: 2.5, thick: .6, foot: 2.8, surface: 'drystone', coping: 'slab'},
      {axis: 'z', at: -24, from: 17, to: 44, base: 0, height: 3.1, thick: .4, surface: 'ochre', coping: 'slab'}, {axis: 'z', at: -24, from: -6, to: 17, base: 1.6, height: 3.1, thick: .4, foot: 2.8, surface: 'plaster', coping: 'slab'}, {axis: 'z', at: -24, from: -30, to: -6, base: 3.2, height: 3.1, thick: .4, foot: 4.4, surface: 'ochre', coping: 'slab'},
      {axis: 'z', at: 24, from: 17, to: 44, base: 0, height: 3.1, thick: .4, surface: 'plaster', coping: 'slab'}, {axis: 'z', at: 24, from: -6, to: 17, base: 1.6, height: 3.1, thick: .4, foot: 2.8, surface: 'ochre', coping: 'slab'}, {axis: 'z', at: 24, from: -30, to: -6, base: 3.2, height: 3.1, thick: .4, foot: 4.4, surface: 'plaster', coping: 'slab'},
      {axis: 'x', at: 44, from: -24, to: -5, base: 0, height: 3.1, thick: .4, surface: 'plaster', coping: 'slab'}, {axis: 'x', at: 44, from: 5, to: 24, base: 0, height: 3.1, thick: .4, surface: 'ochre', coping: 'slab'},
      {axis: 'x', at: -30, from: -24, to: -5, base: 3.2, height: 3.1, thick: .4, foot: 4.4, surface: 'plaster', coping: 'slab'}, {axis: 'x', at: -30, from: 5, to: 24, base: 3.2, height: 3.1, thick: .4, foot: 4.4, surface: 'plaster', coping: 'slab'},
      // Low yard walls.
      {axis: 'x', at: 20.6, from: -14, to: -5.2, base: 0, height: 1.1, thick: .4, surface: 'drystone', coping: 'slab'}, {axis: 'z', at: -14, from: 20.6, to: 24, base: 0, height: 1.1, thick: .4, surface: 'drystone', coping: 'slab'},
      {axis: 'z', at: 13.2, from: -1, to: 5.6, base: 1.6, height: 1.2, thick: .4, surface: 'drystone', coping: 'slab'},
      {axis: 'x', at: -24.2, from: 8, to: 14, base: 3.2, height: 1, thick: .4, surface: 'drystone', coping: 'slab'},
      // Build 25: the walls round the square, with a gate at its south end.
      {axis: 'z', at: -22, from: 44.2, to: 80, base: 0, height: 3.1, thick: .4, surface: 'plaster', coping: 'slab'}, {axis: 'z', at: 22, from: 44.2, to: 80, base: 0, height: 3.1, thick: .4, surface: 'ochre', coping: 'slab'},
      {axis: 'x', at: 80, from: -22, to: -6, base: 0, height: 3.1, thick: .4, surface: 'ochre', coping: 'slab'}, {axis: 'x', at: 80, from: 6, to: 22, base: 0, height: 3.1, thick: .4, surface: 'plaster', coping: 'slab'},
    ],
    arches: [
      {axis: 'x', at: 44, from: -5, to: 5, width: 3.2, base: 0, height: 3.9, clear: 2.9, thick: .5, surface: 'masonry', gate: 'planks', ajar: 1.3, out: -1},   // Build 25: the gate stands open onto the square
      {axis: 'x', at: 80, from: -6, to: 6, width: 3.2, base: 0, height: 3.9, clear: 2.9, thick: .5, surface: 'masonry', gate: 'planks', ajar: .1, out: 1},
      {axis: 'x', at: -30, from: -5, to: 5, width: 3, base: 3.2, height: 3.9, clear: 2.8, thick: .5, surface: 'masonry', gate: 'blue', ajar: .2, out: 1},
    ],
    steps: [
      {x: [-LANE, LANE], z: [17, 20], low: 0, high: 1.6, count: 8, sides: {thick: .25, above: .6, surface: 'drystone'}},
      {x: [-LANE, LANE], z: [-6, -3], low: 1.6, high: 3.2, count: 8, sides: {thick: .25, above: .6, surface: 'drystone'}},
    ],
    houses: [
      // A: the open house, west of the middle terrace. Stone below, plaster above, a balcony over the street.
      // Build 24: its upper floor is a room, reached by the stair through a well in the floor; a hatch and a ladder lead to the roof.
      {id: 'A', x: [-13, -4.2], z: [2, 13], base: 1.6, enter: true, beamEnds: ['east', 'south'], roof: {parapet: .6, tanks: [[-10.5, 4.5]]}, wells: [{x: [-12.66, -11.5], z: [6.2, 11.7], storeys: [0]}, {x: [-5.7, -4.62], z: [3, 4.2], storeys: [1]}], storeys: [
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
      {id: 'K', x: K.x, z: K.z, base: 0, thick: .4, enter: true, beamEnds: ['north', 'south'], roof: {parapet: .6, tanks: [[-6, 66.5], [5, 56]]}, door: {width: 1.3, head: 2.2},
        stairs: [{axis: 'z', x: K.stairW.x, z: [K.stairW.z[1], K.stairW.z[0]], storeys: [0, 1, 2], head: {}}, {axis: 'z', x: K.stairE.x, z: [K.stairE.z[0], K.stairE.z[1]], storeys: [0, 1, 2], head: {}}],
        storeys: [
        {height: 3.4, surface: 'masonry', room: true, floor: 'slab',
          rooms: kRooms([nRoom('north-west room', [-9.8, -3]), nRoom('north hall', [-3, 4.5]), nRoom('north-east room', [4.5, 12.6])], [sRoom('south-west room', [-12.6, -5]), sRoom('south hall', [-5, 4]), sRoom('store', [4, 9.8], [62.5, 66.1]), sRoom('south-east room', [4, 9.8], [66.1, 70.6])]),
          doors: [{at: [-6.4, 60.3]}, {at: [.75, 60.3]}, {at: [8.5, 60.3]}, {at: [-8.8, 62.5]}, {at: [-.5, 62.5]}, {at: [6.9, 62.5]}, {at: [6.9, 66.1]}, {at: [9.8, 68.3]}, {at: [-9.8, 55]}, {at: [4, 68.3]}, {at: [-3, 57]}],
          west: [wide(61.4), win(55, {bars: true}), win(65, {bars: true}), win(68.5, {bars: true})], east: [wide(61.4), win(56, {bars: true}), win(59, {bars: true}), win(68.5, {bars: true})],
          north: [wide(.75), win(-11.2, {bars: true}), win(-7, {bars: true}), win(3, {bars: true}), win(7, {bars: true}), win(11, {bars: true})], south: [wide(-.5), win(-10, {bars: true}), win(-7, {bars: true}), win(2, {bars: true}), win(7, {bars: true}), win(11.2, {bars: true})]},
        {height: 3.2, surface: 'plaster', band: 'white', room: true,
          rooms: kRooms([nRoom('north-west room', [-9.8, -2]), nRoom('north room', [-2, 5]), nRoom('north-east room', [5, 12.6])], [sRoom('south-west room', [-12.6, -6]), sRoom('south room', [-6, 4]), sRoom('store', [4, 9.8], [62.5, 66.1]), sRoom('south-east room', [4, 9.8], [66.1, 70.6])]),
          doors: [{at: [-6, 60.3]}, {at: [1.5, 60.3]}, {at: [9, 60.3]}, {at: [-2, 56]}, {at: [-9, 62.5]}, {at: [-1, 62.5]}, {at: [7, 62.5]}, {at: [7, 66.1]}, {at: [4, 68.5]}, {at: [-9.8, 55]}, {at: [9.8, 68.5]}],
          west: [win(55, {sill: .8}), win(64.5, {sill: .8}), win(68.5, {sill: .8, open: [2.75, 1.2]})], east: [win(56, {sill: .8}), win(59, {sill: .8, open: [1.1, 2.75]}), win(68.5, {sill: .8})],
          north: [win(-11.2, {sill: .8}), win(-6.5, {sill: .8}), win(-3, {sill: .8}), win(0, {sill: .8, open: [2.75, 1.4]}), win(3, {sill: .8}), win(8, {sill: .8}), win(11, {sill: .8})], south: [win(-10.5, {sill: .8}), win(-7.5, {sill: .8}), win(-3, {sill: .8, open: [1.3, 2.75]}), win(1, {sill: .8}), win(7, {sill: .8}), win(11.2, {sill: .8})]},
        {height: 3.2, surface: 'white', band: 'ochre', room: true,
          rooms: kRooms([nRoom('loft', [-9.8, 12.6])], [sRoom('south-west room', [-12.6, -4]), sRoom('south room', [-4, 4]), sRoom('south-east room', [4, 9.8])]),
          doors: [{at: [-5, 60.3]}, {at: [7, 60.3]}, {at: [-8, 62.5]}, {at: [0, 62.5]}, {at: [7, 62.5]}, {at: [4, 67]}, {at: [-4, 67]}, {at: [-9.8, 55]}, {at: [9.8, 68.5]}],
          west: [win(55, {sill: .8}), win(65, {sill: .8}), win(68.5, {sill: .8})], east: [win(56, {sill: .8, open: [2.75, 1]}), win(59, {sill: .8}), win(68.5, {sill: .8})],
          north: [win(-11.2, {sill: .8}), win(-7, {sill: .8}), win(-2.5, {sill: .8}), win(2, {sill: .8}), win(6.5, {sill: .8, open: [1.2, 2.75]}), win(11, {sill: .8})], south: [win(-10, {sill: .8}), win(-6, {sill: .8}), win(-1.5, {sill: .8}), win(1.5, {sill: .8}), win(7, {sill: .8, open: [2.75, 1.3]}), win(11.2, {sill: .8})]}]},
    ],
    balconies: [
      {axis: 'z', at: -4.2, from: 3.4, to: 11.8, y: 4.6, out: 1}, {axis: 'z', at: -5, from: -18.6, to: -13.4, y: 9, out: 1, depth: 1}, {axis: 'z', at: 4.5, from: -17.2, to: -11.8, y: 6.2, out: -1},
    ],
    // Outside and inside stairs: geometry until height is built.
    flights: [
      {axis: 'x', at: 34, from: 12.8, to: 7.4, low: 0, high: 3, width: 1.05, count: 15, out: 1, landing: 1.9},
      {axis: 'z', at: -12.66, from: 11.6, to: 6.6, low: 1.6, high: 4.6, width: 1.05, count: 14, out: 1, surface: 'room', tread: 'planks'},   // Build 26: 1.05 m (was .9), wide enough for an enemy
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
        far('W1', [-38, -30], [21, 30], [[3, 'masonry'], [2.8, 'plaster', 'white']], {east: [23.5, 27.5], south: [-34]}), far('W2', [-35.5, -27.5], [3, 11], [[3, 'ochre']], {east: [5, 9]}),
        far('W3', [-40, -31], [-17, -7], [[3, 'masonry'], [2.8, 'plaster'], [2.7, 'white', 'ochre']], {east: [-14.5, -9.5], south: [-35.5]}), far('W4', [-36, -28], [-40, -32], [[3, 'plaster'], [2.7, 'white']], {east: [-38, -34], south: [-32]}),
        far('E1', [29, 37], [24, 33], [[3, 'ochre'], [2.8, 'plaster', 'white']], {west: [26.5, 30.5], south: [33]}), far('E2', [28.5, 36], [-2, 8], [[3, 'masonry'], [2.8, 'white']], {west: [0.5, 5.5]}),
        far('E3', [30, 39], [-24, -14], [[3, 'plaster'], [2.8, 'plaster', 'white'], [2.7, 'white']], {west: [-21.5, -16.5], south: [34.5]}), far('N1', [-15, -6], [-46, -37], [[3, 'masonry'], [2.8, 'plaster', 'white']], {south: [-12.5, -8.5], east: [-41.5]}),
        far('N2', [7, 16], [-48, -39], [[3, 'ochre'], [2.8, 'white'], [2.7, 'white', 'ochre']], {south: [9.5, 13.5], west: [-43.5]}), far('N3', [-4, 4], [-60, -52], [[3, 'plaster'], [2.8, 'white']], {south: [-1.5, 1.5]}),
        far('S1', [-17, -8], [86, 94], [[3, 'plaster'], [2.8, 'white', 'ochre']], {north: [-14.5, -10.5]}), far('S2', [9, 18], [87, 95], [[3, 'ochre']], {north: [11.5, 15.5]}),   // Build 25: moved south, beyond the square
      ],
      walls: [...fieldWall(-34, -70, -17), ...fieldWall(-34, 18, 70), ...fieldWall(-52, -80, -6), ...fieldWall(-52, 6, 80), ...fieldWall(-66, -90, 90), ...fieldWall(-82, -100, 100), ...fieldWall(14, 40, 80), ...fieldWall(14, -80, -42), ...fieldWall(64, -60, -28), ...fieldWall(64, 28, 60), ...fieldWall(98, -60, 60)],
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
      ['painted_wooden_table', -8.2, 9.4], ['painted_wooden_chair_01', -8.9, 8.35, 190], ['painted_wooden_chair_01', -7.5, 8.4, 170], ['painted_wooden_chair_01', -8.3, 10.5, 5], ['painted_wooden_bench', -4.95, 10.4, -90], ['vintage_day_bed', -9.6, 12.12, 180],
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
      // Light models only: the whole map is to stay under 700,000 triangles (a lantern alone is 8,300).
      ['painted_wooden_table', 1, 56, 90], ['painted_wooden_chair_01', .2, 56, 90], ['painted_wooden_chair_01', 1.9, 56.2, -80],
      ['wooden_table_02', -6.5, 54.5], ['painted_wooden_stool', -7.5, 55.2], ['ceramic_pot', -9.3, 59.8], ['wooden_crate_02', 12.32, 54.2], ['wooden_crate_01', 12.32, 54.2, 90, .47], ['barrel_03', 11.9, 59.6], ['cement_bag', 6, 54, 30],
      ['wooden_lantern_01', -6, 61.4, 0, 2.3], ['barrel_03', -11.9, 69.8], ['barrel_03', -11.2, 70], ['cement_bag', -11.8, 63.3, 10],
      ['painted_wooden_bench', -4.4, 66, 90], ['painted_wooden_bench', 3.4, 65, -90], ['painted_wooden_shelves', 9.66, 63.6, -90], ['painted_wooden_shelves', 9.66, 64.4, -90], ['wooden_crate_02', 4.8, 65.5, 90],
      ['barrel_03', 9.2, 70, 15], ['barrel_03', 4.6, 70, 40],
      ['painted_wooden_table', -6, 55.5, 0, 3.4], ['painted_wooden_chair_01', -6.8, 54.5, 190, 3.4], ['painted_wooden_chair_01', -5.2, 56.6, 10, 3.4],
      ['vintage_day_bed', 3.2, 53.94, 0, 3.4], ['painted_wooden_stool', 1, 54.5, 20, 3.4], ['painted_wooden_cabinet', 11.85, 55, 0, 3.78], ['painted_wooden_shelves', 12.56, 58, -90, 3.4],
      ['wooden_table_02', -9, 69.6, 90, 3.4], ['painted_wooden_stool', -8, 68.5, 0, 3.4], ['ceramic_pot', -12.2, 63.2, 40, 3.4], ['painted_wooden_bench', -5.5, 66, 90, 3.4], ['planter_pot_clay', -1, 70, 0, 3.4, 2],
      ['wooden_crate_02', 5.2, 65.4, 90, 3.4], ['barrel_03', 9.3, 70, 10, 3.4], ['barrel_03', 8.5, 70.1, 50, 3.4], ['wooden_lantern_01', 0, 61.4, 0, 5.7],
      ['wooden_crate_02', 12.32, 54.1, 0, 6.6], ['wooden_crate_01', 12.32, 54.1, 90, 7.07], ['barrel_03', 8, 54, 0, 6.6], ['barrel_03', 8.7, 54.3, 60, 6.6], ['cement_bag', 2, 54, 30, 6.6], ['cement_bag', 2.1, 54.1, -20, 6.78], ['propane_tank', -8.5, 54, 0, 6.6],
      ['vintage_day_bed', -8, 70.06, 180, 6.6], ['painted_wooden_table', 0, 66.5, 0, 6.6], ['painted_wooden_chair_01', -.8, 65.5, 190, 6.6], ['painted_wooden_chair_01', .7, 67.5, 5, 6.6], ['wooden_lantern_01', 0, 66.5, 30, 8.6],
      ['painted_wooden_shelves', 9.66, 68, -90, 6.6], ['planter_pot_clay', 6, 70.1, 0, 6.6, 1.3],
      ['barrel_03', -3, 69, 0, 9.83], ['cement_bag', 3, 68.6, 20, 9.83], ['cement_bag', 3.1, 68.7, -30, 10.01],
    ],
  },
};
