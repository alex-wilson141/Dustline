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
export const VILLAGE_PROPS = [
  ["sacks", -21.8, 8.08, 1.2, .7, 0, -.112], ["tyres", -21.8, 15.77, 1, 1, 1, .12], ["jerrycans", -29, -15.73, 1, 1, 0, .116], ["crates2", -29, -14.27, 1, 1, 1, -.111], ["tyres", -26.4, -15.73, 1, 1, 1, .002], ["jerrycans", -21.8, -15.73, 1, 1, 0, .026],
  ["jerrycans", -19.2, -15.73, 1, 1, 0, -.13], ["crate", -26.4, -5.73, 1, 1, 1, .082], ["pots", -21.8, -5.73, 1, 1, 0, -.022], ["crates2", -19.2, -5.73, 1, 1, 1, -.138], ["tyres", -19.2, -4.27, 1, 1, 1, .139], ["barrels", -30.68, -14, .9, 1.3, 1, -.133],
  ["crate", -30.73, -8, 1, 1, 1, -.031], ["crate", -29.27, -8, 1, 1, 1, .129], ["crates2", -24.5, -43.23, 1, 1, 1, -.01], ["crates2", -24.5, -41.77, 1, 1, 1, -.115], ["pots", -17.8, -43.23, 1, 1, 0, -.113], ["crate", -24.5, -34.23, 1, 1, 1, .01],
  ["pots", -24.5, -32.77, 1, 1, 0, -.032], ["tyres", 27.2, 15.77, 1, 1, 1, -.082], ["crate", 27.2, 17.23, 1, 1, 1, -.015], ["barrels", 20.5, 28.18, 1.3, .9, 1, -.1], ["crates2", 27.2, 26.77, 1, 1, 1, -.097], ["crate", 27.2, 28.23, 1, 1, 1, .043],
  ["sacks", 20.08, 24, .7, 1.2, 0, -.134], ["crates2", 29.77, 24, 1, 1, 1, .026], ["pots", 18.6, -13.27, 1, 1, 0, .109], ["sacks", 23.2, -14.58, 1.2, .7, 0, .075], ["jerrycans", 23.2, -13.27, 1, 1, 0, -.138], ["barrels", 25.8, -14.68, 1.3, .9, 1, -.121],
  ["crate", 16, -3.27, 1, 1, 1, .056], ["crates2", 18.6, -3.27, 1, 1, 1, .086], ["sacks", 23.2, -3.42, 1.2, .7, 0, .081], ["sacks", 25.8, -4.58, 1.2, .7, 0, .032], ["pots", 14.27, -13, 1, 1, 0, -.112], ["crate", 15.73, -7, 1, 1, 1, .016],
  ["jerrycans", 27.73, -13, 1, 1, 0, -.034], ["sacks", 27.58, -7, .7, 1.2, 0, -.104], ["crates2", 20.5, -42.23, 1, 1, 1, -.026], ["crates2", 23.1, -42.23, 1, 1, 1, -.143], ["jerrycans", 28.2, -42.23, 1, 1, 0, .066], ["barrels", 30.8, -40.82, 1.3, .9, 1, -.019],
  ["sacks", 23.1, -31.08, 1.2, .7, 0, -.056], ["barrels", 23.1, -29.82, 1.3, .9, 1, -.102], ["tyres", 18.77, -40.5, 1, 1, 1, -.015], ["crate", 20.23, -40.5, 1, 1, 1, -.087], ["barrels", 18.82, -34, .9, 1.3, 1, .044], ["pots", 33.23, -40.5, 1, 1, 0, .03],
  ["crate", -13, -67.23, 1, 1, 1, .137], ["sacks", -13, -65.92, 1.2, .7, 0, .023], ["tyres", -6.8, -67.23, 1, 1, 1, .119], ["barrels", -6.8, -65.82, 1.3, .9, 1, .142], ["jerrycans", -13, -58.23, 1, 1, 0, -.057], ["tyres", -13, -56.77, 1, 1, 1, -.148],
  ["jerrycans", 11, -72.23, 1, 1, 0, -.05], ["crate", 11, -70.77, 1, 1, 1, .088], ["pots", 13.6, -72.23, 1, 1, 0, .071], ["crates2", 13.6, -70.77, 1, 1, 1, .087], ["jerrycans", 18.2, -72.23, 1, 1, 0, .088], ["sacks", 18.2, -70.92, 1.2, .7, 0, -.047],
  ["sacks", 20.8, -70.92, 1.2, .7, 0, .149], ["sacks", 18.2, -63.08, 1.2, .7, 0, .148], ["sacks", 18.2, -61.92, 1.2, .7, 0, .117], ["crate", 20.8, -63.23, 1, 1, 1, -.042], ["sacks", -54.08, -13, .7, 1.2, 0, .098], ["pots", -52.77, -13, 1, 1, 0, -.102],
  ["crate", -54.23, -10.4, 1, 1, 1, -.031], ["tyres", -52.77, -10.4, 1, 1, 1, -.043], ["jerrycans", -43.77, -17.4, 1, 1, 0, -.059], ["tyres", -45.23, -13, 1, 1, 1, .002], ["crates2", -43.77, -13, 1, 1, 1, .125], ["pots", 44, -13.73, 1, 1, 0, .07],
  ["tyres", 50.2, -13.73, 1, 1, 1, .029], ["jerrycans", 50.2, -12.27, 1, 1, 0, .139], ["crate", 44, -2.27, 1, 1, 1, .08], ["pots", 42.27, -12, 1, 1, 0, -.101], ["crates2", 43.73, -12, 1, 1, 1, -.092], ["crates2", 42.27, -6, 1, 1, 1, -.122],
  ["pots", 43.73, -6, 1, 1, 0, .079], ["sacks", -42.8, -52.42, 1.2, .7, 0, .068], ["jerrycans", -42.8, -43.73, 1, 1, 0, .076], ["crate", -42.8, -42.27, 1, 1, 1, .042], ["tyres", -50.73, -52, 1, 1, 1, -.07], ["barrels", -49.32, -52, .9, 1.3, 1, .053],
  ["crate", -39.27, -52, 1, 1, 1, .008], ["pots", -40.73, -46, 1, 1, 0, -.085], ["pots", 50.2, -54.23, 1, 1, 0, -.046], ["pots", 43.5, -45.23, 1, 1, 0, -.024], ["crate", 50.2, -45.23, 1, 1, 1, -.09], ["cart", -68.45, 24.44, 2.4, 1.3, 1, 0],
  ["cart", 17.9, -78.26, 2.4, 1.3, 1, 0], ["crates2", -13.71, -12.02, 1, 1, 1, 0], ["crates2", -42.49, 48.69, 1, 1, 1, 0], ["crates2", -19.35, 24.26, 1, 1, 1, 0], ["fence", -18.84, -39.01, 3.4, .14, 1, 0], ["sandbag", 45.12, 5.3, 3.2, .7, 1, 0],
  ["crates2", -.21, -16.72, 1, 1, 1, 0], ["crates2", 30.19, 56.43, 1, 1, 1, 0], ["cart", -59.01, -70.92, 1.3, 2.4, 1, 0], ["barrier", -41.55, 45.64, 3, .6, 1, 0], ["sandbag", 4.96, 41.44, 3.2, .7, 1, 0], ["fence", 42.65, 12.15, 3.4, .14, 1, 0],
  ["fence", -26.99, -53.6, .14, 3.4, 1, 0], ["sandbag", 66.15, 8.18, .7, 3.2, 1, 0], ["sandbag", -64.67, -35.55, .7, 3.2, 1, 0], ["cart", 60.14, -5.97, 1.3, 2.4, 1, 0], ["cart", -36.34, -49.92, 1.3, 2.4, 1, 0], ["sandbag", 38.04, 30.21, 3.2, .7, 1, 0],
  ["crates2", 57.42, -70.59, 1, 1, 1, 0], ["cart", 50, 62.06, 1.3, 2.4, 1, 0], ["fence", 67.37, 41.46, 3.4, .14, 1, 0], ["crates2", 45.43, -61.21, 1, 1, 1, 0], ["fence", 41.89, 5.34, .14, 3.4, 1, 0], ["crates2", 18.8, 48.6, 1, 1, 1, 0],
  ["crates2", 40.33, -2.44, 1, 1, 1, 0], ["crates2", 32.59, -55.63, 1, 1, 1, 0], ["fence", 64.34, -26.39, 3.4, .14, 1, 0], ["sandbag", -14.84, -52.75, .7, 3.2, 1, 0], ["cart", -24.79, -69.59, 1.3, 2.4, 1, 0], ["fence", 56.26, 12.24, 3.4, .14, 1, 0],
  ["sandbag", 1.33, -27.69, 3.2, .7, 1, 0], ["cart", -35.96, -9.69, 2.4, 1.3, 1, 0], ["barrier", -32.71, 47.57, .6, 3, 1, 0], ["debris", -45.48, -4.25, .6, .6, 0, 1.96], ["debris", 69.86, -76.64, .6, .6, 0, 2.88], ["debris", -.35, -71.43, .6, .6, 0, 4.03],
  ["debris", -7.34, -76.68, .6, .6, 0, 1.68], ["debris", 50.76, -69.57, .6, .6, 0, 2.48], ["debris", -51.53, 53.11, .6, .6, 0, 2.67], ["debris", 66.05, -.26, .6, .6, 0, .18], ["debris", 52.21, 24.91, .6, .6, 0, 4.82], ["debris", 38.37, -13.62, .6, .6, 0, 2.66],
  ["debris", -17.96, 27.28, .6, .6, 0, 4.91], ["debris", -45.65, 37.43, .6, .6, 0, .66], ["debris", -21.84, -76.57, .6, .6, 0, 3.44], ["debris", -44.89, 52.08, .6, .6, 0, 1.37], ["debris", 10, -49.14, .6, .6, 0, 5.12], ["debris", 48.51, 41.51, .6, .6, 0, 3.82],
  ["debris", -60.67, 33.5, .6, .6, 0, 5.03], ["debris", 26.95, -39.32, .6, .6, 0, .49], ["debris", 68.67, -38.29, .6, .6, 0, .15], ["debris", 14.48, -38, .6, .6, 0, .2], ["debris", -38.97, -46.89, .6, .6, 0, 1.98], ["debris", 27.11, 40.25, .6, .6, 0, .48],
  ["debris", 52.31, 10.43, .6, .6, 0, .68], ["debris", 58.81, 36.65, .6, .6, 0, 5.15], ["debris", 64.45, -2.01, .6, .6, 0, 4.91], ["debris", 65.3, 54.27, .6, .6, 0, 1.9], ["debris", 68.63, -30.89, .6, .6, 0, 1.53], ["debris", -24.76, -59.81, .6, .6, 0, 1],
  ["debris", 25.02, 64.91, .6, .6, 0, 2], ["debris", 22.87, 22.32, .6, .6, 0, 2.69], ["debris", -18.28, -75.88, .6, .6, 0, 3.89], ["debris", -57.13, 55.98, .6, .6, 0, 1.01], ["debris", 39.91, 36.19, .6, .6, 0, .37], ["debris", -59.75, -10.86, .6, .6, 0, 3.2],
  ["debris", 55.04, 67.09, .6, .6, 0, 1.29], ["debris", 47.01, -62.96, .6, .6, 0, 2.77], ["debris", 12.38, -79.06, .6, .6, 0, 4.69], ["debris", 31.44, -54.13, .6, .6, 0, 4.41], ["debris", -71.78, -60.32, .6, .6, 0, 2.64], ["debris", -6.6, -74.06, .6, .6, 0, 1.64],
  ["debris", 10.42, 32.43, .6, .6, 0, .8], ["debris", 54.54, -43.94, .6, .6, 0, 5.6], ["debris", -38.12, 66.53, .6, .6, 0, 4.24], ["debris", 45.38, -18.37, .6, .6, 0, 5.37], ["debris", -3.71, 18.23, .6, .6, 0, 1.99], ["debris", 33.03, -16.68, .6, .6, 0, 3.47],
  ["debris", 14.53, -26.34, .6, .6, 0, 1.69], ["debris", -10.84, -68.63, .6, .6, 0, 3.2], ["debris", 52.19, -51.8, .6, .6, 0, 2.51], ["debris", 48.51, 24.2, .6, .6, 0, .19], ["debris", 64.08, 20.4, .6, .6, 0, 4.99], ["debris", -7.25, 13.82, .6, .6, 0, 2.96],
  ["debris", -29.26, -75.03, .6, .6, 0, 4.3], ["debris", -71.11, 23.25, .6, .6, 0, 2.69], ["debris", 43.36, 63.13, .6, .6, 0, 3.99], ["debris", 7.3, -74.86, .6, .6, 0, 4], ["debris", -71.63, 16.09, .6, .6, 0, 3.04], ["debris", -54.4, 51.17, .6, .6, 0, 1.53],
  ["debris", 63.21, -3.87, .6, .6, 0, 1.76], ["debris", -60.67, -28.45, .6, .6, 0, 4.32], ["debris", -23.72, -16.74, .6, .6, 0, 2.25],
];
