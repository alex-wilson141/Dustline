// Build 17 (T27), revised in Build 18: the AI squad is the player's choice in Story, Skirmish and Story co-op (three
// squadmates unless unticked). Ambush never has AI squadmates, under any setting (standing decision, Build 18). The choice must govern what is really in the world, never leak
// between modes or between host and guest, and never replace the real co-op teammate. Also: at a co-op extraction a downed
// player banks alongside the survivor. Headless production code; co-op uses two instances joined by a stand-in channel.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame, projectRoot} from './sprint-harness.mjs';
import {build09Trace} from './old-build.mjs'; // Build 09 is run on this machine; the stored record is reported, not required

const THREE = await import(new URL('dist/three.module.js', projectRoot));
const {CLASSES} = await import(new URL('dist/combat.js', projectRoot));
const {AMBUSH, waveSpec, bankMultiplier, inArena} = await import(new URL('dist/ambush.js', projectRoot));
const SOURCE = process.env.DUSTLINE_GAME_SOURCE ? new URL('file://' + process.env.DUSTLINE_GAME_SOURCE) : undefined;
const FIXTURE = new URL('fixtures/story-skirmish-ai-b09.json', import.meta.url);
const results = [], report = {};
async function check(name, fn) { await fn(); results.push(name); }
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const enemies = g => g.actors.filter(a => a.team === 'enemy');
const squad = g => g.actors.filter(a => a.team === 'ally' && !a.remote);
const own = g => g.actors.filter(a => !a.remote);
const inScene = (g, a) => g.scene.children.includes(a.g);
const wire = m => JSON.parse(JSON.stringify(m));

async function page(role = null, classId = 'assault') { const g = await createGame(SOURCE ? {sourcePath: SOURCE} : {}); g.prepare({role, clearLane: false, classId}); g.el('blood').checked = false; for (const a of g.actors) a.animate = a.visual.animate; g.role = role; return g; }
// A solo page in `mode`, deployed with the squad choice given (undefined leaves the default untouched).
async function solo(mode, choice) { const g = await page(); g.setMode(mode); if (choice !== undefined) tick(g, choice); g.reset(); g.play(); g.restoreAI(); let clock = 0; g.frame(0); g.run = (s, each) => { for (let i = 0, n = Math.round(s * 60); i < n; i++) { g.frame(clock += 1000 / 60); if (each?.() === false) break; } }; g.goTo = (x, z) => g.player.set(x, g.groundY(x, z), z); return g; }
// The player ticks or unticks the box in the settings row.
function tick(g, on) { const box = g.el('squad-ai'); box.checked = on; box.onchange(); }
async function pair({mode = 'coop', hostChoice, guestChoice, ai = true} = {}) {
  const host = await page('host'), guest = await page('guest'), log = {toGuest: [], toHost: []};
  host.peer.send = m => { if (!host.peer.connected) return false; log.toGuest.push(m); if (m.type === 'snapshot') log.fresh = true; guest.receive(wire(m)); return true; };
  guest.peer.send = m => { if (!guest.peer.connected) return false; log.toHost.push(m); host.receive(wire(m)); return true; };
  host.receive({type: 'hello', classId: 'assault'}); guest.receive({type: 'hello', classId: 'assault'}); host.goMenu = undefined;
  // Both are in the menu, connected, when the choices are made.
  for (const g of [host, guest]) g.pause();
  host.setMode(mode); if (guestChoice !== undefined) { guest.squad.pref[mode] = guestChoice; } if (hostChoice !== undefined) tick(host, hostChoice);
  host.start(); host.play(); guest.play(); if (ai) host.restoreAI();
  let clock = 0; host.frame(0); guest.frame(0);
  const p = {host, guest, log, step(n = 1) { for (let i = 0; i < n; i++) { log.fresh = false; clock += 1000 / 60; host.frame(clock); guest.frame(clock); } }, run(s, each) { for (let i = 0, n = Math.round(s * 60); i < n; i++) { p.step(); if (each?.() === false) break; } }, sync() { p.step(6); }};
  host.set({hp: 1e9}); host.remote.hp = 1e9; p.sync(); return p;
}
const cull = (g, after = 1.5) => { const e = g.state().elapsed, T = g.ambush.aiT(); for (const a of enemies(g)) if (a.hp > 0) { const d = Math.hypot(a.g.position.x - g.player.x, a.g.position.z - g.player.z); if (a.killAt == null && ((a.ai.firing && d <= T.fightRange) || d <= AMBUSH.holdRange + 1)) a.killAt = e + after; if (a.killAt != null && e >= a.killAt) { a.hp = 0; a.dead = 998; a.killAt = null; } } else a.killAt = null; };

await check('untouched, every mode is what it always was: three squadmates at indices 0 to 2 in Story, Skirmish and Story co-op, none in Ambush; the box shows that for each mode; Story and Skirmish replay the Build 09 trace; no warning is shown', async () => {
  const g = await page(); assert.deepEqual({...g.squad.pref}, {story: true, skirmish: true, coop: true}, 'there is no Ambush choice to make');
  for (const [mode, n] of [['story', 3], ['skirmish', 3], ['ambush', 0], ['story', 3], ['ambush', 0], ['skirmish', 3]]) { g.setMode(mode); assert.equal(g.el('squad-ai').checked, n === 3, `${mode}: the box shows the default`); assert.equal(g.el('squad-ai').disabled, mode === 'ambush'); assert.equal(g.el('squad-label').hidden, mode === 'ambush', `${mode}: the box is ${mode === 'ambush' ? 'not offered' : 'offered'}`); assert.equal(g.el('squad-note').textContent, '', `${mode}: no note by default`); g.reset(); g.play();
    assert.equal(squad(g).length, n, `${mode}: ${n} squadmates`); assert.equal(g.squad.active(), n === 3); if (n) { assert.deepEqual(squad(g).map(a => g.actors.indexOf(a)), [0, 1, 2]); assert(squad(g).every(a => inScene(g, a) && a.hp === 100)); assert.equal(own(g).length, 10); } assert.equal(g.doc.body.classList.contains('solo'), n === 0, `${mode}: the squad panel is ${n ? 'shown' : 'hidden'}`); }
  const fixture = await build09Trace(); report.storedRecordAgrees = fixture.storedRecordAgrees;
  for (const mode of ['story', 'skirmish']) { const t = await page(); t.setMode(mode); t.reset(); t.play(); t.restoreAI(); t.set({hp: 1e9}); const rows = []; let clock = 0; t.frame(0); t.press('KeyW');
    for (let i = 0; i < 200 * 60; i++) { if (i === 18 * 60) t.release('KeyW'); t.frame(clock += 1000 / 60); if (i % 120 === 119) rows.push({t: Math.round((i + 1) / 60), p: [+t.player.x.toFixed(3), +t.player.z.toFixed(3)], kills: t.kills(), stage: t.getStage(), e: enemies(t).map(a => [+a.g.position.x.toFixed(3), +a.g.position.z.toFixed(3), a.hp, a.ai?.state ?? null, a.ai?.role ?? null, a.crouch ? 1 : 0, a.gone ? 1 : 0]), a: squad(t).map(a => [+a.g.position.x.toFixed(3), +a.g.position.z.toFixed(3), a.hp])}); }
    assert.equal(rows.length, fixture[mode].rows.length); for (let i = 0; i < rows.length; i++) assert.deepEqual(rows[i], fixture[mode].rows[i], `${mode} with the squad untouched: sample at ${rows[i].t} s differs from Build 09`); }
  report.defaults = {story: 3, skirmish: 3, storyCoop: 3, ambush: 0};
});

await check('the box governs what is in the world in Story and Skirmish: off, there is no squadmate in the actor list or the scene at the start, during play, after a restart; ticking it back restores the squad; enemies only ever see what is there', async () => {
  for (const mode of ['story', 'skirmish']) { const g = await solo(mode, false); g.set({hp: 1e9}); const all = g.scene.children.length;
    const none = why => { assert.equal(squad(g).length, 0, `${mode}, ${why}: no squadmate in the actor list`); assert.equal(g.scene.children.filter(o => o.userData?.look !== 'mate' && g.squad && false).length, 0); assert.equal(g.actors.filter(a => a.team === 'ally').length, 1, 'only the (hidden) co-op teammate actor remains'); assert.equal(enemies(g).length, 7); assert.equal(g.squad.active(), false); };
    none('at the start'); assert(g.doc.body.classList.contains('solo'), 'the squad panel is hidden'); let seenAlly = 0; g.press('KeyW'); g.run(40, () => { for (const a of enemies(g)) if (a.seen?.a) seenAlly++; }); g.release('KeyW'); none('after 40 s of play'); assert.equal(seenAlly, 0, 'no enemy ever saw a squadmate'); assert.equal(g.scene.children.length, all, 'nothing was added to the scene');
    g.press('KeyQ'); assert.doesNotMatch(g.el('notice').textContent, /^VIPER:/, 'the squad order key does nothing without a squad');
    g.reset(); g.play(); none('after a restart'); tick(g, true); assert.equal(squad(g).length, 0, 'ticking the box changes the next deployment, not the mission being played'); g.reset(); g.play(); assert.equal(squad(g).length, 3, `${mode}: squad back after ticking the box`); assert.deepEqual(squad(g).map(a => g.actors.indexOf(a)), [0, 1, 2]); assert(squad(g).every(a => inScene(g, a))); assert.equal(own(g).length, 10); assert(!g.doc.body.classList.contains('solo')); }
  report.governs = ['story', 'skirmish'];
});

await check('no leak between modes: Story, Skirmish and Story co-op each keep their own choice through any order of switching, restarting and playing, with Ambush visited in between; a choice made in one mode never shows or acts in another', async () => {
  const g = await page(), want = {story: true, skirmish: true, coop: true}, count = () => squad(g).length; let steps = 0;
  const visit = (mode, change) => { g.setMode(mode); if (mode === 'ambush') { assert.equal(g.el('squad-ai').checked, false); tick(g, true); assert.deepEqual({...g.squad.pref}, want, 'a click in Ambush changes no choice'); g.reset(); g.play(); assert.equal(count(), 0, 'Ambush: none'); steps++; return; }
    assert.equal(g.el('squad-ai').checked, want[mode], `${mode}: the box shows this mode's own choice`); if (change !== undefined) { tick(g, change); want[mode] = change; } assert.deepEqual({...g.squad.pref}, want, `after visiting ${mode}`); g.reset(); g.play(); assert.equal(count(), want[mode] ? 3 : 0, `${mode}: deployed with its own choice`); assert.equal(g.el('squad-note').textContent, g.squad.note()); steps++; };
  visit('story', false); visit('skirmish'); visit('ambush'); visit('story'); visit('skirmish', false); visit('ambush'); visit('story', true); visit('skirmish'); visit('ambush'); visit('story'); visit('skirmish', true); visit('story', false); visit('ambush'); visit('skirmish'); visit('story', true);
  assert.deepEqual(want, {story: true, skirmish: true, coop: true}); assert.equal(steps, 15);
  report.leak = 'none between modes';
});

await check('the warning: turning the squad off in Story shows one short line saying the missions are built for four, and it goes when the squad is back; Skirmish has its own; Ambush offers no squad and says nothing', async () => {
  const g = await page(); g.setMode('story'); assert.equal(g.el('squad-note').textContent, ''); tick(g, false); const line = g.el('squad-note').textContent;
  assert.equal(line, 'Squad off: Story missions are built for four. Expect a much harder fight.'); assert(line.length <= 80 && !line.includes('\n'), 'one short line'); tick(g, true); assert.equal(g.el('squad-note').textContent, '');
  g.setMode('coop'); tick(g, false); assert.match(g.el('squad-note').textContent, /^Squad off: Story missions are built for four\./); tick(g, true);
  g.setMode('skirmish'); tick(g, false); assert.match(g.el('squad-note').textContent, /^Squad off: Skirmish is built for a squad of four\./); g.setMode('story'); assert.equal(g.el('squad-note').textContent, '', 'the Skirmish line does not follow into Story'); g.setMode('skirmish'); tick(g, true);
  g.setMode('ambush'); assert.equal(g.el('squad-note').textContent, ''); assert.match(g.el('brief-text').textContent, /^Ambush: alone,/); tick(g, true); assert.equal(g.el('squad-note').textContent, '', 'Ambush says nothing about a squad'); assert.match(g.el('brief-text').textContent, /^Ambush: alone,/); assert.equal(g.el('ambush-steps').hidden, false); assert.equal(g.el('squad-ai').checked, false, 'and the box cannot be ticked there');
  const html = fs.readFileSync(new URL('dist/index.html', projectRoot), 'utf8'); assert.match(html, /<label><input id="audio"[^>]*> Audio<\/label><label><input id="blood"[^>]*> Blood<\/label><label id="squad-label"><input id="squad-ai" type="checkbox" checked> AI squad<\/label>/, 'the box sits in the settings row beside Audio and Blood'); assert.match(html, /id="squad-note" role="status"/); assert.match(html, /BUILD 28/); assert.doesNotMatch(html, /ambush-squad-steps|AI squadmates, survive/, 'the Ambush squad steps are gone');
  report.warning = line;
});

await check('Ambush never has an AI squadmate, under any setting, mode switch or reset, solo or co-op: not by ticking the box, not by a stored choice, not by a host saying so; so nothing that only existed with a squad in Ambush remains (no squadmate regrouping in view, no enemy firing at a squadmate, no squad to show on the HUD)', async () => {
  const src = fs.readFileSync(new URL('dist/game.js', projectRoot), 'utf8'), html = fs.readFileSync(new URL('dist/index.html', projectRoot), 'utf8');
  const none = (g, why) => { assert.equal(squad(g).length, 0, `${why}: no AI squadmate in the actor list`); assert.equal(g.squad.active(), false, `${why}: deployed without a squad`); assert.equal(g.squad.wanted(), false); assert.equal(g.squad.scale(), g.amb.coop ? 2 : 1); assert(g.doc.body.classList.contains('solo'), `${why}: the squad panel is hidden`); };
  const g = await page(); const three = squad(g); assert.equal(three.length, 3); const gone = why => { for (const a of three) assert(!g.actors.includes(a) && !inScene(g, a), `${why}: the Story squadmates are out of the actor list and the scene`); };
  const deploy = why => { g.reset(); g.play(); none(g, why); gone(why); assert.equal(enemies(g).length, AMBUSH.enemyPool); };
  g.setMode('ambush'); deploy('default'); tick(g, true); deploy('after ticking the box'); g.el('squad-ai').checked = true; g.el('squad-ai').onchange(); deploy('after forcing the box');
  g.squad.pref.ambush = true; deploy('with a stored Ambush choice (as Build 17 kept)'); g.setMode('story'); g.setMode('ambush'); deploy('after switching modes with it'); delete g.squad.pref.ambush;
  for (const from of ['story', 'skirmish']) { g.setMode(from); tick(g, true); g.reset(); g.play(); assert.equal(squad(g).length, 3); g.setMode('ambush'); deploy(`coming from ${from} with its squad on`); g.reset(); g.play(); none(g, 'restart'); }
  // Play: two waves; enemies only ever see the player; Q gives no order.
  g.restoreAI(); let clock = 0, frames = 0; g.frame(0); g.set({hp: 1e9}); for (let i = 0; i < 60 * 200 && g.amb.wave < 3; i++) { g.frame(clock += 1000 / 60); frames++; g.set({hp: 1e9}); if (g.amb.phase === 'decision') g.ambush.decide(false); cull(g); if (i % 30 === 0) none(g, 'during play'); for (const a of enemies(g)) if (a.seen) assert.equal(a.seen.a, null, 'an enemy sees only the player'); }
  assert(g.amb.wave >= 2 && frames > 1500); g.press('KeyQ'); assert.doesNotMatch(g.el('notice').textContent, /^VIPER:/); assert.equal(g.squad.order(), 'advance');
  // Co-op: whatever either page has stored or is told, both pages have the teammate and nobody else.
  for (const told of [true, false, undefined]) { const p = await pair({mode: 'ambush'}), {host, guest} = p; for (const x of [host, guest]) none(x, `co-op, host said ${told}`);
    host.pause(); guest.pause(); host.squad.pref.ambush = true; guest.squad.pref.ambush = true; guest.receive({type: 'mode', mode: 'ambush', squad: told}); host.start(); host.play(); guest.receive({type: 'start', mode: 'ambush', hostClass: 'assault', squad: told}); guest.play(); p.sync();
    for (const x of [host, guest]) { none(x, `co-op with stored choices and a host message saying ${told}`); assert.equal(x.actors.filter(a => a.team === 'ally').length, 1); assert.equal(x.remote.remote, true); assert.equal(own(x).length, AMBUSH.coop.enemyPool, 'the snapshot holds the enemies and nobody else'); }
    assert.equal(p.log.toGuest.filter(m => m.type === 'mode' || m.type === 'start').every(m => m.mode !== 'ambush' || m.squad === false), true, 'the host never offers a squad for Ambush');
    host.restoreAI(); let seenFrames = 0; p.run(30, () => { host.set({hp: 1e9}); host.remote.hp = 1e9; for (const a of enemies(host)) if (a.seen) { seenFrames++; if (a.seen.a) assert.equal(a.seen.a, host.remote, 'the only ally an enemy can see or fire at is the real teammate'); } }); assert(seenFrames > 0, 'enemies were in the fight'); delete host.squad.pref.ambush; delete guest.squad.pref.ambush; }
  // What is left in the source: nothing that places, regroups or briefs a squad in Ambush.
  for (const gone of ['regroupSpot', 'AMBUSH_SQUAD_BRIEF', 'ambush-squad-steps', 'hold the courtyard with your squad', 'ambush:false']) assert(!src.includes(gone) && !html.includes(gone), `${gone} is gone`);
  assert(/ambushSquad\(false\);/.test(src.slice(src.indexOf('function ambushReset('), src.indexOf('function ambushEngage('))), 'every Ambush reset detaches the squad'); assert(src.includes("function squadWanted(){return mode==='ambush'?false:"));
  report.ambush = 'no AI squadmate under any setting';
});

await check('co-op: the host\'s choice governs the session and the guest sees it; with the squad off in Story co-op both pages have no squadmate and the snapshots still fit; the guest\'s own choice and clicks change nothing; the real teammate is there either way and is never a bot', async () => {
  const teammate = (g, tag) => { const allies = g.actors.filter(a => a.team === 'ally'), t = g.remote; assert(g.actors.includes(t) && t.remote === true && t.g.visible, `${tag}: the real teammate is in the world`); assert.equal(t.g.userData.look, 'mate', `${tag}: and is the blue one`); assert.equal(allies.filter(a => a.remote).length, 1); for (const a of squad(g)) { assert.notEqual(a, t); assert.notEqual(a.g.userData.look, 'mate', `${tag}: no bot wears the teammate's look`); } return allies.length - 1; };
  // Story co-op, host turns the squad off; the guest had asked for it on (its default).
  { const p = await pair({mode: 'coop', hostChoice: false, guestChoice: true}), {host, guest} = p; const start = p.log.toGuest.find(m => m.type === 'start'); assert.equal(start.squad, false, 'the deployment carries the host\'s choice');
    for (const g of [host, guest]) { assert.equal(teammate(g, `story co-op off / ${g.role}`), 0, `${g.role}: no squadmate`); assert.equal(g.squad.active(), false); assert.equal(own(g).length, 7); assert.equal(enemies(g).length, 7); }
    assert.equal(guest.squad.pref.coop, true, 'the guest\'s own choice is kept but not used'); assert.equal(guest.squad.hostSquad(), false);
    // The snapshots fit: the guest's enemies follow the host's.
    host.press('KeyW'); p.run(20); host.release('KeyW'); let compared = 0; p.run(6, () => { if (!p.log.fresh) return; compared++; const H = enemies(host), G = enemies(guest); for (let i = 0; i < 7; i++) { assert.equal(G[i].hp, H[i].hp, `enemy ${i} health`); assert(G[i].netPos && Math.hypot(G[i].netPos.x - H[i].g.position.x, G[i].netPos.z - H[i].g.position.z) < 1e-6, `enemy ${i} position as sent`); } }); assert(compared > 50, 'snapshots were accepted by the guest');
    for (const a of enemies(host)) if (a.seen?.a) assert.equal(a.seen.a, host.remote, 'the only ally an enemy can see is the real teammate');
    // The guest sees the host's choice and cannot change it.
    guest.squad.ui(); assert.equal(guest.el('squad-ai').checked, false, 'the guest\'s box shows the host\'s choice'); assert.equal(guest.el('squad-ai').disabled, true); assert.match(guest.el('squad-note').textContent, /^Your host chose: AI squad off\. Squad off: Story missions are built for four\./);
    const sent = p.log.toHost.length; tick(guest, true); assert.equal(guest.squad.pref.coop, true); assert.equal(guest.squad.wanted(), false, 'a guest\'s click changes nothing'); assert.equal(guest.el('squad-ai').checked, false); assert.equal(p.log.toHost.slice(sent).filter(m => m.type === 'mode').length, 0);
    // The host changes its mind in the menu: the guest is told, and the next deployment uses it.
    host.pause(); tick(host, true); assert.deepEqual(wire(p.log.toGuest.filter(m => m.type === 'mode').at(-1)), {type: 'mode', mode: 'coop', squad: true}); assert.equal(guest.squad.wanted(), true); host.start(); host.play(); guest.play(); p.sync(); for (const g of [host, guest]) { assert.equal(teammate(g, `story co-op on / ${g.role}`), 3); assert.equal(own(g).length, 10); assert.deepEqual(squad(g).map(a => g.actors.indexOf(a)), [0, 1, 2]); }
    tick(guest, false); assert.equal(guest.squad.pref.coop, true, 'a guest\'s click does not even change its own stored choice while it is a guest'); assert.equal(guest.el('squad-ai').checked, true, 'and the box goes back to the host\'s choice');
    // The host's choice for each mode follows the host's mode in the menu.
    host.pause(); guest.pause(); guest.goMenu(); host.setMode('ambush'); assert.equal(guest.squad.hostSquad(), false, 'Ambush: the guest is told there is no squad'); assert.equal(guest.coop.mode(), 'ambush'); assert.equal(guest.squad.wanted(), false); host.setMode('coop'); assert.equal(guest.squad.hostSquad(), true, 'Story co-op: the host\'s Story choice again'); assert.equal(guest.el('squad-ai').checked, true); tick(host, false); assert.equal(guest.squad.hostSquad(), false); tick(host, true);
    // When the session ends the guest's page is its own again.
    guest.peer.connected = false; guest.peer.onClose(); guest.pause(); guest.setMode('skirmish'); assert.equal(guest.squad.hostSquad(), null); assert.equal(guest.squad.wanted(), true); assert.equal(guest.el('squad-ai').disabled, false); guest.setMode('story'); assert.equal(guest.squad.wanted(), true); }
  report.coop = 'the host\'s choice governs; the teammate is always the real player';
});

await check('with the squad off the missions can still be completed: Story goes from the route log through the relay to the extraction and Skirmish holds the relay, alone, with the enemies and reinforcements running; what the player faces alone is measured against what the squad shares', async () => {
  const clearRelay = g => { for (const a of enemies(g)) if (a.hp > 0 && a.g.position.distanceTo(g.ai.target) < 22) { const from = g.player.clone().setY(g.player.y + 1.7), to = a.g.position.clone().setY(a.g.position.y + 1.2); a.hp = Math.min(a.hp, 30); if (g.visible(from, to)) g.hitScan(from, to.sub(from).normalize(), CLASSES.assault, 'local'); else { a.hp = 0; a.dead = 999; a.diedAt = g.state().elapsed; } } };
  { const g = await solo('story', false); g.set({hp: 1e9}); assert.equal(squad(g).length, 0); assert.equal(g.getStage(), 0);
    g.goTo(g.ai.intel.x + 2, g.ai.intel.z); g.run(.2); assert.equal(g.el('interact').textContent, 'E · RECOVER ROUTE LOG'); g.press('KeyE'); assert.equal(g.getStage(), 1, 'route log recovered alone');
    g.goTo(g.ai.target.x + 3, g.ai.target.z + 3); let t = 0; g.run(120, () => { g.set({hp: 1e9}); clearRelay(g); t += 1 / 60; if (g.getStage() === 2) return false; }); assert.equal(g.getStage(), 2, `relay restored alone (after ${t.toFixed(0)} s)`);
    g.goTo(g.ai.extract.x, g.ai.extract.z); g.run(8, () => { g.set({hp: 1e9}); }); assert.equal(g.state().state, 'ended'); assert.equal(g.el('result').textContent, 'Convoy warned. Squad extracted.'); assert.match(g.el('report').textContent, /^Viper squad has completed the mission\. \d+ confirmed eliminations/); assert.equal(squad(g).length, 0); report.story = {relaySeconds: Math.round(t), kills: g.kills()}; }
  { const g = await solo('skirmish', false); g.set({hp: 1e9}); g.goTo(g.ai.target.x + 3, g.ai.target.z + 3); let t = 0; g.run(150, () => { g.set({hp: 1e9}); clearRelay(g); t += 1 / 60; if (g.state().state === 'ended') return false; }); assert.equal(g.state().state, 'ended'); assert.equal(g.el('result').textContent, 'Relay secured.'); report.skirmish = {holdSeconds: Math.round(t), kills: g.kills()}; }
  // What changes for the player: the damage taken standing at the relay for three minutes, squad on and squad off.
  const taken = async on => { const g = await solo('story', on); g.ai.setStage(1); g.goTo(g.ai.target.x + 3, g.ai.target.z + 3); let lost = 0, firing = 0; g.set({hp: 1e6}); g.run(180, () => { lost += 1e6 - g.ambush.hp(); g.set({hp: 1e6}); firing = Math.max(firing, enemies(g).filter(a => a.ai?.firing && a.seen && !a.seen.a).length); }); return {damagePerMinute: Math.round(lost / 3), mostFiringAtPlayerAtOnce: firing}; };
  const withSquad = await taken(true), alone = await taken(false); assert(alone.mostFiringAtPlayerAtOnce <= 3, 'never more than three enemies fire at the player at once (attack tokens), squad or no squad'); report.exposure = {withSquad, alone};
});

await check('at a co-op extraction a downed player banks alongside the survivor, each their own points, on both pages; a run that ends with both down still banks nothing, and a player who left banks nothing', async () => {
  const at6 = async () => { const p = await pair({mode: 'ambush', ai: false}), {host} = p, H = host.amb; enemies(host).forEach(a => { a.hp = 0; a.gone = true; a.g.visible = false; }); Object.assign(H, {wave: 6, survived: 6, phase: 'decision', timer: 9, earned: 3000, points: 500, kills: 25}); Object.assign(H.mate, {earned: 1000, points: 200, kills: 9}); p.sync(); return p; };
  globalThis.localStorage = (() => { const m = new Map(); return {getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => { m.set(k, String(v)); }}; })();
  const mult = bankMultiplier(6); assert.equal(mult, 1.25);
  for (const downed of ['host', 'guest']) { const p = await at6(), {host, guest} = p, up = p[downed === 'host' ? 'guest' : 'host']; host.set({hp: 100}); host.remote.hp = 100; host.coop.down(downed === 'host' ? 'me' : 'mate'); p.sync(); up.press(up.ambush.keys.extract); p.sync();
    for (const g of [host, guest]) { assert.equal(g.state().state, 'ended'); assert.equal(g.el('result').textContent, 'Extracted.'); } const hostBank = Math.round(3000 * mult), guestBank = Math.round(1000 * mult);
    assert.deepEqual([host.amb.banked, host.amb.mate.banked], [hostBank, guestBank], `host page (${downed} down): both bank their own`); assert.deepEqual([guest.amb.banked, guest.amb.mate.banked], [guestBank, hostBank], `guest page (${downed} down): both bank their own`);
    const lines = p[downed].el('report').textContent.split('\n'); assert.equal(lines[1], `YOU: ${downed === 'host' ? 25 : 9} kills · ${downed === 'host' ? 3000 : 1000} points earned · down · banked ${downed === 'host' ? hostBank : guestBank} (${downed === 'host' ? 3000 : 1000} × 1.25).`, 'the downed player\'s own report says so'); assert.match(lines[2], /^TEAMMATE: .* points earned · banked \d+ \(\d+ × 1\.25\)\.$/); assert.match(p[downed].el('report').textContent, /\n(First co-op run recorded|Co-op personal best): wave 6 · \d+ banked/, 'and a co-op record is written'); }
  { const p = await at6(), {host, guest} = p; host.set({hp: 100}); host.remote.hp = 100; host.coop.down('me'); host.coop.down('mate'); p.sync(); for (const g of [host, guest]) { assert.equal(g.state().state, 'ended'); assert.equal(g.el('result').textContent, 'Overrun.'); assert.deepEqual([g.amb.banked, g.amb.mate.banked], [0, 0], 'both down: nothing banked'); } }
  { const p = await at6(), {host, guest} = p; host.peer.connected = guest.peer.connected = false; host.peer.onClose(); guest.peer.onClose(); host.press(host.ambush.keys.extract); assert.equal(host.state().state, 'ended'); assert.deepEqual([host.amb.banked, host.amb.mate.banked], [Math.round(3000 * mult), 0], 'a player who left banks nothing'); }
  delete globalThis.localStorage; report.bank = 'a downed player banks with the survivor';
});

console.log(JSON.stringify({passed: results.length, checks: results, report, limitations: [
  'Headless. "Completable" means the mission logic runs from start to end with no squadmate, against the real enemies and reinforcements, driven by an automated player that cannot be killed. Whether a person survives Story or Skirmish alone is not shown here; the exposure numbers say what changes.',
  'Co-op uses two instances of the game joined by a stand-in for the data channel: no real WebRTC, no latency, no second network.',
  'Whether Ambush with a squad is fun or too easy is for the playtest; Build 11 found the squad doing most of the killing.']}, null, 2));
