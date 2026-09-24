import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGame,projectRoot} from './sprint-harness.mjs';
const g=await createGame();
let checks=0;
const results=[];
function close(a,b,eps=.002,message='values differ'){assert(Math.abs(a-b)<=eps,`${message}: ${a} vs ${b}`);}
function check(name,fn){fn();checks++;results.push(name);}
function distance2(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
function holdSprint(key='ShiftLeft'){g.press('KeyW');g.press(key);}
function finitePose(){assert(g.camera.position.toArray().every(Number.isFinite));assert(Number.isFinite(g.camera.fov));}

for(const fps of [15,30,60,120])check(`60 seconds uninterrupted sprint at ${fps} FPS`,()=>{
 g.prepare();holdSprint();let previous=g.player.clone();let movingFrames=0;
 for(let n=0;n<60*fps;n++){
  g.step(1/fps);assert.equal(g.state().running,true);assert.equal(g.state().stamina,undefined);
  close(distance2(g.player,previous),6.1/fps,.002,'sprint distance per frame');previous.copy(g.player);movingFrames++;finitePose();
 }
 close(-g.player.z,366,.01);close(g.state().elapsed,60,.001);close(g.camera.fov,76,.0001);
});

for(const classId of ['marksman','support','medic'])check(`unlimited sprint preserves ${classId} speed`,()=>{
 g.prepare({classId});holdSprint('ShiftRight');g.simulate(60,60);assert.equal(g.state().running,true);close(-g.player.z,60*6.1*g.getClass().speed,.01);
});

check('release and restart sprint, including right Shift',()=>{
 g.prepare();holdSprint();g.simulate(2,60);g.release('ShiftLeft');const a=g.player.clone();g.simulate(1,60);assert.equal(g.state().running,false);close(distance2(a,g.player),3.5);close(g.camera.fov,70,.005);
 g.press('ShiftRight');const b=g.player.clone();g.simulate(1,60);assert.equal(g.state().running,true);close(distance2(b,g.player),6.1);close(g.camera.fov,76,.005);
 g.release('KeyW');const c=g.player.clone();g.simulate(1,60);assert.equal(g.state().running,false);close(distance2(c,g.player),0);finitePose();
});

for(const fps of [15,30,60,120])check(`direction, diagonal normalization and forward gate at ${fps} FPS`,()=>{
 g.prepare();holdSprint();g.press('KeyD');g.simulate(2,fps);close(Math.hypot(g.player.x,g.player.z),12.2);close(g.player.x,-g.player.z);
 g.release('KeyD');g.set({yaw:Math.PI/2});const a=g.player.clone();g.simulate(1,fps);close(a.x-g.player.x,6.1);close(g.player.z,a.z);
 g.release('KeyW');g.press('KeyS');const b=g.player.clone();g.simulate(1,fps);assert.equal(g.state().running,false);close(g.player.x-b.x,3.5);
 g.release('KeyS');g.press('KeyA');const c=g.player.clone();g.simulate(1,fps);assert.equal(g.state().running,false);close(distance2(c,g.player),3.5);
});

const gates=[
 {name:'aim',start:()=>g.press('KeyF'),end:()=>g.press('KeyF'),speed:3.5*.68},
 {name:'crouch',start:()=>g.press('KeyC'),end:()=>g.press('KeyC'),speed:1.7},
 {name:'trigger',start:()=>g.set({trigger:true}),end:()=>g.set({trigger:false}),speed:3.5},
 {name:'reload',start:()=>{g.weapon.ammo--;g.press('KeyR')},end:()=>g.simulate(3,60),speed:3.5},
 {name:'heal',start:()=>{g.set({hp:50});g.press('KeyH')},end:()=>g.simulate(4,60),speed:3.5*.45},
];
for(const gate of gates)check(`existing ${gate.name} sprint gate preserved`,()=>{
 g.prepare();holdSprint();gate.start();const a=g.player.clone();g.simulate(.5,60);assert.equal(g.state().running,false);close(distance2(a,g.player),gate.speed*.5);
 gate.end();g.simulate(.25,60);assert.equal(g.state().running,true);
});

check('jump remains available after a minute of sprint and repeated landings',()=>{
 g.prepare();holdSprint();g.simulate(60,60);
 for(let i=0;i<4;i++){g.press('Space');g.step(1/60);assert(g.state().jumpY>0);g.release('Space');g.simulate(1,60);close(g.state().jumpY,0);assert.equal(g.state().running,true);}
});

for(const fps of [15,30,60,120])check(`actual map wall collision and sliding at ${fps} FPS`,()=>{
 g.prepare({clearLane:false});g.player.set(-5,g.groundY(-5,29),29);assert(!g.blocked(g.player.x,g.player.z));holdSprint();
 let previousZ=g.player.z;
 for(let n=0;n<5*fps;n++){g.step(1/fps);assert(g.player.z<=previousZ+.000001,'wall impact must not reverse player');assert(!g.blocked(g.player.x,g.player.z),'player must not enter solid');previousZ=g.player.z;}
 assert(g.player.z>=26.84-.000001&&g.player.z<27.1,'stops outside courtyard wall');
 const stopped=g.player.clone();g.simulate(2,fps);close(distance2(stopped,g.player),0);
 g.press('KeyD');const a=g.player.clone();g.simulate(.5,fps);assert(g.player.x>a.x+1.5);assert(!g.blocked(g.player.x,g.player.z));
});

for(const fps of [15,30,60,120])check(`existing terrain slope remains continuous at ${fps} FPS`,()=>{
 g.prepare({clearLane:false});g.player.set(70,g.groundY(70,65),65);holdSprint();let lastY=g.player.y;
 for(let n=0;n<6*fps;n++){g.step(1/fps);close(g.player.y,g.groundY(g.player.x,g.player.z),.000001);assert(Math.abs(g.player.y-lastY)<.025);lastY=g.player.y;finitePose();}
 close(g.player.z,65-36.6,.002);
});

check('irregular frames and 100–250ms stalls preserve elapsed movement',()=>{
 g.prepare();holdSprint();const times=[1/60,1/120,.1,1/30,.25,1/15,.18];let elapsed=0,n=0;
 while(elapsed<60-1e-9){const dt=Math.min(times[n++%times.length],60-elapsed);g.step(dt);elapsed+=dt;assert.equal(g.state().running,true);finitePose();}
 close(-g.player.z,366,.01);close(g.state().elapsed,60,.001);
});

check('long stalls are bounded to 250ms instead of teleporting',()=>{
 g.prepare();holdSprint();g.step(2);assert.equal(g.state().running,true);close(-g.player.z,6.1*.25,.001);close(g.state().elapsed,.25,.001);
 const a=g.player.clone();g.step(1/60);close(distance2(a,g.player),6.1/60,.001);
});

check('camera FOV transition agrees at 30, 60 and 120 FPS',()=>{
 const fovs=[];
 for(const fps of [30,60,120]){g.prepare();holdSprint();g.simulate(.2,fps);fovs.push(g.camera.fov);assert(g.camera.fov>70&&g.camera.fov<76);}
 close(Math.max(...fovs),Math.min(...fovs),.005);
});

check('camera and actual rifle pose agree across frame rates and settle after stopping',()=>{
 const poses=[];
 for(const fps of [15,30,60,120]){
  g.prepare();holdSprint();g.simulate(2,fps);
  poses.push([...g.camera.position.toArray(),...g.gun.position.toArray(),g.gun.rotation.x,g.gun.rotation.z]);
  g.release('KeyW');g.simulate(1,fps);const floor=g.groundY(g.player.x,g.player.z);close(g.camera.position.y,floor+1.7,.00001);finitePose();
 }
 for(const pose of poses.slice(1))for(let i=0;i<pose.length;i++)close(pose[i],poses[0][i],.0005,'camera/weapon pose at equal simulation time');
});

const coopPackets={};
for(const role of ['host','guest'])check(`co-op ${role} shares unlimited local movement and valid position messages`,()=>{
 g.prepare({role});holdSprint();g.simulate(60,30);close(-g.player.z,366,.01);assert.equal(g.state().running,true);
 const type=role==='host'?'snapshot':'pose',packets=g.messages.filter(m=>m.type===type);assert(packets.length>500);const packet=packets.at(-1),p=role==='host'?packet.host:packet.p;
 assert(p.every(Number.isFinite));close(p[0],g.player.x);close(p[2],g.player.z,1);assert(!JSON.stringify(packet).includes('stamina'));
 coopPackets[role]=structuredClone(packet);
});

check('co-op pose acceptance, teleport rejection and snapshot do not reset local movement',()=>{
 g.prepare({role:'host'});g.remote.g.position.set(0,0,0);g.receive({type:'pose',p:[0,0,-.61],yaw:0,crouch:false});close(g.remote.g.position.z,-.61);
 g.receive({type:'pose',p:[0,0,-.92],yaw:.2,crouch:true});assert.equal(g.remote.crouch,true);close(g.remote.g.rotation.y,.2);
 g.receive({type:'pose',p:[0,0,-50],yaw:0,crouch:false});close(g.remote.g.position.z,-.92);
 g.prepare({role:'guest'});holdSprint();g.simulate(1,60);const a=g.player.clone();const snapshot=coopPackets.host;snapshot.paused=false;g.receive(snapshot);close(distance2(a,g.player),0);g.simulate(1,60);close(distance2(a,g.player),6.1,.002);
 const b=g.player.clone();g.receive({...snapshot,seq:snapshot.seq+1,paused:true});g.simulate(1,60);close(distance2(b,g.player),0);
});

check('production runtime, interface and class data contain no stamina dependencies',()=>{
 for(const path of ['game.js','combat.js','index.html','style.css'])assert(!/stamina|exhaustion|recharge\s+delay/i.test(fs.readFileSync(new URL('dist/'+path,projectRoot),'utf8')),path+' has stale stamina code/text');
});

console.log(JSON.stringify({passed:checks,checks:results,limitations:['Headless production-code execution; no GPU rendering, browser pointer input, audio, visual feel or measured rendered FPS validated.','AI and mission progression disabled to isolate movement. Clear-lane endurance checks disable colliders; separate wall/slope checks use existing production colliders and terrain.','Co-op uses actual local movement and message generation/receive functions with an in-memory send collector; no real WebRTC connection, latency, jitter or second-browser test.']},null,2));
