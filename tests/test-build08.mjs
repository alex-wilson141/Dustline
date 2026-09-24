// Build 08: death variants spread across real kills, shootable corpses that despawn, reinforcement waves and map density.
// Headless production code (the real hitScan and aiHit; the real tickAI/missionTick where noted); rendering, audio and
// transport are mocked, so frame cost, feel and live WebRTC are not covered here.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execSync} from 'node:child_process';
import {createGame, projectRoot} from './sprint-harness.mjs';

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const {CLASSES} = await import(new URL('dist/combat.js', projectRoot));
const {ENEMY_AI, ENEMY_SPAWNS, PATROL_LOOPS, REINFORCE_POINTS} = await import(new URL('dist/enemy-ai.js', projectRoot));
const {VILLAGE_PROPS} = await import(new URL('dist/village-props.js', projectRoot));
const {DEATH_VARIANTS} = await import(new URL('dist/characters.js', projectRoot));
const DEFAULTS = structuredClone(ENEMY_AI);
const restore = () => Object.assign(ENEMY_AI, structuredClone(DEFAULTS));
const results = [], report = {};
async function check(name, fn) { restore(); try { await fn(); } finally { restore(); } results.push(name); }

async function game({role = null, ai = false} = {}) {
  const g = await createGame();
  g.prepare({role, clearLane: false});
  g.player.set(0, g.groundY(0, 55), 55);
  if (ai) g.restoreAI();
  g.set({hp: 1e9}); g.el('blood').checked = true;
  for (const a of g.actors) a.animate = a.visual.animate;
  let clock = 0; g.frame(0); g.step = s => g.frame(clock += s * 1000);
  g.run = (seconds, each) => { for (let i = 0, n = Math.round(seconds * 60); i < n; i++) { g.step(1 / 60); each?.(i / 60); } };
  return g;
}
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const enemies = g => g.actors.filter(a => a.team === 'enemy');
const own = g => g.actors.filter(a => !a.remote);
const eyeOf = g => g.player.clone().setY(g.player.y + 1.7);
const at = (a, h) => a.g.position.clone().add(V(0, h, 0));
const newIds = () => ({geometry: new THREE.BufferGeometry().id, material: new THREE.MeshBasicMaterial().id});
function stand(g, a, x, z, yaw = 0) { a.hp = 100; a.dead = 0; a.diedAt = null; a.gone = false; a.sink = null; a.resetPose(); a.g.position.set(x, g.groundY(x, z), z); a.g.rotation.set(0, yaw, 0); a.g.visible = true; a.g.updateMatrixWorld(true); }
const tally = (m, v) => { m[v] = (m[v] || 0) + 1; };
const shares = m => { const n = Object.values(m).reduce((s, v) => s + v, 0); return Object.fromEntries(Object.entries(m).sort((u, v) => v[1] - u[1]).map(([k, v]) => [k, +(v / n * 100).toFixed(1)])); };
let seed = 20260924; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

// Build 07 chose the variant from direction and zone only; loaded from git to report the same kills before and after.
const tmp = new URL('dist/.b07-characters.js', projectRoot);
fs.writeFileSync(tmp, execSync('git show 899ee2f:dist/characters.js', {cwd: new URL('.', projectRoot)}));
let oldVariant; try { ({deathVariant: oldVariant} = await import(tmp.href)); } finally { fs.rmSync(tmp, {force: true}); }

await check('death variants: 600 face-on, 600 engagement and 600 all-angle player kills plus 300 bot kills spread across the variants; the guest plays the host choice', async () => {
  const host = await game({role: 'host'}), guest = await game({role: 'guest'}), hE = enemies(host); let parity = 0;
  const local = (a, d) => { const r = a.g.rotation.y, c = Math.cos(r), s = Math.sin(r); return {x: d[0] * c - d[2] * s, z: d[0] * s + d[2] * c}; };
  // face-on: the enemy faces the shooter exactly and the shot is aimed at the chest (1.2 m) with hip-fire or aimed spread,
  // the case Build 06/07 play produced (E15: 75% stagger); engagement: mostly facing (within 60 degrees; a quarter walking
  // past at any angle), centre mass (1.15 m +- 0.3) with 15% head shots; all-angle: uniform direction and height.
  const sample = (engage, faceOn = false) => {
    const now = {}, old = {}; let kills = 0;
    for (let i = 0; kills < 600 && i < 5000; i++) {
      const e = hE[i % hE.length]; hE.forEach(b => { b.g.visible = b === e; });
      const ang = rnd() * Math.PI * 2, dist = 5 + rnd() * 20, ox = Math.sin(ang) * dist, oz = 50 + Math.cos(ang) * dist, toward = Math.atan2(-ox, 50 - oz); // the game faces a target with atan2(position - target)
      const yaw = faceOn ? toward : engage && rnd() < .75 ? toward + (rnd() - .5) * Math.PI * 2 / 3 : rnd() * Math.PI * 2, spread = (rnd() < .5 ? 1 : .2) * dist * CLASSES.assault.spread * 5;
      const h = faceOn ? 1.2 + (rnd() - .5) * spread : engage ? (rnd() < .15 ? 1.58 + rnd() * .14 : Math.min(1.5, Math.max(.6, 1.15 + (rnd() + rnd() + rnd() - 1.5) * .35))) : .12 + rnd() * 1.7, lat = faceOn ? (rnd() - .5) * spread : (rnd() - .5) * .3;
      stand(host, e, 0, 50, yaw); e.hp = 1;
      if (host.blocked(ox, oz)) continue;
      const from = V(ox, host.groundY(ox, oz) + (rnd() < .25 ? 1.1 : 1.6), oz), aim = e.g.position.clone().add(V(Math.cos(ang) * lat, h, -Math.sin(ang) * lat));
      host.messages.length = 0; host.hitScan(from, aim.sub(from).normalize(), CLASSES.assault, 'local');
      if (e.hp > 0) continue; // a wall, prop, ally or the ground took the shot
      kills++; const v = e.visual.state().variant, m = host.messages.find(x => x.type === 'impact' && x.kill);
      assert(DEATH_VARIANTS[v] && m.dv === v, 'the impact carries the variant the host plays'); tally(now, v); tally(old, oldVariant({...local(e, m.d), zone: m.zn}));
      if (kills % 5 === 0) { const ge = own(guest)[m.t]; stand(guest, ge, 0, 50, yaw); guest.receive(m); assert.equal(ge.visual.state().variant, v, 'guest plays the host variant'); parity++; }
    }
    assert.equal(kills, 600); return {build08: shares(now), build07: shares(old)};
  };
  const faceOn = sample(true, true), engagement = sample(true), allAngles = sample(false), bot = {}, beforeBot = {};
  for (let i = 0; i < 300; i++) { // AI allies' hits: a chest point along the shooter-to-target line (aiHit, unchanged)
    const e = hE[i % hE.length], ang = rnd() * Math.PI * 2, dist = 8 + rnd() * 35, eye = V(Math.sin(ang) * dist, 0, 50 + Math.cos(ang) * dist), yaw = rnd() < .75 ? Math.atan2(-eye.x, 50 - eye.z) + (rnd() - .5) * Math.PI * 2 / 3 : rnd() * Math.PI * 2;
    stand(host, e, 0, 50, yaw); e.hp = 1; eye.y = host.groundY(eye.x, eye.z) + 1.42;
    host.messages.length = 0; host.aiHit({pos: e.g.position, a: e}, eye, at(e, 1.25));
    const v = e.visual.state().variant, m = host.messages.find(x => x.type === 'impact' && x.kill); assert(m.dv === v); tally(bot, v); tally(beforeBot, oldVariant({...local(e, m.d), zone: m.zn}));
  }
  const b = shares(bot), top = m => Math.max(...Object.values(m));
  report.deathVariants = {faceOn, engagement, allAngles, botKills: {build08: b, build07: shares(beforeBot)}, guestParityChecked: parity};
  const msg = JSON.stringify(report.deathVariants);
  for (const p of [engagement.build08, allAngles.build08]) {
    assert(top(p) <= 40, `no variant above 40% of kills: ${msg}`);
    assert(Object.values(p).filter(s => s >= 5).length >= 5, `at least five variants each play on 5% or more of kills: ${msg}`);
  }
  assert.equal(Object.keys(allAngles.build08).length, 6, 'all six variants occur');
  assert(top(engagement.build08) <= 35 && top(engagement.build08) <= top(engagement.build07) - 10, `engagement kills no longer dominated by one variant as in Build 07: ${msg}`);
  assert(top(faceOn.build07) >= 90 && top(faceOn.build08) <= 45 && Object.values(faceOn.build08).filter(s => s >= 10).length >= 3, `face-on chest kills: at least three variants, none above 45% (Build 07: one): ${msg}`);
  assert(Object.keys(b).length >= 3 && top(b) <= 60, `bot kills: ${msg}`);
  // Deterministic per hit: the same shot on the same actor picks the same death.
  const e = hE[0]; hE.forEach(x => { x.g.visible = x === e; });
  const shot = () => { stand(host, e, 0, 50, 1); e.hp = 1; const from = V(0, host.groundY(0, 60) + 1.6, 60); host.hitScan(from, at(e, 1.15).sub(from).normalize(), CLASSES.assault, 'local'); return e.visual.state().variant; };
  assert.equal(shot(), shot());
});

await check('corpses: shots into a body bleed (spray, decal) but never change kills, health, the death, hit markers or the mission (solo, host, guest)', async () => {
  for (const role of [null, 'host']) {
    const g = await game({role}), guest = role ? await game({role: 'guest'}) : null, e = enemies(g)[0]; enemies(g).forEach(b => { b.g.visible = b === e; });
    stand(g, e, 0, 50, .4); e.hp = 1;
    const from = V(0, g.groundY(0, 58) + 1.6, 58); g.hitScan(from, at(e, 1.2).sub(from).normalize(), CLASSES.assault, 'local');
    assert(e.hp <= 0, 'killed'); const ge = guest && own(guest)[own(g).indexOf(e)];
    if (guest) { stand(guest, ge, 0, 50, .4); for (const m of g.messages.splice(0)) guest.receive(m); }
    g.run(3); guest?.run(3); assert(e.visual.state().fallDone, 'body on the ground');
    const box = new THREE.Box3().setFromObject(e.g), c = box.getCenter(V(0, 0, 0)), before = {kills: g.kills(), hp: e.hp, dead: e.dead, variant: e.visual.state().variant, fall: e.visual.state().fallTime,
      fx: g.fx.stats(), sounds: g.sounds.length, marker: g.el('hit').style.opacity, alert: g.el('killalert').textContent, obj: g.el('objtext').textContent, stage: g.getStage(), state: g.state().state, spawned: g.ai.director()?.spawned};
    g.messages.length = 0;
    for (const src of ['local', 'remote']) { const o = c.clone().add(V(.25, 2.5, .15)), end = g.hitScan(o, c.clone().sub(o).normalize(), CLASSES.assault, src); assert(box.clone().expandByScalar(.05).containsPoint(end), `${src} shot hit the body`); }
    const after = g.fx.stats();
    assert.equal(after.sprays, before.fx.sprays + 2, 'blood spray on each corpse hit'); assert.equal(after.decals, before.fx.decals + 2, 'a decal for each');
    assert.deepEqual([g.kills(), e.hp, e.dead, e.visual.state().variant, g.getStage(), g.state().state, g.ai.director()?.spawned], [before.kills, before.hp, before.dead, before.variant, before.stage, before.state, before.spawned], 'kills, health, death, mission unchanged');
    assert(e.visual.state().fallTime >= before.fall, 'the fall is not restarted');
    assert.deepEqual([g.el('hit').style.opacity, g.el('killalert').textContent, g.el('objtext').textContent], [before.marker, before.alert, before.obj], 'no hit marker, kill alert or objective change');
    assert(!g.sounds.slice(before.sounds).some(s => /confirm|head/.test(JSON.stringify(s))), 'no hit-confirm sound');
    if (role) {
      const impacts = g.messages.filter(m => m.type === 'impact');
      assert.equal(impacts.length, 2); assert(impacts.every(m => m.corpse === true && !m.kill && m.dv === undefined), 'corpse impacts');
      assert(!g.messages.some(m => m.type === 'hit'), 'the guest gets no hit confirm for its own corpse shot');
      const gs = {fx: guest.fx.stats(), variant: ge.visual.state().variant, hp: ge.hp, fall: ge.visual.state().fallTime};
      for (const m of impacts) guest.receive(m);
      assert.equal(guest.fx.stats().sprays, gs.fx.sprays + 2, 'guest sees the blood'); assert.equal(guest.fx.stats().decals, gs.fx.decals + 2);
      assert.deepEqual([ge.visual.state().variant, ge.hp], [gs.variant, gs.hp], 'guest body unchanged'); assert(ge.visual.state().fallTime >= gs.fall);
    }
  }
  // Allies' bodies are still not hittable (only enemy corpses take shots).
  const g = await game(), ally = g.actors.find(a => a.team === 'ally'); ally.hp = 0; ally.dead = 999; stand(g, ally, 0, 50); ally.hp = 0;
  const box = new THREE.Box3().setFromObject(ally.g), c = box.getCenter(V(0, 0, 0)), s0 = g.fx.stats().sprays;
  g.hitScan(c.clone().add(V(0, 2.5, 0)), V(0, -1, 0), CLASSES.assault, 'local'); assert.equal(g.fx.stats().sprays, s0);
});

await check('corpse despawn: at most corpseMax bodies lie, each sinks by corpseLife and is hidden; no geometry, material or scene leak; guest mirrors it', async () => {
  const g = await game({ai: true}), en = enemies(g); ENEMY_AI.reinforce = false;
  const scene0 = g.scene.children.length; let maxLying = 0, t = 0; const killedAt = new Map(), goneAt = new Map(), sinkStart = new Map();
  // Counted after each frame's tick and before this frame's new kill (which the next tick handles).
  const cycle = seconds => g.run(seconds, () => { t += 1 / 60;
    maxLying = Math.max(maxLying, en.filter(a => a.hp <= 0 && !a.gone && a.sink == null).length);
    for (const a of en) { if (a.sink != null && !sinkStart.has(a)) sinkStart.set(a, t); if (a.gone && !goneAt.has(a)) { goneAt.set(a, t); assert.equal(a.g.visible, false); } }
    for (const [i, a] of en.entries()) if (a.hp > 0 && t >= i * 3 && !killedAt.has(a)) { a.hp = 0; a.dead = 999; killedAt.set(a, t); } });
  cycle(80); const ids0 = newIds();
  assert(en.every(a => goneAt.has(a)), 'every corpse despawned'); assert(maxLying <= ENEMY_AI.corpseMax, `max lying ${maxLying}`);
  for (const a of en) assert(goneAt.get(a) - killedAt.get(a) <= ENEMY_AI.corpseLife + ENEMY_AI.corpseSinkTime + .1, 'within corpseLife + corpseSinkTime');
  const early = en.filter(a => sinkStart.get(a) - killedAt.get(a) < ENEMY_AI.corpseLife - .5).length; assert(early >= 2, `${early} oldest bodies sank early to keep ${ENEMY_AI.corpseMax}`);
  // Two more despawn cycles with the same bodies lying fresh again (as after a recycle and a new death): nothing new is
  // allocated or added to the scene.
  for (let k = 0; k < 2; k++) { for (const a of en) { a.gone = false; a.sink = null; a.diedAt = null; a.g.visible = true; a.g.position.y = g.groundY(a.g.position.x, a.g.position.z); goneAt.delete(a); } g.run(50, () => { for (const a of en) if (a.gone && !goneAt.has(a)) goneAt.set(a, 1); }); assert(en.every(a => goneAt.has(a) && !a.g.visible), `cycle ${k + 2}: all despawned`); }
  const ids1 = newIds(); report.corpseLeak = {newGeometries: ids1.geometry - ids0.geometry - 1, newMaterials: ids1.material - ids0.material - 1, sceneChildren: [scene0, g.scene.children.length]};
  assert.equal(ids1.geometry - ids0.geometry, 1, 'no geometry created by despawn cycles'); assert.equal(ids1.material - ids0.material, 1, 'no material created');
  assert.equal(g.scene.children.length, scene0, 'bodies are hidden and reused, not added or removed');
  // Tunables are read.
  for (const [k, v] of [['corpseMax', 2], ['corpseLife', 6], ['corpseSinkTime', 3]]) {
    restore(); ENEMY_AI[k] = v; ENEMY_AI.reinforce = false; const h = await game({ai: true}), hs = enemies(h), start = new Map(), gone = new Map(); let lying = 0, s = 0;
    h.run(40, () => { s += 1 / 60; lying = Math.max(lying, hs.filter(a => a.hp <= 0 && !a.gone && a.sink == null).length);
      for (const a of hs) { if (a.sink != null && !start.has(a)) start.set(a, s); if (a.gone && !gone.has(a)) gone.set(a, s); }
      for (const [i, a] of hs.entries()) if (a.hp > 0 && s >= i * 3) { a.hp = 0; a.dead = 999; } });
    if (k === 'corpseMax') assert(lying <= 2, `corpseMax read: ${lying}`);
    if (k === 'corpseLife') assert(hs.every(a => gone.has(a) && gone.get(a) - hs.indexOf(a) * 3 <= 6 + ENEMY_AI.corpseSinkTime + .1), 'corpseLife read');
    if (k === 'corpseSinkTime') for (const a of gone.keys()) assert(Math.abs(gone.get(a) - start.get(a) - 3) < .1, 'corpseSinkTime read');
  }
  // Co-op: the host's gone mask hides the body on the guest; a recycled soldier reappears.
  restore(); ENEMY_AI.reinforce = false; ENEMY_AI.corpseLife = 2;
  const host = await game({role: 'host', ai: true}), guest = await game({role: 'guest'}), a = enemies(host)[2], ga = own(guest)[own(host).indexOf(a)];
  const pump = () => { host.networkTick(1); for (const m of host.messages.splice(0)) guest.receive(m); };
  a.hp = 0; a.dead = 999; host.run(6); pump(); assert(a.gone && ga.gone === true && ga.g.visible === false, 'guest hides a gone body');
  stand(host, a, a.g.position.x, a.g.position.z); a.life = (a.life + 1) & 255; pump(); assert(!ga.gone && ga.g.visible, 'recycled soldier visible on the guest');
});

await check('reinforcement waves: waves of waveSize within budget and alive cap, members spaced, unseen and away from humans; waveSize is read', async () => {
  const waves = async (tweak, {stage = 0, skirmish = false, seconds = 240} = {}) => {
    restore(); tweak?.(); const g = await game({ai: true}); if (skirmish) { g.setMode('skirmish'); g.reset(); g.play(); g.restoreAI(); g.set({hp: 1e9}); for (const a of g.actors) a.animate = a.visual.animate; g.player.set(0, g.groundY(0, 55), 55); } else g.ai.setStage(stage);
    const en = enemies(g), life = new Map(en.map(a => [a, a.life])), born = new Map(), out = []; let maxAlive = 0, t = 0;
    for (const a of en) { a.hp = 0; a.dead = 999; }
    g.run(seconds, () => { t += 1 / 60; const wave = [];
      for (const a of en) if (a.life !== life.get(a)) { life.set(a, a.life); born.set(a, t); const eye = eyeOf(g), p = a.g.position; wave.push({x: p.x, z: p.z, dist: Math.hypot(p.x - g.player.x, p.z - g.player.z), seen: g.visible(eye, p.clone().setY(p.y + 1)) || g.visible(eye, p.clone().setY(p.y + 1.7)), blocked: g.blocked(p.x, p.z)}); }
      if (wave.length) out.push({t: +t.toFixed(2), wave});
      for (const a of en) if (a.hp > 0 && t - born.get(a) > 12) { a.hp = 0; a.dead = 999; } // the player clears each wave after 12 s
      maxAlive = Math.max(maxAlive, en.filter(a => a.hp > 0).length); });
    return {out, sizes: out.map(w => w.wave.length), total: out.reduce((s, w) => s + w.wave.length, 0), maxAlive, g};
  };
  const runs = {stage0: await waves(), stage1: await waves(null, {stage: 1}), skirmish: await waves(null, {skirmish: true, seconds: 360})};
  report.waves = {};
  for (const [name, r] of Object.entries(runs)) {
    const key = name === 'stage0' ? 0 : name === 'stage1' ? 1 : 'skirmish';
    report.waves[name] = {waveSize: ENEMY_AI.waveSize[key], budget: ENEMY_AI.budget[key], maxAlive: ENEMY_AI.maxAlive[key], waves: r.sizes, at: r.out.map(w => w.t), spawned: r.total, peakAlive: r.maxAlive};
    assert(r.total <= ENEMY_AI.budget[key] && r.total === r.g.ai.director().spawned, `${name}: ${r.total} within budget ${ENEMY_AI.budget[key]}`);
    assert(r.sizes.every(n => n <= ENEMY_AI.waveSize[key]) && r.sizes.includes(ENEMY_AI.waveSize[key]), `${name}: wave sizes ${r.sizes}`);
    assert(r.maxAlive <= Math.min(7, ENEMY_AI.maxAlive[key]), `${name}: alive ${r.maxAlive}`);
    for (const {wave} of r.out) {
      assert(wave.every(s => s.dist >= ENEMY_AI.spawnMinHumanDist && !s.seen && !s.blocked), JSON.stringify(wave));
      for (let i = 0; i < wave.length; i++) for (let j = i + 1; j < wave.length; j++) assert(Math.hypot(wave[i].x - wave[j].x, wave[i].z - wave[j].z) >= 1.2, `members spaced: ${JSON.stringify(wave)}`);
    }
    for (let i = 1; i < r.out.length; i++) assert(r.out[i].t - r.out[i - 1].t >= ENEMY_AI.spawnInterval[0] - .1, `${name}: waves spaced by spawnInterval`);
  }
  assert.equal(runs.stage0.total, ENEMY_AI.budget[0], 'stage 0 budget used in waves'); assert.equal(runs.stage1.total, ENEMY_AI.budget[1], 'stage 1 budget used in waves');
  const single = await waves(() => { ENEMY_AI.waveSize[1] = 1; }, {stage: 1});
  assert(single.sizes.every(n => n === 1) && single.total >= 3, `waveSize read: ${single.sizes}`);
  const trimmed = await waves(() => { ENEMY_AI.budget[1] = 4; }, {stage: 1});
  assert(trimmed.total === 4 && trimmed.sizes.join() === '3,1', `the last wave is trimmed to the budget: ${trimmed.sizes}`);
  const capped = await waves(() => { ENEMY_AI.maxAlive[1] = 2; }, {stage: 1, seconds: 60});
  assert(capped.maxAlive <= 2 && capped.sizes.every(n => n <= 2), `maxAlive caps a wave: ${capped.sizes}`);
});

await check('map density: 183 props from bundled materials; solid props collide, block sight and add cover; spawns, loops, entries and objectives stay clear and connected', async () => {
  const g = await game(), solid = VILLAGE_PROPS.filter(p => p[5]);
  assert.equal(VILLAGE_PROPS.length, 183); assert.equal(solid.length, 83);
  let sight = 0, cover = 0; const table = g.ai.coverTable().points;
  for (const [type, x, z, w, d] of solid) {
    assert(g.blocked(x, z), `${type} at ${x},${z} collides`);
    const along = w >= d, off = along ? [0, d / 2 + 1.5] : [w / 2 + 1.5, 0], h = type === 'cart' ? .8 : .4;
    if (!g.visible(V(x - off[0], g.groundY(x - off[0], z - off[1]) + h, z - off[1]), V(x + off[0], g.groundY(x + off[0], z + off[1]) + h, z + off[1]))) sight++;
    if (table.some(c => Math.abs(c.x - x) < w / 2 + 1.2 && Math.abs(c.z - z) < d / 2 + 1.2)) cover++;
  }
  assert.equal(sight, solid.length, 'every solid prop blocks a low sight line through it'); report.density = {props: VILLAGE_PROPS.length, solid: solid.length, solidWithCoverPoint: cover, coverPoints: table.length};
  assert(cover >= 15, `${cover} solid props offer an AI cover point`);
  // Blood never lands on the invisible boxes around barrels and tyres (it would float beside the round shapes).
  let floating = 0, tried = 0;
  for (const [, x, z, w, d] of VILLAGE_PROPS.filter(p => p[0] === 'barrels' || p[0] === 'tyres')) {
    const y = g.groundY(x, z), shell = new THREE.Box3(V(x - w / 2, y + .1, z - d / 2), V(x + w / 2, y + 1, z + d / 2)).expandByScalar(.02);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const f = g.decalFor(V(x + dx * (w / 2 + .6), y + .5, z + dz * (d / 2 + .6)), V(-dx, -.1, -dz), false); tried++; if (f && shell.containsPoint(V(f[0], f[1], f[2])) && (f[4] < .5 || f[1] > y + .3)) floating++; } // a box side or top, not a floor under it
  }
  assert(tried >= 60 && floating === 0, `${floating}/${tried} blood decals on a round prop's invisible box`); // single crates are below the cover table's size
  // Keep-clear: no solid prop footprint near spawns, patrol nodes, reinforcement entries, objectives or the player start.
  const gap = ([, x, z, w, d], [px, pz]) => Math.hypot(Math.max(0, Math.abs(px - x) - w / 2), Math.max(0, Math.abs(pz - z) - d / 2));
  const points = [...ENEMY_SPAWNS.map(p => [p, 2]), ...Object.values(PATROL_LOOPS).flat().map(p => [p, 2]), ...REINFORCE_POINTS.flatMap(r => r.chain).map(p => [p, 2]),
    ...[g.ai.intel, g.ai.target, g.ai.extract].map(v => [[v.x, v.z], 2.5]), [[0, 55], 4], [[3, 61], 3]];
  for (const [p, r] of points) for (const prop of solid) assert(gap(prop, p) >= r, `${prop[0]} at ${prop[1]},${prop[2]} within ${r} m of ${p}`);
  // Navigation: everything reachable without the props (same game, prop solids removed) is still reachable with them.
  const legs = [];
  for (const loop of Object.values(PATROL_LOOPS)) loop.forEach((p, i) => legs.push([p, loop[(i + 1) % loop.length]]));
  for (const r of REINFORCE_POINTS) r.chain.forEach((p, i) => { if (i) legs.push([r.chain[i - 1], p]); });
  const objectives = [g.ai.intel, g.ai.target, g.ai.extract, V(0, 0, 55)].map(v => [v.x, v.z]);
  for (let i = 0; i < objectives.length; i++) for (let j = i + 1; j < objectives.length; j++) legs.push([objectives[i], objectives[j]]);
  const survey = () => {
    g.resetNav(); g.ai.navigationGrid(); const comp = g.ai.navComp(), inComp = (x, z) => !g.blocked(x, z) && comp[Math.round((z + 90) / 2) * 91 + Math.round((x + 90) / 2)] === 1;
    return {cells: comp.reduce((s, v) => s + v, 0), points: points.map(([[x, z]]) => { const [sx, sz] = g.ai.safeSpot(x, z); return inComp(sx, sz) && Math.hypot(sx - x, sz - z) < 3; }),
      legs: legs.map(([a, b]) => { const r = g.ai.pathTo(V(a[0], 0, a[1]), V(b[0], 0, b[1])), e = r.at(-1); return r.length ? Math.hypot(e.x - b[0], e.z - b[1]) < 2.9 : Math.hypot(a[0] - b[0], a[1] - b[1]) < 2.9; })};
  };
  const withProps = survey(), propSolids = g.solids.filter(s => solid.some(([, x, z]) => s.x === x && s.z === z)), kept = g.solids.slice();
  assert.equal(propSolids.length, solid.length, 'one collision box per solid prop');
  g.solids.splice(0, g.solids.length, ...kept.filter(s => !propSolids.includes(s))); const bare = survey(); g.solids.splice(0, g.solids.length, ...kept); g.resetNav();
  points.forEach(([p], i) => assert(!bare.points[i] || withProps.points[i], `${p} reachable without props but not with them`));
  legs.forEach(([a, b], i) => assert(!bare.legs[i] || withProps.legs[i], `leg ${a} -> ${b} routed without props but not with them`));
  assert(withProps.cells >= bare.cells * .97, `walkable area ${bare.cells} -> ${withProps.cells} cells`);
  report.density.nav = {walkableCells: [bare.cells, withProps.cells], points: `${withProps.points.filter(Boolean).length}/${points.length} (without props ${bare.points.filter(Boolean).length})`, legs: `${withProps.legs.filter(Boolean).length}/${legs.length} (without props ${bare.legs.filter(Boolean).length})`};
  // Props are drawn with the static batch: only bundled texture files are referenced, and no prop mesh stays unmerged.
  const src = fs.readFileSync(new URL('dist/village-props.js', projectRoot), 'utf8');
  assert(!/TextureLoader|\.load\(|assets\/|https?:/.test(src), 'no new assets or network loads');
});

console.log(JSON.stringify({passed: results.length, checks: results, report, limitations: [
  'Headless Node with mocked rendering, audio and transport: no GPU frame cost, animation feel or live WebRTC. Frame cost is measured separately in a browser.',
  'Co-op is exercised by passing the real host messages to a guest instance in the same process.']}, null, 2));
