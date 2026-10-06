// DUSTLINE squad codes: the whole of the signalling service's rule, with no Cloudflare in it (tests/test-squad-codes-b37.mjs
// runs this file as it is). It holds one connection description under a short code for a few minutes, hands it to the one
// player who asks for that code, and passes that player's answer back to the host. It carries no game data.
//
// What is stored, and for how long: per code, the host's connection description (it contains the host's network addresses),
// the build of the host's page, two random keys, three times, and, once someone has joined, that player's connection
// description (their addresses). A record is deleted when the host has collected the answer, when the host cancels, when the
// host's page has stopped asking (refused to a joiner after HOST_GONE, deleted after HOST_LOST), and at the latest LIFE after it was made. Nothing is written anywhere else: no log
// line, no address of whoever called.
//
// Build 41: the relay. When the two pages cannot reach each other directly, each asks here for a pass to the relay
// (short-lived TURN credentials, issued by Cloudflare to this service: `turn`) and they exchange a second pair of
// descriptions through here. For that, when the host collects the first answer the two descriptions are deleted as before
// and what stays is the code, the two keys, the build and the times: nothing with an address in it. That remainder is deleted
// when the host's page says it is connected, when the second answer is collected, and RETRY after the first answer at the
// latest. The second pair of descriptions is held exactly as the first was. One count is kept: how many passes were issued
// today (a number and the day, nothing about who asked), so that no more than RELAY_DAY can be had in a day.
export const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';   // no 0, 1, I, L or O
export const LENGTH = 4, LIFE = 10 * 60e3, HOST_GONE = 12e3, HOST_LOST = 60e3, MOST = 2000, MAX_SDP = 12000, SERVICE = 'dustline-squad', PROTOCOL = 2;
// The relay: how long what is left of a record lives after the first answer, how long a pass is good for (seconds: a
// relayed session ends when its pass does), passes for one side of one code, passes in a day.
export const RETRY = 2 * 60e3, RELAY_TTL = 6 * 3600, RELAY_PASSES = 2, RELAY_DAY = 200;
const PREFIX = 'c:', COUNT = 'n:relay';

export const cleanCode = text => String(text ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '');
export const validCode = code => typeof code === 'string' && code.length === LENGTH && [...code].every(c => ALPHABET.includes(c));
const validSdp = s => typeof s === 'string' && s.length <= MAX_SDP && s.startsWith('v=0');
const validBuild = b => typeof b === 'string' && /^[0-9a-z.-]{1,40}$/i.test(b);
const token = random => [...random(16)].map(b => b.toString(16).padStart(2, '0')).join('');
const fail = (status, error) => ({status, body: {ok: false, error}});
const ok = body => ({status: 200, body: {ok: true, ...body}});
// What the relay's keeper returned, as a browser can use it: STUN and TURN addresses only, a TURN entry only with its name
// and password, and no address on port 53 (browsers block it, and it would only time out).
export function cleanIce(list) { const out = [];
  for (const s of Array.isArray(list) ? list : list && typeof list === 'object' ? [list] : []) {   /* a list of servers, or one */ const urls = (Array.isArray(s?.urls) ? s.urls : [s?.urls]).filter(u => typeof u === 'string' && /^(stun|turns?):[a-z0-9.-]+(:\d+)?(\?transport=(udp|tcp))?$/i.test(u) && !/:53(\?|$)/.test(u)); if (!urls.length) continue;
    const relay = urls.some(u => /^turn/i.test(u)); if (relay && (typeof s.username !== 'string' || typeof s.credential !== 'string' || !s.username || !s.credential)) continue;
    out.push(relay ? {urls, username: s.username, credential: s.credential} : {urls}); }
  return out; }

// `store`: get(key), put(key, value), delete(key), list({prefix}) -> Map, setAlarm(time) (a Durable Object's storage).
// `now`: () -> ms. `random`: n -> n random bytes. `turn`: seconds -> the relay's servers for a pass good that long (a list
// as RTCPeerConnection takes it), null where no relay is set up; it throws when the relay's keeper refuses or cannot be
// reached. Every answer is {status, body}; nothing throws for a bad request.
export function makeLobby({store, now = () => Date.now(), random = n => crypto.getRandomValues(new Uint8Array(n)), turn = async () => null}) {
  // A record lives LIFE from when it was made; once its first answer is collected, RETRY from then (and no longer).
  const live = r => r && (r.handed ? now() - r.handed < RETRY : now() - r.made < LIFE);
  async function read(code) { const r = await store.get(PREFIX + code); if (r && !live(r)) { await store.delete(PREFIX + code); return null; } return r || null; }
  // Everything past its time is deleted; called by the alarm and before a code is issued.
  async function sweep() { const all = await store.list({prefix: PREFIX}); let left = 0; for (const [key, r] of all) { if (!live(r) || now() - r.asked > HOST_LOST) await store.delete(key); else left++; } return left; }
  async function create({offer, build}) {
    if (!validSdp(offer) || !validBuild(build)) return fail(400, 'bad-request');
    if (await sweep() >= MOST) return fail(503, 'busy');
    // A code is issued only when nothing live holds it.
    for (let tries = 0; tries < 40; tries++) { const bytes = random(LENGTH * 2); let code = '';
      for (let i = 0; i < bytes.length && code.length < LENGTH; i++) if (bytes[i] < 248) code += ALPHABET[bytes[i] % ALPHABET.length];   // 248 = 8 * 31: no letter is likelier than another
      if (code.length < LENGTH || await read(code)) continue;
      const key = token(random); await store.put(PREFIX + code, {offer, build, key, made: now(), asked: now(), ticket: null, answer: null}); await store.setAlarm(now() + 60e3);
      return ok({code, key, life: LIFE}); }
    return fail(503, 'busy');
  }
  async function join({code, build}) {
    code = cleanCode(code); if (!validCode(code) || !validBuild(build)) return fail(400, 'bad-code');
    const r = await read(code); if (!r) return fail(404, 'unknown');
    if (r.ticket) return fail(410, 'used');
    if (now() - r.asked > HOST_GONE) { await store.delete(PREFIX + code); return fail(410, 'host-gone'); }
    if (r.build !== build) return {status: 409, body: {ok: false, error: 'build', hostBuild: r.build}};   // not used up: the same player may reload and try again
    r.ticket = token(random); r.joined = now(); await store.put(PREFIX + code, r);
    return ok({offer: r.offer, ticket: r.ticket});
  }
  async function answer({code, ticket, answer}) {
    code = cleanCode(code); if (!validCode(code) || !validSdp(answer) || typeof ticket !== 'string') return fail(400, 'bad-request');
    const r = await read(code); if (!r) return fail(404, 'unknown');
    if (!r.ticket || r.ticket !== ticket) return fail(403, 'not-yours');
    if (r.answer || !r.offer) return fail(410, 'used');   // answered already, or nothing is waiting for an answer
    r.answer = answer; await store.put(PREFIX + code, r); return ok({});
  }
  // The host asks every two seconds. The answer is handed over once, and the record goes with it.
  async function poll({code, key}) {
    code = cleanCode(code); if (!validCode(code) || typeof key !== 'string') return fail(400, 'bad-request');
    const r = await read(code); if (!r) return fail(404, 'unknown');
    if (r.key !== key) return fail(403, 'not-yours');
    if (r.answer) {
      if (r.round === 2) { await store.delete(PREFIX + code); return ok({state: 'answer', answer: r.answer, round: 2}); }
      // The first answer: both descriptions go now. The keys and the times stay for RETRY, in case the direct attempt fails.
      await store.put(PREFIX + code, {offer: null, answer: null, build: r.build, key: r.key, ticket: r.ticket, made: r.made, asked: now(), handed: now(), round: 1});
      return ok({state: 'answer', answer: r.answer, round: 1}); }
    r.asked = now(); await store.put(PREFIX + code, r);
    return ok({state: r.round === 2 ? 'relay' : r.handed ? 'direct' : r.ticket ? 'joining' : 'waiting', left: Math.max(0, r.handed ? RETRY - (now() - r.handed) : LIFE - (now() - r.made))});
  }
  // ---- Build 41: the second attempt, for two pages whose direct attempt did not connect.
  // A pass for the relay, for the host (by its key) or the joiner (by its ticket) of a code whose first answer has been
  // collected: before that nobody has tried to connect, and after RETRY the record is gone and with it the right to ask.
  async function relay({code, key, ticket}) {
    code = cleanCode(code); if (!validCode(code) || typeof key !== 'string' && typeof ticket !== 'string') return fail(400, 'bad-request');
    const r = await read(code); if (!r) return fail(404, 'unknown');
    const host = typeof key === 'string' && r.key === key, guest = typeof ticket === 'string' && !!r.ticket && r.ticket === ticket; if (!host && !guest) return fail(403, 'not-yours');
    if (!r.handed) return fail(409, 'bad-stage');
    const side = host ? 'passHost' : 'passGuest'; if ((r[side] || 0) >= RELAY_PASSES) return fail(429, 'relay-spent');
    const day = Math.floor(now() / 864e5), count = await store.get(COUNT), n = count && count.day === day ? count.n : 0; if (n >= RELAY_DAY) return fail(503, 'relay-busy');
    let list; try { list = await turn(RELAY_TTL); } catch { return fail(502, 'relay-down'); }
    if (list === null || list === undefined) return fail(501, 'relay-unset');
    list = cleanIce(list); if (!list.some(s => s.username)) return fail(502, 'relay-down');
    r[side] = (r[side] || 0) + 1; await store.put(PREFIX + code, r); await store.put(COUNT, {day, n: n + 1});
    return ok({iceServers: list, ttl: RELAY_TTL});
  }
  // The host's second description, once, after the first answer was collected.
  async function retry({code, key, offer}) {
    code = cleanCode(code); if (!validCode(code) || typeof key !== 'string' || !validSdp(offer)) return fail(400, 'bad-request');
    const r = await read(code); if (!r) return fail(404, 'unknown'); if (r.key !== key) return fail(403, 'not-yours');
    if (!r.handed || r.round === 2) return fail(409, 'bad-stage');
    r.offer = offer; r.answer = null; r.round = 2; r.asked = now(); await store.put(PREFIX + code, r); return ok({});
  }
  // The joiner asks whether the host has left a second description; its answer goes back by /answer as the first did.
  async function next({code, ticket}) {
    code = cleanCode(code); if (!validCode(code) || typeof ticket !== 'string') return fail(400, 'bad-request');
    const r = await read(code); if (!r) return fail(404, 'unknown'); if (!r.ticket || r.ticket !== ticket) return fail(403, 'not-yours');
    return ok(r.round === 2 && r.offer && !r.answer ? {state: 'offer', offer: r.offer} : {state: r.round === 2 ? 'answered' : 'direct'});
  }
  // Whether the relay is set up and its keeper issues passes: asked of the keeper at most once a minute, kept in memory only.
  let probe = null;
  async function relayState() { if (probe && now() - probe.at < 60e3) return probe.state; let state;
    try { const list = await turn(60); state = list === null || list === undefined ? 'unset' : cleanIce(list).some(s => s.username) ? 'ready' : 'refused'; } catch { state = 'refused'; }
    probe = {at: now(), state}; return state; }
  async function cancel({code, key}) {
    code = cleanCode(code); if (!validCode(code) || typeof key !== 'string') return fail(400, 'bad-request');
    const r = await read(code); if (r && r.key === key) await store.delete(PREFIX + code); return ok({});
  }
  async function alarm() { if (await sweep() > 0) await store.setAlarm(now() + 60e3); }
  const routes = {'/create': create, '/join': join, '/answer': answer, '/poll': poll, '/cancel': cancel, '/relay': relay, '/retry': retry, '/next': next};
  // One request: `path`, `method` and the body's text. Bodies are JSON whatever their content type says (the game sends
  // text/plain so that the browser asks no permission first: half the requests).
  async function handle(method, path, text) {
    if (path === '/health' && method === 'GET') return ok({service: SERVICE, protocol: PROTOCOL, relay: await relayState()});
    const route = routes[path]; if (!route) return fail(404, 'no-such-path'); if (method !== 'POST') return fail(405, 'post-only');
    if (typeof text !== 'string' || text.length > MAX_SDP + 2000) return fail(413, 'too-large');
    let body; try { body = JSON.parse(text); } catch { return fail(400, 'bad-request'); } if (!body || typeof body !== 'object') return fail(400, 'bad-request');
    return route(body);
  }
  return {handle, alarm, sweep};
}
