// Build 38 (T48): the models. The squad, the teammate and the Kareth Brigade wear skinned bodies and the player has arms with
// fingers; they are looks only. Checked here: every model the game asks for is bundled, fingerprinted, whole in one file and
// served, and nothing is asked for before the first frame; every pose the game's code makes (standing, walking, running,
// crouching, the ladder's and the window's poses, a flinch, the blade's swing, each of the six deaths from the hit to lying
// still) is taken by the body's bones, limb for limb; what a shot is tested against is what it was (the same shots give the
// same results with the models and without), and a marked hostile's chest can be hit again (it could not since Build 35);
// the sides can be told apart and the rusher's and the bomber's marks are still worn; the arms hold every weapon where the
// hands were and follow a reload, a knife swing and a throw; Kohar Valley asks for nothing more before its first frame and
// plays the same with the models as without; the ceilings hold with a high wave in view.
// Headless: rendering is mocked and pictures are blank, so nothing here says how anything LOOKS: that is the user's to see.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
globalThis.location = {search: ''};
import {createGame, projectRoot} from './sprint-harness.mjs';
import {aiTrace} from './old-build.mjs';

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const maps = await import(new URL('dist/maps.js', projectRoot));
const M = await import(new URL('dist/models.js', projectRoot));
const {ASSET_VERSIONS} = await import(new URL('dist/build.js', projectRoot));
const {CLASSES} = await import(new URL('dist/combat.js', projectRoot));
const {DEATH_VARIANTS} = await import(new URL('dist/characters.js', projectRoot));
const SOURCE = process.env.DUSTLINE_GAME_SOURCE ? new URL('file://' + process.env.DUSTLINE_GAME_SOURCE) : undefined;
const ONLY = process.env.DUSTLINE_T48_ONLY?.split(',');
const dist = fileURLToPath(new URL('dist/', projectRoot));
const results = [], report = {};
async function check(tag, name, fn) { if (ONLY && !ONLY.includes(tag)) return; await fn(); results.push(name); }
await maps.loadMap('dehrun'); maps.selectMap('kohar');
const tick = (ms = 0) => new Promise(r => setTimeout(r, ms)), until = async (f, ms = 20000) => { const t = Date.now(); while (!f()) { if (Date.now() - t > ms) return false; await tick(5); } return true; };
const enemies = g => g.actors.filter(a => a.team === 'enemy'), V = (x, y, z) => new THREE.Vector3(x, y, z);
const FILES = ['arms.glb', 'squad.glb', 'kareth_a.glb', 'kareth_b.glb', 'machete.glb'];

// A game with the models or without. With: two frames are drawn (the game asks after the first) and the models awaited.
async function game(map, {models = true, mode = 'story'} = {}) { maps.selectMap(map); const g = await createGame({...(SOURCE ? {sourcePath: SOURCE} : {}), models}); g.prepare({clearLane: false}); if (g.built) await g.built.ready;
  g.el('blood').checked = false; for (const a of g.actors) a.animate = a.visual.animate; let clock = 0; g.clockAt = () => clock; g.step = (n = 1) => { for (let i = 0; i < n; i++) g.frame(clock += 1000 / 60); };
  g.setMode(mode); g.reset(); g.play(); g.early = [...g.assetRequests.map(String)];
  if (models) { assert.equal(g.models.asked(), false, 'the models were asked for before any frame'); g.step(1); assert.equal(g.models.asked(), false, 'asked for during the first frame'); g.step(1); assert.equal(g.models.asked(), true, 'not asked for after the first frame'); assert(await until(() => g.models.bodies()), 'the models never arrived'); }
  else { g.step(2); assert.equal(g.models.asked(), false, 'a game told to do without asked for its models'); }
  return g; }
const wq = o => o.getWorldQuaternion(new THREE.Quaternion()), wp = o => o.getWorldPosition(new THREE.Vector3());
const finite = o => o.matrixWorld.elements.every(Number.isFinite);

await check('served', 'every model is bundled, fingerprinted, whole and served, and none is asked for early: the game asks for nothing under assets/models before its first frame has been drawn and for all five after it; each address carries the file\'s fingerprint; each file is a .glb with its pictures inside and nothing outside it; a web server over dist/ answers each with the whole file; what is bundled under assets/models is exactly what is asked for; a model that does not arrive is said and the game goes on without it; the licence of the bodies is bundled and linked from the credits', async () => {
  const g = await game('kohar'); assert(g.early.every(u => !u.includes('assets/models') && !u.includes('.glb')), 'a model was asked for before the first frame');
  const asked = [...new Set(g.assetRequests.map(String).filter(u => u.includes('assets/models/')))].sort(); assert.deepEqual(asked.map(u => u.split('?')[0].replace('assets/models/', '')).sort(), [...FILES].sort());
  assert.deepEqual(fs.readdirSync(path.join(dist, 'assets/models')).filter(f => !f.startsWith('.')).sort(), [...FILES].sort(), 'what is bundled is what is asked for'); assert.deepEqual(M.MODELS.failed, []);
  let bytes = 0; for (const u of asked) { const [file, v] = u.split('?v='); assert.equal(v, ASSET_VERSIONS[file], `${file} carries its fingerprint`); assert.match(v, /^[0-9a-f]{10}$/);
    const d = fs.readFileSync(path.join(dist, file)); bytes += d.length; assert.equal(d.toString('latin1', 0, 4), 'glTF', `${file} is a .glb`); assert.equal(d.readUInt32LE(8), d.length, `${file} is whole`);
    const j = JSON.parse(d.toString('utf8', 20, 20 + d.readUInt32LE(12))); assert(j.buffers.length === 1 && !j.buffers[0].uri, `${file}: one buffer, inside`); for (const im of j.images || []) assert(im.bufferView !== undefined && !im.uri, `${file}: pictures inside`); assert(!j.extensionsRequired?.length, `${file} needs no decoder`); }
  assert(bytes < 6e6, `the models are ${(bytes / 1e6).toFixed(2)} MB`);
  const server = http.createServer((q, r) => { const f = path.join(dist, decodeURIComponent(new URL(q.url, 'http://x').pathname)); if (!f.startsWith(dist) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200); fs.createReadStream(f).pipe(r); });
  await new Promise(done => server.listen(0, '127.0.0.1', done)); const base = `http://127.0.0.1:${server.address().port}/`, get = u => new Promise((done, fail) => http.get(u, r => { const c = []; r.on('data', d => c.push(d)); r.on('end', () => done({status: r.statusCode, body: Buffer.concat(c)})); }).on('error', fail));
  try { for (const u of asked) { const r = await get(base + u); assert.equal(r.status, 200, u); assert.equal(r.body.length, fs.statSync(path.join(dist, u.split('?')[0])).size, `${u} whole`); } for (const f of ['models.js', 'GLTFLoader.js', 'ROCKETBOX-LICENSE.txt']) assert.equal((await get(base + f)).status, 200, f); assert.equal((await get(base + 'assets/models/not_there.glb')).status, 404); } finally { server.close(); }
  // One that does not arrive: said, remembered, and nothing breaks.
  const warn = console.warn, said = []; console.warn = (...a) => said.push(a.join(' ')); try { assert.equal(await M.loadModel('not_there.glb'), null); } finally { console.warn = warn; } assert(said.some(l => /a model did not arrive: not_there\.glb/.test(l))); assert.deepEqual(M.MODELS.failed, ['not_there.glb']); M.MODELS.failed.length = 0;
  const e = enemies(g)[0]; assert.equal(e.visual.skin(null), false); assert.equal(g.viewmodel.arms(null), false);
  const credits = fs.readFileSync(path.join(dist, 'credits.html'), 'utf8'); assert.match(credits, /Microsoft Rocketbox Avatar Library/); assert.match(credits, /href="ROCKETBOX-LICENSE\.txt"/); assert.match(fs.readFileSync(path.join(dist, 'ROCKETBOX-LICENSE.txt'), 'utf8'), /MIT License[\s\S]*Copyright \(c\) 2020 Microsoft/); assert.match(credits, /polyhaven\.com\/a\/machete/);
  report.served = {files: FILES.length, megabytes: +(bytes / 1e6).toFixed(2)};
});

// Whether a limb's bone points where the rig's limb points (the rig's limb hangs straight down at rest).
function follows(a) { const S = a.visual.skinned(), P = a.visual.parts, B = n => S.bones['Bip01_' + n], out = []; a.g.updateMatrixWorld(true); const down = V(0, -1, 0);
  const limb = (bone, child, driver, name) => { const d = wp(B(child)).sub(wp(B(bone))).normalize(), want = down.clone().applyQuaternion(wq(driver)); out.push([name, d.dot(want)]); };
  P.arms.forEach(({upper, fore, side}) => { const s = side < 0 ? 'L' : 'R'; limb(s + '_UpperArm', s + '_Forearm', upper, s + ' upper arm'); limb(s + '_Forearm', s + '_Hand', fore, s + ' forearm'); });
  P.legs.forEach(({thigh, calf}, i) => { const s = i ? 'R' : 'L'; limb(s + '_Thigh', s + '_Calf', thigh, s + ' thigh'); limb(s + '_Calf', s + '_Foot', calf, s + ' shin'); });
  const entry = n => S.list.find(b => b.bone === B(n)), same = (n, q) => out.push([n, Math.abs(wq(B(n)).dot(q))]);
  same('Spine1', wq(P.torso).multiply(entry('Spine1').pre)); same('Neck', wq(P.rig).multiply(entry('Neck').pre)); same('L_Foot', wq(P.rig).multiply(entry('L_Foot').pre)); same('R_Foot', wq(P.rig).multiply(entry('R_Foot').pre));
  for (const b of Object.values(S.bones)) assert(finite(b), 'a bone that is nowhere');
  return out; }
const worst = rows => rows.reduce((m, r) => r[1] < m[1] ? r : m, ['', 1]);

await check('poses', 'every pose the game makes is taken by the new bodies: for a squad member, the teammate and a Kareth soldier, standing, walking, running, crouching, moving crouched (the pose of a hostile climbing through a window), climbing a ladder, flinching from a hit and swinging a blade, and for each of the six deaths from the hit until the body lies still: at every sampled frame each upper arm, forearm, thigh and shin of the body points where the rig\'s limb points, the spine leans as the rig\'s torso does, the head and the feet stay upright on the rig, and no bone is anywhere it cannot be; standing the head is at head height and the feet on the ground, crouched the head is lower, lying dead nothing is under the ground or in the air; the bones keep their lengths', async () => {
  const g = await game('kohar'), ally = g.actors.find(a => a.team === 'ally' && !a.remote), foe = enemies(g)[0], mate = g.remote, cast = [ally, mate, foe]; let samples = 0, least = 1, leastAt = '';
  for (const a of cast) assert(a.visual.skinned(), 'a soldier without its body'); const len = a => { const S = a.visual.skinned(); return Object.values(S.bones).filter(b => b.parent?.isBone).map(b => +b.position.length().toFixed(5)); }, lengths = cast.map(len);
  const place = (a, i) => { a.g.visible = true; a.g.position.set(i * 2, 0, 0); a.g.rotation.set(0, .7 * i, 0); a.hp = 100; a.dead = 0; a.resetPose(); };
  const look = (a, label) => { const rows = follows(a), w = worst(rows); samples++; if (w[1] < least) { least = w[1]; leastAt = `${label}: ${w[0]}`; } assert(w[1] > .9995, `${label}: the ${w[0]} is off its rig (${w[1].toFixed(5)})`); };
  const run = (a, label, seconds, args, each) => { for (let t = 0, i = 0; t < seconds; t += 1 / 60, i++) { a.visual.animate({speed: 0, time: t, dead: false, crouch: false, dt: 1 / 60, ...args}); if (i % 6 === 0) { look(a, label); each?.(t); } } };
  const head = a => wp(a.visual.skinned().bones.Bip01_Head).y - a.g.position.y, foot = (a, s) => wp(a.visual.skinned().bones[`Bip01_${s}_Foot`]).y - a.g.position.y;
  cast.forEach((a, i) => { place(a, i); const who = ['squad', 'teammate', 'Kareth'][i];
    run(a, who + ' standing', 1, {}); assert(head(a) > 1.4 && head(a) < 1.65, `${who}: head at ${head(a).toFixed(2)} m standing`); for (const s of 'LR') assert(foot(a, s) > .02 && foot(a, s) < .2, `${who}: ${s} foot at ${foot(a, s).toFixed(2)} m`);
    run(a, who + ' walking', 2, {speed: 1.6}); run(a, who + ' running', 2, {speed: 6}); run(a, who + ' on a ladder', 1.5, {speed: 1});
    run(a, who + ' crouching', 1.2, {crouch: true}); assert(head(a) > .95 && head(a) < 1.38, `${who}: head at ${head(a).toFixed(2)} m crouched`); run(a, who + ' through a window', 1.5, {crouch: true, speed: 1.2}); run(a, who + ' standing up', 1, {});
    a.visual.react({x: .4, z: 1, strength: .8, kill: false, zone: 'upper'}); assert(a.visual.state().flinch > 0); run(a, who + ' flinching', .4, {});
    for (const variant of Object.keys(DEATH_VARIANTS)) { a.resetPose(); a.visual.animate({speed: 0, time: 0, dt: .5}); a.visual.react({x: .2, z: 1, strength: .7, kill: true, zone: 'upper', variant}); assert.equal(a.visual.state().variant, variant);
      run(a, `${who} dying (${variant})`, 2.2, {dead: true}); assert(a.visual.state().fallDone, `${variant} finished`); a.g.updateMatrixWorld(true);
      for (const [n, b] of Object.entries(a.visual.skinned().bones)) { const y = wp(b).y - a.g.position.y; assert(y > -.12 && y < .62, `${who} lying after ${variant}: ${n} at ${y.toFixed(2)} m`); } }
    a.resetPose(); a.visual.animate({speed: 0, time: 0, dt: .5}); });
  assert.equal(Object.keys(DEATH_VARIANTS).length, 6); cast.forEach((a, i) => assert.deepEqual(len(a), lengths[i], 'a bone changed its length'));
  // The blade's swing, on a Kareth soldier given one (as a rusher is).
  const box = new THREE.BoxGeometry(1, 1, 1), mat = new THREE.MeshStandardMaterial(); foe.visual.makeBlade(mat, mat, box); foe.visual.blade(true); assert(foe.visual.bladeShown()); foe.visual.strike(); assert(foe.visual.swinging() > 0); let raised = 0;
  run(foe, 'Kareth swinging a blade', 1, {}, () => { raised = Math.max(raised, wp(foe.visual.skinned().bones.Bip01_R_Hand).y - foe.g.position.y); }); assert(raised > 1.5, `the hand with the blade rose to ${raised.toFixed(2)} m`); foe.visual.blade(false);
  report.poses = {soldiers: 3, framesLooked: samples, deaths: Object.keys(DEATH_VARIANTS), leastAgreement: +least.toFixed(6), at: leastAt};
});

await check('hits', 'what a shot is tested against is what it was, and a marked hostile can be shot in the chest again: on Dehrun Terraces, with the models on and with them off, the same 150 shots at hostiles standing, crouched and half fallen end at the same points and leave the same health; the body that is drawn is never what is hit (it answers no ray); a hostile wearing no marks, the rusher\'s or the bomber\'s loses 38 to a round in the chest and dies to one in the head (since Build 35 the chest took nothing: its hidden marks stopped the round); a shot that passes over the head hits nobody', async () => {
  const shots = async models => { const g = await game('dehrun', {models, mode: 'ambush'}), out = [], foes = enemies(g).slice(0, 3); g.amb.toSpawn = 0; g.amb.out = 0;
    foes.forEach((e, i) => { e.hp = 100; e.dead = 0; e.gone = false; e.sink = null; e.g.visible = true; e.g.position.set(4 + i * 1.2, 6.6, 61.3); e.g.rotation.set(0, Math.PI / 2, 0); e.resetPose(); e.crouch = i === 1; for (let k = 0; k < 40; k++) e.visual.animate({speed: 0, time: k / 60, dead: false, crouch: e.crouch, dt: 1 / 60}); });
    foes[2].visual.react({x: 0, z: 1, strength: .7, kill: true, zone: 'upper', variant: 'stagger'}); for (let k = 0; k < 24; k++) foes[2].visual.animate({speed: 0, time: k / 60, dead: true, crouch: false, dt: 1 / 60}); foes[2].hp = 0;
    for (const a of g.actors) if (!foes.includes(a)) a.g.visible = false; g.player.set(0, 6.6, 61.3);
    if (models) for (const e of foes) { const body = e.visual.skinned().body; assert(body.isSkinnedMesh && body.visible); g.scene.updateMatrixWorld(true); const r = new THREE.Raycaster(V(0, 7.8, 61.3), V(1, 0, 0)), would = []; THREE.SkinnedMesh.prototype.raycast.call(body, r, would); if (e === foes[0]) assert(would.length > 0, 'the ray of this check does not cross the body'); assert.equal(r.intersectObject(body, false).length, 0, 'the drawn body answers a ray'); assert(e.visual.proxies.every(o => !o.visible), 'the rig\'s shapes are drawn under the body'); }
    for (let i = 0; i < 150; i++) { const from = V(0, 6.6 + .25 + (i % 15) * .11, 61.3 + ((i * 7) % 11 - 5) * .05), dir = V(1, ((i * 13) % 9 - 4) * .004, ((i * 5) % 7 - 3) * .006).normalize(); foes[0].hp = foes[1].hp = 100; foes.forEach((e, k) => e.g.position.set(4 + k * 1.2, 6.6, 61.3));   /* a round shoves what it hits: each is put back */ const fx = g.effects.length;
      g.hitScan(from, dir, CLASSES.assault, 'local'); out.push([foes[0].hp, foes[1].hp, foes[2].hp, g.effects.length - fx > 0]); }
    return {g, foes, out}; };
  const on = await shots(true), off = await shots(false); assert.deepEqual(on.out, off.out, 'the models changed what a shot hits'); const hit = on.out.filter(r => r[0] < 100 || r[1] < 100).length; assert(hit >= 25 && hit <= 140, `${hit} of 150 shots hit a living hostile`);
  // The chest of a marked hostile (Build 35's fault).
  for (const {g, foes} of [on, off]) { const e = foes[0]; foes[1].g.visible = foes[2].g.visible = false; for (const kind of [0, 1, 2]) { e.g.position.set(4, 6.6, 61.3); g.ambush.setKind(e, kind); assert(e.marks, 'marks are made'); e.hp = 100; e.dead = 0; e.crouch = false; e.resetPose(); for (let k = 0; k < 30; k++) e.visual.animate({speed: 0, time: k / 60, dead: false, crouch: false, dt: 1 / 60});
      for (const [h, want] of [[1.2, 62], [1.05, 62], [1.38, 62]]) { e.hp = 100; e.g.position.set(4, 6.6, 61.3); g.hitScan(V(0, 6.6 + h, 61.3), V(1, 0, 0), CLASSES.assault, 'local'); assert.equal(e.hp, want, `kind ${kind}: a round at ${h} m left ${e.hp}`); }
      e.hp = 100; e.g.position.set(4, 6.6, 61.3); g.hitScan(V(0, 6.6 + 1.64, 61.3), V(1, 0, 0), CLASSES.assault, 'local'); assert(e.hp <= 0, `kind ${kind}: a round in the head left ${e.hp}`); e.hp = 100; e.dead = 0; e.g.position.set(4, 6.6, 61.3); e.resetPose(); e.visual.animate({speed: 0, time: 0, dt: .5});
      g.hitScan(V(0, 6.6 + 2.05, 61.3), V(1, 0, 0), CLASSES.assault, 'local'); assert.equal(e.hp, 100, 'a round over the head'); } g.ambush.setKind(e, 0); }
  report.hits = {shotsCompared: 150, hitALivingHostile: hit, chestOfAMarkedHostile: 'takes 38 again'};
});

await check('apart', 'the sides can be told apart and the marks are still worn: every squad member wears the squad\'s body (a helmet, body armour, a tan uniform), the teammate the same body tinted blue under its marker, every hostile one of the Kareth Brigade\'s two (a soft cap, no armour, an olive-grey uniform under half as light as the squad\'s), by turns; a hostile made later (Ambush\'s pool) is dressed as it is made; a rusher still wears its red cloth and a bomber its black vest and blinking amber light, on the body\'s chest and head, and the rusher\'s blade is the machete and its rifle put away; Dehrun\'s waves name the Kareth Brigade and Kohar Valley\'s Ambush line is what it was', async () => {
  // The models are there first and the Ambush pool is made after them: a soldier made later is dressed as it is made.
  const g = await game('dehrun'), poolBefore = enemies(g).length; g.setMode('ambush'); g.reset(); g.play(); assert(enemies(g).length > poolBefore, 'the pool was made after the models'); const what = a => { let f = null; a.visual.skinned().root.traverse(o => { if (o.userData.look) f = o.userData; }); return f; }, lum = c => c[0] * .299 + c[1] * .587 + c[2] * .114;
  const foes = enemies(g); assert(foes.length >= 16, `${foes.length} hostiles in the pool`); for (const a of g.actors.concat(foes)) assert(a.visual.skinned(), 'a soldier with no body');
  const squad = what(g.remote), ka = what(foes[0]), kb = what(foes[1]); assert.equal(squad.look, 'squad'); assert.equal(squad.headgear, 'helmet'); assert.equal(squad.armour, true); assert.deepEqual([ka.look, kb.look], ['kareth_a', 'kareth_b']); foes.forEach((a, i) => assert.equal(what(a).look, a.index % 2 ? 'kareth_b' : 'kareth_a'));
  for (const k of [ka, kb]) { assert.equal(k.headgear, 'cap'); assert.equal(k.armour, false); assert(lum(k.uniform) < .5 * lum(squad.uniform), 'the Brigade\'s uniform is not much darker than the squad\'s'); assert(k.uniform[1] >= k.uniform[0] && k.uniform[1] > k.uniform[2], 'olive'); } assert(squad.uniform[0] > squad.uniform[1] && squad.uniform[1] > squad.uniform[2], 'tan');
  for (const k of [squad, ka, kb]) assert.match(k.source, /Microsoft Rocketbox Military_Male_0[236] \(MIT\)/);
  const mateBody = g.remote.visual.skinned().body, foeBody = foes[0].visual.skinned().body; assert(mateBody.material !== foeBody.material); const c = mateBody.material.color; assert(c.b > c.r * 1.4 && c.b > c.g, 'the teammate is tinted blue'); let marker = null; g.remote.g.traverse(o => { if (o.userData.isMateMarker) marker = o; }); assert(marker && marker.visible && marker.material.depthTest === false, 'the teammate\'s marker');
  // Marks and the blade on the new body.
  const r = foes[0], b = foes[1]; g.ambush.setKind(r, 1); g.ambush.setKind(b, 2); for (const a of [r, b]) { a.g.visible = true; a.hp = 100; a.g.position.set(a === r ? 3 : 5, 6.6, 61.3); a.resetPose(); for (let k = 0; k < 20; k++) a.visual.animate({speed: 0, time: k / 60, dt: 1 / 60}); a.g.updateMatrixWorld(true); }
  assert(r.marks[1].visible && !r.marks[2].visible && b.marks[2].visible && !b.marks[1].visible); assert(r.visual.bladeShown(), 'the rusher\'s blade'); let machete = 0; r.visual.parts.arms.find(x => x.side > 0).fore.traverse(o => { if (o.isMesh && o.userData.skin && o.visible) machete += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); assert(machete > 2000, `the blade is the machete (${machete} triangles)`); assert.equal(r.visual.parts.rifle.visible, false);
  const red = []; r.marks[1].traverse(o => { if (o.isMesh) red.push(o); }); assert(red.length >= 4 && red.every(o => o.material.color.r > 3 * o.material.color.g && o.material.color.r > 3 * o.material.color.b), 'red cloth'); const chest = wp(r.visual.skinned().bones.Bip01_Spine2), headAt = wp(r.visual.skinned().bones.Bip01_Head);
  const near = (o, p, d) => wp(o).distanceTo(p) < d; assert(red.some(o => near(o, headAt, .28)), 'red on the head'); assert(red.some(o => near(o, chest, .3)), 'red on the chest'); for (const o of red) assert(near(o, headAt, .3) || near(o, chest, .3), `a piece of red cloth hangs in the air (${wp(o).toArray().map(v => v.toFixed(2))})`);
  let lamp = null; const dark = []; b.marks[2].traverse(o => { if (o.userData.lamp) lamp = o; else if (o.isMesh) dark.push(o); }); assert(lamp && lamp.material.isMeshBasicMaterial, 'the lamp is lit by itself'); assert(near(lamp, wp(b.visual.skinned().bones.Bip01_Spine2), .35), 'the lamp on the chest'); assert(dark.some(o => lum(o.material.color.toArray()) < .2), 'a black vest');
  const half = new THREE.Box3().setFromObject(b.marks[2]).getSize(V(0, 0, 0)); assert(half.x > .4 && half.z > .3, 'the vest stands out from the body');
  // The other order: the run begun, and its marks and blades made, before the models arrived.
  { const g2 = await game('dehrun', {mode: 'ambush'}), r2 = enemies(g2)[2]; g2.ambush.setKind(r2, 1); let m2 = 0; r2.visual.parts.arms.find(x => x.side > 0).fore.traverse(o => { if (o.isMesh && o.userData.skin && o.visible) m2++; }); assert(m2 >= 1 && r2.visual.skinned(), 'a blade made before the models came is still three boxes'); }
  // The words.
  const radios = []; const was = g.el('radiotext'); g.amb.toSpawn = 0; g.ambush.startWave(3); assert.match(was.textContent, /Wave 3, Kareth Brigade, \d+ of them: a push from the north on a wide front and more working round you\./);   /* Build 39: the push and the flank */ g.ambush.hud(); assert.match(g.el('objtext').textContent, /Kareth left · a push from the north, a flank round you/);
  const src = fs.readFileSync(path.join(dist, 'game.js'), 'utf8'); assert(src.includes('`Command: Wave ${n} inbound from the ${COMPASS_WORDS[d.bearing/45]}, ${w.count} hostiles.`'), 'Kohar Valley\'s wave line'); assert.match(src, /held by the Kareth Brigade/); assert.match(fs.readFileSync(path.join(dist, 'map-dehrun.js'), 'utf8'), /The Kareth Brigade comes up the stairs/);
  report.apart = {squad, kareth: [ka, kb], hostilesDressed: foes.length};
});

await check('arms', 'the arms hold every weapon where the hands were, with fingers: the arms are on, the capsule hands and the knife\'s fist are no longer drawn; holding the rifle each wrist is at its grip and the fingers are curled round it (the trigger finger less than the others); through a reload the support hand goes down with the magazine and comes back and every bone stays whole; with the sidearm both hands are at the pistol; in a knife swing the left hand is at the knife and travels with it; holding a throwable the left hand is at it; the arm bones keep their lengths, and none of it makes anything new (twenty reloads, swings and throws leave the count of things as it was)', async () => {
  const g = await game('kohar'), vm = g.viewmodel, gun = g.gun; assert.equal(vm.armed, true); let mesh = null; gun.traverse(o => { if (o.isSkinnedMesh) mesh = o; }); assert(mesh && mesh.frustumCulled === false); const bones = Object.fromEntries(mesh.skeleton.bones.map(b => [b.name, b]));
  const hands = gun.children.filter(c => c.isGroup && c.children.length === 8 && c.children.every(o => o.isMesh)); assert.equal(hands.length, 2, 'the two capsule hands'); assert(hands.every(h => h.children.every(o => !o.visible)), 'the capsule hands are still drawn');
  const base = {reloadRemaining: 0, reloadDuration: 2, time: 0, moving: false, running: false, aiming: false, jump: 0, landing: 0, dt: 1 / 60}, pose = p => { gun.position.set(0, 0, 0); gun.rotation.set(0, 0, 0); vm.animate({...base, ...p}); gun.rotation.set(0, 0, 0); gun.updateMatrixWorld(true); for (const b of mesh.skeleton.bones) assert(finite(b), 'an arm bone that is nowhere'); };
  const inv = () => new THREE.Matrix4().copy(gun.matrixWorld).invert(), at = n => wp(bones[n]).applyMatrix4(inv()), bend = (s, f) => { const a = at(`Bip01_${s}_Finger${f}`), b = at(`Bip01_${s}_Finger${f}1`), c = at(`Bip01_${s}_Finger${f}2`); return b.clone().sub(a).normalize().angleTo(c.clone().sub(b).normalize()); };
  const len = () => mesh.skeleton.bones.filter(b => b.parent?.isBone).map(b => +b.position.length().toFixed(5)), lengths = len(), G = vm.grips;
  pose({}); assert(at('Bip01_R_Hand').distanceTo(G.rifle.R.at) < .002 && at('Bip01_L_Hand').distanceTo(G.rifle.L.at) < .002, 'the wrists are not at the rifle\'s grips');
  const palm = s => { const h = at(`Bip01_${s}_Hand`), x = at(`Bip01_${s}_Finger2`).sub(h).normalize(), across = at(`Bip01_${s}_Finger1`).sub(at(`Bip01_${s}_Finger4`)).normalize(), n = new THREE.Vector3().crossVectors(across, x).normalize(); return n.dot(G.rifle[s].palm) > 0 ? n : n.negate(); };
  for (const s of 'LR') for (const f of [2, 3, 4]) assert(at(`Bip01_${s}_Finger${f}2`).sub(at(`Bip01_${s}_Finger${f}`)).dot(palm(s)) > .015, `the ${s} hand's finger ${f} is curled away from its palm`);
  for (const f of [2, 3, 4]) { assert(bend('R', f) > .9, `the right hand's finger ${f} is not curled (${bend('R', f).toFixed(2)})`); assert(bend('L', f) > .6, `the left hand's finger ${f}`); } assert(bend('R', 1) < bend('R', 2) - .3, 'the trigger finger is curled like the others');
  assert(at('Bip01_L_Hand').z < -.2 && at('Bip01_R_Hand').z > 0, 'the support hand is ahead of the trigger hand'); assert(at('Bip01_R_Forearm').y < at('Bip01_R_Hand').y && at('Bip01_R_Forearm').z > at('Bip01_R_Hand').z, 'the forearm comes up from below and behind');
  let lowest = 9, back = null; for (let t = 0; t <= 1.0001; t += .05) { pose({reloadRemaining: (1 - t) * 2}); const y = at('Bip01_L_Hand').y; lowest = Math.min(lowest, y); if (t > .99) back = at('Bip01_L_Hand'); assert(at('Bip01_R_Hand').distanceTo(G.rifle.R.at) < .002, 'the trigger hand left the grip in a reload'); }
  assert(lowest < G.rifle.L.at.y - .2, `the support hand went down ${(G.rifle.L.at.y - lowest).toFixed(2)} m with the magazine`); assert(back.distanceTo(G.rifle.L.at) < .01, 'and came back');
  vm.setSidearm(true); pose({}); assert(at('Bip01_R_Hand').distanceTo(G.pistol.R.at) < .002 && at('Bip01_L_Hand').distanceTo(G.pistol.L.at) < .002, 'the hands are not at the pistol'); assert(at('Bip01_L_Hand').distanceTo(at('Bip01_R_Hand')) < .14, 'two hands on the pistol'); vm.setSidearm(false);
  const knife = []; for (const k of [1, .75, .5, .25]) { pose({knife: k}); knife.push(at('Bip01_L_Hand')); const blade = gun.children.find(c => c.isGroup && c.children.some(o => o.geometry?.type === 'ExtrudeGeometry')); assert(blade.visible); const grip = G.knife.at.clone().applyMatrix4(blade.matrix); assert(at('Bip01_L_Hand').distanceTo(grip) < .002, 'the left hand is not at the knife'); assert(bend('L', 2) > .9); }
  assert(knife[0].distanceTo(knife[3]) > .2, `the hand travels with the knife (${knife.map(v => v.toArray().map(x => x.toFixed(2)))})`); pose({}); assert(at('Bip01_L_Hand').distanceTo(G.rifle.L.at) < .002, 'the hand is back on the rifle');
  pose({holding: 'frag'}); const can = gun.children.find(c => c.isMesh && c.geometry.type === 'SphereGeometry' && c.visible); assert(can, 'the throwable in hand'); assert(at('Bip01_L_Hand').distanceTo(can.position) < .14, 'the left hand is not at the throwable'); pose({});
  assert.deepEqual(len(), lengths, 'an arm bone changed its length');
  const count = () => { let n = 0; const geo = new Set(), mats = new Set(); gun.traverse(o => { n++; if (o.geometry) geo.add(o.geometry.uuid); if (o.material) mats.add(o.material.uuid); }); return [n, geo.size, mats.size]; }, before = count();
  for (let i = 0; i < 20; i++) { for (let t = 0; t <= 1; t += .1) pose({reloadRemaining: (1 - t) * 2}); for (const k of [1, .5, .1]) pose({knife: k}); pose({holding: 'smoke'}); vm.setSidearm(i % 2 === 0); } vm.setSidearm(false); pose({}); assert.deepEqual(count(), before, 'holding, reloading and swinging made something');
  report.arms = {bones: mesh.skeleton.bones.length, supportHandDropInReload: +(G.rifle.L.at.y - lowest).toFixed(2), fingerBend: {trigger: +bend('R', 1).toFixed(2), others: +bend('R', 2).toFixed(2)}};
});

await check('kohar', 'Kohar Valley loads as it did and plays the same: before its first frame the game with the models has asked for exactly what the game without them asks for (no model, no loader), and the loader\'s module is not in what game.js imports; 60 s of the Story mission\'s own AI, squad and hostiles, sampled every two seconds, is the same with the models on as with them off (every position, health and state); the models change no soldier\'s place in the list, team or number, and draw no number from the game\'s dice', async () => {
  const on = await game('kohar'), off = await game('kohar', {models: false}); assert.deepEqual(on.early.sort(), off.early.sort(), 'the models changed what Kohar Valley asks for before its first frame'); assert(on.early.length >= 14);
  const read = f => fs.readFileSync(path.join(dist, f), 'utf8'), seen = new Set(), walk = f => { if (seen.has(f)) return; seen.add(f); for (const m of read(f).matchAll(/^\s*import\s+(?:[^'"]*?from\s+)?['"]\.\/([^'"]+)['"]/gm)) walk(m[1]); }; walk('game.js'); assert(seen.has('models.js') && !seen.has('GLTFLoader.js') && !seen.has('terraces.js') && !seen.has('map-dehrun.js'), 'the loader is fetched with the page'); assert.match(read('models.js'), /import\('\.\/GLTFLoader\.js'\)/); assert(!/\bimport\s*\(/.test(read('game.js')));
  assert.deepEqual(on.actors.map(a => [a.team, a.index, !!a.remote]), off.actors.map(a => [a.team, a.index, !!a.remote])); const places = g => g.actors.map(a => [...a.g.position.toArray(), a.g.rotation.y, a.hp]); assert.deepEqual(places(on), places(off), 'putting a body on a soldier moved it');
  const trace = async models => { const g = await game('kohar', {models}); g.reset(); g.play(); g.restoreAI(); g.set({hp: 1e9}); return aiTrace(g, 60); }; const a = await trace(true), b = await trace(false); assert(a.length >= 30 && a.some(r => r.e.some(e => e[2] < 100) || r.kills > 0 || r.a.some(x => x[2] < 100)), 'nothing happened in the minute'); assert.deepEqual(a, b, 'the models changed how Kohar Valley plays');
  report.kohar = {requestsBeforeTheFirstFrame: on.early.length, traceSamples: a.length};
});

await check('budget', 'the ceilings hold with a high wave in view, bodies, arms and all: on Dehrun Terraces at wave 12 with ten hostiles up, counting every mesh that is drawn (the town, each soldier\'s body, rifle and marks, the arms and the weapon in hand; a soldier\'s hidden shapes not counted), under 700 drawings and under 700,000 triangles; a soldier with its body is one drawing for the body where the coded soldier\'s body was twenty-five, and a body is under 4,600 triangles; changing map with the models on leaves nothing behind and dresses the next map\'s soldiers; a game thrown away while its models are still on their way takes no harm', async () => {
  const g = await game('dehrun', {mode: 'ambush'}); g.restoreAI(); g.set({hp: 1e9}); g.ambush.startWave(12); for (let i = 0; i < 60 * 40 && enemies(g).filter(a => a.hp > 0).length < 10; i++) { g.player.set(0, 6.6, 61.3); g.step(1); } const up = enemies(g).filter(a => a.hp > 0 && a.g.visible); assert(up.length >= 9, `${up.length} hostiles up`);
  const drawn = root => { let calls = 0, triangles = 0; const walk = o => { if (!o.visible) return; if (o.isMesh || o.isLine || o.isPoints) { calls++; const geo = o.geometry, n = geo.index ? geo.index.count : geo.attributes.position.count; if (o.isMesh) triangles += n / 3 * (o.isInstancedMesh ? o.count : 1); } for (const c of o.children) walk(c); }; walk(root); return {calls, triangles: Math.round(triangles)}; };
  g.scene.updateMatrixWorld(true); const all = drawn(g.scene), one = drawn(up[0].g), body = up[0].visual.skinned().body, bodyTris = body.geometry.index.count / 3; assert(all.calls < 700, `${all.calls} drawings`); assert(all.triangles < 700000, `${all.triangles} triangles`); assert(bodyTris <= 4600, `a body is ${bodyTris} triangles`);
  assert.equal(up[0].visual.proxies.length, 25); assert(one.calls <= 20 && one.triangles < 9000, `a hostile is ${one.calls} drawings and ${one.triangles} triangles`); const arms = drawn(g.gun); assert(arms.triangles < 60000, `the weapon in hand and the arms: ${arms.triangles} triangles`);
  // A change of map with the models on.
  g.goMenu(); const next = await g.changeMap('kohar'); assert.equal(g.dead(), true); let clock = 0; for (const a of next.actors) a.animate = a.visual.animate; next.frame(clock += 16); next.frame(clock += 16); assert(await until(() => next.models.bodies()), 'the next map\'s game never got its models'); assert(next.actors.every(a => a.visual.skinned()), 'the next map\'s soldiers are not dressed'); assert.equal(next.viewmodel.armed, true);
  const early = await createGame({...(SOURCE ? {sourcePath: SOURCE} : {}), models: true}); early.prepare({clearLane: false}); early.frame(16); early.frame(32); assert.equal(early.models.asked(), true); early.dispose(); await tick(50); assert.equal(early.models.bodies(), null, 'a game that was thrown away was dressed');
  report.budget = {hostilesUp: up.length, drawings: all.calls, triangles: all.triangles, oneHostile: one, body: bodyTris, weaponAndArms: arms};
});

maps.selectMap('kohar');
console.log(JSON.stringify({suite: 'T48 the models (Build 38)', passed: results.length, results, report}, null, 1));
