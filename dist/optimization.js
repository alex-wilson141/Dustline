import * as THREE from './three.module.js';
import {mergeGeometries} from './BufferGeometryUtils.js';
// Merge immovable geometry while retaining the original collision meshes.
export function batchStatic(scene,occluders){
 scene.updateMatrixWorld(true);const groups=new Map();let before=0;
 for(const o of [...scene.children]){if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material)||o.geometry.attributes.position.count>10000)continue;before++;o.geometry.computeBoundingBox();const key=o.material.uuid;const list=groups.get(key)||[];list.push(o);groups.set(key,list);}
 let mergedCount=0;for(const list of groups.values()){if(list.length<2)continue;const geometries=list.map(o=>o.geometry.clone().applyMatrix4(o.matrixWorld));const geometry=mergeGeometries(geometries,false);if(!geometry){geometries.forEach(g=>g.dispose());continue;}geometry.computeBoundingBox();geometry.computeBoundingSphere();const mesh=new THREE.Mesh(geometry,list[0].material);mesh.castShadow=list.some(o=>o.castShadow);mesh.receiveShadow=true;scene.add(mesh);list.forEach(o=>scene.remove(o));geometries.forEach(g=>g.dispose());mergedCount+=list.length-1;}
 occluders.forEach(o=>{o.geometry.computeBoundingBox();o.geometry.computeBoundingSphere();});return {before,removedDraws:mergedCount};
}
export class MinHeap{constructor(){this.a=[];}get length(){return this.a.length;}push(v){const a=this.a;a.push(v);let i=a.length-1;while(i>0){const p=(i-1)>>1;if(a[p].f<=v.f)break;a[i]=a[p];i=p;}a[i]=v;}pop(){const a=this.a,result=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].f<a[c].f)c++;if(a[c].f>=last.f)break;a[i]=a[c];i=c;}a[i]=last;}return result;}}
// Auto render scale. Each decision uses the median frame time of 5 s of active play, so one hitch
// cannot lower resolution. Below 42 FPS it steps down; after two windows above 55 FPS it steps back up.
export class AutoQuality{
 constructor(max){this.reset(max);}
 reset(max=this.max){this.max=max;this.scale=max;this.frames=[];this.time=0;this.good=0;}
 sample(seconds){
  if(!(seconds>0)||!Number.isFinite(seconds))return null;
  this.frames.push(seconds);this.time+=Math.min(seconds,.25);if(this.time<5)return null;
  const sorted=this.frames.sort((a,b)=>a-b),fps=1/sorted[sorted.length>>1];this.frames=[];this.time=0;
  let next=this.scale;
  if(fps<42){this.good=0;next=Math.max(.75,this.scale-.15);}
  else if(fps>55){if(++this.good>=2){this.good=0;next=Math.min(this.max,this.scale+.15);}}
  else this.good=0;
  next=Math.round(next*100)/100;if(next===this.scale)return null;this.scale=next;return next;
 }
}
// PERF-02: exact, fast stand-in for raycaster.intersectObject(terrain). Per triangle it runs the same THREE code
// as Mesh.raycast (bounding-sphere/box early-outs, local ray, Ray.intersectTriangle on the same float32 vertices in
// index order, world distance and near/far rejection), but only for the grid cells the ray can reach: columns (or
// rows) along the ray's XZ path, clipped to [-margin, far+margin], the plane extent and the terrain's y range, with
// every cell grown by margin (1 mm). nearest() equals intersectObject(terrain)[0] (lowest face index on an exact
// distance tie); any() equals intersectObject(terrain).length>0. Anything but an unmoved, rotated segments x segments
// PlaneGeometry falls back to Mesh.raycast.
export function terrainRaycaster(mesh,{segments:S=180,margin:M=1e-3}={}){
 const geo=mesh.geometry,pos=geo.attributes.position,P=pos.array,I=geo.index?.array,N=S+1;
 let ok=!!I&&I.length===S*S*6&&pos.count===N*N&&pos.itemSize===3&&!pos.normalized&&!pos.isInterleavedBufferAttribute&&!geo.morphAttributes.position&&!geo.groups.length&&!Array.isArray(mesh.material)&&!mesh.isSkinnedMesh&&!mesh.isInstancedMesh;
 for(let z=0;ok&&z<N;z++)for(let x=0;x<N;x++){const v=z*N+x;if(P[v*3]!==P[x*3]||P[v*3+2]!==P[z*N*3+2]){ok=false;break;}const f=(z*S+x)*6;if(x<S&&z<S&&(I[f]!==v||I[f+1]!==v+N||I[f+2]!==v+1||I[f+3]!==v+N||I[f+4]!==v+N+1||I[f+5]!==v+1)){ok=false;break;}}
 const X0=P[0],Z0=P[2],X1=P[S*3],Z1=P[S*N*3+2],CX=(X1-X0)/S,CZ=(Z1-Z0)/S;
 for(let i=0;ok&&i<N;i++)if(!(CX>0&&CZ>0)||Math.abs(P[i*3]-(X0+i*CX))>M/4||Math.abs(P[i*N*3+2]-(Z0+i*CZ))>M/4)ok=false;
 const vA=new THREE.Vector3(),vB=new THREE.Vector3(),vC=new THREE.Vector3(),pt=new THREE.Vector3(),wp=new THREE.Vector3(),best=new THREE.Vector3(),local=new THREE.Ray(),nearRay=new THREE.Ray(),inv=new THREE.Matrix4(),sphere=new THREE.Sphere(),sphereHit=new THREE.Vector3(),ID=new THREE.Matrix4().elements;
 let rc,side,bestD,bestF,stopAtFirst,collect;
 function face(f){const a=I[f*3],b=I[f*3+1],c=I[f*3+2];vA.set(P[a*3],P[a*3+1],P[a*3+2]);vB.set(P[b*3],P[b*3+1],P[b*3+2]);vC.set(P[c*3],P[c*3+1],P[c*3+2]);
  const hit=side===THREE.BackSide?local.intersectTriangle(vC,vB,vA,true,pt):local.intersectTriangle(vA,vB,vC,side===THREE.FrontSide,pt);if(hit===null)return false;
  wp.copy(pt).applyMatrix4(mesh.matrixWorld);const d=rc.ray.origin.distanceTo(wp);if(d<rc.near||d>rc.far)return false;
  if(collect)collect.push({distance:d,point:wp.clone(),object:mesh,faceIndex:f});if(d<bestD||(d===bestD&&f<bestF)){bestD=d;bestF=f;best.copy(wp);}return stopAtFirst;}
 function run(raycaster,mode,out){
  rc=raycaster;side=mesh.material.side;bestD=Infinity;bestF=-1;stopAtFirst=mode==='any';collect=out||null;
  // Raycaster.intersect's layers test and Mesh.raycast's early-outs, verbatim.
  if(!mesh.layers.test(rc.layers)||mesh.material===undefined)return false;if(geo.boundingSphere===null)geo.computeBoundingSphere();
  sphere.copy(geo.boundingSphere).applyMatrix4(mesh.matrixWorld);nearRay.copy(rc.ray).recast(rc.near);
  if(sphere.containsPoint(nearRay.origin)===false){if(nearRay.intersectSphere(sphere,sphereHit)===null)return false;if(nearRay.origin.distanceToSquared(sphereHit)>(rc.far-rc.near)**2)return false;}
  inv.copy(mesh.matrixWorld).invert();local.copy(rc.ray).applyMatrix4(inv);const bb=geo.boundingBox;if(bb!==null&&local.intersectsBox(bb)===false)return false;
  // Clip t (= world distance for this unmoved mesh) to where a hit can lie.
  const o=local.origin,d=local.direction;let t0=-M,t1=rc.far+M;
  for(const [oc,dc,lo,hi] of [[o.y,d.y,bb?bb.min.y:-Infinity,bb?bb.max.y:Infinity],[o.x,d.x,X0,X1],[o.z,d.z,Z0,Z1]]){if(dc!==0){const e0=(lo-M-oc)/dc,e1=(hi+M-oc)/dc;t0=Math.max(t0,Math.min(e0,e1));t1=Math.min(t1,Math.max(e0,e1));}else if(oc<lo-M||oc>hi+M)return false;}
  if(!(t0<=t1))return false;
  // Walk columns (x-major) or rows in ray order; each strip's cells in ray order.
  const xm=Math.abs(d.x)>=Math.abs(d.z),du=xm?d.x:d.z,dv=xm?d.z:d.x,ou=xm?o.x:o.z,ov=xm?o.z:o.x,U0=xm?X0:Z0,CU=xm?CX:CZ,V0=xm?Z0:X0,CV=xm?CZ:CX,ua=ou+t0*du,ub=ou+t1*du;
  const lo=Math.max(0,Math.floor((Math.min(ua,ub)-M-U0)/CU)),hi=Math.min(S-1,Math.floor((Math.max(ua,ub)+M-U0)/CU));
  for(let k=0;k<=hi-lo;k++){const iu=du<0?hi-k:lo+k;let ta=t0,tb=t1;
   if(du!==0){const e0=(U0+iu*CU-M-ou)/du,e1=(U0+(iu+1)*CU+M-ou)/du;ta=Math.max(t0,Math.min(e0,e1));tb=Math.min(t1,Math.max(e0,e1));if(ta>tb)continue;}
   if(!collect&&bestF>=0&&ta>bestD+M)break; // every later strip starts beyond the best hit
   const va=ov+ta*dv,vb=ov+tb*dv,r0=Math.max(0,Math.floor((Math.min(va,vb)-M-V0)/CV)),r1=Math.min(S-1,Math.floor((Math.max(va,vb)+M-V0)/CV));
   for(let r=r0;r<=r1;r++){const iv=dv<0?r1-(r-r0):r,cell=xm?iv*S+iu:iu*S+iv;if(face(cell*2)||face(cell*2+1))return true;}}
  return false;}
 const exact=()=>ok&&mesh.matrixWorld.elements.every((v,i)=>v===ID[i]);
 const brute=raycaster=>raycaster.intersectObject(mesh,false);
 return {exact,
  nearest(raycaster){if(!exact())return brute(raycaster)[0]||null;run(raycaster,'nearest');return bestF<0?null:{distance:bestD,point:best.clone(),object:mesh,faceIndex:bestF};},
  any(raycaster){if(!exact())return brute(raycaster).length>0;return run(raycaster,'any');},
  // Test aid: every terrain hit, ordered like intersectObject.
  all(raycaster){if(!exact())return brute(raycaster);const out=[];run(raycaster,'all',out);return out.sort((a,b)=>a.distance-b.distance||a.faceIndex-b.faceIndex);}};
}
