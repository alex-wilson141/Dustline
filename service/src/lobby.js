// DUSTLINE squad codes: the whole of the signalling service's rule, with no Cloudflare in it (tests/test-squad-codes-b37.mjs
// runs this file as it is). It holds one connection description under a short code for a few minutes, hands it to the one
// player who asks for that code, and passes that player's answer back to the host. It carries no game data.
//
// What is stored, and for how long: per code, the host's connection description (it contains the host's network addresses),
// the build of the host's page, two random keys, three times, and, once someone has joined, that player's connection
// description (their addresses). A record is deleted when the host has collected the answer, when the host cancels, when the
// host's page has stopped asking (refused to a joiner after HOST_GONE, deleted after HOST_LOST), and at the latest LIFE after it was made. Nothing is written anywhere else: no log
// line, no counter, no address of whoever called.
export const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';   // no 0, 1, I, L or O
export const LENGTH = 4, LIFE = 10 * 60e3, HOST_GONE = 12e3, HOST_LOST = 60e3, MOST = 2000, MAX_SDP = 12000, SERVICE = 'dustline-squad', PROTOCOL = 1;
const PREFIX = 'c:';

export const cleanCode = text => String(text ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '');
export const validCode = code => typeof code === 'string' && code.length === LENGTH && [...code].every(c => ALPHABET.includes(c));
const validSdp = s => typeof s === 'string' && s.length <= MAX_SDP && s.startsWith('v=0');
const validBuild = b => typeof b === 'string' && /^[0-9a-z.-]{1,40}$/i.test(b);
const token = random => [...random(16)].map(b => b.toString(16).padStart(2, '0')).join('');
const fail = (status, error) => ({status, body: {ok: false, error}});
const ok = body => ({status: 200, body: {ok: true, ...body}});

// `store`: get(key), put(key, value), delete(key), list({prefix}) -> Map, setAlarm(time) (a Durable Object's storage).
// `now`: () -> ms. `random`: n -> n random bytes. Every answer is {status, body}; nothing throws for a bad request.
export function makeLobby({store, now = () => Date.now(), random = n => crypto.getRandomValues(new Uint8Array(n))}) {
  const live = r => r && now() - r.made < LIFE;
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
    if (r.answer) return fail(410, 'used');
    r.answer = answer; await store.put(PREFIX + code, r); return ok({});
  }
  // The host asks every two seconds. The answer is handed over once, and the record goes with it.
  async function poll({code, key}) {
    code = cleanCode(code); if (!validCode(code) || typeof key !== 'string') return fail(400, 'bad-request');
    const r = await read(code); if (!r) return fail(404, 'unknown');
    if (r.key !== key) return fail(403, 'not-yours');
    if (r.answer) { await store.delete(PREFIX + code); return ok({state: 'answer', answer: r.answer}); }
    r.asked = now(); await store.put(PREFIX + code, r); return ok({state: r.ticket ? 'joining' : 'waiting', left: Math.max(0, LIFE - (now() - r.made))});
  }
  async function cancel({code, key}) {
    code = cleanCode(code); if (!validCode(code) || typeof key !== 'string') return fail(400, 'bad-request');
    const r = await read(code); if (r && r.key === key) await store.delete(PREFIX + code); return ok({});
  }
  async function alarm() { if (await sweep() > 0) await store.setAlarm(now() + 60e3); }
  const routes = {'/create': create, '/join': join, '/answer': answer, '/poll': poll, '/cancel': cancel};
  // One request: `path`, `method` and the body's text. Bodies are JSON whatever their content type says (the game sends
  // text/plain so that the browser asks no permission first: half the requests).
  async function handle(method, path, text) {
    if (path === '/health' && method === 'GET') return ok({service: SERVICE, protocol: PROTOCOL});
    const route = routes[path]; if (!route) return fail(404, 'no-such-path'); if (method !== 'POST') return fail(405, 'post-only');
    if (typeof text !== 'string' || text.length > MAX_SDP + 2000) return fail(413, 'too-large');
    let body; try { body = JSON.parse(text); } catch { return fail(400, 'bad-request'); } if (!body || typeof body !== 'object') return fail(400, 'bad-request');
    return route(body);
  }
  return {handle, alarm, sweep};
}
