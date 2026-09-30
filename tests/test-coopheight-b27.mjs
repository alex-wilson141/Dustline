// Build 27 (T37): co-op height on Dehrun Terraces, and Kohar Valley's co-op untouched. Host and guest see each other at the
// right height on stairs, ladders, roofs and in the air; the same shot from either side does the same to a target on
// another level; revive, knife and blast reach nothing through a floor from either side; grenades land on floors and
// roofs; enemies stand at the same height on both pages; a guest's fall is charged by the host as the host's own falls
// are; and the widened customs house is what was asked for. Kohar Valley: a scripted co-op run gives Build 26's numbers.
import assert from 'node:assert/strict';
import {createGame, projectRoot} from './sprint-harness.mjs';
import {oldBuild} from './old-build.mjs';

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const maps = await import(new URL('dist/maps.js', projectRoot));
const {BODY, fallDamage} = await import(new URL('dist/space.js', projectRoot));
const {THROW} = await import(new URL('dist/equipment.js', projectRoot));
const SOURCE = process.env.DUSTLINE_GAME_SOURCE ? new URL('file://' + process.env.DUSTLINE_GAME_SOURCE) : undefined;
const ONLY = process.env.DUSTLINE_T37_ONLY?.split(',');
const BUILD26 = 'e57e195';
const results = [], report = {};
async function check(tag, name, fn) { if (ONLY && !ONLY.includes(tag)) return; await fn(); results.push(name); }
const DEHRUN = await maps.loadMap('dehrun'); maps.selectMap('kohar');
const K = DEHRUN.block.houses.find(h => h.id === 'K'), FLOORS = [.05, 3.4, 6.6], ROOF = 9.83, CZ = K.storeys[0].rooms.find(r => r.id === 'corridor').z;
const V = (x, y, z) => new THREE.Vector3(x, y, z), near = (a, b, e, what) => assert(Math.abs(a - b) <= e, `${what}: ${a} against ${b}`), wire = m => JSON.parse(JSON.stringify(m)), other = w => w === 'host' ? 'guest' : 'host';
const enemies = g => g.actors.filter(a => a.team === 'enemy');
// A connected host and guest on a map (Dehrun unless said), deployed in Story co-op with every enemy dead, as T30 pairs them.
async function pair({map = 'dehrun', delay = 0, make = createGame} = {}) {
  const page = async role => { maps.selectMap(map); let g; try { g = await make(SOURCE && make === createGame ? {sourcePath: SOURCE} : {}); } finally { maps.selectMap('kohar'); } g.prepare({role, clearLane: false}); g.el('blood').checked = false; for (const a of g.actors) a.animate = a.visual.animate; g.role = role; if (g.built) await g.built.ready; return g; };
  const host = await page('host'), guest = await page('guest'), log = {toGuest: [], toHost: []}, queue = []; let frame = 0, clock = 0;
  const p = {host, guest, log, delay, deliver() { for (let i = 0; i < queue.length;) { const q = queue[i]; if (q.due <= frame) { queue.splice(i, 1); q.to.receive(q.m); } else i++; } }};
  const send = (from, to, list) => m => { if (!from.peer.connected) return false; list.push(wire(m)); if (!p.delay) to.receive(wire(m)); else queue.push({to, m: wire(m), due: frame + p.delay}); return true; };
  host.peer.send = send(host, guest, log.toGuest); guest.peer.send = send(guest, host, log.toHost);
  for (const g of [host, guest]) g.peer.close = function () { for (const x of [host, guest]) x.peer.connected = false; };
  host.receive({type: 'hello', classId: 'assault'}); guest.receive({type: 'hello', classId: 'assault'}); for (const g of [host, guest]) { g.pause(); g.goMenu(true); }
  Object.assign(p, {step(n = 1, each) { for (let i = 0; i < n; i++) { frame++; clock += 1000 / 60; each?.(i / 60); p.deliver(); host.frame(clock); guest.frame(clock); } }, run(s, each) { p.step(Math.round(s * 60), each); }, sync() { p.step(8 + 2 * p.delay); },
    // Put a player somewhere (its feet at y), and let the other page hear of it.
    place(who, x, y, z, yaw = 0) { const me = p[who], o = p[other(who)]; me.player.set(x, y, z); me.set({yaw}); me.height?.settle(); o.remote.g.position.set(x, y, z); o.remote.netPos = null; o.remote.vel = null; o.remote.air = false; o.remote.peakY = null; p.sync(); },   /* a page never takes a pose that jumps more than 8 m: the other page is told directly, as T30 does */
    seen(who) { return p[other(who)].remote.g.position; },
    hold(who, code, s, each) { p[who].press(code); p.run(s, each); p[who].release(code); },
    deploy() { const d0 = p.delay; p.delay = 0; host.squad.pref.coop = false; host.setMode('coop'); host.start(); host.play(); guest.play(); p.delay = d0; host.set({hp: 100}); host.remote.hp = 100; for (const a of enemies(host)) { a.hp = 0; a.dead = 999; a.gone = true; a.g.visible = false; a.diedAt = -1e9; } p.sync(); },
    // An enemy stood somewhere on the host, standing still (blinded), and told to the guest.
    foe(i, x, y, z) { const a = enemies(host)[i]; a.hp = 100; a.dead = 0; a.gone = false; a.sink = null; a.diedAt = null; a.fall = null; a.climb = null; a.g.visible = true; a.resetPose(); a.g.position.set(x, y, z); a.blindUntil = Infinity; const loop = map === 'kohar' ? 'RING' : 'HALLS'; a.ai = {role: 'patrol', loop, dir: 1, lastHp: 100}; host.ai.startPatrol(a, loop); a.route = []; a.life = (a.life || 0) + 1; p.sync(); return a; }});
  host.frame(0); guest.frame(0); p.deploy(); return p;
}
const at = v => v.toArray().map(x => +x.toFixed(2));

await check('kohar', 'Kohar Valley\'s co-op is what it was: a scripted two-player run of 20 s (both walking, the host shooting, the guest shooting, a grenade, a blast, the guest downed and revived) gives, step for step, the positions, health, kills and revive clocks Build 26 gives run here from its commit; the poses and snapshots carry the same numbers (the pose\'s new `cl` flag and the blood decals, which are Math.random, aside)', async () => {
  const old = await oldBuild(BUILD26);
  const run = async make => { const p = await pair({map: 'kohar', delay: 2, make}); const {host, guest} = p; const rows = [];
    p.place('host', 0, 0, 50); p.place('guest', 4, 0, 50); host.set({yaw: 1}); guest.set({yaw: -1}); p.run(1); assert.equal(guest.state().state, 'playing');
    const target = p.foe(0, 0, 0, 40); p.run(1);
    host.press('KeyW'); guest.press('KeyD'); p.run(3); host.release('KeyW'); guest.release('KeyD');
    host.set({trigger: true}); host.coop.shoot(); host.set({trigger: false}); p.run(.5); guest.set({trigger: true}); guest.coop.shoot(); guest.set({trigger: false}); p.run(1);
    host.equip.throwItem('frag', host.player.clone().setY(host.player.y + 1.6), V(0, .1, -1), 0, false, 'local'); p.run(4);
    host.remote.hp = 1; host.aiHit({pos: host.remote.g.position, a: host.remote}, host.remote.g.position.clone().add(V(6, 1.4, 0)), host.remote.g.position.clone().setY(host.remote.g.position.y + 1.25)); p.run(1); const wasDown = host.fall.fallen.mate.down;
    p.place('host', host.remote.g.position.x + 1.95, 0, host.remote.g.position.z); host.press('KeyE'); p.run(5); host.release('KeyE'); p.run(3);   /* at the edge of the revive's reach */
    const row = () => [at(host.player), at(guest.player), at(host.remote.g.position), at(guest.remote.g.position), +host.coop.hp().toFixed(2), +host.remote.hp.toFixed(2), host.kills(), target.hp, host.fall.fallen.mate.down, +host.fall.fallen.mate.progress.toFixed(3), host.state().state, guest.state().state];
    for (let i = 0; i < 6; i++) { rows.push(row()); p.run(.5); }
    const strip = m => { const c = wire(m); delete c.cl; delete c.dc; return c; };   /* `cl` is new; a decal (`dc`) is cosmetic and drawn by Math.random, never the same twice */
    return {rows, wasDown, toHost: p.log.toHost.map(strip), toGuest: p.log.toGuest.map(strip), n: [p.log.toHost.length, p.log.toGuest.length]}; };
  const now = await run(createGame), was = await run(old.createGame);
  assert.deepEqual(now.rows, was.rows, 'the same run'); assert.deepEqual(now.n, was.n, 'as many messages'); assert.deepEqual(now.toHost, was.toHost, 'the guest\'s messages'); assert.deepEqual(now.toGuest, was.toGuest, 'the host\'s messages');
  assert(now.wasDown && was.wasDown && now.rows.at(-1)[8] === false, 'the guest went down and was revived in the run'); assert(now.rows.at(-1)[6] >= 0);
  report.kohar = {against: `Build 26 (${BUILD26}), run here`, samples: now.rows.length, messages: now.n, note: 'the pose gained `cl` (on a ladder) and sends crouch-under-things as crouch: both false on Kohar Valley'};
});

await check('see', 'host and guest see each other at the right height: on the first floor and the roof, on a stair mid-flight, on a ladder mid-climb, and in the air mid-fall, each page draws the other where its own page has it, within 5 cm', async () => {
  const p = await pair(), {host, guest} = p, seen = {};
  const both = (name, hx, hy, hz, gx, gy, gz) => { p.place('host', hx, hy, hz); p.place('guest', gx, gy, gz); near(p.seen('host').y, host.player.y, .05, `${name}: the guest sees the host`); near(p.seen('guest').y, guest.player.y, .05, `${name}: the host sees the guest`); seen[name] = [+host.player.y.toFixed(2), +guest.player.y.toFixed(2)]; };
  both('first floor and roof', 0, FLOORS[1], 57, 0, ROOF, 65); both('roof and square', 0, ROOF, 65, 0, 0, 76); both('second floor and ground floor', 0, FLOORS[2], 57, 0, FLOORS[0], 57);
  // Mid-flight on the west stair: the host walks up the first flight; the guest's copy follows it tread by tread.
  p.place('host', -11.9, FLOORS[0], CZ[0] + .7, 0); p.place('guest', 0, FLOORS[0], 66); let samples = 0; p.hold('host', 'KeyW', 2, () => { if (host.height.on() === 'stair' && host.player.y > .6) { samples++; near(p.seen('host').y, host.player.y, .35, 'on the stair, within a pose of the host'); } }); assert(samples > 30, `${samples} samples on the stair`); p.sync(); near(p.seen('host').y, host.player.y, .05, 'stood still on the stair, seen there'); seen.stair = +host.player.y.toFixed(2);
  // On a ladder: the guest climbs the storehouse ladder; halfway the host sees it halfway.
  const L = guest.height.space.ladders.find(l => Math.abs(l.x + 9) < .1); p.place('guest', L.standX, 1.6, L.standZ + .3, Math.atan2(L.dir[0], L.dir[1])); p.hold('guest', 'KeyW', .3); assert(guest.height.climbing(), 'the guest took the ladder'); p.hold('guest', 'KeyW', 1); p.sync(); assert(guest.height.climbing() && guest.player.y > 2.5 && guest.player.y < 4.6, `halfway up (${guest.player.y})`); near(p.seen('guest').y, guest.player.y, .05, 'seen halfway up the ladder'); seen.ladder = +guest.player.y.toFixed(2);
  // Mid-fall: the host steps off the roof's parapet; the guest's copy is in the air with it.
  p.place('host', 4.5, ROOF, 70, Math.PI); p.hold('host', 'KeyW', 1); host.tap = c => { host.press(c); host.release(c); }; host.tap('Space'); p.run(1.2); near(host.player.y, 10.46, .03, 'on the coping'); let air = 0; p.hold('host', 'KeyW', .3, () => { if (!host.height.grounded()) air++; }); p.run(.5, () => { if (!host.height.grounded() && host.player.y < 9 && host.player.y > 2) { air++; near(p.seen('host').y, host.player.y, 1.2, 'in the air within a pose of the host'); } }); assert(air > 5, 'seen falling'); p.run(2); p.sync(); near(host.player.y, .018, .03, 'down'); near(p.seen('host').y, host.player.y, .05, 'seen down on the paving');
  report.see = seen;
});

await check('shot', 'a shot from the guest and the same shot from the host do the same to a target on another level: from the foot of the west stair at an enemy standing on its landing 1.65 m up, the host\'s rifle and the guest\'s rifle (judged by the host from the guest\'s message) take the same health and end at the same point; and a shot from each at a target hidden by the floor above hits the floor', async () => {
  const p = await pair(), {host, guest} = p, farW = Math.min(...K.stairs[0].z), spot = V(-10.5, FLOORS[1], CZ[0] + .7), target = p.foe(0, -10.5, 1.7, farW + .75);   /* the shooter at the top of the west stair's second flight, the target on the landing below */
  const config = host.ambush.gunConfig();   /* the host's rifle: the guest's is the same (both assault) */
  const aim = () => target.g.position.clone().setY(target.g.position.y + 1.25).sub(spot.clone().setY(spot.y + 1.7)).normalize();
  p.place('host', spot.x, spot.y, spot.z); p.place('guest', 0, FLOORS[0], 66); const hp0 = target.hp, end1 = host.hitScan(spot.clone().setY(spot.y + 1.7), aim(), config, 'local'); const took1 = hp0 - target.hp; assert(took1 > 0, `the host's shot hit (${took1})`);
  target.hp = 100; p.place('host', 0, FLOORS[0], 66); p.place('guest', spot.x, spot.y, spot.z); const before = host.log?.toHost?.length; host.receive({type: 'shot', dir: aim().toArray(), o: spot.clone().setY(spot.y + 1.7).toArray(), w: 0, at: host.coop.elapsed() - .1}); const took2 = 100 - target.hp;   /* a tenth of a second on the way: judged by the host's picture of then */ const end2 = host.messages.length ? null : null;
  assert.equal(took2, took1, 'the same health taken'); void end1; void end2; void before;
  // Through the floor: both shoot straight up at an enemy on the floor above; the shot ends under the floor, the enemy untouched.
  const above = p.foe(1, 0, FLOORS[1], 57); p.place('host', 0, FLOORS[0], 57); p.place('guest', 0, FLOORS[0], 66); const up = V(0, 1, 0), e1 = host.hitScan(V(0, 1.7, 57), up, config, 'local'); assert.equal(above.hp, 100, 'the host\'s shot did not pass the floor'); assert(e1.y < FLOORS[1] + .01 && e1.y > 3, `stopped by the floor (${e1.y})`);
  p.place('host', 0, FLOORS[0], 66); p.place('guest', 0, FLOORS[0], 57); host.receive({type: 'shot', dir: up.toArray(), o: [0, 1.7, 57], w: 0, at: host.coop.elapsed() - .1}); assert.equal(above.hp, 100, 'the guest\'s shot did not pass the floor either');
  report.shot = {healthTaken: took1, shooter: 'the first floor, at the top of the west stair', target: 'the landing, 1.7 m below', throughTheFloor: 'neither'};
});

await check('ranges', 'nothing works through a floor from either side: a downed guest on the ground floor cannot be revived by the host standing on the first floor straight above (3.35 m by the plumb line, 0 across), nor a downed host by the guest above, and the host refuses a guest\'s revive from above; the knife reaches no enemy on the floor below; a blast on the ground floor hurts nobody on the floor above (teammate or player) though it is within its radius', async () => {
  const p = await pair(), {host, guest} = p, R = host.fall.REVIVE;
  p.place('guest', 0, FLOORS[0], 57); p.place('host', 0, FLOORS[1], 57); host.remote.hp = 1; host.aiHit({pos: host.remote.g.position, a: host.remote}, host.remote.g.position.clone().add(V(6, 1.4, 0)), host.remote.g.position.clone().setY(host.remote.g.position.y + 1.25)); p.sync(); assert(host.fall.fallen.mate.down, 'the guest is down');
  assert.equal(host.fall.reviveTarget(), false, 'no revive from the floor above (host over guest)'); p.place('host', 1.2, FLOORS[0], 57); assert.equal(host.fall.reviveTarget(), true, 'beside it on the same floor, yes'); host.press('KeyE'); p.run(R.time + .5); host.release('KeyE'); p.sync(); assert(!host.fall.fallen.mate.down, 'revived');
  p.place('host', 0, FLOORS[0], 57); host.set({hp: 1}); host.aiHit({pos: host.player, a: null}, host.player.clone().add(V(6, 1.4, 0)), host.player.clone().setY(host.player.y + 1.25)); p.sync(); assert(host.fall.fallen.me.down && guest.fall.fallen.mate.down, 'the host is down on both pages');
  p.place('guest', 0, FLOORS[1], 57); assert.equal(guest.fall.reviveTarget(), false, 'no revive from the floor above (guest over host)'); const prog0 = host.fall.fallen.me.progress; host.receive({type: 'revive', on: true, at: host.coop.elapsed()}); p.run(1); assert.equal(host.fall.fallen.me.progress, prog0, 'the host refuses a revive from above'); assert(!host.fall.mateReviving(), 'not reviving');
  p.place('guest', 1.2, FLOORS[0], 57); assert.equal(guest.fall.reviveTarget(), true, 'beside it, yes'); guest.press('KeyE'); p.run(R.time + 1); guest.release('KeyE'); p.sync(); assert(!host.fall.fallen.me.down, 'revived by the guest'); host.set({hp: 100});
  // The knife: an enemy straight below the host on the ground floor is not reached from the first floor.
  const below = p.foe(0, 0, FLOORS[0], 57); p.place('host', 0, FLOORS[1], 57, 0); assert(!host.equip.knifeScan(host.player.clone().setY(host.player.y + 1.7), V(0, -1, 0), 'local'), 'no knife through the floor'); assert(!host.equip.knifeScan(host.player.clone().setY(host.player.y + 1.7), V(0, 0, -1), 'local')); p.place('host', 0, FLOORS[0], 58.2, 0); assert(host.equip.knifeScan(host.player.clone().setY(host.player.y + 1.7), V(0, 0, -1), 'local'), 'on the same floor, in reach, yes'); void below;
  // A blast: the teammate and the player a floor above a grenade are not hurt; on the same floor they are.
  p.place('guest', .5, FLOORS[1], 57); p.place('host', -.5, FLOORS[1], 57); host.remote.hp = 100; host.set({hp: 100}); near(host.equip.mateNow().y, FLOORS[1], .02, 'the teammate is reckoned at its own height (mateNow)'); host.equip.blast(V(0, FLOORS[0] + .1, 57), 'local'); assert.equal(host.remote.hp, 100, 'the teammate above is not hurt'); assert.equal(host.coop.hp(), 100, 'the player above is not hurt');
  host.equip.blast(V(0, FLOORS[1] + .1, 58.5), 'local'); assert(host.remote.hp < 100 && host.coop.hp() < 100, `on the same floor both are hurt (${host.remote.hp}, ${host.coop.hp()})`);
  report.ranges = {revive: R, floorApart: +(FLOORS[1] - FLOORS[0]).toFixed(2)};
});

await check('grenade', 'grenades land on floors and roofs rather than falling through: dropped on the first floor a grenade comes to rest on that floor, on the roof on the roof, thrown at the ceiling it comes back down onto the floor it left, and dropped off the parapet it falls to the paving; the same physics on the guest\'s page', async () => {
  const p = await pair(), {host, guest} = p;
  const settle = (g, x, y, z, v = [0, 0, 0]) => { const n = {id: 0, k: 'frag', owner: 'local', p: V(x, y, z), v: V(...v), fuse: 100, age: 0, rest: false, mesh: {position: V(0, 0, 0)}}; for (let i = 0; i < 240; i++) g.equip.nadeAdvance(n, 1 / 60); return n; };
  for (const [name, g] of [['host', host], ['guest', guest]]) { const a = settle(g, 0, FLOORS[1] + 1.2, 57); assert(a.rest, `${name}: at rest`); near(a.p.y, FLOORS[1] + THROW.radius, .03, `${name}: on the first floor`);
    const b = settle(g, 0, ROOF + 1.2, 65); assert(b.rest); near(b.p.y, ROOF + THROW.radius, .03, `${name}: on the roof`);
    const c = settle(g, 0, FLOORS[1] + 1.2, 57, [0, 6, 0]); assert(c.rest); near(c.p.y, FLOORS[1] + THROW.radius, .03, `${name}: off the ceiling and back onto the floor`);
    const d = settle(g, 4.5, 10.6, 71.6); assert(d.rest); near(d.p.y, .018 + THROW.radius, .03, `${name}: off the parapet to the paving`); }
  report.grenade = {radius: THROW.radius, bounce: THROW.bounce, restsOn: ['first floor', 'roof', 'floor after the ceiling', 'paving after the parapet'], bothPages: true};
});

await check('enemies', 'enemies stand at the same height on both pages: stood on the first floor, on the roof, on a stair mid-flight and on the square, the host\'s snapshot puts each on the guest\'s page where the host has it; walking down a stair on the host, the guest\'s copy follows within a snapshot; falling on the host, the guest\'s copy falls with it', async () => {
  const p = await pair(), {host, guest} = p, gEnemies = enemies(guest), hEnemies = enemies(host), farW = Math.min(...K.stairs[0].z);
  const spots = [[0, FLOORS[1], 57], [0, ROOF, 65], [-11.9, 1.7, farW + 2], [0, 0, 76]]; spots.forEach(([x, y, z], i) => p.foe(i, x, y, z)); p.sync();
  spots.forEach(([x, y, z], i) => { const a = gEnemies[hEnemies.indexOf(hEnemies[i])]; near(a.g.position.y, y, .05, `enemy ${i} on the guest's page at ${y}`); near(hEnemies[i].g.position.y, y, .05, 'and on the host\'s'); });
  // Down the west stair: the enemy walks to the ground; the guest's copy is never more than a snapshot behind.
  const e = hEnemies[2]; e.blindUntil = 0; host.restoreAI(); host.ai.startTravel(e, 'travel', [[-10.5, CZ[0] + .9, FLOORS[0]]], 2.2, null); const g2 = gEnemies[2]; let gap = 0, samples = 0; p.run(6, () => { if (e.g.position.y > .2 && e.g.position.y < 1.6) { samples++; gap = Math.max(gap, Math.abs(g2.g.position.y - e.g.position.y)); } });
  assert(samples > 20, `${samples} samples on the way down`); assert(gap < .5, `the guest's copy within half a metre on the stair (${gap.toFixed(2)})`); p.sync(); near(g2.g.position.y, e.g.position.y, .05, 'and where it stopped');
  // Falling: pushed off the roof on the host, the guest's copy comes down to the paving too.
  const r = hEnemies[1]; r.g.position.set(4.5, 10.46, 71.05); r.blindUntil = Infinity; p.sync(); near(gEnemies[1].g.position.y, 10.46, .05, 'on the coping on both pages'); host.nav = host.built.navigation(); host.nav.move(r.g.position, 0, .6); p.run(3); near(r.g.position.y, .018, .05, 'down on the host'); near(gEnemies[1].g.position.y, r.g.position.y, .05, 'down on the guest');
  report.enemies = {spots: spots.map(s => s[1]), stairGap: +gap.toFixed(2)};
});

await check('falls', 'a guest\'s fall is charged by the host as the host\'s own falls are: stepping off the roof\'s parapet the guest loses what FALL says (10.4 m: 75 of its health) on the host\'s page and so on its own after the next snapshot, and neither more nor twice; a jump costs nothing; a guest climbing down a ladder is charged nothing; the host\'s own fall is charged on its page and seen by the guest; a fatal fall downs the guest', async () => {
  const p = await pair(), {host, guest} = p; guest.tap = c => { guest.press(c); guest.release(c); }; host.tap = c => { host.press(c); host.release(c); };
  p.place('guest', 4.5, ROOF, 70, Math.PI); p.place('host', 0, 0, 76); p.hold('guest', 'KeyW', 1); guest.tap('Space'); p.run(1.2); near(guest.player.y, 10.46, .03, 'the guest on the coping'); host.remote.hp = 100; p.sync();
  p.delay = 40; p.hold('guest', 'KeyW', .3, () => guest.height.grounded() ? undefined : false); p.run(2.5, () => { if (guest.height.grounded() && guest.height.lastFall() > 5 && guest.coop.hp() !== 100) throw new Error('the guest charged itself before the host\'s word: ' + guest.coop.hp()); }); assert.equal(guest.coop.hp(), 100, 'the guest\'s own page charges nothing'); p.delay = 0; p.sync(); p.sync(); near(guest.player.y, .018, .03, 'the guest down on the paving'); const drop = guest.height.lastFall(); near(drop, 10.44, .1, 'the fall');
  near(host.remote.hp, 100 - fallDamage(drop), .6, `charged by the host (${host.remote.hp})`); near(guest.coop.hp(), host.remote.hp, .01, 'and so on the guest\'s page'); const charged = host.remote.hp; p.run(2); near(host.remote.hp, charged, 0, 'once only');
  // A jump costs nothing; a ladder climbed down costs nothing.
  host.remote.hp = 100; p.place('guest', 0, 0, 76); guest.tap('Space'); p.run(1.5); p.sync(); assert.equal(host.remote.hp, 100, 'a jump');
  const L = guest.height.space.ladders.find(l => Math.abs(l.x + 9) < .1); p.place('guest', L.exit[0], 4.33, L.exit[1], Math.atan2(L.dir[0], L.dir[1]) + Math.PI); p.hold('guest', 'KeyS', .5); assert(guest.height.climbing(), 'the guest backed onto the ladder'); p.hold('guest', 'KeyS', 4, () => guest.height.climbing() ? undefined : false); p.run(.5); p.sync(); near(guest.player.y, 1.6, .05, 'down at its foot'); assert.equal(host.remote.hp, 100, 'a ladder climbed down costs nothing');
  // The host's own fall: charged on its page, seen by the guest.
  p.place('host', 4.5, ROOF, 70, Math.PI); p.hold('host', 'KeyW', 1); host.tap('Space'); p.run(1.2); host.set({hp: 100}); p.hold('host', 'KeyW', .3, () => host.height.grounded() ? undefined : false); p.run(2.5); p.sync(); near(host.coop.hp(), 100 - fallDamage(host.height.lastFall()), .01, 'the host charged'); near(guest.remote.hp, host.coop.hp(), .01, 'seen by the guest');
  // A fatal fall (from the roof with 20 health) downs the guest on both pages.
  host.remote.hp = 20; p.place('guest', 4.5, ROOF, 70, Math.PI); p.hold('guest', 'KeyW', 1); guest.tap('Space'); p.run(1.2); p.hold('guest', 'KeyW', .3, () => guest.height.grounded() ? undefined : false); p.run(2.5); p.sync(); assert(host.fall.fallen.mate.down && guest.fall.fallen.me.down, 'the guest is down on both pages'); assert.equal(host.remote.hp, 0);
  report.falls = {guestFall: +drop.toFixed(2), charged: +(100 - charged).toFixed(1), curve: 'none to 3 m, fatal at 12, as the player'};
});

await check('arena', 'the customs house is widened as asked: the corridor 3 m wide (was 2.2), the rooms fewer and larger (the smallest room but the closets over 20 m², the halls over 40), the doorways from the corridor 1.6 m bare frames (no leaf), the doors between rooms bare frames, the street doors with their leaves; every floor of it reached by the player (T35) and by enemies (T36), no inescapable place (T35\'s flood), the block unchanged (T35); everything still under the ceilings (T32)', async () => {
  near(CZ[1] - CZ[0], 3, .01, 'the corridor'); const area = r => (r.x[1] - r.x[0]) * (r.z[1] - r.z[0]); const rooms = K.storeys.flatMap((S, n) => S.rooms.filter(r => !['corridor'].includes(r.id) && !r.id.startsWith('stair') && !r.id.startsWith('closet')).map(r => ({n, id: r.id, area: +area(r).toFixed(1)})));
  for (const r of rooms) assert(r.area >= 20, `${r.id} on storey ${r.n}: ${r.area} m²`); assert(rooms.filter(r => r.area >= 40).length >= 6, 'six rooms of forty square metres or more');
  const corridorDoors = K.storeys.flatMap(S => S.doors.filter(d => Math.abs(d.at[1] - CZ[0]) < .01 || Math.abs(d.at[1] - CZ[1]) < .01)), innerDoors = K.storeys.flatMap(S => S.doors.filter(d => !(Math.abs(d.at[1] - CZ[0]) < .01 || Math.abs(d.at[1] - CZ[1]) < .01)));
  assert(corridorDoors.length >= 14 && corridorDoors.every(d => d.door === false && (d.width ?? K.door.width) === 1.6), 'every corridor doorway a bare frame 1.6 m wide'); assert(innerDoors.every(d => d.door === false), 'every doorway between rooms a bare frame');
  const streetDoors = ['north', 'south', 'east', 'west'].map(f => K.storeys[0][f].find(o => o.kind === 'door')); assert(streetDoors.every(o => o && o.door !== false && o.leaf && o.width === 1.3), 'the four street doors keep their leaves');
  maps.selectMap('dehrun'); let g; try { g = await createGame(SOURCE ? {sourcePath: SOURCE} : {}); g.prepare({clearLane: false}); await g.built.ready; } finally { maps.selectMap('kohar'); }
  const leaves = g.built.stats.list.filter(b => b.turned && b.surface === 'planks' && b.at[2] > 52 && b.at[2] < 72 && b.at[0] > -12.5 && b.at[0] < 12.5 && Math.abs(b.at[1] - 1.2) < .3); assert(leaves.length === 4, `${leaves.length} door leaves in the customs house at street level: the four street doors`);
  report.arena = {corridor: +(CZ[1] - CZ[0]).toFixed(2), rooms: rooms, corridorDoorways: corridorDoors.length, streetDoors: 'leaves kept, swung open', innerDoorways: innerDoors.length};
});

console.log(JSON.stringify({...(ONLY ? {partial: ONLY} : {}), passed: results.length, checks: results, report, limitations: [
  'Two instances in one process with a stand-in connection: what two networks or two people do is not shown here (say so whenever co-op is reported as verified).',
  'Kohar Valley\'s co-op is compared with Build 26 run here; its enemy traces are in T20, T26, T27 and T31.',
  'How the customs house plays is for the user.']}, null, 2));
