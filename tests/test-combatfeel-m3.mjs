// Build 06 combat-feel corrections: kill alert (no marker change on kill), larger blood with headshots bigger,
// persistent capped blood decals (co-op included), death variants by direction and body location, and
// downed AI allies never ending the mission. Headless production code; rendering and audio are mocked.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame, projectRoot} from './sprint-harness.mjs';

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const {CLASSES} = await import(new URL('dist/combat.js', projectRoot));
const {DECAL_LIMIT} = await import(new URL('dist/effects.js', projectRoot));
const {deathVariant, DEATH_VARIANTS, hitZone} = await import(new URL('dist/characters.js', projectRoot));
const results = [];
async function check(name, fn) { await fn(); results.push(name); }

async function game(role = null) {
  const g = await createGame();
  g.prepare({role, clearLane: false});
  g.el('blood').checked = true;
  for (const a of g.actors) a.animate = a.visual.animate;
  let clock = 0; g.frame(0); g.step = s => g.frame(clock += s * 1000);
  g.wait = s => { const n = Math.max(1, Math.round(s * 60)); for (let i = 0; i < n; i++) g.step(s / n); };
  return g;
}
const enemies = g => g.actors.filter(a => a.team === 'enemy');
function place(g, a, x = 0, z = 45, yaw = 0) { a.g.position.set(x, g.groundY(x, z), z); a.g.rotation.set(0, yaw, 0); a.g.visible = true; a.g.updateMatrixWorld(true); }
const at = (a, h) => a.g.position.clone().add(new THREE.Vector3(0, h, 0));
const newIds = () => ({geometry: new THREE.BufferGeometry().id, material: new THREE.MeshBasicMaterial().id});

await check('kill alert: text only, and a kill never changes marker size or colour', async () => {
  const css = fs.readFileSync(new URL('dist/style.css', projectRoot), 'utf8');
  assert(!/#hit\.kill/.test(css) && !/#hit[^{]*\{[^}]*scale\(/.test(css), 'no kill-specific marker style');
  assert(/#killalert\{[^}]*opacity:0/.test(css) && !/#killalert\{[^}]*(animation|scale\()/.test(css), 'alert is plain text that fades, no animation or scaling');
  assert(fs.readFileSync(new URL('dist/index.html', projectRoot), 'utf8').includes('<div id="killalert"'));
  const g = await game(), e = enemies(g)[0]; place(g, e);
  const from = new THREE.Vector3(0, g.groundY(0, 52) + 1.5, 52), marker = g.el('hit'), alert = g.el('killalert');
  g.hitScan(from, at(e, 1.2).sub(from).normalize(), CLASSES.assault, 'local');
  const hitStyle = {...marker.style}, hitClasses = ['head', 'kill'].map(c => marker.classList.contains(c));
  assert.equal(alert.textContent || '', '', 'no alert on a non-lethal hit'); assert(!(alert.style.opacity > 0));
  e.hp = 5; g.wait(.3);
  g.hitScan(from, at(e, 1.2).sub(from).normalize(), CLASSES.assault, 'local');
  assert(e.hp <= 0);
  assert.deepEqual(['head', 'kill'].map(c => marker.classList.contains(c)), hitClasses, 'body kill marker classes identical to a body hit');
  assert.deepEqual({...marker.style, opacity: hitStyle.opacity}, hitStyle, 'no inline size/colour/transform change on kill');
  assert.equal(marker.style.opacity, 1); assert.equal(alert.textContent, 'ENEMY DOWN'); assert.equal(alert.style.opacity, 1);
  g.wait(1.8); assert.equal(alert.style.opacity, 0, 'alert is brief');
  // Headshots may tint the marker; the kill itself still adds nothing else.
  const e2 = enemies(g)[1]; place(g, e2, 3, 45);
  g.hitScan(from, at(e2, 1.62).sub(from).normalize(), CLASSES.assault, 'local');
  assert(marker.classList.contains('head') && !marker.classList.contains('kill'));
  // Guest: the host's hit reply drives the same alert.
  const guest = await game('guest');
  guest.receive({type: 'hit', head: false, kill: false}); assert.equal(guest.el('killalert').textContent || '', '');
  guest.receive({type: 'hit', head: false, kill: true}); assert.equal(guest.el('killalert').textContent, 'ENEMY DOWN'); assert(!guest.el('hit').classList.contains('kill'));
});

await check('blood is substantially larger than Build 05 and headshots are larger than body shots', async () => {
  const g = await game(), e = enemies(g)[0]; place(g, e);
  const [droplets, mist, mistHead] = g.fx.objects;
  assert(mist.material.size >= .5 && mistHead.material.size > mist.material.size * 1.4, 'mist sprites .5 m+ (Build 05 sphere was .18 m across); head mist larger');
  assert(droplets.material.size >= .08, 'droplets .08 m+ (Build 05 .035)');
  const dir = new THREE.Vector3(0, 0, -1);
  g.fx.spray(at(e, 1.2), dir, false); const body = g.fx.stats(); g.fx.clear();
  g.fx.spray(at(e, 1.62), dir, true); const head = g.fx.stats(); g.fx.clear();
  assert(body.droplets >= 30 && body.mist >= 4, 'body: 30+ droplets (Build 05: 10) and a mist cloud');
  assert(head.droplets > body.droplets * 1.5 && head.mist > body.mist, 'headshot noticeably larger');
  // Spread: droplets fan out well beyond the Build 05 spray within a quarter second.
  g.fx.spray(at(e, 1.2), dir, false); g.wait(.25);
  const p = droplets.geometry.attributes.position.array, c = droplets.geometry.attributes.color.array, xs = [];
  for (let i = 0; i < c.length / 4; i++) if (c[i * 4 + 3] > 0) xs.push(p[i * 3]);
  assert(Math.max(...xs) - Math.min(...xs) > .4, 'sideways spread well beyond Build 05 (~.3 m)');
});

// A wall with open ground in front of its +x face.
function eastWall(g) {
  for (const o of g.occluders) {
    const b = new THREE.Box3().setFromObject(o);
    if (b.max.y - b.min.y < 3 || b.max.x - b.min.x > .6 || b.max.z - b.min.z < 3) continue;
    const x = b.max.x + 1.2, z = (b.min.z + b.max.z) / 2;
    if (g.blocked(x, z) || g.blocked(x + 3, z)) continue;
    return {b, x, z};
  }
}
await check('decals: wall behind the victim gets an oriented splat; otherwise the floor just behind; overhang clamped', async () => {
  const g = await game(), e = enemies(g)[0];
  const w = eastWall(g); assert(w, 'found a wall');
  place(g, e, w.x, w.z, Math.PI / 2);
  const before = g.fx.stats().decals;
  g.aiHit({pos: e.g.position, a: e}, new THREE.Vector3(w.x + 12, g.groundY(w.x + 12, w.z) + 1.42, w.z), at(e, 1.25));
  const d = g.fx.decals().at(-1); assert.equal(g.fx.stats().decals, before + 1);
  assert(Math.abs(d.position[0] - (w.b.max.x + .005)) < 1e-4, 'on the wall plane, offset 5 mm');
  const dec = g.decalFor(at(e, 1.25), new THREE.Vector3(-1, 0, 0), false);
  assert.deepEqual(dec.slice(3, 6).map(v => Math.round(v * 1e6) / 1e6), [1, 0, 0], 'faces the shooter side');
  // Open ground: floor splat behind along the shot, on the exact terrain triangle.
  place(g, e, 0, 45);
  for (let i = 0; i < 20; i++) {
    const p = at(e, 1.2), dir = new THREE.Vector3(Math.sin(i), -.05, -Math.cos(i)).normalize(), f = g.decalFor(p, dir, false);
    const n = new THREE.Vector3(); const ty = g.terrainAt(f[0], f[2], n);
    assert(Math.abs(f[1] - (ty + .014)) < 1e-9 && n.y > .99 && f[4] > .99, 'terrain decal on the rendered surface');
    const back = (f[0] - p.x) * dir.x + (f[2] - p.z) * dir.z; assert(back > .3 && back < 1.3, 'lands behind the victim');
  }
  // terrainAt matches a real raycast of the terrain mesh.
  const ray = new THREE.Raycaster();
  for (let i = 0; i < 12; i++) { const x = -40 + i * 7.3, z = 50 - i * 9.1; ray.set(new THREE.Vector3(x, 10, z), new THREE.Vector3(0, -1, 0)); const hit = ray.intersectObject(g.ground)[0]; assert(Math.abs(hit.point.y - g.terrainAt(x, z)) < 1e-6); }
  // Every box-surface decal stays inside its face (no overhang), sampled all over the map.
  let boxDecals = 0;
  for (let i = 0; i < 400 && boxDecals < 40; i++) {
    const o = g.occluders[1 + (i * 37) % (g.occluders.length - 1)], b = new THREE.Box3().setFromObject(o), c = b.getCenter(new THREE.Vector3());
    const side = [[1, 0], [-1, 0], [0, 1], [0, -1]][i % 4], p = new THREE.Vector3(side[0] ? (side[0] > 0 ? b.max.x : b.min.x) + side[0] * 1.2 : c.x + ((i % 7) - 3) * .3, Math.min(b.max.y - .05, b.min.y + 1.1), side[1] ? (side[1] > 0 ? b.max.z : b.min.z) + side[1] * 1.2 : c.z + ((i % 5) - 2) * .3);
    const f = g.decalFor(p, new THREE.Vector3(-side[0], 0, -side[1]), i % 3 === 0);
    if (!f || f[4] > .9) continue;
    const host = g.occluders.slice(1).map(q => new THREE.Box3().setFromObject(q)).find(q => q.expandByScalar(.01).containsPoint(new THREE.Vector3(f[0], f[1], f[2])));
    assert(host, 'decal sits on a box face');
    const r = f[6] / Math.SQRT2 - 1e-6, axes = Math.abs(f[3]) > .5 ? ['y', 'z'] : ['x', 'y'];
    for (const k of axes) { const v = f[{x: 0, y: 1, z: 2}[k]]; assert(v - r >= host.min[k] && v + r <= host.max[k], 'within face extents'); }
    boxDecals++;
  }
  assert(boxDecals >= 10, `sampled ${boxDecals} box decals`);
});

await check('decals: capped at the limit, oldest retired first, no per-hit allocation, cleared on reset and menu', async () => {
  assert(DECAL_LIMIT >= 30 && DECAL_LIMIT <= 50);
  const g = await game(), e = enemies(g)[0];
  const dir = new THREE.Vector3(0, -.05, -1).normalize();
  g.wait(.2); const baselineChildren = g.scene.children.length, ids0 = newIds();
  for (let round = 0; round < 4; round++) {
    const seen = [];
    for (let i = 0; i < DECAL_LIMIT + 25; i++) {
      const x = -30 + (i % 13) * 4.5, z = 50 - Math.floor(i / 13) * 4.5;
      place(g, e, x, z); e.hp = 100;
      g.aiHit({pos: e.g.position, a: e}, new THREE.Vector3(x, 1.5, z + 12), at(e, 1.25));
      seen.push(g.fx.stats().decals);
      if (i % 9 === 0) g.wait(.1);
    }
    assert.equal(Math.max(...seen), DECAL_LIMIT, 'never exceeds the cap');
    const list = g.fx.decals(); assert.equal(list.length, DECAL_LIMIT);
    const ids = list.map(d => d.id); assert.deepEqual(ids, ids.map((_, k) => ids[0] + k), 'contiguous newest ids');
    assert.equal(ids.at(-1) - ids[0], DECAL_LIMIT - 1); assert(ids[0] >= 25, 'the oldest were retired first');
    g.wait(1.2);
    assert.equal(g.fx.stats().liveParticles, 0, 'particles expire');
    assert.equal(g.scene.children.length, baselineChildren, 'no scene growth');
    if (round % 2) g.goMenu(); else g.reset();
    assert.equal(g.fx.stats().decals, 0, 'reset/menu clears decals'); assert.equal(g.fx.decals().length, 0);
    g.reset(); g.play(); g.el('blood').checked = true;
  }
  const ids1 = newIds();
  assert.equal(ids1.geometry - ids0.geometry, 1, 'no BufferGeometry created by 260 hits');
  assert.equal(ids1.material - ids0.material, 1, 'no Material created by 260 hits');
});

await check('Blood setting off suppresses spray and decals (and hides existing ones); co-op host sends decals, guest replays them', async () => {
  const g = await game('host'), e = enemies(g)[0]; place(g, e);
  const eye = new THREE.Vector3(0, 1.5, 57);
  g.el('blood').checked = false; g.el('blood').onchange();
  g.aiHit({pos: e.g.position, a: e}, eye, at(e, 1.25));
  assert.equal(g.fx.stats().decals, 0); assert.equal(g.fx.stats().liveParticles, 0);
  assert(g.fx.objects.every(o => o.visible === false), 'Blood off hides pools and decals');
  const impact = g.messages.filter(m => m.type === 'impact').at(-1);
  assert(impact.dc && impact.dc.length === 8 && impact.zn === 'upper', 'host still sends the decal for a guest with Blood on');
  g.el('blood').checked = true; g.el('blood').onchange(); assert(g.fx.stats().visible && g.fx.objects.at(-1).visible, 'Blood on shows decals again');
  e.hp = 100; g.aiHit({pos: e.g.position, a: e}, eye, at(e, 1.25)); assert.equal(g.fx.stats().decals, 1);
  const r = g.remote; place(g, r, 0, 52); g.wait(.2);
  g.receive({type: 'shot', dir: at(e, 1.2).sub(r.g.position.clone().add(new THREE.Vector3(0, 1.7, 0))).normalize().toArray()});
  const shotImpact = g.messages.filter(m => m.type === 'impact').at(-1);
  assert(shotImpact.dc && shotImpact.zn, 'guest shot impact carries zone and decal');
  const guest = await game('guest');
  const ge = guest.actors.filter(a => !a.remote)[g.actors.filter(a => !a.remote).indexOf(e)]; place(guest, ge);
  for (const m of g.messages.filter(m => m.type === 'impact')) guest.receive(m);
  const hostDecals = g.fx.decals().map(d => d.position.map(v => Math.round(v * 1e3))), guestDecals = guest.fx.decals().map(d => d.position.map(v => Math.round(v * 1e3)));
  assert(guestDecals.length >= hostDecals.length && hostDecals.every(h => guestDecals.some(q => q.every((v, k) => Math.abs(v - h[k]) <= 1))), 'guest shows the host decals');
  assert(guest.fx.stats().liveParticles > 0);
  guest.wait(1 / 60); assert(guest.fx.objects.slice(0, 3).some(o => o.visible), 'pools with live particles draw'); guest.wait(1.5); assert(guest.fx.objects.slice(0, 3).every(o => !o.visible), 'empty pools cost no draw call');
  const g2 = await game('guest'); g2.el('blood').checked = false;
  for (const m of g.messages.filter(m => m.type === 'impact')) g2.receive(m);
  assert.equal(g2.fx.stats().decals, 0); assert.equal(g2.fx.stats().liveParticles, 0);
  const g3 = await game('guest'); const bad = structuredClone(shotImpact); bad.dc = [0, 0, 0, 0, 0, 0, .5, 0]; g3.receive(bad);
  assert.equal(g3.fx.stats().decals, 0, 'malformed decal ignored'); assert(g3.fx.stats().liveParticles > 0, 'rest of the impact still plays');
});

await check('death variants: selected by shot direction, headshot and body location; distinct poses; all fall away from the shooter', async () => {
  assert.equal(hitZone(1.6), 'head'); assert.equal(hitZone(1.2), 'upper'); assert.equal(hitZone(.85), 'lower'); assert.equal(hitZone(.4), 'legs');
  // Soldier faces local -z: +z travel = shot from the front.
  const table = [[{x: 0, z: 1, zone: 'head'}, 'collapse'], [{x: 0, z: -1, zone: 'head'}, 'collapse'], [{x: 0, z: 1, zone: 'upper'}, 'stagger'], [{x: 0, z: -1, zone: 'upper'}, 'pitch'],
    [{x: 1, z: .1, zone: 'upper'}, 'spin'], [{x: -1, z: -.2, zone: 'upper'}, 'spin'], [{x: 0, z: 1, zone: 'lower'}, 'doubleover'], [{x: 1, z: 0, zone: 'legs'}, 'crumple']];
  for (const [input, want] of table) assert.equal(deathVariant(input), want, JSON.stringify(input));
  assert(Object.keys(DEATH_VARIANTS).length >= 5);
  assert(Object.values(DEATH_VARIANTS).every(v => v.duration <= .95), 'every death completes within .95 s');
  // Real kills through hitScan: the zone and direction choose the variant.
  const g = await game(), cases = [[1.62, 0, 'collapse'], [1.2, Math.PI, 'stagger'], [1.2, 0, 'pitch'], [1.2, Math.PI / 2, 'spin'], [.85, 0, 'doubleover'], [.4, 0, 'crumple']];
  // Shooter is at +z; yaw 0 faces -z (shot from behind), yaw pi faces the shooter. Leg shots aim at one leg (x .112).
  const poses = {};
  for (const [i, [h, yaw, want]] of cases.entries()) {
    const e = enemies(g)[i]; place(g, e, -12 + i * 5, 45, yaw); e.hp = 1;
    const from = new THREE.Vector3(e.g.position.x, g.groundY(e.g.position.x, 55) + 1.5, 55);
    g.hitScan(from, at(e, h).add(new THREE.Vector3(h < .7 ? .112 : 0, 0, 0)).sub(from).normalize(), CLASSES.assault, 'local');
    assert(e.hp <= 0, `killed ${want}`); assert.equal(e.visual.state().variant, want);
  }
  g.wait(.3);
  for (const [i, [, , want]] of cases.entries()) { const e = enemies(g)[i], rig = e.g.children[0], torso = rig.children[0]; poses[want] = [...rig.quaternion.toArray(), rig.position.y, torso.rotation.x].map(v => Math.round(v * 1e3)); }
  const keys = Object.keys(poses); for (let a = 0; a < keys.length; a++) for (let b = a + 1; b < keys.length; b++) assert.notDeepEqual(poses[keys[a]], poses[keys[b]], `${keys[a]} vs ${keys[b]} differ mid-fall`);
  // Invariant: whatever the variant, the head ends up displaced along the shot (away from the shooter).
  const v = await game(), e = enemies(v)[0];
  for (let k = 0; k < 16; k++) {
    const yaw = k * .7, shot = new THREE.Vector3(Math.cos(k * 1.3), 0, Math.sin(k * 1.3));
    place(v, e, 0, 45, yaw); e.hp = 100; e.resetPose(); v.wait(1 / 60);
    const zone = ['head', 'upper', 'lower', 'legs'][k % 4], local = shot.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -yaw);
    e.hp = 0; e.react({x: local.x, z: local.z, strength: .7, kill: true, zone});
    v.wait(1);
    const s = e.visual.state(); assert(s.fallDone && s.rigTilt > 1.35, `${s.variant} lies down`);
    e.g.updateMatrixWorld(true); const head = e.g.children[0].localToWorld(new THREE.Vector3(0, 1.62, 0)).sub(e.g.position);
    assert(head.x * shot.x + head.z * shot.z > 1.2, `${s.variant} falls away from the shooter`);
    assert(head.y < .5, `${s.variant} head near the ground`);
  }
});

await check('guest plays the same death variant from the impact zone; old hosts without a zone still get a sensible fall', async () => {
  const host = await game('host'), e = enemies(host)[0]; place(host, e, 0, 45); e.hp = 1;
  const from = new THREE.Vector3(0, host.groundY(0, 55) + 1.5, 55);
  host.hitScan(from, at(e, .4).add(new THREE.Vector3(.112, 0, 0)).sub(from).normalize(), CLASSES.assault, 'local');
  const m = host.messages.filter(x => x.type === 'impact').at(-1); assert.equal(m.zn, 'legs'); assert(m.kill);
  const guest = await game('guest'), ge = guest.actors.filter(a => !a.remote)[host.actors.filter(a => !a.remote).indexOf(e)]; place(guest, ge, 0, 45);
  guest.receive(m); assert.equal(ge.visual.state().variant, 'crumple');
  const old = await game('guest'), oe = old.actors.filter(a => !a.remote)[host.actors.filter(a => !a.remote).indexOf(e)]; place(old, oe, 0, 45);
  const legacy = structuredClone(m); delete legacy.zn; delete legacy.dc; legacy.head = true; old.receive(legacy);
  assert.equal(oe.visual.state().variant, 'collapse', 'Build 05 impact (no zone) falls back to the head flag');
});

await check('a single AI ally going down never ends the mission (solo, host, guest); it regroups after 15 s', async () => {
  for (const role of [null, 'host']) {
    const g = await game(role); g.restoreAI();
    for (const x of enemies(g)) { x.hp = 0; x.dead = 999; } // isolate: nothing can shoot the humans
    if (role) g.remote.g.position.set(3, 0, 61);
    const ally = g.actors.find(a => a.team === 'ally' && !a.remote); ally.hp = 10;
    g.aiHit({pos: ally.g.position, a: ally}, new THREE.Vector3(0, 1.4, 40), at(ally, 1.25));
    assert(ally.hp <= 0 && ally.visual.state().falling);
    g.wait(14.5); assert.equal(g.state().state, 'playing'); assert(ally.hp <= 0, 'still down at 14.5 s');
    g.wait(1); assert.equal(g.state().state, 'playing'); assert.equal(ally.hp, 100, 'regrouped at 15 s (existing behaviour)');
    assert(!ally.visual.state().falling);
    assert(!g.messages.some(m => m.type === 'end'), `${role || 'solo'}: no end message`);
  }
  const guest = await game('guest');
  guest.receive({type: 'impact', t: 0, p: [0, 1.25, 58], d: [0, 0, 1], head: false, kill: true, zn: 'upper'});
  guest.wait(3); assert.equal(guest.state().state, 'playing'); assert(guest.actors[0].visual.state().falling);
});

await check('mission failure text names who was killed; the guest gets its own point of view', async () => {
  const solo = await game(); solo.set({hp: 1});
  solo.aiHit({pos: solo.player, a: null}, new THREE.Vector3(0, 1.4, 40), solo.player.clone().add(new THREE.Vector3(0, 1.4, 0)));
  assert.equal(solo.state().state, 'ended'); assert.match(solo.el('report').textContent, /^You were killed\./);
  const host = await game('host'); host.set({hp: 1});
  host.aiHit({pos: host.player, a: null}, new THREE.Vector3(0, 1.4, 40), host.player.clone().add(new THREE.Vector3(0, 1.4, 0)));
  assert.match(host.el('report').textContent, /^You were killed\./);
  assert.match(host.messages.find(m => m.type === 'end').reason, /^Your co-op teammate was killed\./, 'guest is told the host died');
  const host2 = await game('host'); host2.remote.hp = 1; host2.remote.g.visible = true;
  host2.aiHit({pos: host2.remote.g.position, a: host2.remote}, new THREE.Vector3(0, 1.4, 40), host2.remote.g.position.clone().add(new THREE.Vector3(0, 1.25, 0)));
  assert.match(host2.el('report').textContent, /^Your co-op teammate was killed\./);
  const end = host2.messages.find(m => m.type === 'end'); assert.match(end.reason, /^You were killed\./, 'guest is told it died');
  const guest = await game('guest'); guest.receive(end); assert.match(guest.el('report').textContent, /^You were killed\./);
});

await check('review gaps: headshot rule pinned at 1.45 m; head flag carried through the real hit path; zoom keeps blood in proportion', async () => {
  assert.equal(hitZone(1.45), 'upper'); assert.equal(hitZone(1.4501), 'head'); assert.equal(hitZone(1.0), 'lower'); assert.equal(hitZone(1.0001), 'upper'); assert.equal(hitZone(.72), 'legs');
  const g = await game(), [a, b] = enemies(g); place(g, a, 0, 45, Math.PI); place(g, b, 3, 45, Math.PI);
  for (const [e, h, want] of [[a, 1.44, 62], [b, 1.47, -10]]) {
    const from = new THREE.Vector3(e.g.position.x, e.g.position.y + h, 52);
    g.hitScan(from, new THREE.Vector3(0, 0, -1), CLASSES.assault, 'local');
    assert.equal(Math.round(e.hp), want, `horizontal shot at ${h} m`);
  }
  const shots = {};
  for (const [label, h] of [['body', 1.2], ['head', 1.62]]) {
    const t = await game(), e = enemies(t)[0]; place(t, e, 0, 45, Math.PI); e.hp = 1e6;
    const from = new THREE.Vector3(0, t.groundY(0, 52) + 1.5, 52);
    t.hitScan(from, at(e, h).sub(from).normalize(), CLASSES.assault, 'local');
    shots[label] = {droplets: t.fx.stats().droplets, size: t.fx.decals().at(-1).size};
  }
  assert(shots.head.droplets > shots.body.droplets * 1.5 && shots.head.size > shots.body.size, JSON.stringify(shots));
  const [, mist] = g.fx.objects, base = mist.material.size;
  g.fx.update(0, 20); assert(Math.abs(mist.material.size - base * Math.tan(35 * Math.PI / 180) / Math.tan(10 * Math.PI / 180)) < 1e-9, 'marksman zoom scales sprites');
  g.fx.update(0, 70); assert(Math.abs(mist.material.size - base) < 1e-9);
});

await check('review gaps: falls away from the shooter through the real hitScan path at any facing; distinct authored poses; spin direction', async () => {
  for (const yaw of [0, .9, Math.PI / 2, 2.4, -1.1, 4]) for (const h of [1.2, 1.62, .85]) {
    const g = await game(), e = enemies(g)[0]; place(g, e, 0, 45, yaw); e.hp = 1;
    const from = new THREE.Vector3(0, g.groundY(0, 55) + 1.5, 55), dir = at(e, h).sub(from).normalize();
    g.hitScan(from, dir, CLASSES.assault, 'local'); assert(e.hp <= 0, `killed at yaw ${yaw}, h ${h}`);
    g.wait(1); e.g.updateMatrixWorld(true);
    const head = e.g.children[0].localToWorld(new THREE.Vector3(0, 1.62, 0)).sub(e.g.position);
    assert(head.x * dir.x + head.z * dir.z > 1.2, `${e.visual.state().variant} at yaw ${yaw} falls away (${(head.x * dir.x + head.z * dir.z).toFixed(2)})`);
  }
  const names = Object.keys(DEATH_VARIANTS), poses = names.map(n => JSON.stringify(DEATH_VARIANTS[n].pose(.3, .7, 1)));
  assert.equal(new Set(poses).size, names.length, 'every variant has its own pose at the same time and direction');
  const g = await game(), [l, r] = enemies(g); place(g, l, -3, 45); place(g, r, 3, 45);
  l.hp = r.hp = 0; l.react({x: 1, z: 0, kill: true, zone: 'upper'}); r.react({x: -1, z: 0, kill: true, zone: 'upper'}); g.wait(.5);
  const twist = e => new THREE.Euler().setFromQuaternion(e.g.children[0].quaternion, 'XZY').y;
  assert(l.visual.state().variant === 'spin' && r.visual.state().variant === 'spin' && Math.sign(twist(l)) === -Math.sign(twist(r)) && Math.abs(twist(l)) > .3, 'spin turns with the side of the hit');
});

await check('review gaps: bodies rest on the ground, not in it, for every direction and zone', async () => {
  const g = await game(), e = enemies(g)[0];
  for (const zone of ['head', 'upper', 'lower', 'legs']) for (let k = 0; k < 12; k++) {
    const a = k / 12 * Math.PI * 2; place(g, e, 0, 45); e.resetPose(); e.hp = 0; e.react({x: Math.sin(a), z: Math.cos(a), strength: .7, kill: true, zone});
    let fallMin = Infinity; for (let i = 0; i < 60; i++) { g.step(1 / 60); e.g.updateMatrixWorld(true); let m = Infinity; e.g.traverse(o => { if (o.isMesh) m = Math.min(m, new THREE.Box3().setFromObject(o, true).min.y - e.g.position.y); }); fallMin = Math.min(fallMin, m); if (i === 59) assert(m > -.07 && m < .2, `${e.visual.state().variant} at ${k * 30} deg rests at ${m.toFixed(3)} m`); }
    assert(fallMin > -.2, `${e.visual.state().variant} dips ${fallMin.toFixed(3)} m while falling`);
  }
});

await check('review gaps: kill feedback is text only; no kill-specific marker class, text or style in CSS or at runtime', async () => {
  const css = fs.readFileSync(new URL('dist/style.css', projectRoot), 'utf8');
  const sel = [...css.matchAll(/([^{}]+)\{/g)].flatMap(m => m[1].split(',').map(x => x.trim()));
  assert.deepEqual([...new Set(sel.filter(x => x.includes('#hit')))].sort(), ['#hit', '#hit.head'], 'marker selectors');
  assert.deepEqual([...new Set(sel.filter(x => x.includes('#killalert')))], ['#killalert'], 'alert has no state classes');
  assert(!/@keyframes/.test(css.slice(css.indexOf('#killalert'))) && /#killalert\{[^}]*transition:opacity \.25s[^}]*\}/.test(css), 'plain opacity fade');
  const g = await game(), e = enemies(g)[0]; place(g, e, 0, 45, Math.PI); const marker = g.el('hit');
  const from = new THREE.Vector3(0, g.groundY(0, 52) + 1.5, 52), shoot = () => g.hitScan(from, at(e, 1.2).sub(from).normalize(), CLASSES.assault, 'local');
  shoot(); const hit = JSON.stringify({text: marker.textContent, style: marker.style, classes: String(marker.classList)});
  e.hp = 1; g.wait(.3); shoot(); assert(e.hp <= 0);
  assert.equal(JSON.stringify({text: marker.textContent, style: marker.style, classes: String(marker.classList)}), hit, 'body kill leaves the marker exactly as a body hit (text, style and every class)');
  // Only your own kills: none for a guest's kill on the host, none for bot kills; reset clears it.
  const host = await game('host'), he = enemies(host)[0]; place(host, he, 0, 45, Math.PI); place(host, host.remote, 0, 52); he.hp = 1;
  host.receive({type: 'shot', dir: at(he, 1.2).sub(host.remote.g.position.clone().add(new THREE.Vector3(0, 1.7, 0))).normalize().toArray()});
  assert(he.hp <= 0 && !(host.el('killalert').textContent) && host.messages.some(m => m.type === 'hit' && m.kill), 'guest kill: alert goes to the guest only');
  const kills = host.kills(), be = enemies(host)[1]; place(host, be, 4, 45); be.hp = 1;
  host.aiHit({pos: be.g.position, a: be}, new THREE.Vector3(4, 1.4, 55), at(be, 1.25));
  assert(be.hp <= 0 && !(host.el('killalert').textContent) && host.kills() === kills, 'bot kill: no alert, not counted');
  shoot(); e.hp = 1; place(g, e, 0, 45, Math.PI); shoot(); assert.equal(g.el('killalert').style.opacity, 1);
  g.reset(); assert.equal(g.el('killalert').style.opacity, 0); assert.equal(marker.style.opacity, 0); assert(!marker.classList.contains('head'), 'reset clears alert and marker');
});

await check('review gaps: cosmetic blood never consumes the seeded gameplay rand()', async () => {
  const run = async blood => {
    const g = await game(); g.el('blood').checked = blood; g.restoreAI(); g.set({hp: 1e9});
    const from = new THREE.Vector3(0, g.groundY(0, 55) + 1.6, 55);
    for (let s = 0; s < 40; s++) { g.wait(.5); const e = enemies(g).find(x => x.hp > 0); if (e) g.hitScan(from, at(e, 1.2).sub(from).normalize(), CLASSES.assault, 'local'); }
    return {state: JSON.stringify(g.actors.map(a => [a.hp, ...a.g.position.toArray().map(v => v.toFixed(6))])), sprays: g.fx.stats().sprays};
  };
  const on = await run(true), off = await run(false);
  assert(on.sprays > 5, `blood actually ran (${on.sprays} sprays)`); assert.equal(off.sprays, 0);
  assert.equal(on.state, off.state, 'identical AI outcome with Blood on and off');
});

await check('review gaps: decals drawn where recorded; never on surfaces buried under the ground; all allies down still regroup at the regroup point', async () => {
  const g = await game(), e = enemies(g)[0];
  for (let i = 0; i < 50; i++) { const x = -30 + (i % 10) * 6, z = 50 - Math.floor(i / 10) * 6; place(g, e, x, z); g.aiHit({pos: e.g.position, a: e}, new THREE.Vector3(x + 5, 1.5, z + 10), at(e, 1.25)); }
  const mesh = g.fx.objects.at(-1), m = new THREE.Matrix4(), p = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  for (const d of g.fx.decals()) { mesh.getMatrixAt(d.slot, m); m.decompose(p, q, sc); const n = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    assert(p.distanceTo(new THREE.Vector3(...d.position)) < 1e-5 && Math.abs(sc.x - d.size) < 1e-5 && n.dot(new THREE.Vector3(...d.normal).normalize()) > .999, 'instance matrix matches record'); }
  // Downward leg shots inside buildings (floor slabs lie partly under the rendered terrain).
  const slabs = g.occluders.map(o => new THREE.Box3().setFromObject(o)).filter(b => b.max.y - b.min.y < .15 && b.max.x - b.min.x > 3 && b.max.z - b.min.z > 3);
  assert(slabs.length >= 10); let floors = 0;
  for (const b of slabs) for (const [fx, fz] of [[.3, .3], [.5, .5], [.7, .4], [.4, .7]]) {
    const x = b.min.x + (b.max.x - b.min.x) * fx, z = b.min.z + (b.max.z - b.min.z) * fz, pt = new THREE.Vector3(x, g.groundY(x, z) + .3, z);
    for (const dir of [new THREE.Vector3(0, -.35, -1), new THREE.Vector3(.7, -.5, .3), new THREE.Vector3(0, -1, .05)]) {
      const d = g.decalFor(pt, dir.normalize(), false); if (!d || d[4] < .9) continue; floors++;
      assert(d[1] >= g.terrainAt(d[0], d[2]) - .003, `floor decal at ${d.slice(0, 3).map(v => v.toFixed(2))} is not under the ground`);
    }
  }
  assert(floors >= 40, `${floors} indoor floor decals checked`);
  const a = await game(); a.restoreAI(); for (const x of enemies(a)) { x.hp = 0; x.dead = 999; }
  const allies = a.actors.filter(x => x.team === 'ally' && !x.remote);
  for (const ally of allies) { ally.hp = 1; a.aiHit({pos: ally.g.position, a: ally}, new THREE.Vector3(0, 1.4, 40), at(ally, 1.25)); }
  assert(allies.every(x => x.hp <= 0)); a.wait(14.9); assert.equal(a.state().state, 'playing');
  const back = {}; for (let i = 0; i < 30 && Object.keys(back).length < 3; i++) { a.step(1 / 60); for (const x of allies) if (x.hp === 100 && !back[x.index]) back[x.index] = x.g.position.toArray(); }
  assert.equal(a.state().state, 'playing'); assert.equal(Object.keys(back).length, 3, 'all three stood up at 15 s');
  for (const x of allies) { const [px, , pz] = back[x.index]; assert(Math.abs(px - (x.index - 1) * 4) < .2 && Math.abs(pz - 65) < .2, `ally ${x.index} regrouped at the regroup point`); }
});

await check('review gaps: co-op guest uses the host yaw for the death; human wounds leave the same decals on both peers', async () => {
  const host = await game('host'), e = enemies(host)[0]; place(host, e, 0, 45, 0); host.networkTick(1);
  e.g.rotation.y = Math.PI; e.hp = 1; // the AI turned to face the shooter after the last snapshot
  const from = new THREE.Vector3(0, host.groundY(0, 55) + 1.5, 55);
  host.hitScan(from, at(e, 1.2).sub(from).normalize(), CLASSES.assault, 'local'); host.networkTick(1);
  host.set({hp: 1e6}); host.aiHit({pos: host.player, a: null}, new THREE.Vector3(0, 1.4, 40), host.player.clone().add(new THREE.Vector3(0, 1.4, 0)));
  place(host, host.remote, 3, 55); host.aiHit({pos: host.remote.g.position, a: host.remote}, new THREE.Vector3(3, 1.4, 40), at(host.remote, 1.25));
  const guest = await game('guest'), idx = host.actors.filter(a => !a.remote).indexOf(e), ge = guest.actors.filter(a => !a.remote)[idx];
  for (const m of host.messages) guest.receive(m);
  assert.equal(ge.visual.state().variant, e.visual.state().variant, 'same variant on both peers'); assert.equal(ge.g.rotation.y, Math.PI);
  guest.wait(1); ge.g.updateMatrixWorld(true); const dir = at(e, 1.2).sub(from).normalize(), head = ge.g.children[0].localToWorld(new THREE.Vector3(0, 1.62, 0)).sub(ge.g.position);
  assert(head.x * dir.x + head.z * dir.z > 1.2, 'guest body also lies away from the shooter');
  const key = d => d.position.map(v => v.toFixed(3)).join();
  assert.deepEqual(guest.fx.decals().map(key), host.fx.decals().map(key), 'identical decal sets, including the host player and guest avatar wounds');
  assert(host.messages.some(m => m.type === 'impact' && m.t === 'guest' && m.dc && !m.d), 'guest wound sent as decal-only');
});

console.log(JSON.stringify({passed: results.length, checks: results, limitations: [
  'Headless production code with mocked DOM/WebGL/audio: particle counts, decal transforms, rig poses and messages are checked, not how they look.',
  'Co-op uses host-produced messages replayed into a guest instance; no real WebRTC.',
  'The ally test isolates the ally by disabling enemies so no human can be killed; it runs the real tickAI regroup.']}, null, 2));
