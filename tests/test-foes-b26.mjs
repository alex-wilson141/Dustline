// Build 26 (T36): enemy height on Dehrun Terraces, and Kohar Valley's enemies untouched. On a map with a space the
// enemies walk a navigation in layers (dist/navmesh.js): from the street they reach every floor and the roof of the
// customs house, take both stairs both ways and the block's ladders, pass every door at the new width, see, shoot and
// take cover across levels (cover on their own level), fall off edges and roofs with the player's fall damage, leave
// blood where they land, and can be pushed off by a shot. The navigation reaches nothing it should not and strands
// nobody. Kohar Valley: no navigation, the same cover table, the same paths and spots as Build 25 run here from its
// commit, the same fire block; its enemy traces are replayed by the older suites (T20, T26, T27, T31).
import assert from 'node:assert/strict';
import fs from 'node:fs';
globalThis.location = {search: '?foes=1'};   // the address that puts the map's foes in a map to look at (read by the game at load)
import {createGame, projectRoot} from './sprint-harness.mjs';
import {oldBuild} from './old-build.mjs';

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const maps = await import(new URL('dist/maps.js', projectRoot));
const {BODY, FALL, fallDamage} = await import(new URL('dist/space.js', projectRoot));
const {FOE} = await import(new URL('dist/navmesh.js', projectRoot));
const SOURCE = process.env.DUSTLINE_GAME_SOURCE ? new URL('file://' + process.env.DUSTLINE_GAME_SOURCE) : undefined;
const ONLY = process.env.DUSTLINE_T36_ONLY?.split(',');
const BUILD25 = '993c4d0';
const results = [], report = {};
async function check(tag, name, fn) { if (ONLY && !ONLY.includes(tag)) return; await fn(); results.push(name); }
const page = () => createGame(SOURCE ? {sourcePath: SOURCE} : {});
const DEHRUN = await maps.loadMap('dehrun'); maps.selectMap('kohar');
const K = DEHRUN.block.houses.find(h => h.id === 'K'), FLOORS = [.05, 3.4, 6.6], ROOF = 9.83;
const near = (a, b, e, what) => assert(Math.abs(a - b) <= e, `${what}: ${a} against ${b}`);
// The map with the foes flag on, playing, with the ways to drive it and its enemies.
async function world({foes = true} = {}) { globalThis.location = {search: foes ? '?foes=1' : ''}; maps.selectMap('dehrun'); let g; try { g = await page(); g.prepare({clearLane: false}); await g.built.ready; } finally { maps.selectMap('kohar'); globalThis.location = {search: '?foes=1'}; }
  g.setMode('story'); g.reset(); g.play(); g.restoreAI(); g.set({hp: 100}); let clock = 0; g.frame(0);
  g.run = (s, each) => { for (let i = 0, n = Math.round(s * 60); i < n; i++) { g.frame(clock += 1000 / 60); if (each?.(i / 60) === false) break; } };
  g.put = (x, y, z, yaw = 0) => { g.player.set(x, y, z); g.set({yaw}); g.height.settle(); };
  g.enemies = () => g.actors.filter(a => a.team === 'enemy');
  g.nobody = () => { for (const a of g.actors) { a.hp = 0; a.gone = true; a.g.visible = false; a.route = []; } };
  // An enemy put somewhere, on a loop, or told to travel a chain of [x, z, y] and then hold.
  g.foe = (i, x, y, z, loop = 'HALLS') => { const a = g.enemies()[i]; a.hp = 100; a.dead = 0; a.gone = false; a.sink = null; a.diedAt = null; a.fall = null; a.climb = null; a.g.visible = true; a.resetPose(); a.g.position.set(x, y, z); a.cool = 3; a.senseTimer = .2; a.stuck = 0; a.ai = {role: 'patrol', loop, dir: 1, lastHp: 100}; g.ai.startPatrol(a, loop); return a; };
  g.send = (a, chain) => { g.ai.startTravel(a, 'travel', chain, 2.2, null); };
  g.nav = g.built.navigation(); return g; }
const at = a => a.g.position.toArray().map(v => +v.toFixed(2));

await check('kohar', 'Kohar Valley\'s enemies are what they were: the map brings no navigation, and against Build 25 run here from its commit the cover table is the same point for point, twelve paths are the same step for step, spawn spots are the same, and the fire block, hit rule and the flat movement of actors are the same text', async () => {
  const g = await page(); assert.equal(g.height.space, null); const old = await oldBuild(BUILD25), o = await old.createGame();
  for (const x of [g, o]) { x.prepare({clearLane: false}); x.setMode('story'); x.reset(); }
  const points = x => JSON.stringify(x.ai.coverTable().points.map(p => [p.x, p.z, p.nx, p.nz, p.low, +p.top.toFixed(4), p.peek]));
  assert.equal(points(g), points(o), 'the cover table'); assert(g.ai.coverTable().points.length > 200);
  const pairs = [[[0, 55], [-12, 20]], [[10, 10], [-20, -10]], [[-30, 30], [30, -30]], [[5, 5], [5, 60]], [[-15, -25], [15, 25]], [[0, 0], [-40, 10]], [[22, 30], [-8, -40]], [[-3, 44], [3, -44]], [[12, -12], [-12, 12]], [[0, 55], [0, -55]], [[-25, 0], [25, 0]], [[7, 33], [-33, -7]]];
  const routes = x => JSON.stringify(pairs.map(([a, b]) => x.ai.pathTo(new THREE.Vector3(a[0], 0, a[1]), new THREE.Vector3(b[0], 0, b[1])).map(v => [v.x, v.z])));
  assert.equal(routes(g), routes(o), 'the paths');
  assert.equal(JSON.stringify(pairs.map(([a]) => g.ai.safeSpot(a[0] + .3, a[1] - .2))), JSON.stringify(pairs.map(([a]) => o.ai.safeSpot(a[0] + .3, a[1] - .2))), 'the spots');
  const src = SOURCE ? fs.readFileSync(SOURCE, 'utf8') : fs.readFileSync(new URL('dist/game.js', projectRoot), 'utf8');
  for (const t of ["if(enemy&&canFire&&a.cool<=0){a.cool=.65+rand()*.95;", "let chance=human?.22:.42;const distance=p.distanceTo(enemy.pos);chance*=Math.max(.4,1-distance/90);if(human&&(enemy.a?enemy.a.crouch:crouch))chance*=.65;if(rand()<chance&&aiHit(enemy,eye,endpoint))return;",
    "function aiHit(enemy,eye,endpoint){const dir=endpoint.clone().sub(eye).normalize();if(enemy.a){const amount=enemy.a.remote?(rand()*10+12)*CLASSES[remoteClass].armor:24;", "function actorMove(p,dx,dz){return LAYERS?LAYERS.move(p,dx,dz):move(p,dx,dz);}", "if(LAYERS)actorHeight(a,p,dt);else p.y=groundY(p.x,p.z);"]) assert(src.includes(t), `the same text: ${t.slice(0, 50)}`);
  report.kohar = {coverPoints: g.ai.coverTable().points.length, pathsCompared: pairs.length, against: `Build 25 (${BUILD25}), run here`, traces: 'T20, T26, T27 and T31 replay Builds 09, 15 and 20 in their own suites'};
});

await check('graph', 'the navigation is what the space allows an enemy and no more: every place stands clear for a body of radius .45 on a floor within the map\'s edges, none inside a shut house; drops are one way and never more than 3 m; ladders join their foot and their top both ways; the customs house has places on every floor and its roof, the block on every terrace and on house A\'s upper floor and roof; and from every place the street is reached again (nobody is stranded)', async () => {
  const g = await world(), nav = g.nav, sp = g.height.space, E = DEHRUN.edges, shut = DEHRUN.block.houses.filter(h => !h.enter);
  assert(nav.nodes.length > 15000, `${nav.nodes.length} places`); let drops = 0, maxDrop = 0, ladders = 0;
  for (const n of nav.nodes) { assert(n.x >= E.x[0] && n.x <= E.x[1] && n.z >= E.z[0] && n.z <= E.z[1], 'inside the edges'); assert(nav.free(n.x, n.z, n.y) && sp.stands(n.x, n.z, n.y + BODY.step, n.y + 1.8, .45, true), `clear at ${[n.x, n.y, n.z]} for a body of radius .45`);
    assert(!shut.some(h => n.x > h.x[0] + .4 && n.x < h.x[1] - .4 && n.z > h.z[0] + .4 && n.z < h.z[1] - .4 && n.y < h.base + h.storeys.reduce((s, t) => s + t.height, 0) - .3), `not inside a shut house: ${[n.x, n.y, n.z]}`);
    for (const e of n.edges) { if (e.kind === 'drop') { drops++; const d = n.y - e.to.y; maxDrop = Math.max(maxDrop, d); assert(d > BODY.step && d <= FOE.safeDrop, `a drop of ${d}`); assert(!e.to.edges.some(b => b.to === n && b.kind === 'walk'), 'one way'); } if (e.kind === 'ladder') ladders++; } }
  assert.equal(ladders, sp.ladders.length * 2, 'every ladder both ways');
  const count = (y, box) => nav.nodes.filter(n => Math.abs(n.y - y) < .03 && (!box || n.x > box.x[0] && n.x < box.x[1] && n.z > box.z[0] && n.z < box.z[1])).length, KB = {x: K.x, z: K.z};
  const layers = {ground: count(FLOORS[0], KB), first: count(FLOORS[1], KB), second: count(FLOORS[2], KB), roof: count(ROOF, KB), lowerTerrace: count(0, {x: [-24, 24], z: [17, 44]}), middleTerrace: count(1.6), topTerrace: count(3.2), houseAUpper: count(4.6, {x: [-13, -4.2], z: [2, 13]}), houseARoof: count(7.43, {x: [-13, -4.2], z: [2, 13]}), gRoof: count(4.33, {x: [-12, -5.4], z: [-5.2, .4]})};
  for (const [k, v] of Object.entries(layers)) assert(v > (k.includes('Roof') || k.includes('Upper') ? 20 : 300), `${k}: ${v} places`);
  // Nobody stranded: from every place, walking the graph's edges backwards from the street, the street is reached.
  const start = nav.nearest(0, 46, 0), back = new Map(); for (const n of nav.nodes) for (const e of n.edges) { if (!back.has(e.to)) back.set(e.to, []); back.get(e.to).push(n); }
  const home = new Set([start]), stack = [start]; while (stack.length) { const n = stack.pop(); for (const m of back.get(n) || []) if (!home.has(m)) { home.add(m); stack.push(m); } }
  const stranded = nav.nodes.filter(n => !home.has(n)); assert.equal(stranded.length, 0, `${stranded.length} places with no way back to the street, e.g. ${JSON.stringify(stranded.slice(0, 4).map(n => [n.x, n.y, n.z]))}`);
  report.graph = {places: nav.nodes.length, ...nav.stats, layers, drops, maxDrop: +maxDrop.toFixed(2), doorPlaces: nav.doors, builtIn: 'about 120 ms at load'};
});

await check('floors', 'from the street an enemy reaches every floor of the customs house and its roof, and comes back down: sent to each in turn it arrives within a minute, standing on that floor, having walked (no place it was set to)', async () => {
  const g = await world(); g.nobody(); g.put(-20, 3.2, -28); const a = g.foe(0, 0, 0, 46, 'SQUARE'); const times = {};   // the player far away on the top terrace: nothing to fight
  for (const [name, x, z, y] of [['ground floor', 0, 61.4, FLOORS[0]], ['first floor', 0, 61.4, FLOORS[1]], ['second floor', 0, 61.4, FLOORS[2]], ['roof', 0, 65, ROOF], ['first floor again', 5, 57, FLOORS[1]], ['street', 0, 48, 0]]) {
    g.send(a, [[x, z, y]]); let t = 0; g.run(75, s => { t = s; if (Math.hypot(a.g.position.x - x, a.g.position.z - z) < 1.2 && Math.abs(a.g.position.y - y) < .05) return false; });
    assert(Math.hypot(a.g.position.x - x, a.g.position.z - z) < 1.2 && Math.abs(a.g.position.y - y) < .05, `${name}: at ${at(a)} after ${t.toFixed(0)} s`); times[name] = +t.toFixed(1); }
  report.floors = {secondsToEach: times, speed: 2.2};
});

await check('stairs', 'an enemy climbs and descends both stairs of the customs house, tread by tread with its feet on the treads (never through a floor, never falling), and climbs a ladder of the block: up the west stair from the ground to the roof, down the east, up the east, down the west; up the ladder from the middle terrace to the storehouse roof and down again', async () => {
  const g = await world(); g.nobody(); g.put(-20, 3.2, -28); const a = g.foe(0, -11.2, .05, 61.4, 'HALLS'); const legs = {};
  const climb = (name, chain, x0, x1, yEnd) => { g.send(a, chain); let onStair = 0, fell = 0, xs = new Set(); let lastY = a.g.position.y; g.run(60, () => { const p = a.g.position; if (a.fall) fell++; if (g.height.space.floor(p.x, p.z, p.y + .02).on?.tag === 'stair') { onStair++; xs.add(p.x < 0 ? 'west' : 'east'); } if (Math.abs(p.y - yEnd) < .05 && Math.hypot(p.x - chain.at(-1)[0], p.z - chain.at(-1)[1]) < 1.2) return false; });
    near(a.g.position.y, yEnd, .05, `${name}: arrived (${at(a)})`); assert(onStair > 60 && xs.size === 1 && xs.has(x0), `${name}: on the ${x0} stair (${[...xs]}, ${onStair} frames)`); assert.equal(fell, 0, `${name}: never fell`); legs[name] = {framesOnStair: onStair}; };
  climb('up the west stair', [[-11.9, 61, FLOORS[0]], [-10.5, 61.4, ROOF]], 'west', 'west', ROOF); climb('down the east stair', [[11.9, 61.6, ROOF], [10.5, 61.4, FLOORS[0]]], 'east', 'east', FLOORS[0]);
  climb('up the east stair', [[11.9, 61.6, FLOORS[0]], [10.5, 61.4, ROOF]], 'east', 'east', ROOF); climb('down the west stair', [[-10.5, 61, ROOF], [-10.5, 61.4, FLOORS[0]]], 'west', 'west', FLOORS[0]);
  // The ladder from the middle terrace to the storehouse's roof (house G), and back.
  g.nobody(); const b = g.foe(1, -6, 1.6, 1, 'HALLS'); g.send(b, [[-8, -2, 4.33]]); let climbed = 0; g.run(40, () => { if (b.climb) climbed++; if (Math.abs(b.g.position.y - 4.33) < .05 && Math.hypot(b.g.position.x + 8, b.g.position.z + 2) < 1.2) return false; });
  near(b.g.position.y, 4.33, .05, `on the storehouse roof (${at(b)})`); assert(climbed > 60, `climbed the ladder (${climbed} frames)`); g.send(b, [[-6, 1, 1.6]]); climbed = 0; g.run(40, () => { if (b.climb) climbed++; if (Math.abs(b.g.position.y - 1.6) < .05 && Math.hypot(b.g.position.x + 6, b.g.position.z - 1) < 1.2) return false; });
  near(b.g.position.y, 1.6, .05, `down on the terrace (${at(b)})`); assert(climbed > 60, 'climbed down the ladder');
  report.stairs = {legs, ladder: 'the storehouse ladder, up and down', rule: 'treads within a metre above the feet do not stand in the way of the wide body; it climbs by what is under its middle (dist/space.js, `stairs`)'};
});

await check('doors', 'every doorway of the map lets an enemy through: for each of the kit\'s doorways the places either side of it are joined, and a body of the enemies\' width walks straight through; every door of the block is 1.3 m wide now (the user\'s decision), the shut upper-floor balcony doors excepted', async () => {
  const g = await world(), nav = g.nav, doors = g.built.stats.doors; let passed = 0;
  for (const d of doors) { if (d.shut) continue; const off = d.kind === 'open' ? d.width / 4 : 0, [a, b] = d.axis === 'x' ? [{x: d.x - off, z: d.z - .7}, {x: d.x - off, z: d.z + .7}] : [{x: d.x - .7, z: d.z - off}, {x: d.x + .7, z: d.z - off}];   /* a stair's opening is walked on one flight's side of its railing */ a.y = nav.floor(a.x, a.z, d.y + .3).y; b.y = nav.floor(b.x, b.z, d.y + .3).y;
    assert(nav.walkable(a, b) && nav.walkable(b, a), `through the door at ${[d.x, d.z]} (y ${d.y}) both ways`); const na = nav.nearest(a.x, a.z, a.y, .6), nb = nav.nearest(b.x, b.z, b.y, .6); assert(na && nb, `places either side of the door at ${[d.x, d.z]}`);
    const r = nav.path(a, b); assert(r.length >= 1 && r.length <= 5 && Math.hypot(r.at(-1).x - b.x, r.at(-1).z - b.z) < .8, `a path straight through the door at ${[d.x, d.z]} (${r.length} steps)`); passed++; }
  const widths = new Set(); for (const h of DEHRUN.block.houses) for (const s of h.storeys) for (const f of ['north', 'south', 'east', 'west']) for (const o of s[f] || []) if (o.kind === 'door') { if (o.width < 1.3) assert((o.closed || !h.enter) && h.storeys.indexOf(s) > 0, `a narrow door only where shut and upstairs: ${h.id} ${f} ${o.at}`); widths.add(o.width); }
  assert.deepEqual([...widths].sort(), [.95, 1.3]); assert(doors.length >= 50, `${doors.length} doorways`);
  report.doors = {doorways: doors.length, shut: doors.filter(d => d.shut).length, passed, blockDoorWidth: 1.3, exceptions: 'three .95 m balcony doors of shut upper floors (A, E, F), drawn shut'};
});

await check('fight', 'enemies fight between levels: from a first-floor window an enemy sees the player on the street below and fires; from the street an enemy sees the player at a second-floor window and fires; the fire block is the old one (a hit within a few shots, by its chance); cover is per level: the cover table has points on every floor and the roof of the customs house, an enemy asked for cover never gets one on another level, and any cover taken in these fights is on the enemy\'s own floor (where a room gives no firing line from cover, it holds and fires from where it stands)', async () => {
  const g = await world(); const outcome = {};
  const table = g.ai.coverTable().points, on = y => table.filter(c => Math.abs(c.y - y) < .1).length; assert(on(FLOORS[1]) > 50 && on(FLOORS[2]) > 50 && on(ROOF) >= 2 && on(0) > 100, `cover on every level: ${[on(0), on(FLOORS[1]), on(FLOORS[2]), on(ROOF)]}`); assert(table.every(c => Number.isFinite(c.y)), 'every point knows its level');
  const bout = (name, px, py, pz, ex, ey, ez, loop, coverY) => { g.nobody(); g.set({hp: 100}); g.put(px, py, pz, 0); const a = g.foe(0, ex, ey, ez, loop); a.cool = .1; a.ai.state = 'hold'; a.route = []; a.ai.retry = 0; /* standing where put until it sees something */ let seenAt = null, firing = 0, covers = new Set(), states = new Set(); const hp0 = g.coop.hp(), shots0 = g.sounds.filter(x => x === 'shot').length;
    g.run(25, t => { if (a.seen && seenAt == null) seenAt = t; if (a.ai.firing) firing++; if (a.ai.cover) covers.add(+a.ai.cover.y.toFixed(2)); states.add(a.ai.state); if (a.hp <= 0) return false; });
    assert(seenAt != null && seenAt < 6, `${name}: saw the player (${seenAt})`); assert(firing > 10, `${name}: fired (${firing} frames)`); for (const y of covers) near(y, coverY, .1, `${name}: cover on its own level`);
    // Asked for cover against this threat, over and over with different random draws, it is offered nothing off its own level.
    for (let i = 0; i < 12; i++) { const found = g.ai.coverQuery(a, g.player.clone()); if (found) near(found.c.y, coverY, .1, `${name}: cover offered on its own level`); }
    const shots = g.sounds.filter(x => x === 'shot').length - shots0; assert(shots >= 2, `${name}: shots fired (${shots})`); assert(g.coop.hp() < hp0 || shots < 6, `${name}: the player was hit (${g.coop.hp()} after ${shots} shots)`); outcome[name] = {seenAfter: +seenAt.toFixed(2), firingFrames: firing, shots, coverLevels: [...covers], states: [...states], playerHealth: +g.coop.hp().toFixed(1)}; };
  bout('window above the street', 0, 0, 40, 0, FLOORS[1], 53.9, 'UPPER', FLOORS[1]);   // through the open gate, 13 m from the wall: any nearer and the sill hides the street (the user keeps the parapets and sills as they are)
  bout('street below the window', 2, FLOORS[2], 54.4, 2, 0, 36, 'SQUARE', 0);   // at the second-floor window at x 2, seen from 17 m up the street (any nearer and the sill hides the window)
  report.fight = {...outcome, coverPointsByLevel: {ground: on(0), first: on(FLOORS[1]), second: on(FLOORS[2]), roof: on(ROOF)}, note: 'from a room, cover with a firing line to the street rarely exists: the enemy holds at the window and fires; a .6 m parapet hides the square from the roof and the roof from the square within about 9 m of the wall (user decision: keep it so)'};
});

await check('fall', 'enemies fall as the player does: shot dead on the parapet\'s coping, an enemy is pushed off by the killing shot, falls 10.4 m to the paving and leaves blood where it lands, the kill the player\'s; stepping off the coping alive, an enemy falls 10.4 m and loses what FALL says (75 of its health, alive as the player would be), with blood, and no kill is anyone\'s; sent over a drop of the navigation, an enemy walks off the edge, falls, lands unhurt and walks on; an enemy killed where it stands is pushed half a metre and stays on its floor', async () => {
  const g = await world(); g.nobody(); const decals = []; const realDecal = g.fx.decal; g.fx.decal = d => { decals.push(d); return realDecal(d); }; g.el('blood').checked = true;
  const v = g.foe(0, 4.5, 10.46, 71.05, 'ROOF'); v.ai.state = 'hold'; v.route = []; g.put(4.5, ROOF, 66); g.run(.5); near(v.g.position.y, 10.46, .02, 'standing on the coping'); const kills0 = g.kills(), hp0 = v.hp;
  let shots = 0; while (v.hp > 0 && shots < 6) { g.hitScan(new THREE.Vector3(4.5, 11.4, 67), new THREE.Vector3(0, -.1, 1).normalize(), {damage: 28, headshot: 2}, 'local'); shots++; g.run(.05); }
  assert(v.hp <= 0 && shots >= 2, `killed by ${shots} shots`); assert(v.g.position.z > 71.15, `pushed off the coping (${at(v)})`); const bloodBefore = decals.length; g.run(3);   // the killing shot pushes half a metre: off the coping
  near(v.g.position.y, .018, .03, `down on the paving (${at(v)})`); near(v.lastFall, 10.44, .1, 'the fall'); assert(decals.length > bloodBefore, 'blood where it landed'); const landing = decals.at(-1); assert(Math.hypot(landing[0] - v.g.position.x, landing[2] - v.g.position.z) < 1.2 && landing[1] < .1, `the blood lies at the landing (${landing.slice(0, 3)})`);
  assert.equal(g.kills(), kills0 + 1, 'one kill');
  // A weak enemy at the coping's edge: one shot that does not kill pushes it off, the fall kills it, and the kill is the player's who pushed it.
  const x2 = g.foe(4, 4.5, 10.46, 71.05, 'ROOF'); x2.ai.state = 'hold'; x2.route = []; g.run(.3); while (x2.g.position.z < 71.2) g.nav.move(x2.g.position, 0, .05); g.run(.2); near(x2.g.position.y, 10.46, .02, `standing at the coping's very edge (${at(x2)})`); x2.hp = 4; const k2 = g.kills(); g.hitScan(new THREE.Vector3(x2.g.position.x, 11.4, 67), x2.g.position.clone().setY(11.7).sub(new THREE.Vector3(x2.g.position.x, 11.4, 67)).normalize(), {damage: 2, headshot: 1}, 'local'); assert(x2.hp > 0 && x2.hp < 4, `hurt, not killed, by the shot (${x2.hp})`); g.run(3);
  assert(x2.hp <= 0 && x2.lastFall > 10, `died of the fall it was pushed into (${x2.hp}, ${x2.lastFall})`); assert.equal(g.kills(), k2 + 1, 'the fall kill is the player\'s who pushed it');
  // A living enemy stepping off the coping: FALL's curve, as for the player (10.4 m: 75 of its health), and nobody's kill.
  const w = g.foe(1, -4.6, 10.46, 71.05, 'ROOF'); w.ai.state = 'hold'; w.route = []; g.run(.3); near(w.g.position.y, 10.46, .02, 'on the coping'); const k1 = g.kills(); g.nav.move(w.g.position, 0, .6); assert(w.g.position.z > 71.25, `stepped past the coping's edge (${at(w)})`); const blood1 = decals.length; g.run(4);   // a step outward past the coping's edge, as walking off it
  assert(w.hp > 0 && w.lastFall > 10, `hurt by the fall, alive (${w.hp}, ${w.lastFall})`); assert.equal(g.kills(), k1, 'no kill for a fall nobody caused'); near(w.hp, 100 - fallDamage(w.lastFall), .01, 'FALL\'s curve'); assert(decals.length > blood1, 'blood where it landed too'); near(w.g.position.y, .018, .03, 'on the paving');
  // The same with 50 health: the fall kills, and the kill is nobody's (no shot pushed it).
  const w2 = g.foe(5, -4.6, 10.46, 71.05, 'ROOF'); w2.ai.state = 'hold'; w2.route = []; g.run(.3); w2.hp = 50; const k3 = g.kills(); g.nav.move(w2.g.position, 0, .6); g.run(4); assert(w2.hp <= 0 && w2.lastFall > 10, `died of the fall (${w2.hp})`); assert.equal(g.kills(), k3, 'nobody\'s kill');
  // A drop of the navigation: the biggest one is walked over and lands unhurt.
  let best = null; for (const n of g.nav.nodes) for (const e of n.edges) if (e.kind === 'drop' && (!best || n.y - e.to.y > best.n.y - best.e.to.y)) best = {n, e};
  const u = g.foe(2, best.n.x, best.n.y, best.n.z, 'HALLS'); u.ai.state = 'hold'; u.route = []; g.run(.2); near(u.g.position.y, best.n.y, .05, `at the top of the drop (${at(u)} for ${[best.n.x, best.n.y, best.n.z]})`); g.send(u, [[best.e.to.x, best.e.to.z, best.e.to.y]]); let fell = 0; g.run(6, () => { if (u.fall) fell++; if (!u.fall && fell && Math.abs(u.g.position.y - best.e.to.y) < .05 && Math.hypot(u.g.position.x - best.e.to.x, u.g.position.z - best.e.to.z) < .9) return false; });
  assert(fell > 0, 'fell'); near(u.g.position.y, best.e.to.y, .05, `landed below (${at(u)})`); assert.equal(u.hp, 100, 'unhurt'); near(u.lastFall, best.n.y - best.e.to.y, .1, 'the drop measured');
  // Killed where it stands, an enemy stays where it lies (no push where there is nothing to fall to: the floor holds it).
  g.run(1); const s = g.foe(3, 0, FLOORS[1], 57, 'UPPER'); s.blindUntil = Infinity; s.route = []; g.run(.2); /* blinded, it stands where put (a hold without a threat returns to duty at once) */ /* a second after the last shots: it hears nothing and stands where put */ const stood = s.g.position.clone(), from = new THREE.Vector3(stood.x, FLOORS[1] + 1.4, stood.z - 2.5), aim = stood.clone().setY(FLOORS[1] + 1.25).sub(from).normalize(); const endS = g.hitScan(from, aim, {damage: 200, headshot: 2}, 'local'); g.run(2);
  assert(s.hp <= 0, `killed where it stood (hp ${s.hp}, at ${at(s)}, the shot ended at ${endS.toArray().map(v => +v.toFixed(2))})`); near(s.g.position.y, FLOORS[1], .02, 'lies on its floor'); const pushed = s.g.position.distanceTo(stood); assert(pushed > .3 && pushed < .55, `pushed half a metre and no further (${pushed.toFixed(2)})`);
  g.fx.decal = realDecal; report.fall = {shotOffTheCoping: {shots, fall: +v.lastFall.toFixed(2), killCredited: true}, steppedOffAlive: {fall: +w.lastFall.toFixed(2), health: +w.hp.toFixed(1), curve: 'none to 3 m, fatal at 12, as the player'}, walkedOff: {drop: +(best.n.y - best.e.to.y).toFixed(2), at: [best.n.x, best.n.z]}, push: 'a shot pushes an enemy .2 m along its line, a killing shot .5 m'};
});

await check('foes', 'the address `?foes=1` on the map to look at puts the map\'s six foes in the customs house and on the square, on their loops, hunting; they move on their own, nobody reinforces them, and without the flag nobody is there', async () => {
  const g = await world(); const foes = g.enemies().filter(a => a.hp > 0 && a.g.visible); assert.equal(foes.length, DEHRUN.look.foes.length); assert.equal(foes.length, 6);
  const before = foes.map(at); g.put(0, 0, 37); g.set({hp: 1e9}); g.run(8); const moved = foes.filter((a, i) => Math.hypot(a.g.position.x - before[i][0], a.g.position.z - before[i][2]) > 1).length; assert(moved >= 4, `${moved} of 6 moved`);
  for (const [i, a] of foes.entries()) near(a.g.position.y, DEHRUN.look.foes[i].at[1], .05, `foe ${i} keeps its level while patrolling (${at(a)})`);
  for (const a of foes.slice(0, 2)) { a.hp = 0; a.dead = 999; a.diedAt = -100; a.gone = true; a.g.visible = false; } g.run(60); assert(g.enemies().filter(a => a.hp > 0 && a.g.visible).length <= 4, 'no reinforcements (two dead, a minute passed)'); assert.equal(g.state().state, 'playing');
  const q = await world({foes: false}); assert.equal(q.enemies().filter(a => a.hp > 0 || a.g.visible).length, 0, 'nobody without the flag');
  report.foes = {count: 6, loops: DEHRUN.look.foes.map(f => f.loop), address: 'http://localhost:8765/?map=dehrun&foes=1'};
});

console.log(JSON.stringify({...(ONLY ? {partial: ONLY} : {}), passed: results.length, checks: results, report, limitations: [
  'Headless: how enemies look climbing, falling and fighting between floors is for the user in Safari (B22).',
  'Kohar Valley\'s enemy traces are replayed by T20, T26, T27 and T31; this suite compares its cover table, paths and spots with Build 25 run here.',
  'The teammate and co-op know nothing of height yet (map build 6).']}, null, 2));
