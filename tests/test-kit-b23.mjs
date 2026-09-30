// Build 23 (T33): the building kit of Dehrun Terraces after the critique of the look slice. A fault in the kit is a
// fault in every block of the map, so these checks are of the kit's work wherever it is used:
// no two different surfaces lie in one plane where they can be seen (that is what flickers); every window has a
// casement and glass, every shut door stands in its opening; every awning is cloth with a hem, carried by something;
// beam ends are not evenly spaced; balconies are propped; the sun in the sky stands where the light comes from;
// the town goes on beyond the walls; and nothing of this reaches Kohar Valley.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame, projectRoot} from './sprint-harness.mjs';

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const maps = await import(new URL('dist/maps.js', projectRoot));
const SOURCE = process.env.DUSTLINE_GAME_SOURCE ? new URL('file://' + process.env.DUSTLINE_GAME_SOURCE) : undefined;
const ONLY = process.env.DUSTLINE_T33_ONLY?.split(',');
const results = [], report = {};
async function check(tag, name, fn) { if (ONLY && !ONLY.includes(tag)) return; await fn(); results.push(name); }
const page = () => createGame(SOURCE ? {sourcePath: SOURCE} : {});
const DEHRUN = await maps.loadMap('dehrun'); maps.selectMap('kohar');
async function dehrun() { maps.selectMap('dehrun'); try { const g = await page(); g.prepare({clearLane: false}); await g.built.ready; return g; } finally { maps.selectMap('kohar'); } }
const g = await dehrun(), B = DEHRUN.block, list = g.built.stats.list;
const boxes = list.filter(b => !b.turned).map(b => ({s: b.surface, min: b.at.map((v, k) => v - b.size[k] / 2), max: b.at.map((v, k) => v + b.size[k] / 2)}));
const openings = (houses, pick) => houses.flatMap(h => h.storeys.flatMap(s => ['north', 'south', 'east', 'west'].flatMap(f => (s[f] || []).filter(pick).map(o => ({...o, house: h.id})))));

await check('planes', 'nothing flickers: nowhere in the block or beyond it do two different surfaces lie in the same plane, facing the same way, where nothing covers them, over more than a hand\'s width', async () => {
  const E = .004, found = [];
  for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) { const A = boxes[a], C = boxes[b]; if (A.s === C.s) continue;
    if (A.min[0] > C.max[0] || C.min[0] > A.max[0] || A.min[1] > C.max[1] || C.min[1] > A.max[1] || A.min[2] > C.max[2] || C.min[2] > A.max[2]) continue;
    for (let ax = 0; ax < 3; ax++) for (const side of ['min', 'max']) { if (Math.abs(A[side][ax] - C[side][ax]) > E) continue; const ks = [0, 1, 2].filter(k => k !== ax), lo = ks.map(k => Math.max(A.min[k], C.min[k])), hi = ks.map(k => Math.min(A.max[k], C.max[k])), area = (hi[0] - lo[0]) * (hi[1] - lo[1]);
      if (hi[0] - lo[0] < .02 || hi[1] - lo[1] < .02 || area < .05) continue;
      let open = 0; for (const u of [.1, .5, .9]) for (const v of [.1, .5, .9]) { const q = [0, 0, 0]; q[ax] = A[side][ax] + (side === 'max' ? .003 : -.003); q[ks[0]] = lo[0] + (hi[0] - lo[0]) * u; q[ks[1]] = lo[1] + (hi[1] - lo[1]) * v; if (!boxes.some(D => D !== A && D !== C && [0, 1, 2].every(k => q[k] > D.min[k] && q[k] < D.max[k]))) open++; }
      if (open) found.push({surfaces: [A.s, C.s], plane: 'xyz'[ax] + ' = ' + A[side][ax].toFixed(3), area: +area.toFixed(2), at: [0, 1, 2].map(k => +((Math.max(A.min[k], C.min[k]) + Math.min(A.max[k], C.max[k])) / 2).toFixed(2))}); } }
  assert.deepEqual(found, [], `${found.length} places: ${JSON.stringify(found.slice(0, 4))}`);
  assert(boxes.length > 2000, `${boxes.length} boxes looked at`);
  // A roof lies above the walls it rests on; a lintel hangs below the wall it carries; a sill stands above the wall under it.
  report.planes = {boxes: boxes.length, inOnePlane: 0, before: 'Build 22 had 442 such places, the largest 151 square metres on each side of the street (the terrace\'s ground against the retaining wall)'};
});

await check('openings', 'windows and doors are made, not holes: every window of the block has a casement with glass and glazing bars set back in the wall (dark glass where the house is shut, clear where it is open), a frame and a sill; every shut door stands in its opening with battens and a handle; iron bars are iron', async () => {
  const made = B.houses.filter(h => !h.plain), windows = openings(made, o => o.kind === 'window'), doors = openings(made, o => o.kind === 'door'), count = s => list.filter(b => b.surface === s).length;   /* Build 28: the town's plain houses are shells with shutters and no glass, like the houses beyond the walls */
  assert(windows.length >= 30 && doors.length >= 9, `${windows.length} windows, ${doors.length} doors`);
  const glazed = openings(B.houses.filter(h => !h.plain || h.glazed), o => o.kind === 'window'); assert.equal(count('pane') + count('clear'), glazed.reduce((n, o) => n + (o.double ? 2 : 1), 0), 'one pane of glass a casement: one a window, two a double window (Build 29: the town\'s shells are glazed too)'); assert(count('clear') >= 5 && count('pane') >= 20);
  // Build 25: the doors inside a house (on its partitions) and the doors of its stair heads have handles too.
  const inner = made.reduce((n, h) => n + h.storeys.reduce((m, s) => m + (s.doors || []).filter(d => (d.kind || 'door') === 'door' && d.door !== false).length, 0) + (h.stairs || []).filter(s => s.head).length, 0);
  const barred = windows.filter(o => o.bars).length; const shops = openings(made, o => o.kind === 'shop').length; assert.equal(count('bars'), barred * 6 + doors.length + inner + shops * 2, 'four bars and two rails a barred window, a handle a door (inside doors and roof doors too), two guides a rolling shutter');
  // A pane stands inside the wall's thickness, not on its face: for each pane a wall box holds it.
  for (const p of list.filter(b => b.surface === 'pane' || b.surface === 'clear')) { const thin = p.size.indexOf(Math.min(...p.size)); assert(p.size[thin] < .02); }
  const far = openings(B.beyond.houses.concat(B.houses.filter(h => h.plain)), o => o.kind === 'window'); assert(far.length >= 30); assert(B.beyond.houses.every(h => h.plain), 'houses beyond the walls are plain');
  for (const m of ['pane', 'clear']) assert(g.built.materials[m].roughness < .1 && g.built.materials[m].envMapIntensity > 1, `${m} glints`); assert(g.built.materials.clear.transparent && g.built.materials.clear.opacity < .5 && !g.built.materials.pane.transparent);
  report.openings = {windows: windows.length, doors: doors.length, insideDoors: inner, barred, beyondTheWalls: far.length};
});

await check('awnings', 'an awning is cloth: woven and striped in a colour the block already has, sagging between its rail and its pole, with a hem, and carried by posts that stand on the ground or by brackets from the wall', async () => {
  const awn = openings(B.houses, o => o.awning), made = g.built.stats.awnings, cloth = []; g.scene.traverse(o => { if (o.isMesh && String(o.material.userData.surface).startsWith('cloth')) cloth.push(o); });
  assert(awn.length >= 4); assert.equal(made.length, awn.length); assert.equal(cloth.length, new Set(awn.map(o => o.awning[0])).size, 'one drawing a colour');
  for (const o of cloth) { assert(o.material.map, 'woven'); assert.equal(o.material.side, THREE.DoubleSide); assert.equal(o.material.color.getHexString(), 'ffffff', 'its colour is in its weave'); }
  for (const m of made) { assert(m.slack > .06, `it sags (${m.slack})`); assert(m.points > 100, 'it can sag'); assert(m.hem, 'a hem'); }
  for (const o of awn) { assert(['posts', 'brackets'].includes(o.awning[2]), `${o.house}: carried`); assert(['#7c5a48', '#4f6672', '#a08343'].includes(o.awning[0]), 'a colour of the block'); }
  const arms = list.filter(b => b.surface === 'beams' && b.size.filter(v => Math.abs(v - .05) < 1e-9).length === 2); assert.equal(arms.length, awn.length * 2, 'two arms from the rail to the pole');
  const turned = list.filter(b => b.turned && b.surface === 'beams'); assert(turned.length >= awn.filter(o => o.awning[2] === 'brackets').length * 2 + awn.length * 2, 'brackets and arms');
  report.awnings = {count: awn.length, carried: awn.map(o => o.awning[2])};
});

await check('timber', 'timber is hewn, not stamped: along a wall no two gaps between beam ends are alike and their sizes differ; every balcony is propped from the wall below by braces under its beams; a lean-to has no post in front of a doorway', async () => {
  const ends = list.filter(b => !b.turned && b.surface === 'beams' && Math.min(...b.size) >= .119 && Math.min(...b.size) <= .181 && Math.max(...b.size) >= .25 && Math.max(...b.size) <= .49 && b.size.filter(v => v <= .181).length === 2);
  assert(ends.length > 150, `${ends.length} beam ends`); const rows = new Map(); for (const e of ends) { const long = e.size.indexOf(Math.max(...e.size)), run = long === 0 ? 2 : 0, k = `${long}:${e.at[long].toFixed(1)}:${e.at[1].toFixed(1)}`; if (!rows.has(k)) rows.set(k, []); rows.get(k).push({p: e.at[run], reach: e.size[long], fat: e.size[1]}); }
  let judged = 0; for (const r of rows.values()) { if (r.length < 5) continue; judged++; r.sort((a, b) => a.p - b.p); const gaps = r.slice(1).map((e, i) => +(e.p - r[i].p).toFixed(3)); assert(new Set(gaps).size >= gaps.length - 1, `gaps alike: ${gaps}`); assert(Math.max(...gaps) - Math.min(...gaps) > .12, `gaps too even: ${gaps}`); assert(Math.min(...gaps) > .55, `beam ends too close: ${gaps}`); assert(new Set(r.map(e => e.reach.toFixed(3))).size > r.length / 2, 'lengths differ'); assert(new Set(r.map(e => e.fat.toFixed(3))).size > r.length / 2, 'thicknesses differ'); }
  assert(judged >= 12, `${judged} rows judged`);
  const braces = list.filter(b => b.turned && b.surface === 'beams' && Math.abs(b.size[1] - .09) < 1e-9); assert(braces.length >= B.balconies.length * 3, `${braces.length} braces under ${B.balconies.length} balconies`);
  for (const v of B.balconies) assert(braces.filter(b => Math.abs(b.at[1] - (v.y - .24 - (v.depth ?? 1.15) / 2 + .125)) < .2 && b.at[v.axis === 'z' ? 2 : 0] > v.from && b.at[v.axis === 'z' ? 2 : 0] < v.to).length >= 2, `the balcony at ${v.at} is propped`);
  for (const l of B.leanTos) for (const h of B.houses) for (const s of h.storeys) for (const f of ['east', 'west']) for (const o of (s[f] || []).filter(o => o.kind === 'shop' || o.kind === 'door')) { if (l.fall[0] !== 'x' || l.z[0] > o.at || l.z[1] < o.at || Math.abs((f === 'east' ? h.x[1] : h.x[0]) - (l.fall === 'x+' ? l.x[0] : l.x[1])) > .3) continue; for (const t of l.posts || [.04, .5, .96]) { const z = l.z[0] + (l.z[1] - l.z[0]) * t; assert(Math.abs(z - o.at) > o.width / 2, `a post stands in the opening of ${h.id}`); } }
  report.timber = {beamEnds: ends.length, rows: judged, braces: braces.length};
});

await check('light', 'the sun in the sky stands where the light comes from: the brightest place of the sky\'s picture, turned as the map turns the sky, lies within five degrees of the direction of the light; shade is lit enough to be seen in; the props that were photographed grey-white are tinted to the block', async () => {
  const f = fs.readFileSync(new URL(`dist/assets/${DEHRUN.sky.asset}`, projectRoot)), head = f.indexOf('\n\n'), line = f.indexOf('\n', head + 2), [, H, , W] = f.subarray(head + 2, line).toString('latin1').split(' ').map(Number), d = f.subarray(line + 1);
  let pos = 0, best = [0, 0, 0]; for (let y = 0; y < H; y++) { assert(d[pos] === 2 && d[pos + 1] === 2); pos += 4; const ch = []; for (let c = 0; c < 4; c++) { const row = new Uint8Array(W); let n = 0; while (n < W) { let k = d[pos++]; if (k > 128) { row.fill(d[pos++], n, n + k - 128); n += k - 128; } else { row.set(d.subarray(pos, pos + k), n); pos += k; n += k; } } ch.push(row); }
    for (let x = 0; x < W; x++) if (ch[3][x]) { const v = (ch[0][x] + ch[1][x] + ch[2][x]) * 2 ** (ch[3][x] - 136); if (v > best[0]) best = [v, x, y]; } }
  const round = ((best[1] + .5) / W - .5) * 2 * Math.PI, up = (.5 - (best[2] + .5) / H) * Math.PI, sun = new THREE.Vector3(...DEHRUN.sun.at).sub(new THREE.Vector3(...(DEHRUN.sun.target || [0, 0, 0]))).normalize(), lightRound = Math.atan2(sun.z, sun.x), lightUp = Math.asin(sun.y);
  // Seen in the browser (Build 23): with the sky turned by t, its sun stands at its own angle + t - half a turn.
  const skyRound = round + DEHRUN.sky.turn - Math.PI, off = Math.abs(Math.atan2(Math.sin(skyRound - lightRound), Math.cos(skyRound - lightRound))) * 180 / Math.PI;
  assert(off < 5, `${off.toFixed(1)} degrees round from the light`); assert(Math.abs(up - lightUp) * 180 / Math.PI < 12, `${((lightUp - up) * 180 / Math.PI).toFixed(1)} degrees higher than in the picture`);
  assert(DEHRUN.sky.ambient >= 1.6 && DEHRUN.sky.ambient <= 2.2 && DEHRUN.sun.power <= 4);
  assert(B.tints.moon_rock_02); const src = fs.readFileSync(new URL('dist/terraces.js', projectRoot), 'utf8'); assert(src.includes('if (B.tints?.[kind]) m.color.multiply('));
  const game = SOURCE ? fs.readFileSync(SOURCE, 'utf8') : fs.readFileSync(new URL('dist/game.js', projectRoot), 'utf8'); assert(game.includes('if(WORLD.sky.turn!=null)scene.backgroundRotation.y=scene.environmentRotation.y=WORLD.sky.turn;'));
  const {KOHAR} = await import(new URL('dist/map-kohar.js', projectRoot)); assert(!('turn' in KOHAR.sky), 'Kohar Valley\'s sky is not turned');
  report.light = {skySunDegreesRound: +(round * 180 / Math.PI).toFixed(1), skySunDegreesUp: +(up * 180 / Math.PI).toFixed(1), lightDegreesUp: +(lightUp * 180 / Math.PI).toFixed(1), degreesApartRound: +off.toFixed(1), limit: 'which way the browser turns a sky was seen once in the desktop app\'s browser, not measured here'};
});

await check('beyond', 'the town goes on beyond the walls and the block keeps its shade and its ground: houses and field walls stand outside the block on the hill, none inside it or in the way; surfaces carry their own shade, darker towards the ground on what stands upright; the yards are trodden ground with paving along the house fronts', async () => {
  const E = DEHRUN.edges; for (const h of B.beyond.houses) { assert(h.x[1] < E.x[0] - 2 || h.x[0] > E.x[1] + 2 || h.z[1] < E.z[0] - 2 || h.z[0] > E.z[1] + 2, `${h.id} stands outside`); const ground = DEHRUN.terrain.surface((h.x[0] + h.x[1]) / 2, (h.z[0] + h.z[1]) / 2); assert(h.base <= ground + .06 && h.base > ground - 1.2, `${h.id} stands on the hill`); }
  assert(B.beyond.houses.length >= 10 && B.beyond.walls.length >= 40); for (const w of B.beyond.walls) assert(w.at < E.z[0] - 3 || w.at > E.z[1] + 3 || w.to < E.x[0] - 3 || w.from > E.x[1] + 3, 'a field wall outside');
  for (const p of [[0, 37], [0, 10], [0, -20], [-8, 8], [8, 10], [-8, 28]]) assert(!g.blocked(...p), `${p} is free`);
  // Shade in the surfaces: a tall wall is darker at its foot than at its top, and no two large faces are shaded alike.
  let walls = 0; const tops = new Set(); g.scene.updateMatrixWorld(true);
  const wall = new THREE.Mesh(new THREE.BufferGeometry()); void wall;
  const kit = g.built.materials; for (const s of ['plaster', 'ochre', 'masonry', 'drystone', 'cobble', 'trail']) assert.equal(kit[s].vertexColors, true, `${s} carries shade`);
  g.scene.traverse(o => { if (!o.isMesh || !o.geometry.attributes.color || o.isInstancedMesh || !['plaster', 'ochre', 'white', 'masonry', 'drystone', 'cobble', 'trail', 'slab', 'gravel'].includes(o.material.userData.surface)) return; const c = o.geometry.attributes.color, p = o.geometry.attributes.position, n = o.geometry.attributes.normal; let low = [], high = [];
    for (let i = 0; i < p.count; i += 7) { if (Math.abs(n.getY(i)) > .5) { tops.add(c.getX(i).toFixed(2)); continue; } const v = new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld), h = v.y - g.groundY(v.x, v.z); if (Math.abs(v.x) > 23 || v.z > 43 || v.z < -29) continue; if (h >= -.05 && h < .15) low.push(c.getX(i)); if (h > 1.6 && h < 3) high.push(c.getX(i)); }
    if (low.length > 20 && high.length > 20) { walls++; const m = a => a.reduce((s, v) => s + v, 0) / a.length; assert(m(low) < m(high) - .15, `${o.material.userData.surface}: foot ${m(low).toFixed(2)}, above ${m(high).toFixed(2)}`); } });
  assert(walls >= 3, `${walls} surfaces judged`); assert(tops.size >= 10, 'ground and roofs vary');
  assert(!B.grounds.some(x => x.surface === 'gravel'), 'no yard of plain sand'); assert(B.grounds.filter(x => x.surface === 'slab' && x.lift > .015).length >= 8, 'paving along the fronts');
  report.beyond = {houses: B.beyond.houses.length, fieldWallLengths: B.beyond.walls.length, surfacesShaded: walls};
});

console.log(JSON.stringify({...(ONLY ? {partial: ONLY} : {}), passed: results.length, checks: results, report, limitations: [
  'Headless: rendering is substituted. What is checked is what was built (boxes, their places, sizes and surfaces, the cloth, the colours in the geometry), not what is seen. Whether it looks built rather than generated is for the user.',
  'Flicker is checked for boxes that stand square; turned pieces (shutters, door leaves, braces, lean-to sheets) are not in that check.',
  'The direction a browser turns a sky by was seen once, in the desktop app\'s browser; Safari was not used in this build.']}, null, 2));
