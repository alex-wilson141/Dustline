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
