// A probe, not a suite (Build 41): where the push of Dehrun Terraces' Ambush comes in along the northern approach, as
// positions. For every hostile of the push: where it started, where it crossed the line of the square's north wall
// (z 44: its x), where it came into the customs house (its x on the north face, or the face it came in by), and when.
// Usage: STAND=top|topfirst|first|ground|square SECS=240 KILL=1 [OLD=<commit>] node tests/probe-front.mjs
// (`OLD` plays an older build whole from its commit, with its own map.) It prints one JSON object. A stand-in that stands
// still and kills what has been in its sight for KILL seconds is not a player.
globalThis.location = {search: ''};
import {createGame, projectRoot} from './sprint-harness.mjs';
import {oldBuild} from './old-build.mjs';
const OLD = process.env.OLD, build = OLD ? await oldBuild(OLD) : null, SECS = +(process.env.SECS || 240), KILL = +(process.env.KILL || 1), NEAR = 15;
const maps = await (build ? build.module('maps.js') : import(new URL('dist/maps.js', projectRoot))); await maps.loadMap('dehrun'); maps.selectMap('dehrun');
export const WALL = 44, FACE = 53, HOUSE = {x: [-13, 13], z: [53, 71]}, SQUARE = {x: [-22, 22]};
export const STANDS = {top: {at: [0, 6.6, 61.3], open: []}, topfirst: {at: [0, 6.6, 61.3], open: ['first']}, first: {at: [0, 3.4, 61.3], open: ['first']}, ground: {at: [0, .05, 61.3], open: ['first', 'ground']}, square: {at: [0, .05, 75], open: ['first', 'ground', 'square']}};
// Plays `secs` of Ambush with the player held at a stand and returns what every hostile did. `g`: a game made on Dehrun.
// A hostile is killed once it has been in sight within 15 m for `kill` seconds, and not before it is inside the house or
// has been in sight for `patient` seconds: a stand-in that shot every one at the door would hide where the others come in.
export function follow(g, stand, secs, kill = 1, patient = 4) { const S = STANDS[stand]; g.prepare({clearLane: false}); g.el('blood').checked = false; g.setMode('ambush'); g.reset(); g.play(); g.restoreAI(); g.set({hp: 1e9}); let clock = 0; g.frame(0);
  for (const id of S.open) g.ambush.openGate(id); const seen = new Map(), all = new Map(); let wave = 0, waveT0 = 0;
  for (let f = 0; f < 60 * secs; f++) { g.player.set(...S.at); g.set({hp: 1e9}); g.frame(clock += 1000 / 60); const t = f / 60, d = g.amb;
    if (d.phase === 'decision') g.ambush.decide(false); if (d.phase === 'wave' && d.wave !== wave) { wave = d.wave; waveT0 = t; }
    for (const a of g.actors) { if (a.team !== 'enemy' || a.hp <= 0) continue; const p = a.g.position, k = a.index + ':' + a.life;
      let r = all.get(k); if (!r) all.set(k, r = {wave, born: +t.toFixed(2), after: +(t - waveT0).toFixed(1), part: a.ai?.part || 'all', way: a.ai?.way?.id ?? 'none', lane: a.ai?.way?.lane ?? null, start: [+p.x.toFixed(1), +p.z.toFixed(1)], cross: null, enter: null, last: [p.x, p.z]});
      // the line of the north wall, crossed southward between the square's side walls
      if (r.cross == null && r.last[1] < WALL && p.z >= WALL && Math.abs(p.x) < SQUARE.x[1] + 2) r.cross = {x: +p.x.toFixed(1), t: +(t - r.born).toFixed(1)};
      const inside = (x, z) => x > HOUSE.x[0] && x < HOUSE.x[1] && z > HOUSE.z[0] && z < HOUSE.z[1];
      if (r.enter == null && !inside(r.last[0], r.last[1]) && inside(p.x, p.z) && p.y < 2) { const [lx, lz] = r.last, face = lz <= HOUSE.z[0] ? 'north' : lz >= HOUSE.z[1] ? 'south' : lx <= HOUSE.x[0] ? 'west' : 'east'; r.enter = {face, at: +(face === 'north' || face === 'south' ? p.x : p.z).toFixed(1), t: +(t - r.born).toFixed(1)}; }
      r.last = [p.x, p.z];
      if (a.seen && p.distanceTo(g.player) < NEAR) { const c = (seen.get(k) || 0) + 1 / 60; seen.set(k, c); if (r.met == null) r.met = +(t - r.born).toFixed(1); if (c >= kill && (r.enter || stand === 'square' || c >= patient)) { a.hp = 0; a.dead = 999; a.diedAt = g.state().elapsed; g.ambush.kill(false); } } } }
  return [...all.values()].map(({last, ...r}) => r); }
// What the push did, in numbers: the crossings and the entries as positions, and how they are spread.
export function spread(list) { const push = list.filter(r => r.part === 'push' || r.part === 'all'), xs = push.filter(r => r.cross).map(r => r.cross.x), ins = push.filter(r => r.enter), north = ins.filter(r => r.enter.face === 'north').map(r => r.enter.at);
  const bins = (v, w) => { const m = {}; for (const x of v) { const k = Math.round(x / w) * w; m[k] = (m[k] || 0) + 1; } return Object.fromEntries(Object.entries(m).sort((a, b) => a[0] - b[0])); };
  const groups = (v, gap) => { const s = [...v].sort((a, b) => a - b), out = []; for (const x of s) { if (out.length && x - out.at(-1).hi <= gap) { out.at(-1).hi = x; out.at(-1).n++; } else out.push({lo: x, hi: x, n: 1}); } return out; };
  const most = g => g.length ? Math.max(...g.map(q => q.n)) / g.reduce((t, q) => t + q.n, 0) : null, sd = v => { if (!v.length) return null; const m = v.reduce((a, b) => a + b, 0) / v.length; return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length); };
  const cg = groups(xs, 4), eg = groups(north, 1.2), r1 = v => v == null ? null : +v.toFixed(2);
  // within a wave: how far apart the first three of the push crossed
  const waves = [...new Set(push.map(r => r.wave))].map(w => { const l = push.filter(r => r.wave === w && r.cross).sort((a, b) => a.born - b.born).slice(0, 3).map(r => r.cross.x); return l.length >= 2 ? Math.max(...l) - Math.min(...l) : null; }).filter(v => v != null);
  return {push: push.length, crossedTheWallLine: xs.length, crossingPlaces: cg.map(q => ({from: q.lo, to: q.hi, n: q.n})), crossingSpanMetres: xs.length ? r1(Math.max(...xs) - Math.min(...xs)) : null, crossingSd: r1(sd(xs)), largestShareAtOneCrossing: r1(most(cg)),
    firstThreeOfAWaveApartMetres: {each: waves.map(r1), median: waves.length ? r1([...waves].sort((a, b) => a - b)[waves.length >> 1]) : null},
    cameIntoTheHouse: ins.length, byFace: ins.reduce((m, r) => { m[r.enter.face] = (m[r.enter.face] || 0) + 1; return m; }, {}), northFaceEntries: eg.map(q => ({at: r1((q.lo + q.hi) / 2), n: q.n})), largestShareAtOneEntry: r1(most(eg)), entrySpanMetres: north.length ? r1(Math.max(...north) - Math.min(...north)) : null,
    starts: {x: bins(push.map(r => r.start[0]), 8), northOfTheWall: r1(push.filter(r => r.start[1] < WALL).length / Math.max(1, push.length))}, lanes: push.reduce((m, r) => { const k = r.lane || r.way; m[k] = (m[k] || 0) + 1; return m; }, {})}; }
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  const g = await (build ? build.createGame() : createGame({})); await g.built.ready; const stand = process.env.STAND || 'top', list = follow(g, stand, SECS, KILL), flank = list.filter(r => r.part === 'flank');
  console.log(JSON.stringify({build: OLD || 'present', stand, seconds: SECS, hostiles: list.length, ...spread(list), flank: {n: flank.length, crossedTheNorthWallLine: flank.filter(r => r.cross).length, starts: flank.reduce((m, r) => { const k = r.start[1] < WALL ? 'north' : 'elsewhere'; m[k] = (m[k] || 0) + 1; return m; }, {})},
    metWithin15m: {n: list.filter(r => r.met != null).length, pushMedianSeconds: (() => { const v = list.filter(r => r.part !== 'flank' && r.met != null).map(r => r.met).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : null; })()},
    each: process.env.EACH ? list : undefined}));
  process.exit(0); }
