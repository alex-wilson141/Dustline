import * as THREE from './three.module.js';
import { mergeGeometries } from './BufferGeometryUtils.js';

// Shared geometry and fabric maps keep a full squad inexpensive to draw.
const sphere = new THREE.SphereGeometry(1, 12, 8);
const cube = new THREE.BoxGeometry(1, 1, 1);
const capsule = new THREE.CapsuleGeometry(1, 2, 3, 8);
const helmetGeometry = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI * .59);
const markerGeometry = new THREE.OctahedronGeometry(.045);
const fabricMaps = new Map();
const palettes = new Map();

function fabric(team) {
  if (fabricMaps.has(team)) return fabricMaps.get(team);
  const size = 64, pixels = new Uint8Array(size * size * 4);
  const colors = team === 'ally'
    ? [[128, 126, 103], [100, 111, 92], [151, 142, 115], [84, 90, 75]]
    : [[146, 132, 108], [120, 116, 97], [161, 146, 120], [102, 100, 83]];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const coarse = Math.sin(Math.floor(x / 8) * 17.13 + Math.floor(y / 6) * 31.97);
    const patch = Math.abs(Math.floor(coarse * 19)) % colors.length;
    const weave = ((x + y) % 2 ? 3 : -3) + Math.sin(x * 19 + y * 41) * 4;
    const i = (y * size + x) * 4;
    for (let c = 0; c < 3; c++) pixels[i + c] = colors[patch][c] + weave;
    pixels[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.repeat.set(2, 2);
  texture.needsUpdate = true;
  fabricMaps.set(team, texture);
  return texture;
}

function palette(team, materialFactory) {
  if (palettes.has(team)) return palettes.get(team);
  const make = materialFactory || ((color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: .9, ...extra }));
  const p = {
    cloth: make('#ffffff', { map: fabric(team) }),
    vest: make(team === 'ally' ? '#8c8266' : '#877a62', { roughness: .98 }),
    rubber: make('#363932'),
    glove: make('#665e4a'),
    skin: make('#ae8666', { roughness: .82 }),
    metal: make('#333735', { roughness: .58, metalness: .5 }),
    glass: make('#252e2b', { roughness: .28, metalness: .32 }),
    marker: new THREE.MeshBasicMaterial({ color: '#a4d7c9' }),
  };
  palettes.set(team, p);
  return p;
}

function mesh(parent, geometry, material, x, y, z, sx = 1, sy = 1, sz = 1) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  object.scale.set(sx, sy, sz);
  object.receiveShadow = true;
  object.castShadow = false;
  parent.add(object);
  return object;
}

function packedBoxes(parts) {
  const matrix = new THREE.Matrix4();
  const geometries = parts.map(([x, y, z, w, h, d]) => {
    matrix.makeScale(w, h, d).setPosition(x, y, z);
    return cube.clone().applyMatrix4(matrix);
  });
  const geometry = mergeGeometries(geometries, false);
  geometries.forEach(g => g.dispose());
  geometry.computeBoundingBox();
  return geometry;
}

// Pouches, straps and rifle fittings are each one draw call.
const pouchGeometry = packedBoxes([
  [-.123, .20, -.158, .105, .14, .06], [0, .20, -.167, .105, .14, .06], [.123, .20, -.158, .105, .14, .06],
  [-.168, .45, -.10, .052, .19, .038], [.168, .45, -.10, .052, .19, .038],
  [-.205, .16, .025, .09, .15, .115], [.205, .16, .025, .09, .15, .115],
]);
const headsetGeometry = packedBoxes([
  [-.143, 1.65, .004, .037, .09, .075], [.143, 1.65, .004, .037, .09, .075],
  [-.1, 1.56, -.076, .018, .15, .022], [.1, 1.56, -.076, .018, .15, .022],
]);
const rifleGeometry = packedBoxes([
  [0, 0, -.18, .07, .092, .24], [0, .015, -.39, .065, .07, .22],
  [0, .047, -.27, .045, .018, .47], [0, -.074, -.083, .045, .12, .06],
  [0, -.022, .044, .06, .085, .16], [0, -.018, .125, .075, .125, .025],
  [0, .088, -.16, .046, .064, .07], [0, .041, -.47, .016, .073, .026],
]);
const barrelGeometry = new THREE.CylinderGeometry(.012, .012, .17, 8);
barrelGeometry.rotateX(Math.PI / 2);

/** A 1.8 m articulated visual. Outer placement and death roll belong to the game. */
export function makeSoldierVisual({ team = 'ally', index = 0, materials = {} } = {}) {
  const p = palette(team, materials.mat);
  const group = new THREE.Group();
  const rig = new THREE.Group();
  group.add(rig);
  const torso = new THREE.Group();
  torso.position.y = .98;
  rig.add(torso);
  mesh(torso, sphere, p.cloth, 0, .22, 0, .245, .305, .145);
  mesh(torso, cube, p.vest, 0, .285, -.063, .355, .39, .21);
  mesh(torso, pouchGeometry, p.vest, 0, 0, 0);
  mesh(torso, sphere, p.vest, 0, .235, .155, .177, .235, .115);
  mesh(rig, sphere, p.cloth, 0, .89, .01, .197, .125, .126);
  mesh(rig, capsule, p.skin, 0, 1.477, 0, .057, .033, .057);
  mesh(rig, sphere, p.skin, 0, 1.62, -.007, .105, .14, .102);
  mesh(rig, sphere, p.skin, 0, 1.61, -.107, .024, .034, .026);
  mesh(rig, helmetGeometry, p.cloth, 0, 1.68, .006, .15, .135, .151);
  mesh(rig, headsetGeometry, p.rubber, 0, 0, 0);
  mesh(rig, sphere, p.glass, 0, 1.656, -.101, .104, .032, .026);

  const legs = [], arms = [];
  for (const side of [-1, 1]) {
    const thigh = new THREE.Group();
    thigh.position.set(side * .112, .865, .01);
    rig.add(thigh);
    mesh(thigh, capsule, p.cloth, 0, -.185, 0, .08, .091, .078);
    const calf = new THREE.Group();
    calf.position.y = -.375;
    thigh.add(calf);
    mesh(calf, capsule, p.cloth, 0, -.177, 0, .063, .086, .065);
    mesh(calf, sphere, p.vest, 0, -.005, -.056, .074, .097, .033);
    mesh(calf, sphere, p.rubber, 0, -.408, -.047, .085, .078, .139);
    legs.push({ thigh, calf });

    const upper = new THREE.Group();
    upper.position.set(side * .235, .42, 0);
    torso.add(upper);
    mesh(upper, capsule, p.cloth, 0, -.135, 0, .067, .073, .067);
    const fore = new THREE.Group();
    fore.position.y = -.275;
    upper.add(fore);
    mesh(fore, capsule, p.cloth, 0, -.116, 0, .055, .064, .055);
    mesh(fore, sphere, p.glove, 0, -.258, -.015, .057, .07, .049);
    arms.push({ upper, fore, side });
  }
  const rifle = new THREE.Group();
  rifle.position.set(.075, .285, -.275);
  torso.add(rifle);
  mesh(rifle, rifleGeometry, p.metal, 0, 0, 0);
  mesh(rifle, barrelGeometry, p.metal, 0, .015, -.58);
  mesh(rifle, cube, p.rubber, 0, -.118, -.22, .052, .17, .085).rotation.x = -.16;

  if (team === 'ally') {
    const marker = mesh(group, markerGeometry, p.marker, 0, 2.0, 0);
    marker.userData.isAllyMarker = true;
  }
  let stride = index * 1.79, movement = 0, low = 0, down = 0;
  function animate({ speed = 0, time = 0, dead = false, crouch = false, dt = 1 / 60 } = {}) {
    const delta = Math.min(.1, Math.max(0, Number.isFinite(dt) ? dt : 0));
    const smoothing = 1 - Math.exp(-delta * 12);
    movement += (Math.min(1, Math.max(0, speed) / 2.6) - movement) * smoothing;
    low += ((crouch ? 1 : 0) - low) * smoothing;
    down += ((dead ? 1 : 0) - down) * smoothing;
    if (speed > .025 && !dead) stride += delta * (3.3 + Math.min(6, speed) * 1.55);
    const walking = movement * (1 - down);
    const breathing = Math.sin(time * 2 + index) * .004 * (1 - down);
    rig.position.y = -.3 * low + Math.abs(Math.sin(stride)) * .02 * walking + breathing;
    torso.rotation.x = .16 * low + .045 * walking;
    torso.rotation.z = Math.sin(stride) * .018 * walking;
    rifle.rotation.x = Math.sin(time * 2 + index) * .006 * (1 - down) + down * .2;
    for (let i = 0; i < legs.length; i++) {
      const swing = Math.sin(stride + i * Math.PI);
      legs[i].thigh.rotation.x = 1.05 * low + swing * .55 * walking * (1 - low * .55) + down * (i ? -.3 : .14);
      legs[i].thigh.rotation.z = down * (i ? -.16 : .12);
      legs[i].calf.rotation.x = -.1 - 1.72 * low - Math.max(0, -swing) * .65 * walking - down * .28;
    }
    for (const { upper, fore, side } of arms) {
      const left = side < 0;
      upper.rotation.x = (left ? .88 : .64) - down * .8;
      upper.rotation.z = (left ? .17 : -.12) + down * side * .48;
      fore.rotation.x = (left ? .79 : 1.23) - down * .7;
      fore.rotation.z = left ? .85 : -.4;
    }
  }
  animate({ dt: 0 });
  return { group, animate };
}
