import assert from 'node:assert/strict';
import {createGame} from './sprint-harness.mjs';

// A slow render frame must not send a burst of backfilled guest shots that
// the host rejects against one unadvanced weapon cooldown. Exercise the real
// production frame/input/receive functions, with the existing headless harness.
const g=await createGame();
let checks=0;
const results=[];
function close(a,b,message){assert(Math.abs(a-b)<1e-7,`${message}: ${a} vs ${b}`);}
function check(name,fn){fn();checks++;results.push(name);}
const automaticClasses=['assault','support','medic'];

for(const classId of automaticClasses)for(const role of [null,'host','guest'])check(`${classId} ${role||'solo'}: one automatic shot, full movement time in a 250 ms frame`,()=>{
 g.prepare({classId,role});
 const capacity=g.weapon.ammo;
 g.press('KeyW');g.set({trigger:true});
 g.step(.25);
 assert.equal(capacity-g.weapon.ammo,1,'automatic fire must not backfill shots after a stalled render');
 close(g.state().elapsed,.25,'simulation time');
 close(-g.player.z,3.5*g.getClass().speed*.25,'firing retains walking gate and full movement time');
 if(role==='guest')assert.equal(g.messages.filter(m=>m.type==='shot').length,1,'only one guest shot message per render');
});

for(const classId of automaticClasses)check(`${classId}: guest slow-frame shots are all accepted by host cooldown`,()=>{
 g.prepare({classId,role:'guest'});g.set({trigger:true});
 const frames=[];
 for(let i=0;i<8;i++){
  g.messages.length=0;g.step(.25);
  const shots=g.messages.filter(m=>m.type==='shot');
  assert.equal(shots.length,1,'no same-frame burst');frames.push(structuredClone(shots));
 }
 assert.equal(g.weapon.ammo,g.getClass().capacity-8,'guest spent one round per frame');
 g.prepare({classId,role:'host'});g.receive({type:'hello',classId});
 const initial=g.remoteWeapon.ammo;
 for(const shots of frames){g.step(.25);for(const shot of shots)g.receive(shot);}
 assert.equal(initial-g.remoteWeapon.ammo,8,'host accepts every normally spaced frame shot');
});

for(const classId of automaticClasses)for(const role of [null,'host','guest'])check(`${classId} ${role||'solo'}: immediate click and cooldown remain intact`,()=>{
 g.prepare({classId,role});const capacity=g.weapon.ammo;
 g.listeners.get('mousedown')({button:0,target:g.renderer.domElement});
 assert.equal(g.weapon.ammo,capacity-1,'mousedown still fires immediately');
 g.step(1/60);assert.equal(g.weapon.ammo,capacity-1,'same cooldown prevents a second early shot');
 g.step(.25);assert.equal(g.weapon.ammo,capacity-2,'held trigger fires once after cooldown on the next rendered frame');
 if(role==='guest')assert.equal(g.messages.filter(m=>m.type==='shot').length,2);
});

for(const role of [null,'host','guest'])check(`${role||'solo'}: reload and cooldown timers retain all substeps`,()=>{
 g.prepare({role});g.weapon.ammo--;g.press('KeyR');g.weapon.cooldown=1;g.set({trigger:true});
 const ammo=g.weapon.ammo;g.step(.25);
 close(g.weapon.reloadRemaining,g.getClass().reload-.25,'reload progresses through full frame');
 close(g.weapon.cooldown,.75,'cooldown progresses through full frame');
 assert.equal(g.weapon.ammo,ammo,'reload still prevents firing');
 if(role==='host'){g.remoteWeapon.cooldown=1;g.step(.25);close(g.remoteWeapon.cooldown,.75,'remote authoritative cooldown progresses');}
});

console.log(JSON.stringify({passed:checks,checks:results,limitations:[
 'Production frame/input/receive code exercised headlessly; no GPU, visual animation, live pointer capture, audio or browser rendering verified.',
 'Guest messages replayed through host receive with simulated 250 ms spacing; no real WebRTC transport, packet jitter or latency behavior verified.',
 'Automatic fire intentionally remains at most once per rendered frame; very slow rendering reduces firing cadence instead of backfilling shots.'
]},null,2));
