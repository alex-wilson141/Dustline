import fs from 'node:fs';
import assert from 'node:assert/strict';
// Run either from the project tests/ directory or from this task's work/ directory.
export const projectRoot=new URL(fs.existsSync(new URL('../dist/game.js',import.meta.url))?'../':'../outputs/dustline/',import.meta.url);
const Three=await import(new URL('dist/three.module.js',projectRoot));
const noop=()=>{};
// Exercise the actual game module, including its movement/collision/camera/network code.
// Only browser rendering, assets, audio, AI and mission completion are substituted.
// The production source is never edited by this harness.
export async function createGame({sourcePath=new URL('dist/game.js',projectRoot),models=false}={}){
 // Build 38: the models (bodies, arms, weapons) are looks and arrive when they arrive: a suite gets them only if it asks (`models: true`).
 const modelsModule=await import(new URL('dist/models.js',projectRoot)).catch(()=>null);if(modelsModule?.MODELS)modelsModule.MODELS.auto=!!models;
 const ctx=new Proxy({createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
 const elements=new Map(),docL=new Map(),winL=new Map();
 // Every addEventListener is kept (arrays), like a browser; api.listeners.get(event) still returns a dispatcher for old suites.
 const add=m=>(event,fn,opts)=>{if(!m.has(event))m.set(event,[]);m.get(event).push(fn);opts?.signal?.addEventListener('abort',()=>{const l=m.get(event),i=l.indexOf(fn);if(i>=0)l.splice(i,1);});},   // a listener given a signal is taken off when it aborts, as in a browser (Build 32)
fire=(m,event,arg={})=>{for(const fn of m.get(event)||[])fn(arg);};
 const calls={requestPointerLock:0,exitPointerLock:0,requestFullscreen:0,exitFullscreen:0};let lockPolicy='noop';
 function element(){const classes=new Set();return {style:{},classList:{toggle(k,v){v??=!classes.has(k);if(v)classes.add(k);else classes.delete(k)},add:k=>classes.add(k),remove:k=>classes.delete(k),contains:k=>classes.has(k),toString:()=>[...classes].sort().join(' ')},appendChild:noop,setAttribute:noop,getContext:()=>ctx,value:'0.8',checked:false,dataset:{},width:256,height:256,hidden:false};}
 // Each instance gets its own document/window, passed into game.js below, so co-op tests with a host and a guest
 // instance never write into each other's DOM. The globals still point at the newest instance for imported modules.
 // Fullscreen and pointer-lock spies. Default lock policy 'noop' keeps older suites unchanged; tests can grant, deny or leave pending.
 const docEl=element();
 const doc=globalThis.document={getElementById:id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);},createElement:element,querySelectorAll:()=>[],body:element(),documentElement:docEl,addEventListener:add(docL),pointerLockElement:null,fullscreenElement:null,
  exitPointerLock(){calls.exitPointerLock++;if(this.pointerLockElement){this.pointerLockElement=null;fire(docL,'pointerlockchange');}},
  async exitFullscreen(){calls.exitFullscreen++;this.fullscreenElement=null;fire(docL,'fullscreenchange');}};
 docEl.requestFullscreen=async()=>{calls.requestFullscreen++;doc.fullscreenElement=docEl;fire(docL,'fullscreenchange');};
 const win=globalThis.window={addEventListener:add(winL)};globalThis.innerWidth=1200;globalThis.innerHeight=750;globalThis.devicePixelRatio=1;globalThis.requestAnimationFrame=noop;
 // Asset URLs the game requests are recorded (DEPLOY-01 checks that each carries its content hash).
 const assetRequests=[];Three.TextureLoader.prototype.load=function(url,onLoad){if(String(url).startsWith('blob:')||String(url).startsWith('data:')){const t=new Three.Texture();if(onLoad)queueMicrotask(()=>onLoad(t));return t;}assetRequests.push(url);return new Three.Texture()}; // a model's own pictures (Build 22) are part of its file, not requests
 globalThis.self??=globalThis;
 globalThis.fetch=async path=>{assetRequests.push(path);const file=new URL('dist/'+String(path).split('?')[0],projectRoot);if(!fs.existsSync(file))return {ok:false,status:404};const data=fs.readFileSync(file);return {ok:true,status:200,json:async()=>JSON.parse(data.toString('utf8')),arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)};};
 class Renderer{constructor(){this.domElement=element();const d=this.domElement;d.requestPointerLock=()=>{calls.requestPointerLock++;if(lockPolicy==='grant'){queueMicrotask(()=>{doc.pointerLockElement=d;fire(docL,'pointerlockchange');});return Promise.resolve();}if(lockPolicy==='deny'){queueMicrotask(()=>fire(docL,'pointerlockerror'));return Promise.reject(new Error('The user has exited the lock before this request was completed.'));}if(lockPolicy==='pending')return new Promise(noop);};this.shadowMap={};this.capabilities={getMaxAnisotropy:()=>8};this.info={render:{calls:0,triangles:0}};d.remove=()=>{d.removed=true;};}dispose(){this.disposed=true;}forceContextLoss(){this.lost=true;}setSize(){}setPixelRatio(){}render(){this.renders=(this.renders||0)+1;}}
 class RGBELoader{load(url){assetRequests.push(url);}}
 let source=fs.readFileSync(new URL(sourcePath,import.meta.url),'utf8');
 const parameters=['document','window'],values=[doc,win],live=[];   // `live`: an imported name and its module, read again whenever the game is booted (a module's `let` exports follow the map)
 for(const match of source.matchAll(/^import (.*) from '(.*)';$/gm)){
  const [,spec,path]=match;
  if(spec==='* as THREE'){parameters.push('THREE');values.push({...Three,WebGLRenderer:Renderer});continue;}
  const imported=await import(new URL('dist/'+path,projectRoot));
  for(const name of spec.slice(1,-1).split(',').map(s=>s.trim())){parameters.push(name);values.push(name==='RGBELoader'?RGBELoader:imported[name]);live.push([values.length-1,imported,name]);}
 }
 source=source.replace(/^import .*;$/gm,'');
 const SNIPPET=`
 const originalBlocked=blocked, originalGroundY=groundY;
 const harnessMessages=[];
 const harnessSounds=[],harnessHeard=[];
 const originalTickAI=tickAI,originalMissionTick=missionTick;
 tickAI=()=>{};missionTick=()=>{};sound=(type,vol,how)=>{harnessSounds.push(type);if(how)harnessHeard.push({type,vol,...how});};
 for(const a of actors)a.animate=()=>{};
 if(!peer.__custom)peer.send=m=>harnessMessages.push(structuredClone(m));
 const originalAnimate=viewmodel.animate;
 let lastAnimation={};viewmodel.animate=p=>{lastAnimation={...p};originalAnimate(p);};
 return {player,camera,gun,viewmodel,weapon,remoteWeapon,remote,actors,solids,keys,move,frame,receive,networkTick,peer,setClass,setMode,reset,pause,goMenu,lock,start,renderer,visible,
   state:()=>({state,elapsed,yaw,pitch,aim,crouch,trigger,healing,jumpY,walk,hostPaused,stamina:typeof stamina==='undefined'?undefined:stamina,...lastAnimation}),
   set(o){if('yaw'in o)yaw=o.yaw;if('pitch'in o)pitch=o.pitch;if('aim'in o)aim=o.aim;if('crouch'in o)crouch=o.crouch;if('trigger'in o)trigger=o.trigger;if('healing'in o)healing=o.healing;if('hostPaused'in o)hostPaused=o.hostPaused;if('hp'in o)hp=o.hp;},
   clearLane(){blocked=()=>false;},restoreWorld(){blocked=originalBlocked;},blocked:(x,z)=>blocked(x,z),groundY:(x,z)=>groundY(x,z),
   play(){setState('playing');document.pointerLockElement=renderer.domElement;hasPointerLock=true;},
   messages:harnessMessages,getLast:()=>last,getClass:()=>current(),getStage:()=>stage,
   // typeof guards keep the harness able to load older builds for baseline comparisons.
   built:typeof built==='undefined'?undefined:built,scene,effects,hitScan,applyQuality,sounds:harnessSounds,heard:harnessHeard,squadService:typeof squadService==='object'?squadService:undefined,models:typeof askModels==='function'?{bodies:()=>bodies,asked:()=>modelsAsked,ask:askModels,dress}:undefined,kills:()=>kills,aiHit:typeof aiHit==='function'?aiHit:undefined,autoQuality:typeof autoQuality==='object'?autoQuality:undefined,quality:()=>({renderScale,qualityMode:typeof qualityMode==='string'?qualityMode:undefined}),
   occluders,ground,restoreAI(){tickAI=originalTickAI;missionTick=originalMissionTick;},resetNav:typeof navEdge!=='undefined'?()=>{navGrid=null;navEdge=null;navComp=null;coverCache=null;}:undefined,fx:typeof fx==='object'?fx:undefined,
   ai:typeof enemyPlan==='function'?{director:()=>director,coverTable,coverQuery,safeSpot,segClear,pathTo,navigationGrid,navComp:()=>navComp,setStage:v=>{stage=v;},humanEyes,objectivePoint,target,extract,intel,startPatrol:typeof startPatrol==='function'?startPatrol:undefined,startTravel:typeof startTravel==='function'?startTravel:undefined,finish,missionTick:(dt)=>missionTick(dt),aiRng:()=>aiRng}:undefined,decalFor:typeof decalFor==='function'?decalFor:undefined,terrainAt:typeof terrainAt==='function'?terrainAt:undefined,
   // Build 09 Ambush internals (typeof-guarded so older builds still load).
   amb:typeof amb==='object'?amb:undefined,arenaWalls:typeof arenaWalls==='object'?arenaWalls:undefined,ambush:typeof ambushTick==='function'?{tick:ambushTick,kill:typeof ambushKill==='function'?ambushKill:undefined,ways:typeof WAY_ORDER==='object'?WAY_ORDER:undefined,tokens:typeof assignTokens==='function'?assignTokens:undefined,setKind:typeof setKind==='function'?setKind:undefined,spot3:typeof ambushSpot3==='function'?ambushSpot3:undefined,leave:typeof leave==='function'?leave:undefined,leaveAsked:typeof leaveAt==='number'?()=>leaveAt>=0:undefined,openGate:typeof ambushOpenGate==='function'?ambushOpenGate:undefined,inside:typeof arenaIn==='function'?arenaIn:undefined,field:typeof ambushField==='function'?ambushField:undefined,flankWays:typeof FLANK_WAYS==='object'?FLANK_WAYS:undefined,pushWays:typeof PUSH_WAYS==='object'?PUSH_WAYS:undefined,layers:typeof LAYERS==='object'?LAYERS:undefined,front:typeof ambushFront==='function'?ambushFront:undefined,held:typeof ambHeld==='object'?ambHeld:undefined,bearing:typeof ambushBearing==='function'?ambushBearing:undefined,wire:typeof ambushWire==='function'?ambushWire:undefined,apply:typeof ambushApply==='function'?ambushApply:undefined,director:ambushDirector,interact:ambushInteract,buyAmmo:typeof ambushBuyAmmo==='function'?ambushBuyAmmo:undefined,buyDressing:typeof ambushBuyDressing==='function'?ambushBuyDressing:undefined,keys:typeof KEYS==='object'?KEYS:undefined,bandages:()=>bandages,now:typeof ambushNow==='function'?ambushNow:undefined,drawMap:typeof drawMap==='function'?drawMap:undefined,marks:()=>amb.marks,mapLayout:typeof ambushMapLayout==='function'?ambushMapLayout:undefined,drawBigMap:typeof ambushDrawMap==='function'?ambushDrawMap:undefined,toggleMap:typeof ambushToggleMap==='function'?ambushToggleMap:undefined,mapOpen:()=>!!amb.mapOpen,decide:ambushDecide,near:ambushNear,prompt:ambushPrompt,spots:ambushSpots,spawnSpot:ambushSpawnSpot,startWave,waveCleared,hud:ambushHud,finish,gunId:()=>gunId,gunConfig,aiT,weapon:()=>weapon,hp:()=>hp,setHp:v=>{hp=v;}}:undefined,
   // Build 17: the AI squad choice.
   squad:typeof squadPref==='object'?{pref:squadPref,active:()=>squadActive,wanted:squadWanted,note:squadNote,ui:squadUI,hostSquad:()=>hostSquad,scale:ambushScale,order:()=>order}:undefined,
   // Build 29: glass.
   glass:typeof GLASS!=='undefined'&&GLASS?{pieces:typeof PIECES==='object'?PIECES:undefined,G:GLASS,break:glassBreak,visible,clear,sees,bodies:glassBodies,blast:typeof blast==='function'?blast:undefined,effects}:undefined,
   // Build 24: height (a map with a space).
   height:typeof SPACE!=='undefined'?{space:SPACE,settle:()=>{grounded=true;vy=0;climbing=null;mantling=null;},drop:()=>{grounded=false;vy=0;peakY=player.y;},grounded:()=>grounded,pulling:()=>!!mantling,climbing:()=>!!climbing,mustCrouch:()=>mustCrouch,on:()=>stoodOn,lastFall:()=>lastFall,eyeStep:()=>typeof eyeStep==='number'?eyeStep:0}:undefined,
   // Build 20: the session, down and revive.
   fall:typeof fallen==='object'?{fallen,REVIVE,reviveTarget,reviving,reviveKey,held:()=>reviveHeld,mateReviving:()=>mateReviving,tick:fallTick,raise,line:fallLine,wire:fallWire,humanDown,lobby,skirmishCoop:()=>skirmishCoop,BODY,boxEntry,LINKABLE}:undefined,
   // Build 19: equipment.
   hud:typeof panelState==='function'?{state:panelState,draw:panelDraw,gun:()=>gunId,dressings:()=>bandages,setDressings:v=>{bandages=v;}}:undefined,
   equip:typeof sidearm==='object'?{sidearm,remoteSide,kit,remoteKit,slot:()=>slot,remoteSlot:()=>remoteSlot,drawing:()=>drawing,item:()=>item,setItem:k=>{item=k;},cooking:()=>cooking,blind:()=>blind,hand,handConfig,swap:swapWeapon,knife,knifeScan,cookStart,cookEnd,throwItem,nades,smokes,nadePool,smokePool,blastPool,nadeAdvance,detonate,blast,flashBurst,clear,mateNow,buyItem:ambushBuyItem,gearLine:typeof gearLine==='function'?gearLine:undefined,equipReset,tick:equipTick,remoteDraw:()=>remoteDraw}:undefined,
   // Build 18: fairness between host and guest.
   fair:typeof rewind==='function'?{NETVIEW,viewAt,history:viewHistory,rewind,viewTime,record:viewRecord,remoteFire,credit:()=>remoteCredit,setCredit:v=>{remoteCredit=v;},creditCap,matePaused:()=>matePaused,spectatorCamera,SPECTATE,pickPrey:ambushPickPrey,bearing:ambushBearing,setElapsed:v=>{elapsed=v;}}:undefined,
   // Build 16 co-op internals.
   gameMap:typeof WORLD==='object'?()=>WORLD.id:undefined,dispose:typeof dispose==='function'?dispose:undefined,changeMap:typeof changeMap==='function'?changeMap:undefined,dead:typeof dead==='boolean'?()=>dead:undefined,mateMap:typeof mateMap==='undefined'?undefined:()=>mateMap,rand:typeof rand==='function'?rand:undefined,
   coop:typeof ambushVote==='function'?{net,hosting,guesting,ambCoop,spectating,vote:ambushVote,choose:ambushChoose,down:ambushDown,wire:ambushWire,apply:ambushApply,bounds:ambushBounds,linkLost:ambushLinkLost,prey:ambushPrey,friendlyHit,friendlyDamage,humanEyes,shoot,updateDeploy,report:ambushCoopReport,remoteGun:()=>remoteGun,remoteClass:()=>remoteClass,mode:()=>mode,hp:()=>hp,classId:()=>classId,elapsed:()=>elapsed,tickAI:dt=>tickAI(dt),body:BODY}:undefined};
 `;
 // Each api gets the page's keys, spies and helpers. Build 32: the game is a function of the page (dustline(PAGE)); the
 // snippet above is put inside it, and the page can boot it again (a map change): page.boot() returns the new game's api.
 const decorate=api=>{
 api.press=(code,{repeat=false}={})=>{const ev={code,key:code,target:{tagName:'BODY'},repeat,preventDefault(){}};fire(docL,'keydown',ev);fire(winL,'keydown',ev);};
 api.release=code=>{fire(docL,'keyup',{code});fire(winL,'keyup',{code});};
 api.listeners={get:event=>docL.has(event)?arg=>fire(docL,event,arg):undefined};
 api.listenerCount=()=>[...docL.values(),...winL.values()].reduce((n,l)=>n+l.length,0);api.calls=calls;api.assetRequests=assetRequests;api.doc=doc;api.fireDoc=(e,a)=>fire(docL,e,a);api.fireWin=(e,a)=>fire(winL,e,a);api.setLockPolicy=v=>{lockPolicy=v;};
 // Browser Escape models. Safari 18.5 (WebKit EventHandler::internalKeyEvent): pointer lock is released first; in element
 // fullscreen WebKit then cancels fullscreen and never dispatches the keydown. Windowed, the keydown is dispatched.
 api.safariEscape=()=>{const locked=!!doc.pointerLockElement,fs=!!doc.fullscreenElement;if(locked)doc.pointerLockElement=null;if(fs)doc.fullscreenElement=null;if(!fs)api.press('Escape');if(locked)fire(docL,'pointerlockchange');if(fs)fire(docL,'fullscreenchange');return {locked,fs,keydownDelivered:!fs};};
 // Chromium (ExclusiveAccessManager) and Firefox (PresShell): one Esc exits both; the page gets no keydown.
 api.chromiumEscape=()=>{const locked=!!doc.pointerLockElement,fs=!!doc.fullscreenElement;doc.pointerLockElement=null;doc.fullscreenElement=null;if(locked)fire(docL,'pointerlockchange');if(fs)fire(docL,'fullscreenchange');return {locked,fs,keydownDelivered:false};};api.elements=elements;api.el=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
 let now=api.getLast();api.step=seconds=>api.frame(now+=seconds*1000);
 api.simulate=(seconds,fps)=>{const count=Math.round(seconds*fps);for(let i=0;i<count;i++)api.step(1/fps);};
 api.prepare=({role=null,clearLane=true,classId='assault'}={})=>{api.peer.connected=Boolean(role);api.peer.role=role;api.setMode(role?'coop':'story');api.setClass(classId);api.reset();api.play();if(clearLane)api.clearLane();else api.restoreWorld();api.player.set(0,0,0);api.camera.fov=70;api.messages.length=0;};
 return api;};
 let api;
 if(source.includes('/*#harness*/')){
  const page=win.dustlinePage={n:0,peer:null,busy:false,keep:null,game:null,pause:0},body=source.split('/*#page*/')[0].replace('/*#harness*/',SNIPPET)+'\nreturn dustline;';
  page.boot=()=>{page.n++;for(const [k,ns,name] of live)if(name!=='RGBELoader')values[k]=ns[name];const a=decorate(Function(...parameters,body)(...values)(page));a.page=page;return page.game=a;};
  api=page.boot();
 }else api=decorate(Function(...parameters,source+SNIPPET)(...values));
 assert.equal(await api.viewmodel.ready,true,'actual rifle asset is available');
 return api;
}
export const flush=()=>new Promise(r=>setTimeout(r,0));
