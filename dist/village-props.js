import {onMap} from './maps.js';
import './build.js'; // DEPLOY-01 upgrade guard
// Build 08 map density: clutter along walls and cover in the streets, from a fixed list generated offline against the
// real map (each solid accepted only if every patrol leg, reinforcement entry and objective route stayed walkable).
// Only bundled materials and procedural shapes are used, no new assets. Solid props are unrotated boxes (collision,
// cover and decals assume axis-aligned boxes); barrels, tyres and sandbags get an invisible box occluder that is not in
// the scene (blood decals skip the round ones, which would otherwise float on the box around them).
export function densifyVillage({THREE, scene, box, cylinder, groundY, solids, occluders, wood, metal, sand, plaster, props = VILLAGE_PROPS}) {
  const rubber = new THREE.MeshStandardMaterial({color: '#26292a', roughness: .95}), clay = new THREE.MeshStandardMaterial({color: '#9a5f3c', roughness: .9});
  const canvas = new THREE.MeshStandardMaterial({color: '#b3a079', roughness: .97}), green = new THREE.MeshStandardMaterial({color: '#4c5a3c', roughness: .6, metalness: .3});
  const rust = new THREE.MeshStandardMaterial({color: '#6b4a34', roughness: .7, metalness: .4}), rock = new THREE.MeshStandardMaterial({color: '#8a8476', roughness: .95});
  const block = (x, z, w, d, h, decals = false) => { solids.push({x, z, w: w / 2, d: d / 2}); const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), plaster); o.position.set(x, groundY(x, z) + h / 2, z); o.userData.noDecal = !decals; o.updateMatrixWorld(true); o.geometry.computeBoundingBox(); occluders.push(o); };
  const solidBox = (w, h, d, x, y, z, m) => box(w, h, d, x, y, z, m, scene, true);
  const stats = {};
  for (const [type, x, z, w, d, solid, rot] of props) {
    const y = groundY(x, z), along = w >= d; stats[type] = (stats[type] || 0) + 1;
    if (type === 'crate') { solidBox(.95, .8, .95, x, y + .4, z, wood); box(.97, .07, .97, x, y + .69, z, metal); }
    else if (type === 'crates2') { solidBox(.95, .8, .95, x, y + .4, z, wood); const top = box(.8, .7, .8, x + .05, y + 1.15, z - .05, wood); occluders.push(top); }
    else if (type === 'barrels') { for (let i = 0; i < 3; i++) cylinder(.3, .3, .9, x + (along ? (i - 1) * .42 : 0), y + .45, z + (along ? 0 : (i - 1) * .42), i === 1 ? rust : metal); block(x, z, w, d, .9); }
    else if (type === 'tyres') { for (let i = 0; i < 3; i++) cylinder(.4, .4, .24, x, y + .13 + i * .25, z, rubber); block(x, z, w, d, .75); }
    else if (type === 'cart') { solidBox(w * .9, .45, d * .9, x, y + .8, z, wood); for (const s of [-1, 1]) { const wh = cylinder(.38, .38, .12, along ? x : x + s * w * .5, y + .38, along ? z + s * d * .5 : z, rubber); wh.rotation[along ? 'x' : 'z'] = Math.PI / 2; } box(along ? 1.4 : .08, .08, along ? .08 : 1.4, along ? x + w * .6 : x, y + .7, along ? z : z + d * .6, wood); }
    else if (type === 'fence') { solidBox(w, 1.3, d, x, y + .65, z, wood); for (let i = -1; i <= 1; i++) box(along ? .1 : d + .06, 1.45, along ? d + .06 : .1, along ? x + i * w * .4 : x, y + .72, along ? z : z + i * d * .4, wood); }
    else if (type === 'sandbag') { for (let row = 0; row < 3; row++) for (let i = 0; i < 3; i++) box(along ? 1 : d, .28, along ? d : 1, along ? x + (i - 1) * 1 + (row % 2 ? .09 : -.09) : x, y + .14 + row * .26, along ? z : z + (i - 1) * 1 + (row % 2 ? .09 : -.09), sand); block(x, z, w, d, .8, true); }
    else if (type === 'barrier') solidBox(w, .9, d, x, y + .45, z, plaster);
    else if (type === 'sacks') { for (let i = 0; i < 3; i++) { const s = box(.55, .28, .38, x + (along ? (i - 1) * .4 : 0), y + .14 + (i === 1 ? .22 : 0), z + (along ? 0 : (i - 1) * .4), canvas); s.rotation.y = rot + i * .2; } }
    else if (type === 'jerrycans') { for (let i = 0; i < 3; i++) { const c = box(.18, .34, .3, x + (i - 1) * .22, y + .17, z + (i % 2) * .12, green); c.rotation.y = rot; } }
    else if (type === 'pots') { cylinder(.18, .13, .42, x - .15, y + .21, z, clay); cylinder(.14, .1, .3, x + .2, y + .15, z + .1, clay); }
    else if (type === 'debris') { const r = new THREE.Mesh(new THREE.DodecahedronGeometry(.22, 0), rock); r.scale.set(1.3, .5, 1); r.position.set(x, y + .06, z); r.rotation.y = rot; r.castShadow = r.receiveShadow = true; scene.add(r); const plank = box(.9, .04, .12, x + .3, y + .03, z - .2, wood); plank.rotation.y = rot + .6; }
  }
  return stats;
}

// [type, x, z, width (x), depth (z), solid (collision + cover), yaw of loose items]. 183 props: 83 solid, 100 loose.
// Build 21: the list belongs to the map (dist/map-kohar.js, `props`); this name follows the active map.
export let VILLAGE_PROPS;
onMap(map => { VILLAGE_PROPS = map.props; });
