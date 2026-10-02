// Build 37 (T47): squad codes. The signalling service's rule (service/src/lobby.js, exactly the file that is deployed) and
// the game's use of it: a code is issued, redeemed once and then refused; codes expire; a code never collides with a live
// one; two pages connect by a code, host and joiner both, with nothing left in the service afterwards; the manual
// connection appears when the service cannot be reached and not otherwise; a build mismatch is refused in plain words and
// does not use the code up; a host who reloads, an uninvited joiner, a joiner who never finishes and a service that goes
// away mid-wait each do what the roadmap says; with no service the game is what it was.
// Headless: the real PeerSquad, the real game pages and buttons, the real service rule; the browser's RTCPeerConnection,
// fetch and Cloudflare's storage are stand-ins. Nothing here shows that the deployed Worker answers, or that two networks connect.
import assert from 'node:assert/strict';
import fs from 'node:fs';
globalThis.location = {search: ''};
import {createGame, projectRoot} from './sprint-harness.mjs';

const {PeerSquad, makeCode} = await import(new URL('dist/network.js', projectRoot));
const Q = await import(new URL('dist/squad.js', projectRoot));
const L = await import(new URL('service/src/lobby.js', projectRoot));
const {SQUAD, SquadService, SquadError, readSquadCode, SERVICE_FAULTS} = Q;
const ONLY = process.env.DUSTLINE_T47_ONLY?.split(',');
const results = [], report = {};
async function check(tag, name, fn) { if (ONLY && !ONLY.includes(tag)) return; await fn(); results.push(name); }
const tick = (ms = 0) => new Promise(r => setTimeout(r, ms));
const until = async (f, ms = 1500) => { const t = Date.now(); while (!f()) { if (Date.now() - t > ms) return false; await tick(3); } return true; };
const rejects = async (promise, reason, pattern) => { let e = null; try { await promise; } catch (x) { e = x; } assert(e instanceof Error, `expected a refusal (${reason})`); assert.equal(e.reason, reason, e.message); if (pattern) assert.match(e.message, pattern); return e; };

// ---- Stand-ins. Peer connections: two connect when each holds the other's description (as in the handshake suite).
const net = {peers: new Map(), n: 0};
class FakeChannel { constructor() { this.readyState = 'connecting'; this.bufferedAmount = 0; } send(m) { this.other?.onmessage?.({data: m}); } close() { this.readyState = 'closed'; } open() { this.readyState = 'open'; this.onopen?.(); } }
class FakePC {
  constructor() { this.id = 'u' + (++net.n); this.signalingState = 'stable'; this.iceGatheringState = 'new'; this.connectionState = 'new'; this.listeners = new Map(); net.peers.set(this.id, this); }
  sdp(setup) { return `v=0\r\no=- ${1e15 + net.n} 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=application 34033 UDP/DTLS/SCTP webrtc-datachannel\r\nc=IN IP4 203.0.113.9\r\na=candidate:2 1 udp 1677729535 203.0.113.9 34033 typ srflx raddr 0.0.0.0 rport 0 generation 0\r\na=ice-ufrag:${this.id}\r\na=setup:${setup}\r\na=mid:0\r\n`; }
  createDataChannel() { return this.channel = new FakeChannel(); }
  async createOffer() { return {type: 'offer', sdp: this.sdp('actpass')}; }
  async createAnswer() { assert.equal(this.signalingState, 'have-remote-offer'); return {type: 'answer', sdp: this.sdp('active')}; }
  async setLocalDescription(d) { this.localDescription = d; this.signalingState = d.type === 'offer' ? 'have-local-offer' : 'stable'; this.iceGatheringState = 'complete'; for (const f of this.listeners.get('icegatheringstatechange') || []) f(); if (d.type === 'answer') this.tryConnect(); }
  async setRemoteDescription(d) { if (typeof d.sdp !== 'string' || !d.sdp.startsWith('v=0')) throw new Error('bad sdp'); if (d.type === 'answer' && this.signalingState !== 'have-local-offer') throw new Error('no offer pending'); this.remoteDescription = d; this.signalingState = d.type === 'offer' ? 'have-remote-offer' : 'stable'; if (d.type === 'answer') this.tryConnect(); }
  remoteId() { return this.remoteDescription?.sdp.match(/a=ice-ufrag:(\S+)/)?.[1]; }
  tryConnect() { const other = net.peers.get(this.remoteId()); if (!other || other.remoteId() !== this.id || !this.localDescription || !other.localDescription || this.closed || other.closed) return;
    const [host, guest] = this.localDescription.type === 'offer' ? [this, other] : [other, this]; if (host.signalingState !== 'stable' || host.connectionState !== 'new') return;
    for (const p of [host, guest]) { p.connectionState = 'connecting'; p.onconnectionstatechange?.(); }
    queueMicrotask(() => { const g = new FakeChannel(); g.other = host.channel; host.channel.other = g; for (const p of [host, guest]) { p.connectionState = 'connected'; p.onconnectionstatechange?.(); } guest.ondatachannel?.({channel: g}); host.channel.open(); g.open(); }); }
  addEventListener(e, f) { if (!this.listeners.has(e)) this.listeners.set(e, []); this.listeners.get(e).push(f); } removeEventListener(e, f) { this.listeners.set(e, (this.listeners.get(e) || []).filter(x => x !== f)); }
  close() { this.closed = true; this.connectionState = 'closed'; }
}
globalThis.RTCPeerConnection = FakePC;
// Cloudflare's storage: values are copied in and out, as stored ones are.
function fakeStore() { const m = new Map(); return {m, alarms: [], async get(k) { return m.has(k) ? structuredClone(m.get(k)) : undefined; }, async put(k, v) { m.set(k, structuredClone(v)); }, async delete(k) { return m.delete(k); }, async list({prefix = ''} = {}) { return new Map([...m].filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k, structuredClone(v)])); }, async setAlarm(t) { this.alarms.push(t); }}; }
// The service as the game reaches it: fetch -> the rule. `mode`: 'up', 'down' (no answer), 'html' (a proxy's page), 'error' (500).
function service({random} = {}) { const store = fakeStore(), clock = {t: 1.7e12}, lobby = L.makeLobby({store, now: () => clock.t, ...(random ? {random} : {})}), S = {store, clock, lobby, mode: 'up', calls: [], URL: 'https://squad.test'};
  S.fetch = async (url, init = {}) => { const u = new URL(url); S.calls.push({path: u.pathname, search: u.search, method: init.method, body: init.body, type: init.headers?.['Content-Type'], credentials: init.credentials});
    if (S.mode === 'down') throw new TypeError('Load failed'); if (S.mode === 'html') return {ok: true, status: 200, json: async () => { throw new SyntaxError('not json'); }}; if (S.mode === 'error') return {ok: false, status: 500, json: async () => ({message: 'Internal error'})};
    const r = await lobby.handle(init.method || 'GET', u.pathname, init.body); return {ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => structuredClone(r.body)}; };
  S.client = (build = 'b37') => new SquadService({url: S.URL, fetch: S.fetch, build}); S.post = (path, body) => lobby.handle('POST', path, JSON.stringify(body)); return S; }
const OFFER = 'v=0\r\no=- 1 2 IN IP4 127.0.0.1\r\nc=IN IP4 198.51.100.7\r\na=ice-ufrag:host\r\n', ANSWER = 'v=0\r\no=- 3 4 IN IP4 127.0.0.1\r\nc=IN IP4 203.0.113.50\r\na=ice-ufrag:guest\r\n';
const squad = () => { const log = []; const p = new PeerSquad({status: t => log.push(t), onReady: r => log.push('READY ' + r), onMessage: m => log.push(m), onClose: () => log.push('CLOSED'), onSquad: w => log.push('SQUAD ' + w)}); p.log = log; p.connectTimeout = 60; return p; };
const last = p => p.log.filter(l => typeof l === 'string' && !/^(READY |CLOSED$|SQUAD )/.test(l)).at(-1);
SQUAD.pollEvery = 4; SQUAD.timeout = 300;

await check('issue', 'a code is issued, redeemed once and then refused: four characters from an alphabet without 0, 1, I, L and O; the one who enters it is given the host\'s description and nobody after them is; only the holder of the join ticket may leave an answer, once; only the holder of the host key may ask for it or cancel; the answer is handed over once and the record goes with it', async () => {
  const S = service(); assert.equal(L.ALPHABET, SQUAD.alphabet); assert.equal(L.LENGTH, 4); assert.equal(SQUAD.length, 4); assert(!/[01ILO]/.test(L.ALPHABET) && L.ALPHABET.length === 31 && new Set(L.ALPHABET).size === 31);
  const made = await S.post('/create', {offer: OFFER, build: 'b37'}); assert.equal(made.status, 200); const {code, key} = made.body; assert(L.validCode(code), code); assert(typeof key === 'string' && key.length === 32);
  assert.equal((await S.post('/poll', {code, key})).body.state, 'waiting'); assert.equal((await S.post('/poll', {code, key: 'x'.repeat(32)})).status, 403); assert.equal((await S.post('/cancel', {code, key: 'nope'})).status, 200); assert.equal(S.store.m.size, 1, 'a stranger cancelled the code');
  assert.equal((await S.post('/answer', {code, ticket: 'guess', answer: ANSWER})).status, 403, 'an answer before anyone joined');
  const joined = await S.post('/join', {code: code.toLowerCase(), build: 'b37'}); assert.equal(joined.status, 200); assert.equal(joined.body.offer, OFFER); assert.equal(joined.body.key, undefined, 'the host key is the host\'s alone');
  const again = await S.post('/join', {code, build: 'b37'}); assert.equal(again.status, 410); assert.equal(again.body.error, 'used'); assert.equal(again.body.offer, undefined, 'the description is given out once');
  assert.equal((await S.post('/poll', {code, key})).body.state, 'joining'); assert.equal((await S.post('/answer', {code, ticket: 'guess', answer: ANSWER})).status, 403); assert.equal((await S.post('/answer', {code, ticket: joined.body.ticket, answer: 'not a description'})).status, 400);
  assert.equal((await S.post('/answer', {code, ticket: joined.body.ticket, answer: ANSWER})).status, 200); assert.equal((await S.post('/answer', {code, ticket: joined.body.ticket, answer: ANSWER})).status, 410);
  const got = await S.post('/poll', {code, key}); assert.equal(got.body.state, 'answer'); assert.equal(got.body.answer, ANSWER); assert.equal(S.store.m.size, 0, 'the record is deleted when the answer is collected');
  assert.equal((await S.post('/poll', {code, key})).status, 404); assert.equal((await S.post('/join', {code, build: 'b37'})).body.error, 'unknown');
  // What it will not take.
  for (const [path, body, status] of [['/create', {offer: 'hello', build: 'b37'}, 400], ['/create', {offer: 'v=0' + 'x'.repeat(L.MAX_SDP), build: 'b37'}, 400], ['/create', {offer: OFFER}, 400], ['/join', {code: 'AB1D', build: 'b37'}, 400], ['/join', {code: 'ABCDE', build: 'b37'}, 400], ['/nothing', {}, 404]]) assert.equal((await S.post(path, body)).status, status, path + JSON.stringify(body).slice(0, 40));
  assert.equal((await S.lobby.handle('GET', '/create', '')).status, 405); assert.equal((await S.lobby.handle('POST', '/create', 'not json')).status, 400); assert.deepEqual((await S.lobby.handle('GET', '/health', '')).body, {ok: true, service: 'dustline-squad', protocol: 1});
  // The game's side of a code: what is typed is cleaned, and what cannot be a code is said before anything is sent.
  assert.deepEqual(readSquadCode(' k7 m-q '), {ok: true, code: 'K7MQ'}); for (const [text, reason] of [['', 'empty'], ['K7M', 'length'], ['K7MQX', 'length'], ['K0MQ', 'letters'], ['KIMQ', 'letters'], [makeCode({type: 'offer', sdp: OFFER}), 'long-code']]) assert.equal(readSquadCode(text).reason, reason, text.slice(0, 12));
  report.issue = {alphabet: L.ALPHABET, codes: 31 ** 4};
});

await check('expire', 'codes expire and nothing outlives its time: a code is good for ten minutes and not a second longer, whether or not it was joined; an expired record is deleted the moment it is asked for and by the service\'s own sweep a minute later with nobody asking; a host whose page has stopped asking is refused to a joiner after 12 s and its record deleted after a minute; what is stored is the two descriptions, the build, two keys and three times, and nothing about who called', async () => {
  const S = service(); assert.equal(L.LIFE, 600e3); const a = (await S.post('/create', {offer: OFFER, build: 'b37'})).body; const keep = async ms => { for (let t = 0; t < ms; t += 5000) { S.clock.t += 5000; await S.post('/poll', {code: a.code, key: a.key}); } };
  await keep(595e3); assert.equal((await S.post('/poll', {code: a.code, key: a.key})).status, 200, 'alive at 9 min 55 s'); S.clock.t += 5001; assert.equal((await S.post('/poll', {code: a.code, key: a.key})).status, 404, 'gone at ten minutes'); assert.equal(S.store.m.size, 0, 'and deleted');
  assert.equal((await S.post('/join', {code: a.code, build: 'b37'})).body.error, 'unknown');
  // Joined and answered but never collected: gone at ten minutes all the same, by the sweep alone.
  const b = (await S.post('/create', {offer: OFFER, build: 'b37'})).body, j = (await S.post('/join', {code: b.code, build: 'b37'})).body; await S.post('/answer', {code: b.code, ticket: j.ticket, answer: ANSWER});
  const rec = [...S.store.m.values()][0]; assert.deepEqual(Object.keys(rec).sort(), ['answer', 'asked', 'build', 'joined', 'key', 'made', 'offer', 'ticket']); assert([...S.store.m.keys()].every(k => k === 'c:' + b.code)); assert(S.store.alarms.length >= 1, 'an alarm is set when a code is issued');
  S.clock.t += 61e3; await S.lobby.alarm(); assert.equal(S.store.m.size, 0, 'a host that stopped asking for a minute: deleted by the sweep');
  const c = (await S.post('/create', {offer: OFFER, build: 'b37'})).body; S.clock.t += 12001; const gone = await S.post('/join', {code: c.code, build: 'b37'}); assert.equal(gone.status, 410); assert.equal(gone.body.error, 'host-gone'); assert.equal(gone.body.offer, undefined); assert.equal(S.store.m.size, 0);
  const d = (await S.post('/create', {offer: OFFER, build: 'b37'})).body; S.clock.t += 11e3; assert.equal((await S.post('/join', {code: d.code, build: 'b37'})).status, 200, 'eleven seconds of silence is still a host');
  const alarmsBefore = S.store.alarms.length; S.clock.t += L.LIFE; await S.lobby.alarm(); assert.equal(S.store.m.size, 0); await S.lobby.alarm(); assert.equal(S.store.alarms.length, alarmsBefore, 'with nothing stored no alarm is set again');
  // Nothing is logged and nothing else is written: the rule has no console call and is never given the caller's address.
  const rule = fs.readFileSync(new URL('service/src/lobby.js', projectRoot), 'utf8'), worker = fs.readFileSync(new URL('service/src/worker.js', projectRoot), 'utf8'), toml = fs.readFileSync(new URL('service/wrangler.toml', projectRoot), 'utf8');
  for (const [name, text] of [['lobby.js', rule], ['worker.js', worker]]) { assert(!/console\s*\./.test(text), `${name} logs`); assert(!/CF-Connecting-IP|x-forwarded-for|request\.cf\b/i.test(text), `${name} reads the caller's address`); }
  assert.match(toml, /\[observability\]\s*\nenabled = false/); assert.match(toml, /new_sqlite_classes = \["SquadLobby"\]/); assert.match(worker, /lobby\.handle\(request\.method, url\.pathname, /, 'the rule is given the method, the path and the body, nothing else');
  report.expire = {life: '10 min', hostRefusedAfter: '12 s of silence', hostDeletedAfter: '60 s of silence', stored: Object.keys(rec).sort()};
});

await check('collide', 'a code is never issued while a live one holds it: with the dice loaded to roll the same code again the second squad gets another, and the first is untouched; the same code is issued again once the first has expired; no letter is likelier than another; two thousand live codes are all different and valid, and the next squad is refused as busy until one is free', async () => {
  let rolls = []; const loaded = n => { const next = rolls.shift(); return next && next.length === n ? Uint8Array.from(next) : crypto.getRandomValues(new Uint8Array(n)); }, S = service({random: loaded});
  const same = [0, 1, 2, 3, 4, 5, 6, 7], other = [8, 9, 10, 11, 12, 13, 14, 15], want = [...same.slice(0, 4)].map(b => L.ALPHABET[b]).join('');
  rolls = [same, null]; const a = (await S.post('/create', {offer: OFFER, build: 'b37'})).body; assert.equal(a.code, want);
  rolls = [same, same, other, null]; const b = (await S.post('/create', {offer: OFFER + 'a=second\r\n', build: 'b37'})).body; assert.notEqual(b.code, a.code, 'a live code issued twice'); assert.equal(b.code, [...other.slice(0, 4)].map(x => L.ALPHABET[x]).join(''));
  assert.equal((await S.post('/join', {code: a.code, build: 'b37'})).body.offer, OFFER, 'the first squad is still its own'); assert.equal(S.store.m.size, 2);
  S.clock.t += L.LIFE; rolls = [same, null]; const c = (await S.post('/create', {offer: OFFER, build: 'b37'})).body; assert.equal(c.code, want, 'free again after it expired');
  // Bytes that would favour some letters are thrown away (248 and over), so every letter is as likely as another.
  { let dice = [[250, 255, 0, 249, 1, 248, 2, 3]]; const S4 = service({random: n => { const d = dice.shift(); return d && d.length === n ? Uint8Array.from(d) : crypto.getRandomValues(new Uint8Array(n)); }}); assert.equal((await S4.post('/create', {offer: OFFER, build: 'b37'})).body.code, want); assert.equal(248 % L.ALPHABET.length, 0); }
  const S5 = service(), seen = new Set(); for (let i = 0; i < L.MOST; i++) { const r = await S5.post('/create', {offer: OFFER, build: 'b37'}); assert.equal(r.status, 200, `squad ${i}`); assert(L.validCode(r.body.code)); assert(!seen.has(r.body.code), `${r.body.code} issued twice`); seen.add(r.body.code); if (i % 50 === 0) { S5.clock.t += 1; } }
  const full = await S5.post('/create', {offer: OFFER, build: 'b37'}); assert.equal(full.status, 503); assert.equal(full.body.error, 'busy'); await rejects(S5.client().create(OFFER), 'busy', /busy/); assert(SERVICE_FAULTS.includes('busy'));
  S5.clock.t += L.LIFE; assert.equal((await S5.post('/create', {offer: OFFER, build: 'b37'})).status, 200); assert.equal(S5.store.m.size, 1, 'the expired ones were swept before the new one was issued');
  report.collide = {live: seen.size, distinct: seen.size};
});

// Two game pages against one service. `SQUAD.url` set: the pages take the service for configured.
async function pages(S, {builds = ['b37', 'b37']} = {}) { SQUAD.url = S ? S.URL : '';   // the harness has a fetch of its own for assets: the pages' service is given the stand-in directly
  const H = await createGame(), G = await createGame(); [H, G].forEach((x, i) => { x.el('outgoing').select = () => {}; for (const id of ['outgoing', 'incoming', 'squad-entry']) x.el(id).value = ''; x.peer.connectTimeout = 60; x.squadService.build = builds[i]; x.squadService.fetchWith = S ? (...a) => S.fetch(...a) : async () => { throw new Error('a request with no service set'); }; });
  return {H, G, status: x => x.el('netstatus').textContent, click: async (x, id) => { const r = x.el(id).onclick({preventDefault() {}}); await r; await tick(2); }}; }

await check('connect', 'two players connect by a code, host and joiner both: the host\'s page shows a 4-character code, the joiner types it (in lower case, with a space) and both pages are connected within the next poll, a message crosses each way and the host can deploy; the manual connection is never offered and the long-code boxes stay empty; the service holds nothing afterwards and is asked nothing more; what the pages sent was their description, their build and the code, as plain text, with no address in the URL and no cookies', async () => {
  const S = service(), {H, G, status, click} = await pages(S); assert.equal(H.el('manual-row').hidden, true, 'the manual link with the service set'); assert.equal(H.el('manual').hidden, true);
  await click(H, 'squad-create'); const code = H.peer.squad?.code; assert(L.validCode(code), `the host has a code (${status(H)})`); assert.equal(H.el('squad-code').hidden, false); assert(H.el('squad-code').innerHTML.startsWith(code)); assert.match(status(H), new RegExp(`Squad code ${code}\\.`)); assert.equal(S.store.m.size, 1);
  G.el('squad-entry').value = ` ${code.slice(0, 2).toLowerCase()} ${code.slice(2).toLowerCase()}`; await click(G, 'squad-join'); assert(await until(() => H.peer.connected && G.peer.connected), `connected (${status(H)} / ${status(G)})`);
  assert.equal(status(H), 'Connected. Host can deploy the squad.'); assert.equal(status(G), 'Connected. Host can deploy the squad.'); assert.equal(H.peer.role, 'host'); assert.equal(G.peer.role, 'guest'); assert.equal(H.el('squad-code').hidden, true, 'the code is put away once connected'); assert.equal(G.el('squad-entry').value, '');
  for (const x of [H, G]) { assert.equal(x.el('manual-row').hidden, true, 'the manual connection was offered though the service worked'); assert.equal(x.el('outgoing').value, '', 'a long code was made'); }
  assert.equal(S.store.m.size, 0, 'the service still holds a description'); assert.equal(H.peer.squad, null); const n = S.calls.length; await tick(40); assert.equal(S.calls.length, n, 'the service is asked nothing once connected');
  const paths = S.calls.map(c => c.path); assert.deepEqual([...new Set(paths)].sort(), ['/answer', '/create', '/join', '/poll']); for (const c of S.calls) { assert.equal(c.search, '', 'something in the URL'); assert.equal(c.method, 'POST'); assert.equal(c.type, 'text/plain'); assert.equal(c.credentials, 'omit'); const b = JSON.parse(c.body); assert(Object.keys(b).every(k => ({'/create': ['offer', 'build'], '/join': ['code', 'build'], '/answer': ['code', 'ticket', 'answer'], '/poll': ['code', 'key']})[c.path].includes(k)), `${c.path} sent ${Object.keys(b)}`); }
  // The session is the usual one: the host deploys and the guest follows.
  // The same through the class alone, the joiner's code path and the host's told apart.
  const S2 = service(), h = squad(), g = squad(), codeB = await h.hostSquad(S2.client()); assert.equal(await g.joinSquad(S2.client(), codeB), codeB); assert(await until(() => h.connected && g.connected)); assert(h.log.includes('READY host') && g.log.includes('READY guest'));
  assert.equal(h.send({type: 't', n: 1}), true); assert.equal(g.send({type: 't', n: 2}), true); assert.deepEqual(g.log.at(-1), {type: 't', n: 1}); assert.deepEqual(h.log.at(-1), {type: 't', n: 2}); assert.equal(S2.store.m.size, 0);
  report.connect = {calls: paths.length, polls: paths.filter(p => p === '/poll').length};
});

await check('fallback', 'the manual connection appears when the service cannot be reached and not otherwise: with the service down, answering with a proxy\'s page, answering with an error or timing out, CREATE SQUAD and JOIN SQUAD each say that the service cannot be reached, show no code, connect nothing, and bring up the manual connection link; with the service up, a mistyped code, an unknown code, a used code and a build mismatch each say what is wrong and do not bring it up; the link opens the long-code boxes, and the long codes then connect the same two pages with the service still down', async () => {
  for (const mode of ['down', 'html', 'error', 'slow']) { const S = service(), {H, G, status, click} = await pages(S); S.mode = mode === 'slow' ? 'up' : mode; if (mode === 'slow') S.fetch = (u, init) => new Promise((ok, no) => init.signal?.addEventListener('abort', () => no(new Error('aborted'))));   /* never answers: the page gives up after SQUAD.timeout */
    assert.equal(H.el('manual-row').hidden, true); await click(H, 'squad-create'); if (mode === 'slow') await tick(SQUAD.timeout + 30); assert.match(status(H), /squad service cannot be reached/, `${mode}: ${status(H)}`); assert.equal(H.el('manual-row').hidden, false, `${mode}: no manual connection offered to the host`); assert.equal(H.el('manual').hidden, true, 'behind the link'); assert.equal(H.el('squad-code').hidden, true); assert.equal(H.peer.squad, null); assert(!H.peer.connected);
    G.el('squad-entry').value = 'K7MQ'; await click(G, 'squad-join'); if (mode === 'slow') await tick(SQUAD.timeout + 30); assert.match(status(G), /squad service cannot be reached/, `${mode}: ${status(G)}`); assert.equal(G.el('manual-row').hidden, false, `${mode}: no manual connection offered to the joiner`); assert(!G.peer.connected);
    if (mode !== 'down') continue;
    // Behind the link: the long codes of Build 15, unchanged, with the service still down.
    await click(H, 'manual-link'); assert.equal(H.el('manual').hidden, false); await click(G, 'manual-link'); const calls = S.calls.length;
    await click(H, 'host'); const offer = H.el('outgoing').value; assert.match(offer, /^DUSTLINE:H:/); G.el('incoming').value = offer; await click(G, 'join'); const answer = G.el('outgoing').value; assert.match(answer, /^DUSTLINE:A:/); H.el('incoming').value = answer; await click(H, 'accept'); assert(await until(() => H.peer.connected && G.peer.connected), 'the long codes connect'); assert.equal(S.calls.length, calls, 'the long codes asked the service'); }
  const S = service(), {H, G, status, click} = await pages(S, {builds: ['b37', 'b36']}); await click(H, 'squad-create'); const code = H.peer.squad.code, wrong = [...L.ALPHABET].find(c => c !== code[0]) + code.slice(1);
  for (const [typed, pattern] of [['', /Type the 4-character squad code/], ['K7M', /4 characters; that has 3/], ['K0MQ', /never contain 0, 1, I, L or O/], [wrong, /No squad is waiting under that code/], [code, /different builds/]]) { G.el('squad-entry').value = typed; await click(G, 'squad-join'); assert.match(status(G), pattern, `"${typed}": ${status(G)}`); assert.equal(G.el('manual-row').hidden, true, `"${typed}" brought up the manual connection`); assert(!G.peer.connected); }
  G.squadService.build = 'b37'; G.el('squad-entry').value = code; await click(G, 'squad-join'); assert(await until(() => H.peer.connected && G.peer.connected)); const X = (await pages(S)).G; X.el('squad-entry').value = code; await X.el('squad-join').onclick(); await tick(3); assert.match(X.el('netstatus').textContent, /No squad is waiting|already been used/); assert.equal(X.el('manual-row').hidden, true);
  assert.deepEqual(SERVICE_FAULTS, ['unreachable', 'unset', 'busy', 'refused']);
  report.fallback = {offeredWhen: SERVICE_FAULTS, notFor: ['a mistyped code', 'an unknown code', 'a used code', 'a build mismatch']};
});

await check('mismatch', 'a build mismatch is refused in plain words and costs nothing: a joiner on another build is told that the two are on different builds and that both should reload, is given no description, and the code is not used up: the same player on the right build then joins with it; the game sends the build its page was stamped with', async () => {
  const S = service(), h = squad(), old = squad(), code = await h.hostSquad(S.client('aaaa1111'));
  const e = await rejects(old.joinSquad(S.client('bbbb2222'), code), 'build', /different builds of the game\. Both of you reload the page/); assert.equal(e.hostBuild, 'aaaa1111'); assert.equal(old.pc, null, 'a connection was begun'); assert.equal((await S.post('/poll', {code, key: h.squad.key})).body.state, 'waiting', 'the code was used up by the mismatch');
  const raw = await S.post('/join', {code, build: 'bbbb2222'}); assert.equal(raw.status, 409); assert.equal(raw.body.offer, undefined, 'a description was handed to another build');
  const now = squad(); await now.joinSquad(S.client('aaaa1111'), code); assert(await until(() => h.connected && now.connected), 'the right build joins with the same code');
  const html = fs.readFileSync(new URL('dist/index.html', projectRoot), 'utf8'), stamp = /name="dustline-build" content="([0-9a-f]+)"/.exec(html)?.[1]; assert(stamp, 'the page carries its build'); const doc = globalThis.document, q = doc.querySelector; doc.querySelector = s => s === 'meta[name="dustline-build"]' ? {content: stamp} : null; assert.equal(Q.pageBuild(), stamp); assert.equal(new SquadService().build, stamp); doc.querySelector = q;
  report.mismatch = {refusedWith: e.message};
});

await check('cases', 'the four cases: a host who reloads while waiting takes the code back as the page goes (a joiner is told nobody is waiting under it) and, if that word is lost, is refused to a joiner twelve seconds later; an uninvited joiner who enters a live code is connected, the invited one is then told the code was used, and the host disconnects and gets another code; a joiner whose page never finishes costs the host the code and the host is told; a service that goes away mid-wait is said and the manual connection offered, and one that misses a single answer loses nothing', async () => {
  // A reload.
  { const S = service(), {H, G, status, click} = await pages(S); await click(H, 'squad-create'); const code = H.peer.squad.code; H.fireWin('pagehide'); await tick(5); assert.equal(S.store.m.size, 0, 'the code was not taken back'); assert.equal(S.calls.at(-1).path, '/cancel');
    G.el('squad-entry').value = code; await click(G, 'squad-join'); assert.match(status(G), /No squad is waiting under that code.*the host reloaded/); assert.equal(G.el('manual-row').hidden, true); }
  { const S = service(), h = squad(), g = squad(), code = await h.hostSquad(S.client()); clearTimeout(h.squadTimer); h.squad = null;   /* the page is gone and its last word was lost */ S.clock.t += 12001; await rejects(g.joinSquad(S.client(), code), 'host-gone', /no longer waiting on that code/); assert.equal(S.store.m.size, 0);
    const again = await h.hostSquad(S.client()); assert.notEqual(again, null); assert(L.validCode(again), 'the reloaded host creates a new code'); h.close(); await tick(5); assert.equal(S.store.m.size, 0, 'closing takes the code back'); }
  // An uninvited joiner.
  { const S = service(), h = squad(), stranger = squad(), friend = squad(), code = await h.hostSquad(S.client()); await stranger.joinSquad(S.client(), code); assert(await until(() => h.connected && stranger.connected)); assert.match(last(h), /Connected/);
    await rejects(friend.joinSquad(S.client(), code), 'unknown', /No squad is waiting/); const S3 = service(), h3 = squad(), c3 = await h3.hostSquad(S3.client()), s3 = S3.client(), j = await s3.join(c3); await rejects(squad().joinSquad(S3.client(), c3), 'used', /already been used: a code works once.*DISCONNECT/); h3.close();
    h.close(true); assert(!h.connected); const next = await h.hostSquad(S.client()); assert.notEqual(next, code); await friend.joinSquad(S.client(), next); assert(await until(() => h.connected && friend.connected), 'the host and the invited player connect by the new code'); }
  // A joiner who never finishes.
  { const S = service(), h = squad(), code = await h.hostSquad(S.client()), was = SQUAD.joinWait; SQUAD.joinWait = 30; await S.client().join(code); assert(await until(() => h.log.includes('SQUAD joining'))); assert.match(last(h), /Someone entered your code/); assert(await until(() => h.log.includes('SQUAD failed'))); assert.match(last(h), /never finished joining, and a code works once\. Press CREATE SQUAD/); await tick(5); assert.equal(S.store.m.size, 0); assert.equal(h.squad, null); SQUAD.joinWait = was; }
  // The service goes away while the host waits.
  { const S = service(), {H, status, click} = await pages(S); await click(H, 'squad-create'); const code = H.peer.squad.code; const n0 = S.calls.length; S.mode = 'down'; await until(() => S.calls.length >= n0 + 2); S.mode = 'up'; assert(SQUAD.lost > 2); assert.equal(H.peer.squad?.code, code, 'two missed answers lose nothing'); await tick(30); assert.equal(H.peer.squad?.code, code); assert.equal(H.el('manual-row').hidden, true);
    S.mode = 'down'; assert(await until(() => !H.peer.squad, 3000)); assert.match(status(H), /squad service stopped answering.*manual connection/); assert.equal(H.el('manual-row').hidden, false); assert.equal(H.el('squad-code').hidden, true); H.fireWin('pagehide'); }
  report.cases = {hostReload: 'the code is cancelled as the page goes; refused after 12 s otherwise', uninvited: 'connected; the invited player is told the code was used; DISCONNECT and a new code', joinerNeverFinishes: 'the host is told after 40 s', serviceLost: `after ${SQUAD.lost} unanswered polls`};
});

await check('unchanged', 'with no service the game is what it was: a page with no service address offers the manual connection from the start and says why, CREATE SQUAD and JOIN SQUAD say the same and send nothing anywhere, and the long codes connect two pages, deploy a mission from the host and bring the guest into it exactly as before', async () => {
  let fetched = 0; const {H, G, status, click} = await pages(null); for (const x of [H, G]) x.squadService.fetchWith = async () => { fetched++; throw new Error('no'); };
  for (const x of [H, G]) { assert.equal(x.squadService.configured(), false); assert.equal(x.el('manual-row').hidden, false, 'no manual connection on a copy with no service'); assert.match(status(x), /Squad codes are not set up on this copy of the game\. Use the manual connection below\./); }
  await click(H, 'squad-create'); assert.match(status(H), /not set up on this copy/); assert.equal(H.el('squad-code').hidden, true); G.el('squad-entry').value = 'K7MQ'; await click(G, 'squad-join'); assert.match(status(G), /not set up on this copy/); assert.equal(fetched, 0, 'a request was sent with no service set');
  await click(H, 'host'); G.el('incoming').value = H.el('outgoing').value; await click(G, 'join'); H.el('incoming').value = G.el('outgoing').value; await click(H, 'accept'); assert(await until(() => H.peer.connected && G.peer.connected)); assert.equal(status(H), 'Connected. Host can deploy the squad.'); assert.equal(fetched, 0);
  assert.equal(G.state().state, 'menu'); const wire = m => JSON.parse(JSON.stringify(m));   /* the harness keeps what a page sends: hand it across, as the open channel would */ H.peer.send = m => { G.receive(wire(m)); return true; }; G.peer.send = m => { H.receive(wire(m)); return true; }; H.receive({type: 'hello', classId: 'assault'}); G.receive({type: 'hello', classId: 'assault'}); H.setMode('coop'); H.start(); await tick(5); assert.notEqual(G.state().state, 'menu', 'the guest follows the host into the mission');
  // The address shipped in this build: none until the user has deployed the service and given it.
  const shipped = /export const SQUAD = \{url: '([^']*)'/.exec(fs.readFileSync(new URL('dist/squad.js', projectRoot), 'utf8')); assert(shipped, 'the address is where the README says'); assert(shipped[1] === '' || /^https:\/\/[a-z0-9.-]+$/.test(shipped[1]), `the address is neither empty nor an https origin: ${shipped[1]}`);
  report.unchanged = {serviceAddressShipped: shipped[1] || '(none: manual connection only until it is set)'};
});

await check('worker', 'the Worker in front of the rule lets the game\'s pages in and nobody else: a request from the published game or a local copy is answered with that origin allowed; a page on another site is refused before the rule is asked; a request with no origin may ask only for the health line; a browser\'s permission request is answered without touching the store; and a code made through it is redeemed through it (run here with a stand-in for Cloudflare\'s Durable Object base class: the deployed Worker itself is not exercised by any check)', async () => {
  const os = await import('node:os'), path = await import('node:path'), {pathToFileURL} = await import('node:url'), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dustline-worker-'));
  try { fs.copyFileSync(new URL('service/src/lobby.js', projectRoot), path.join(dir, 'lobby.js')); const src = fs.readFileSync(new URL('service/src/worker.js', projectRoot), 'utf8'), line = "import {DurableObject} from 'cloudflare:workers';"; assert(src.includes(line));
    fs.writeFileSync(path.join(dir, 'worker.mjs'), src.replace(line, 'class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }')); const W = await import(pathToFileURL(path.join(dir, 'worker.mjs')));
    const toml = fs.readFileSync(new URL('service/wrangler.toml', projectRoot), 'utf8'), origins = /ALLOWED_ORIGINS = "([^"]+)"/.exec(toml)[1], store = fakeStore(), object = new W.SquadLobby({storage: store}, {}), env = {ALLOWED_ORIGINS: origins, LOBBY: {idFromName: n => n, get: () => object}};
    const ask = (path, {origin, method = 'POST', body} = {}) => W.default.fetch(new Request('https://squad.test' + path, {method, headers: origin ? {Origin: origin, 'Content-Type': 'text/plain'} : {}, body: method === 'POST' ? JSON.stringify(body || {}) : undefined}), env);
    const GAME = 'https://alex-wilson141.github.io', LOCAL = 'http://localhost:8765';
    for (const origin of [GAME, LOCAL, 'http://127.0.0.1:8770']) { const r = await ask('/create', {origin, body: {offer: OFFER, build: 'b37'}}); assert.equal(r.status, 200, origin); assert.equal(r.headers.get('Access-Control-Allow-Origin'), origin); assert.equal(r.headers.get('Cache-Control'), 'no-store'); const made = await r.json(); assert(L.validCode(made.code));
      const j = await ask('/join', {origin, body: {code: made.code, build: 'b37'}}); assert.equal((await j.json()).offer, OFFER); }
    for (const origin of ['https://example.com', 'https://alex-wilson141.github.io.evil.test', 'http://localhost.evil.test:80', 'null']) { const before = store.m.size, r = await ask('/create', {origin, body: {offer: OFFER, build: 'b37'}}); assert.equal(r.status, 403, origin); assert.equal(r.headers.get('Access-Control-Allow-Origin'), null); assert.equal(store.m.size, before, `${origin} reached the store`); }
    assert.equal((await ask('/create', {body: {offer: OFFER, build: 'b37'}})).status, 403, 'a request with no origin made a code'); const health = await ask('/health', {method: 'GET'}); assert.equal(health.status, 200); assert.deepEqual(await health.json(), {ok: true, service: 'dustline-squad', protocol: 1});
    const pre = await ask('/create', {origin: GAME, method: 'OPTIONS'}); assert.equal(pre.status, 204); assert.equal(pre.headers.get('Access-Control-Allow-Origin'), GAME); S_alarm: { store.m.clear(); await object.alarm(); assert.equal(store.m.size, 0); }
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
  report.worker = {allowed: ['https://alex-wilson141.github.io', 'http://localhost:*', 'http://127.0.0.1:*']};
});

await check('publish', 'fast publishing keeps what it must: every suite is in exactly one group, the quick group holds the three traces (Story and Skirmish against Build 09, solo Ambush against Build 15) and every suite not named slow, so a new suite gates a publish until someone says otherwise; a group file naming a suite that does not exist, or a trace listed as slow, stops the run; the publish workflow runs the stamp check and the quick group before it deploys, and the full workflow runs every suite after a push, weekly and on request, and deploys nothing', async () => {
  const {suites} = await import(new URL('tools/run-suites.mjs', projectRoot)), groups = JSON.parse(fs.readFileSync(new URL('tests/suite-groups.json', projectRoot), 'utf8')), quick = suites('quick'), slow = suites('slow'), all = suites('all');
  const files = fs.readdirSync(new URL('tests/', projectRoot)).filter(f => /^test-.*\.mjs$/.test(f)).map(f => f.replace('.mjs', '')).sort(); assert.deepEqual(all, files); assert.deepEqual([...quick, ...slow].sort(), files); assert.equal(quick.filter(n => slow.includes(n)).length, 0);
  for (const t of ['test-ambush-b10', 'test-ambush-coop-b16']) { assert(groups.traces.includes(t) && quick.includes(t), `${t} is a trace and must gate a publish`); } assert(quick.includes('test-squad-codes-b37') && quick.includes('test-cache-deploy01') && quick.includes('test-coop-handshake'));
  assert.match(fs.readFileSync(new URL('tests/test-ambush-b10.mjs', projectRoot), 'utf8'), /build09Trace|story-skirmish-ai-b09/); assert.match(fs.readFileSync(new URL('tests/test-ambush-coop-b16.mjs', projectRoot), 'utf8'), /abb41c9/);
  // A broken group file stops the run instead of running less.
  const tmp = fs.mkdtempSync(new URL('../', new URL('tests/', projectRoot)).pathname + '.groups-'); try { fs.mkdirSync(tmp + '/tests'); for (const f of ['test-a.mjs', 'test-b.mjs']) fs.writeFileSync(`${tmp}/tests/${f}`, '');
    const put = g => fs.writeFileSync(`${tmp}/tests/suite-groups.json`, JSON.stringify(g)); put({traces: ['test-a'], slow: ['test-b']}); assert.deepEqual(suites('quick', tmp), ['test-a']); assert.deepEqual(suites('slow', tmp), ['test-b']);
    put({traces: ['test-a'], slow: ['test-gone']}); assert.throws(() => suites('quick', tmp), /do not exist: test-gone/); put({traces: ['test-a'], slow: ['test-a']}); assert.throws(() => suites('quick', tmp), /trace suite is listed as slow/); put({traces: [], slow: []}); assert.throws(() => suites('some', tmp), /unknown group/);
    fs.writeFileSync(`${tmp}/tests/test-new.mjs`, ''); assert(suites('quick', tmp).includes('test-new'), 'a new suite is quick until listed'); } finally { fs.rmSync(tmp, {recursive: true, force: true}); }
  const pages = fs.readFileSync(new URL('.github/workflows/pages.yml', projectRoot), 'utf8'), full = fs.readFileSync(new URL('.github/workflows/full.yml', projectRoot), 'utf8');
  assert.match(pages, /run: node tools\/stamp-build\.mjs --check\n[\s\S]*run: node tools\/run-suites\.mjs quick --jobs 4\n[\s\S]*deploy:\n\s+needs: check/); assert(!/run-suites\.mjs (all|slow)/.test(pages));
  assert.match(full, /run: node tools\/run-suites\.mjs all --jobs 4/); assert.match(full, /schedule:\n\s+- cron:/); assert.match(full, /workflow_dispatch:/); assert.match(full, /push:\n\s+branches: \[main\]/); assert(!/deploy-pages|pages: write/.test(full), 'the full run publishes');
  report.publish = {quick: quick.length, slow};
});

console.log(JSON.stringify({suite: 'T47 squad codes (Build 37)', passed: results.length, results, report}, null, 1));
