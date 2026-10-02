// A probe, not a suite: how Dehrun Terraces' Ambush presses on a player who stands in one place. For each hostile, when and
// from where it first comes into the player's sight within 15 m; how many are in sight at once; how long nobody is.
// Usage: STAND=top|topfirst|topall|first|ground|roof|square SECS=300 KILL=1 [OLD=<commit>] node tests/probe-pressure.mjs
// (Build 39; `OLD` plays an older build from its commit. It prints one JSON object: arrivals a minute, first contact after
// each wave's call, gaps, directions by part, how each came. A stand-in that stands still is not a player.)
// KILL: a hostile that has been in sight within 15 m for this many seconds in all is killed (the stand-in for the player's rifle).
globalThis.location = {search: ''};
import {createGame, projectRoot} from './sprint-harness.mjs';
import {oldBuild} from './old-build.mjs';
const OLD = process.env.OLD, build = OLD ? await oldBuild(OLD) : null, SECS = +(process.env.SECS || 300), KILL = +(process.env.KILL || 1.5), NEAR = 15;
const maps = await (build ? build.module('maps.js') : import(new URL('dist/maps.js', projectRoot))); await maps.loadMap('dehrun'); maps.selectMap('dehrun');
const A = await (build ? build.module('ambush.js') : import(new URL('dist/ambush.js', projectRoot)));
const g = await (build ? build.createGame() : createGame({})); g.prepare({clearLane: false}); await g.built.ready; g.el('blood').checked = false; g.setMode('ambush'); g.reset(); g.play(); g.restoreAI(); g.set({hp: 1e9}); let clock = 0; g.frame(0);
const STANDS = {topfirst: {at: [0, 6.6, 61.3], open: ['first']}, topall: {at: [0, 6.6, 61.3], open: ['first', 'ground', 'roof']}, top: {at: [0, 6.6, 61.3], open: []}, roof: {at: [0, 9.83, 62], open: ['roof']}, first: {at: [0, 3.4, 61.3], open: ['first']}, ground: {at: [0, .05, 61.3], open: ['first', 'ground']}, square: {at: [0, 0, 75], open: ['first', 'ground', 'square']}};
const stand = process.env.STAND || 'top', S = STANDS[stand]; for (const id of S.open) g.ambush.openGate(id);
const NAMES = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'], sectorOf = (dx, dz) => Math.round(((Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360) / 45) % 8;
const seenAt = new Map(), inSight = new Map(), arrivals = [], firstContact = [], sectors = Array(8).fill(0), kinds = {}; let wave = 0, waveT0 = 0, waveContact = false, t = 0;
const born = new Map(), travel = {}, switches = []; let capFrames = 0, lastQuad = null, lastAt = -99;
let framesWave = 0, sumIn = 0, engaged = 0, twoWays = 0, lull = 0, worstLull = 0, kills = 0; const lulls = [];
for (let f = 0; f < 60 * SECS; f++) { g.player.set(...S.at); g.set({hp: 1e9}); g.frame(clock += 1000 / 60); t = f / 60; const d = g.amb;
  if (d.phase === 'decision') g.ambush.decide(false);
  if (d.phase === 'wave' && d.wave !== wave) { wave = d.wave; waveT0 = t; waveContact = false; }
  let n = 0; const quads = new Set();
  for (const a of g.actors) { if (a.team !== 'enemy' || a.hp <= 0) continue; const p = a.g.position, k = a.index + ':' + a.life, dx = p.x - S.at[0], dz = p.z - S.at[2];
    if (!born.has(k)) born.set(k, {t, d: Math.hypot(dx, dz), way: a.ai?.way?.id ?? 'none', part: a.ai?.part || 'all', left: null});
    { const b = born.get(k); if (b.left == null && a.ai?.left >= 0) b.left = a.ai.left / 2; }
    if (!(a.seen && p.distanceTo(g.player) < NEAR)) continue; n++; const s = sectorOf(dx, dz); quads.add(Math.round(s / 2) % 4);
    if (!seenAt.has(k)) { seenAt.set(k, t); sectors[s]++; const kind = a.ai?.kind || 'rifle'; kinds[kind] = (kinds[kind] || 0) + 1; arrivals.push({t: +t.toFixed(1), wave, afterWaveStart: +(t - waveT0).toFixed(1), from: NAMES[s], kind, way: a.ai?.way?.id ?? null, role: a.ai?.role2 ?? a.ai?.part ?? null});
      { const b = born.get(k), w = b.way; (travel[w] ??= []).push(t - b.t); const qd = Math.round(s / 2) % 4; switches.push(lastQuad != null && qd !== lastQuad && t - lastAt < 8 ? 1 : 0); lastQuad = qd; lastAt = t; arrivals.at(-1).way = w; arrivals.at(-1).part = b.part; arrivals.at(-1).wayM = b.left; arrivals.at(-1).travel = +(t - b.t).toFixed(1); }
      if (!waveContact) { waveContact = true; firstContact.push(+(t - waveT0).toFixed(1)); } }
    const c = (inSight.get(k) || 0) + 1 / 60; inSight.set(k, c); if (c >= KILL) { a.hp = 0; a.dead = 999; a.diedAt = g.state().elapsed; g.ambush.kill(false); kills++; } }
  if (d.phase === 'wave') { framesWave++; sumIn += n; if (d.toSpawn > 0 && g.actors.filter(a => a.team === 'enemy' && a.hp > 0).length >= A.waveSpec(d.wave, d.squad).aliveCap) capFrames++; if (n > 0) { engaged++; if (quads.size >= 2) twoWays++; if (lull > 0) { lulls.push(lull); worstLull = Math.max(worstLull, lull); } lull = 0; } else lull += 1 / 60; } }
const q = (l, p) => l.length ? [...l].sort((a, b) => a - b)[Math.min(l.length - 1, Math.floor(l.length * p))] : null, r1 = v => v == null ? null : +v.toFixed(1);
const gaps = arrivals.slice(1).map((a, i) => a.t - arrivals[i].t), total = arrivals.length, top = Math.max(...sectors);
console.log(JSON.stringify({build: OLD || 'present', stand, seconds: SECS, killAfter: KILL, wavesReached: wave, arrivals: total, arrivalsAMinute: +(total / (SECS / 60)).toFixed(1), kills,
  firstContactAfterWaveStart: {each: firstContact, median: q(firstContact, .5)}, gapBetweenArrivals: {median: r1(q(gaps, .5)), p90: r1(q(gaps, .9)), longest: r1(Math.max(0, ...gaps))},
  inSightWithin15m: {mean: +(sumIn / Math.max(1, framesWave)).toFixed(2), shareOfWaveTimeWithSomeone: +(engaged / Math.max(1, framesWave)).toFixed(2), shareOfThatFromTwoSidesAtOnce: +(twoWays / Math.max(1, engaged)).toFixed(2)},
  lulls: {longest: r1(worstLull), over10s: lulls.filter(v => v > 10).length},
  parts: Object.fromEntries([...new Set(arrivals.map(a => a.part))].map(pt => { const l = arrivals.filter(a => a.part === pt); return [pt, {n: l.length, travelMedian: r1(q(l.map(a => a.travel), .5)), wayMetresMedian: r1(q(l.map(a => a.wayM).filter(v => v != null), .5)), from: Object.fromEntries(NAMES.map(nm => [nm, l.filter(a => a.from === nm).length]).filter(v => v[1]))}]; })),
  flankFromAnotherSideThanItsWavesPush: (() => { let other = 0, all = 0; for (const w of new Set(arrivals.map(a => a.wave))) { const push = arrivals.filter(a => a.wave === w && a.part === 'push'), side = {}; for (const a of push) side[a.from] = (side[a.from] || 0) + 1; const main = Object.entries(side).sort((u, v) => v[1] - u[1])[0]?.[0]; for (const a of arrivals.filter(a => a.wave === w && a.part === 'flank')) { all++; if (a.from !== main) other++; } } return all ? +(other / all).toFixed(2) : null; })(),
  travelSecondsByWay: Object.fromEntries(Object.entries(travel).map(([w, l]) => [w, {n: l.length, median: r1(q(l, .5)), p90: r1(q(l, .9))}])), shareOfWaveTimeHeldByTheCap: +(capFrames / Math.max(1, framesWave)).toFixed(2), shareOfArrivalsFromAnotherSideThanTheLastWithin8s: +(switches.reduce((a, b) => a + b, 0) / Math.max(1, switches.length)).toFixed(2),
  cameBy: g.amb.came,
  from: Object.fromEntries(NAMES.map((s, i) => [s, sectors[i]]).filter(v => v[1])), largestShare: +(top / Math.max(1, total)).toFixed(2), kinds,
  byWave: Object.fromEntries([...new Set(arrivals.map(a => a.wave))].map(w => [w, arrivals.filter(a => a.wave === w).map(a => `${a.afterWaveStart}s ${a.from}${a.kind === 'rifle' ? '' : ' ' + a.kind} ${a.part === 'all' ? a.way : a.part + ':' + a.way}`)]))}));
