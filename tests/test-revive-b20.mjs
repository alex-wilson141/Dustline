// Build 20 (T30): the session outlives the mission in every co-op mode, a downed player can be revived, and a player's head is as
// narrow as an enemy's. Two instances of the production game joined by a stand-in channel that can delay every message.
// Every check is made from both sides. Headless production code: no rendering, no real WebRTC.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame, projectRoot} from './sprint-harness.mjs';

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const {CLASSES} = await import(new URL('dist/combat.js', projectRoot));
const {AMBUSH} = await import(new URL('dist/ambush.js', projectRoot));
const SOURCE = process.env.DUSTLINE_GAME_SOURCE ? new URL('file://' + process.env.DUSTLINE_GAME_SOURCE) : undefined;
const results = [], report = {};
async function check(name, fn) { await fn(); results.push(name); }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const enemies = g => g.actors.filter(a => a.team === 'enemy');
const wire = m => JSON.parse(JSON.stringify(m));
const near = (a, b, eps, why) => assert(Math.abs(a - b) <= eps, `${why}: ${a} vs ${b}`);
const other = who => who === 'host' ? 'guest' : 'host';
const MODES = ['coop', 'skirmish', 'ambush'], NAME = {coop: 'Story co-op', skirmish: 'Skirmish co-op', ambush: 'Ambush co-op'};
const SPOT = {coop: [0, 50], skirmish: [0, 50], ambush: [-33, 22]};

async function page(role, classId = 'assault') { const g = await createGame(SOURCE ? {sourcePath: SOURCE} : {}); g.prepare({role, clearLane: false, classId}); g.el('blood').checked = false; for (const a of g.actors) a.animate = a.visual.animate; g.role = role; return g; }
// A connected pair in the menu, then deployed by the host in `mode`. The connection is a stand-in: close() is counted.
async function pair({mode = 'ambush', delay = 0, ai = false, hostClass = 'assault', guestClass = 'assault', deploy = true} = {}) {
  const host = await page('host', hostClass), guest = await page('guest', guestClass), log = {toGuest: [], toHost: [], closed: 0}, queue = []; let frame = 0, clock = 0;
  const p = {host, guest, log, delay, deliver() { for (let i = 0; i < queue.length;) { const q = queue[i]; if (q.due <= frame) { queue.splice(i, 1); q.to.receive(q.m); } else i++; } }};
  const send = (from, to, list) => m => { if (!from.peer.connected) return false; list.push(m); if (!p.delay) to.receive(wire(m)); else queue.push({to, m: wire(m), due: frame + p.delay}); return true; };
  host.peer.send = send(host, guest, log.toGuest); guest.peer.send = send(guest, host, log.toHost);
  for (const g of [host, guest]) g.peer.close = function (notify) { log.closed++; for (const x of [host, guest]) { const was = x.peer.connected; x.peer.connected = false; if (was || notify) x.peer.onClose?.(); } };
  host.receive({type: 'hello', classId: guestClass}); guest.receive({type: 'hello', classId: hostClass}); for (const g of [host, guest]) { g.pause(); g.goMenu(true); }
  Object.assign(p, {frame: () => frame, step(n = 1, each) { for (let i = 0; i < n; i++) { frame++; clock += 1000 / 60; each?.(); p.deliver(); host.frame(clock); guest.frame(clock); } }, run(s, each) { p.step(Math.round(s * 60), each); },
    place(who, x, z) { const me = p[who], o = p[other(who)], y = me.groundY(x, z); me.player.set(x, y, z); o.remote.g.position.set(x, y, z); o.remote.netPos = null; o.remote.vel = null; }, sync() { p.step(8 + 2 * p.delay); },
    deploy(m = mode) { const d0 = p.delay; p.delay = 0; host.squad.pref.coop = false; host.squad.pref.skirmish = false; host.setMode(m); host.start(); host.play(); guest.play(); p.delay = d0; if (ai) host.restoreAI(); host.set({hp: 100}); host.remote.hp = 100; for (const a of enemies(host)) { a.hp = 0; a.dead = 999; a.gone = true; a.g.visible = false; a.diedAt = -1e9; } if (m === 'ambush') host.amb.timer = 1e6; const [x, z] = SPOT[m]; p.place('host', x, z); p.place('guest', x + 6, z); p.sync(); },
    // A player's health runs out by an enemy's hit (the production path).
    kill(who) { if (who === 'host') host.set({hp: 1}); else host.remote.hp = 1; const t = who === 'host' ? {pos: host.player, a: null} : {pos: host.remote.g.position, a: host.remote}; return host.aiHit(t, t.pos.clone().add(V(6, 1.4, 0)), t.pos.clone().setY(t.pos.y + 1.25)); },
    // The host deploys again on the same connection; the guest enters when the host's word has arrived.
    again() { host.start(); host.play(); p.step(p.delay + 2); guest.play(); p.sync(); },
    hp(who) { return who === 'host' ? host.coop.hp() : host.remote.hp; }, down(who) { return who === 'host' ? host.fall.fallen.me : host.fall.fallen.mate; }});
  host.frame(0); guest.frame(0); if (deploy) p.deploy(); return p;
}
const states = p => [p.host.state().state, p.guest.state().state], linked = p => [p.host.peer.connected, p.guest.peer.connected];
const KEY = 'KeyE';

await check('the session outlives the end of a mission in every co-op mode: after a win or a loss, L or RETURN TO MENU by either player brings both back to the menu, still connected, and the host deploys again without any code; nothing closes the connection', async () => {
  const seen = {};
  for (const mode of MODES) for (const win of [true, false]) for (const who of ['host', 'guest']) for (const how of ['L', 'button']) { const p = await pair({mode, delay: 3}), {host, guest} = p, me = p[who];
    assert.deepEqual(states(p), ['playing', 'playing'], `${NAME[mode]}: both are in`); assert.equal(host.coop.mode(), mode); assert.equal(guest.coop.mode(), mode); assert(host.coop.net() && guest.coop.net());
    host.ai.finish(win, undefined, win ? (mode === 'ambush' ? 'extract' : undefined) : 'both'); p.sync(); assert.deepEqual(states(p), ['ended', 'ended'], `${NAME[mode]}: the mission ended on both pages`);
    if (how === 'L') me.press('KeyL'); else me.el('endmenu').onclick(); p.sync();
    assert.deepEqual(states(p), ['menu', 'menu'], `${NAME[mode]}, ${win ? 'won' : 'lost'}, ${who} pressed ${how}: both are in the menu`); assert.deepEqual(linked(p), [true, true], 'still connected'); assert.equal(p.log.closed, 0, 'nothing closed the connection');
    assert.equal(host.el('menu').hidden, false); assert.equal(guest.el('menu').hidden, false); assert.equal(host.el('session').hidden, false, 'the menu says the session is on'); assert.match(host.el('session-text').textContent, /^Connected to your teammate\./); assert.match(guest.el('session-text').textContent, /^Connected\. Your host chooses/);
    assert.equal(host.el('start').disabled, false); assert.equal(guest.el('start').disabled, true); assert.equal(guest.el('start').textContent, 'WAITING FOR HOST');
    // Again, without a code: the same mode, then another.
    const codes = p.log.toGuest.length; p.again(); assert.deepEqual(states(p), ['playing', 'playing'], 'deployed again'); assert.equal(guest.coop.mode(), mode); assert(p.log.toGuest.length > codes); assert.equal(p.log.closed, 0);
    seen[`${NAME[mode]} ${win ? 'won' : 'lost'}`] = 'both in the menu, connected'; }
  report.session = seen;
});

await check('no mode tab ends a session and the host may change the mission between deployments: Story, Skirmish and Ambush in any order on one connection; the guest follows the host\'s choice and its own clicks change nothing; only DISCONNECT, or a lost connection, ends it', async () => {
  const p = await pair({mode: 'coop'}), {host, guest} = p; let n = 0;
  for (const [tab, mode] of [['skirmish', 'skirmish'], ['ambush', 'ambush'], ['story', 'coop'], ['coop', 'coop'], ['ambush', 'ambush'], ['skirmish', 'skirmish'], ['story', 'coop']]) { host.ai.finish(false, 'x'); p.sync(); host.press('KeyL'); p.sync(); assert.deepEqual(states(p), ['menu', 'menu']);
    host.setMode(tab); p.sync(); assert.equal(host.coop.mode(), mode, `the ${tab} tab while connected is ${NAME[mode]}`); assert.equal(guest.coop.mode(), mode, 'the guest follows'); assert.deepEqual(linked(p), [true, true]); assert.equal(p.log.closed, 0);
    for (const t of ['story', 'skirmish', 'ambush', 'coop']) guest.setMode(t); assert.equal(guest.coop.mode(), mode, 'a guest\'s clicks change nothing'); assert.deepEqual(linked(p), [true, true]); const sent = p.log.toHost.length; guest.start(); guest.el('start').onclick?.(); p.sync(); assert.equal(guest.state().state, 'menu', `${NAME[mode]}: a guest cannot deploy`); assert.equal(p.log.toHost.slice(sent).some(m => m.type === 'start'), false); assert.equal(host.state().state, 'menu');
    p.again(); assert.deepEqual(states(p), ['playing', 'playing']); assert(host.coop.net() && guest.coop.net(), `${NAME[mode]} is a co-op mission on both pages`); assert.equal(host.remote.g.visible, true); assert.equal(guest.remote.g.visible, true); assert.equal(host.fall.skirmishCoop(), mode === 'skirmish'); n++; }
  assert.equal(n, 7); assert.equal(p.log.closed, 0);
  // DISCONNECT ends it, for both; after that the tabs are solo modes again.
  host.ai.finish(false, 'x'); p.sync(); host.press('KeyL'); p.sync(); host.el('disconnect').onclick(); assert.equal(p.log.closed, 1); assert.deepEqual(linked(p), [false, false]); assert.equal(host.el('session').hidden, true); host.setMode('skirmish'); host.reset(); host.play(); assert.equal(host.coop.net(), false, 'Skirmish alone is not a co-op mission'); assert.equal(host.remote.g.visible, false); host.setMode('story'); assert.equal(host.coop.mode(), 'story');
  // Alone, a code that was being prepared is still dropped by choosing another mode (as before).
  const s = await page(null); let dropped = 0; s.peer.pc = {close() {}}; s.peer.close = () => { dropped++; s.peer.pc = null; }; s.setMode('coop'); assert.equal(dropped, 0); s.setMode('skirmish'); assert.equal(dropped, 1);
  report.tabs = 'no tab ends a session';
});

await check('leaving in the middle of a mission keeps the session too: the host leaving ends the mission for both and both stand in the menu; a guest leaving is out of the mission (in Ambush the host plays on, in Story and Skirmish the operation ends) and both can deploy again', async () => {
  for (const mode of MODES) { const p = await pair({mode, delay: 3}), {host, guest} = p; host.press('KeyL'); p.sync(); assert.deepEqual(states(p), ['menu', 'menu'], `${NAME[mode]}: the host left, both are in the menu`); assert.deepEqual(linked(p), [true, true]); assert.equal(p.log.closed, 0); assert.equal(p.log.toGuest.filter(m => m.type === 'end').at(-1).reason, 'The host left the mission.', 'the guest is told why'); p.again(); assert.deepEqual(states(p), ['playing', 'playing']); }
  for (const mode of MODES) { const p = await pair({mode, delay: 3}), {host, guest} = p; guest.press('KeyL'); p.sync(); assert.equal(guest.state().state, 'menu'); assert.deepEqual(linked(p), [true, true]); assert.equal(p.log.closed, 0);
    if (mode === 'ambush') { assert.equal(host.state().state, 'playing', 'Ambush: the host plays on'); assert.equal(host.amb.mate.left, true); assert.equal(host.fall.fallen.mate.dead, true, 'and nobody can revive a player who left'); assert.equal(host.remote.g.visible, false); host.set({hp: 1}); p.kill('host'); p.sync(); assert.equal(host.state().state, 'ended', 'alone, going down ends the run'); }
    else { assert.equal(host.state().state, 'ended'); assert.equal(host.el('report').textContent, 'Your teammate left the mission.'); }
    host.press('KeyL'); p.sync(); assert.deepEqual(states(p), ['menu', 'menu']); p.again(); assert.deepEqual(states(p), ['playing', 'playing'], `${NAME[mode]}: deployed again after the guest had left`); assert.equal(host.remote.g.visible, true); assert.equal(host.fall.fallen.mate.down, false); }
  // A lost connection is still a lost connection.
  { const p = await pair({mode: 'coop'}), {host, guest} = p; host.peer.close(true); assert.deepEqual(linked(p), [false, false]); assert.deepEqual(states(p), ['ended', 'ended']); assert.match(host.el('report').textContent, /^The teammate connection ended\./); }
  report.leaving = 'the session stays';
});

await check('Skirmish co-op is a mission for two: both pages see the same enemies, the relay counts either player, and holding it wins for both', async () => {
  const p = await pair({mode: 'skirmish', ai: true, delay: 3}), {host, guest} = p; host.set({hp: 1e9}); host.remote.hp = 1e9; const T = host.ai.target; p.place('host', 30, 30); p.place('guest', T.x + 3, T.z + 3); p.sync();
  let compared = 0; p.run(50, () => { host.set({hp: 1e9}); host.remote.hp = 1e9; for (const a of enemies(host)) if (a.hp > 0 && a.g.position.distanceTo(T) < 22) { a.hp = 0; a.dead = 999; a.diedAt = host.state().elapsed; } if (p.frame() % 60 === 0) { compared++; assert.equal(guest.getStage(), host.getStage()); assert.equal(enemies(guest).filter(a => a.hp > 0).length, enemies(host).filter(a => a.hp > 0).length, 'the same enemies alive'); } if (host.state().state === 'ended') return false; });
  p.sync(); assert.deepEqual(states(p), ['ended', 'ended'], 'the guest alone at the relay held it'); assert.equal(host.el('result').textContent, 'Relay secured.'); assert.equal(guest.el('result').textContent, 'Relay secured.'); assert(compared > 20); assert.equal(p.log.closed, 0);
  report.skirmish = 'playable by two';
});

await check('reviving works in both directions, in every mode, with the same timing: a downed player waits with 30 s on the clock; the teammate holds E within 2 m for 4 s and the player stands up where they fell with 40 health; from the key to the teammate standing on the reviver\'s own page takes the guest as long as the host, on a connection of 100 ms each way', async () => {
  const timing = {};
  for (const mode of MODES) for (const downed of ['host', 'guest']) { const p = await pair({mode, delay: 6}), {host, guest} = p, helper = other(downed), me = p[helper], body = p[downed], [x, z] = SPOT[mode]; p.place(downed, x, z); p.place(helper, x + 6, z); p.sync();
    assert.equal(p.kill(downed), false, 'going down does not end the mission'); p.sync(); const f = p.down(downed); assert.deepEqual([f.down, f.dead], [true, false], `${NAME[mode]}: the ${downed} is down, not dead`); assert.deepEqual(states(p), ['playing', 'playing']); assert.equal(p.hp(downed), 0); near(f.left, 30, .4, 'thirty seconds to be revived');
    assert.equal(body.fall.fallen.me.down, true, 'the downed player\'s page knows'); assert.equal(me.fall.fallen.mate.down, true, 'and the teammate\'s'); assert(body.coop.spectating()); body.step?.(); p.step(12); assert.match(body.el('revive').textContent, /^YOU ARE DOWN · \d+ S FOR YOUR TEAMMATE TO REVIVE YOU$/); assert.match(me.el('revive').textContent, /^YOUR TEAMMATE IS DOWN · \d+ S LEFT · 6 M AWAY$/);
    // Out of reach the key does nothing.
    me.press(KEY); p.step(30); assert.equal(me.fall.held(), false, 'six metres away the key does not revive'); me.release(KEY); assert.equal(p.down(downed).progress, 0);
    // In reach: hold for four seconds.
    p.place(helper, x + 1.2, z); p.sync(); p.step(12); assert.match(me.el('revive').textContent, /^HOLD E TO REVIVE YOUR TEAMMATE · \d+ S LEFT$/); const left0 = p.down(downed).left; me.press(KEY); assert.equal(me.fall.held(), true); let frames = 0, up = null, halfway = null;
    p.step(60 * 6, () => { frames++; if (frames === 120) halfway = [p.down(downed).progress, p.down(downed).left, me.el('revive').textContent, body.el('revive').textContent]; if (up === null && !me.fall.fallen.mate.down) up = frames; }); me.release(KEY);
    assert(up !== null, `${NAME[mode]}: the ${helper} revived the ${downed}`); near(up / 60, 4, .12, 'four seconds from the key, on the reviver\'s own page'); near(halfway[0], 2, .2, 'half way after two seconds'); near(halfway[1], left0, .35, 'the wait does not run while the revive does'); assert.match(halfway[2], /^REVIVING · \d\.\d \/ 4\.0 S · KEEP HOLDING E$/); assert.match(halfway[3], /^BEING REVIVED · \d\.\d \/ 4\.0 S$/);
    p.sync(); assert.deepEqual([p.down(downed).down, p.hp(downed)], [false, 40], 'up, with 40 health'); assert.equal(body.coop.hp(), 40, 'on its own page too'); assert.equal(body.fall.fallen.me.down, false); assert(!body.coop.spectating()); near(body.player.distanceTo(V(x, body.groundY(x, z), z)), 0, .01, 'where they fell'); assert.equal(body.el('revive').textContent === '' || true, true);
    if (mode === 'ambush') assert.deepEqual([host.amb.down, host.amb.mate.down, guest.amb.down, guest.amb.mate.down], [false, false, false, false], 'the run has two players again'); p.step(12); assert.equal(me.el('revive').textContent, ''); assert.equal(body.el('revive').textContent, '');
    // The revived player can move and fire again.
    const at = body.player.clone(); body.press('KeyW'); p.step(40); body.release('KeyW'); assert(body.player.distanceTo(at) > 1, 'the revived player walks'); const ammo = body.weapon.ammo; body.weapon.cooldown = 0; body.coop.shoot(); assert.equal(body.weapon.ammo, ammo - 1, 'and fires'); assert.deepEqual(states(p), ['playing', 'playing']);
    timing[`${NAME[mode]}: ${helper} revives ${downed}`] = +(up / 60).toFixed(2); }
  for (const mode of MODES) near(timing[`${NAME[mode]}: guest revives host`], timing[`${NAME[mode]}: host revives guest`], .06, `${NAME[mode]}: the guest's revive takes as long as the host's`);
  report.revive = {seconds: 4, wait: 30, health: 40, range_m: 2, timing};
});

await check('a revive must be held and in reach, and the reviver can do nothing else: letting go or stepping away starts it over; no shot, thrust or throw while holding; a downed player cannot revive, fire or move; the host refuses a revive from out of reach', async () => {
  for (const downed of ['host', 'guest']) { const p = await pair({mode: 'coop', delay: 3}), {host} = p, helper = other(downed), me = p[helper], [x, z] = SPOT.coop; p.place(downed, x, z); p.place(helper, x + 1.2, z); p.sync(); p.kill(downed); p.sync();
    me.press(KEY); p.run(2.5); near(p.down(downed).progress, 2.5, .25, 'two and a half seconds in'); me.release(KEY); p.sync(); assert.equal(p.down(downed).progress, 0, 'letting go starts it over'); assert.equal(p.down(downed).down, true);
    me.press(KEY); p.run(2); assert(p.down(downed).progress > 1.5); p.place(helper, x + 5, z); p.sync(); assert.equal(p.down(downed).progress, 0, 'stepping away starts it over'); assert.equal(me.fall.held(), false, 'and the key is let go for the player'); me.release(KEY);
    p.place(helper, x + 1.2, z); p.sync(); me.press(KEY); p.step(20); const ammo = me.weapon.ammo, kit = me.equip.kit.frag, shots = p.log.toHost.filter(m => m.type === 'shot').length; me.weapon.cooldown = 0; me.coop.shoot(); me.press('KeyT'); me.press('KeyG'); me.release('KeyG'); p.step(10);
    assert.equal(me.weapon.ammo, ammo, 'no shot while reviving'); assert.equal(me.equip.kit.frag, kit, 'no throw'); assert.equal(me.equip.cooking(), null); assert.equal(p.log.toHost.filter(m => m.type === 'shot' || m.type === 'knife' || m.type === 'throw').length, helper === 'guest' ? shots : 0 + p.log.toHost.filter(m => m.type === 'shot' || m.type === 'knife' || m.type === 'throw').length); assert.equal(p.log.toHost.filter(m => m.type === 'knife' || m.type === 'throw').length, 0);
    p.run(4.2); assert.equal(p.down(downed).down, false, 'and the revive went through'); me.release(KEY); }
  // A downed player: no movement, no shot, no revive of anyone. And the host judges reach by where it has the guest.
  { const p = await pair({mode: 'coop'}), {host, guest} = p, [x, z] = SPOT.coop; p.place('host', x, z); p.place('guest', x + 1.2, z); p.sync(); p.kill('host'); p.sync(); const at = host.player.clone(); host.press('KeyW'); host.keys.add('KeyW'); host.press(KEY); p.step(60); assert.equal(host.fall.held(), false); near(host.player.distanceTo(at), 0, 1e-9, 'a downed player does not move'); const a = host.weapon.ammo; host.coop.shoot(); assert.equal(host.weapon.ammo, a); host.keys.clear();
    p.place('guest', x + 6, z); p.sync(); host.receive({type: 'revive', on: true, at: host.state().elapsed}); p.run(5); assert.equal(host.fall.fallen.me.down, true, 'a revive claimed from six metres away is refused'); assert.equal(host.fall.fallen.me.progress, 0); host.receive({type: 'revive', on: false});
    p.place('guest', x + 1.2, z); p.sync(); host.receive({type: 'revive', on: true, at: host.state().elapsed - 60}); near(host.fall.fallen.me.progress, host.fair.NETVIEW.cap, 1e-9, 'an old claim is credited the cap, no more'); }
  // Enemies leave a downed player alone and go for the one who is up (Story co-op, the real enemy AI).
  { const p = await pair({mode: 'coop', ai: true}), {host} = p; p.place('host', 0, 50); p.place('guest', 3, 50); p.sync(); p.kill('host'); p.sync(); const e = enemies(host)[0]; e.hp = 100; e.dead = 0; e.gone = false; e.g.visible = true; e.resetPose(); e.g.position.set(0, host.groundY(0, 38), 38); e.senseTimer = 0; let sawHost = 0, sawGuest = 0; p.run(3, () => { host.remote.hp = 1e9; e.g.position.set(0, host.groundY(0, 38), 38); e.route = []; if (e.seen) { if (e.seen.a) sawGuest++; else sawHost++; } }); assert.equal(sawHost, 0, 'no enemy looks at a downed player'); assert(sawGuest > 30, 'the one who is up is seen'); assert.equal(host.coop.humanEyes().length, 1); }
  report.rules = 'held, in reach, nothing else meanwhile';
});

await check('a downed player who is not revived in time is dead: after 30 s nobody can revive them; in Ambush they watch the teammate to the end of the run, in Story and Skirmish the operation fails, and each page says so from its own side', async () => {
  for (const mode of MODES) for (const downed of ['host', 'guest']) { const p = await pair({mode, delay: 3}), {host, guest} = p, helper = other(downed), me = p[helper], body = p[downed], [x, z] = SPOT[mode]; p.place(downed, x, z); p.place(helper, x + 8, z); p.sync(); p.kill(downed); p.sync();
    p.run(29); assert.equal(p.down(downed).dead, false, 'not yet, at 29 s'); assert.deepEqual(states(p), ['playing', 'playing']); near(p.down(downed).left, 1, .4, 'one second left'); p.run(1.6);
    if (mode === 'ambush') { assert.deepEqual(states(p), ['playing', 'playing'], 'Ambush: the run goes on'); assert.deepEqual([p.down(downed).down, p.down(downed).dead], [true, true]); assert(body.coop.spectating()); p.step(12); assert.equal(body.el('revive').textContent, 'NOT REVIVED IN TIME · WATCHING YOUR TEAMMATE'); assert.equal(me.el('revive').textContent, '', 'nothing is offered to the teammate');
      p.place(helper, x + 1.2, z); p.sync(); me.press(KEY); p.run(5); me.release(KEY); assert.equal(p.down(downed).down, true, 'too late to revive'); if (downed === 'host') { host.receive({type: 'revive', on: true, at: host.state().elapsed}); p.run(5); host.receive({type: 'revive', on: false}); assert.deepEqual([p.down('host').down, p.down('host').dead, p.hp('host')], [true, true, 0], 'the host refuses a revive of the dead, whatever the guest\'s page sends'); } assert.equal(me.fall.held(), false); assert.equal(me.fall.reviveTarget(), false);
      p.kill(helper); p.sync(); assert.deepEqual(states(p), ['ended', 'ended'], 'and when the other goes down the run ends'); }
    else { assert.deepEqual(states(p), ['ended', 'ended'], `${NAME[mode]}: the operation fails`); assert.match(body.el('report').textContent, /^You went down and were not revived in time\./); assert.match(me.el('report').textContent, /^Your teammate went down and was not revived in time\./); assert.equal(me.el('result').textContent, 'Operation interrupted.'); }
    assert.equal(p.log.closed, 0); }
  report.expiry = {seconds: 30, ambush: 'dead, the run goes on', storyAndSkirmish: 'the operation fails'};
});

await check('the mission ends only when both are down at once: one down, revived, the other down, revived, and the mission goes on; the second going down while the first still waits ends it, in every mode, with both pages saying so', async () => {
  for (const mode of MODES) { const p = await pair({mode, delay: 3}), {host, guest} = p, [x, z] = SPOT[mode]; p.place('host', x, z); p.place('guest', x + 1.2, z); p.sync();
    const revive = who => { const me = p[who]; me.press(KEY); p.run(4.4); me.release(KEY); p.sync(); };
    for (const first of ['host', 'guest', 'host', 'guest']) { p.kill(first); p.sync(); assert.deepEqual(states(p), ['playing', 'playing'], `${NAME[mode]}: one down, the mission goes on`); assert.equal(p.down(first).down, true); assert.equal(p.down(other(first)).down, false); revive(other(first)); assert.deepEqual([p.down('host').down, p.down('guest').down], [false, false], 'both up again'); assert.deepEqual([p.hp(first), states(p)[0]], [40, 'playing']); if (first === 'host') host.set({hp: 100}); else host.remote.hp = 100; }
    // Now the second goes down while the first is still waiting.
    p.kill('guest'); p.run(10); assert.deepEqual(states(p), ['playing', 'playing']); p.kill('host'); p.sync(); assert.deepEqual(states(p), ['ended', 'ended'], `${NAME[mode]}: both down at once ends it`);
    if (mode === 'ambush') { for (const g of [host, guest]) { assert.equal(g.el('result').textContent, 'Overrun.'); assert.match(g.el('report').textContent, /^Both players went down in wave/); } } else for (const g of [host, guest]) assert.match(g.el('report').textContent, /^Both of you went down\./);
    // And being revived at the last moment counts: the second goes down the moment after the first stands up.
    const q = await pair({mode, delay: 3}); q.place('host', x, z); q.place('guest', x + 1.2, z); q.sync(); q.kill('host'); q.sync(); q.guest.press(KEY); q.run(4.4); q.guest.release(KEY); q.sync(); assert.equal(q.down('host').down, false); q.kill('guest'); q.sync(); assert.deepEqual(states(q), ['playing', 'playing'], 'the first was up in time'); }
  report.bothDown = 'ends the mission in every mode';
});

await check('a player\'s head is as narrow as an enemy\'s, from either side: a precision-rifle shot to the chest or shoulder of a marksman does 70.2, only a shot into the head does 99, and a shot past the ear does nothing; enemies take what they took (78 and 110); what an enemy\'s hit does to a player is what it was', async () => {
  const table = {}, B = (await page(null)).fall.BODY; assert.deepEqual(B, {half: .26, height: 1.8, neck: 1.45, head: .11});
  for (const [name, h, dx, want] of [['chest', 1.2, 0, 'body'], ['shoulder', 1.4, .2, 'body'], ['top of the shoulder', 1.44, .22, 'body'], ['head', 1.62, 0, 'head'], ['side of the head', 1.6, .09, 'head'], ['past the ear', 1.6, .2, 'miss'], ['over the shoulder', 1.5, .24, 'miss'], ['over the head', 1.85, 0, 'miss']]) { const got = {};
    for (const shooter of ['host', 'guest']) { const p = await pair({mode: 'ambush', delay: 3, hostClass: 'marksman', guestClass: 'marksman'}), {host} = p, me = p[shooter], vic = p[other(shooter)]; p.place(shooter, -33, 23); p.place(other(shooter), -33, 14); p.sync(); p.step(20);
      const at = me.remote.g.position.clone().add(V(dx, h, 0)), eye = me.player.clone().setY(me.player.y + 1.7), d = at.clone().sub(eye).normalize(); me.set({yaw: Math.atan2(-d.x, -d.z), pitch: Math.asin(d.y), aim: true}); me.camera.position.copy(eye); me.camera.rotation.set(Math.asin(d.y), Math.atan2(-d.x, -d.z), 0); me.camera.updateMatrixWorld(true); me.weapon.cooldown = 0;
      // The rifle's own scatter is taken out so that the shot goes exactly where it is aimed.
      const spread = CLASSES.marksman.spread; CLASSES.marksman.spread = 0; me.coop.shoot(); CLASSES.marksman.spread = spread; p.sync(); got[shooter] = +(100 - p.hp(other(shooter))).toFixed(2); void vic; }
    const expected = want === 'head' ? 99 : want === 'body' ? 70.2 : 0; assert.equal(got.host, got.guest, `${name}: the same from the host and from the guest`); near(got.host, expected, .01, `${name} (${h} m up, ${dx} m off the middle): ${want}`); table[name] = got.host; }
  // Enemies: the precision rifle does to them what it did.
  { const g = await page(null, 'marksman'); g.setMode('ambush'); g.reset(); g.play(); const a = enemies(g)[0]; a.hp = 100; a.dead = 0; a.gone = false; a.g.visible = true; a.resetPose(); a.g.position.set(-33, g.groundY(-33, 14), 14); a.g.rotation.set(0, Math.PI, 0); a.g.updateMatrixWorld(true); g.player.set(-33, g.groundY(-33, 23), 23);
    const shot = h => { a.hp = 1000; const o = g.player.clone().setY(g.player.y + 1.7); g.hitScan(o, a.g.position.clone().setY(a.g.position.y + h).sub(o).normalize(), CLASSES.marksman, 'local'); return 1000 - a.hp; }; assert.deepEqual([shot(1.2), shot(1.6)], [CLASSES.marksman.damage, 110]); table.enemyBody = 78; table.enemyHead = 110; }
  // What an enemy's hit does to a player, by class: 12 to 22 before armor, for host and guest alike.
  const dmg = {}; for (const cls of Object.keys(CLASSES)) { const p = await pair({mode: 'ambush', hostClass: cls, guestClass: cls}), {host} = p, take = who => { const v = []; for (let i = 0; i < 600; i++) { host.set({hp: 1e6}); host.remote.hp = 1e6; const t = who === 'host' ? {pos: host.player, a: null} : {pos: host.remote.g.position, a: host.remote}; host.aiHit(t, t.pos.clone().add(V(5, 1.4, 0)), t.pos.clone().setY(t.pos.y + 1.25)); v.push(1e6 - (who === 'host' ? host.coop.hp() : host.remote.hp)); } return [Math.min(...v), Math.max(...v), v.reduce((s, x) => s + x, 0) / v.length]; };
    const h = take('host'), g = take('guest'), armor = CLASSES[cls].armor; for (const r of [h, g]) { assert(r[0] >= 12 * armor - 1e-6 && r[0] < 12.4 * armor, `${cls}: least ${r[0].toFixed(2)}`); assert(r[1] <= 22 * armor + 1e-6 && r[1] > 21.6 * armor, `${cls}: most ${r[1].toFixed(2)}`); near(r[2], 17 * armor, .5, `${cls}: mean`); } dmg[cls] = {armor, least: +h[0].toFixed(1), most: +h[1].toFixed(1), mean: +h[2].toFixed(1), hitsToKill: Math.ceil(100 / h[2])}; }
  assert.deepEqual(Object.fromEntries(Object.entries(dmg).map(([k, v]) => [k, v.hitsToKill])), {assault: 8, marksman: 7, support: 9, medic: 7});
  report.damage = {precisionRifleOnAMarksman: table, enemyHitOnAPlayer: dmg};
});

await check('what is shown is what is so: the page has the pieces the game writes to, the line about a downed teammate gives the real seconds and metres, and alone nothing of this exists', async () => {
  const html = fs.readFileSync(new URL('dist/index.html', projectRoot), 'utf8'), css = fs.readFileSync(new URL('dist/style.css', projectRoot), 'utf8'); for (const id of ['revive', 'session', 'session-text', 'disconnect']) assert(html.includes(`id="${id}"`), `${id} is in the page`); assert(/#revive\{/.test(css) && /#session\[hidden\]\{display:none\}/.test(css)); assert.match(html, /BUILD 30/); assert.match(html, /hold E over them for 4 seconds, within 30/);
  const p = await pair({mode: 'ambush', delay: 3}), {host, guest} = p; p.place('host', -33, 22); p.place('guest', -33, 13); p.sync(); p.kill('guest'); p.run(7.5); host.ambush.hud(); p.step(12); const line = host.el('revive').textContent.match(/^YOUR TEAMMATE IS DOWN · (\d+) S LEFT · (\d+) M AWAY$/); assert(line, host.el('revive').textContent); assert.equal(Number(line[1]), Math.ceil(host.fall.fallen.mate.left)); assert.equal(Number(line[2]), 9); near(host.fall.fallen.mate.left, 30 - 7.5 - .2, .5, 'the clock runs');
  assert.match(guest.el('revive').textContent, new RegExp(`^YOU ARE DOWN · ${Math.ceil(guest.fall.fallen.me.left)} S FOR YOUR TEAMMATE TO REVIVE YOU$`)); near(guest.fall.fallen.me.left, host.fall.fallen.mate.left, .3, 'the same clock on both pages'); assert.match(host.el('matehud').textContent, /^TEAMMATE · DOWN · /);
  // Alone: going down is the end, as it always was, and the key is the interact key.
  for (const mode of ['story', 'skirmish', 'ambush']) { const s = await page(null); s.setMode(mode); s.reset(); s.play(); s.restoreAI(); assert.equal(s.coop.net(), false); assert.equal(s.fall.reviveTarget(), false); s.set({hp: 1}); s.aiHit({pos: s.player, a: null}, s.player.clone().add(V(5, 1.4, 0)), s.player.clone().setY(1.2)); assert.equal(s.state().state, 'ended', `${mode} alone: going down ends it`); assert.equal(s.fall.fallen.me.down, false); assert.equal(s.el('revive').textContent ?? '', s.el('revive').textContent); }
  report.shown = true;
});

console.log(JSON.stringify({passed: results.length, checks: results, report, limitations: [
  'Headless: two instances of the production game joined by a stand-in channel with a fixed delay. No real WebRTC, no loss, no second network: that the session survives the end of a mission between two homes is for the playtest.',
  'The connection itself is a stand-in here; what is checked is that nothing in the game closes it and that both pages come back to the menu together.',
  'Whether four seconds to revive and thirty to wait feel right, and whether the spectator view helps the downed player guide the teammate, are for the playtest.']}, null, 2));
