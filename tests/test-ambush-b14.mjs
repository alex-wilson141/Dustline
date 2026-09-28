// Build 14 Ambush map and signposting rework: M opens one full-screen map made from the live state (areas, barricades with
// prices, crates with their rifles, the arena edge, the player's position and facing), its labels never overlap, leave the
// canvas or outgrow their boxes; every barricade and crate carries an in-world marking (paint, painted board, lantern lit
// while it can be bought); the Build 13 masts, HUD waypoint lines, area list and minimap are gone from Ambush; Story and
// Skirmish keep their M panel. Headless production code; the canvas is read through its calls.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame, projectRoot} from './sprint-harness.mjs';

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const {CLASSES} = await import(new URL('dist/combat.js', projectRoot));
const {AMBUSH, AREAS, GATES, STATIONS, MAP, mapLayout, mapLegend, textWidth, ambushState, inArena} = await import(new URL('dist/ambush.js', projectRoot));
const results = [], report = {};
async function check(name, fn) { await fn(); results.push(name); }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const marksIn = g => g.scene.children.filter(o => o.userData?.marking);
const near = (a, b, e = .01) => Math.abs(a - b) < e;

async function game(mode = 'ambush') {
  const g = await createGame(); g.prepare({clearLane: false});
  g.setMode(mode); g.reset(); g.play(); g.restoreAI(); g.set({hp: 1e9}); g.el('blood').checked = false;
  for (const a of g.actors) a.animate = a.visual.animate;
  let clock = 0; g.frame(0); g.run = (s, each) => { for (let i = 0, n = Math.round(s * 60); i < n; i++) { g.frame(clock += 1000 / 60); if (each?.(clock / 1000) === false) break; } };
  g.goTo = (x, z) => { g.player.set(x, g.groundY(x, z), z); };
  g.buyGate = id => { const gate = GATES.find(t => t.id === id), p = standPoints(g, gate.station, 2.8)[0]; g.amb.points = 1e6; g.goTo(...p); return g.ambush.interact(); };
  return g;
}
function standPoints(g, point, r) { const out = []; for (let dx = -r; dx <= r; dx += .5) for (let dz = -r; dz <= r; dz += .5) { const x = point[0] + dx, z = point[1] + dz; if (Math.hypot(dx, dz) < r && !g.blocked(x, z) && inArena(g.amb.open, x, z, .3)) out.push([x, z]); } return out; }
const STAGES = [['start', null], ['yard open', 'g12'], ['west lane open', 'g23'], ['all open', 'g24']];
const stateOf = g => ({gate: id => !g.amb.gates.has(id) ? 'open' : g.amb.open.has(GATES.find(t => t.id === id).from) ? 'purchasable' : 'locked', area: id => g.amb.open.has(id)});
// The map transform worked out here from the published map constants: north (-z) up, the arena centred.
const scale = Math.min((MAP.w - 2 * MAP.pad) / (MAP.bounds.x[1] - MAP.bounds.x[0]), (MAP.h - 2 * MAP.pad) / (MAP.bounds.z[1] - MAP.bounds.z[0]));
const X = x => (MAP.w - scale * (MAP.bounds.x[1] - MAP.bounds.x[0])) / 2 + (x - MAP.bounds.x[0]) * scale, Y = z => (MAP.h - scale * (MAP.bounds.z[1] - MAP.bounds.z[0])) / 2 + (z - MAP.bounds.z[0]) * scale;
// What the canvas was asked to draw.
function spy(g) { const ctx = g.el('bigmap').getContext('2d'), calls = {text: [], lines: [], rects: [], moves: []}; let pen = null, stroke = null, fill = null, font = null;
  Object.defineProperty(ctx, 'strokeStyle', {set(v) { stroke = v; }, get: () => stroke, configurable: true}); Object.defineProperty(ctx, 'fillStyle', {set(v) { fill = v; }, get: () => fill, configurable: true}); Object.defineProperty(ctx, 'font', {set(v) { font = v; }, get: () => font, configurable: true});
  ctx.fillText = (t, x, y, max) => calls.text.push({t, x, y, max, fill, font}); ctx.moveTo = (x, y) => { pen = [x, y]; calls.moves.push([x, y]); }; ctx.lineTo = (x, y) => { calls.lines.push({from: pen, to: [x, y], stroke}); pen = [x, y]; }; ctx.fillRect = (x, y, w, h) => calls.rects.push({x, y, w, h, fill});
  return calls; }

await check('the full-screen map shows the real arena at every stage of a run: each area where it is and open or closed as it really is, each standing barricade from end to end with its price (amber if it can be bought, grey if locked) and none once bought, each crate where it stands with the rifle it sells and its price, the arena edge, north up; the legend says the same', async () => {
  const g = await game(); assert.deepEqual([MAP.w, MAP.h], [1000, 1600]); assert(scale > 15, `${scale.toFixed(1)} px per metre`);
  for (const a of AREAS) assert(a.x[0] >= MAP.bounds.x[0] && a.x[1] <= MAP.bounds.x[1] && a.z[0] >= MAP.bounds.z[0] && a.z[1] <= MAP.bounds.z[1], `${a.name} lies inside the map`);
  for (const [stage, buy] of STAGES) { if (buy) assert(g.buyGate(buy)); const st = stateOf(g), L = g.ambush.mapLayout(), calls = spy(g); g.ambush.drawBigMap();
    assert(near(L.scale, scale)); assert.deepEqual(L.areas.map(a => [a.id, a.open]), AREAS.map(a => [a.id, st.area(a.id)]), `${stage}: open areas`);
    for (const a of AREAS) { const r = L.areas.find(x => x.id === a.id).rect; assert(near(r.x, X(a.x[0])) && near(r.y, Y(a.z[0])) && near(r.w, (a.x[1] - a.x[0]) * scale) && near(r.h, (a.z[1] - a.z[0]) * scale)); const drawn = calls.rects.find(q => near(q.x, r.x) && near(q.y, r.y) && near(q.w, r.w) && near(q.h, r.h)); assert(drawn, `${a.name} drawn`); assert.equal(drawn.fill, st.area(a.id) ? '#3d4a3f' : '#1b2022', `${stage}: ${a.name} shown ${st.area(a.id) ? 'open' : 'closed'}`);
      const name = L.labels.find(l => l.kind === 'area' && l.id === a.id), state = L.labels.find(l => l.kind === 'state' && l.id === a.id); assert.equal(name.text, a.name.toUpperCase()); assert.equal(state.text, st.area(a.id) ? 'OPEN' : 'CLOSED'); assert(name.x >= r.x && name.x + name.w <= r.x + r.w && name.y >= r.y && state.y + state.h <= r.y + r.h, `${a.name}: name inside its area`); }
    for (const t of GATES) { const s = st.gate(t.id), m = L.gates.find(x => x.id === t.id), label = L.labels.find(l => l.kind === 'gate' && l.id === t.id), line = calls.lines.find(l => l.from && near(l.from[0], X(t.a[0])) && near(l.from[1], Y(t.a[1])) && near(l.to[0], X(t.b[0])) && near(l.to[1], Y(t.b[1])) && l.stroke !== '#f2b705');
      if (s === 'open') { assert(!m && !label && !line, `${stage}: bought barricade ${t.id} is off the map`); continue; }
      assert(m && line, `${stage}: ${t.id} drawn end to end`); assert.equal(m.state, s); assert.equal(line.stroke, s === 'purchasable' ? '#ff9d2e' : '#8d8a80'); assert(near(m.at[0], X(t.station[0])) && near(m.at[1], Y(t.station[1])));
      assert.equal(label.text, `${t.price} PTS`); assert(Math.hypot(label.x + label.w / 2 - m.at[0], label.y + label.h / 2 - m.at[1]) < 200, `${t.id}: price beside its purchase point`); }
    for (const c of STATIONS) { const m = L.crates.find(x => x.weapon === c.weapon), label = L.labels.find(l => l.kind === 'crate' && l.id === c.weapon); assert(near(m.at[0], X(c.at[0])) && near(m.at[1], Y(c.at[1]))); assert.equal(m.open, st.area(c.area));
      assert.equal(label.text, `${CLASSES[c.weapon].weapon} · ${c.price}`, 'the rifle this crate sells and its price'); assert(Math.hypot(label.x + label.w / 2 - m.at[0], label.y + label.h / 2 - m.at[1]) < 320, `${c.weapon}: label beside its crate`);
      const sq = calls.rects.find(q => near(q.x, m.at[0] - 9) && near(q.y, m.at[1] - 9) && q.w === 18); assert(sq, `crate ${c.weapon} drawn`); assert.equal(sq.fill, st.area(c.area) ? '#38c172' : '#8d8a80'); }
    assert.equal(L.edge.length, g.amb.segs.length); assert(L.edge.length > 0); g.amb.segs.forEach(([ax, az, bx, bz], i) => { assert(near(L.edge[i][0], X(ax)) && near(L.edge[i][1], Y(az)) && near(L.edge[i][2], X(bx)) && near(L.edge[i][3], Y(bz))); assert(calls.lines.some(l => l.stroke === '#f2b705' && l.from && near(l.from[0], X(ax)) && near(l.from[1], Y(az)) && near(l.to[0], X(bx)) && near(l.to[1], Y(bz))), 'arena edge drawn'); });
    for (const l of L.labels) { const t = calls.text.find(c => c.t === l.text && near(c.x, l.x) && near(c.y, l.y + 2)); assert(t, `label "${l.text}" drawn where the layout put it`); assert.equal(t.max, l.w, 'limited to its box'); assert.equal(t.font, `bold ${l.size}px Arial`); }
    assert.equal(calls.text.length, L.labels.length, 'nothing else is written on the map');
    const legend = g.el('maplegend').textContent.split('\n'), rows = AREAS.flatMap(a => { const t = GATES.find(x => x.opens === a.id), name = a.name.toUpperCase(); return st.area(a.id) ? [`${name} · OPEN`] : st.gate(t.id) === 'purchasable' ? [`${name} · CLOSED · ${t.price} PTS`] : [`${name} · CLOSED · ${t.price} PTS`, `   BOUGHT FROM THE ${AREAS.find(x => x.id === t.from).name.toUpperCase()}`]; });
    assert.deepEqual(mapLegend(ambushState(g.amb.open, g.amb.gates)), rows); assert.deepEqual(legend.slice(4, 4 + rows.length), rows, `${stage}: legend`); assert.equal(legend[4 + rows.length], ''); assert(legend.every(l => l.length <= 46), 'short lines');
    if (stage === 'start') report.legend = legend; }
  // North is up: the area the compass calls north is at the top of the map, the courtyard (south) at the bottom.
  const L = g.ambush.mapLayout(), top = L.areas.find(a => a.id === 4), bottom = L.areas.find(a => a.id === 1); assert(top.rect.y < bottom.rect.y); assert.equal(AREAS[3].name, 'North houses'); assert(AREAS[3].z[1] < AREAS[0].z[0], 'lower z is north on the HUD compass');
});

await check('map labels are readable at the size the map is shown: no two labels overlap, none covers a marker or a barricade line, none leaves the canvas, every box is at least as wide as its text in bold Arial and the text is limited to the box, and the smallest lettering is 11 px or more on an 820 px high screen (the Safari window measured in B11)', async () => {
  const g = await game(), arial = (text, size) => [...text].reduce((w, ch) => w + (ch === ' ' ? .278 : ch === '·' ? .333 : /[0-9]/.test(ch) ? .556 : /[IJ]/.test(ch) ? .45 : /[MW]/.test(ch) ? .89 : .72), 0) * size; // Arial Bold advance widths, capitals
  const over = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; let checked = 0, smallest = 1e9; const shownAt900 = MAP.shown * 820 / MAP.h;
  for (const [stage, buy] of STAGES) { if (buy) assert(g.buyGate(buy)); const L = g.ambush.mapLayout();
    const markers = [...L.gates.map(m => ({x: m.at[0] - 9, y: m.at[1] - 9, w: 18, h: 18, id: m.id})), ...L.crates.map(m => ({x: m.at[0] - 9, y: m.at[1] - 9, w: 18, h: 18, id: m.weapon})), ...L.gates.map(m => ({x: Math.min(m.line[0], m.line[2]) - 4, y: Math.min(m.line[1], m.line[3]) - 4, w: Math.abs(m.line[2] - m.line[0]) + 8, h: Math.abs(m.line[3] - m.line[1]) + 8, id: m.id}))];
    for (const [i, l] of L.labels.entries()) { checked++; assert(!l.unplaced, `${stage}: "${l.text}" found a place`); assert(l.x >= 0 && l.y >= 0 && l.x + l.w <= MAP.w && l.y + l.h <= MAP.h, `${stage}: "${l.text}" inside the canvas`);
      assert(l.w >= arial(l.text, l.size), `${stage}: "${l.text}" box ${l.w} px holds its text (${arial(l.text, l.size).toFixed(0)} px)`); assert(l.w === textWidth(l.text, l.size) && l.h >= l.size); smallest = Math.min(smallest, l.size);
      for (const m of L.labels.slice(i + 1)) assert(!over(l, m), `${stage}: "${l.text}" overlaps "${m.text}"`); for (const m of markers) assert(!over(l, m), `${stage}: "${l.text}" covers a marker or barricade line`); } }
  assert(checked >= 50); assert(smallest * shownAt900 >= 11, `smallest lettering ${(smallest * shownAt900).toFixed(1)} px on an 820 px screen`);
  const css = fs.readFileSync(new URL('dist/style.css', projectRoot), 'utf8'), html = fs.readFileSync(new URL('dist/index.html', projectRoot), 'utf8'); assert(/#bigmap\{height:86vh;width:auto/.test(css) && MAP.shown === .86, 'shown at 86 % of the screen height'); assert(/<canvas id="bigmap" width="1000" height="1600">/.test(html)); assert(/#fullmap\[hidden\]\{display:none\}/.test(css));
  // Crates in the corners of the map (a made-up state): their labels still land inside the canvas, apart from each other.
  const corner = ambushState(new Set([1, 2, 3, 4]), new Set()); corner.crates[0].at = [MAP.bounds.x[1] - 1, MAP.bounds.z[0] + 1]; corner.crates[1].at = [MAP.bounds.x[0] + 1, MAP.bounds.z[1] - 1]; corner.crates[2].at = [MAP.bounds.x[1] - 1, MAP.bounds.z[1] - 1]; corner.crates[3].at = [MAP.bounds.x[0] + 1, MAP.bounds.z[0] + 1];
  const E = mapLayout(corner, [], {x: -30, z: 0, yaw: 0}, id => CLASSES[id].weapon); for (const [i, l] of E.labels.entries()) { assert(!l.unplaced && l.x >= 8 && l.y >= 8 && l.x + l.w <= MAP.w - 8 && l.y + l.h <= MAP.h - 8, `corner case: "${l.text}" inside the canvas`); for (const m of E.labels.slice(i + 1)) assert(!over(l, m), `corner case: "${l.text}" overlaps "${m.text}"`); }
  // The layout is a pure function of the state: the same state gives the same labels wherever the player stands.
  const a = g.ambush.mapLayout(); g.goTo(-45, -40); g.set({yaw: 2}); const b = g.ambush.mapLayout(); assert.deepEqual(a.labels, b.labels);
  report.labels = {checked, smallestOn820pxScreen_px: +(smallest * shownAt900).toFixed(1), mapOn820pxScreen: `${Math.round(MAP.w * shownAt900)} × ${Math.round(MAP.h * shownAt900)} px`};
});

await check('your position and facing on the map are the real ones: the arrow stands where you stand and points where the camera looks, for every position and facing tried, and moves as you move', async () => {
  const g = await game(); for (const id of ['g12', 'g23', 'g24']) assert(g.buyGate(id)); let n = 0;
  for (const [x, z] of [[-30, 20], [-21, 5], [-38, -20], [-55, -3], [-50, -50], [-14, -30], [-26, -11]]) for (const yaw of [0, .6, Math.PI / 2, 2.2, Math.PI, -2, -Math.PI / 2, -.4]) { g.goTo(x, z); g.set({yaw, pitch: 0}); g.run(.05); n++;
    const L = g.ambush.mapLayout(), p = L.player; assert(near(p.at[0], X(g.player.x), 1e-6) && near(p.at[1], Y(g.player.z), 1e-6), `position at ${x},${z}`);
    const f = g.camera.getWorldDirection(V(0, 0, 0)), len = Math.hypot(f.x, f.z); assert(near(p.dir[0], f.x / len, 1e-6) && near(p.dir[1], f.z / len, 1e-6), `facing ${yaw} at ${x},${z}: map ${p.dir.map(v => v.toFixed(3))}, camera ${(f.x / len).toFixed(3)},${(f.z / len).toFixed(3)}`);
    assert(near(p.tip[0], p.at[0] + p.dir[0] * MAP.arrow, 1e-6) && near(p.tip[1], p.at[1] + p.dir[1] * MAP.arrow, 1e-6)); assert(MAP.arrow >= 40); const calls = spy(g); g.ambush.drawBigMap(); assert(calls.moves.some(m => near(m[0], p.tip[0]) && near(m[1], p.tip[1])), 'the arrow is drawn from its tip'); }
  g.goTo(-30, 20); g.set({yaw: 0}); const a = g.ambush.mapLayout().player; g.goTo(-30, 10); const b = g.ambush.mapLayout().player; assert(near(b.at[1] - a.at[1], -10 * scale, 1e-6) && near(b.at[0], a.at[0]), '10 m north is 10 m up the map'); assert(near(a.dir[0], 0) && near(a.dir[1], -1), 'facing north points up');
  g.goTo(-20, 20); assert(near(g.ambush.mapLayout().player.at[0] - a.at[0], 10 * scale, 1e-6), '10 m east is 10 m to the right'); report.player = {positionsAndFacings: n};
});

await check('in-world markings follow the live state: every standing barricade carries amber paint, a painted board with its price and a lantern on its purchase section, lit only while it can be bought; every crate carries green paint, a board naming its rifle and a lantern, lit once its area is open; a bought barricade loses its marking; the lantern is in sight from where you stand to buy; nothing is taller than a lantern post and no mast remains', async () => {
  const g = await game(), seen = new Set(), texts = []; const ctx = g.el('bigmap').getContext('2d');
  for (const [stage, buy] of STAGES) { if (buy) assert(g.buyGate(buy)); const st = stateOf(g), marks = g.ambush.marks();
    const want = [...GATES.filter(t => st.gate(t.id) !== 'open').map(t => 'gate:' + t.id), ...STATIONS.map(s => 'crate:' + s.weapon)].sort(); assert.deepEqual([...marks.keys()].sort(), want, `${stage}: markings`); assert.equal(marksIn(g).length, want.length, 'exactly these are in the scene');
    for (const [key, b] of marks) { seen.add(key); const [kind, id] = key.split(':'), gate = GATES.find(t => t.id === id), crate = STATIONS.find(s => s.weapon === id), at = kind === 'gate' ? gate.station : crate.at, u = b.userData;
      assert(g.scene.children.includes(b)); assert.deepEqual([u.kind, u.id, u.at], [kind, id, at]); const lit = kind === 'gate' ? st.gate(id) === 'purchasable' : st.area(crate.area); assert.equal(u.lit, lit, `${stage}: ${key} lantern ${lit ? 'lit' : 'unlit'}`);
      const glass = b.children.find(m => m.userData.lantern), boards = b.children.filter(m => m.userData.board); assert(glass && boards.length === 2, 'a lantern and a two-sided board'); assert.equal(glass.material.isMeshBasicMaterial === true, lit, 'lit glass glows (unlit material), unlit glass is dark'); if (lit) assert.equal(glass.material.color.getHexString(), 'ffd27a');
      const label = kind === 'gate' ? String(gate.price) : CLASSES[id].weapon.replace(/^MK4 /, ''); assert.equal(u.label, label); for (const f of boards) assert.equal(f.material.userData.text, label, `${key}: the board is painted "${label}"`);
      const paint = b.children.find(m => m.material.isMeshBasicMaterial && !m.userData.lantern && !m.userData.board); assert(paint, 'a band of paint'); assert.equal(paint.material.color.getHexString(), kind === 'gate' ? 'f2b705' : '38c172', 'amber on barricades, green on crates');
      const box = new THREE.Box3().setFromObject(b), ground = g.groundY(at[0], at[1]); assert(box.max.y - ground <= 3, `${key} is ${(box.max.y - ground).toFixed(2)} m tall: no mast`); assert(Math.hypot((box.min.x + box.max.x) / 2 - at[0], (box.min.z + box.max.z) / 2 - at[1]) < 1.2, 'at its purchase point'); assert(!g.occluders.includes(b) && b.children.every(m => !g.occluders.includes(m)), 'no occlusion');
      if (lit) { const stands = standPoints(g, at, kind === 'gate' ? 2.8 : 2.2), lamp = V(...u.lantern), n = stands.filter(([x, z]) => g.visible(V(x, g.groundY(x, z) + 1.7, z), lamp)).length; assert(stands.length > 0 && n / stands.length >= .9, `${key}: lantern in sight from ${n}/${stands.length} places you can buy from`); } } }
  assert.deepEqual([...seen].sort(), [...GATES.map(t => 'gate:' + t.id), ...STATIONS.map(s => 'crate:' + s.weapon)].sort(), 'every barricade and every crate had its marking');
  assert.equal(g.scene.children.filter(o => o.userData?.beacon).length, 0, 'no mast'); const src = fs.readFileSync(new URL('dist/ambush.js', projectRoot), 'utf8') + fs.readFileSync(new URL('dist/game.js', projectRoot), 'utf8'); assert(!/buildBeacon|beaconHeight|ambushBeacons/.test(src));
  g.reset(); g.play(); assert.deepEqual([...g.ambush.marks().keys()].sort(), ['crate:assault', 'crate:marksman', 'crate:medic', 'crate:support', 'gate:g12', 'gate:g23', 'gate:g24']); assert.deepEqual([...g.ambush.marks().values()].filter(b => b.userData.lit).map(b => b.userData.kind + ':' + b.userData.id).sort(), ['crate:medic', 'gate:g12'], 'a new run: only the first barricade and the courtyard crate are lit');
  for (const mode of ['story', 'skirmish']) { g.setMode(mode); g.reset(); assert.equal(marksIn(g).length, 0, `${mode}: no markings`); assert.equal(g.ambush.marks().size, 0); }
  report.markings = {barricade: 'amber paint on the top rail, painted price board, lantern on the middle post', crate: 'green paint band, painted rifle board, lantern on a post beside it', tallest_m: 2.72};
});

await check('one signpost instead of four: the play HUD has no waypoint lines and no area list, M in Ambush opens and closes the full map and never the small map panel, the map closes on restart, leaving and at the end of a run, the HUD names the map key, the radio points to the map once per barricade when you can first afford it; Story and Skirmish keep their M panel and never see the full map', async () => {
  const html = fs.readFileSync(new URL('dist/index.html', projectRoot), 'utf8'), src = fs.readFileSync(new URL('dist/game.js', projectRoot), 'utf8') + fs.readFileSync(new URL('dist/ambush.js', projectRoot), 'utf8');
  assert(!/id="waypoints"|id="way-gate"|id="way-crate"|id="areas"/.test(html)); assert(!/way-gate|way-crate|ambushAreaList|waypoints\(|arrowFor|ambushMap\(/.test(src)); assert(/<section id="fullmap" hidden><canvas id="bigmap"/.test(html));
  const g = await game(), K = g.ambush.keys, body = g.doc.body.classList; assert.equal(K.map, 'KeyM'); assert.equal(g.el('map-hint').textContent, 'M · Map'); assert.match(g.el('radiotext').textContent, /M opens the map\.$/);
  assert.equal(g.ambush.mapOpen(), false); assert.equal(g.el('fullmap').hidden, true);
  g.press(K.map); assert.equal(g.ambush.mapOpen(), true); assert.equal(g.el('fullmap').hidden, false); assert(body.contains('fullmap') && !body.contains('tactical'), 'the full map, not the small panel'); assert.match(g.el('maplegend').textContent, /M CLOSE MAP$/);
  const calls = spy(g); g.goTo(-25, 15); g.run(.3); assert(calls.text.length > 0, 'the open map is redrawn while you play'); const p = g.ambush.mapLayout().player; assert(calls.moves.some(m => near(m[0], p.tip[0]) && near(m[1], p.tip[1])), 'with your current position');
  g.press(K.map); assert.equal(g.ambush.mapOpen(), false); assert.equal(g.el('fullmap').hidden, true); assert(!body.contains('fullmap'));
  g.press(K.map); g.reset(); assert.equal(g.ambush.mapOpen(), false, 'closed by a restart'); assert.equal(g.el('fullmap').hidden, true, 'and taken off the screen'); assert(!body.contains('fullmap')); g.play(); g.press(K.map); assert(g.ambush.mapOpen()); g.ambush.finish(false, undefined, 'self'); assert.equal(g.ambush.mapOpen(), false, 'closed at the end of the run'); assert.equal(g.el('fullmap').hidden, true);
  g.reset(); g.play(); g.press(K.map); g.goMenu(); assert.equal(g.ambush.mapOpen(), false, 'closed by leaving'); assert.equal(g.el('fullmap').hidden, true); assert(!body.contains('fullmap'));
  // The radio nudge: once per barricade, only when it can be bought and afforded, only between waves.
  const h = await game(), A = h.amb; A.phase = 'break'; A.timer = 8; A.points = 749; h.el('radiotext').textContent = ''; h.run(.2); assert.equal(h.el('radiotext').textContent, ''); A.points = 750; h.run(.2); assert.equal(h.el('radiotext').textContent, 'Command: you can afford the barricade to the Field office yard (750). M opens the map.');
  h.el('radiotext').textContent = ''; h.run(.5); assert.equal(h.el('radiotext').textContent, '', 'said once'); A.points = 5000; h.run(.2); assert.equal(h.el('radiotext').textContent, '', 'locked barricades are not announced'); assert(h.buyGate('g12')); A.phase = 'break'; A.timer = 8; A.points = 1000; h.run(.2); assert.match(h.el('radiotext').textContent, /barricade to the West lane \(1000\)/);
  // Story and Skirmish: M is the old panel; the full map never opens; nothing of Ambush is on screen.
  for (const mode of ['story', 'skirmish']) { const s = await game(mode), b = s.doc.body.classList; assert.equal(s.el('map-hint').textContent, 'M · Map & squad'); s.press('KeyM'); assert(b.contains('tactical') && !b.contains('fullmap')); assert.equal(s.ambush.mapOpen(), false); assert.equal(s.el('fullmap').hidden, true); s.press('KeyM'); assert(!b.contains('tactical')); s.ambush.toggleMap(true); assert.equal(s.ambush.mapOpen(), false, 'the full map cannot be opened outside Ambush'); }
  // Coming from Story with the small panel open, Ambush starts without it.
  const t = await game('story'); t.press('KeyM'); assert(t.doc.body.classList.contains('tactical')); t.setMode('ambush'); t.reset(); assert(!t.doc.body.classList.contains('tactical'), 'the minimap is cut from Ambush');
  report.signposts = {kept: ['full-screen map (M)', 'in-world markings', 'one radio line per barricade when first affordable'], removed: ['signal masts', 'HUD waypoint lines', 'HUD area list', 'minimap in Ambush']};
});

console.log(JSON.stringify({passed: results.length, checks: results, report, limitations: [
  'Headless: the map is checked through its layout and canvas calls, not rendered pixels; real text widths are measured in Safari in the frame-time run (B11).',
  'Whether the markings read as part of the village and whether a new player finds every barricade needs the playtest.']}, null, 2));
