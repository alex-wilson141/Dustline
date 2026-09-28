// Build 07 enemy behaviour: patrols and cover (M7.10), bounded reinforcements with a completable mission, AI-02
// (nothing placed inside geometry; navigation matches collision), co-op guest parity and live tunables.
// Headless production code with the real tickAI/missionTick (restoreAI); rendering, audio and transport are mocked.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execSync} from 'node:child_process';
import {createGame, projectRoot} from './sprint-harness.mjs';

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const {ENEMY_AI, ENEMY_SPAWNS, PATROL_LOOPS} = await import(new URL('dist/enemy-ai.js', projectRoot));
const DEFAULTS = structuredClone(ENEMY_AI);
const restore = () => Object.assign(ENEMY_AI, structuredClone(DEFAULTS));
const results = [];
async function check(name, fn) { restore(); try { await fn(); } finally { restore(); } results.push(name); }

async function game({role = null, ai = true} = {}) {
  const g = await createGame();
  g.prepare({role, clearLane: false});
  g.player.set(0, g.groundY(0, 55), 55);
  if (ai) g.restoreAI();
  g.set({hp: 1e9});
  for (const a of g.actors) a.animate = a.visual.animate;
  let clock = 0; g.frame(0); g.step = s => g.frame(clock += s * 1000);
  g.run = (seconds, each) => { for (let i = 0, n = Math.round(seconds * 60); i < n; i++) { g.step(1 / 60); each?.(i / 60); } };
  return g;
}
const enemies = g => g.actors.filter(a => a.team === 'enemy');
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const eyeOf = g => g.player.clone().setY(g.player.y + 1.7);

// A cover point with an open start next to it and a player 22 m away on the far side of the box, who can see the start.
function coverScenario(g, low = true) {
  for (const c of g.ai.coverTable().points) {
    if (c.low !== low) continue;
    const px = c.x - c.nx * 22, pz = c.z - c.nz * 22, sx = c.x + c.nz * 3.5 + c.nx * .5, sz = c.z - c.nx * 3.5 + c.nz * .5;
    if (g.blocked(px, pz) || g.blocked(sx, sz) || Math.abs(px) > 80 || Math.abs(pz) > 80) continue;
    const eye = V(px, g.groundY(px, pz) + 1.7, pz);
    if (!g.visible(eye, V(sx, g.groundY(sx, sz) + 1.25, sz))) continue;
    if (g.visible(eye, V(c.x, g.groundY(c.x, c.z) + (c.low ? .95 : 1.25), c.z))) continue;
    return {c, player: [px, pz], start: [sx, sz]};
  }
}
const noAllies = g => { for (const a of g.actors) if (a.team === 'ally' && !a.remote) { a.hp = 0; a.dead = 1e9; } };
function isolate(g, keep) { for (const a of enemies(g)) if (a !== keep) { a.hp = 0; a.dead = 999; a.diedAt = -1e9; } ENEMY_AI.reinforce = false; }
const fires = a => { let n = 0, prev = a.cool; return {tick(st) { if (a.cool > prev + .3) { n++; this.states.push(st); } prev = a.cool; }, states: [], get n() { return n; }}; };

await check('patrols: enemies leave the old 4 m spawn radius and move through the map; the garrison stays at the relay', async () => {
  const g = await game(), en = enemies(g), start = en.map(a => a.g.position.clone()), maxD = en.map(() => 0); noAllies(g); ENEMY_AI.reinforce = false;
  const nodes = en.map(() => new Set());
  g.run(100, () => en.forEach((a, i) => { maxD[i] = Math.max(maxD[i], a.g.position.distanceTo(start[i])); if (a.ai.state === 'patrol') nodes[i].add(a.ai.node); }));
  const patrol = en.filter(a => a.ai.role !== 'garrison'), garrison = en.filter(a => a.ai.role === 'garrison');
  assert.equal(garrison.length, 2);
  for (const a of patrol) assert(maxD[en.indexOf(a)] > 15, `enemy ${a.index} moved ${maxD[en.indexOf(a)].toFixed(1)} m (Build 06 max ~3.7 m)`);
  for (const a of garrison) assert(Math.hypot(a.g.position.x, a.g.position.z + 47) <= ENEMY_AI.garrisonRadius + 1, 'garrison near the relay');
  for (const a of patrol) assert(nodes[en.indexOf(a)].size >= 3, `enemy ${a.index} advanced through ${nodes[en.indexOf(a)].size} nodes of loop ${a.ai.loop}`);
});

await check('cover: a seen enemy moves to cover that hides it, crouches behind low cover, and only fires while peeking', async () => {
  const g = await game(), en = enemies(g), a = en[0]; isolate(g, a);
  const sc = coverScenario(g, true); assert(sc, 'found a low-cover scenario');
  g.player.set(sc.player[0], g.groundY(...sc.player), sc.player[1]); a.g.position.set(sc.start[0], g.groundY(...sc.start), sc.start[1]); a.route = []; a.ai.threat = null;
  const f = fires(a), states = new Set(); let reached = false, crouchedHidden = 0, hiddenSamples = 0;
  g.run(25, () => { f.tick(a.ai.state); states.add(a.ai.state); if (a.ai.cover && ['hide', 'rise', 'peek'].includes(a.ai.state) && Math.hypot(a.g.position.x - a.ai.cover.x, a.g.position.z - a.ai.cover.z) < .45) reached = true;
    if (a.ai.state === 'hide') { hiddenSamples++; if (a.crouch && !g.visible(eyeOf(g), a.g.position.clone().setY(a.g.position.y + .95))) crouchedHidden++; } });
  assert(states.has('move') && states.has('hide') && states.has('peek'), [...states].join());
  assert(reached, 'reached its cover point');
  assert(hiddenSamples > 0 && crouchedHidden / hiddenSamples > .9, `hidden while crouched ${crouchedHidden}/${hiddenSamples}`);
  assert(f.n > 0, 'fired at the player'); assert(f.states.every(s => s === 'peek' || s === 'hold'), `fired only while peeking/holding: ${f.states}`);
  const d0 = Math.hypot(sc.start[0] - sc.player[0], sc.start[1] - sc.player[1]), c = a.ai.cover ?? sc.c;
  assert(Math.hypot(c.x - sc.player[0], c.z - sc.player[1]) >= Math.min(d0, ENEMY_AI.engageMinDist) - 1e-6, 'never closes in to gain accuracy');
});

await check('cover search across the map: every chosen cover hides from the threat and is never closer than it already was', async () => {
  const g = await game(), a = enemies(g)[0]; isolate(g, a); const comp = g.ai.navComp();
  let s2 = 31; const r2 = () => ((s2 = (s2 * 1664525 + 1013904223) >>> 0) / 4294967296); let found = 0, preferCloser = 0;
  for (let i = 0; i < 4000 && found < 60; i++) {
    const px = -70 + r2() * 140, pz = -80 + r2() * 120, ang = r2() * Math.PI * 2, d = 20 + r2() * 24, tx = px + Math.cos(ang) * d, tz = pz + Math.sin(ang) * d;
    const free = (x, z) => !g.blocked(x, z, .45) && comp[Math.round((z + 90) / 2) * 91 + Math.round((x + 90) / 2)] === 1;
    if (!free(px, pz) || !free(tx, tz)) continue;
    a.g.position.set(px, g.groundY(px, pz), pz); a.ai.role = 'patrol';
    const threat = V(tx, g.groundY(tx, tz), tz), res = g.ai.coverQuery(a, threat); if (!res) continue; found++;
    const c = res.c, eye = threat.clone().setY(threat.y + 1.6);
    assert(!g.visible(eye, V(c.x, g.groundY(c.x, c.z) + (c.low ? .95 : 1.25), c.z)), `cover at ${c.x.toFixed(1)},${c.z.toFixed(1)} is visible from the threat`);
    const dNow = Math.hypot(px - tx, pz - tz), dCover = Math.hypot(c.x - tx, c.z - tz);
    assert(dCover >= Math.min(dNow, ENEMY_AI.engageMinDist) - 1e-9, `cover ${dCover.toFixed(1)} m from the threat, enemy was ${dNow.toFixed(1)} m`);
    if (dNow > ENEMY_AI.engageMinDist) preferCloser++;
  }
  assert(found >= 40 && preferCloser >= 20, `${found} cover choices checked (${preferCloser} from beyond ${ENEMY_AI.engageMinDist} m)`);
});

await check('relay safety: during capture a non-garrison enemy stuck inside the ring with no cover leaves it, so capture proceeds', async () => {
  const g = await game(), en = enemies(g), a = en.find(e => e.ai.role !== 'garrison'); isolate(g, a); noAllies(g);
  ENEMY_AI.coverSearchRadius = 0; // no cover anywhere: without the leave rule it would hold its ground inside the ring
  g.ai.setStage(1); g.player.set(3, g.groundY(3, -43), -43);
  a.g.position.set(-6, g.groundY(-6, -41), -41); a.route = []; a.ai.state = 'patrol';
  let firedWhileLeaving = 0, prev = a.cool, left = false;
  g.run(20, () => { if (a.cool > prev + .3 && a.ai.state === 'leave') firedWhileLeaving++; prev = a.cool; if (Math.hypot(a.g.position.x, a.g.position.z + 47) >= 15) left = true; });
  assert(left, 'left the 15 m capture ring'); assert.equal(firedWhileLeaving, 0, 'no fire while leaving');
  assert(g.state().state === 'playing' && Math.hypot(a.g.position.x, a.g.position.z + 47) >= ENEMY_AI.relayNoGo - 1, 'stays out of the no-go ring');
});

await check('repositioning: hits make an enemy in cover relocate (tunable relocateOnHit), never closer than it was', async () => {
  for (const [p, expectMove] of [[1, true], [0, false]]) {
    ENEMY_AI.relocateOnHit = p; ENEMY_AI.maxCoverHold = [1e6, 1e6]; // isolate hit-triggered moves from the hold-time rule
    const g = await game(), a = enemies(g)[0]; isolate(g, a); const sc = coverScenario(g, true);
    g.player.set(sc.player[0], g.groundY(...sc.player), sc.player[1]); a.g.position.set(sc.start[0], g.groundY(...sc.start), sc.start[1]); a.route = [];
    g.run(8); assert(['hide', 'rise', 'peek'].includes(a.ai.state), `in cover: ${a.ai.state}`);
    const first = a.ai.cover, dFirst = Math.hypot(first.x - sc.player[0], first.z - sc.player[1]); let moved = false, other = null;
    for (let k = 0; k < 6 && !moved; k++) { a.ai.lastRelocate = -1e9; a.hp -= 5; g.run(.5, () => { if (a.ai.state === 'move' && a.ai.cover !== first) { moved = true; other = a.ai.cover; } }); g.run(1.5); }
    assert.equal(moved, expectMove, `relocateOnHit=${p}`);
    if (other) assert(Math.hypot(other.x - sc.player[0], other.z - sc.player[1]) >= Math.min(dFirst, ENEMY_AI.engageMinDist) - 1e-6, 'relocation does not close in');
  }
});

await check('beatable: fire block and aiHit are unchanged from Build 06; at most attackTokens enemies shoot at one target', async () => {
  const now = fs.readFileSync(new URL('dist/game.js', projectRoot), 'utf8'), b06 = execSync('git show ce1d05c:dist/game.js', {cwd: new URL('.', projectRoot)}).toString();
  const fireBlock = s => s.slice(s.indexOf("a.cool=.65+rand()*.95;"), s.indexOf("aiHit(enemy,eye,endpoint))return;"));
  const aiHit = s => s.slice(s.indexOf('function aiHit('), s.indexOf('\n', s.indexOf('function aiHit(')));
  // Build 16 (AI-03, by request): the co-op teammate is a human like the host, so it is fired at with the host's chance,
  // crouch factor and damage, and a killed human goes through humanDown (Story co-op still fails the operation there).
  // Exactly those substitutions are undone here; with them undone the text must still be Build 06's, so the cadence, the
  // chances, the distance factor and every damage value are otherwise unchanged.
  const undo = (s, pairs) => pairs.reduce((t, [a, b]) => { assert.equal(t.split(a).length, 2, `Build 16 text present once: ${a.slice(0, 40)}`); return t.replace(a, b); }, s);
  const fireNow = undo(fireBlock(now), [["const human=!enemy.a||enemy.a.remote;let chance=human?.22:.42;", "let chance=enemy.a?.42:.22;"], ["if(human&&(enemy.a?enemy.a.crouch:crouch))chance*=.65;", "if(crouch&&!enemy.a)chance*=.65;"]]);
  const hitNow = undo(aiHit(now), [["enemy.a.remote?(rand()*10+12)*CLASSES[remoteClass].armor:24", "enemy.a.remote?(14+rand()*10)*CLASSES[remoteClass].armor:24"], ["{humanDown('mate');return state==='ended';}", "{finish(false,undefined,'teammate');return true;}"], ["{hp=0;humanDown('me');return state==='ended';}", "{hp=0;finish(false,undefined,'self');return true;}"]]);
  assert.equal(fireNow, fireBlock(b06), 'cadence, chance, distance and crouch factors unchanged (the teammate now shares the host\'s)'); assert.equal(hitNow, aiHit(b06), 'damage unchanged (the teammate now shares the host\'s)');
  for (const tokens of [3, 1]) {
    ENEMY_AI.attackTokens = tokens;
    const g = await game(), en = enemies(g); ENEMY_AI.reinforce = false; ENEMY_AI.coverSearchRadius = 0; // no cover: everyone holds and wants to fire
    en.forEach((a, i) => { const x = -12 + i * 4, z = 20; a.g.position.set(x, g.groundY(x, z), z); a.route = []; a.ai.role = 'patrol'; });
    g.player.set(0, g.groundY(0, 42), 42); let maxShooters = 0;
    g.run(12, () => { const n = en.filter(a => a.hp > 0 && a.ai.firing && a.ai.tokenKey === 'player').length; maxShooters = Math.max(maxShooters, n); });
    assert(maxShooters <= tokens && maxShooters >= 1, `tokens ${tokens}: max simultaneous shooters ${maxShooters}`);
  }
});

await check('reinforcements: corpses recycle within budget and alive cap, out of sight and away from humans; tunables are read', async () => {
  const spawnLog = async (tweak, seconds = 150) => {
    restore(); tweak?.(); const g = await game(), en = enemies(g), log = [];
    const life = new Map(en.map(a => [a, a.life]));
    for (const a of en) { a.hp = 0; a.dead = 999; }
    let maxAlive = 0;
    g.run(seconds, () => { for (const a of en) if (a.life !== life.get(a)) { life.set(a, a.life); const eye = eyeOf(g), p = a.g.position; log.push({x: p.x, z: p.z, dist: Math.hypot(p.x - g.player.x, p.z - g.player.z), seen: g.visible(eye, p.clone().setY(p.y + 1.0)) && g.visible(eye, p.clone().setY(p.y + 1.7)), blocked: g.blocked(p.x, p.z)}); a.hp = 0; a.dead = 999; }
      maxAlive = Math.max(maxAlive, en.filter(a => a.hp > 0).length); });
    return {log, maxAlive, g};
  };
  const base = await spawnLog();
  assert.equal(base.log.length, ENEMY_AI.budget[0], `stage 0 budget ${ENEMY_AI.budget[0]}`);
  assert(base.log.every(s => s.dist >= ENEMY_AI.spawnMinHumanDist && !s.seen && !s.blocked), JSON.stringify(base.log));
  assert.equal((await spawnLog(() => { ENEMY_AI.budget[0] = 0; })).log.length, 0, 'budget read');
  assert.equal((await spawnLog(() => { ENEMY_AI.reinforce = false; })).log.length, 0, 'reinforce switch read');
  assert.equal((await spawnLog(() => { ENEMY_AI.firstSpawnDelay = 1e6; })).log.length, 0, 'firstSpawnDelay read');
  const spaced = await spawnLog(() => { ENEMY_AI.budget[0] = 3; ENEMY_AI.waveSize[0] = 1; ENEMY_AI.spawnInterval = [60, 60]; ENEMY_AI.firstSpawnDelay = 5; ENEMY_AI.corpseMinAge = 0; }, 100);
  assert.equal(spaced.log.length, 2, 'spawnInterval read (5 s, then 65 s; the third would be at 125 s)');
  const capped = await spawnLog(() => { ENEMY_AI.maxAlive[0] = 1; ENEMY_AI.budget[0] = 9; ENEMY_AI.firstSpawnDelay = 1; ENEMY_AI.spawnInterval = [1, 1]; ENEMY_AI.corpseMinAge = 0; }, 20);
  assert(capped.maxAlive <= 1, 'maxAlive read');
});

await check('mission stays completable: relay capture and skirmish finish with reinforcements; only the garrison lingers near the relay', async () => {
  for (const mode of ['story', 'skirmish']) {
    const g = await game(); if (mode === 'skirmish') { g.setMode('skirmish'); g.reset(); g.play(); g.restoreAI(); g.set({hp: 1e9}); for (const a of g.actors) a.animate = a.visual.animate; } else g.ai.setStage(1);
    g.player.set(2, g.groundY(2, -40), -40); const en = enemies(g); let lingering = 0, t = 0, done = false;
    g.run(420, s => { t = s; if (done) return;
      for (const a of en) if (a.hp > 0 && Math.hypot(a.g.position.x, a.g.position.z + 47) < 20 && Math.floor(s * 60) % 60 === 0) { a.hp = 0; a.dead = 999; } // the player clears the relay once a second
      for (const a of en) if (a.hp > 0 && a.ai.role !== 'garrison' && a.ai.state !== 'leave' && Math.hypot(a.g.position.x, a.g.position.z + 47) < ENEMY_AI.relayNoGo - .5) lingering++;
      done = mode === 'story' ? g.getStage() === 2 : g.state().state === 'ended'; });
    assert(done, `${mode}: capture completed`); assert.equal(lingering, 0, 'non-garrison enemies never linger in the no-go ring');
    assert(g.ai.director().spawned <= ENEMY_AI.budget[mode === 'story' ? 1 : 'skirmish']);
  }
});

await check('AI-02: nothing is placed inside geometry across repeated runs; the old (12,-17) spot is corrected; stuck actors are freed', async () => {
  assert(!ENEMY_SPAWNS.some(([x, z]) => x === 12 && z === -17), 'spawn data no longer inside the (11,-17) wall');
  const g = await game({ai: false}), comp = g.ai.navComp();
  const ok = (x, z) => !g.blocked(x, z) && comp[Math.round((z + 90) / 2) * 91 + Math.round((x + 90) / 2)] === 1;
  for (let run = 0; run < 25; run++) { g.reset(); g.play(); for (const a of g.actors) { const p = a.g.position; assert(ok(p.x, p.z), `run ${run}: ${a.team} ${a.index} at ${p.x.toFixed(2)},${p.z.toFixed(2)}`); } }
  for (const [x, z] of [[12, -17], [11, -17], [-30, -27], [0, 7]]) { const [sx, sz] = g.ai.safeSpot(x, z); assert(ok(sx, sz) && Math.hypot(sx - x, sz - z) < 3, `safeSpot(${x},${z})`); }
  const r = await game(), a = enemies(r)[1]; isolate(r, a); a.g.position.set(12, r.groundY(12, -17), -17); r.run(.2);
  assert(!r.blocked(a.g.position.x, a.g.position.z), 'an actor found inside a wall is moved out');
  const start = a.g.position.clone(); r.run(40); assert(a.g.position.distanceTo(start) > 5, 'and walks away (Build 06: never moved)');
});

await check('AI-02: navigation matches collision — routes between random walkable points are walkable', async () => {
  const g = await game({ai: false}), comp = g.ai.navComp(), pts = [];
  let seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  while (pts.length < 80) { const x = -70 + rnd() * 140, z = -80 + rnd() * 150; if (!g.blocked(x, z, .45) && comp[Math.round((z + 90) / 2) * 91 + Math.round((x + 90) / 2)]) pts.push([x, z]); }
  let arrived = 0; const walker = {x: 0, z: 0};
  for (let i = 0; i < 40; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 40]; const p = V(ax, 0, az), goal = V(bx, 0, bz); let route = g.ai.pathTo(p, goal), stuck = 0;
    for (let t = 0; t < 60 * 90 && Math.hypot(p.x - bx, p.z - bz) > 2.5; t++) {
      while (route.length && Math.hypot(route[0].x - p.x, route[0].z - p.z) < .6) route.shift();
      const w = route.length ? route[0] : goal, dx = w.x - p.x, dz = w.z - p.z, len = Math.hypot(dx, dz) || 1, moved = g.move(p, dx / len * .05, dz / len * .05);
      if (moved < .01) { if (++stuck > 90) { route = g.ai.pathTo(p, goal); stuck = 0; } } else stuck = 0;
      if (!route.length && Math.hypot(p.x - bx, p.z - bz) > 2.5 && t % 120 === 0) route = g.ai.pathTo(p, goal);
    }
    if (Math.hypot(p.x - bx, p.z - bz) <= 2.5) arrived++;
  }
  assert(arrived >= 37, `${arrived}/40 random routes walked to the goal (Build 06 grid: ~60%)`);
});

await check('co-op: the guest sees host enemy positions, crouch, deaths and recycled respawns (no sliding)', async () => {
  const host = await game({role: 'host'}), guest = await game({role: 'guest', ai: false});
  const hEn = enemies(host), gEn = enemies(guest);
  let checked = 0, crouchSeen = 0, respawnChecked = 0; const lastLife = gEn.map(a => a.life);
  const pump = () => { host.networkTick(1); for (const m of host.messages.splice(0)) guest.receive(m); };
  const sc = coverScenario(host, true), a = hEn[0]; isolate(host, a); ENEMY_AI.reinforce = true; ENEMY_AI.firstSpawnDelay = 3; ENEMY_AI.corpseMinAge = 0; ENEMY_AI.spawnInterval = [2, 2];
  host.player.set(sc.player[0], host.groundY(...sc.player), sc.player[1]); a.g.position.set(sc.start[0], host.groundY(...sc.start), sc.start[1]); a.route = [];
  for (let i = 0; i < 60 * 40; i++) {
    host.step(1 / 60); if (i % 5 === 0) pump(); guest.step(1 / 60);
    if (i % 5 === 0) hEn.forEach((h, k) => { const gg = gEn[k]; if (h.hp > 0) { checked++; assert(gg.netPos.distanceTo(h.g.position) < 1e-6, 'snapshot position'); assert.equal(gg.crouch, !!h.crouch, 'crouch mirrored'); if (h.crouch) crouchSeen++; }
      if (gg.life !== lastLife[k]) { respawnChecked++; assert(gg.g.position.distanceTo(gg.netPos) < 1e-6 && gg.hp > 0 && !gg.visual.state().falling, 'respawn snaps, no slide, standing'); lastLife[k] = gg.life; } });
    if (i === 60 * 20) { a.hp = 0; a.dead = 999; }
  }
  assert(checked > 100 && crouchSeen > 0, `positions ${checked}, crouched ${crouchSeen}`); assert(respawnChecked > 0, 'saw a recycled enemy on the guest');
  const snap = host.messages.length ? host.messages.at(-1) : null; void snap;
});

await check('tunables: every ENEMY_AI value is read by game.js (none exists without an effect)', async () => {
  const src = fs.readFileSync(new URL('dist/game.js', projectRoot), 'utf8');
  const unread = Object.keys(ENEMY_AI).filter(k => !new RegExp(`\\b(T|ENEMY_AI)\\.${k}\\b`).test(src));
  assert.deepEqual(unread, []);
  // Spot-check runtime effect of the movement tunable too.
  for (const speed of [1.6, .8]) { ENEMY_AI.patrolSpeed = speed; const g = await game(), a = enemies(g)[0]; isolate(g, a); const p0 = a.g.position.clone(); g.run(3); const v = a.g.position.distanceTo(p0) / 3; assert(v <= speed + .05 && v > speed * .5, `patrolSpeed ${speed}: ${v.toFixed(2)} m/s`); }
});

console.log(JSON.stringify({passed: results.length, checks: results, limitations: [
  'Headless production code; behaviour is checked numerically (states, positions, rays, counts), not for how it looks or feels.',
  'Co-op uses host snapshots replayed into a guest instance; no real WebRTC, latency or packet loss.']}, null, 2));
