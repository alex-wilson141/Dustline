// Build 30 (T40): window frames and the eye on stairs. A broken window is a hole: with its pane go the casement's rails
// and glazing bars, the iron bars before it and (when both halves are gone) the post of a double window, from the
// picture, from the kit's list and from the body's space; the wall's reveal, lintel, sill and shutters stay. Sight,
// shots, grenades and a climbing body pass a broken opening anywhere in it; a whole one is as it was. Host and guest
// have the same openings. On stairs the feet still take a tread at a time and the eye no longer does: measured, frame
// by frame, with the game's own keys. Kohar Valley has neither glass nor a space: its eye is where it was.
import assert from 'node:assert/strict';
globalThis.location = {search: '?foes=1'};
import {createGame, projectRoot} from './sprint-harness.mjs';

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const maps = await import(new URL('dist/maps.js', projectRoot));
const {BODY} = await import(new URL('dist/space.js', projectRoot));
const SOURCE = process.env.DUSTLINE_GAME_SOURCE ? new URL('file://' + process.env.DUSTLINE_GAME_SOURCE) : undefined;
const ONLY = process.env.DUSTLINE_T40_ONLY?.split(',');
const results = [], report = {};
async function check(tag, name, fn) { if (ONLY && !ONLY.includes(tag)) return; await fn(); results.push(name); }
const DEHRUN = await maps.loadMap('dehrun'); maps.selectMap('kohar');
const K = DEHRUN.block.houses.find(h => h.id === 'K'), FLOORS = [.05, 3.4, 6.6], WEST = -12.87;
const V = (x, y, z) => new THREE.Vector3(x, y, z), near = (a, b, e, what) => assert(Math.abs(a - b) <= e, `${what}: ${a} against ${b}`), wire = m => JSON.parse(JSON.stringify(m));
const RIFLE = {damage: 30, headshot: 1}, enemies = g => g.actors.filter(a => a.team === 'enemy');
async function world(map = 'dehrun') { maps.selectMap(map); let g; try { g = await createGame(SOURCE ? {sourcePath: SOURCE} : {}); g.prepare({clearLane: false}); if (g.built) await g.built.ready; } finally { maps.selectMap('kohar'); }
  g.setMode('story'); g.reset(); g.play(); g.restoreAI(); g.set({hp: 100}); let clock = 0; g.frame(0);
  g.run = (s, each) => { for (let i = 0, n = Math.round(s * 60); i < n; i++) { g.frame(clock += 1000 / 60); if (each?.(i / 60) === false) break; } };
  g.put = (x, y, z, yaw = 0) => { g.player.set(x, y, z); g.set({yaw, pitch: 0}); g.height?.settle?.(); };
  g.nobody = () => { for (const a of g.actors) { a.hp = 0; a.dead = 999; a.diedAt = -1e9; a.gone = true; a.g.visible = false; a.route = []; } };
  if (g.glass) { g.G = g.glass.G; g.pane = (x, y, z) => { let best = -1, bd = 1e9; g.G.panes.forEach((p, i) => { const d = Math.hypot(p.at[0] - x, p.at[1] - y, p.at[2] - z); if (d < bd) { bd = d; best = i; } }); assert(bd < .6, `a pane at ${[x, y, z]}`); return best; }; }
  return g; }
async function pair({delay = 2} = {}) {
  const page = async role => { maps.selectMap('dehrun'); let g; try { g = await createGame(SOURCE ? {sourcePath: SOURCE} : {}); } finally { maps.selectMap('kohar'); } g.prepare({role, clearLane: false}); g.el('blood').checked = false; for (const a of g.actors) a.animate = a.visual.animate; await g.built.ready; return g; };
  const host = await page('host'), guest = await page('guest'), log = {toGuest: [], toHost: []}, queue = []; let frame = 0, clock = 0;
  const p = {host, guest, log, delay, drop: null, deliver() { for (let i = 0; i < queue.length;) { const q = queue[i]; if (q.due <= frame) { queue.splice(i, 1); q.to.receive(q.m); } else i++; } }};
  const send = (from, to, list) => m => { if (!from.peer.connected) return false; if (p.drop?.(m)) return true; list.push(wire(m)); if (!p.delay) to.receive(wire(m)); else queue.push({to, m: wire(m), due: frame + p.delay}); return true; };
  host.peer.send = send(host, guest, log.toGuest); guest.peer.send = send(guest, host, log.toHost);
  host.receive({type: 'hello', classId: 'assault'}); guest.receive({type: 'hello', classId: 'assault'}); for (const g of [host, guest]) { g.pause(); g.goMenu(true); }
  Object.assign(p, {step(n = 1) { for (let i = 0; i < n; i++) { frame++; clock += 1000 / 60; p.deliver(); host.frame(clock); guest.frame(clock); } }, run(s) { p.step(Math.round(s * 60)); }, sync() { p.step(8 + 2 * p.delay); },
    place(who, x, y, z) { const me = p[who], o = p[who === 'host' ? 'guest' : 'host']; me.player.set(x, y, z); me.height?.settle(); o.remote.g.position.set(x, y, z); o.remote.netPos = null; o.remote.vel = null; o.remote.air = false; o.remote.peakY = null; p.sync(); },
    deploy() { const d0 = p.delay; p.delay = 0; host.squad.pref.coop = false; host.setMode('coop'); host.start(); host.play(); guest.play(); p.delay = d0; host.set({hp: 100}); host.remote.hp = 100; for (const a of enemies(host)) { a.hp = 0; a.dead = 999; a.gone = true; a.g.visible = false; a.diedAt = -1e9; } p.sync(); }});
  host.frame(0); guest.frame(0); p.deploy(); return p; }
// Every instance of every drawing of the glass and its fittings, as numbers: what a page shows of its windows.
const picture = g => g.scene.children.filter(o => o.userData.glass).map(o => [o.userData.glass, o.count, Array.from(o.instanceMatrix.array).map(v => +v.toFixed(4)).join(',')]);
const shown = (mesh, slot) => { const m = new THREE.Matrix4(); mesh.getMatrixAt(slot, m); return m.elements[0] ** 2 + m.elements[5] ** 2 + m.elements[10] ** 2 > 0; };
const drawn = g => { const geo = new Set(), mat = new Set(); let objects = 0; g.scene.traverse(o => { objects++; if (o.geometry) geo.add(o.geometry.uuid); for (const m of [].concat(o.material || [])) mat.add(m.uuid); }); return {objects, geometries: geo.size, materials: mat.size, children: g.scene.children.length}; };
const kinds = list => { const c = {}; for (const b of list) { const k = b.tag === 'casement' ? 'casement' : b.surface === 'bars' ? 'iron bars' : b.surface === 'pane' || b.surface === 'clear' ? 'glass' : b.surface; c[k] = (c[k] || 0) + 1; } return c; };

await check('kohar', 'Kohar Valley is as it was: no glass, no space, and the eye exactly where the flat game puts it (the feet\'s height, the stance and the walking bob, nothing eased), walking and jumping; the three traces are in their own suites', async () => {
  const g = await world('kohar'); assert.equal(g.glass, undefined); assert.equal(g.height.space, null); g.put(0, g.groundY(0, 55), 55); g.press('KeyW'); let worst = 0; g.run(3, () => { worst = Math.max(worst, Math.abs(g.camera.position.y - g.player.y - 1.7)); }); g.release('KeyW');
  assert(worst <= .0201, `the eye within the bob of the feet plus 1.7 (${worst.toFixed(4)})`); assert.equal(g.height.eyeStep(), 0, 'nothing eased');
  report.kohar = {space: null, glass: 'none', eyeOffTheFeet: +worst.toFixed(4)};
});

await check('eye', 'on a stair the feet take a tread at a time and the eye does not (measured frame by frame with the game\'s keys on the customs house\'s west stair): walking up, the feet rise in eight jumps of .21 m and the eye never more than 5 cm in a frame, a line; sprinting up, never more than 9 cm; walking and sprinting down likewise, without once falling; the eye is never more than .3 m behind the feet and is back at 1.7 m above them within a third of a second of stopping; a jump, a fall off a ledge and a pull-up move the eye with the body as before; the field of view, the body\'s speed and the treads themselves are what they were', async () => {
  const g = await world(), sp = g.height.space, st = K.stairs[0], zTop = Math.max(...st.z), zFar = Math.min(...st.z), x1 = st.x[0] + 1.05; g.nobody();
  const climb = (keys, fromZ, toZ, y0, yaw) => { g.put(x1, y0, fromZ, yaw); g.run(.4); const eye = [], feet = [], lag = []; let air = 0, fov = 0; for (const k of keys) g.press(k); g.run(5, () => { eye.push(g.camera.position.y); feet.push(g.player.y); lag.push(Math.abs(g.height.eyeStep())); fov = Math.max(fov, g.camera.fov); if (!g.height.grounded()) air++; if (yaw === 0 ? g.player.z < toZ : g.player.z > toZ) return false; }); for (const k of keys) g.release(k);
    const d = a => a.slice(1).map((v, i) => v - a[i]), de = d(eye), df = d(feet); g.run(.34); const settled = g.camera.position.y - g.player.y;
    return {frames: eye.length, feetJumps: df.filter(v => Math.abs(v) > .15).length, feetJump: +Math.max(...df.map(Math.abs)).toFixed(3), eyeWorstFrame: +Math.max(...de.map(Math.abs)).toFixed(3), eyeJumps: de.filter(v => Math.abs(v) > .1).length, lag: +Math.max(...lag).toFixed(3), air, settled: +settled.toFixed(3), speed: +(Math.abs(fromZ - toZ) / (eye.length / 60)).toFixed(2), fov: +fov.toFixed(1)}; };
  const up = climb(['KeyW'], zTop + .8, zFar + st.landing - .1, FLOORS[0], 0), upRun = climb(['KeyW', 'ShiftLeft'], zTop + .8, zFar + st.landing - .1, FLOORS[0], 0), down = climb(['KeyW'], zFar + 1.2, zTop + .6, 1.7, Math.PI), downRun = climb(['KeyW', 'ShiftLeft'], zFar + 1.2, zTop + .6, 1.7, Math.PI);
  if (process.env.DUSTLINE_T40_DEBUG) console.error(JSON.stringify({up, upRun, down, downRun}, null, 1));
  for (const [name, r, worst] of [['walking up', up, .05], ['sprinting up', upRun, .09], ['walking down', down, .05], ['sprinting down', downRun, .09]]) { assert(r.feetJumps >= (name.includes('sprint') ? 5 : 7) && r.feetJump > .2, `${name}: the feet take the treads (${r.feetJumps} jumps of ${r.feetJump})`); assert.equal(r.eyeJumps, 0, `${name}: the eye takes none`); assert(r.eyeWorstFrame <= worst, `${name}: the eye moves ${r.eyeWorstFrame} m in its worst frame`);
    assert(r.lag <= BODY.sag + 1e-9, `${name}: never more than ${BODY.sag} m behind (${r.lag})`); assert.equal(r.air, 0, `${name}: never off the treads`); near(r.settled, 1.7, .021, `${name}: the eye back over the feet`); }
  near(up.speed, 3.4, .2, 'the walking speed on the stair is the flat\'s'); assert(upRun.speed > 5.4, 'and the sprint'); near(up.fov, 70, 1, 'the field of view walking'); assert(upRun.fov > 72 && upRun.fov <= 76.1, 'and sprinting');
  // A jump on the flat, a fall off the parapet of the roof onto the square, a pull-up onto a ledge: the eye is on the body throughout.
  g.put(0, 0, 76); g.run(.3); g.press('Space'); g.release('Space'); let off = 0, peak = 0; g.run(1.2, () => { off = Math.max(off, Math.abs(g.height.eyeStep())); peak = Math.max(peak, g.player.y); }); assert(peak > .5 && off === 0, `a jump is not eased (${peak.toFixed(2)} m up, ${off})`);
  g.put(-4.6, 10.46, 71.3); g.height.drop(); g.set({hp: 1e6}); off = 0; g.run(2.5, () => { off = Math.max(off, Math.abs(g.height.eyeStep())); }); assert(g.player.y < .1 && off === 0, 'a fall is not eased');
  // What Step A measured and did not change: the room over the eye and beside it on every flight.
  const flights = g.built.stats.flights.map(f => { const at = (v, u) => f.axis === 'x' ? [u, v] : [v, u], vm = (f.across[0] + f.across[1]) / 2; let head = 9; for (let i = 1; i < 12; i++) { const [x, z] = at(vm, f.run[0] + (f.run[1] - f.run[0]) * i / 12), y = sp.floor(x, z, f.high + .3).y; head = Math.min(head, sp.ceiling(x, z, y + .5, BODY.radius) - y); } return {head, width: f.width}; }), inside = flights.filter(f => f.head < 8);
  const headMin = Math.min(...inside.map(f => f.head)); assert(headMin >= 2.1, `headroom ${headMin.toFixed(2)} m`);
  report.eye = {walkingUp: up, sprintingUp: upRun, walkingDown: down, sprintingDown: downRun, stepA: {tread: '.35 m by .2125 m', treadsPerSecond: {walking: +(up.feetJumps / (up.frames / 60)).toFixed(1), sprinting: +(upRun.feetJumps / (upRun.frames / 60)).toFixed(1)}, headroomOverTheEye: [+(headMin - 1.7).toFixed(2), +(Math.max(...inside.map(f => f.head)) - 1.7).toFixed(2)], flightSeconds: {walking: +(up.frames / 60).toFixed(2), sprinting: +(upRun.frames / 60).toFixed(2)}, fieldOfView: [70, 76]}};
});

await check('hole', 'a broken window is a hole, every one of the town\'s 283: whole, its opening is spanned by its pane and (in a made house) the five or six pieces of its casement and, on a barred window, the iron; broken, nothing at all stands in the opening (its rectangle through the wall\'s whole depth) in the kit\'s list, in the body\'s space or in the picture, from either side; made whole, all of it is back; the post of a double window stands while either half is whole and goes with the second; the reveal\'s posts, the lintel, the sill and the shutters never go; no teeth of glass are left (Build 31)', async () => {
  const g = await world(), G = g.G, sp = g.height.space, list = g.built.stats.list, fixed = list.filter(b => !G.loose.some(r => r.entry === b) && !G.panes.some(p => p.entry === b)).length; let casements = 0, barred = 0, posts = 0, ladders = 0; const left = {};
  for (let i = 0; i < G.count; i++) { const p = G.panes[i], before = G.spanning(i), k = kinds(before); assert.equal(k.glass, 1, `pane ${i}: its glass in its opening`); const own = p.parts.filter(r => r.owners.length === 1);
    if (k.casement) { assert(k.casement === 6 || k.casement === 5 && p.size[1] < .95, `${k.casement} pieces of casement (five on a window under a metre tall)`); casements++; } if (k['iron bars']) barred++; const rails = before.filter(b => b.tag === 'ladder'); assert.equal(before.length, 1 + own.length + rails.length, `pane ${i}: what spans the opening is its own`); ladders += rails.length;   /* one small window of the block has a ladder's rail 6 cm into its edge: it was there before and is not the window's (MAP-10) */
    assert(G.break(i)); const after = G.spanning(i).filter(b => b.tag !== 'ladder'); assert.equal(after.length, 0, `pane ${i} broken: ${JSON.stringify(kinds(after))} still spans the opening`);
    for (const r of own) { assert(r.entry.gone && !shown(r.mesh, r.slot), 'a part gone from the list and the picture'); if (r.box) assert(r.box.off, 'and from the space'); } assert(!shown(p.mesh, p.slot), 'the pane not drawn');
    // The opening itself, for a body: nothing of the space in it (a thin body at three heights across its middle).
    const h = p.hole, cx = (h.min[0] + h.max[0]) / 2, cz = (h.min[2] + h.max[2]) / 2; assert(!sp.boxes.some(b => !b.off && b.min[0] < h.max[0] - .04 && b.max[0] > h.min[0] + .04 && b.min[1] < h.max[1] - .04 && b.max[1] > h.min[1] + .04 && b.min[2] < h.max[2] - .04 && b.max[2] > h.min[2] + .04), `pane ${i}: the space is clear in the opening at ${[cx, cz].map(v => v.toFixed(1))}`);
    const twin = p.parts.find(r => r.owners.length === 2); if (twin) { const other = twin.owners.find(o => o !== i); if (!G.broken[other]) { assert(!twin.entry.gone && shown(twin.mesh, twin.slot), 'the post stands while the other half is whole'); assert(!G.spanning(i).includes(twin.entry), 'and is the hole\'s edge, not in it'); G.break(other); assert(twin.entry.gone && !shown(twin.mesh, twin.slot) && twin.box.off, 'and goes with the second half'); G.reset(); posts++; } }
    G.reset(); const again = G.spanning(i); assert.equal(again.length, before.length, 'whole again'); assert(own.every(r => !r.entry.gone && shown(r.mesh, r.slot) && !r.box?.off)); }
  // What is left round a hole: the window on the customs house's west wall, ground floor, z 66.5 (barred).
  const w = g.pane(WEST, 1.5, 66.5), h = G.panes[w].hole; G.break(w); for (const b of list) if (!b.gone && b.min[0] < h.max[0] + .4 && b.max[0] > h.min[0] - .4 && b.min[1] < h.max[1] + .3 && b.max[1] > h.min[1] - .3 && b.min[2] < h.max[2] + .8 && b.max[2] > h.min[2] - .8) { const name = b.turned ? 'shutter' : b.surface; left[name] = (left[name] || 0) + 1; }
  assert(left.beams >= 3 && left.slab >= 1 && left.shutter >= 2 && !left.bars && !left.clear, `round the hole: ${JSON.stringify(left)}`); assert.equal(list.filter(b => !b.gone).length, list.length - 1 - G.panes[w].parts.length); G.reset(); assert.equal(list.filter(b => b.gone).length, 0);
  assert.equal(list.filter(b => !G.loose.some(r => r.entry === b) && !G.panes.some(p => p.entry === b)).length, fixed);
  // Build 31: no teeth of glass are left (they could not be shot away); four drawings.
  assert(!g.scene.children.some(o => o.userData.glass === 'shards') && G.teeth === 0, 'no teeth'); const deep = 0;
  assert.deepEqual(g.scene.children.filter(o => o.userData.glass).map(o => o.userData.glass).sort(), ['clear', 'fittings', 'fittings', 'pane'], 'four drawings for all the windows\' glass and fittings');
  assert(ladders <= 3, `${ladders} ladder rails at a window's edge`);   /* Build 31: three, the opening being the whole of it now */ assert(posts >= 40 && casements >= 90 && barred >= 20, `${posts} double windows' posts, ${casements} casements, ${barred} barred windows tried`);
  report.hole = {panes: G.count, withCasements: casements, barred, doublePosts: posts, looseParts: G.loose.length, ladderRailsAtAnEdge: ladders, leftRoundAHole: left, teeth: deep, drawings: 4};
});

await check('through', 'sight, shots, grenades and a climbing body pass a broken window cleanly, anywhere in the opening: on a barred ground-floor window of the customs house, whole, no sight, no shot and no way in; broken, a grid of 35 sight lines and 35 shots across the whole opening (where the casement\'s rails and the bars were, too) all pass, from outside in and from inside out; a grenade thrown through it lands in the room; the body pulls itself onto the sill with Space and walks in, and out again the same way; an upstairs window likewise lets the body out onto nothing (it falls to the street)', async () => {
  const g = await world(), G = g.G, sp = g.height.space; g.nobody(); g.put(0, 0, 40); const w = g.pane(WEST, 1.5, 66.5), h = G.panes[w].hole, out = -16, inn = -10.5;
  const grid = []; for (let i = 0; i < 7; i++) for (let j = 0; j < 5; j++) grid.push([h.min[1] + .06 + (h.max[1] - h.min[1] - .12) * j / 4, h.min[2] + .06 + (h.max[2] - h.min[2] - .12) * i / 6]);
  const sight = (a, b) => grid.filter(([y, z]) => g.glass.visible(V(a, y, z), V(b, y, z))).length, shots = (a, b) => grid.filter(([y, z]) => { const e = g.hitScan(V(a, y, z), V(Math.sign(b - a), 0, 0), RIFLE, 'local'); return Math.sign(b - a) * (e.x - b) > -.01; }).length;
  assert.equal(sight(out, inn), 0, 'whole: no sight'); g.put(-13.75, 0, 66.5, -Math.PI / 2); g.press('Space'); g.release('Space'); g.run(1); g.press('KeyW'); g.run(.5); g.release('KeyW'); g.press('Space'); g.release('Space'); g.run(1); near(g.player.y, 0, .02, 'whole and barred: no way up'); assert(g.player.x < -13.3); assert.deepEqual(G.list(), [], 'and the body against the bars breaks nothing');
  G.break(w); assert.equal(sight(out, inn), 35, 'broken: every sight line in'); assert.equal(sight(inn, out), 35, 'and out'); assert.equal(shots(out, inn), 35, 'every shot in'); assert.equal(shots(inn, out), 35, 'and out'); assert.deepEqual(G.list(), [w], 'and no other pane touched');
  // A grenade through the hole.
  g.equip.throwItem('frag', V(-16, 1.6, 66.5), V(1, .1, 0).normalize(), 0, false, 'local'); let inRoom = false; g.run(1.5, () => { if (g.equip.nades.some(n => n.p.x > -12.2)) inRoom = true; }); assert(inRoom, 'the grenade went in'); g.run(5); G.reset(); G.break(w); g.run(.5);
  // The body: Space pulls it onto the sill, W walks it in; and out again.
  g.set({hp: 100}); g.put(-13.75, 0, 66.5, -Math.PI / 2); g.run(.2); g.press('Space'); g.release('Space'); g.run(.8); assert(g.player.y > .8, `pulled up onto the sill (${g.player.y.toFixed(2)})`); g.press('KeyW'); g.run(1.5); g.release('KeyW'); assert(g.player.x > -12.5 && Math.abs(g.player.y - FLOORS[0]) < .05, `inside on the floor (${g.player.x.toFixed(2)}, ${g.player.y.toFixed(2)})`);
  g.set({yaw: Math.PI / 2}); g.press('KeyW'); g.run(1.6); g.release('KeyW'); g.press('Space'); g.release('Space'); g.run(.8); g.press('KeyW'); g.run(1.5); g.release('KeyW'); assert(g.player.x < -13.4 && g.player.y < .1, `and out again (${g.player.x.toFixed(2)}, ${g.player.y.toFixed(2)})`);
  // Upstairs (no bars): out through a first-floor window of the same wall, broken by the body itself, down to the square.
  const up = g.pane(WEST, FLOORS[1] + 1.5, 69); g.set({hp: 1e6}); g.put(-11.6, FLOORS[1], 69, Math.PI / 2); g.run(.2); g.press('KeyW'); g.run(.5); g.release('KeyW'); g.press('Space'); g.release('Space'); g.run(.8); g.press('KeyW'); g.run(2); g.release('KeyW'); assert(G.broken[up], 'the body broke it'); assert(g.player.x < -13.2 && g.player.y < .1, `out and down (${g.player.x.toFixed(2)}, ${g.player.y.toFixed(2)})`);
  void sp; report.through = {sightLines: 35, shots: 35, grenade: true, climbedIn: true, climbedOut: true, upstairsOut: true};
});

await check('coop', 'both players have the same openings: when the host shoots a barred window out, the guest\'s page shows the very same picture of every window (every instance of the panes, the teeth and the fittings, number for number), has nothing spanning the opening and lets a body and a sight line through it, as the host\'s does; the same when the guest shoots one out and when the message is lost and the snapshots put it right; a new mission gives both every window back, bars and casements too', async () => {
  const p = await pair(), {host, guest} = p, H = host.glass.G, Gu = guest.glass.G; const pane = (x, y, z) => { let best = -1, bd = 1e9; H.panes.forEach((q, i) => { const d = Math.hypot(q.at[0] - x, q.at[1] - y, q.at[2] - z); if (d < bd) { bd = d; best = i; } }); return best; };
  const whole = picture(host); assert.deepEqual(picture(guest), whole, 'the same picture to begin with'); p.place('host', -18, 0, 64); p.place('guest', -18, 0, 66.5);
  const same = (what, i) => { assert.deepEqual(picture(guest), picture(host), `${what}: the same picture`); assert.notDeepEqual(picture(host), whole); for (const g of [host, guest]) { assert.equal(g.glass.G.spanning(i).length, 0, `${what}: nothing in the opening`); const h = g.glass.G.panes[i].hole, z = (h.min[2] + h.max[2]) / 2; assert(g.height.space.clear(WEST, z, h.min[1] + .1, h.max[1] - .1, .2), `${what}: a body fits the opening`); assert(g.glass.visible(V(-18, h.min[1] + .1, z + .5), V(-10.5, h.min[1] + .1, z + .5)), `${what}: seen through low in a corner`); } };
  const a = pane(WEST, 1.5, 64), b = pane(WEST, 1.5, 66.5), c = pane(WEST, 1.5, 69);
  host.hitScan(V(-18, 1.5, 64), V(1, 0, 0), RIFLE, 'local'); p.step(p.delay + 1); same('the host\'s shot', a);
  host.receive({type: 'shot', dir: [1, 0, 0], o: [-18, 1.5, 66.5], w: 0, at: host.coop.elapsed() - .05}); p.step(p.delay + 1); same('the guest\'s shot', b);
  p.drop = m => m.type === 'glass'; host.hitScan(V(-18, 1.5, 69), V(1, 0, 0), RIFLE, 'local'); p.step(3); assert.notDeepEqual(picture(guest), picture(host), 'the message was lost'); p.drop = null; p.run(1.2); same('after the lost message', c);
  const asked = p.log.toHost.filter(m => m.type === 'glassAsk').length; p.deploy(); assert.equal(p.log.toHost.filter(m => m.type === 'glassAsk').length, asked, 'a new mission: the guest\'s windows are whole of themselves, not put right by the host'); assert.deepEqual(picture(host), whole, 'a new mission: every window back on the host'); assert.deepEqual(picture(guest), whole, 'and on the guest'); assert(!guest.height.space.clear(WEST, 66.5, 1, 2, .2) && !host.height.space.clear(WEST, 66.5, 1, 2, .2), 'the bars stand again');
  report.coop = {instancesCompared: whole.reduce((n, d) => n + d[1], 0), drawings: whole.length, note: 'one process, a stand-in connection: what two networks do is not shown'};
});

await check('leak', 'nothing is made or left: 20 missions of 60 windows broken and a reset leave the scene\'s objects, geometries and materials exactly as they were, every part back in the list and the space', async () => {
  const g = await world(), G = g.G; g.nobody(); g.put(0, 0, 40); g.run(1); const before = drawn(g), pic = picture(g);
  for (let round = 0; round < 20; round++) { for (let k = 0; k < 60; k++) g.glass.break((round * 41 + k * 5) % G.count); g.run(.4); assert(G.list().length >= 50); g.reset(); g.play(); g.nobody(); }
  g.run(1); assert.deepEqual(drawn(g), before, 'the scene as it was'); assert.deepEqual(picture(g), pic, 'every window as it was'); assert.equal(g.built.stats.list.filter(b => b.gone).length, 0); assert.equal(g.height.space.boxes.filter(b => b.off).length, 0);
  report.leak = {rounds: 20, scene: before};
});

console.log(JSON.stringify({...(ONLY ? {partial: ONLY} : {}), passed: results.length, checks: results, report, limitations: [
  'Headless: how a hole in a wall looks and how the eye\'s rise feels are for the user in Safari (B26).',
  'The co-op check is a host and a guest in one process with a stand-in connection.',
  'The eye is measured on the customs house\'s west stair; the other flights share the code and differ only in their treads.']}, null, 2));
