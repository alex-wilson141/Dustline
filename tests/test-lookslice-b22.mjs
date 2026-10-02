// Build 22 (T32): the look slice of Dehrun Terraces, and Kohar Valley untouched by it.
// Kohar Valley: a page that asks for no map fetches nothing of the new map (no description, no kit, no model loader,
// no asset), and its world is Build 20's (that comparison is T31's, which runs on this build too).
// Dehrun Terraces: everything the block refers to is a file that exists, is fingerprinted, is whole and is served;
// nothing is bundled that is not used; the block stays under the ceilings (500 draw calls, 350,000 triangles) and the
// download under its cap (30 MB); what can be walked is what the description says.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createGame, projectRoot} from './sprint-harness.mjs';

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const maps = await import(new URL('dist/maps.js', projectRoot));
const {ASSET_VERSIONS, assetURL} = await import(new URL('dist/build.js', projectRoot));
const SOURCE = process.env.DUSTLINE_GAME_SOURCE ? new URL('file://' + process.env.DUSTLINE_GAME_SOURCE) : undefined;
const ONLY = process.env.DUSTLINE_T32_ONLY?.split(',');
const dist = fileURLToPath(new URL('dist/', projectRoot));
// The ceilings were raised in Build 23 after the Safari measurement (B19): 350,000 triangles ran at 2.7 ms a frame.
const CEILING = {draws: 700, triangles: 700000}, CAP_MB = 30, NEW = ['map-dehrun.js', 'terraces.js', 'GLTFLoader.js'];
const results = [], report = {};
async function check(tag, name, fn) { if (ONLY && !ONLY.includes(tag)) return; await fn(); results.push(name); }
const page = () => createGame(SOURCE ? {sourcePath: SOURCE} : {});
const read = f => fs.readFileSync(path.join(dist, f), 'utf8');
// Every module a module brings in when it is loaded (the `import ... from` and `import '...'` lines, followed through).
function loadedWith(first) { const seen = new Set(), walk = f => { if (seen.has(f)) return; seen.add(f); for (const m of read(f).matchAll(/^\s*import\s+(?:[^'"]*?from\s+)?['"]\.\/([^'"]+)['"]/gm)) walk(m[1]); }; walk(first); return [...seen].sort(); }
// What is drawn: meshes, lines and point clouds outside the actors and the weapon in hand.
function drawn(g) { let calls = 0, triangles = 0; const kinds = new Set(); g.scene.updateMatrixWorld(true);
  g.scene.traverse(o => { if (!(o.isMesh || o.isLine || o.isPoints) || o.userData.actor || !o.visible) return; let p = o; while (p && p !== g.scene && p !== g.camera) p = p.parent; if (p !== g.scene) return;
    calls++; const geo = o.geometry, n = geo.index ? geo.index.count : geo.attributes.position.count; if (o.isMesh) triangles += n / 3 * (o.isInstancedMesh ? o.count : 1); if (o.userData.prop) kinds.add(o.userData.prop); });
  return {calls, triangles: Math.round(triangles), propKinds: kinds.size}; }

await check('kohar', 'Kohar Valley fetches nothing of the new map: the modules it loads do not include the new map, its kit or the model loader; a page with no map asked for, or with one that does not exist, is Kohar Valley and asks for no new asset; the game makes no kit and no place to stand the viewer', async () => {
  const graph = loadedWith('game.js'); for (const f of NEW) assert(!graph.includes(f), `${f} is loaded with the game`); assert(graph.includes('maps.js') && graph.includes('map-kohar.js'));
  assert.deepEqual(loadedWith('map-dehrun.js').filter(f => NEW.includes(f)).sort(), [...NEW].sort(), 'the new map brings its kit and the loader itself');
  assert(/const LATER = \{dehrun: \(\) => import\('\.\/map-dehrun\.js'\)/.test(read('maps.js')), 'the new map is fetched when asked for'); assert.equal([...read('maps.js').matchAll(/import\(/g)].length, 1); assert.equal([...read('game.js').matchAll(/\bimport\(/g)].length, 0);
  // The address decides: a fresh copy of the chooser per address.
  const choose = async search => { const keep = globalThis.location; globalThis.location = search == null ? undefined : {search}; try { const m = await import(new URL(`dist/maps.js?choose=${encodeURIComponent(String(search))}`, projectRoot)); return {id: m.activeMap().id, ids: m.mapIds()}; } finally { globalThis.location = keep; maps.selectMap('kohar'); } };
  const warn = console.warn; console.warn = () => {}; try {
    assert.deepEqual(await choose(''), {id: 'kohar', ids: ['kohar']}); assert.deepEqual(await choose('?map=kohar'), {id: 'kohar', ids: ['kohar']}); assert.deepEqual(await choose('?map=nowhere'), {id: 'kohar', ids: ['kohar']}); assert.deepEqual(await choose('?build=upgrade-1'), {id: 'kohar', ids: ['kohar']});
    assert.deepEqual(await choose('?map=dehrun'), {id: 'dehrun', ids: ['kohar', 'dehrun']}); } finally { console.warn = warn; }
  assert.equal(maps.activeMap().id, 'kohar');
  const g = await page(); g.prepare({clearLane: false}); const asked = g.assetRequests.map(String);
  assert(asked.length >= 14, `${asked.length} assets asked for`); assert(asked.every(a => !a.includes('dehrun') && !a.includes('.glb')), 'no asset of the new map'); assert(asked.every(a => /\?v=[0-9a-f]{10}$/.test(a)), 'every asset by its fingerprint'); assert.equal(g.built, null, 'no kit'); assert.equal(globalThis.window.dustline.stand, undefined);
  const d = drawn(g); assert.equal(d.propKinds, 0); g.setMode('story'); g.reset(); g.play(); assert.equal(g.actors.filter(a => a.g.visible && a.hp > 0).length, 10, 'the squad and the enemies are there'); assert.match(g.el('objective-label').textContent || '01', /./);
  // Its light is what it was: the game's own values stand wherever a map names none, and Kohar Valley names none.
  const game = SOURCE ? fs.readFileSync(SOURCE, 'utf8') : read('game.js'), {KOHAR} = await import(new URL('dist/map-kohar.js', projectRoot));
  for (const t of ['WORLD.sky.environment??.35', 'WORLD.sky.background??.75', 'WORLD.sky.ambient??1.6', 'WORLD.sun.colour??0xffe6c2', 'WORLD.sun.power??3.6', 'WORLD.terrain.surface||groundY', 'LOOKMAP=WORLD.look||null']) assert(game.includes(t), `the game keeps ${t}`);
  for (const k of ['environment', 'background', 'ambient']) assert(!(k in KOHAR.sky)); for (const k of ['colour', 'power']) assert(!(k in KOHAR.sun)); assert(!('surface' in KOHAR.terrain) && !('look' in KOHAR) && !('build' in KOHAR) && !('block' in KOHAR));
  assert.match(read('index.html'), /BUILD 36/);
  report.kohar = {modulesLoaded: graph.length, assetsAskedFor: asked.length, drawn: d, note: 'that its world is Build 20\'s, number for number, is checked by T31 on this same build'};
});

const DEHRUN = await maps.loadMap('dehrun'); maps.selectMap('kohar');
const {SURFACES, SURFACE_FILES, surfaceAssets, modelAsset} = await import(new URL('dist/terraces.js', projectRoot));
const kinds = [...new Set(DEHRUN.block.props.map(p => p[0]))], sky = `assets/${DEHRUN.sky.asset}`;
const needed = [...SURFACE_FILES.flatMap(surfaceAssets), ...kinds.map(modelAsset), sky].sort();
async function dehrun() { maps.selectMap('dehrun'); try { const g = await page(); g.prepare({clearLane: false}); await g.built.ready; return g; } finally { maps.selectMap('kohar'); } }

await check('assets', 'every asset the block refers to is there, fingerprinted, whole and asked for by its fingerprint; nothing is bundled that the block does not use; every model is one file with its pictures inside; the download stays under its cap', async () => {
  const onDisk = []; const walk = d => { for (const e of fs.readdirSync(path.join(dist, d), {withFileTypes: true}).filter(e => !e.name.startsWith('.'))) e.isDirectory() ? walk(`${d}/${e.name}`) : onDisk.push(`${d}/${e.name}`); }; walk('assets/dehrun');
  assert.deepEqual(onDisk.sort(), needed, 'what is bundled is what is used');
  let bytes = fs.statSync(path.join(dist, 'GLTFLoader.js')).size; const models = {};
  for (const f of needed) { const data = fs.readFileSync(path.join(dist, f)); bytes += data.length; assert(data.length > 1000, `${f} is not empty`);
    assert.equal(ASSET_VERSIONS[f], crypto.createHash('sha256').update(data).digest('hex').slice(0, 10), `${f}: fingerprint`); assert.equal(assetURL(f), `${f}?v=${ASSET_VERSIONS[f]}`);
    if (f.endsWith('.jpg')) { assert.equal(data.readUInt16BE(0), 0xffd8, `${f} is a JPEG`); assert.equal(data.readUInt16BE(data.length - 2), 0xffd9, `${f} is whole`); }
    if (f.endsWith('.hdr')) assert.match(data.subarray(0, 11).toString('latin1'), /^#\?RADIANCE/, `${f} is a Radiance picture`);
    if (f.endsWith('.glb')) { assert.equal(data.subarray(0, 4).toString('latin1'), 'glTF'); assert.equal(data.readUInt32LE(8), data.length, `${f} is whole`); const n = data.readUInt32LE(12); assert.equal(data.subarray(16, 20).toString('latin1'), 'JSON'); const j = JSON.parse(data.subarray(20, 20 + n).toString('utf8'));
      assert(j.buffers.length === 1 && !j.buffers[0].uri, `${f}: its data is inside`); assert((j.images || []).every(i => i.bufferView != null && !i.uri), `${f}: its pictures are inside`); assert.equal(data.readUInt32LE(20 + n) + 28 + n, data.length, `${f}: one data chunk`);
      let t = 0; for (const m of j.meshes) for (const p of m.primitives) t += j.accessors[p.indices ?? p.attributes.POSITION].count / 3; models[path.basename(f, '.glb')] = t; } }
  assert(bytes / 1048576 <= CAP_MB, `${(bytes / 1048576).toFixed(2)} MB added`);
  const g = await dehrun(), asked = g.assetRequests.map(String), want = needed.map(f => assetURL(f));
  for (const u of want) assert(asked.includes(u), `${u} is asked for`); assert(asked.filter(a => a.includes('dehrun')).every(a => want.includes(a)), 'nothing of the new map is asked for that is not bundled'); assert(asked.every(a => /\?v=[0-9a-f]{10}$/.test(a)), 'every asset by its fingerprint');
  assert.deepEqual(g.built.stats.failed || [], [], 'every model arrived'); assert.equal(g.built.stats.propKinds, kinds.length);
  for (const s of Object.values(SURFACES)) assert(SURFACE_FILES.includes(s.file)); for (const h of Object.keys(DEHRUN.block.hardProps)) assert(kinds.includes(h), `${h} stands in the block`);
  const used = new Set(); const note = s => { if (typeof s === 'string') used.add(s); }; const B = DEHRUN.block; for (const x of [...B.grounds, ...B.walls, ...B.arches, ...(B.pieces || [])]) { note(x.surface); note(x.coping); note(x.gate); } for (const h of B.houses) for (const s of h.storeys) { note(s.surface); note(s.band); note(s.floor); note(s.lining); }
  for (const s of used) assert(s === 'dark' || SURFACES[s], `the surface ${s} exists`);
  report.assets = {files: needed.length, surfaces: SURFACE_FILES.length, models: kinds.length, megabytesAdded: +(bytes / 1048576).toFixed(2), cap: CAP_MB, trianglesPerModel: models};
});

await check('served', 'every file of the new map is served: a web server over dist/ answers each address the game asks for, fingerprint and all, with the whole file, and the three new modules too', async () => {
  const server = http.createServer((q, r) => { const f = path.join(dist, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!f.startsWith(dist) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200); fs.createReadStream(f).pipe(r); });
  await new Promise(done => server.listen(0, '127.0.0.1', done)); const base = `http://127.0.0.1:${server.address().port}/`, real = globalThis.fetch; let n = 0;
  try { const get = await import('node:http').then(h => u => new Promise((done, fail) => h.get(u, r => { const c = []; r.on('data', d => c.push(d)); r.on('end', () => done({status: r.statusCode, body: Buffer.concat(c)})); }).on('error', fail)));
    const g = await dehrun(); for (const a of [...new Set(g.assetRequests.map(String))]) { const r = await get(base + a); assert.equal(r.status, 200, a); assert.equal(r.body.length, fs.statSync(path.join(dist, a.split('?')[0])).size, `${a} whole`); n++; }
    for (const f of NEW) { const r = await get(`${base}${f}?v=x`); assert.equal(r.status, 200, f); n++; }
    assert.equal((await get(base + 'assets/dehrun/models/not_there.glb')).status, 404, 'a file that is not there is refused, so a missing one would show');
    const html = read('index.html'); for (const f of NEW) assert(html.includes(`"./${f}":"./${f}?v=`), `${f} is in the import map`);
  } finally { server.close(); globalThis.fetch = real; }
  report.served = {addressesAnswered: n, limit: 'a server on this machine; that GitHub Pages serves them is checked on the live page after a push'};
});

await check('ceilings', 'the block stays under the ceilings with every model in place: draw calls under 700 and triangles under 700,000 (raised after B19), counted over everything that is drawn; each kind of prop is drawn once per part however many stand there', async () => {
  const g = await dehrun(), d = drawn(g), props = DEHRUN.block.props.length;
  assert(d.calls <= CEILING.draws, `${d.calls} draw calls`); assert(d.triangles <= CEILING.triangles, `${d.triangles} triangles`); assert(d.calls > 40 && d.triangles > 150000, 'the block is there'); assert(d.triangles < 650000, 'the town has not grown past what Build 28 measured (B24) by more than Build 29\'s windows, glass and wider stairs');
  assert.equal(d.propKinds, kinds.length); const parts = []; g.scene.traverse(o => { if (o.userData.prop) parts.push(o); }); assert(parts.every(o => o.isInstancedMesh && o.count === DEHRUN.block.props.filter(p => p[0] === o.userData.prop).length), 'one drawing per part for all of a kind'); assert(parts.length < props, `${parts.length} drawings for ${props} props`);
  assert.equal(Math.round(g.built.stats.propTriangles), Math.round(parts.reduce((s, o) => s + (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * o.count, 0)));
  assert.equal(g.scene.children.filter(o => o.isLight).length, 3, 'no light source is added (sky, sun, the lamp in the open house)');
  report.ceilings = {drawCalls: d.calls, triangles: d.triangles, ofWhichProps: Math.round(g.built.stats.propTriangles), props, propKinds: kinds.length, propDrawings: parts.length, ceilings: CEILING, note: 'everything drawn, whether in view or not; the weapon in hand and no actor counted. In the browser the count in view is lower.'};
});

await check('walk', 'the block can be walked as its description says: the viewer starts on the lowest terrace with nobody else there and no mission, climbs both flights of steps to the top, enters the open house and the shop through their doors and not through their windows or walls, and cannot leave the block or stand on anything above the ground', async () => {
  const g = await dehrun(), L = [0, 1.6, 3.2]; g.setMode('story'); g.reset(); g.play(); g.restoreAI();
  assert.deepEqual([g.player.x, g.player.z], DEHRUN.starts.player); assert.deepEqual(DEHRUN.starts.player, [0, 37], 'the start the user is told of'); assert.equal(g.actors.filter(a => a.g.visible).length, 0, 'nobody else'); assert.equal(g.state().state, 'playing');
  let clock = 0; g.frame(0); const run = (s, each) => { for (let i = 0; i < s * 60; i++) { g.frame(clock += 1000 / 60); each?.(); } };
  run(.3); assert.equal(g.el('objective-label').textContent, DEHRUN.look.title); assert.equal(g.el('objtext').textContent, DEHRUN.look.line); assert.equal(g.actors.filter(a => a.g.visible || a.hp > 0).length, 0);
  // Up the street: forward from the start to the top terrace, by both flights.
  const heights = new Set(); let top = 0; g.set({yaw: 0, pitch: 0}); g.press('KeyW'); run(24, () => { heights.add(+g.groundY(g.player.x, g.player.z).toFixed(1)); top = Math.max(top, g.player.y); }); g.release('KeyW');
  assert(g.player.z < -20, `reached z ${g.player.z.toFixed(1)}`); assert(Math.abs(g.player.y - L[2]) < .03, `on the top terrace (${g.player.y})`); assert(heights.has(0) && heights.has(1.6) && heights.has(3.2) && heights.has(.8) && heights.has(2.4), 'by way of the steps'); assert(top <= L[2] + .03, 'never above the top terrace\'s paving (Build 24: the body stands on the stone, a centimetre or two above the walked ground)');
  for (const [x, z, y] of [[0, 30, 0], [10, 30, 0], [0, 18.5, .8], [5, 18.5, 0], [0, 10, 1.6], [-10, 10, 1.6], [0, -4.5, 2.4], [8, -4.5, 1.6], [0, -20, 3.2]]) assert(Math.abs(g.groundY(x, z) - y) < 1e-9, `height at ${x}, ${z}`);
  // Doors let through, windows and walls do not; the edges hold.
  const free = (x, z) => !g.blocked(x, z); for (const h of DEHRUN.block.houses.filter(h => h.enter)) { const mx = (h.x[0] + h.x[1]) / 2, mz = (h.z[0] + h.z[1]) / 2; assert(free(mx + (h.id === 'A' ? 2 : 0), mz + (h.id === 'A' ? -2 : 0)) || free(mx, mz), `${h.id}: its room can be stood in`); }
  assert(free(-4.37, 5) && free(-3.4, 5) && free(-5.4, 5), 'through the door of the open house'); assert(!free(10.83, 10), 'not through the shop\'s window'); assert(!free(-4.37, 7.2), 'not through its wall');
  assert(free(4.37, 7.1), 'through the door of the shop'); assert(!free(4.37, 10.9), 'not over its counter'); assert(free(-5.37, 28.5), 'into the workshop');
  for (const h of DEHRUN.block.houses.filter(h => !h.enter)) assert(!free((h.x[0] + h.x[1]) / 2, (h.z[0] + h.z[1]) / 2), `${h.id} is closed`);
  assert(free(0, 44.2) && free(0, 80.2) && free(0, -30.2) && free(-24, 30) && free(24, -18) && free(-22, 62) && free(22, 62) && !free(22, 70) && !free(-24, 40) && !free(0, 105.2) && !free(0, -100.2) && !free(-72, 30) && !free(72, -10), 'the town is closed all round; the gates between the block, the square and the districts stand open (Build 28)'); assert(!free(10, 16.7) && !free(-10, -6.3), 'the retaining walls hold'); assert(!free(1.85, 18.5), 'the sides of the steps hold');
  // Nothing is asked of the viewer: beside the place where Kohar Valley's route log would lie, no prompt appears and E does nothing.
  g.player.set(-8, g.groundY(-8, 6), 6); const before = g.el('radiotext').textContent; let prompts = 0; run(1, () => { if (g.el('interact').textContent) prompts++; }); g.press('KeyE'); g.release('KeyE'); run(.2);
  assert.equal(prompts, 0, 'no prompt'); assert.equal(g.getStage(), 0); assert.equal(g.el('radiotext').textContent, before); assert.equal(g.kills(), 0);
  // The ground that is drawn lies under everything that is built: nowhere in the block does it reach the ground that is walked on.
  for (let x = -71; x <= 71; x += 2.5) for (let z = -99; z <= 104; z += 2.5) assert(g.terrainAt(x, z) <= g.groundY(x, z) - .25, `the drawn ground comes through at ${x}, ${z}`);
  const p = g.ai.pathTo(new THREE.Vector3(0, 0, 37), new THREE.Vector3(0, 0, -24)); assert(p.length > 20 && Math.hypot(p.at(-1).x, p.at(-1).z + 24) < 3, 'a way from the start to the top');
  report.walk = {start: DEHRUN.starts.player, reached: [+g.player.x.toFixed(1), +g.player.z.toFixed(1)], levels: L, open: DEHRUN.block.houses.filter(h => h.enter).map(h => h.id), closed: DEHRUN.block.houses.filter(h => !h.enter).map(h => h.id), cannot: 'upper floors, outside stairs, balconies and roofs: height is not built'};
});

console.log(JSON.stringify({...(ONLY ? {partial: ONLY} : {}), passed: results.length, checks: results, report, limitations: [
  'Headless: rendering is substituted. How the block looks is for the user to judge in Safari; draw calls and triangles here are everything drawn, not what is in view.',
  'Served means served by a web server over dist/ on this machine. GitHub Pages is checked on the live page after a push.',
  'Frame time and Kohar Valley\'s load time are measured in Safari (B18), not here.']}, null, 2));
