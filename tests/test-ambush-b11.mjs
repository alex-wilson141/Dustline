// Build 11 Ambush difficulty and economy: the alive cap rises with the wave and is reached in play, the enemy pool exists
// only in Ambush, magazines are a recurring purchase at a wave-scaled price, crate prompts show the rifle's real numbers,
// the end-of-run summary keeps a personal best in browser storage, and Story / Skirmish replay the Build 09 trace.
// Headless production code (real tickAI, hitScan, director); rendering, audio and transport mocked.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame, projectRoot} from './sprint-harness.mjs';

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const {CLASSES} = await import(new URL('dist/combat.js', projectRoot));
const {ENEMY_AI} = await import(new URL('dist/enemy-ai.js', projectRoot));
const {AMBUSH, STATIONS, waveSpec, aiTuningFor, magazinePrice, weaponCompare, weaponFacts} = await import(new URL('dist/ambush.js', projectRoot));
const {BEST_KEY, readBest, recordBest} = await import(new URL('dist/records.js', projectRoot));
const FIXTURE = new URL('fixtures/story-skirmish-ai-b09.json', import.meta.url);
const results = [], report = {};
async function check(name, fn) { await fn(); results.push(name); }
const enemies = g => g.actors.filter(a => a.team === 'enemy');
const alive = g => enemies(g).filter(a => a.hp > 0).length;
const distTo = (g, a) => Math.hypot(a.g.position.x - g.player.x, a.g.position.z - g.player.z);

async function game(mode = 'ambush') {
  const g = await createGame(); g.prepare({clearLane: false});
  g.setMode(mode); g.reset(); g.play(); g.restoreAI(); g.el('blood').checked = false;
  for (const a of g.actors) a.animate = a.visual.animate;
  let clock = 0; g.frame(0); g.run = (s, each) => { for (let i = 0, n = Math.round(s * 60); i < n; i++) { g.frame(clock += 1000 / 60); if (each?.(clock / 1000) === false) break; } };
  g.goTo = (x, z) => { g.player.set(x, g.groundY(x, z), z); };
  g.prompt = () => { g.frame(clock += 1000 / 60); g.ambush.tick(0); return g.el('interact').textContent; };
  return g;
}
const ambush = async () => { const g = await game('ambush'); g.set({hp: 1e9}); return g; };
const downSquad = g => { for (const a of g.actors) if (a.team === 'ally') { a.hp = 0; a.dead = 1e9; } };
const openAll = g => { g.amb.points = 1e6; for (const [x, z] of [[-26.5, 3.6], [-39, -8], [-26, -22.4]]) { g.goTo(x, z); assert(g.ambush.interact(), `bought at ${x},${z}`); } };
function memoryStorage() { const m = new Map(); return {sets: 0, gets: 0, getItem(k) { this.gets++; return m.has(k) ? m.get(k) : null; }, setItem(k, v) { this.sets++; m.set(k, String(v)); }, removeItem(k) { m.delete(k); }, dump: () => Object.fromEntries(m)}; }

await check('the alive cap rises with the wave (4 at wave 1, one more every two waves, 12 from wave 17) and is reached in play at waves 1, 9 and 17, never exceeded, and held at the ceiling while enemies die; the pool leaves room for the corpse limit', async () => {
  let prev = 0; for (let n = 1; n <= 40; n++) { const c = waveSpec(n).aliveCap; assert(c >= prev && c <= AMBUSH.aliveCeiling && c + aiTuningFor(n, ENEMY_AI).corpseMax <= AMBUSH.enemyPool, `wave ${n} cap ${c}`); prev = c; }
  assert.deepEqual([1, 2, 3, 8, 9, 16, 17, 40].map(n => waveSpec(n).aliveCap), [4, 4, 5, 7, 8, 11, 12, 12]); assert.equal(AMBUSH.aliveCeiling, 12); assert.equal(AMBUSH.enemyPool, 20);
  report.cap = {curve: Object.fromEntries([1, 3, 5, 7, 9, 11, 13, 15, 17, 18].map(n => [n, waveSpec(n).aliveCap])), reached: {}};
  for (const n of [1, 9, 17]) { const g = await ambush(); downSquad(g); assert.equal(enemies(g).length, AMBUSH.enemyPool, 'Ambush enemy pool'); g.ambush.startWave(n); let most = 0;
    g.run(120, () => { most = Math.max(most, alive(g)); }); assert.equal(most, waveSpec(n).aliveCap, `wave ${n}: cap ${waveSpec(n).aliveCap} reached and never exceeded (${most})`); report.cap.reached[n] = most; }
  // Held at the ceiling: at wave 17 enemies die 1.5 s after engaging and the director keeps replacing them.
  const g = await ambush(); downSquad(g); openAll(g); g.goTo(-30, -10); g.ambush.startWave(17); const T = g.ambush.aiT(), A = g.amb; let sum = 0, samples = 0, most = 0;
  g.run(150, t => { if (A.phase === 'decision') g.ambush.decide(false); for (const a of enemies(g)) if (a.hp > 0) { const d = distTo(g, a); if (a.killAt == null && ((a.ai.firing && d <= T.fightRange) || d <= AMBUSH.holdRange + 1)) a.killAt = g.state().elapsed + 1.5; if (a.killAt != null && g.state().elapsed >= a.killAt) { a.hp = 0; a.dead = 998; a.killAt = null; } } else a.killAt = null;
    if (t > 20 && A.phase === 'wave' && A.toSpawn > 0) { sum += alive(g); samples++; most = Math.max(most, alive(g)); } });
  const mean = sum / samples; assert(samples > 1800 && most === 12 && mean >= 9, `waves 17+ under fire while arrivals remain: ${most} at most, ${mean.toFixed(1)} alive on average over ${samples} frames`); report.cap.sustainedMean17 = +mean.toFixed(1);
});

await check('the extra enemy actors exist only in Ambush: Story and Skirmish keep 7 enemies and 10 local actors (the co-op snapshot shape); switching modes attaches and detaches them cleanly', async () => {
  const g = await game('story'); const count = () => ({enemies: enemies(g).length, local: g.actors.filter(a => !a.remote).length, total: g.actors.length});
  assert.deepEqual(count(), {enemies: 7, local: 10, total: 11});
  g.setMode('ambush'); g.reset(); assert.deepEqual(count(), {enemies: 20, local: 23, total: 24}); const extras = enemies(g).slice(7); assert(extras.every(a => g.scene.children.includes(a.g) && a.index >= 7 && a.hp <= 0 && a.gone));
  g.setMode('skirmish'); g.reset(); assert.deepEqual(count(), {enemies: 7, local: 10, total: 11}); assert(extras.every(a => !g.scene.children.includes(a.g) && !g.actors.includes(a)), 'detached from the scene and the actor list');
  g.play(); g.run(3); assert.equal(g.state().state, 'playing'); assert(enemies(g).every(a => a.index < 7 && a.ai.role !== 'ambush'));
  g.setMode('ambush'); g.reset(); assert.deepEqual(count(), {enemies: 20, local: 23, total: 24}); assert.equal(enemies(g).slice(7)[0], extras[0], 'the same actors are reused, not recreated');
  g.setMode('story'); g.reset(); assert.deepEqual(count(), {enemies: 7, local: 10, total: 11});
});

await check('magazines: the price follows capacity × damage and rises with the wave to a cap (CQB/carbine 70 → 180, DMR 100 → 240, automatic rifle 160 → 400); B deducts exactly the price shown, is refused below it or with a full reserve, adds one magazine up to the reserve limit; E does nothing at the crate of the rifle held; a bought rifle comes with three magazines', async () => {
  const table = {};
  for (const [id, c] of Object.entries(CLASSES)) { table[id] = [1, 5, 10, 16, 30].map(w => magazinePrice(c, w)); let prev = 0;
    for (let w = 1; w <= 30; w++) { const p = magazinePrice(c, w), scale = Math.min(AMBUSH.magWaveCap, 1 + AMBUSH.magWaveStep * (w - 1)); assert.equal(p, Math.ceil(c.capacity * c.damage / 100 * AMBUSH.magBase * scale / 10) * 10); assert(p >= prev && p % 10 === 0); prev = p; }
    assert.equal(magazinePrice(c, 16), magazinePrice(c, 40), 'capped from wave 16'); }
  assert.deepEqual(table, {assault: [70, 100, 130, 180, 180], marksman: [100, 140, 180, 240, 240], support: [160, 230, 300, 400, 400], medic: [70, 90, 120, 160, 160]});
  report.magazines = table;
  const g = await ambush(), A = g.amb, w = g.ambush.weapon(), st = STATIONS[0]; g.goTo(st.at[0], st.at[1] + 1.4);
  assert.equal(g.ambush.gunId(), 'assault'); assert.deepEqual([w.ammo, w.reserve], [30, 180], 'the class rifle starts full');
  assert.equal(g.prompt().split('\n').at(-1), 'B · MAGAZINE FOR MK4 CARBINE · 30 RDS · 70 PTS (RESERVE FULL) · RESERVE 180/180');
  A.points = 1000; assert.equal(g.ambush.buyAmmo(), false); assert.equal(A.points, 1000); assert.equal(w.reserve, 180); assert.equal(g.el('notice').textContent, 'RESERVE FULL');
  w.reserve = 100; A.points = 69; assert.equal(g.prompt().split('\n').at(-1), 'B · MAGAZINE FOR MK4 CARBINE · 30 RDS · 70 PTS (NEED 1 MORE) · RESERVE 100/180'); assert.equal(g.ambush.buyAmmo(), false); assert.deepEqual([A.points, w.reserve], [69, 100]);
  A.points = 70; const shown = Number(g.prompt().match(/B · MAGAZINE[^\n]*?· (\d+) PTS/)[1]); assert.equal(g.ambush.buyAmmo(), true); assert.deepEqual([70 - A.points, w.reserve, w.ammo], [shown, 130, 30], 'the price shown is the price paid; one magazine into the reserve');
  w.reserve = 170; A.points = 70; assert.equal(g.ambush.buyAmmo(), true); assert.deepEqual([A.points, w.reserve], [0, 180], 'topped up to the limit only');
  A.wave = 10; w.reserve = 0; A.points = 129; assert.match(g.prompt(), /· 130 PTS \(NEED 1 MORE\)/); assert.equal(g.ambush.buyAmmo(), false); A.points = 130; assert.equal(g.ambush.buyAmmo(), true); assert.deepEqual([A.points, w.reserve], [0, 30], 'wave 10 price read from the live wave');
  // E at the crate of the rifle you hold does nothing; E at another crate buys that rifle with three magazines.
  A.wave = 1; openAll(g); g.goTo(STATIONS[1].at[0], STATIONS[1].at[1] + 1.4); assert.equal(g.prompt().split('\n').length, 1, 'only the magazine line at your own rifle\'s crate'); A.points = 5000; assert.equal(g.ambush.interact(), false); assert.equal(A.points, 5000);
  g.goTo(st.at[0], st.at[1] + 1.4); assert.match(g.prompt(), /^E · BUY MK4 CQB · 500 PTS · 3 MAGAZINES\n/); assert.equal(g.ambush.interact(), true); assert.equal(A.points, 4500); assert.equal(g.ambush.gunId(), 'medic');
  const w2 = g.ambush.weapon(); assert.deepEqual([w2.ammo, w2.reserve], [CLASSES.medic.capacity, CLASSES.medic.capacity * (AMBUSH.rifleMagazines - 1)]);
  assert.equal(g.prompt(), 'B · MAGAZINE FOR MK4 CQB · 30 RDS · 70 PTS · RESERVE 60/120', 'magazines are now for the rifle held, with its reserve limit');
  assert.equal(g.ambush.buyAmmo(), true); assert.equal(w2.reserve, 90); assert.equal(A.points, 4430);
  assert(A.bought.includes('mag:medic') && A.bought.includes('medic'));
});

await check('crate prompts show the rifle\'s real numbers (damage, rounds per minute, magazine, fire mode, reload) and the difference from the rifle held, read live from the weapon data: changing a value changes the prompt; the rifle bought is the one those numbers describe', async () => {
  const g = await ambush(), A = g.amb; openAll(g); const st = STATIONS[2]; g.goTo(st.at[0], st.at[1] + 1.4); assert.equal(g.ambush.gunId(), 'assault');
  const lines = g.prompt().split('\n'); assert.equal(lines.length, 3); assert.equal(lines[0], 'E · BUY MK4 DMR · 1000 PTS · 3 MAGAZINES'); assert.equal(lines[1], weaponCompare(CLASSES.marksman, CLASSES.assault));
  const m = lines[1].match(/^(\d+) DMG \(([+−]\d+)\) · (\d+) RPM \(([+−]\d+)\) · (\d+)-RD MAG \(([+−]\d+)\) · (AUTO|SEMI) · ([\d.]+) S RELOAD \(([+−][\d.]+)\)$/); assert(m, `readable comparison: ${lines[1]}`);
  const s = CLASSES.marksman, h = CLASSES.assault, n = v => Number(v.replace('−', '-'));
  assert.deepEqual([Number(m[1]), n(m[2]), Number(m[3]), n(m[4]), Number(m[5]), n(m[6]), m[7], Number(m[8]), n(m[9])],
    [s.damage, s.damage - h.damage, Math.round(60 / s.interval), Math.round(60 / s.interval) - Math.round(60 / h.interval), s.capacity, s.capacity - h.capacity, s.automatic ? 'AUTO' : 'SEMI', s.reload, +(s.reload - h.reload).toFixed(1)]);
  assert.equal(lines[1], '78 DMG (+40) · 200 RPM (−371) · 20-RD MAG (−10) · SEMI · 3.0 S RELOAD (+0.5)');
  // Live values, not text: change the data and the prompt follows; restore afterwards.
  const saved = {...s}; s.damage = 99; s.interval = .15; assert.match(g.prompt().split('\n')[1], /^99 DMG \(\+61\) · 400 RPM \(−171\)/); Object.assign(s, saved); assert.equal(g.prompt().split('\n')[1], lines[1]);
  assert.deepEqual(weaponFacts(CLASSES.support), {damage: 35, rpm: 706, mag: 75, reserve: 225, auto: true, reload: 5.1});
  A.points = 1000; assert.equal(g.ambush.interact(), true); assert.equal(g.ambush.weapon().config, CLASSES.marksman, 'the rifle bought is the one described');
  assert.equal(g.prompt().split('\n').length, 1, 'holding the DMR at its crate: only the magazine line');
  report.promptExample = lines;
});

await check('personal best in browser storage: recorded on the first run, shown as current-versus-best, updated only when the wave or the bank improves, kept across runs and page loads (new instance), and the game runs unchanged when storage is missing, throwing or corrupt; Story never touches it', async () => {
  const store = memoryStorage(); globalThis.localStorage = store; const text = g => g.el('report').textContent;
  try {
    const g = await ambush(), A = g.amb; A.wave = 3; g.ambush.finish(false, undefined, 'self'); assert.match(text(g), /Nothing banked\. .* First run recorded: wave 3 · 0 banked\.$/); assert.deepEqual(JSON.parse(store.dump()[BEST_KEY]), {wave: 3, banked: 0}); assert.equal(store.sets, 1);
    g.reset(); g.play(); A.wave = 5; A.survived = 5; A.earned = 1000; g.ambush.finish(true, undefined, 'extract'); assert.match(text(g), /Banked 1000 points .* Personal best: wave 5 · 1000 banked · NEW BEST WAVE · NEW BEST BANK\.$/); assert.equal(store.sets, 2);
    g.reset(); g.play(); A.wave = 2; g.ambush.finish(false, undefined, 'self'); assert.match(text(g), /Personal best: wave 5 · 1000 banked\.$/); assert.equal(store.sets, 2, 'no write without an improvement');
    g.reset(); g.play(); A.wave = 9; g.ambush.finish(false, undefined, 'bounds'); assert.match(text(g), /Personal best: wave 9 · 1000 banked · NEW BEST WAVE\.$/); assert.equal(store.sets, 3); assert.deepEqual(readBest(store), {wave: 9, banked: 1000});
    g.reset(); g.play(); A.wave = 6; A.survived = 6; A.earned = 2000; g.ambush.finish(true, undefined, 'extract'); assert.match(text(g), /Banked 2500 points .* Personal best: wave 9 · 2500 banked · NEW BEST BANK\.$/);
    const sets4 = store.sets; g.reset(); g.play(); A.wave = 9; g.ambush.finish(false, undefined, 'self'); assert.match(text(g), /Personal best: wave 9 · 2500 banked\.$/, 'equalling the best wave is not a new best'); assert.equal(store.sets, sets4, 'and writes nothing');
    const h = await ambush(); h.amb.wave = 4; h.ambush.finish(false, undefined, 'self'); assert.match(text(h), /Personal best: wave 9 · 2500 banked\.$/, 'a new page load sees the stored best');
    // Story: the summary is untouched and nothing is written.
    const sets = store.sets, s = await game('story'); s.ambush.finish(false, undefined, 'self'); assert.doesNotMatch(text(s), /Personal best|First run/); assert.equal(store.sets, sets);
    // Storage missing, throwing, or corrupt: the run still ends with its summary and the next run works.
    globalThis.localStorage = undefined; const k = await ambush(); k.amb.wave = 7; k.ambush.finish(false, undefined, 'self'); assert.equal(k.state().state, 'ended'); assert.match(text(k), /You were killed in wave 7\. Nothing banked\. .*\d+m \d+s\.$/); assert.doesNotMatch(text(k), /Personal best|First run/); k.reset(); k.play(); k.run(1); assert.equal(k.state().state, 'playing');
    globalThis.localStorage = {getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('QuotaExceededError'); }}; const j = await ambush(); j.amb.wave = 2; j.ambush.finish(false, undefined, 'self'); assert.equal(j.state().state, 'ended'); assert.doesNotMatch(text(j), /Personal best|First run/);
    const bad = memoryStorage(); bad.setItem(BEST_KEY, '{"wave":"nine","banked":-1}'); globalThis.localStorage = bad; assert.equal(readBest(bad), null); const c = await ambush(); c.amb.wave = 2; c.ambush.finish(false, undefined, 'self'); assert.match(text(c), /First run recorded: wave 2 · 0 banked\.$/); assert.deepEqual(JSON.parse(bad.dump()[BEST_KEY]), {wave: 2, banked: 0});
    assert.deepEqual(recordBest({wave: 0, banked: -5}, memoryStorage()).best, {wave: 1, banked: 0}, 'clamped');
    assert.equal(recordBest({wave: 3, banked: 10}, null).best, null, 'no storage: nothing to show');
  } finally { delete globalThis.localStorage; }
  report.best = {key: BEST_KEY, stored: 'one JSON object {wave, banked}'};
});

// Story / Skirmish: the same 200 s scenario as T20, replayed against the trace recorded from the Build 09 source.
function aiTrace(g, seconds = 200) {
  const rows = []; let clock = 0; g.frame(0); g.press('KeyW');
  for (let i = 0; i < seconds * 60; i++) { if (i === 18 * 60) g.release('KeyW'); g.frame(clock += 1000 / 60);
    if (i % 120 === 119) rows.push({t: Math.round((i + 1) / 60), p: [+g.player.x.toFixed(3), +g.player.z.toFixed(3)], kills: g.kills(), stage: g.getStage(),
      e: enemies(g).map(a => [+a.g.position.x.toFixed(3), +a.g.position.z.toFixed(3), a.hp, a.ai?.state ?? null, a.ai?.role ?? null, a.crouch ? 1 : 0, a.gone ? 1 : 0]),
      a: g.actors.filter(a => a.team === 'ally' && !a.remote).map(a => [+a.g.position.x.toFixed(3), +a.g.position.z.toFixed(3), a.hp])}); }
  return rows;
}
await check('Story and Skirmish enemy AI unchanged by Build 11: 200 s of the real AI replays the Build 09 trace sample for sample, with 7 enemies and the original collision and occluder counts', async () => {
  const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  for (const mode of ['story', 'skirmish']) {
    const g = await createGame(); g.prepare({clearLane: false}); g.setMode(mode); g.reset(); g.play(); g.restoreAI(); g.set({hp: 1e9}); g.el('blood').checked = false; for (const a of g.actors) a.animate = a.visual.animate;
    const rows = aiTrace(g); assert.equal(rows.length, fixture[mode].rows.length);
    for (let i = 0; i < rows.length; i++) assert.deepEqual(rows[i], fixture[mode].rows[i], `${mode}: sample at ${rows[i].t} s differs from Build 09`);
    assert.equal(enemies(g).length, 7); assert.equal(g.solids.length, fixture[mode].solids); assert.equal(g.occluders.length, fixture[mode].occluders);
  }
  report.baseline = fixture.recordedFrom;
});

console.log(JSON.stringify({passed: results.length, checks: results, report, limitations: [
  'Headless: difficulty in play (whether 12 enemies at once is too much or too little for a human), the readability of the crate lines in combat and the frame cost of the ceiling need the Safari playtest and measurement (B8).',
  'Browser storage is a mock here; the real localStorage in Safari (normal and private windows) was not exercised in this suite.']}, null, 2));
