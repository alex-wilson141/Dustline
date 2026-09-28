// Build 12 Ambush solo and purchase clarity: no AI squadmate exists in Ambush under any condition, Story and Skirmish keep
// their squad (Build 09 trace), rifles bought at a crate come with five magazines (within the rifle's reserve), field
// dressings are bought with N at a wave-scaled price and capped, the crate prompt states the trade-off in plain words from
// the live weapon data, and every HUD key hint shows the key that is really bound. Headless production code.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame, projectRoot} from './sprint-harness.mjs';

const {CLASSES} = await import(new URL('dist/combat.js', projectRoot));
const {AMBUSH, STATIONS, waveSpec, dressingPrice, magazinePrice, rifleMagazines, weaponTradeoff, weaponFacts, TRADEOFF_MIN} = await import(new URL('dist/ambush.js', projectRoot));
const FIXTURE = new URL('fixtures/story-skirmish-ai-b09.json', import.meta.url);
const results = [], report = {};
async function check(name, fn) { await fn(); results.push(name); }
const enemies = g => g.actors.filter(a => a.team === 'enemy');
const squad = g => g.actors.filter(a => a.team === 'ally' && !a.remote);
const distTo = (g, a) => Math.hypot(a.g.position.x - g.player.x, a.g.position.z - g.player.z);
const letter = code => code.replace(/^Key/, '');

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
const openAll = g => { g.amb.points = 1e6; for (const [x, z] of [[-26.5, 3.6], [-39, -8], [-26, -22.4]]) { g.goTo(x, z); assert(g.ambush.interact(), `bought at ${x},${z}`); } };

await check('Ambush is solo: no AI squadmate exists in Ambush at the start, during four waves, after a restart or after switching modes back and forth; enemies only ever see the player; the squad panel is hidden; Story and Skirmish get the same three squadmates back at their original indices', async () => {
  const g = await game('story'); const original = squad(g); assert.equal(original.length, 3); assert.deepEqual(original.map(a => g.actors.indexOf(a)), [0, 1, 2]);
  const remote = g.actors.find(a => a.remote); assert(remote);
  const noSquad = why => { assert.equal(squad(g).length, 0, `no AI squadmate ${why}`); for (const a of original) assert(!g.actors.includes(a) && !g.scene.children.includes(a.g), `${why}: detached from actors and scene`); assert(g.actors.includes(remote), 'the co-op teammate actor is never detached'); };
  g.setMode('ambush'); g.reset(); g.play(); g.set({hp: 1e9}); noSquad('after the Ambush reset'); assert(g.doc.body.classList.contains('solo'), 'body.solo hides the squad panel');
  // Four waves, every enemy killed 1.5 s after engaging: no squadmate appears, no enemy ever targets anything but the player.
  const A = g.amb, en = enemies(g); let frames = 0; A.points = 1e5;
  g.run(900, () => { frames++; if (A.phase === 'decision') g.ambush.decide(false); noSquad('during play'); const e = g.state().elapsed, T = g.ambush.aiT();
    for (const a of en) if (a.hp > 0) { if (a.seen) assert.equal(a.seen.a, null, 'an enemy sees only the player'); const d = distTo(g, a); if (a.killAt == null && ((a.ai.firing && d <= T.fightRange) || d <= AMBUSH.holdRange + 1)) a.killAt = e + 1.5; if (a.killAt != null && e >= a.killAt) { a.hp = 0; a.dead = 998; a.killAt = null; } } else a.killAt = null;
    if (A.wave > 4) return false; });
  assert(A.survived >= 4 && frames > 1000, `four waves played (${A.survived})`); const wavesPlayed = A.survived;
  g.reset(); g.play(); g.set({hp: 1e9}); noSquad('after a restart'); g.run(20); noSquad('20 s into the restarted run');
  g.setMode('story'); g.reset(); assert.deepEqual(squad(g), original, 'Story: the same three squadmates back'); assert.deepEqual(original.map(a => g.actors.indexOf(a)), [0, 1, 2], 'at their original indices'); assert(original.every(a => g.scene.children.includes(a.g))); assert(!g.doc.body.classList.contains('solo'));
  assert.equal(g.actors.filter(a => !a.remote).length, 10, 'the co-op snapshot shape');
  g.setMode('skirmish'); g.reset(); g.play(); g.run(20); assert.deepEqual(squad(g), original, 'Skirmish: squad present'); assert(squad(g).every(a => a.hp > 0));
  g.setMode('ambush'); g.reset(); g.play(); g.set({hp: 1e9}); noSquad('after Skirmish'); g.run(20); noSquad('20 s later');
  g.setMode('story'); g.reset(); assert.deepEqual(squad(g), original);
  const src = fs.readFileSync(new URL('dist/game.js', projectRoot), 'utf8'); assert(!/mode==='ambush'\?safeSpot\(AMBUSH\.start/.test(src), 'no Ambush regroup branch remains');
  report.solo = {squadInAmbush: 0, wavesPlayed};
});

// Story / Skirmish: the same 200 s scenario as T20/T21, including every squadmate's position and HP, against the Build 09 trace.
function aiTrace(g, seconds = 200) {
  const rows = []; let clock = 0; g.frame(0); g.press('KeyW');
  for (let i = 0; i < seconds * 60; i++) { if (i === 18 * 60) g.release('KeyW'); g.frame(clock += 1000 / 60);
    if (i % 120 === 119) rows.push({t: Math.round((i + 1) / 60), p: [+g.player.x.toFixed(3), +g.player.z.toFixed(3)], kills: g.kills(), stage: g.getStage(),
      e: enemies(g).map(a => [+a.g.position.x.toFixed(3), +a.g.position.z.toFixed(3), a.hp, a.ai?.state ?? null, a.ai?.role ?? null, a.crouch ? 1 : 0, a.gone ? 1 : 0]),
      a: squad(g).map(a => [+a.g.position.x.toFixed(3), +a.g.position.z.toFixed(3), a.hp])}); }
  return rows;
}
await check('Story and Skirmish squads and enemies unchanged by Build 12: 200 s of the real AI replays the Build 09 trace sample for sample (three squadmates included)', async () => {
  const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  for (const mode of ['story', 'skirmish']) {
    const g = await createGame(); g.prepare({clearLane: false}); g.setMode(mode); g.reset(); g.play(); g.restoreAI(); g.set({hp: 1e9}); g.el('blood').checked = false; for (const a of g.actors) a.animate = a.visual.animate;
    const rows = aiTrace(g); assert.equal(rows.length, fixture[mode].rows.length);
    for (let i = 0; i < rows.length; i++) assert.deepEqual(rows[i], fixture[mode].rows[i], `${mode}: sample at ${rows[i].t} s differs from Build 09`);
    assert.equal(squad(g).length, 3); assert.equal(enemies(g).length, 7);
  }
  report.baseline = fixture.recordedFrom;
});

await check('a rifle bought at a crate comes with five magazines, never more reserve than the rifle can carry (carbine, CQB and DMR 1 + 4; automatic rifle 1 + 3 because its reserve holds three drums); the prompt says so and the price is deducted', async () => {
  const expected = {medic: [30, 120, 5], assault: [30, 120, 5], marksman: [20, 80, 5], support: [75, 225, 4]};
  const g = await ambush(), A = g.amb; openAll(g); assert.equal(AMBUSH.rifleMagazines, 5);
  for (const st of STATIONS) { g.setClass(st.weapon === 'assault' ? 'medic' : 'assault'); g.reset(); g.play(); g.set({hp: 1e9}); openAll(g); g.goTo(st.at[0], st.at[1] + 1.4); const c = CLASSES[st.weapon], [cap, reserve, mags] = expected[st.weapon];
    assert.equal(rifleMagazines(c), mags); assert.match(g.prompt(), new RegExp(`^E · BUY ${c.weapon} · ${st.price} PTS · ${mags} MAGAZINES\\n`));
    A.points = st.price; assert.equal(g.ambush.interact(), true); assert.equal(A.points, 0); const w = g.ambush.weapon(); assert.equal(w.config, c); assert.deepEqual([w.ammo, w.reserve], [cap, reserve], `${st.weapon}: ${mags} magazines`); assert(w.reserve <= c.reserve); }
  report.magazinesOnPurchase = expected;
});

await check('field dressings: N at any crate buys one for 150 points at wave 1 rising like magazines (210 at wave 5, 290 at 10, 380 from 16); deducts exactly the price shown, refused below it, capped at 5 in the kit; a bought dressing heals 50 with H', async () => {
  assert.deepEqual([1, 5, 10, 16, 30].map(dressingPrice), [150, 210, 290, 380, 380]); let prev = 0; for (let w = 1; w <= 30; w++) { const p = dressingPrice(w); assert(p >= prev && p % 10 === 0 && p === Math.ceil(AMBUSH.dressingBase * Math.min(AMBUSH.magWaveCap, 1 + AMBUSH.magWaveStep * (w - 1)) / 10) * 10); prev = p; }
  const g = await ambush(), A = g.amb, st = STATIONS[0]; g.goTo(st.at[0], st.at[1] + 1.4); assert.equal(g.ambush.bandages(), CLASSES.assault.bandages);
  A.points = 149; assert.match(g.prompt(), /N · FIELD DRESSING · 150 PTS \(NEED 1 MORE\)$/); assert.equal(g.ambush.buyDressing(), false); assert.deepEqual([A.points, g.ambush.bandages()], [149, 2]);
  A.points = 150; const shown = Number(g.prompt().match(/N · FIELD DRESSING · (\d+) PTS/)[1]); g.press(g.ambush.keys.dressingBuy); assert.deepEqual([150 - A.points, g.ambush.bandages()], [shown, 3], 'the N key buys one at the price shown');
  A.points = 1e4; assert.equal(g.ambush.buyDressing(), true); assert.equal(g.ambush.buyDressing(), true); assert.equal(g.ambush.bandages(), AMBUSH.dressingMax); const pts = A.points;
  assert.match(g.prompt(), /DRESSINGS 5\/5\n.*N · FIELD DRESSING · 150 PTS \(KIT FULL\)$/); assert.equal(g.ambush.buyDressing(), false); assert.equal(A.points, pts, 'capped: nothing charged'); assert.equal(g.el('notice').textContent, 'DRESSING KIT FULL');
  A.wave = 10; A.points = 289; assert.match(g.prompt(), /N · FIELD DRESSING · 290 PTS/); g.ambush.bandages(); g.set({hp: 1e9});
  // Use one: H heals 50 after 3.2 s and consumes a dressing.
  g.set({hp: 40}); g.press(g.ambush.keys.heal); assert(g.state().healing > 0, 'dressing applied'); g.run(3.5); assert.equal(g.ambush.hp(), 90); assert.equal(g.ambush.bandages(), 4);
  assert(A.bought.filter(b => b === 'dressing').length === 3);
  report.dressings = {prices: [1, 5, 10, 16].map(w => [w, dressingPrice(w)]), kitMax: AMBUSH.dressingMax};
});

await check('the trade-off line: for every ordered pair of rifles it is the two largest relative differences among damage, rate of fire, magazine and reload (fire mode counts as 50 %) that reach 10 %, in fixed order, at most two phrases; it follows the live data', async () => {
  const facts = c => ({damage: c.damage, rpm: Math.round(60 / c.interval), mag: c.capacity, auto: !!c.automatic, reload: c.reload});
  const expect = (c, h) => { const a = facts(c), b = facts(h), r = (x, y) => (x - y) / y;
    const items = [[0, Math.abs(r(a.damage, b.damage)), r(a.damage, b.damage) > 0 ? 'MORE DAMAGE' : 'LESS DAMAGE'], [1, Math.abs(r(a.rpm, b.rpm)), r(a.rpm, b.rpm) > 0 ? 'FASTER FIRE' : 'SLOWER FIRE'], [2, Math.abs(r(a.mag, b.mag)), r(a.mag, b.mag) > 0 ? 'BIGGER MAGAZINE' : 'SMALLER MAGAZINE'], [3, a.auto === b.auto ? 0 : .5, a.auto ? 'FULL-AUTO' : 'SEMI-AUTO'], [4, Math.abs(r(a.reload, b.reload)), r(a.reload, b.reload) > 0 ? 'SLOWER RELOAD' : 'FASTER RELOAD']];
    return items.filter(i => i[1] >= .1).sort((u, v) => v[1] - u[1]).slice(0, 2).sort((u, v) => u[0] - v[0]).map(i => i[2]).join(' · '); };
  const ids = Object.keys(CLASSES), table = {};
  for (const s of ids) for (const h of ids) { const t = weaponTradeoff(CLASSES[s], CLASSES[h]); table[`${s} vs ${h}`] = t; assert.equal(t, expect(CLASSES[s], CLASSES[h]), `${s} for sale while holding ${h}`);
    const phrases = t ? t.split(' · ') : []; assert(phrases.length <= 2, 'at most two phrases'); for (const p of phrases) assert(p.split(' ').length <= 2 && /^[A-Z -]+$/.test(p), `plain words: ${p}`); if (s === h) assert.equal(t, ''); }
  assert.equal(table['marksman vs assault'], 'MORE DAMAGE · SLOWER FIRE'); assert.equal(table['assault vs marksman'], 'LESS DAMAGE · FASTER FIRE'); assert.equal(table['support vs assault'], 'BIGGER MAGAZINE · SLOWER RELOAD'); assert.equal(table['medic vs assault'], 'FASTER FIRE · FASTER RELOAD');
  assert.equal(TRADEOFF_MIN, .1); assert.deepEqual(weaponFacts(CLASSES.assault), {damage: 38, rpm: 571, mag: 30, reserve: 180, auto: true, reload: 2.45});
  // Live data: shrink the automatic rifle's drum and its "bigger magazine" disappears; restore.
  const saved = CLASSES.support.capacity; CLASSES.support.capacity = 30; assert.doesNotMatch(weaponTradeoff(CLASSES.support, CLASSES.assault), /MAGAZINE/); assert.equal(weaponTradeoff(CLASSES.support, CLASSES.assault), expect(CLASSES.support, CLASSES.assault)); CLASSES.support.capacity = saved;
  // In the prompt: sale block (buy line, trade-off), blank line, your kit (two lines); no bracketed numbers anywhere.
  const g = await ambush(); openAll(g); g.goTo(STATIONS[3].at[0], STATIONS[3].at[1] + 1.4); const lines = g.prompt().split('\n');
  assert.equal(lines.length, 5); assert.equal(lines[1], 'BIGGER MAGAZINE · SLOWER RELOAD'); assert.equal(lines[2], ''); assert.match(lines[3], /^YOUR MK4 CARBINE · RESERVE 180\/180 · DRESSINGS 2\/5$/); assert.match(lines[4], /^B · MAGAZINE \(30 RDS\) · 70 PTS \(RESERVE FULL\)   N · FIELD DRESSING · 150 PTS$/); assert.doesNotMatch(g.prompt(), /\([+−]\d/, 'no bracketed stat differences');
  report.tradeoffs = table;
});

await check('key hints show the bound keys: the dressing indicator in the vitals panel carries a keycap with the healing key and is not hidden behind the map; reload, squad order, extract/stay and crate hints all read the same key map; pressing the shown key does the action and another key does not', async () => {
  const g = await ambush(), K = g.ambush.keys; assert.deepEqual(K, {reload: 'KeyR', aim: 'KeyF', crouch: 'KeyC', interact: 'KeyE', ammo: 'KeyB', dressingBuy: 'KeyN', heal: 'KeyH', squad: 'KeyQ', extract: 'KeyX', stay: 'KeyV', map: 'KeyM'});
  g.set({hp: 60}); g.run(.3); assert.equal(g.el('medical').innerHTML, `<kbd>${letter(K.heal)}</kbd> 2 DRESSINGS`, 'the vitals panel shows the healing key on the dressing count');
  const css = fs.readFileSync(new URL('dist/style.css', projectRoot), 'utf8'); assert(!/#stance,#medical\{display:none/.test(css) && /#medical\{font-size/.test(css) && /^kbd\{|\nkbd\{/.test(css), 'the dressing line is shown in play and keycaps are styled');
  g.press('KeyJ'); assert.equal(g.state().healing, 0, 'an unbound key does nothing'); g.press(K.heal); assert(g.state().healing > 0, 'the shown key applies a dressing'); g.run(3.5); assert.equal(g.ambush.hp(), 110 > 100 ? 100 : 110);
  assert.match(g.el('reload').textContent, new RegExp(`· ${letter(K.reload)} TO RELOAD$`)); assert.equal(g.el('order-key').textContent, letter(K.squad));
  const html = fs.readFileSync(new URL('dist/index.html', projectRoot), 'utf8'); assert(/<kbd id="order-key">/.test(html) && /H Dressing/.test(html) && /B Magazine · N Dressing \(Ambush\)/.test(html));
  const A = g.amb; A.phase = 'decision'; A.survived = 5; A.earned = 100; A.timer = 10; g.ambush.hud(); assert.match(g.el('decision-extract').textContent, new RegExp(`^${letter(K.extract)} · EXTRACT NOW`)); assert.match(g.el('decision-stay').textContent, new RegExp(`^${letter(K.stay)} · STAY`)); A.phase = 'break'; A.timer = 5;
  g.goTo(STATIONS[0].at[0], STATIONS[0].at[1] + 1.4); const p = g.prompt(); assert.match(p, new RegExp(`^${letter(K.interact)} · BUY`)); assert.match(p, new RegExp(`\n${letter(K.ammo)} · MAGAZINE .*   ${letter(K.dressingBuy)} · FIELD DRESSING`));
  const w = g.ambush.weapon(); w.reserve = 0; A.points = 1000; g.press(K.ammo); assert.deepEqual([w.reserve, A.points], [30, 930], 'the shown magazine key buys'); g.press(K.dressingBuy); assert.deepEqual([g.ambush.bandages(), A.points], [2, 780], 'the shown dressing key buys');
  g.press(K.interact); assert.equal(g.ambush.gunId(), 'medic', 'the shown buy key buys the rifle');
  report.keys = Object.fromEntries(Object.entries(K).map(([k, v]) => [k, letter(v)]));
});

console.log(JSON.stringify({passed: results.length, checks: results, report, limitations: [
  'Headless: whether the solo curve is hard but survivable for a human, the readability of the plain-words trade-off and the keycaps in play need the Safari playtest; frame cost is measured separately (B9).',
  'The healing-key check presses the bound key through the harness event path, not a real keyboard.']}, null, 2));
