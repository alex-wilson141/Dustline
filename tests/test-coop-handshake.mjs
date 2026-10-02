// COOP-01 (Build 15): the co-op handshake. A connection code names its kind and length and carries a checksum; a valid
// exchange connects, also when the codes went through whitespace and line-break mangling; every genuinely wrong input is
// rejected with a message that says what is wrong; a pasted code is handled by what it is, whichever button is pressed;
// a connection that fails after a correct exchange is reported as a network failure, not as a wrong code.
// Headless: the real PeerSquad and the real game buttons with a stand-in for the browser's RTCPeerConnection.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame, projectRoot} from './sprint-harness.mjs';

const {PeerSquad, CodeError, makeCode, readCode, cleanCode, checksum, hasPublicAddress, NETWORK_FAILURE, CODE_VERSION} = await import(new URL('dist/network.js', projectRoot));
const results = [], report = {};
async function check(name, fn) { await fn(); results.push(name); }
const tick = (ms = 0) => new Promise(r => setTimeout(r, ms));

// ---- A stand-in for the browser's peer connections: two of them connect when each holds the other's description.
const net = {peers: new Map(), blocked: false, n: 0};
class FakeChannel { constructor() { this.readyState = 'connecting'; this.bufferedAmount = 0; this.sent = []; } send(m) { this.sent.push(m); this.other?.onmessage?.({data: m}); } close() { this.readyState = 'closed'; } open() { this.readyState = 'open'; this.onopen?.(); } }
class FakePC {
  constructor() { this.id = 'u' + (++net.n); this.signalingState = 'stable'; this.iceGatheringState = 'new'; this.connectionState = 'new'; this.listeners = new Map(); net.peers.set(this.id, this); }
  sdp(setup) { return `v=0\r\no=- ${1e15 + net.n} 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\nm=application 34033 UDP/DTLS/SCTP webrtc-datachannel\r\nc=IN IP4 203.0.113.9\r\na=candidate:1 1 udp 2113937151 e8a8668a-d546-4f2b.local 64054 typ host generation 0\r\n${net.noPublic ? '' : 'a=candidate:2 1 udp 1677729535 203.0.113.9 34033 typ srflx raddr 0.0.0.0 rport 0 generation 0\r\n'}a=ice-ufrag:${this.id}\r\na=ice-pwd:t0HdZ1z5MIj4GmD0nmEM0Y+6/x\r\na=fingerprint:sha-256 0D:9C:51:B7:94:F6:38:BF:85:CD:EE:C4:3A:04:3E:40:FF:5D:3A:25:64:40:ED:6F:A2:E5:14:A3:6E:4E:7B:6A\r\na=setup:${setup}\r\na=mid:0\r\na=sctp-port:5000\r\n`; }
  createDataChannel() { return this.channel = new FakeChannel(); }
  async createOffer() { return {type: 'offer', sdp: this.sdp('actpass')}; }
  async createAnswer() { assert.equal(this.signalingState, 'have-remote-offer'); return {type: 'answer', sdp: this.sdp('active')}; }
  async setLocalDescription(d) { this.localDescription = d; this.signalingState = d.type === 'offer' ? 'have-local-offer' : 'stable'; this.iceGatheringState = 'complete'; for (const f of this.listeners.get('icegatheringstatechange') || []) f(); if (d.type === 'answer') this.tryConnect(); }
  async setRemoteDescription(d) { if (typeof d.sdp !== 'string' || !d.sdp.startsWith('v=0')) throw new Error('bad sdp'); if (d.type === 'answer' && this.signalingState !== 'have-local-offer') throw new Error('no offer pending'); this.remoteDescription = d; this.signalingState = d.type === 'offer' ? 'have-remote-offer' : 'stable'; if (d.type === 'answer') this.tryConnect(); }
  remoteId() { return this.remoteDescription?.sdp.match(/a=ice-ufrag:(\S+)/)?.[1]; }
  tryConnect() { const other = net.peers.get(this.remoteId()); if (!other || other.remoteId() !== this.id || !this.localDescription || !other.localDescription || this.closed || other.closed) return;
    const [host, guest] = this.localDescription.type === 'offer' ? [this, other] : [other, this]; if (host.signalingState !== 'stable' || host.connectionState !== 'new') return;
    for (const p of [host, guest]) { p.connectionState = 'connecting'; p.onconnectionstatechange?.(); }
    queueMicrotask(() => { if (net.blocked) { for (const p of [host, guest]) { p.connectionState = 'failed'; p.onconnectionstatechange?.(); } return; }
      const g = new FakeChannel(); g.other = host.channel; host.channel.other = g; for (const p of [host, guest]) { p.connectionState = 'connected'; p.onconnectionstatechange?.(); } guest.ondatachannel?.({channel: g}); host.channel.open(); g.open(); }); }
  addEventListener(e, f) { if (!this.listeners.has(e)) this.listeners.set(e, []); this.listeners.get(e).push(f); } removeEventListener(e, f) { this.listeners.set(e, (this.listeners.get(e) || []).filter(x => x !== f)); }
  close() { this.closed = true; this.connectionState = 'closed'; }
}
globalThis.RTCPeerConnection = FakePC;
const squad = () => { const log = []; const p = new PeerSquad({status: t => log.push(t), onReady: r => log.push('READY ' + r), onMessage: m => log.push(m), onClose: () => log.push('CLOSED')}); p.log = log; p.connectTimeout = 60; return p; };
const said = p => p.log.filter(l => typeof l === 'string' && !/^(READY |CLOSED$)/.test(l));
const rejects = async (promise, reason, pattern) => { let e = null; try { await promise; } catch (x) { e = x; } assert(e instanceof Error, `expected a rejection (${reason})`); if (reason) assert.equal(e.reason, reason, e.message); if (pattern) assert.match(e.message, pattern); return e; };
// What chat apps, e-mail and careless selection do to a long code.
const MANGLE = {
  'wrapped at 76 columns with line breaks': c => c.replace(/(.{76})/g, '$1\n'),
  'wrapped with Windows line breaks': c => c.replace(/(.{64})/g, '$1\r\n'),
  'spaces every 40 characters, spaces and a newline around it': c => `  ${c.replace(/(.{40})/g, '$1 ')} \n`,
  'tabs and a non-breaking space': c => c.replace(/(.{100})/g, '$1\t') + '\u00a0',
  'zero-width spaces inside': c => c.slice(0, 50) + '\u200b' + c.slice(50, 300) + '\ufeff' + c.slice(300),
  'in straight quotation marks': c => `"${c}"`,
  'in curly quotation marks': c => `“${c}”`,
  'in backticks': c => '`' + c + '`',
  'in angle brackets': c => `<${c}>`,
  'header in lower case': c => c.replace('DUSTLINE:H', 'dustline:h').replace('DUSTLINE:A', 'dustline:a'),
  'with words in front of it': c => `here is my code ${c}`,
};

await check('a code names itself, its length and its checksum, uses only characters that chat apps leave alone, and reads back to the same connection description', async () => {
  const pc = new FakePC(), offer = await pc.createOffer(), code = makeCode(offer), parts = code.split(':');
  assert.equal(parts.length, 5); assert.deepEqual([parts[0], parts[1]], ['DUSTLINE', 'H']); assert.equal(Number(parts[2]), parts[3].length); assert.equal(parts[4], checksum(parts[3])); assert.match(code, /^[A-Za-z0-9:_-]+$/, 'no +, / or = and no spaces');
  const r = readCode(code); assert.deepEqual([r.ok, r.type, r.sdp, r.id], [true, 'offer', offer.sdp, checksum(parts[3])]); assert.equal(CODE_VERSION, 3);
  const answer = makeCode({type: 'answer', sdp: offer.sdp.replace('actpass', 'active')}, {for: r.id}); assert.match(answer, /^DUSTLINE:A:/); assert.deepEqual([readCode(answer).type, readCode(answer).for], ['answer', r.id]);
  assert.equal(hasPublicAddress(offer.sdp), true); assert.equal(hasPublicAddress(offer.sdp.replace(/a=candidate:2[^\n]*\n/, '')), false);
  report.code = {length: code.length, example: code.slice(0, 30) + '…' + code.slice(-12)};
});

await check('a valid exchange connects: host code, answer, accept, both sides ready and messages flow; the same through every kind of whitespace, line-break and quoting mangling, in both directions', async () => {
  for (const [how, f] of [['untouched', c => c], ...Object.entries(MANGLE)]) { const host = squad(), guest = squad();
    const offer = await host.host(); assert.match(host.log.at(-1), /^Host code ready \(\d+ characters\)/);
    const answer = await guest.submit(f(offer), 'join'); assert.match(answer, /^DUSTLINE:A:/, how); assert.match(guest.log.at(-1), /^Answer code ready/);
    assert.equal(await host.submit(f(answer), 'accept'), null); await tick(5);
    assert(host.connected && guest.connected, `${how}: connected`); assert(host.log.includes('READY host') && guest.log.includes('READY guest')); assert.equal(said(host).at(-1), 'Connected. Host can deploy the squad.'); assert.equal(said(guest).at(-1), 'Connected. Host can deploy the squad.');
    assert.equal(host.send({type: 'start', mode: 'coop', hostClass: 'assault'}), true); assert.deepEqual(guest.log.at(-1), {type: 'start', mode: 'coop', hostClass: 'assault'}); assert.equal(guest.send({type: 'hello', classId: 'medic'}), true); assert.deepEqual(host.log.at(-1), {type: 'hello', classId: 'medic'});
    await tick(80); assert(!host.log.includes(NETWORK_FAILURE) && !host.log.some(l => /could not reach/.test(String(l))), 'no network warning after a good connection'); host.close(); guest.close(); }
  assert.equal(cleanCode(' "DUSTLINE:H:3:abc:12345678" \n'), 'DUSTLINE:H:3:abc:12345678');
  report.mangling = Object.keys(MANGLE);
});

await check('the pasted code decides what happens, not the button: the host may press JOIN WITH CODE with the answer; a host code on ACCEPT ANSWER, an answer on a page with no host code, an answer made for an earlier host code, and your own code each get their own message', async () => {
  const host = squad(), guest = squad(), offer = await host.host(), answer = await guest.submit(offer, 'join');
  assert.equal(await host.submit(answer, 'join'), null, 'the answer is accepted although JOIN was pressed'); await tick(5); assert(host.connected && guest.connected); host.close(); guest.close();
  // Both created host codes, and one pastes the other's on ACCEPT ANSWER.
  const a = squad(), b = squad(), oa = await a.host(), ob = await b.host(); await rejects(a.submit(ob, 'accept'), 'wrong-kind', /host code, not an answer.*both created host codes/); assert.equal(a.pc.signalingState, 'have-local-offer', 'the pending host code survives the mistake');
  const ab = await a.submit(ob, 'join'); assert.match(ab, /^DUSTLINE:A:/, 'pressing JOIN with the other host code joins their game'); assert.equal(a.role, 'guest'); assert.equal(await b.submit(ab, 'accept'), null); await tick(5); assert(a.connected && b.connected); a.close(); b.close();
  // An answer on a page that is not waiting for one (reloaded, or never hosted).
  const h = squad(), g = squad(), o = await h.host(), an = await g.submit(o, 'join'), fresh = squad(); await rejects(fresh.submit(an, 'accept'), 'no-host-code', /no host code waiting/); await rejects(fresh.submit(an, 'join'), 'no-host-code');
  // The host made a new host code after sending the first: the old answer no longer fits.
  await h.host(); await rejects(h.submit(an, 'accept'), 'stale-answer', /made for an earlier host code/); assert(!h.connected);
  // Your own code pasted back.
  const mine = await h.host(); await rejects(h.submit(mine, 'join'), 'own-code', /your own code/); await rejects(g.submit(an, 'join'), 'own-code'); h.close(); g.close();
  // The old two-function path still tells the kinds apart, with a specific message.
  const p = squad(); assert.deepEqual(p.decode(o, 'offer').type, 'offer'); await rejects((async () => p.decode(o, 'answer'))(), 'wrong-kind', /That is a host code, and an answer code is needed here/); await rejects((async () => p.decode(an, 'offer'))(), 'wrong-kind', /That is an answer code, and a host code is needed here/);
});

await check('genuinely wrong input is rejected, each with a message that says what is wrong: empty box, a web address, random text, a code cut short (with the counts), a changed character, two codes in one paste, a code from an older or newer build', async () => {
  const pc = new FakePC(), code = makeCode(await pc.createOffer()), payload = code.split(':')[3], want = payload.length, cases = [];
  const expect = (name, text, reason, pattern) => { const r = readCode(text); assert.equal(r.ok, false, name); assert.equal(r.reason, reason, `${name}: ${r.message}`); assert.match(r.message, pattern, name); assert(!/Wrong connection code/.test(r.message)); cases.push([name, r.message]); return r; };
  expect('empty box', '', 'empty', /box is empty/); expect('only spaces', ' \n\t ', 'empty', /box is empty/);
  expect('the game link', 'https://alex-wilson141.github.io/Dustline/', 'link', /web address, not a connection code/);
  expect('random text', 'hey are you ready to play', 'not-a-code', /starts with "DUSTLINE:"/); expect('a number', '12345', 'not-a-code', /not a DUSTLINE connection code/);
  assert(code.length > 700, `code of ${code.length} characters`); for (const n of [code.length - 30, 500, 160, 40]) { const r = expect(`cut to ${n} characters`, code.slice(0, n), 'incomplete', /incomplete: \d+ of \d+ characters arrived/); assert.deepEqual([r.got, r.want], [n - code.indexOf(payload), want]); }
  expect('cut inside the header', code.slice(0, 12), 'incomplete', /incomplete/); expect('checksum missing', code.slice(0, code.lastIndexOf(':')), 'incomplete', /incomplete/); expect('checksum cut', code.slice(0, -3), 'incomplete', /incomplete/);
  const i = code.indexOf(payload) + 200, swapped = code.slice(0, i) + (code[i] === 'A' ? 'B' : 'A') + code.slice(i + 1); expect('one character changed', swapped, 'altered', /changed on the way/);
  // A change that still reads as a complete, well-formed code: only the checksum can notice it.
  const inner = JSON.parse(Buffer.from(payload, 'base64url').toString()), forged = Buffer.from(JSON.stringify({...inner, sdp: inner.sdp.replace('203.0.113.9 34033', '203.0.113.8 34033')})).toString('base64url'); assert.equal(forged.length, payload.length); assert.notEqual(forged, payload);
  expect('an address inside changed, same length', code.replace(payload, forged), 'altered', /no longer matches its checksum/); assert.equal(readCode(`DUSTLINE:H:${forged.length}:${forged}:${checksum(forged)}`).ok, true, 'with its own checksum the same text is a valid code');
  expect('a character removed', code.slice(0, i) + code.slice(i + 1), 'incomplete', /incomplete/); expect('a character added', code.slice(0, i) + 'x' + code.slice(i), 'altered', /changed on the way/);
  expect('two codes in one paste', code + code, 'altered', /changed on the way/); expect('kind letter changed', code.replace('DUSTLINE:H:', 'DUSTLINE:X:'), 'altered', /changed on the way/);
  const v2 = Buffer.from(JSON.stringify({v: 2, type: 'offer', sdp: 'v=0\r\n'})).toString('base64'); expect('a Build 14 code', v2, 'old-build', /older build.*reload/); expect('a Build 14 code, wrapped', v2.replace(/(.{20})/g, '$1\n'), 'old-build', /older build/);
  const mk = v => { const p = Buffer.from(JSON.stringify({v, type: 'offer', sdp: 'v=0\r\n'})).toString('base64url'); return `DUSTLINE:H:${p.length}:${p}:${checksum(p)}`; }; expect('a newer build', mk(4), 'newer-build', /newer build.*Reload this page/); expect('version 1 in the new shape', mk(1), 'old-build', /older build/);
  const noSdp = (() => { const p = Buffer.from(JSON.stringify({v: 3, type: 'offer', sdp: 'hello'})).toString('base64url'); return `DUSTLINE:H:${p.length}:${p}:${checksum(p)}`; })(); expect('no connection description inside', noSdp, 'altered', /does not hold a connection description/);
  assert.equal(readCode(null).ok, false); assert.equal(readCode('x'.repeat(70000)).reason, 'not-a-code'); assert.equal(new Set(cases.map(c => c[1])).size >= 9, true, 'distinct messages');
  // Through the real entry point nothing wrong changes the connection state.
  const p = squad(); await p.host(); const before = p.pc; for (const bad of ['', 'https://example.com', code.slice(0, 500), swapped, v2]) await rejects(p.submit(bad, 'join')); assert.equal(p.pc, before); assert.equal(p.pc.signalingState, 'have-local-offer'); p.close();
  report.messages = Object.fromEntries(cases);
});

await check('a real network failure is told apart from a bad code: after a correct exchange a connection that fails, or does not come up in time, says the networks could not reach each other and never blames the code; it names the side that revealed no public address', async () => {
  net.blocked = true; const host = squad(), guest = squad(), offer = await host.host(), answer = await guest.submit(offer, 'join'); assert.equal(await host.submit(answer, 'accept'), null); await tick(5); assert(said(host).includes('Codes accepted. Connecting…'), 'the codes were accepted before the network failed');
  assert(!host.connected && !guest.connected); for (const p of [host, guest]) { const lines = said(p); assert.equal(lines.at(-1), NETWORK_FAILURE, `network failure reported: ${lines.at(-1)}`); assert(!lines.filter(l => l !== NETWORK_FAILURE).some(l => /wrong|not a |incomplete|changed on the way/i.test(l)), 'the code is not blamed'); assert(p.log.includes('CLOSED')); }
  assert.match(NETWORK_FAILURE, /codes were right.*could not reach each other.*no relay server.*hotspot/); host.close(); guest.close(); net.blocked = false;
  // No answer from the network at all (neither connects nor fails): the watchdog reports it after connectTimeout.
  const h = squad(), g = squad(), o = await h.host(), a = await g.submit(o, 'join'); net.peers.delete(g.pc.id); await h.submit(a, 'accept'); assert(!h.log.some(l => /could not reach/.test(String(l)))); await tick(90); assert.match(said(h).at(-1), /^The codes were right, but your two networks could not reach each other/); h.close(); g.close();
  // A side with no public address is named.
  net.noPublic = true; const g2 = squad(); net.noPublic = false; const h2 = squad(), o2 = await h2.host(); net.noPublic = true; const a2 = await g2.submit(o2, 'join'); net.noPublic = false; net.blocked = true; await h2.submit(a2, 'accept'); await tick(5); net.blocked = false;
  assert.match(said(h2).at(-1), /Your teammate’s network did not reveal a public address/); assert.match(said(g2).at(-1), /This network did not reveal a public address/); h2.close(); g2.close();
  assert.equal(new PeerSquad({status() {}}).connectTimeout, 30000, '30 s in the game');
});

await check('the game\'s own buttons: the code box is emptied while a new code is prepared, so COPY CODE can never copy a code from an earlier attempt; COPY CODE says what it copied and how long it is; JOIN and ACCEPT both take either code; a failure shows its own message and leaves the pending host code alone; the paste box is cleared after a code is taken', async () => {
  let copied = null; try { Object.defineProperty(globalThis.navigator, 'clipboard', {value: {writeText: async t => { copied = t; }}, configurable: true}); } catch { globalThis.navigator = {clipboard: {writeText: async t => { copied = t; }}}; }
  const H = await createGame(), G = await createGame(); for (const x of [H, G]) { x.el('outgoing').select = () => {}; x.el('outgoing').value = ''; x.el('incoming').value = ''; x.peer.connectTimeout = 60; } // the harness gives every element a default value; the real text boxes start empty
  const status = x => x.el('netstatus').textContent, click = async (x, id) => { const r = x.el(id).onclick(); await r; await tick(2); };
  await click(H, 'copycode'); assert.match(status(H), /no code to copy yet/); assert.equal(copied, null);
  await click(H, 'host'); const offer = H.el('outgoing').value; assert.match(offer, /^DUSTLINE:H:/); assert.equal(H.el('accept').hidden, false); await click(H, 'copycode'); assert.equal(copied, offer); assert.equal(status(H), `Host code copied (${offer.length} characters). Send all of it to your teammate.`);
  G.el('incoming').value = MANGLE['wrapped at 76 columns with line breaks'](offer); await click(G, 'join'); const answer = G.el('outgoing').value; assert.match(answer, /^DUSTLINE:A:/); assert.equal(G.el('incoming').value, '', 'paste box cleared'); await click(G, 'copycode'); assert.equal(copied, answer); assert.match(status(G), /^Answer code copied/);
  // The reported failure, step by step: the host pastes the answer and presses JOIN WITH CODE. It now connects.
  H.el('incoming').value = MANGLE['spaces every 40 characters, spaces and a newline around it'](answer); await click(H, 'join'); await tick(5); assert.equal(status(H), 'Connected. Host can deploy the squad.'); assert.equal(status(G), 'Connected. Host can deploy the squad.'); assert(H.peer.connected && G.peer.connected); assert.equal(H.el('outgoing').value, offer, 'the host code stays in its box');
  // The other way it happened: after an attempt the old answer sat in the box while a new host code was prepared.
  const slow = G.peer.gathered; let release; G.peer.gathered = () => new Promise(r => { release = r; }); const pending = G.el('host').onclick(); await tick(2); assert.equal(G.el('outgoing').value, '', 'no stale answer in the box while preparing'); copied = null; await click(G, 'copycode'); assert.equal(copied, null); assert.match(status(G), /still being prepared/); release(); await pending; G.peer.gathered = slow; assert.match(G.el('outgoing').value, /^DUSTLINE:H:/);
  // Failures through the buttons: specific text, state untouched.
  const before = G.peer.pc; for (const [text, pattern] of [['', /box is empty/], ['https://alex-wilson141.github.io/Dustline/', /web address/], [offer.slice(0, 700), /incomplete: \d+ of \d+/], [answer, /made for an earlier host code|no host code waiting/], [G.el('outgoing').value, /your own code/]]) { G.el('incoming').value = text; await click(G, 'accept'); assert.match(status(G), pattern); assert.equal(G.peer.pc, before); assert.equal(G.el('incoming').value, text, 'a rejected paste stays for correction'); }
  const html = fs.readFileSync(new URL('dist/index.html', projectRoot), 'utf8'), src = fs.readFileSync(new URL('dist/game.js', projectRoot), 'utf8') + fs.readFileSync(new URL('dist/network.js', projectRoot), 'utf8'); assert(!/Wrong connection code/.test(src), 'the generic message is gone'); assert(/1 · The host presses CREATE HOST CODE/.test(html)); assert.match(html, /BUILD 36/); assert(/import '\.\/build\.js'/.test(fs.readFileSync(new URL('dist/network.js', projectRoot), 'utf8')));
  H.peer.close(); G.peer.close();
});

console.log(JSON.stringify({passed: results.length, checks: results, report, limitations: [
  'The browser\'s RTCPeerConnection is replaced by a stand-in: no real WebRTC, STUN, NAT or second network is exercised here. Whether two particular networks can connect can only be found out by two players trying.',
  'Real chat apps were not used; the manglings are the ones they are known to apply (wrapping, spaces, quotes, invisible characters, truncation).']}, null, 2));
