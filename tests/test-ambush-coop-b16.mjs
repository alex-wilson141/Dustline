// Build 16 (T26) Ambush co-op: two real players, never an AI squad. Two instances of the production game, a host and a guest,
// are joined by a stand-in for the data channel (every message is copied through JSON, as on the wire) and stepped on one
// clock. Every Ambush behaviour is checked from both pages: waves, enemies, barricades, points, purchases, deaths, the
// extract choice, the out-of-bounds line, the map and markings, the end report, friendly fire and the teammate's look.
// Headless production code: no real WebRTC, no second network, no rendering.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execSync} from 'node:child_process';
import {createGame, projectRoot} from './sprint-harness.mjs';

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const {CLASSES} = await import(new URL('dist/combat.js', projectRoot));
const {AMBUSH, GATES, STATIONS, waveSpec, magazinePrice, dressingPrice, bankMultiplier, rifleMagazines, inArena} = await import(new URL('dist/ambush.js', projectRoot));
const {BEST_KEY, BEST_KEY_COOP, readBest} = await import(new URL('dist/records.js', projectRoot));
const {PeerSquad} = await import(new URL('dist/network.js', projectRoot));
const {MATE_MARKER} = await import(new URL('dist/characters.js', projectRoot));
// The breakage pass runs this suite against a deliberately broken copy of game.js.
const SOURCE = process.env.DUSTLINE_GAME_SOURCE ? new URL('file://' + process.env.DUSTLINE_GAME_SOURCE) : undefined;
const BUILD15 = 'abb41c9';
const results = [], report = {};
async function check(name, fn) { await fn(); results.push(name); }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const enemies = g => g.actors.filter(a => a.team === 'enemy');
const own = g => g.actors.filter(a => !a.remote);
const wire = m => JSON.parse(JSON.stringify(m));
const near = (a, b, eps, why) => assert(Math.abs(a - b) <= eps, `${why}: ${a} vs ${b}`);

// In-memory localStorage shared by both pages of a pair (each browser has its own in reality; the keys are what is tested).
function storage() { const m = new Map(); return {getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => { m.set(k, String(v)); }, removeItem: k => m.delete(k), map: m}; }

async function page(role, classId) {
  const g = await createGame(SOURCE ? {sourcePath: SOURCE} : {}); g.prepare({role, clearLane: false, classId}); g.el('blood').checked = false;
  for (const a of g.actors) a.animate = a.visual.animate; g.role = role; return g;
}
// A connected pair in co-op Ambush, deployed by the host; `ai` runs the real enemy AI and mission on the host.
async function pair({hostClass = 'assault', guestClass = 'assault', mode = 'ambush', ai = true, invulnerable = true} = {}) {
  const host = await page('host', hostClass), guest = await page('guest', guestClass), log = {toGuest: [], toHost: []};
  host.peer.send = m => { if (!host.peer.connected) return false; log.toGuest.push(m.type); if (m.type === 'snapshot') log.fresh = true; guest.receive(wire(m)); return true; };
  guest.peer.send = m => { if (!guest.peer.connected) return false; log.toHost.push(m.type); host.receive(wire(m)); return true; };
  host.receive({type: 'hello', classId: guestClass}); guest.receive({type: 'hello', classId: hostClass});
  host.setMode(mode); host.start(); host.play(); guest.play(); if (ai) host.restoreAI();
  let clock = 0; host.frame(0); guest.frame(0);
  // log.fresh: the host sent a snapshot in the step just made, so the guest holds the host's state of this very frame.
  const p = {host, guest, log, step(n = 1) { for (let i = 0; i < n; i++) { log.fresh = false; clock += 1000 / 60; host.frame(clock); guest.frame(clock); } }, run(s, each) { for (let i = 0, n = Math.round(s * 60); i < n; i++) { p.step(); if (each?.(clock / 1000) === false) break; } },
    // Put a player somewhere on both pages at once (the host refuses a pose that jumps more than 8 m).
    place(who, x, z) { const me = p[who], other = who === 'host' ? guest : host, y = me.groundY(x, z); me.player.set(x, y, z); other.remote.g.position.set(x, y, z); other.remote.netPos = null; },
    sync() { p.step(6); }};
  if (invulnerable) { host.set({hp: 1e9}); host.remote.hp = 1e9; }
  p.sync(); return p;
}
// Stand an enemy somewhere on the host, alive and in nobody's way; the guest follows through snapshots.
function stand(p, a, x, z) { const g = p.host; a.hp = 100; a.dead = 0; a.diedAt = null; a.gone = false; a.sink = null; a.resetPose(); a.g.position.set(x, g.groundY(x, z), z); a.g.rotation.set(0, 0, 0); a.g.visible = true; a.life = ((a.life || 0) + 1) & 255; a.g.updateMatrixWorld(true); }
// Aim a page's own player at a point and fire its real weapon once (the guest sends the shot to the host).
function fireAt(g, point) { const eye = g.player.clone().setY(g.player.y + (g.state().crouch ? .98 : 1.7)), d = point.clone().sub(eye).normalize(); g.set({yaw: Math.atan2(-d.x, -d.z), pitch: Math.asin(d.y), aim: true}); g.weapon.cooldown = 0; g.weapon.reloadRemaining = 0; if (g.weapon.ammo < 1) g.weapon.ammo = 5; g.camera.position.copy(eye); g.camera.rotation.set(Math.asin(d.y), Math.atan2(-d.x, -d.z), 0); g.camera.updateMatrixWorld(true); g.coop.shoot(); }
const stateOf = g => { const s = g.ambush.now(); return {gates: s.gates.map(x => [x.id, x.state]), areas: s.areas.map(x => [x.id, x.open]), crates: s.crates.map(x => [x.weapon, x.open])}; };
const marks = g => [...g.ambush.marks().entries()].map(([k, b]) => [k, b.userData.lit, b.userData.label]).sort();
const runOf = g => { const A = g.amb; return {wave: A.wave, phase: A.phase, toSpawn: A.toSpawn, survived: A.survived, squad: A.squad, bearing: A.bearing ?? 0, open: [...A.open].sort(), standing: [...A.gates.keys()].sort()}; };
// The test's stand-in for play: every enemy is killed a moment after it engages either player.
function cull(host, after = 1.5) { const e = host.state().elapsed, T = host.ambush.aiT(), q = host.remote.g.position; for (const a of enemies(host)) if (a.hp > 0) { const d = Math.min(Math.hypot(a.g.position.x - host.player.x, a.g.position.z - host.player.z), Math.hypot(a.g.position.x - q.x, a.g.position.z - q.z)); if (a.killAt == null && ((a.ai.firing && d <= T.fightRange) || d <= AMBUSH.holdRange + 1)) a.killAt = e + after; if (a.killAt != null && e >= a.killAt) { a.hp = 0; a.dead = 998; a.killAt = null; } } else a.killAt = null; }
const clearField = host => enemies(host).forEach(a => { a.hp = 0; a.gone = true; a.g.visible = false; });

await check('a co-op Ambush run is two real players and no AI squad on both pages; both start inside the courtyard side by side; the guest cannot deploy; leaving co-op gives solo Ambush and Story their own shapes back', async () => {
  const p = await pair(), {host, guest} = p;
  for (const g of [host, guest]) { assert.equal(g.coop.mode(), 'ambush'); assert(g.coop.ambCoop() && g.coop.net(), `${g.role}: co-op Ambush`); assert.equal(g.actors.filter(a => a.team === 'ally' && !a.remote).length, 0, `${g.role}: no AI squadmate`); assert.equal(enemies(g).length, AMBUSH.coop.enemyPool, `${g.role}: the co-op enemy pool`); assert(g.remote.g.visible, `${g.role}: the teammate is shown`); assert(inArena(g.amb.open, g.player.x, g.player.z), `${g.role}: starts inside the arena`); assert.equal(g.amb.points, AMBUSH.startPoints); assert.equal(g.amb.mate.points, AMBUSH.startPoints); }
  assert(host.coop.hosting() && !host.coop.guesting() && guest.coop.guesting() && !guest.coop.hosting());
  near(Math.hypot(host.player.x - guest.player.x, host.player.z - guest.player.z), AMBUSH.coop.startGap, .6, 'side by side');
  near(Math.hypot(host.remote.g.position.x - guest.player.x, host.remote.g.position.z - guest.player.z), 0, .05, 'the host holds the guest where the guest stands'); near(Math.hypot(guest.remote.g.position.x - host.player.x, guest.remote.g.position.z - host.player.z), 0, .05, 'the guest shows the host where the host stands');
  guest.coop.updateDeploy(); assert.equal(guest.el('start').disabled, true); assert.equal(guest.el('start').textContent, 'WAITING FOR HOST'); host.coop.updateDeploy(); assert.equal(host.el('start').disabled, false); assert.equal(host.el('start').textContent, 'DEPLOY BOTH PLAYERS →');
  guest.start(); assert.equal(p.log.toHost.includes('start'), false, 'a guest cannot start the run'); assert.equal(guest.state().state, 'playing');
  host.peer.connected = false; host.setMode('ambush'); host.reset(); assert.equal(enemies(host).length, AMBUSH.enemyPool); assert.equal(host.amb.coop, false); assert.equal(host.amb.squad, 1); assert.equal(host.remote.g.visible, false); assert.equal(host.coop.net(), false);
  host.setMode('story'); host.reset(); assert.equal(own(host).length, 10, 'Story: the 10-actor snapshot shape');
  report.pool = {solo: AMBUSH.enemyPool, coop: AMBUSH.coop.enemyPool};
});

await check('both players see the same run: wave, phase, hostiles left, direction, every enemy (alive, position, gone) and every barricade, area, crate, marking, arena edge and map element, at every comparison through four waves', async () => {
  const p = await pair(), {host, guest} = p, A = host.amb; let compared = 0, worst = 0, alivePeak = 0, frame = 0, lastAt = -99; A.points = 1e5;
  p.run(600, () => { frame++; const compare = p.log.fresh && frame - lastAt >= 25; if (compare) { lastAt = frame; same(); } if (A.phase === 'decision') host.coop.vote('me', false); cull(host);
    alivePeak = Math.max(alivePeak, enemies(host).filter(a => a.hp > 0).length);
    // The host clears the first barricade partway through, so barricade state changes while the run is compared.
    if (A.wave === 2 && A.gates.has('g12') && A.phase === 'break') { p.place('host', -26.5, 3.6); assert(host.ambush.interact(), 'the host clears the first barricade'); p.place('host', -30, 20); }
    if (A.wave > 4) return false; });
  function same() { compared++;
      assert.deepEqual(runOf(guest), runOf(host), `run state at frame ${frame}`); assert.deepEqual(stateOf(guest), stateOf(host), 'barricades, areas, crates'); assert.deepEqual(marks(guest), marks(host), 'markings'); assert.deepEqual(guest.amb.segs, host.amb.segs, 'arena edge');
      const H = enemies(host), G = enemies(guest); assert.equal(G.length, H.length);
      for (let i = 0; i < H.length; i++) { assert.equal(G[i].hp > 0, H[i].hp > 0, `enemy ${i} alive on both`); assert.equal(!!G[i].gone, !!H[i].gone, `enemy ${i} gone on both`); if (H[i].hp > 0 && G[i].netPos) { const d = Math.hypot(G[i].netPos.x - H[i].g.position.x, G[i].netPos.z - H[i].g.position.z); worst = Math.max(worst, d); assert(d < .8, `enemy ${i}: the guest's last word from the host is within one snapshot of movement (${d.toFixed(2)} m)`); assert(G[i].g.position.distanceTo(H[i].g.position) < 1.5, `enemy ${i} drawn where the host has it`); } }
      const lh = host.ambush.mapLayout(), lg = guest.ambush.mapLayout(); assert.deepEqual(lg.gates, lh.gates, 'map barricades'); assert.deepEqual(lg.areas, lh.areas, 'map areas'); assert.deepEqual(lg.crates, lh.crates, 'map crates'); assert.deepEqual(lg.edge, lh.edge, 'map edge');
      guest.ambush.hud(); host.ambush.hud(); assert.equal(guest.el('objective-label').textContent, host.el('objective-label').textContent); assert.equal(guest.el('objtext').textContent, host.el('objtext').textContent, 'hostiles left and direction'); }
  assert(A.survived >= 4 && compared > 40, `four waves compared (${A.survived} waves, ${compared} comparisons)`); assert(!A.gates.has('g12') && !guest.amb.gates.has('g12'));
  assert.equal(guest.state().state, 'playing'); assert.equal(host.state().state, 'playing');
  report.sameRun = {waves: A.survived, comparisons: compared, worstEnemyOffset_m: +worst.toFixed(2), alivePeak};
});

await check('points are per player with no leakage: a kill pays only the player who made it (headshots 150, body 100), on both pages; rifles, magazines and dressings are paid from the buyer\'s own points and change only the buyer\'s kit', async () => {
  const p = await pair({ai: false}), {host, guest} = p, H = host.amb, G = guest.amb, start = AMBUSH.startPoints;
  const E = enemies(host); clearField(host);
  p.place('host', -30, 20); p.place('guest', -33, 20); p.sync(); // clear lanes north, west of the courtyard house
  stand(p, E[0], -30, 12); E[0].hp = 30; p.sync(); fireAt(host, E[0].g.position.clone().setY(E[0].g.position.y + 1.2)); p.sync();
  assert(E[0].hp <= 0, 'the host\'s shot killed'); assert.deepEqual([H.points, H.earned, H.kills, H.mate.points, H.mate.earned, H.mate.kills], [start + 100, 100, 1, start, 0, 0], 'host page: only the host is paid'); assert.deepEqual([G.points, G.earned, G.kills, G.mate.points, G.mate.earned, G.mate.kills], [start, 0, 0, start + 100, 100, 1], 'guest page: the same, seen from the guest');
  stand(p, E[1], -33, 12); p.sync(); fireAt(guest, E[1].g.position.clone().setY(E[1].g.position.y + 1.6)); p.sync();
  assert(E[1].hp <= 0, 'the guest\'s shot killed'); assert.deepEqual([H.points, H.earned, H.kills, H.mate.points, H.mate.earned, H.mate.kills], [start + 100, 100, 1, start + 150, 150, 1], 'host page: only the guest is paid'); assert.deepEqual([G.points, G.earned, G.kills, G.mate.points, G.mate.earned, G.mate.kills], [start + 150, 150, 1, start + 100, 100, 1]);
  assert.equal(host.kills(), 2, 'the run counts both kills'); host.remote.hp = 85; host.set({hp: 64}); p.sync(); host.ambush.hud(); guest.ambush.hud(); assert.equal(host.el('matehud').textContent, `TEAMMATE · 85 HP · ${start + 150} PTS`, 'the host sees the guest\'s health and points'); assert.equal(guest.el('matehud').textContent, `TEAMMATE · 64 HP · ${start + 100} PTS`, 'the guest sees the host\'s'); assert.equal(host.el('matehud').hidden, false); host.remote.hp = 1e9; host.set({hp: 1e9}); assert.match(guest.el('pointsgain').textContent, /^\+150 HEADSHOT$/); assert.equal(guest.el('points').textContent, start + 150);
  // Purchases at the courtyard crate (CQB, 500): the guest buys the rifle, a magazine and a dressing; the host's kit and points do not move.
  const st = STATIONS[0], cqb = CLASSES[st.weapon]; H.points = 2000; H.mate.points = 2000; p.place('guest', st.at[0], st.at[1] + 1.4); p.place('host', -30, 20); p.sync();
  const hostKit = () => [host.ambush.gunId(), host.weapon.ammo, host.weapon.reserve, host.ambush.bandages(), H.points];
  const before = hostKit(); guest.press(guest.ambush.keys.interact); p.sync();
  assert.equal(guest.ambush.gunId(), st.weapon, 'the guest holds the rifle it bought'); assert.equal(host.coop.remoteGun(), st.weapon); assert.deepEqual([guest.weapon.ammo, guest.weapon.reserve], [cqb.capacity, cqb.capacity * (rifleMagazines(cqb) - 1)]); assert.equal(G.points, 2000 - st.price); assert.equal(H.mate.points, 2000 - st.price); assert.deepEqual(hostKit(), before, 'the host paid nothing and holds what it held');
  host.remoteWeapon.reserve = 0; p.sync(); assert.equal(guest.weapon.reserve, 0); guest.press(guest.ambush.keys.ammo); p.sync(); const mag = magazinePrice(cqb, 1);
  assert.equal(guest.weapon.reserve, cqb.capacity, 'one magazine for the guest'); assert.equal(G.points, 2000 - st.price - mag); assert.deepEqual(hostKit(), before);
  const kit = guest.ambush.bandages(); guest.press(guest.ambush.keys.dressingBuy); p.sync(); assert.equal(guest.ambush.bandages(), kit + 1); assert.equal(G.points, 2000 - st.price - mag - dressingPrice(1)); assert.deepEqual(hostKit(), before);
  // The guest's shots now use the rifle it bought (its damage), not its class rifle.
  p.place('guest', -33, 20); stand(p, E[2], -33, 12); p.sync(); fireAt(guest, E[2].g.position.clone().setY(E[2].g.position.y + 1.2)); p.sync(); assert.equal(E[2].hp, 100 - cqb.damage, 'the bought rifle\'s damage');
  // The host buys a magazine: the guest's kit and points do not move.
  const guestKit = () => [guest.ambush.gunId(), guest.weapon.reserve, guest.ambush.bandages(), G.points]; p.place('host', st.at[0] + 1.2, st.at[1] + 1.2); p.sync(); const gk = guestKit(); host.weapon.reserve = 0; host.press(host.ambush.keys.ammo); p.sync();
  assert.equal(host.weapon.reserve, CLASSES.assault.capacity); assert.equal(H.points, 2000 - magazinePrice(CLASSES.assault, 1)); assert.deepEqual(guestKit(), gk, 'the guest paid nothing');
  // Refusals: a guest without the points is refused on its own page and on the host.
  H.mate.points = 10; p.place('guest', st.at[0], st.at[1] + 1.4); p.sync(); const r0 = guest.weapon.reserve; guest.press(guest.ambush.keys.dressingBuy); p.sync(); assert.match(guest.el('notice').textContent, /^NOT ENOUGH POINTS/); assert.equal(G.points, 10); host.receive({type: 'buy', k: 'B'}); host.receive({type: 'buy', k: 'N'}); p.sync(); assert.equal(G.points, 10, 'the host refuses a purchase the guest cannot pay'); assert.equal(guest.weapon.reserve, r0);
  report.points = {body: 100, headshot: 150, perPlayer: true};
});

await check('a barricade bought by either player opens for both: the buyer alone pays, and on both pages the barricade is gone, its collision is gone, the area is open, the edge has moved and the markings and map follow', async () => {
  for (const buyer of ['host', 'guest']) {
    const p = await pair({ai: false}), {host, guest} = p, H = host.amb, gate = GATES[0], [sx, sz] = gate.station, other = buyer === 'host' ? 'guest' : 'host'; H.points = 1000; H.mate.points = 1000;
    for (const g of [host, guest]) { assert(g.amb.gates.has(gate.id)); assert(g.blocked(sx, sz), `${g.role}: the barricade blocks`); assert(!g.amb.open.has(gate.opens)); }
    const edge0 = wire(host.amb.segs); p.place(buyer, sx, sz + 1.6); p.place(other, -30, 20); p.sync();
    assert.match(p[buyer].ambush.prompt(), /CLEAR BARRICADE TO FIELD OFFICE YARD · 750 PTS/);
    p[buyer].press(p[buyer].ambush.keys.interact); p.sync();
    for (const g of [host, guest]) { assert(!g.amb.gates.has(gate.id), `${g.role}: barricade gone (bought by the ${buyer})`); assert(!g.blocked(sx, sz), `${g.role}: its collision is gone`); assert(g.amb.open.has(gate.opens), `${g.role}: area open`); assert.notDeepEqual(wire(g.amb.segs), edge0, `${g.role}: the arena edge moved`); assert(!g.ambush.marks().has('gate:' + gate.id), `${g.role}: its marking is gone`); assert.equal(g.ambush.marks().get('crate:' + STATIONS[1].weapon).userData.lit, true, `${g.role}: the crate in the new area is lit`); assert.equal(g.ambush.mapLayout().gates.some(x => x.id === gate.id), false, `${g.role}: off the map`); assert(inArena(g.amb.open, -26, -10), `${g.role}: the yard is inside the line`); }
    assert.deepEqual(guest.amb.segs, host.amb.segs); assert.deepEqual(stateOf(guest), stateOf(host));
    const paid = buyer === 'host' ? [H.points, H.mate.points] : [H.mate.points, H.points]; assert.deepEqual(paid, [1000 - gate.price, 1000], 'only the buyer pays'); assert.deepEqual([guest.amb.points, guest.amb.mate.points], buyer === 'guest' ? [250, 1000] : [1000, 250], 'and the guest page agrees');
    // The other player can now buy from inside the new area, with its own points.
    const g2 = GATES[2]; p.place(other, g2.station[0], g2.station[1] + 1.6); p.sync(); assert.match(p[other].ambush.prompt(), /CLEAR BARRICADE TO NORTH HOUSES · 1250 PTS \(NEED 250 MORE\)/);
  }
  report.barricades = 'shared';
});

await check('one player going down does not end the run, from either side: that player spectates (no movement, fire or purchases; the camera follows the teammate), enemies turn to the survivor, the wave shrinks to its solo size; the run ends when both are down and the report gives the pair with each player\'s kills and points', async () => {
  for (const first of ['host', 'guest']) {
    const p = await pair({invulnerable: false}), {host, guest} = p, H = host.amb, second = first === 'host' ? 'guest' : 'host'; globalThis.localStorage = storage();
    const heal = () => { if (!H.down) host.set({hp: 100}); if (!H.mate.down) host.remote.hp = 100; };
    p.run(AMBUSH.firstBreak + 8, heal); assert.equal(H.phase, 'wave'); assert.equal(H.squad, 2); const spec2 = waveSpec(1, 2), spec1 = waveSpec(1);
    H.kills = 3; H.earned = 300; H.points = 800; H.mate.kills = 5; H.mate.earned = 650; H.mate.points = 1150; heal(); p.sync();
    // The first player is killed by an enemy's hit (the production aiHit).
    const kill = who => { if (who === 'host') host.set({hp: 1}); else host.remote.hp = 1; const t = who === 'host' ? {pos: host.player, a: null} : {pos: host.remote.g.position, a: host.remote}, eye = t.pos.clone().add(V(6, 1.4, 0)); return host.aiHit(t, eye, t.pos.clone().setY(t.pos.y + 1.25)); };
    const ended = kill(first); p.sync(); assert.equal(ended, false, 'the hit did not end the run');
    for (const g of [host, guest]) assert.equal(g.state().state, 'playing', `${g.role}: still playing after the ${first} went down`);
    const down = p[first], up = p[second]; assert(down.coop.spectating(), `${first}: spectating`); assert(!up.coop.spectating()); assert.equal(down.amb.down, true); assert.equal(up.amb.mate.down, true); assert.equal(up.amb.down, false); assert.equal(down.amb.mate.down, false);
    assert.equal(H.squad, 1, 'the wave is now a solo wave'); assert(spec2.count > spec1.count && H.toSpawn + H.spawned <= spec1.count, `no more than the solo count will arrive (${H.toSpawn} + ${H.spawned} of ${spec1.count})`);
    // The downed player cannot move, fire or buy; the camera sits behind the teammate.
    const at = down.player.clone(), sentShots = p.log.toHost.filter(t => t === 'shot').length, ammo = down.weapon.ammo; down.press('KeyW'); down.press('KeyD'); down.keys.add('KeyW'); down.keys.add('KeyD'); /* keys held from before going down count for nothing either */ down.set({trigger: true}); down.fireDoc('mousedown', {button: 0, target: down.renderer.domElement}); p.run(1, heal); down.release('KeyW'); down.release('KeyD'); down.keys.clear(); down.set({trigger: false});
    near(down.player.distanceTo(at), 0, 1e-9, 'a downed player does not move'); assert.equal(p.log.toHost.filter(t => t === 'shot').length, sentShots, 'and sends no shot'); if (first === 'host') assert.equal(host.weapon.ammo, ammo, 'and fires nothing');
    const mate = down.remote.g.position, cam = down.camera.position; near(Math.hypot(cam.x - mate.x, cam.z - mate.z), 3.4 * Math.cos(down.state().pitch), .05, 'the camera is 3.4 m from the teammate');
    const crate = STATIONS[0], body = down.player.clone(); H.points = 5000; H.mate.points = 5000; p.place(first, crate.at[0], crate.at[1] + 1.4); p.sync(); const buys = p.log.toHost.filter(t => t === 'buy').length, kit = () => [host.ambush.gunId(), host.coop.remoteGun(), host.weapon.reserve, host.remoteWeapon.reserve, host.ambush.bandages(), host.remote.heals, H.points, H.mate.points], kit0 = kit();
    assert.equal(down.ambush.near(), null, 'nothing to buy while down, even at a crate'); assert.equal(down.el('interact').textContent, ''); for (const k of ['interact', 'ammo', 'dressingBuy']) down.press(down.ambush.keys[k]); if (first === 'guest') for (const k of ['E', 'B', 'N']) host.receive({type: 'buy', k}); p.sync(); assert.deepEqual(kit(), kit0, 'a downed player buys nothing, on its page or on the host'); assert.equal(p.log.toHost.filter(t => t === 'buy').length, buys); p.place(first, body.x, body.z); H.points = 800; H.mate.points = 1150; p.sync();
    // Enemies turn to the survivor: nobody sees, hunts or fires at the downed player.
    let looked = 0; p.run(12, () => { heal(); for (const a of enemies(host)) if (a.hp > 0) { looked++; if (a.seen) assert.equal(a.seen.a ? 'guest' : 'host', second, 'enemies see only the survivor'); if (a.ai.prey) assert.equal(a.ai.prey === 'mate' ? 'guest' : 'host', second, 'and hunt only the survivor'); } });
    assert(looked > 100, 'enemies were in play'); assert.equal(host.coop.humanEyes().length, 1); guest.ambush.hud(); host.ambush.hud(); assert.match(up.el('matehud').textContent, /^TEAMMATE · DOWN · /); assert.equal(guest.state().state, 'playing'); assert.equal(host.state().state, 'playing');
    // The second goes down: the run ends on both pages, with the pair's report.
    H.kills = 3; H.mate.kills = 5; H.earned = 300; H.mate.earned = 650; kill(second); p.sync();
    for (const g of [host, guest]) { assert.equal(g.state().state, 'ended', `${g.role}: ended when both are down`); assert.equal(g.el('result').textContent, 'Overrun.'); const lines = g.el('report').textContent.split('\n'); assert.match(lines[0], /^Both players went down in wave 1\. 0 waves survived · 8 kills · /, `${g.role}: the pair's line`);
      const [mine, theirs] = g === host ? [[3, 300], [5, 650]] : [[5, 650], [3, 300]]; assert.equal(lines[1], `YOU: ${mine[0]} kills · ${mine[1]} points earned · down · nothing banked.`, `${g.role}: own line`); assert.equal(lines[2], `TEAMMATE: ${theirs[0]} kills · ${theirs[1]} points earned · down · nothing banked.`, `${g.role}: teammate's line`); }
    delete globalThis.localStorage;
  }
  report.death = 'spectate; run ends when both are down';
});

await check('the extract choice: extracting takes both players\' choice and either one staying keeps both in; the timer stays; a player who is down has no vote and the survivor decides alone; each player banks their own points and a downed player banks alongside the survivor who extracts (Build 17); both pages resolve the same way', async () => {
  const at5 = async (opts = {}) => { const p = await pair({ai: false, ...opts}), {host} = p, H = host.amb; clearField(host); Object.assign(H, {wave: 5, survived: 4, phase: 'wave', toSpawn: 0, earned: 2000, points: 900, kills: 18}); Object.assign(H.mate, {earned: 1200, points: 300, kills: 11}); host.restoreAI(); p.sync(); assert.equal(H.phase, 'decision', 'wave 5 cleared: the choice is offered'); assert.equal(p.guest.amb.phase, 'decision'); return p; };
  globalThis.localStorage = storage();
  // (a) One choice is not enough, from either side; the other page is told; the second choice extracts.
  for (const firstVoter of ['host', 'guest']) { const p = await at5(), {host, guest} = p, a = p[firstVoter], b = p[firstVoter === 'host' ? 'guest' : 'host'];
    a.press(a.ambush.keys.extract); p.sync(); for (const g of [host, guest]) assert.equal(g.state().state, 'playing', `${g.role}: one choice (${firstVoter}) does not extract`); assert.equal(host.amb.phase, 'decision'); assert.equal(a.amb.vote, 'x'); assert.equal(b.amb.mate.vote, 'x', 'the other page knows'); a.ambush.hud(); b.ambush.hud(); assert.match(a.el('decision-timer').textContent, /^You chose to extract · waiting for your teammate · staying automatically in \d+ s$/); assert.match(b.el('decision-timer').textContent, /^Your teammate chose to extract · press X to go too · /);
    b.press(b.ambush.keys.extract); p.sync(); const m = bankMultiplier(5); assert.equal(m, 1);
    for (const g of [host, guest]) { assert.equal(g.state().state, 'ended', `${g.role}: both chose: extracted`); assert.equal(g.el('result').textContent, 'Extracted.'); const lines = g.el('report').textContent.split('\n'), mine = g === host ? [18, 2000] : [11, 1200], theirs = g === host ? [11, 1200] : [18, 2000]; assert.match(lines[0], /^Extracted after wave 5\. 5 waves survived · 29 kills · /); assert.equal(lines[1], `YOU: ${mine[0]} kills · ${mine[1]} points earned · banked ${mine[1] * m} (${mine[1]} × 1.00).`); assert.equal(lines[2], `TEAMMATE: ${theirs[0]} kills · ${theirs[1]} points earned · banked ${theirs[1] * m} (${theirs[1]} × 1.00).`); assert.equal(g.amb.banked, mine[1]); } }
  // (b) Either one staying keeps both in, at once, even after the other chose to extract.
  for (const stayer of ['host', 'guest']) { const p = await at5(), {host, guest} = p, other = p[stayer === 'host' ? 'guest' : 'host']; other.press(other.ambush.keys.extract); p.sync(); p[stayer].press(p[stayer].ambush.keys.stay); p.sync();
    for (const g of [host, guest]) { assert.equal(g.state().state, 'playing'); assert.equal(g.amb.phase, 'break', `${g.role}: staying (chosen by the ${stayer})`); assert.equal(g.amb.vote, null); } assert.equal(host.amb.mate.vote, null, 'choices are cleared'); near(host.amb.timer, AMBUSH.afterStay, .2, 'next wave after the stay pause'); assert.match(guest.el('notice').textContent, /^STAYING: SURVIVE WAVE 6 TO BANK ×1\.25$/); }
  // (c) The timer stays, with one choice to extract standing.
  { const p = await at5(), {host, guest} = p; guest.press(guest.ambush.keys.extract); p.run(AMBUSH.decisionTime + .5); for (const g of [host, guest]) { assert.equal(g.state().state, 'playing'); assert.notEqual(g.amb.phase, 'decision', `${g.role}: the timer stayed`); } }
  // (d) A downed player has no vote; the survivor decides alone; both bank.
  for (const downed of ['host', 'guest']) { const p = await at5({invulnerable: false}), {host, guest} = p, up = p[downed === 'host' ? 'guest' : 'host'], dn = p[downed]; host.coop.down(downed === 'host' ? 'me' : 'mate'); p.sync(); assert.equal(host.amb.phase, 'decision'); assert.equal(host.state().state, 'playing');
    dn.press(dn.ambush.keys.extract); p.sync(); assert.equal(host.state().state, 'playing', 'a downed player cannot extract the pair'); assert.equal(host.amb.phase, 'decision'); dn.press(dn.ambush.keys.stay); p.sync(); assert.equal(host.amb.phase, 'decision', 'nor keep it in');
    if (downed === 'guest') { host.receive({type: 'vote', x: true}); host.receive({type: 'vote', x: false}); assert.equal(host.amb.phase, 'decision', 'the host refuses a downed guest\'s vote'); assert.equal(host.state().state, 'playing'); }
    up.ambush.hud(); dn.ambush.hud(); assert.match(up.el('decision-timer').textContent, /^Your teammate is down: the choice is yours · /); assert.equal(dn.el('decision-extract').textContent, 'YOU ARE DOWN · YOUR TEAMMATE DECIDES');
    up.press(up.ambush.keys.extract); p.sync();
    for (const g of [host, guest]) { assert.equal(g.state().state, 'ended', `${g.role}: the survivor extracted alone`); const lines = g.el('report').textContent.split('\n'); const [hostLine, guestLine] = g === host ? [lines[1], lines[2]] : [lines[2], lines[1]], who = l => l.split(':')[0]; assert.equal(hostLine, `${who(hostLine)}: 18 kills · 2000 points earned · ${downed === 'host' ? 'down · ' : ''}banked 2000 (2000 × 1.00).`, `${g.role}: the host's line`); assert.equal(guestLine, `${who(guestLine)}: 11 kills · 1200 points earned · ${downed === 'guest' ? 'down · ' : ''}banked 1200 (1200 × 1.00).`, `${g.role}: the guest's line`); }
    // Build 17: the run was played together, so the survivor extracting banks for both, each their own points.
    assert.deepEqual([host.amb.banked, host.amb.mate.banked, guest.amb.banked, guest.amb.mate.banked], [2000, 1200, 1200, 2000], 'a downed player banks alongside the survivor, on both pages'); }
  delete globalThis.localStorage; report.extract = 'both must choose to extract; one stay or the timer keeps both in; a downed player has no vote';
});

await check('solo and co-op personal bests are separate: a co-op run is recorded under its own key and never touches the solo record, and a solo run never touches the co-op record', async () => {
  const store = globalThis.localStorage = storage(); assert.notEqual(BEST_KEY, BEST_KEY_COOP);
  store.setItem(BEST_KEY, JSON.stringify({wave: 8, banked: 4000})); const solo0 = store.getItem(BEST_KEY);
  const p = await pair({ai: false}), {host, guest} = p, H = host.amb; clearField(host); Object.assign(H, {wave: 12, survived: 12, phase: 'decision', timer: 9, earned: 9000}); H.mate.earned = 5000; p.sync();
  host.press(host.ambush.keys.extract); guest.press(guest.ambush.keys.extract); p.sync(); assert.equal(host.state().state, 'ended'); assert.equal(guest.state().state, 'ended');
  assert.equal(store.getItem(BEST_KEY), solo0, 'the solo record is untouched by a better co-op run'); assert.deepEqual(readBest(store), {wave: 8, banked: 4000});
  const m = bankMultiplier(12), coop = readBest(store, BEST_KEY_COOP); assert.deepEqual(coop, {wave: 12, banked: Math.round(9000 * m)}, 'the co-op record holds the co-op run (the better of what the two pages wrote into this shared stand-in)');
  assert.deepEqual([...store.map.keys()].sort(), [BEST_KEY, BEST_KEY_COOP].sort(), 'two keys, nothing else'); assert.match(host.el('report').textContent, /\n(First co-op run recorded|Co-op personal best): wave 12 · /); assert.doesNotMatch(host.el('report').textContent, /wave 8/);
  // A solo run afterwards reads and writes only the solo key.
  const coop0 = store.getItem(BEST_KEY_COOP); host.peer.connected = false; host.setMode('ambush'); host.reset(); host.play(); host.amb.wave = 3; host.amb.survived = 2; host.ambush.finish(false, undefined, 'self');
  assert.match(host.el('report').textContent, /Personal best: wave 8 · 4000 banked\.$/); assert.doesNotMatch(host.el('report').textContent, /co-op/i); assert.equal(store.getItem(BEST_KEY_COOP), coop0, 'the co-op record is untouched by a solo run'); assert.equal(store.getItem(BEST_KEY), solo0);
  delete globalThis.localStorage; report.records = {solo: BEST_KEY, coop: BEST_KEY_COOP};
});

await check('the out-of-bounds line applies per player: five seconds outside puts only that player down, the countdown is shown to that player only, stepping back in resets it, and the other player plays on; both outside ends the run; solo keeps its rule', async () => {
  for (const who of ['host', 'guest']) { const p = await pair({ai: false}), {host, guest} = p, me = p[who], other = p[who === 'host' ? 'guest' : 'host'], otherName = who === 'host' ? 'guest' : 'host'; clearField(host); host.restoreAI(); host.amb.timer = 1e6; // a long break: no wave interferes
    const bank = g => g === host ? host.amb : host.amb.mate; p.place(who, -30, 40); assert(!inArena(host.amb.open, -30, 40)); p.run(2); near(bank(me).out, 2, .2, `${who}: two seconds outside`); assert.equal(bank(other).out, 0, 'the other player\'s countdown does not run');
    me.ambush.hud(); other.ambush.hud(); assert.equal(me.el('bounds').hidden, false); assert.match(me.el('bounds').textContent, /GET BACK INSIDE THE LINE · [23]\.\d$/, `${who} sees its own countdown`); assert.equal(other.el('bounds').hidden, true, 'the other player sees none');
    p.place(who, -30, 20); p.run(.5); assert.equal(bank(me).out, 0, 'back inside: reset'); me.ambush.hud(); assert.equal(me.el('bounds').hidden, true);
    p.place(who, -30, 40); p.run(AMBUSH.outOfBounds + .3); assert.equal(me.amb.down, true, `${who} is down after five seconds outside`); assert.equal(other.amb.down, false); assert.equal(other.amb.mate.down, true); for (const g of [host, guest]) assert.equal(g.state().state, 'playing', 'the run goes on'); assert(me.coop.spectating());
    p.place(otherName, -30, 40); p.run(AMBUSH.outOfBounds + .3); for (const g of [host, guest]) assert.equal(g.state().state, 'ended', 'both out: the run ends'); }
  const s = await page(null, 'assault'); s.setMode('ambush'); s.reset(); s.play(); s.restoreAI(); s.set({hp: 1e9}); let c = 0; s.frame(0); s.player.set(-30, s.groundY(-30, 40), 40); for (let i = 0; i < 60 * 5.3; i++) s.frame(c += 1000 / 60); assert.equal(s.state().state, 'ended'); assert.equal(s.el('result').textContent, 'Left the arena.');
  report.bounds = 'per player';
});

await check('friendly fire: a player\'s shots damage the teammate and resolve identically whoever hosts: the same shot at the same teammate does the same damage from the host and from the guest, body, head and crouched; walls stop it; the victim\'s health agrees on both pages; a friendly kill puts the teammate down', async () => {
  const setup = async (shooter, {cls = 'assault', victimClass = 'support', crouch = false, mode = 'ambush', gap = 9, hpEach = 100} = {}) => {
    const classes = shooter === 'host' ? {hostClass: cls, guestClass: victimClass} : {hostClass: victimClass, guestClass: cls}, p = await pair({ai: false, invulnerable: false, mode, ...classes}), {host} = p, victim = shooter === 'host' ? 'guest' : 'host';
    clearField(host); host.set({hp: hpEach}); host.remote.hp = hpEach; const X = mode === 'ambush' ? -30 : 0, Z = mode === 'ambush' ? 23 : 40;
    p.place(shooter, X, Z); p.place(victim, X, Z - gap); if (crouch) p[victim].set({crouch: true}); p.sync(); p.step(30);
    return {p, a: p[shooter], v: p[victim], hpOf: () => shooter === 'host' ? host.remote.hp : host.coop.hp()};
  };
  const measure = async (shooter, o = {}) => { const s = await setup(shooter, o), {p, a, v, hpOf} = s, before = hpOf(); fireAt(a, v.player.clone().setY(v.player.y + (o.aimAt ?? 1.2))); p.sync();
    return {damage: +(before - hpOf()).toFixed(6), hostSays: hpOf(), victimSees: v.coop.hp(), shooterSees: a.remote.hp, notice: [a.el('notice').textContent, v.el('notice').textContent]}; };
  const table = {};
  for (const [name, o, expected] of [['body', {}, CLASSES.assault.damage * CLASSES.support.armor], ['head', {aimAt: 1.62}, 110 * CLASSES.support.armor], ['crouched body', {crouch: true, aimAt: .8}, CLASSES.assault.damage * CLASSES.support.armor], ['over a crouched head', {crouch: true, aimAt: 1.65}, 0], ['DMR body on a medic', {cls: 'marksman', victimClass: 'medic'}, CLASSES.marksman.damage * CLASSES.medic.armor], ['Story co-op body', {mode: 'coop'}, CLASSES.assault.damage * CLASSES.support.armor]]) {
    const h = await measure('host', o), g = await measure('guest', o); table[name] = {fromHost: h.damage, fromGuest: g.damage};
    assert.equal(h.damage, g.damage, `${name}: the same damage from the host and from the guest`); near(h.damage, expected, 1e-6, `${name}: rifle damage × the victim's armor`);
    for (const r of [h, g]) { near(r.victimSees, r.hostSays, 1e-9, `${name}: the victim's page shows the host's number`); near(r.shooterSees, r.hostSays, 1e-9, `${name}: and so does the shooter's`); if (expected) assert.deepEqual(r.notice, ['FRIENDLY FIRE · YOU HIT YOUR TEAMMATE', 'FRIENDLY FIRE · YOUR TEAMMATE HIT YOU'], `${name}: both are told`); }
  }
  // A wall between the two stops the shot, from either side (the courtyard house stands between these spots).
  for (const shooter of ['host', 'guest']) { const p = await pair({ai: false, invulnerable: false}), {host} = p, victim = shooter === 'host' ? 'guest' : 'host'; clearField(host); host.set({hp: 100}); host.remote.hp = 100; p.place(shooter, -27, 20); p.place(victim, -27, 4.5); p.sync(); const v = p[victim]; assert(!host.visible(p[shooter].player.clone().setY(1.7 + p[shooter].player.y), v.player.clone().setY(v.player.y + 1.2)), 'a wall is between them'); fireAt(p[shooter], v.player.clone().setY(v.player.y + 1.2)); p.sync(); assert.equal(host.coop.hp(), 100); assert.equal(host.remote.hp, 100, `${shooter}: no damage through a wall`); }
  // Killing the teammate: in Ambush the teammate is down and the run goes on, with no kill and no points for it.
  for (const shooter of ['host', 'guest']) { const {p, a, v} = await setup(shooter, {hpEach: 20}), {host, guest} = p; fireAt(a, v.player.clone().setY(v.player.y + 1.2)); p.sync();
    assert.equal(v.amb.down, true, `${shooter} shot the teammate down`); assert.equal(a.amb.down, false); assert.equal(host.state().state, 'playing'); assert.equal(guest.state().state, 'playing'); assert.deepEqual([host.amb.kills, host.amb.mate.kills, host.amb.points, host.amb.mate.points], [0, 0, AMBUSH.startPoints, AMBUSH.startPoints], 'no kill and no points for hitting a teammate'); assert.equal(host.kills(), 0); }
  // In Story co-op the teammate is down, as in Ambush (Build 20; until then the operation failed).
  { const {p, a, v} = await setup('host', {mode: 'coop', hpEach: 20}), {host, guest} = p; fireAt(a, v.player.clone().setY(v.player.y + 1.2)); p.sync(); assert.equal(host.state().state, 'playing'); assert.equal(guest.state().state, 'playing'); assert.equal(host.fall.fallen.mate.down, true, 'Build 20: the teammate is down and can be revived'); assert.equal(guest.fall.fallen.me.down, true); }
  report.friendlyFire = table;
});

await check('the teammate is visibly not an enemy, on both pages and in Story co-op too: blue uniform and vest, and a blue unlit marker over the head that is drawn over everything; no enemy or AI squadmate has either; a shot through the marker hits nothing', async () => {
  const blue = ([r, g, b]) => b > r * 1.4 && b > g * 1.15, clothOf = a => { let m = null; a.g.traverse(o => { if (o.isMesh && o.material.map && !m) m = o.material; }); return m; }, avg = m => { const d = m.map.image.data, s = [0, 0, 0]; for (let i = 0; i < d.length; i += 4) for (let c = 0; c < 3; c++) s[c] += d[i + c]; return s.map(v => v / (d.length / 4)); };
  const markersOf = a => { const out = []; a.g.traverse(o => { if (o.userData.isMateMarker) out.push(o); }); return out; }, seen = {};
  for (const mode of ['ambush', 'coop']) { const p = await pair({ai: false, mode}), {host, guest} = p;
    for (const g of [host, guest]) { const t = g.remote, tag = `${mode} / ${g.role}`; assert(t.g.visible, `${tag}: teammate shown`); assert.equal(t.g.userData.look, 'mate'); const cloth = avg(clothOf(t)); assert(blue(cloth), `${tag}: blue uniform (${cloth.map(Math.round)})`); seen[tag] = cloth.map(Math.round);
      const [mk] = markersOf(t); assert(mk && markersOf(t).length === 1, `${tag}: one marker`); assert.equal(mk.material.type, 'MeshBasicMaterial', 'unlit'); assert.equal(mk.material.depthTest, false, 'drawn over everything'); assert(mk.renderOrder > 0); assert.equal('#' + mk.material.color.getHexString(), '#4db2ff'); assert(mk.position.y > 2.05 && mk.position.y < 2.4, 'over the head'); assert(mk.scale.x * .09 >= .3 && mk.scale.y >= mk.scale.x, `at least .3 m wide (${(mk.scale.x * .09).toFixed(2)} m)`); assert.equal(mk.scale.x, MATE_MARKER);
      let vest = null; t.g.traverse(o => { if (o.isMesh && !o.material.map && o.material.color && o.material.type !== 'MeshBasicMaterial' && o.material.color.b > o.material.color.r * 1.5) vest ??= o.material; }); assert(vest, `${tag}: blue vest`);
      for (const a of g.actors) if (!a.remote) { assert.equal(markersOf(a).length, 0, `${tag}: no ${a.team} carries the teammate's marker`); assert(!blue(avg(clothOf(a))), `${tag}: no ${a.team} wears blue`); assert.notEqual(clothOf(a), clothOf(t)); }
      if (g === host) { const hp0 = t.hp, e = host.hitScan(V(t.g.position.x, t.g.position.y + 2.18, t.g.position.z + 6), V(0, 0, -1), CLASSES.assault, 'local'); assert.equal(t.hp, hp0, 'the marker is not a body'); assert(Math.hypot(e.x - t.g.position.x, e.z - t.g.position.z) > 3, 'the shot went on past the marker'); } } }
  report.teammate = {choice: 'blue uniform and vest, plus a blue unlit marker over the head drawn over everything', averageClothColour: seen, marker_m: [+(MATE_MARKER * .09).toFixed(2), +(MATE_MARKER * 1.5 * .09).toFixed(2)]};
});

await check('rebalance for two without touching solo: the solo curve, prices and points are Build 15\'s, value for value; a solo run replays Build 15 sample for sample; in co-op only the hostiles per wave, the alive cap and the arrival gap differ, and range and aggression are the solo values', async () => {
  const old = execSync(`git show ${BUILD15}:dist/ambush.js`, {cwd: new URL('.', projectRoot)}).toString(), now = fs.readFileSync(new URL('dist/ambush.js', projectRoot), 'utf8');
  const take = (s, from, to) => s.slice(s.indexOf(from), s.indexOf(to, s.indexOf(from)) + to.length), oldWave = Function(`${take(old, 'export const AMBUSH = {', '\n};').replace('export ', '')}\n${take(old, 'export function waveSpec(n) {', '\n}').replace('export ', '')}\nreturn {AMBUSH, waveSpec};`)();
  const soloTable = []; for (let n = 1; n <= 60; n++) { assert.deepEqual(waveSpec(n), oldWave.waveSpec(n), `solo wave ${n} is Build 15's`); assert.deepEqual(waveSpec(n, 1), oldWave.waveSpec(n), `one player up: solo wave ${n}`); if (n <= 20) soloTable.push([n, waveSpec(n).count, waveSpec(n).aliveCap, +waveSpec(n).spawnGap.toFixed(2)]); }
  // Build 21: the arena's start, barricades, crates and areas moved from ambush.js into the map; they are compared by value.
  const arena = (await import(new URL('dist/maps.js', projectRoot))).activeMap().ambush, live = await import(new URL('dist/ambush.js', projectRoot));
  for (const [k, v] of Object.entries(oldWave.AMBUSH)) assert.deepEqual(k === 'start' ? arena.start : AMBUSH[k], v, `AMBUSH.${k} unchanged`); assert.deepEqual(Object.keys(AMBUSH).filter(k => !(k in oldWave.AMBUSH)), ['coop'], 'the only new tunables are the co-op ones'); assert(!Object.keys(AMBUSH).includes('start'), 'the start is only in the map');
  for (const name of ['GATES', 'STATIONS', 'AREAS']) { const was = Function(`return ${take(old, `export const ${name} = [`, '\n];').replace(`export const ${name} = `, '').replace(/;$/, '')}`)(); assert.deepEqual(live[name], was, `${name} (prices and places) unchanged`); assert.deepEqual(arena[name.toLowerCase()], was, `${name} in the map`); assert(!now.includes(`export const ${name} = [`), `${name} is no longer written in ambush.js`); }
  for (const f of ['magazinePrice', 'dressingPrice', 'rifleMagazines', 'bankMultiplier']) { const line = s => s.split('\n').find(l => l.includes(`const ${f} = `) || l.includes(`function ${f}(`)); assert(line(now)); assert.equal(line(now), line(old), `${f} unchanged`); }
  const coopTable = [], c = AMBUSH.coop; for (let n = 1; n <= 60; n++) { const s = waveSpec(n), d = waveSpec(n, 2); assert.deepEqual(Object.keys(d).sort(), Object.keys(s).sort()); assert.equal(d.count, Math.min(Math.round(s.count * 1.5), 60)); assert.equal(d.aliveCap, Math.min(12, Math.ceil(s.aliveCap * 1.5))); near(d.spawnGap, Math.max(.7, s.spawnGap * 2 / 3), 1e-12, 'gap'); assert.equal(d.fightRange, s.fightRange, 'fight range is solo\'s'); assert.equal(d.pauseScale, s.pauseScale, 'aggression is solo\'s'); assert(d.aliveCap + 4 <= c.enemyPool, 'the pool holds the alive cap and four bodies'); if (n <= 20) coopTable.push([n, d.count, d.aliveCap, +d.spawnGap.toFixed(2)]); }
  // Solo replay against the Build 15 game: same enemies in the same places with the same health, every two seconds for 300 s.
  const oldGame = new URL(`file://${(process.env.TMPDIR || '/tmp').replace(/\/$/, '')}/dustline-b15-game-${process.pid}.js`); fs.writeFileSync(oldGame, execSync(`git show ${BUILD15}:dist/game.js`, {cwd: new URL('.', projectRoot)}));
  const trace = async sourcePath => { const g = await createGame(sourcePath ? {sourcePath} : {}); g.prepare({clearLane: false}); g.setMode('ambush'); g.reset(); g.play(); g.restoreAI(); g.set({hp: 1e9}); g.el('blood').checked = false; for (const a of g.actors) a.animate = a.visual.animate; const rows = []; let clock = 0; g.frame(0);
    for (let i = 0; i < 300 * 60; i++) { g.frame(clock += 1000 / 60); const e = g.state().elapsed, T = g.ambush.aiT(); for (const a of enemies(g)) if (a.hp > 0) { const d = Math.hypot(a.g.position.x - g.player.x, a.g.position.z - g.player.z); if (a.killAt == null && ((a.ai.firing && d <= T.fightRange) || d <= AMBUSH.holdRange + 1)) a.killAt = e + 1.5; if (a.killAt != null && e >= a.killAt) { a.hp = 0; a.dead = 998; a.killAt = null; } } else a.killAt = null;
      if (i % 120 === 119) rows.push({t: (i + 1) / 60, wave: g.amb.wave, phase: g.amb.phase, toSpawn: g.amb.toSpawn, bearing: g.amb.bearing ?? null, e: enemies(g).map(a => [+a.g.position.x.toFixed(3), +a.g.position.z.toFixed(3), a.hp, a.ai?.state ?? null, a.gone ? 1 : 0])}); } return rows; };
  let was, is; try { was = await trace(oldGame); is = await trace(SOURCE); } finally { fs.unlinkSync(oldGame); } assert.equal(is.length, was.length); for (let i = 0; i < is.length; i++) assert.deepEqual(is[i], was[i], `solo Ambush at ${is[i].t} s differs from Build 15`); assert(is.at(-1).wave >= 3, 'several waves replayed');
  report.balance = {columns: ['wave', 'hostiles', 'alive at once', 'seconds between arrivals'], solo: soloTable, coop: coopTable, soloReplay: {seconds: 300, samples: is.length, wavesReached: is.at(-1).wave}};
});

await check('in co-op the enemies come for both players: the hunting is shared between the two (an arrival goes after the player with fewer hunters, an enemy turns to a nearer player it sees), each enemy hunts a player who is up, both players are fired at, never more are alive than the co-op cap, and the teammate takes the host\'s damage (AI-03)', async () => {
  const p = await pair(), {host} = p, A = host.amb, hunted = {player: 0, mate: 0}, firedAt = {host: 0, guest: 0}; let aliveMax = 0;
  p.place('host', -34, 22); p.place('guest', -24, 22); p.sync(); const born = new Set();
  p.run(150, () => { host.set({hp: 1e9}); host.remote.hp = 1e9; if (A.phase === 'decision') host.coop.vote('me', false); const e = host.state().elapsed;
    for (const a of enemies(host)) if (a.hp > 0) { born.add(a.index + ':' + a.life); assert(['player', 'mate'].includes(a.ai.prey)); hunted[a.ai.prey] += 1 / 60; if (a.ai.firing && a.seen) firedAt[a.seen.a ? 'guest' : 'host']++; if (a.killAt == null && a.ai.firing) a.killAt = e + 4; if (a.killAt != null && e >= a.killAt) { a.hp = 0; a.dead = 998; a.killAt = null; } } else a.killAt = null;
    const alive = enemies(host).filter(a => a.hp > 0).length; aliveMax = Math.max(aliveMax, alive); assert(alive <= waveSpec(Math.max(1, A.wave), 2).aliveCap, 'never more alive than the co-op cap'); });
  const total = hunted.player + hunted.mate; assert(born.size >= 12, `arrivals (${born.size})`); assert(Math.min(hunted.player, hunted.mate) >= total * .3, `the hunting is shared: ${hunted.player.toFixed(0)} enemy-seconds after the host, ${hunted.mate.toFixed(0)} after the guest`); assert(firedAt.host > 0 && firedAt.guest > 0, `both players are fired at (${firedAt.host} / ${firedAt.guest} firing frames)`);
  // Far apart (every area open, 55 m between the players), nobody sees the other player on the way in: an arrival goes after the player with fewer hunters alive, so both are hunted
  // for a like share of the time (the player who kills faster is sent more).
  { const q = await pair(), h = q.host, B = h.amb, births = {player: 0, mate: 0}, time = {player: 0, mate: 0}, seenKeys = new Set(); B.points = 1e6; for (const [x, z] of [[-26.5, 3.6], [-39, -8], [-26, -22.4]]) { q.place('host', x, z); assert(h.ambush.interact()); } q.place('host', -30, 22); q.place('guest', -30, -40); q.sync();
    q.run(180, () => { h.set({hp: 1e9}); h.remote.hp = 1e9; if (B.phase === 'decision') h.coop.vote('me', false); const e = h.state().elapsed; for (const a of enemies(h)) if (a.hp > 0) { const key = a.index + ':' + a.life; if (!seenKeys.has(key)) { seenKeys.add(key); births[a.ai.prey]++; } time[a.ai.prey] += 1 / 60; if (a.killAt == null && a.ai.firing) a.killAt = e + 3; if (a.killAt != null && e >= a.killAt) { a.hp = 0; a.dead = 998; a.killAt = null; } } else a.killAt = null; });
    const n = births.player + births.mate; assert(n >= 9, `arrivals (${n})`); assert(Math.min(births.player, births.mate) >= 2, `both are sent arrivals: ${births.player} for the host, ${births.mate} for the guest`); assert(Math.min(time.player, time.mate) >= (time.player + time.mate) * .3, `the hunting is shared: ${time.player.toFixed(0)} enemy-seconds after the host, ${time.mate.toFixed(0)} after the guest`); report.farApart = {arrivalsForHost: births.player, arrivalsForGuest: births.mate, enemySecondsAfterHost: Math.round(time.player), enemySecondsAfterGuest: Math.round(time.mate)}; }
  const dmg = who => { const out = []; for (let i = 0; i < 400; i++) { host.set({hp: 1e6}); host.remote.hp = 1e6; const t = who === 'host' ? {pos: host.player, a: null} : {pos: host.remote.g.position, a: host.remote}; host.aiHit(t, t.pos.clone().add(V(5, 1.4, 0)), t.pos.clone().setY(t.pos.y + 1.25)); out.push(1e6 - (who === 'host' ? host.coop.hp() : host.remote.hp)); } return [Math.min(...out), Math.max(...out)]; };
  const armor = CLASSES.assault.armor, dh = dmg('host'), dg = dmg('guest'); for (const [lo, hi] of [dh, dg]) { assert(lo >= 12 * armor - 1e-6 && hi <= 22 * armor + 1e-6, `damage 12 to 22 × armor (${lo.toFixed(2)} to ${hi.toFixed(2)})`); assert(hi - lo > 6 * armor, 'the whole range occurs'); }
  report.targets = {arrivals: born.size, enemySecondsAfterHost: Math.round(hunted.player), enemySecondsAfterGuest: Math.round(hunted.mate), firingFramesAtHost: firedAt.host, firingFramesAtGuest: firedAt.guest, aliveMax, damageOnHost: dh.map(v => +v.toFixed(2)), damageOnGuest: dg.map(v => +v.toFixed(2))};
});

await check('NET-04: a short interruption does not end the session or the run; the mission is held on both pages until the connection returns; only a lasting loss ends it (the host plays on alone, the guest gets its report); a guest cannot end the host\'s mission', async () => {
  const events = [], status = [], squad = new PeerSquad({status: t => status.push(t), onReady: () => events.push('ready'), onMessage: () => {}, onClose: () => events.push('close'), onUnstable: on => events.push(on ? 'unstable' : 'stable')});
  globalThis.RTCPeerConnection = class { constructor() { this.connectionState = 'new'; } createDataChannel() { return {readyState: 'open', bufferedAmount: 0, send() {}, close() {}}; } close() {} };
  const pc = squad.setup('host'), ch = pc.createDataChannel(); squad.bind(ch); ch.onopen(); assert(squad.connected); const go = s => { pc.connectionState = s; pc.onconnectionstatechange(); };
  go('connected'); go('disconnected'); assert.equal(squad.connected, true, 'still connected during a hiccup'); assert.equal(squad.unstable, true); assert.deepEqual(events, ['ready', 'unstable']); assert.match(status.at(-1), /interrupted/i);
  go('connected'); assert.equal(squad.unstable, false); assert.deepEqual(events, ['ready', 'unstable', 'stable']); assert.equal(squad.send({type: 'x'}), true);
  squad.graceTime = 30; go('disconnected'); await new Promise(r => setTimeout(r, 80)); assert.equal(squad.connected, false, 'a hiccup that outlasts the grace ends the session'); assert.equal(events.filter(e => e === 'close').length, 1);
  const s2 = new PeerSquad({status: () => {}, onMessage: () => {}, onClose: () => events.push('close2')}); const pc2 = s2.setup('host'), ch2 = pc2.createDataChannel(); s2.bind(ch2); ch2.onopen(); pc2.connectionState = 'failed'; pc2.onconnectionstatechange(); assert.equal(s2.connected, false, 'failed is final at once'); assert(events.includes('close2')); assert.equal(squad.graceTime === 30 && s2.graceTime, 15000, 'the grace is 15 seconds'); delete globalThis.RTCPeerConnection;
  // In the game: held while the connection is interrupted, resumed after; nothing is lost.
  const p = await pair(), {host, guest} = p, A = host.amb; p.run(AMBUSH.firstBreak + 6); assert.equal(A.phase, 'wave'); const snap = () => [host.state().elapsed, A.toSpawn, A.spawned, host.player.x, host.player.z, guest.player.x, guest.player.z, ...enemies(host).map(a => a.g.position.x)];
  host.peer.unstable = guest.peer.unstable = true; const held = snap(), guestClock = guest.state().elapsed; host.press('KeyW'); guest.press('KeyW'); p.run(5); assert.deepEqual(snap(), held, 'nothing moves, arrives or fires while the connection is interrupted'); assert(guest.state().elapsed <= guestClock, 'the guest\'s clock is held too'); for (const g of [host, guest]) assert.equal(g.state().state, 'playing');
  host.peer.unstable = guest.peer.unstable = false; p.run(2); assert.notDeepEqual(snap(), held, 'play resumes'); host.release('KeyW'); guest.release('KeyW'); assert(host.state().elapsed > held[0] + 1.9);
  host.receive({type: 'end', win: false, reason: 'x'}); host.receive({type: 'end', win: true, amb: {c: 'extract'}}); assert.equal(host.state().state, 'playing', 'an end message from the guest is ignored');
  // A lasting loss: the host plays on alone as a solo run, the guest gets a report.
  globalThis.localStorage = storage(); A.kills = 4; A.earned = 400; A.mate.kills = 2; A.mate.earned = 250; p.sync(); host.peer.connected = guest.peer.connected = false; host.peer.onClose(); guest.peer.onClose();
  assert.equal(host.state().state, 'playing', 'the host plays on'); assert.equal(A.mate.left, true); assert.equal(host.remote.g.visible, false); assert.equal(A.squad, 1); assert.equal(host.coop.humanEyes().length, 1); let c2 = 1e7; host.set({hp: 1e9}); for (let i = 0; i < 300; i++) host.frame(c2 += 1000 / 60); assert.equal(host.state().state, 'playing'); for (const a of enemies(host)) if (a.hp > 0) assert.notEqual(a.ai.prey, 'mate', 'nobody hunts a player who left');
  assert.equal(guest.state().state, 'ended'); assert.equal(guest.el('result').textContent, 'Connection lost.'); const lines = guest.el('report').textContent.split('\n'); assert.match(lines[0], /^The connection to your teammate ended in wave 1\./); assert.equal(lines[1], 'YOU: 2 kills · 250 points earned · nothing banked.'); assert.equal(lines[2], 'TEAMMATE: 4 kills · 400 points earned · nothing banked.');
  host.set({hp: 1}); host.aiHit({pos: host.player, a: null}, host.player.clone().add(V(5, 1.4, 0)), host.player.clone().setY(host.player.y + 1.2)); assert.equal(host.state().state, 'ended', 'alone, going down ends the run'); assert.match(host.el('report').textContent, /^You went down in wave 1 after your teammate left\./); delete globalThis.localStorage;
  report.net04 = {graceSeconds: 15};
});

console.log(JSON.stringify({passed: results.length, checks: results, report, limitations: [
  'Headless: two instances of the production game joined by a stand-in for the data channel (messages copied through JSON, delivered at once, none lost). No real WebRTC, no latency, no second network: a two-player playtest on two networks is still needed.',
  'Friendly fire is resolved on the host with no delay here. On a real connection the guest aims at a picture that is up to one snapshot (80 ms) plus the connection delay old, and the host does not; the damage rule and body shape are the same both ways, the timing is not.',
  'Whether the teammate reads as a teammate at combat distance, the spectator camera and the difficulty for two people need the Safari playtest. Frame time is measured separately.']}, null, 2));
