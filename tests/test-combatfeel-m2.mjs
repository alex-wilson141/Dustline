// M2 combat feel: blood, directional reactions, authored deaths, hit confirmation and co-op impact replay,
// plus the PERF-01 auto resolution controller. Headless production code; rendering and audio are mocked.
import assert from 'node:assert/strict';
import {createGame, projectRoot} from './sprint-harness.mjs';

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const {CLASSES} = await import(new URL('dist/combat.js', projectRoot));
const {AutoQuality} = await import(new URL('dist/optimization.js', projectRoot));
const results = [];
async function check(name, fn) { await fn(); results.push(name); }

const BLOOD_MIST = 0x6e0f0b, DUST = 0xc4b497;
const bloodCount = g => g.effects.filter(e => e.spray || e.o.material.color?.getHex() === BLOOD_MIST).length;
const dustCount = g => g.effects.filter(e => e.o.material.color?.getHex() === DUST).length;
const enemies = g => g.actors.filter(a => a.team === 'enemy');

async function game(role = null) {
  const g = await createGame();
  g.prepare({role, clearLane: false});
  g.el('blood').checked = true;
  for (const a of g.actors) a.animate = a.visual.animate; // harness stubs animation; restore the real rig
  let clock = 0; g.frame(0); g.step = s => g.frame(clock += s * 1000);
  g.wait = s => { const n = Math.max(1, Math.round(s * 60)); for (let i = 0; i < n; i++) g.step(s / n); }; // 60 FPS frames
  return g;
}
// Place an actor on open ground in front of the start area, facing the shooter.
function place(g, a, x = 0, z = 45) { a.g.position.set(x, g.groundY(x, z), z); a.g.rotation.set(0, 0, 0); a.g.visible = true; }
function aim(g, from, a, height) { const target = a.g.position.clone().add(new THREE.Vector3(0, height, 0)); return target.sub(from).normalize(); }
const CHEST = 1.2, HEAD = 1.62;

await check('solo: player body hit makes blood and a short directional flinch, no death', async () => {
  const g = await game();
  const e = enemies(g)[0]; place(g, e);
  const from = new THREE.Vector3(0, g.groundY(0, 52) + 1.5, 52);
  g.hitScan(from, aim(g, from, e, CHEST), CLASSES.assault, 'local');
  assert.equal(e.hp, 62);
  assert(bloodCount(g) >= 2, 'mist and spray spawned');
  assert.equal(dustCount(g), 0, 'character hits are not surface dust');
  const s = e.visual.state(); assert(s.flinch > 0 && !s.falling);
  assert.equal(g.el('hit').classList.contains('head'), false); assert(g.sounds.includes('confirm'));
  assert.equal(g.messages.filter(m => m.type === 'impact').length, 0, 'solo sends nothing');
  g.wait(.12); const torsoLean = e.g.children[0].children[0].rotation.x; assert(torsoLean < 0, 'torso pushed along the shot (-z)');
  g.wait(.2); assert.equal(e.visual.state().flinch, 0, 'reaction ends within .25 s');
  assert.deepEqual([e.g.position.x, e.g.rotation.z], [0, 0], 'outer transform untouched: AI keeps control');
  g.hitScan(from, aim(g, from, e, CHEST), CLASSES.assault, 'local'); assert.equal(e.hp, 24, 'still hittable after reacting');
});

await check('solo: headshot kill confirms as headshot and plays an authored directional fall (no instant roll)', async () => {
  const g = await game();
  const e = enemies(g)[0]; place(g, e);
  const from = new THREE.Vector3(0, g.groundY(0, 52) + 1.5, 52), kills = g.kills();
  g.hitScan(from, aim(g, from, e, HEAD), CLASSES.assault, 'local');
  assert(e.hp <= 0); assert.equal(g.kills(), kills + 1, 'player kill still counted');
  assert(g.el('hit').classList.contains('head') && g.el('hit').classList.contains('kill')); assert(g.sounds.includes('head'));
  assert.equal(e.g.rotation.z, 0, 'no pi/2 roll');
  g.wait(.2); const mid = e.visual.state(); assert(mid.falling && !mid.fallDone && mid.rigTilt > .05 && mid.rigTilt < 1.2, 'falling over time');
  g.wait(1); const end = e.visual.state(); assert(end.fallDone && end.rigTilt > 1.4, 'lies down');
  const rig = e.g.children[0]; assert(rig.position.z < -.15 && Math.abs(rig.position.x) < .05, 'slides with the shot (-z) momentum');
  assert.equal(e.g.rotation.z, 0);
});

await check('solo: Blood off suppresses blood only; reactions and surface dust still work', async () => {
  const g = await game();
  g.el('blood').checked = false;
  const e = enemies(g)[0]; place(g, e);
  const from = new THREE.Vector3(0, g.groundY(0, 52) + 1.5, 52);
  g.hitScan(from, aim(g, from, e, CHEST), CLASSES.assault, 'local');
  assert.equal(bloodCount(g), 0); assert(e.visual.state().flinch > 0);
  g.aiHit({pos: e.g.position, a: e}, from, e.g.position.clone().add(new THREE.Vector3(0, CHEST, 0)));
  assert.equal(bloodCount(g), 0, 'bot hits honour the setting too');
  g.el('blood').checked = true;
  g.aiHit({pos: e.g.position, a: e}, from, e.g.position.clone().add(new THREE.Vector3(0, CHEST, 0)));
  assert(bloodCount(g) >= 2, 'turning it back on restores blood');
});

await check('solo: bot hits (ally on enemy, enemy on ally) react along shooter-to-target; ally stands up again unchanged', async () => {
  const g = await game();
  const e = enemies(g)[0], ally = g.actors.find(a => a.team === 'ally' && !a.remote);
  place(g, e); place(g, ally, 0, 50);
  const eye = new THREE.Vector3(-6, g.groundY(-6, 45) + 1.42, 45);
  g.aiHit({pos: e.g.position, a: e}, eye, e.g.position.clone().add(new THREE.Vector3(0, 1.25, 0)));
  assert.equal(e.hp, 76); assert(e.visual.state().flinch > 0); assert(bloodCount(g) >= 2);
  g.wait(.1); assert(e.g.children[0].children[0].rotation.z < 0, 'pushed toward +x, away from the shooter at -x');
  ally.hp = 10; g.aiHit({pos: ally.g.position, a: ally}, eye, ally.g.position.clone().add(new THREE.Vector3(0, 1.25, 0)));
  assert(ally.hp <= 0 && ally.dead === 15 && ally.visual.state().falling);
  g.wait(1); assert(ally.visual.state().fallDone);
  ally.hp = 100; ally.dead = 0; g.step(1 / 60); // what tickAI's existing 15 s regroup does
  assert.equal(ally.visual.state().falling, false); assert(ally.visual.state().rigTilt < 1e-6, 'upright again');
});

// Host produces real messages; the guest replays them in order.
let hostMessages, hostGame;
await check('host: guest shots and bot hits react on the host and emit impact/hit messages', async () => {
  const g = hostGame = await game('host');
  const [e1, e2] = enemies(g); place(g, e1, 0, 45); place(g, e2, 4, 45);
  const r = g.remote; place(g, r, 0, 52);
  const from = r.g.position.clone().add(new THREE.Vector3(0, 1.7, 0));
  g.receive({type: 'shot', dir: aim(g, from, e1, CHEST).toArray()});
  assert.equal(e1.hp, 62); assert(e1.visual.state().flinch > 0); assert(bloodCount(g) >= 2, 'host sees blood from guest shot');
  g.wait(.2);
  g.receive({type: 'shot', dir: aim(g, from, e1, HEAD).toArray()}); assert(e1.hp <= 0 && e1.visual.state().falling);
  g.wait(.2);
  // Surface hit from a guest shot: aim straight down at the terrain/solid nearest the avatar.
  const solid = g.solids.reduce((b, s) => Math.hypot(s.x - r.g.position.x, s.z - r.g.position.z) < Math.hypot(b.x - r.g.position.x, b.z - r.g.position.z) ? s : b);
  const wallDir = new THREE.Vector3(solid.x, 1, solid.z).sub(from).normalize();
  const dustBefore = dustCount(g);
  g.receive({type: 'shot', dir: wallDir.toArray()});
  assert(dustCount(g) > dustBefore, 'guest shot at a wall makes dust on host');
  const eye = new THREE.Vector3(8, g.groundY(8, 45) + 1.42, 45);
  g.aiHit({pos: e2.g.position, a: e2}, eye, e2.g.position.clone().add(new THREE.Vector3(0, 1.25, 0)));
  g.aiHit({pos: g.player, a: null}, eye, g.player.clone().add(new THREE.Vector3(0, 1.4, 0)));
  const remoteHp = r.hp; g.aiHit({pos: r.g.position, a: r}, eye, r.g.position.clone().add(new THREE.Vector3(0, 1.25, 0)));
  assert(r.hp < remoteHp && r.visual.state().flinch > 0, 'host sees the guest avatar react');
  g.networkTick(1);
  hostMessages = structuredClone(g.messages);
  const impacts = hostMessages.filter(m => m.type === 'impact'), hits = hostMessages.filter(m => m.type === 'hit');
  const idx = g.actors.filter(a => !a.remote).indexOf(e1);
  assert.deepEqual(hits.map(h => [h.head, h.kill]), [[false, false], [true, true]], 'hit reply carries head/kill');
  assert(impacts.some(m => m.t === idx && !m.kill) && impacts.some(m => m.t === idx && m.kill && m.head));
  assert(impacts.some(m => m.t === 'surface'), 'surface dust is sent'); assert(impacts.some(m => m.t === 'host' && m.head === false));
  assert(impacts.some(m => m.t === g.actors.filter(a => !a.remote).indexOf(e2) && m.head === false), 'bot hit sent, never a headshot');
  assert.equal(impacts.filter(m => typeof m.t === 'number').every(m => m.t >= 0 && m.t < 10), true, 'guest avatar hits are not echoed');
  assert.equal(impacts.length, 5);
  assert(impacts.every(m => m.p.length === 3 && (m.t === 'surface' || Math.abs(Math.hypot(...m.d) - 1) < 1e-6)));
});

await check('guest: host impacts produce blood, flinch, death, dust and marker; later snapshots do not overwrite the fall', async () => {
  const g = await game('guest');
  const idx = hostGame.actors.filter(a => !a.remote).indexOf(enemies(hostGame)[0]);
  const e = g.actors.filter(a => !a.remote)[idx];
  place(g, e); place(g, g.remote, 0, 52);
  const firstKill = hostMessages.findIndex(m => m.type === 'impact' && m.kill);
  // Replay up to (not including) the kill, then check body-hit effects.
  for (const m of hostMessages.slice(0, firstKill)) g.receive(m);
  assert(bloodCount(g) >= 2 && e.visual.state().flinch > 0, 'guest sees blood and reaction');
  assert(g.sounds.includes('confirm'));
  g.wait(.2);
  for (const m of hostMessages.slice(firstKill).filter(m => m.type !== 'snapshot')) g.receive(m);
  assert(e.hp <= 0 && e.visual.state().falling, 'kill starts the fall immediately');
  assert(g.el('hit').classList.contains('head') && g.el('hit').classList.contains('kill') && g.sounds.includes('head'));
  assert(dustCount(g) > 0, 'guest sees dust for surface hits');
  assert(g.remote.visual.state().flinch > 0, 'host avatar reacts on the guest when the host is hit');
  g.wait(.15);
  const before = e.visual.state();
  for (const m of hostMessages.filter(m => m.type === 'snapshot')) g.receive(m);
  assert.equal(e.g.rotation.z, 0, 'snapshot does not force the pi/2 roll');
  assert(e.hp <= 0, 'snapshot HP authority agrees');
  const after = e.visual.state(); assert(after.falling && after.fallTime === before.fallTime && after.rigTilt === before.rigTilt, 'snapshot leaves the in-progress fall alone');
  g.wait(.1); assert(e.visual.state().fallTime > before.fallTime && !e.visual.state().fallDone, 'fall continues after the snapshot');
  g.wait(1); assert(e.visual.state().fallDone && e.visual.state().rigTilt > 1.4);
  // A second snapshot after the fall still leaves the body down.
  const snap = structuredClone(hostMessages.filter(m => m.type === 'snapshot').at(-1)); snap.seq += 1; g.receive(snap);
  g.step(1 / 60); assert(e.visual.state().fallDone && e.g.rotation.z === 0);
  // Invalid impacts are ignored.
  const n = g.effects.length; for (const bad of [{type: 'impact', t: 42, p: [0, 0, 0], d: [0, 0, 1]}, {type: 'impact', t: 0, p: [NaN, 0, 0], d: [0, 0, 1]}, {type: 'impact', t: 0, p: [0, 0, 0], d: [0, 0, 9]}]) g.receive(bad);
  assert.equal(g.effects.length, n);
});

await check('guest: Blood off suppresses replayed blood; reactions remain', async () => {
  const g = await game('guest');
  g.el('blood').checked = false;
  for (const m of hostMessages.filter(m => m.type === 'impact')) g.receive(m);
  assert.equal(bloodCount(g), 0); assert(dustCount(g) > 0);
  assert(g.actors.filter(a => !a.remote).some(a => a.visual.state().flinch > 0 || a.visual.state().falling));
});

await check('repeated kills: deaths complete, every effect geometry/material is disposed, scene does not grow', async () => {
  const g = await game();
  const disposed = new Set(), created = new Set();
  const gd = THREE.BufferGeometry.prototype.dispose, md = THREE.Material.prototype.dispose;
  THREE.BufferGeometry.prototype.dispose = function () { disposed.add(this); return gd.call(this); };
  THREE.Material.prototype.dispose = function () { disposed.add(this); return md.call(this); };
  try {
    g.wait(.5); const baseline = g.scene.children.length;
    for (let round = 0; round < 5; round++) {
      const list = enemies(g);
      list.forEach((e, i) => place(g, e, -9 + i * 3, 45));
      for (const e of list) {
        const from = new THREE.Vector3(e.g.position.x, g.groundY(e.g.position.x, 52) + 1.5, 52);
        g.hitScan(from, aim(g, from, e, CHEST), CLASSES.assault, 'local');
        g.hitScan(from, aim(g, from, e, HEAD), CLASSES.assault, 'local');
        for (const fx of g.effects) created.add(fx.o);
      }
      assert(list.every(e => e.hp <= 0 && e.visual.state().falling));
      g.wait(1.2);
      assert(list.every(e => e.visual.state().fallDone), 'every death completes');
      assert.equal(g.effects.length, 0, 'effects expire');
      assert.equal(g.scene.children.length, baseline, 'no leftover scene objects');
      g.reset(); g.play(); g.el('blood').checked = true;
      assert(list.every(e => e.hp === 100 && !e.visual.state().falling && e.visual.state().rigTilt < 1e-6), 'reset stands everyone up');
    }
    assert(created.size >= 5 * 7 * 2 * 2);
    for (const o of created) assert(disposed.has(o.geometry) && disposed.has(o.material), 'effect geometry and material disposed');
  } finally { THREE.BufferGeometry.prototype.dispose = gd; THREE.Material.prototype.dispose = md; }
});

await check('PERF-01: one isolated hitch never lowers resolution; sustained low FPS does; it recovers upward', async () => {
  const q = new AutoQuality(1.1), run = (seconds, fps) => { for (let t = 0; t < seconds; t += 1 / fps) q.sample(1 / fps); return q.scale; };
  run(30, 60); assert.equal(q.scale, 1.1);
  let changes = 0; for (let i = 0; i < 1800; i++) if (q.sample(i % 300 === 150 ? 3 : 1 / 60) !== null) changes++;
  assert.equal(changes, 0, 'an isolated 3 s hitch in each 5 s window of 60 FPS does not drop');
  run(5.1, 30); assert.equal(q.scale, .95); run(15.2, 30); assert.equal(q.scale, .75, 'floor'); run(10, 30); assert.equal(q.scale, .75);
  run(5.1, 60); assert.equal(q.scale, .75, 'one good window is not enough'); run(5.1, 60); assert.equal(q.scale, .9, 'steps up after two');
  run(20.5, 60); assert.equal(q.scale, 1.1, 'recovers to the Auto maximum'); run(20, 60); assert.equal(q.scale, 1.1);
  run(10.2, 48); assert.equal(q.scale, 1.1, '42-55 FPS holds steady');
});

await check('PERF-01 in game: no checks in menu, pause or host pause; Auto recovers; other modes untouched', async () => {
  const g = await game();
  const calls = []; const set = g.renderer.setPixelRatio; g.renderer.setPixelRatio = v => { calls.push(v); set.call(g.renderer, v); };
  g.el('quality').value = 'auto'; g.applyQuality(); calls.length = 0;
  const frames = (s, fps) => { for (let i = 0; i < s * fps; i++) g.step(1 / fps); };
  g.goMenu(); frames(12, 15); assert.equal(calls.length, 0, 'menu never samples');
  g.reset(); g.play(); g.pause(); frames(12, 15); assert.equal(calls.length, 0, 'pause never samples');
  g.play(); frames(5.2, 20); assert.deepEqual(calls, [.85], 'harness devicePixelRatio is 1, so Auto max is 1');
  frames(10.4, 60); assert.deepEqual(calls, [.85, 1], 'back up to the Auto maximum after two fast windows'); assert.equal(g.quality().renderScale, 1);
  g.el('quality').value = 'standard'; g.applyQuality(); calls.length = 0; frames(12, 15); assert.equal(calls.length, 0, 'Performance mode is fixed');
  // Separate instance last: the harness swaps the global document per game.
  const g2 = await game('guest'); const c2 = []; g2.renderer.setPixelRatio = v => c2.push(v);
  g2.el('quality').value = 'auto'; g2.applyQuality(); c2.length = 0; g2.set({hostPaused: true});
  for (let i = 0; i < 12 * 15; i++) g2.step(1 / 15); assert.equal(c2.length, 0, 'guest does not sample while host is paused');
});

console.log(JSON.stringify({passed: results.length, checks: results, limitations: [
  'Headless production code with mocked DOM/WebGL/audio: effect objects, rig transforms and messages are checked, not how blood, flinches or falls look.',
  'Co-op uses host-produced messages replayed in order into a guest instance; no real WebRTC, latency or packet loss.',
  'Auto-quality decisions are checked against synthetic frame times, not a real GPU.']}, null, 2));
