import * as THREE from './three.module.js';
import {assetURL} from './build.js'; // also the DEPLOY-01 upgrade guard
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
 // Build 19: the sidearm and the knife, from simple shapes (no asset exists for either). setSidearm swaps what is in hand.
 const steel=mat('#2b2e2d',{metalness:.65,roughness:.4}),grip=mat('#1d1f1e',{roughness:.8}),part=(w,h,d,x,y,z,m,parent)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=false;parent.add(o);return o;};
 const pistol=new THREE.Group();part(.03,.036,.2,0,.05,-.16,steel,pistol);part(.024,.018,.05,0,.03,-.27,steel,pistol);part(.028,.11,.046,0,-.02,-.075,grip,pistol).rotation.x=.22;part(.008,.014,.012,0,.075,-.25,steel,pistol);part(.02,.012,.012,0,.075,-.07,steel,pistol);pistol.position.set(.03,.0,.0);pistol.visible=false;gun.add(pistol);
 // Build 34: the knife is a blade (it was two boxes). A clip-point blade cut from a profile and ground to an edge all round (the
 // bevel of the extrusion: a flat of 2 mm between two ground faces), a fuller along each flat, a guard, an oval grip with four
 // rings, a pommel, and the gloved fist that holds it. Made once with the viewmodel; nothing is made when it is drawn.
 const blade=new THREE.Group();{const bright=mat('#d4d7d2',{metalness:.9,roughness:.22}),dark=mat('#4a4e4c',{metalness:.7,roughness:.45}),rubber=mat('#232624',{roughness:.9});
  const outline=new THREE.Shape();outline.moveTo(0,.017);outline.lineTo(.118,.017);outline.quadraticCurveTo(.15,.016,.196,-.004);outline.quadraticCurveTo(.16,-.018,.112,-.019);outline.lineTo(.012,-.019);outline.lineTo(.012,-.012);outline.lineTo(0,-.012);outline.closePath();
  const cut=new THREE.ExtrudeGeometry(outline,{depth:.0012,bevelEnabled:true,bevelThickness:.0019,bevelSize:.0105,bevelOffset:-.0105,bevelSegments:1,curveSegments:10});cut.translate(0,0,-.0006);cut.rotateY(Math.PI/2);
  const steelBlade=new THREE.Mesh(cut,bright);steelBlade.castShadow=false;blade.add(steelBlade);
  for(const side of [1,-1])part(.0006,.005,.1,side*.0024,.006,-.062,dark,blade);                                    // the fuller
  part(.011,.062,.012,0,-.002,.006,dark,blade);part(.013,.012,.016,0,.028,.006,dark,blade);                          // the guard and its upper quillon
  const round=(r0,r1,len,z,m,sx=.74)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(r0,r1,len,12),m);o.rotation.x=Math.PI/2;o.scale.x=sx;o.position.set(0,-.002,z);o.castShadow=false;blade.add(o);return o;};
  round(.0155,.0165,.104,.064,rubber);for(let i=0;i<4;i++)round(.0172,.0172,.005,.03+i*.023,grip);round(.0175,.0165,.012,.122,dark,.8);
  const fist=new THREE.Group();const palm=capsule(.03,.04,glove);palm.rotation.x=Math.PI/2;palm.scale.set(.8,1.15,1);fist.add(palm);for(let i=0;i<4;i++){const f=capsule(.0115,.03,glove);f.rotation.z=Math.PI/2;f.position.set(-.012,.012,-.036+i*.024);fist.add(f);}const thumb=capsule(.012,.03,glove);thumb.rotation.x=Math.PI/2;thumb.position.set(.012,.026,-.02);fist.add(thumb);
  const arm=capsule(.04,.2,sleeve);arm.rotation.set(Math.PI/2-.2,0,.2);arm.position.set(.02,-.035,.135);fist.add(arm);fist.traverse(o=>{o.castShadow=false;});fist.position.set(.012,-.004,.066);blade.add(fist);}
 blade.scale.setScalar(1.25);blade.visible=false;gun.add(blade);
 const can=new THREE.Mesh(new THREE.SphereGeometry(.045,10,8),mat('#3c4b34',{roughness:.6}));can.castShadow=false;can.visible=false;gun.add(can);
 let sidearmOn=false;const rifleAnimate=animate;
 function setSidearm(on){sidearmOn=!!on;group.visible=!sidearmOn;pistol.visible=sidearmOn;}
 function animateAll(p){rifleAnimate(p);if(sidearmOn){left.position.set(.0,-.075,-.06);left.rotation.set(0,0,.35);right.position.set(.035,-.07,-.05);}
  const k=Math.max(0,Math.min(1,p.knife||0));blade.visible=k>0;if(k>0){const f=1-k;blade.position.set(-.52+f*.46,.1-Math.sin(f*Math.PI)*.03,.2-Math.sin(f*Math.PI)*.1);blade.rotation.set(.35,.9-f*1.3,-.9+f*.4);}   /* Build 34: a slash from the left across the view, the edge leading and the flat turned to the eye */
  can.visible=!!p.holding;if(p.holding)can.position.set(-.2,.0,-.28);}
 return {ready,configure,animate:animateAll,setSidearm,get sidearm(){return sidearmOn;},resetMotion(){roll=pitchOffset=0;},get loaded(){return !!model;}};
}
