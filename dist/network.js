// Optional WebRTC data-only co-op. Signaling is exchanged by the players as two connection codes.
// Build 15 (COOP-01): the codes say what they are and how long they are, carry a checksum, survive whitespace and line
// breaks, and every way a code can be wrong has its own message; a pasted code is routed by what it is, not by which
// button was pressed; a network that cannot connect is reported as that, never as a wrong code.
import './build.js'; // DEPLOY-01 upgrade guard
import {SQUAD, SquadError, readSquadCode, squadMessage} from './squad.js';

export const CODE_VERSION = 3;
const HEAD = 'DUSTLINE', KIND = {offer: 'H', answer: 'A'}, KIND_OF = {H: 'offer', A: 'answer'}, NAME = {offer: 'host code', answer: 'answer code'};
// FNV-1a, 32 bit, as 8 hex digits: enough to notice a code that was changed on the way.
export function checksum(text) { let h = 0x811c9dc5; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); }
const toBase64Url = text => btoa(unescape(encodeURIComponent(text))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromBase64Url = text => { const b = text.replace(/-/g, '+').replace(/_/g, '/'); return decodeURIComponent(escape(atob(b + '='.repeat((4 - b.length % 4) % 4)))); };

// What a player pasted, with everything a chat app, an e-mail or a careless selection can add taken away: spaces, tabs,
// line breaks, invisible characters, quotation marks and brackets around the code.
export function cleanCode(text) { return String(text ?? '').replace(/[\s\u200b-\u200d\u2060\ufeff\u00a0]+/g, '').replace(/^[`'"“”‘’<(\[]+|[`'"“”‘’>)\]]+$/g, ''); }

// A code: DUSTLINE:<H or A>:<length of the payload>:<payload>:<checksum of the payload>. `extra` is kept inside the payload.
export function makeCode(description, extra = {}) {
  const payload = toBase64Url(JSON.stringify({v: CODE_VERSION, type: description.type, sdp: description.sdp, ...extra}));
  return `${HEAD}:${KIND[description.type]}:${payload.length}:${payload}:${checksum(payload)}`;
}

// Reads a pasted code. Returns {ok: true, type, sdp, id, for} or {ok: false, reason, message}; never throws.
// Reasons: empty, link, old-build, newer-build, not-a-code, incomplete, altered.
export function readCode(text) {
  const bad = (reason, message, more = {}) => ({ok: false, reason, message, ...more});
  if (typeof text !== 'string' || text.length > 60000) return bad('not-a-code', 'That is far too long to be a connection code. Paste only the code your teammate sent.');
  const raw = text.trim(), code = cleanCode(text);
  if (!code) return bad('empty', 'The box is empty. Paste the code your teammate sent you, then press the button.');
  if (/^https?:\/\//i.test(raw) || /^www\./i.test(raw)) return bad('link', 'That is a web address, not a connection code. Ask your teammate to press COPY CODE and send what it copies.');
  const at = code.toUpperCase().indexOf(HEAD + ':');
  if (at < 0) {
    // A code from Build 14 or earlier was plain base64 of {"v":2,...}.
    try { const old = JSON.parse(atob(code.replace(/-/g, '+').replace(/_/g, '/'))); if (old && typeof old === 'object' && 'v' in old && 'sdp' in old) return bad('old-build', 'That code was made by an older build of the game. Both of you reload the page so you are on the same build, then make new codes.'); } catch {}
    return bad('not-a-code', 'That is not a DUSTLINE connection code. A code starts with "DUSTLINE:". Ask your teammate to press COPY CODE and send all of what it copies.');
  }
  const parts = code.slice(at).split(':'), kind = (parts[1] || '').toUpperCase(), want = Number(parts[2]), payload = parts[3] ?? '', check = (parts[4] ?? '').toLowerCase();
  const type = KIND_OF[kind];
  if (!type || !Number.isInteger(want) || want < 1) return bad(parts.length < 4 ? 'incomplete' : 'altered', parts.length < 4 ? 'The code is incomplete: only its first few characters arrived. Send the whole code again.' : 'The code was changed on the way and cannot be read. Send it again, by another app if it happens twice.');
  if (payload.length < want || parts.length < 5 || check.length < 8) {
    const got = Math.min(payload.length, want);
    return bad('incomplete', `The ${NAME[type]} is incomplete: ${got} of ${want} characters arrived. The app it was sent through cut it short. Send it again another way (e-mail, a shared note or a file).`, {got, want, type});
  }
  if (payload.length > want || parts.length > 5 || check.slice(0, 8) !== checksum(payload)) return bad('altered', `The ${NAME[type]} was changed on the way (it no longer matches its checksum). Send it again, by another app if it happens twice.`, {type});
  let d; try { d = JSON.parse(fromBase64Url(payload)); } catch { return bad('altered', `The ${NAME[type]} was changed on the way and cannot be read. Send it again.`, {type}); }
  if (!d || typeof d !== 'object') return bad('altered', `The ${NAME[type]} cannot be read. Send it again.`, {type});
  if (d.v > CODE_VERSION) return bad('newer-build', 'That code was made by a newer build of the game than this page. Reload this page, then make new codes.');
  if (d.v !== CODE_VERSION) return bad('old-build', 'That code was made by an older build of the game. Both of you reload the page so you are on the same build, then make new codes.');
  if (d.type !== type || typeof d.sdp !== 'string' || !d.sdp.startsWith('v=0')) return bad('altered', `The ${NAME[type]} does not hold a connection description. Make a new one.`, {type});
  return {ok: true, type, sdp: d.sdp, id: checksum(payload), for: typeof d.for === 'string' ? d.for : null};
}
// Whether a description offers an address that another network can reach (found with the help of the STUN server).
export const hasPublicAddress = sdp => /typ (srflx|relay)/.test(sdp || '');
export const NETWORK_FAILURE = 'The codes were right, but your two networks could not reach each other directly. This is a network limit, not a wrong code. The long codes connect directly only: a squad code (CREATE SQUAD, JOIN SQUAD) can go through the relay when two networks cannot reach each other.';
// Build 41: the relay (NET-01). What a page says while the second attempt runs, when it connected by the relay, and for
// every way the second attempt can end without a connection. None of them is a wrong code, and each says so.
const APART = 'Your two networks could not reach each other directly';
export const RELAY_TRYING = 'Your two networks cannot reach each other directly. Trying through the relay… this can take half a minute.';
export const RELAY_CONNECTED = 'Connected through the relay. Host can deploy the squad.';
export const RELAY_FAILURE = {
  'relay-unreachable': `${APART}, and the relay could not be asked to carry the connection: the squad service stopped answering. This is not a wrong code. Check your connection, then try again with a new squad code.`,
  'relay-unset': `${APART}, and this copy of the game has no relay set up to carry the connection. This is a network limit, not a wrong code.`,
  'relay-down': `${APART}, and the relay refused to issue a pass for the connection (its key is wrong, or its keeper did not answer). This is not a wrong code. Try again with a new squad code; if it happens again, the relay needs its owner.`,
  'relay-busy': `${APART}, and the relay has given out all of today’s passes. This is not a wrong code. Try again tomorrow, or with one of you on another network.`,
  'relay-blocked': `${APART}, and neither page could reach the relay either: it gave neither of you an address. A network that lets nothing but web pages through does this. Try with one of you on another network.`,
  'relay-failed': `${APART}, and the relay did not connect you either. This is not a wrong code. Try once more with a new squad code.`,
  'host-stopped': `${APART}, and the host’s page could not start the second attempt through the relay; its own message says why. Ask the host to create a new squad code.`,
  'guest-silent': `${APART}, and your teammate’s page did not answer the second attempt through the relay. Press CREATE SQUAD for a new code.`,
  expired: `${APART}, and the squad code ran out before the relay could be tried. Try again with a new squad code.`,
};
// Why a call for the relay failed, as one of the reasons above.
const relayReason = e => e?.reason === 'unreachable' ? 'relay-unreachable' : ['relay-unset', 'relay-down', 'relay-busy'].includes(e?.reason) ? e.reason : e?.reason === 'unknown' ? 'expired' : 'relay-down';
const hasRelay = d => /typ relay/.test(d?.sdp || '');
// The direct ways: what every connection knows. The relay's servers are added to a second attempt only.
const DIRECT = [{urls: 'stun:stun.l.google.com:19302'}];
const RELAY_SETTLE = 1000;

export class CodeError extends Error { constructor(reason, message) { super(message); this.reason = reason; } }

export class PeerSquad {
 constructor({status,onReady,onMessage,onClose,onUnstable,onSquad}){Object.assign(this,{status,onReady,onMessage,onClose,onUnstable,onSquad});this.pc=null;this.channel=null;this.role=null;this.connected=false;this.myCode=null;this.offerId=null;this.exchanged=false;this.connectTimeout=30000;this.timer=null;this.unstable=false;this.graceTime=15000;this.grace=null;this.squad=null;this.squadTimer=null;this.route=null;this.routeDelay=1500;this.routeTimer=null;this.failure=null;}
 close(notify=false){this.leaveSquad();this.connected=false;this.unstable=false;this.exchanged=false;this.route=null;clearTimeout(this.timer);clearTimeout(this.grace);clearTimeout(this.routeTimer);this.timer=this.grace=null;const pc=this.pc,ch=this.channel;this.pc=null;this.channel=null;if(ch){ch.onopen=ch.onclose=ch.onmessage=null;ch.close();}pc?.close();if(notify)this.onClose?.();}
 setup(role){this.close();this.role=role;this.myCode=null;this.offerId=null;this.failure=null;return this.make(null);}
 // Build 41: `relay`: the relay's servers (a pass), for a second attempt only. Without them a connection knows the direct
 // ways and nothing of the relay. With them it knows both, and the browser still takes a direct way if one works.
 make(relay,second=false){const pc=this.pc=new RTCPeerConnection({iceServers:[...DIRECT,...(relay||[])]});pc.second=second;pc.onconnectionstatechange=()=>{if(this.pc!==pc)return;const s=pc.connectionState;
   // NET-04 (Build 16): 'disconnected' is often a hiccup that the browser repairs by itself. An open session is held
   // (unstable) for up to graceTime; only 'failed', 'closed', a closed channel or a hiccup that outlasts the grace ends it.
   if(s==='disconnected'&&this.connected){if(!this.unstable){this.unstable=true;this.status('Connection interrupted. Waiting for it to return…');this.onUnstable?.(true);clearTimeout(this.grace);this.grace=setTimeout(()=>{if(this.pc===pc&&this.unstable)this.drop();},this.graceTime);}return;}
   if(s==='connected'&&this.unstable){this.unstable=false;clearTimeout(this.grace);this.grace=null;this.status('Connection restored.');this.onUnstable?.(false);return;}
   // Build 41: a squad code's connection that has not come up is not an ending: failing directly is what the relay is for.
   const q=this.squad;if(q&&q.stage&&!this.connected&&s!=='closed'){if(s==='connecting')this.status(q.stage==='direct'?'Codes accepted. Connecting…':RELAY_TRYING);else if(s==='failed')this.squadFailed(q,pc);return;}
   // A failed or lost connection after the codes were exchanged is the network, and is said so.
   if(s==='failed'&&!this.connected&&this.exchanged)this.status(this.networkFailure());else if(s==='connecting')this.status('Codes accepted. Connecting…');else if(s!=='connected'&&s!=='new')this.status('Connection: '+s);
   if(['failed','disconnected','closed'].includes(s))this.drop();};pc.ondatachannel=e=>{if(this.pc!==pc){e.channel.close();return;}this.bind(e.channel);};return pc;}
 // The second attempt's connection takes the first's place: the first is closed without a word (the squad code, the role
 // and what the page was told stay as they are).
 swap(relay){this.shut();return this.make(relay,true);}
 shut(){const pc=this.pc,ch=this.channel;this.pc=null;this.channel=null;this.exchanged=false;if(ch){ch.onopen=ch.onclose=ch.onmessage=null;ch.close();}if(pc){pc.onconnectionstatechange=pc.ondatachannel=null;pc.close();}}
 drop(){const was=this.unstable;this.connected=false;this.unstable=false;clearTimeout(this.timer);clearTimeout(this.grace);this.grace=null;if(was)this.onUnstable?.(false);this.onClose?.();}
 bind(channel){this.channel=channel;channel.onopen=()=>{if(this.channel!==channel)return;const q=this.squad,pc=this.pc;this.connected=true;clearTimeout(this.timer);clearTimeout(this.squadTimer);this.squad=null;
   // Build 41: the host's page tells the service it is connected, and what little the service still held goes at once.
   if(q&&!q.guest&&q.stage)q.service.done(q.code,q.key);
   this.route=pc?.second?'unknown':'direct';this.status('Connected. Host can deploy the squad.');this.onReady?.(this.role);
   // A second attempt may have gone by the relay (this page's or the other's) or, after all, directly: the browser's own account says which.
   if(pc?.second){clearTimeout(this.routeTimer);this.routeTimer=setTimeout(async()=>{const way=await this.routeOf(pc);if(this.pc!==pc||!this.connected)return;this.route=way;if(way==='relay')this.status(RELAY_CONNECTED);},this.routeDelay);}};channel.onclose=()=>{if(this.channel!==channel)return;this.drop();};channel.onmessage=e=>{if(this.channel!==channel)return;if(typeof e.data!=='string'||e.data.length>100000)return;try{const m=JSON.parse(e.data);if(m&&typeof m==='object'&&typeof m.type==='string')this.onMessage(m);}catch{}};}
 // `relay` (Build 41): a connection that knows the relay may wait many seconds for the relay's slower ways (TCP, TLS) to
 // answer or to give up; a second after its first relay address is in hand is enough, and 8 s at the most.
 async gathered(pc,relay=false){if(pc.iceGatheringState==='complete')return;await new Promise((resolve,reject)=>{let seen=0;const done=ok=>{clearTimeout(timer);clearInterval(look);pc.removeEventListener('icegatheringstatechange',check);if(ok)resolve();else reject(new Error('This network gave the game no address to connect through. Try another browser or network.'));};
   const timer=setTimeout(()=>done(!!pc.localDescription?.sdp?.includes('candidate:')),relay?8000:12000);
   const look=relay?setInterval(()=>{if(!hasRelay(pc.localDescription))return;if(!seen)seen=Date.now();else if(Date.now()-seen>=RELAY_SETTLE)done(true);},100):null;
   const check=()=>{if(pc.iceGatheringState==='complete')done(true);};pc.addEventListener('icegatheringstatechange',check);});}
 // What to say when the codes matched and the connection still did not come up.
 networkFailure(){const mine=hasPublicAddress(this.pc?.localDescription?.sdp),theirs=hasPublicAddress(this.pc?.remoteDescription?.sdp);return NETWORK_FAILURE+(mine&&theirs?'':` (${!mine?'This':'Your teammate’s'} network did not reveal a public address.)`);}
 watch(pc){clearTimeout(this.timer);this.exchanged=true;this.timer=setTimeout(()=>{if(this.pc===pc&&!this.connected)this.status(this.networkFailure());},this.connectTimeout);}
 // Kept for callers and tests of earlier builds: the code of a description, and the description of a code of one kind.
 encode(d,extra){return makeCode(d,extra);}
 decode(text,type){const r=readCode(text);if(!r.ok)throw new CodeError(r.reason,r.message);if(r.type!==type)throw new CodeError('wrong-kind',`That is ${r.type==='offer'?'a host code':'an answer code'}, and ${type==='offer'?'a host code':'an answer code'} is needed here.`);return {type:r.type,sdp:r.sdp};}
 async host(){this.status('Preparing host code…');const pc=this.setup('host');this.bind(pc.createDataChannel('dustline',{ordered:true}));await pc.setLocalDescription(await pc.createOffer());await this.gathered(pc);if(this.pc!==pc)throw new Error('Connection setup cancelled.');const code=makeCode(pc.localDescription);this.myCode=code;this.offerId=readCode(code).id;this.status(`Host code ready (${code.length} characters). Send all of it to your teammate, then paste their answer here.`);return code;}
 async join(code){const d=this.decode(code,'offer'),offerId=readCode(code).id;this.status('Preparing answer…');const pc=this.setup('guest');await pc.setRemoteDescription(d);await pc.setLocalDescription(await pc.createAnswer());await this.gathered(pc);if(this.pc!==pc)throw new Error('Connection setup cancelled.');const answer=makeCode(pc.localDescription,{for:offerId});this.myCode=answer;this.exchanged=true;this.status(`Answer code ready (${answer.length} characters). Send all of it to the host and keep this page open.`);return answer;}
 async accept(code){const r=readCode(code);if(!r.ok)throw new CodeError(r.reason,r.message);if(r.type!=='answer')throw new CodeError('wrong-kind','That is a host code, not an answer. You have both created host codes: decide who hosts. The one who joins pastes the host code and presses JOIN WITH CODE.');
  if(!this.pc||this.role!=='host'||this.pc.signalingState!=='have-local-offer')throw new CodeError('no-host-code','That is an answer code, but this page has no host code waiting for one: the page was reloaded or is not the host. Start again: create a host code here, send it, and paste the new answer.');
  if(r.for&&this.offerId&&r.for!==this.offerId)throw new CodeError('stale-answer','That answer was made for an earlier host code, not the one on this page now. Send the current host code again (COPY CODE) and paste the new answer.');
  const pc=this.pc;this.exchanged=true;await pc.setRemoteDescription({type:r.type,sdp:r.sdp});if(this.pc!==pc||this.connected||pc.connectionState==='failed')return; // already connected or already reported
  this.watch(pc);this.status('Answer accepted. Connecting… this can take up to 30 seconds.');}
 // One entry for a pasted code, whichever button was pressed: a host code is joined, an answer is accepted by the page
 // that is waiting for one. Returns the code to send back (after joining) or null.
 async submit(text,button='join'){const r=readCode(text);if(!r.ok)throw new CodeError(r.reason,r.message);
  if(this.myCode&&cleanCode(text).includes(cleanCode(this.myCode)))throw new CodeError('own-code','That is your own code. Paste the one your teammate sent you.');
  if(r.type==='answer'){await this.accept(text);return null;}
  if(button==='accept')throw new CodeError('wrong-kind','That is a host code, not an answer. You have both created host codes: decide who hosts. The one who joins pastes the host code and presses JOIN WITH CODE.');
  return this.join(text);}
 // ---- Build 37: squad codes. The same connection as the long codes make, with the two descriptions carried by the squad
 // service (squad.js) under a 4-character code instead of by the players. `service`: a SquadService.
 // The host: its description goes to the service, which answers with the code; then the page asks every two seconds
 // whether someone has joined, and takes their answer when it is there. Throws a SquadError (its `reason` says what).
 async hostSquad(service){this.status('Preparing squad code…');const pc=this.setup('host');this.bind(pc.createDataChannel('dustline',{ordered:true}));await pc.setLocalDescription(await pc.createOffer());await this.gathered(pc);if(this.pc!==pc)throw new Error('Connection setup cancelled.');
  const r=await service.create(pc.localDescription.sdp);if(this.pc!==pc){service.cancel(r.code,r.key);throw new Error('Connection setup cancelled.');}
  this.squad={code:r.code,key:r.key,service,pc,misses:0,state:'waiting',until:Date.now()+(r.life||SQUAD.life)};this.status(`Squad code ${r.code}. Tell it to your teammate: they type it and press JOIN SQUAD. It works once, for ten minutes. Keep this page open.`);this.squadAsk();return r.code;}
 squadAsk(every=SQUAD.pollEvery){clearTimeout(this.squadTimer);this.squadTimer=setTimeout(()=>this.squadPoll(),every);}
 async squadPoll(){const q=this.squad;if(!q||q.guest||this.pc!==q.pc||this.connected)return;const second=q.stage==='relay';let r;
  try{r=await q.service.poll(q.code,q.key);}catch(e){if(this.squad!==q)return;
   // The service not answering for a moment loses nothing; lost for good, or the code gone from it, ends the wait.
   if(e.reason==='unreachable'&&++q.misses<SQUAD.lost){this.squadAsk(second?SQUAD.relayPoll:SQUAD.pollEvery);return;}
   if(second){this.relayOver(q,e.reason==='unreachable'?'relay-unreachable':'expired');return;}
   this.squad=null;this.onSquad?.(e.reason==='unreachable'?'unreachable':'expired');this.status(e.reason==='unreachable'?'The squad service stopped answering, so nobody can join by this code now. Press CREATE SQUAD again, or use the manual connection below.':squadMessage('expired'));return;}
  if(this.squad!==q||this.pc!==q.pc||this.connected)return;q.misses=0;
  // Build 41: the code is kept past the answer (`stage`): 'direct' while the first, direct attempt runs, 'relay' for the second.
  if(r.state==='answer'){if(!second)q.stage='direct';this.exchanged=true;try{await q.pc.setRemoteDescription({type:'answer',sdp:r.answer});}catch{if(this.squad===q){this.squad=null;q.service.done(q.code,q.key);}this.status('Your teammate’s page sent something that is not a connection. Press CREATE SQUAD again.');this.onSquad?.('failed');return;}
   if(this.squad!==q||this.pc!==q.pc||this.connected)return;this.squadWatch(q,q.pc);if(!second){this.status('Teammate found. Connecting… this can take up to 30 seconds.');this.onSquad?.('answer');}
   if(q.pc.connectionState==='failed')this.squadFailed(q,q.pc);return;}
  if(second){if(Date.now()>q.until)this.relayOver(q,'guest-silent');else this.squadAsk(SQUAD.relayPoll);return;}
  if(r.state==='joining'){if(q.state!=='joining'){q.state='joining';q.joinedAt=Date.now();this.status('Someone entered your code. Waiting for their page…');this.onSquad?.('joining');}
   else if(Date.now()-q.joinedAt>SQUAD.joinWait){this.squad=null;q.service.cancel(q.code,q.key);this.status('Someone entered your code but their page never finished joining, and a code works once. Press CREATE SQUAD for a new code.');this.onSquad?.('failed');return;}}
  this.squadAsk();}
 // The joiner: the code fetches the host's description (and uses the code up), the answer goes back by the service.
 async joinSquad(service,text){const c=readSquadCode(text);if(!c.ok)throw new SquadError(c.reason,c.message);this.status(`Looking for squad ${c.code}…`);const r=await service.join(c.code);
  const pc=this.setup('guest'),q=this.squad={code:c.code,ticket:r.ticket,service,pc,guest:true,stage:'direct',misses:0};
  try{try{await pc.setRemoteDescription({type:'offer',sdp:r.offer});}catch{throw new SquadError('refused','The squad service returned something that is not a connection. Ask the host to create a new code.');}
   await pc.setLocalDescription(await pc.createAnswer());await this.gathered(pc);if(this.pc!==pc)throw new Error('Connection setup cancelled.');
   await service.answer(c.code,r.ticket,pc.localDescription.sdp);if(this.pc!==pc)throw new Error('Connection setup cancelled.');}catch(e){if(this.squad===q)this.squad=null;throw e;}
  if(this.squad===q&&!this.connected){this.squadWatch(q,pc);this.status(`Squad ${c.code} found. Connecting… this can take up to 30 seconds.`);if(pc.connectionState==='failed')this.squadFailed(q,pc);}return c.code;}
 // A code still waiting when this page lets go of it (a new code, a reload, DISCONNECT) is taken back from the service.
 leaveSquad(){const q=this.squad;clearTimeout(this.squadTimer);this.squadTimer=null;this.squad=null;if(q&&!q.guest)q.service.cancel(q.code,q.key);}
 // ---- Build 41: the relay (NET-01). A squad code's connection is tried directly first, with no relay in it: the relay is
 // not contacted, and the connection does not know of it. Only when that attempt has failed (the browser says the
 // connection failed, or SQUAD.directWait has passed since the descriptions were exchanged and the channel is not open)
 // does each page ask the squad service for a pass to the relay, and the two exchange a second pair of descriptions
 // through the service for a new connection that knows the relay as well as the direct ways. The first connection is
 // kept until the second is ready to be made: if it comes up in the meantime it is the one used, and the relay is left
 // alone. In the second attempt the browser still takes a direct way if one works (it ranks them above the relay);
 // `route` says which way it took. The long codes (host, join, accept) have no service and so no relay: they are direct only.
 squadWatch(q,pc){clearTimeout(this.timer);this.exchanged=true;const second=q.stage==='relay';this.timer=setTimeout(()=>{if(this.squad!==q||this.pc!==pc||this.connected)return;if(second)this.relayOver(q,this.relayVerdict(pc));else this.relayBegin(q);},second?SQUAD.relayWait:SQUAD.directWait);}
 squadFailed(q,pc){if(q.stage==='direct')this.relayBegin(q);else if(q.stage==='relay'&&q.pc===pc&&this.exchanged)this.relayOver(q,this.relayVerdict(pc));}
 relayBegin(q){if(this.squad!==q||q.stage!=='direct'||this.connected)return;q.stage='asking';clearTimeout(this.timer);this.status(RELAY_TRYING);this.onSquad?.('relay');if(q.guest)this.relayGuest(q);else this.relayHost(q);}
 // A pass, asked for once more if the service missed the first asking.
 async relayPass(q,who){try{return await q.service.relay(q.code,who);}catch(e){if(e.reason!=='unreachable'||this.squad!==q||this.connected)throw e;return await q.service.relay(q.code,who);}}
 // The host: a pass, a new connection that knows the relay, its description to the service, then the joiner's answer.
 async relayHost(q){let pass;try{pass=await this.relayPass(q,{key:q.key});}catch(e){this.relayOver(q,relayReason(e));return;}
  if(this.squad!==q||this.connected)return;   // the direct attempt came up while the pass was fetched: the relay is not needed
  const pc=this.swap(pass.iceServers);q.pc=pc;q.stage='relay';this.bind(pc.createDataChannel('dustline',{ordered:true}));
  try{await pc.setLocalDescription(await pc.createOffer());await this.gathered(pc,true);if(this.squad!==q||this.pc!==pc)return;await q.service.retry(q.code,q.key,pc.localDescription.sdp);}
  catch(e){if(this.squad===q&&this.pc===pc)this.relayOver(q,e instanceof SquadError?relayReason(e):'relay-failed');return;}
  if(this.squad!==q||this.pc!==pc)return;q.misses=0;q.until=Date.now()+SQUAD.relayWait;this.squadAsk(SQUAD.relayPoll);}
 // The joiner: a pass of its own, asked for while the host prepares, and the service asked for the host's second
 // description. A joiner that gets no pass still answers: the host's relay address can carry both.
 relayGuest(q){q.pass=this.relayPass(q,{ticket:q.ticket}).then(p=>p.iceServers,e=>{q.fault=relayReason(e);return null;});q.misses=0;q.until=Date.now()+SQUAD.relayWait;this.squadNext(q);}
 async squadNext(q){if(this.squad!==q||this.connected)return;const again=()=>{clearTimeout(this.squadTimer);this.squadTimer=setTimeout(()=>this.squadNext(q),SQUAD.relayPoll);};let r;
  try{r=await q.service.next(q.code,q.ticket);}catch(e){if(this.squad!==q||this.connected)return;if(e.reason==='unreachable'&&++q.misses<SQUAD.lost){again();return;}
   await q.pass;this.relayOver(q,e.reason==='unreachable'?'relay-unreachable':e.reason==='relay-unset'?'relay-unset':q.fault||'host-stopped');return;}
  if(this.squad!==q||this.connected)return;q.misses=0;
  if(r.state==='offer'){const relay=await q.pass;if(this.squad!==q||this.connected)return;const pc=this.swap(relay);q.pc=pc;q.stage='relay';
   try{await pc.setRemoteDescription({type:'offer',sdp:r.offer});await pc.setLocalDescription(await pc.createAnswer());await this.gathered(pc,!!relay);if(this.squad!==q||this.pc!==pc)return;await q.service.answer(q.code,q.ticket,pc.localDescription.sdp);}
   catch(e){if(this.squad===q&&this.pc===pc)this.relayOver(q,e instanceof SquadError?relayReason(e):'relay-failed');return;}
   if(this.squad!==q||this.pc!==pc||this.connected)return;this.squadWatch(q,pc);if(pc.connectionState==='failed')this.squadFailed(q,pc);return;}
  // No relay is set up at all: the host's page has met the same answer, and there is nothing to wait for.
  if(q.fault==='relay-unset'||Date.now()>q.until){this.relayOver(q,q.fault||'host-stopped');return;}
  again();}
 // The second attempt is over without a connection: said once, in its own words.
 relayOver(q,reason){if(this.squad!==q)return;this.squad=null;clearTimeout(this.timer);clearTimeout(this.squadTimer);if(!q.guest)q.service.done(q.code,q.key);
  // The connection that did not come up is put away: a late word from it must not be taken for a new failure.
  const pc=this.pc,mine=hasRelay(pc?.localDescription),theirs=hasRelay(pc?.remoteDescription);this.failure=reason;this.shut();
  this.status(RELAY_FAILURE[reason]+(reason==='relay-failed'&&mine!==theirs?` (${mine?'Your teammate’s page':'This page'} was given no relay address.)`:''));this.onSquad?.('failed');}
 relayVerdict(pc){return hasRelay(pc.localDescription)||hasRelay(pc.remoteDescription)?'relay-failed':'relay-blocked';}
 // Which way a connection took, by the browser's own account: 'relay' when either end of the chosen pair is the relay's.
 async routeOf(pc){try{const all=[];(await pc.getStats()).forEach(s=>all.push(s));const by=id=>all.find(s=>s.id===id),t=all.find(s=>s.type==='transport'&&s.selectedCandidatePairId),pair=t?by(t.selectedCandidatePairId):all.find(s=>s.type==='candidate-pair'&&(s.selected||s.nominated&&s.state==='succeeded'));
  if(!pair)return'unknown';return[by(pair.localCandidateId),by(pair.remoteCandidateId)].some(c=>c?.candidateType==='relay')?'relay':'direct';}catch{return'unknown';}}
 send(message){if(!this.connected||this.channel?.readyState!=='open'||this.channel.bufferedAmount>200000)return false;this.channel.send(JSON.stringify(message));return true;}
}
