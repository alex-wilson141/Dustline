// Build 22: Dehrun Terraces, map 2 (working name), as a description the game loads: a hill town built in terraces,
// fictional like everything in DUSTLINE. This build holds one street block of it, the look slice: three terraces of a
// street that climbs north by two flights of steps, eight houses, yards, and what stands in them.
// It is loaded only when it is asked for (dist/maps.js); Kohar Valley never fetches this file, the kit or a single
// asset of this map.
// Like map-kohar.js it says where everything is; dist/terraces.js is the kit that builds it and holds no place.
// Height is not built yet (map build 3). What can be walked is what `height` says: the street and its yards, the steps
// (as a ramp), and the ground floors of the houses marked `enter`. Upper floors, outside stairs, balconies and roofs are
// geometry only.
import {buildTerraces} from './terraces.js';
import './build.js'; // DEPLOY-01 upgrade guard

// The three terraces (metres above the lowest), the lines where one ends (z), the run of the steps and half their width.
const LEVEL = [0, 1.6, 3.2], RISE = 1.6, EDGES = [17, -6], RUN = 3, LANE = 1.7;
const clamp = v => Math.min(1, Math.max(0, v)), smooth = v => { const t = clamp(v); return t * t * (3 - 2 * t); };
// Where a body stands: the terraces, and the steps as ramps.
const height = (x, z) => { let h = 0; for (const e of EDGES) h += Math.abs(x) <= LANE ? RISE * clamp((e + RUN - z) / RUN) : z < e ? RISE : 0; return h; };
// The ground that is drawn: under the block it lies below everything that is built; around it, the hill.
const BLOCK = {x: 23.9, z: [-29.9, 43.9]};
// Around the block the hill follows the terraces from a little below, so that it never rises through a yard.
const surface = (x, z) => { if (Math.abs(x) <= BLOCK.x && z >= BLOCK.z[0] && z <= BLOCK.z[1]) return -1.3;
  const far = Math.max(0, Math.abs(x) - 26, z - 46, -32 - z), roll = Math.min(1, far / 30);
  return RISE * smooth((EDGES[0] - 1 - z) / 10) + RISE * smooth((EDGES[1] - 1 - z) / 10) - .3 + .09 * Math.max(0, -32 - z) + .06 * Math.max(0, Math.abs(x) - 28) + roll * (.9 * Math.sin(x * .07 + 1) * Math.cos(z * .06) + .4 * Math.sin(z * .17)); };

const W = 'window', D = 'door';
const win = (at, o = {}) => ({kind: W, at, width: 1.1, sill: .9, head: 2.05, ...o}), door = (at, o = {}) => ({kind: D, at, width: 1.05, head: 2.1, ...o});

export const DEHRUN = {
  id: 'dehrun', name: 'Dehrun Terraces',
  // A map to walk and look at: no mission, nobody else. The words the game shows there.
  look: {lamp: 2.4, title: 'DEHRUN TERRACES', line: 'Look slice: walk the block', note: 'NO MISSION · NOBODY ELSE HERE', button: 'WALK THE BLOCK →', brief: 'A street in the hill town.', text: 'One street block of Dehrun Terraces, to look at. Walk the street and its steps, the yards and the ground floors with an open door. Upper floors, outside stairs and roofs cannot be climbed yet.', radio: 'Dehrun Terraces, look slice. Nobody else is here. The street climbs north; the house on the left of the middle terrace and the shop across from it are open.'},
  height,
  terrain: {size: 400, segments: 100, surface},
  // A clear sky with a low sun: `background` and `environment` are how bright the sky is drawn and how much it lights,
  // `ambient` the light from all around; the sun's `colour` and `power`.
  sky: {asset: 'dehrun/syferfontein_18d_clear_puresky_1k.hdr', colour: '#c4c0b2', fog: '#cdbfa3', fogDensity: .0021, background: 1.25, environment: .5, ambient: 1.15},
  sun: {at: [-46, 40, 30], reach: 52, near: 1, far: 220, colour: '#ffdcae', power: 4.4},
  ridge: {sectors: 220, bands: 26, inner: 150, step: 20},
  edges: {x: [-23.6, 23.6], z: [-29.6, 43.6]},
  nav: {origin: -46, step: 2, cells: 46},
  reach: {x: 30, z: 50},
  // Nothing of Kohar Valley's village stands here.
  buildings: [], lowWalls: [], sandbags: [], poles: [], brickWalls: [], stalls: [], crates: [], trucks: [], trees: [], props: [],
  rocks: {count: 0, x: [-20, 20], z: [-20, 20], clear: 0}, shrubs: {count: 0, x: [-20, 20], z: [-20, 20], clear: 0},
  pebbles: {count: 1, x: [-60, -59], z: [-60, -59]},
  dust: {count: 140, x: [-22, 22], y: [.3, 9], z: [-28, 42]},
  wire: [[-4.2, 7.6, 4.2], [0, 6.9, 5.4], [4.2, 5.1, 6.6]],
  // The game's objectives have places on every map; here they are out of the way and not shown.
  relay: [-15.6, -25.2],
  log: {at: [-8.4, 7.2], lies: [0, -5, 0], reach: [0, 0], door: [-3.4, 5]},
  extraction: [0, 40],
  starts: {player: [0, 37], guest: [1.5, 38], squad: [[-1.5, 39], [0, 40.5], [1.5, 39.5]], mate: [1.5, 40.5]},
  enemies: {
    spawns: [[-2, -12], [2, -14], [-1, -18], [1, -22], [-2, -25], [2, -26], [0, -9]],
    loops: {UP: [[0, -10], [0, -24], [-2, -17]], RING: [[-2, -12], [2, -12], [2, -24], [-2, -24]]},
    assign: ['UP', 'UP', 'UP', 'UP', 'GARRISON', 'GARRISON', 'UP'],
    reinforceLoops: {0: ['UP'], 1: ['RING'], 2: ['UP'], skirmish: ['RING']},
    reinforcePoints: [{chain: [[0, -27], [0, -20]], stages: [0, 1, 2]}],
  },
  ambush: {start: [0, 30], firstArea: 1, walls: [], areas: [{id: 1, name: 'Lower street', x: [-23, 23], z: [20, 43]}], gates: [], stations: [], chart: {x: [-24, 24], z: [-30, 44]}, spots: {x: [-22, 22], z: [-28, 42], step: 4}},

  build: ctx => buildTerraces(ctx, DEHRUN),

  block: {
    outside: {surface: 'trail', repeat: 110, tint: '#d9cfbb'},
    // The ground of each terrace: the cobbled street, the yards either side, the square at the top.
    grounds: [
      {x: [-3, 3], z: [20, 44.3], level: 0, surface: 'cobble'}, {x: [-3, -1.95], z: [17, 20], level: 0, surface: 'cobble'}, {x: [1.95, 3], z: [17, 20], level: 0, surface: 'cobble'},
      {x: [-24.3, -3], z: [17, 44.3], level: 0, surface: 'trail'}, {x: [3, 24.3], z: [17, 44.3], level: 0, surface: 'gravel'},
      {x: [-3, 3], z: [-3, 17], level: 1.6, surface: 'cobble', deep: 3}, {x: [-3, -1.95], z: [-6, -3], level: 1.6, surface: 'cobble', deep: 3}, {x: [1.95, 3], z: [-6, -3], level: 1.6, surface: 'cobble', deep: 3},
      {x: [-24.3, -3], z: [-6, 17], level: 1.6, surface: 'gravel', deep: 3}, {x: [3, 24.3], z: [-6, 17], level: 1.6, surface: 'trail', deep: 3},
      {x: [-3, 3], z: [-30.3, -6], level: 3.2, surface: 'cobble', deep: 4.6}, {x: [-24.3, -3], z: [-30.3, -6], level: 3.2, surface: 'trail', deep: 4.6}, {x: [3, 24.3], z: [-30.3, -6], level: 3.2, surface: 'gravel', deep: 4.6},
      {x: [-5.5, 5.5], z: [-28.5, -22.5], level: 3.2, surface: 'slab', deep: .3, lift: .012},
      {x: [-.35, .35], z: [20, 44], level: 0, surface: 'slab', deep: .3, lift: .01}, {x: [-.35, .35], z: [-3, 17], level: 1.6, surface: 'slab', deep: .3, lift: .01}, {x: [-.35, .35], z: [-22.5, -6], level: 3.2, surface: 'slab', deep: .3, lift: .01},
    ],
    // Retaining walls of dry stone with a parapet on the upper side, and the walls around the block.
    walls: [
      {axis: 'x', at: 16.7, from: -24, to: -1.95, base: 0, height: 2.5, thick: .6, surface: 'drystone', coping: 'slab'}, {axis: 'x', at: 16.7, from: 1.95, to: 24, base: 0, height: 2.5, thick: .6, surface: 'drystone', coping: 'slab'},
      {axis: 'x', at: -6.3, from: -24, to: -1.95, base: 1.6, height: 2.5, thick: .6, foot: 2.8, surface: 'drystone', coping: 'slab'}, {axis: 'x', at: -6.3, from: 1.95, to: 24, base: 1.6, height: 2.5, thick: .6, foot: 2.8, surface: 'drystone', coping: 'slab'},
      {axis: 'z', at: -24, from: 17, to: 44.2, base: 0, height: 3.1, thick: .4, surface: 'ochre', coping: 'slab'}, {axis: 'z', at: -24, from: -6, to: 17, base: 1.6, height: 3.1, thick: .4, foot: 2.8, surface: 'plaster', coping: 'slab'}, {axis: 'z', at: -24, from: -30.2, to: -6, base: 3.2, height: 3.1, thick: .4, foot: 4.4, surface: 'ochre', coping: 'slab'},
      {axis: 'z', at: 24, from: 17, to: 44.2, base: 0, height: 3.1, thick: .4, surface: 'plaster', coping: 'slab'}, {axis: 'z', at: 24, from: -6, to: 17, base: 1.6, height: 3.1, thick: .4, foot: 2.8, surface: 'ochre', coping: 'slab'}, {axis: 'z', at: 24, from: -30.2, to: -6, base: 3.2, height: 3.1, thick: .4, foot: 4.4, surface: 'plaster', coping: 'slab'},
      {axis: 'x', at: 44, from: -24, to: -5, base: 0, height: 3.1, thick: .4, surface: 'plaster', coping: 'slab'}, {axis: 'x', at: 44, from: 5, to: 24, base: 0, height: 3.1, thick: .4, surface: 'ochre', coping: 'slab'},
      {axis: 'x', at: -30, from: -24, to: -5, base: 3.2, height: 3.1, thick: .4, foot: 4.4, surface: 'plaster', coping: 'slab'}, {axis: 'x', at: -30, from: 5, to: 24, base: 3.2, height: 3.1, thick: .4, foot: 4.4, surface: 'plaster', coping: 'slab'},
      // Low yard walls.
      {axis: 'x', at: 20.6, from: -14, to: -5.2, base: 0, height: 1.1, thick: .4, surface: 'drystone', coping: 'slab'}, {axis: 'z', at: -14, from: 20.6, to: 24, base: 0, height: 1.1, thick: .4, surface: 'drystone', coping: 'slab'},
      {axis: 'z', at: 13.2, from: -1, to: 5.6, base: 1.6, height: 1.2, thick: .4, surface: 'drystone', coping: 'slab'},
      {axis: 'x', at: -24.2, from: 8, to: 14, base: 3.2, height: 1, thick: .4, surface: 'drystone', coping: 'slab'},
    ],
    arches: [
      {axis: 'x', at: 44, from: -5, to: 5, width: 3.2, base: 0, height: 3.9, clear: 2.9, thick: .5, surface: 'masonry', gate: 'planks', ajar: .12, out: -1},
      {axis: 'x', at: -30, from: -5, to: 5, width: 3, base: 3.2, height: 3.9, clear: 2.8, thick: .5, surface: 'masonry', gate: 'blue', ajar: .2, out: 1},
    ],
    steps: [
      {x: [-LANE, LANE], z: [17, 20], low: 0, high: 1.6, count: 8, sides: {thick: .25, above: .6, surface: 'drystone'}},
      {x: [-LANE, LANE], z: [-6, -3], low: 1.6, high: 3.2, count: 8, sides: {thick: .25, above: .6, surface: 'drystone'}},
    ],
    houses: [
      // A: the open house, west of the middle terrace. Stone below, plaster above, a balcony over the street.
      {id: 'A', x: [-13, -4.2], z: [2, 13], base: 1.6, enter: true, beamEnds: ['east', 'south'], roof: {parapet: .6, tanks: [[-10.5, 4.5]]}, storeys: [
        {height: 3, surface: 'masonry', east: [door(5, {awning: ['#8a3a2c', 1.5], open: 1.8}), win(9.5, {width: 1.3, bars: true})], south: [win(-9)], north: [win(-8.5, {open: [2.75, 1.3]})]},
        {height: 2.8, surface: 'plaster', band: 'white', east: [win(4.4, {sill: .8}), door(7.5, {width: .95, leaf: 'blue', closed: true}), win(10.6, {sill: .8, open: [1.1, 2.75]})], south: [win(-8.5, {sill: .8})], north: [win(-9, {sill: .8})], west: [win(7.5, {sill: .8})]}]},
      // B: the shop across the street, open, with its counter and rolling shutter.
      {id: 'B', x: [4.2, 11], z: [6, 14], base: 1.6, enter: true, beamEnds: ['west'], roof: {parapet: .5, gaps: [{side: 'west', from: 7.4, to: 9}], tanks: [[9, 12]]}, storeys: [
        {height: 3.1, surface: 'ochre', floor: 'floor', west: [door(7.1, {leaf: 'blue', open: 1.9}), {kind: 'shop', at: 10.9, width: 3.4, head: 2.45, drop: .75, counter: true, awning: ['#39455c', 1.7]}], south: [win(8, {bars: true, shutters: false})], east: [win(10, {sill: 1})]}]},
      // C: two storeys on the lowest terrace, with a stair up its south side.
      {id: 'C', x: [5, 13], z: [24, 34], base: 0, beamEnds: ['west'], roof: {parapet: .55}, storeys: [
        {height: 3, surface: 'plaster', west: [door(26.8, {leaf: 'blue'}), win(31, {bars: true, open: [2.75, .9]})], north: [win(9)], south: []},
        {height: 2.8, surface: 'white', band: 'ochre', west: [win(26.2, {sill: .8}), win(29, {sill: .8}), win(32, {sill: .8, open: [1.4, 2.75]})], south: [door(6.2, {leaf: 'planks'})], north: [win(9, {sill: .8})]}]},
      // D: an open-fronted workshop.
      {id: 'D', x: [-12, -5.2], z: [25, 32], base: 0, enter: true, roof: {parapet: .4, surface: 'gravel'}, storeys: [
        {height: 2.7, surface: 'ochre', lining: 'room', floor: 'slab', east: [{kind: 'shop', at: 28.5, width: 4.2, head: 2.3, drop: .35}], south: [win(-8.5, {shutters: false, bars: true})]}]},
      // E: the tall house at the top, three storeys.
      {id: 'E', x: [-14, -5], z: [-22, -10], base: 3.2, beamEnds: ['east', 'south'], roof: {parapet: .6, tanks: [[-11, -19]]}, storeys: [
        {height: 3, surface: 'masonry', east: [door(-13, {leaf: 'planks', width: 1.2, head: 2.2, awning: ['#6b5a2e', 1.3]}), win(-17.5, {bars: true}), win(-20, {bars: true})], south: [win(-9.5, {bars: true})]},
        {height: 2.8, surface: 'plaster', band: 'white', east: [win(-12, {sill: .8}), win(-15.5, {sill: .8, open: [2.75, 1]}), win(-19.5, {sill: .8})], south: [win(-11, {sill: .8}), win(-8, {sill: .8})]},
        {height: 2.8, surface: 'white', band: 'ochre', east: [win(-12, {sill: .8}), door(-16, {leaf: 'blue', width: .95}), win(-19.8, {sill: .8})], south: [win(-9.5, {sill: .8, open: [1.2, 2.75]})]}]},
      // F: across from it, a house over a shuttered shop.
      {id: 'F', x: [4.5, 13], z: [-20, -9], base: 3.2, beamEnds: ['west'], roof: {parapet: .5, tanks: [[10.5, -17]]}, storeys: [
        {height: 3, surface: 'ochre', west: [door(-10.6, {leaf: 'planks'}), {kind: 'shop', at: -15.4, width: 3.6, head: 2.4, drop: 2.38}], south: [win(9, {bars: true})]},
        {height: 2.7, surface: 'plaster', band: 'ochre', west: [win(-11, {sill: .8}), door(-14.5, {leaf: 'blue', width: .95}), win(-18, {sill: .8, open: [2.75, 1.5]})], south: [win(8.5, {sill: .8})]}]},
      // G: a storehouse under the upper retaining wall.
      {id: 'G', x: [-12, -5.4], z: [-5.2, .4], base: 1.6, beamEnds: ['east'], roof: {parapet: .35, surface: 'gravel'}, storeys: [
        {height: 2.7, surface: 'white', east: [door(-3.6, {leaf: 'blue', width: 1.2, head: 2.15}), win(-1, {width: .8, sill: 1.3, head: 2, bars: true, shutters: false})], south: [win(-8.5, {width: .8, sill: 1.3, head: 2, shutters: false, bars: true})]}]},
      // H: a low house by the south gate.
      {id: 'H', x: [14.5, 22], z: [36.5, 43], base: 0, beamEnds: ['west'], roof: {parapet: .45}, storeys: [
        {height: 2.9, surface: 'ochre', west: [door(38.2, {leaf: 'planks', awning: ['#8a3a2c', 1.2]}), win(41, {open: [2.75, 1.2]})], north: [win(18)]}]},
    ],
    balconies: [
      {axis: 'z', at: -4.2, from: 3.4, to: 11.8, y: 4.6, out: 1}, {axis: 'z', at: -5, from: -18.6, to: -13.4, y: 9, out: 1, depth: 1}, {axis: 'z', at: 4.5, from: -17.2, to: -11.8, y: 6.2, out: -1},
    ],
    // Outside and inside stairs: geometry until height is built.
    flights: [
      {axis: 'x', at: 34, from: 12.8, to: 7.4, low: 0, high: 3, width: 1.05, count: 15, out: 1, landing: 1.9},
      {axis: 'z', at: -12.66, from: 11.6, to: 6.6, low: 1.6, high: 4.45, width: .9, count: 14, out: 1, surface: 'room', tread: 'planks'},
    ],
    leanTos: [
      {x: [4.5, 10.6], z: [.4, 5.8], base: 1.6, high: 2.95, low: 2.3, fall: 'z-'},
      {x: [-5.2, -3.3], z: [25.2, 31.8], base: 0, high: 2.62, low: 2.1, fall: 'x+', surface: 'tiles'},
      {x: [14.6, 19.4], z: [-29.6, -26.2], base: 3.2, high: 2.8, low: 2.2, fall: 'z+', free: false},
    ],
    // Single pieces [size, place, surface]: a water trough, benches of stone, a well head, door steps.
    pieces: [
      {size: [2.2, .75, 1], at: [-17, 3.57, -25.2], surface: 'masonry', solid: true}, {size: [1.9, .12, .7], at: [-17, 3.9, -25.2], surface: 'dark', seen: false},
      {size: [2.4, .45, .5], at: [3.6, 3.42, -24], surface: 'slab', solid: true}, {size: [2.4, .45, .5], at: [-3.6, 3.42, -26.5], surface: 'slab', solid: true},
      {size: [1.5, .16, .6], at: [-3.85, 1.68, 5], surface: 'slab', seen: false}, {size: [1.4, .16, .6], at: [3.85, 1.68, 7.1], surface: 'slab', seen: false}, {size: [1.4, .16, .6], at: [4.65, .08, 26.8], surface: 'slab', seen: false},
      {size: [1.5, .16, .6], at: [-4.65, 3.28, -13], surface: 'slab', seen: false}, {size: [1.3, .16, .6], at: [4.15, 3.28, -10.6], surface: 'slab', seen: false},
      {size: [.9, 1.0, .9], at: [17, 2.1, 10], surface: 'masonry', solid: true}, {size: [1.1, .1, 1.1], at: [17, 2.65, 10], surface: 'slab', seen: false},
    ],
    wires: [{between: [[-4.2, 7.3, 11], [4.3, 4.6, 12.5]], sag: .6}, {between: [[5, 5.6, 25], [-5.2, 2.7, 26]], sag: .7}, {between: [[-5, 11.6, -12], [4.5, 8.8, -11]], sag: .8}, {between: [[-4.2, 4.5, 3], [-5.4, 4.2, .4]], sag: .2}],
    // Lamp glow [x, y, z, size]: by the hanging lanterns and the wall lamps.
    lamps: [[-8.2, 4.1, 9.4, .045], [4.05, 3.9, 10.9, .045], [4.86, 2.48, 25.9, .05], [-4.86, 5.73, -12.1, .05]],

    // What stands in the way [width, depth, height]; the rest can be walked through.
    hardProps: {barrel_03: [.66, .66, .93], wine_barrel_01: [.78, .78, .87], wooden_crate_02: [.56, 1.18, .47], wooden_crate_01: [.84, .42, .35], painted_wooden_table: [2.4, 1.14, .96], vintage_day_bed: [1.98, .86, .6], painted_wooden_cabinet: [1.2, .64, 1.2], painted_wooden_bench: [1.17, .5, .5], wooden_table_02: [1.14, .72, .8], wooden_ladder_02: [1, .64, 1.7], propane_tank: [.36, .36, .55], moon_rock_02: [.9, .9, .6]},
    // [model, x, z, turned (degrees), lifted (metres above the ground), scale, tipped (degrees)].
    props: [
      // Lowest terrace: the street by house C.
      ['barrel_03', 4.45, 24.6], ['barrel_03', 4.4, 25.35, 40], ['wine_barrel_01', 4.35, 32.9, 15], ['wooden_crate_02', 4.35, 22.3], ['wooden_crate_01', 4.35, 22.3, 90, .47],
      ['potted_plant_04', 4.45, 28.3, 0, 0, 2.4], ['planter_pot_clay', 4.5, 29.1, 30, 0, 2.1], ['painted_wooden_bench', 4.4, 33.7, -90], ['industrial_wall_lamp', 4.98, 25.9, -90, 2.5],
      // The yard and the workshop on the west side.
      ['old_tyre', -4.5, 23.4, 0, .085, 1, 90], ['old_tyre', -4.45, 23.45, 40, .25, 1, 90], ['old_tyre', -5.6, 23.2, 0, .3, 1, 0], ['cement_bag', -4.2, 33.4, 10], ['cement_bag', -4.25, 33.45, -20, .18], ['cement_bag', -5, 33.6, 80],
      ['propane_tank', -11.2, 31.2], ['wooden_table_02', -9, 31.2], ['wooden_bucket_01', -6.6, 25.9, 20], ['wooden_ladder_02', -11, 26.4, 90], ['wooden_crate_02', -7.2, 31.2, 90], ['barrel_03', -5.9, 31.3, 10],
      ['moon_rock_02', -8, 18.3, 20, 0, 3.6], ['moon_rock_02', 10.5, 18.4, 70, 0, 4.4], ['moon_rock_02', -17, 22, 200, 0, 5],
      // Middle terrace: the open house, its door and the street in front.
      ['painted_wooden_bench', -3.6, 7.6, 90], ['painted_wooden_stool', -3.6, 9], ['planter_pot_clay', -3.75, 10, 0, 0, 2], ['potted_plant_04', -3.7, 10.7, 60, 0, 2],
      ['painted_wooden_table', -8.2, 9.4], ['painted_wooden_chair_01', -8.9, 8.35, 190], ['painted_wooden_chair_01', -7.5, 8.4, 170], ['painted_wooden_chair_01', -8.3, 10.5, 5], ['painted_wooden_bench', -4.95, 10.4, -90], ['vintage_day_bed', -9.6, 12.12, 180],
      ['painted_wooden_cabinet', -9.4, 2.78, 0, .38], ['painted_wooden_shelves', -6.4, 2.37], ['wooden_table_02', -5.3, 3.5, 90], ['vintage_oil_lamp', -5.3, 3.4, 0, .8, .55], ['wooden_bowl_02', -8.5, 9.3, 0, .96, 2.2], ['brass_pot_02', -7.6, 9.7, 30, .96], ['metal_jug', -11.9, 5.4, 0, 0, 1.7],
      ['ceramic_pot', -12, 12.1, 40], ['wooden_lantern_01', -8.2, 9.4, 30, 2.4],
      // The shop: goods on the counter and the shelves, barrels at the door.
      ['ceramic_vase_04', 4.3, 9.7, 0, .96], ['brass_pot_02', 4.35, 10.5, 50, .96], ['ceramic_pot', 4.35, 11.6, 0, .96, .8], ['planter_pot_clay', 4.3, 12.2, 0, .96, 1.3],
      ['painted_wooden_shelves', 10.62, 8.2, -90], ['painted_wooden_shelves', 10.62, 9, -90], ['painted_wooden_shelves', 10.62, 12.4, -90], ['barrel_03', 9.8, 6.95, 20], ['wooden_crate_01', 7.6, 13.2, 10], ['painted_wooden_stool', 6.4, 11],
      ['wooden_lantern_01', 4.05, 10.9, 0, 2.2], ['wooden_crate_02', 3.55, 13.3, 8], ['barrel_03', 3.5, 5.1, 0],
      // The lean-to yard north of the shop.
      ['wooden_crate_02', 9.8, 1.4, 90], ['old_tyre', 5.1, 1, 25, .3], ['barrel_03', 5.2, 5.1], ['barrel_03', 5.95, 5.2, 70], ['cement_bag', 8.6, 3.2, 40],
      ['moon_rock_02', 15, -4.9, 10, 0, 3.4], ['moon_rock_02', -17, -4.8, 100, 0, 4.2], ['metal_jug', -5, -1.2, 0, 0, 1.7], ['ceramic_pot', -5, -2, 70],
      // Top terrace.
      ['painted_wooden_bench', -4.4, -16, 90], ['planter_pot_clay', -4.5, -14.4, 0, 0, 2.2], ['painted_wooden_stool', -4.4, -11.6, 30], ['industrial_wall_lamp', -4.98, -12.1, 90, 5.75],
      ['wooden_crate_01', 3.9, -18.6, 5], ['wine_barrel_01', 3.95, -12.6], ['propane_tank', 4, -19.6],
      ['wooden_bucket_01', -15.4, -24.8, 0], ['barrel_03', 17.6, -28.4], ['cement_bag', 15.4, -28.6, 30],
    ],
  },
};
