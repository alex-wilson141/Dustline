import * as THREE from './three.module.js';
import { mergeGeometries } from './BufferGeometryUtils.js';
import './build.js'; // DEPLOY-01 upgrade guard

// Shared geometry and fabric maps keep a full squad inexpensive to draw.
const sphere = new THREE.SphereGeometry(1, 12, 8);
const cube = new THREE.BoxGeometry(1, 1, 1);
const capsule = new THREE.CapsuleGeometry(1, 2, 3, 8);
const helmetGeometry = new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI * .59);
const markerGeometry = new THREE.OctahedronGeometry(.045);
const fabricMaps = new Map();
const palettes = new Map();
// Build 16: the co-op teammate's marker is this many times the squad marker (a .045 m octahedron): .36 m wide, .54 m tall.
export const MATE_MARKER = 4;

function fabric(team) {
  if (fabricMaps.has(team)) return fabricMaps.get(team);
  const size = 64, pixels = new Uint8Array(size * size * 4);
  // Build 16: 'mate' is the co-op teammate, in blue: a colour no enemy, squadmate or wall in the valley wears.
  const colors = team === 'mate' ? [[52, 92, 150], [40, 72, 124], [72, 116, 172], [34, 58, 100]] : team === 'ally'
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
    vest: make(team === 'mate' ? '#27477a' : team === 'ally' ? '#8c8266' : '#877a62', { roughness: .98 }),
    rubber: make('#363932'),
    glove: make('#665e4a'),
    skin: make('#ae8666', { roughness: .82 }),
    metal: make('#333735', { roughness: .58, metalness: .5 }),
    glass: make('#252e2b', { roughness: .28, metalness: .32 }),
    // The teammate's marker is unlit and drawn over everything, so it reads in shade, in a firefight and behind a wall.
    marker: team === 'mate' ? new THREE.MeshBasicMaterial({ color: '#4db2ff', depthTest: false, depthWrite: false, transparent: true, opacity: .95 }) : new THREE.MeshBasicMaterial({ color: '#a4d7c9' }),
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

// Authored hit reactions and deaths (no physics). Directions are in the soldier's local X/Z frame
// and point the way the shot travelled, so the body is pushed away from the shooter. The soldier
// faces local -z: a shot travelling +z came from in front, -z from behind, mostly x from the side.
export const REACTION_SECONDS = .22;
const fallAxis = new THREE.Vector3(), twistQuat = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0), groundward = new THREE.Vector3(), inverse = new THREE.Quaternion();
const TOP = Math.PI / 2 - .04;
const clamp01 = v => Math.min(1, Math.max(0, v));
const span = (t, a, b) => clamp01((t - a) / (b - a));
const easeIn = u => u * u, easeOut = u => 1 - (1 - u) * (1 - u), smooth = u => u * u * (3 - 2 * u);
const bounce = (t, a, b, amount) => t > a && t < b ? amount * Math.sin(Math.PI * (t - a) / (b - a)) : 0;
// Hit zones by height above the feet; 1.45 m matches the game's existing headshot rule.
export function hitZone(height) { return height > 1.45 ? 'head' : height > 1.0 ? 'upper' : height > .72 ? 'lower' : 'legs'; }
export const HIT_ZONES = ['head', 'upper', 'lower', 'legs'];
// Each variant returns, for time t and strength s, the fall tilt toward the shot direction (rad), how far
// the rig sinks (m), slides with the shot (m), twists about vertical (rad, signed by side), hunches the torso
// forward (rad, negative arches back), arm pose (+ flung out, - braced/clutched) and knee fold (0-1).
export const DEATH_VARIANTS = {
  // Headshot: legs give way at once, the body slumps and drops along the shot.
  collapse: { duration: .75, pose: (t, s) => ({ tilt: TOP * easeIn(span(t, .05, .55)) - bounce(t, .55, .75, .07), sink: .24 * easeOut(span(t, 0, .2)), slide: (.1 + .12 * s) * easeOut(span(t, 0, .7)), twist: 0, bend: .3 * easeOut(span(t, 0, .25)), arms: 0, knees: easeOut(span(t, 0, .2)) }) },
  // Chest hit from the front: staggers back a step or two, arms thrown up, then goes over backwards.
  stagger: { duration: .95, pose: (t, s) => ({ tilt: .22 * smooth(span(t, 0, .3)) + (TOP - .22) * easeIn(span(t, .3, .78)) - bounce(t, .78, .95, .08), sink: 0, slide: (.45 + .45 * s) * easeOut(span(t, 0, .45)) + .08 * easeOut(span(t, .45, .9)), twist: 0, bend: -.22 * smooth(span(t, 0, .28)), arms: smooth(span(t, 0, .28)), knees: .3 * span(t, .3, .6) }) },
  // Chest hit from behind: knees buckle and the body pitches forward onto its front, bracing.
  pitch: { duration: .8, pose: (t, s) => ({ tilt: TOP * easeIn(span(t, .04, .62)) - bounce(t, .62, .8, .07), sink: .12 * easeOut(span(t, 0, .2)), slide: (.18 + .25 * s) * easeOut(span(t, 0, .7)), twist: 0, bend: .28 * smooth(span(t, 0, .3)), arms: -smooth(span(t, .08, .42)), knees: .5 * easeOut(span(t, 0, .2)) }) },
  // Chest hit from the side: spun round by the impact while falling sideways.
  spin: { duration: .9, pose: (t, s, side) => ({ tilt: TOP * easeIn(span(t, .12, .72)) - bounce(t, .72, .9, .07), sink: 0, slide: (.25 + .3 * s) * easeOut(span(t, 0, .75)), twist: side * .95 * easeOut(span(t, 0, .45)), bend: .1, arms: .6 * smooth(span(t, 0, .3)), knees: .2 * span(t, .2, .5) }) },
  // Leg hit: drops to the knees first, slumps, then keels over.
  crumple: { duration: .95, pose: (t, s) => ({ tilt: (TOP - .08) * easeIn(span(t, .36, .8)) - bounce(t, .8, .95, .06), sink: .3 * easeOut(span(t, 0, .26)), slide: .08 * easeOut(span(t, .36, .9)), twist: 0, bend: .35 * smooth(span(t, .18, .42)), arms: -.3 * smooth(span(t, .1, .35)), knees: easeOut(span(t, 0, .24)) }) },
  // Abdomen hit: doubles over clutching the wound, then falls along the shot.
  doubleover: { duration: .9, pose: (t, s) => ({ tilt: TOP * easeIn(span(t, .28, .74)) - bounce(t, .74, .9, .07), sink: .1 * easeOut(span(t, 0, .26)), slide: (.12 + .2 * s) * easeOut(span(t, 0, .75)), twist: 0, bend: .5 * easeOut(span(t, 0, .24)) * (1 - .4 * span(t, .5, .8)), arms: -.6 * smooth(span(t, 0, .22)), knees: .45 * easeOut(span(t, 0, .26)) }) },
};
// Chosen from how the body was hit: side of the shot, body zone, height on the torso, how far off-centre (side, m)
// and a per-kill value (roll, 0-1) derived from the hit so that repeated front chest kills still vary. The host
// picks the variant and sends it with the impact, so both peers play the same death.
export function deathVariant({ x = 0, z = 1, zone = 'upper', height = null, side = 0, roll = 0 } = {}) {
  const lateral = Math.abs(x) > Math.abs(z) * 1.2, behind = z < 0;
  if (zone === 'legs') return 'crumple';
  if (zone === 'lower') return roll < .7 ? 'doubleover' : 'crumple';
  if (zone === 'head') return lateral ? (roll < .5 ? 'spin' : 'collapse') : roll < .65 ? 'collapse' : behind ? 'pitch' : 'stagger';
  if (lateral) return roll < .7 ? 'spin' : 'collapse';
  if (behind) return roll < .75 ? 'pitch' : 'spin';
  if (Math.abs(side) > .18) return roll < .6 ? 'spin' : 'stagger'; // shoulder or arm
  if (height != null && height <= 1.25) return roll < .4 ? 'doubleover' : roll < .75 ? 'stagger' : 'collapse';
  return roll < .45 ? 'stagger' : roll < .75 ? 'collapse' : 'spin';
}

/** A 1.8 m articulated visual. Outer placement belongs to the game; flinch and fall are animated here. */
export function makeSoldierVisual({ team = 'ally', index = 0, look = null, materials = {} } = {}) {
  const p = palette(look || team, materials.mat);
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
    const marker = look === 'mate' ? mesh(group, markerGeometry, p.marker, 0, 2.18, 0, MATE_MARKER, MATE_MARKER * 1.5, MATE_MARKER) : mesh(group, markerGeometry, p.marker, 0, 2.0, 0);
    marker.userData.isAllyMarker = true;
    if (look === 'mate') { marker.userData.isMateMarker = true; marker.renderOrder = 20; group.userData.look = 'mate'; }
  }
  let stride = index * 1.79, movement = 0, low = 0, down = 0;
  let flinch = 0, flinchX = 0, flinchZ = 0, fall = null;
  // Visual only: a flinch never changes the outer transform, so AI movement and hit tests continue.
  function react({ x = 0, z = 1, strength = .6, kill = false, zone = 'upper', variant = null } = {}) {
    const length = Math.hypot(x, z);
    if (!(length > 1e-6)) { x = 0; z = 1; } else { x /= length; z /= length; }
    const s = Math.min(1, Math.max(0, Number.isFinite(strength) ? strength : .6));
    if (kill) { if (!fall) startFall(x, z, s, HIT_ZONES.includes(zone) ? zone : 'upper', variant); }
    else if (!fall) { flinch = .55 + .45 * s; flinchX = x; flinchZ = z; }
  }
  function startFall(x, z, s, zone, chosen) {
    const variant = Object.hasOwn(DEATH_VARIANTS, chosen ?? '') ? chosen : deathVariant({ x, z, zone });
    fall = { x, z, t: 0, s, variant, side: x >= 0 ? -1 : 1, duration: DEATH_VARIANTS[variant].duration };
  }
  function reset() { flinch = 0; fall = null; rig.quaternion.identity(); rig.position.set(0, 0, 0); rifle.position.set(.075, .285, -.275); }
  function state() {
    return { flinch, low, falling: !!fall, fallTime: fall ? fall.t : 0, variant: fall ? fall.variant : null,
      fallDone: !!fall && fall.t >= fall.duration, rigTilt: fall ? fall.tilt || 0 : 2 * Math.acos(Math.min(1, Math.abs(rig.quaternion.w))) };
  }
  function animate({ speed = 0, time = 0, dead = false, crouch = false, dt = 1 / 60 } = {}) {
    const delta = Math.min(.1, Math.max(0, Number.isFinite(dt) ? dt : 0));
    // A death without a directional impact (for example an older host) staggers and falls backwards.
    if (dead && !fall) startFall(0, 1, .3, 'upper');
    if (!dead && fall) reset();
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
    flinch = Math.max(0, flinch - delta / REACTION_SECONDS);
    if (flinch > 0) {
      const k = flinch * flinch;
      torso.rotation.x += flinchZ * .38 * k;
      torso.rotation.z -= flinchX * .38 * k;
      rig.position.x = flinchX * .05 * k;
      rig.position.z = flinchZ * .05 * k;
    } else if (!fall) rig.position.x = rig.position.z = 0;
    if (fall) {
      fall.t = Math.min(fall.duration, fall.t + delta);
      const k = DEATH_VARIANTS[fall.variant].pose(fall.t, fall.s, fall.side), lying = clamp01(k.tilt / TOP);
      fall.tilt = k.tilt;
      // Tilt toward the shot direction after any twist, so every variant ends lying away from the shooter.
      fallAxis.set(fall.z, 0, -fall.x).normalize();
      rig.quaternion.setFromAxisAngle(fallAxis, k.tilt).multiply(twistQuat.setFromAxisAngle(UP, k.twist));
      rig.position.x = fall.x * k.slide;
      rig.position.z = fall.z * k.slide;
      // Sink while kneeling; lying down, lift by the body's half-thickness on the side facing the ground
      // (an ellipse: backpack .24 m, chest rig .17 m, shoulders .33 m) so it rests on the ground rather than in it.
      groundward.set(0, -1, 0).applyQuaternion(inverse.copy(rig.quaternion).invert());
      const lift = Math.hypot(.33 * groundward.x, (groundward.z > 0 ? .24 : .17) * groundward.z);
      rig.position.y += -k.sink * (1 - lying) + lift * lying;
      torso.rotation.x -= k.bend;
      for (const leg of legs) { leg.thigh.rotation.x += .9 * k.knees; leg.calf.rotation.x -= 1.6 * k.knees; }
      for (const { upper, fore, side } of arms) {
        if (k.arms > 0) { upper.rotation.x -= 1.1 * k.arms; upper.rotation.z += side * .6 * k.arms; }
        else { upper.rotation.x -= .45 * k.arms; fore.rotation.x -= .5 * k.arms; }
      }
      // Settle into a flat lying pose as the body reaches the ground, so arms, rifle and folded knees never
      // push through it whichever way the body landed. Variants differ in how they fall, not in this rest pose.
      const rest = smooth(clamp01((lying - .55) / .45)), mix = (from, to) => from + (to - from) * rest;
      torso.rotation.x = mix(torso.rotation.x, 0); torso.rotation.z = mix(torso.rotation.z, 0);
      rifle.rotation.x = mix(rifle.rotation.x, Math.PI / 2); rifle.position.set(mix(.075, .3), mix(.285, .2), mix(-.275, .02));
      legs.forEach(({ thigh, calf }, i) => { thigh.rotation.x = mix(thigh.rotation.x, i ? -.06 : .06); thigh.rotation.z = mix(thigh.rotation.z, i ? -.07 : .07); calf.rotation.x = mix(calf.rotation.x, -.1); });
      for (const { upper, fore, side } of arms) { upper.rotation.x = mix(upper.rotation.x, .04); upper.rotation.z = mix(upper.rotation.z, side * .06); fore.rotation.x = mix(fore.rotation.x, .12); fore.rotation.z = mix(fore.rotation.z, 0); }
    }
  }
  animate({ dt: 0 });
  return { group, animate, react, reset, state };
}
