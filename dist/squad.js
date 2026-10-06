// Build 37: squad codes. CREATE SQUAD leaves this page's connection description with the squad service (service/ in the
// repository: a Cloudflare Worker) under a 4-character code; JOIN SQUAD fetches it by that code and leaves the answer. The
// service carries no game data and is asked nothing once the two pages are connected. Where it cannot be reached (or none
// is set: `url` empty) the game says so and offers the long codes of Build 15 (network.js), which need no service.
// Build 41: when the two pages cannot reach each other directly, the service also gives each a pass to the relay
// (`relay`: short-lived TURN credentials) and carries a second pair of descriptions (`retry`, `next`); network.js decides when.
import './build.js'; // DEPLOY-01 upgrade guard

// `url`: where the service answers (no slash at the end); empty: no service. The alphabet has no 0, 1, I, L or O.
export const SQUAD = {url: 'https://dustline-squad.awilson183.workers.dev', alphabet: '23456789ABCDEFGHJKMNPQRSTUVWXYZ', length: 4, timeout: 7000, pollEvery: 2000, life: 10 * 60e3, joinWait: 40e3, lost: 4,
  // Build 41: how long the direct attempt has after the descriptions are exchanged before the relay is asked for, how long
  // the second attempt has, and how often the service is asked during it.
  directWait: 10e3, relayWait: 40e3, relayPoll: 1000};

export class SquadError extends Error { constructor(reason, message, more = {}) { super(message); this.reason = reason; Object.assign(this, more); } }
// What a player typed, without spaces, dashes and case. Returns {ok, code} or {ok: false, reason, message}.
export function readSquadCode(text) {
  const code = String(text ?? '').toUpperCase().replace(/[\s\-_.·]+/g, '');
  if (!code) return {ok: false, reason: 'empty', message: 'Type the 4-character squad code your teammate gave you, then press JOIN SQUAD.'};
  if (code.length > 40) return {ok: false, reason: 'long-code', message: 'That is a long connection code, not a squad code. Long codes go in the manual connection box.'};
  if (code.length !== SQUAD.length) return {ok: false, reason: 'length', message: `A squad code has ${SQUAD.length} characters; that has ${code.length}.`};
  const wrong = [...code].find(c => !SQUAD.alphabet.includes(c));
  if (wrong) return {ok: false, reason: 'letters', message: `Squad codes never contain 0, 1, I, L or O, and "${wrong}" is not in one. Check the code with your teammate.`};
  return {ok: true, code};
}
const MESSAGES = {
  unreachable: 'The squad service cannot be reached. Check your connection and try again, or use the manual connection below: it needs no service.',
  unset: 'Squad codes are not set up on this copy of the game. Use the manual connection below.',
  unknown: 'No squad is waiting under that code. It may be mistyped, already used, expired (codes last ten minutes), or the host reloaded the page. Ask the host for a new code.',
  used: 'That squad code has already been used: a code works once. If it was not you, the host should press DISCONNECT and create a new code.',
  'host-gone': 'The host’s page is no longer waiting on that code (it was closed or reloaded). Ask the host to create a new code.',
  build: 'You and the host are on different builds of the game. Both of you reload the page, then the host creates a new squad code.',
  busy: 'The squad service is busy. Try again in a minute, or use the manual connection below.',
  expired: 'The squad code expired before anyone joined (codes last ten minutes). Press CREATE SQUAD for a new one.',
  refused: 'The squad service refused the request. Reload the page; if it happens again use the manual connection below.',
  'relay-unset': 'No relay is set up on the squad service.',
  'relay-busy': 'The relay has given out all of today’s passes.',
  'relay-down': 'The relay refused to issue a pass.',
  'relay-spent': 'This squad code has had its passes to the relay.',
  'bad-stage': 'The squad service was asked for something out of turn.',
};
// Which failures mean the service itself is not doing its work: these, and only these, bring up the manual connection.
export const SERVICE_FAULTS = ['unreachable', 'unset', 'busy', 'refused'];
export const squadMessage = reason => MESSAGES[reason] || MESSAGES.refused;

// The calls. `fetch` and `build` can be given (tests); otherwise the page's.
export class SquadService {
  constructor({url, fetch: f, build} = {}) { this.given = url; this.fetchWith = f; this.build = build ?? pageBuild(); }
  get url() { return (this.given ?? SQUAD.url ?? '').replace(/\/+$/, ''); }
  configured() { return /^https?:\/\//.test(this.url); }
  async call(path, body) {
    if (!this.configured()) throw new SquadError('unset', MESSAGES.unset);
    const f = this.fetchWith || globalThis.fetch, stop = typeof AbortController === 'function' ? new AbortController() : null, timer = setTimeout(() => stop?.abort(), SQUAD.timeout);
    let response, data = null;
    // text/plain: a "simple" request, so the browser sends it without asking the service first.
    try { response = await f(this.url + path, {method: 'POST', headers: {'Content-Type': 'text/plain'}, body: JSON.stringify(body), signal: stop?.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer'}); data = await response.json(); }
    catch { throw new SquadError('unreachable', MESSAGES.unreachable); } finally { clearTimeout(timer); }
    if (response.ok && data && data.ok === true) return data;
    const reason = data && typeof data.error === 'string' ? data.error : '';
    // An answer that is not the service's own (a proxy's page, a server error) is the service not being reachable.
    if (!data || typeof data.ok !== 'boolean' || response.status >= 500 && !['busy', 'relay-unset', 'relay-busy', 'relay-down'].includes(reason)) throw new SquadError('unreachable', MESSAGES.unreachable);
    // A service from before Build 41 knows nothing of the relay's paths: that is a service with no relay.
    const known = ['unknown', 'used', 'host-gone', 'build', 'busy', 'relay-unset', 'relay-busy', 'relay-down', 'relay-spent', 'bad-stage'].includes(reason) ? reason : reason === 'not-yours' ? 'unknown' : reason === 'no-such-path' ? 'relay-unset' : 'refused';
    throw new SquadError(known, MESSAGES[known], known === 'build' ? {hostBuild: data.hostBuild, build: this.build} : {});
  }
  create(offer) { return this.call('/create', {offer, build: this.build}); }
  join(code) { return this.call('/join', {code, build: this.build}); }
  answer(code, ticket, answer) { return this.call('/answer', {code, ticket, answer}); }
  poll(code, key) { return this.call('/poll', {code, key}); }
  // Build 41. `who`: {key} for the host, {ticket} for the joiner. `done`: the host's page is connected (or has given up).
  relay(code, who) { return this.call('/relay', {code, ...who}); }
  retry(code, key, offer) { return this.call('/retry', {code, key, offer}); }
  next(code, ticket) { return this.call('/next', {code, ticket}); }
  done(code, key) { if (this.configured()) this.call('/cancel', {code, key}).catch(() => {}); }
  // Told as the page goes away: a beacon outlives the page; without one, an ordinary call that nobody waits for.
  cancel(code, key) { if (!this.configured()) return; const body = JSON.stringify({code, key});
    try { if (!this.fetchWith && typeof navigator === 'object' && navigator.sendBeacon?.(this.url + '/cancel', body)) return; } catch {}
    this.call('/cancel', {code, key}).catch(() => {}); }
}
// The build this page was stamped with (the same on every page of one build, another on any other).
export function pageBuild() { try { return document.querySelector?.('meta[name="dustline-build"]')?.content || 'unstamped'; } catch { return 'unstamped'; } }
