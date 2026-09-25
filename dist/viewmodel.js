import * as THREE from './three.module.js';
import {assetURL} from './build.js';
export function makeViewmodel(gun,{mat}){
 const oldParts=[...gun.children].filter(o=>o.isMesh);const loader=new THREE.TextureLoader();
 const group=new THREE.Group();group.position.y=.08;gun.add(group);
 const sleeve=mat('#777965'),glove=mat('#575c4d',{roughness:.85});
 function capsule(r,len,material){return new THREE.Mesh(new THREE.CapsuleGeometry(r,len,5,10),material);}
 const left=new THREE.Group(),right=new THREE.Group();gun.add(left,right);
 function hand(parent){const palm=capsule(.048,.05,glove);palm.scale.set(.9,1,.6);parent.add(palm);for(let i=0;i<4;i++){const finger=capsule(.012,.05,glove);finger.position.set((i-1.5)*.022,.04,-.025);finger.rotation.x=-.65;parent.add(finger);}const thumb=capsule(.016,.045,glove);thumb.position.set(.05,0,-.015);thumb.rotation.z=-.5;parent.add(thumb);const forearm=capsule(.067,.23,sleeve);forearm.position.set(.02,-.02,.19);forearm.rotation.x=Math.PI/2;parent.add(forearm);const cuff=new THREE.Mesh(new THREE.CylinderGeometry(.066,.065,.04,12),glove);cuff.position.set(.01,-.005,.05);cuff.rotation.x=Math.PI/2;parent.add(cuff);}
 hand(left);hand(right);left.position.set(-.025,-.01,-.33);right.position.set(.045,-.055,.055);left.rotation.z=.7;right.rotation.x=-.3;
 let model,mag,handle,drum,classId='assault',magBase,handleBase,roll=0,pitchOffset=0;const extra=new THREE.Group();group.add(extra);
 function colorTexture(file,srgb=false){const t=loader.load(assetURL('assets/rifle/'+file));if(srgb)t.colorSpace=THREE.SRGBColorSpace;return t;}
 const material=mat('#ffffff',{map:colorTexture('M4A1_Base_Color.png',true),normalMap:colorTexture('M4A1_Normal.png'),roughnessMap:colorTexture('M4A1_Roughness.png'),metalnessMap:colorTexture('M4A1_Metallic.png'),metalness:1,roughness:1});
 const ready=fetch(assetURL('assets/rifle/rifle.json')).then(r=>{if(!r.ok)throw new Error('Rifle asset unavailable');return r.json();}).then(data=>{model=new THREE.ObjectLoader().parse(data);model.traverse(o=>{if(o.isMesh){o.material=material;o.castShadow=false;o.receiveShadow=false;o.frustumCulled=false;}});group.add(model);mag=model.getObjectByName('Magazine');handle=model.getObjectByName('Charging_Handle');magBase=mag.position.clone();handleBase=handle.position.clone();oldParts.forEach(o=>o.visible=false);configure(classId);return true;}).catch(e=>{console.warn(e.message);return false;});
 function configure(id){classId=id;group.scale.z=id==='medic'?.83:id==='marksman'?1.15:1;extra.children.forEach(o=>{o.geometry.dispose();o.material.dispose();});extra.clear();drum=null;if(!model)return;mag.visible=id!=='support';if(id==='support'){drum=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.11,18),mat('#353832',{metalness:.5,roughness:.55}));drum.rotation.z=Math.PI/2;drum.position.set(0,-.15,-.05);extra.add(drum);}if(id==='marksman'){const optic=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.25,16,1,true),mat('#262c2a',{metalness:.5,roughness:.4}));optic.rotation.x=Math.PI/2;optic.position.set(0,.13,.015);extra.add(optic);}}
 const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
 function animate({reloadRemaining,reloadDuration,time,moving,running,aiming,jump,landing,dt}){
  const t=reloadRemaining>0?1-reloadRemaining/reloadDuration:0,tilt=reloadRemaining>0?smooth(t/.16)*(1-smooth((t-.85)/.15)):0;
  roll=THREE.MathUtils.damp(roll,-tilt*.55+(running?.2:0),14,dt);pitchOffset=THREE.MathUtils.damp(pitchOffset,-tilt*.32+jump*.02-landing*.7,14,dt);gun.rotation.z=roll;gun.rotation.x+=pitchOffset;
  let drop=0;if(t>.15&&t<.55)drop=smooth((t-.15)/.2);else if(t>=.55&&t<.82)drop=1-smooth((t-.55)/.27);
  if(mag){mag.position.copy(magBase);mag.position.y-=drop*.28;mag.position.z+=drop*.05;mag.rotation.x=drop*.25;mag.visible=classId!=='support'&&!(t>.42&&t<.54);handle.position.copy(handleBase);handle.position.z+=Math.sin(Math.max(0,Math.min(1,(t-.8)/.14))*Math.PI)*.07;}
  if(drum){drum.position.y=-.15-drop*.28;drum.visible=!(t>.42&&t<.54);}
  left.position.set(-.025-tilt*.02,-.01-drop*.26,-.33+tilt*.29);left.rotation.x=-tilt*.3;left.rotation.z=.7-tilt*.65;
  right.position.set(.045,-.055,.055);if(moving&&!aiming){left.position.y+=Math.sin(time*8)*.003;right.position.y+=Math.sin(time*8)*.003;}
 }
 return {ready,configure,animate,resetMotion(){roll=pitchOffset=0;},get loaded(){return !!model;}};
}
