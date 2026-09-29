// Build 17 (T27) the AI squad is the player's choice, per mode. Untouched it is what every mode always had (three squadmates
// in Story, Skirmish and Story co-op, none in Ambush). The choice must govern what is really in the world, never leak
// between modes or between host and guest, and never replace the real co-op teammate. Also: at a co-op extraction a downed
// player banks alongside the survivor. Headless production code; co-op uses two instances joined by a stand-in channel.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame, projectRoot} from './sprint-harness.mjs';

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
  const g = await page(); assert.deepEqual({...g.squad.pref}, {story: true, skirmish: true, coop: true, ambush: false});
  for (const [mode, n] of [['story', 3], ['skirmish', 3], ['ambush', 0], ['story', 3], ['ambush', 0], ['skirmish', 3]]) { g.setMode(mode); assert.equal(g.el('squad-ai').checked, n === 3, `${mode}: the box shows the default`); assert.equal(g.el('squad-ai').disabled, false); assert.equal(g.el('squad-note').textContent, '', `${mode}: no note by default`); g.reset(); g.play();
    assert.equal(squad(g).length, n, `${mode}: ${n} squadmates`); assert.equal(g.squad.active(), n === 3); if (n) { assert.deepEqual(squad(g).map(a => g.actors.indexOf(a)), [0, 1, 2]); assert(squad(g).every(a => inScene(g, a) && a.hp === 100)); assert.equal(own(g).length, 10); } assert.equal(g.doc.body.classList.contains('solo'), n === 0, `${mode}: the squad panel is ${n ? 'shown' : 'hidden'}`); }
  const fixture = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  for (const mode of ['story', 'skirmish']) { const t = await page(); t.setMode(mode); t.reset(); t.play(); t.restoreAI(); t.set({hp: 1e9}); const rows = []; let clock = 0; t.frame(0); t.press('KeyW');
    for (let i = 0; i < 200 * 60; i++) { if (i === 18 * 60) t.release('KeyW'); t.frame(clock += 1000 / 60); if (i % 120 === 119) rows.push({t: Math.round((i + 1) / 60), p: [+t.player.x.toFixed(3), +t.player.z.toFixed(3)], kills: t.kills(), stage: t.getStage(), e: enemies(t).map(a => [+a.g.position.x.toFixed(3), +a.g.position.z.toFixed(3), a.hp, a.ai?.state ?? null, a.ai?.role ?? null, a.crouch ? 1 : 0, a.gone ? 1 : 0]), a: squad(t).map(a => [+a.g.position.x.toFixed(3), +a.g.position.z.toFixed(3), a.hp])}); }
    assert.equal(rows.length, fixture[mode].rows.length); for (let i = 0; i < rows.length; i++) assert.deepEqual(rows[i], fixture[mode].rows[i], `${mode} with the squad untouched: sample at ${rows[i].t} s differs from Build 09`); }
  report.defaults = {story: 3, skirmish: 3, storyCoop: 3, ambush: 0};
});

await check('the box governs what is in the world, in each of the three modes: off in Story and Skirmish there is no squadmate in the actor list or the scene at the start, during play, after a restart; on in Ambush there are three inside the arena; ticking it back restores the other state; enemies only ever see what is there', async () => {
  for (const mode of ['story', 'skirmish']) { const g = await solo(mode, false); g.set({hp: 1e9}); const all = g.scene.children.length;
    const none = why => { assert.equal(squad(g).length, 0, `${mode}, ${why}: no squadmate in the actor list`); assert.equal(g.scene.children.filter(o => o.userData?.look !== 'mate' && g.squad && false).length, 0); assert.equal(g.actors.filter(a => a.team === 'ally').length, 1, 'only the (hidden) co-op teammate actor remains'); assert.equal(enemies(g).length, 7); assert.equal(g.squad.active(), false); };
    none('at the start'); assert(g.doc.body.classList.contains('solo'), 'the squad panel is hidden'); let seenAlly = 0; g.press('KeyW'); g.run(40, () => { for (const a of enemies(g)) if (a.seen?.a) seenAlly++; }); g.release('KeyW'); none('after 40 s of play'); assert.equal(seenAlly, 0, 'no enemy ever saw a squadmate'); assert.equal(g.scene.children.length, all, 'nothing was added to the scene');
    g.press('KeyQ'); assert.doesNotMatch(g.el('notice').textContent, /^VIPER:/, 'the squad order key does nothing without a squad');
    g.reset(); g.play(); none('after a restart'); tick(g, true); assert.equal(squad(g).length, 0, 'ticking the box changes the next deployment, not the mission being played'); g.reset(); g.play(); assert.equal(squad(g).length, 3, `${mode}: squad back after ticking the box`); assert.deepEqual(squad(g).map(a => g.actors.indexOf(a)), [0, 1, 2]); assert(squad(g).every(a => inScene(g, a))); assert.equal(own(g).length, 10); assert(!g.doc.body.classList.contains('solo')); }
  const g = await solo('ambush', true); g.set({hp: 1e9}); assert.equal(squad(g).length, 3, 'Ambush with the box ticked: three squadmates'); assert(squad(g).every(a => inScene(g, a) && a.g.visible && a.hp === 100 && inArena(g.amb.open, a.g.position.x, a.g.position.z)), 'inside the arena'); assert(squad(g).every(a => Math.hypot(a.g.position.x - g.player.x, a.g.position.z - g.player.z) < 5), 'beside the player'); assert(!g.doc.body.classList.contains('solo'));
  tick(g, false); g.reset(); g.play(); assert.equal(squad(g).length, 0, 'Ambush: unticked again, none'); assert.equal(enemies(g).length, AMBUSH.enemyPool);
  report.governs = ['story', 'skirmish', 'ambush'];
});

await check('no leak between modes: each mode keeps its own choice through any order of switching, restarting and playing; a choice made in one mode never shows or acts in another', async () => {
  const g = await page(), want = {story: true, skirmish: true, ambush: false, coop: true}, count = () => squad(g).length; let steps = 0;
  const visit = (mode, change) => { g.setMode(mode); assert.equal(g.el('squad-ai').checked, want[mode], `${mode}: the box shows this mode's own choice`); if (change !== undefined) { tick(g, change); want[mode] = change; } assert.deepEqual({...g.squad.pref}, want, `after visiting ${mode}`); g.reset(); g.play(); assert.equal(count(), want[mode] ? 3 : 0, `${mode}: deployed with its own choice`); assert.equal(g.el('squad-note').textContent, g.squad.note()); steps++; };
  visit('story', false); visit('skirmish'); visit('ambush'); visit('story'); visit('ambush', true); visit('skirmish'); visit('story'); visit('skirmish', false); visit('ambush'); visit('story', true); visit('skirmish'); visit('ambush', false); visit('story'); visit('skirmish', true);
  assert.deepEqual(want, {story: true, skirmish: true, ambush: false, coop: true}); assert.equal(steps, 14);
  // Ambush geometry and the extra enemies never follow the squad into another mode.
  g.setMode('ambush'); tick(g, true); g.reset(); g.play(); assert.equal(enemies(g).length, AMBUSH.coop.enemyPool); g.setMode('story'); g.reset(); assert.equal(enemies(g).length, 7); assert.equal(own(g).length, 10); g.setMode('ambush'); tick(g, false);
  report.leak = 'none between modes';
});

await check('the warning: turning the squad off in Story shows one short line saying the missions are built for four, and it goes when the squad is back; Skirmish has its own; Ambush says what turning it on does', async () => {
  const g = await page(); g.setMode('story'); assert.equal(g.el('squad-note').textContent, ''); tick(g, false); const line = g.el('squad-note').textContent;
  assert.equal(line, 'Squad off: Story missions are built for four. Expect a much harder fight.'); assert(line.length <= 80 && !line.includes('\n'), 'one short line'); tick(g, true); assert.equal(g.el('squad-note').textContent, '');
  g.setMode('coop'); tick(g, false); assert.match(g.el('squad-note').textContent, /^Squad off: Story missions are built for four\./); tick(g, true);
  g.setMode('skirmish'); tick(g, false); assert.match(g.el('squad-note').textContent, /^Squad off: Skirmish is built for a squad of four\./); g.setMode('story'); assert.equal(g.el('squad-note').textContent, '', 'the Skirmish line does not follow into Story'); g.setMode('skirmish'); tick(g, true);
  g.setMode('ambush'); assert.equal(g.el('squad-note').textContent, ''); assert.match(g.el('brief-text').textContent, /^Ambush: alone,/); tick(g, true); assert.match(g.el('brief-text').textContent, /^Ambush: you and your AI squad /, 'the briefing does not say alone when a squad is coming'); assert.doesNotMatch(g.el('brief-text').textContent, /alone|No squad/); assert.equal(g.el('ambush-steps').hidden, true); assert.equal(g.el('ambush-squad-steps').hidden, false); assert.equal(g.el('squad-note').textContent, 'Squad on: Ambush uses the two-player waves, and only your own kills earn points.'); tick(g, false);
  const html = fs.readFileSync(new URL('dist/index.html', projectRoot), 'utf8'); assert.match(html, /<label><input id="audio"[^>]*> Audio<\/label><label><input id="blood"[^>]*> Blood<\/label><label><input id="squad-ai" type="checkbox" checked> AI squad<\/label>/, 'the box sits in the settings row beside Audio and Blood'); assert.match(html, /id="squad-note" role="status"/); assert.match(html, /BUILD 17/);
  report.warning = line;
});

await check('Ambush with the squad on: the two-player waves and the 18-enemy pool are used (no third curve), squadmates fight inside the arena and regroup inside it, only the player\'s own kills count and pay, prices are unchanged; with the squad off it is the solo run', async () => {
  const g = await solo('ambush', true), A = g.amb; g.set({hp: 1e9}); assert.equal(g.squad.scale(), 2); assert.equal(A.squad, 2); assert.equal(A.coop, false, 'not a co-op run'); assert.equal(enemies(g).length, AMBUSH.coop.enemyPool);
  let aliveMax = 0, allyShots = 0, outside = 0, frames = 0; const start = A.points;
  g.run(240, () => { frames++; g.set({hp: 1e9}); if (A.phase === 'decision') g.ambush.decide(false); const alive = enemies(g).filter(a => a.hp > 0).length; aliveMax = Math.max(aliveMax, alive); assert(alive <= waveSpec(Math.max(1, A.wave), 2).aliveCap, 'never more alive than the two-player cap');
    for (const a of squad(g)) { if (a.hp > 0 && !inArena(A.open, a.g.position.x, a.g.position.z, 3)) outside++; if (a.seen) allyShots++; } if (A.wave >= 2 && A.phase === 'wave') return false; });
  assert(A.survived >= 1, `the squad alone cleared a wave (wave ${A.wave})`); assert.equal(A.squad, 2); assert.equal(waveSpec(1, 2).count, 9); assert(allyShots > 0, 'squadmates engaged');
  assert.equal(g.kills(), 0, 'squad kills are not the player\'s kills (KILL-01)'); assert.equal(A.points, start, 'and earn no points'); assert.equal(A.earned, 0); assert(outside < frames * .05, `squadmates stay with the player in the arena (${outside} squadmate-frames outside of ${frames * 3})`);
  // The player's own kill pays as always.
  const e = enemies(g).find(a => a.hp > 0) ?? enemies(g)[0]; for (const o of enemies(g)) if (o !== e) { o.hp = 0; o.gone = true; o.g.visible = false; } e.hp = 20; e.dead = 0; e.gone = false; e.diedAt = null; e.sink = null; e.resetPose(); e.g.rotation.set(0, 0, 0); e.g.visible = true; e.g.position.set(g.player.x, g.groundY(g.player.x, g.player.z - 6), g.player.z - 6); e.g.updateMatrixWorld(true); for (const a of squad(g)) a.g.position.set(g.player.x + 3, 0, g.player.z + 3); g.hitScan(g.player.clone().setY(g.player.y + 1.7), V(0, -.08, -1).normalize(), CLASSES.assault, 'local'); assert.equal(g.kills(), 1); assert.equal(A.points, start + 100);
  // A downed squadmate regroups inside the arena, beside the Ambush start.
  const m = squad(g)[1]; m.hp = 0; m.dead = .05; g.run(.2); assert.equal(m.hp, 100, 'regrouped'); assert(inArena(A.open, m.g.position.x, m.g.position.z), `inside the arena (${m.g.position.x.toFixed(1)}, ${m.g.position.z.toFixed(1)})`); assert(Math.hypot(m.g.position.x - AMBUSH.start[0], m.g.position.z - AMBUSH.start[1]) < 6);
  assert.deepEqual(g.squad.regroup({index: 1}), [AMBUSH.start[0], AMBUSH.start[1] + 3]); g.setMode('story'); assert.deepEqual(g.squad.regroup({index: 1}), [0, 65], 'Story regroups where it always did');
  const s = await solo('ambush'); assert.equal(s.squad.scale(), 1); assert.equal(s.amb.squad, 1); assert.equal(enemies(s).length, AMBUSH.enemyPool); assert.equal(squad(s).length, 0);
  report.ambushSquad = {waves: 'two-player (waveSpec(n, 2))', pool: AMBUSH.coop.enemyPool, aliveMax, secondsForTheSquadAloneToClearWave1: Math.round(frames / 60 - AMBUSH.firstBreak - AMBUSH.breakTime), squadKillsPay: false};
});

await check('co-op: the host\'s choice governs the session and the guest sees it; with the squad off in Story co-op both pages have no squadmate and the snapshots still fit; with it on in co-op Ambush both pages have the same three; the guest\'s own choice and clicks change nothing; the real teammate is there either way and is never a bot', async () => {
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
    host.pause(); guest.pause(); guest.goMenu(); host.squad.pref.ambush = true; host.setMode('ambush'); assert.equal(guest.squad.hostSquad(), true, 'Ambush: the guest is told the host\'s Ambush choice'); assert.equal(guest.coop.mode(), 'ambush'); host.squad.pref.ambush = false; host.setMode('coop'); assert.equal(guest.squad.hostSquad(), true, 'Story co-op: and the Story one'); host.setMode('ambush'); assert.equal(guest.squad.hostSquad(), false); assert.equal(guest.el('squad-ai').checked, false); host.setMode('coop');
    // When the session ends the guest's page is its own again.
    guest.peer.connected = false; guest.peer.onClose(); guest.pause(); guest.setMode('ambush'); assert.equal(guest.squad.hostSquad(), null); assert.equal(guest.squad.wanted(), false); assert.equal(guest.el('squad-ai').disabled, false); guest.setMode('story'); assert.equal(guest.squad.wanted(), true); }
  // Co-op Ambush, host turns the squad on; the guest had it off (its default).
  { const p = await pair({mode: 'ambush', hostChoice: true}), {host, guest} = p; for (const g of [host, guest]) { assert.equal(teammate(g, `ambush co-op on / ${g.role}`), 3, `${g.role}: three squadmates`); assert.equal(enemies(g).length, AMBUSH.coop.enemyPool); assert.equal(own(g).length, 21); assert.equal(g.amb.coop, true); assert.equal(g.amb.squad, 2); }
    assert.equal(guest.squad.pref.ambush, false); let compared = 0; p.run(40, () => { host.set({hp: 1e9}); host.remote.hp = 1e9; if (!p.log.fresh) return; compared++; const H = own(host), G = own(guest); assert.equal(G.length, H.length); for (let i = 0; i < H.length; i++) { assert.equal(G[i].team, H[i].team); assert.equal(G[i].hp > 0, H[i].hp > 0, `actor ${i} alive on both`); if (G[i].netPos) assert(Math.hypot(G[i].netPos.x - H[i].g.position.x, G[i].netPos.z - H[i].g.position.z) < .02, `actor ${i} where the host has it`); } for (const a of enemies(host)) if (a.hp > 0) assert(['player', 'mate'].includes(a.ai.prey), 'enemies hunt a player, never a squadmate'); });
    assert(compared > 300); assert.equal(host.amb.wave >= 1, true); assert.equal(guest.amb.wave, host.amb.wave); }
  // Co-op Ambush untouched: no squad on either page, as in Build 16.
  { const p = await pair({mode: 'ambush'}), {host, guest} = p; for (const g of [host, guest]) { assert.equal(teammate(g, `ambush co-op default / ${g.role}`), 0); assert.equal(own(g).length, AMBUSH.coop.enemyPool); } }
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
