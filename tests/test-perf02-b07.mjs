// PERF-02: terrain hits and line of sight are computed by walking only the terrain cells a ray crosses, with the same
// three.js triangle test, instead of all 64,800 terrain triangles. Results must be identical to before the fix.
// (1) The walker against three.js Mesh.raycast on seeded rays; (2) the Build 06 game (before) against the current game
// (after) on a fixed set of shots and line-of-sight pairs in the real map.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execSync} from 'node:child_process';
import {createGame, projectRoot} from './sprint-harness.mjs';

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const {terrainRaycaster} = await import(new URL('dist/optimization.js', projectRoot));
const results = [], timing = {};
async function check(name, fn) { await fn(); results.push(name); }
let seed = 20260923; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296), span = (a, b) => a + rnd() * (b - a);

const after = await createGame();
const ground = after.ground, walker = terrainRaycaster(ground), rc = new THREE.Raycaster();

await check('terrain walker equals three.js Mesh.raycast on 6,000 seeded rays (nearest hit bitwise, any-hit, misses)', async () => {
  assert(walker.exact(), 'terrain layout recognised (otherwise it falls back to Mesh.raycast)');
  const rays = [];
  for (let i = 0; i < 1500; i++) rays.push([[span(-90, 90), span(-.4, 6), span(-95, 85)], [span(-1, 1), span(-1, .3), span(-1, 1)], span(1, 220)]); // uniform
  for (let i = 0; i < 1500; i++) { const x = span(-90, 90), z = span(-95, 85); rays.push([[x, after.terrainAt(x, z) + span(-.02, 1.5), z], [span(-1, 1), span(-.06, .06), span(-1, 1)], span(5, 220)]); } // grazing
  const seg = 1100 / 180;
  for (let i = 0; i < 1500; i++) { const ix = Math.round(span(-14, 14)), iz = Math.round(span(-14, 14)), x = ix * seg + (i % 3 ? 0 : seg / 2), z = iz * seg; rays.push([[x, span(.2, 3), z], i % 2 ? [0, -1, 0] : [span(-1, 1), -span(.05, 1), i % 4 ? 0 : span(-1, 1)], span(1, 120)]); } // grid lines, vertices, vertical
  for (let i = 0; i < 1500; i++) rays.push([[span(-90, 90), span(.5, 3), span(-95, 85)], [span(-1, 1), span(-.3, .3), span(-1, 1)], span(.5, 48)]); // LOS-like
  let hits = 0, t0 = 0, t1 = 0;
  for (const [o, d, far] of rays) {
    rc.set(new THREE.Vector3(...o), new THREE.Vector3(...d).normalize()); rc.near = 0; rc.far = far;
    let s = performance.now(); const ref = rc.intersectObject(ground, false); t0 += performance.now() - s;
    s = performance.now(); const near = walker.nearest(rc), any = walker.any(rc); t1 += performance.now() - s;
    assert.equal(any, ref.length > 0, 'any-hit agrees');
    if (!ref.length) { assert.equal(near, null); continue; }
    hits++; assert.equal(near.faceIndex, ref[0].faceIndex); assert(Object.is(near.distance, ref[0].distance), 'distance bitwise');
    assert(Object.is(near.point.x, ref[0].point.x) && Object.is(near.point.y, ref[0].point.y) && Object.is(near.point.z, ref[0].point.z), 'point bitwise');
  }
  assert(hits > 1500, `${hits} hits compared`); timing.terrainRayMs = {meshRaycast: +(t0 / rays.length).toFixed(4), walker: +(t1 / rays.length / 2).toFixed(4)};
});

// Build 06 is the "before" game (hitScan and visible raycast the terrain mesh directly).
const tmp = new URL('tests/.b06-game.js', projectRoot);
fs.writeFileSync(tmp, execSync('git show de92234:dist/game.js', {cwd: new URL('.', projectRoot)}));
let before;
try { before = await createGame({sourcePath: tmp}); } finally { fs.rmSync(tmp, {force: true}); }
const worlds = [before, after];
for (const g of worlds) { g.prepare({clearLane: false}); g.el('blood').checked = false; }
// Same enemy poses in both worlds, so shots can hit people as well as walls and ground.
const poses = [[-4, 30, 0], [3, 25, 1], [4, 20, 2.5], [-10, 12, -1], [12, -2, .5], [-24, -6, 3], [0, -44, 0]];
for (const g of worlds) g.actors.filter(a => a.team === 'enemy').forEach((a, i) => { const [x, z, r] = poses[i]; a.g.position.set(x, g.groundY(x, z), z); a.g.rotation.set(0, r, 0); a.hp = 1e9; a.g.visible = true; a.g.updateMatrixWorld(true); });

await check('hitScan: identical end points before and after on 400 fixed shots (people, walls, ground, sky)', async () => {
  const shots = [];
  for (let i = 0; i < 400; i++) {
    const o = [span(-40, 40), 0, span(-60, 58)]; o[1] = after.groundY(o[0], o[2]) + span(.9, 1.8);
    const aimAt = i % 3 === 0 ? poses[i % poses.length] : null;
    const d = aimAt ? [aimAt[0] - o[0], after.groundY(aimAt[0], aimAt[1]) + span(.3, 1.7) - o[1], aimAt[1] - o[2]] : [span(-1, 1), span(-.5, .15), span(-1, 1)];
    shots.push([o, d]);
  }
  const ends = worlds.map(() => []), times = [0, 0];
  worlds.forEach((g, w) => { for (const [o, d] of shots) { const s = performance.now(); ends[w].push(g.hitScan(new THREE.Vector3(...o), new THREE.Vector3(...d).normalize(), {damage: 1}, 'local').toArray()); times[w] += performance.now() - s; } });
  let people = 0;
  for (let i = 0; i < shots.length; i++) assert.deepEqual(ends[1][i], ends[0][i], `shot ${i}`);
  for (const a of after.actors) if (a.team === 'enemy' && a.hp < 1e9) people++;
  assert(people >= 5, `${people} enemies were hit in the fixed set`);
  timing.hitScanMs = {before: +(times[0] / shots.length).toFixed(3), after: +(times[1] / shots.length).toFixed(3)};
});

await check('visible(): identical line of sight before and after on 3,000 fixed pairs across the map', async () => {
  const pairs = [];
  for (let i = 0; i < 3000; i++) { const a = [span(-80, 80), 0, span(-85, 75)], b = [a[0] + span(-48, 48), 0, a[2] + span(-48, 48)]; a[1] = after.groundY(a[0], a[2]) + (i % 4 ? 1.42 : 1.12); b[1] = after.groundY(b[0], b[2]) + [1.4, .75, 1.25, .3][i % 4]; pairs.push([a, b]); }
  const out = worlds.map(() => []), times = [0, 0];
  worlds.forEach((g, w) => { for (const [a, b] of pairs) { const s = performance.now(); out[w].push(g.visible(new THREE.Vector3(...a), new THREE.Vector3(...b))); times[w] += performance.now() - s; } });
  assert.deepEqual(out[1], out[0]);
  const blocked = out[0].filter(v => !v).length; assert(blocked > 300 && blocked < 2700, `${blocked} blocked pairs (mixed set)`);
  timing.visibleMs = {before: +(times[0] / pairs.length).toFixed(4), after: +(times[1] / pairs.length).toFixed(4)};
});

await check('terrain alone blocks sight: over real crests where only the terrain is in the way, before and after both report blocked', async () => {
  // At the game's own eye/target heights (1.42/1.12 m eye; 1.4/1.25/.75 m target) no pair within the 48 m sensing range is
  // blocked by terrain alone (gentle terrain: slope <= 2.3 deg, +-0.56 m); so this proves the terrain part of visible()
  // on long, low sight lines over real crests of the map, where the terrain mesh is the only possible blocker.
  const solids = after.occluders.filter(o => o !== ground), ref = new THREE.Raycaster(), pairs = [];
  let s2 = 11; const r2 = () => ((s2 = (s2 * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 40000 && pairs.length < 12; i++) {
    const ax = -80 + r2() * 160, az = -85 + r2() * 160, ang = r2() * Math.PI * 2, d = 40 + r2() * 110, bx = ax + Math.cos(ang) * d, bz = az + Math.sin(ang) * d;
    if (after.blocked(ax, az) || after.blocked(bx, bz) || Math.abs(bx) > 84 || bz > 78 || bz < -88) continue;
    const a = new THREE.Vector3(ax, after.groundY(ax, az) + .15, az), b = new THREE.Vector3(bx, after.groundY(bx, bz) + .15, bz), dir = b.clone().sub(a), dist = dir.length();
    ref.set(a, dir.normalize()); ref.far = dist;
    if (ref.intersectObject(ground, false).length && !ref.intersectObjects(solids, false).length) pairs.push([a, b]);
  }
  assert(pairs.length >= 6, `${pairs.length} terrain-only blocked sight lines found`);
  for (const [a, b] of pairs) {
    assert.equal(before.visible(a, b), false, 'Build 06: blocked by the hill'); assert.equal(after.visible(a, b), false, 'Build 07: blocked by the hill');
    const up = new THREE.Vector3(0, 1.5, 0), a2 = a.clone().add(up), b2 = b.clone().add(up), dir = b2.clone().sub(a2);
    ref.set(a2, dir.clone().normalize()); ref.far = dir.length();
    const clear = !ref.intersectObject(ground, false).length && !ref.intersectObjects(solids, false).length;
    if (clear) assert.equal(after.visible(a2, b2), true, 'raised above the crest: visible');
  }
});

await check('ties: when terrain and a character are hit at exactly the same distance, the terrain wins (as three.js ordered it before)', async () => {
  // A mesh sharing the terrain geometry is attached to an enemy standing at the origin, so a straight-down shot hits the
  // terrain and that "body" at bitwise-equal distances. Build 06's stable sort put the terrain first: no damage.
  for (const g of worlds) {
    const e = g.actors.filter(a => a.team === 'enemy')[6];
    e.g.position.set(0, 0, 0); e.g.rotation.set(0, 0, 0); e.hp = 1000; e.g.visible = true;
    const twin = new THREE.Mesh(ground.geometry, ground.material); twin.userData.actor = e; e.g.add(twin); g.scene.updateMatrixWorld(true);
    for (const [x, z] of [[6, 6], [-7, 5], [9, -8]]) g.hitScan(new THREE.Vector3(x, 3, z), new THREE.Vector3(0, -1, 0), {damage: 1}, 'local');
    e.g.remove(twin);
    assert.equal(e.hp, 1000, `${g === before ? 'Build 06' : 'Build 07'}: the tied terrain is hit, not the body`);
  }
});

await check('the terrain mesh is no longer brute-force raycast by the game', async () => {
  const src = fs.readFileSync(new URL('dist/game.js', projectRoot), 'utf8');
  assert(!/intersectObjects\(occluders/.test(src), 'no ray list includes the terrain mesh');
  let calls = 0; const orig = ground.raycast; ground.raycast = function (...a) { calls++; return orig.apply(this, a); };
  try { for (let i = 0; i < 50; i++) { after.hitScan(new THREE.Vector3(0, 2, 40), new THREE.Vector3(span(-1, 1), -.2, -1).normalize(), {damage: 1}, 'local'); after.visible(new THREE.Vector3(0, 1.4, 40), new THREE.Vector3(span(-20, 20), .3, span(0, 30))); } }
  finally { ground.raycast = orig; }
  assert.equal(calls, 0);
});

console.log(JSON.stringify({passed: results.length, checks: results, timing, limitations: [
  'Headless Node; per-call timings are indicative. Rays lying exactly in a terrain triangle plane (|D·n| ~ 1e-17), where three.js reports phantom hits, are the only known difference and are not part of this set.']}, null, 2));
