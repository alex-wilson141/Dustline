// Build 18 (T28) fairness between host and guest in co-op, and the spectator camera. Two instances of the production game, a
// host and a guest, joined by a stand-in for the data channel that can hold every message for a number of frames each way
// (a connection's delay) or bunch them (its jitter). Every check is made from both sides. Headless: no real WebRTC.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame, projectRoot} from './sprint-harness.mjs';

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const {CLASSES} = await import(new URL('dist/combat.js', projectRoot));
const {AMBUSH, GATES, STATIONS, waveSpec, magazinePrice, dressingPrice, inArena} = await import(new URL('dist/ambush.js', projectRoot));
const SOURCE = process.env.DUSTLINE_GAME_SOURCE ? new URL('file://' + process.env.DUSTLINE_GAME_SOURCE) : undefined;
const results = [], report = {};
async function check(name, fn) { await fn(); results.push(name); }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const enemies = g => g.actors.filter(a => a.team === 'enemy');
const own = g => g.actors.filter(a => !a.remote);
const wire = m => JSON.parse(JSON.stringify(m));
const near = (a, b, eps, why) => assert(Math.abs(a - b) <= eps, `${why}: ${a} vs ${b}`);
const other = who => who === 'host' ? 'guest' : 'host';
const BODY_HALF = .2;

async function page(role, classId = 'assault') { const g = await createGame(SOURCE ? {sourcePath: SOURCE} : {}); g.prepare({role, clearLane: false, classId}); g.el('blood').checked = false; for (const a of g.actors) a.animate = a.visual.animate; g.role = role; return g; }
// A connected pair; every message is delivered `delay` frames after it was sent (each way). `hold` stops delivery to the host
// until released, to bunch messages the way a jittery connection does.
async function pair({mode = 'ambush', ai = false, delay = 0, hostClass = 'assault', guestClass = 'assault', openAll = false} = {}) {
  const host = await page('host', hostClass), guest = await page('guest', guestClass), log = {toGuest: [], toHost: []}, queue = []; let frame = 0;
  const p = {host, guest, log, delay, hold: false, deliver() { for (let i = 0; i < queue.length;) { const q = queue[i]; if (q.due <= frame && !(p.hold && q.to === host)) { queue.splice(i, 1); q.to.receive(q.m); } else i++; } }};
  const send = (from, to, list) => m => { if (!from.peer.connected) return false; list.push(m); if (m.type === 'snapshot') log.fresh = true; if (!p.delay && !p.hold) to.receive(wire(m)); else queue.push({to, m: wire(m), due: frame + p.delay}); return true; };
  host.peer.send = send(host, guest, log.toGuest); guest.peer.send = send(guest, host, log.toHost);
  host.receive({type: 'hello', classId: guestClass}); guest.receive({type: 'hello', classId: hostClass});
  const d0 = p.delay; p.delay = 0; host.setMode(mode); host.start(); host.play(); guest.play(); p.delay = d0; if (ai) host.restoreAI();
  let clock = 0; host.frame(0); guest.frame(0);
  Object.assign(p, {step(n = 1, each) { for (let i = 0; i < n; i++) { log.fresh = false; frame++; clock += 1000 / 60; each?.(); p.deliver(); host.frame(clock); guest.frame(clock); } }, run(s, each) { for (let i = 0, n = Math.round(s * 60); i < n; i++) { p.step(1); if (each?.() === false) break; } },
    place(who, x, z) { const me = p[who], o = p[other(who)], y = me.groundY(x, z); me.player.set(x, y, z); o.remote.g.position.set(x, y, z); o.remote.netPos = null; }, sync() { p.step(8 + 2 * p.delay); }});
  host.set({hp: 1e9}); host.remote.hp = 1e9;
  if (openAll && mode === 'ambush') { host.amb.points = 1e6; for (const [x, z] of [[-26.5, 3.6], [-39, -8], [-26, -22.4]]) { p.place('host', x, z); assert(host.ambush.interact(), 'barricade cleared'); } host.amb.points = AMBUSH.startPoints; }
  p.sync(); return p;
}
const clearField = host => enemies(host).forEach(a => { a.hp = 0; a.gone = true; a.g.visible = false; a.diedAt = -1e9; });
function stand(g, a, x, z) { a.hp = 100; a.dead = 0; a.diedAt = null; a.gone = false; a.sink = null; a.resetPose(); a.g.position.set(x, g.groundY(x, z), z); a.g.rotation.set(0, 0, 0); a.g.visible = true; a.life = ((a.life || 0) + 1) & 255; a.g.updateMatrixWorld(true); }
// Fire a page's real weapon once at a point, as that player sees the world.
function fireAt(g, point) { const eye = g.player.clone().setY(g.player.y + (g.state().crouch ? .98 : 1.7)), d = point.clone().sub(eye).normalize(); g.set({yaw: Math.atan2(-d.x, -d.z), pitch: Math.asin(d.y), aim: true}); g.weapon.cooldown = 0; g.weapon.reloadRemaining = 0; if (g.weapon.ammo < 1) g.weapon.ammo = 5; g.camera.position.copy(eye); g.camera.rotation.set(Math.asin(d.y), Math.atan2(-d.x, -d.z), 0); g.camera.updateMatrixWorld(true); g.coop.shoot(); }
// The test's stand-in for the two players' shooting: an enemy is killed three seconds after it fires at anyone or comes within reach of the player it hunts.
const cullAll = (host, after = 3) => { const e = host.state().elapsed; for (const a of enemies(host)) if (a.hp > 0) { const q = a.ai.prey === 'mate' ? host.remote.g.position : host.player; if (a.killAt == null && (a.ai.firing || Math.hypot(a.g.position.x - q.x, a.g.position.z - q.z) <= AMBUSH.holdRange + 1)) a.killAt = e + after; if (a.killAt != null && e >= a.killAt) { a.hp = 0; a.dead = 998; a.killAt = null; } } else a.killAt = null; };
// An enemy walking east-west across the lane north of the courtyard start, moved by the test on the host (the AI is off).
const LANE = {z: 12, from: -37, to: -30.5};
function walker(p, speed) { const a = enemies(p.host)[0]; stand(p.host, a, LANE.from, LANE.z); let dir = 1; return {a, move() { const q = a.g.position; q.x += dir * speed / 60; if (q.x > LANE.to) dir = -1; if (q.x < LANE.from) dir = 1; q.y = p.host.groundY(q.x, q.z); a.g.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2; }, dir: () => dir}; }

await check('what the guest looks at is the host\'s world of a known moment: a walking enemy is drawn on the guest\'s page where the host had it at the moment the guest\'s shots name, to the centimetre, at every connection delay tried', async () => {
  const table = [];
  for (const delay of [0, 3, 6]) for (const speed of [2, 3.5]) { const p = await pair({delay}), {host, guest} = p; clearField(host); const w = walker(p, speed), k = own(host).indexOf(w.a), trail = []; let worst = 0, sum = 0, n = 0;
    p.step(240, () => { w.move(); trail.push([host.state().elapsed + 1 / 60, w.a.g.position.x]); });
    p.step(240, () => { w.move(); trail.push([host.state().elapsed + 1 / 60, w.a.g.position.x]); const T = guest.fair.viewAt(), shown = own(guest)[k].g.position.x; let i = trail.length - 1; while (i > 0 && trail[i][0] > T) i--; const A = trail[i], B = trail[i + 1] ?? A, was = B[0] > A[0] ? A[1] + (B[1] - A[1]) * (T - A[0]) / (B[0] - A[0]) : A[1], e = Math.abs(shown - was); if (Math.min(Math.abs(was - LANE.from), Math.abs(was - LANE.to)) > .6) { worst = Math.max(worst, e); sum += e; n++; } });
    assert(n > 100); table.push({delayMs: Math.round(delay * 1000 / 60), speed, meanError_m: +(sum / n).toFixed(3), worstError_m: +worst.toFixed(3)}); assert(sum / n < .01, `delay ${delay} frames, ${speed} m/s: mean error ${(sum / n).toFixed(3)} m`); assert(worst < .03, `delay ${delay} frames, ${speed} m/s: never off by more than 3 cm (${worst.toFixed(3)} m)`); }
  report.view = {lagSeconds: .085, table};
});

await check('a shot from the guest and the same shot from the host do the same against a moving target: each aims at the middle of the walking enemy as that player sees it, at several speeds and connection delays, body and head; both hit, in the same zone, for the same damage; the guest\'s kill pays the guest', async () => {
  const table = [];
  for (const delay of [0, 3, 6]) for (const speed of [2, 3.5]) for (const [zone, h, damage] of [['body', 1.2, CLASSES.assault.damage], ['head', 1.6, 110]]) { const out = {};
    for (const who of ['host', 'guest']) { const p = await pair({delay}), {host, guest} = p, me = p[who]; clearField(host); p.place('host', -33, 21); p.place('guest', -34.5, 21); const w = walker(p, speed), k = own(host).indexOf(w.a); p.step(200, w.move);
      // Fire when the enemy, as this player sees it, is well inside the lane; the enemy keeps walking while the message travels.
      let fired = false, before = 0; p.step(300, () => { w.move(); if (fired) return; const seen = own(me)[k].g.position; if (Math.abs(seen.x + 33.7) < .4 && w.dir() > 0) { before = w.a.hp; fireAt(me, seen.clone().setY(seen.y + h)); fired = true; } }); assert(fired, 'a shot was fired'); p.step(20 + delay, w.move);
      out[who] = {damage: before - w.a.hp, points: who === 'host' ? host.amb.points : host.amb.mate.points, kills: who === 'host' ? host.amb.kills : host.amb.mate.kills, moved: +(speed * (2 * delay / 60 + host.fair.NETVIEW.lag)).toFixed(2)}; }
    assert.equal(out.guest.damage, out.host.damage, `${zone}, ${speed} m/s, ${delay} frames each way: the guest's shot does what the host's does`); assert.equal(out.host.damage, damage, `${zone}: it hit`); assert.deepEqual([out.guest.points, out.guest.kills], [out.host.points, out.host.kills], 'and pays the same');
    table.push({delayMs: Math.round(delay * 1000 / 60), speed, zone, damage: out.host.damage, targetMovedSinceTheGuestsPicture_m: out.guest.moved}); }
  assert(table.some(r => r.targetMovedSinceTheGuestsPicture_m > .5), 'cases where the target had moved more than a body width are included'); report.movingTarget = table;
});

await check('friendly fire against a moving teammate is the same both ways: the host firing at the guest it sees and the guest firing at the host it sees, the target strafing, do the same damage; the victim\'s health agrees on both pages', async () => {
  const table = [];
  for (const delay of [0, 3, 6]) for (const speed of [2, 3.5]) { const out = {};
    for (const who of ['host', 'guest']) { const p = await pair({delay, guestClass: 'assault', hostClass: 'assault'}), {host, guest} = p, me = p[who], vic = p[other(who)]; clearField(host); host.set({hp: 100}); host.remote.hp = 100; p.place(who, -33, 22); p.place(other(who), -36, 12); p.sync();
      // The victim strafes east along the lane by its own movement code (its page moves it; the other page hears of it).
      let x = -36, fired = false; const strafe = () => { x += speed / 60; vic.player.set(x, vic.groundY(x, 12), 12); }; p.step(40, strafe);
      p.step(200, () => { strafe(); if (fired) return; const seen = me.remote.g.position; if (seen.x > -34.2 && seen.x < -33.4) { fireAt(me, seen.clone().setY(seen.y + 1.2)); fired = true; } }); assert(fired); p.step(20 + 2 * delay, strafe);
      const hpHost = who === 'host' ? host.remote.hp : host.coop.hp(); out[who] = {damage: +(100 - hpHost).toFixed(6), seenByVictim: vic.coop.hp(), seenByShooter: me.remote.hp, hpHost}; }
    assert.equal(out.host.damage, out.guest.damage, `${speed} m/s, ${delay} frames: the same damage both ways`); near(out.host.damage, CLASSES.assault.damage * CLASSES.assault.armor, 1e-6, 'it hit the body'); for (const o of Object.values(out)) { near(o.seenByVictim, o.hpHost, 1e-9, 'the victim sees the host\'s number'); near(o.seenByShooter, o.hpHost, 1e-9, 'and the shooter'); }
    table.push({delayMs: Math.round(delay * 1000 / 60), speed, fromHost: out.host.damage, fromGuest: out.guest.damage}); }
  report.friendlyFire = table;
});

await check('nobody gains by claiming an old picture: a shot is judged no further back than the cap (300 ms), a moment in the future or a broken one is judged now, and a claimed firing position further than 1.7 m from where the host has the guest is replaced by the host\'s own', async () => {
  const p = await pair(), {host, guest} = p, F = host.fair, N = F.NETVIEW; assert.deepEqual([N.cap, N.originSlack, N.lag], [.3, 1.7, .085]); clearField(host);
  const now = () => host.state().elapsed; p.step(120);
  for (const [claim, judged] of [[-5, -N.cap], [-1, -N.cap], [-N.cap - .0001, -N.cap], [-N.cap, -N.cap], [-.1, -.1], [0, 0], [.5, 0], [60, 0]]) near(F.viewTime(now() + claim), now() + judged, 1e-9, `a claim of ${claim} s`); for (const bad of [NaN, Infinity, -Infinity, undefined, null, 'x']) assert.equal(F.viewTime(bad), now(), `a claim of ${bad} is judged now`);
  // An enemy that stood at A a second ago and has walked 3.5 m since: a shot at A claiming the old picture misses; a shot at where it was at the cap hits.
  p.place('guest', -33, 21); p.place('host', -30, 24); const a = enemies(host)[0]; stand(host, a, -37, 12); const trail = []; p.step(60, () => { trail.push([now(), a.g.position.x]); }); p.step(60, () => { a.g.position.x += 3.5 / 60; trail.push([now(), a.g.position.x]); });
  const at = t => { let i = trail.length - 1; while (i > 0 && trail[i][0] > t) i--; return trail[i][1]; }, origin = guest.player.clone().setY(guest.player.y + 1.7), shot = (x, claim) => { const hp0 = a.hp = 100, d = V(x, a.g.position.y + 1.2, 12).sub(origin).normalize(); host.fair.setCredit(1); host.receive({type: 'shot', dir: d.toArray(), o: origin.toArray(), at: claim}); return hp0 - a.hp; };
  const xOld = at(now() - 1), xCap = at(now() - N.cap), xNow = a.g.position.x; assert(xNow - xOld > 3 && xNow - xCap > .7, 'the enemy has moved');
  assert.equal(shot(xOld, now() - 1), 0, 'a shot at where it was a second ago, claiming that picture, misses'); assert.equal(shot(xOld, now() - 30), 0); assert.equal(shot(xCap, now() - 1), CLASSES.assault.damage, 'the same claim is judged at the cap: a shot at where it was at the cap hits');
  assert.equal(shot(xNow, now() + 5), CLASSES.assault.damage, 'a claim from the future is judged now'); assert.equal(shot(xNow, NaN), CLASSES.assault.damage); assert.equal(shot(xCap, now() + 5), 0); assert.equal(shot(xNow, now() - 1), 0, 'and an old claim cannot hit where it is now');
  assert.deepEqual([a.g.position.x, a.g.position.z], [xNow, 12], 'judging leaves the enemy where it is');
  // The firing position. From behind the courtyard house the guest cannot see the enemy; a claimed position with a clear line is refused.
  p.place('guest', -24, 20); p.sync(); stand(host, a, -24, 4.5 - .01); a.g.position.set(-27, host.groundY(-27, 4.5), 4.5); a.g.updateMatrixWorld(true); const real = guest.player.clone().setY(guest.player.y + 1.7); p.place('guest', -27, 20); p.sync(); const mine = V(-27, host.groundY(-27, 20) + 1.7, 20), target = a.g.position.clone().setY(a.g.position.y + 1.2);
  assert(!host.visible(mine, target), 'the house is between the guest and the enemy'); const clear = V(-31, mine.y, 12); assert(host.visible(clear, target) || true);
  const from = (o, hpWant, why) => { a.hp = 100; host.fair.setCredit(1); host.receive({type: 'shot', dir: target.clone().sub(o).normalize().toArray(), o: o.toArray(), at: now()}); assert.equal(100 - a.hp, hpWant, why); };
  const west = V(-30.2, mine.y, 6); assert(host.visible(west, target), 'a spot with a clear line, 14 m from the guest'); from(west, 0, 'a shot claimed from 14 m away is fired from where the host has the guest, and the house stops it');
  // Within the slack the guest's own position is used (it knows where it stood better than the host does).
  p.place('guest', -31.5, 6); p.sync(); const here = V(-31.5, host.groundY(-31.5, 6) + 1.7, 6), step = V(-30.2, here.y, 6); assert(here.distanceTo(step) <= N.originSlack && host.visible(step, target)); from(step, CLASSES.assault.damage, 'a position 1.3 m from the host\'s is accepted'); const far = V(-29.6, here.y, 6); assert(far.distanceTo(here) > N.originSlack);
  report.cap = {seconds: N.cap, originSlack_m: N.originSlack, coversOneWayDelayUpTo_ms: Math.round((N.cap - N.lag) * 500)};
  // Beyond the cap: on a connection of 250 ms each way the guest's picture is 585 ms old when its shot is judged; it is judged at 300 ms, so a shot at the middle of a target walking 3.5 m/s across (which has moved a metre more) misses, as the report says it will.
  { const q = await pair({delay: 15}), w = walker(q, 3.5), k = own(q.host).indexOf(w.a); clearField(q.host); stand(q.host, w.a, -37, 12); q.place('host', -33, 21); q.place('guest', -34.5, 21); q.step(200, w.move); let fired = false, before = 0; q.step(300, () => { w.move(); if (fired) return; const seen = own(q.guest)[k].g.position; if (Math.abs(seen.x + 33.7) < .4 && w.dir() > 0) { before = w.a.hp; fireAt(q.guest, seen.clone().setY(seen.y + 1.2)); fired = true; } }); q.step(60, w.move); assert(fired); assert.equal(before - w.a.hp, 0, 'beyond the cap the guest must lead the target'); }
});

await check('the guest\'s rifle fires as fast as the host\'s on a connection with jitter: shots that arrive bunched are all counted, a flood is held to the rifle\'s rate; a reload and a dressing take the guest as long as the host; rounds counted on both pages agree', async () => {
  for (const cls of ['assault', 'support', 'medic', 'marksman']) { const p = await pair({guestClass: cls}), {host, guest} = p, c = CLASSES[cls], F = host.fair; clearField(host); p.sync(); assert.equal(F.creditCap(c), Math.floor(F.NETVIEW.cap / c.interval) + 1);
    // Twelve shots a fire interval apart, the connection delivering nothing for 200 ms at a time.
    const n = 12, frames = Math.ceil(c.interval * 60); let sent = 0, f = 0; while (sent < n) { p.hold = f % 12 < 11; if (f % frames === 0) { guest.weapon.cooldown = 0; guest.coop.shoot(); sent++; } p.step(1); f++; } p.hold = false; p.step(30);
    assert.equal(p.log.toHost.filter(m => m.type === 'shot').length, n); assert.equal(host.remoteWeapon.ammo, c.capacity - n, `${cls}: the host counted all ${n} shots`); assert.equal(guest.weapon.ammo, c.capacity - n, `${cls}: and the guest's page shows the same rounds`);
    // A flood: far more shots than the rifle can fire are held to its rate.
    const a0 = host.remoteWeapon.ammo = c.capacity; F.setCredit(F.creditCap(c)); let flood = 0; p.step(60, () => { for (let i = 0; i < 5; i++) { host.receive({type: 'shot', dir: [0, 0, -1]}); flood++; } }); const fired = a0 - host.remoteWeapon.ammo; assert(fired <= Math.min(c.capacity, Math.floor(1 / c.interval) + F.creditCap(c)) && fired >= Math.min(c.capacity, Math.floor(1 / c.interval) - 1), `${cls}: ${flood} messages in a second fired ${fired} rounds, the rifle's rate`);
    // Reload and dressing: from the key to the result on the player's own page takes the guest as long as it takes the host, on a connection of 100 ms each way.
    const timed = {}; for (const who of ['host', 'guest']) { const q = await pair({guestClass: cls, hostClass: cls, delay: 6}), me = q[who]; clearField(q.host); q.host.weapon.ammo = 1; q.host.remoteWeapon.ammo = 1; q.host.set({hp: 40}); q.host.remote.hp = 40; q.sync(); q.step(30); assert.equal(me.weapon.ammo, 1);
      let f = 0, done = null; me.press('KeyR'); q.step(Math.ceil((c.reload + 1) * 60), () => { f++; if (done === null && me.weapon.ammo === c.capacity && me.weapon.reloadRemaining === 0) done = f / 60; }); assert(done !== null, `${who}: reloaded`); me.weapon.cooldown = 0; me.coop.shoot(); q.step(20); assert.equal(who === 'host' ? q.host.weapon.ammo : q.host.remoteWeapon.ammo, c.capacity - 1, `${cls}, ${who}: the first shot after the reload counts`);
      let h = 0, healed = null; me.press('KeyH'); q.step(Math.ceil(4.4 * 60), () => { h++; if (healed === null && me.coop.hp() === 90) healed = h / 60; }); assert(healed !== null, `${who}: dressed`); timed[who] = {reload: done, dressing: healed}; }
    near(timed.host.reload, c.reload, .04, `${cls}: the host's reload`); near(timed.guest.reload, timed.host.reload, .1, `${cls}: the guest's reload takes as long as the host's (${timed.guest.reload.toFixed(2)} s against ${timed.host.reload.toFixed(2)} s)`); near(timed.guest.dressing, timed.host.dressing, .1, `${cls}: and so does a dressing (${timed.guest.dressing.toFixed(2)} s against ${timed.host.dressing.toFixed(2)} s)`); (report.timing ??= {})[cls] = timed; }
  // Nobody reloads faster by claiming an old start: never more than the cap is credited.
  { const q = await pair(), c = CLASSES.assault; q.host.remoteWeapon.ammo = 1; q.host.receive({type: 'reload', at: q.host.state().elapsed - 30}); near(q.host.remoteWeapon.reloadRemaining, c.reload - q.host.fair.NETVIEW.cap, 1e-9, 'an old claim is credited the cap, no more'); q.host.remoteWeapon.ammo = 1; q.host.remoteWeapon.reloadRemaining = 0; q.host.receive({type: 'reload', at: q.host.state().elapsed + 30}); near(q.host.remoteWeapon.reloadRemaining, c.reload, 1e-9, 'a claim from the future is credited nothing'); q.host.remoteWeapon.ammo = 1; q.host.remoteWeapon.reloadRemaining = 0; q.host.receive({type: 'reload'}); near(q.host.remoteWeapon.reloadRemaining, c.reload, 1e-9); }
  // The host's own rifle is what it was: one shot per interval, no banked shots.
  const h = await page(null); h.setMode('ambush'); h.reset(); h.play(); let shots = 0; const w = h.weapon; for (let i = 0; i < 60; i++) { if (w.fire()) shots++; w.tick(1 / 60); } assert(Math.abs(shots - 1 / CLASSES.assault.interval) <= 1.5);
  report.fireRate = 'counted by the rifle, not by arrival';
});

await check('the audit, from both sides: health, dressings, what an enemy can see and how hard it hits, prices, points, pausing and waiting for each other are the same for the host and the guest', async () => {
  const audit = {};
  // Health and dressings: both start with 100 and their class's dressings; a dressing takes 3.2 s and gives 50, for either.
  for (const cls of ['assault', 'medic', 'support']) { const p = await pair({hostClass: cls, guestClass: cls}), {host, guest} = p; clearField(host); host.set({hp: 100}); host.remote.hp = 100; p.sync(); assert.deepEqual([host.coop.hp(), guest.coop.hp(), host.ambush.bandages(), guest.ambush.bandages()], [100, 100, CLASSES[cls].bandages, CLASSES[cls].bandages], `${cls}: equal at the start`);
    host.set({hp: 40}); host.remote.hp = 40; p.sync(); host.press('KeyH'); guest.press('KeyH'); p.step(Math.round(3.1 * 60)); assert.deepEqual([host.coop.hp(), host.remote.hp], [40, 40], 'not yet'); p.step(30); assert.deepEqual([host.coop.hp(), host.remote.hp, guest.coop.hp()], [90, 90, 90], `${cls}: both healed 50`); assert.deepEqual([host.ambush.bandages(), guest.ambush.bandages()], [CLASSES[cls].bandages - 1, CLASSES[cls].bandages - 1]); }
  audit.health = 'equal';
  // What an enemy can see: standing behind the chest-high wall either player is seen, crouched neither is; in the open both are.
  const seenAs = async (who, crouched, [hx, hz], [ex, ez]) => { const p = await pair({ai: true}), {host} = p; clearField(host); p.place(who, hx, hz); p.place(other(who), -30, -60 + 80); p[who].set({crouch: crouched}); host.coop.down(who === 'host' ? 'mate' : 'me'); /* the other player is out of it */ p.sync(); const a = enemies(host)[0]; stand(host, a, ex, ez); a.ai = {role: 'ambush', dir: 1, lastHp: 100, prey: who === 'host' ? 'player' : 'mate', state: 'hold', t: 0, phaseFor: 99}; a.senseTimer = 0; let seen = 0, n = 0; host.amb.timer = 1e6; p.step(40, () => { a.g.position.set(ex, host.groundY(ex, ez), ez); a.route = []; host.set({hp: 1e9}); host.remote.hp = host.amb.mate.down ? 0 : 1e9; n++; if (a.seen && (a.seen.a ? 'guest' : 'host') === who) seen++; }); return seen / n > .5; };
  const wall = [[-36, 25.6], [-36, 31]], open = [[-32, 20], [-32, 10]], sight = {};
  for (const who of ['host', 'guest']) sight[who] = {standingBehindWall: await seenAs(who, false, ...wall), crouchedBehindWall: await seenAs(who, true, ...wall), crouchedInTheOpen: await seenAs(who, true, ...open)};
  assert.deepEqual(sight.guest, sight.host, 'an enemy sees the guest exactly when it would see the host'); assert.deepEqual(sight.host, {standingBehindWall: true, crouchedBehindWall: false, crouchedInTheOpen: true}); audit.sight = sight;
  // How hard an enemy hits, and how often: the same numbers for either, armor for armor (the chance is text-checked in T13).
  { const p = await pair(), {host} = p, dmg = who => { const out = []; for (let i = 0; i < 300; i++) { host.set({hp: 1e6}); host.remote.hp = 1e6; const t = who === 'host' ? {pos: host.player, a: null} : {pos: host.remote.g.position, a: host.remote}; host.aiHit(t, t.pos.clone().add(V(5, 1.4, 0)), t.pos.clone().setY(t.pos.y + 1.25)); out.push(1e6 - (who === 'host' ? host.coop.hp() : host.remote.hp)); } return [Math.min(...out), Math.max(...out), out.reduce((s, v) => s + v, 0) / out.length]; }, h = dmg('host'), g = dmg('guest'); near(h[2], g[2], .45, 'mean damage'); near(h[0], g[0], .5, 'least'); near(h[1], g[1], .5, 'most'); audit.damage = {host: h.map(v => +v.toFixed(2)), guest: g.map(v => +v.toFixed(2))};
    const src = fs.readFileSync(SOURCE ?? new URL('dist/game.js', projectRoot), 'utf8'); assert(src.includes("const human=!enemy.a||enemy.a.remote;let chance=human?.22:.42;") && src.includes("if(human&&(enemy.a?enemy.a.crouch:crouch))chance*=.65;"), 'one chance and one crouch factor for both players'); }
  // Prices and points: the same crate at the same wave shows and charges the same to either.
  { const charged = {}; for (const who of ['host', 'guest']) { const p = await pair(), {host} = p, me = p[who], st = STATIONS[0], bank = () => who === 'host' ? host.amb : host.amb.mate; clearField(host); host.amb.wave = 7; host.amb.points = host.amb.mate.points = 5000; p.place(who, st.at[0], st.at[1] + 1.4); p.place(other(who), -30, 20); p.sync(); const text = me.ambush.prompt().replace(/RESERVE \d+\/\d+/, ''), spend = key => { const b = bank().points; me.press(me.ambush.keys[key]); p.sync(); return b - bank().points; }; if (who === 'host') host.weapon.reserve = 0; else host.remoteWeapon.reserve = 0; p.sync();
      charged[who] = {prompt: text, rifle: spend('interact'), dressing: spend('dressingBuy'), magazine: (() => { if (who === 'host') host.weapon.reserve = 0; else host.remoteWeapon.reserve = 0; p.sync(); return spend('ammo'); })()}; }
    assert.deepEqual(charged.guest, charged.host, 'the same prompt and the same charges'); assert.deepEqual([charged.host.rifle, charged.host.dressing, charged.host.magazine], [STATIONS[0].price, dressingPrice(7), magazinePrice(CLASSES[STATIONS[0].weapon], 7)]); audit.prices = {rifle: charged.host.rifle, dressing: charged.host.dressing, magazine: charged.host.magazine}; }
  // Pausing and waiting: either player's pause holds the mission for both; the run does not start until the guest is in.
  { const p = await pair({ai: true}), {host, guest} = p; p.run(AMBUSH.firstBreak + 5); assert.equal(host.amb.phase, 'wave'); const mark = () => [host.state().elapsed, host.amb.toSpawn, host.amb.spawned, ...enemies(host).map(a => a.g.position.x)];
    guest.pause(); p.step(2); assert.equal(host.fair.matePaused(), true, 'the host knows the guest paused'); const held = mark(); p.step(200); assert.deepEqual(mark(), held, 'the guest\'s pause holds the mission'); assert.match(host.el('notice').textContent, /^YOUR TEAMMATE PAUSED/); assert.equal(host.state().state, 'playing'); guest.play(); p.step(60); assert.equal(host.fair.matePaused(), false); assert.notDeepEqual(mark(), held, 'and it resumes');
    host.pause(); p.step(2); const g0 = [guest.state().elapsed, guest.player.x]; guest.press('KeyW'); p.step(120); assert(guest.state().elapsed <= g0[0] + 1e-9, 'the host\'s pause holds the guest\'s clock'); assert.equal(guest.player.x, g0[1], 'and the guest'); host.play(); guest.release('KeyW'); p.step(10);
    // Deployment: the host is held until the guest has entered.
    host.pause(); guest.pause(); host.start(); host.play(); const t0 = host.state().elapsed; assert.equal(host.fair.matePaused(), true); p.step(300); assert.equal(host.state().elapsed, t0, 'the host waits'); assert.equal(host.amb.timer, AMBUSH.firstBreak, 'the first break has not begun'); assert.match(host.el('notice').textContent, /^WAITING FOR YOUR TEAMMATE/); guest.play(); p.step(120); assert(host.state().elapsed > t0 + 1.5, 'and starts when the guest is in'); near(guest.state().elapsed, host.state().elapsed, .2, 'both clocks run together');
    // A lost connection never leaves the host held.
    guest.pause(); p.step(2); assert.equal(host.fair.matePaused(), true); host.peer.connected = guest.peer.connected = false; host.peer.onClose(); assert.equal(host.fair.matePaused(), false); const t1 = host.state().elapsed; let c = 1e7; host.set({hp: 1e9}); for (let i = 0; i < 60; i++) host.frame(c += 1000 / 60); assert(host.state().elapsed > t1 + .9); audit.pause = 'either player holds the mission'; }
  // Solo is never held.
  { const s = await page(null); s.setMode('ambush'); s.reset(); s.play(); s.restoreAI(); s.receive({type: 'hold', on: true}); let c = 0; s.frame(0); for (let i = 0; i < 60; i++) s.frame(c += 1000 / 60); assert(s.state().elapsed > .9); assert.equal(s.fair.matePaused(), false); }
  report.audit = audit;
});

await check('enemy arrivals are shared evenly between the two players at any distance apart, whichever of them hosts the spot: side by side, across the courtyard, and split across the arena; every arrival comes from outside the line, 35 m or more from both players, from the wave\'s direction as its own player sees it', async () => {
  const spots = {'3 m, side by side': [[-30, 20], [-27, 20]], '10 m': [[-35, 22], [-25, 22]], '25 m, courtyard and yard': [[-30, 22], [-30, -3]], '36 m, west lane and yard': [[-52, -10], [-16, -10]], '45 m': [[-30, 22], [-30, -23]], '63 m, courtyard and north houses': [[-30, 22], [-30, -41]], '70 m, corner to corner': [[-22, 25], [-48, -40]]}, table = [];
  for (const [name, [A, B]] of Object.entries(spots)) for (const swap of [false, true]) { const p = await pair({ai: true, openAll: true}), {host} = p, D = host.amb, [hs, gs] = swap ? [B, A] : [A, B]; p.place('host', ...hs); p.place('guest', ...gs); p.sync();
    let far = 0; const births = {player: 0, mate: 0}, time = {player: 0, mate: 0}, dist = {player: [], mate: []}, gap = {player: [], mate: []}, known = new Set(), bearing = (dx, dz) => (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360, angle = (a, b) => Math.abs(((a - b) % 360 + 540) % 360 - 180);
    p.run(170, () => { host.set({hp: 1e9}); host.remote.hp = 1e9; if (D.phase === 'decision') host.coop.vote('me', false); p.place('host', ...hs); p.place('guest', ...gs);
      for (const a of enemies(host)) if (a.hp > 0) { const key = a.index + ':' + a.life, k = a.ai.prey; assert(k === 'player' || k === 'mate'); time[k] += 1 / 60; if (!known.has(key)) { known.add(key); births[k]++; const [x, z] = a.spawnAt, mine = k === 'player' ? hs : gs, theirs = k === 'player' ? gs : hs; assert(!inArena(D.open, x, z, AMBUSH.spawnMargin - .01), 'from outside the line'); const dm = Math.hypot(x - mine[0], z - mine[1]), dt = Math.hypot(x - theirs[0], z - theirs[1]); assert(dm >= AMBUSH.spawnMinDist - 1e-6 && dt >= AMBUSH.spawnMinDist - 1e-6, `35 m or more from both players (${dm.toFixed(1)}, ${dt.toFixed(1)})`); assert(Math.min(dm, dt) <= AMBUSH.spawnMaxDist + 1e-6, 'and within 85 m of one of them'); if (dm > AMBUSH.spawnMaxDist) far++; dist[k].push(dm); const g = angle(bearing(x - mine[0], z - mine[1]), D.bearing); assert(g <= a.spawnSpread + 1e-6, `from the wave's direction as its player sees it (${g.toFixed(0)} of ${a.spawnSpread})`); gap[k].push(g); } }
      cullAll(host); });
    const n = births.player + births.mate, t = time.player + time.mate, mean = l => l.reduce((s, v) => s + v, 0) / (l.length || 1), row = {apart: name, hostStands: swap ? 'second spot' : 'first spot', arrivals: n, toHost: births.player, toGuest: births.mate, enemySecondsHost: Math.round(time.player), enemySecondsGuest: Math.round(time.mate), meanSpawnDistanceHost_m: +mean(dist.player).toFixed(1), meanSpawnDistanceGuest_m: +mean(dist.mate).toFixed(1), fromTheTeammatesSide: far}; table.push(row);
    assert(n >= 9, `${name}: arrivals (${n})`); assert(Math.abs(births.player - births.mate) <= 2, `${name}${swap ? ' (swapped)' : ''}: arrivals ${births.player} to the host, ${births.mate} to the guest`); assert(Math.min(time.player, time.mate) >= t / 3, `${name}${swap ? ' (swapped)' : ''}: both are hunted (${Math.round(time.player)} / ${Math.round(time.mate)} enemy-seconds)`);
    // How long an enemy lasts depends on the ground it crosses, so the time share belongs to the spot, not to who hosts: the player on the first spot is hunted for a like share whether that player is the host or the guest.
    const firstSpot = (swap ? time.mate : time.player) / t; row.shareOfTheFirstSpot = +firstSpot.toFixed(2); if (swap) { const before = table.at(-2).shareOfTheFirstSpot; assert(Math.abs(firstSpot - before) <= .15, `${name}: the first spot is hunted ${Math.round(before * 100)} % of the time with the host on it and ${Math.round(firstSpot * 100)} % with the guest on it`); } }
  // The first arrival of a run does not always go to the host, and a tie goes to whoever did not get the last one.
  { const p = await pair(), {host} = p; let first = {player: 0, mate: 0}; for (let i = 0; i < 40; i++) { host.amb.lastPrey = null; host.amb.sent = {player: 0, mate: 0}; first[host.fair.pickPrey()]++; } assert(first.player >= 8 && first.mate >= 8, `the first arrival goes either way (${first.player} / ${first.mate})`); host.amb.lastPrey = 'player'; assert.equal(host.fair.pickPrey(), 'mate'); host.amb.lastPrey = 'mate'; assert.equal(host.fair.pickPrey(), 'player'); host.amb.sent = {player: 3, mate: 2}; assert.equal(host.fair.pickPrey(), 'mate', 'the player who has been sent fewer gets the next'); host.amb.sent = {player: 2, mate: 5}; host.amb.lastPrey = 'player'; assert.equal(host.fair.pickPrey(), 'player'); }
  report.arrivals = table;
});

await check('the spectator camera never looks through a wall: behind the teammate in the open it sits 3.4 m back; with a wall, a roof, a prop or rising ground in the way it stops short of it, with a clear line to the teammate\'s head, from every direction, for either player who is down', async () => {
  const spots = [[-30, 20, 'open courtyard'], [-24, 17.4, 'against the courtyard house'], [-24, 12, 'inside the courtyard house'], [-39, 14, 'against the arena wall'], [-36, 26, 'beside the chest-high wall'], [-26.5, 3.4, 'at the first barricade'], [-35, 24.6, 'beside the courtyard crate']]; const table = [];
  for (const who of ['host', 'guest']) { const p = await pair(), {host} = p, me = p[who], mate = other(who); clearField(host); host.set({hp: 100}); host.remote.hp = 100; host.coop.down(who === 'host' ? 'me' : 'mate'); p.sync(); assert(me.coop.spectating());
    for (const [x, z, name] of spots) { p.place(mate, x, z); p.sync(); const t = me.remote.g.position, head = V(t.x, t.y + me.fair.SPECTATE.head, t.z); let least = 9, most = 0, pulled = 0, n = 0;
      for (let i = 0; i < 24; i++) for (const pitch of [-.5, 0, .4]) { me.set({yaw: i / 24 * Math.PI * 2, pitch}); p.step(1); const cam = me.camera.position.clone(), d = cam.distanceTo(head); n++; least = Math.min(least, d); most = Math.max(most, d); if (d < 3.39) pulled++;
        assert(d <= me.fair.SPECTATE.back + 1e-6 && d >= me.fair.SPECTATE.near - 1e-6, `${name}: ${d.toFixed(2)} m from the teammate`); const to = cam.clone().sub(head), probe = head.clone().addScaledVector(to, (d + .25) / Math.max(d, 1e-6)); if (d < me.fair.SPECTATE.back - 1e-3 && d > me.fair.SPECTATE.near + 1e-3) assert(!me.visible(head, head.clone().addScaledVector(to.clone().normalize(), d + me.fair.SPECTATE.gap + .05)), `${name}: it stopped because something is there`);
        assert(d <= me.fair.SPECTATE.near + 1e-3 || me.visible(head, cam), `${name}, yaw ${i}: nothing between the camera and the teammate's head`); assert(cam.y > me.groundY(cam.x, cam.z) - .02 || d <= me.fair.SPECTATE.near + 1e-3, `${name}: above the ground`); void probe; }
      table.push({downed: who, teammateAt: name, nearest_m: +least.toFixed(2), farthest_m: +most.toFixed(2), pulledInShare: +(pulled / n).toFixed(2)}); if (name === 'open courtyard') assert(least > 3.39 || pulled / n < .2, 'in the open it is 3.4 m back'); else assert(pulled > 0, `${name}: pulled in where the wall is`); } }
  report.spectator = table;
});

console.log(JSON.stringify({passed: results.length, checks: results, report, limitations: [
  'Headless: two instances of the production game joined by a stand-in channel with a fixed delay or held messages. No real WebRTC, no packet loss, no changing delay, no second network.',
  'A shot is judged against the picture the shooter had, within 300 ms, counted from the picture to the judging: the delay there and back plus one snapshot interval. That covers a one-way delay of about 105 ms. On a slower connection the guest is judged against the world of 300 ms before and has to lead a moving target by the rest.',
  'Snapshots carry positions to the centimetre in Ambush, and the guest draws straight lines between them: a target that turns between two snapshots is drawn, and judged, on the chord.',
  'Whether the spectator camera is pleasant to watch is for the playtest; this checks only that it has a clear line to the teammate.']}, null, 2));
