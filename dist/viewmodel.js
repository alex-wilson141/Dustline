import * as THREE from './three.module.js';
import {assetURL} from './build.js'; // also the DEPLOY-01 upgrade guard
import {cloneSkinned} from './models.js';
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
 // ---- Build 38: arms with fingers (cut from the squad's body: assets/models/arms.glb). The capsule hands above stay as
 // what says where a hand is (`left`, `right`, the knife's fist, the can): they are posed exactly as before and no longer
 // drawn; each frame the arms' bones are put where they say. A hand is a wrist, the way the hand points, the way its palm
 // faces, where the elbow lies from the wrist, and how far each finger is curled (GRIPS, in the gun's space: x right, y up,
 // -z forward). The arm is not hung from a shoulder: like every first-person arm it reaches in from below the picture.
 const V=(x,y,z)=>new THREE.Vector3(x,y,z).normalize(),P=(x,y,z)=>new THREE.Vector3(x,y,z),FIST=[[1.05,1.25,.95],[1.05,1.3,.95],[1.05,1.3,.95],[1.05,1.3,.95]];
 const GRIPS={
  rifle:{R:{at:P(.03,-.062,.135),point:V(-.02,.5,-.87),palm:V(-1,-.04,.04),elbow:V(.36,-.6,.72),upper:V(.15,-.75,.64),thumb:[.25,.3,.25],fingers:[[.3,.45,.3],...FIST.slice(1)]},
         L:{at:P(-.03,.012,-.285),point:V(.3,.12,-.95),palm:V(.15,.98,.1),elbow:V(-.45,-.66,.6),upper:V(-.2,-.82,.53),thumb:[.1,.2,.15],fingers:[[.75,.95,.6],[.8,1,.65],[.8,1,.65],[.8,.95,.6]]}},
  pistol:{R:{at:P(.052,-.118,.04),point:V(-.03,.4,-.92),palm:V(-1,0,.02),elbow:V(.36,-.5,.79),upper:V(.2,-.3,.93),thumb:[.2,.3,.2],fingers:[[.3,.45,.3],...FIST.slice(1)]},
          L:{at:P(-.045,-.135,.04),point:V(.36,.36,-.86),palm:V(.93,.3,.2),elbow:V(-.5,-.48,.72),upper:V(-.3,-.35,.89),thumb:[.2,.3,.2],fingers:FIST}},
  knife:{at:P(.0,-.012,.105),point:V(0,.1,-1),palm:V(1,0,0),elbow:V(.12,-.3,.95),upper:V(-.2,-.4,.9),thumb:[.5,.5,.4],fingers:FIST},          // in the blade's own space
  can:{at:P(-.03,-.085,.06),point:V(.15,.62,-.77),palm:V(.75,.2,.63),elbow:V(-.45,-.6,.66),upper:V(-.3,-.35,.89),thumb:[.3,.4,.3],fingers:[[.7,.8,.6],[.7,.8,.6],[.7,.8,.6],[.7,.8,.6]]}};          // from the can
 let armRig=null;const REST={left:left.matrix.clone(),right:right.matrix.clone()};{left.updateMatrix();right.updateMatrix();REST.left.copy(left.matrix).invert();REST.right.copy(right.matrix).invert();}
 function arms(model,{scale=1.06}={}){if(armRig||!model)return false;const c=cloneSkinned(model);if(!c.mesh)return false;c.root.scale.setScalar(scale);c.root.updateMatrixWorld(true);c.mesh.frustumCulled=false;c.mesh.raycast=()=>{};
  const wp=o=>o.getWorldPosition(new THREE.Vector3()),wq=o=>o.getWorldQuaternion(new THREE.Quaternion()),side={};
  for(const s of ['L','R']){const B=n=>c.bones[`Bip01_${s}_${n}`],U=B('UpperArm'),F=B('Forearm'),H=B('Hand');if(!U||!F||!H)return false;
   const pU=wp(U),pF=wp(F),pH=wp(H),x=wp(B('Finger2')).sub(pH).normalize(),n0=new THREE.Vector3().crossVectors(wp(B('Finger1')).sub(wp(B('Finger4'))),x).normalize();if(n0.y>0)n0.negate();   // the palm faces down in the model's rest pose
   const n=n0.addScaledVector(x,-n0.dot(x)).normalize(),b=new THREE.Vector3().crossVectors(x,n),rest=new THREE.Matrix4().makeBasis(x,n,b).transpose();
   const fingers=[0,1,2,3,4].map(f=>['','1','2'].map(j=>{const bone=B(`Finger${f}${j}`),child=B(`Finger${f}${j===''?'1':j==='1'?'2':''}`),q=wq(bone),d=(j==='2'?new THREE.Vector3(1,0,0).applyQuaternion(q):wp(child).sub(wp(bone)).normalize());
    return {bone,rest:bone.quaternion.clone(),axis:new THREE.Vector3().crossVectors(d,n).normalize().applyQuaternion(q.clone().invert())};}));
   side[s]={U,F,H,qU:wq(U),qF:wq(F),qH:wq(H),dU:pF.clone().sub(pU).normalize(),dF:pH.clone().sub(pF).normalize(),L1:pF.distanceTo(pU),L2:pH.distanceTo(pF),rest,fingers,parent:new THREE.Matrix4().copy(U.parent.matrixWorld).invert(),parentQ:wq(U.parent).invert()};}
  for(const g of [left,right])g.traverse(o=>{if(o.isMesh)o.visible=false;});blade.traverse(o=>{if(o.isMesh&&o.parent!==blade&&o.parent.parent===blade)o.visible=false;});   // the capsule hands and the fist go; the knife stays
  gun.add(c.root);armRig={root:c.root,mesh:c.mesh,side,scale};poseArms({});return true;}
 const _b=new THREE.Vector3(),_m=new THREE.Matrix4(),_r=new THREE.Quaternion(),_s=new THREE.Quaternion(),_v=new THREE.Vector3(),_w=new THREE.Vector3(),_e=new THREE.Vector3(),_x=new THREE.Vector3(),_n=new THREE.Vector3(),_d=new THREE.Vector3(),_q=new THREE.Quaternion();
 // One arm: `frame` moves the grip (a matrix in the gun's space, or null).
 function poseArm(a,g,frame){_w.copy(g.at);_x.copy(g.point);_n.copy(g.palm);_e.copy(g.elbow);if(frame){_w.applyMatrix4(frame);_x.transformDirection(frame);_n.transformDirection(frame);_e.transformDirection(frame);}
  _n.addScaledVector(_x,-_n.dot(_x)).normalize();_b.crossVectors(_x,_n);_r.setFromRotationMatrix(_m.makeBasis(_x,_n,_b).multiply(a.rest));
  const qh=_r.clone().multiply(a.qH);_d.copy(a.dF).applyQuaternion(_r);_s.setFromUnitVectors(_d,_v.copy(_e).negate());const qf=_s.clone().multiply(_r).multiply(a.qF);
  _d.copy(a.dU).applyQuaternion(_r).applyQuaternion(_s);_q.setFromUnitVectors(_d,_v.copy(g.upper).negate());const qu=_q.clone().multiply(_s).multiply(_r).multiply(a.qU);
  _v.copy(_w).addScaledVector(_e,a.L2).addScaledVector(g.upper,a.L1);a.U.position.copy(_v).applyMatrix4(a.parent);a.U.quaternion.copy(a.parentQ).multiply(qu);a.F.quaternion.copy(qu).invert().multiply(qf);a.H.quaternion.copy(qf).invert().multiply(qh);
  a.fingers.forEach((f,i)=>{const c=i?g.fingers[i-1]:g.thumb;f.forEach((j,k)=>j.bone.quaternion.copy(j.rest).multiply(_q.setFromAxisAngle(j.axis,c[k])));});}
 function poseArms(p){if(!armRig)return;const {L,R}=armRig.side,k=Math.max(0,Math.min(1,p.knife||0));left.updateMatrix();right.updateMatrix();
  if(sidearmOn){poseArm(R,GRIPS.pistol.R,null);poseArm(L,GRIPS.pistol.L,null);}else{poseArm(R,GRIPS.rifle.R,_m.identity()&&new THREE.Matrix4().multiplyMatrices(right.matrix,REST.right));poseArm(L,GRIPS.rifle.L,new THREE.Matrix4().multiplyMatrices(left.matrix,REST.left));}
  if(k>0){blade.updateMatrix();poseArm(L,GRIPS.knife,blade.matrix);}else if(p.holding){can.updateMatrix();poseArm(L,GRIPS.can,can.matrix);}}
 function animateArms(p){animateAll(p);poseArms(p);}
 return {ready,configure,animate:animateArms,arms,get armed(){return !!armRig;},grips:GRIPS,setSidearm,get sidearm(){return sidearmOn;},resetMotion(){roll=pitchOffset=0;},get loaded(){return !!model;}};
}
