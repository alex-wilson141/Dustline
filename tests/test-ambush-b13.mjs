// Build 13 Ambush navigation: every barricade that can be bought and every crate in an open area carries a signal mast made
// from the live state, the HUD points at the nearest barricade that can be bought and the nearest crate with direction and
// distance, the M map and the area list show barricades, prices and closed areas from the same state, all four rifles can
// be bought across the four areas and every purchase point can be walked to. Story and Skirmish replay the Build 09 trace.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame, projectRoot} from './sprint-harness.mjs';

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const {CLASSES} = await import(new URL('dist/combat.js', projectRoot));
const {AMBUSH, AREAS, GATES, STATIONS, ARROWS, ambushState, waypoints, inArena} = await import(new URL('dist/ambush.js', projectRoot));
const FIXTURE = new URL('fixtures/story-skirmish-ai-b09.json', import.meta.url);
const results = [], report = {};
async function check(name, fn) { await fn(); results.push(name); }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const enemies = g => g.actors.filter(a => a.team === 'enemy');
const squad = g => g.actors.filter(a => a.team === 'ally' && !a.remote);
const beaconsIn = g => g.scene.children.filter(o => o.userData?.beacon);

async function game(mode = 'ambush') {
  const g = await createGame(); g.prepare({clearLane: false});
  g.setMode(mode); g.reset(); g.play(); g.restoreAI(); g.set({hp: 1e9}); g.el('blood').checked = false;
  for (const a of g.actors) a.animate = a.visual.animate;
  let clock = 0; g.frame(0); g.run = (s, each) => { for (let i = 0, n = Math.round(s * 60); i < n; i++) { g.frame(clock += 1000 / 60); if (each?.(clock / 1000) === false) break; } };
  g.goTo = (x, z) => { g.player.set(x, g.groundY(x, z), z); };
  g.buyGate = id => { const gate = GATES.find(t => t.id === id), p = standPoints(g, gate.station, 2.8, g.amb.open)[0]; g.amb.points = 1e6; g.goTo(...p); return g.ambush.interact(); };
  return g;
}
// Places inside the open arena within r of a purchase point where the player can stand.
function standPoints(g, point, r, open) { const out = []; for (let dx = -r; dx <= r; dx += .5) for (let dz = -r; dz <= r; dz += .5) { const x = point[0] + dx, z = point[1] + dz; if (Math.hypot(dx, dz) < r && !g.blocked(x, z) && inArena(open, x, z, .3)) out.push([x, z]); } return out; }
const standing = (g, open) => { const pts = []; for (const a of AREAS) if (open.has(a.id)) for (let x = a.x[0] + 1; x < a.x[1]; x += 2) for (let z = a.z[0] + 1; z < a.z[1]; z += 2) if (!g.blocked(x, z)) pts.push([x, z]); return pts; };
const STAGES = [['start', null], ['yard open', 'g12'], ['west lane open', 'g23'], ['all open', 'g24']];
// What the state must be, worked out here from the data and the arena, not from the game's own state function.
const expectState = g => ({gates: GATES.map(t => ({id: t.id, state: !g.amb.gates.has(t.id) ? 'open' : g.amb.open.has(t.from) ? 'purchasable' : 'locked'})), openAreas: AREAS.filter(a => g.amb.open.has(a.id)).map(a => a.id)});

await check('signal masts follow the live state: one at every barricade that can be bought now and one at every crate in an open area, at the purchase point, 12 m tall with unlit panels, seen from most of the opened areas; a bought barricade loses its mast, newly purchasable barricades and newly opened crates gain one; nothing is left outside Ambush', async () => {
  const g = await game(); const seen = new Set(), coverage = {};
  for (const [stage, buy] of STAGES) { if (buy) assert(g.buyGate(buy), `bought ${buy}`); const e = expectState(g);
    const want = [...e.gates.filter(t => t.state === 'purchasable').map(t => 'gate:' + t.id), ...STATIONS.filter(s => g.amb.open.has(s.area)).map(s => 'crate:' + s.weapon)].sort();
    assert.deepEqual([...g.ambush.beacons().keys()].sort(), want, `${stage}: masts`); assert.equal(beaconsIn(g).length, want.length, `${stage}: exactly these are in the scene`);
    for (const [key, b] of g.ambush.beacons()) { seen.add(key); assert(g.scene.children.includes(b)); const [kind, id] = key.split(':'), at = kind === 'gate' ? GATES.find(t => t.id === id).station : STATIONS.find(s => s.weapon === id).at;
      assert.equal(b.userData.kind, kind); assert.equal(b.userData.id, id); assert(Math.hypot(b.userData.at[0] - at[0], b.userData.at[1] - at[1]) <= .5, `${key} stands at its purchase point`);
      const box = new THREE.Box3().setFromObject(b), ground = g.groundY(at[0], at[1]); assert(box.max.y - ground >= AMBUSH.beaconHeight - .1 && AMBUSH.beaconHeight >= 12, `${key} is ${(box.max.y - ground).toFixed(1)} m tall`); assert(box.min.y - ground < .2, 'from the ground');
      const panels = b.children.filter(m => m.material.isMeshBasicMaterial); assert(panels.length >= 1 && b.children.every(m => m.visible), 'unlit panels'); assert.equal(panels[0].material.color.getHexString(), kind === 'gate' ? 'f2b705' : '38c172', 'amber for barricades, green for crates');
      assert(!g.solids.some(s => s.beacon) && !g.occluders.includes(b), 'no collision, no occlusion');
      const pts = standing(g, g.amb.open), top = V(...b.userData.top), n = pts.filter(([x, z]) => g.visible(V(x, g.groundY(x, z) + 1.7, z), top)).length; coverage[`${stage} · ${key}`] = +(n / pts.length).toFixed(2); assert(n / pts.length >= .6, `${key} seen from ${n}/${pts.length} standing points (${stage})`); } }
  assert.deepEqual([...seen].sort(), [...GATES.map(t => 'gate:' + t.id), ...STATIONS.map(s => 'crate:' + s.weapon)].sort(), 'every barricade and every crate had its mast');
  g.reset(); g.play(); assert.deepEqual([...g.ambush.beacons().keys()].sort(), ['crate:medic', 'gate:g12'], 'a new run starts again with the first two'); assert.equal(beaconsIn(g).length, 2);
  for (const mode of ['story', 'skirmish']) { g.setMode(mode); g.reset(); assert.equal(beaconsIn(g).length, 0, `${mode}: no masts`); assert.equal(g.ambush.beacons().size, 0); assert.equal(g.el('waypoints').hidden, true); assert.equal(g.el('areas').textContent, ''); }
  report.mastCoverage = coverage;
});

await check('the HUD waypoint lines: from every standing point of the opened areas and five facings they name the nearest barricade that can be bought now with its area, price, distance and the arrow a player facing that way needs; likewise the nearest open crate; "ALL AREAS OPEN" when nothing is left', async () => {
  const g = await game(), yaws = [0, Math.PI / 2, Math.PI, -Math.PI / 2, .7]; let samples = 0; const targets = new Set(), arrows = new Set();
  const heading = yaw => (((-yaw * 180 / Math.PI) % 360) + 360) % 360, bearing = (dx, dz) => (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360, arrow = (b, h) => ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'][Math.round((((b - h) % 360) + 360) % 360 / 45) % 8];
  for (const [stage, buy] of STAGES) { if (buy) assert(g.buyGate(buy)); const open = g.amb.open, can = GATES.filter(t => g.amb.gates.has(t.id) && open.has(t.from)), crates = STATIONS.filter(s => open.has(s.area));
    for (const [x, z] of standing(g, open)) for (const yaw of yaws) { g.goTo(x, z); g.set({yaw}); g.ambush.hud(); samples++; assert.equal(g.el('waypoints').hidden, false);
      const gt = g.el('way-gate').textContent, ct = g.el('way-crate').textContent;
      if (!can.length) assert.equal(gt, 'ALL AREAS OPEN'); else { const near = can.map(t => [Math.hypot(t.station[0] - x, t.station[1] - z), t]).sort((u, v) => u[0] - v[0])[0], [d, t] = near, name = AREAS.find(a => a.id === t.opens).name.toUpperCase();
        assert.equal(gt, `BARRICADE ${arrow(bearing(t.station[0] - x, t.station[1] - z), heading(yaw))} ${Math.round(d)} M · ${name} · ${t.price} PTS`, `${stage} at ${x},${z} facing ${yaw}`); targets.add(`${stage}:${t.id}`); arrows.add(gt.split(' ')[1]); }
      const nc = crates.map(s => [Math.hypot(s.at[0] - x, s.at[1] - z), s]).sort((u, v) => u[0] - v[0])[0]; assert.equal(ct, `CRATE ${arrow(bearing(nc[1].at[0] - x, nc[1].at[1] - z), heading(yaw))} ${Math.round(nc[0])} M · ${CLASSES[nc[1].weapon].weapon}`); targets.add(`crate:${nc[1].weapon}`); } }
  assert(samples > 3000, `${samples} positions and facings`); assert.deepEqual([...arrows].sort(), [...ARROWS].sort(), 'all eight arrows occurred');
  for (const k of ['start:g12', 'yard open:g23', 'yard open:g24', 'west lane open:g24', 'crate:medic', 'crate:assault', 'crate:marksman', 'crate:support']) assert(targets.has(k), `${k} was the nearest somewhere`);
  // Plain cases a player can check by eye: facing the barricade it is straight ahead; turned a quarter left it is to the right.
  const h = await game(), [sx, sz] = GATES[0].station; h.goTo(sx, sz + 10); h.set({yaw: 0}); h.ambush.hud(); assert.match(h.el('way-gate').textContent, /^BARRICADE ↑ 10 M · FIELD OFFICE YARD · 750 PTS$/);
  h.set({yaw: Math.PI / 2}); h.ambush.hud(); assert.match(h.el('way-gate').textContent, /^BARRICADE → 10 M/, 'facing west, a target to the north is on the right'); h.set({yaw: Math.PI}); h.ambush.hud(); assert.match(h.el('way-gate').textContent, /^BARRICADE ↓ 10 M/);
  h.run(.3); assert.match(h.el('way-gate').textContent, /^BARRICADE /, 'kept up to date by the running HUD');
  report.waypoints = {samples, example: g.el('way-crate').textContent};
});

await check('the M map and the area list come from the same state: standing barricades are drawn where they are with their price (amber when they can be bought, grey when locked), bought ones disappear, closed areas are shaded and named, crates are marked; the state matches the barricade data, prices and what is really open', async () => {
  const g = await game(), scale = .85, ctx = g.el('map').getContext('2d');
  for (const [stage, buy] of STAGES) { if (buy) assert(g.buyGate(buy)); g.goTo(-30, -5); const e = expectState(g), s = g.ambush.now();
    assert.deepEqual(s.gates.map(t => ({id: t.id, state: t.state})), e.gates, `${stage}: barricade states`); assert.deepEqual(s.areas.filter(a => a.open).map(a => a.id), e.openAreas);
    for (const t of s.gates) { const d = GATES.find(x => x.id === t.id); assert.deepEqual([t.a, t.b, t.station, t.price, t.opens, t.from], [d.a, d.b, d.station, d.price, d.opens, d.from]); assert.equal(t.name, AREAS.find(a => a.id === d.opens).name); }
    assert.deepEqual(s.crates.map(c => [c.weapon, c.at, c.area, c.open]), STATIONS.map(c => [c.weapon, c.at, c.area, g.amb.open.has(c.area)])); assert.deepEqual(s, ambushState(g.amb.open, g.amb.gates));
    const texts = [], lines = [], rects = []; let pen = null, stroke = null, fill = null;
    Object.defineProperty(ctx, 'strokeStyle', {set(v) { stroke = v; }, get: () => stroke, configurable: true}); Object.defineProperty(ctx, 'fillStyle', {set(v) { fill = v; }, get: () => fill, configurable: true});
    ctx.fillText = (t, x, y) => texts.push({t, x, y, fill}); ctx.moveTo = (x, y) => { pen = [x, y]; }; ctx.lineTo = (x, y) => { lines.push({from: pen, to: [x, y], stroke}); pen = [x, y]; }; ctx.fillRect = (x, y, w, h) => rects.push({x, y, w, h, fill});
    g.ambush.drawMap(); const X = x => (x - g.player.x) * scale, Z = z => (z - g.player.z) * scale, near = (a, b) => Math.abs(a - b) < .01;
    for (const t of GATES) { const st = e.gates.find(x => x.id === t.id).state, line = lines.find(l => l.from && near(l.from[0], X(t.a[0])) && near(l.from[1], Z(t.a[1])) && near(l.to[0], X(t.b[0])) && near(l.to[1], Z(t.b[1])) && /^#(ff9d2e|8d8a80)$/.test(l.stroke)), price = texts.find(x => x.t === String(t.price) && near(x.x, X(t.station[0])) && near(x.y, Z(t.station[1]) - 4));
      if (st === 'open') { assert(!line && !price, `${stage}: bought barricade ${t.id} is not on the map`); continue; }
      assert(line && price, `${stage}: ${t.id} drawn with its price at its purchase point`); assert.equal(line.stroke, st === 'purchasable' ? '#ff9d2e' : '#8d8a80', `${t.id} ${st}`); }
    for (const a of AREAS) { const label = texts.find(x => x.t === a.name.toUpperCase()), shade = rects.find(r => near(r.x, X(a.x[0])) && near(r.y, Z(a.z[0])) && near(r.w, (a.x[1] - a.x[0]) * scale) && r.fill === '#00000066'); assert.equal(!!label && !!shade, !g.amb.open.has(a.id), `${stage}: ${a.name} ${g.amb.open.has(a.id) ? 'open, unmarked' : 'closed, shaded and named'}`); }
    for (const c of STATIONS) { const r = rects.find(r => near(r.x, X(c.at[0]) - 2.5) && near(r.y, Z(c.at[1]) - 2.5) && r.w === 5); assert(r, `crate ${c.weapon} on the map`); assert.equal(r.fill, g.amb.open.has(c.area) ? '#38c172' : '#8d8a80'); }
    g.ambush.hud(); const list = g.el('areas').textContent.split('\n'); assert.equal(list[0], 'AREAS'); assert.equal(list.length, 5);
    for (const a of AREAS) { const row = list[a.id], t = GATES.find(x => x.opens === a.id), c = STATIONS.find(x => x.area === a.id);
      assert.equal(row, `${a.id} ${a.name.toUpperCase()} · ` + (g.amb.open.has(a.id) ? `OPEN · CRATE ${CLASSES[c.weapon].weapon}` : g.amb.open.has(t.from) ? `CLOSED · BARRICADE ${t.price} PTS` : `CLOSED · ${t.price} PTS, FROM ${AREAS.find(x => x.id === t.from).name.toUpperCase()}`)); }
    if (stage === 'start') report.areaList = list; }
  const css = fs.readFileSync(new URL('dist/style.css', projectRoot), 'utf8'), html = fs.readFileSync(new URL('dist/index.html', projectRoot), 'utf8'); assert(/body\.solo\.tactical #areas\{display:block\}/.test(css) && /#areas\{display:none/.test(css)); assert(/id="waypoints" hidden/.test(html) && /id="way-gate"/.test(html) && /id="way-crate"/.test(html) && /id="areas"/.test(html));
  // Story: the map draws no Ambush layer.
  const s = await game('story'), sctx = s.el('map').getContext('2d'), drawn = []; sctx.fillText = t => drawn.push(t); s.ambush.drawMap(); assert.deepEqual(drawn, []);
});

await check('all four rifles are for sale across the four areas, one crate per area; whichever class you play, the other three can be bought and your own crate sells none; every barricade purchase point and every crate can be walked to from the start once its area is open', async () => {
  assert.deepEqual(STATIONS.map(s => s.weapon).sort(), Object.keys(CLASSES).sort()); assert.deepEqual(STATIONS.map(s => s.area), [1, 2, 3, 4]); assert.deepEqual(GATES.map(t => t.opens).sort(), [2, 3, 4]);
  const walkable = (g, point, r) => standPoints(g, point, r, g.amb.open).some(p => { const route = g.ai.pathTo(V(AMBUSH.start[0], 0, AMBUSH.start[1]), V(p[0], 0, p[1])), end = route.length ? route.at(-1) : V(AMBUSH.start[0], 0, AMBUSH.start[1]); return Math.hypot(end.x - p[0], end.z - p[1]) < 1.5; });
  const bought = {};
  for (const cls of Object.keys(CLASSES)) { const g = await game(); g.setClass(cls); g.reset(); g.play(); g.set({hp: 1e9}); bought[cls] = [];
    for (const t of GATES) { assert(g.amb.open.has(t.from)); assert(walkable(g, t.station, 2.8), `${t.id} purchase point reachable on foot`); assert(g.buyGate(t.id)); }
    for (const st of STATIONS) { assert(walkable(g, st.at, 2.2), `crate ${st.weapon} reachable on foot`); const p = standPoints(g, st.at, 2.2, g.amb.open)[0]; g.goTo(...p); g.frame(1e7 + bought[cls].length); g.ambush.tick(0); const prompt = g.el('interact').textContent; g.amb.points = 1e6;
      if (g.ambush.gunId() === st.weapon) { assert.doesNotMatch(prompt, /BUY/, 'your own rifle is not for sale'); assert.equal(g.ambush.interact(), false); continue; }
      assert.match(prompt, new RegExp(`^E · BUY ${CLASSES[st.weapon].weapon} · ${st.price} PTS`)); assert.equal(g.ambush.interact(), true); assert.equal(g.ambush.gunId(), st.weapon); assert.equal(g.ambush.weapon().config, CLASSES[st.weapon]); bought[cls].push(st.weapon); }
    assert(bought[cls].length >= 3, `${cls}: ${bought[cls]}`); }
  assert.deepEqual([...new Set(Object.values(bought).flat())].sort(), Object.keys(CLASSES).sort(), 'every rifle was bought by someone');
  report.rifles = {crates: STATIONS.map(s => `${CLASSES[s.weapon].weapon}: area ${s.area} ${AREAS[s.area - 1].name} (${s.at}) ${s.price} pts`), boughtByClass: bought};
});

// Story / Skirmish: the same 200 s scenario as T20-T22 against the Build 09 trace.
function aiTrace(g, seconds = 200) {
  const rows = []; let clock = 0; g.frame(0); g.press('KeyW');
  for (let i = 0; i < seconds * 60; i++) { if (i === 18 * 60) g.release('KeyW'); g.frame(clock += 1000 / 60);
    if (i % 120 === 119) rows.push({t: Math.round((i + 1) / 60), p: [+g.player.x.toFixed(3), +g.player.z.toFixed(3)], kills: g.kills(), stage: g.getStage(),
      e: enemies(g).map(a => [+a.g.position.x.toFixed(3), +a.g.position.z.toFixed(3), a.hp, a.ai?.state ?? null, a.ai?.role ?? null, a.crouch ? 1 : 0, a.gone ? 1 : 0]),
      a: squad(g).map(a => [+a.g.position.x.toFixed(3), +a.g.position.z.toFixed(3), a.hp])}); }
  return rows;
}
await check('Story and Skirmish unchanged by Build 13: 200 s of the real AI replays the Build 09 trace sample for sample; no mast, waypoint line or area list exists there; the Ambush difficulty curve and every price are the Build 12 values', async () => {
  const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  for (const mode of ['story', 'skirmish']) {
    const g = await createGame(); g.prepare({clearLane: false}); g.setMode(mode); g.reset(); g.play(); g.restoreAI(); g.set({hp: 1e9}); g.el('blood').checked = false; for (const a of g.actors) a.animate = a.visual.animate;
    const rows = aiTrace(g); assert.equal(rows.length, fixture[mode].rows.length);
    for (let i = 0; i < rows.length; i++) assert.deepEqual(rows[i], fixture[mode].rows[i], `${mode}: sample at ${rows[i].t} s differs from Build 09`);
    assert.equal(beaconsIn(g).length, 0); assert.equal(g.el('waypoints').hidden, true); assert.equal(g.solids.length, fixture[mode].solids); assert.equal(g.occluders.length, fixture[mode].occluders);
  }
  const {waveSpec, magazinePrice, dressingPrice} = await import(new URL('dist/ambush.js', projectRoot));
  assert.deepEqual([1, 5, 8, 15, 20].map(n => [waveSpec(n).count, waveSpec(n).aliveCap, waveSpec(n).spawnGap]), [[6, 2, 4.5], [14, 4, 3.3], [20, 5, 2.4], [34, 9, 1], [40, 9, 1]].map(([c, a, s]) => [c, a, +s.toFixed(10) === s ? s : s]), 'the curve the user confirmed');
  assert.deepEqual([GATES.map(t => t.price), STATIONS.map(s => s.price), [1, 8].map(w => magazinePrice(CLASSES.assault, w)), [1, 8].map(dressingPrice), AMBUSH.killPoints, AMBUSH.headshotBonus, AMBUSH.startPoints], [[750, 1000, 1250], [500, 750, 1000, 1250], [70, 120], [150, 260], 100, 50, 500], 'no price changed');
});

console.log(JSON.stringify({passed: results.length, checks: results, report, limitations: [
  'Headless: how the masts, the waypoint lines and the map read in play needs the Safari playtest; sight to a mast is a ray from a standing eye to the panel centre, not what a player notices.',
  'The map check reads the canvas calls (positions, colours, texts), not rendered pixels.']}, null, 2));
