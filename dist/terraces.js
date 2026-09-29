// Build 22: the building kit of Dehrun Terraces. It turns a map's description (dist/map-dehrun.js, `block`) into what
// stands there: terraces and their retaining walls, steps, houses of several storeys with door and window openings,
// floors, beam ends, parapets, balconies, outside stairs, awnings, wires and lamps, and the props, which are models.
// No place is written here: every position, size and choice of surface comes from the map.
// Everything is built from boxes and planes that carry photographed surfaces (assets/dehrun/tex) so that the game's
// static batching draws each surface in one call; each kind of prop (assets/dehrun/models) is drawn in one call per part
// however many stand in the block. No light source is added: lamps glow through an unlit material, and rooms are
// darkened by their own surfaces.
// Height is not built yet (map build 3): upper floors, outside stairs and roofs are geometry. What can be walked is
// what the map's height function says, so the street climbs its steps as a ramp.
import * as THREE from './three.module.js';
import {GLTFLoader} from './GLTFLoader.js';
import {assetURL} from './build.js';

// The surfaces: the file, the size in metres of one repeat, and how it is used.
export const SURFACES = {
  plaster: {file: 'plastered_wall_03', tile: 3},
  ochre: {file: 'rough_plaster_broken', tile: 2.6},
  white: {file: 'white_rough_plaster', tile: 2.2},
  room: {file: 'plastered_wall_03', tile: 3, tint: '#f3eadb', fill: '#75664f', shade: .5},      // plaster indoors: `fill` is the light a room throws back on itself, `shade` how deep its hollows are
  drystone: {file: 'yellow_stone_wall', tile: 2.2, relief: 1.2},
  masonry: {file: 'rustic_stone_wall_02', tile: 2.4, relief: 1.2},
  cobble: {file: 'cobblestone_floor_04', tile: 2.2, relief: 1.1},
  slab: {file: 'monastery_stone_floor', tile: 2.4},
  trail: {file: 'rocky_trail', tile: 4},
  gravel: {file: 'sandy_gravel_02', tile: 1.6, tint: '#e3d9c9', relief: 1.5},
  tiles: {file: 'clay_roof_tiles_02', tile: 2.2, both: true},
  iron: {file: 'rusty_corrugated_iron', tile: 2, metal: true, both: true},
  planks: {file: 'weathered_brown_planks', tile: 1.8},
  beams: {file: 'weathered_brown_planks', tile: 1.8, tint: '#8a7a66'},
  ceiling: {file: 'weathered_brown_planks', tile: 1.8, tint: '#6d6152', fill: '#1d1812'},
  blue: {file: 'blue_painted_planks', tile: 1.3},
  floor: {file: 'brown_floor_tiles', tile: 1.7, tint: '#e0d4c2', fill: '#2a221a'},
  shutter: {file: 'rusty_metal_shutter', tile: 1.9, metal: true},
};
export const SURFACE_FILES = [...new Set(Object.values(SURFACES).map(s => s.file))];
// The files a surface and a model are made of, as the game asks for them (for the checks).
const FOLDER = 'assets' + '/dehrun/';
export const surfaceAssets = file => ['diff', 'nor_gl', 'arm'].map(kind => `${FOLDER}tex/${file}_${kind}_1k.jpg`);
export const modelAsset = name => `${FOLDER}models/${name}.glb`;

const BOX_FACES = ['x', 'x', 'y', 'y', 'z', 'z'];

export function buildTerraces(ctx, map) {
  const {scene, renderer, solids, occluders, groundY} = ctx, B = map.block, loader = new THREE.TextureLoader();
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy()), textures = new Map(), materials = {}, stats = {boxes: 0, props: 0, propKinds: 0, propTriangles: 0, requested: []};
  const texture = (file, kind) => { const key = `${file}_${kind}`; if (textures.has(key)) return textures.get(key);
    const url = kind === 'diff' ? assetURL('assets/dehrun/tex/' + file + '_diff_1k.jpg') : kind === 'nor_gl' ? assetURL('assets/dehrun/tex/' + file + '_nor_gl_1k.jpg') : assetURL('assets/dehrun/tex/' + file + '_arm_1k.jpg');
    const t = loader.load(url); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso; if (kind === 'diff') t.colorSpace = THREE.SRGBColorSpace; textures.set(key, t); stats.requested.push(url); return t; };
  for (const [name, s] of Object.entries(SURFACES)) { const arm = texture(s.file, 'arm');
    materials[name] = new THREE.MeshStandardMaterial({color: s.tint || '#ffffff', map: texture(s.file, 'diff'), normalMap: texture(s.file, 'nor_gl'), aoMap: arm, roughnessMap: arm, roughness: 1, metalness: s.metal ? 1 : 0, ...(s.metal ? {metalnessMap: arm} : {}), side: s.both ? THREE.DoubleSide : THREE.FrontSide});
    const m = materials[name]; m.normalScale.setScalar(s.relief || 1); m.userData.surface = name; if (s.shade != null) m.aoMapIntensity = s.shade; if (s.fill) { m.emissive.set(s.fill); m.emissiveMap = m.map; } }
  // Plain colours for what has no photographed surface: dyed cloth, the dark of a closed room, lamp glow, wire.
  const cloth = colour => materials['cloth' + colour] ||= new THREE.MeshStandardMaterial({color: colour, roughness: .95, side: THREE.DoubleSide});
  const dark = materials.dark = new THREE.MeshStandardMaterial({color: '#14110e', roughness: 1});
  const glow = materials.glow = new THREE.MeshBasicMaterial({color: '#ffd9a0'});
  const wire = new THREE.LineBasicMaterial({color: 0x2c2a26});

  // A box whose surface repeats by its size in metres and continues from one box to the next.
  function block(w, h, d, x, y, z, surface, {solid = false, seen = true, turn = 0, tilt = 0, lean = 0, shadow = true} = {}) {
    const g = new THREE.BoxGeometry(w, h, d), m = typeof surface === 'string' ? materials[surface] : surface, tile = SURFACES[m.userData.surface]?.tile || 1, uv = g.attributes.uv;
    const size = {x: w, y: h, z: d}, at = {x, y, z};
    for (let i = 0; i < uv.count; i++) { const f = BOX_FACES[Math.floor(i / 4)], [a, b] = f === 'x' ? ['z', 'y'] : f === 'y' ? ['x', 'z'] : ['x', 'y'];
      uv.setXY(i, (uv.getX(i) - .5) * size[a] / tile + at[a] / tile, (uv.getY(i) - .5) * size[b] / tile + at[b] / tile); }
    const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.rotation.set(tilt, turn, lean); o.castShadow = shadow; o.receiveShadow = true; scene.add(o); stats.boxes++;
    if (solid) solids.push({x, z, w: w / 2, d: d / 2});
    if (seen && !turn && !tilt && !lean) occluders.push(o);
    return o;
  }
  const solid = (x0, x1, z0, z1) => solids.push({x: (x0 + x1) / 2, z: (z0 + z1) / 2, w: Math.abs(x1 - x0) / 2, d: Math.abs(z1 - z0) / 2});
  // A box given by its ends along the wall's line: `axis` is the direction the wall runs in.
  const along = (axis, at, from, to, thick, y0, y1, surface, opt) => axis === 'x' ? block(to - from, y1 - y0, thick, (from + to) / 2, (y0 + y1) / 2, at, surface, opt) : block(thick, y1 - y0, to - from, at, (y0 + y1) / 2, (from + to) / 2, surface, opt);
  // A panel hinged at one end (a door leaf, a shutter, a gate): from its hinge at (hx, hz) it reaches `length` in the
  // direction (dx, dz).
  function leaf(hx, hz, dx, dz, length, y0, y1, thick, surface) {
    const n = Math.hypot(dx, dz) || 1, o = block(length, y1 - y0, thick, hx + dx / n * length / 2, (y0 + y1) / 2, hz + dz / n * length / 2, surface, {turn: -Math.atan2(dz, dx), seen: false});
    return o;
  }

  // ---- A wall with openings. `out` is the side the outside is on (+1 or -1 across the wall's line).
  function wall({axis, at, from, to, base, height, thick = .34, surface, lining, out = 1, openings = [], hard = false}) {
    const list = [...openings].sort((a, b) => a.at - b.at), top = base + height, skin = lining ? .06 : 0, body = thick - skin, mid = at + out * skin / 2, inner = at - out * (thick - skin) / 2;
    const piece = (a, b, y0, y1, closes) => { if (b - a < .01 || y1 - y0 < .01) return; along(axis, mid, a, b, body, y0, y1, surface); if (lining) along(axis, inner, a, b, skin, y0, y1, lining, {shadow: false});
      if (hard && closes) axis === 'x' ? solid(a, b, at - thick / 2, at + thick / 2) : solid(at - thick / 2, at + thick / 2, a, b); };
    let cursor = from;
    for (const o of list) { const a = o.at - o.width / 2, b = o.at + o.width / 2, sill = base + (o.sill || 0), head = base + o.head;
      piece(cursor, a, base, top, true); piece(a, b, base, sill, false); piece(a, b, head, top, false);
      if (hard && (o.sill || o.closed || o.kind === 'shop' && o.counter)) axis === 'x' ? solid(a, b, at - thick / 2, at + thick / 2) : solid(at - thick / 2, at + thick / 2, a, b);
      dress(o, {axis, at, out, thick, a, b, sill, head}); cursor = b; }
    piece(cursor, to, base, top, true);
  }
  // What an opening gets: a frame, a sill or a threshold, shutters or a door, a shop's rolling shutter, a dark room behind.
  function dress(o, {axis, at, out, thick, a, b, sill, head}) {
    const face = at + out * thick / 2, P = (along_, across, y, w, h, d, surface, opt) => axis === 'x' ? block(w, h, d, along_, y, across, surface, opt) : block(d, h, w, across, y, along_, surface, opt);
    const frame = o.frame || 'beams', deep = thick + .08, mid = (a + b) / 2, w = b - a;
    if (o.kind !== 'shop') { P(a + .04, at, (sill + head) / 2, .08, head - sill, deep, frame); P(b - .04, at, (sill + head) / 2, .08, head - sill, deep, frame); }
    P(mid, at, head + .07, w + .3, .14, deep + .06, frame);                                  // the lintel, a beam across
    if (o.sill) P(mid, face + out * .05, sill - .04, w + .24, .08, .3, 'slab'); else P(mid, at, sill + .02, w, .04, deep + .1, 'slab', {shadow: false});
    if (o.closed || o.back) P(mid, at - out * (thick / 2 + (o.back || .02)), (sill + head) / 2, w, head - sill, .04, dark, {shadow: false, seen: !!o.closed});
    // Swung by `angle` from closed, towards the side `to` (+1 outside, -1 inside), hinged at the end `end`, reaching towards `dir` when closed.
    const hinge = (end, dir, angle, length, surface, to = 1) => { const u = Math.cos(angle) * dir, v = Math.sin(angle) * out * to, line = at + out * to * (thick / 2 + .03);
      axis === 'x' ? leaf(end, line, u, v, length, sill + .03, head - .03, .045, surface) : leaf(line, end, v, u, length, sill + .03, head - .03, .045, surface); };
    if (o.kind === 'window' && o.shutters !== false) { const open = o.open ?? 2.75, half = w / 2 - .06, [l, r] = Array.isArray(open) ? open : [open, open];
      hinge(a + .04, 1, l, half, o.leaf || 'blue'); hinge(b - .04, -1, r, half, o.leaf || 'blue');
      if (o.bars) for (let i = 1; i < 4; i++) P(a + w * i / 4, at, (sill + head) / 2, .025, head - sill, .025, dark, {shadow: false, seen: false}); }
    if (o.kind === 'door' && o.door !== false) hinge(a + .05, 1, o.open ?? (o.closed ? 0 : 1.75), w - .1, o.leaf || 'planks', o.closed ? 1 : -1);
    if (o.kind === 'shop') { const drop = o.drop ?? .9; P(mid, face - out * .1, head - drop / 2, w, drop, .05, 'shutter'); P(mid, face - out * .1, head + .02, w + .1, .22, .26, 'shutter');
      if (o.counter) { P(mid, at, sill + .45, w, .9, thick + .3, 'masonry'); P(mid, at, sill + .93, w + .1, .06, thick + .5, 'planks'); } }
    if (o.awning) { const [colour, reach = 1.5] = o.awning, n = 8, g = new THREE.PlaneGeometry(w + .6, reach, 10, n); g.rotateX(-Math.PI / 2); const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const t = (p.getZ(i) + reach / 2) / reach; p.setY(i, -t * .55 - Math.sin(t * Math.PI) * .07 + Math.sin(p.getX(i) * 3.1) * .015); } g.computeVertexNormals();
      const m = new THREE.Mesh(g, cloth(colour)); m.castShadow = m.receiveShadow = true; m.rotation.y = axis === 'x' ? (out > 0 ? 0 : Math.PI) : (out > 0 ? Math.PI / 2 : -Math.PI / 2);
      const c = face + out * reach / 2; m.position.set(axis === 'x' ? mid : c, head + .55, axis === 'x' ? c : mid); scene.add(m);
      if (o.awning[2] !== false) for (const e of [a - .25, b + .25]) P(e, face + out * (reach - .05), (sill - (o.sill || 0) + head) / 2, .06, head - sill + (o.sill || 0), .06, 'beams', {seen: false}); }
  }

  // ---- A house: storeys of four walls, floors between them, beam ends under each floor, a flat roof behind a parapet.
  function house(H) {
    const {x: [x0, x1], z: [z0, z1], base, storeys} = H, t = H.thick || .34, enter = !!H.enter; let y = base;
    const faces = {north: {axis: 'x', at: z0 + t / 2, from: x0, to: x1, out: -1}, south: {axis: 'x', at: z1 - t / 2, from: x0, to: x1, out: 1}, west: {axis: 'z', at: x0 + t / 2, from: z0 + t, to: z1 - t, out: -1}, east: {axis: 'z', at: x1 - t / 2, from: z0 + t, to: z1 - t, out: 1}};
    block(x1 - x0 + .3, 1.4, z1 - z0 + .3, (x0 + x1) / 2, base - .68, (z0 + z1) / 2, 'masonry', {seen: false});    // the footing, down into the ground
    storeys.forEach((S, n) => {
      const ground = n === 0, inside = enter && (ground || S.room) ? (S.lining || 'room') : null;
      for (const [name, f] of Object.entries(faces)) wall({...f, base: y, height: S.height, thick: t, surface: S.surface, lining: inside, openings: (S[name] || []).map(o => ({...o, closed: o.closed ?? (!enter && o.kind !== 'shop'), back: o.back ?? (enter && !ground && !S.room ? .02 : 0)})), hard: ground && enter});
      if (ground && enter) block(x1 - x0 - 2 * t, .08, z1 - z0 - 2 * t, (x0 + x1) / 2, y + .01, (z0 + z1) / 2, S.floor || 'floor', {shadow: false});
      if (inside) { block(x1 - x0 - 2 * t, .05, z1 - z0 - 2 * t, (x0 + x1) / 2, y + S.height - .235, (z0 + z1) / 2, 'ceiling', {shadow: false});                // the ceiling and its beams
        for (let z = z0 + .8; z < z1 - .4; z += 1.1) block(x1 - x0 - 2 * t, .16, .14, (x0 + x1) / 2, y + S.height - .34, z, 'beams', {shadow: false, seen: false}); }
      y += S.height;
      block(x1 - x0 - .02, .2, z1 - z0 - .02, (x0 + x1) / 2, y - .1 + .001 * n, (z0 + z1) / 2, n === storeys.length - 1 ? (H.roof?.surface || 'trail') : 'planks');                        // the floor above, or the roof
      for (const side of S.beamEnds || H.beamEnds || []) { const f = faces[side], reach = .38;                                     // beam ends through the wall
        for (let p = f.from + .5; p < f.to - .2; p += .85) f.axis === 'x' ? block(.15, .15, reach, p, y - .22, f.at + f.out * (t / 2 + reach / 2 - .04), 'beams', {seen: false}) : block(reach, .15, .15, f.at + f.out * (t / 2 + reach / 2 - .04), y - .22, p, 'beams', {seen: false}); }
      if (S.band) for (const f of Object.values(faces)) along(f.axis, f.at + f.out * (t / 2 + .02), f.from - (f.axis === 'z' ? t : 0), f.to + (f.axis === 'z' ? t : 0), .06, y - .12, y + .08, S.band, {seen: false, shadow: false});
    });
    const p = H.roof?.parapet ?? .55, cap = H.roof?.coping || 'slab';
    for (const f of Object.values(faces)) { const pt = .26, line = f.at + f.out * (t - pt) / 2, a = f.from - (f.axis === 'z' ? t : 0), b = f.to + (f.axis === 'z' ? t : 0), gaps = (H.roof?.gaps || []).filter(g => g.side === Object.keys(faces).find(k => faces[k] === f));
      let c = a; for (const g of [...gaps].sort((u, v) => u.from - v.from)) { if (g.from - c > .05) { along(f.axis, line, c, g.from, pt, y, y + p, storeys.at(-1).surface); along(f.axis, line, c - .03, g.from + .03, pt + .1, y + p, y + p + .06, cap, {seen: false}); } c = g.to; }
      if (b - c > .05) { along(f.axis, line, c, b, pt, y, y + p, storeys.at(-1).surface); along(f.axis, line, c - .03, b + .03, pt + .1, y + p, y + p + .06, cap, {seen: false}); } }
    if (!enter) solid(x0, x1, z0, z1);
    for (const tank of H.roof?.tanks || []) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 1.1, 14), materials.iron); c.position.set(tank[0], y + .75, tank[1]); c.castShadow = c.receiveShadow = true; scene.add(c); for (const dx of [-.4, .4]) block(.1, .2, 1, tank[0] + dx, y + .1, tank[1], 'beams', {seen: false}); }
    return y;
  }

  // ---- A balcony: a deck on beams with posts and rails, hung on a face of a house at height y.
  function balcony({axis, at, from, to, y, out, depth = 1.15, surface = 'planks'}) {
    const mid = at + out * depth / 2, P = (p, across, yy, w, h, d, s, opt) => axis === 'x' ? block(w, h, d, p, yy, across, s, opt) : block(d, h, w, across, yy, p, s, opt);
    P((from + to) / 2, mid, y - .04, to - from, .07, depth, surface);
    for (let p = from + .15; p <= to - .1; p += Math.max(.6, (to - from - .3) / Math.round((to - from) / .9))) P(p, mid - out * .1, y - .16, .13, .16, depth + .25, 'beams', {seen: false});
    for (let p = from + .06; p <= to; p += (to - from - .12) / Math.max(1, Math.round((to - from) / 1.3))) P(p, at + out * (depth - .06), y + .5, .08, 1, .08, 'beams', {seen: false});
    for (const yy of [y + .98, y + .5]) P((from + to) / 2, at + out * (depth - .06), yy, to - from, .07, .07, 'beams', {seen: false});
    for (const e of [from + .05, to - .05]) for (const yy of [y + .98, y + .5]) P(e, mid, yy, .07, .07, depth, 'beams', {seen: false});
    for (let p = from + .2; p < to - .1; p += .18) P(p, at + out * (depth - .06), y + .74, .035, .45, .035, surface, {seen: false, shadow: false});
  }
  // ---- Steps: `count` treads from the low end to the high end. Walked as the ramp the map's height describes.
  function steps({x: [x0, x1], z: [zHigh, zLow], low, high, count, surface = 'slab', sides}) {
    const rise = (high - low) / count, run = (zLow - zHigh) / count;
    for (let i = 0; i < count; i++) { const zc = zLow - run * (i + .5), top = low + rise * (i + 1); block(x1 - x0, top - low + 1.2, run + .02, (x0 + x1) / 2, (top + low - 1.2) / 2, zc, surface); block(x1 - x0 + .04, .05, run + .06, (x0 + x1) / 2, top + .005, zc + .02, surface, {seen: false, shadow: false}); }
    if (sides) for (const x of [x0 - sides.thick / 2, x1 + sides.thick / 2]) for (let i = 0; i < 3; i++) { const a = zLow - (zLow - zHigh) * (i + 1) / 3, b = zLow - (zLow - zHigh) * i / 3, top = low + (high - low) * (i + 1) / 3 + sides.above;
      block(sides.thick, top - low + 1.2, b - a, x, (top + low - 1.2) / 2, (a + b) / 2, sides.surface, {solid: true}); block(sides.thick + .1, .07, b - a + .06, x, top + .035, (a + b) / 2, 'slab', {seen: false}); }
  }
  // ---- An outside stair up the side of a house (geometry: it cannot be climbed until height is built).
  function flight({axis, at, from, to, low, high, width = 1, count = 12, out = 1, surface = 'masonry', tread = 'slab', landing = 0}) {
    const rise = (high - low) / count, run = (to - from) / count, across = at + out * width / 2;
    for (let i = 0; i < count; i++) { const c = from + run * (i + .5), top = low + rise * (i + 1), P = (h, yy, s, w, opt) => axis === 'x' ? block(Math.abs(run) + .01, h, w, c, yy, across, s, opt) : block(w, h, Math.abs(run) + .01, across, yy, c, s, opt);
      P(top - low, (top + low) / 2, surface, width, {seen: i % 3 === 0}); P(.05, top + .025, tread, width + .06, {seen: false, shadow: false}); }
    const a = Math.min(from, to), b = Math.max(from, to); axis === 'x' ? solid(a, b, Math.min(at, at + out * width), Math.max(at, at + out * width)) : solid(Math.min(at, at + out * width), Math.max(at, at + out * width), a, b);
    if (landing) { const L = landing, c = to + Math.sign(run) * L / 2, P = (h, yy, s, w) => axis === 'x' ? block(L, h, w, c, yy, across, s) : block(w, h, L, across, yy, c, s); P(high - low, (high + low) / 2, surface, width); P(.05, high + .025, tread, width + .06);
      axis === 'x' ? solid(Math.min(to, to + Math.sign(run) * L), Math.max(to, to + Math.sign(run) * L), Math.min(at, at + out * width), Math.max(at, at + out * width)) : solid(Math.min(at, at + out * width), Math.max(at, at + out * width), Math.min(to, to + Math.sign(run) * L), Math.max(to, to + Math.sign(run) * L)); }
  }
  // ---- A lean-to: a sheet sloping down in the direction `fall` ('x+', 'x-', 'z+', 'z-'), on posts at its low edge
  // (and at its high edge when it leans on nothing).
  function leanTo({x: [x0, x1], z: [z0, z1], base, high, low, fall, surface = 'iron', free = false}) {
    const onX = fall[0] === 'x', up = fall[1] === '+' ? 1 : -1, span = onX ? x1 - x0 : z1 - z0, angle = Math.atan2(high - low, span), len = Math.hypot(span, high - low) + .5, mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    onX ? block(len, .04, z1 - z0 + .4, mx, base + (high + low) / 2, mz, surface, {lean: -up * angle, seen: false}) : block(x1 - x0 + .4, .04, len, mx, base + (high + low) / 2, mz, surface, {tilt: up * angle, seen: false});
    const edge = (lowSide, h) => { const c = onX ? (up > 0 === lowSide ? x1 - .12 : x0 + .12) : (up > 0 === lowSide ? z1 - .12 : z0 + .12);
      for (const t of [.04, .5, .96]) onX ? block(.11, h - .06, .11, c, base + (h - .06) / 2, z0 + (z1 - z0) * t, 'beams', {seen: false}) : block(.11, h - .06, .11, x0 + (x1 - x0) * t, base + (h - .06) / 2, c, 'beams', {seen: false});
      onX ? block(.1, .12, z1 - z0 + .3, c, base + h - .1, mz, 'beams', {seen: false}) : block(x1 - x0 + .3, .12, .1, mx, base + h - .1, c, 'beams', {seen: false}); };
    edge(true, low + .12); if (free) edge(false, high - .12);
    for (const t of [.2, .5, .8]) onX ? block(.07, .09, z1 - z0 + .3, x0 + span * t, base + (up > 0 ? high - (high - low) * t : low + (high - low) * t) - .07, mz, 'beams', {seen: false}) : block(x1 - x0 + .3, .09, .07, mx, base + (up > 0 ? high - (high - low) * t : low + (high - low) * t) - .07, z0 + span * t, 'beams', {seen: false});
  }

  // ======== The block, from the map.
  for (const g of B.grounds) block(g.x[1] - g.x[0], g.deep || 1.4, g.z[1] - g.z[0], (g.x[0] + g.x[1]) / 2, g.level - (g.deep || 1.4) / 2 + (g.lift || 0), (g.z[0] + g.z[1]) / 2, g.surface, {shadow: false});
  for (const w of B.walls) { const top = w.base + w.height; along(w.axis, w.at, w.from, w.to, w.thick, w.base - (w.foot ?? 1.2), top, w.surface, {solid: w.axis === 'x' ? false : false});
    w.axis === 'x' ? solid(w.from, w.to, w.at - w.thick / 2, w.at + w.thick / 2) : solid(w.at - w.thick / 2, w.at + w.thick / 2, w.from, w.to);
    if (w.coping) along(w.axis, w.at, w.from - .04, w.to + .04, w.thick + .14, top, top + .08, w.coping, {seen: false}); }
  for (const s of B.steps) steps(s);
  const roofs = {}; for (const h of B.houses) roofs[h.id] = house(h);
  for (const b of B.balconies || []) balcony(b);
  for (const f of B.flights || []) flight(f);
  for (const l of B.leanTos || []) leanTo(l);
  for (const p of B.pieces || []) block(p.size[0], p.size[1], p.size[2], p.at[0], p.at[1], p.at[2], p.surface, {turn: p.turn || 0, tilt: p.tilt || 0, lean: p.lean || 0, solid: !!p.solid, seen: p.seen !== false});
  for (const a of B.arches || []) { const mid = (a.from + a.to) / 2, half = a.width / 2; along(a.axis, a.at, a.from, mid - half, a.thick, a.base - 1.2, a.base + a.height, a.surface); along(a.axis, a.at, mid + half, a.to, a.thick, a.base - 1.2, a.base + a.height, a.surface); along(a.axis, a.at, mid - half, mid + half, a.thick, a.base + a.clear, a.base + a.height, a.surface); along(a.axis, a.at, mid - half - .15, mid + half + .15, a.thick + .1, a.base + a.clear - .16, a.base + a.clear, 'beams', {seen: false});
    along(a.axis, a.at, a.from - .04, a.to + .04, a.thick + .14, a.base + a.height, a.base + a.height + .08, 'slab', {seen: false}); const s = (u, v) => a.axis === 'x' ? solid(u, v, a.at - a.thick / 2, a.at + a.thick / 2) : solid(a.at - a.thick / 2, a.at + a.thick / 2, u, v); s(a.from, mid - half); s(mid + half, a.to);
    if (a.gate) { s(mid - half, mid + half); for (const [e, dir] of [[mid - half, 1], [mid + half, -1]]) { const u = Math.cos(a.ajar || 0) * dir, v = Math.sin(a.ajar || 0) * (a.out || 1); a.axis === 'x' ? leaf(e, a.at, u, v, half - .03, a.base + .05, a.base + a.clear - .2, .07, a.gate) : leaf(a.at, e, v, u, half - .03, a.base + .05, a.base + a.clear - .2, .07, a.gate); } } }
  for (const w of B.wires || []) { const pts = [], [a, b] = w.between.map(p => new THREE.Vector3(...p)); for (let i = 0; i <= 24; i++) { const t = i / 24, p = a.clone().lerp(b, t); p.y -= Math.sin(t * Math.PI) * (w.sag ?? .5); pts.push(p); }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wire)); }
  for (const l of B.lamps || []) { const s = new THREE.Mesh(new THREE.SphereGeometry(l[3] || .05, 10, 8), glow); s.position.set(l[0], l[1], l[2]); scene.add(s); }
  // The ground outside the block takes the block's open-ground surface, so the hill and the yards are one ground.
  if (B.outside) { const m = materials[B.outside.surface], g = ctx.ground.material; g.map = m.map.clone(); g.normalMap = m.normalMap.clone(); g.roughnessMap = m.roughnessMap.clone(); for (const t of [g.map, g.normalMap, g.roughnessMap]) { t.repeat.set(B.outside.repeat, B.outside.repeat); t.needsUpdate = true; } g.color.set(B.outside.tint || '#ffffff'); g.needsUpdate = true; }

  // ======== The props: one model per kind, drawn once per part for all that stand in the block.
  const kinds = new Map(); for (const p of B.props) { if (!kinds.has(p[0])) kinds.set(p[0], []); kinds.get(p[0]).push(p); }
  stats.propKinds = kinds.size; stats.props = B.props.length;
  const gltf = new GLTFLoader(), holder = new THREE.Object3D(), ready = [];
  for (const [kind, list] of kinds) {
    const url = assetURL('assets/dehrun/models/' + kind + '.glb'); stats.requested.push(url);
    // What stands in the way stands from the start, whether or not its model has arrived.
    const hard = B.hardProps?.[kind]; if (hard) for (const [, x, z, turn = 0] of list) { const q = Math.abs(Math.sin(turn * Math.PI / 180)) > .7, w = q ? hard[1] : hard[0], d = q ? hard[0] : hard[1]; solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
      const o = new THREE.Mesh(new THREE.BoxGeometry(w, hard[2], d)); o.position.set(x, groundY(x, z) + hard[2] / 2, z); o.updateMatrixWorld(true); o.userData.round = true; occluders.push(o); }
    ready.push(fetch(url).then(r => { if (!r.ok) throw new Error(`${kind}: ${r.status}`); return r.arrayBuffer(); }).then(buffer => new Promise((done, fail) => gltf.parse(buffer, '', done, fail))).then(model => {
      model.scene.updateMatrixWorld(true); let triangles = 0;
      model.scene.traverse(o => { if (!o.isMesh) return; const m = o.material; if (m.transmission) { m.transmission = 0; m.transparent = true; m.opacity = .35; m.depthWrite = false; } if (m.map) m.map.anisotropy = aniso;
        const inst = new THREE.InstancedMesh(o.geometry, m, list.length); inst.castShadow = !m.transparent; inst.receiveShadow = true; inst.userData.prop = kind;
        list.forEach(([, x, z, turn = 0, lift = 0, scale = 1, tilt = 0], i) => { holder.position.set(x, groundY(x, z) + lift, z); holder.rotation.set(tilt * Math.PI / 180, turn * Math.PI / 180, 0); holder.scale.setScalar(scale); holder.updateMatrix(); inst.setMatrixAt(i, holder.matrix.clone().multiply(o.matrixWorld)); });
        inst.instanceMatrix.needsUpdate = true; inst.computeBoundingSphere(); scene.add(inst); triangles += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * list.length; });
      stats.propTriangles += triangles; ctx.changed?.(); return kind; }).catch(e => { console.warn('DUSTLINE: a model did not arrive:', kind, e?.message || e); stats.failed = (stats.failed || []).concat(kind); return null; }));
  }
  return {stats, materials, roofs, ready: Promise.all(ready)};
}
