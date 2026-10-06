// DUSTLINE squad codes: the Cloudflare Worker and its Durable Object. All of the rule is in lobby.js; this file only joins
// it to Cloudflare: which pages may call (ALLOWED_ORIGINS in wrangler.toml), one Durable Object that holds the codes, and its
// alarm that deletes what is past its time. It writes no log line (there is no console call in the service) and
// wrangler.toml switches Cloudflare's own Workers logs off.
//
// Build 41: the relay's passes. Cloudflare's TURN service issues short-lived credentials to whoever holds a TURN key's API
// token. The key's id and its token are two secrets of this Worker (TURN_KEY_ID, TURN_KEY_API_TOKEN: set in the dashboard,
// never in the page and never in the repository); without them the service says that no relay is set up. What is sent to
// Cloudflare for a pass is how long it should last, and nothing else.
import {DurableObject} from 'cloudflare:workers';
import {makeLobby} from './lobby.js';

const allowed = (origin, env) => !!origin && String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean).some(a => a === origin || a.endsWith(':*') && origin.startsWith(a.slice(0, -1)));
const cors = origin => ({'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400', 'Vary': 'Origin', 'Cache-Control': 'no-store'});
const json = (status, body, headers = {}) => new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json', ...headers}});

const TURN_API = 'https://rtc.live.cloudflare.com/v1/turn/keys/';
const turn = env => async ttl => { const id = env?.TURN_KEY_ID, token = env?.TURN_KEY_API_TOKEN; if (!id || !token) return null;
  const r = await fetch(TURN_API + encodeURIComponent(id) + '/credentials/generate-ice-servers', {method: 'POST', headers: {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'}, body: JSON.stringify({ttl})});
  if (!r.ok) throw new Error('The relay refused.'); return (await r.json()).iceServers; };

export class SquadLobby extends DurableObject {
  constructor(ctx, env) { super(ctx, env); this.lobby = makeLobby({store: ctx.storage, turn: turn(env)}); }
  async fetch(request) { const url = new URL(request.url), r = await this.lobby.handle(request.method, url.pathname, request.method === 'POST' ? await request.text() : ''); return json(r.status, r.body); }
  async alarm() { await this.lobby.alarm(); }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    // A page that is not the game's gets nothing; a request with no Origin (a browser's address bar, curl) may only ask /health.
    if (origin && !allowed(origin, env)) return json(403, {ok: false, error: 'origin'});
    const headers = origin ? cors(origin) : {'Cache-Control': 'no-store'};
    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers});
    if (!origin && new URL(request.url).pathname !== '/health') return json(403, {ok: false, error: 'origin'}, headers);
    try { const answer = await env.LOBBY.get(env.LOBBY.idFromName('lobby')).fetch(request); return new Response(answer.body, {status: answer.status, headers: {'Content-Type': 'application/json', ...headers}}); }
    catch { return json(500, {ok: false, error: 'service'}, headers); }
  },
};
