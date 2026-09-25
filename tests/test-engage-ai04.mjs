// AI-04 (Build 08 playtest): "an enemy actively fighting me turned away mid-fight and went back to patrolling".
// Causes found: (1) enemies only checked the three nearest possible targets for line of sight, so three nearer hidden
// allies made a player in plain view invisible; (2) an engaged enemy gave up after 6 s without its own sighting even while
// its target was alive, close and firing, and its search ended in patrol; (3) hearing re-armed the threat without
// restarting that clock, so the enemy flipped between fighting and patrolling every frame. An enemy now keeps its foe
// (the target it last saw) while that foe is alive and within engageLeash, hunts it when sight is lost, and returns to
// duty only when the foe is dead or far away. Headless production code with the real tickAI.
import assert from 'node:assert/strict';
import {createGame, projectRoot} from './sprint-harness.mjs';

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const {ENEMY_AI} = await import(new URL('dist/enemy-ai.js', projectRoot));
const DEFAULTS = structuredClone(ENEMY_AI);
const results = [], report = {};
async function check(name, fn) { Object.assign(ENEMY_AI, structuredClone(DEFAULTS)); try { await fn(); } finally { Object.assign(ENEMY_AI, structuredClone(DEFAULTS)); } results.push(name); }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const COMBAT = ['move', 'hide', 'rise', 'peek', 'hold'], DUTY = ['patrol', 'garrison'];

// One enemy (index 0) and nothing else: the other enemies are dead and gone, no reinforcements, allies down unless placed.
async function arena({allies = false} = {}) {
  const g = await createGame(); g.prepare({clearLane: false}); g.restoreAI(); g.set({hp: 1e9}); g.el('blood').checked = false;
  for (const a of g.actors) a.animate = a.visual.animate;
  let clock = 0; g.frame(0); g.run = (s, each) => { for (let i = 0, n = Math.round(s * 60); i < n; i++) { g.frame(clock += 1000 / 60); each?.(clock / 1000); } };
  ENEMY_AI.reinforce = false; const en = g.actors.filter(a => a.team === 'enemy'), e = en[0];
  for (const a of en) if (a !== e) { a.hp = 0; a.dead = 999; a.diedAt = -1e9; }
  g.allies = g.actors.filter(a => a.team === 'ally' && !a.remote);
  if (!allies) for (const a of g.allies) { a.hp = 0; a.dead = 1e9; a.g.visible = false; }
  e.hp = 1e9; e.ai.lastHp = 1e9; e.route = [];
  return {g, e};
}
const eyeAt = (g, x, z, h) => V(x, g.groundY(x, z) + h, z);
// Low cover with an open start beside it and a player 22 m away who can see both the start and the peek position,
// plus a spot within 7 m of the player that cannot be seen from anywhere around the cover (T13's scenario).
function coverFight(g) {
  let seed = 9; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (const c of g.ai.coverTable().points) {
    if (!c.low) continue;
    const px = c.x - c.nx * 22, pz = c.z - c.nz * 22, sx = c.x + c.nz * 3.5 + c.nx * .5, sz = c.z - c.nx * 3.5 + c.nz * .5;
    if (g.blocked(px, pz) || g.blocked(sx, sz) || Math.abs(px) > 80 || Math.abs(pz) > 80) continue;
    if (!g.visible(eyeAt(g, px, pz, 1.7), eyeAt(g, sx, sz, 1.25)) || !g.visible(eyeAt(g, c.x, c.z, 1.42), eyeAt(g, px, pz, 1.4))) continue;
    for (let k = 0; k < 300; k++) {
      const r = 2 + rnd() * 5, b = rnd() * Math.PI * 2, hx = px + Math.sin(b) * r, hz = pz + Math.cos(b) * r;
      if (g.blocked(hx, hz, .5)) continue; const H = eyeAt(g, hx, hz, 1.4);
      let hidden = !g.visible(eyeAt(g, c.x, c.z, 1.42), H);
      for (let t = 0; t < 40 && hidden; t++) { const q = t / 40 * Math.PI * 2, qx = c.x + Math.sin(q) * 6, qz = c.z + Math.cos(q) * 6; if (!g.blocked(qx, qz) && g.visible(eyeAt(g, qx, qz, 1.42), H)) hidden = false; }
      if (hidden) return {c, player: [px, pz], start: [sx, sz], hide: [hx, hz]};
    }
  }
  throw new Error('no cover fight scenario');
}
function engage(g, e, sc) {
  g.player.set(sc.player[0], g.groundY(...sc.player), sc.player[1]); e.g.position.set(sc.start[0], g.groundY(...sc.start), sc.start[1]);
  let saw = false; g.run(10, () => { if (e.seen && !e.seen.a) saw = true; });
  assert(saw && COMBAT.includes(e.ai.state) && e.ai.foe === 'player', `the enemy engaged the player (state ${e.ai.state})`);
}

await check('perception: an enemy sees a target in plain view even when three nearer allies are hidden from it (Build 08: never)', async () => {
  const {g, e} = await arena({allies: true});
  let seed = 5; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296), sees = (a, b, h) => g.visible(a.clone().setY(a.y + 1.42), b.clone().setY(b.y + h));
  let found = null;
  for (let i = 0; i < 20000 && !found; i++) {
    const ex = -60 + rnd() * 120, ez = -70 + rnd() * 120; if (g.blocked(ex, ez, .6)) continue;
    const E = V(ex, g.groundY(ex, ez), ez), ang = rnd() * Math.PI * 2, d = 20 + rnd() * 10, px = ex + Math.sin(ang) * d, pz = ez + Math.cos(ang) * d;
    if (g.blocked(px, pz, .6)) continue; const P = V(px, g.groundY(px, pz), pz); if (!sees(E, P, 1.4)) continue;
    const spots = [];
    for (let k = 0; k < 400 && spots.length < 3; k++) { const r = 4 + rnd() * (d - 6), b = rnd() * Math.PI * 2, x = ex + Math.sin(b) * r, z = ez + Math.cos(b) * r;
      if (g.blocked(x, z, .5) || spots.some(s => Math.hypot(s.x - x, s.z - z) < 2)) continue; const Q = V(x, g.groundY(x, z), z);
      if (!sees(E, Q, 1.25) && !g.visible(E.clone().setY(E.y + 1.12), Q.clone().setY(Q.y + 1.25)) && !sees(Q, E, 1.42) && Q.distanceTo(P) > 4) spots.push(Q); }
    if (spots.length === 3) found = {E, P, spots};
  }
  const {E, P, spots} = found;
  g.player.copy(P); Object.assign(e.ai, {state: 'hold', flushed: true, retry: Infinity, cover: null}); e.g.position.copy(E);
  let player = 0, frames = 0;
  g.run(3, () => { g.allies.forEach((a, i) => { a.g.position.copy(spots[i]); a.route = []; a.routeTime = 99; }); e.g.position.copy(E); frames++; if (e.seen && !e.seen.a) player++; });
  assert(spots.every(s => E.distanceTo(s) < E.distanceTo(P)), 'all three allies are nearer than the player');
  report.perception = {playerDist: +E.distanceTo(P).toFixed(1), allyDists: spots.map(s => +E.distanceTo(s).toFixed(1)), playerSeenShare: +(player / frames).toFixed(2)};
  assert(player / frames > .85, `the player is seen in ${(player / frames * 100).toFixed(0)}% of frames`);
});

await check('an engaged enemy stays engaged while its target is alive and near: the player breaks line of sight for 30 s (firing, silent, and silent with a threat memory shorter than the search delay) and the enemy never returns to patrol, never flips state every frame, keeps its foe and fights again when the player reappears', async () => {
  report.hide = {};
  for (const [firing, memory] of [[true, null], [false, null], [false, 3]]) {
    const {g, e} = await arena(), sc = coverFight(g); if (memory) ENEMY_AI.threatMemory = memory; engage(g, e, sc);
    g.player.set(sc.hide[0], g.groundY(...sc.hide), sc.hide[1]);
    const states = [], start = e.g.position.distanceTo(g.player); let changes = 0, last = e.ai.state, duty = 0;
    g.run(30, t => { if (firing) g.set({trigger: Math.floor(t * 2) % 2 === 0}); if (e.ai.state !== last) { changes++; last = e.ai.state; states.push(last); } if (DUTY.includes(e.ai.state)) duty++; });
    g.set({trigger: false});
    const label = firing ? 'firing' : memory ? `silent, threatMemory ${memory} s` : 'silent';
    report.hide[label] = {changes, states: [...new Set(states)], dutyFrames: duty, distance: [+start.toFixed(1), +e.g.position.distanceTo(g.player).toFixed(1)]};
    assert.equal(duty, 0, `${label}: never back on patrol or garrison duty (${JSON.stringify(report.hide[label])})`);
    assert(changes <= 20, `${label}: ${changes} state changes in 30 s (Build 08 flipped every frame)`);
    assert.equal(e.ai.foe, 'player', `${label}: still fighting the player`);
    // The player steps back out where the enemy can see them: it fights again (sees and fires) within 12 s.
    g.player.set(sc.player[0], g.groundY(...sc.player), sc.player[1]);
    let sees = false, fires = false; g.run(12, () => { if (e.seen && !e.seen.a) sees = true; if (e.ai.firing) fires = true; });
    assert(sees && fires, `${label}: re-engages when the player reappears (sees ${sees}, fires ${fires})`);
  }
});

await check('engagement still ends when the target is gone: beyond engageLeash the enemy returns to duty; a dead foe releases it; engageLeash is read', async () => {
  const far = async leash => {
    const {g, e} = await arena(), sc = coverFight(g); engage(g, e, sc); if (leash) ENEMY_AI.engageLeash = leash;
    const away = V(sc.player[0], 0, sc.player[1]).sub(V(e.g.position.x, 0, e.g.position.z)).setY(0).normalize().multiplyScalar(80).add(g.player);
    g.player.set(away.x, g.groundY(away.x, away.z), away.z);
    let at = null, t0 = null; g.run(45, t => { t0 ??= t; if (at === null && DUTY.includes(e.ai.state)) at = t - t0; });
    return at;
  };
  const released = await far(), leashed = await far(200);
  report.leash = {dutyAfter: released && +released.toFixed(1), withLeash200: leashed};
  assert(released !== null, 'player moved ~100 m away: back to duty within 45 s');
  assert.equal(leashed, null, 'engageLeash read: with a 200 m leash the same enemy stays in the fight');
  // An ally is the foe, the player is far away; when the ally goes down the enemy returns to duty.
  const {g, e} = await arena({allies: true}), sc = coverFight(g), ally = g.allies[0];
  for (const a of g.allies) if (a !== ally) { a.hp = 0; a.dead = 1e9; a.g.visible = false; }
  g.player.set(sc.player[0] + 150, g.groundY(sc.player[0] + 150, sc.player[1]), sc.player[1]);
  e.g.position.set(sc.start[0], g.groundY(...sc.start), sc.start[1]); ally.hp = 1e9;
  const pin = () => { ally.g.position.set(sc.player[0], g.groundY(...sc.player), sc.player[1]); ally.route = []; ally.routeTime = 99; ally.cool = 99; };
  g.run(10, pin); assert.equal(e.ai.foe, ally, 'fighting the ally');
  ally.hp = 0; ally.dead = 1e9;
  let at = null, t0 = null; g.run(45, t => { t0 ??= t; if (at === null && DUTY.includes(e.ai.state)) at = t - t0; });
  report.leash.afterAllyDown = at && +at.toFixed(1);
  assert(at !== null, 'foe down: back to duty within 45 s');
});

console.log(JSON.stringify({passed: results.length, checks: results, report, limitations: [
  'Headless with the real tickAI on the real map; human feel of the hunt (how it looks when an enemy closes in on a hidden player) needs the playtest.']}, null, 2));
