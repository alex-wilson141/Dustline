// Build 33 (T43): Ambush on Dehrun Terraces, in the customs house. Kohar Valley's Ambush is what Build 32 had (both curves,
// every price, both bests, and a played run on either side of a connection, against Build 32 taken from its commit and run
// here); every area of the new arena opens only when bought, for the price shown, and stays open; the hostiles reach a
// player on every floor and on the roof, by the stairs, by the ladder and through windows that have been shot out; nobody
// arrives in view or inside anything over many waves; a run is played to its extraction and never stalls; bests are kept
// per map; a body walked into a flat wall at a slant is no longer slid along it, and is still helped past what stands
// proud beside a stair; the glass's pieces change nothing about when sight passes; host and guest see one arena.
// Headless: rendering, pointer capture and the connection are mocked. No frame time, feel or live network is measured.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
globalThis.location = {search: ''};
import {createGame, projectRoot} from './sprint-harness.mjs';
import {oldBuild} from './old-build.mjs';

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const maps = await import(new URL('dist/maps.js', projectRoot));
const A = await import(new URL('dist/ambush.js', projectRoot));
const R = await import(new URL('dist/records.js', projectRoot));
const {CLASSES} = await import(new URL('dist/combat.js', projectRoot));
const {ENEMY_AI} = await import(new URL('dist/enemy-ai.js', projectRoot));
const {BODY} = await import(new URL('dist/space.js', projectRoot));
const SOURCE = process.env.DUSTLINE_GAME_SOURCE ? new URL('file://' + process.env.DUSTLINE_GAME_SOURCE) : undefined;
const ONLY = process.env.DUSTLINE_T43_ONLY?.split(',');
const BEFORE = 'ad8caca';   // Build 32
const results = [], report = {};
async function check(tag, name, fn) { if (ONLY && !ONLY.includes(tag)) return; await fn(); results.push(name); }
const DEHRUN = await maps.loadMap('dehrun'); maps.selectMap('kohar');
const V = (x, y, z) => new THREE.Vector3(x, y, z), wire = m => JSON.parse(JSON.stringify(m)), same = v => JSON.parse(JSON.stringify(v));
const enemies = g => g.actors.filter(a => a.team === 'enemy'), alive = g => enemies(g).filter(a => a.hp > 0);
function storage() { const m = new Map(); return {getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => m.delete(k), map: m}; }
const D = DEHRUN.ambush, GATE = Object.fromEntries(D.gates.map(q => [q.id, q]));
// Where a buyer stands at each barricade, and a place inside each area [x, y, z].
const STAND = {roof: [8.76, 6.6, 61.4], first: [-8.76, 6.6, 61.3], ground: [11.28, 3.4, 61.4], square: [0, .05, 69], lower: [0, 0, 78], west: [-20, 0, 62], east: [20, 0, 62]};
const INSIDE = {1: [0, 6.6, 61.3], 2: [0, 9.83, 65], 3: [0, 3.4, 61.3], 4: [0, .05, 61.3], 5: [0, 0, 48], 6: [0, -1.6, 95], 7: [-40, 0, 60], 8: [40, 0, 60]};
const ORDER = ['roof', 'first', 'ground', 'square', 'lower', 'west', 'east'];

// A game on a map, in Ambush, the real AI running. The map stays the active one while the game is played (as on a page).
async function world(map = 'dehrun', {source = SOURCE, mode = 'ambush'} = {}) { maps.selectMap(map); const g = await createGame(source ? {sourcePath: source} : {}); g.prepare({clearLane: false}); if (g.built) await g.built.ready;
  g.el('blood').checked = false; for (const a of g.actors) a.animate = a.visual.animate; let clock = 0;
  g.begin = (m = mode) => { g.setMode(m); g.reset(); g.play(); g.restoreAI(); g.set({hp: 1e9}); g.frame(clock += 1000 / 60); };
  g.run = (s, each) => { for (let i = 0, n = Math.round(s * 60); i < n; i++) { g.frame(clock += 1000 / 60); if (each?.(i / 60) === false) break; } };
  g.put = (x, y, z, yaw = 0) => { g.player.set(x, y, z); g.set({yaw, pitch: 0}); g.height?.settle?.(); };
  g.buy = id => { g.put(...STAND[id]); g.amb.points = Math.max(g.amb.points, GATE[id].price); return g.ambush.interact(); };
  g.begin(); return g; }
// The stand-in for play: a hostile that has its player in sight within `reach` metres for a second is killed, and scores.
function cull(g, reach = 9, tally = null) { for (const a of alive(g)) { if (a.climb?.vault) a.cameBy = 'window'; else if (a.climb) a.cameBy = 'ladder'; const d = a.g.position.distanceTo(g.player); if (d < reach && a.seen) { a.inSight = (a.inSight || 0) + 1 / 60; if (a.inSight > 1) { a.hp = 0; a.dead = 999; a.diedAt = g.state().elapsed; a.inSight = 0; g.ambush.kill(false); if (tally) { tally.kills++; tally[a.cameBy || 'stairs'] = (tally[a.cameBy || 'stairs'] || 0) + 1; tally.levels.add(Math.round(a.g.position.y)); } a.cameBy = null; } } else a.inSight = 0; } }
const blocked = (g, b) => !g.height.space.clear((b.x[0] + b.x[1]) / 2, (b.z[0] + b.z[1]) / 2, (b.foot ?? b.y[0]) + .5, (b.foot ?? b.y[0]) + 1.6, .1);
const shut = g => g.built.navigation().nodes.reduce((n, q) => n + (q.shut ? 1 : 0), 0);

await check('kohar', 'Kohar Valley\'s Ambush is Build 32\'s: the solo curve and the two-player curve for forty waves, the hostiles\' tunables for each, every barricade, crate, magazine and dressing price, the bank multiplier, the arena and both keys of the personal bests, number for number against Build 32 taken from its commit; and a solo run and a two-player run played by the present game and by Build 32\'s are the same to the last place', async () => {
  const old = await oldBuild(BEFORE), OA = await old.module('ambush.js'), OR = await old.module('records.js'); assert.equal(maps.activeMap().id, 'kohar'); assert.equal(A.LEVELS, false); assert.equal(A.CURVE, null);
  for (let n = 1; n <= 40; n++) { assert.deepEqual(A.waveSpec(n), OA.waveSpec(n), `the solo curve at wave ${n}`); assert.deepEqual(A.waveSpec(n, 2), OA.waveSpec(n, 2), `the two-player curve at wave ${n}`); assert.deepEqual(same(A.aiTuningFor(n, ENEMY_AI)), same(OA.aiTuningFor(n, ENEMY_AI)), `the hostiles at wave ${n}`);
    for (const c of Object.values(CLASSES)) assert.equal(A.magazinePrice(c, n), OA.magazinePrice(c, n)); assert.equal(A.dressingPrice(n), OA.dressingPrice(n)); assert.equal(A.bankMultiplier(n), OA.bankMultiplier(n)); }
  assert.deepEqual(same(A.AMBUSH), same(OA.AMBUSH), 'the rules'); assert.deepEqual(same(A.GATES), same(OA.GATES), 'the barricades and their prices'); assert.deepEqual(same(A.STATIONS), same(OA.STATIONS), 'the crates and their prices'); assert.deepEqual(same(A.AREAS), same(OA.AREAS), 'the areas');
  for (const c of Object.values(CLASSES)) assert.equal(A.rifleMagazines(c), OA.rifleMagazines(c));
  assert.equal(R.BEST_KEY, OR.BEST_KEY); assert.equal(R.BEST_KEY_COOP, OR.BEST_KEY_COOP); assert.equal(R.bestKey('kohar'), OR.BEST_KEY); assert.equal(R.bestKey('kohar', true), OR.BEST_KEY_COOP); assert.equal(R.bestKey(undefined), OR.BEST_KEY);
  // Kohar Valley's side of every line that branches on the arena's height is the text Build 32 had (on flat ground a played
  // run cannot tell a distance measured with height from one without: the courtyard is level to centimetres).
  const read = u => fs.readFileSync(u, 'utf8'), thenText = read(path.join(old.dir, 'dist', 'game.js')), nowText = read(SOURCE || new URL('dist/game.js', projectRoot)), times = (t, f) => t.split(f).length - 1;
  for (const f of ['Math.hypot(p.x-tp.x,p.z-tp.z),hurt=a.hp<', 'pathTo(V2(x,z),at).length>AMBUSH.spawnMaxRoute', 'buildBarricade(gate,groundY,ambMats)', 'arenaEdges(amb.open,[...amb.gates.values()].map(g=>g.gate))', 'const c=ambushCover(a,p,d,tp);', 'const [gx,gz]=d<=AMBUSH.holdRange+1&&!seen?[tp.x,tp.z]:ambushSlot(a,tp);planRoute(a,gx,gz);ai.rl0=a.route.length;', 'if(pathTo(V2(x,z),from[j].at).length<=AMBUSH.spawnMaxRoute)good++;', 'solids.push(s.solid);amb.stations.push({st,...s});']) { assert(times(thenText, f) >= 1, `Build 32 has "${f}"`); assert(times(nowText, f) >= times(thenText, f), `Kohar Valley's side is no longer "${f}"`); }
  // A played solo run: 150 s of the real director and AI, the player standing in the courtyard, a kill a second after contact.
  const was = pathToFileURL(path.join(old.dir, 'dist', 'game.js'));
  const solo = async source => { const g = await world('kohar', {source}); const rows = []; g.run(150, t => { cull(g, 14); if (Math.round(t * 60) % 120 === 0) rows.push([g.amb.wave, g.amb.phase, g.amb.toSpawn, g.amb.points, g.amb.bearing ?? null, ...enemies(g).map(a => [+a.g.position.x.toFixed(4), +a.g.position.z.toFixed(4), a.hp, a.ai?.state ?? null])]); }); return rows; };
  const now = await solo(SOURCE), then = await solo(was); assert(now.length >= 74 && now.at(-1)[3] >= 900 && now.at(-1)[0] >= 1, `the run was played: wave ${now.at(-1)[0]}, ${now.at(-1)[3]} points`); assert.deepEqual(now, then, 'a solo run');
  // A two-player run: the host's director and AI, both players standing, 60 s.
  const duo = async source => { const page = async role => { const g = await createGame(source ? {sourcePath: source} : {}); g.prepare({role, clearLane: false}); g.el('blood').checked = false; for (const a of g.actors) a.animate = a.visual.animate; return g; }, host = await page('host'), guest = await page('guest');
    host.peer.send = m => { if (!host.peer.connected) return false; guest.receive(wire(m)); return true; }; guest.peer.send = m => { if (!guest.peer.connected) return false; host.receive(wire(m)); return true; };
    host.receive({type: 'hello', classId: 'assault'}); guest.receive({type: 'hello', classId: 'assault'}); host.setMode('ambush'); host.start(); host.play(); guest.play(); host.restoreAI(); let clock = 0; host.frame(0); guest.frame(0); host.set({hp: 1e9}); host.remote.hp = 1e9;
    const rows = []; for (let i = 0; i < 3600; i++) { clock += 1000 / 60; host.frame(clock); guest.frame(clock); host.remote.hp = 1e9; if (i % 120 === 0) rows.push([host.amb.wave, host.amb.phase, host.amb.toSpawn, host.amb.squad, same(host.amb.sent), guest.amb.wave, guest.amb.points, ...enemies(host).map(a => [+a.g.position.x.toFixed(4), +a.g.position.z.toFixed(4), a.hp, a.ai?.prey ?? null])]); } return rows; };
  const two = await duo(SOURCE), twoThen = await duo(was); assert(two.some(r => r[0] >= 1 && r[3] === 2), 'the two-player wave came'); assert.deepEqual(two, twoThen, 'a two-player run');
  report.kohar = {against: BEFORE, waves: 40, solo: `${now.length} samples identical`, coop: `${two.length} samples identical`, keys: [R.BEST_KEY, R.BEST_KEY_COOP]};
});

let G;   // one game on Dehrun Terraces for the solo checks
const dehrun = async () => { maps.selectMap('dehrun'); return G ??= await world('dehrun'); };

await check('areas', 'every area of the customs house opens only when bought and stays open: before a barricade is bought its openings stop a body, its places are shut to the hostiles\' navigation and a body in the area behind is outside the arena; it is bought only from the open side, on its own floor, with the points, for exactly the price its board, the prompt and the map show; bought, the openings are clear, the area is the arena and stays so through the waves; a new run closes everything again, and another mode finds no barricade, crate or shut place left', async () => {
  const g = await dehrun(); g.begin(); const sp = g.height.space; assert.equal(maps.activeMap().id, 'dehrun'); assert(A.LEVELS && g.amb.gates.size === 7 && g.amb.stations.length === 4 && A.AREAS.length === 8);
  assert.deepEqual([...g.amb.open], [1]); assert(Math.abs(g.player.y - 6.6) < .02 && g.ambush.inside(g.player), 'the run starts on the top floor, inside'); assert(Math.abs(g.state().yaw + Math.PI / 2) < 1e-9, 'looking along the corridor'); const shutAll = shut(g); assert(shutAll > 60, `${shutAll} places shut`);
  for (const id of [2, 3, 4, 5, 6, 7, 8]) assert(!g.ambush.inside(V(...[INSIDE[id][0], INSIDE[id][1], INSIDE[id][2]])), `area ${id} is outside the arena before it is bought`);
  const rows = []; let spent = 0;
  for (const id of ORDER) { const q = GATE[id], state = () => g.ambush.now().gates.find(s => s.id === id).state; assert.equal(state(), g.amb.open.has(q.from) ? 'purchasable' : 'locked');
    for (const b of q.blocks) assert(blocked(g, b), `${id}: a body is stopped at ${[b.x, b.z]}`); assert(!g.ambush.inside(V(...INSIDE[q.opens])));
    // Not from another floor, not without the points, not from the far side.
    g.put(STAND[id][0], STAND[id][1] + 3.2, STAND[id][2]); assert.equal(g.ambush.near(), null, `${id}: not from the floor above`); g.put(...INSIDE[q.opens]); assert.equal(g.ambush.near(), null, `${id}: not from behind it`);
    g.put(...STAND[id]); const n = g.ambush.near(); assert(n && n.kind === 'gate' && n.gate.id === id && n.price === q.price, `${id}: the purchase in reach is this barricade at its price`); assert(g.ambush.prompt().includes(`${q.price} PTS`), `${id}: the prompt shows ${q.price}`);
    assert.equal(g.ambush.marks().get('gate:' + id).userData.label, String(q.price), `${id}: the board shows ${q.price}`); assert(g.ambush.mapLayout().labels.some(l => l.kind === 'gate' && l.id === id && l.text === `${q.price} PTS`), `${id}: the map shows ${q.price}`);
    g.amb.points = q.price - 1; assert.equal(g.ambush.interact(), false); assert.equal(g.amb.points, q.price - 1); assert(g.amb.gates.has(id), `${id}: not for one point less`);
    g.amb.points = q.price + 7; assert.equal(g.ambush.interact(), true); assert.equal(g.amb.points, 7, `${id}: exactly ${q.price} points taken`); spent += q.price;
    assert(!g.amb.gates.has(id) && g.amb.open.has(q.opens) && state() === 'open'); for (const b of q.blocks) assert(!blocked(g, b), `${id}: the opening is clear`); assert(g.ambush.inside(V(...INSIDE[q.opens])), `${id}: the area is the arena`); assert(!g.ambush.marks().has('gate:' + id));
    rows.push([id, q.price, D.areas.find(a => a.id === q.opens).name]); }
  assert.equal(g.amb.open.size, 8); assert.equal(spent, 8000); assert.equal(shut(g), shut(g)); const crateShut = shut(g); assert(crateShut > 0 && crateShut < shutAll, 'only the crates\' places are shut now');
  // Through two waves' starts and a break, everything stays open and the HUD says so.
  g.ambush.startWave(1); g.run(1); g.ambush.startWave(2); g.run(1); g.ambush.hud(); assert.equal(g.amb.open.size, 8); assert.equal(g.amb.gates.size, 0); assert(g.el('distance').textContent.includes('8/8 AREAS OPEN'), g.el('distance').textContent);
  for (const id of Object.keys(INSIDE)) assert(g.ambush.inside(V(...INSIDE[id])), `area ${id} stays open`);
  // Crates: each sells its rifle at its price on its own floor, only once its area is open (the roof's was bought above).
  for (const st of D.stations) { g.put(st.at[0] + 1.2, st.y, st.at[1]); const n = g.ambush.near(); assert(n && (n.kind === 'weapon' || n.kind === 'crate') && n.st.weapon === st.weapon && (n.price == null || n.price === st.price), `the ${st.weapon} crate`); g.put(st.at[0] + 1.2, st.y + 3.2, st.at[1]); const up = g.ambush.near(); assert(!up || up.st?.weapon !== st.weapon, 'not from the floor above'); }
  // A new run: closed again. Another mode: nothing left.
  g.begin(); assert.equal(g.amb.gates.size, 7); assert.deepEqual([...g.amb.open], [1]); assert.equal(shut(g), shutAll); for (const q of D.gates) for (const b of q.blocks) assert(blocked(g, b));
  g.put(4 + 1.2, 6.6, 55.2); assert.equal(g.ambush.near()?.st?.weapon, 'medic'); g.put(-9 + 1.2, 3.4, 68.6); assert.equal(g.ambush.near(), null, 'a crate on a floor not bought sells nothing');
  g.begin('skirmish'); assert.equal(shut(g), 0); for (const q of D.gates) for (const b of q.blocks) assert(!blocked(g, b), 'no barricade in Skirmish'); assert.equal(g.scene.children.filter(o => o.userData?.marking).length, 0);
  report.areas = {order: rows, total: spent, shut: {start: shutAll, allOpen: crateShut}, crates: D.stations.map(s => [s.weapon, s.price, D.areas.find(a => a.id === s.area).name])};
});

await check('reach', 'the hostiles reach the player on every floor and on the roof: with the player on the top floor (nothing bought), on the roof, on the first floor and on the ground floor, hostiles that arrived outside come to within nine metres on the player\'s own level with the player in sight, within two minutes; some come up the ladder to the roof; and one standing outside a ground-floor window climbs through it once its pane is shot out, and while the pane is whole its way is round by a door and nobody ever climbs through a whole pane', async () => {
  const g = await dehrun(), out = {};
  for (const [name, buys, at] of [['top floor', [], INSIDE[1]], ['roof', ['roof'], INSIDE[2]], ['first floor', ['first'], INSIDE[3]], ['ground floor', ['first', 'ground'], INSIDE[4]]]) { g.begin(); for (const id of buys) assert(g.buy(id)); g.put(...at); g.ambush.startWave(3);
    let met = null, ladder = false; g.run(120, t => { g.put(...at); for (const a of alive(g)) { if (a.climb && !a.climb.vault) ladder = true; if (a.seen && a.g.position.distanceTo(g.player) < 9 && Math.abs(a.g.position.y - at[1]) < .6) { met = t; return false; } } });
    assert(met != null, `${name}: nobody reached the player in two minutes`); assert(g.state().state === 'playing'); out[name] = +met.toFixed(1); if (name === 'roof') { out.ladder = ladder; assert(ladder, 'the roof is reached by the ladder'); } }
  // Through a window. Pane 45 is the middle window of the west face's ground floor; the player stands in the room behind it.
  const pane = (() => { let best = -1, bd = 9; g.glass.G.panes.forEach((q, i) => { const d = Math.hypot(q.at[0] + 12.87, q.at[1] - 1.55, q.at[2] - 66.5); if (d < bd) { bd = d; best = i; } }); assert(bd < .3); return best; })();
  const nav = g.built.navigation(), outside = {x: -14.6, y: .018, z: 66.5}, room = {x: -8, y: .05, z: 66.5};
  const through = broken => { g.begin(); for (const id of ['first', 'ground']) assert(g.buy(id)); g.put(room.x, room.y, room.z); g.ambush.startWave(1); let a = null; g.run(40, () => { a = alive(g)[0]; return !a; }); assert(a, 'a hostile arrived');
    if (broken) g.glass.break(pane); const way = nav.route(outside, room); g.amb.toSpawn = 0; for (const b of alive(g)) if (b !== a) { b.hp = 0; b.dead = 999; b.gone = true; b.g.visible = false; } a.g.position.set(outside.x, outside.y, outside.z); a.route = []; a.climb = a.fall = null; Object.assign(a.ai, {routeAt: 0, far: false, state: 'advance', push: false});
    let climbed = false, inside = null; g.run(25, t => { g.put(room.x, room.y, room.z); g.amb.toSpawn = 0; if (a.climb?.vault) { climbed = true; assert(g.glass.G.broken[a.climb.vault.pane], 'a hostile climbing through a whole pane'); } if (a.hp > 0 && a.g.position.x > -12.4 && a.g.position.x < 12.4 && a.g.position.z > 53.5 && a.g.position.z < 70.5 && !a.climb) { inside = t; return false; } }); return {climbed, inside, way: {length: +way.length.toFixed(1), windows: way.way.filter(w => w.vault).length, reaches: way.reaches}}; };
  // A pane whole again when the hostile gets to it (a way planned while it was broken): it does not climb.
  const mended = (() => { g.begin(); for (const id of ['first', 'ground']) assert(g.buy(id)); g.put(room.x, room.y, room.z); g.ambush.startWave(1); let a = null; g.run(40, () => { a = alive(g)[0]; return !a; }); g.glass.break(pane); g.amb.toSpawn = 0; for (const b of alive(g)) if (b !== a) { b.hp = 0; b.dead = 999; b.gone = true; b.g.visible = false; }
    a.g.position.set(outside.x - 3, outside.y, outside.z); a.route = []; a.climb = a.fall = null; Object.assign(a.ai, {routeAt: 0, far: false, state: 'advance', push: false}); let planned = false, climbed = false;
    g.run(12, () => { g.put(room.x, room.y, room.z); g.amb.toSpawn = 0; a.seen = null; a.blindUntil = 0; if (!planned && a.route?.some(w => w.vault)) { planned = true; g.glass.G.reset(); } if (planned) { a.glassAt = null; g.glass.G.reset(); } if (a.climb?.vault) climbed = true; }); return {planned, climbed}; })();
  assert(mended.planned && !mended.climbed, `a pane made whole before the climb is not climbed through: ${JSON.stringify(mended)}`);
  const whole = through(false); assert(whole.way.reaches && whole.way.windows === 0 && whole.way.length > 30, `with the pane whole the way is round by the door: ${JSON.stringify(whole.way)}`);
  const open = through(true); assert(open.way.reaches && open.way.windows === 1 && open.way.length < 12, `with the pane broken the way is through the window: ${JSON.stringify(open.way)}`); assert(open.climbed && open.inside != null && open.inside < 15,   /* it stops to fire through the opening first */ `through the broken window: ${JSON.stringify(open)}`);
  report.reach = {...out, window: {through: +open.inside.toFixed(1), wayThrough: open.way.length, wayRound: whole.way.length}};
});

await check('spawns', 'nobody arrives in view or inside anything: over the waves of a run at its start, of one whose wave is told to come from where nothing has a way in, of one with the player on the roof\'s edge looking over the town, of a run with everything bought and the player on the square, and of one with the player at the far end of the lower town, every arrival stands on a place of the navigation with room for its body, out of every line of sight from the player\'s eye, at least 35 m from the player, at least 6 m outside the open arena and with a way to the player; and there the waves still come (arrivals in each case)', async () => {
  const g = await dehrun(), nav = g.built.navigation(), sp = g.height.space, out = {};
  for (const [name, buys, at, secs, from] of [['start', [], INSIDE[1], 150], ['the start, a wave told to come from the south, where nothing has a way in yet', [], INSIDE[1], 60, 180], ['on the roof\'s north edge, the town in view', ['roof'], [0, 9.83, 54.6], 90], ['all bought, on the square', ORDER, [0, 0, 74], 110], ['all bought, far end of the lower town', ORDER, [60, -1.6, 100], 110]]) { g.begin(); for (const id of buys) assert(g.buy(id)); g.put(...at); g.ambush.startWave(6);
    const seen = new Map(); let n = 0, nearest = 1e9; g.run(secs, () => { g.put(...at); if (from != null) g.amb.bearing = from; cull(g, 9); for (const a of enemies(g)) { if (a.hp <= 0 || seen.get(a) === a.bornAt) continue; seen.set(a, a.bornAt); n++; const p = a.g.position, eye = g.player.clone().setY(g.player.y + 1.7);
        assert(nav.free(p.x, p.z, p.y), `an arrival with no room at ${[p.x, p.y, p.z]}`); assert(sp.clear(p.x, p.z, p.y + .4, p.y + 1.75, .3), `an arrival inside something at ${[p.x, p.y, p.z]}`);
        for (const h of [1, 1.7]) assert(!g.glass.visible(eye, V(p.x, p.y + h, p.z)), `${name}: an arrival in view at ${[p.x, p.y, p.z]}`); const d = Math.hypot(p.x - g.player.x, p.z - g.player.z); nearest = Math.min(nearest, d); assert(d >= A.AMBUSH.spawnMinDist - .01, `an arrival ${d.toFixed(1)} m away`);
        assert(A.distToArena(g.amb.open, p.x, p.z) >= A.AMBUSH.spawnMargin - .01, 'an arrival within the arena\'s margin'); assert(g.ambush.field('player').far[nav.nearest(p.x, p.z, p.y).id] >= 0, 'an arrival with no way to the player'); } });
    assert(n >= (from != null ? 3 : 6), `${name}: ${n} arrivals`); assert(g.state().state === 'playing'); out[name] = {arrivals: n, nearest: +nearest.toFixed(1)}; }
  report.spawns = out;
});

await check('run', 'a run is played to its end and never stalls: from the top floor with nothing bought, five waves are survived (every hostile that comes within sight of the player is killed a second later), no half minute passes in a wave without an arrival, a kill or a hostile on its way getting nearer, the alive count never passes the wave\'s cap and reaches it, each wave sends exactly the count it announced, the extraction offered after wave 5 banks the points earned, and the best is recorded for this map', async () => {
  const g = await dehrun(), store = globalThis.localStorage = storage(); g.begin(); const tally = {kills: 0, levels: new Set()}, caps = {}; let quiet = 0, worstQuiet = 0, last = '', sentAt = 0, count = 0, ended = false;
  g.run(1500, () => { cull(g, 9, tally); const d = g.amb, w = A.waveSpec(Math.max(1, d.wave), 1), n = alive(g).length; if (d.phase === 'wave') { assert(n <= w.aliveCap, `wave ${d.wave}: ${n} alive, cap ${w.aliveCap}`); caps[d.wave] = Math.max(caps[d.wave] || 0, n);
      const near = Math.min(1e9, ...alive(g).map(a => a.route?.length ?? 1e9)), sig = `${d.toSpawn}/${tally.kills}/${Math.floor(near / 6)}`; if (sig === last) quiet += 1 / 60; else { quiet = 0; last = sig; } worstQuiet = Math.max(worstQuiet, quiet); assert(quiet < 30, `wave ${d.wave} stood still for 30 s (${sig})`); } else quiet = 0;
    if (d.phase === 'wave' && d.wave !== sentAt) { sentAt = d.wave; count += w.count; assert.equal(d.toSpawn + d.spawned, w.count); }
    if (d.phase === 'decision' && d.survived >= 5) { g.ambush.decide(true); ended = true; return false; } if (d.phase === 'decision') g.ambush.decide(false); });
  assert(ended, `the run reached wave ${g.amb.wave} (${g.amb.phase}) in 25 minutes`); assert.equal(g.state().state, 'ended'); assert.equal(tally.kills, count, 'every hostile announced was sent and killed'); assert.equal(g.amb.earned, count * A.AMBUSH.killPoints); assert.equal(g.amb.banked, Math.round(g.amb.earned * A.bankMultiplier(5)));
  for (let n = 1; n <= 5; n++) assert.equal(caps[n], A.waveSpec(n).aliveCap, `wave ${n} reached its cap of ${A.waveSpec(n).aliveCap} alive (${caps[n]})`);
  assert.deepEqual(JSON.parse(store.getItem(R.bestKey('dehrun'))), {wave: 5, banked: g.amb.banked}); assert.equal(store.getItem(R.BEST_KEY), null, 'Kohar Valley\'s best is untouched');
  report.run = {waves: 5, hostiles: count, seconds: Math.round(g.state().elapsed), banked: g.amb.banked, longestStandstill: +worstQuiet.toFixed(1), came: {stairs: tally.stairs || 0, ladder: tally.ladder || 0, window: tally.window || 0}};
});

await check('curve', 'the curve shown is the curve played, and Dehrun\'s differs from Kohar Valley\'s only as its description says: for forty waves the count, the fight range and the pauses are Kohar Valley\'s, one more hostile is alive at once (never past the ceiling) and arrivals are a fifth closer together (never under a second), for one player and for two; the hostiles\' accuracy, damage and fire rate are in no curve', async () => {
  maps.selectMap('kohar'); const K = n => [A.waveSpec(n), A.waveSpec(n, 2)], kohar = Array.from({length: 40}, (_, i) => K(i + 1)); maps.selectMap('dehrun'); assert.deepEqual(A.CURVE, {alive: 1, gap: .8}); const table = [];
  for (let n = 1; n <= 40; n++) { const [k1, k2] = kohar[n - 1], d1 = A.waveSpec(n), d2 = A.waveSpec(n, 2), C = A.AMBUSH.coop; assert.equal(d1.count, k1.count); assert.equal(d1.fightRange, k1.fightRange); assert.equal(d1.pauseScale, k1.pauseScale); assert.equal(d1.aliveCap, Math.min(A.AMBUSH.aliveCeiling, k1.aliveCap + 1)); assert.equal(d1.spawnGap, Math.max(1, k1.spawnGap * .8));
    assert.equal(d2.count, k2.count); assert.equal(d2.aliveCap, Math.min(C.aliveCeiling, Math.ceil(d1.aliveCap * C.capScale))); assert.equal(d2.spawnGap, Math.max(C.gapFloor, d1.spawnGap * C.gapScale)); assert.deepEqual(Object.keys(d1).sort(), ['aliveCap', 'count', 'fightRange', 'pauseScale', 'spawnGap']);
    if ([1, 3, 5, 8, 12, 16].includes(n)) table.push({wave: n, count: d1.count, alive: [k1.aliveCap, d1.aliveCap], gap: [+k1.spawnGap.toFixed(2), +d1.spawnGap.toFixed(2)], coopAlive: [k2.aliveCap, d2.aliveCap]}); }
  report.curve = table;
});

await check('bests', 'personal bests are kept per map and per kind of run: four keys, Kohar Valley\'s two the ones it always had; a run recorded for one map and kind changes no other, and a better run on Dehrun leaves Kohar Valley\'s best what it was', async () => {
  const keys = [R.bestKey('kohar'), R.bestKey('kohar', true), R.bestKey('dehrun'), R.bestKey('dehrun', true)]; assert.equal(new Set(keys).size, 4); assert.deepEqual(keys.slice(0, 2), ['dustline.ambush.best', 'dustline.ambush.best.coop']);
  const s = storage(); R.recordBest({wave: 4, banked: 900}, s, keys[0]); R.recordBest({wave: 9, banked: 5000}, s, keys[2]); R.recordBest({wave: 7, banked: 0}, s, keys[3]);
  assert.deepEqual(R.readBest(s, keys[0]), {wave: 4, banked: 900}); assert.equal(R.readBest(s, keys[1]), null); assert.deepEqual(R.readBest(s, keys[2]), {wave: 9, banked: 5000}); assert.deepEqual(R.readBest(s, keys[3]), {wave: 7, banked: 0});
  // The game writes under its own map's key: a Kohar Valley run with a Dehrun best already stored.
  const store = globalThis.localStorage = storage(); R.recordBest({wave: 9, banked: 5000}, store, keys[2]); const k = await world('kohar'); k.ambush.finish(false, undefined, 'self'); maps.selectMap('dehrun'); assert.deepEqual(JSON.parse(store.getItem(keys[0])), {wave: 1, banked: 0}); assert.deepEqual(R.readBest(store, keys[2]), {wave: 9, banked: 5000}); assert.equal(store.getItem(keys[1]), null); assert.equal(store.getItem(keys[3]), null);
  report.bests = keys;
});

await check('nudge', 'the nudge no longer drags a body along a flat wall and still clears what stands proud beside a stair: walked into plain walls at slants of 10 to 80 degrees, with the nudge and without it the body ends in the same place to the millimetre; pressed into either wall on every stair flight it is never stopped with the nudge and is on eight or more walks without it; and the game\'s player, walking into the square\'s wall at a slant, ends where it does with the nudge switched off', async () => {
  const g = await dehrun(); g.begin('story'); const sp = g.height.space, flights = g.built.stats.flights; let walks = 0, worst = 0;
  // Plain walls: the square's west wall and south wall from inside, the customs house's corridor wall on the top floor.
  for (const [x, y, z, wx, wz] of [[-20.9, 0, 52, -1, 0], [-15, 0, 78.9, 0, 1], [3.5, 6.6, 60.6, 0, -1]]) for (const deg of [10, 25, 45, 65, 80]) for (const side of [1, -1]) { const a = deg * Math.PI / 180, dx = (wx * Math.cos(a) + wz * Math.sin(a) * side) * .05, dz = (wz * Math.cos(a) + wx * Math.sin(a) * side) * .05;
      const walk = nudge => { const p = V(x, sp.floor(x, z, y + .3).y, z); for (let i = 0; i < 40; i++) sp.move(p, dx, dz, BODY.stand, BODY.radius, {nudge}); return p; }, on = walk(BODY.nudge), off = walk(0); walks++; worst = Math.max(worst, Math.hypot(on.x - off.x, on.z - off.z));
      assert(Math.hypot(on.x - off.x, on.z - off.z) < .001, `dragged ${Math.hypot(on.x - off.x, on.z - off.z).toFixed(3)} m along the wall at ${[x, z]}, ${deg} degrees`); assert(Math.hypot(off.x - x, off.z - z) > .3, 'the body slid along the wall as any body does'); }
  const stops = nudge => { let n = 0; for (const f of flights) { const dir = Math.sign(f.run[1] - f.run[0]), at = (v, u) => f.axis === 'x' ? [u, v] : [v, u];
      for (const [v0, press] of [[f.across[0] + BODY.radius + .12, -1], [f.across[1] - BODY.radius - .12, 1]]) { const p = V(0, 0, 0), [x, z] = at(v0, f.run[0] - dir * .2); p.set(x, sp.floor(x, z, f.low + .5, .2, f.low).y, z); let still = 0;
        for (let i = 0; i < 400; i++) { const b = f.axis === 'x' ? p.x : p.z; sp.move(p, f.axis === 'x' ? dir * .05 : press * .05, f.axis === 'x' ? press * .05 : dir * .05, BODY.stand, BODY.radius, {nudge}); const a = f.axis === 'x' ? p.x : p.z;
          if (dir * (a - f.run[1]) > -.05) break; const v = f.axis === 'x' ? p.z : p.x; if (v < f.across[0] - .05 || v > f.across[1] + .05) break; still = Math.abs(a - b) < .01 ? still + 1 : 0; if (still === 3) { n++; break; } } } } return n; };
  const withNudge = stops(BODY.nudge), without = stops(0); assert.equal(withNudge, 0, `stopped ${withNudge} times beside a stair with the nudge`); assert(without >= 8, `without it, stopped on ${without} walks`);
  // In the game: W held, facing the square's west wall at 40 degrees off square, for two seconds.
  const played = nudge => { const keep = BODY.nudge; BODY.nudge = nudge; g.begin('story'); g.put(-20.5, 0, 52, Math.PI / 2 + 40 * Math.PI / 180); g.press('KeyW'); g.run(2); g.release('KeyW'); BODY.nudge = keep; return [g.player.x, g.player.z]; };
  const on = played(BODY.nudge), off = played(0); assert(Math.hypot(on[0] - off[0], on[1] - off[1]) < .002, `the player was dragged ${Math.hypot(on[0] - off[0], on[1] - off[1]).toFixed(3)} m`); assert(Math.abs(off[1] - 52) > 1, 'the player slid along the wall');
  report.nudge = {flatWalks: walks, worstDifference: +worst.toFixed(4), stairStops: {with: withNudge, without}, player: on.map(v => +v.toFixed(3))};
});

await check('pieces', 'the glass breaks in pieces and nothing about sight or shots waits for them: a line through a window is blocked while its pane is whole and open the moment it breaks, before a frame is drawn and while every piece is in the air; the pieces are one drawing made with the game, twelve to a pane, gone within a second; breaking every pane of the town at once makes no mesh, never has more pieces than the pool and leaves the four glass drawings alone; a new mission puts them away', async () => {
  const g = await dehrun(); g.begin('story'); const P = g.glass.pieces, GL = g.glass.G; assert(P && P.mesh.userData.pieces && !P.mesh.userData.glass && P.count === 144 && P.each === 12); assert.equal(g.scene.children.filter(o => o.userData.glass).length, 4);
  const i = (() => { let best = -1, bd = 9; GL.panes.forEach((q, k) => { const d = Math.hypot(q.at[0] - 2, q.at[1] - 8.05, q.at[2] - 53.13); if (d < bd) { bd = d; best = k; } }); return best; })(), q = GL.panes[i], a = V(q.at[0], q.at[1], q.at[2] - 2), b = V(q.at[0], q.at[1], q.at[2] + 2);
  assert(!g.glass.visible(a, b), 'a whole pane stops sight'); const made = () => g.scene.children.filter(o => !g.effects.some(e => e.o === o)).length, meshes = made(); assert.equal(P.live, 0); assert(g.glass.break(i)); assert(g.glass.visible(a, b), 'sight passes at once'); assert.equal(made(), meshes, 'a break makes nothing but its puff of dust'); assert(!GL.hit(a, b.clone().sub(a).normalize(), 4), 'and a shot');
  assert.equal(P.live, 12); assert(P.list.filter(e => e.on).every(e => Math.abs(e.p.x - q.at[0]) < 1 && Math.abs(e.p.y - q.at[1]) < 1), 'the pieces start in the opening'); g.run(.3); assert(P.live === 12 && g.glass.visible(a, b)); g.run(.6); assert.equal(P.live, 0, 'gone within a second'); assert.equal(g.scene.children.filter(o => o.userData.pieces).length, 1);
  for (let k = 0; k < GL.count; k++) g.glass.break(k); assert(P.live <= P.count && P.live > 100); assert.equal(made(), meshes, 'nothing made by breaking them all'); assert.equal(g.scene.children.filter(o => o.userData.glass).length, 4); assert.equal(g.scene.children.filter(o => o.isInstancedMesh && o.userData.pieces).length, 1); g.run(1); assert.equal(P.live, 0);
  g.begin('story'); assert(!GL.broken[i]); assert(g.glass.break(i)); assert.equal(P.live, 12); g.begin('story'); assert.equal(P.live, 0, 'a new mission puts the pieces away'); assert(!GL.broken[i]);
  maps.selectMap('kohar'); const k = await world('kohar', {mode: 'story'}); assert.equal(k.glass, undefined, 'Kohar Valley has no glass and no pieces'); maps.selectMap('dehrun');
  report.pieces = {pool: P.count, perPane: P.each, life: P.life, panes: GL.count};
});

await check('coop', 'host and guest play one arena: both start on the top floor side by side and inside; a barricade bought by the guest and one bought by the host open on both pages, with the same areas, boards, map and prices on each and the buyer\'s own points taken; the floor below is outside the arena for either player while it is not bought (the host counts the same seconds for both and each page shows its own player the warning) and inside for both once it is; a crate on a floor sells to either player only on that floor; arrivals are dealt to both and reach both', async () => {
  maps.selectMap('dehrun'); const page = async role => { const g = await createGame(SOURCE ? {sourcePath: SOURCE} : {}); g.prepare({role, clearLane: false}); g.el('blood').checked = false; for (const a of g.actors) a.animate = a.visual.animate; await g.built.ready; return g; }, host = await page('host'), guest = await page('guest');
  host.peer.send = m => { if (!host.peer.connected) return false; guest.receive(wire(m)); return true; }; guest.peer.send = m => { if (!guest.peer.connected) return false; host.receive(wire(m)); return true; };
  host.receive({type: 'hello', classId: 'assault'}); guest.receive({type: 'hello', classId: 'assault'}); host.setMode('ambush'); host.start(); host.play(); guest.play(); host.restoreAI(); for (const g of [host, guest]) assert(Math.abs(g.remote.g.position.y - 6.6) < .05 && Math.abs(g.player.y - 6.6) < .05, `at the start each page has both players on the top floor (${g.player.y}, ${g.remote.g.position.y})`); let clock = 0; host.frame(0); guest.frame(0);
  const step = (n = 1) => { for (let i = 0; i < n; i++) { clock += 1000 / 60; host.set({hp: 1e9}); host.remote.hp = 1e9; host.frame(clock); guest.frame(clock); } }, place = (who, x, y, z) => { const me = who === 'host' ? host : guest, other = who === 'host' ? guest : host; me.player.set(x, y, z); me.height?.settle?.(); other.remote.g.position.set(x, y, z); other.remote.netPos = null; };
  step(8); assert(host.amb.coop && guest.amb.coop && host.amb.squad === 2); for (const g of [host, guest]) { assert(Math.abs(g.player.y - 6.6) < .05, `starts on the top floor (${g.player.y})`); assert(g.ambush.inside(g.player)); assert(g.ambush.inside(g.remote.g.position)); assert.equal(g.amb.gates.size, 7); }
  assert(Math.abs(host.player.distanceTo(guest.player) - 3) < 1.2, `side by side: ${host.player.distanceTo(guest.player)}`);
  const view = g => ({open: [...g.amb.open].sort(), gates: g.ambush.now().gates.map(s => [s.id, s.state, s.price]), marks: [...g.ambush.marks().entries()].map(([k, b]) => [k, b.userData.lit, b.userData.label]).sort(), map: g.ambush.mapLayout().labels.filter(l => l.kind !== 'area' || true).map(l => [l.kind, l.id, l.text, l.x, l.y]), edge: same(g.amb.segs)}); assert.deepEqual(view(guest), view(host), 'one arena at the start');
  // Out of bounds by height, for either player: the first floor before it is bought.
  for (const who of ['guest', 'host']) { place(who, 0, 3.4, 61.3); step(120); const out = who === 'host' ? host.amb.out : host.amb.mate.out, me = who === 'host' ? host : guest; assert(out > 1.7 && out < 2.3, `${who}: ${out} s outside counted by the host`); assert.equal(me.el('bounds').hidden, false, `${who} is shown the warning`); assert(!me.ambush.inside(me.player)); place(who, who === 'host' ? 0 : 3, 6.6, 61.3); step(20); assert.equal(who === 'host' ? host.amb.out : host.amb.mate.out, 0); assert.equal(me.el('bounds').hidden, true); }
  // The guest buys the way down; the host buys the roof.
  place('guest', ...STAND.first); step(6); host.amb.mate.points = guest.amb.points = 800; const hostPts = host.amb.points; assert(guest.ambush.near()?.gate?.id === 'first'); assert(guest.ambush.interact()); step(8); for (const g of [host, guest]) assert(!g.amb.gates.has('first') && g.amb.open.has(3)); assert.equal(host.amb.mate.points, 50); assert.equal(guest.amb.points, 50); assert.equal(host.amb.points, hostPts, 'the host paid nothing');
  place('host', ...STAND.roof); step(6); host.amb.points = 500; assert(host.ambush.interact()); step(8); for (const g of [host, guest]) assert(!g.amb.gates.has('roof') && g.amb.open.has(2)); assert.equal(host.amb.points, 0); assert.equal(guest.amb.points, 50); assert.deepEqual(view(guest), view(host), 'one arena after both purchases');
  for (const who of ['guest', 'host']) { place(who, 0, 3.4, 61.3); step(60); const me = who === 'host' ? host : guest; assert(me.ambush.inside(me.player)); assert.equal(who === 'host' ? host.amb.out : host.amb.mate.out, 0, `${who}: the first floor is the arena now`); assert.equal(me.el('bounds').hidden, true); }
  // A crate sells on its own floor only, to either.
  for (const who of ['guest', 'host']) { const me = who === 'host' ? host : guest; place(who, -9 + 1.2, 3.4, 68.6); step(4); assert.equal(me.ambush.near()?.st?.weapon, 'assault'); assert.equal(host.ambush.near(who === 'host' ? 'me' : 'mate')?.st?.weapon, 'assault'); place(who, -9 + 1.2, 6.6, 68.6); step(4); assert.notEqual(me.ambush.near()?.st?.weapon, 'assault'); assert.notEqual(host.ambush.near(who === 'host' ? 'me' : 'mate')?.st?.weapon, 'assault'); }
  // A wave: both are hunted and reached. The host on the top floor, the guest on the first.
  place('host', 0, 6.6, 61.3); place('guest', 0, 3.4, 61.3); step(4); host.ambush.startWave(4); const met = {player: null, mate: null}; let t = 0;
  for (; t < 150 * 60 && !(met.player != null && met.mate != null); t++) { place('host', 0, 6.6, 61.3); place('guest', 0, 3.4, 61.3); step(); for (const a of alive(host)) { const k = a.ai.prey, q = k === 'mate' ? host.remote.g.position : host.player; if (met[k] == null && a.g.position.distanceTo(q) < 9 && Math.abs(a.g.position.y - q.y) < .6) met[k] = t / 60; } }
  assert(met.player != null && met.mate != null, `both reached: ${JSON.stringify(met)}`); assert(Math.abs(host.amb.sent.player - host.amb.sent.mate) <= 1, `dealt alike: ${JSON.stringify(host.amb.sent)}`); assert.equal(guest.amb.wave, 4);
  report.coop = {start: 'top floor, both inside', bought: {guest: 'first floor', host: 'roof'}, reached: {host: +met.player.toFixed(1), guest: +met.mate.toFixed(1)}, sent: same(host.amb.sent)};
});

await check('map', 'the map (M) shows the arena at every stage of a run with no label overlapping another or a marker, none outside the canvas and none unplaced; the three upper floors are drawn side by side north of the square, each barricade and crate on its own floor\'s plan, and the player\'s arrow on the plan of the floor the player stands on', async () => {
  const g = await dehrun(); g.begin(); const over = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; let labels = 0;
  const look = stage => { const L = g.ambush.mapLayout(), markers = [...L.gates.map(q => ({x: q.at[0] - 9, y: q.at[1] - 9, w: 18, h: 18})), ...L.crates.map(c => ({x: c.at[0] - 9, y: c.at[1] - 9, w: 18, h: 18}))];
    for (const [i, l] of L.labels.entries()) { labels++; assert(!l.unplaced, `${stage}: "${l.text}" found a place`); assert(l.x >= 0 && l.y >= 0 && l.x + l.w <= L.w && l.y + l.h <= L.h, `${stage}: "${l.text}" inside the canvas`); for (const m of L.labels.slice(i + 1)) assert(!over(l, m), `${stage}: "${l.text}" overlaps "${m.text}"`); for (const m of markers) assert(!over(l, m), `${stage}: "${l.text}" covers a marker`); } return L; };
  let L = look('start'); const rect = id => L.areas.find(a => a.id === id).rect, inRect = (p, r) => p[0] >= r.x - 1 && p[0] <= r.x + r.w + 1 && p[1] >= r.y - 1 && p[1] <= r.y + r.h + 1;
  for (const [a, b] of [[1, 2], [1, 3], [2, 3], [1, 4], [2, 5], [3, 5], [1, 5]]) assert(!over(rect(a), rect(b)), `the plans of areas ${a} and ${b} lie apart`); assert(inRect(L.player.at, rect(1)), 'the arrow is on the top floor\'s plan');
  for (const q of L.gates) assert(inRect(q.at, rect(GATE[q.id].from)), `the ${q.id} barricade is on its floor's plan`); for (const c of L.crates) assert(inRect(c.at, rect(D.stations.find(s => s.weapon === c.weapon).area)), `the ${c.weapon} crate is on its floor's plan`);
  for (const id of ORDER) { assert(g.buy(id)); L = look('after ' + id); } g.put(...INSIDE[2]); L = look('on the roof'); assert(inRect(L.player.at, rect(2))); g.put(...INSIDE[3]); L = g.ambush.mapLayout(); assert(inRect(L.player.at, rect(3))); g.put(...INSIDE[6]); L = g.ambush.mapLayout(); assert(inRect(L.player.at, rect(6)));
  g.ambush.toggleMap(true); g.ambush.drawBigMap(); assert(g.el('maplegend').textContent.startsWith('AMBUSH · THE CUSTOMS HOUSE')); g.ambush.toggleMap(false);
  report.map = {stages: ORDER.length + 2, labelsChecked: labels};
});

maps.selectMap('kohar');
console.log(JSON.stringify({suite: 'T43 Ambush on Dehrun Terraces (Build 33)', passed: results.length, results, report}, null, 1));
