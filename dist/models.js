// Build 38: the models (bodies, first-person arms, weapons). They are looks only: nothing here decides a hit, a path or a
// number. A model is one .glb under assets/models with its pictures inside, asked for with fetch(assetURL(...)) and parsed
// from bytes (as terraces.js does), once for the page however many maps are played. The loader itself (GLTFLoader.js) is
// fetched the first time a model is wanted and not before: a page that never asks for a model fetches nothing more than it
// did. Bodies from Microsoft Rocketbox (MIT), cut down and repainted (tools and sources: incoming/work, not published).
import * as THREE from './three.module.js';
import {assetURL} from './build.js';

// `auto`: the game asks for its models after its first frame. The test harness turns it off unless a suite asks.
export const MODELS = {auto: true, failed: [], asked: []};
const cache = new Map(); let loader = null;
const gltfLoader = () => loader ??= import('./GLTFLoader.js').then(m => new m.GLTFLoader());

// The parsed model (a THREE.Group), or null if it did not arrive (said once in the console; the game goes on without it).
export function loadModel(file) {
  if (cache.has(file)) return cache.get(file);
  const url = assetURL('assets/models/' + file); MODELS.asked.push(url);
  const p = gltfLoader().then(gltf => fetch(url).then(r => { if (!r.ok) throw new Error(`${file}: ${r.status}`); return r.arrayBuffer(); })
    .then(buffer => new Promise((done, fail) => gltf.parse(buffer, '', done, fail)))).then(g => { g.scene.userData.file = file; return g.scene; })
    .catch(e => { console.warn('DUSTLINE: a model did not arrive:', file, e?.message || e); MODELS.failed.push(file); return null; });
  cache.set(file, p); return p;
}
export const loadModels = files => Promise.all(files.map(loadModel)).then(list => Object.fromEntries(files.map((f, i) => [f, list[i]])));

// A copy of a skinned model that can be posed by itself: its own bones and skeleton, the geometry shared. `material`: the
// copy's own (a tint), else the model's.
export function cloneSkinned(scene, material = null) {
  const root = scene.clone(true), bones = {}, src = [], dst = [];
  scene.traverse(o => src.push(o)); root.traverse(o => dst.push(o));
  const twin = new Map(src.map((o, i) => [o, dst[i]])); let mesh = null;
  root.traverse(o => { if (o.isBone) bones[o.name] = o; });
  for (const [from, to] of twin) if (from.isSkinnedMesh) {
    to.skeleton = new THREE.Skeleton(from.skeleton.bones.map(b => twin.get(b)), from.skeleton.boneInverses); to.bindMatrix.copy(from.bindMatrix); to.bindMatrixInverse.copy(from.bindMatrixInverse);
    if (material) to.material = material; to.castShadow = false; to.receiveShadow = true; to.userData.skin = true; mesh = to;
  }
  return {root, mesh, bones};
}
// A static model's copy (geometry and materials shared).
export function cloneStatic(scene) { const root = scene.clone(true); root.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; o.userData.skin = true; } }); return root; }
export const modelStats = scene => { let triangles = 0, meshes = 0, bones = 0; scene?.traverse(o => { if (o.isMesh) { meshes++; triangles += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } if (o.isBone) bones++; }); return {triangles, meshes, bones}; };
