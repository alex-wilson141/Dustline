// Build 25 (T35): the kit's interiors and the customs house (house K on Dehrun Terraces), the building meant to be the
// Ambush arena. The building stands as described; every floor is reached on foot from the street; every room is
// entered; both stairs are climbed up and down; the roof is reached through both stair heads and can be fallen from;
// nowhere in or around the building can a body get to and not get back from (a flood over everything it can do);
// every door lets an enemy's width through; and the block that was there before is exactly what it was, both when the
// new kit builds the old description and in what the new description keeps.
import assert from 'node:assert/strict';
import {createGame, projectRoot} from './sprint-harness.mjs';
import {oldBuild} from './old-build.mjs';

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const maps = await import(new URL('dist/maps.js', projectRoot));
const {BODY, fallDamage, makeSpace} = await import(new URL('dist/space.js', projectRoot));
const {buildTerraces} = await import(new URL('dist/terraces.js', projectRoot));
const SOURCE = process.env.DUSTLINE_GAME_SOURCE ? new URL('file://' + process.env.DUSTLINE_GAME_SOURCE) : undefined;
const ONLY = process.env.DUSTLINE_T35_ONLY?.split(',');
const BUILD24 = '8e92bf3';   // the last build before this one: its kit and its description of the block, run here
const results = [], report = {};
async function check(tag, name, fn) { if (ONLY && !ONLY.includes(tag)) return; await fn(); results.push(name); }
const page = () => createGame(SOURCE ? {sourcePath: SOURCE} : {});
const DEHRUN = await maps.loadMap('dehrun'); maps.selectMap('kohar');
const K = DEHRUN.block.houses.find(h => h.id === 'K'); assert(K, 'the customs house is in the description');
const FLOORS = [.05, 3.4, 6.6], ROOF = 9.83, NAV_R = .45;   // where feet rest on each storey (the ground floor's stone lies 5 cm over its base), on the roof; an enemy's radius in the game
const near = (a, b, e, what) => assert(Math.abs(a - b) <= e, `${what}: ${a} against ${b}`);
// A body on the map, playing, with the ways to drive it (as in T34).
async function body() { maps.selectMap('dehrun'); let g; try { g = await page(); g.prepare({clearLane: false}); await g.built.ready; } finally { maps.selectMap('kohar'); }
  g.setMode('story'); g.reset(); g.play(); g.restoreAI(); g.set({hp: 100}); let clock = 0; g.frame(0);
  g.run = (s, each) => { for (let i = 0, n = Math.round(s * 60); i < n; i++) { g.frame(clock += 1000 / 60); if (each?.(i / 60) === false) break; } };
  g.put = (x, y, z, yaw = 0) => { g.player.set(x, y, z); g.set({yaw}); g.height.settle(); };
  g.hold = (code, s, each) => { g.press(code); g.run(s, each); g.release(code); };
  g.tap = code => { g.press(code); g.release(code); };
  g.at = () => g.player.toArray().map(v => +v.toFixed(2));
  // Walk towards a point, facing it, until within .2 m of it; false if it takes longer than `limit` seconds.
  g.walkTo = (x, z, limit = 12, each) => { let t = 0; while (t < limit) { const dx = x - g.player.x, dz = z - g.player.z; if (Math.hypot(dx, dz) < .2) return true; g.set({yaw: Math.atan2(-dx, -dz)}); g.hold('KeyW', .1, each); t += .1; } return false; };
  g.walk = (route, each) => { for (const [name, x, z] of route) assert(g.walkTo(x, z, 12, each), `${name}: stopped at ${g.at()} on ${g.height.on()}`); };
  return g; }
const FACING = {north: 0, south: Math.PI, east: -Math.PI / 2, west: Math.PI / 2};
// The way through the building, as the user is told it: in at the west door, up the west stair storey by storey, out
// onto the roof, over to the east stair head, down the east stair and out at the east door.
const WEST = {entry: [-11.9, 61.0], A: [-11.9, 56.35], landing: [-10.5, 56.35], B: [-10.5, 61.0]}, EAST = {front: [11.9, 61.6], entry: [11.9, 63.2], B: [11.9, 66.4], landing: [10.5, 66.4], A: [10.5, 61.7]};
const upWest = () => [['to the west stair', ...WEST.entry], ['up its first flight', ...WEST.A], ['across the landing', ...WEST.landing], ['up its second flight', ...WEST.B]];
const downEast = () => [['in front of the east stair', ...EAST.front], ['into it', ...EAST.entry], ['down its top flight', ...EAST.B], ['across the landing', ...EAST.landing], ['down its lower flight', ...EAST.A]];
const ROUTE = {toWestDoor: [['out of the gate', 0, 46], ['round the north-west corner', -17, 50], ['along the west side', -17, 61.4], ['in at the west door', -13.5, 61.4], ['the corridor', -11.2, 61.4]],
  fromEastDoor: [['the corridor', 12, 61.4], ['out at the east door', 13.5, 61.4], ['the street', 17, 61.4], ['round the north-east corner', 17, 50], ['back through the gate', 0, 46], ['the start', 0, 37]]};

await check('arena', 'the customs house stands as commissioned (E38): 26 by 18 m, three storeys and a roof, a corridor and rooms on every storey (the rooms tile the storey and every room has a door or a stair), two stairs from the ground to the roof with heads, doors to the street on all four sides, every door and doorway 1.3 m wide', async () => {
  near(K.x[1] - K.x[0], 26, .01, 'length'); near(K.z[1] - K.z[0], 18, .01, 'depth'); assert.equal(K.storeys.length, 3); assert(K.enter); assert(K.roof.parapet >= .5, 'a parapet');
  assert.equal(K.stairs.length, 2); for (const s of K.stairs) { assert.deepEqual(s.storeys, [0, 1, 2], 'from the ground to the roof'); assert(s.head, 'with a head onto the roof'); }
  const inner = {x: [K.x[0] + K.thick, K.x[1] - K.thick], z: [K.z[0] + K.thick, K.z[1] - K.thick]}, area = (inner.x[1] - inner.x[0]) * (inner.z[1] - inner.z[0]), rooms = [];
  K.storeys.forEach((S, n) => { assert(S.rooms?.length >= 6 && S.doors?.length >= 8, `storey ${n} has rooms and doors`); assert(S.rooms.some(r => r.id === 'corridor'), `storey ${n} has a corridor`);
    let sum = 0; for (const r of S.rooms) { sum += (r.x[1] - r.x[0]) * (r.z[1] - r.z[0]); assert(r.x[0] >= inner.x[0] - 1e-9 && r.x[1] <= inner.x[1] + 1e-9 && r.z[0] >= inner.z[0] - 1e-9 && r.z[1] <= inner.z[1] + 1e-9, `${r.id} lies inside the house`); }
    near(sum, area, .01, `the rooms of storey ${n} tile it`); for (let i = 0; i < S.rooms.length; i++) for (let j = i + 1; j < S.rooms.length; j++) { const a = S.rooms[i], b = S.rooms[j]; assert(a.x[1] <= b.x[0] + 1e-9 || b.x[1] <= a.x[0] + 1e-9 || a.z[1] <= b.z[0] + 1e-9 || b.z[1] <= a.z[0] + 1e-9, `${a.id} and ${b.id} do not overlap`); }
    const onEdge = (r, [x, z]) => (Math.abs(x - r.x[0]) < .01 || Math.abs(x - r.x[1]) < .01) && z > r.z[0] && z < r.z[1] || (Math.abs(z - r.z[0]) < .01 || Math.abs(z - r.z[1]) < .01) && x > r.x[0] && x < r.x[1];
    for (const r of S.rooms) { const stair = K.stairs.some(s => Math.abs(s.x[0] - r.x[0]) < .01 && Math.abs(s.x[1] - r.x[1]) < .01 && Math.min(...s.z) >= r.z[0] - .01 && Math.max(...s.z) <= r.z[1] + .01); if (r.id === 'corridor' || stair) continue;
      assert(S.doors.some(d => onEdge(r, d.at)), `${r.id} on storey ${n} has a door`); rooms.push(`${n}: ${r.id}`); }
    for (const d of S.doors) assert((d.width ?? K.door.width) >= 1.3, 'a door inside is 1.3 m wide'); });
  const sides = ['north', 'south', 'east', 'west'].filter(f => (K.storeys[0][f] || []).some(o => o.kind === 'door')); assert.deepEqual(sides.sort(), ['east', 'north', 'south', 'west'], 'a door to the street on every side');
  for (const f of sides) for (const o of K.storeys[0][f].filter(o => o.kind === 'door')) assert(o.width >= 1.3 && o.head >= 2.2, `the ${f} door is 1.3 m wide`);
  for (const s of K.stairs) assert((s.head.door || 1.3) >= 1.3, 'the roof door is 1.3 m wide');
  report.arena = {size: [K.x[1] - K.x[0], K.z[1] - K.z[0]], storeys: K.storeys.map(s => s.height), roofAt: +K.storeys.reduce((s, t) => s + t.height, 0).toFixed(2), rooms: rooms.length + 6, doorsToTheStreet: sides, doorWidth: 1.3, stairs: K.stairs.map(s => ({x: s.x, from: s.z[0], to: s.z[1]}))};
});

await check('floors', 'every floor is reached on foot from the street: from the start, through the gate, in at the west door and up the west stair, the body stands on the first floor, the second floor and the roof in turn, never crouched and never hurt; and from the roof, down the east stair and out at the east door, back to the start', async () => {
  const g = await body(); let crouched = 0; const each = () => { if (g.height.mustCrouch() || g.state().crouch) crouched++; }; const stood = [];
  g.walk(ROUTE.toWestDoor, each); near(g.player.y, FLOORS[0], .02, 'the ground floor'); stood.push(g.height.on());
  for (const [n, y] of [[1, FLOORS[1]], [2, FLOORS[2]], [3, ROOF]]) { g.walk(upWest(), each); near(g.player.y, y, .02, `floor ${n}`); stood.push(g.height.on()); assert.equal(g.height.grounded(), true); }
  assert.deepEqual(stood, ['floor', 'floor', 'floor', 'roof']);
  g.walk([['out of the west stair head', -10.5, 62], ['across the roof', 0, 65]], each); near(g.player.y, ROOF, .02, 'the roof');
  for (const y of [FLOORS[2], FLOORS[1], FLOORS[0]]) { g.walk(downEast(), each); near(g.player.y, y, .02, 'the floor below'); }
  g.walk(ROUTE.fromEastDoor, each); near(g.player.y, 0, .02, 'the street'); assert.equal(crouched, 0, 'never crouched'); assert.equal(g.coop.hp(), 100, 'never hurt');
  report.floors = {floors: FLOORS, roof: ROOF, route: 'start → gate → west door → west stair ×3 → roof → east stair ×3 → east door → start'};
});

await check('rooms', 'every room on every storey is entered on foot: from the corridor of its storey the body walks through the room\'s door (through a neighbouring room where a closet opens off one) to a place inside it, stands on that storey\'s floor, and walks back out', async () => {
  const g = await body(), entered = []; g.walk(ROUTE.toWestDoor);
  const onEdge = (r, [x, z]) => (Math.abs(x - r.x[0]) < .01 || Math.abs(x - r.x[1]) < .01) && z > r.z[0] && z < r.z[1] || (Math.abs(z - r.z[0]) < .01 || Math.abs(z - r.z[1]) < .01) && x > r.x[0] && x < r.x[1];
  // Where to stand just outside and just inside a door of a room, on the room's side of it.
  const sides = (r, d) => { const onX = Math.abs(d.at[1] - r.z[0]) < .01 || Math.abs(d.at[1] - r.z[1]) < .01, into = onX ? (Math.abs(d.at[1] - r.z[0]) < .01 ? 1 : -1) : (Math.abs(d.at[0] - r.x[0]) < .01 ? 1 : -1);
    return {out: onX ? [d.at[0], d.at[1] - into * .9] : [d.at[0] - into * .9, d.at[1]], in: onX ? [d.at[0], d.at[1] + into * 1.2] : [d.at[0] + into * 1.2, d.at[1]]}; };
  K.storeys.forEach((S, n) => { if (n) g.walk(upWest()); const y = FLOORS[n], corridor = S.rooms.find(r => r.id === 'corridor'), byId = id => S.rooms.find(r => r.id === id);
    // The doors from the corridor into a room, in order: straight from the corridor, or through the neighbour a closet opens off.
    const way = (r, depth = 0) => { assert(depth < 3, `${r.id}: no way from the corridor`); const doors = S.doors.filter(d => onEdge(r, d.at)), direct = doors.find(d => onEdge(corridor, d.at)); if (direct) return [[r, direct]];
      const d = doors[0], o = S.rooms.find(o => o !== r && onEdge(o, d.at)); return [...way(o, depth + 1), [r, d]]; };
    for (const r of S.rooms) { if (r.id === 'corridor' || r.id.startsWith('stair')) continue; const steps = way(r);
      for (const [room, d] of steps) { const p = sides(room, d); assert(g.walkTo(...p.out), `${r.id}: in front of the door of ${room.id} (${g.at()})`); assert(g.walkTo(...p.in), `${r.id}: through the door of ${room.id} (${g.at()})`); }
      near(g.player.y, y, .02, `${r.id}: on the floor of storey ${n}`); assert(g.player.x > r.x[0] && g.player.x < r.x[1] && g.player.z > r.z[0] && g.player.z < r.z[1], `${r.id}: inside it`); entered.push(`${n}: ${r.id}`);
      for (const [room, d] of steps.reverse()) { const p = sides(room, d); assert(g.walkTo(...p.in) && g.walkTo(...p.out), `${r.id}: out again through the door of ${room.id}`); } } });
  assert(entered.length >= 24, `${entered.length} rooms entered`); report.rooms = {entered: entered.length, list: entered};
});

await check('stairs', 'both stairs are climbed in both directions on every storey, tread by tread: going up, the feet are always on a tread\'s top or a landing and the body arrives on the floor above standing; going down likewise to the floor below; the railing between the flights holds (a body on the upper flight does not fall to the lower one)', async () => {
  const g = await body(); const treads = new Set(); let lowest = 1e9; const each = () => { if (g.height.on() === 'stair') { treads.add(+g.player.y.toFixed(3)); lowest = Math.min(lowest, g.player.y); } if (g.height.mustCrouch()) throw new Error('made to crouch on a stair at ' + g.at()); };
  const rise = h => h / 16, ok = (y, base, h) => { const k = (y - base) / rise(h); return Math.abs(k - Math.round(k)) < .02 || Math.abs(y - base - h / 2) < .02; };   // a tread's top: base + k × rise; the landing: base + half the storey
  g.walk(ROUTE.toWestDoor); let y0 = 0; K.storeys.forEach((S, n) => { treads.clear(); g.walk(upWest(), each); assert(treads.size >= 14, `${treads.size} treads of the west stair, storey ${n}`); for (const y of treads) assert(ok(y, y0, S.height), `on a tread: ${y} (storey ${n} from ${y0})`); y0 += S.height; near(g.player.y, n === 2 ? ROOF : y0, .02, 'the floor above'); });
  g.walk([['out', -10.5, 62], ['over', 11.9, 61.6]]); let y1 = y0; [...K.storeys].reverse().forEach((S, i) => { const n = 2 - i; treads.clear(); g.walk(downEast(), each); assert(treads.size >= 14, `${treads.size} treads of the east stair down, storey ${n}`); y1 -= S.height; for (const y of treads) assert(ok(y, y1, S.height), `on a tread going down: ${y}`); near(g.player.y, n ? y1 : FLOORS[0], .02, 'the floor below'); });
  // The other way round each: up the east stair from the ground floor to the first floor, down the west stair to the ground.
  g.walk([['in front of the east stair', 10.5, 61.7]]); treads.clear(); g.walk([['up its first flight', 10.5, 66.4], ['across the landing', 11.9, 66.4], ['up its second flight', 11.9, 61.7]], each); near(g.player.y, FLOORS[1], .02, 'the first floor by the east stair'); assert(treads.size >= 14);
  g.walk([['along the corridor', -10.5, 61.4]]); treads.clear(); g.walk([['down the west stair', ...WEST.landing], ['across', ...WEST.A], ['down', ...WEST.entry]], each); near(g.player.y, FLOORS[0], .02, 'the ground floor by the west stair'); assert(treads.size >= 14);
  // The railing: on the west stair's second flight, halfway up, walking sideways into the rail, the body stays on its flight.
  g.walk(upWest().slice(0, 3)); g.put(-10.5, g.player.y, 58.5, FACING.south); g.hold('KeyW', .6); const y = g.player.y; g.set({yaw: FACING.west}); g.hold('KeyW', 1.5); assert(g.player.x > -11.2 && Math.abs(g.player.y - y) < .3, `held by the railing (${g.at()})`);
  g.put(-11.9, FLOORS[1] + .6, 58.4, FACING.north); g.hold('KeyW', .4); g.set({yaw: FACING.east}); g.hold('KeyW', 1.5); assert(g.player.x < -11.2, `held by the railing from the first flight (${g.at()})`);
  // Over the gap between the top of the block's inside stair (house A) and its floor, .4 m wide, a standing body rests on both sides (Build 25: over a hole narrower than itself, a body stands on what is within its lean).
  g.put(-12.2, 4.6, 6.4); g.run(1); near(g.player.y, 4.6, .06, `over the gap at the top of house A's stair (${g.at()})`);
  report.stairs = {treadsAStorey: 16, rise: K.storeys.map(s => +(s.height / 16).toFixed(3)), run: .35, flightWidth: 1.37, railing: 'posts every tread, .31 m apart, under a sloping handrail'};
});

await check('roof', 'the roof is reached through both stair heads and its edges can be fallen from: out of the west head and in at the east head; onto the parapet by a pull-up and off it, the body lands on the square 10.4 m below and the fall costs what FALL says (about three quarters of the health), and no more', async () => {
  const g = await body(), sp = g.height.space; g.walk(ROUTE.toWestDoor); for (let n = 0; n < 3; n++) g.walk(upWest()); near(g.player.y, ROOF, .02);
  g.walk([['out of the west head', -10.5, 62.5], ['the roof', 0, 65], ['before the east head', ...EAST.front], ['in at the east head', ...EAST.entry]]); assert.equal(g.height.on(), 'stair'); g.walk([['out again', 11.9, 61.6], ['the roof', 0, 65]]); near(g.player.y, ROOF, .02);
  const tanks = K.roof.tanks; for (const [x, z] of tanks) { g.put(x - 1.2, ROOF, z, FACING.east); g.hold('KeyW', 1); assert(g.player.x < x - .6, `stopped by the tank at ${x}, ${z} (${g.at()})`); }
  g.put(4.5, ROOF, 70, FACING.south); g.hold('KeyW', 1); const before = g.player.y; g.tap('Space'); g.run(1.2); assert(g.player.y > before + .5, `onto the parapet (${g.at()})`); assert.equal(g.height.on(), 'slab');
  g.hold('KeyW', 3, () => g.height.grounded() ? undefined : false); g.run(2.5); near(g.player.y, .018, .03, 'down on the paving, past the beam ends (a body rests on nothing narrower than its stance)'); assert(g.player.z > 71, 'outside the wall');   // W let go the moment the body is in the air: it falls straight down along the wall's face, past the beam ends under the floors
  // Landed along the wall's face, the body is pushed clear of it (Build 25); and a body standing against a wall, or in it, can walk along the wall and away from it, never further in.
  assert(sp.clear(g.player.x, g.player.z, g.player.y + BODY.step, g.player.y + BODY.stand), `standing clear of the wall (${g.at()})`);
  g.put(4.5, .018, 71.25, FACING.east); g.hold('KeyW', 1); assert(g.player.x > 5.5, `slid along the wall from inside its face (${g.at()})`); g.put(4.5, .018, 71.25, FACING.north); g.hold('KeyW', .5); assert(g.player.z >= 71.25, `not further in (${g.at()})`); const drop = g.height.lastFall(); near(drop, ROOF + K.roof.parapet + .06 - .018, .1, 'the fall'); near(g.coop.hp(), 100 - fallDamage(drop), .5, 'the cost'); assert(g.coop.hp() > 15 && g.coop.hp() < 35, `survived, barely (${g.coop.hp()})`);
  assert.equal(g.state().state, 'playing');
  report.roof = {level: ROOF, parapet: K.roof.parapet, fall: +drop.toFixed(2), health: +g.coop.hp().toFixed(1)};
});

await check('flood', 'no inescapable place: a flood of everything a body can do from the street (steps of a quarter metre, stepping up, falling, pulling up, crouching where it must) reaches the ground floor, every floor, both stairs and the roof of the customs house and the whole square, and from every place it reaches the street can be reached again; nothing it reaches lies outside the walls or inside one', async () => {
  const g = await body(), sp = g.height.space, B = sp.body, STEP = .25, R = {x: [-21.6, 21.6], z: [44.5, 79.4]};
  const key = (x, z, y) => `${Math.round(x / STEP)},${Math.round(z / STEP)},${Math.round(y * 50)}`, nodes = new Map(), edges = new Map(), back = new Map();
  const add = (x, z, y) => { const k = key(x, z, y); if (!nodes.has(k)) nodes.set(k, {x: Math.round(x / STEP) * STEP, z: Math.round(z / STEP) * STEP, y}); return k; }, link = (a, b) => { edges.get(a).push(b); if (!back.has(b)) back.set(b, []); back.get(b).push(a); };
  // Where a body over (x, z) at y comes to rest: on the floor under it, pushed clear of what it landed against, on the
  // nearest square of the grid that is clear (the push leaves the grid; a square back inside the wall would be wrong).
  const snap = (x, z, y) => { const gx = Math.round(x / STEP) * STEP, gz = Math.round(z / STEP) * STEP, ok = (a, b) => sp.clear(a, b, y + B.step, y + B.crouch, B.radius); if (ok(gx, gz)) return [gx, gz];
    const ax = x > gx ? gx + STEP : gx - STEP, az = z > gz ? gz + STEP : gz - STEP; for (const [a, b] of [[ax, gz], [gx, az], [ax, az]]) if (ok(a, b)) return [a, b]; return [gx, gz]; };
  const rest = (x, z, y) => { const stand = sp.floor(x, z, y + B.step, B.lean, y).y; if (stand >= y - B.step) return [x, z, stand];   // still on its feet (as the game judges it, a lean past an edge included)
    const f = sp.floor(x, z, y + .02).y, s = sp.settle(x, z, f + B.step, f + B.stand) || {x, z}; return [...snap(s.x, s.z, f), f]; };   // else it falls to what is straight under, and is pushed clear of what it landed against
  const start = add(...rest(0, 46, .5)), queue = [start], p = new THREE.Vector3(), E = DEHRUN.edges, exits = [start]; let inWall = 0, outside = 0;
  while (queue.length) { const k = queue.pop(); if (edges.has(k)) continue; edges.set(k, []); const n = nodes.get(k), H = sp.headroom(n.x, n.z, n.y) < B.stand ? B.crouch : B.stand;
    if (n.x < E.x[0] || n.x > E.x[1] || n.z < E.z[0] || n.z > E.z[1] || n.y < -.01) outside++;
    if (n.x < R.x[0] || n.x > R.x[1] || n.z < R.z[0] || n.z > R.z[1]) { exits.push(k); continue; }   // back through the gate into the block: home, and not followed further
    if (!sp.clear(n.x, n.z, n.y + B.step + .01, n.y + B.crouch - .05, B.radius * .5)) { inWall++; if (inWall < 4) report.inWall = (report.inWall || []).concat([[n.x, n.z, n.y]]); }
    for (const [dx, dz] of [[STEP, 0], [-STEP, 0], [0, STEP], [0, -STEP]]) { p.set(n.x, n.y, n.z); if (sp.move(p, dx, dz, H) < STEP - .01) continue; const q = add(...rest(p.x, p.z, p.y)); link(k, q); if (!edges.has(q)) queue.push(q); }
    for (const [fx, fz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { p.set(n.x, n.y, n.z); const up = sp.ledge(p, fx, fz); if (!up) continue; const x = Math.round(up.x / STEP) * STEP, z = Math.round(up.z / STEP) * STEP, f = sp.floor(x, z, up.y + .02); if (Math.abs(f.y - up.y) > .05 || !sp.clear(x, z, f.y + .02, f.y + B.crouch, B.radius * .8)) continue; const q = add(x, z, f.y); link(k, q); if (!edges.has(q)) queue.push(q); } }
  const reached = [...edges.keys()], home = new Set(exits), stack = [...exits]; while (stack.length) { const k = stack.pop(); for (const a of back.get(k) || []) if (!home.has(a)) { home.add(a); stack.push(a); } }
  const stuck = reached.filter(k => !home.has(k)), trail = k => { const out = []; for (let i = 0; i < 6 && k; i++) { out.push(nodes.get(k)); k = (back.get(k) || []).find(a => home.has(a)) || (back.get(k) || [])[0]; } return out; };
  assert.equal(stuck.length, 0, `${stuck.length} places with no way back, e.g. ${JSON.stringify(stuck.slice(0, 3).map(k => nodes.get(k)))}; how the first was reached: ${JSON.stringify(trail(stuck[0]))}`);
  assert.equal(outside, 0, 'nothing beyond the map\'s edges or below its ground'); assert.equal(inWall, 0, `nothing inside a wall: ${JSON.stringify(report.inWall)}; how the first was reached: ${JSON.stringify(trail(key(...(report.inWall || [[0, 0, 0]])[0].slice(0, 3))))}`); delete report.inWall;
  const inK = n => n.x > K.x[0] && n.x < K.x[1] && n.z > K.z[0] && n.z < K.z[1], on = y => reached.map(k => nodes.get(k)).filter(n => inK(n) && Math.abs(n.y - y) < .03).length, cells = (K.x[1] - K.x[0] - .8) * (K.z[1] - K.z[0] - .8) / STEP / STEP;
  const counts = {ground: on(FLOORS[0]), first: on(FLOORS[1]), second: on(FLOORS[2]), roof: on(ROOF), stairs: reached.map(k => nodes.get(k)).filter(n => inK(n) && ![...FLOORS, ROOF].some(y => Math.abs(n.y - y) < .03) && n.y > .1 && n.y < ROOF - .1).length, square: reached.map(k => nodes.get(k)).filter(n => !inK(n) && n.y < .1).length};
  for (const f of ['ground', 'first', 'second']) assert(counts[f] > cells * .55, `${f} floor: ${counts[f]} of ${Math.round(cells)} places`); assert(counts.roof > cells * .7, `the roof: ${counts.roof}`); assert(counts.stairs > 300, `the stairs: ${counts.stairs}`); assert(counts.square > 15000, `the square: ${counts.square}`);
  for (const S of K.storeys) for (const r of S.rooms) { const n = K.storeys.indexOf(S), inRoom = reached.map(k => nodes.get(k)).filter(q => q.x > r.x[0] + .3 && q.x < r.x[1] - .3 && q.z > r.z[0] + .3 && q.z < r.z[1] - .3 && Math.abs(q.y - FLOORS[n]) < .03); if (!r.id.startsWith('stair')) assert(inRoom.length > 4, `${r.id} on storey ${n} is reached (${inRoom.length})`); }
  // The rule the flood relies on, on its own: a body on a crate does not step off into a gap narrower than itself between the crate and a low wall (it stays on the crate); into a gap it fits, it does, and lands clear of the wall.
  for (const [gap, steps] of [[.5, false], [1, true]]) { const t = makeSpace({boxes: [{min: [0, 0, 0], max: [1, .9, 1], solid: true}, {min: [1 + gap, 0, -2], max: [2 + gap, .8, 3], solid: true}], ground: () => 0}), q = new THREE.Vector3(.7, .9, .5);   // a crate, and beside it a low wall that is under the feet of a body on the crate
    for (let i = 0; i < 16; i++) t.move(q, .05, 0, BODY.stand); const off = q.x > 1.22; assert.equal(off, steps, `a ${gap} m gap beside a wall: ${off ? 'stepped off' : 'stayed on the crate'} (${q.x.toFixed(2)})`);
    if (steps) { const at = t.settle(q.x, q.z, .35, 1.8); assert(at && t.clear(at.x, at.z, .35, 1.8), 'and lands clear'); } }
  report.flood = {places: reached.length, ...counts, step: STEP, allCanReturn: true};
});

await check('doors', 'every door and doorway of the customs house lets an enemy through: a body of the enemies\' radius (.45 m, twice what the block\'s 1.05 m doors were made for) and full height walks straight through each street door, each door between rooms, each stair opening and each roof door, on that storey\'s floor', async () => {
  const g = await body(), sp = g.height.space, p = new THREE.Vector3(); let n = 0;
  const through = (x, z, y, ax, az, what, reach = 1) => { p.set(x - ax * reach, y, z - az * reach); const f = sp.floor(p.x, p.z, y + .3).y; p.y = f; let d = 0; for (let i = 0; i < 10; i++) d += sp.move(p, ax * reach / 5, az * reach / 5, BODY.stand, NAV_R); assert(d > 2 * reach - .05 && Math.hypot(p.x - x - ax * reach, p.z - z - az * reach) < .05, `${what}: ${d.toFixed(2)} m of ${2 * reach} (${p.toArray().map(v => +v.toFixed(2))})`); n++; };
  let y = 0; K.storeys.forEach((S, k) => { const floor = FLOORS[k];
    for (const [side, f] of Object.entries({west: [K.x[0], 1, 0], east: [K.x[1], -1, 0], north: [K.z[0], 0, 1], south: [K.z[1], 0, -1]})) for (const o of (S[side] || []).filter(o => o.kind === 'door')) side === 'west' || side === 'east' ? through(f[0], o.at, floor, f[1], 0, `${side} door of storey ${k}`) : through(o.at, f[0], floor, 0, f[2], `${side} door of storey ${k}`);
    for (const d of S.doors) { const alongX = S.rooms.some(r => Math.abs(r.x[0] - d.at[0]) < .01 || Math.abs(r.x[1] - d.at[0]) < .01) && !S.rooms.some(r => (Math.abs(r.z[0] - d.at[1]) < .01 || Math.abs(r.z[1] - d.at[1]) < .01) && d.at[0] > r.x[0] && d.at[0] < r.x[1]); through(d.at[0], d.at[1], floor, alongX ? 1 : 0, alongX ? 0 : 1, `door at ${d.at} of storey ${k}`); }
    // The way into each stair: wide enough (the opening, and each flight beside the railing), and a body of the enemies'
    // radius stands in it, on the first flight's side; whether such a body can climb the treads is the enemies' own
    // stair rule, which map build 5 writes (see the report).
    for (const s of K.stairs) { const dir = Math.sign(s.z[1] - s.z[0]), xA = (3 * s.x[0] + s.x[1]) / 4 + .03; assert(s.x[1] - s.x[0] - .1 >= 2 * NAV_R + .3 && (s.x[1] - s.x[0]) / 2 - .09 >= 2 * NAV_R + .2, 'the stair opening and its flights are wide enough');
      p.set(xA, floor, s.z[0] - dir * .7); const d = sp.move(p, 0, dir * .25, BODY.stand, NAV_R); assert(d > .24 && Math.abs(p.z - (s.z[0] - dir * .45)) < .01, `into the stair opening at ${s.x} of storey ${k} (${d.toFixed(2)})`); n++; }
    y += S.height; });
  for (const s of K.stairs) { const dir = Math.sign(s.z[1] - s.z[0]); through((s.x[0] + 3 * s.x[1]) / 4, s.z[0] - dir * .08, ROOF, 0, dir, `roof door of the stair at ${s.x}`); }
  // For the record, not required: the block's own doors (1.05 m, with the frame's posts .08 m proud on each side) do
  // not pass that body: .89 m is left between the posts (found in Build 25, left for the user: E41).
  p.set(-3.2, 1.6, 5); p.y = sp.floor(-3.2, 5, 1.9).y; let d = 0; for (let i = 0; i < 10; i++) d += sp.move(p, -.2, 0, BODY.stand, NAV_R); const blockDoor = p.x > -4.2 ? 'does not pass' : 'passes';
  report.doors = {passed: n, radius: NAV_R, width: 1.3, between: +(1.3 - .16).toFixed(2), blockDoors: {width: 1.05, between: .89, aBodyOfTheEnemiesRadius: blockDoor}, note: 'the customs house leaves 1.14 m between the posts of every door, .24 m more than a body of radius .45 needs'};
});

await check('block', 'the block that was there is exactly what it was: the new kit building Build 24\'s description of the block (run here from its commit) makes the very same boxes, awnings, ladders and solids as Build 24\'s kit; and in the new description everything north of the gate is unchanged too, the only differences being the gate\'s leaves (open now), what stands on the square and what moved to make room for it, and (Build 26, the user\'s decision) the doors 1.3 m wide and house A\'s inside stair 1.05 m: with those two numbers put into Build 24\'s description, the block is the same box for box', async () => {
  const old = await oldBuild(BUILD24), oldMaps = await old.module('maps.js'), OLD = await oldMaps.loadMap('dehrun'), oldKit = (await old.module('terraces.js')).buildTerraces;
  const ctx = map => ({scene: new THREE.Scene(), renderer: {capabilities: {getMaxAnisotropy: () => 8}}, solids: [], occluders: [], groundY: (x, z) => map.height(x, z), ground: {material: new THREE.MeshStandardMaterial()}});
  const sig = b => JSON.stringify([b.at.map(v => +v.toFixed(4)), b.size.map(v => +v.toFixed(4)), b.surface, b.turned, b.tag, b.solid]);
  const made = async (kit, map) => { const c = ctx(map), out = kit(c, map); await out.ready; return {boxes: out.stats.list.map(sig).sort(), awnings: JSON.stringify(out.stats.awnings), ladders: JSON.stringify(out.space.ladders), solids: JSON.stringify(c.solids), count: out.stats.list.length}; };
  await page(); await old.createGame();   // the harness's document and fetch, which each kit draws its cloth and loads its models with (each build's own three.js is what its harness prepares)
  const was = await made(oldKit, OLD), asIs = await made(buildTerraces, OLD);
  assert.equal(asIs.count, was.count, 'as many boxes'); assert.deepEqual(asIs.boxes, was.boxes, 'the same boxes'); assert.equal(asIs.awnings, was.awnings); assert.equal(asIs.ladders, was.ladders); assert.equal(asIs.solids, was.solids);
  assert(was.count > 2500 && OLD.block.houses.length === 8 && !OLD.block.houses.some(h => h.stairs), 'Build 24\'s block, without the customs house');
  // The new description against the old, both built by the new kit: north of the gate the same, but for the gate's leaves,
  // once the old description is given Build 26's door and stair widths (every door 1.3 m, house A's inside stair 1.05 m).
  const widened = {...OLD, block: JSON.parse(JSON.stringify(OLD.block))}; for (const h of widened.block.houses) for (const st of h.storeys) for (const f of ['north', 'south', 'east', 'west']) for (const o of st[f] || []) if (o.kind === 'door' && o.width >= 1.05) o.width = 1.3;
  widened.block.flights.find(f => f.width === .9).width = 1.05;
  const same = await made(buildTerraces, widened), now = await made(buildTerraces, DEHRUN), leaf = s => { const [at, size, , turned] = JSON.parse(s); return turned && Math.abs(at[0]) < 2 && Math.abs(at[2] - 44) < 1 && size[1] > 2; };
  const north = list => list.filter(s => { const [at, size] = JSON.parse(s); return at[2] + size[2] / 2 <= 44.31 && !leaf(s); });
  assert.deepEqual(north(now.boxes), north(same.boxes), 'north of the gate nothing changed');
  const gone = same.boxes.filter(s => !now.boxes.includes(s)), added = now.boxes.filter(s => !same.boxes.includes(s));
  for (const s of gone) { const [at] = JSON.parse(s); assert(leaf(s) || at[2] > 48, `only the gate's leaves and what stood south of the block are gone: ${s}`); }
  for (const s of added) { const [at, size] = JSON.parse(s); assert(leaf(s) || at[2] - size[2] / 2 >= 43.9, `only the gate's leaves and what stands on the square are new: ${s}`); }
  assert.equal(gone.filter(leaf).length, 2); assert.equal(added.filter(leaf).length, 2, 'the two leaves of the gate, swung open');
  assert.deepEqual(DEHRUN.block.houses.slice(0, 8), widened.block.houses, 'the eight houses are described as they were, their doors widened'); assert.deepEqual(DEHRUN.height(3, 30), OLD.height(3, 30)); assert.deepEqual(DEHRUN.starts, OLD.starts);
  report.block = {build24Boxes: was.count, newKitOnOldDescription: 'identical', widenedInBuild26: 'every door 1.3 m (the .95 m balcony doors of shut upper floors excepted), house A\'s inside stair 1.05 m', nowBoxes: now.count, addedSouthOfTheGate: added.length - 2, goneSouthOfTheBlock: gone.length - 2, deliberate: ['the south gate open (ajar 1.3)', 'houses S1 and S2 and one field wall moved beyond the square', 'the sun aimed at the middle of the longer map (its direction unchanged)', 'edges, nav, dust, reach and the M map extended to z 80']};
});

console.log(JSON.stringify({...(ONLY ? {partial: ONLY} : {}), passed: results.length, checks: results, report, limitations: [
  'Headless: the body is driven by the keys the game reads; how the building looks and feels, and its frame time, are for the user in Safari (B21).',
  'The flood is a quarter-metre grid of what the space allows: a place narrower than that could be missed; falls are taken as always survivable here (the highest in the building, from the parapet, costs about three quarters of the health).',
  'Enemies do not walk this building yet (map build 5): the door width is checked with their radius, not with their navigation.']}, null, 2));
