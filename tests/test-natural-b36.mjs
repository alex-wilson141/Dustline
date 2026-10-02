// Build 36 (T46): movement naturalness and spawn spread on Dehrun Terraces. The hostiles of Dehrun's Ambush move as people
// do (turn rates, reversals and gains of speed measured frame by frame, against Build 35 taken from its commit and played
// here) and still differ from one another; a rusher carries a blade, raises it before it lands, comes in a line over its
// last metres and is hit by a scripted aim at a stated rate; hostiles arrive from several directions round the player
// (angles from where the player stands, at five standing places, against Build 35); a bomber's beep carries 16 m, is heard
// to the side it is on and is faint and dull through a wall or a floor; Kohar Valley's Ambush is Build 35's.
// Headless: rendering, pointer capture, sound output and the connection are mocked. No frame time, feel or live network.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
globalThis.location = {search: ''};
import {createGame, projectRoot} from './sprint-harness.mjs';
import {oldBuild} from './old-build.mjs';

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const maps = await import(new URL('dist/maps.js', projectRoot));
const A = await import(new URL('dist/ambush.js', projectRoot));
const R = await import(new URL('dist/records.js', projectRoot));
const {CLASSES} = await import(new URL('dist/combat.js', projectRoot));
const {ENEMY_AI} = await import(new URL('dist/enemy-ai.js', projectRoot));
const SOURCE = process.env.DUSTLINE_GAME_SOURCE ? new URL('file://' + process.env.DUSTLINE_GAME_SOURCE) : undefined;
const ONLY = process.env.DUSTLINE_T46_ONLY?.split(',');
const BEFORE = 'db3af0c';   // Build 35
const results = [], report = {};
async function check(tag, name, fn) { if (ONLY && !ONLY.includes(tag)) return; await fn(); results.push(name); }
const DEHRUN = await maps.loadMap('dehrun'); maps.selectMap('kohar');
const D = DEHRUN.ambush, K = D.kinds, wire = m => JSON.parse(JSON.stringify(m)), same = v => JSON.parse(JSON.stringify(v));
const enemies = g => g.actors.filter(a => a.team === 'enemy'), alive = g => enemies(g).filter(a => a.hp > 0);
const mean = l => l.reduce((s, v) => s + v, 0) / (l.length || 1), sd = l => { const m = mean(l); return Math.sqrt(mean(l.map(v => (v - m) ** 2))); }, pct = (l, p) => [...l].sort((a, b) => a - b)[Math.min(l.length - 1, Math.floor(l.length * p))] ?? 0;
const TOP = [0, 6.6, 61.3], DEG = 180 / Math.PI;

function drive(g, mode = 'ambush') { g.prepare({clearLane: false}); g.el('blood').checked = false; for (const a of g.actors) a.animate = a.visual.animate; let clock = 0;
  g.begin = (m = mode) => { g.setMode(m); g.reset(); g.play(); g.restoreAI(); g.set({hp: 1e9}); g.frame(clock += 1000 / 60); };
  g.run = (s, each) => { for (let i = 0, n = Math.round(s * 60); i < n; i++) { g.frame(clock += 1000 / 60); if (each?.(i / 60) === false) break; } };
  g.put = (x, y, z, yaw = 0) => { g.player.set(x, y, z); g.set({yaw, pitch: 0}); g.height?.settle?.(); }; return g; }
async function world(map = 'dehrun', {source = SOURCE, mode = 'ambush'} = {}) { maps.selectMap(map); const g = drive(await createGame(source ? {sourcePath: source} : {}), mode); if (g.built) await g.built.ready; g.begin(); return g; }
let G; const dehrun = async () => { maps.selectMap('dehrun'); return G ??= await world('dehrun'); };
let OLD; const before = async () => { if (OLD) return OLD; const old = await oldBuild(BEFORE), om = await old.module('maps.js'); await om.loadMap('dehrun'); om.selectMap('dehrun'); const g = drive(await old.createGame()); await g.built.ready; g.begin(); return OLD = {g, old, om}; };   // Build 35's own modules keep Dehrun Terraces selected: its game reads them at every reset
const kill = (g, a, score = true) => { a.hp = 0; a.dead = 999; a.diedAt = g.state().elapsed; if (score) g.ambush.kill(false); };
// The stand-in for play: a hostile in sight within `reach` for `after` seconds is killed.
function cull(g, {reach = 9, after = 1.5} = {}) { for (const a of alive(g)) { if (a.g.position.distanceTo(g.player) < reach && a.seen) { a.inSight = (a.inSight || 0) + 1 / 60; if (a.inSight > after) { a.inSight = 0; kill(g, a); } } else a.inSight = 0; } }

// How the hostiles of a played run move, frame by frame. A hostile's step from one frame to the next is its velocity; between
// two frames in which it moves at over 1 m/s (and neither climbs nor falls) the angle between its velocities, times sixty, is
// how fast its path turns; over 90 degrees in one frame is a reversal. Its body's turn is the change of the way it faces.
function motion(g, seconds) { g.begin(); const H = new Map(), turns = [], body = [], accel = [], speeds = new Map(); let reversals = 0, kinds = new Set();
  g.run(seconds, () => { g.put(...TOP);
    for (const a of alive(g)) { const p = a.g.position, k = a.index + ':' + a.life; let h = H.get(k); if (!h) { H.set(k, h = {x: p.x, z: p.z}); continue; } kinds.add(a.ai.kind || 'rifle');
      const vx = (p.x - h.x) * 60, vz = (p.z - h.z) * 60, v = Math.hypot(vx, vz), ry = a.g.rotation.y, still = a.climb || a.fall;
      if (!still && v > 1 && h.v > 1) { const d = Math.abs(Math.atan2(vx * h.vz - vz * h.vx, vx * h.vx + vz * h.vz)) * DEG * 60; turns.push(d); if (d > 5400) reversals++; accel.push(Math.abs(v - h.v) * 60); }
      if (!still && h.ry != null && !h.still) { let dr = Math.abs(ry - h.ry) % (2 * Math.PI); if (dr > Math.PI) dr = 2 * Math.PI - dr; body.push(dr * DEG * 60); }
      if (!still && v > .5) { const s = speeds.get(k) || [0, 0]; s[0] += v; s[1]++; speeds.set(k, s); }
      h.x = p.x; h.z = p.z; h.vx = vx; h.vz = vz; h.v = v; h.ry = ry; h.still = still; }
    cull(g); g.set({hp: 1e9}); if (g.amb.phase === 'decision') g.ambush.decide(false); });
  const per = [...speeds.values()].filter(s => s[1] > 120).map(s => s[0] / s[1]);
  return {waves: g.amb.wave, movingFrames: turns.length, over360: +(turns.filter(d => d > 360).length / turns.length).toFixed(4), turnP50: Math.round(pct(turns, .5)), turnP99: Math.round(pct(turns, .99)), reversals, reversalsAMinute: +(reversals / (seconds / 60)).toFixed(1),
    bodyP99: Math.round(pct(body, .99)), bodyOver720: +(body.filter(d => d > 720).length / body.length).toFixed(4), accelP99: +pct(accel, .99).toFixed(1), hostiles: per.length, speedMean: +mean(per).toFixed(2), speedSpread: +sd(per).toFixed(2), kinds: [...kinds].sort()}; }

await check('turns', 'the hostiles move as people do, and still differ: on the top floor for four minutes, watched frame by frame, a moving hostile\'s path turns faster than a full turn a second in under 3 frames in 100 (Build 35, played here from its commit: over 9 in 100), reverses in a single frame fewer than 10 times a minute (Build 35: over 60), its body turns no faster than 400 degrees a second in 99 frames of 100 (and one standing to fire, with the player put behind it, takes a third of a second or more to turn round, never faster than that), and its speed changes by no more than 25 m/s in a second in 99 of 100; with that their speeds still differ from one to the next by a tenth of their speed or more, and all three kinds are among them', async () => {
  const now = motion(await dehrun(), 240), then = motion((await before()).g, 240);
  if (process.env.SHOW) console.error(JSON.stringify({now, then}, null, 1));
  assert(now.movingFrames > 15000 && then.movingFrames > 15000, `${now.movingFrames} and ${then.movingFrames} moving frames`);
  assert(now.over360 < .03, `path turns over 360 degrees a second in ${now.over360} of moving frames`); assert(then.over360 > .09 && then.over360 > 4 * now.over360, `Build 35: ${then.over360}`);
  assert(now.reversalsAMinute < 10, `${now.reversalsAMinute} reversals a minute`); assert(then.reversalsAMinute > 60, `Build 35: ${then.reversalsAMinute} a minute`);
  assert(now.bodyP99 <= 400, `the body turns at ${now.bodyP99} degrees a second in the 99th frame of 100`); assert(then.bodyOver720 > 3 * now.bodyOver720 && now.bodyOver720 < .004, `a body turned faster than two turns a second in ${now.bodyOver720} of frames (Build 35 ${then.bodyOver720})`);
  assert(now.accelP99 <= 25, `speed changes by ${now.accelP99} m/s in a second`);
  assert(now.hostiles >= 20 && now.speedSpread / now.speedMean >= .1, `speeds differ by ${now.speedSpread} m/s in ${now.speedMean}`); assert.deepEqual(now.kinds, ['bomber', 'rifle', 'rusher']);
  // The body turns round as a person does: a hostile standing to fire at the player, and the player put behind it.
  const g = await dehrun(); g.begin(); g.ambush.startWave(2); let a = null; g.run(90, () => { g.put(...TOP); a = alive(g)[0]; return !a; }); assert(a); g.amb.toSpawn = 0; for (const o of alive(g)) if (o !== a) kill(g, o, false); a.ai.kind = 'rifle'; g.ambush.setKind(a, 0); a.ai.v.hold = 8; a.ai.v.bold = false;
  const stand = () => { a.g.position.set(0, 6.6, 61.3); a.route = []; a.climb = a.fall = null; a.ai.path = []; a.hp = 100; }, EAST = [5, 6.6, 61.3], WEST = [-5, 6.6, 61.3];
  g.run(3, () => { g.put(...EAST); g.set({hp: 1e9}); g.amb.toSpawn = 0; stand(); }); let ry = a.g.rotation.y, turned = 0, fastest = 0, took = null;
  g.run(3, t => { g.put(...WEST); g.set({hp: 1e9}); g.amb.toSpawn = 0; stand(); let d = a.g.rotation.y - ry; d = Math.abs(Math.atan2(Math.sin(d), Math.cos(d))); ry = a.g.rotation.y; turned += d; fastest = Math.max(fastest, d * DEG * 60); if (d > 1e-4) took = t; });
  assert(turned > 2.6 && turned < 3.7, `it turned ${turned.toFixed(2)} rad to face the player behind it`); assert(fastest <= 400, `at ${fastest.toFixed(0)} degrees a second`); assert(took >= .35 && took < 1.5, `in ${took?.toFixed(2)} s`);
  report.turns = {build36: now, build35: then, turnRound: {seconds: +took.toFixed(2), fastest: Math.round(fastest)}};
});

// A scripted aim: the muzzle follows where the rusher's chest was `lag` seconds ago, turning at most `rate` degrees a second;
// a round every tenth of a second, while the rusher is in sight within `from` metres and further than its reach, is on the
// body if its line passes within the body's half width (.26 m) of the chest at that moment. Every arrival is made a rusher.
function aimed(g, at, yaw, {from = 12, lag = .2, rate = 200, seconds = 300, want = 14} = {}) { g.begin(); const T = new Map(), miss = []; let shots = 0, hits = 0, runs = 0, born = new Map(), sideways = [];
  g.run(seconds, () => { g.put(...at, yaw); g.set({hp: 1e9}); const eye = g.player.clone().setY(at[1] + 1.6);
    for (const a of alive(g)) { if (born.get(a) !== a.bornAt) { born.set(a, a.bornAt); a.ai.kind = 'rusher'; g.ambush.setKind(a, 1); } const p = a.g.position, d = p.distanceTo(g.player), key = a.index + ':' + a.life;
      if (Math.abs(p.y - at[1]) > .6 || d > from || a.climb || !g.glass.visible(eye, p.clone().setY(p.y + 1.2))) { T.delete(key); continue; }
      let t = T.get(key); if (!t) { T.set(key, t = {hist: [], aim: Math.atan2(p.x - eye.x, p.z - eye.z), tick: 0}); runs++; } t.hist.push([p.x, p.z]); if (t.hist.length > Math.round(lag * 60) + 1) t.hist.shift();
      const [ox, oz] = t.hist[0], wantA = Math.atan2(ox - eye.x, oz - eye.z); let e = wantA - t.aim; e = Math.atan2(Math.sin(e), Math.cos(e)); const most = rate / DEG / 60; t.aim += Math.max(-most, Math.min(most, e));
      const dx = p.x - eye.x, dz = p.z - eye.z; if (t.px != null && d > 2.2) { const r = Math.hypot(dx, dz) || 1; sideways.push(Math.abs((p.x - t.px) * dz - (p.z - t.pz) * dx) / r * 60); } t.px = p.x; t.pz = p.z;
      if (++t.tick % 6 === 0 && d > 2.2) { shots++; const off = Math.abs(dx * Math.cos(t.aim) - dz * Math.sin(t.aim)); if (off < .26) hits++; miss.push(off); }
      if (d < 2.2) { kill(g, a); T.delete(key); } }
    if (g.amb.phase === 'decision') g.ambush.decide(false); if (runs >= want && !alive(g).length) return false; });
  return {approaches: runs, rounds: shots, onTheBody: hits, rate: +(hits / Math.max(1, shots)).toFixed(3), medianMiss: +pct(miss, .5).toFixed(2), sidewaysP90: +pct(sideways, .9).toFixed(2)}; }

await check('rusher', 'a rusher is seen for what it is and can be hit: it carries a blade and no rifle (a rifle and a bomber carry a rifle and no blade), on Kohar Valley nobody has one; in reach it raises the blade and the strike lands 0.35 s later for 28 times armor, and a player who has stepped out of reach by then is not struck; within 9 m and in sight it comes in a straight line; a scripted aim that lags a fifth of a second and turns at most 200 degrees a second, firing ten rounds a second at rushers that come into a room through its doorways, puts more than half its rounds on the body (Build 35\'s rushers, played here in the same room: four in ten), and they cross the aim sideways at under four fifths of the speed Build 35\'s did; the guest sees the blade and every swing', async () => {
  const g = await dehrun(); g.begin(); g.ambush.startWave(3); let three = []; g.run(90, () => { g.put(...TOP); three = alive(g); return three.length < 3; }); assert(three.length >= 3, 'three arrived'); g.amb.toSpawn = 0;
  const [r, f, b] = three; for (const [a, kind, id] of [[r, 'rusher', 1], [f, 'rifle', 0], [b, 'bomber', 2]]) { a.ai.kind = kind; g.ambush.setKind(a, id); }
  assert(r.visual.bladeShown(), 'a rusher shows a blade and no rifle'); assert(!f.visual.bladeShown() && !b.visual.bladeShown(), 'a rifle and a bomber carry rifles'); g.ambush.setKind(r, 0); assert(!r.visual.bladeShown(), 'and it is put away with the kind'); g.ambush.setKind(r, 1);
  // The swing before the strike. The rusher is put a metre and a half from the player; the others are taken away.
  for (const a of alive(g)) if (a !== r) kill(g, a, false); const armor = CLASSES.assault.armor, near = () => { r.g.position.set(TOP[0] + 1.5, TOP[1], TOP[2]); r.route = []; r.climb = r.fall = null; Object.assign(r.ai, {windAt: 0, strikeAt: 0, path: [], line: false}); r.seen = null; };
  const swing = stepAway => { near(); g.put(...TOP); g.set({hp: 100}); const s0 = r.swings || 0; let raised = null, landed = null, hp0 = 100; g.run(3, t => { g.amb.toSpawn = 0; if (raised == null && (r.swings || 0) !== s0) { raised = t; assert(r.visual.swinging() > 0, 'the arm is swinging'); if (stepAway) g.put(TOP[0] - 6, TOP[1], TOP[2]); } if (!stepAway) g.put(...TOP); else if (raised != null) g.put(TOP[0] - 6, TOP[1], TOP[2]); const hp = g.ambush.hp(); if (hp < hp0 - 1 && landed == null) { landed = {t, took: hp0 - hp}; return false; } if (raised != null && t - raised > 1.2) return false; }); return {raised, landed}; };
  const struck = swing(false); assert(struck.raised != null && struck.landed, `the blade was raised and the strike landed: ${JSON.stringify(struck)}`); const wait = struck.landed.t - struck.raised; assert(Math.abs(wait - K.rusher.wind) < .06 && K.rusher.wind >= .3, `the strike landed ${wait.toFixed(2)} s after the blade went up`); assert(Math.abs(struck.landed.took - K.rusher.strike * armor) < .05, `it took ${struck.landed.took}`);
  const dodged = swing(true); assert(dodged.raised != null && !dodged.landed, `a player who stepped away was struck: ${JSON.stringify(dodged)}`);
  kill(g, r, false); maps.selectMap('kohar'); const kg = await world('kohar'); kg.run(30, () => alive(kg).length < 2); assert(alive(kg).length >= 1 && enemies(kg).every(a => !a.visual.bladeShown() && !a.marks), 'nobody on Kohar Valley has a blade'); maps.selectMap('dehrun');
  // The scripted aim, in the loft (the north room of the top floor: its doorways are at x -5 and 7, the player by the crate).
  const LOFT = [1, 6.6, 55.2], now = aimed(g, LOFT, Math.PI), then = aimed((await before()).g, LOFT, Math.PI);
  if (process.env.SHOW) console.error(JSON.stringify({now, then}, null, 1));
  assert(now.approaches >= 10 && then.approaches >= 10 && now.rounds >= 100 && then.rounds >= 100, `${now.approaches} and ${then.approaches} approaches, ${now.rounds} and ${then.rounds} rounds`); assert(now.rate >= .52, `${now.onTheBody} of ${now.rounds} rounds on the body`); assert(now.rate >= then.rate + .1, `Build 35's rushers were hit by ${then.rate}, these by ${now.rate}`); assert(now.sidewaysP90 < .8 * then.sidewaysP90, `across the aim at ${now.sidewaysP90} m/s (Build 35 ${then.sidewaysP90})`);
  // In a line over the last metres: seen within `commit`, its way is one straight line to its player.
  g.begin(); g.ambush.startWave(2); let one = null; g.run(90, () => { g.put(...TOP); one = alive(g)[0]; return !one; }); g.amb.toSpawn = 0; for (const a of alive(g)) if (a !== one) kill(g, a, false); one.ai.kind = 'rusher'; g.ambush.setKind(one, 1); one.g.position.set(TOP[0] + 8, TOP[1], TOP[2] + .4); one.route = []; one.climb = one.fall = null; Object.assign(one.ai, {routeAt: 0, far: false, path: [], line: false, head: null, spd: 0}); const track = [];   /* from a standstill, with no heading left over from where it was */
  g.run(3, () => { g.put(...TOP, -Math.PI / 2); g.amb.toSpawn = 0; const p = one.g.position; if (p.distanceTo(g.player) > 2.5 && one.seen) { assert(one.ai.line && one.ai.path.length === 1, 'within 9 m and in sight its way is a line'); track.push([p.x, p.z]); } else if (track.length > 20) return false; });
  assert(track.length > 30, `${track.length} frames of the last metres`); const [x0, z0] = track[0], [x1, z1] = track.at(-1), l = Math.hypot(x1 - x0, z1 - z0), off = Math.max(...track.map(([x, z]) => Math.abs((x - x0) * (z1 - z0) - (z - z0) * (x1 - x0)) / l)); assert(off < .25, `${off.toFixed(2)} m off a straight line`);
  // The guest sees the blade and the swing.
  const page = async role => { const q = await createGame(SOURCE ? {sourcePath: SOURCE} : {}); q.prepare({role, clearLane: false}); q.el('blood').checked = false; for (const a of q.actors) a.animate = a.visual.animate; await q.built.ready; return q; }, host = await page('host'), guest = await page('guest');
  host.peer.send = m => { if (!host.peer.connected) return false; guest.receive(wire(m)); return true; }; guest.peer.send = m => { if (!guest.peer.connected) return false; host.receive(wire(m)); return true; };
  host.receive({type: 'hello', classId: 'assault'}); guest.receive({type: 'hello', classId: 'assault'}); host.setMode('ambush'); host.start(); host.play(); guest.play(); host.restoreAI(); let clock = 0; host.frame(0); guest.frame(0);
  const step = () => { host.player.set(...TOP); guest.remote.g.position.set(...TOP); guest.player.set(6, 6.6, 61.3); host.remote.g.position.set(6, 6.6, 61.3); host.set({hp: 1e9}); host.remote.hp = 1e9; clock += 1000 / 60; host.frame(clock); guest.frame(clock); };
  let hr = null; for (let i = 0; i < 60 * 90 && !hr; i++) { step(); hr = alive(host).find(a => a.ai.prey !== 'mate') || null; } assert(hr, 'a hostile for the host arrived'); const idx = enemies(host).indexOf(hr); hr.ai.kind = 'rusher'; host.ambush.setKind(hr, 1); let seenSwing = 0, hostSwings = 0;
  for (let i = 0; i < 60 * 6; i++) { if (hr.hp > 0 && i % 90 === 0) { hr.g.position.set(TOP[0] + 1.5, TOP[1], TOP[2]); hr.route = []; hr.climb = hr.fall = null; hr.ai.path = []; } step(); const gr = enemies(guest)[idx]; if ((hr.swings || 0) > hostSwings) hostSwings = hr.swings; if (gr.hp > 0 && gr.kind === 1) { assert(gr.visual.bladeShown(), 'the guest sees the blade'); if (gr.visual.swinging() > 0 && gr.swings === hr.swings) seenSwing++; } }
  assert(hostSwings >= 2 && seenSwing > 20, `the host's rusher swung ${hostSwings} times and the guest saw the arm swinging in ${seenSwing} frames`);
  report.rusher = {wind: +wait.toFixed(2), aim: {build36: now, build35: then}, lineOff: +off.toFixed(2), guestSawSwingFrames: seenSwing};
});

// Where the hostiles arrive from, as the player stands: the compass direction (N is -z, in eight sectors) from the player to
// each hostile at the moment it is first in sight of the player within 15 m. `sides`: sectors with one in twenty or more;
// `oneWay`: the length of the mean direction (0: evenly all round or from two opposite ends, 1: all from one direction).
const STANDS = {top: {at: TOP, open: []}, first: {at: [0, 3.4, 61.3], open: ['first']}, ground: {at: [0, .05, 61.3], open: ['first', 'ground']}, roof: {at: [0, 9.83, 62], open: ['roof']}, square: {at: [0, 0, 75], open: ['first', 'ground', 'square']}};
const NAMES = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'], bearing = (dx, dz) => (Math.atan2(dx, -dz) * DEG + 360) % 360;
function angles(g, stand, seconds = 200) { const S = STANDS[stand]; g.begin(); for (const id of S.open) g.ambush.openGate(id); const met = new Set(), born = new Set(), sectors = Array(8).fill(0), spawned = Array(8).fill(0); let over = 0;
  g.run(seconds, () => { g.put(...S.at); g.set({hp: 1e9});
    for (const a of alive(g)) { const p = a.g.position, k = a.index + ':' + a.life, dx = p.x - S.at[0], dz = p.z - S.at[2]; if (!born.has(k)) { born.add(k); spawned[Math.round(bearing(dx, dz) / 45) % 8]++; }
      if (a.ai.over && !a.overSeen) { a.overSeen = a.life; over++; } if (a.overSeen && a.overSeen !== a.life) a.overSeen = 0;
      if (!met.has(k) && p.distanceTo(g.player) < 15 && a.seen) { met.add(k); sectors[Math.round(bearing(dx, dz) / 45) % 8]++; } }
    cull(g); if (g.amb.phase === 'decision') g.ambush.decide(false); });
  const n = sectors.reduce((s, v) => s + v, 0); let cx = 0, cz = 0; sectors.forEach((v, i) => { cx += v * Math.sin(i * Math.PI / 4); cz += v * Math.cos(i * Math.PI / 4); });
  return {arrived: n, from: Object.fromEntries(NAMES.map((s, i) => [s, sectors[i]]).filter(q => q[1])), sides: sectors.filter(v => v >= .05 * n).length, largest: +(Math.max(...sectors) / Math.max(1, n)).toFixed(2), oneWay: +(Math.hypot(cx, cz) / Math.max(1, n)).toFixed(2), startedFrom: spawned.filter(v => v > 0).length, overTheWalls: over, came: same(g.amb.came)}; }

await check('spread', 'the hostiles arrive from round the player, measured as angles from where the player stands and not by the names of their ways: at five standing places (the top floor at the start, the first floor, the ground floor, the roof and the square, each with what it needs bought) for 200 s each, the direction to every hostile when it is first in sight within 15 m; they start from four or more of the eight directions (three on the square, where the player stands by the south wall and nothing may start within 35 m; Build 35, played here: three or fewer everywhere); on the top and first floors, which have a stair at each end and no other way in, they come from both ends, neither with more than seven in ten (Build 35 on the first floor: all from one end); on the ground floor from three directions or more (Build 35: all from one) and on the roof from three or more (Build 35: two neighbouring ones, nine in ten one way); on the square from three or more; hostiles climb the square\'s walls, the four ladders to the roof serve, and every kind of way in brings some', async () => {
  const g = await world('dehrun'), now = {}, then = {}; for (const s of Object.keys(STANDS)) now[s] = angles(g, s);   /* a world of its own: what is measured does not depend on which checks ran before it */ const og = (await before()).g; for (const s of ['first', 'ground', 'roof']) then[s] = angles(og, s);
  if (process.env.SHOW) console.error(JSON.stringify({now, then}, null, 1));
  for (const s of Object.keys(STANDS)) { assert(now[s].arrived >= 15, `${s}: ${now[s].arrived} arrived`); assert(now[s].startedFrom >= (s === 'square' ? 3 : 4), `${s}: they started from ${now[s].startedFrom} of eight directions`); }   /* on the square the player stands 5 m from the south wall: nothing may start within 35 m */
  for (const s of ['first', 'ground', 'roof']) assert(then[s].startedFrom <= 3, `Build 35, ${s}: started from ${then[s].startedFrom} directions`);
  for (const s of ['top', 'first']) { assert(now[s].sides >= 2 && now[s].largest <= .7 && now[s].oneWay <= .45, `${s}: ${JSON.stringify(now[s].from)}`); } assert(then.first.sides === 1 && then.first.oneWay > .9, `Build 35, first floor: ${JSON.stringify(then.first.from)}`);
  assert(now.ground.sides >= 3 && now.ground.largest <= .65 && now.ground.oneWay <= .7, `ground floor: ${JSON.stringify(now.ground.from)}`); assert(then.ground.sides === 1, `Build 35, ground floor: ${JSON.stringify(then.ground.from)}`);
  assert(now.roof.sides >= 3 && now.roof.oneWay <= .6, `roof: ${JSON.stringify(now.roof.from)}`); assert(then.roof.sides <= 2 && then.roof.oneWay > .8, `Build 35, roof: ${JSON.stringify(then.roof.from)}`);
  assert(now.square.sides >= 3 && now.square.largest <= .55, `square: ${JSON.stringify(now.square.from)}`);
  assert(Object.values(now).reduce((s, r) => s + r.overTheWalls, 0) >= 10, 'hostiles came over the square\'s walls'); for (const by of ['door', 'ladder', 'window']) assert(Object.values(now).reduce((s, r) => s + r.came[by], 0) >= 8, `by the ${by}`);
  // The ways over the walls and up the house are in the navigation, and a body cannot use them to leave: no ladder inside the square's walls.
  const sp = g.height.space, low = sp.ladders.filter(l => l.top - l.bottom < 5 && l.z > 44), tall = sp.ladders.filter(l => l.top - l.bottom > 9); assert.equal(low.length, 4); assert.equal(tall.length, 4);
  for (const l of low) assert(Math.abs(l.standX) > 22.3 || l.standZ > 80.3, `a ladder inside the square at ${[l.standX, l.standZ]}`);
  report.spread = {build36: now, build35: then};
});

await check('beep', 'a bomber\'s beep says where it is: nothing is heard beyond 16 m (Build 35: 30 m), in the rule and in the game; nearer is louder and quicker; one to the right is heard to the right and one to the left to the left, one behind duller; through a floor or a wall it is three tenths as loud and dull (650 Hz), in the rule and in the game with a bomber on the floor below and in the next room; a bomber still may not begin its fuse until it has been heard for three seconds', async () => {
  const B = K.bomber, H = A.beepHeard; assert.equal(B.hear, 16); assert.equal(H(B, 16.1, false), null); assert.equal(H(B, 30, false), null); assert(H(B, 15.9, false).gain > 0);
  for (let d = 1; d < 15; d++) { assert(H(B, d, false).gain > H(B, d + 1, false).gain, 'nearer is louder'); assert(H(B, d, false).every <= H(B, d + 1, false).every, 'and quicker'); const o = H(B, d, false), w = H(B, d, true); assert(Math.abs(w.gain / o.gain - B.wall) < 1e-9 && B.wall <= .35, 'through a wall: fainter'); assert.equal(w.cutoff, B.muffle); assert(B.muffle <= 800); assert.equal(o.cutoff, 0); }
  assert(H(B, 8, false, 1, 0).pan > .8 && H(B, 8, false, -1, 0).pan < -.8 && H(B, 8, false, 0, 1).pan === 0); assert.equal(H(B, 8, false, 0, -1).cutoff, B.behind); assert(H(B, 8, false, 0, -1).gain < H(B, 8, false, 0, 1).gain);
  assert(B.warn >= 3 && (B.hear - B.trigger) / B.speed + B.fuse > 3.5, 'heard for three seconds before it can go off');
  // In the game: one bomber, held where the case puts it; what the page played is what the harness recorded.
  const g = await dehrun(); g.begin(); g.ambush.startWave(2); let a = null; g.run(90, () => { g.put(...TOP); a = alive(g)[0]; return !a; }); assert(a); g.amb.toSpawn = 0; for (const o of alive(g)) if (o !== a) kill(g, o, false); a.ai.kind = 'bomber'; g.ambush.setKind(a, 2);
  const hear = (at, yaw, where) => { g.heard.length = 0; let n = 0; g.run(1.5, () => { g.put(...at, yaw); g.set({hp: 1e9}); g.amb.toSpawn = 0; a.hp = 100; a.g.position.set(...where); a.route = []; a.climb = a.fall = null; a.ai.path = []; a.ai.fuse = null; a.ai.heardAt = null; }); return g.heard.filter(h => h.type === 'beep'); };
  const fwd = () => { const f = g.camera.getWorldDirection(new THREE.Vector3()); return [f.x, f.z]; }; g.put(...TOP, 0); g.run(.1, () => { g.put(...TOP, 0); }); const [fx, fz] = fwd(), l = Math.hypot(fx, fz), ux = fx / l, uz = fz / l, rx = -uz, rz = ux;   // forward and right on the floor
  const AT = [-2, 6.6, 61.3]; g.put(...AT, 0); g.run(.1, () => g.put(...AT, 0)); const [gx, gz] = fwd(); assert(Math.abs(gx - fx) < 1e-6 && Math.abs(gz - fz) < 1e-6);
  // Along the corridor (east-west): ahead, to the side and behind are taken from the camera's own direction.
  const along = Math.abs(ux) > Math.abs(uz) ? [Math.sign(ux), 0] : [0, Math.sign(uz)]; const E = [1, 0];
  const yawFor = want => { for (let k = 0; k < 8; k++) { const y = k * Math.PI / 4; g.put(...AT, y); g.run(.05, () => g.put(...AT, y)); const [x, z] = fwd(); if (Math.hypot(x - want[0], z - want[1]) < .1) return y; } assert.fail('no yaw looks that way'); };
  const lookE = yawFor([1, 0]), lookW = yawFor([-1, 0]), lookN = yawFor([0, -1]), lookS = yawFor([0, 1]);
  const east = d => [AT[0] + d, 6.6, 61.3];
  const ahead = hear(AT, lookE, east(8)); assert(ahead.length >= 2 && ahead.every(h => Math.abs(h.pan) < .1 && !h.cutoff && !h.walled), `ahead: ${JSON.stringify(ahead[0])}`);
  const right = hear(AT, lookN, east(8)); assert(right.length >= 2 && right.every(h => h.pan > .8), `to the right: ${JSON.stringify(right[0])}`); const left = hear(AT, lookS, east(8)); assert(left.length >= 2 && left.every(h => h.pan < -.8), `to the left: ${JSON.stringify(left[0])}`);
  const behind = hear(AT, lookW, east(8)); assert(behind.length >= 2 && behind.every(h => h.cutoff === B.behind && h.vol < ahead[0].vol), `behind: ${JSON.stringify(behind[0])}`);
  const FAR = [-11, 6.6, 61.3]; assert.equal(hear(FAR, lookE, [FAR[0] + 16.5, 6.6, 61.3]).length, 0, 'heard beyond 16 m'); const edge = hear(FAR, lookE, [FAR[0] + 15, 6.6, 61.3]); assert(edge.length >= 1 && edge.length < ahead.length, `at 15 m: ${edge.length} beeps in a second and a half against ${ahead.length} at 8 m`); assert(edge[0].vol < ahead[0].vol);
  const below = hear(AT, lookE, [AT[0] + 3, 3.4, 61.3]); assert(below.length >= 2 && below.every(h => h.walled && h.cutoff === B.muffle), `on the floor below: ${JSON.stringify(below[0])}`); const openAt = H(B, Math.hypot(3, 3.2), false).gain; assert(below[0].vol < openAt * .35, `as loud as ${below[0].vol} against ${openAt} in the open`);
  const nextRoom = hear(AT, lookN, [AT[0], 6.6, 56]); assert(nextRoom.length >= 2 && nextRoom.every(h => h.walled && h.cutoff === B.muffle), `in the next room: ${JSON.stringify(nextRoom[0])}`);
  report.beep = {hear: B.hear, wall: B.wall, muffle: B.muffle, at8m: +ahead[0].vol.toFixed(2), at15m: +edge[0].vol.toFixed(2), below: +below[0].vol.toFixed(3), beepsIn1_5s: {at8m: ahead.length, at15m: edge.length}};
});

await check('kohar', 'Kohar Valley\'s Ambush is Build 35\'s: both curves for forty waves, the hostiles\' tunables, every price, the rules, the arena and both keys of the bests equal Build 35 taken from its commit; the lines that keep Dehrun\'s steering, directions and ways from Kohar Valley are in the source; a solo run of 150 s played by the present game and by Build 35\'s is the same in every sample, and no enemy there is steered, given a kind, a blade or a way', async () => {
  const old = await oldBuild(BEFORE), OA = await old.module('ambush.js'), OR = await old.module('records.js'); maps.selectMap('kohar'); (await old.module('maps.js')).selectMap('kohar');   /* Build 35's own modules too: the checks before this one left Dehrun Terraces selected in them */ assert.equal(A.KINDS, null); assert.equal(A.VARY, null); assert.equal(A.CURVE, null);
  for (let n = 1; n <= 40; n++) { assert.deepEqual(A.waveSpec(n), OA.waveSpec(n)); assert.deepEqual(A.waveSpec(n, 2), OA.waveSpec(n, 2)); assert.deepEqual(same(A.aiTuningFor(n, ENEMY_AI)), same(OA.aiTuningFor(n, ENEMY_AI))); for (const c of Object.values(CLASSES)) assert.equal(A.magazinePrice(c, n), OA.magazinePrice(c, n)); assert.equal(A.dressingPrice(n), OA.dressingPrice(n)); }
  assert.deepEqual(same(A.AMBUSH), same(OA.AMBUSH)); assert.deepEqual(same(A.GATES), same(OA.GATES)); assert.deepEqual(same(A.STATIONS), same(OA.STATIONS)); assert.deepEqual(same(A.AREAS), same(OA.AREAS)); assert.equal(R.bestKey('kohar'), OR.bestKey('kohar')); assert.equal(R.bestKey('kohar', true), OR.bestKey('kohar', true));
  const text = fs.readFileSync(SOURCE || new URL('dist/game.js', projectRoot), 'utf8'); for (const f of ['return LEVELS&&a.ai.v?ambushSteer(a,a.ai,p,plan,dt):plan;', 'const AROUND=LEVELS&&WORLD.ambush.around||0;', 'if(AROUND)d.bearingNow=', 'amb.bearingNow??amb.bearing??0', "if(LEVELS&&ai.kind==='rusher')", 'const KIND_MATS=LEVELS&&KINDS?']) assert(text.includes(f), `Kohar Valley's side of a line is no longer guarded: ${f}`);
  const kohar = await maps.loadMap('kohar'); assert.equal(kohar.ambush.around, undefined); assert.equal(kohar.ambush.routes, undefined); assert.equal(kohar.ambush.kinds, undefined);
  const was = pathToFileURL(path.join(old.dir, 'dist', 'game.js')), solo = async source => { const g = await world('kohar', {source}); const rows = []; g.run(150, t => { for (const a of alive(g)) { assert(!a.kind && !a.marks && !a.ai.kind && !a.ai.v && !a.ai.way && a.ai.head == null && a.ai.path == null && !a.swings, 'a Kohar Valley enemy steered or with a kind'); const d = a.g.position.distanceTo(g.player); if (d < 14 && a.seen) { a.inSight = (a.inSight || 0) + 1 / 60; if (a.inSight > 1) { a.inSight = 0; kill(g, a); } } else a.inSight = 0; } if (Math.round(t * 60) % 120 === 0) rows.push([g.amb.wave, g.amb.phase, g.amb.toSpawn, g.amb.points, ...enemies(g).map(a => [+a.g.position.x.toFixed(4), +a.g.position.z.toFixed(4), +a.g.rotation.y.toFixed(4), a.hp, a.ai?.state ?? null])]); }); return rows; };
  const now = await solo(SOURCE), then = await solo(was); assert(now.length >= 74 && now.at(-1)[3] >= 900, `the run was played (${now.at(-1)[3]} points)`); assert.deepEqual(now, then, 'a solo run');
  report.kohar = {against: BEFORE, waves: 40, solo: `${now.length} samples identical`};
});

maps.selectMap('kohar');
console.log(JSON.stringify({suite: 'T46 movement naturalness and spawn spread on Dehrun Terraces (Build 36)', passed: results.length, results, report}, null, 1));
