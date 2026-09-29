// Build 13 Ambush navigation, as it stands after Build 14 (the masts, HUD waypoint lines, area list and minimap layer were
// removed there; tests/test-ambush-b14.mjs covers the full-screen map and the in-world markings): the one state function
// matches the barricade data and what is really open, all four rifles can be bought across the four areas, every purchase
// point can be walked to, and Story and Skirmish replay the Build 09 trace with the curve and every price unchanged.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame, projectRoot} from './sprint-harness.mjs';
import {build09Trace} from './old-build.mjs'; // Build 09 is run on this machine; the stored record is reported, not required

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const {CLASSES} = await import(new URL('dist/combat.js', projectRoot));
const {AMBUSH, AREAS, GATES, STATIONS, ambushState, inArena} = await import(new URL('dist/ambush.js', projectRoot));
const START = (await import(new URL('dist/maps.js', projectRoot))).activeMap().ambush.start; // Build 21: the arena's start is map data
const FIXTURE = new URL('fixtures/story-skirmish-ai-b09.json', import.meta.url);
const results = [], report = {};
async function check(name, fn) { await fn(); results.push(name); }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const enemies = g => g.actors.filter(a => a.team === 'enemy');
const squad = g => g.actors.filter(a => a.team === 'ally' && !a.remote);
const beaconsIn = g => g.scene.children.filter(o => o.userData?.beacon);
const marksIn = g => g.scene.children.filter(o => o.userData?.marking);

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

await check('the state function matches the barricade data, prices and what is really open at every stage of a run (start, yard open, west lane open, all open)', async () => {
  const g = await game();
  for (const [stage, buy] of STAGES) { if (buy) assert(g.buyGate(buy), `bought ${buy}`); const e = expectState(g), s = g.ambush.now();
    assert.deepEqual(s.gates.map(t => ({id: t.id, state: t.state})), e.gates, `${stage}: barricade states`); assert.deepEqual(s.areas.filter(a => a.open).map(a => a.id), e.openAreas);
    for (const t of s.gates) { const d = GATES.find(x => x.id === t.id); assert.deepEqual([t.a, t.b, t.station, t.price, t.opens, t.from], [d.a, d.b, d.station, d.price, d.opens, d.from]); assert.equal(t.name, AREAS.find(a => a.id === d.opens).name); }
    assert.deepEqual(s.crates.map(c => [c.weapon, c.at, c.area, c.price, c.open]), STATIONS.map(c => [c.weapon, c.at, c.area, c.price, g.amb.open.has(c.area)])); assert.deepEqual(s, ambushState(g.amb.open, g.amb.gates)); }
  report.stages = STAGES.map(x => x[0]);
});

await check('all four rifles are for sale across the four areas, one crate per area; whichever class you play, the other three can be bought and your own crate sells none; every barricade purchase point and every crate can be walked to from the start once its area is open', async () => {
  assert.deepEqual(STATIONS.map(s => s.weapon).sort(), Object.keys(CLASSES).sort()); assert.deepEqual(STATIONS.map(s => s.area), [1, 2, 3, 4]); assert.deepEqual(GATES.map(t => t.opens).sort(), [2, 3, 4]);
  const walkable = (g, point, r) => standPoints(g, point, r, g.amb.open).some(p => { const route = g.ai.pathTo(V(START[0], 0, START[1]), V(p[0], 0, p[1])), end = route.length ? route.at(-1) : V(START[0], 0, START[1]); return Math.hypot(end.x - p[0], end.z - p[1]) < 1.5; });
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
await check('Story and Skirmish unchanged: 200 s of the real AI replays the Build 09 trace sample for sample; no Ambush marking or map exists there; the Ambush difficulty curve and every price are the Build 12 values', async () => {
  const fixture = await build09Trace(); report.storedRecordAgrees = fixture.storedRecordAgrees;
  for (const mode of ['story', 'skirmish']) {
    const g = await createGame(); g.prepare({clearLane: false}); g.setMode(mode); g.reset(); g.play(); g.restoreAI(); g.set({hp: 1e9}); g.el('blood').checked = false; for (const a of g.actors) a.animate = a.visual.animate;
    const rows = aiTrace(g); assert.equal(rows.length, fixture[mode].rows.length);
    for (let i = 0; i < rows.length; i++) assert.deepEqual(rows[i], fixture[mode].rows[i], `${mode}: sample at ${rows[i].t} s differs from Build 09`);
    assert.equal(beaconsIn(g).length, 0); assert.equal(marksIn(g).length, 0); assert.equal(g.ambush.mapOpen(), false); assert.equal(g.solids.length, fixture[mode].solids); assert.equal(g.occluders.length, fixture[mode].occluders);
  }
  const {waveSpec, magazinePrice, dressingPrice} = await import(new URL('dist/ambush.js', projectRoot));
  assert.deepEqual([1, 5, 8, 15, 20].map(n => [waveSpec(n).count, waveSpec(n).aliveCap, waveSpec(n).spawnGap]), [[6, 2, 4.5], [14, 4, 3.3], [20, 5, 2.4], [34, 9, 1], [40, 9, 1]].map(([c, a, s]) => [c, a, +s.toFixed(10) === s ? s : s]), 'the curve the user confirmed');
  assert.deepEqual([GATES.map(t => t.price), STATIONS.map(s => s.price), [1, 8].map(w => magazinePrice(CLASSES.assault, w)), [1, 8].map(dressingPrice), AMBUSH.killPoints, AMBUSH.headshotBonus, AMBUSH.startPoints], [[750, 1000, 1250], [500, 750, 1000, 1250], [70, 120], [150, 260], 100, 50, 500], 'no price changed');
});

console.log(JSON.stringify({passed: results.length, checks: results, report, limitations: [
  'Headless: reachability is checked with the game\'s own path finder, not by a person walking.']}, null, 2));
