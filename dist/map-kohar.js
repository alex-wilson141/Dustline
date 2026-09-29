// Build 21: Kohar Valley, map 1, as a description the game loads. Everything that says where something is lives here:
// the ground, the edges, the navigation grid, what is built and where, where everybody starts, the objectives, the
// enemy posts and routes, and the Ambush arena. The game builds the world from the active map (dist/maps.js) and reads
// these values when it needs them; nothing here is repeated in game.js. How things behave (speeds, damage, prices that
// follow a rule, wave sizes) is not map data and stays where it was.
// Every number is the one Build 20 had in code: tests/test-mapdata-b21.mjs compares the world built from this file with
// the world as Build 20 built it (tests/fixtures/kohar-b20.json), and the recorded traces replay on it.
import './build.js'; // DEPLOY-01 upgrade guard

export const KOHAR = {
  id: 'kohar', name: 'Kohar Valley',
  // Height of the ground at (x, z), in metres.
  height: (x, z) => .42 * Math.sin(x * .047) * Math.cos(z * .055) + .14 * Math.sin(z * .13),
  terrain: {size: 1100, segments: 180},
  // The sky is a bundled file under assets/ (the game asks for it through assetURL, like every asset).
  sky: {asset: 'kloofendal_48d_partly_cloudy_puresky_1k.hdr', colour: '#a7b5b4', fog: '#b4b9ad', fogDensity: .0027},
  sun: {at: [-55, 68, -45], reach: 110, near: 1, far: 300},
  // The mountains around the valley: a ring of `bands` rows starting `inner` metres out, `step` metres apart.
  ridge: {sectors: 220, bands: 26, inner: 130, step: 20},
  // Nobody can walk past these (x and z, metres).
  edges: {x: [-85, 85], z: [-90, 80]},
  // The navigation grid: `cells` by `cells` squares of `step` metres, the first centred on (`origin`, `origin`).
  nav: {origin: -90, step: 2, cells: 91},
  // A teammate's reported position is believed only inside these (co-op).
  reach: {x: 90, z: 95},

  // Houses [x, z, width, depth, wall height], each with two doors, two windows and a furnished room.
  buildings: [[-24, 12, 10, 9, 3.6], [-24, -10, 12, 10, 4.3], [-20, -38, 11, 9, 3.8], [25, 22, 11, 11, 4], [21, -9, 12, 10, 4.6], [26, -36, 13, 11, 3.8], [-9, -62, 10, 9, 4.2], [16, -67, 12, 9, 3.5], [-49, -15, 9, 12, 3.5], [48, -8, 10, 10, 3.8], [-45, -48, 10, 10, 4.5], [48, -49, 11, 9, 3.8]],
  // Plaster walls 1.2 m high [x, z, width, depth].
  lowWalls: [[-10, 12, 10, .55], [11, -17, 9, .55], [-10, -35, 9, .55], [10, -46, 8, .55], [-38, 28, 16, .6], [36, 34, 17, .6], [-5, -73, 22, .6]],
  sandbags: [[-8, 30], [9, 7], [-8, -16], [6, -34], [6, -60], [33, -22], [-35, -4]],
  // Scattered by the seeded generator inside these ranges; `clear` keeps the road along x = 0 free.
  rocks: {count: 100, x: [-95, 95], z: [-105, 75], clear: 15},
  shrubs: {count: 55, x: [-90, 90], z: [-100, 65], clear: 18},
  poles: [[-15, 35], [16, -3], [-15, -37], [18, -69]],
  wire: [[-15, 8.5, 35], [.5, 6.8, 16], [16, 8.5, -3], [.5, 6.4, -20], [-15, 8.5, -37], [1.5, 6.2, -53], [18, 8.5, -69]],
  // Brick walls 1.7 m high [x, z, width, depth] (the Ambush arena lowers four of them, see ambush.walls).
  brickWalls: [[-40, 14, .6, 24], [-40, 2, 12, .6], [-36, 27, 8, .6], [37, 4, .6, 20], [31, -7, 12, .6], [-5, 26, 12, 1], [0, 7, 1, 17], [33, -38, 16, .6], [-48, -35, 18, .6]],
  stalls: [[-8, 16], [9, 0], [-7, -25], [34, 17]],
  crates: [[-14, 34], [-16, 34], [15, 30], [32, 8], [-35, -2], [-30, -27], [10, -42], [12, -42], [42, -34], [-45, -60]],
  trucks: [[16, 39], [-38, -26]],
  pebbles: {count: 500, x: [-70, 70], z: [-82, 65]},
  trees: [[-46, 35], [40, 36], [-46, -8], [49, -30], [-13, -69], [33, -64]],
  dust: {count: 200, x: [-80, 80], y: [.2, 12], z: [-80, 70]},
  // Build 08 clutter and street cover: [type, x, z, width (x), depth (z), solid (collision + cover), yaw of loose items].
  props: [
  ["sacks", -21.8, 8.08, 1.2, .7, 0, -.112], ["tyres", -21.8, 15.77, 1, 1, 1, .12], ["jerrycans", -29, -15.73, 1, 1, 0, .116], ["crates2", -29, -14.27, 1, 1, 1, -.111], ["tyres", -26.4, -15.73, 1, 1, 1, .002], ["jerrycans", -21.8, -15.73, 1, 1, 0, .026],
  ["jerrycans", -19.2, -15.73, 1, 1, 0, -.13], ["crate", -26.4, -5.73, 1, 1, 1, .082], ["pots", -21.8, -5.73, 1, 1, 0, -.022], ["crates2", -19.2, -5.73, 1, 1, 1, -.138], ["tyres", -19.2, -4.27, 1, 1, 1, .139], ["barrels", -30.68, -14, .9, 1.3, 1, -.133],
  ["crate", -30.73, -8, 1, 1, 1, -.031], ["crate", -29.27, -8, 1, 1, 1, .129], ["crates2", -24.5, -43.23, 1, 1, 1, -.01], ["crates2", -24.5, -41.77, 1, 1, 1, -.115], ["pots", -17.8, -43.23, 1, 1, 0, -.113], ["crate", -24.5, -34.23, 1, 1, 1, .01],
  ["pots", -24.5, -32.77, 1, 1, 0, -.032], ["tyres", 27.2, 15.77, 1, 1, 1, -.082], ["crate", 27.2, 17.23, 1, 1, 1, -.015], ["barrels", 20.5, 28.18, 1.3, .9, 1, -.1], ["crates2", 27.2, 26.77, 1, 1, 1, -.097], ["crate", 27.2, 28.23, 1, 1, 1, .043],
  ["sacks", 20.08, 24, .7, 1.2, 0, -.134], ["crates2", 29.77, 24, 1, 1, 1, .026], ["pots", 18.6, -13.27, 1, 1, 0, .109], ["sacks", 23.2, -14.58, 1.2, .7, 0, .075], ["jerrycans", 23.2, -13.27, 1, 1, 0, -.138], ["barrels", 25.8, -14.68, 1.3, .9, 1, -.121],
  ["crate", 16, -3.27, 1, 1, 1, .056], ["crates2", 18.6, -3.27, 1, 1, 1, .086], ["sacks", 23.2, -3.42, 1.2, .7, 0, .081], ["sacks", 25.8, -4.58, 1.2, .7, 0, .032], ["pots", 14.27, -13, 1, 1, 0, -.112], ["crate", 15.73, -7, 1, 1, 1, .016],
  ["jerrycans", 27.73, -13, 1, 1, 0, -.034], ["sacks", 27.58, -7, .7, 1.2, 0, -.104], ["crates2", 20.5, -42.23, 1, 1, 1, -.026], ["crates2", 23.1, -42.23, 1, 1, 1, -.143], ["jerrycans", 28.2, -42.23, 1, 1, 0, .066], ["barrels", 30.8, -40.82, 1.3, .9, 1, -.019],
  ["sacks", 23.1, -31.08, 1.2, .7, 0, -.056], ["barrels", 23.1, -29.82, 1.3, .9, 1, -.102], ["tyres", 18.77, -40.5, 1, 1, 1, -.015], ["crate", 20.23, -40.5, 1, 1, 1, -.087], ["barrels", 18.82, -34, .9, 1.3, 1, .044], ["pots", 33.23, -40.5, 1, 1, 0, .03],
  ["crate", -13, -67.23, 1, 1, 1, .137], ["sacks", -13, -65.92, 1.2, .7, 0, .023], ["tyres", -6.8, -67.23, 1, 1, 1, .119], ["barrels", -6.8, -65.82, 1.3, .9, 1, .142], ["jerrycans", -13, -58.23, 1, 1, 0, -.057], ["tyres", -13, -56.77, 1, 1, 1, -.148],
  ["jerrycans", 11, -72.23, 1, 1, 0, -.05], ["crate", 11, -70.77, 1, 1, 1, .088], ["pots", 13.6, -72.23, 1, 1, 0, .071], ["crates2", 13.6, -70.77, 1, 1, 1, .087], ["jerrycans", 18.2, -72.23, 1, 1, 0, .088], ["sacks", 18.2, -70.92, 1.2, .7, 0, -.047],
  ["sacks", 20.8, -70.92, 1.2, .7, 0, .149], ["sacks", 18.2, -63.08, 1.2, .7, 0, .148], ["sacks", 18.2, -61.92, 1.2, .7, 0, .117], ["crate", 20.8, -63.23, 1, 1, 1, -.042], ["sacks", -54.08, -13, .7, 1.2, 0, .098], ["pots", -52.77, -13, 1, 1, 0, -.102],
  ["crate", -54.23, -10.4, 1, 1, 1, -.031], ["tyres", -52.77, -10.4, 1, 1, 1, -.043], ["jerrycans", -43.77, -17.4, 1, 1, 0, -.059], ["tyres", -45.23, -13, 1, 1, 1, .002], ["crates2", -43.77, -13, 1, 1, 1, .125], ["pots", 44, -13.73, 1, 1, 0, .07],
  ["tyres", 50.2, -13.73, 1, 1, 1, .029], ["jerrycans", 50.2, -12.27, 1, 1, 0, .139], ["crate", 44, -2.27, 1, 1, 1, .08], ["pots", 42.27, -12, 1, 1, 0, -.101], ["crates2", 43.73, -12, 1, 1, 1, -.092], ["crates2", 42.27, -6, 1, 1, 1, -.122],
  ["pots", 43.73, -6, 1, 1, 0, .079], ["sacks", -42.8, -52.42, 1.2, .7, 0, .068], ["jerrycans", -42.8, -43.73, 1, 1, 0, .076], ["crate", -42.8, -42.27, 1, 1, 1, .042], ["tyres", -50.73, -52, 1, 1, 1, -.07], ["barrels", -49.32, -52, .9, 1.3, 1, .053],
  ["crate", -39.27, -52, 1, 1, 1, .008], ["pots", -40.73, -46, 1, 1, 0, -.085], ["pots", 50.2, -54.23, 1, 1, 0, -.046], ["pots", 43.5, -45.23, 1, 1, 0, -.024], ["crate", 50.2, -45.23, 1, 1, 1, -.09], ["cart", -68.45, 24.44, 2.4, 1.3, 1, 0],
  ["cart", 17.9, -78.26, 2.4, 1.3, 1, 0], ["crates2", -13.71, -12.02, 1, 1, 1, 0], ["crates2", -42.49, 48.69, 1, 1, 1, 0], ["crates2", -19.35, 24.26, 1, 1, 1, 0], ["fence", -18.84, -39.01, 3.4, .14, 1, 0], ["sandbag", 45.12, 5.3, 3.2, .7, 1, 0],
  ["crates2", -.21, -16.72, 1, 1, 1, 0], ["crates2", 30.19, 56.43, 1, 1, 1, 0], ["cart", -59.01, -70.92, 1.3, 2.4, 1, 0], ["barrier", -41.55, 45.64, 3, .6, 1, 0], ["sandbag", 4.96, 41.44, 3.2, .7, 1, 0], ["fence", 42.65, 12.15, 3.4, .14, 1, 0],
  ["fence", -26.99, -53.6, .14, 3.4, 1, 0], ["sandbag", 66.15, 8.18, .7, 3.2, 1, 0], ["sandbag", -64.67, -35.55, .7, 3.2, 1, 0], ["cart", 60.14, -5.97, 1.3, 2.4, 1, 0], ["cart", -36.34, -49.92, 1.3, 2.4, 1, 0], ["sandbag", 38.04, 30.21, 3.2, .7, 1, 0],
  ["crates2", 57.42, -70.59, 1, 1, 1, 0], ["cart", 50, 62.06, 1.3, 2.4, 1, 0], ["fence", 67.37, 41.46, 3.4, .14, 1, 0], ["crates2", 45.43, -61.21, 1, 1, 1, 0], ["fence", 41.89, 5.34, .14, 3.4, 1, 0], ["crates2", 18.8, 48.6, 1, 1, 1, 0],
  ["crates2", 40.33, -2.44, 1, 1, 1, 0], ["crates2", 32.59, -55.63, 1, 1, 1, 0], ["fence", 64.34, -26.39, 3.4, .14, 1, 0], ["sandbag", -14.84, -52.75, .7, 3.2, 1, 0], ["cart", -24.79, -69.59, 1.3, 2.4, 1, 0], ["fence", 56.26, 12.24, 3.4, .14, 1, 0],
  ["sandbag", 1.33, -27.69, 3.2, .7, 1, 0], ["cart", -35.96, -9.69, 2.4, 1.3, 1, 0], ["barrier", -32.71, 47.57, .6, 3, 1, 0], ["debris", -45.48, -4.25, .6, .6, 0, 1.96], ["debris", 69.86, -76.64, .6, .6, 0, 2.88], ["debris", -.35, -71.43, .6, .6, 0, 4.03],
  ["debris", -7.34, -76.68, .6, .6, 0, 1.68], ["debris", 50.76, -69.57, .6, .6, 0, 2.48], ["debris", -51.53, 53.11, .6, .6, 0, 2.67], ["debris", 66.05, -.26, .6, .6, 0, .18], ["debris", 52.21, 24.91, .6, .6, 0, 4.82], ["debris", 38.37, -13.62, .6, .6, 0, 2.66],
  ["debris", -17.96, 27.28, .6, .6, 0, 4.91], ["debris", -45.65, 37.43, .6, .6, 0, .66], ["debris", -21.84, -76.57, .6, .6, 0, 3.44], ["debris", -44.89, 52.08, .6, .6, 0, 1.37], ["debris", 10, -49.14, .6, .6, 0, 5.12], ["debris", 48.51, 41.51, .6, .6, 0, 3.82],
  ["debris", -60.67, 33.5, .6, .6, 0, 5.03], ["debris", 26.95, -39.32, .6, .6, 0, .49], ["debris", 68.67, -38.29, .6, .6, 0, .15], ["debris", 14.48, -38, .6, .6, 0, .2], ["debris", -38.97, -46.89, .6, .6, 0, 1.98], ["debris", 27.11, 40.25, .6, .6, 0, .48],
  ["debris", 52.31, 10.43, .6, .6, 0, .68], ["debris", 58.81, 36.65, .6, .6, 0, 5.15], ["debris", 64.45, -2.01, .6, .6, 0, 4.91], ["debris", 65.3, 54.27, .6, .6, 0, 1.9], ["debris", 68.63, -30.89, .6, .6, 0, 1.53], ["debris", -24.76, -59.81, .6, .6, 0, 1],
  ["debris", 25.02, 64.91, .6, .6, 0, 2], ["debris", 22.87, 22.32, .6, .6, 0, 2.69], ["debris", -18.28, -75.88, .6, .6, 0, 3.89], ["debris", -57.13, 55.98, .6, .6, 0, 1.01], ["debris", 39.91, 36.19, .6, .6, 0, .37], ["debris", -59.75, -10.86, .6, .6, 0, 3.2],
  ["debris", 55.04, 67.09, .6, .6, 0, 1.29], ["debris", 47.01, -62.96, .6, .6, 0, 2.77], ["debris", 12.38, -79.06, .6, .6, 0, 4.69], ["debris", 31.44, -54.13, .6, .6, 0, 4.41], ["debris", -71.78, -60.32, .6, .6, 0, 2.64], ["debris", -6.6, -74.06, .6, .6, 0, 1.64],
  ["debris", 10.42, 32.43, .6, .6, 0, .8], ["debris", 54.54, -43.94, .6, .6, 0, 5.6], ["debris", -38.12, 66.53, .6, .6, 0, 4.24], ["debris", 45.38, -18.37, .6, .6, 0, 5.37], ["debris", -3.71, 18.23, .6, .6, 0, 1.99], ["debris", 33.03, -16.68, .6, .6, 0, 3.47],
  ["debris", 14.53, -26.34, .6, .6, 0, 1.69], ["debris", -10.84, -68.63, .6, .6, 0, 3.2], ["debris", 52.19, -51.8, .6, .6, 0, 2.51], ["debris", 48.51, 24.2, .6, .6, 0, .19], ["debris", 64.08, 20.4, .6, .6, 0, 4.99], ["debris", -7.25, 13.82, .6, .6, 0, 2.96],
  ["debris", -29.26, -75.03, .6, .6, 0, 4.3], ["debris", -71.11, 23.25, .6, .6, 0, 2.69], ["debris", 43.36, 63.13, .6, .6, 0, 3.99], ["debris", 7.3, -74.86, .6, .6, 0, 4], ["debris", -71.63, 16.09, .6, .6, 0, 3.04], ["debris", -54.4, 51.17, .6, .6, 0, 1.53],
  ["debris", 63.21, -3.87, .6, .6, 0, 1.76], ["debris", -60.67, -28.45, .6, .6, 0, 4.32], ["debris", -23.72, -16.74, .6, .6, 0, 2.25],
],

  // Objectives. The route log is in the house at `log.at`: it lies on the table `lies` from there (x, height, z) and is
  // picked up within reach of the spot `reach` from there (x, z); `log.door` is the spot outside the door (diagnostics).
  relay: [0, -47],
  log: {at: [-24, -10], lies: [3.36, .88, 1], reach: [2, 0], door: [-24, -4.7]},
  extraction: [40, 43],
  // Where everybody starts: the player, a co-op guest, the three squadmates and the co-op teammate's figure.
  starts: {player: [0, 55], guest: [3, 55], squad: [[-3, 58], [0, 59], [3, 60]], mate: [3, 61]},

  enemies: {
    // Fixed enemy spawns. (12,-17) sat inside the low wall at (11,-17) (AI-02); every spawn is also validated at runtime.
    spawns: [[-13, 2], [12, -19], [-30, -26], [34, -26], [-6, -45], [8, -55], [-36, -45]],
    // Patrol loops (every leg checked with pathTo in Step A). Stage-0 loops stay 45 m+ from the player start.
    loops: {
      MW: [[-32, 4], [-14, 4], [-14, -20], [-34, -20], [-40, -6]],
      MC: [[-6, 8], [4, 2], [4, -8], [-4, -22], [-16, -8]],
      ME: [[16, 12], [34, 12], [40, -18], [18, -22], [12, 2]],
      RING: [[-18, -30], [18, -30], [22, -48], [24, -76], [-2, -80], [-24, -74], [-22, -48]],
      SW: [[-30, -32], [-54, -38], [-56, -60], [-34, -62], [-28, -48]],
      SE: [[32, -28], [56, -40], [58, -60], [34, -62], [38, -46]],
      NW: [[-24, 26], [-48, 26], [-54, 44], [-28, 46]],
      NE: [[24, 32], [48, 30], [52, 50], [30, 52]],
    },
    // Per original enemy (index 0-6). Two hold the relay; the rest patrol sectors.
    assign: ['MC', 'ME', 'MW', 'SE', 'GARRISON', 'GARRISON', 'SW'],
    // Loops a reinforcement joins after its entry chain, by stage.
    reinforceLoops: {0: ['MW', 'MC', 'SW'], 1: ['RING', 'SW', 'SE'], 2: ['ME', 'NE'], skirmish: ['RING', 'SW', 'SE']},
    // Reinforcement entry points: spawn point, then entry legs. Stages where each may be used.
    reinforcePoints: [
      {chain: [[80, 10], [52, -4], [40, -18]], stages: [0, 1, 2]},
      {chain: [[-80, -14], [-52, -20], [-40, -6]], stages: [0, 1, 2]},
      {chain: [[-60, -84], [-48, -66], [-56, -60]], stages: [0, 1, 2]},
      {chain: [[64, -84], [58, -60]], stages: [0, 1, 2]},
      {chain: [[30, -86], [34, -62]], stages: [0, 1, 2]},
      {chain: [[-24, -86], [-34, -62]], stages: [0, 1, 2]},
      {chain: [[-80, 40], [-54, 44]], stages: [0, 1, 2]},
      {chain: [[-52, -20], [-40, -6]], stages: [1, 2]},
      {chain: [[52, -4], [40, -18]], stages: [0, 1, 2]},
      {chain: [[-48, -44], [-54, -38]], stages: [0, 1, 2]},
      {chain: [[12, -64], [24, -76]], stages: [0, 2]},
      {chain: [[20, -8], [18, -22]], stages: [0, 1, 2]},
    ],
  },

  // The Ambush arena, in the west district.
  ambush: {
    start: [-30, 20],            // player start, in the courtyard (area 1)
    firstArea: 1,                // open from the start
    // The brick walls in and around the arena ([x, z, width, depth]), lowered to AMBUSH.arenaWallHeight in Ambush.
    walls: [[-40, 14, .6, 24], [-40, 2, 12, .6], [-36, 27, 8, .6], [-48, -35, 18, .6]],
    // The four areas (axis-aligned rectangles, x and z ranges in metres).
    areas: [
      {id: 1, name: 'Courtyard', x: [-40, -19], z: [2, 28]},
      {id: 2, name: 'Field office yard', x: [-40, -12], z: [-24, 2]},
      {id: 3, name: 'West lane', x: [-58, -40], z: [-24, 2]},
      {id: 4, name: 'North houses', x: [-52, -12], z: [-54, -24]},
    ],
    // Purchasable barricades: a sandbag line along the border with a timber section at the purchase point. Buying
    // removes the whole line and opens `opens`; it can be bought from inside `from` once that area is open.
    gates: [
      {id: 'g12', from: 1, opens: 2, price: 750, a: [-34, 2], b: [-19, 2], station: [-26.5, 2]},
      {id: 'g23', from: 2, opens: 3, price: 1000, a: [-40, -24], b: [-40, 2], station: [-40, -8]},
      {id: 'g24', from: 2, opens: 4, price: 1250, a: [-40, -24], b: [-12, -24], station: [-26, -24]},
    ],
    // One weapon crate per area, selling one of the four class rifles (unchanged weapon stats).
    stations: [
      {area: 1, weapon: 'medic', price: 500, at: [-36, 24]},
      {area: 2, weapon: 'assault', price: 750, at: [-24, -1]},
      {area: 3, weapon: 'marksman', price: 1000, at: [-50, -3]},
      {area: 4, weapon: 'support', price: 1250, at: [-20, -46]},
    ],
    // What the full-screen map shows (x and z ranges).
    chart: {x: [-62, -8], z: [-58, 32]},
    // Hostiles may arrive at spots on this lattice (x and z ranges, metres apart), filtered by the spawn rules.
    spots: {x: [-86, 12], z: [-86, 44], step: 4},
  },
};
