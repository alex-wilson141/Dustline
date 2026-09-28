// Optional WebRTC data-only co-op. Signaling is exchanged by the players as two connection codes.
// Build 15 (COOP-01): the codes say what they are and how long they are, carry a checksum, survive whitespace and line
// breaks, and every way a code can be wrong has its own message; a pasted code is routed by what it is, not by which
// button was pressed; a network that cannot connect is reported as that, never as a wrong code.
import './build.js'; // DEPLOY-01 upgrade guard

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
export const NETWORK_FAILURE = 'The codes were right, but your two networks could not reach each other directly. This is a network limit, not a wrong code: DUSTLINE has no relay server. Try again with one of you on another network, for example a phone hotspot.';

export class CodeError extends Error { constructor(reason, message) { super(message); this.reason = reason; } }

export class PeerSquad {
 constructor({status,onReady,onMessage,onClose,onUnstable}){Object.assign(this,{status,onReady,onMessage,onClose,onUnstable});this.pc=null;this.channel=null;this.role=null;this.connected=false;this.myCode=null;this.offerId=null;this.exchanged=false;this.connectTimeout=30000;this.timer=null;this.unstable=false;this.graceTime=15000;this.grace=null;}
 close(notify=false){this.connected=false;this.unstable=false;this.exchanged=false;clearTimeout(this.timer);clearTimeout(this.grace);this.timer=this.grace=null;const pc=this.pc,ch=this.channel;this.pc=null;this.channel=null;if(ch){ch.onopen=ch.onclose=ch.onmessage=null;ch.close();}pc?.close();if(notify)this.onClose?.();}
 setup(role){this.close();this.role=role;this.myCode=null;this.offerId=null;const pc=this.pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});pc.onconnectionstatechange=()=>{if(this.pc!==pc)return;const s=pc.connectionState;
   // NET-04 (Build 16): 'disconnected' is often a hiccup that the browser repairs by itself. An open session is held
   // (unstable) for up to graceTime; only 'failed', 'closed', a closed channel or a hiccup that outlasts the grace ends it.
   if(s==='disconnected'&&this.connected){if(!this.unstable){this.unstable=true;this.status('Connection interrupted. Waiting for it to return…');this.onUnstable?.(true);clearTimeout(this.grace);this.grace=setTimeout(()=>{if(this.pc===pc&&this.unstable)this.drop();},this.graceTime);}return;}
   if(s==='connected'&&this.unstable){this.unstable=false;clearTimeout(this.grace);this.grace=null;this.status('Connection restored.');this.onUnstable?.(false);return;}
   // A failed or lost connection after the codes were exchanged is the network, and is said so.
   if(s==='failed'&&!this.connected&&this.exchanged)this.status(this.networkFailure());else if(s==='connecting')this.status('Codes accepted. Connecting…');else if(s!=='connected'&&s!=='new')this.status('Connection: '+s);
   if(['failed','disconnected','closed'].includes(s))this.drop();};pc.ondatachannel=e=>{if(this.pc!==pc){e.channel.close();return;}this.bind(e.channel);};return pc;}
 drop(){const was=this.unstable;this.connected=false;this.unstable=false;clearTimeout(this.timer);clearTimeout(this.grace);this.grace=null;if(was)this.onUnstable?.(false);this.onClose?.();}
 bind(channel){this.channel=channel;channel.onopen=()=>{if(this.channel!==channel)return;this.connected=true;clearTimeout(this.timer);this.status('Connected. Host can deploy the squad.');this.onReady?.(this.role);};channel.onclose=()=>{if(this.channel!==channel)return;this.drop();};channel.onmessage=e=>{if(this.channel!==channel)return;if(typeof e.data!=='string'||e.data.length>100000)return;try{const m=JSON.parse(e.data);if(m&&typeof m==='object'&&typeof m.type==='string')this.onMessage(m);}catch{}};}
 async gathered(pc){if(pc.iceGatheringState==='complete')return;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pc.removeEventListener('icegatheringstatechange',check);if(pc.localDescription?.sdp?.includes('candidate:'))resolve();else reject(new Error('This network gave the game no address to connect through. Try another browser or network.'));},12000);const check=()=>{if(pc.iceGatheringState==='complete'){clearTimeout(timer);pc.removeEventListener('icegatheringstatechange',check);resolve();}};pc.addEventListener('icegatheringstatechange',check);});}
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
 send(message){if(!this.connected||this.channel?.readyState!=='open'||this.channel.bufferedAmount>200000)return false;this.channel.send(JSON.stringify(message));return true;}
}
