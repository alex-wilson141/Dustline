// Build 21 (T31): Kohar Valley as map data. Nothing visible may change, so the checks are of two kinds.
// The same: the world the game builds from the map is the world Build 20 built from its code (ground, everything
// standing, navigation, cover, routes, starts, objectives, enemy duties, reinforcements, the Ambush arena closed and
// open), number for number, and every moved list still holds Build 20's values.
// Governing: every value in the map is changed in turn and the game must change with it; a value that changes nothing
// is either still read from somewhere else or never read at all, and both are named.
// The recorded traces (Story and Skirmish against Build 09, solo Ambush against Build 15) are replayed by their own
// suites (T20 to T24, T26), which run on the same map.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execSync} from 'node:child_process';
import {createGame, projectRoot} from './sprint-harness.mjs';
import {fingerprint, reinforcements, patrols, firstDifference} from './map-fingerprint.mjs';

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const {KOHAR} = await import(new URL('dist/map-kohar.js', projectRoot));
const maps = await import(new URL('dist/maps.js', projectRoot));
const ambushModule = await import(new URL('dist/ambush.js', projectRoot));
const enemyModule = await import(new URL('dist/enemy-ai.js', projectRoot));
const propsModule = await import(new URL('dist/village-props.js', projectRoot));
const {ENEMY_AI} = enemyModule;
const SOURCE = process.env.DUSTLINE_GAME_SOURCE ? new URL('file://' + process.env.DUSTLINE_GAME_SOURCE) : undefined;
const BUILD20 = '7a9bb82';
const FIXTURE = JSON.parse(fs.readFileSync(new URL('fixtures/kohar-b20.json', import.meta.url), 'utf8'));
const results = [], report = {};
// For the deliberate-breakage pass only: DUSTLINE_T31_ONLY names the checks to run (same, values, text, world, arena,
// routes, yard) and DUSTLINE_T31_VALUES the values to change (the start of their path). A full run sets neither.
const ONLY = process.env.DUSTLINE_T31_ONLY?.split(','), VALUES = process.env.DUSTLINE_T31_VALUES?.split(',');
async function check(tag, name, fn) { if (ONLY && !ONLY.includes(tag) && tag !== 'same') return; await fn(); results.push(name); }
const plain = v => JSON.parse(JSON.stringify(v));
const page = () => createGame(SOURCE ? {sourcePath: SOURCE} : {});

// A copy of a map that shares nothing with it but its functions.
const copy = v => Array.isArray(v) ? v.map(copy) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copy(x)])) : v;
const at = (o, path) => path.reduce((v, k) => v[k], o);
function put(o, path, value) { at(o, path.slice(0, -1))[path.at(-1)] = value; return o; }
// Everything measured of the game built from `map`: the fingerprint and, when asked, the reinforcements.
async function probe(map, {waves = false, only = false} = {}) {
  maps.registerMap(map); maps.selectMap(map.id);
  try { const out = {}; if (!only) { const g = await page(); Object.assign(out, fingerprint(g, THREE)); out.fit = fit(g, map); } if (waves) { out.tour = tour(await page()); out.reinforcements = reinforcements(await page(), ENEMY_AI); } return plain(out); }
  finally { maps.selectMap('kohar'); }
}
// What the game built, held against the map it was built from, value by value: where a changed value must show and
// what it must be there. Returns what does not fit (nothing, for a game that reads the map).
function fit(g, map) {
  const bad = [], near = (a, b, e = 1e-9) => Math.abs(a - b) <= e, want = (ok, what) => { if (!ok) bad.push(what); }, h = map.height;
  // The ground: the mesh spans the terrain and its corners and the height under any spot are the map's.
  const tp = g.ground.geometry.attributes.position, n = map.terrain.segments + 1, half = map.terrain.size / 2; want(tp.count === n * n, 'terrain segments');
  let low = Infinity, high = -Infinity; for (let i = 0; i < tp.count; i += 97) { low = Math.min(low, tp.getX(i), tp.getZ(i)); high = Math.max(high, tp.getX(i), tp.getZ(i)); want(near(tp.getY(i), h(tp.getX(i), tp.getZ(i)), 1e-4), 'terrain height'); want(near(g.terrainAt(tp.getX(i), tp.getZ(i)), tp.getY(i), 1e-4), 'height under a spot'); }
  want(near(tp.getX(0), -half, 1e-3) && near(tp.getX(tp.count - 1), half, 1e-3), 'terrain size'); want(near(g.groundY(12.3, -45.6), h(12.3, -45.6)), 'ground height');
  // The edges: just outside is closed on all four sides; the grid has the map's cells.
  const [x0, x1] = map.edges.x, [z0, z1] = map.edges.z, mx = (x0 + x1) / 2, mz = (z0 + z1) / 2; for (const [x, z, name] of [[x0 - .01, mz, 'west'], [x1 + .01, mz, 'east'], [mx, z0 - .01, 'north'], [mx, z1 + .01, 'south']]) want(g.blocked(x, z), `${name} edge closed`);
  const free = (x, z, dx, dz) => { for (let t = .4; t < 30; t += .7) for (let s = -30; s <= 30; s += 1.3) if (!g.blocked(x + dx * t + dz * s, z + dz * t + dx * s)) return t; return 99; };
  want(free(x0, mz, 1, 0) < 1 && free(x1, mz, -1, 0) < 1 && free(mx, z0, 0, 1) < 1 && free(mx, z1, 0, -1) < 1, 'open up to each edge');
  g.resetNav(); want(g.ai.navigationGrid().length === map.nav.cells ** 2, 'grid cells');
  const route = g.ai.pathTo(new THREE.Vector3(map.starts.player[0], 0, map.starts.player[1]), g.ai.target); want(route.every(p => near((p.x - map.nav.origin) / map.nav.step % 1, 0) && near((p.z - map.nav.origin) / map.nav.step % 1, 0)), 'routes lie on the grid');
  // Objectives and the relay's equipment.
  const T = g.ai.target, I = g.ai.intel, E = g.ai.extract; want(T.x === map.relay[0] && T.z === map.relay[1] && near(T.y, h(...map.relay)), 'relay'); want(I.x === map.log.at[0] && I.z === map.log.at[1], 'log'); want(E.x === map.extraction[0] && E.z === map.extraction[1], 'extraction');
  want(g.solids.some(s => near(s.x, T.x - 1.4) && near(s.z, T.z) && near(s.w, .8) && near(s.d, .5)), 'relay equipment stands at the relay');
  let mast = 0; g.scene.traverse(o => { if (!o.isMesh || o === g.ground || o.userData.actor) return; const p = o.geometry.attributes.position, e = o.matrixWorld.elements; if (!p || o.isInstancedMesh) return; for (let i = 0; i < p.count; i++) { const x = p.getX(i) + e[12], y = p.getY(i) + e[13], z = p.getZ(i) + e[14]; if (y > T.y + 5 && Math.hypot(x - T.x, z - T.z) < .9) mast++; } }); want(mast >= 200, `relay mast stands at the relay (${mast})`);
  // What is scattered by count.
  const stones = g.scene.children.find(o => o.isInstancedMesh), m = new THREE.Matrix4(); want(stones.count === map.pebbles.count, 'pebble count'); stones.getMatrixAt(stones.count - 1, m); want(!m.equals(new THREE.Matrix4()), 'every pebble is placed');
  const sun = g.scene.children.find(o => o.isDirectionalLight); want(sun.position.toArray().every((v, i) => v === map.sun.at[i]) && sun.shadow.camera.right === map.sun.reach && sun.shadow.camera.left === -map.sun.reach && sun.shadow.camera.near === map.sun.near && sun.shadow.camera.far === map.sun.far, 'sun');
  want(g.scene.fog.density === map.sky.fogDensity && g.scene.fog.color.getHexString() === map.sky.fog.slice(1) && g.assetRequests.some(a => String(a).startsWith(`assets/${map.sky.asset}`)), 'sky');
  // Starts, in every mode.
  const spot = p => g.ai.safeSpot(...p), is = (v, p) => near(v.x, p[0]) && near(v.z, p[1]);
  for (const [role, mode, start] of [[null, 'story', map.starts.player], [null, 'skirmish', map.starts.player], ['host', 'coop', map.starts.player], ['guest', 'coop', map.starts.guest]]) { g.peer.connected = Boolean(role); g.peer.role = role; g.setMode(mode); g.reset(); want(is(g.player, start), `${role || mode} start`);
    for (const a of g.actors) want(is(a.g.position, spot(a.team === 'enemy' ? map.enemies.spawns[a.index] : a.remote ? map.starts.mate : map.starts.squad[a.index])), `${mode}: ${a.team} ${a.index} start`);
    g.actors.filter(a => a.team === 'enemy').forEach(a => want((map.enemies.assign[a.index] === 'GARRISON' ? a.ai.role === 'garrison' : a.ai.loop === map.enemies.assign[a.index]), `enemy ${a.index} duty`)); }
  // A teammate's reach, to the half metre.
  g.prepare({role: 'host', clearLane: false}); const told = p => { g.remote.g.position.set(p[0] * .99, 0, p[2] * .99); g.receive({type: 'pose', p, yaw: 0, pitch: 0, crouch: false, at: 0}); return g.remote.g.position.x === p[0] && g.remote.g.position.z === p[2]; };
  want(told([map.reach.x - .25, 0, 0]) && !told([map.reach.x + .25, 0, 0]) && told([0, 0, -(map.reach.z - .25)]) && !told([0, 0, map.reach.z + .25]), 'teammate reach'); g.peer.connected = false; g.peer.role = null;
  // The Ambush arena.
  g.setMode('ambush'); g.reset(); const A = map.ambush, s = g.ambush.now(); want(is(g.player, A.start), 'Ambush start'); want([...g.amb.open].join() === String(A.firstArea), 'first area');
  want(g.arenaWalls.length === A.walls.length && A.walls.every(([x, z, w, d]) => g.arenaWalls.some(o => near(o.position.x, x) && near(o.position.z, z) && near(o.geometry.parameters.width, w) && near(o.geometry.parameters.depth, d))), 'arena walls');
  want(JSON.stringify(s.gates.map(t => [t.id, t.price, t.from, t.opens, t.station])) === JSON.stringify(A.gates.map(t => [t.id, t.price, t.from, t.opens, t.station])), 'barricades'); want(JSON.stringify(s.crates.map(t => [t.area, t.weapon, t.price, t.at])) === JSON.stringify(A.stations.map(t => [t.area, t.weapon, t.price, t.at])), 'crates'); want(JSON.stringify(s.areas.map(a => [a.id, a.name, a.x, a.z])) === JSON.stringify(A.areas.map(a => [a.id, a.name, a.x, a.z])), 'areas');
  g.amb.spots = null; const spots = g.ambush.spots(), L = A.spots, off = (v, a) => { const k = (v - a[0]) / L.step, r = Math.round(k); return r < 0 || a[0] + r * L.step > a[1] + 1e-9 ? 99 : Math.abs(k - r) * L.step; }; want(spots.length > 0 && spots.every(([x, z]) => Math.hypot(off(x, L.x), off(z, L.z)) <= 1.5 + 1e-9), 'spawn spots lie on the lattice');
  const lay = g.ambush.mapLayout(); want(JSON.stringify(lay).length > 100, 'map layout');
  g.setMode('story'); g.reset();
  return [...new Set(bad)];
}
// Every patrol loop of the active map, walked from every place a node of Kohar Valley's loops lies.
const NODES = Object.values(KOHAR.enemies.loops).flat(), tour = g => patrols(g, Object.keys(maps.activeMap().enemies.loops), NODES);
// The top-level parts of two probes that differ.
const changed = (a, b) => Object.keys(a).filter(k => k !== 'fit' && firstDifference(a[k], b[k])).sort();

let base;
await check('same', 'Kohar Valley built from the map is the Kohar Valley of Build 20, number for number: the ground, everything that stands and is drawn, the edges, the navigation grid, cover, routes, starts in every mode, objectives, enemy duties, reinforcements, and the Ambush arena closed and with every barricade cleared', async () => {
  base = await probe(KOHAR, {waves: true}); const {tour: walked, fit: unfit, ...rest} = base; rest.tour = walked; assert.deepEqual(unfit, [], 'Kohar Valley fits its map');
  if (ONLY && !ONLY.includes('same')) return;
  assert.equal(firstDifference(rest, FIXTURE), null, `differs from Build 20 at ${firstDifference(rest, FIXTURE)}`);
  assert.deepEqual(Object.keys({...rest, tour: walked}).sort(), Object.keys(FIXTURE).sort()); assert.equal(Object.keys(walked).length, 8);
  // The record is not empty: it holds what Kohar Valley is known to have.
  assert.equal(base.solids.n, 281); assert.equal(base.occluders.n, 377); assert.equal(base.navGrid.cells, 8281); assert.equal(base.diagnostics.enterableBuildings, 12); assert.equal(base.cover.n, 540); assert.equal(base.ambush.spots.n, 786);
  assert.deepEqual(base.objectives.target.map(v => +v.toFixed(3)), [0, .024, -47]); assert.deepEqual(base.starts.story.player, [0, 0, 55]); assert.deepEqual(base.starts.coopGuest.player, [3, 0, 55]); assert.deepEqual(base.ambush.player.map(v => +v.toFixed(2)), [-30, +KOHAR.height(-30, 20).toFixed(2), 20]);
  assert.deepEqual(base.ambushOpen.bought, [['g12', true], ['g23', true], ['g24', true]]); assert.deepEqual(base.ambushOpen.open, [1, 2, 3, 4]); assert(base.reinforcements.stage0.arrivals > 0 && base.reinforcements.skirmish.arrivals > 0);
  assert.equal(firstDifference(base.afterAmbush.solids, base.solids), null, 'leaving Ambush leaves Kohar as it was');
  report.identical = {comparedWith: `Build 20 (${BUILD20}), recorded before anything was moved`, parts: Object.keys(base).length, solids: base.solids.n, occluders: base.occluders.n, drawn: base.drawn.n, vertices: base.drawn.vertices, navigationCells: base.navGrid.cells, walkable: base.navGrid.walkable, coverPoints: base.cover.n, ambushSpots: base.ambush.spots.n, reinforcementArrivals: Object.fromEntries(Object.entries(base.reinforcements).map(([k, v]) => [k, v.arrivals]))};
});

await check('values', 'every list and number in the map is the one Build 20 had in its code: the enemy posts and routes, the Ambush arena, the props, and each list that stood in game.js and environment.js, compared with the Build 20 sources themselves', async () => {
  const show = f => execSync(`git show ${BUILD20}:dist/${f}`, {cwd: new URL('.', projectRoot), maxBuffer: 1 << 26}).toString();
  const value = (src, name, close) => { const from = src.indexOf(`export const ${name} = `), to = src.indexOf(close, from) + close.length; assert(from >= 0, name); return Function(`return ${src.slice(from + `export const ${name} = `.length, to).replace(/;$/, '')}`)(); };
  const ai = show('enemy-ai.js'), amb = show('ambush.js'), vp = show('village-props.js'), game = show('game.js').replace(/ /g, ''), env = show('environment.js').replace(/ /g, '');
  assert.deepEqual(KOHAR.enemies.spawns, value(ai, 'ENEMY_SPAWNS', '];')); assert.deepEqual(KOHAR.enemies.loops, value(ai, 'PATROL_LOOPS', '\n};')); assert.deepEqual(KOHAR.enemies.assign, value(ai, 'LOOP_ASSIGN', '];'));
  assert.deepEqual(KOHAR.enemies.reinforceLoops, value(ai, 'REINFORCE_LOOPS', '};')); assert.deepEqual(KOHAR.enemies.reinforcePoints, value(ai, 'REINFORCE_POINTS', '\n];'));
  assert.deepEqual(KOHAR.ambush.walls, value(amb, 'ARENA_WALLS', ']];')); assert.deepEqual(KOHAR.ambush.areas, value(amb, 'AREAS', '\n];')); assert.deepEqual(KOHAR.ambush.gates, value(amb, 'GATES', '\n];')); assert.deepEqual(KOHAR.ambush.stations, value(amb, 'STATIONS', '\n];'));
  const old = Function(`${amb.slice(amb.indexOf('export const AMBUSH = {'), amb.indexOf('\n};', amb.indexOf('export const AMBUSH = {')) + 3).replace('export ', '')}\nreturn AMBUSH;`)();
  assert.deepEqual(KOHAR.ambush.start, old.start); assert.deepEqual(KOHAR.ambush.chart, value(amb, 'MAP', '};').bounds); assert.deepEqual({...ambushModule.MAP, bounds: 0}, {...value(amb, 'MAP', '};'), bounds: 0}, 'how the map is drawn is unchanged');
  assert.deepEqual(KOHAR.props, value(vp, 'VILLAGE_PROPS', '\n];')); assert.equal(KOHAR.props.length, 183);
  // Lists that stood in the code: the text of each, without spaces, is in the Build 20 source.
  const text = v => JSON.stringify(v).replace(/(^|[^0-9])0\./g, '$1.'), inGame = {buildings: `${text(KOHAR.buildings)}.forEach(a=>building(`, lowWalls: `of${text(KOHAR.lowWalls)}){`, sandbags: `${text(KOHAR.sandbags)}.forEach(a=>sandbags(`, poles: `of${text(KOHAR.poles)}){`},
    inEnv = {brickWalls: `of${text(KOHAR.brickWalls)})`, stalls: `of${text(KOHAR.stalls)}){`, crates: `of${text(KOHAR.crates)})crate(`, trucks: `of${text(KOHAR.trucks)}){`, trees: `of${text(KOHAR.trees)}){`};
  for (const [k, t] of Object.entries(inGame)) assert(game.includes(t), `${k} is Build 20's list`); for (const [k, t] of Object.entries(inEnv)) assert(env.includes(t), `${k} is Build 20's list`);
  assert(game.includes(`constwirepts=[${KOHAR.wire.map(p => `newTHREE.Vector3(${text(p).slice(1, -1)})`).join(',')}];`), 'the wire');
  const has = (src, t, what) => assert(src.includes(t.replace(/ /g, '')), `${what}: ${t}`), K = KOHAR, n = v => text(v);
  has(game, `const groundY=(x,z)=>.42*Math.sin(x*.047)*Math.cos(z*.055)+.14*Math.sin(z*.13);`, 'the ground'); for (const [x, z] of [[0, 0], [-24, -10], [40, 43], [-85, 80], [333.3, -444.4]]) assert.equal(K.height(x, z), .42 * Math.sin(x * .047) * Math.cos(z * .055) + .14 * Math.sin(z * .13));
  has(game, `new THREE.PlaneGeometry(${K.terrain.size},${K.terrain.size},${K.terrain.segments},${K.terrain.segments})`, 'the terrain'); has(game, `(x+${K.terrain.size / 2})/TERRAIN_CELL`, 'the terrain'); has(game, `TERRAIN_CELL=${K.terrain.size}/${K.terrain.segments}`, 'the terrain');
  has(game, `new THREE.Color('${K.sky.colour}');scene.fog=new THREE.FogExp2('${K.sky.fog}',${n(K.sky.fogDensity)})`, 'the sky'); has(game, `assetURL('assets/${K.sky.asset}')`, 'the sky');
  has(game, `sun.position.set(${K.sun.at})`, 'the sun'); has(game, `{left:-${K.sun.reach},right:${K.sun.reach},top:${K.sun.reach},bottom:-${K.sun.reach},near:${K.sun.near},far:${K.sun.far}}`, 'the sun');
  has(game, `const sectors=${K.ridge.sectors},bands=${K.ridge.bands};`, 'the ridge'); has(game, `r=${K.ridge.inner}+j*${K.ridge.step}`, 'the ridge');
  has(game, `if(Math.abs(x)>${K.edges.x[1]}||z>${K.edges.z[1]}||z< ${K.edges.z[0]})return true;`.replace('< -', '<-'), 'the edges'); assert.equal(K.edges.x[0], -K.edges.x[1]);
  has(game, `new Uint8Array(${K.nav.cells}*${K.nav.cells})`, 'the grid'); has(game, `blocked(x*${K.nav.step}${K.nav.origin},z*${K.nav.step}${K.nav.origin},NAV_R)`, 'the grid'); has(game, `const step=${K.nav.step},N=${K.nav.cells},`, 'the grid');
  has(game, `Math.abs(m.p[0])<${K.reach.x}&&Math.abs(m.p[2])<${K.reach.z}`, 'a teammate\'s reach');
  has(game, `for(let i=0;i<${K.rocks.count};i++){let x=range(${K.rocks.x}),z=range(${K.rocks.z});if(Math.abs(x)<${K.rocks.clear})continue;`, 'rocks'); has(game, `for(let i=0;i<${K.shrubs.count};i++){let x=range(${K.shrubs.x}),z=range(${K.shrubs.z});if(Math.abs(x)<${K.shrubs.clear})continue;`, 'shrubs');
  has(env, `pebbleMat,${K.pebbles.count});`, 'pebbles'); has(env, `for(let i=0;i<${K.pebbles.count};i++){const x=range(${K.pebbles.x}),z=range(${K.pebbles.z});`, 'pebbles'); has(env, `for(let i=0;i<${K.dust.count};i++)pts.push(range(${K.dust.x}),range(${n(K.dust.y).slice(1, -1)}),range(${K.dust.z}));`, 'dust');
  has(game, `const target=new THREE.Vector3(${K.relay[0]},groundY(${K.relay}),${K.relay[1]});`, 'the relay'); has(game, `const intel=new THREE.Vector3(${K.log.at[0]},groundY(${K.log.at}),${K.log.at[1]}),extract=new THREE.Vector3(${K.extraction[0]},groundY(${K.extraction}),${K.extraction[1]});`, 'the log and the extraction');
  has(game, `intel.x+${K.log.lies[0]},intel.y+${n(K.log.lies[1])},intel.z+${K.log.lies[2]},`, 'where the log lies'); has(game, `intel.clone().add(new THREE.Vector3(${K.log.reach[0]},0,${K.log.reach[1]}))`, 'where the log is picked up'); has(game, `officeDoorClear:!blocked(${K.log.door})`, 'the door');
  has(game, `player.set(peer.connected&&peer.role==='guest'?${K.starts.guest[0]}:${K.starts.player[0]},0,${K.starts.player[1]});`, 'the starts'); assert.equal(K.starts.guest[1], K.starts.player[1]);
  has(game, `[a.remote?3:(a.index-1)*3,58+a.index]`, 'the squad'); assert.deepEqual([...K.starts.squad, K.starts.mate], [0, 1, 2, 3].map(i => [i === 3 ? 3 : (i - 1) * 3, 58 + i]));
  has(game, `open:new Set([${K.ambush.firstArea}]),points:AMBUSH.startPoints`, 'the first area'); has(game, `for(let x=${K.ambush.spots.x[0]};x<=${K.ambush.spots.x[1]};x+=${K.ambush.spots.step})for(let z=${K.ambush.spots.z[0]};z<=${K.ambush.spots.z[1]};z+=${K.ambush.spots.step})`, 'the spawn lattice');
  report.values = {comparedWith: `the sources of Build 20 (${BUILD20}) through git`, props: KOHAR.props.length, buildings: KOHAR.buildings.length, patrolLoops: Object.keys(KOHAR.enemies.loops).length, reinforcementEntries: KOHAR.enemies.reinforcePoints.length};
});

await check('text', 'nothing that moved is still written in the code: the game, the scenery, the Ambush rules, the enemy rules and the props hold no position, edge or grid size of their own', async () => {
  const read = f => fs.readFileSync(SOURCE && f === 'game.js' ? SOURCE : new URL(`dist/${f}`, projectRoot), 'utf8'), game = read('game.js'), env = read('environment.js'), amb = read('ambush.js'), ai = read('enemy-ai.js'), vp = read('village-props.js');
  for (const t of ['[-24,12,10,9,3.6]', '[-10,12,10,.55]', '[[-8,30],[9,7]', '[[-15,35],[16,-3]', 'Vector3(-15,8.5,35)', 'range(-95,95)', 'range(-90,90)', 'Math.abs(x)>85', 'z>80', '91*91', '+90)/2', '*2-90', 'N=91', 'step=2,', '+550)', '-550+', '1100', 'groundY(0,-47)', ',-47,', 'Vector3(-24,', 'Vector3(40,', 'blocked(-24', 'blocked(40', '?3:0,0,55', '58+a.index', '<90&&Math.abs', '<95)', 'Set([1])', 'AMBUSH.start;', 'x=-86', 'z<=44', '.0027', 'set(-55,68,-45)', 'left:-110', 'sectors=220', 'r=130+', 'kloofendal', '.42*Math.sin', 'intel.x+3.36', 'Vector3(2,0,0)', 'ENEMY_SPAWNS,PATROL_LOOPS', '=550', 'i<100;', 'i<55;', '<15)continue', '<18)continue', '< -85', '<-85', 'NAV_N=91', 'NAV_STEP=2', 'NAV_0=-90', '[-13,2]', "'GARRISON','GARRISON'", '[-30,20]', 'x+=4)', 'z+=4)', 'starts.player:WORLD.starts.player', ',0,-47', '0,target.y'])
    assert(!game.includes(t), `game.js still holds ${t}`);
  for (const t of ['[-40,14,.6,24]', '[[-8,16]', '[[-14,34]', '[[16,39]', '[[-46,35]', 'range(-70,70)', 'range(-80,80)', ',500)', '<500', '<200', 'props = [']) assert(!env.includes(t) && !vp.includes(t), `the scenery still holds ${t}`);
  for (const t of ['export const AREAS', 'export const GATES', 'export const STATIONS', 'export const ARENA_WALLS', 'start: [', '[-62, -8]', 'x: [-40, -19]']) assert(!amb.includes(t), `ambush.js still holds ${t}`);
  for (const t of ['export const ENEMY_SPAWNS', 'export const PATROL_LOOPS', 'export const REINFORCE_POINTS', '[-13, 2]', '[80, 10]']) assert(!ai.includes(t), `enemy-ai.js still holds ${t}`);
  assert(!/\["\w+", -?[\d.]+, -?[\d.]+, /.test(vp), 'village-props.js holds no prop');
  assert(!Object.keys(ambushModule.AMBUSH).includes('start') && ambushModule.AMBUSH.start === KOHAR.ambush.start && typeof Object.getOwnPropertyDescriptor(ambushModule.AMBUSH, 'start').get === 'function', 'the Ambush rules have no start of their own: asked, they give the map\'s');
  // The names the other suites and modules use follow the map.
  assert.equal(ambushModule.AREAS, KOHAR.ambush.areas); assert.equal(ambushModule.GATES, KOHAR.ambush.gates); assert.equal(ambushModule.STATIONS, KOHAR.ambush.stations); assert.equal(ambushModule.ARENA_WALLS, KOHAR.ambush.walls); assert.equal(ambushModule.MAP.bounds, KOHAR.ambush.chart);
  assert.equal(enemyModule.ENEMY_SPAWNS, KOHAR.enemies.spawns); assert.equal(enemyModule.PATROL_LOOPS, KOHAR.enemies.loops); assert.equal(enemyModule.LOOP_ASSIGN, KOHAR.enemies.assign); assert.equal(enemyModule.REINFORCE_LOOPS, KOHAR.enemies.reinforceLoops); assert.equal(enemyModule.REINFORCE_POINTS, KOHAR.enemies.reinforcePoints); assert.equal(propsModule.VILLAGE_PROPS, KOHAR.props);
  assert.deepEqual(maps.mapIds().filter(id => !id.startsWith('test-')), ['kohar']); assert.equal(maps.activeMap(), KOHAR); assert.throws(() => maps.selectMap('nowhere'), /unknown map/); assert.throws(() => maps.registerMap({id: 'x'}), /height/);
  report.moved = 'no moved value is written in game.js, environment.js, ambush.js, enemy-ai.js or village-props.js';
});

// ---- Governing. Each entry changes one value of the map; `parts` are the parts of the probe that must change with it.
// Numbers move by `d` (1 unless given); `to` sets a value outright.
const ONE = (path, parts, extra = {}) => ({path, parts, ...extra});
const rows = (path, list, cols, parts, pick = [0, list.length - 1]) => [...new Set(pick)].flatMap(i => cols.map(c => ONE([...path, i, ...[].concat(c)], parts)));
const WORLD_PARTS = ['solids', 'occluders', 'drawn', 'blocked'];
const CHANGES = [
  ONE(['height'], ['ground', 'terrainMesh', 'objectives'], {to: (x, z) => KOHAR.height(x, z) + 1}),
  ONE(['terrain', 'size'], ['terrainMesh', 'ground'], {d: 100}), ONE(['terrain', 'segments'], ['terrainMesh', 'ground'], {d: -60}),
  ONE(['sky', 'asset'], ['assets'], {to: 'rocks_ground_05_diff_1k.jpg'}), ONE(['sky', 'colour'], ['sky'], {to: '#123456'}), ONE(['sky', 'fog'], ['fog'], {to: '#123456'}), ONE(['sky', 'fogDensity'], ['fog'], {d: .001}),
  ...[0, 1, 2].map(i => ONE(['sun', 'at', i], ['lights'])), ONE(['sun', 'reach'], ['lights']), ONE(['sun', 'near'], ['lights']), ONE(['sun', 'far'], ['lights']),
  ONE(['ridge', 'sectors'], ['drawn']), ONE(['ridge', 'bands'], ['drawn']), ONE(['ridge', 'inner'], ['drawn']), ONE(['ridge', 'step'], ['drawn']),
  ONE(['edges', 'x', 0], ['blocked', 'navGrid'], {d: 20}), ONE(['edges', 'x', 1], ['blocked', 'navGrid'], {d: -20}), ONE(['edges', 'z', 0], ['blocked', 'navGrid'], {d: 20}), ONE(['edges', 'z', 1], ['blocked', 'navGrid'], {d: -20}),
  ONE(['nav', 'origin'], ['navGrid', 'routes'], {d: 1}), ONE(['nav', 'step'], ['navGrid', 'routes'], {d: .5}), ONE(['nav', 'cells'], ['navGrid'], {d: -10}),
  ONE(['reach', 'x'], ['believed'], {d: -10}), ONE(['reach', 'z'], ['believed'], {d: -10}),
  ...rows(['buildings'], KOHAR.buildings, [0, 1, 2, 3, 4], ['occluders', 'drawn']), ...rows(['lowWalls'], KOHAR.lowWalls, [0, 1, 2, 3], WORLD_PARTS.slice(0, 3)), ...rows(['sandbags'], KOHAR.sandbags, [0, 1], WORLD_PARTS.slice(0, 3)),
  ...['count', 'clear'].map(k => ONE(['rocks', k], ['drawn'], {d: 5})), ...[0, 1].flatMap(i => ['x', 'z'].map(k => ONE(['rocks', k, i], ['drawn']))),
  ...['count', 'clear'].map(k => ONE(['shrubs', k], ['drawn'], {d: 5})), ...[0, 1].flatMap(i => ['x', 'z'].map(k => ONE(['shrubs', k, i], ['drawn']))),
  ...rows(['poles'], KOHAR.poles, [0, 1], ['drawn']), ...rows(['wire'], KOHAR.wire, [0, 1, 2], ['drawn']),
  ...rows(['brickWalls'], KOHAR.brickWalls, [0, 1, 2, 3], ['occluders'], [3, KOHAR.brickWalls.length - 2]), ...rows(['stalls'], KOHAR.stalls, [0, 1], WORLD_PARTS.slice(0, 3)), ...rows(['crates'], KOHAR.crates, [0, 1], WORLD_PARTS.slice(0, 3)), ...rows(['trucks'], KOHAR.trucks, [0, 1], WORLD_PARTS.slice(0, 3)), ...rows(['trees'], KOHAR.trees, [0, 1], ['drawn']),
  ONE(['pebbles', 'count'], ['drawn'], {d: 10}), ...[0, 1].flatMap(i => ['x', 'z'].map(k => ONE(['pebbles', k, i], ['drawn']))), ONE(['dust', 'count'], ['drawn'], {d: 10}), ...[0, 1].flatMap(i => ['x', 'y', 'z'].map(k => ONE(['dust', k, i], ['drawn']))),
  ONE(['relay', 0], ['objectives', 'drawn', 'starts'], {d: 3}), ONE(['relay', 1], ['objectives', 'drawn', 'starts'], {d: 3}),
  ONE(['log', 'at', 0], ['objectives', 'pickup', 'starts']), ONE(['log', 'at', 1], ['objectives', 'pickup', 'starts']), ...[0, 1, 2].map(i => ONE(['log', 'lies', i], ['drawn'])), ONE(['log', 'reach', 0], ['pickup']), ONE(['log', 'reach', 1], ['pickup']), ONE(['log', 'door', 0], ['diagnostics'], {to: -24 + 5.2}), ONE(['log', 'door', 1], ['diagnostics'], {to: -43.23}),
  ONE(['extraction', 0], ['objectives', 'drawn', 'starts']), ONE(['extraction', 1], ['objectives', 'drawn', 'starts']),
  ...[0, 1].flatMap(i => [ONE(['starts', 'player', i], ['starts']), ONE(['starts', 'guest', i], ['starts']), ONE(['starts', 'mate', i], ['starts'])]), ...rows(['starts', 'squad'], KOHAR.starts.squad, [0, 1], ['starts'], [0, 1, 2]),
  ...rows(['enemies', 'spawns'], KOHAR.enemies.spawns, [0, 1], ['starts'], [0, 1, 2, 3, 4, 5, 6]),
  ...KOHAR.enemies.assign.map((v, i) => ONE(['enemies', 'assign', i], ['duty'], {to: v === 'NE' ? 'NW' : 'NE'})),
];
// The patrol loops: a node of each loop the first enemies walk shows in their first route; the others show when
// reinforcements are sent to them. The entries and the loops reinforcements join show in the reinforcements.
// A reinforcement arrives at one of three entries drawn by lot and joins one loop drawn by lot, so an entry or a loop is
// tried alone: `alone` leaves only it in its list, in the changed map and in the map it is compared with.
const WAVES = [
  ...Object.entries(KOHAR.enemies.loops).flatMap(([name, nodes]) => nodes.flatMap((p, i) => [0, 1].map(c => ONE(['enemies', 'loops', name, i, c], ['tour'], {d: 4})))),
  ...Object.entries(KOHAR.enemies.reinforceLoops).flatMap(([k, list]) => list.map((v, i) => ONE(['enemies', 'reinforceLoops', k, 0], ['reinforcements'], {to: v === 'NW' ? 'NE' : 'NW', alone: ['enemies', 'reinforceLoops', k, i]}))),
  ...KOHAR.enemies.reinforcePoints.flatMap((s, i) => [...s.chain.flatMap((p, j) => [0, 1].map(c => ONE(['enemies', 'reinforcePoints', 0, 'chain', j, c], ['reinforcements'], {d: 3, alone: ['enemies', 'reinforcePoints', i]}))), ONE(['enemies', 'reinforcePoints', 0, 'stages'], ['reinforcements'], {to: [], alone: ['enemies', 'reinforcePoints', i]})]),
];
// A wall the arena lowers is one of the map's brick walls, named by its place and size: changed alone it names no wall,
// the arena lowers three, and that is the misfit expected (`misfit`).
// An area's id is what the barricades, the crates and the first area name it by: changed alone, the arena no longer
// fits together and the game stops, which is the value being read (`stops`).
const A = KOHAR.ambush, AMBUSH_PARTS = ['ambush', 'ambushOpen'];
const ARENA = [
  ONE(['ambush', 'start', 0], ['ambush']), ONE(['ambush', 'start', 1], ['ambush']), ONE(['ambush', 'firstArea'], AMBUSH_PARTS, {to: 2}),
  ...rows(['ambush', 'walls'], A.walls, [0, 1, 2, 3], AMBUSH_PARTS, [0, 1, 2, 3]).map(c => ({...c, misfit: ['arena walls']})),
  ...A.areas.flatMap((a, i) => [ONE(['ambush', 'areas', i, 'id'], AMBUSH_PARTS, {to: 9, stops: true}), ONE(['ambush', 'areas', i, 'name'], AMBUSH_PARTS, {to: 'Elsewhere'}), ...['x', 'z'].flatMap(k => [0, 1].map(j => ONE(['ambush', 'areas', i, k, j], AMBUSH_PARTS)))]),
  ...A.gates.flatMap((t, i) => [ONE(['ambush', 'gates', i, 'id'], AMBUSH_PARTS, {to: 'gx'}), ONE(['ambush', 'gates', i, 'from'], AMBUSH_PARTS, {to: t.from === 1 ? 2 : 1}), ONE(['ambush', 'gates', i, 'opens'], AMBUSH_PARTS, {to: 1}), ONE(['ambush', 'gates', i, 'price'], AMBUSH_PARTS, {d: 50}), ...['a', 'b', 'station'].flatMap(k => [0, 1].map(j => ONE(['ambush', 'gates', i, k, j], AMBUSH_PARTS)))]),
  ...A.stations.flatMap((s, i) => [ONE(['ambush', 'stations', i, 'area'], AMBUSH_PARTS, {to: s.area === 1 ? 2 : 1}), ONE(['ambush', 'stations', i, 'weapon'], AMBUSH_PARTS, {to: s.weapon === 'medic' ? 'support' : 'medic'}), ONE(['ambush', 'stations', i, 'price'], AMBUSH_PARTS, {d: 50}), ONE(['ambush', 'stations', i, 'at', 0], AMBUSH_PARTS), ONE(['ambush', 'stations', i, 'at', 1], AMBUSH_PARTS)]),
  ...['x', 'z'].flatMap(k => [0, 1].map(j => ONE(['ambush', 'chart', k, j], AMBUSH_PARTS, {d: 5}))),
  ...['x', 'z'].flatMap(k => [0, 1].map(j => ONE(['ambush', 'spots', k, j], AMBUSH_PARTS, {d: k === 'x' && j === 1 ? -8 : 8}))), ONE(['ambush', 'spots', 'step'], AMBUSH_PARTS),
];
// The props: every column of one prop of each kind, and the list itself.
const kinds = [...new Set(KOHAR.props.map(p => p[0]))], firstOf = k => KOHAR.props.findIndex(p => p[0] === k);
const PROPS = kinds.flatMap(k => [0, 1, 2, 3, 4, 5, 6].map(c => ONE(['props', firstOf(k), c], ['drawn', 'solids', 'occluders'], {any: true, ...(c === 0 ? {to: k === 'crate' ? 'tyres' : 'crate'} : c === 5 ? {to: KOHAR.props[firstOf(k)][5] ? 0 : 1} : {d: c === 6 ? .5 : c > 2 ? .4 : 1}), kind: k, column: ['type', 'x', 'z', 'width', 'depth', 'solid', 'yaw'][c]})));
// Values that are in the data and change nothing, with the reason. They were the same in Build 20; none is a value
// this build moved and forgot.
const INERT = {
  'enemies.loops.NW': 'the loop is read (an enemy sent on it walks it), but in Kohar Valley no enemy is assigned to it and no reinforcement joins it',
  'props.width/depth': 'crates, stacked crates, jerrycans, pots, debris and sacks have a fixed size; width and depth only say which way a row of three lies',
  'props.solid': 'whether a prop is solid follows from its type; the column is a record of it',
  'props.yaw': 'only loose items are turned (sacks, jerrycans, debris)',
};

const alone = new Map();
async function governs(list, {waves = false} = {}) {
  const idle = [];
  for (const [n, c] of list.entries()) {
    if (VALUES && !VALUES.some(v => (c.alone || c.path).join('.').startsWith(v))) continue;
    // The map the change is made to and compared with: Kohar Valley, or Kohar Valley with one entry left in a list.
    let from = KOHAR, against = base;
    if (c.alone) { const key = c.alone.join('.'); from = put(copy({...KOHAR, id: `test-alone-${key}`}), c.alone.slice(0, -1), [copy(at(KOHAR, c.alone))]); if (!alone.has(key)) alone.set(key, await probe(from, {waves, only: true})); against = alone.get(key); }
    const was = at(from, c.path), now = 'to' in c ? c.to : typeof was === 'number' ? was + (c.d ?? 1) : assert.fail(`${c.path.join('.')}: no change given`);
    assert.notDeepEqual(now, was, c.path.join('.'));
    const map = put(copy({...from, id: `test-${waves ? 'w' : 'm'}${n}`}), c.path, now); assert.deepEqual(at(from, c.path), was, 'Kohar Valley itself is never changed');
    let got, stopped = false, misfit = []; try { const now = await probe(map, {waves, only: waves}); misfit = now.fit || []; got = changed(now, against); } catch (e) { stopped = true; got = ['(the game stopped: ' + String(e.message).slice(0, 60) + ')']; }
    const hit = c.parts.filter(p => got.includes(p)), unfit = JSON.stringify(misfit) !== JSON.stringify(c.misfit || []);
    if (unfit || !(stopped ? c.stops : c.any ? got.length : hit.length === c.parts.length)) idle.push({value: (c.alone || c.path).join('.') + (c.alone ? ' › ' + c.path.slice(c.alone.length).join('.') : ''), kind: c.kind, column: c.column, expected: c.parts, changed: got, doesNotFit: misfit});
  }
  return idle;
}

await check('world', 'every value of the ground, the sky, the edges, the grid, what is built, the objectives, the starts and the enemy posts governs the game: each is changed in turn, the game is built from the changed map, and the parts that depend on it change', async () => {
  const idle = await governs(CHANGES); assert.deepEqual(idle, [], `values that do not govern: ${JSON.stringify(idle)}`);
  report.governing = {valuesChanged: CHANGES.length, all: 'each changed the parts of the game that depend on it'};
});

await check('arena', 'every value of the Ambush arena governs the game: the start, the first area, the walls that are lowered, each area, each barricade, each crate, what the map shows and where hostiles may arrive', async () => {
  const idle = await governs(ARENA); assert.deepEqual(idle, [], `values that do not govern: ${JSON.stringify(idle)}`);
  report.governingArena = {valuesChanged: ARENA.length};
});

await check('routes', 'every patrol node, every reinforcement entry and every loop reinforcements join governs the game; every column of the props governs the kinds of prop that use it', async () => {
  const idle = await governs(WAVES, {waves: true}); assert.deepEqual(idle, [], `values that do not govern: ${JSON.stringify(idle)}`);
  assert(!KOHAR.enemies.assign.includes('NW') && !Object.values(KOHAR.enemies.reinforceLoops).flat().includes('NW'), 'nobody is sent to the NW loop in Kohar Valley, as in Build 20');
  const still = await governs(PROPS), table = {}; for (const i of still) (table[i.column] ||= []).push(i.kind);
  // What each kind of prop reads: its type and place always; the rest as the kind needs.
  assert.deepEqual(Object.keys(table).sort(), ['depth', 'solid', 'width', 'yaw'], JSON.stringify(still)); assert.deepEqual(table.solid.sort(), [...kinds].sort(), 'the solid column is a record, read by no kind');
  report.governingRoutes = {valuesChanged: WAVES.length, neverUsedInKohar: {'enemies.loops.NW': INERT['enemies.loops.NW']}};
  report.governingProps = {valuesChanged: PROPS.length, kinds, columnsNotReadByKind: table, why: {width: INERT['props.width/depth'], solid: INERT['props.solid'], yaw: INERT['props.yaw']}};
});

await check('yard', 'a second map exists beside Kohar Valley: a small yard described the same way is built, deployed in Story, Skirmish and Ambush and played for ten seconds each, and Kohar Valley is afterwards what it was', async () => {
  const yard = copy({...KOHAR, id: 'test-yard', name: 'Yard'});
  Object.assign(yard, {height: () => 0, edges: {x: [-40, 40], z: [-40, 40]}, nav: {origin: -40, step: 2, cells: 41}, reach: {x: 45, z: 45}, buildings: [[-15, 0, 10, 9, 3.6], [15, -10, 12, 10, 4]], lowWalls: [[0, 10, 10, .55]], sandbags: [[5, 0]], poles: [], wire: [[-10, 8, 0], [0, 7, 0], [10, 8, 0]], brickWalls: [[-25, 20, .6, 10]], stalls: [], crates: [[8, 8]], trucks: [], trees: [[20, 20]], props: [['crate', -5, -5, 1, 1, 1, 0]],
    rocks: {count: 5, x: [-40, 40], z: [-40, 40], clear: 5}, shrubs: {count: 5, x: [-40, 40], z: [-40, 40], clear: 5}, pebbles: {count: 20, x: [-30, 30], z: [-30, 30]}, dust: {count: 10, x: [-30, 30], y: [.2, 12], z: [-30, 30]},
    relay: [0, -25], log: {at: [-15, 0], lies: [2.8, .88, 1], reach: [2, 0], door: [-15, 5.2]}, extraction: [30, 30], starts: {player: [0, 35], guest: [3, 35], squad: [[-3, 36], [0, 37], [3, 38]], mate: [3, 37]},
    enemies: {spawns: [[-30, -30], [30, -30], [-30, 0], [30, 0], [-5, -30], [5, -30], [0, -35]], loops: {A: [[-30, -30], [30, -30], [30, 0], [-30, 0]], RING: [[-10, -35], [10, -35], [10, -15], [-10, -15]]}, assign: ['A', 'A', 'A', 'A', 'GARRISON', 'GARRISON', 'A'], reinforceLoops: {0: ['A'], 1: ['RING'], 2: ['A'], skirmish: ['RING']}, reinforcePoints: [{chain: [[-36, -36], [-30, -30]], stages: [0, 1, 2]}, {chain: [[36, -36], [30, -30]], stages: [0, 1, 2]}]},
    ambush: {start: [0, 0], firstArea: 1, walls: [[-25, 20, .6, 10]], areas: [{id: 1, name: 'Yard', x: [-12, 12], z: [-12, 12]}, {id: 2, name: 'Back', x: [-12, 12], z: [-30, -12]}], gates: [{id: 'g12', from: 1, opens: 2, price: 750, a: [-12, -12], b: [12, -12], station: [0, -12]}], stations: [{area: 1, weapon: 'medic', price: 500, at: [8, 8]}], chart: {x: [-35, 35], z: [-35, 35]}, spots: {x: [-38, 38], z: [-38, 38], step: 4}}});
  maps.registerMap(yard); maps.selectMap('test-yard'); const seen = {};
  try {
    assert.equal(ambushModule.AREAS, yard.ambush.areas, 'the Ambush rules follow the map'); assert.equal(ambushModule.AMBUSH.start, yard.ambush.start); assert.equal(enemyModule.ENEMY_SPAWNS, yard.enemies.spawns); assert.equal(propsModule.VILLAGE_PROPS, yard.props);
    const g = await page(); g.prepare({clearLane: false}); assert.equal(g.groundY(12, 34), 0); assert(g.blocked(41, 0) && !g.blocked(39, 35)); assert.equal(g.ai.navigationGrid().length, 41 * 41); assert.deepEqual([g.ai.target.x, g.ai.target.z], [0, -25]); assert(g.solids.length > 10 && g.solids.length < 60, `${g.solids.length} solids`);
    const route = g.ai.pathTo(new THREE.Vector3(0, 0, 35), new THREE.Vector3(0, 0, -25)); report.yardRoute = [route.length, route.at(-1)?.x, route.at(-1)?.z]; assert(route.length > 10 && Math.hypot(route.at(-1).x - 0, route.at(-1).z + 25) < 5, 'the relay can be walked to from the start');
    for (const mode of ['story', 'skirmish', 'ambush']) { g.setMode(mode); g.reset(); g.play(); g.restoreAI(); g.set({hp: 1e9}); let clock = 0; g.frame(0); const from = g.player.clone(); for (let i = 0; i < 600; i++) g.frame(clock += 1000 / 60);
      const en = g.actors.filter(a => a.team === 'enemy'); assert.equal(g.state().state, 'playing', mode); assert(en.every(a => Number.isFinite(a.g.position.x) && Math.abs(a.g.position.x) <= 40.5 && Math.abs(a.g.position.z) <= 40.5), `${mode}: everybody is on the map`);
      assert.deepEqual([from.x, from.z], mode === 'ambush' ? [0, 0] : [0, 35], `${mode}: the start`); seen[mode] = {enemies: en.filter(a => a.hp > 0 && a.g.visible).length, wave: mode === 'ambush' ? g.amb.wave : undefined}; }
    assert.deepEqual([...g.amb.open], [1]); assert.deepEqual([...g.amb.gates.keys()], ['g12']);
  } finally { maps.selectMap('kohar'); }
  assert.equal(ambushModule.AREAS, KOHAR.ambush.areas); assert.equal(maps.activeMap(), KOHAR);
  const again = await probe(KOHAR, {waves: true}); assert.equal(firstDifference(again, base), null, 'Kohar Valley after the yard');
  report.secondMap = {built: 'a 80 m yard with two houses, from the same kind of description', played: seen, koharAfterwards: 'identical to Build 20', limit: 'a map is chosen before the page builds its world; changing map inside a running page is not built (the world is built once at load)'};
});

console.log(JSON.stringify({...(ONLY || VALUES ? {partial: {only: ONLY, values: VALUES}} : {}), passed: results.length, checks: results, report, limitations: [
  'Headless: rendering is substituted, so "drawn" is every mesh, line and point cloud by place, size and vertex data, not pixels. That Kohar Valley looks the same is shown by its geometry being the same, not by a picture.',
  'The lists are checked row by row against the Build 20 sources; governing is shown for every single value outside the long lists, and inside the long lists for every column of chosen rows (first and last, every enemy spawn, every patrol node, every reinforcement entry, one prop of each kind): the rows of a list are read by one loop.',
  'Story words that name places ("western field office", "eastern courtyard") are part of the operation, not of the map, and stay in the game.',
  'A map is chosen before the game builds its world. Changing map inside a running page (which co-op will need, because reloading drops the connection) is not built.']}, null, 2));
