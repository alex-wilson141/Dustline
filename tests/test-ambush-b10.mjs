// Build 10 Ambush playtest fixes: enemies advance instead of holding cover (no wave stalls, push failsafe), waves arrive
// from one direction, the arena's brick walls are chest-high in Ambush only, and Story / Skirmish enemy behaviour is
// unchanged (replayed against a trace recorded from the Build 09 source). Headless production code with the real tickAI,
// hitScan and visible() (rendering, audio and transport mocked).
//
//   node tests/test-ambush-b10.mjs                      run the checks
//   node tests/test-ambush-b10.mjs --record <game.js>   re-record tests/fixtures/story-skirmish-ai-b09.json from that source
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createGame, projectRoot} from './sprint-harness.mjs';

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const {CLASSES} = await import(new URL('dist/combat.js', projectRoot));
const {ENEMY_AI} = await import(new URL('dist/enemy-ai.js', projectRoot));
const {AMBUSH, ARENA_WALLS, waveSpec, aiTuningFor} = await import(new URL('dist/ambush.js', projectRoot));
const FIXTURE = new URL('fixtures/story-skirmish-ai-b09.json', import.meta.url);
const results = [], report = {};
async function check(name, fn) { await fn(); results.push(name); }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const enemies = g => g.actors.filter(a => a.team === 'enemy');
const bearingOf = (dx, dz) => (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360, angleGap = (a, b) => Math.abs(((a - b) % 360 + 540) % 360 - 180);

// A running game with a fixed 60 Hz clock. `mode` is 'ambush', 'story' or 'skirmish'; the real AI and mission run.
async function game(mode = 'ambush') {
  const g = await createGame(); g.prepare({clearLane: false});
  g.setMode(mode); g.reset(); g.play(); g.restoreAI(); g.el('blood').checked = false;
  for (const a of g.actors) a.animate = a.visual.animate;
  let clock = 0; g.frame(0); g.run = (s, each) => { for (let i = 0, n = Math.round(s * 60); i < n; i++) { g.frame(clock += 1000 / 60); if (each?.(clock / 1000) === false) break; } };
  g.goTo = (x, z) => { g.player.set(x, g.groundY(x, z), z); };
  return g;
}
const ambush = async () => { const g = await game('ambush'); g.set({hp: 1e9}); return g; };
const downSquad = g => { for (const a of g.actors) if (a.team === 'ally') { a.hp = 0; a.dead = 1e9; } };
const distTo = (g, a) => Math.hypot(a.g.position.x - g.player.x, a.g.position.z - g.player.z);

// Plays waves 1..last with the real director and AI. The player stands still and never fires; an enemy counts as engaged
// once it has fire permission inside the wave's fight range, or stands within holdRange of the player, and is killed
// 1.5 s later (so the only way to end a wave is for every enemy to come to the player). Areas open along the way.
function playWaves(g, last, {onSpawn, onWave} = {}) {
  const A = g.amb, en = enemies(g), life = new Map(en.map(a => [a, a.life])), spawnT = new Map(), engaged = new Map(), wasAlive = new Map();
  const out = {spawns: 0, engageTimes: [], notEngaged: [], allyKills: 0, recycled: 0, pushes: 0, stalls: 0, fired: 0, waves: {}};
  const plan = {3: [[-26.5, 3.6], [-26, -10]], 5: [[-39, -8], [-48, -6]], 7: [[-26, -22.4], [-30, -40]], 9: [[-30, 20]], 11: [[-18, -14]]};
  A.points = 1e5; let phase = A.phase, waveStart = 0;
  g.run(3600, () => {
    const e = g.state().elapsed, T = g.ambush.aiT();
    if (A.phase === 'decision') g.ambush.decide(false);
    if (A.phase !== phase) { if (A.phase === 'wave') { waveStart = e; onWave?.(A.wave); } else if (phase === 'wave') out.waves[A.wave] = {count: waveSpec(A.wave).count, seconds: +(e - waveStart).toFixed(1)}; phase = A.phase; }
    const step = A.phase === 'break' && plan[A.wave]; if (step) { if (step.length === 2) { g.goTo(...step[0]); assert(g.ambush.interact(), `bought after wave ${A.wave}`); } g.goTo(...step.at(-1)); delete plan[A.wave]; }
    for (const a of en) {
      if (a.life !== life.get(a)) { life.set(a, a.life); spawnT.set(a, e); engaged.set(a, null); a.killAt = Infinity; a.pushed = false; a.firedOnce = false; a.stallsSeen = 0; out.spawns++; onSpawn?.(a, e); }
      if (a.hp > 0) {
        const d = distTo(g, a);
        if (a.ai.push && !a.pushed) { a.pushed = true; out.pushes++; }
        if (a.ai.firing && !a.firedOnce) { a.firedOnce = true; out.fired++; }
        if ((a.ai.stalls || 0) > (a.stallsSeen || 0)) { out.stalls += a.ai.stalls - (a.stallsSeen || 0); a.stallsSeen = a.ai.stalls; }
        if (engaged.get(a) == null && ((a.ai.firing && d <= T.fightRange) || d <= AMBUSH.holdRange + 1)) { engaged.set(a, e); out.engageTimes.push(+(e - spawnT.get(a)).toFixed(1)); a.killAt = e + 1.5; }
        if (e >= a.killAt) { a.hp = 0; a.dead = 998; }
      } else if (wasAlive.get(a)) { // died this frame: our kill (dead 998), a squadmate's (dead 15) or the last-resort recycle (999 + gone)
        if (a.dead === 999 && a.gone) out.recycled++; else if (a.dead === 15) out.allyKills++;
        if (engaged.get(a) == null && a.dead !== 15 && !(a.dead === 999 && a.gone)) out.notEngaged.push({wave: A.wave, dead: a.dead, dist: +distTo(g, a).toFixed(1)});
      }
      wasAlive.set(a, a.hp > 0);
    }
    if (A.wave > last) return false;
  });
  return out;
}

// ---- Story / Skirmish baseline: the same scripted 200 s with the real enemy AI, sampled every 2 s.
function aiTrace(g, seconds = 200) {
  const rows = []; let clock = 0; g.frame(0);
  g.press('KeyW'); // walk toward the village for 18 s, then stand and let the enemies come
  for (let i = 0; i < seconds * 60; i++) {
    if (i === 18 * 60) g.release('KeyW');
    g.frame(clock += 1000 / 60);
    if (i % 120 === 119) rows.push({t: Math.round((i + 1) / 60), p: [+g.player.x.toFixed(3), +g.player.z.toFixed(3)], kills: g.kills(), stage: g.getStage(),
      e: enemies(g).map(a => [+a.g.position.x.toFixed(3), +a.g.position.z.toFixed(3), a.hp, a.ai?.state ?? null, a.ai?.role ?? null, a.crouch ? 1 : 0, a.gone ? 1 : 0]),
      a: g.actors.filter(a => a.team === 'ally' && !a.remote).map(a => [+a.g.position.x.toFixed(3), +a.g.position.z.toFixed(3), a.hp])});
  }
  return rows;
}
async function baselineScenario(mode, sourcePath) {
  const g = await createGame(sourcePath ? {sourcePath} : {}); g.prepare({clearLane: false}); g.setMode(mode); g.reset(); g.play(); g.restoreAI(); g.set({hp: 1e9}); g.el('blood').checked = false;
  for (const a of g.actors) a.animate = a.visual.animate;
  const rows = aiTrace(g);
  return {rows, roles: [...new Set(enemies(g).map(a => a.ai?.role))], walls: g.arenaWalls?.map(o => o.geometry.parameters.height) ?? null, solids: g.solids.length, occluders: g.occluders.length};
}
if (process.argv[2] === '--record') {
  const src = new URL(process.argv[3], `file://${process.cwd()}/`), text = fs.readFileSync(src, 'utf8');
  const fixture = {recordedFrom: process.argv[4] || String(src), sha256: crypto.createHash('sha256').update(text).digest('hex'), recordedOn: new Date().toLocaleDateString('sv-SE'),
    scenario: 'story and skirmish, real AI, player invulnerable, walks forward (W) 18 s then stands; sampled every 2 s for 200 s'};
  for (const mode of ['story', 'skirmish']) fixture[mode] = await baselineScenario(mode, src);
  fs.writeFileSync(FIXTURE, JSON.stringify(fixture));
  console.log(`recorded ${FIXTURE.pathname} from ${fixture.recordedFrom} (${fixture.story.rows.length} + ${fixture.skirmish.rows.length} samples)`);
  process.exit(0);
}

await check('no wave stalls: 15 waves with squadmates down, every one of 300 enemies advances to fight range and is engaged within 45 s of arriving (median under 25 s); each wave ends within 40 s + 5.5 s per enemy; at most 1 % are withdrawn out of sight by the last resort (and arrive again) and the push failsafe and stuck watchdog are rare', async () => {
  const g = await ambush(); downSquad(g);
  const r = playWaves(g, 15);
  const sorted = [...r.engageTimes].sort((a, b) => a - b), median = sorted[sorted.length >> 1], max = sorted.at(-1);
  const total = [...Array(15)].reduce((s, _, i) => s + waveSpec(i + 1).count, 0);
  assert.equal(g.amb.survived, 15); assert.equal(r.spawns - r.recycled, total, 'every arrival of waves 1-15 counted (a withdrawn enemy arrives again)'); assert(r.recycled <= total * .01, `${r.recycled} withdrawn out of sight`);
  assert.deepEqual(r.notEngaged, []); assert.equal(r.engageTimes.length, total);
  assert(max <= 45, `slowest engagement ${max} s`); assert(median <= 25, `median engagement ${median} s`);
  for (const [n, w] of Object.entries(r.waves)) assert(w.seconds <= 40 + 5.5 * w.count, `wave ${n}: ${w.seconds} s for ${w.count} enemies`);
  assert(r.fired >= r.spawns * .25, `${r.fired} of ${r.spawns} had fire permission before dying (3 attack tokens per target)`);
  assert(r.pushes <= r.spawns * .12, `${r.pushes} pushes of ${r.spawns}`); assert(r.stalls <= r.spawns * .05, `${r.stalls} watchdog steps of ${r.spawns}`);
  report.stall = {spawns: r.spawns, engageMedian_s: median, engageP95_s: sorted[Math.floor(sorted.length * .95)], engageMax_s: max, fired: r.fired, pushes: r.pushes, watchdogSteps: r.stalls, recycled: r.recycled, slowestWave_s: Math.max(...Object.values(r.waves).map(w => w.seconds)), waves: r.waves};
});

await check('with the squad fighting, 8 waves: every enemy either engages the player or falls to a squadmate; nobody hangs back', async () => {
  const g = await ambush(); const r = playWaves(g, 8);
  assert.equal(g.amb.survived, 8); assert.deepEqual(r.notEngaged, []); assert(r.allyKills > 0, 'squadmates took part'); assert(r.recycled <= r.spawns * .02, `${r.recycled} withdrawn out of sight while pinned by the squad far from the player`);
  report.squad = {spawns: r.spawns, engaged: r.engageTimes.length, allyKills: r.allyKills, pushes: r.pushes, watchdogSteps: r.stalls, withdrawn: r.recycled};
});

await check('they keep coming: with nobody dying, every enemy of wave 3 that arrives closes from its first stop to within 8.5 m of the player inside 60 s and then stands and fights there instead of settling into cover at range', async () => {
  const g = await ambush(); downSquad(g); const A = g.amb, en = enemies(g), first = new Map(), reached = new Map(), fired = new Set(), born = new Map();
  g.ambush.startWave(3); const life = new Map(en.map(a => [a, a.life]));
  g.run(90, () => { const e = g.state().elapsed; for (const a of en) { if (a.life !== life.get(a)) { life.set(a, a.life); born.set(a, e); }
    if (a.hp > 0) { const d = distTo(g, a); if (a.ai.state === 'hold' && !first.has(a)) first.set(a, {t: e, d}); if (d <= AMBUSH.holdRange + 1.5 && !reached.has(a)) reached.set(a, e - born.get(a)); if (a.ai.firing) fired.add(a); } } });
  const arrived = en.filter(a => born.has(a)); assert.equal(arrived.length, waveSpec(3).aliveCap, 'the alive cap arrived and nobody died');
  for (const a of arrived) { assert(reached.has(a), `enemy ${a.index} never came within ${AMBUSH.holdRange + 1.5} m (born ${born.get(a).toFixed(1)} s)`); assert(reached.get(a) <= 60, `enemy ${a.index}: ${reached.get(a).toFixed(1)} s to close in`); }
  assert(first.size >= 3 && [...first.values()].some(f => f.d > AMBUSH.holdRange + 2), 'most stopped to fire at range first, then moved up');
  assert(fired.size >= 3, `${fired.size} fired (3 attack tokens)`);
  const near = en.filter(a => a.hp > 0 && distTo(g, a) <= g.ambush.aiT().fightRange).length; assert(near >= arrived.length - 1, `${near} of ${arrived.length} still inside fight range at the end`);
  report.keepComing = {arrived: arrived.length, closeIn_s: [...reached.values()].map(v => +v.toFixed(1)).sort((a, b) => a - b), firstStop_m: [...first.values()].map(f => +f.d.toFixed(1))};
});

await check('waves arrive from one direction: every spawn lies within the wave sector (40°, widened only after repeated misses, at least 60 % inside the 40°) of the bearing announced on the radio and HUD; consecutive waves come from different bearings', async () => {
  const g = await ambush(); downSquad(g); const A = g.amb, spawns = [], radios = [];
  const r = playWaves(g, 8, {onSpawn: a => { const [x, z] = a.spawnAt, [ox, oz] = A.origin; spawns.push({wave: A.wave, gap: angleGap(bearingOf(x - ox, z - oz), A.bearing), spread: a.spawnSpread, bearing: A.bearing}); },
    onWave: n => { g.ambush.hud(); radios.push({wave: n, bearing: A.bearing, radio: g.el('radiotext').textContent, hud: g.el('objtext').textContent}); }});
  assert(r.spawns >= 100 && spawns.length === r.spawns);
  for (const s of spawns) assert(s.gap <= s.spread + 1e-9, `wave ${s.wave}: spawn ${s.gap.toFixed(0)}° off the bearing with spread ${s.spread}`);
  // Build 11: spots with over-long routes are skipped, so a sector walled off by a closed barricade widens more often; the
  // announced side still supplies at least 60 % of arrivals inside its 40° (AMB-05 records the tighter option).
  const tight = spawns.filter(s => s.gap <= AMBUSH.sectorSpread).length; assert(tight >= spawns.length * .6, `${tight}/${spawns.length} inside the 40° sector`);
  const bearings = [...new Set(spawns.map(s => `${s.wave}:${s.bearing}`))].map(k => Number(k.split(':')[1]));
  for (let i = 1; i < bearings.length; i++) assert.notEqual(bearings[i], bearings[i - 1], 'a new direction each wave');
  for (const b of bearings) assert(Number.isInteger(b / 45) && b >= 0 && b < 360);
  // Every wave's announcement names the direction the enemies really come from (at least three different words over the run).
  const WORDS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'], SHORT = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  assert(radios.length >= 8); for (const w of radios) { assert.equal(w.radio, `Command: Wave ${w.wave} inbound from the ${WORDS[w.bearing / 45]}, ${waveSpec(w.wave).count} hostiles.`); assert.match(w.hud, new RegExp(`hostiles left · from ${SHORT[w.bearing / 45]}$`)); }
  assert(new Set(radios.map(w => w.bearing)).size >= 3, 'several different directions announced');
  report.sectors = {spawns: spawns.length, insideTightSector: tight, maxOff_deg: +Math.max(...spawns.map(s => s.gap)).toFixed(0), bearings};
});

await check('push failsafe: an enemy that stops closing in for 8 s pushes straight at the player (no stopping to fight or duck into cover on the way) until within 6 m, then fights; one held out of sight for 30 s is withdrawn and sent again', async () => {
  const g = await ambush(); downSquad(g); const A = g.amb, en = enemies(g);
  const life0 = new Map(en.map(c => [c, c.life])), spawnCount = () => en.reduce((n, c) => n + ((c.life - life0.get(c)) & 255), 0);
  g.ambush.startWave(1); let a = null; g.run(20, () => { a = en.find(b => b.hp > 0); return !a; }); assert(a, 'an enemy arrived');
  const born = g.state().elapsed, [sx, sz] = a.spawnAt, hold = b => { b.g.position.set(sx, g.groundY(sx, sz), sz); };
  // Held at its spawn: not stuck (it walks each frame and is put back), just never any closer.
  let pushedAt = null; g.run(12, () => { if (a.ai.push) { pushedAt = g.state().elapsed - born; return false; } hold(a); });
  assert(pushedAt !== null && pushedAt >= AMBUSH.pushAfter - .1 && pushedAt <= AMBUSH.pushAfter + .6, `push after ${pushedAt?.toFixed(1)} s`); assert.equal(a.ai.pushes, 1);
  // Released: it heads for a spot beside the player, never stops to fight or take cover while pushing, and the push ends within pushStop.
  const states = new Set(); let goalOff = 0, arrived = null; const d0 = distTo(g, a);
  g.run(60, () => { if (!a.ai.push) { arrived = distTo(g, a); return false; } states.add(a.ai.state); if (a.ai.goal) goalOff = Math.max(goalOff, Math.hypot(a.ai.goal[0] - g.player.x, a.ai.goal[1] - g.player.z)); if (a.hp <= 0) return false; });
  assert(a.hp > 0, 'still alive'); assert(arrived !== null && arrived <= AMBUSH.pushStop + .5, `push ended at ${arrived?.toFixed(1)} m (started ${d0.toFixed(1)} m out)`);
  assert.deepEqual([...states], ['advance']); assert(goalOff <= 3, `push goal within 3 m of the player (${goalOff.toFixed(1)})`);
  let fought = false; g.run(6, () => { if (a.hp <= 0) return false; if (a.ai.state === 'hold' && a.ai.firing) fought = true; }); assert(fought, 'then stops and fires at close range');
  // Last resort: another enemy held at its (unseen) spawn for recycleAfter seconds is withdrawn and arrives again: the wave
  // then sees count + 1 arrivals and still ends.
  const b = en.find(c => c.hp > 0 && c !== a) || (g.run(10, () => !!(en.find(c => c.hp > 0 && c !== a))), en.find(c => c.hp > 0 && c !== a)); assert(b, 'a second enemy');
  const life = b.life, [bx, bz] = b.spawnAt, killOthers = () => { for (const c of en) if (c !== b && c.hp > 0) { c.hp = 0; c.dead = 998; } }; killOthers(); a.killAt = Infinity;
  let gone = null; g.run(AMBUSH.recycleAfter + 4, () => { if (b.hp <= 0 || b.life !== life) { gone = g.state().elapsed - born; return false; } b.g.position.set(bx, g.groundY(bx, bz), bz); killOthers(); });
  assert(gone !== null && b.gone && b.dead === 999 && b.hp <= 0, 'withdrawn out of sight'); assert(gone >= AMBUSH.recycleAfter, `after ${gone.toFixed(1)} s`);
  g.run(90, () => { for (const c of en) if (c.hp > 0) { c.hp = 0; c.dead = 998; } return A.phase === 'wave'; });
  assert.equal(A.survived, 1, 'the wave still ends'); assert.equal(spawnCount(), waveSpec(1).count + 1, 'one arrival more than the wave count: the withdrawn enemy came back');
  report.push = {pushAfter_s: +pushedAt.toFixed(1), pushEndedAt_m: +arrived.toFixed(1), recycleAfter_s: AMBUSH.recycleAfter};
});

await check('the four arena walls are chest-high (1.2 m) in Ambush and full height (1.7 m) in Story and Skirmish; they stay separate meshes outside the static batch and switching modes restores them exactly; collision never changes', async () => {
  const g = await game('story'), walls = g.arenaWalls; assert.equal(walls.length, ARENA_WALLS.length);
  const top = o => +(o.position.y + o.geometry.boundingBox.max.y - g.groundY(o.position.x, o.position.z)).toFixed(3);
  const solids = g.solids.length, occ = g.occluders.length, order = walls.map(o => g.occluders.indexOf(o)), fullGeo = walls.map(o => o.geometry);
  for (const o of walls) { assert(g.scene.children.includes(o), 'a direct scene child (not merged into the static batch)'); assert(g.occluders.includes(o), 'still a sight and bullet occluder'); assert.equal(top(o), 1.7); }
  // No other mesh (the merged static batch above all) has geometry standing in a wall's footprint: lowering a wall must not leave a full-height copy behind.
  const copies = []; const v = new THREE.Vector3(); g.scene.updateMatrixWorld(true);
  for (const m of g.scene.children) { if (!m.isMesh || walls.includes(m) || !m.geometry?.attributes?.position) continue; const pos = m.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld); for (const [wx, wz, ww, wd] of ARENA_WALLS) if (Math.abs(v.x - wx) < ww / 2 + .01 && Math.abs(v.z - wz) < wd / 2 + .01 && v.y > g.groundY(wx, wz) + 1.3) copies.push([wx, wz, +v.y.toFixed(2)]); } }
  assert.deepEqual(copies.slice(0, 3), [], 'no geometry above 1.3 m inside a wall footprint besides the wall itself');
  for (const mode of ['ambush', 'story', 'skirmish', 'ambush']) { g.setMode(mode); g.reset();
    for (const [i, o] of walls.entries()) { const h = mode === 'ambush' ? AMBUSH.arenaWallHeight : 1.7; assert.equal(o.geometry.parameters.height, h, `${mode}: wall ${i} ${h} m`); assert.equal(top(o), h); assert(g.scene.children.includes(o) && g.occluders.indexOf(o) === order[i]);
      if (mode !== 'ambush') assert.equal(o.geometry, fullGeo[i], 'the original geometry object is back'); }
    // Ambush adds its barricades and crates to collision and occlusion; the walls themselves are the same solids in every mode.
    if (mode === 'ambush') assert(g.solids.length > solids && g.occluders.length > occ); else { assert.equal(g.solids.length, solids); assert.equal(g.occluders.length, occ); }
    assert.equal(g.blocked(-40, 6), true, 'the west wall blocks movement in every mode'); }
  g.setMode('story'); g.reset(); assert.equal(g.occluders.length, occ); assert.equal(g.solids.length, solids);
  assert.equal(AMBUSH.arenaWallHeight, 1.2);
});

await check('chest-high walls as occluders: a standing player sees and hits an enemy across the wall while a crouched one is hidden and the shot stops at the wall; a standing enemy sees a standing player and loses him when he crouches; in Story the same wall blocks both; the walls become low cover only in Ambush', async () => {
  const g = await ambush(); downSquad(g); const [wx, wz] = ARENA_WALLS[0], [px, ex] = [wx + 3, wx - 3], gy = (x, z) => g.groundY(x, z);
  const e = enemies(g)[0]; e.hp = 100; e.dead = 0; e.gone = false; e.g.visible = true; e.resetPose(); e.g.position.set(ex, gy(ex, wz), wz); e.g.rotation.set(0, Math.PI / 2, 0); e.g.updateMatrixWorld(true); e.ai = {role: 'ambush', dir: 1, lastHp: 100, state: 'hold', t: 0, phaseFor: 1e9, foe: 'player', closeAt: 1e9, best: 0};
  g.goTo(px, wz); g.set({yaw: -Math.PI / 2, pitch: 0}); g.set({crouch: false}); g.run(1); // stand; the enemy senses every ~.15 s
  const eye = () => g.camera.position.clone(), chest = () => e.g.position.clone().setY(e.g.position.y + 1.15), shoot = () => { const d = chest().sub(eye()); return g.hitScan(eye(), d.normalize(), CLASSES.assault); };
  assert(Math.abs(g.camera.position.y - (gy(px, wz) + 1.7)) < .02, 'standing eye 1.7 m');
  assert(g.visible(eye(), chest()), 'standing player sees over the wall'); const hp0 = e.hp, end = shoot(); assert.equal(hp0 - e.hp, CLASSES.assault.damage, 'and the shot lands'); assert(end.x < wx - 2, 'bullet reached the far side');
  assert.equal(e.seen?.a ?? (e.seen ? 'player' : null), 'player', 'the standing enemy sees the standing player over the wall'); assert(e.ai.firing, 'and may fire');
  g.set({crouch: true}); g.run(1.5); assert(Math.abs(g.camera.position.y - (gy(px, wz) + .98)) < .03, 'crouched eye .98 m');
  assert(!g.visible(eye(), chest()), 'crouched: the wall hides the enemy'); const hp1 = e.hp, end2 = shoot(); assert.equal(e.hp, hp1, 'the shot does not reach him'); assert(Math.abs(end2.x - (wx + .3)) < .05, `it stops at the wall face (x ${end2.x.toFixed(2)})`);
  assert.equal(e.seen, null, 'the enemy loses sight of the crouched player'); assert(!e.ai.firing);
  e.crouch = true; g.set({crouch: false}); g.run(1); assert(e.seen && !e.seen.a, 'a crouched enemy (eye 1.12 m) still sees a standing player (1.4 m) over the 1.2 m wall: the line clears it'); e.crouch = false;
  // Enemy AI hits have no ray (Build 06 rule): enemy fire is gated only by sight, which is what the wall now decides.
  const cover = g.ai.coverTable().near(wx, wz, 3); assert(cover.length >= 4 && cover.every(c => c.low && Math.abs(c.top - 1.2) < .01), 'the wall is low cover in Ambush');
  // Story: full height blocks standing sight and fire both ways; no low cover at the wall.
  const s = await game('story'); s.set({hp: 1e9}); const se = enemies(s)[0]; se.g.position.set(ex, s.groundY(ex, wz), wz); se.g.updateMatrixWorld(true); se.hp = 100; se.ai = {role: 'garrison', state: 'hold', retry: Infinity, flushed: true, lastHp: 100}; for (const o of enemies(s)) if (o !== se) { o.hp = 0; o.dead = 999; }
  s.goTo(px, wz); s.set({yaw: -Math.PI / 2, pitch: 0, crouch: false}); s.run(1);
  assert(!s.visible(s.camera.position.clone(), se.g.position.clone().setY(se.g.position.y + 1.15)), 'Story: standing player cannot see across the 1.7 m wall'); assert.equal(se.seen, null, 'nor the enemy the player');
  const hp2 = se.hp; s.hitScan(s.camera.position.clone(), se.g.position.clone().setY(se.g.position.y + 1.15).sub(s.camera.position).normalize(), CLASSES.assault); assert.equal(se.hp, hp2);
  assert(s.ai.coverTable().near(wx, wz, 3).every(c => !c.low), 'no low cover at the wall in Story');
  report.walls = {ambush_m: AMBUSH.arenaWallHeight, elsewhere_m: 1.7, standingEye_m: 1.7, crouchedEye_m: .98, enemyEyeStanding_m: 1.42, enemyEyeCrouched_m: 1.12};
});

await check('Story and Skirmish enemy AI unchanged: 200 s of the real AI replays the trace recorded from the Build 09 source sample for sample (positions to 1 mm, HP, states, roles, crouch); no enemy ever takes the Ambush role and the wave tuning still leaves every base AI value alone', async () => {
  assert(fs.existsSync(FIXTURE), 'fixture tests/fixtures/story-skirmish-ai-b09.json present');
  const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')); assert.match(fixture.sha256, /^[0-9a-f]{64}$/);
  for (const mode of ['story', 'skirmish']) {
    const now = await baselineScenario(mode);
    assert.equal(now.rows.length, fixture[mode].rows.length);
    for (let i = 0; i < now.rows.length; i++) assert.deepEqual(now.rows[i], fixture[mode].rows[i], `${mode}: sample at ${now.rows[i].t} s differs from Build 09`);
    assert(!now.roles.includes('ambush') && now.roles.length >= 1); assert.deepEqual(now.walls, [1.7, 1.7, 1.7, 1.7]);
    assert.equal(now.solids, fixture[mode].solids); assert.equal(now.occluders, fixture[mode].occluders);
    const moved = now.rows.at(-1).e.filter((e, k) => Math.hypot(e[0] - now.rows[0].e[k][0], e[1] - now.rows[0].e[k][1]) > 5).length; assert(moved >= 3, `${mode}: the enemies actually fought (${moved} moved 5 m+)`);
    const states = new Set(now.rows.flatMap(r => r.e.map(e => e[3]))); assert(['move', 'hide', 'peek', 'hold'].some(s => states.has(s)), `${mode}: combat states seen (${[...states]})`);
    report[mode] = {samples: now.rows.length, states: [...states].sort(), kills: now.rows.at(-1).kills};
  }
  const t = aiTuningFor(12, ENEMY_AI); for (const k of Object.keys(ENEMY_AI)) if (!['reinforce', 'corpseMax', 'corpseLife', 'engageLeash'].includes(k)) assert.deepEqual(t[k], ENEMY_AI[k], `${k} unchanged by the wave tuning`);
  report.baseline = {recordedFrom: fixture.recordedFrom, recordedOn: fixture.recordedOn};
});

console.log(JSON.stringify({passed: results.length, checks: results, report, limitations: [
  'Headless: how the advance reads in play (pacing, whether enemies feel relentless or suicidal) and the chest-high walls as cover need the Safari playtest; frame cost is measured separately.',
  'The Story/Skirmish trace was recorded on this machine (Node 24, arm64); a different JS engine could differ in the last bits of floating point and need re-recording with --record from the Build 09 source.']}, null, 2));
