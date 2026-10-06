// Build 41 (T52): the push of Dehrun Terraces' Ambush comes from the north on a front, measured as positions and against
// Build 40 played on the spot from its commit: where each push hostile started, where it crossed the line of the square's
// north wall and where it came into the customs house. Before, every one crossed by the 2 m of the gateway and most came in
// by the one door; now they cross at three places 24 m apart and come in by the door and four windows, several places at
// the same time and not one after another; the push still comes from the north and the flank from elsewhere; the map has
// the two low stretches and their ladders, and they are ways in for hostiles and no way out for a player; the pressure is
// what it was; Kohar Valley has none of it.
// Headless: the real game and AI with a stand-in that stands still and kills what has been in its sight for a second.
// It is not a player, and what a spread looks like in play is for the user's eyes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
globalThis.location = {search: ''};
import {createGame, projectRoot} from './sprint-harness.mjs';
import {oldBuild} from './old-build.mjs';
import {follow, spread, WALL} from './probe-front.mjs';

const SOURCE = process.env.DUSTLINE_GAME_SOURCE ? new URL('file://' + process.env.DUSTLINE_GAME_SOURCE) : undefined;
const ONLY = process.env.DUSTLINE_T52_ONLY?.split(','), BEFORE = '934c42d';   // Build 40
const results = [], report = {};
async function check(tag, name, fn) { if (ONLY && !ONLY.includes(tag)) return; await fn(); results.push(name); }
const maps = await import(new URL('dist/maps.js', projectRoot)); const DEHRUN = await maps.loadMap('dehrun'); maps.selectMap('dehrun');
const P = DEHRUN.ambush.push, LANES = P.lanes;
const game = async () => { maps.selectMap('dehrun'); const g = await createGame(SOURCE ? {sourcePath: SOURCE} : {}); await g.built.ready; return g; };
const places = (xs, gap = 4) => { const s = [...xs].sort((a, b) => a - b), out = []; for (const x of s) { if (out.length && x - out.at(-1).at(-1) <= gap) out.at(-1).push(x); else out.push([x]); } return out; };
const SECS = 170; let now = null, then = null;
const played = async stand => (now ??= {})[stand] ??= follow(await game(), stand, SECS);
const before = async stand => { if (!(then ??= {})[stand]) { const b = await oldBuild(BEFORE), m = await b.module('maps.js'); await m.loadMap('dehrun'); m.selectMap('dehrun'); const g = await b.createGame(); await g.built.ready; then[stand] = follow(g, stand, SECS); maps.selectMap('dehrun'); } return then[stand]; };

await check('front', 'the push crosses the square\'s north wall on a front and not by one place: played for 170 s with the player on the ground floor and again on the top floor, the push\'s hostiles cross the line of the north wall at three places (over the wall west of the gateway, by the gateway, over the wall east of it) 24 m from end to end, no place taking more than half of them, where in Build 40 played the same way every one crossed within the 2 m of the gateway; the first three of a wave cross 15 m or more apart (1 to 2 m before); and in three waves of four at least two places 15 m apart are crossed within eight seconds of each other, so that the front is there at one time and not a place at a time', async () => {
  for (const stand of ['ground', 'top']) { const list = await played(stand), s = spread(list), old = spread(await before(stand));
    assert(s.crossedTheWallLine >= 12, `${stand}: only ${s.crossedTheWallLine} of the push crossed the wall's line`); assert.equal(s.crossingPlaces.length, 3, `${stand}: crossed at ${JSON.stringify(s.crossingPlaces)}`);
    assert(s.crossingSpanMetres >= 20, `${stand}: the crossings span ${s.crossingSpanMetres} m`); assert(s.largestShareAtOneCrossing <= .5, `${stand}: ${s.largestShareAtOneCrossing} of the push crossed at one place`); assert(s.crossingSd >= 7, `${stand}: spread ${s.crossingSd} m`);
    for (const pl of s.crossingPlaces) assert(pl.n >= 3, `${stand}: a crossing with ${pl.n}: ${JSON.stringify(s.crossingPlaces)}`);
    assert(s.firstThreeOfAWaveApartMetres.median >= 15, `${stand}: a wave's first three crossed ${s.firstThreeOfAWaveApartMetres.median} m apart`);
    // Before: one place.
    assert(old.crossedTheWallLine >= 10); assert.equal(old.crossingPlaces.length, 1, `Build 40 crossed at ${JSON.stringify(old.crossingPlaces)}`); assert(old.crossingSpanMetres <= 4); assert.equal(old.largestShareAtOneCrossing, 1); assert(old.firstThreeOfAWaveApartMetres.median <= 3);
    // At one time: within a wave, two places 15 m apart crossed within eight seconds of each other.
    const push = list.filter(r => r.part === 'push' && r.cross), waves = [...new Set(push.map(r => r.wave))]; let together = 0;
    for (const w of waves) { const l = push.filter(r => r.wave === w).map(r => ({t: r.born + r.cross.t, x: r.cross.x})); if (l.some(a => l.some(b => Math.abs(a.x - b.x) >= 15 && Math.abs(a.t - b.t) <= 8))) together++; }
    assert(waves.length >= 3, `${stand}: ${waves.length} waves`); assert(together / waves.length >= .75, `${stand}: the front was there at one time in ${together} of ${waves.length} waves`);
    report[stand] = {now: {crossings: s.crossingPlaces, span: s.crossingSpanMetres, sd: s.crossingSd, largestShare: s.largestShareAtOneCrossing, firstThreeApart: s.firstThreeOfAWaveApartMetres.median, wavesWithTheFrontAtOneTime: `${together}/${waves.length}`}, build40: {crossings: old.crossingPlaces, span: old.crossingSpanMetres, sd: old.crossingSd, largestShare: old.largestShareAtOneCrossing, firstThreeApart: old.firstThreeOfAWaveApartMetres.median}}; }
});

await check('entries', 'the push comes into the house across its north face and not by one door: its hostiles enter by the north street door and by four barred windows of the north face (x -6.2, -0.5, 7 and 11) which they break, 17 m from end to end, no entry taking more than two in five, every one by the north face, where Build 40 sent two in three by the one door on the top floor and every one by it on the ground floor; each lane is used and by about as many; every hostile of a lane comes in by that lane\'s own entry', async () => {
  for (const stand of ['ground', 'top']) { const list = await played(stand), s = spread(list), old = spread(await before(stand));
    assert(s.cameIntoTheHouse >= 12, `${stand}: ${s.cameIntoTheHouse} came in`); assert.deepEqual(Object.keys(s.byFace), ['north'], `${stand}: came in by ${JSON.stringify(s.byFace)}`);
    assert(s.northFaceEntries.length === 5 && [-6.2, -.5, 3, 7, 11].every((x, i) => Math.abs(s.northFaceEntries[i].at - x) <= .3), `${stand}: entries ${JSON.stringify(s.northFaceEntries)}`); for (const e of s.northFaceEntries) assert(e.n >= 2, `${stand}: an entry with ${e.n}: ${JSON.stringify(s.northFaceEntries)}`); assert(s.largestShareAtOneEntry <= .4, `${stand}: ${s.largestShareAtOneEntry} by one entry`); assert(s.entrySpanMetres >= 16);
    assert(old.largestShareAtOneEntry >= .5, `Build 40: ${old.largestShareAtOneEntry} by one entry`); assert(old.northFaceEntries.length <= 3);
    const used = LANES.map(l => list.filter(r => r.lane === l.id).length); assert(Math.min(...used) >= 2, `${stand}: lanes used ${used}`); assert(Math.max(...used) - Math.min(...used) <= 2, `${stand}: lanes used ${used}`);
    // A lane's hostile takes the lane's entry (to .8 m), and the lane's crossing.
    for (const r of list.filter(r => r.lane && r.enter)) { const l = LANES.find(q => q.id === r.lane); assert.equal(r.enter.face, 'north'); assert(Math.abs(r.enter.at - l.enter) <= .8, `${stand}: a hostile of lane ${l.id} came in at ${r.enter.at}, not ${l.enter}`);
      if (r.cross) assert(l.cross === 'gateway' ? Math.abs(r.cross.x) <= 2.5 : Math.abs(r.cross.x) >= 7, `${stand}: a hostile of lane ${l.id} (${l.cross}) crossed at ${r.cross.x}`); }
    (report[stand] ??= {}).entries = {now: s.northFaceEntries, largestShare: s.largestShareAtOneEntry, build40: old.northFaceEntries, build40LargestShare: old.largestShareAtOneEntry, lanes: Object.fromEntries(LANES.map((l, i) => [l.id, used[i]]))}; }
});

await check('lane', 'a hostile keeps its lane where the lane\'s way has no place for it: one of a window\'s lane set down on the threshold of the north street door, which is shut to its way (it has no way from there in its own field), is still of its lane half a second later, goes on to its own window and comes in by it, not by the door it stands at', async () => {
  const g = await game(); g.prepare({clearLane: false}); g.el('blood').checked = false; g.setMode('ambush'); g.reset(); g.play(); g.restoreAI(); g.set({hp: 1e9}); let clock = 0; g.frame(0); for (const id of ['first', 'ground']) g.ambush.openGate(id);
  const at = [1, .05, 67], step = () => {   /* in the south hall: out of sight of the north door, so that the hostile goes on and does not stand and fire */ g.player.set(...at); g.set({hp: 1e9}); g.frame(clock += 1000 / 60); }; let one = null;
  for (let f = 0; f < 60 * 40 && !one; f++) { step(); one = g.actors.find(a => a.team === 'enemy' && a.hp > 0 && a.ai?.way?.lane === 'west') || null; } assert(one, 'no hostile of the lane in forty seconds');
  for (const a of g.actors) if (a.team === 'enemy' && a !== one) { a.hp = 0; a.dead = 999; a.gone = true; a.g.visible = false; } g.amb.toSpawn = 0;
  const L = g.ambush.layers, lane = LANES.find(l => l.id === 'west'), way = one.ai.way, F = g.ambush.field('player', way), door = L.nearest(3, 52.5, 0, .6); assert(door && F.far[door.id] < 0, 'the door\'s threshold has a way in the lane\'s field: the case is not the one meant'); assert(L.onto(F, door) && F.far[L.onto(F, door).id] >= 0);
  one.g.position.set(door.x, door.y, door.z); one.route = []; one.climb = one.fall = null; Object.assign(one.ai, {path: [], routeAt: 0, leftAt: 0, far: true, nearSince: null, used: null});
  for (let f = 0; f < 30; f++) step(); assert.equal(one.ai.way, way, `half a second on the threshold and its way is ${one.ai.way?.id ?? 'none'}`);
  let came = null, last = [one.g.position.x, one.g.position.z]; const inside = (x, z) => x > -13 && x < 13 && z > 53 && z < 71;
  for (let f = 0; f < 60 * 25 && !came && one.hp > 0; f++) { step(); const p = one.g.position; if (!inside(...last) && inside(p.x, p.z)) came = p.x; last = [p.x, p.z]; }
  assert(came != null, 'it never came in'); assert(Math.abs(came - lane.enter) <= .8, `it came in at x ${came.toFixed(1)}, not by its window at ${lane.enter}`); report.lane = {setDownAt: [door.x, door.z], cameInAt: +came.toFixed(1)};
});

await check('north', 'the push is the north\'s and the flank is not: every hostile of the push starts north of the square\'s wall, within fifty degrees of north of where the player stands and 35 m or more away, in its lane\'s own stretch nine times in ten, from three places or more in each stretch and no more than six in ten from any one; the flankers start elsewhere (south, east and west) nine times in ten and do not cross the north wall\'s line; the wave is called as a push from the north; and the stand-in meets the middle hostile of the push no more than six seconds later than in Build 40 (four lanes of five climb a wall and a window), and as many of them', async () => {
  for (const stand of ['ground', 'top']) { const list = await played(stand), push = list.filter(r => r.part === 'push'), flank = list.filter(r => r.part === 'flank'), at = stand === 'ground' ? [0, 61.3] : [0, 61.3];
    assert(push.length >= 12 && flank.length >= 6, `${stand}: ${push.length} push, ${flank.length} flank`);
    for (const r of push) { const [x, z] = r.start, bearing = (Math.atan2(x - at[0], -(z - at[1])) * 180 / Math.PI + 360) % 360, off = Math.min(bearing, 360 - bearing); assert(z < WALL, `${stand}: a push hostile started at ${r.start}`); assert(off <= P.front + 1, `${stand}: a push hostile started ${off.toFixed(0)} degrees off north`); assert(Math.hypot(x - at[0], z - at[1]) >= 35 - .01); }
    const own = push.filter(r => { const l = LANES.find(q => q.id === r.lane); return l && r.start[0] >= l.band[0] - 2 && r.start[0] <= l.band[1] + 2; }).length; assert(own / push.length >= .85, `${stand}: ${own} of ${push.length} started in their lane's stretch`);
    for (const side of [[-40, -7], [7, 40]]) { const mine = push.filter(r => r.start[0] >= side[0] && r.start[0] <= side[1]).map(r => r.start.join()), from = new Set(mine), most = Math.max(...[...from].map(q => mine.filter(m => m === q).length)); assert(from.size >= 3, `${stand}: the stretch ${side} was started from at ${[...from]}`); assert(most / mine.length <= .6, `${stand}: ${most} of ${mine.length} in the stretch ${side} started from one spot (${[...from]})`); }
    assert(flank.filter(r => r.start[1] >= WALL - 4 || Math.abs(r.start[0]) > 30).length / flank.length >= .85, `${stand}: flankers started at ${flank.map(r => r.start.join())}`); assert(flank.filter(r => r.cross).length <= 1, `${stand}: flankers crossed the north wall`);
    const met = l => { const v = l.filter(r => r.part !== 'flank' && r.met != null).map(r => r.met).sort((a, b) => a - b); return {n: v.length, median: v[v.length >> 1]}; }, a = met(list), b = met(await before(stand));
    assert(a.median <= b.median + 6, `${stand}: the push is met ${a.median} s after it starts (Build 40: ${b.median})`);   /* four lanes of five climb a wall and a window: about 4 s on the ground floor, 2 s on the top floor */ assert(a.n >= b.n - 4, `${stand}: ${a.n} of the push met (Build 40: ${b.n})`); (report[stand] ??= {}).met = {now: a, build40: b}; }
  assert.equal(P.from, 0); assert.equal(P.every, 2, 'the push and the flank still go turn about'); assert.deepEqual(P.flank, [180, 100, 260, 140, 220]);
  const g = await game(); g.prepare({clearLane: false}); g.setMode('ambush'); g.reset(); g.play(); g.ambush.startWave(2); assert.match(g.el('radiotext').textContent, /Wave 2, Kareth Brigade, \d+ of them: a push from the north on a wide front and more working round you\./); g.frame(16); g.frame(200); assert.match(g.el('objtext').textContent, /Kareth left · a push from the north, a flank round you/);
});

await check('map', 'the map gives the front its ways: two stretches of the square\'s north wall stand 2.2 m, west and east of the gateway, with a ladder outside each; in the hostiles\' navigation each ladder is a low one that leads from the block onto the wall and down into the square, and the gateway and the north door are still ways; a player\'s body in the square cannot get out over either stretch (too high to pull up on) but can come in by the ladder; five lanes, the first by the gateway and the door, each of the others over the wall and by a window of its own; nothing of it on Kohar Valley, which names no push', async () => {
  const g = await game(), L = g.ambush.layers, B = DEHRUN.block, low = B.walls.filter(w => w.axis === 'x' && w.at === 44 && w.height === 2.2); assert.deepEqual(low.map(w => [w.from, w.to]), [[-15.5, -12.5], [8.5, 11.5]]);
  const ladders = B.ladders.filter(l => Math.abs(l.z - 43.7) < .01); assert.deepEqual(ladders.map(l => l.x), [-14, 10]); for (const l of ladders) { assert.deepEqual(l.dir, [0, -1]); assert(l.top - l.bottom < 5, 'not a low ladder'); assert(Math.abs(l.top - 2.28) < .01); }
  // The navigation: from the block north of the wall to the square south of it, with the gateway shut, by a ladder.
  const far = (to, opts) => L.field({x: to[0], y: to[1], z: to[2]}, opts), node = (x, z) => L.nearest(x, z, 0, 1.5), gate = L.masked([{min: [-1.8, 0, 43.4], max: [1.8, 3, 44.6]}]);
  for (const x of [-14, 10]) { const inside = [x, 0, 47], F = far(inside, {ladders: 'low', vaults: 'none', mask: gate}), out = node(x, 40); assert(out && F.far[out.id] >= 0 && F.far[out.id] / 2 < 16, `no way over the wall at x ${x} (${out && F.far[out.id] / 2} m)`);
    const none = far(inside, {ladders: false, vaults: 'none', mask: gate}); assert(none.far[out.id] < 0 || none.far[out.id] / 2 > 40, `x ${x}: a way without the ladder`);
    // one way: from inside the square nothing leads back out over the stretch
    const back = far([x, 0, 40], {ladders: false, vaults: 'none', mask: gate}), within = node(x, 47); assert(back.far[within.id] < 0 || back.far[within.id] / 2 > 40, `x ${x}: a way out of the square over the low wall`); }
  // A player: the wall's top is 2.2 m, more than a body pulls up on; from outside the ladder is climbed.
  const {BODY} = await import(new URL('dist/space.js', projectRoot)); assert(2.2 > BODY.mantle + .5, 'a player can pull up onto the low wall');
  assert.equal(LANES.length, 5); assert.deepEqual(LANES.map(l => [l.id, l.cross, l.enter]), [['door', 'gateway', 3], ['west', 'wall', -6.2], ['east', 'wall', 7], ['west-middle', 'wall', -.5], ['far-east', 'wall', 11]]);
  for (const l of LANES) { assert(l.band[0] < l.band[1]); assert.equal(!!l.window, l.id !== 'door'); assert.equal(l.ladders, l.cross === 'wall' ? 'low' : false); }
  // a lane's field: its own window is its way in and no other window or door is
  { const to = {x: 0, y: .05, z: 61.3}; for (const l of LANES.filter(q => q.window)) { const mask = L.masked(l.shut.map(b => ({min: [b.x[0], b.y[0], b.z[0]], max: [b.x[1], b.y[1], b.z[1]]}))), F = L.field(to, {ladders: 'low', vaults: 'all', mask, window: l.window}), out = L.nearest(l.enter, 52.2, 0, 1.2), others = [-6.2, -.5, 7, 11].filter(x => x !== l.enter);
      assert(F.far[out.id] >= 0, `lane ${l.id}: no way in by its window`); let n = L.nodes[out.id], through = null; for (let i = 0; i < 400 && n && n !== F.to; i++) { const e = F.via.get(n.id); if (!e) break; if (e.kind === 'vault') through = e.vault.at[0]; n = e.to; } assert(through != null && Math.abs(through - l.enter) < .8, `lane ${l.id}: its way goes in at ${through}`);
      for (const x of others) { const o = L.nearest(x, 52.2, 0, 1.2); let m = L.nodes[o.id], by = null; for (let i = 0; i < 400 && m && m !== F.to; i++) { const e = F.via.get(m.id); if (!e) break; if (e.kind === 'vault') { by = e.vault.at[0]; break; } m = e.to; } assert(by == null || Math.abs(by - l.enter) < .8, `lane ${l.id}: a hostile standing at the window ${x} would go in by ${by}`); } } }
  const KOHAR = await maps.loadMap('kohar'); assert.equal(KOHAR.ambush.push, undefined); assert.equal(KOHAR.ambush.levels, undefined); const src = fs.readFileSync(SOURCE || new URL('dist/game.js', projectRoot), 'utf8'); assert.match(src, /const PUSH=LEVELS&&WORLD\.ambush\.push\|\|null/); assert.match(src, /PUSH_FROM=PUSH&&Number\.isFinite\(PUSH\.from\)\?PUSH\.from:null/);
  report.map = {lowStretches: low.map(w => [w.from, w.to]), ladders: ladders.map(l => [l.x, l.z]), lanes: LANES.map(l => `${l.id}: ${l.cross}, in at x ${l.enter}`)};
});

console.log(JSON.stringify({suite: 'T52 the push on a front (Build 41)', passed: results.length, results, report, limits: ['A stand-in that stands still is not a player: what the front looks like in play is for the user to judge.', 'Inside the house, on the floors where the arena leaves one stair open, the push still comes up that stair: the front is the approach and the ways in, not the stairs.']}, null, 1));
process.exit(0);
