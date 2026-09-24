import * as THREE from './three.module.js';
export function dressWorld({scene,renderer,ground,plaster,box,cylinder,mat,wood,metal,sand,groundY,solids,occluders,rand,range}){
 const loader=new THREE.TextureLoader(),maxAniso=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 function tex(name,type,repeat){const t=loader.load(`assets/${name}_${type}_1k.jpg`);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);t.anisotropy=maxAniso;if(type==='diff')t.colorSpace=THREE.SRGBColorSpace;return t;}
 function pbr(material,name,repeat,normal=.8){material.map=tex(name,'diff',repeat);material.normalMap=tex(name,'nor_gl',repeat);material.roughnessMap=tex(name,'rough',repeat);material.normalScale.set(normal,normal);material.needsUpdate=true;}
 ground.material.color.set('#d8c9aa');pbr(ground.material,'rocks_ground_05',[520,520],.8);
 plaster.color.set('#e2cdb1');pbr(plaster,'beige_wall_001',[1,1],.45);
 const brick=mat('#d3c6ad');pbr(brick,'seaworn_sandstone_brick',[1,1]);
 const canvasmat=mat('#a89870',{side:THREE.DoubleSide});
 // Courtyard boundaries with open entrances and a dogleg market route.
 for(const [x,z,w,d]of[[-40,14,.6,24],[-40,2,12,.6],[-36,27,8,.6],[37,4,.6,20],[31,-7,12,.6],[-5,26,12,1],[0,7,1,17],[33,-38,16,.6],[-48,-35,18,.6]])box(w,1.7,d,x,groundY(x,z)+.85,z,brick,scene,true);
 // Textile stalls create diagonal sightlines and sheltered routes.
 for(const [x,z]of[[-8,16],[9,0],[-7,-25],[34,17]]){const y=groundY(x,z);for(const dx of [-2,2])for(const dz of [-1.5,1.5])cylinder(.045,.07,2.7,x+dx,y+1.35,z+dz,wood);let g=new THREE.PlaneGeometry(4.6,3.6,10,8);g.rotateX(-Math.PI/2);for(let i=0;i<g.attributes.position.count;i++){let px=g.attributes.position.getX(i);g.attributes.position.setY(i,Math.cos(px)*.12);}g.computeVertexNormals();const awning=new THREE.Mesh(g,canvasmat);awning.position.set(x,y+2.7,z);awning.castShadow=true;scene.add(awning);box(3,.75,.8,x,y+.38,z,wood,scene,true);for(let i=0;i<3;i++){box(.65,.25,.6,x-1+i,y+.85,z,mat('#76644a'));for(let j=0;j<6;j++){const item=new THREE.Mesh(new THREE.SphereGeometry(.095,6,5),mat(i%2?'#a17538':'#9b6044'));item.position.set(x-1+i+range(-.2,.2),y+1.02,z+range(-.2,.2));scene.add(item);}}}
 function crate(x,z,w=1){const y=groundY(x,z);box(w,.8,w,x,y+.4,z,wood,scene,true);for(let k of [-1,1]){box(w+.02,.07,w+.02,x,y+.4+k*.29,z,metal);box(.08,.83,w+.04,x+k*w*.35,y+.42,z,sand);}}
 for(const p of [[-14,34],[-16,34],[15,30],[32,8],[-35,-2],[-30,-27],[10,-42],[12,-42],[42,-34],[-45,-60]])crate(...p);
 // Abandoned transport truck, grounded wheels and physical cover.
 for(const [x,z]of[[16,39],[-38,-26]]){const y=groundY(x,z),body=mat('#716f5b'),rubber=mat('#25282a');box(2.3,.45,5.2,x,y+.9,z,body,scene,true);box(2.15,1.25,1.6,x,y+1.7,z-1.7,body,scene,true);box(1.9,.58,.035,x,y+1.94,z-2.515,mat('#384a4a',{metalness:.7,roughness:.15}));box(2.2,.95,.1,x,y+1.4,z+2.5,body);for(const s of [-1,1]){box(.12,.95,3.5,x+s*1.06,y+1.4,z+.7,body);for(const dz of [-1.7,1.7]){let wheel=cylinder(.47,.47,.3,x+s*1.2,y+.55,z+dz,rubber);wheel.rotation.z=Math.PI/2;}}}
 // Gravel shoulders and scattered debris, kept out of doorway paths.
 const pebbleGeo=new THREE.DodecahedronGeometry(.15,0),pebbleMat=mat('#8d8777');const pebbles=new THREE.InstancedMesh(pebbleGeo,pebbleMat,500);const dummy=new THREE.Object3D();for(let i=0;i<500;i++){const x=range(-70,70),z=range(-82,65);dummy.position.set(x,groundY(x,z)+.035,z);dummy.scale.set(range(.2,1.2),range(.15,.5),range(.4,1.5));dummy.rotation.set(rand(),rand()*6,rand());dummy.updateMatrix();pebbles.setMatrixAt(i,dummy.matrix);}scene.add(pebbles);
 // Sparse trees along the side routes.
 const leaves=mat('#646a43');for(const [x,z]of[[-46,35],[40,36],[-46,-8],[49,-30],[-13,-69],[33,-64]]){const y=groundY(x,z);cylinder(.09,.2,3.8,x,y+1.9,z,wood);for(let j=0;j<7;j++){const o=new THREE.Mesh(new THREE.IcosahedronGeometry(range(.65,1.2),1),leaves);o.position.set(x+range(-1,1),y+3.5+range(-.5,.7),z+range(-1,1));o.scale.y=.65;o.castShadow=true;scene.add(o);}}
 // Soft suspended dust, using round alpha particles.
 const dc=document.createElement('canvas');dc.width=dc.height=32;const ctx=dc.getContext('2d'),gr=ctx.createRadialGradient(16,16,0,16,16,16);gr.addColorStop(0,'rgba(230,214,173,.6)');gr.addColorStop(1,'rgba(230,214,173,0)');ctx.fillStyle=gr;ctx.fillRect(0,0,32,32);const pts=[];for(let i=0;i<200;i++)pts.push(range(-80,80),range(.2,12),range(-80,70));const dust=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(pts,3)),new THREE.PointsMaterial({size:.1,map:new THREE.CanvasTexture(dc),transparent:true,opacity:.27,depthWrite:false}));scene.add(dust);
 return {dust};
}
