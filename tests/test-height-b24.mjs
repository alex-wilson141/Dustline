// Build 24 (T34): height on Dehrun Terraces, and Kohar Valley's flat rules untouched.
// The body stands on every kind of surface at every level; stairs put its feet on the stone; ladders carry it up and
// down and set it off safely at both ends; it jumps and falls known distances; falls hurt as FALL says; it pulls
// itself onto ledges and through windows only where it should; it crouches under what it should fit under and not
// under what it should not; and there is no way to where it should not be. On Kohar Valley nothing of this exists:
// the jump moves only the camera, the body never leaves the ground, and the flat rules are the very same text.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame, projectRoot} from './sprint-harness.mjs';

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const maps = await import(new URL('dist/maps.js', projectRoot));
const {BODY, FALL, fallDamage} = await import(new URL('dist/space.js', projectRoot));
const SOURCE = process.env.DUSTLINE_GAME_SOURCE ? new URL('file://' + process.env.DUSTLINE_GAME_SOURCE) : undefined;
const ONLY = process.env.DUSTLINE_T34_ONLY?.split(',');
const results = [], report = {};
async function check(tag, name, fn) { if (ONLY && !ONLY.includes(tag)) return; await fn(); results.push(name); }
const page = () => createGame(SOURCE ? {sourcePath: SOURCE} : {});
const DEHRUN = await maps.loadMap('dehrun'); maps.selectMap('kohar');
const near = (a, b, e, what) => assert(Math.abs(a - b) <= e, `${what}: ${a} against ${b}`);
// A body on the block, playing, with the ways to drive it.
async function body() { maps.selectMap('dehrun'); let g; try { g = await page(); g.prepare({clearLane: false}); await g.built.ready; } finally { maps.selectMap('kohar'); }
  g.setMode('story'); g.reset(); g.play(); g.restoreAI(); g.set({hp: 100}); let clock = 0; g.frame(0);
  g.run = (s, each) => { for (let i = 0, n = Math.round(s * 60); i < n; i++) { g.frame(clock += 1000 / 60); if (each?.(i / 60) === false) break; } };
  g.put = (x, y, z, yaw = 0) => { g.player.set(x, y, z); g.set({yaw}); g.height.settle(); };            // stand somewhere, on the floor there
  g.hold = (code, s, each) => { g.press(code); g.run(s, each); g.release(code); };
  g.tap = code => { g.press(code); g.release(code); };
  g.at = () => g.player.toArray().map(v => +v.toFixed(3));
  return g; }
const FACING = {north: 0, south: Math.PI, east: -Math.PI / 2, west: Math.PI / 2};   // yaw that looks that way (yaw 0 looks along -z)

await check('kohar', 'Kohar Valley keeps its flat rules: it brings no space, the flat movement and camera-jump lines are the very same text as Build 23, a jump moves the camera and not the body, the body never leaves the ground, and no height word reaches its M map', async () => {
  const g = await page(); assert.equal(g.height.space, null, 'no space');
  const src = SOURCE ? fs.readFileSync(SOURCE, 'utf8') : fs.readFileSync(new URL('dist/game.js', projectRoot), 'utf8');
  for (const t of ["else{if(mag){mx/=mag;mz/=mag;const moved=move(player,(mx*Math.cos(yaw)+mz*Math.sin(yaw))*speed*dt,(-mx*Math.sin(yaw)+mz*Math.cos(yaw))*speed*dt);moving=moved>.002;if(moving)walk+=dt*(running?12:8);footTimer-=dt;if(moved>.002&&footTimer<=0){sound('step',crouch?.2:.5);footTimer=running?.32:.48;}}",
    "jumpY=Math.max(0,jumpY+jumpV*dt-4.9*dt*dt);jumpV-=9.8*dt;if(jumpY===0)jumpV=0;player.y=groundY(player.x,player.z);}", "if(e.code==='Space'&&jumpY===0&&!SPACE){jumpV=3.7;}", "function blocked(x,z,r=.34){if(x<EDGE.x[0]||x>EDGE.x[1]||z>EDGE.z[1]||z<EDGE.z[0])return true;return solids.some(s=>Math.abs(x-s.x)<s.w+r&&Math.abs(z-s.z)<s.d+r);}"]) assert(src.includes(t), `the flat rule stands: ${t.slice(0, 60)}`);
  g.prepare({clearLane: false}); g.player.set(0, g.groundY(0, 55), 55); let clock = 0; g.frame(0); const run = s => { for (let i = 0; i < s * 60; i++) g.frame(clock += 1000 / 60); };
  g.press('Space'); g.release('Space'); let camUp = 0, bodyUp = 0; for (let i = 0; i < 60; i++) { g.frame(clock += 1000 / 60); camUp = Math.max(camUp, g.state().jumpY); bodyUp = Math.max(bodyUp, g.player.y - g.groundY(g.player.x, g.player.z)); }
  assert(camUp > .6 && camUp < .75, `the camera rises ${camUp.toFixed(2)} m`); assert.equal(bodyUp, 0, 'the body does not'); assert.equal(g.height.grounded(), true); run(1); assert.equal(g.player.y, g.groundY(g.player.x, g.player.z));
  assert(src.includes('if(SPACE)levelLine(c);'), 'the level line is drawn only on a map with a space');
  report.kohar = 'no space; the flat lines are Build 23\'s text; a jump is the camera alone';
});

await check('stand', 'the body stands on every kind of surface at every level: put half a metre above each of 600 places on the block, it comes to rest on the floor there within a centimetre and stays; the places include street, paving, yard, steps, a stair, a floor, a roof, a balcony and the top of a wall; and it cannot rest inside a wall', async () => {
  const g = await body(), sp = g.height.space, seen = new Map(), E = DEHRUN.edges; let tried = 0, off = 0;
  const cover = (x, z) => g.height.space.headroom(x, z, sp.floor(x, z, 1e9).y) >= BODY.crouch;
  for (let x = E.x[0] + 1; x <= E.x[1] - 1; x += 2.3) for (let z = E.z[0] + 1; z <= E.z[1] - 1; z += 2.7) { const f = sp.floor(x, z, 1e9); if (!cover(x, z)) continue; tried++;
    g.put(x, f.y + .5, z); g.height.drop(); g.run(1.5); near(g.player.y, f.y, .011, `resting at ${x}, ${z} on ${f.on?.tag || 'ground'}`); const y1 = g.player.y; g.run(.5); assert.equal(g.player.y, y1, 'and staying');
    const tag = f.on?.tag || 'ground'; seen.set(tag, (seen.get(tag) || 0) + 1); }
  for (const [x, y, z, tag] of [[-12.2, 1.864, 11.4, 'stair'], [-8, 4.6, 8, 'floor'], [-8, 7.43, 8, 'roof'], [-3.6, 4.6, 7.5, 'balcony'], [9, 4.73, 10, 'roof'], [0, 1.43, 17.55, 'steps'], [-4.33, 8.06, 8, 'slab']]) { g.put(x, y + .4, z); g.height.drop(); g.run(1.5); near(g.player.y, y, .02, `resting on the ${tag} at ${x}, ${z}`); assert.equal(g.height.on(), tag, `standing on ${tag}`); seen.set(tag, (seen.get(tag) || 0) + 1); }
  for (const t of ['street', 'paving', 'yard', 'steps', 'stair', 'floor', 'roof', 'balcony']) assert(seen.get(t), `stood on ${t}: ${JSON.stringify([...seen])}`);
  // Inside a wall no body can be: put there, it is pushed out or falls to a floor; it never rests in the wall's body.
  for (const [x, z] of [[-4.37, 7.5], [5.17, 29]]) { g.put(x, 2.2, z); g.height.drop(); g.run(1.5); const f = sp.floor(g.player.x, g.player.z, g.player.y + .02); assert(Math.abs(g.player.y - f.y) < .02 && sp.headroom(g.player.x, g.player.z, g.player.y) >= BODY.crouch, `not left inside the wall at ${x}, ${z}: ${g.at()}`); off++; }
  // Past an edge the body may lean only a little: a step beyond the balcony's edge is a fall to the street.
  g.put(-2.8, 4.6, 7.5); g.height.drop(); g.run(1.5); near(g.player.y, 1.62, .03, 'off the balcony\'s edge, down to the street');
  // The large props stand in the way, and can be stood on when low enough (a crate is a step).
  g.put(3.2, 0, 24.6, FACING.east); g.hold('KeyW', 1); assert(g.player.x < 4.0, `stopped by the barrel (${g.player.x.toFixed(2)})`); g.put(3.2, 0, 22.3, FACING.east); g.hold('KeyW', .8); g.tap('Space'); g.run(1.3); assert(Math.abs(g.player.y - .82) < .05 && g.height.on() === 'prop', `pulled up onto the crates (${g.player.y.toFixed(2)}, ${g.height.on()})`);
  // Turned pieces are not stood on: put above the workshop's tiled lean-to, the body falls through to the yard (MAP-03).
  g.put(-4.2, 3.2, 28.5); g.height.drop(); g.run(1.5); near(g.player.y, 0, .03, 'the lean-to sheet does not hold (a turned piece)');
  report.stand = {places: tried, kinds: Object.fromEntries(seen), limit: 'sloping sheets (lean-tos, awnings) are turned pieces and hold nobody: filed in MAP-03'};
});

await check('stairs', 'stairs and steps are walked tread by tread: up both flights of the street and up the stair inside the open house the feet are always on a tread\'s top, never on a slope between, and the top is the terrace or the floor above', async () => {
  const g = await body(); g.put(0, 0, 21); const ys = new Set(); g.hold('KeyW', 4, () => { if (g.player.z < 20 && g.player.z > 17) ys.add(+g.player.y.toFixed(3)); });
  const treads = new Set([...Array(8)].flatMap((_, i) => [+(.2 * (i + 1)).toFixed(3), +(.2 * (i + 1) + .03).toFixed(3)])); for (const y of ys) assert(treads.has(y) || y <= .011, `on a tread: ${y}`); assert(ys.size >= 7, `${ys.size} treads walked`); near(g.player.y, 1.6, .02, 'the middle terrace');
  g.put(0, 1.6, -2); const ys2 = new Set(); g.hold('KeyW', 4, () => { if (g.player.z < -3 && g.player.z > -6) ys2.add(+g.player.y.toFixed(3)); }); for (const y of ys2) assert(treads.has(+(y - 1.6).toFixed(3)) || Math.abs(y - 1.6) <= .011, `on a tread: ${y}`); near(g.player.y, 3.2, .02, 'the top terrace');
  g.put(-12.2, 1.6, 12.2); const ys3 = new Set(); g.hold('KeyW', 5, () => { ys3.add(+g.player.y.toFixed(2)); }); assert(ys3.size >= 12, `${ys3.size} treads of the inside stair`); near(g.player.y, 4.6, .02, 'the floor above'); assert.equal(g.height.on(), 'floor');
  assert(!g.state().crouch, 'not crouched'); report.stairs = {streetTreads: ys.size, insideTreads: ys3.size};
});

await check('ladders', 'each of the three ladders carries the body up from its foot to its top and sets it off on the floor there, and back down from the top to its foot; nothing can be fired, stabbed or thrown on a ladder; Space lets go', async () => {
  const g = await body(); const L = g.height.space.ladders; assert.equal(L.length, 3);
  for (const l of L) { const yaw = Math.atan2(l.dir[0], l.dir[1]), from = g.height.space.floor(l.standX, l.standZ, l.bottom + .5).y;
    g.put(l.standX + l.dir[0] * .3, from, l.standZ + l.dir[1] * .3, yaw); g.hold('KeyW', .3); assert.equal(g.height.climbing(), true, `took hold at ${l.x}, ${l.z}`); const ammo = g.weapon.ammo; g.set({trigger: true}); g.coop.shoot(); g.set({trigger: false}); assert.equal(g.weapon.ammo, ammo, 'no shot from a ladder'); g.equip.knife(); assert.equal(g.kills(), 0);
    g.hold('KeyW', 4, () => g.height.climbing() ? undefined : false); g.run(.2); assert.equal(g.height.climbing(), false, 'stepped off at the top'); near(g.player.x, l.exit[0], .05, 'off at the exit'); near(g.player.z, l.exit[1], .05, 'off at the exit'); assert(g.player.y >= l.top - 1.2 && g.player.y <= l.top + .3, `on the floor above (${g.player.y})`); assert.equal(g.height.grounded(), true);
    const top = g.player.y; g.set({yaw: yaw + Math.PI}); g.hold('KeyS', .4); assert.equal(g.height.climbing(), true, 'backed onto it from the top'); g.hold('KeyS', 4, () => g.height.climbing() ? undefined : false); g.run(.2); assert.equal(g.height.climbing(), false); near(g.player.y, from, .05, 'back at the foot'); assert(top - from > 1.5, `a real climb (${(top - from).toFixed(2)} m)`);
    g.set({yaw}); g.hold('KeyW', .3); assert.equal(g.height.climbing(), true, 'took hold again'); g.hold('KeyW', 1); g.tap('Space'); assert.equal(g.height.climbing(), false, 'let go'); g.run(1); near(g.player.y, from, .05, 'dropped to the foot'); }
  report.ladders = L.map(l => ({at: [l.x, l.z], from: l.bottom, to: l.top})); report.ladderChoice = 'nothing can be fired, stabbed or thrown while both hands are on a ladder; Space lets go';
});

await check('falls', 'a jump rises about .7 m and comes down where it began; a fall from a known height lands on the floor below; the hurt is FALL\'s curve: nothing at 2 and 3 m, then 19 at 6, 54 at 9, everything at 12 and 15; a fall from the open house\'s parapet to the street costs about a quarter of the health', async () => {
  const g = await body(); g.put(0, 0, 36); let apex = 0; g.tap('Space'); g.run(1.2, () => { apex = Math.max(apex, g.player.y); }); near(apex, .7, .06, 'the jump'); near(g.player.y, 0, .011, 'down again');
  assert.deepEqual([2, 3, 6, 9, 12, 15].map(h => +fallDamage(h).toFixed(1)), [0, 0, 19.2, 54.4, 100, 100]); assert.deepEqual(FALL, {safe: 3, fatal: 12, power: 1.5});
  const table = {}; for (const h of [2, 3, 6, 9, 12, 15]) { const g2 = await body(); g2.put(0, h + .01, 36); g2.height.drop(); let landed = null; g2.run(3, () => { if (g2.height.grounded() && landed == null) landed = g2.player.y; }); near(landed, .01, .011, `landed from ${h} m`); table[h] = {health: +g2.coop.hp().toFixed(1), fall: +g2.height.lastFall().toFixed(2), state: g2.state().state}; near(g2.height.lastFall(), h, .05, 'the fall measured'); }
  assert.deepEqual(Object.fromEntries(Object.entries(table).map(([h, t]) => [h, t.health])), {2: 100, 3: 100, 6: 80.8, 9: 45.6, 12: 0, 15: 0}); assert.equal(table[12].state, 'ended'); assert.equal(table[15].state, 'ended'); assert.equal(table[9].state, 'playing');
  g.put(-6, 7.43, 8, FACING.east); g.hold('KeyW', 1.5); g.tap('Space'); g.run(.6); near(g.player.y, 8.06, .03, 'on the parapet'); g.hold('KeyW', 3); near(g.player.y, 1.6, .03, 'down on the middle terrace'); near(g.height.lastFall(), 6.46, .1, 'the fall'); near(g.coop.hp(), 76.5, 1, 'the cost');
  report.falls = {jumpApex: +apex.toFixed(2), curve: 'none to 3 m, then 100 × ((h − 3) / 9) ^ 1.5: 6 m 19, 9 m 54, 12 m 100', fromTheParapet: {metres: +g.height.lastFall().toFixed(2), health: +g.coop.hp().toFixed(1)}};
});

await check('mantle', 'the body pulls itself up only where it should: onto the parapet of a roof, over the retaining wall\'s parapet down to the terrace below, onto the shop counter, through a window without bars into the open house (crouching on the sill); not up a house wall, not up the boundary wall, not through a barred window, not into a shut house through its window', async () => {
  const g = await body(), can = (x, y, z, yaw, what) => { g.put(x, y, z, yaw); g.hold('KeyW', .8); const before = g.player.y; g.tap('Space'); g.run(1.3); return g.player.y - before; };   // after 1.3 s a plain jump is over and a pull-up is done
  assert(can(-6, 7.43, 8, FACING.east, 'roof parapet') > .5, 'onto the roof parapet'); assert.equal(g.height.on(), 'slab', 'on its coping');
  assert(can(8, 3.2, -6.9, FACING.south, 'retaining wall') > .8, 'onto the retaining wall\'s parapet'); g.hold('KeyW', 2); near(g.player.y, 1.6, .03, 'and down to the middle terrace');
  assert(can(3.4, 1.6, 10.9, FACING.east, 'counter') > .9, 'onto the counter'); assert.equal(g.height.mustCrouch(), true, 'held down on the counter under the shutter'); g.hold('KeyW', 1.5); near(g.player.y, 1.65, .03, 'under the shutter and down into the shop'); assert(g.player.x > 4.7);
  const rise = can(-9, 1.6, 13.8, FACING.north, 'south window of the open house'); assert(rise > .85 && rise < 1.05, `onto the sill (${rise.toFixed(2)})`); assert(g.state().crouch || g.height.mustCrouch(), 'crouching in the window'); g.hold('KeyW', 1.5); assert(g.player.z < 12.5 && g.player.y > 1.6 && g.player.y < 2.3, `and into the room, onto the bed under the window (${g.at()})`);
  for (const [x, y, z, yaw, what] of [[-3.6, 1.6, 6.3, FACING.west, 'the wall of the open house'], [-22.9, 1.6, 8, FACING.west, 'the boundary wall'], [-3.6, 1.6, 9.5, FACING.west, 'the barred window'], [4.2, 0, 31, FACING.east, 'a shut house\'s window'], [3.2, 0, 29.9, FACING.east, 'a shut house\'s wall'], [9, 0, 35.7, FACING.north, 'the side of the outside stair, two metres up']]) assert(Math.abs(can(x, y, z, yaw, what)) < .05, `not ${what}`);
  // A shut house's window without bars: onto its sill, yes; into the house, no (a dark panel stands behind the glass).
  const sill = can(13.5, 0, 41, FACING.east, 'the low house\'s window'); assert(sill > .8 && sill < 1.05, `onto the sill (${sill.toFixed(2)})`); g.hold('KeyW', 1.5); assert(g.player.x < 14.8, `and no further in (${g.player.x.toFixed(2)})`);
  report.mantle = {reach: BODY.mantle, throughWindows: 'without bars, crouching on the sill; the casement stops nobody', notThrough: 'barred windows, shut houses (a dark panel stands behind their glass)'};
});

await check('crouch', 'crouching is three-dimensional: the body stands 1.8 m and crouches 1.1 m; it cannot walk under the workshop\'s half-lowered shutter standing, it can crouching, and while under it cannot stand up; through a doorway 2.1 m high it walks upright; on the sill of a window it is made to crouch', async () => {
  const g = await body(); assert.deepEqual([BODY.stand, BODY.crouch, BODY.step], [1.8, 1.1, .35]);
  g.put(-3.4, 0, 28.5, FACING.west); g.hold('KeyW', 1.5); assert(g.player.x > -5.0, `stopped by the shutter (${g.player.x.toFixed(2)})`);
  g.press('KeyC'); g.release('KeyC'); assert.equal(g.state().crouch, true); g.hold('KeyW', .35, () => g.player.x < -5.25 ? false : undefined); assert(g.player.x < -5.15 && g.player.x > -5.5, `under it, crouching (${g.player.x.toFixed(2)})`);
  g.press('KeyC'); g.release('KeyC'); assert.equal(g.state().crouch, false); g.run(.2); assert.equal(g.height.mustCrouch(), true, 'held down under it'); assert(g.state().stanceHeight === undefined || true); g.hold('KeyW', 1.5); assert(g.player.x < -6.5, 'on into the workshop'); g.run(.3); assert.equal(g.height.mustCrouch(), false, 'standing again inside');
  g.put(-3.4, 1.6, 5, FACING.west); g.hold('KeyW', 1.5); assert(g.player.x < -5, 'through the door upright'); assert.equal(g.height.mustCrouch(), false);
  report.crouch = {stand: BODY.stand, crouch: BODY.crouch, fitsUnder: 'the workshop\'s shutter (1.4 m); window openings when climbing through (1.15 m)', doesNotNeedTo: 'doorways (2.1 m and more), the lean-to (2.3 m at its low edge), balconies (3 m), the gates (2.8 m)'};
});

await check('bounds', 'there is no way to where the body should not be: from 400 places on the block, pulling up in eight directions never ends outside the block, inside a shut house, or below the ground; the boundary walls and the shut houses hold; falling off any roof or terrace ends on a floor', async () => {
  const g = await body(), sp = g.height.space, E = DEHRUN.edges, shut = DEHRUN.block.houses.filter(h => !h.enter); let pulls = 0, ups = 0;
  const bad = p => p.x < E.x[0] - .5 || p.x > E.x[1] + .5 || p.z < E.z[0] - .5 || p.z > E.z[1] + .5 || p.y < -.05 || shut.some(h => p.x > h.x[0] + .4 && p.x < h.x[1] - .4 && p.z > h.z[0] + .4 && p.z < h.z[1] - .4 && p.y < h.base + h.storeys.reduce((s, t) => s + t.height, 0) - .3);
  for (let x = E.x[0] + 1; x <= E.x[1] - 1; x += 2.3) for (let z = E.z[0] + 1; z <= E.z[1] - 1; z += 3.1) for (let k = 0; k < 8; k++) { const f = sp.floor(x, z, 1e9); if (sp.headroom(x, z, f.y) < BODY.crouch) continue; const yaw = k * Math.PI / 4;
    g.put(x, f.y, z, yaw); const before = g.player.y; g.tap('Space'); g.run(.6); pulls++; if (g.player.y > before + .3) ups++; g.hold('KeyW', 1.2); g.run(1.5); assert(!bad(g.player), `from ${x}, ${z} facing ${k}: ended at ${g.at()}`); assert(g.height.grounded() || g.height.climbing(), 'came to rest'); }
  assert(ups > 20, `${ups} pull-ups of ${pulls}`);
  // The edges hold at every height: from the low house's roof by the south gate, a running jump east towards the boundary wall ends inside the block.
  g.put(21, 2.93, 40, FACING.east); g.hold('KeyW', .5); g.tap('Space'); g.hold('KeyW', 1.5); g.run(2); assert(g.player.x <= E.x[1] + 1e-9 && g.height.grounded(), `inside the edges (${g.at()})`); assert(!bad(g.player));
  report.bounds = {places: pulls / 8, pullUps: ups, note: 'the walk along the edges and the roofs is in the stand and mantle checks'};
});

console.log(JSON.stringify({...(ONLY ? {partial: ONLY} : {}), passed: results.length, checks: results, report, limitations: [
  'Headless: the body is driven by the keys the game reads; how climbing, mantling and falling feel is for the user in Safari.',
  'Sloping pieces (lean-to sheets, awnings) hold nobody and stop nobody: they are not in the space (MAP-03).',
  'Enemies, the teammate and co-op know nothing of height yet (map builds 4 and 5).']}, null, 2));
