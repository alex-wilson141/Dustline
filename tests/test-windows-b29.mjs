// Build 29 (T39): windows and stairs on Dehrun Terraces. Every flight is 2 m clear with room for a player and an enemy,
// and for two enemies, side by side; half landings are as deep as a flight is wide and the roof doors nearly as wide;
// a player hugging either wall climbs every flight without being stopped by what stands proud of the wall (the nudge).
// Windows are bigger and some are double. Glass: a whole pane stops sight and shots, a shot breaks it, a broken one
// stops nothing, from both sides; enemies shoot out a pane they see someone through and then fight through it; broken
// stays broken for the mission and is whole again for the next; host and guest have the same panes broken and agree on
// sight and shots; many breakages and resets make and leave nothing. Kohar Valley has no glass and sends nothing new.
import assert from 'node:assert/strict';
globalThis.location = {search: '?foes=1'};   // the walk runs its AI only with the foes asked for (Build 26)
import {createGame, projectRoot} from './sprint-harness.mjs';

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const maps = await import(new URL('dist/maps.js', projectRoot));
const {BODY} = await import(new URL('dist/space.js', projectRoot));
const {FOE} = await import(new URL('dist/navmesh.js', projectRoot));
const SOURCE = process.env.DUSTLINE_GAME_SOURCE ? new URL('file://' + process.env.DUSTLINE_GAME_SOURCE) : undefined;
const ONLY = process.env.DUSTLINE_T39_ONLY?.split(',');
const results = [], report = {};
async function check(tag, name, fn) { if (ONLY && !ONLY.includes(tag)) return; await fn(); results.push(name); }
const DEHRUN = await maps.loadMap('dehrun'); maps.selectMap('kohar');
const B = DEHRUN.block, K = B.houses.find(h => h.id === 'K'), FLOORS = [.05, 3.4, 6.6];
const V = (x, y, z) => new THREE.Vector3(x, y, z), near = (a, b, e, what) => assert(Math.abs(a - b) <= e, `${what}: ${a} against ${b}`), wire = m => JSON.parse(JSON.stringify(m));
const RIFLE = {damage: 30, headshot: 1}, X = V(1, 0, 0), NX = V(-1, 0, 0);
const enemies = g => g.actors.filter(a => a.team === 'enemy');
// One page on the town, walking (Story) or fighting (Skirmish), with the game's own AI.
async function world(mode = 'story') { maps.selectMap('dehrun'); let g; try { g = await createGame(SOURCE ? {sourcePath: SOURCE} : {}); g.prepare({clearLane: false}); await g.built.ready; } finally { maps.selectMap('kohar'); }
  g.setMode(mode); g.reset(); g.play(); g.restoreAI(); g.set({hp: 100}); let clock = 0; g.frame(0);
  g.run = (s, each) => { for (let i = 0, n = Math.round(s * 60); i < n; i++) { g.frame(clock += 1000 / 60); if (each?.(i / 60) === false) break; } };
  g.put = (x, y, z, yaw = 0) => { g.player.set(x, y, z); g.set({yaw}); g.height.settle(); };
  g.nobody = () => { for (const a of g.actors) { a.hp = 0; a.dead = 999; a.diedAt = -1e9; a.gone = true; a.g.visible = false; a.route = []; } };
  g.foe = (i, x, y, z) => { const a = enemies(g)[i]; a.hp = 100; a.dead = 0; a.gone = false; a.sink = null; a.diedAt = null; a.fall = null; a.climb = null; a.g.visible = true; a.resetPose(); a.g.position.set(x, y, z); a.cool = .1; a.senseTimer = .05; a.stuck = 0; a.ai = {role: 'patrol', loop: 'SQUARE', dir: 1, lastHp: 100}; g.ai.startPatrol(a, 'SQUARE'); a.ai.state = 'hold'; a.route = []; a.ai.retry = 0; return a; };
  g.G = g.glass.G; g.pane = (x, y, z) => { let best = -1, bd = 1e9; g.G.panes.forEach((p, i) => { const d = Math.hypot(p.at[0] - x, p.at[1] - y, p.at[2] - z); if (d < bd) { bd = d; best = i; } }); assert(bd < .6, `a pane at ${[x, y, z]} (${bd.toFixed(2)} m off)`); return best; };
  return g; }
// A connected host and guest on the town (or Kohar Valley), deployed in Story co-op with every enemy dead, as T37 pairs them.
async function pair({map = 'dehrun', delay = 2} = {}) {
  const page = async role => { maps.selectMap(map); let g; try { g = await createGame(SOURCE ? {sourcePath: SOURCE} : {}); } finally { maps.selectMap('kohar'); } g.prepare({role, clearLane: false}); g.el('blood').checked = false; for (const a of g.actors) a.animate = a.visual.animate; if (g.built) await g.built.ready; return g; };
  const host = await page('host'), guest = await page('guest'), log = {toGuest: [], toHost: []}, queue = []; let frame = 0, clock = 0;
  const p = {host, guest, log, delay, drop: null, deliver() { for (let i = 0; i < queue.length;) { const q = queue[i]; if (q.due <= frame) { queue.splice(i, 1); q.to.receive(q.m); } else i++; } }};
  const send = (from, to, list) => m => { if (!from.peer.connected) return false; if (p.drop?.(m)) return true; list.push(wire(m)); if (!p.delay) to.receive(wire(m)); else queue.push({to, m: wire(m), due: frame + p.delay}); return true; };
  host.peer.send = send(host, guest, log.toGuest); guest.peer.send = send(guest, host, log.toHost);
  host.receive({type: 'hello', classId: 'assault'}); guest.receive({type: 'hello', classId: 'assault'}); for (const g of [host, guest]) { g.pause(); g.goMenu(true); }
  Object.assign(p, {step(n = 1) { for (let i = 0; i < n; i++) { frame++; clock += 1000 / 60; p.deliver(); host.frame(clock); guest.frame(clock); } }, run(s) { p.step(Math.round(s * 60)); }, sync() { p.step(8 + 2 * p.delay); },
    place(who, x, y, z) { const me = p[who], o = p[who === 'host' ? 'guest' : 'host']; me.player.set(x, y, z); me.height?.settle(); o.remote.g.position.set(x, y, z); o.remote.netPos = null; o.remote.vel = null; o.remote.air = false; o.remote.peakY = null; p.sync(); },
    deploy() { const d0 = p.delay; p.delay = 0; host.squad.pref.coop = false; host.setMode('coop'); host.start(); host.play(); guest.play(); p.delay = d0; host.set({hp: 100}); host.remote.hp = 100; for (const a of enemies(host)) { a.hp = 0; a.dead = 999; a.gone = true; a.g.visible = false; a.diedAt = -1e9; } p.sync(); }});
  host.frame(0); guest.frame(0); p.deploy(); return p; }
const drawn = g => { const geo = new Set(), mat = new Set(); let objects = 0; g.scene.traverse(o => { objects++; if (o.geometry) geo.add(o.geometry.uuid); for (const m of [].concat(o.material || [])) mat.add(m.uuid); }); return {objects, geometries: geo.size, materials: mat.size, children: g.scene.children.length}; };
// The customs house's west wall (x -13): a barred window on the ground floor at z 64 (the closet behind it) and at z 66.5
// (the south-west room), a double window on the first floor at z 64.8.
const WEST = -12.87, CLOSET = [-10.5, FLOORS[0], 64], OUT = [-18, 0, 64];

await check('kohar', 'Kohar Valley has no glass: the game keeps none there, its snapshots carry nothing new and no glass message is ever sent (the three traces, in their own suites, prove the rest)', async () => {
  const g = await createGame(SOURCE ? {sourcePath: SOURCE} : {}); assert.equal(g.glass, undefined, 'no glass on Kohar Valley'); assert.equal(g.built, null);
  const p = await pair({map: 'kohar'}); p.place('host', 0, 0, 50); p.place('guest', 4, 0, 50); p.host.hitScan(V(0, 1.6, 50), V(0, 0, -1), RIFLE, 'local'); p.run(2);
  const snaps = p.log.toGuest.filter(m => m.type === 'snapshot'); assert(snaps.length > 10); assert(snaps.every(m => !('gl' in m)), 'no glass in a snapshot'); assert(![...p.log.toGuest, ...p.log.toHost].some(m => /^glass/.test(m.type)), 'no glass message');
  report.kohar = {glass: 'none', snapshots: snaps.length};
});

await check('stairs', 'every stair is 2 m clear (Build 28: 1.7): on each of the 23 flights a player and an enemy stand side by side, and two enemies do; the customs house\'s half landings are as deep as a flight is wide and its roof doors 1.69 m clear (were 1.1); a player hugging either wall climbs every flight without once being stopped (the nudge past what stands proud of a wall), where without the nudge it is stopped on most of them; a body square against a plain wall is not moved sideways by it; and in the game, walking up the customs house\'s west stair pressed into its wall arrives at the landing', async () => {
  const g = await world(), sp = g.height.space, flights = g.built.stats.flights; assert(flights.length >= 23); let narrowest = 9;
  for (const f of flights) { const at = (v, u) => f.axis === 'x' ? [u, v] : [v, u], u = (f.run[0] + f.run[1]) / 2, yMid = sp.floor(...at((f.across[0] + f.across[1]) / 2, u), f.high + .3).y;
    const side = (from, dir) => { for (let v = from; Math.abs(v - from) < .3; v += dir * .005) if (sp.clear(...at(v + dir * .05, u), yMid + BODY.step, yMid + BODY.stand, .05)) return v; return from + dir * .3; }, a0 = side(f.across[0], 1), a1 = side(f.across[1], -1);
    assert(f.width >= 1.99 && a1 - a0 >= 1.98, `a flight ${(a1 - a0).toFixed(2)} m clear (${f.width.toFixed(2)} m made) at ${at(a0, u)}`); narrowest = Math.min(narrowest, a1 - a0);
    const stand = (v, r) => { const [x, z] = at(v, u), y = sp.floor(x, z, f.high + .3).y; return sp.stands(x, z, y + BODY.step, y + BODY.stand, r, true); };
    assert(stand(a0 + BODY.radius + .03, BODY.radius) && stand(a1 - FOE.radius - .03, FOE.radius), `a player and an enemy side by side at ${at(a0, u)}`);
    assert(stand(a0 + FOE.radius + .03, FOE.radius) && stand(a1 - FOE.radius - .03, FOE.radius) && a1 - a0 - .06 >= 4 * FOE.radius, `two enemies side by side at ${at(a0, u)}`); }
  // A player walking up each flight pressed diagonally into a wall: how often it is stopped dead.
  const stops = nudge => { let n = 0; for (const f of flights) { const dir = Math.sign(f.run[1] - f.run[0]), at = (v, u) => f.axis === 'x' ? [u, v] : [v, u];
      for (const [v0, press] of [[f.across[0] + BODY.radius + .12, -1], [f.across[1] - BODY.radius - .12, 1]]) { const p = V(0, 0, 0), [x, z] = at(v0, f.run[0] - dir * .2); p.set(x, sp.floor(x, z, f.low + .5, .2, f.low).y, z); let still = 0;
        for (let i = 0; i < 400; i++) { const b = f.axis === 'x' ? p.x : p.z; sp.move(p, f.axis === 'x' ? dir * .05 : press * .05, f.axis === 'x' ? press * .05 : dir * .05, BODY.stand, BODY.radius, {nudge}); const a = f.axis === 'x' ? p.x : p.z;
          if (dir * (a - f.run[1]) > -.05) break; const v = f.axis === 'x' ? p.z : p.x; if (v < f.across[0] - .05 || v > f.across[1] + .05) break;   /* off an open side (house A's stair has one): not a stop */ still = Math.abs(a - b) < .01 ? still + 1 : 0; if (still === 3) { n++; break; } } } } return n; };
  const withNudge = stops(BODY.nudge), without = stops(0); assert.equal(withNudge, 0, `stopped ${withNudge} times with the nudge`); assert(without >= 8, `without it, stopped on ${without} of ${2 * flights.length} walks`); assert(BODY.nudge > 0 && BODY.nudge <= .2);
  // Square against a plain wall (the customs house's south face, outside): pushed at for two seconds, the body stays where it is.
  const q = V(-6, 0, 71 + BODY.radius + .01); q.y = sp.floor(q.x, q.z, 1).y; const q0 = q.clone(); for (let i = 0; i < 120; i++) sp.move(q, 0, -.05, BODY.stand, BODY.radius, {nudge: BODY.nudge}); assert(q.distanceTo(q0) < .02, `against a wall the body stays (${q.distanceTo(q0).toFixed(3)} m)`);
  // The half landing of the west stair and the door of its head on the roof.
  const st = K.stairs[0], zFar = Math.min(...st.z), xm = (st.x[0] + st.x[1]) / 2, span = (fix, from, to, y, alongZ) => { let lo = null, hi = null; for (let v = from; v <= to; v += .01) if (alongZ ? sp.clear(fix, v, y + BODY.step, y + BODY.stand, .02) : sp.clear(v, fix, y + BODY.step, y + BODY.stand, .02)) { lo ??= v; hi = v; } return hi - lo; };
  const landing = span(st.x[0] + 1, zFar - .5, zFar + st.landing + .1, 1.7, true), across = span(zFar + 1, st.x[0] - .2, st.x[1] + .2, 1.7, false); assert(st.landing >= 2); assert(landing >= 1.85 && across >= 4.05, `the half landing ${landing.toFixed(2)} m deep, ${across.toFixed(2)} m across`);
  const headDoor = span(Math.max(...st.z), st.x[0] - .2, st.x[1] + .2, 9.83, false); assert(headDoor >= 1.65, `the roof door ${headDoor.toFixed(2)} m clear`);
  // In the game: W and A held up the west stair's first flight, the body against its outer wall all the way.
  g.put(st.x[0] + BODY.radius + .15, FLOORS[0], Math.max(...st.z) + .4, 0); g.press('KeyW'); g.press('KeyA'); let last = g.player.z, stalled = 0; g.run(6, () => { if (Math.abs(g.player.z - last) < 1e-4 && g.player.z > zFar + st.landing + .3) stalled++; last = g.player.z; if (g.player.z < zFar + st.landing - .3) return false; }); g.release('KeyW'); g.release('KeyA');
  near(g.player.y, 1.7, .03, 'on the half landing'); assert(g.player.z < zFar + st.landing - .2 && stalled < 3, `arrived (${g.player.z.toFixed(2)}), stalled ${stalled} frames`);
  report.stairs = {flights: flights.length, narrowestClear: +narrowest.toFixed(2), bodies: {player: 2 * BODY.radius, enemy: 2 * FOE.radius}, stopsWithoutNudge: without, stopsWithNudge: withNudge, nudge: BODY.nudge, halfLanding: +landing.toFixed(2), roofDoorClear: +headDoor.toFixed(2)};
});

await check('windows', 'windows are bigger and some are double: a window is 1.4 m wide with its head at 2.2 m unless its house says otherwise; a double window is one 2.4 m opening with two casements, a post between them and two panes; there are doubles in the customs house, over the door of every open house and in the town\'s shells; every window of a made or glazed house has its glass (the houses beyond the walls, which are not the town\'s, have none: the count is exact)', async () => {
  const g = await world(), all = B.houses.flatMap(h => h.storeys.flatMap(s => ['north', 'south', 'east', 'west'].flatMap(f => (s[f] || []).filter(o => o.kind === 'window').map(o => ({...o, house: h})))));
  const plainSized = all.filter(o => o.width === 1.4 && o.head === 2.2), doubles = all.filter(o => o.double); assert(plainSized.length > all.length * .6, `${plainSized.length} of ${all.length} windows 1.4 m`); assert(!all.some(o => o.width === 1.1 || o.head === 2.05), 'none of the old size left');
  assert(doubles.length >= 40 && doubles.every(o => o.width === 2.4), `${doubles.length} double windows`); const where = h => h.id === 'K' ? 'customs' : h.plain ? 'shell' : h.enter && h.id.length > 1 ? 'open' : 'block', by = {}; for (const o of doubles) by[where(o.house)] = (by[where(o.house)] || 0) + 1;
  assert(by.customs >= 6 && by.open === 9 && by.shell >= 20, `doubles: ${JSON.stringify(by)}`);
  const glazed = all.filter(o => !o.house.plain || o.house.glazed), want = glazed.reduce((n, o) => n + (o.double ? 2 : 1), 0); assert.equal(g.G.count, want, 'a pane a casement'); assert(g.G.count > 250);
  assert(B.houses.filter(h => h.plain && h.glazed).length >= 40 && !B.houses.some(h => h.plain && !h.glazed), 'the town\'s shells glazed');
  // A double window on the customs house's first floor (west, z 64.8): two panes either side of a post, each 1.06 m of glass.
  const a = g.pane(WEST, FLOORS[1] + 1.5, 64.2), b = g.pane(WEST, FLOORS[1] + 1.5, 65.4); assert.notEqual(a, b); for (const i of [a, b]) near(g.G.panes[i].size[2], 1.2 + .03 - .17, .01, 'a half\'s glass'); near(g.G.panes[b].at[2] - g.G.panes[a].at[2], 1.17, .02, 'side by side');
  assert(g.built.stats.list.some(q => q.surface === 'beams' && Math.abs(q.at[2] - 64.8) < .01 && Math.abs(q.at[0] + 13) < .2 && Math.abs(q.size[2] - .1) < .01 && q.size[1] > 1.2 && q.at[1] > FLOORS[1]), 'the post between them');
  report.windows = {windows: all.length, of1_4m: plainSized.length, doubles: by, panes: g.G.count, clear: g.G.panes.filter(p => p.kind === 'clear').length, dark: g.G.panes.filter(p => p.kind === 'pane').length};
});

await check('break', 'a shot breaks glass, and a broken pane stops nothing: through a whole pane nothing is seen from outside in or inside out and a shot ends at the glass with whoever stands behind it untouched; that shot breaks the pane, after which both see each other and the next shot hits, from outside in and (another window) from inside out; the window beside it is still whole and still stops sight and shots; of a double window one half breaks and the other stays', async () => {
  const g = await world(); g.nobody(); g.put(0, 0, 40); const G = g.G, outside = V(OUT[0], 1.5, OUT[2]), inside = V(CLOSET[0], 1.5, CLOSET[2]), pane = g.pane(WEST, 1.5, 64);
  assert(!g.glass.visible(outside, inside) && !g.glass.visible(inside, outside) && !g.glass.clear(outside, inside), 'whole: no sight either way');
  const victim = g.foe(0, ...CLOSET); victim.blindUntil = Infinity; const e1 = g.hitScan(outside.clone(), X.clone(), RIFLE, 'local'); assert.equal(victim.hp, 100, 'the first shot is stopped'); near(e1.x, G.panes[pane].at[0], .02, 'at the glass'); assert.deepEqual(G.list(), [pane], 'and breaks it');
  assert(g.glass.visible(outside, inside) && g.glass.visible(inside, outside) && g.glass.clear(inside, outside), 'broken: sight both ways');
  g.hitScan(outside.clone(), X.clone(), RIFLE, 'local'); assert(victim.hp < 100, `the second shot hits (${victim.hp})`);
  // From inside out, at the next window (z 66.5): an enemy on the square, the shooter in the south-west room.
  const p2 = g.pane(WEST, 1.5, 66.5), in2 = V(-10.5, 1.5, 66.5), out2 = V(-17, 1.5, 66.5), v2 = g.foe(1, -17, 0, 66.5); v2.blindUntil = Infinity;
  assert(!g.glass.visible(in2, out2) && !g.glass.visible(out2, in2), 'the window beside it is whole'); const hp0 = v2.hp; g.hitScan(in2.clone(), NX.clone(), RIFLE, 'local'); assert.equal(v2.hp, hp0); assert(G.broken[p2], 'broken from inside');
  g.hitScan(in2.clone(), NX.clone(), RIFLE, 'local'); assert(v2.hp < hp0, 'and shot through'); assert(g.glass.visible(in2, out2) && g.glass.visible(out2, in2));
  // A third window nobody shot (z 69) still stops both.
  const p3 = g.pane(WEST, 1.5, 69), in3 = V(-10.5, 1.5, 69), out3 = V(-17, 1.5, 69); assert(!G.broken[p3] && !g.glass.visible(in3, out3) && !g.glass.visible(out3, in3)); assert.equal(G.hit(out3, X, 10).i, p3);
  // A double window: one half shot out, the other whole.
  const da = g.pane(WEST, FLOORS[1] + 1.5, 64.2), db = g.pane(WEST, FLOORS[1] + 1.5, 65.4); g.hitScan(V(-20, FLOORS[1] + 1.5, 64.2), X.clone(), RIFLE, 'local'); assert(G.broken[da] && !G.broken[db], 'one half'); assert(g.glass.visible(V(-20, 4.9, 64.2), V(-11, 4.9, 64.2)) && !g.glass.visible(V(-20, 4.9, 65.4), V(-11, 4.9, 65.4)));
  // What is drawn: a broken pane's instance is hidden and nothing is put in its place (Build 31: the teeth of glass are gone); a whole pane is drawn.
  const m = new THREE.Matrix4(), scale = (mesh, slot) => { mesh.getMatrixAt(slot, m); return m.elements[0] ** 2 + m.elements[5] ** 2 + m.elements[10] ** 2; };
  assert(scale(G.panes[pane].mesh, G.panes[pane].slot) === 0, 'a broken pane: not drawn'); assert(scale(G.panes[p3].mesh, G.panes[p3].slot) > 0, 'a whole pane: drawn'); assert(!g.scene.children.some(o => o.userData.glass === 'shards') && G.teeth === 0, 'no teeth of glass');
  assert.equal(g.scene.children.filter(o => o.userData.glass).length, 4, 'four drawings for all the glass and what stands in the windows with it');
  report.break = {panes: G.count, broken: G.list().length, teethPerPane: G.teeth, drawings: 4};
});

await check('ways', 'everything that should break glass does: a grenade thrown at a window goes through it and the pane is broken; a blast breaks the panes within 5 m and none further; a player\'s body through a window breaks its pane; an ally seeing an enemy through glass shoots the pane out; and a guest page breaks nothing by itself', async () => {
  const g = await world(), G = g.G; g.nobody(); g.put(0, 0, 40);
  const p1 = g.pane(WEST, 1.5, 64); g.equip.throwItem('frag', V(-16, 1.5, 64), V(1, .05, 0).normalize(), 0, false, 'local'); let through = false; g.run(1.2, () => { if (g.equip.nades.some(n => n.p.x > -12.5)) through = true; }); assert(G.broken[p1], 'the grenade broke the pane'); assert(through, 'and went in');
  g.run(5); const near5 = G.list().filter(i => i !== p1); G.reset(); g.run(.5);
  const P = V(-15, .4, 66.7), within = G.panes.map((p, i) => Math.hypot(p.at[0] - P.x, p.at[1] - P.y, p.at[2] - P.z) <= 5 ? i : -1).filter(i => i >= 0); assert(within.length >= 2 && within.length < 12, `${within.length} panes within 5 m`); g.glass.blast(P, 'local'); assert.deepEqual(G.list(), within, 'a blast takes the panes within 5 m, no others');
  G.reset(); const up = g.pane(WEST, FLOORS[1] + 1.5, 69), at = G.panes[up].at; g.put(at[0] + .1, FLOORS[1] + .45, at[2]); g.glass.bodies(); assert.deepEqual(G.list(), [up], 'a body in the window breaks it');
  G.reset(); g.nobody(); g.put(0, 0, 40); const foe = g.foe(0, -17, 0, 66.5); foe.blindUntil = Infinity; const ally = g.actors.find(a => a.team === 'ally' && !a.remote); Object.assign(ally, {hp: 100, dead: 0, gone: false}); ally.g.visible = true; ally.g.position.set(-10.5, FLOORS[0], 66.5); ally.cool = .1; ally.senseTimer = .05;
  const p2 = g.pane(WEST, 1.5, 66.5); let t = null; g.run(6, s => { ally.g.position.set(-10.5, FLOORS[0], 66.5); if (G.broken[p2]) { t = s; return false; } }); assert(t != null, 'an ally shot the pane out');
  report.ways = {grenade: true, blastPanes: within.length, grenadeBlastAlso: near5.length, body: true, allyAfter: +t.toFixed(2)};
});

await check('enemies', 'enemies see and shoot through broken windows, theirs or mine: an enemy on the square with a player behind a whole window does not see the player, shoots the pane out (hurting nobody) and then sees and fires at the player through it; behind a window the player has already broken it sees the player at once; and with the pane whole and nobody behind it, it shoots at nothing', async () => {
  const g = await world(), G = g.G; g.nobody(); g.put(...CLOSET, Math.PI / 2); g.set({hp: 100}); const pane = g.pane(WEST, 1.5, 64), a = g.foe(0, ...OUT); a.g.rotation.y = -Math.PI / 2;
  let brokeAt = null, seenBefore = 0, seenAt = null, firing = 0, hpAtBreak = null; const shots0 = g.sounds.filter(x => x === 'shot').length;
  g.run(14, t => { g.set({hp: Math.max(g.coop.hp(), 40)}); if (!G.broken[pane]) { if (a.seen) seenBefore++; } else { brokeAt ??= t; hpAtBreak ??= g.coop.hp(); if (a.seen) seenAt ??= t; if (a.ai.firing) firing++; } });
  assert.equal(seenBefore, 0, 'not seen through a whole pane'); assert(brokeAt != null && brokeAt < 4, `the enemy shot the pane out (${brokeAt})`); assert.equal(hpAtBreak, 100, 'that shot hurt nobody');
  assert(seenAt != null && seenAt - brokeAt < 1, `then saw the player (${seenAt})`); assert(firing > 10, `and fired through the window (${firing} frames)`); const shots = g.sounds.filter(x => x === 'shot').length - shots0; assert(shots >= 3, `${shots} shots`);
  // A window the player broke: seen at once. (The window at z 66.5; the player in the south-west room.)
  g.nobody(); G.reset(); g.put(-10.5, FLOORS[0], 66.5, Math.PI / 2); g.set({hp: 100}); const p2 = g.pane(WEST, 1.5, 66.5); g.hitScan(V(-10.5, 1.5, 66.5), NX.clone(), RIFLE, 'local'); assert(G.broken[p2]);
  const b = g.foe(1, -18, 0, 66.5); let sawAt = null; g.run(3, t => { g.set({hp: 100}); if (b.seen) { sawAt = t; return false; } }); assert(sawAt != null && sawAt < .6, `seen through the player's own hole at once (${sawAt})`); assert.deepEqual(G.list(), [p2], 'no other pane broken');
  // Nobody behind the glass: nothing is shot.
  g.nobody(); G.reset(); g.put(0, 0, -20); const c = g.foe(2, ...OUT); g.run(5, () => { c.g.rotation.y = -Math.PI / 2; });   /* facing the window all the while */ assert.deepEqual(G.list(), [], 'no pane shot for nobody');
  report.enemies = {paneShotAfter: +brokeAt.toFixed(2), sawAfter: +seenAt.toFixed(2), firingFrames: firing, shots, throughMine: +sawAt.toFixed(2)};
});

await check('stays', 'broken stays broken for the mission and is whole for the next: three panes shot out in Skirmish are still the same three after two minutes of the mission with everyone fighting (others may have joined them, none comes back), through a pause and a resume; a new mission starts with every pane whole; the walk keeps its broken panes too until it is begun again', async () => {
  const g = await world('skirmish'), G = g.G; const mine = [g.pane(WEST, 1.5, 64), g.pane(WEST, 1.5, 66.5), g.pane(WEST, FLOORS[1] + 1.5, 69)];
  g.hitScan(V(-18, 1.5, 64), X.clone(), RIFLE, 'local'); g.hitScan(V(-18, 1.5, 66.5), X.clone(), RIFLE, 'local'); g.hitScan(V(-20, FLOORS[1] + 1.5, 69), X.clone(), RIFLE, 'local'); assert.deepEqual(G.list(), [...mine].sort((a, b) => a - b));
  let came = 0, prev = new Set(G.list()); g.run(120, () => { g.set({hp: 100}); const now = G.list(); for (const i of prev) if (!now.includes(i)) came++; prev = new Set(now); }); assert.equal(came, 0, 'no pane came back'); assert(mine.every(i => G.broken[i]), 'mine still broken'); const after = G.list().length;
  g.pause(); g.run(1); assert(mine.every(i => G.broken[i])); g.play(); g.run(1); assert(mine.every(i => G.broken[i]), 'through a pause');
  g.reset(); assert.deepEqual(G.list(), [], 'a new mission: every pane whole'); assert(!g.glass.visible(V(-18, 1.5, 64), V(-10.5, 1.5, 64)), 'and stopping sight again');
  const w = await world('story'); w.nobody(); w.hitScan(V(-18, 1.5, 64), X.clone(), RIFLE, 'local'); w.run(30); assert.equal(w.G.list().length, 1, 'the walk keeps it'); w.reset(); assert.equal(w.G.list().length, 0);
  report.stays = {mine: mine.length, brokenAfterTwoMinutes: after, note: 'the enemies and the squad shot out the others'};
});

await check('coop', 'host and guest have the same panes broken and agree on sight and shots: a pane the host shoots out is broken on the guest\'s page within a snapshot; a pane the guest shoots out (its shot judged by the host) is broken on both; with both broken, sight through each is the same on both pages, and through a whole pane likewise; the guest\'s next shot through its hole hits the enemy behind it on the host; a guest walking through a window breaks it on both; a guest page cannot break a pane by itself; a pane whose message is lost is put right by the next snapshots, and so is a page with as many panes broken but not the same ones; a new mission makes every pane whole on both', async () => {
  const p = await pair(), {host, guest} = p, H = host.glass.G, Gu = guest.glass.G, pane = (x, y, z) => { let best = -1, bd = 1e9; H.panes.forEach((q, i) => { const d = Math.hypot(q.at[0] - x, q.at[1] - y, q.at[2] - z); if (d < bd) { bd = d; best = i; } }); return best; };
  assert.equal(H.count, Gu.count); p.place('host', -18, 0, 64); p.place('guest', -18, 0, 66.5); const p1 = pane(WEST, 1.5, 64), p2 = pane(WEST, 1.5, 66.5), p3 = pane(WEST, 1.5, 69);
  const same = what => { assert.deepEqual(Gu.list(), H.list(), `${what}: the same panes on both pages`); assert.deepEqual(Gu.sum(), H.sum()); };
  host.hitScan(V(-18, 1.5, 64), X.clone(), RIFLE, 'local'); assert.deepEqual(H.list(), [p1]); assert.deepEqual(Gu.list(), [], 'not yet on the guest (two frames on the way)'); p.step(p.delay + 1); same('the host\'s shot, by its message (before any snapshot could put it right)'); p.sync();
  const foe = enemies(host)[0]; Object.assign(foe, {hp: 100, dead: 0, gone: false, sink: null, diedAt: null}); foe.g.visible = true; foe.resetPose(); foe.g.position.set(-10.5, FLOORS[0], 66.5); foe.blindUntil = Infinity; foe.ai = {role: 'patrol', loop: 'HALLS', dir: 1, lastHp: 100}; host.ai.startPatrol(foe, 'HALLS'); foe.route = []; p.sync();
  const shot = () => host.receive({type: 'shot', dir: [1, 0, 0], o: [-18, 1.5, 66.5], w: 0, at: host.coop.elapsed() - .05});
  shot(); assert(H.broken[p2] && foe.hp === 100, 'the guest\'s shot broke the pane and went no further'); p.step(p.delay + 1); same('the guest\'s shot'); p.sync();
  for (const [a, b, open] of [[V(-18, 1.5, 64), V(-10.5, 1.5, 64), true], [V(-10.5, 1.5, 66.5), V(-18, 1.5, 66.5), true], [V(-18, 1.5, 69), V(-10.5, 1.5, 69), false]]) { assert.equal(host.glass.visible(a, b), open); assert.equal(guest.glass.visible(a, b), open, 'the guest\'s page agrees'); assert.equal(guest.glass.clear(b, a), open); }
  shot(); assert(foe.hp < 100, 'the guest\'s next shot goes through and hits'); assert(!H.broken[p3]);
  // A guest through a window: the host breaks it from the guest's pose.
  const up = pane(WEST, FLOORS[1] + 1.5, 69), at = H.panes[up].at; p.place('guest', at[0] + .1, FLOORS[1] + .45, at[2]); p.run(.3); assert(H.broken[up], 'the guest\'s body broke it on the host'); same('a body');
  // The guest by itself breaks nothing; a lost message is put right.
  assert.equal(guest.glass.break(p3), false); assert(!Gu.broken[p3]); p.drop = m => m.type === 'glass'; host.hitScan(V(-18, 1.5, 69), X.clone(), RIFLE, 'local'); p.step(3); assert(H.broken[p3] && !Gu.broken[p3], 'the message was lost'); p.drop = null; p.run(1.2); same('after the lost message');
  assert(p.log.toHost.some(m => m.type === 'glassAsk') && p.log.toGuest.some(m => m.type === 'glassAll'), 'asked for and sent'); const asks = p.log.toHost.filter(m => m.type === 'glassAsk').length; p.run(2); assert.equal(p.log.toHost.filter(m => m.type === 'glassAsk').length, asks, 'and not asked again once they agree');
  // As many broken but not the same ones (a page that went wrong): put right as well.
  const spare = H.panes.findIndex((q, i) => !H.broken[i]); Gu.set([...H.list().slice(1), spare]); assert.equal(Gu.sum()[0], H.sum()[0]); assert.notDeepEqual(Gu.list(), H.list()); p.run(1.2); same('as many but other panes');
  const broken = H.list().length; p.deploy(); same('a new mission'); assert.equal(H.list().length, 0); assert(!guest.glass.visible(V(-18, 1.5, 64), V(-10.5, 1.5, 64)));
  report.coop = {panes: H.count, brokenOnBoth: broken, delayFrames: p.delay, note: 'one process, a stand-in connection: what two networks do is not shown'};
});

await check('leak', 'nothing is made or left by breaking: 30 missions of 40 panes each (shots, breaks outright, a blast, then a reset) leave the scene with the objects, geometries and materials it started with, no effect waiting and every pane whole; the glass and its fittings are four drawings throughout', async () => {
  const g = await world(), G = g.G; g.nobody(); g.put(0, 0, 40); g.run(1); const before = drawn(g), fx0 = g.glass.effects.length; let broke = 0;
  for (let round = 0; round < 30; round++) { for (let k = 0; k < 40; k++) { const i = (round * 37 + k * 7) % G.count, q = G.panes[i], thinX = q.size[0] < q.size[2], o = V(q.at[0] + (thinX ? -3 : 0), q.at[1], q.at[2] + (thinX ? 0 : -3)); if (k % 3 === 0) g.glass.break(i) && broke++; else { const e = g.hitScan(o, thinX ? X.clone() : V(0, 0, 1), RIFLE, 'local'); void e; if (G.broken[i]) broke++; } }
    g.glass.blast(V(-15, .4, 66.7), 'local'); g.run(.4); assert(G.list().length >= 20, `round ${round}: ${G.list().length} broken`); g.reset(); g.play(); g.nobody(); assert.equal(G.list().length, 0); }
  g.run(1); const after = drawn(g); assert.deepEqual(after, before, 'the scene as it was'); assert.equal(g.glass.effects.length, fx0, 'no effect left'); assert.equal(g.scene.children.filter(o => o.userData.glass).length, 4);
  report.leak = {rounds: 30, panesBroken: broke, scene: after};
});

console.log(JSON.stringify({...(ONLY ? {partial: ONLY} : {}), passed: results.length, checks: results, report, limitations: [
  'Headless: how a broken window looks, how the wider stairs feel and the frame time with many panes broken are for the user in Safari (B25).',
  'The co-op check is a host and a guest in one process with a stand-in connection: what two networks or two people do is not shown.',
  'An enemy\'s hit on the player is by chance; the enemies check requires the firing, not the hit.']}, null, 2));
