// Build 07 item 5: Escape vs Safari fullscreen/pointer lock. Safari (and Chromium/Firefox) handle Escape in fullscreen
// before the page sees it, so the game must not rely on it: P pauses/resumes and frees the cursor without leaving
// fullscreen; the pause panel can re-enter fullscreen. Browser behaviour is modelled in tests/sprint-harness.mjs from
// the WebKit 7621.2.5.11.8 (Safari 18.5) and Chromium sources. This is a headless model, not a Safari playtest.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame, flush, projectRoot} from './sprint-harness.mjs';
const html=fs.readFileSync(new URL('dist/index.html',projectRoot),'utf8'),js=fs.readFileSync(new URL('dist/game.js',projectRoot),'utf8');
const results=[];async function check(name,fn){await fn();results.push(name);}
async function deployed({fullscreen=true,role=null}={}){const g=await createGame();g.setLockPolicy('grant');g.peer.connected=!!role;g.peer.role=role;g.setMode(role?'coop':'story');g.reset();if(fullscreen)await g.el('fullscreen').onclick();g.lock();await flush();assert.equal(g.state().state,'playing');return g;}
const locked=g=>!!g.doc.pointerLockElement;
await check('P pauses in fullscreen, frees the cursor, keeps fullscreen (solo and co-op host)',async()=>{
 for(const role of [null,'host']){const g=await deployed({role});g.press('KeyP');await flush();
  assert.equal(g.state().state,'paused');assert(!locked(g),'cursor free');assert(g.doc.fullscreenElement,'fullscreen kept');assert.equal(g.calls.exitFullscreen,0);assert(!g.el('pause').hidden);}
});
await check('P while paused resumes (requests pointer lock) and play continues in fullscreen',async()=>{
 const g=await deployed();g.press('KeyP');await flush();const n=g.calls.requestPointerLock;g.press('KeyP');await flush();
 assert.equal(g.calls.requestPointerLock,n+1,'P requested capture');assert.equal(g.state().state,'playing');assert(locked(g));assert(g.doc.fullscreenElement);
});
await check('held P (auto-repeat) does not toggle pause/resume',async()=>{
 const g=await deployed();g.press('KeyP');await flush();const n=g.calls.requestPointerLock;g.press('KeyP',{repeat:true});await flush();assert.equal(g.state().state,'paused');assert.equal(g.calls.requestPointerLock,n,'no capture from auto-repeat');
});
await check('Safari Esc in fullscreen (browser exits both, no keydown): game pauses, explains, P resumes',async()=>{
 const g=await deployed();const r=g.safariEscape();await flush();assert.deepEqual(r,{locked:true,fs:true,keydownDelivered:false});
 assert.equal(g.state().state,'paused');assert(!g.el('pause').hidden);assert.equal(g.calls.exitFullscreen,0,'game never exits fullscreen itself');
 assert.match(g.el('pause-hint').textContent,/Esc/);assert.match(g.el('pause-hint').textContent,/\bP\b/);
 assert.equal(g.el('fullscreen').textContent,'FULLSCREEN');assert.equal(g.el('pause-fullscreen').textContent,'FULLSCREEN');
 g.press('KeyP');await flush();assert.equal(g.state().state,'playing');assert.equal(g.el('pause-hint').textContent,'');
});
await check('Safari Esc windowed (keydown delivered after unlock) pauses',async()=>{
 const g=await deployed({fullscreen:false});g.safariEscape();await flush();assert.equal(g.state().state,'paused');assert(!g.el('pause').hidden);
});
await check('pause panel re-enters fullscreen without resuming or leaving the pause',async()=>{
 const g=await deployed();g.chromiumEscape();await flush();assert(!g.doc.fullscreenElement);
 await g.el('pause-fullscreen').onclick();assert(g.doc.fullscreenElement);assert.equal(g.state().state,'paused');assert.equal(g.el('pause-fullscreen').textContent,'EXIT FULLSCREEN');
});
await check('window blur from a fullscreen transition does not abort a capture; a real blur still pauses',async()=>{
 const g=await deployed();g.press('KeyP');await flush();await g.el('pause-fullscreen').onclick();await g.el('pause-fullscreen').onclick();
 g.setLockPolicy('pending');g.el('resume').onclick();assert.equal(g.state().state,'capturing');g.fireWin('blur');assert.equal(g.state().state,'capturing','transition blur ignored');
 const g2=await deployed({fullscreen:false});g2.fireWin('blur');assert.equal(g2.state().state,'paused','ordinary blur pauses');
});
await check('refused re-capture after a successful one says retry, not "open in a full browser"',async()=>{
 const g=await deployed({fullscreen:false});g.chromiumEscape();await flush();g.setLockPolicy('deny');g.el('resume').onclick();await flush();
 assert.equal(g.state().state,'paused');assert.notEqual(g.el('capture-title').textContent,'Open in a full browser');assert.match(g.el('capture-message').textContent,/\bP\b/);
});
await check('no UI text advertises Escape as pause',async()=>{
 const controls=html.match(/<div id="controls">(.*?)<\/div>/)[1];assert(!/ESC/i.test(controls),'controls strip: '+controls);assert(/P Pause/.test(controls));
 const g=await deployed();assert(!/Escape|Esc\b/.test(g.el('capture-message').textContent),'capture message: '+g.el('capture-message').textContent);
});
await check('game code exits fullscreen only from the explicit toggle',async()=>{
 assert.equal((js.match(/exitFullscreen\(/g)||[]).length,1);assert(/function toggleFullscreen\(\)\{[^\n]*exitFullscreen\(\)/.test(js));
});

await check('Build 06 behaviour is gone: Escape is not the advertised pause and has no dead handler', async()=>{
 assert(!/e\.code==='Escape'\)\{pause\(\);return;\}/.test(js),'unreachable Escape branch removed');
 assert(!/ESC Pause|Escape or P/.test(html+js));
});
console.log(JSON.stringify({passed:results.length,checks:results,limitations:['Browser behaviour is modelled from WebKit/Chromium source, not observed in Safari; the user must confirm in Safari 18.5.']},null,2));
