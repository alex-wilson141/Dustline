// Build 09 Ambush: points, purchases, areas, the arena edge, waves, spawns, death, squadmates and the extract choice.
// Headless production code with the real tickAI, hitScan and aiHit (rendering, audio and transport mocked).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame, projectRoot} from './sprint-harness.mjs';

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const {CLASSES} = await import(new URL('dist/combat.js', projectRoot));
const {ENEMY_AI} = await import(new URL('dist/enemy-ai.js', projectRoot));
const {AMBUSH, AREAS, GATES, STATIONS, waveSpec, aiTuningFor, bankMultiplier, magazinePrice, inArena, distToArena} = await import(new URL('dist/ambush.js', projectRoot));
const results = [], report = {};
async function check(name, fn) { await fn(); results.push(name); }
const V = (x, y, z) => new THREE.Vector3(x, y, z);

async function ambush() {
  const g = await createGame(); g.prepare({clearLane: false});
  g.setMode('ambush'); g.reset(); g.play(); g.restoreAI(); g.set({hp: 1e9}); g.el('blood').checked = false;
  for (const a of g.actors) a.animate = a.visual.animate;
  let clock = 0; g.frame(0); g.run = (s, each) => { for (let i = 0, n = Math.round(s * 60); i < n; i++) { g.frame(clock += 1000 / 60); if (each?.(clock / 1000) === false) break; } };
  g.goTo = (x, z) => { g.player.set(x, g.groundY(x, z), z); };
  g.buy = () => { g.frame(clock += 1000 / 60); return g.ambush.interact(); };
  return g;
}
const enemies = g => g.actors.filter(a => a.team === 'enemy');
const eyeOf = g => g.player.clone().setY(g.player.y + 1.7);
const pts = g => Number(g.el('points').textContent);
// Places an enemy in front of the player and kills it with one real hitScan (body or head).
function killInFront(g, head, source = 'local') {
  const e = enemies(g).find(a => a.hp <= 0); const [x, z] = [g.player.x, g.player.z - 9];
  e.hp = 1; e.dead = 0; e.gone = false; e.g.visible = true; e.resetPose(); e.g.position.set(x, g.groundY(x, z), z); e.g.rotation.set(0, Math.PI, 0); e.g.updateMatrixWorld(true); e.ai = {role: 'ambush', dir: 1, lastHp: 1, state: 'hold'};
  const from = V(g.player.x, g.player.y + 1.6, g.player.z), aim = e.g.position.clone().add(V(0, head ? 1.62 : 1.15, 0));
  g.hitScan(from, aim.sub(from).normalize(), CLASSES.assault, source);
  return e.hp <= 0;
}

await check('menu: Ambush is a third mode; since Build 16 it can be selected while a co-op session is connected (two-player Ambush); leaving it restores Story exactly (no Ambush geometry, collision or weapon left behind)', async () => {
  const html = fs.readFileSync(new URL('dist/index.html', projectRoot), 'utf8'), src = fs.readFileSync(new URL('dist/game.js', projectRoot), 'utf8');
  assert.match(html, /data-mode="story"[^]*data-mode="skirmish"[^]*data-mode="ambush"[^]*data-mode="coop"/, 'tab order Story, Skirmish, Ambush, Private co-op');
  // Build 16: Ambush can be chosen while a teammate is connected (two-player Ambush, T26); choosing it keeps the connection.
  assert(/ab\.disabled=false/.test(src) && src.includes("if(peer.connected){if(peer.role==='guest'&&!told)") && src.includes("else if(next!=='coop'&&peer.pc)peer.close();"), 'the Ambush tab is open while connected and no tab ends a session (Build 20)');
  const base = await createGame(); base.prepare({clearLane: false}); const solids0 = base.solids.length, occ0 = base.occluders.length;
  const g = await createGame(); g.prepare({clearLane: false}); const storyTitle = g.el('brief-title').textContent;
  // Build 16: with a teammate connected the tab opens two-player Ambush and says so; back to Story for the rest of this check.
  g.peer.connected = true; g.setMode('ambush'); assert.equal(g.el('brief-title').textContent, 'Hold the west district.'); assert.match(g.el('brief-text').textContent, /^Ambush, two players/, 'two-player Ambush while a co-op session is connected'); g.peer.connected = false; g.setMode('story');
  g.setMode('ambush'); assert.equal(g.el('brief-title').textContent, 'Hold the west district.'); assert.equal(g.el('ambush-steps').hidden, false);
  g.reset(); assert.equal(g.amb.gates.size, 3); assert(g.solids.length > solids0 && g.occluders.length > occ0, 'Ambush adds barricades and crates');
  g.setClass('support'); g.reset(); g.amb.points = 1e4; g.player.set(STATIONS[0].at[0], 0, STATIONS[0].at[1] + 1.2); g.play(); g.frame(1); g.ambush.interact(); assert.equal(g.ambush.gunId(), 'medic');
  g.setMode('story'); g.reset();
  assert.equal(g.solids.length, solids0); assert.equal(g.occluders.length, occ0); assert.equal(g.amb.gates.size + g.amb.stations.length, 0); assert.equal(g.amb.edges, null);
  assert.equal(g.ambush.gunId(), 'support', 'the class weapon again'); assert.equal(g.getClass(), CLASSES.support);
});

await check('points: a body kill earns 100 and a headshot kill 150 through the real hitScan; kills by squadmates and non-player sources earn nothing; the HUD shows the balance', async () => {
  const g = await ambush(); assert.equal(g.amb.points, AMBUSH.startPoints); g.ambush.hud(); assert.equal(pts(g), 500);
  assert(killInFront(g, false)); assert.equal(g.amb.points, 600); assert.equal(pts(g), 600); assert.match(g.el('pointsgain').textContent, /\+100$/);
  assert(killInFront(g, true)); assert.equal(g.amb.points, 750); assert.equal(g.amb.earned, 250); assert.match(g.el('pointsgain').textContent, /\+150 HEADSHOT/);
  assert(killInFront(g, false, 'remote')); assert.equal(g.amb.points, 750, 'no points for a non-local shot');
  const e = enemies(g).find(a => a.hp <= 0); e.hp = 1; e.g.visible = true;
  g.aiHit({pos: e.g.position, a: e}, V(-30, 1.4, 10), e.g.position.clone().setY(1.25)); assert(e.hp <= 0); assert.equal(g.amb.points, 750, 'bot kills earn nothing (KILL-01)');
  assert.equal(g.kills(), 3);
});

await check('purchases are gated on the balance and wired: the price shown is the price paid; a barricade blocks until bought and then opens its area; crates sell the class rifles with unchanged stats and refill for half', async () => {
  const g = await ambush(), gate = GATES[0], [sx, sz] = gate.station, stand = () => g.goTo(sx, sz + 1.6);
  const across = () => { const p = V(sx, 0, sz + 1.6); g.move(p, 0, -3.5); return p.z; };
  stand(); g.amb.points = 700; g.frame(1); g.ambush.tick(0);
  assert.equal(g.el('interact').textContent, `E · CLEAR BARRICADE TO FIELD OFFICE YARD · ${gate.price} PTS (NEED 50 MORE)`);
  const solidsBefore = g.solids.length; assert.equal(g.ambush.interact(), false); assert.equal(g.amb.points, 700); assert.equal(g.solids.length, solidsBefore);
  assert(across() > sz + .3, 'the barricade blocks the way'); assert(!g.amb.open.has(2));
  g.amb.points = 750; g.ambush.tick(0); const price = Number(g.el('interact').textContent.match(/· (\d+) PTS/)[1]);
  assert.equal(g.ambush.interact(), true); assert.equal(750 - g.amb.points, price, 'the price shown is the price paid'); assert.equal(g.amb.points, 0);
  assert(g.amb.open.has(2) && !g.amb.gates.has(gate.id)); assert(g.solids.length < solidsBefore); assert(across() < sz - 1, 'the way is open');
  // Weapon crates: the area 1 crate sells the Medic's MK4 CQB for 500; your class (armor, speed) is unchanged.
  const st = STATIONS[0]; g.goTo(st.at[0], st.at[1] + 1.4); g.amb.points = 499; g.ambush.tick(0);
  assert.match(g.el('interact').textContent, /BUY MK4 CQB · 500 PTS \(NEED 1 MORE\)/); assert.equal(g.ambush.interact(), false); assert.equal(g.ambush.gunId(), 'assault');
  g.amb.points = 500; assert.equal(g.ambush.interact(), true); assert.equal(g.amb.points, 0); assert.equal(g.ambush.gunId(), 'medic');
  const w = g.ambush.weapon(); assert.equal(w.config, CLASSES.medic); assert.deepEqual([w.ammo, w.reserve], [30, 120], 'a bought rifle comes with five magazines (Build 12)'); assert.equal(g.getClass(), CLASSES.assault, 'class unchanged');
  // The purchased rifle is the one that fires: a body hit does the CQB's damage.
  const e = enemies(g)[0]; e.hp = 100; e.dead = 0; e.gone = false; e.g.visible = true; e.resetPose(); e.g.position.set(g.player.x, g.groundY(g.player.x, g.player.z - 8), g.player.z - 8); e.g.updateMatrixWorld(true);
  e.ai = {role: 'ambush', dir: 1, lastHp: 100, state: 'hold', flushed: true, retry: Infinity};
  g.frame(2); const cam = g.camera.position, chest = e.g.position.clone().setY(e.g.position.y + 1.15), d = chest.clone().sub(cam);
  g.set({yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z))}); g.set({trigger: true}); for (let i = 0; i < 3 && e.hp === 100; i++) g.frame(3 + i * 200); g.set({trigger: false});
  assert.equal(100 - e.hp, CLASSES.medic.damage, 'CQB damage per body hit');
  // Ammunition (Build 11): E does nothing at the crate of the rifle you hold; B buys one magazine at the wave's price.
  w.ammo = 0; w.reserve = 0; const mp = magazinePrice(CLASSES.medic, 1); g.amb.points = mp - 1; g.ambush.tick(0); assert.match(g.el('interact').textContent, new RegExp(`^YOUR MK4 CQB · RESERVE 0/120 · DRESSINGS 2/5\\nB · MAGAZINE \\(30 RDS\\) · ${mp} PTS \\(NEED 1 MORE\\)   N · FIELD DRESSING · 150 PTS \\(NEED 81 MORE\\)\n1 · FRAG · 300 PTS`)); /* Build 19 added the throwables line (T29) */ assert.equal(g.ambush.interact(), false); assert.equal(g.ambush.buyAmmo(), false);
  g.amb.points = mp; assert.equal(g.ambush.buyAmmo(), true); assert.deepEqual([w.ammo, w.reserve, g.amb.points], [0, 30, 0]);
  // A crate in a closed area cannot be used (you would be outside the arena).
  g.goTo(STATIONS[2].at[0], STATIONS[2].at[1] + 1.4); g.amb.points = 5000; assert.equal(g.ambush.near(), null);
});

await check('areas open only when bought, in order, and stay open through later waves; a new run closes them again', async () => {
  const g = await ambush(), A = g.amb;
  g.goTo(-26, -10); g.ambush.tick(.1); assert(A.out > 0, 'area 2 is outside the arena before it is bought');
  g.goTo(-40.5, -8.5); A.points = 1e4; assert.equal(g.ambush.near(), null, 'barricade 2→3 cannot be bought before area 2 is open');
  g.goTo(-26.5, 3.6); g.ambush.interact(); g.goTo(-39, -8); g.ambush.tick(.1); assert.equal(A.out, 0);
  assert.equal(g.ambush.near()?.gate.id, 'g23'); g.ambush.interact(); g.goTo(-26, -22.4); assert.equal(g.ambush.near()?.gate.id, 'g24'); g.ambush.interact();
  assert.deepEqual([...A.open].sort(), [1, 2, 3, 4]); assert.equal(A.gates.size, 0);
  const openAt = [];
  g.goTo(-30, -10); A.phase = 'break'; A.timer = 0;
  for (let wave = 0; wave < 3; wave++) g.run(80, () => { for (const e of enemies(g)) if (e.hp > 0 && g.state().state === 'playing') { e.hp = 0; e.dead = 999; } openAt.push(A.open.size); });
  assert(A.wave >= 3, `waves played (${A.wave})`); assert(openAt.every(n => n === 4), 'areas stay open'); assert.equal(A.gates.size, 0, 'barricades never come back');
  g.reset(); assert.deepEqual([...g.amb.open], [1]); assert.equal(g.amb.gates.size, 3);
});

await check('the arena edge: a marked line along every open border (not between open areas, not under a barricade) that moves as areas open; 5 s outside ends the run with a visible countdown; stepping back in cancels it', async () => {
  const g = await ambush(), A = g.amb;
  const onBorder = ([x1, z1, x2, z2]) => AREAS.some(a => A.open.has(a.id) && ((x1 === x2 && (x1 === a.x[0] || x1 === a.x[1])) || (z1 === z2 && (z1 === a.z[0] || z1 === a.z[1]))));
  const length = () => A.segs.reduce((s, [x1, z1, x2, z2]) => s + Math.hypot(x2 - x1, z2 - z1), 0);
  assert(A.segs.length && A.segs.every(onBorder)); assert(g.scene.children.includes(A.edges) && A.edges.children.length >= 3, 'stripe and post meshes in the scene');
  assert(Math.abs(length() - (2 * (21 + 26) - 15)) < .6, `courtyard edge ${length().toFixed(1)} m = perimeter minus the 15 m barricade`);
  A.points = 750; g.goTo(-26.5, 3.6); g.ambush.interact();
  assert(A.segs.every(onBorder)); assert(!A.segs.some(([x1, z1, x2, z2]) => z1 === 2 && z2 === 2 && Math.max(x1, x2) <= -19), 'no line where areas 1 and 2 meet');
  // Courtyard west, south and east (26 + 21 + 26), the yard's east side (26) and its open stretch north of x -19 (7); the
  // yard's west and south sides are the two closed barricades.
  assert(Math.abs(length() - 106) < .6, `edge after opening the yard ${length().toFixed(1)} m (expected 106)`);
  // Out of bounds: countdown visible and falling; back inside cancels; 5 s outside ends the run.
  g.goTo(-16, 20); const texts = []; g.run(2.5, () => { g.ambush.hud(); texts.push(g.el('bounds').textContent); });
  assert(!g.el('bounds').hidden && /OUTSIDE THE ARENA/.test(texts.at(-1))); const secs = texts.map(t => Number(t.match(/([\d.]+)$/)[1]));
  assert(secs[0] > secs.at(-1) && Math.abs(secs.at(-1) - (5 - 2.5)) < .15, `countdown ${secs[0]} → ${secs.at(-1)}`);
  g.goTo(-24, 20); g.run(.5, () => g.ambush.hud()); assert.equal(A.out, 0); assert(g.el('bounds').hidden); assert.equal(g.state().state, 'playing');
  g.goTo(-16, 20); let endedAt = null; g.run(6, t => { if (g.state().state === 'ended') { endedAt = t; return false; } });
  assert.equal(g.state().state, 'ended'); assert.equal(g.el('result').textContent, 'Left the arena.'); assert.match(g.el('report').textContent, /Nothing banked/);
  report.edge = {courtyardEdge_m: +(2 * (21 + 26) - 15).toFixed(1)};
});

await check('waves escalate by count, pressure and aggression within bounds (never accuracy or damage), and the director delivers exactly that', async () => {
  let prev = null;
  for (let n = 1; n <= 40; n++) { const w = waveSpec(n);
    assert(w.count <= 40 && w.aliveCap <= AMBUSH.aliveCeiling && w.spawnGap >= .8 && w.fightRange >= 14 && w.pauseScale >= .5);
    if (prev) { assert(w.count >= prev.count && w.aliveCap >= prev.aliveCap && w.spawnGap <= prev.spawnGap && w.fightRange <= prev.fightRange && w.pauseScale <= prev.pauseScale); if (n <= 18) assert(w.count > prev.count, `wave ${n} larger`); }
    prev = w; }
  const t = aiTuningFor(12, ENEMY_AI), base = Object.keys(ENEMY_AI).filter(k => !['reinforce', 'corpseMax', 'corpseLife', 'engageLeash'].includes(k));
  for (const k of base) assert.deepEqual(t[k], ENEMY_AI[k], `${k} unchanged`);
  const g = await ambush(), A = g.amb, en = enemies(g), life = new Map(en.map(a => [a, a.life])), per = {};
  let maxOver = 0, wave = 0;
  g.run(700, () => { if (A.wave !== wave) wave = A.wave;
    for (const a of en) if (a.life !== life.get(a)) { life.set(a, a.life); per[A.wave] = (per[A.wave] || 0) + 1; a.killAt = g.state().elapsed + 3; }
    for (const a of en) if (a.hp > 0 && g.state().elapsed >= a.killAt) { a.hp = 0; a.dead = 999; }
    const alive = en.filter(a => a.hp > 0).length; maxOver = Math.max(maxOver, alive - waveSpec(Math.max(1, A.wave)).aliveCap);
    if (A.phase === 'decision') g.ambush.decide(false); if (A.wave > 7) return false; });
  report.waves = Object.fromEntries(Object.entries(per).map(([n, c]) => [n, c]));
  // Pressure: with nobody killed, the alive cap is reached and never exceeded (wave 1: 4 of 6; wave 7: 7 of 18).
  for (const n of [1, 7]) { const h = await ambush(); h.goTo(-30, 20); h.ambush.startWave(n); let most = 0;
    h.run(90, () => { most = Math.max(most, enemies(h).filter(a => a.hp > 0).length); });
    assert.equal(most, waveSpec(n).aliveCap, `wave ${n}: at most ${waveSpec(n).aliveCap} alive at once, reached (${most})`); report.waves[`cap${n}`] = most; }
  for (let n = 1; n <= 7; n++) assert.equal(per[n], waveSpec(n).count, `wave ${n}: ${per[n]} arrivals, spec ${waveSpec(n).count}`);
  assert(maxOver <= 0, 'never more alive than the cap');
});

await check('spawns across 12 waves: never inside geometry, never in the open arena (at least 6 m outside), never within 35 m or in view of the player, always reachable', async () => {
  const g = await ambush(), A = g.amb, en = enemies(g), life = new Map(en.map(a => [a, a.life])), bad = [], all = [];
  const plan = {3: [[-26.5, 3.6], [-26, -10]], 5: [[-39, -8], [-48, -6]], 7: [[-26, -22.4], [-30, -40]], 9: [[-30, 20]], 11: [[-18, -14]]};
  A.points = 1e5;
  g.run(1500, () => {
    if (A.phase === 'decision') g.ambush.decide(false);
    const step = A.phase === 'break' && plan[A.wave]; if (step) { if (step.length === 2) { g.goTo(...step[0]); assert(g.ambush.interact(), `bought after wave ${A.wave}`); } g.goTo(...step.at(-1)); delete plan[A.wave]; }
    for (const a of en) if (a.life !== life.get(a)) { life.set(a, a.life); const [px, pz] = a.spawnAt, p = V(px, g.groundY(px, pz), pz), eye = eyeOf(g); // where it appeared
      const s = {wave: A.wave, x: +p.x.toFixed(1), z: +p.z.toFixed(1), blocked: g.blocked(p.x, p.z), outside: distToArena(A.open, p.x, p.z), dist: Math.hypot(p.x - g.player.x, p.z - g.player.z), seen: g.visible(eye, p.clone().setY(p.y + 1)) || g.visible(eye, p.clone().setY(p.y + 1.7))};
      const [sx, sz] = g.ai.safeSpot(p.x, p.z); s.reachable = Math.hypot(sx - p.x, sz - p.z) < .01;
      all.push(s); if (s.blocked || s.outside < AMBUSH.spawnMargin || s.dist < AMBUSH.spawnMinDist || s.seen || !s.reachable) bad.push(s); a.killAt = g.state().elapsed + 2; }
    for (const a of en) if (a.hp > 0 && g.state().elapsed >= a.killAt) { a.hp = 0; a.dead = 999; }
    if (A.wave > 12) return false; });
  report.spawns = {count: all.length, waves: A.survived, areasOpen: A.open.size, minOutside: Math.min(...all.map(s => s.outside)).toFixed(1), minDist: Math.min(...all.map(s => s.dist)).toFixed(1)};
  assert(A.survived >= 12 && A.open.size === 4, `12 waves with all four areas opened along the way (${A.survived}, ${A.open.size})`);
  assert(all.length >= 150, `${all.length} spawns checked`); assert.deepEqual(bad, []);
});

await check('death ends the run immediately with the summary; Ambush has no squad (Build 12): no AI squadmate exists to go down or regroup', async () => {
  const g = await ambush(), A = g.amb;
  A.phase = 'break'; A.timer = 0; g.run(2); killInFront(g, true); killInFront(g, false);
  assert.equal(g.actors.filter(a => a.team === 'ally' && !a.remote).length, 0, 'no AI squadmate in Ambush'); g.run(16); assert.equal(g.actors.filter(a => a.team === 'ally' && !a.remote).length, 0, 'none appears later either');
  g.set({hp: 1}); g.aiHit({pos: g.player, a: null}, V(-30, 1.4, 0), g.player.clone().setY(1.4));
  assert.equal(g.state().state, 'ended', 'player death ends the run in the same call'); assert.equal(g.el('result').textContent, 'Overrun.');
  const r = g.el('report').textContent; assert.match(r, /^You were killed in wave \d+\. Nothing banked\. \d+ waves survived · 2 kills · 250 points earned · \d+m \d+s\./);
  assert.equal(A.banked, 0);
});

await check('the extract choice: none before wave 5; from wave 5 a timed choice where X extracts and banks points earned × multiplier, V (or the timer) stays for a harder wave; the HUD shows the real bank', async () => {
  const g = await ambush(), A = g.amb, en = enemies(g), clear = () => { for (const a of en) if (a.hp > 0) { a.hp = 0; a.dead = 999; } };
  let early = 0; const until = (pred, max = 300) => { g.run(max, () => { clear(); if (A.phase === 'decision' && A.survived < AMBUSH.decisionFrom) early++; if (pred()) return false; }); };
  until(() => A.phase === 'break' && A.survived === 4); assert.equal(A.phase, 'break', 'no choice after wave 4'); assert.equal(early, 0, 'never offered before wave 5');
  until(() => A.phase === 'decision'); assert.equal(A.survived, 5); A.earned = 1000;
  g.ambush.hud(); assert(!g.el('decision').hidden); assert.equal(g.el('decision-extract').textContent, 'X · EXTRACT NOW: bank 1000 points (1000 × 1.00)');
  assert.match(g.el('decision-stay').textContent, /V · STAY: wave 6 is harder; survive it to bank × 1\.25/); assert.match(g.el('decision-timer').textContent, /Staying automatically in 10 s/);
  // Timer runs out: stays (next wave comes).
  g.run(10.5); assert.equal(A.phase, 'break'); until(() => A.phase === 'decision'); assert.equal(A.survived, 6);
  // V stays at once.
  g.press('KeyV'); assert.equal(A.phase, 'break'); until(() => A.phase === 'decision'); assert.equal(A.survived, 7);
  A.earned = 2000; g.ambush.hud(); const shown = Number(g.el('decision-extract').textContent.match(/bank (\d+) points/)[1]);
  g.press('KeyX'); assert.equal(g.state().state, 'ended'); assert.equal(g.el('result').textContent, 'Extracted.');
  assert.equal(A.banked, Math.round(2000 * bankMultiplier(7))); assert.equal(A.banked, 3000); assert.equal(shown, A.banked, 'the bank shown is the bank you get');
  assert.match(g.el('report').textContent, /Extracted after wave 7\. Banked 3000 points \(2000 earned × 1\.50\)\. 7 waves survived/);
  report.extract = {offeredFrom: AMBUSH.decisionFrom, multipliers: [5, 6, 7, 8].map(n => bankMultiplier(n))};
});

console.log(JSON.stringify({passed: results.length, checks: results, report, limitations: [
  'Headless: feel, readability of the edge line and wave difficulty need the playtest; frame cost is measured separately in Safari.']}, null, 2));
