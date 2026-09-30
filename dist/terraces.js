// Build 22: the building kit of Dehrun Terraces. It turns a map's description (dist/map-dehrun.js, `block`) into what
// stands there: terraces and their retaining walls, steps, houses of several storeys with door and window openings,
// floors, beam ends, parapets, balconies, outside stairs, awnings, wires and lamps, and the props, which are models.
// No place is written here: every position, size and choice of surface comes from the map.
// Everything is built from boxes and planes that carry photographed surfaces (assets/dehrun/tex) so that the game's
// static batching draws each surface in one call; each kind of prop (assets/dehrun/models) is drawn in one call per part
// however many stand in the block. No light source is added: lamps glow through an unlit material, and rooms are
// darkened by their own surfaces.
// Since Build 24 the kit also hands the game a space (dist/space.js) made of every box it built, so that a body walks
// its stairs tread by tread, climbs its ladders and falls from its roofs. Build 25 added what a large building needs
// inside: rooms and the partitions between them, doors in those partitions, stairs of two flights with a railing, and
// stair heads onto the roof; all of it from the map's description, as before.
import * as THREE from './three.module.js';
import {GLTFLoader} from './GLTFLoader.js';
import {assetURL} from './build.js';
import {makeSpace} from './space.js';

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

const assert = (ok, what) => { if (!ok) throw new Error('DUSTLINE kit: ' + what); };

export function buildTerraces(ctx, map) {
  const {scene, renderer, solids, occluders, groundY} = ctx, B = map.block, loader = new THREE.TextureLoader();
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy()), textures = new Map(), materials = {}, stats = {list: [], awnings: [], boxes: 0, props: 0, propKinds: 0, propTriangles: 0, requested: []};
  const texture = (file, kind) => { const key = `${file}_${kind}`; if (textures.has(key)) return textures.get(key);
    const url = kind === 'diff' ? assetURL('assets/dehrun/tex/' + file + '_diff_1k.jpg') : kind === 'nor_gl' ? assetURL('assets/dehrun/tex/' + file + '_nor_gl_1k.jpg') : assetURL('assets/dehrun/tex/' + file + '_arm_1k.jpg');
    const t = loader.load(url); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso; if (kind === 'diff') t.colorSpace = THREE.SRGBColorSpace; textures.set(key, t); stats.requested.push(url); return t; };
  for (const [name, s] of Object.entries(SURFACES)) { const arm = texture(s.file, 'arm');
    materials[name] = new THREE.MeshStandardMaterial({color: s.tint || '#ffffff', map: texture(s.file, 'diff'), normalMap: texture(s.file, 'nor_gl'), aoMap: arm, roughnessMap: arm, roughness: 1, metalness: s.metal ? 1 : 0, ...(s.metal ? {metalnessMap: arm} : {}), side: s.both ? THREE.DoubleSide : THREE.FrontSide});
    const m = materials[name]; m.vertexColors = true; m.normalScale.setScalar(s.relief || 1); m.userData.surface = name; if (s.shade != null) m.aoMapIntensity = s.shade; if (s.fill) { m.emissive.set(s.fill); m.emissiveMap = m.map; } }
  // What has no photographed surface: cloth (a picture woven here, striped and faded), window glass, the dark of a
  // closed room, lamp glow, wire.
  function woven(colour) { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'), base = new THREE.Color(colour);
    x.fillStyle = '#' + base.getHexString(); x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 8; i++) { x.fillStyle = i % 4 === 0 ? 'rgba(233,222,196,.5)' : i % 4 === 2 ? 'rgba(30,24,18,.18)' : 'rgba(0,0,0,0)'; x.fillRect(i * 32 + 10, 0, i % 4 === 0 ? 9 : 4, 256); }
    for (let i = 0; i < 256; i += 2) { x.fillStyle = `rgba(0,0,0,${.035 + .03 * Math.sin(i * 1.7)})`; x.fillRect(0, i, 256, 1); x.fillStyle = `rgba(255,255,255,${.025 + .02 * Math.sin(i * 2.3)})`; x.fillRect(i, 0, 1, 256); }
    for (let i = 0; i < 40; i++) { const px = (Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * 256, py = (Math.sin(i * 78.233) * 12543.123 % 1 + 1) % 1 * 256, r = 10 + i % 7 * 5; const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop?.(0, i % 3 ? 'rgba(60,45,30,.14)' : 'rgba(240,230,210,.12)'); g.addColorStop?.(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; }
  const cloth = colour => { const k = 'cloth' + colour; if (!materials[k]) { materials[k] = new THREE.MeshStandardMaterial({color: '#ffffff', map: woven(colour), roughness: .96, side: THREE.DoubleSide}); materials[k].userData.surface = k; } return materials[k]; };
  const plain = (name, m) => { m.userData.surface = name; return materials[name] = m; };
  const dark = plain('dark', new THREE.MeshStandardMaterial({color: '#14110e', roughness: 1}));
  const pane = plain('pane', new THREE.MeshStandardMaterial({color: '#232b2e', roughness: .06, metalness: 0, envMapIntensity: 1.6}));                      // glass with a dark room behind
  const clear = plain('clear', new THREE.MeshStandardMaterial({color: '#aebdc0', roughness: .05, metalness: 0, envMapIntensity: 1.6, transparent: true, opacity: .28, depthWrite: false}));   // glass that is seen through
  const iron = plain('bars', new THREE.MeshStandardMaterial({color: '#2a2724', roughness: .6, metalness: .7}));
  const tankIron = materials.iron.clone(); tankIron.vertexColors = false; tankIron.userData = {surface: 'tank'}; materials.tank = tankIron;
  const glow = materials.glow = new THREE.MeshBasicMaterial({color: '#ffd9a0'});
  const wire = new THREE.LineBasicMaterial({color: 0x2c2a26});
  // Numbers that look like chance and are the same every time: from a place, a value from 0 to 1.
  const chance = (x, y, z, k = 0) => { const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + k * 19.19) * 43758.5453; return v - Math.floor(v); };
  const smoothstep = v => { const t = Math.min(1, Math.max(0, v)); return t * t * (3 - 2 * t); };
  // The shade a built surface has at a place: lighter and darker over metres, as walls are, and darker towards the
  // ground on what stands upright, where rain splashes and feet scuff.
  const stain = (x, y, z, upright) => { const n = .5 * Math.sin(x * .37 + z * .21 + y * .53) + .3 * Math.sin(x * .13 - z * .41 + 1.7) + .2 * Math.sin(x * 1.1 + z * .9 + y * 1.3), h = y - groundY(x, z);
    return (1 + .075 * n) * (upright ? .7 + .3 * smoothstep((h + .1) / 1.3) : 1); };

  // A box whose surface repeats by its size in metres and continues from one box to the next. Large boxes are made
  // of several faces a side so that their shade can change along them.
  // Surfaces a body passes through: glass and a casement's glazing bars stand in a window a body can climb through.
  const PASSABLE = new Set(['pane', 'clear', 'glow']);
  function block(w, h, d, x, y, z, surface, {solid = false, seen = true, turn = 0, tilt = 0, lean = 0, shadow = true, tag = null, body = null} = {}) {
    const m = typeof surface === 'string' ? materials[surface] : surface, name = m.userData.surface, tile = SURFACES[name]?.tile || 1, turned = !!(turn || tilt || lean);
    assert(m && w > 0 && h > 0 && d > 0, `a box of ${surface}: ${w} x ${h} x ${d}`);
    const cut = v => turned || !m.vertexColors ? 1 : Math.min(6, Math.max(1, Math.ceil(v / 3.2))), g = new THREE.BoxGeometry(w, h, d, cut(w), cut(h), cut(d)), uv = g.attributes.uv, pos = g.attributes.position, nor = g.attributes.normal;
    for (let i = 0; i < uv.count; i++) { const f = Math.abs(nor.getX(i)) > .5 ? 'x' : Math.abs(nor.getY(i)) > .5 ? 'y' : 'z', px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i);
      const [u, v] = f === 'x' ? [pz + z, py + y] : f === 'y' ? [px + x, pz + z] : [px + x, py + y]; uv.setXY(i, u / tile, v / tile); }
    if (m.vertexColors) { const c = new Float32Array(pos.count * 3), o = new THREE.Object3D(); o.position.set(x, y, z); o.rotation.set(tilt, turn, lean); o.updateMatrix(); const q = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) { q.fromBufferAttribute(pos, i).applyMatrix4(o.matrix); const v = stain(q.x, q.y, q.z, !turned && Math.abs(nor.getY(i)) < .5); c[i * 3] = v; c[i * 3 + 1] = v * .985; c[i * 3 + 2] = v * .96; }
      g.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
    stats.list.push({at: [x, y, z], size: [w, h, d], surface: name || 'plain', turned, min: [x - w / 2, y - h / 2, z - d / 2], max: [x + w / 2, y + h / 2, z + d / 2], solid: body ?? (!turned && !PASSABLE.has(name)), tag});
    const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.rotation.set(tilt, turn, lean); o.castShadow = shadow; o.receiveShadow = true; scene.add(o); stats.boxes++;
    if (solid) solids.push({x, z, w: w / 2, d: d / 2});
    if (seen && !turned) occluders.push(o);
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
  function wall({axis, at, from, to, base, height, thick = .34, surface, lining, out = 1, openings = [], hard = false, plain = false}) {
    const list = [...openings].sort((a, b) => a.at - b.at), top = base + height, skin = lining ? .06 : 0, body = thick - skin, mid = at + out * skin / 2, inner = at - out * (thick - skin) / 2;
    const piece = (a, b, y0, y1, closes) => { if (b - a < .01 || y1 - y0 < .01) return; along(axis, mid, a, b, body, y0, y1, surface); if (lining) along(axis, inner, a, b, skin, y0, y1, lining, {shadow: false});
      if (hard && closes) axis === 'x' ? solid(a, b, at - thick / 2, at + thick / 2) : solid(at - thick / 2, at + thick / 2, a, b); };
    let cursor = from;
    for (const o of list) { const a = o.at - o.width / 2, b = o.at + o.width / 2, sill = base + (o.sill || 0), head = base + o.head;
      piece(cursor, a, base, top, true); piece(a, b, base, sill, false); piece(a, b, head, top, false);
      if (hard && (o.sill || o.closed || o.kind === 'shop' && o.counter)) axis === 'x' ? solid(a, b, at - thick / 2, at + thick / 2) : solid(at - thick / 2, at + thick / 2, a, b);
      dress(o, {axis, at, out, thick, a, b, sill, head, plain}); cursor = b; }
    piece(cursor, to, base, top, true);
  }
  // What an opening gets. A window: a frame in the wall's depth, a stone sill, a casement set back in it with glass
  // and glazing bars, shutters outside, iron bars where asked. A door: a frame, a threshold, a leaf of planks with
  // battens that stands in the opening when shut and swings into the room when open. A shop: a rolling shutter and a
  // counter. An awning: cloth that sags, with a hem, on a rail at the wall and a pole on posts or on brackets.
  function dress(o, {axis, at, out, thick, a, b, sill, head, plain}) {
    const face = at + out * thick / 2, P = (along_, across, y, w, h, d, surface, opt) => axis === 'x' ? block(w, h, d, along_, y, across, surface, opt) : block(d, h, w, across, y, along_, surface, opt);
    const frame = o.frame || 'beams', deep = thick + .08, mid = (a + b) / 2, w = b - a, tall = head - sill, set = at + out * (thick / 2 - .13);   // `set`: where the casement or the shut door stands
    if (o.kind === 'open') { P(mid, at, head + .06, w + .3, .15, deep + .06, frame); return; }   // Build 25: a plain opening (the way into a stair): a beam across it and nothing else
    if (o.kind !== 'shop') { P(a + .04, at, (sill + head) / 2, .08, tall - .03, deep, frame); P(b - .04, at, (sill + head) / 2, .08, tall - .03, deep, frame); }
    P(mid, at, head + .06, w + .3, .15, deep + .06, frame);                                  // the lintel, a beam across, a little below the wall it carries
    if (o.sill) P(mid, face + out * .05, sill - .025, w + .24, .08, .3, 'slab'); else P(mid, at, sill + .04, w, .06, deep + .1, 'slab', {shadow: false});
    if (o.closed || o.back) P(mid, at - out * (thick / 2 + .06), (sill + head) / 2, w + .2, tall + .2, .03, dark, {shadow: false, seen: !!o.closed});
    // Swung by `angle` from closed, towards the side `to` (+1 outside, -1 inside), hinged at the end `end`, reaching towards `dir` when closed.
    const hinge = (end, dir, angle, length, surface, to = 1, line = at + out * to * (thick / 2 + .03), y0 = sill + .03, y1 = head - .03, fat = .045) => { const u = Math.cos(angle) * dir, v = Math.sin(angle) * out * to;
      return axis === 'x' ? leaf(end, line, u, v, length, y0, y1, fat, surface) : leaf(line, end, v, u, length, y0, y1, fat, surface); };
    // A house beyond the walls is seen from far: it gets the frame, the dark room and the shutters, and no more.
    if (plain) { if (o.kind === 'window' && o.shutters !== false) { const open = o.open ?? 2.75, half = w / 2 - .06, [l, r] = Array.isArray(open) ? open : [open, open]; hinge(a + .04, 1, l, half, o.leaf || 'blue'); hinge(b - .04, -1, r, half, o.leaf || 'blue'); } return; }
    if (o.kind === 'window') { const glass = o.closed || o.back ? pane : clear, y = (sill + head) / 2, rail = .055;
      P(mid, set, y, w - .17, tall - .08, .012, glass, {shadow: false, seen: false});
      // The casement stops no body: a window without bars can be climbed through (its glass gives way to the story).
      for (const e of [a + .08 + rail / 2, b - .08 - rail / 2]) P(e, set, y, rail, tall - .06, .05, frame, {seen: false, shadow: false, body: false, tag: 'casement'}); for (const e of [sill + .04 + rail / 2, head - .04 - rail / 2]) P(mid, set, e, w - .17 - 2 * rail, rail, .05, frame, {seen: false, shadow: false, body: false, tag: 'casement'});
      P(mid, set, y, .035, tall - .08 - 2 * rail, .04, frame, {seen: false, shadow: false, body: false, tag: 'casement'}); if (tall > 1) P(mid, set, sill + tall * .62, w - .17 - 2 * rail, .035, .038, frame, {seen: false, shadow: false, body: false, tag: 'casement'});
      if (o.shutters !== false) { const open = o.open ?? 2.75, half = w / 2 - .06, [l, r] = Array.isArray(open) ? open : [open, open]; hinge(a + .04, 1, l, half, o.leaf || 'blue'); hinge(b - .04, -1, r, half, o.leaf || 'blue'); }
      if (o.bars) { for (let i = 1; i < 5; i++) P(a + w * i / 5, face - out * .05, y, .022, tall - .05, .022, iron, {shadow: false, seen: false}); for (const e of [sill + tall * .3, sill + tall * .7]) P(mid, face - out * .05, e, w - .16, .02, .03, iron, {shadow: false, seen: false}); } }
    if (o.kind === 'door' && o.door !== false) { const shut = !!o.closed && o.open == null, L = w - .17, plank = o.leaf || 'planks', to = o.swing === 'out' ? 1 : -1;   // an open leaf swings into the room, or out when the map says so (a door onto a roof)
      const d = shut ? hinge(a + .085, 1, 0, L, plank, 1, set, sill + .06, head - .04, .05) : hinge(a + .085, 1, o.open ?? 1.75, L, plank, to, at + out * to * (thick / 2 + .03), sill + .06, head - .04, .05);
      // Battens across the planks and a handle, on the leaf's outer side, turned with it.
      const side = shut ? out : -to, put = (u, y, len, hgt, fat, surface, off) => { const c = block(len, hgt, fat, 0, y, 0, surface, {turn: d.rotation.y, seen: false, shadow: false}), ux = Math.cos(d.rotation.y), uz = -Math.sin(d.rotation.y), nx = -uz, nz = ux, k = (axis === 'x' ? nz : nx) * side > 0 ? 1 : -1;
        c.position.set(d.position.x + ux * u + nx * k * off, y, d.position.z + uz * u + nz * k * off); const rec = stats.list.at(-1); rec.at = [c.position.x, y, c.position.z]; rec.min = [c.position.x - len / 2, y - hgt / 2, c.position.z - fat / 2]; rec.max = [c.position.x + len / 2, y + hgt / 2, c.position.z + fat / 2]; return c; };
      for (const t of [.2, .55, .85]) put(0, sill + tall * t, L - .06, .09, .025, frame, .037); put(L * .36, sill + tall * .46, .04, .14, .04, iron, .045); }
    if (o.kind === 'shop') { const drop = o.drop ?? .9, slats = Math.max(1, Math.round(drop / .11));
      for (let i = 0; i < slats; i++) P(mid, face - out * (.1 + (i % 2) * .012), head - drop * (i + .5) / slats, w - .02, drop / slats - .004, .04, 'shutter', {seen: i === 0, shadow: i % 3 === 0});          // slats, every other one a little forward
      P(mid, face - out * .1, head + .03, w + .1, .24, .26, 'shutter'); for (const e of [a + .03, b - .03]) P(e, face - out * .1, (sill + head) / 2, .05, tall, .07, iron, {seen: false});                  // the box it rolls into, and its guides
      if (o.counter) { P(mid, at, sill + .45, w, .9, thick + .3, 'masonry'); P(mid, at, sill + .935, w + .1, .06, thick + .5, 'planks'); } }
    if (o.awning) awning(o.awning, {axis, out, face, a, b, ground: sill - (o.sill || 0), head, P});
  }
  function awning([colour, reach = 1.5, carried = 'posts'], {axis, out, face, a, b, ground, head, P}) {
    const w = b - a + .7, mid = (a + b) / 2, high = head + .62, fall = .5, nx = 14, nz = 10, g = new THREE.PlaneGeometry(w, reach, nx, nz); g.rotateX(-Math.PI / 2); const p = g.attributes.position, uv = g.attributes.uv;
    // The cloth: down from the rail at the wall to the pole, slack between them and between the posts.
    const sag = (x, t) => -t * fall - Math.sin(t * Math.PI) * .09 * (1 - .5 * Math.abs(x) / (w / 2)) - (1 - (2 * x / w) ** 2) * .05 * t + Math.sin(x * 2.3 + t * 4) * .012;
    for (let i = 0; i < p.count; i++) { const t = (p.getZ(i) + reach / 2) / reach; p.setY(i, sag(p.getX(i), t)); uv.setXY(i, (p.getX(i) + w / 2) / 1.1, t * reach / 1.1); } g.computeVertexNormals();
    const turn = axis === 'x' ? (out > 0 ? 0 : Math.PI) : (out > 0 ? Math.PI / 2 : -Math.PI / 2), c = face + out * (reach / 2 + .02), place = m => { m.castShadow = m.receiveShadow = true; m.rotation.y = turn; m.position.set(axis === 'x' ? mid : c, high, axis === 'x' ? c : mid); m.userData.cloth = true; scene.add(m); return m; };
    place(new THREE.Mesh(g, cloth(colour)));
    // What was made, for the checks: how far the middle of the cloth hangs below the straight line from rail to pole.
    stats.awnings.push({colour, reach, carried, slack: +(-(sag(0, .5) - (sag(0, 0) + sag(0, 1)) / 2)).toFixed(3), points: p.count, hem: true});
    // Its hem: a strip hanging from the front edge, cut in shallow points.
    const hem = new THREE.PlaneGeometry(w, .2, nx * 2, 1), hp = hem.attributes.position, hu = hem.attributes.uv; for (let i = 0; i < hp.count; i++) { const x = hp.getX(i), low = hp.getY(i) < 0; hp.setXYZ(i, x, sag(x, 1) - (low ? .16 + .05 * Math.abs(Math.sin(x * 5.2)) : 0), reach / 2 + (low ? .015 : 0)); hu.setXY(i, (x + w / 2) / 1.1, low ? .2 : 0); } hem.computeVertexNormals(); place(new THREE.Mesh(hem, cloth(colour)));
    P(mid, face + out * .04, high + .02, w + .1, .07, .07, 'beams', {seen: false});                                                       // the rail at the wall
    const front = face + out * (reach + .02), edge = high - fall;
    P(mid, front, edge + .005, w + .2, .06, .06, 'beams', {seen: false});                                                                // the pole at the front
    for (const e of [a - .3, b + .3]) { if (carried === 'posts') { P(e, front, (ground + edge) / 2, .075, edge - ground, .075, 'beams', {seen: false}); P(e, front, ground + .06, .16, .12, .16, 'slab', {seen: false}); }
      else { const len = Math.hypot(reach, reach * .75), ang = Math.atan2(reach * .75, reach), s = axis === 'x' ? block(.06, .06, len, e, edge - reach * .375, face + out * reach / 2, 'beams', {tilt: -out * ang, seen: false}) : block(len, .06, .06, face + out * reach / 2, edge - reach * .375, e, 'beams', {lean: out * ang, seen: false}); void s; }
      P(e, face + out * reach / 2, (high + edge) / 2 + .03, .05, .05, reach, 'beams', {seen: false, [axis === 'x' ? 'tilt' : 'lean']: (axis === 'x' ? out : -out) * Math.atan2(fall, reach)}); }   // the arms from the rail to the pole
  }

  // A horizontal slab with rectangular holes cut in it (a stair well, a roof hatch): what is left is built in pieces.
  function slab(x0, x1, z0, z1, y, thick, surface, holes = [], opt = {}) {
    let pieces = [[x0, x1, z0, z1]];
    for (const h of holes) { const next = []; for (const [a, b, c, d] of pieces) { if (h.x[1] <= a || h.x[0] >= b || h.z[1] <= c || h.z[0] >= d) { next.push([a, b, c, d]); continue; }
      const hx0 = Math.max(a, h.x[0]), hx1 = Math.min(b, h.x[1]), hz0 = Math.max(c, h.z[0]), hz1 = Math.min(d, h.z[1]);
      if (hz0 > c) next.push([a, b, c, hz0]); if (hz1 < d) next.push([a, b, hz1, d]); if (hx0 > a) next.push([a, hx0, hz0, hz1]); if (hx1 < b) next.push([hx1, b, hz0, hz1]); } pieces = next; }
    for (const [a, b, c, d] of pieces) if (b - a > .01 && d - c > .01) block(b - a, thick, d - c, (a + b) / 2, y, (c + d) / 2, surface, opt);
  }
  // ---- A house: storeys of four walls, floors between them, beam ends under each floor, a flat roof behind a parapet.
  // Build 25: a storey may be divided into rooms (`rooms`, rectangles that tile it, a corridor among them); the kit
  // builds a partition along every edge two rooms share or a room shares with nothing, with the `doors` the map puts
  // on those edges. A `stair` climbs a storey in two flights and a half landing, with a railing between the flights;
  // it cuts the floor above by itself; with a `head` it comes out on the roof through a small house with a door.
  function house(H) {
    const {x: [x0, x1], z: [z0, z1], base, storeys} = H, t = H.thick || .34, enter = !!H.enter, stairs = H.stairs || []; let y = base;
    const faces = {north: {axis: 'x', at: z0 + t / 2, from: x0, to: x1, out: -1}, south: {axis: 'x', at: z1 - t / 2, from: x0, to: x1, out: 1}, west: {axis: 'z', at: x0 + t / 2, from: z0 + t, to: z1 - t, out: -1}, east: {axis: 'z', at: x1 - t / 2, from: z0 + t, to: z1 - t, out: 1}};
    // A stair's well, `run` from its entry edge to its far end and `across` from side to side; where a side is the house's
    // own wall the well stops at the wall's lining, so that nothing of the stair lies in the lining's plane.
    const span = s => { const onZ = s.axis !== 'x', across = [...(onZ ? s.x : s.z)].sort((a, b) => a - b), [lo, hi] = onZ ? [x0 + t, x1 - t] : [z0 + t, z1 - t]; if (Math.abs(across[0] - lo) < .01) across[0] = lo + .06; if (Math.abs(across[1] - hi) < .01) across[1] = hi - .06; return {onZ, run: onZ ? s.z : s.x, across}; };
    const wells = (H.wells || []).concat(stairs.map(s => { const {run, across, onZ} = span(s), u = [Math.min(...run), Math.max(...run)]; return {x: onZ ? across : u, z: onZ ? u : across, storeys: s.storeys}; }));
    block(x1 - x0 + .3, 1.4, z1 - z0 + .3, (x0 + x1) / 2, base - .74, (z0 + z1) / 2, 'masonry', {seen: false});    // the footing, down into the ground
    storeys.forEach((S, n) => {
      const ground = n === 0, inside = enter && (ground || S.room) ? (S.lining || 'room') : null, holes = wells.filter(w => w.storeys.includes(n));
      for (const [name, f] of Object.entries(faces)) wall({...f, base: y, height: S.height, thick: t, surface: S.surface, lining: inside, openings: (S[name] || []).map(o => ({...o, closed: o.closed ?? (!enter && o.kind !== 'shop'), back: o.back ?? (enter && !ground && !S.room ? .02 : 0)})), hard: ground && enter, plain: !!H.plain});
      if (ground && enter) block(x1 - x0 - 2 * t, .08, z1 - z0 - 2 * t, (x0 + x1) / 2, y + .01, (z0 + z1) / 2, S.floor || 'floor', {shadow: false, tag: 'floor'});
      if (inside) { slab(x0 + t, x1 - t, z0 + t, z1 - t, y + S.height - .235, .05, 'ceiling', holes, {shadow: false});                // the ceiling and its beams
        for (let z = z0 + .8; z < z1 - .4; z += 1.1) slab(x0 + t, x1 - t, z - .07, z + .07, y + S.height - .34, .16, 'beams', holes, {shadow: false, seen: false}); }
      if (S.rooms) partitions(S, n, y, inside || 'room', ground && enter);
      for (const s of stairs) if (s.storeys.includes(n)) stair(s, y, y + S.height);
      y += S.height;
      n === storeys.length - 1 ? slab(x0 + .15, x1 - .15, z0 + .15, z1 - .15, y - .07, .2, H.roof?.surface || 'gravel', holes, {tag: 'roof'}) : slab(x0 + t + .01, x1 - t - .01, z0 + t + .01, z1 - t - .01, y - .1, .2, 'planks', holes, {tag: 'floor'});                        // the floor above, or the roof
      for (const side of S.beamEnds || H.beamEnds || []) { const f = faces[side];                                     // beam ends through the wall: no two alike, as hewn timber is
        for (let p = f.from + .35 + .3 * chance(f.at, y, f.from); p < f.to - .25; p += .62 + .5 * chance(p, y, f.at, 1)) { const k = chance(p, y, f.at, 2), reach = .26 + .22 * k, fat = .12 + .06 * chance(p, y, f.at, 3), drop = .02 * chance(p, y, f.at, 4);
          if ((B.balconies || []).some(v => v.axis === f.axis && Math.abs(v.at - (f.at + f.out * t / 2)) < .05 && Math.abs(v.y - y) < .4 && p > v.from - .1 && p < v.to + .1)) continue;   // a balcony's own beams are there
          f.axis === 'x' ? block(fat, fat, reach, p, y - .22 - drop, f.at + f.out * (t / 2 + reach / 2 - .04), 'beams', {seen: false}) : block(reach, fat, fat, f.at + f.out * (t / 2 + reach / 2 - .04), y - .22 - drop, p, 'beams', {seen: false}); } }
      if (S.band) for (const f of Object.values(faces)) along(f.axis, f.at + f.out * (t / 2 + .02), f.from - (f.axis === 'z' ? t : 0), f.to + (f.axis === 'z' ? t : 0), .06, y - .12, y + .08, S.band, {seen: false, shadow: false});
    });
    const p = H.roof?.parapet ?? .55, cap = H.roof?.coping || 'slab';
    for (const f of Object.values(faces)) { const pt = .26, line = f.at + f.out * (t - pt) / 2, a = f.from - (f.axis === 'z' ? t : 0), b = f.to + (f.axis === 'z' ? t : 0), gaps = (H.roof?.gaps || []).filter(g => g.side === Object.keys(faces).find(k => faces[k] === f));
      let c = a; for (const g of [...gaps].sort((u, v) => u.from - v.from)) { if (g.from - c > .05) { along(f.axis, line, c, g.from, pt, y, y + p, storeys.at(-1).surface); along(f.axis, line, c - .03, g.from + .03, pt + .1, y + p, y + p + .06, cap, {seen: false}); } c = g.to; }
      if (b - c > .05) { along(f.axis, line, c, b, pt, y, y + p, storeys.at(-1).surface); along(f.axis, line, c - .03, b + .03, pt + .1, y + p, y + p + .06, cap, {seen: false}); } }
    if (!enter) solid(x0, x1, z0, z1);
    for (const tank of H.roof?.tanks || []) { const c = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 1.1, 14), tankIron); c.position.set(tank[0], y + .75, tank[1]); c.castShadow = c.receiveShadow = true; scene.add(c); for (const dx of [-.4, .4]) block(.1, .2, 1, tank[0] + dx, y + .1, tank[1], 'beams', {seen: false});
      tankBoxes.push({min: [tank[0] - .55, y + .2, tank[1] - .55], max: [tank[0] + .55, y + 1.3, tank[1] + .55], solid: true, tag: 'tank'}); }   // Build 25: a tank stands in a body's way (it is a cylinder, not a box of the kit)
    for (const s of stairs) if (s.head) head(s, y, storeys.at(-1).surface);
    return y;

    // The partitions of a storey: along every edge of a room that is not the house's own wall, merged where rooms
    // share a line, with the storey's doors on them and the way into each stair that begins on this storey.
    function partitions(S, n, y, lining, hard) {
      const pt = S.partition || .2, bounds = {z: [x0 + t, x1 - t], x: [z0 + t, z1 - t]}, lines = new Map(), used = new Map();
      const edge = (axis, at, [a, b]) => { if (bounds[axis].some(v => Math.abs(v - at) < .03)) return; const k = `${axis}:${at.toFixed(2)}`; if (!lines.has(k)) lines.set(k, {axis, at, segs: []}); lines.get(k).segs.push([Math.min(a, b), Math.max(a, b)]); };
      for (const r of S.rooms) { assert(r.x[1] > r.x[0] && r.z[1] > r.z[0], `${H.id}: the room ${r.id} of storey ${n}`); edge('z', r.x[0], r.z); edge('z', r.x[1], r.z); edge('x', r.z[0], r.x); edge('x', r.z[1], r.x); }
      for (const l of lines.values()) { const merged = []; for (const s of l.segs.sort((p, q) => p[0] - q[0])) { const last = merged.at(-1); if (last && s[0] <= last[1] + .01) last[1] = Math.max(last[1], s[1]); else merged.push([...s]); }
        for (const [a, b] of merged) { const openings = [];
          (S.doors || []).forEach((d, i) => { const along = l.axis === 'x' ? d.at[0] : d.at[1], across = l.axis === 'x' ? d.at[1] : d.at[0]; if (Math.abs(across - l.at) > pt / 2 + .01 || along < a || along > b) return; used.set(i, (used.get(i) || 0) + 1);
            openings.push({kind: d.kind || 'door', at: along, width: d.width || H.door?.width || 1.3, head: d.head || H.door?.head || 2.2, leaf: d.leaf || 'planks', open: d.open ?? 1.75, door: d.door, frame: d.frame, swing: d.swing}); });
          for (const s of stairs) if (s.storeys.includes(n)) { const {onZ, run, across} = span(s); if ((onZ ? 'x' : 'z') === l.axis && Math.abs(run[0] - l.at) < .01 && across[0] >= a - .01 && across[1] <= b + .01) openings.push({kind: 'open', at: (across[0] + across[1]) / 2, width: across[1] - across[0] - .1, head: S.height - .5}); }
          wall({axis: l.axis, at: l.at, from: a - .1, to: b + .1, base: y, height: S.height - .22, thick: pt, surface: lining, out: 1, openings, hard}); } }
      (S.doors || []).forEach((d, i) => assert(used.get(i) === 1, `${H.id}: the door at ${d.at} of storey ${n} is on no partition`));
    }
    // A stair up one storey in a well: the first flight climbs from the entry edge to a half landing at the far end,
    // the second climbs back beside it to the floor above, coming out at the entry edge. Between the flights a
    // railing of posts (a body cannot pass between them) under a sloping handrail. Its underside follows the treads,
    // so that the flight above leaves room to stand under it.
    function stair(s, y0, y1) {
      const {onZ, run: [n0, n1], across: [v0, v1]} = span(s), vm = (v0 + v1) / 2, dir = Math.sign(n1 - n0), L = s.landing || 1.5, length = Math.abs(n1 - n0) - L, treads = s.treads || 8, rise = (y1 - y0) / (2 * treads), tr = length / treads, mid = (y0 + y1) / 2, body = s.surface || 'masonry', tread = s.tread || 'planks';
      assert(tr > .349 && rise < .33 && v1 - v0 > 1.8, `${H.id}: a stair of ${treads} treads, ${tr.toFixed(2)} m by ${rise.toFixed(2)} m, ${(v1 - v0).toFixed(2)} m wide`);
      const box = (ua, ub, va, vb, ya, yb, surface, opt) => { const [u0, u1] = ua < ub ? [ua, ub] : [ub, ua]; return onZ ? block(vb - va, yb - ya, u1 - u0, (va + vb) / 2, (ya + yb) / 2, (u0 + u1) / 2, surface, opt) : block(u1 - u0, yb - ya, vb - va, (u0 + u1) / 2, (ya + yb) / 2, (va + vb) / 2, surface, opt); };
      const flight = (va, vb, low, away) => {   // `away` +1: from the entry edge towards the far end; -1: from the far end back to the entry edge
        for (let i = 0; i < treads; i++) { const top = low + rise * (i + 1), k = away > 0 ? i : treads - 1 - i, ua = n0 + dir * tr * k, ub = ua + dir * tr;
          box(ua, ub, va, vb, top - rise - .22, top - .03, body, {seen: i % 3 === 0, tag: 'stair'}); box(ua - dir * .005, ub + dir * .005, va, vb, top - .03, top, tread, {shadow: false, tag: 'stair'});
          box(ua + dir * (tr / 2 - .02), ua + dir * (tr / 2 + .02), vm - .02, vm + .02, top, top + .92, 'beams', {seen: false, shadow: false, tag: 'rail'}); }
        const slope = Math.atan2(rise * (treads - 1), tr * (treads - 1)) * dir * away, len = Math.hypot(tr * (treads - 1), rise * (treads - 1)) + .12, uc = n0 + dir * tr * treads / 2, yc = low + rise * (treads + 1) / 2 + .95;
        onZ ? block(.06, .06, len, vm, yc, uc, 'beams', {tilt: -slope, seen: false, tag: 'rail'}) : block(len, .06, .06, uc, yc, vm, 'beams', {lean: slope, seen: false, tag: 'rail'}); };
      flight(v0, vm, y0, 1); flight(vm, v1, mid, -1);
      box(n1 - dir * L, n1, v0, v1, mid - .3, mid - .03, body, {tag: 'stair'}); box(n1 - dir * (L + .005), n1, v0, v1, mid - .03, mid, tread, {shadow: false, tag: 'stair'});
    }
    // The stair head on the roof: a small house over the well with a door where the top flight comes out.
    function head(s, y, surface) {
      const {onZ, run: [n0, n1], across: [v0, v1]} = span(s), dir = Math.sign(n1 - n0), pt = .2, top = s.head.height || 2.4, hs = s.head.surface || surface, uMin = Math.min(n0, n1) - pt + .02, uMax = Math.max(n0, n1) + pt - .02;
      const W = (axis, at, from, to, out, openings = []) => wall({axis, at, from, to, base: y - .02, height: top + .02, thick: pt, surface: hs, out, openings});
      const door = [{kind: 'door', at: (v0 + 3 * v1) / 4, width: s.head.door || 1.3, head: 2.15, leaf: s.head.leaf || 'planks', open: 1.9, swing: 'out'}];
      W(onZ ? 'z' : 'x', v0 - pt / 2 + .02, uMin, uMax, -1); W(onZ ? 'z' : 'x', v1 + pt / 2 - .02, uMin, uMax, 1);
      W(onZ ? 'x' : 'z', n1 + dir * (pt / 2 - .02), v0 - pt + .02, v1 + pt - .02, dir); W(onZ ? 'x' : 'z', n0 - dir * (pt / 2 - .02), v0 - pt + .02, v1 + pt - .02, -dir, door);
      const u = [uMin - .15, uMax + .15], v = [v0 - pt - .13, v1 + pt + .13]; slab(...(onZ ? [v[0], v[1], u[0], u[1]] : [u[0], u[1], v[0], v[1]]), y + top + .05, .12, s.head.roof || 'iron', [], {tag: 'roof'});
    }
  }

  // ---- A balcony: a deck on beams with posts and rails, hung on a face of a house at height y.
  function balcony({axis, at, from, to, y, out, depth = 1.15, surface = 'planks'}) {
    const mid = at + out * depth / 2, P = (p, across, yy, w, h, d, s, opt) => axis === 'x' ? block(w, h, d, p, yy, across, s, opt) : block(d, h, w, across, yy, p, s, opt);
    P((from + to) / 2, mid, y - .04, to - from, .07, depth, surface, {tag: 'balcony'});
    // The beams that carry it come out of the wall, and every other one is propped from the wall below.
    let n = 0; for (let p = from + .15; p <= to - .1; p += Math.max(.6, (to - from - .3) / Math.round((to - from) / .9)), n++) { P(p, mid - out * .1, y - .16, .13, .16, depth + .25, 'beams', {seen: false});
      if (n % 2 === 0) { const run = depth - .25, len = Math.hypot(run, run), c = at + out * run / 2; axis === 'x' ? block(.09, .09, len, p, y - .24 - run / 2, c, 'beams', {tilt: out * Math.PI / 4, seen: false}) : block(len, .09, .09, c, y - .24 - run / 2, p, 'beams', {lean: out * Math.PI / 4, seen: false}); } }
    for (let p = from + .06; p <= to; p += (to - from - .12) / Math.max(1, Math.round((to - from) / 1.3))) P(p, at + out * (depth - .06), y + .5, .08, 1, .08, 'beams', {seen: false});
    for (const yy of [y + .98, y + .5]) P((from + to) / 2, at + out * (depth - .06), yy, to - from, .07, .07, 'beams', {seen: false});
    for (const e of [from + .05, to - .05]) for (const yy of [y + .98, y + .5]) P(e, mid, yy, .07, .07, depth, 'beams', {seen: false});
    for (let p = from + .2; p < to - .1; p += .18) P(p, at + out * (depth - .06), y + .74, .035, .45, .035, surface, {seen: false, shadow: false});
  }
  // ---- Steps: `count` treads from the low end to the high end. Walked as the ramp the map's height describes.
  function steps({x: [x0, x1], z: [zHigh, zLow], low, high, count, surface = 'slab', sides}) {
    const rise = (high - low) / count, run = (zLow - zHigh) / count;
    for (let i = 0; i < count; i++) { const zc = zLow - run * (i + .5), top = low + rise * (i + 1); block(x1 - x0, top - low + 1.2, run + .02, (x0 + x1) / 2, (top + low - 1.2) / 2, zc, surface, {tag: 'steps'}); block(x1 - x0 + .04, .05, run + .06, (x0 + x1) / 2, top + .005, zc + .02, surface, {seen: false, shadow: false, tag: 'steps'}); }
    if (sides) for (const x of [x0 - sides.thick / 2, x1 + sides.thick / 2]) for (let i = 0; i < 3; i++) { const a = zLow - (zLow - zHigh) * (i + 1) / 3, b = zLow - (zLow - zHigh) * i / 3, top = low + (high - low) * (i + 1) / 3 + sides.above;
      block(sides.thick, top - low + 1.2, b - a, x, (top + low - 1.2) / 2, (a + b) / 2, sides.surface, {solid: true}); block(sides.thick + .1, .07, b - a + .06, x, top + .035, (a + b) / 2, 'slab', {seen: false}); }
  }
  // ---- An outside stair up the side of a house (geometry: it cannot be climbed until height is built).
  function flight({axis, at, from, to, low, high, width = 1, count = 12, out = 1, surface = 'masonry', tread = 'slab', landing = 0}) {
    const rise = (high - low) / count, run = (to - from) / count, across = at + out * width / 2;
    for (let i = 0; i < count; i++) { const c = from + run * (i + .5), top = low + rise * (i + 1), P = (h, yy, s, w, opt) => axis === 'x' ? block(Math.abs(run) + .01, h, w, c, yy, across, s, opt) : block(w, h, Math.abs(run) + .01, across, yy, c, s, opt);
      P(top - low, (top + low) / 2, surface, width, {seen: i % 3 === 0, tag: 'stair'}); P(.05, top + .025, tread, width + .06, {seen: false, shadow: false, tag: 'stair'}); }
    const a = Math.min(from, to), b = Math.max(from, to); axis === 'x' ? solid(a, b, Math.min(at, at + out * width), Math.max(at, at + out * width)) : solid(Math.min(at, at + out * width), Math.max(at, at + out * width), a, b);
    if (landing) { const L = landing, c = to + Math.sign(run) * L / 2, P = (h, yy, s, w) => axis === 'x' ? block(L, h, w, c, yy, across, s) : block(w, h, L, across, yy, c, s); P(high - low, (high + low) / 2, surface, width); P(.05, high + .025, tread, width + .06);
      axis === 'x' ? solid(Math.min(to, to + Math.sign(run) * L), Math.max(to, to + Math.sign(run) * L), Math.min(at, at + out * width), Math.max(at, at + out * width)) : solid(Math.min(at, at + out * width), Math.max(at, at + out * width), Math.min(to, to + Math.sign(run) * L), Math.max(to, to + Math.sign(run) * L)); }
  }
  // ---- A lean-to: a sheet sloping down in the direction `fall` ('x+', 'x-', 'z+', 'z-'), on posts at its low edge
  // (and at its high edge when it leans on nothing).
  function leanTo({x: [x0, x1], z: [z0, z1], base, high, low, fall, surface = 'iron', free = false, posts = [.04, .5, .96]}) {
    const onX = fall[0] === 'x', up = fall[1] === '+' ? 1 : -1, span = onX ? x1 - x0 : z1 - z0, angle = Math.atan2(high - low, span), len = Math.hypot(span, high - low) + .5, mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    onX ? block(len, .04, z1 - z0 + .4, mx, base + (high + low) / 2, mz, surface, {lean: -up * angle, seen: false}) : block(x1 - x0 + .4, .04, len, mx, base + (high + low) / 2, mz, surface, {tilt: up * angle, seen: false});
    const edge = (lowSide, h) => { const c = onX ? (up > 0 === lowSide ? x1 - .12 : x0 + .12) : (up > 0 === lowSide ? z1 - .12 : z0 + .12);
      for (const t of posts) onX ? block(.11, h - .06, .11, c, base + (h - .06) / 2, z0 + (z1 - z0) * t, 'beams', {seen: false}) : block(.11, h - .06, .11, x0 + (x1 - x0) * t, base + (h - .06) / 2, c, 'beams', {seen: false});
      onX ? block(.1, .12, z1 - z0 + .3, c, base + h - .1, mz, 'beams', {seen: false}) : block(x1 - x0 + .3, .12, .1, mx, base + h - .1, c, 'beams', {seen: false}); };
    edge(true, low + .12); if (free) edge(false, high - .12);
    for (const t of [.2, .5, .8]) onX ? block(.07, .09, z1 - z0 + .3, x0 + span * t, base + (up > 0 ? high - (high - low) * t : low + (high - low) * t) - .07, mz, 'beams', {seen: false}) : block(x1 - x0 + .3, .09, .07, mx, base + (up > 0 ? high - (high - low) * t : low + (high - low) * t) - .07, z0 + span * t, 'beams', {seen: false});
  }

  // ======== The block, from the map.
  for (const g of B.grounds) block(g.x[1] - g.x[0], g.deep || 1.4, g.z[1] - g.z[0], (g.x[0] + g.x[1]) / 2, g.level - (g.deep || 1.4) / 2 + (g.lift || 0), (g.z[0] + g.z[1]) / 2, g.surface, {shadow: false, tag: g.surface === 'cobble' ? 'street' : g.surface === 'slab' ? 'paving' : 'yard'});
  for (const w of B.walls) { const top = w.base + w.height; along(w.axis, w.at, w.from, w.to, w.thick, w.base - (w.foot ?? 1.2), top, w.surface, {solid: w.axis === 'x' ? false : false});
    w.axis === 'x' ? solid(w.from, w.to, w.at - w.thick / 2, w.at + w.thick / 2) : solid(w.at - w.thick / 2, w.at + w.thick / 2, w.from, w.to);
    if (w.coping) along(w.axis, w.at, w.from - .04, w.to + .04, w.thick + .14, top, top + .08, w.coping, {seen: false}); }
  for (const s of B.steps) steps(s);
  const roofs = {}, tankBoxes = []; for (const h of B.houses) roofs[h.id] = house(h);
  // Beyond the walls: houses and field walls that are seen and not reached.
  for (const h of B.beyond?.houses || []) house(h);
  for (const w of B.beyond?.walls || []) along(w.axis, w.at, w.from, w.to, w.thick, w.base - w.foot, w.base + w.height, w.surface, {seen: false});
  for (const b of B.balconies || []) balcony(b);
  for (const f of B.flights || []) flight(f);
  for (const l of B.leanTos || []) leanTo(l);
  // Ladders: two rails and rungs, standing against something; a body climbs them (dist/space.js). `dir` points from the
  // ladder to where the climber stands; `exit` is where the climber steps off at the top.
  const ladders = [];
  for (const l of B.ladders || []) { const [dx, dz] = l.dir, h = l.top - l.bottom, w = l.width || .45, rail = (s) => block(Math.abs(dz) > .5 ? w * 0 + .06 : .06, h, Math.abs(dz) > .5 ? .06 : .06, l.x + (Math.abs(dz) > .5 ? s * w / 2 : 0), (l.top + l.bottom) / 2, l.z + (Math.abs(dz) > .5 ? 0 : s * w / 2), 'beams', {seen: false, body: false, tag: 'ladder'});
    rail(-1); rail(1); for (let y = l.bottom + .28; y < l.top - .05; y += .3) Math.abs(dz) > .5 ? block(w, .04, .04, l.x, y, l.z, 'beams', {seen: false, body: false, tag: 'ladder', shadow: false}) : block(.04, .04, w, l.x, y, l.z, 'beams', {seen: false, body: false, tag: 'ladder', shadow: false});
    ladders.push({x: l.x + dx * .3, z: l.z + dz * .3, dir: [dx, dz], bottom: l.bottom, top: l.top, exit: l.exit, standX: l.x + dx * .42, standZ: l.z + dz * .42}); }
  for (const p of B.pieces || []) block(p.size[0], p.size[1], p.size[2], p.at[0], p.at[1], p.at[2], p.surface, {turn: p.turn || 0, tilt: p.tilt || 0, lean: p.lean || 0, solid: !!p.solid, seen: p.seen !== false});
  for (const a of B.arches || []) { const mid = (a.from + a.to) / 2, half = a.width / 2; along(a.axis, a.at, a.from, mid - half, a.thick, a.base - 1.2, a.base + a.height, a.surface); along(a.axis, a.at, mid + half, a.to, a.thick, a.base - 1.2, a.base + a.height, a.surface); along(a.axis, a.at, mid - half, mid + half, a.thick, a.base + a.clear, a.base + a.height, a.surface); along(a.axis, a.at, mid - half - .15, mid + half + .15, a.thick + .1, a.base + a.clear - .16, a.base + a.clear, 'beams', {seen: false});
    along(a.axis, a.at, a.from - .04, a.to + .04, a.thick + .14, a.base + a.height, a.base + a.height + .08, 'slab', {seen: false}); const s = (u, v) => a.axis === 'x' ? solid(u, v, a.at - a.thick / 2, a.at + a.thick / 2) : solid(a.at - a.thick / 2, a.at + a.thick / 2, u, v); s(a.from, mid - half); s(mid + half, a.to);
    if (a.gate) { if ((a.ajar || 0) < .6) s(mid - half, mid + half); for (const [e, dir] of [[mid - half, 1], [mid + half, -1]]) { const u = Math.cos(a.ajar || 0) * dir, v = Math.sin(a.ajar || 0) * (a.out || 1); a.axis === 'x' ? leaf(e, a.at, u, v, half - .03, a.base + .05, a.base + a.clear - .2, .07, a.gate) : leaf(a.at, e, v, u, half - .03, a.base + .05, a.base + a.clear - .2, .07, a.gate); } } }
  for (const w of B.wires || []) { const pts = [], [a, b] = w.between.map(p => new THREE.Vector3(...p)); for (let i = 0; i <= 24; i++) { const t = i / 24, p = a.clone().lerp(b, t); p.y -= Math.sin(t * Math.PI) * (w.sag ?? .5); pts.push(p); }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wire)); }
  for (const l of B.lamps || []) { const s = new THREE.Mesh(new THREE.SphereGeometry(l[3] || .05, 10, 8), glow); s.position.set(l[0], l[1], l[2]); scene.add(s); }
  // The ground outside the block takes the block's open-ground surface, so the hill and the yards are one ground.
  if (B.outside) { const m = materials[B.outside.surface], g = ctx.ground.material; g.map = m.map.clone(); g.normalMap = m.normalMap.clone(); g.roughnessMap = m.roughnessMap.clone(); for (const t of [g.map, g.normalMap, g.roughnessMap]) { t.repeat.set(B.outside.repeat, B.outside.repeat); t.needsUpdate = true; } g.color.set(B.outside.tint || '#ffffff'); g.needsUpdate = true; }

  // ======== The props: one model per kind, drawn once per part for all that stand in the block.
  const propBoxes = [];   // what the large props stand in the way of, for the space too
  const kinds = new Map(); for (const p of B.props) { if (!kinds.has(p[0])) kinds.set(p[0], []); kinds.get(p[0]).push(p); }
  stats.propKinds = kinds.size; stats.props = B.props.length;
  const gltf = new GLTFLoader(), holder = new THREE.Object3D(), ready = [];
  for (const [kind, list] of kinds) {
    const url = assetURL('assets/dehrun/models/' + kind + '.glb'); stats.requested.push(url);
    // What stands in the way stands from the start, whether or not its model has arrived.
    const hard = B.hardProps?.[kind]; if (hard) for (const [, x, z, turn = 0, lift = 0] of list) { const q = Math.abs(Math.sin(turn * Math.PI / 180)) > .7, w = q ? hard[1] : hard[0], d = q ? hard[0] : hard[1], base = groundY(x, z) + lift; if (lift < .5) solid(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
      const o = new THREE.Mesh(new THREE.BoxGeometry(w, hard[2], d)); o.position.set(x, base + hard[2] / 2, z); o.updateMatrixWorld(true); o.userData.round = true; occluders.push(o); propBoxes.push({min: [x - w / 2, base, z - d / 2], max: [x + w / 2, base + hard[2], z + d / 2], solid: true, tag: 'prop'}); }
    ready.push(fetch(url).then(r => { if (!r.ok) throw new Error(`${kind}: ${r.status}`); return r.arrayBuffer(); }).then(buffer => new Promise((done, fail) => gltf.parse(buffer, '', done, fail))).then(model => {
      model.scene.updateMatrixWorld(true); let triangles = 0;
      model.scene.traverse(o => { if (!o.isMesh) return; const m = o.material; if (B.tints?.[kind]) m.color.multiply(new THREE.Color(B.tints[kind])); if (m.transmission) { m.transmission = 0; m.transparent = true; m.opacity = .35; m.depthWrite = false; } if (m.map) m.map.anisotropy = aniso;
        const inst = new THREE.InstancedMesh(o.geometry, m, list.length); inst.castShadow = !m.transparent; inst.receiveShadow = true; inst.userData.prop = kind;
        list.forEach(([, x, z, turn = 0, lift = 0, scale = 1, tilt = 0], i) => { holder.position.set(x, groundY(x, z) + lift, z); holder.rotation.set(tilt * Math.PI / 180, turn * Math.PI / 180, 0); holder.scale.setScalar(scale); holder.updateMatrix(); inst.setMatrixAt(i, holder.matrix.clone().multiply(o.matrixWorld)); });
        inst.instanceMatrix.needsUpdate = true; inst.computeBoundingSphere(); scene.add(inst); triangles += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * list.length; });
      stats.propTriangles += triangles; ctx.changed?.(); return kind; }).catch(e => { console.warn('DUSTLINE: a model did not arrive:', kind, e?.message || e); stats.failed = (stats.failed || []).concat(kind); return null; }));
  }
  // What a body can stand on, walk into and climb: every box with its top and bottom, the ground, the ladders.
  const space = makeSpace({boxes: stats.list.filter(b => !b.turned).map(b => ({min: b.min, max: b.max, solid: b.solid, tag: b.tag || b.surface})).concat(propBoxes, tankBoxes), ground: groundY, ladders, edges: map.edges});
  return {stats, materials, roofs, space, ready: Promise.all(ready)};
}
