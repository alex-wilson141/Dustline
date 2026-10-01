// Build 31 (T41): stair width and glass corners. Every part of every window is the pane to a shot: its four corners, its
// four edges and its middle, on every kind (single, barred, double, a shell's), and on a double window the post between
// the halves as well; a broken opening is clear to its corners for sight, shots, grenades and a climbing body, and nothing
// (no teeth of glass) is left in it. Every stair is 2.4 m clear with landings, wells, entries and roof doors no tighter;
// no place in or round the customs house is without a way back; the eye on stairs is Build 30's, text and behaviour.
import assert from 'node:assert/strict';
import fs from 'node:fs';
globalThis.location = {search: '?foes=1'};
import {createGame, projectRoot} from './sprint-harness.mjs';

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const maps = await import(new URL('dist/maps.js', projectRoot));
const {BODY} = await import(new URL('dist/space.js', projectRoot));
const {FOE} = await import(new URL('dist/navmesh.js', projectRoot));
const SOURCE = process.env.DUSTLINE_GAME_SOURCE ? new URL('file://' + process.env.DUSTLINE_GAME_SOURCE) : undefined;
const ONLY = process.env.DUSTLINE_T41_ONLY?.split(',');
const results = [], report = {};
async function check(tag, name, fn) { if (ONLY && !ONLY.includes(tag)) return; await fn(); results.push(name); }
const DEHRUN = await maps.loadMap('dehrun'); maps.selectMap('kohar');
const B = DEHRUN.block, K = B.houses.find(h => h.id === 'K'), FLOORS = [.05, 3.4, 6.6], ROOF = 9.83, WEST = -12.87;
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
  const host = await page('host'), guest = await page('guest'), queue = []; let frame = 0, clock = 0; const p = {host, guest, delay};
  const send = (from, to) => m => { if (!from.peer.connected) return false; if (!p.delay) to.receive(wire(m)); else queue.push({to, m: wire(m), due: frame + p.delay}); return true; };
  host.peer.send = send(host, guest); guest.peer.send = send(guest, host);
  host.receive({type: 'hello', classId: 'assault'}); guest.receive({type: 'hello', classId: 'assault'}); for (const g of [host, guest]) { g.pause(); g.goMenu(true); }
  Object.assign(p, {step(n = 1) { for (let i = 0; i < n; i++) { frame++; clock += 1000 / 60; for (let k = 0; k < queue.length;) { const q = queue[k]; if (q.due <= frame) { queue.splice(k, 1); q.to.receive(q.m); } else k++; } host.frame(clock); guest.frame(clock); } }, sync() { p.step(8 + 2 * p.delay); },
    deploy() { const d0 = p.delay; p.delay = 0; host.squad.pref.coop = false; host.setMode('coop'); host.start(); host.play(); guest.play(); p.delay = d0; host.set({hp: 100}); host.remote.hp = 100; for (const a of enemies(host)) { a.hp = 0; a.dead = 999; a.gone = true; a.g.visible = false; a.diedAt = -1e9; } p.sync(); }});
  host.frame(0); guest.frame(0); p.deploy(); return p; }
// A window's opening as a pane knows it: which way the wall runs, which way is out, and nine places in it (the four
// corners, the four edges, the middle), each `inset` in from the opening's own edge.
const NAMES = ['bottom-left', 'bottom', 'bottom-right', 'left', 'middle', 'right', 'top-left', 'top', 'top-right'];
function opening(p, inset = .02) { const h = p.hole, k = h.max[0] - h.min[0] < h.max[2] - h.min[2] ? 0 : 2, a = 2 - k, mid = (h.min[k] + h.max[k]) / 2, out = Math.sign(p.at[k] - mid) || 1;
  const pts = []; for (const y of [h.min[1] + inset, (h.min[1] + h.max[1]) / 2, h.max[1] - inset]) for (const u of [h.min[a] + inset, (h.min[a] + h.max[a]) / 2, h.max[a] - inset]) pts.push([u, y]);
  const at = ([u, y], d) => { const v = [0, y, 0]; v[k] = (out > 0 ? h.max[k] : h.min[k]) + out * d; v[a] = u; return V(...v); }, dir = s => { const v = [0, 0, 0]; v[k] = -out * s; return V(...v); };
  return {k, a, out, pts, at, dir, wide: h.max[a] - h.min[a], tall: h.max[1] - h.min[1], thick: h.max[k] - h.min[k]}; }
// The opening as the wall has it, found by rays and not taken from the kit's word: with the pane broken, from the middle of
// the opening outward along the wall and up and down, the last place a line from outside to the glass's plane is clear
// (the reveal's posts, the sill and the lintel stop it; on a double window the other half's whole pane does).
function measured(g, i) { const G = g.G, p = G.panes[i], o = opening(p), h = p.hole, cu = (h.min[o.a] + h.max[o.a]) / 2, cy = (h.min[1] + h.max[1]) / 2; G.reset(); G.break(i);
  const open = (u, y) => { const a = [0, y, 0], b = [0, y, 0]; a[o.a] = b[o.a] = u; a[o.k] = (o.out > 0 ? h.max[o.k] : h.min[o.k]) + o.out; b[o.k] = p.at[o.k] - o.out * .01; return g.glass.clear(V(...a), V(...b)); };
  assert(open(cu, cy), `pane ${i}: its middle is open when broken`); const edge = (du, dy) => { let lo = 0, hi = 1.6131; for (let n = 0; n < 10; n++) { const m = (lo + hi) / 2; open(cu + du * m, cy + dy * m) ? lo = m : hi = m; } return lo; };
  const r = {u0: cu - edge(-1, 0), u1: cu + edge(1, 0), y0: cy - edge(0, -1), y1: cy + edge(0, 1)}; G.reset(); return r; }
const kindOf = (g, i) => { const p = g.G.panes[i], barred = p.parts.some(r => r.surface === 'bars'), twin = p.parts.some(r => r.owners.length === 2), shell = !p.parts.some(r => r.entry.tag === 'casement'); return shell ? (twin ? 'shell double' : 'shell') : twin ? (barred ? 'barred double' : 'double') : barred ? 'barred' : 'single'; };

await check('kohar', 'Kohar Valley is as it was: no glass, no space, nothing eased (the three traces are in their own suites)', async () => {
  const g = await world('kohar'); assert.equal(g.glass, undefined); assert.equal(g.height.space, null); g.put(0, g.groundY(0, 55), 55); g.press('KeyW'); let worst = 0; g.run(2, () => { worst = Math.max(worst, Math.abs(g.camera.position.y - g.player.y - 1.7)); }); g.release('KeyW'); assert(worst <= .0201 && g.height.eyeStep() === 0);
  report.kohar = {glass: 'none', space: null};
});

await check('parts', 'a shot at any part of a whole pane breaks it, on every window of the town and every kind: fired square at the wall from outside at the four corners, the four edges and the middle of the opening (2 cm in from its edge), each of the nine shots breaks that pane and no other and stops there; on the customs house the same from inside; a shot at the post of a double window breaks one of its halves; the pane a ray meets is the whole opening, from post to post and from sill to head, as measured by rays through the broken opening and not as the kit says', async () => {
  const g = await world(), G = g.G; g.nobody(); g.put(0, 0, 40); const by = {}, missed = []; let shots = 0, behind = 0, widest = 0;
  for (let i = 0; i < G.count; i++) { const p = G.panes[i], o = opening(p), kind = kindOf(g, i); by[kind] = (by[kind] || 0) + 1; if (G.spanning(i).some(b => b.tag === 'ladder')) { behind++; continue; }   // three small windows of the block stand behind a ladder (MAP-10): its rail takes a shot at that edge
    const t = measured(g, i); widest = Math.max(widest, Math.abs(p.min[o.a] - t.u0), Math.abs(p.max[o.a] - t.u1), Math.abs(p.min[1] - t.y0), Math.abs(p.max[1] - t.y1));
    assert(p.min[o.a] <= t.u0 + .012 && p.max[o.a] >= t.u1 - .012 && p.min[1] <= t.y0 + .012 && p.max[1] >= t.y1 - .012, `pane ${i} (${kind}): a ray meets less than the opening the wall has: ${[p.min[o.a], p.max[o.a], p.min[1], p.max[1]].map(v => v.toFixed(3))} against ${[t.u0, t.u1, t.y0, t.y1].map(v => v.toFixed(3))}`);
    const pts = []; for (const y of [t.y0 + .02, (t.y0 + t.y1) / 2, t.y1 - .02]) for (const u of [t.u0 + .02, (t.u0 + t.u1) / 2, t.u1 - .02]) pts.push([u, y]);   /* the nine places, 2 cm inside the opening as measured */
    pts.forEach((pt, n) => { G.reset(); const end = g.hitScan(o.at(pt, 1), o.dir(1), RIFLE, 'local'); shots++; const list = G.list(); if (list.length !== 1 || list[0] !== i || Math.abs(end.getComponent(o.k) - p.at[o.k]) > .02) missed.push(`${kind} pane ${i} at ${p.at.map(v => +v.toFixed(1))}: ${NAMES[n]} (broke ${JSON.stringify(list)}, ended ${end.toArray().map(v => +v.toFixed(2))})`); }); }
  assert.equal(missed.length, 0, `${missed.length} of ${shots} shots did not break their pane, e.g. ${missed.slice(0, 4).join('; ')}`); assert(by.single >= 20 && by.barred >= 20 && by.double >= 20 && by.shell >= 100 && by['shell double'] >= 40, `kinds: ${JSON.stringify(by)}`);
  // From inside, on the customs house (its rooms are real): every window of it, nine shots each.
  let inside = 0; for (let i = 0; i < G.count; i++) { const p = G.panes[i]; if (!(p.at[0] > K.x[0] - .1 && p.at[0] < K.x[1] + .1 && p.at[2] > K.z[0] - .1 && p.at[2] < K.z[1] + .1) || p.at[1] > ROOF) continue; const o = opening(p);
    o.pts.forEach((pt, n) => { G.reset(); const from = o.at(pt, -o.thick - .8); g.hitScan(from, o.dir(-1), RIFLE, 'local'); inside++; assert.deepEqual(G.list(), [i], `from inside, pane ${i} at ${p.at.map(v => +v.toFixed(1))}: ${NAMES[n]}`); }); }
  assert(inside >= 9 * 40, `${inside} shots from inside`);
  // The post of a double window: a shot square at its middle breaks a half.
  let posts = 0; for (const r of G.loose.filter(r => r.owners.length === 2)) { G.reset(); const p = G.panes[r.owners[0]], o = opening(p), c = [...r.entry.at]; const from = V(...c); from.setComponent(o.k, (o.out > 0 ? p.hole.max[o.k] : p.hole.min[o.k]) + o.out); g.hitScan(from, o.dir(1), RIFLE, 'local'); const list = G.list(); assert(list.length === 1 && r.owners.includes(list[0]), `a shot at the post of the double window at ${c.map(v => +v.toFixed(1))} broke ${JSON.stringify(list)}`); posts++; }
  assert(posts >= 40); G.reset();
  report.parts = {openingAgainstRays: +widest.toFixed(3), panes: G.count, shotsFromOutside: shots, shotsFromInside: inside, posts, kinds: by, behindALadder: behind};
});

await check('clear', 'a broken opening is clear to its corners: on every window, broken, a ray through each of the nine places meets no glass and nothing of the kit stands anywhere in the opening (list and space), and no teeth of glass are drawn; on the customs house\'s barred ground-floor window, sight and shots pass at all nine places in both directions, a grenade thrown through its top corner and one through its bottom corner both land in the room, and the body climbs in at the left end of the sill and at the right end', async () => {
  const g = await world(), G = g.G, sp = g.height.space; g.nobody(); g.put(0, 0, 40); assert(!g.scene.children.some(o => o.userData.glass === 'shards') && G.teeth === 0, 'no teeth of glass'); assert.equal(g.scene.children.filter(o => o.userData.glass).length, 4);
  for (let i = 0; i < G.count; i++) { const p = G.panes[i], o = opening(p), h = p.hole; G.break(i); for (const pt of o.pts) assert.equal(G.hit(o.at(pt, 1), o.dir(1), o.thick + 2), null, `pane ${i}: glass still met`);
    const left = G.spanning(i).filter(b => b.tag !== 'ladder'); assert.equal(left.length, 0, `pane ${i}: ${left.map(b => b.surface)} in the opening`);
    assert(!sp.boxes.some(b => !b.off && b.tag !== 'ladder' && b.min[0] < h.max[0] - .02 && b.max[0] > h.min[0] + .02 && b.min[1] < h.max[1] - .02 && b.max[1] > h.min[1] + .02 && b.min[2] < h.max[2] - .02 && b.max[2] > h.min[2] + .02), `pane ${i}: the space clear to 2 cm of the opening's edge`); G.reset(); }
  // The barred window on the customs house's west wall at z 66.5: sight and shots at nine places, both ways.
  const w = g.pane(WEST, 1.5, 66.5), p = G.panes[w], o = opening(p, .03); G.break(w);
  for (const [n, pt] of o.pts.entries()) { const out = o.at(pt, 2), inn = o.at(pt, -o.thick - 2); assert(g.glass.visible(out, inn) && g.glass.visible(inn, out), `sight at the ${NAMES[n]}`); const e1 = g.hitScan(out.clone(), o.dir(1), RIFLE, 'local'), e2 = g.hitScan(inn.clone(), o.dir(-1), RIFLE, 'local'); assert(e1.x > inn.x - .01 && e2.x < out.x + .01, `shots at the ${NAMES[n]} (${e1.x.toFixed(2)}, ${e2.x.toFixed(2)})`); }
  assert.deepEqual(G.list(), [w]);
  // Grenades through the top corner and the bottom corner.
  for (const [n, pt] of [[8, o.pts[8]], [0, o.pts[0]]]) { const aim = V(p.at[0], pt[1] + (n ? -.2 : .2), pt[0] + (n ? -.12 : .12)); g.equip.throwItem('frag', V(-16, 1.6, 60), V(1, 0, 0), 0, false, 'local'); const nade = g.equip.nades.at(-1); nade.p.set(-14.2, aim.y, aim.z); nade.v.set(14, .4, 0);   /* the grenade put on its way a hand's breadth inside the corner (a throw leaves the hand to one side of where it is aimed) */ let inRoom = false; g.run(1, () => { if (g.equip.nades.some(q => q.p.x > -12.4)) inRoom = true; }); assert(inRoom, `a grenade through the ${NAMES[n]} corner went in`); g.run(5); G.reset(); G.break(w); g.run(.3); }
  // The body in at each end of the sill.
  for (const [name, z] of [['left', p.hole.min[2] + .36], ['right', p.hole.max[2] - .36]]) { g.set({hp: 100}); g.put(-13.75, 0, z, -Math.PI / 2); g.run(.2); g.press('Space'); g.release('Space'); g.run(.8); assert(g.player.y > .8, `${name} end: pulled up (${g.player.y.toFixed(2)})`); g.press('KeyW'); g.run(1.2); g.release('KeyW'); assert(g.player.x > -12.5 && Math.abs(g.player.y - FLOORS[0]) < .05, `${name} end: in (${g.player.x.toFixed(2)}, ${g.player.y.toFixed(2)})`); }
  report.clear = {panes: G.count, placesEach: 9, drawings: 4, teeth: 'none'};
});

await check('stairs', 'every stair is 2.4 m clear, and nothing on the way is tighter: on each of the 23 flights the clear width is at least 2.38 m and a player and an enemy, two enemies, and three players stand side by side; the customs house\'s half landings are over 3 m deep and 5 m across, its stair entries over 4.8 m, its roof doors over 2.15 m clear, house A\'s well as wide as its flight; a player hugging either wall climbs every flight without a stop; in the game, W and A held up the west stair arrive on the landing', async () => {
  const g = await world(), sp = g.height.space, flights = g.built.stats.flights; assert(flights.length >= 23); let narrowest = 9;
  for (const f of flights) { const at = (v, u) => f.axis === 'x' ? [u, v] : [v, u], u = (f.run[0] + f.run[1]) / 2, yMid = sp.floor(...at((f.across[0] + f.across[1]) / 2, u), f.high + .3).y;
    const side = (from, dir) => { for (let v = from; Math.abs(v - from) < .3; v += dir * .005) if (sp.clear(...at(v + dir * .05, u), yMid + BODY.step, yMid + BODY.stand, .05)) return v; return from + dir * .3; }, a0 = side(f.across[0], 1), a1 = side(f.across[1], -1);
    assert(f.width >= 2.39 && a1 - a0 >= 2.38, `a flight ${(a1 - a0).toFixed(2)} m clear (${f.width.toFixed(2)} m made) at ${at(a0, u)}`); narrowest = Math.min(narrowest, a1 - a0);
    const stand = (v, r) => { const [x, z] = at(v, u), y = sp.floor(x, z, f.high + .3).y; return sp.stands(x, z, y + BODY.step, y + BODY.stand, r, true); };
    assert(stand(a0 + BODY.radius + .03, BODY.radius) && stand(a1 - FOE.radius - .03, FOE.radius), `a player and an enemy at ${at(a0, u)}`); assert(stand(a0 + FOE.radius + .03, FOE.radius) && stand(a1 - FOE.radius - .03, FOE.radius) && a1 - a0 - .06 >= 4 * FOE.radius, `two enemies at ${at(a0, u)}`);
    assert([a0 + BODY.radius + .03, (a0 + a1) / 2, a1 - BODY.radius - .03].every(v => stand(v, BODY.radius)) && a1 - a0 - .06 >= 6 * BODY.radius, `three players at ${at(a0, u)}`); }
  const span = (fix, from, to, y, alongZ) => { let lo = null, hi = null; for (let v = from; v <= to; v += .01) if (alongZ ? sp.clear(fix, v, y + BODY.step, y + BODY.stand, .02) : sp.clear(v, fix, y + BODY.step, y + BODY.stand, .02)) { lo ??= v; hi = v; } return hi - lo; }, wells = {};
  for (const [name, st] of [['west', K.stairs[0]], ['east', K.stairs[1]]]) { const far = name === 'west' ? Math.min(...st.z) : Math.max(...st.z), entry = name === 'west' ? Math.max(...st.z) : Math.min(...st.z), into = Math.sign(far - entry), xa = st.x[0] + 1.2;
    const deep = span(xa, Math.min(far - into * .1, far - into * (st.landing + .2)), Math.max(far - into * .1, far - into * (st.landing + .2)), 1.7, true), across = span(far - into * 1.5, st.x[0] - .2, st.x[1] + .2, 1.7, false), door = span(entry, st.x[0] - .2, st.x[1] + .2, ROOF, false), way = [0, 1, 2].map(n => span(entry, st.x[0] - .2, st.x[1] + .2, FLOORS[n], false));
    assert(deep >= 3 && deep >= narrowest, `${name}: the half landing ${deep.toFixed(2)} m deep`); assert(across >= 4.85, `${name}: ${across.toFixed(2)} m across`); assert(door >= 2.15, `${name}: the roof door ${door.toFixed(2)} m clear`); assert(Math.min(...way) >= 4.8, `${name}: the entries ${way.map(v => v.toFixed(2))}`); assert(st.x[1] - st.x[0] >= 5.09);
    wells[name] = {landingDeep: +deep.toFixed(2), landingAcross: +across.toFixed(2), roofDoor: +door.toFixed(2), entries: way.map(v => +v.toFixed(2)), well: [+(st.x[1] - st.x[0]).toFixed(2), +Math.abs(st.z[1] - st.z[0]).toFixed(2)]}; }
  const A = B.houses.find(h => h.id === 'A'), fa = flights.find(f => f.axis === 'z' && Math.abs(f.across[0] + 12.66) < .01 && f.run[0] < 20); assert(A.wells[0].x[1] - A.wells[0].x[0] >= fa.width - .01, 'house A\'s well as wide as its flight');
  const stops = nudge => { let n = 0; for (const f of flights) { const dir = Math.sign(f.run[1] - f.run[0]), at = (v, u) => f.axis === 'x' ? [u, v] : [v, u];
      for (const [v0, press] of [[f.across[0] + BODY.radius + .12, -1], [f.across[1] - BODY.radius - .12, 1]]) { const p = V(0, 0, 0), [x, z] = at(v0, f.run[0] - dir * .2); p.set(x, sp.floor(x, z, f.low + .5, .2, f.low).y, z); let still = 0;
        for (let i = 0; i < 500; i++) { const b = f.axis === 'x' ? p.x : p.z; sp.move(p, f.axis === 'x' ? dir * .05 : press * .05, f.axis === 'x' ? press * .05 : dir * .05, BODY.stand, BODY.radius, {nudge}); const a = f.axis === 'x' ? p.x : p.z;
          if (dir * (a - f.run[1]) > -.05) break; const v = f.axis === 'x' ? p.z : p.x; if (v < f.across[0] - .05 || v > f.across[1] + .05) break; still = Math.abs(a - b) < .01 ? still + 1 : 0; if (still === 3) { n++; break; } } } } return n; };
  assert.equal(stops(BODY.nudge), 0, 'no stop along any wall');
  const st = K.stairs[0], zFar = Math.min(...st.z); g.put(st.x[0] + BODY.radius + .15, FLOORS[0], Math.max(...st.z) + .4, 0); g.press('KeyW'); g.press('KeyA'); g.run(6, () => { if (g.player.z < zFar + st.landing - .3) return false; }); g.release('KeyW'); g.release('KeyA'); near(g.player.y, 1.7, .03, 'on the half landing'); assert(g.player.z < zFar + st.landing - .2);
  report.stairs = {flights: flights.length, narrowestClear: +narrowest.toFixed(2), bodies: {player: 2 * BODY.radius, enemy: 2 * FOE.radius}, customsHouse: wells};
});

await check('flood', 'no place without a way back after the widening: a flood of the player\'s body in quarter-metre steps over the customs house and its square (walking, stepping up, falling with the landing push, pulling up, crouching) reaches every floor, both stairs\' landings and the roof, and from every place it reaches the square is reached again; nothing inside a wall; (the whole town\'s flood is T38\'s and the enemies\' graph T36\'s, both rerun)', async () => {
  const g = await world(), sp = g.height.space, Bd = sp.body, STEP = .25, R = {x: [-22, 22], z: [44.5, 79.5]};
  const key = (x, z, y) => `${Math.round(x / STEP)},${Math.round(z / STEP)},${Math.round(y * 50)}`, nodes = new Map(), edges = new Map(), back = new Map();
  const add = (x, z, y) => { const k = key(x, z, y); if (!nodes.has(k)) nodes.set(k, {x, z, y}); return k; }, link = (a, b) => { edges.get(a).push(b); if (!back.has(b)) back.set(b, []); back.get(b).push(a); };
  const rest = (x, z, y) => { const stand = sp.floor(x, z, y + Bd.step, Bd.lean, y).y; if (stand >= y - Bd.step) return [x, z, stand]; const f = sp.floor(x, z, y + .02).y, s = sp.settle(x, z, f + Bd.step, f + Bd.stand); return s ? [s.x, s.z, f] : null; };
  const start = add(...rest(0, 48, .3)), queue = [start], p = V(0, 0, 0); let inWall = 0;
  while (queue.length) { const k = queue.pop(); if (edges.has(k)) continue; edges.set(k, []); const n = nodes.get(k), H = sp.headroom(n.x, n.z, n.y) < Bd.stand ? Bd.crouch : Bd.stand; if (n.x < R.x[0] || n.x > R.x[1] || n.z < R.z[0] || n.z > R.z[1]) continue;   // the gates lead on: the town beyond is T38's
    if (!sp.clear(n.x, n.z, n.y + Bd.step + .01, n.y + Bd.crouch - .05, Bd.radius * .5)) inWall++;
    for (const [dx, dz] of [[STEP, 0], [-STEP, 0], [0, STEP], [0, -STEP]]) { p.set(n.x, n.y, n.z); if (sp.move(p, dx, dz, H) < STEP - .01) continue; const r = rest(p.x, p.z, p.y); if (!r) continue; const q = add(...r); link(k, q); if (!edges.has(q)) queue.push(q); }
    for (const [fx, fz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { p.set(n.x, n.y, n.z); const up = sp.ledge(p, fx, fz); if (!up) continue; const q = add(up.x, up.z, up.y); link(k, q); if (!edges.has(q)) queue.push(q); } }
  const reached = [...edges.keys()], home = new Set([start]), stack = [start]; while (stack.length) { const k = stack.pop(); for (const a of back.get(k) || []) if (!home.has(a)) { home.add(a); stack.push(a); } }
  const stuck = reached.filter(k => !home.has(k)).map(k => nodes.get(k)).filter(n => n.x >= R.x[0] && n.x <= R.x[1] && n.z >= R.z[0] && n.z <= R.z[1]);   /* a place beyond the gates leads on into the town */ assert.equal(stuck.length, 0, `${stuck.length} places with no way back, e.g. ${JSON.stringify(stuck.slice(0, 4))}`); assert.equal(inWall, 0, 'nothing inside a wall');
  const at = (x0, x1, z0, z1, y) => reached.map(k => nodes.get(k)).filter(n => n.x > x0 && n.x < x1 && n.z > z0 && n.z < z1 && Math.abs(n.y - y) < .05).length, levels = {};
  for (const [name, y] of [['ground', .05], ['first', 3.4], ['second', 6.6], ['roof', ROOF]]) { levels[name] = at(K.x[0], K.x[1], K.z[0], K.z[1], y); assert(levels[name] > 1500, `${name}: ${levels[name]} places`); }
  for (const [name, st, yl] of [['west', K.stairs[0], [1.7, 5, 8.2]], ['east', K.stairs[1], [1.7, 5, 8.2]]]) for (const y of yl) assert(at(st.x[0], st.x[1], Math.min(...st.z), Math.max(...st.z), y) > 100, `the ${name} stair's landing at ${y}`);
  report.flood = {places: reached.length, step: STEP, levels};
});

await check('eye', 'the eye on stairs is Build 30\'s: the same text (the step held back, the rate it is given back at, the eye\'s height) and the same behaviour, measured on the wider west stair with the game\'s keys: walking up and down the feet take eight treads of .21 m and the eye never more than 5 cm in a frame, sprinting never more than 9; never over .3 m behind; back over the feet .34 s after stopping; a jump is not eased', async () => {
  const src = fs.readFileSync(SOURCE || new URL('dist/game.js', projectRoot), 'utf8');
  for (const t of ["function eyeStepped(d,speed){const E=SPACE.body.ease;eyeRate=Math.max(E[0],.65*speed,Math.min(E[1],(eyeRate+1.1*Math.abs(d)/Math.max(.02,elapsed-eyeAt))/2));eyeAt=elapsed;eyeStep=Math.max(-SPACE.body.sag,Math.min(SPACE.body.sag,eyeStep-d));}", "if(SPACE&&eyeStep)eyeStep=Math.sign(eyeStep)*Math.max(0,Math.abs(eyeStep)-eyeRate*dt);const eyeHeight=stanceHeight+(SPACE?eyeStep:0);", "if(stood&&player.y!==before&&Math.abs(player.y-before)<=B.step+.01)eyeStepped(player.y-before,speed);", "else{if(f.y!==player.y)eyeStepped(f.y-player.y,speed);player.y=f.y;"]) assert(src.includes(t), `Build 30's text stands: ${t.slice(0, 50)}`);
  assert.deepEqual(BODY.ease, [1, 4.5]); assert.equal(BODY.sag, .3);
  const g = await world(), st = K.stairs[0], zTop = Math.max(...st.z), zFar = Math.min(...st.z), x1 = st.x[0] + 1.2; g.nobody();
  const climb = (keys, fromZ, toZ, y0, yaw) => { g.put(x1, y0, fromZ, yaw); g.run(.4); const eye = [], feet = [], lag = []; let air = 0; for (const k of keys) g.press(k); g.run(5, () => { eye.push(g.camera.position.y); feet.push(g.player.y); lag.push(Math.abs(g.height.eyeStep())); if (!g.height.grounded()) air++; if (yaw === 0 ? g.player.z < toZ : g.player.z > toZ) return false; }); for (const k of keys) g.release(k);
    const d = a => a.slice(1).map((v, i) => v - a[i]), de = d(eye), df = d(feet); g.run(.34); return {feetJumps: df.filter(v => Math.abs(v) > .15).length, eyeWorstFrame: +Math.max(...de.map(Math.abs)).toFixed(3), lag: +Math.max(...lag).toFixed(3), air, settled: +(g.camera.position.y - g.player.y).toFixed(3)}; };
  const runs = {walkingUp: climb(['KeyW'], zTop + .8, zFar + st.landing - .1, FLOORS[0], 0), sprintingUp: climb(['KeyW', 'ShiftLeft'], zTop + .8, zFar + st.landing - .1, FLOORS[0], 0), walkingDown: climb(['KeyW'], zFar + st.landing - .6, zTop + .6, 1.7, Math.PI), sprintingDown: climb(['KeyW', 'ShiftLeft'], zFar + st.landing - .6, zTop + .6, 1.7, Math.PI)};
  for (const [name, r] of Object.entries(runs)) { assert(r.feetJumps >= (name.startsWith('sprint') ? 5 : 7), `${name}: the feet take the treads (${r.feetJumps})`); assert(r.eyeWorstFrame <= (name.startsWith('sprint') ? .09 : .05), `${name}: the eye's worst frame ${r.eyeWorstFrame}`); assert(r.lag <= .3 + 1e-9 && r.air === 0, `${name}: ${r.lag} behind, ${r.air} frames in the air`); near(r.settled, 1.7, .021, `${name}: back over the feet`); }
  g.put(0, 0, 76); g.run(.3); g.press('Space'); g.release('Space'); let off = 0, peak = 0; g.run(1.2, () => { off = Math.max(off, Math.abs(g.height.eyeStep())); peak = Math.max(peak, g.player.y); }); assert(peak > .5 && off === 0, 'a jump is not eased');
  report.eye = runs;
});

await check('coop', 'both players have the same windows to their corners: a shot the host fires at the top corner of a whole barred window breaks it on both pages, a shot the guest fires at the bottom corner of the next breaks that on both; through each, a sight line 3 cm from the corner passes on both pages, and through a whole window on neither', async () => {
  const p = await pair(), {host, guest} = p, H = host.glass.G, Gu = guest.glass.G, pane = (x, y, z) => { let best = -1, bd = 1e9; H.panes.forEach((q, i) => { const d = Math.hypot(q.at[0] - x, q.at[1] - y, q.at[2] - z); if (d < bd) { bd = d; best = i; } }); return best; };
  const a = pane(WEST, 1.5, 64), b = pane(WEST, 1.5, 66.5), c = pane(WEST, 1.5, 69), oa = opening(H.panes[a], .03), ob = opening(H.panes[b], .03), oc = opening(H.panes[c], .03);
  host.hitScan(oa.at(oa.pts[8], 3), oa.dir(1), RIFLE, 'local'); p.step(p.delay + 1); assert.deepEqual(H.list(), [a], `the host's corner shot broke ${JSON.stringify(H.list())}, not ${a}`); assert.deepEqual(Gu.list(), [a], 'the host\'s corner shot, on the guest');
  const corner = ob.at(ob.pts[0], -ob.thick / 2), o = V(-16, 1.7, corner.z); guest.player.set(-16, 0, corner.z); guest.height.settle(); host.remote.g.position.set(-16, 0, corner.z); host.remote.netPos = null; p.sync();   /* the guest stands before the window and fires from its eye at the bottom corner */ host.receive({type: 'shot', dir: corner.clone().sub(o).normalize().toArray(), o: o.toArray(), w: 0, at: host.coop.elapsed() - .05}); p.step(p.delay + 1); assert.deepEqual(H.list(), [a, b].sort((x, y) => x - y)); assert.deepEqual(Gu.list(), H.list(), 'the guest\'s corner shot, on both');
  for (const g of [host, guest]) { for (const oo of [oa, ob]) for (const n of [0, 2, 6, 8]) assert(g.glass.visible(oo.at(oo.pts[n], 2), oo.at(oo.pts[n], -oo.thick - 2)), `seen through the ${NAMES[n]} corner`); for (const n of [0, 4, 8]) assert(!g.glass.visible(oc.at(oc.pts[n], 2), oc.at(oc.pts[n], -oc.thick - 2)), 'not through a whole window'); }
  report.coop = {broken: H.list().length, note: 'one process, a stand-in connection'};
});

console.log(JSON.stringify({...(ONLY ? {partial: ONLY} : {}), passed: results.length, checks: results, report, limitations: [
  'Headless: how the wider stairs feel and how a clean opening looks are for the user in Safari (B27).',
  'Shots are fired square at the wall; a shot from far to one side meets the wall\'s reveal first, as it should.',
  'The co-op check is a host and a guest in one process with a stand-in connection.']}, null, 2));
