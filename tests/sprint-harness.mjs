import fs from 'node:fs';
import assert from 'node:assert/strict';
// Run either from the project tests/ directory or from this task's work/ directory.
export const projectRoot=new URL(fs.existsSync(new URL('../dist/game.js',import.meta.url))?'../':'../outputs/dustline/',import.meta.url);
const Three=await import(new URL('dist/three.module.js',projectRoot));
const noop=()=>{};
// Exercise the actual game module, including its movement/collision/camera/network code.
// Only browser rendering, assets, audio, AI and mission completion are substituted.
// The production source is never edited by this harness.
export async function createGame({sourcePath=new URL('dist/game.js',projectRoot)}={}){
 const ctx=new Proxy({createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>(o[k]=v,true)});
 const elements=new Map(),listeners=new Map();
 function element(){const classes=new Set();return {style:{},classList:{toggle(k,v){v??=!classes.has(k);if(v)classes.add(k);else classes.delete(k)},remove:k=>classes.delete(k),contains:k=>classes.has(k)},appendChild:noop,setAttribute:noop,getContext:()=>ctx,value:'0.8',checked:false,dataset:{},width:256,height:256,hidden:false};}
 globalThis.document={getElementById:id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);},createElement:element,querySelectorAll:()=>[],body:element(),addEventListener:(event,fn)=>listeners.set(event,fn),pointerLockElement:null,exitPointerLock(){this.pointerLockElement=null;listeners.get('pointerlockchange')?.();}};
 globalThis.window={addEventListener:noop};globalThis.innerWidth=1200;globalThis.innerHeight=750;globalThis.devicePixelRatio=1;globalThis.requestAnimationFrame=noop;
 Three.TextureLoader.prototype.load=function(){return new Three.Texture()};
 globalThis.fetch=async path=>({ok:true,json:async()=>JSON.parse(fs.readFileSync(new URL('dist/'+path,projectRoot),'utf8'))});
 class Renderer{constructor(){this.domElement=element();this.domElement.requestPointerLock=noop;this.shadowMap={};this.capabilities={getMaxAnisotropy:()=>8};this.info={render:{calls:0,triangles:0}}}setSize(){}setPixelRatio(){}render(){}}
 class RGBELoader{load(){}}
 let source=fs.readFileSync(new URL(sourcePath,import.meta.url),'utf8');
 const parameters=[],values=[];
 for(const match of source.matchAll(/^import (.*) from '(.*)';$/gm)){
  const [,spec,path]=match;
  if(spec==='* as THREE'){parameters.push('THREE');values.push({...Three,WebGLRenderer:Renderer});continue;}
  const imported=await import(new URL('dist/'+path,projectRoot));
  for(const name of spec.slice(1,-1).split(',').map(s=>s.trim())){parameters.push(name);values.push(name==='RGBELoader'?RGBELoader:imported[name]);}
 }
 source=source.replace(/^import .*;$/gm,'');
 const api=Function(...parameters,source+`
 const originalBlocked=blocked, originalGroundY=groundY;
 const harnessMessages=[];
 const harnessSounds=[];
 tickAI=()=>{};missionTick=()=>{};sound=type=>harnessSounds.push(type);
 for(const a of actors)a.animate=()=>{};
 peer.send=m=>harnessMessages.push(structuredClone(m));
 const originalAnimate=viewmodel.animate;
 let lastAnimation={};viewmodel.animate=p=>{lastAnimation={...p};originalAnimate(p);};
 return {player,camera,gun,viewmodel,weapon,remoteWeapon,remote,actors,solids,keys,move,frame,receive,networkTick,peer,setClass,setMode,reset,pause,goMenu,renderer,
   state:()=>({state,elapsed,yaw,pitch,aim,crouch,trigger,healing,jumpY,walk,hostPaused,stamina:typeof stamina==='undefined'?undefined:stamina,...lastAnimation}),
   set(o){if('yaw'in o)yaw=o.yaw;if('aim'in o)aim=o.aim;if('crouch'in o)crouch=o.crouch;if('trigger'in o)trigger=o.trigger;if('healing'in o)healing=o.healing;if('hostPaused'in o)hostPaused=o.hostPaused;if('hp'in o)hp=o.hp;},
   clearLane(){blocked=()=>false;},restoreWorld(){blocked=originalBlocked;},blocked:(x,z)=>blocked(x,z),groundY:(x,z)=>groundY(x,z),
   play(){setState('playing');document.pointerLockElement=renderer.domElement;},
   messages:harnessMessages,getLast:()=>last,getClass:()=>current(),getStage:()=>stage,
   // typeof guards keep the harness able to load older builds for baseline comparisons.
   scene,effects,hitScan,applyQuality,sounds:harnessSounds,kills:()=>kills,aiHit:typeof aiHit==='function'?aiHit:undefined,autoQuality:typeof autoQuality==='object'?autoQuality:undefined,quality:()=>({renderScale,qualityMode:typeof qualityMode==='string'?qualityMode:undefined})};
 `)(...values);
 assert.equal(await api.viewmodel.ready,true,'actual rifle asset is available');
 api.press=code=>listeners.get('keydown')({code,target:{tagName:'BODY'},repeat:false,preventDefault(){}});
 api.release=code=>listeners.get('keyup')({code});
 api.listeners=listeners;api.elements=elements;api.el=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
 let now=api.getLast();api.step=seconds=>api.frame(now+=seconds*1000);
 api.simulate=(seconds,fps)=>{const count=Math.round(seconds*fps);for(let i=0;i<count;i++)api.step(1/fps);};
 api.prepare=({role=null,clearLane=true,classId='assault'}={})=>{api.peer.connected=Boolean(role);api.peer.role=role;api.setMode(role?'coop':'story');api.setClass(classId);api.reset();api.play();if(clearLane)api.clearLane();else api.restoreWorld();api.player.set(0,0,0);api.camera.fov=70;api.messages.length=0;};
 return api;
}
