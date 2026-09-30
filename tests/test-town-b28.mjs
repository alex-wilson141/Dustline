// Build 28 (T38): the whole of Dehrun Terraces as grey-box, its stairs wide enough for two, and Skirmish on it. The town's
// shape is what the description says (six terraces, lanes with steps, districts either side of the block with houses of
// one to three storeys, some open with a stair to the roof, gates between everything); a flood of the player's body over
// the whole town finds no place with no way back and nothing beyond the walls; the enemies' navigation reaches every
// district, every open house's floor and roof, and the customs house entire, stranding nobody; two bodies stand side by
// side on every flight the kit built; Skirmish deploys, is fought and is won; the whole town stays under the ceilings.
import assert from 'node:assert/strict';
globalThis.location = {search: ''};
import {createGame, projectRoot} from './sprint-harness.mjs';

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const maps = await import(new URL('dist/maps.js', projectRoot));
const {BODY} = await import(new URL('dist/space.js', projectRoot));
const {FOE} = await import(new URL('dist/navmesh.js', projectRoot));
const SOURCE = process.env.DUSTLINE_GAME_SOURCE ? new URL('file://' + process.env.DUSTLINE_GAME_SOURCE) : undefined;
const ONLY = process.env.DUSTLINE_T38_ONLY?.split(',');
const results = [], report = {};
async function check(tag, name, fn) { if (ONLY && !ONLY.includes(tag)) return; await fn(); results.push(name); }
const page = () => createGame(SOURCE ? {sourcePath: SOURCE} : {});
const DEHRUN = await maps.loadMap('dehrun'); maps.selectMap('kohar');
const B = DEHRUN.block, K = B.houses.find(h => h.id === 'K'), E = DEHRUN.edges, near = (a, b, e, what) => assert(Math.abs(a - b) <= e, `${what}: ${a} against ${b}`);
const LEVELS = [-1.6, 0, 1.6, 3.2, 4.8, 6.4], LINES = [80, 17, -6, -55, -80];
async function town(mode = 'story') { maps.selectMap('dehrun'); let g; try { g = await page(); g.prepare({clearLane: false}); await g.built.ready; } finally { maps.selectMap('kohar'); }
  g.setMode(mode); g.reset(); g.play(); g.restoreAI(); g.set({hp: 100}); let clock = 0; g.frame(0);
  g.run = (s, each) => { for (let i = 0, n = Math.round(s * 60); i < n; i++) { g.frame(clock += 1000 / 60); if (each?.(i / 60) === false) break; } };
  g.enemies = () => g.actors.filter(a => a.team === 'enemy'); g.nav = g.built.navigation(); return g; }
const open = B.houses.filter(h => h.enter && h.id.length > 1), plain = B.houses.filter(h => h.plain);

await check('town', 'the town is laid out as described: six terraces from -1.6 to 6.4 m ending at five lines, steps on every lane where a line crosses it, retaining walls along the lines, walls round the town with the map\'s edges inside them, gates between the block, the square and the districts (all open), districts either side of the block on every terrace with houses of one to three storeys, nine of them open with an outside stair to their roof, and the customs house on the square in the middle', async () => {
  for (const [z, lv] of [[100, -1.6], [50, 0], [10, 1.6], [-20, 3.2], [-45, 3.2], [-70, 4.8], [-90, 6.4]]) for (const x of [-60, -30, 30, 60]) near(DEHRUN.height(x, z), lv, 1e-9, `the terrace at ${x}, ${z}`);
  for (const l of LINES) for (const x of [0, -48, 48]) { const above = DEHRUN.height(x, l - 1), below = DEHRUN.height(x, l + 4); const lane = (l === 80 || l === -80) ? x === 0 : true; if (!lane) continue; near(above - below, 1.6, 1e-9, `a rise at the line ${l}`); near(DEHRUN.height(x, l + 1.5), below + .8, 1e-9, `a ramp halfway up at ${x}, ${l}`); assert(B.steps.some(s => Math.abs(s.x[0] + s.x[1] - 2 * x) < .01 && s.z[0] === l), `steps on the lane at ${x}, ${l}`); }
  near(DEHRUN.height(-30, 82), -1.6, 1e-9, 'no ramp off the lanes'); assert(B.walls.filter(w => w.surface === 'drystone' && w.axis === 'x' && LINES.some(l => Math.abs(w.at - (l - .25)) < .01)).length >= 14, 'retaining walls on every line');
  assert(E.x[0] > -72 && E.x[1] < 72 && E.z[0] > -100 && E.z[1] < 105, 'the edges inside the town walls'); const along = (axis, at) => B.walls.filter(w => w.axis === axis && w.at === at).reduce((s, w) => s + Math.abs(w.to - w.from), 0); assert(along('z', -72) >= 200 && along('z', 72) >= 200 && along('x', 105) >= 140 && along('x', -100) >= 140, `walls all round (${[along('z', -72), along('z', 72), along('x', 105), along('x', -100)]})`);
  const gates = B.arches; assert(gates.length >= 11 && gates.every(a => !a.gate || a.ajar >= 1.2), `${gates.length} gates, all open`); assert(gates.filter(a => a.axis === 'z' && Math.abs(a.at) === 24).length === 6 && gates.filter(a => a.axis === 'z' && Math.abs(a.at) === 22).length === 2, 'gates in the block\'s side walls and the square\'s');
  assert(plain.length >= 40 && open.length === 9, `${plain.length} shells and ${open.length} open houses`); for (const h of open) assert(B.flights.some(f => f.axis === 'x' && Math.abs(f.at - h.z[1] - .2) < .01 && f.width >= 1.7), `${h.id} has its stair`); assert(new Set(plain.map(h => h.storeys.length)).size === 3, 'one, two and three storeys');
  const districts = {westLower: [-72, -24, 17, 80], eastLower: [24, 72, 17, 80], westMiddle: [-72, -24, -6, 17], eastMiddle: [24, 72, -6, 17], westUpper: [-72, -24, -55, -6], eastUpper: [24, 72, -55, -6], north: [-72, 72, -80, -55], top: [-72, 72, -100, -80], lower: [-72, 72, 80, 105]};
  for (const [name, [x0, x1, z0, z1]] of Object.entries(districts)) assert(B.houses.some(h => h.x[0] >= x0 && h.x[1] <= x1 && h.z[0] >= z0 && h.z[1] <= z1), `${name} has houses`);
  assert(K.x[0] === -13 && K.z[0] === 53 && DEHRUN.relay[1] > K.z[1], 'the customs house on the square, the relay before it');
  report.town = {levels: LEVELS, lines: LINES, houses: B.houses.length, shells: plain.length, open: open.map(h => h.id), gates: gates.length, districts: Object.keys(districts)};
});

await check('flood', 'a flood of the player\'s body over the whole town (half-metre steps, step-ups, drops with the landing push, pull-ups, crouching where it must) reaches every terrace, every district, the roof of every open house and the customs house entire, from the start; from every place it reaches the street is reached again; nothing beyond the edges, nothing inside a wall', async () => {
  const g = await town(), sp = g.height.space, Bd = sp.body, STEP = .5;
  const key = (x, z, y) => `${Math.round(x / STEP)},${Math.round(z / STEP)},${Math.round(y * 50)}`, nodes = new Map(), edges = new Map(), back = new Map();
  const add = (x, z, y) => { const k = key(x, z, y); if (!nodes.has(k)) nodes.set(k, {x, z, y}); return k; }   /* a place keeps where the body really stood (the first to reach its half-metre square) */, link = (a, b) => { edges.get(a).push(b); if (!back.has(b)) back.set(b, []); back.get(b).push(a); };
  const rest = (x, z, y) => { const stand = sp.floor(x, z, y + Bd.step, Bd.lean, y).y; if (stand >= y - Bd.step) return [x, z, stand]; const f = sp.floor(x, z, y + .02).y, s = sp.settle(x, z, f + Bd.step, f + Bd.stand); return s ? [s.x, s.z, f] : null; };   /* a drop: the body lands and is pushed clear, as in the game; nowhere clear, no place */
  const start = add(...rest(0, 37, .3)), queue = [start], p = new THREE.Vector3(); let inWall = 0, outside = 0, inWalls = [];
  while (queue.length) { const k = queue.pop(); if (edges.has(k)) continue; edges.set(k, []); const n = nodes.get(k), H = sp.headroom(n.x, n.z, n.y) < Bd.stand ? Bd.crouch : Bd.stand;
    if (n.x < E.x[0] || n.x > E.x[1] || n.z < E.z[0] || n.z > E.z[1] || n.y < -1.7) outside++; if (!sp.clear(n.x, n.z, n.y + Bd.step + .01, n.y + Bd.crouch - .05, Bd.radius * .5)) { inWall++; inWalls.push([n.x, n.y, n.z]); }
    for (const [dx, dz] of [[STEP, 0], [-STEP, 0], [0, STEP], [0, -STEP]]) { p.set(n.x, n.y, n.z); if (sp.move(p, dx, dz, H) < STEP - .01) continue; const r = rest(p.x, p.z, p.y); if (!r) continue; const q = add(...r); link(k, q); if (!edges.has(q)) queue.push(q); }
    for (const [fx, fz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { p.set(n.x, n.y, n.z); const up = sp.ledge(p, fx, fz); if (!up) continue; const q = add(up.x, up.z, up.y); link(k, q); if (!edges.has(q)) queue.push(q); } }
  const reached = [...edges.keys()], home = new Set([start]), stack = [start]; while (stack.length) { const k = stack.pop(); for (const a of back.get(k) || []) if (!home.has(a)) { home.add(a); stack.push(a); } }
  const stuck = reached.filter(k => !home.has(k)).map(k => nodes.get(k)); assert.equal(stuck.length, 0, `${stuck.length} places with no way back, e.g. ${JSON.stringify(stuck.slice(0, 5))}`);
  assert.equal(outside, 0, 'nothing beyond the edges'); assert.equal(inWall, 0, `nothing inside a wall: ${JSON.stringify(inWalls.slice(0, 6))}`);
  const at = (x0, x1, z0, z1, y) => reached.map(k => nodes.get(k)).filter(n => n.x > x0 && n.x < x1 && n.z > z0 && n.z < z1 && Math.abs(n.y - y) < .05).length, levels = {};
  for (const lv of LEVELS) { levels[lv] = reached.map(k => nodes.get(k)).filter(n => Math.abs(n.y - lv) < .05).length; assert(levels[lv] > 400, `terrace ${lv}: ${levels[lv]} places`); }
  const roofs = {}; if (process.env.DUSTLINE_T38_DEBUG) for (const h of open) { const ys = {}; for (const k of reached) { const n = nodes.get(k); if (n.x > h.x[0] && n.x < h.x[1] && n.z > h.z[0] && n.z < h.z[1]) ys[n.y.toFixed(2)] = (ys[n.y.toFixed(2)] || 0) + 1; } console.error(h.id, h.base, h.storeys.map(t => t.height), ys); }
  for (const h of open) { const top = h.base + h.storeys.reduce((s, t) => s + t.height, 0) + .03; roofs[h.id] = at(h.x[0] + .5, h.x[1] - .5, h.z[0] + .5, h.z[1] - .5, top); assert(roofs[h.id] > 30, `${h.id}'s roof reached (${roofs[h.id]})`); assert(at(h.x[0] + .5, h.x[1] - .5, h.z[0] + .5, h.z[1] - .5, h.base + .05) > 20, `${h.id}'s room reached`); }
  const KB = [K.x[0], K.x[1], K.z[0], K.z[1]]; for (const [name, y] of [['ground', .05], ['first', 3.4], ['second', 6.6], ['roof', 9.83]]) assert(at(...KB, y) > 300, `the customs house's ${name} (${at(...KB, y)})`);
  report.flood = {places: reached.length, byTerrace: levels, openRoofs: roofs, step: STEP};
});

await check('enemies', 'the enemies\' navigation reaches every district on its terrace, every open house\'s room and roof, every floor and the roof of the customs house, the block\'s upper floor and roofs, and it strands nobody (T36 proves the graph\'s places sound); a path is found from the start to the farthest corner of the lower town and to the top of the town in under a second', async () => {
  const g = await town(), nav = g.nav, nodesAt = (x0, x1, z0, z1, y) => nav.nodes.filter(n => n.x > x0 && n.x < x1 && n.z > z0 && n.z < z1 && Math.abs(n.y - y) < .05).length, where = {};
  const districts = {westLower: [-72, -24, 17, 80, 0], eastLower: [24, 72, 17, 80, 0], westMiddle: [-72, -24, -6, 17, 1.6], eastMiddle: [24, 72, -6, 17, 1.6], westUpper: [-72, -24, -55, -6, 3.2], eastUpper: [24, 72, -55, -6, 3.2], north: [-72, 72, -80, -55, 4.8], top: [-72, 72, -100, -80, 6.4], lower: [-72, 72, 80, 105, -1.6], square: [-22, 22, 44, 80, 0], block: [-24, 24, -30, 44, null]};
  for (const [name, [x0, x1, z0, z1, y]] of Object.entries(districts)) { const n = y == null ? nav.nodes.filter(n => n.x > x0 && n.x < x1 && n.z > z0 && n.z < z1).length : nodesAt(x0, x1, z0, z1, y); where[name] = n; assert(n > 300, `${name}: ${n} places`); }
  for (const h of open) { const top = h.base + h.storeys.reduce((s, t) => s + t.height, 0) + .03; where[h.id] = [nodesAt(h.x[0] + .5, h.x[1] - .5, h.z[0] + .5, h.z[1] - .5, h.base + .05), nodesAt(h.x[0] + .5, h.x[1] - .5, h.z[0] + .5, h.z[1] - .5, top)]; assert(where[h.id][0] > 20 && where[h.id][1] > 20, `${h.id}: room and roof (${where[h.id]})`); }
  for (const [name, y] of [['K ground', .05], ['K first', 3.4], ['K second', 6.6], ['K roof', 9.83]]) { where[name] = nodesAt(K.x[0], K.x[1], K.z[0], K.z[1], y); assert(where[name] > 200, `${name}: ${where[name]}`); }
  where.houseAUpper = nodesAt(-13, -4.2, 2, 13, 4.6); where.houseARoof = nodesAt(-13, -4.2, 2, 13, 7.43); assert(where.houseAUpper > 20 && where.houseARoof > 20, 'house A\'s upper floor and roof');
  const start = nav.nearest(0, 46, 0), back = new Map(); for (const n of nav.nodes) for (const e of n.edges) { if (!back.has(e.to)) back.set(e.to, []); back.get(e.to).push(n); } const home = new Set([start]), st = [start]; while (st.length) { const n = st.pop(); for (const m of back.get(n) || []) if (!home.has(m)) { home.add(m); st.push(m); } }
  const stranded = nav.nodes.filter(n => !home.has(n)); assert.equal(stranded.length, 0, `${stranded.length} stranded, e.g. ${JSON.stringify(stranded.slice(0, 4).map(n => [n.x, n.y, n.z]))}`);
  let t = performance.now(); const far = nav.path({x: 0, y: 0, z: 37}, {x: 66, y: -1.6, z: 103}), t1 = performance.now() - t; t = performance.now(); const up = nav.path({x: 0, y: 0, z: 37}, {x: -66, y: 6.4, z: -98}), t2 = performance.now() - t;
  assert(far.length > 50 && Math.hypot(far.at(-1).x - 66, far.at(-1).z - 103) < 1.5, 'a way to the lower town\'s far corner'); assert(up.length > 50 && Math.hypot(up.at(-1).x + 66, up.at(-1).z + 98) < 1.5, 'a way to the top of the town'); assert(t1 < 1000 && t2 < 1000, `paths in ${t1.toFixed(0)} and ${t2.toFixed(0)} ms`);
  report.enemies = {places: nav.nodes.length, where, pathMs: [+t1.toFixed(0), +t2.toFixed(0)]};
});

await check('stairs', 'two bodies pass on every stair the kit built: on each of the 23 flights (the customs house\'s twelve, house A\'s, house C\'s, the nine district houses\', and the town\'s steps), halfway up, a player\'s body and an enemy\'s body stand side by side, each clear, and the enemy body climbs it', async () => {
  const g = await town(), sp = g.height.space, nav = g.nav, flights = g.built.stats.flights; assert(flights.length >= 23, `${flights.length} flights`); let passed = 0;
  let narrowest = 9;
  for (const f of flights) { assert(f.width >= 1.68, `a flight ${f.width.toFixed(2)} m wide`); const u = (f.run[0] + f.run[1]) / 2, at = (v, u2) => f.axis === 'x' ? [u2, v] : [v, u2];
    // The clear width: from each side of the flight, in to where a thin body first stands (a partition or a lining may take a few centimetres of the nominal width).
    const yMid = sp.floor(...at((f.across[0] + f.across[1]) / 2, u), f.high + .3).y, side = (from, dir) => { for (let v = from; Math.abs(v - from) < .3; v += dir * .01) if (sp.clear(...at(v + dir * .05, u), yMid + BODY.step, yMid + BODY.stand, .05)) return v; return from + dir * .3; }, a0 = side(f.across[0], 1), a1 = side(f.across[1], -1);
    assert(a1 - a0 >= 2 * (BODY.radius + FOE.radius) + .06, `a flight ${(a1 - a0).toFixed(2)} m clear at ${at(a0, u)}`); narrowest = Math.min(narrowest, a1 - a0); const pa = a0 + BODY.radius + .03, pe = a1 - FOE.radius - .03;
    const [px, pz] = at(pa, u), [ex, ez] = at(pe, u), yp = sp.floor(px, pz, f.high + .3).y, ye = sp.floor(ex, ez, f.high + .3).y; assert(yp > f.low - .05 && yp <= f.high + .1 && ye > f.low - .05 && ye <= f.high + .1, `on the treads (${yp}, ${ye})`);
    assert(sp.clear(px, pz, yp + BODY.step, yp + BODY.stand, BODY.radius), `the player stands at the side of the flight at ${[px, pz]}`); assert(sp.stands(ex, ez, ye + BODY.step, ye + BODY.stand, FOE.radius, true), `the enemy stands at the other side at ${[ex, ez]}`); assert(pe - pa >= BODY.radius + FOE.radius, 'not overlapping');
    // The enemy body climbs the flight from its foot to its top by the navigation's mover.
    const dir = Math.sign(f.run[1] - f.run[0]), [sx, sz] = at((a0 + a1) / 2, f.run[0] - dir * .3), q = {x: sx, z: sz, y: sp.floor(sx, sz, f.low + BODY.step + .5, .2, f.low).y}; let moved = 0; for (let i = 0; i < 40; i++) { const m = nav.move(q, ...(f.axis === 'x' ? [dir * .25, 0] : [0, dir * .25])); moved += m; if (m < .2) break; }
    assert(q.y >= f.high - .3, `the enemy climbed the flight at ${[sx, sz]} (${q.y.toFixed(2)} of ${f.high})`); passed++; }
  report.stairs = {flights: flights.length, passed, narrowestClear: +narrowest.toFixed(2), widths: [...new Set(flights.map(f => +f.width.toFixed(2)))], sideBySide: 'player .34 + enemy .45 with 3 cm each side'};
});

await check('skirmish', 'Skirmish is played on the new map: deployed from the block\'s top terrace with the squad, the relay on the square, seven enemies patrolling the square and the lower town or garrisoning the relay on their loops, the mast standing; a patroller leaves a held relay for the map\'s own loop; clearing them and holding the relay 45 s wins; going down ends it; reinforcements come through the gates once enemies fall; the walk (Story) stays a walk with no mission, and the menu says so', async () => {
  const g = await town('skirmish'); assert.equal(g.state().state, 'playing'); near(g.player.y, 3.2, .05, 'started on the top terrace'); assert.deepEqual([g.player.x, g.player.z], DEHRUN.starts.skirmish.player);
  const en = g.enemies(); assert.equal(en.filter(a => a.hp > 0 && a.g.visible).length, 7); assert(g.actors.filter(a => a.team === 'ally' && !a.remote).every(a => a.hp > 0 && a.g.visible), 'the squad is there');
  for (const a of en) assert(['patrol', 'garrison', 'leave', 'travel'].includes(a.ai.state) && a.g.position.z > 44, `${a.ai.state} on the square or below`); assert.deepEqual(g.ai.target.toArray().map(v => +v.toFixed(1)), [8, 0, 76]);
  g.run(6); const moved = en.filter(a => a.speed > .05 || a.ai.state === 'garrison').length; assert(moved >= 5, `${moved} on their loops`);
  const mast = g.scene.children.filter(o => o.isGroup && o.children.length > 8 && o.children.every(c => Math.abs(c.position.x - DEHRUN.relay[0]) < 4 && Math.abs(c.position.z - DEHRUN.relay[1]) < 4)); assert.equal(mast.length, 1, 'the relay\'s mast at the relay'); assert(mast[0].visible, 'the mast stands in Skirmish');
  // A patroller that comes to the relay while the player holds it leaves for the map's loop (Kohar Valley's RING is not here).
  const pat = en.find(a => a.ai.role === 'patrol' && a.hp > 0); pat.g.position.set(DEHRUN.relay[0] + 2, 0, DEHRUN.relay[1] - 2); pat.route = []; g.player.set(DEHRUN.relay[0], 0, DEHRUN.relay[1] + 1); g.height.settle(); g.run(3); assert.equal(pat.ai.state, 'leave', 'leaves the relay'); assert.equal(pat.ai.then, DEHRUN.enemies.leave, `for the ${DEHRUN.enemies.leave} loop`); assert(DEHRUN.enemies.loops[pat.ai.then], 'a loop of this map'); g.player.set(0, 0, 37); g.height.settle(); g.run(4); assert.equal(g.state().state, 'playing', 'not won by three seconds at the relay');
  g.el('objective-label'); const label = g.el('objtext').textContent; assert(!/look slice/i.test(label), `a mission's words, not the walk's: ${label}`);
  // Reinforcements: three enemies fall unseen; a wave comes through a gate within a minute.
  for (const a of en.slice(0, 3)) { a.hp = 0; a.dead = 999; a.diedAt = -100; a.gone = true; a.g.visible = false; } g.run(45); assert(en.filter(a => a.hp > 0 && a.g.visible).length > 4, `reinforced (${en.filter(a => a.hp > 0 && a.g.visible).length} alive)`);
  // The win: nobody left, the relay held from the square for 45 s.
  for (const a of en) { a.hp = 0; a.dead = 999; a.diedAt = -100; a.gone = true; a.g.visible = false; } g.ai.director().spawned = 99; g.player.set(8, 0, 74); g.height.settle(); let t = 0; g.run(50, s => { t = s; if (g.state().state === 'ended') return false; }); assert.equal(g.state().state, 'ended', 'won'); assert(t > 40 && t < 47, `after holding ${t.toFixed(0)} s`);
  // Going down ends it too.
  const h = await town('skirmish'); h.set({hp: 1}); h.aiHit({pos: h.player, a: null}, h.player.clone().add(new THREE.Vector3(6, 1.4, 0)), h.player.clone().setY(h.player.y + 1.25)); h.run(.5); assert.equal(h.state().state, 'ended', 'lost');
  // The walk is still the walk.
  const w = await town('story'); assert.equal(w.enemies().filter(a => a.hp > 0 || a.g.visible).length, 0, 'nobody on the walk'); assert.deepEqual([w.player.x, w.player.z], DEHRUN.starts.player); w.run(.3); assert.equal(w.el('objtext').textContent, DEHRUN.look.line); assert(!w.scene.children.find(o => o.isGroup && o.children.length > 8 && o.children.every(c => Math.abs(c.position.x - DEHRUN.relay[0]) < 4 && Math.abs(c.position.z - DEHRUN.relay[1]) < 4)).visible, 'no mast on the walk');
  report.skirmish = {start: DEHRUN.starts.skirmish.player, relay: DEHRUN.relay, enemies: 7, loops: DEHRUN.enemies.assign, hold: 45, reinforcePoints: DEHRUN.enemies.reinforcePoints.length};
});

await check('ceilings', 'the whole town drawn stays under the ceilings (700 draw calls, 700,000 triangles) and the kit makes it in under four seconds here', async () => {
  maps.selectMap('dehrun'); let g, t = performance.now(); try { g = await page(); g.prepare({clearLane: false}); await g.built.ready; } finally { maps.selectMap('kohar'); } const built = performance.now() - t;
  let calls = 0, triangles = 0; g.scene.updateMatrixWorld(true); g.scene.traverse(o => { if (!(o.isMesh || o.isLine || o.isPoints) || o.userData.actor || !o.visible) return; let q = o; while (q && q !== g.scene && q !== g.camera) q = q.parent; if (q !== g.scene) return; const geo = o.geometry, n = (geo.index ? geo.index.count : geo.attributes.position.count) / 3; calls++; if (o.isMesh) triangles += n * (o.isInstancedMesh ? o.count : 1); });   /* counted as T32 counts */
  assert(calls <= 700 && triangles <= 700000, `${calls} draw calls, ${Math.round(triangles)} triangles`); assert(built < 4000, `built in ${built.toFixed(0)} ms`);
  report.ceilings = {drawCalls: calls, triangles: Math.round(triangles), boxes: g.built.stats.list.length, builtMs: +built.toFixed(0), navPlaces: g.built.navigation().nodes.length, note: 'everything drawn whether in view or not; the frame time is B24, in Safari'};
});

console.log(JSON.stringify({...(ONLY ? {partial: ONLY} : {}), passed: results.length, checks: results, report, limitations: [
  'Headless: how the town looks and plays, and its frame time from any viewpoint, are for the user in Safari (B24).',
  'The flood is a half-metre grid over the town; a place narrower than that could be missed (the customs house has its own quarter-metre flood in T35).',
  'Changing map in a running page is not built (MAP-01 stands): a second map needs a reload, and a reload drops the connection.']}, null, 2));
