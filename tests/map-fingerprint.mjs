// Build 21: what Kohar Valley is, measured from a running game and written as plain numbers, so that the same map loaded
// from data can be compared with the map as it was hard-coded in Build 20 (tests/fixtures/kohar-b20.json, recorded from
// commit 7a9bb82 before anything was moved). Nothing here reads the map description: only the world the game built.
import crypto from 'node:crypto';

const F = new Float64Array(1), B = new Uint8Array(F.buffer);
// Every number goes in as its eight bytes, so a difference in the last bit is a different hash.
export function hashNumbers(list) { const h = crypto.createHash('sha256'); for (const v of list) { F[0] = v; h.update(B); } return h.digest('hex').slice(0, 16); }
const flat = list => list.flat(Infinity);
const summary = list => ({n: list.length, hash: hashNumbers(flat(list))});

export function fingerprint(g, THREE) {
  const out = {};
  g.prepare({clearLane: false});
  // The ground and what stands on it.
  const samples = []; for (let x = -540; x <= 540; x += 13.7) for (let z = -540; z <= 540; z += 17.3) samples.push(g.groundY(x, z), g.terrainAt(x, z));
  out.ground = summary(samples);
  const tp = g.ground.geometry.attributes.position; out.terrainMesh = {vertices: tp.count, hash: hashNumbers(tp.array)};
  out.solids = summary(g.solids.map(s => [s.x, s.z, s.w, s.d]));
  g.scene.updateMatrixWorld(true);
  out.occluders = summary(g.occluders.map(o => { const b = o.geometry.boundingBox || (o.geometry.computeBoundingBox(), o.geometry.boundingBox), e = o.matrixWorld.elements; return [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z, e[12], e[13], e[14]]; }));
  // Everything drawn: every mesh, line and point cloud in the scene outside the actors, by place, size and vertex count.
  const drawn = []; let vertices = 0, triangles = 0;
  g.scene.traverse(o => { if (!(o.isMesh || o.isLine || o.isPoints) || o.userData.actor) return; let p = o; while (p && p !== g.scene && p !== g.camera) p = p.parent; if (p !== g.scene) return;
    const geo = o.geometry, n = geo.attributes.position?.count || 0; geo.computeBoundingSphere(); const e = o.matrixWorld.elements, c = geo.boundingSphere.center;
    vertices += n; triangles += (geo.index ? geo.index.count : n) / 3 * (o.isInstancedMesh ? o.count : 1);
    drawn.push([e[12], e[13], e[14], c.x, c.y, c.z, geo.boundingSphere.radius, n, hashToNumber(hashNumbers(geo.attributes.position?.array || [])), hashToNumber(hashNumbers(e)), o.isInstancedMesh ? hashToNumber(hashNumbers(o.instanceMatrix.array)) : 0]); });
  out.drawn = {...summary(drawn), vertices, triangles};
  out.lights = summary(g.scene.children.filter(o => o.isLight).map(o => [o.position.x, o.position.y, o.position.z, o.intensity, ...(o.shadow?.camera?.isOrthographicCamera ? [o.shadow.camera.left, o.shadow.camera.right, o.shadow.camera.top, o.shadow.camera.bottom, o.shadow.camera.near, o.shadow.camera.far] : [])]));
  out.fog = [g.scene.fog.density, g.scene.fog.color.getHex()]; out.sky = g.scene.background.isColor ? g.scene.background.getHex() : null;
  out.assets = [...new Set(g.assetRequests.map(String))].sort();
  out.diagnostics = globalThis.window.dustline.snapshot().world;
  // Where a body can be: the edges and every solid, on a one-metre lattice well past the edges.
  const block = []; for (let x = -100; x <= 100; x++) for (let z = -100; z <= 100; z++) block.push(g.blocked(x + .25, z + .25) ? 1 : 0);
  out.blocked = {...summary(block), free: block.filter(v => !v).length};
  // Navigation: the grid, what is joined to the relay, the cover table and a set of routes.
  g.resetNav(); const grid = g.ai.navigationGrid();
  out.navGrid = {cells: grid.length, walkable: grid.filter(v => !v).length, hash: hashNumbers(grid)};
  out.navJoined = {joined: g.ai.navComp().filter(Boolean).length, hash: hashNumbers(g.ai.navComp())};
  const cover = g.ai.coverTable().points; out.cover = summary(cover.map(p => [p.x, p.z, p.nx, p.nz, p.low ? 1 : 0, p.top, ...(p.peek || [0, 0])]));
  const ends = [[0, 55], [-24, -10], [0, -47], [40, 43], [-30, 20], [-50, -3], [-20, -46], [60, -60], [-70, 40], [48, -49]], routes = [];
  for (const a of ends) for (const b of ends) if (a !== b) { const r = g.ai.pathTo(new THREE.Vector3(a[0], 0, a[1]), new THREE.Vector3(b[0], 0, b[1])); routes.push(r.length, ...r.map(p => [p.x, p.z])); }
  out.routes = summary(routes);
  const safe = []; for (let x = -88; x <= 88; x += 8) for (let z = -92; z <= 84; z += 8) safe.push(g.ai.safeSpot(x, z));
  out.safeSpots = summary(safe);
  // Objectives and where everybody starts, in each mode.
  const v = p => [p.x, p.y, p.z];
  out.objectives = {target: v(g.ai.target), intel: v(g.ai.intel), extract: v(g.ai.extract)};
  out.starts = {};
  for (const [name, role, mode] of [['story', null, 'story'], ['skirmish', null, 'skirmish'], ['coopHost', 'host', 'coop'], ['coopGuest', 'guest', 'coop']]) {
    g.peer.connected = Boolean(role); g.peer.role = role; g.setMode(mode); g.reset();
    out.starts[name] = {player: v(g.player), actors: g.actors.map(a => [a.team, a.index, ...v(a.g.position)]), goal: [0, 1, 2].map(s => { g.ai.setStage(s); return v(g.ai.objectivePoint()); })}; g.ai.setStage(0);
  }
  g.peer.connected = false; g.peer.role = null;
  // What each enemy is sent to do at the start: its post or patrol, and the way there.
  g.setMode('story'); g.reset();
  out.duty = g.actors.filter(a => a.team === 'enemy').map(a => ({role: a.ai.role, loop: a.ai.loop, node: a.ai.node ?? null, route: summary((a.route || []).map(p => [p.x, p.z]))}));
  // Where the route log can be picked up from: every half metre of a fixed square of the map.
  g.prepare({clearLane: false}); const pick = [], I = g.ai.intel;
  for (let x = -36; x <= -12; x += .5) for (let z = -22; z <= 2; z += .5) { g.ai.setStage(0); g.player.set(x, I.y, z); g.press('KeyE'); g.release('KeyE'); pick.push(g.getStage() === 1 ? 1 : 0); }
  g.ai.setStage(0); out.pickup = {...summary(pick), within: pick.filter(Boolean).length};
  // How far out a teammate's reported position is believed (co-op, as the host).
  g.prepare({role: 'host', clearLane: false}); const believed = [];
  for (const axis of [0, 2]) for (let v = 70; v <= 110; v += .5) for (const sign of [-1, 1]) { const p = [0, 0, 0]; p[axis] = sign * v; g.remote.g.position.set(p[0] - (axis === 0 ? sign : 0), 0, p[2] - (axis === 2 ? sign : 0)); g.receive({type: 'pose', p, yaw: 0, pitch: 0, crouch: false, at: 0}); believed.push(g.remote.g.position.x === p[0] && g.remote.g.position.z === p[2] ? 1 : 0); }
  out.believed = {...summary(believed), within: believed.filter(Boolean).length};
  g.peer.connected = false; g.peer.role = null; g.prepare({clearLane: false});
  // The Ambush arena: start, spawn spots, what stands at the start and when everything is open, the edge, the map.
  g.setMode('ambush'); g.reset(); g.scene.updateMatrixWorld(true);
  const state = () => { const s = g.ambush.now(); return JSON.parse(JSON.stringify(s, (k, val) => val instanceof Set ? [...val] : val)); };
  const world = () => ({solids: summary(g.solids.map(s => [s.x, s.z, s.w, s.d])), blocked: summary((() => { const b = []; for (let x = -70; x <= 0; x += .5) for (let z = -66; z <= 40; z += .5) b.push(g.blocked(x, z) ? 1 : 0); return b; })()), edge: summary(g.amb.segs), walls: g.arenaWalls.map(o => [o.position.x, o.position.y, o.position.z, o.geometry.parameters.width, o.geometry.parameters.height, o.geometry.parameters.depth]),
    marks: summary(g.scene.children.filter(o => o.userData?.marking).map(o => { o.geometry?.computeBoundingSphere?.(); const c = o.geometry?.boundingSphere; return [o.position.x, o.position.y, o.position.z, c ? c.center.x : 0, c ? c.center.y : 0, c ? c.center.z : 0, c ? c.radius : 0]; })), layout: g.ambush.mapLayout()});
  out.ambush = {player: v(g.player), actors: g.actors.map(a => [a.team, a.index, ...v(a.g.position)]), open: [...g.amb.open], points: g.amb.points, state: state(), start: world(), spots: summary(g.ambush.spots())};
  g.amb.points = 1e6; const bought = [];
  for (const t of state().gates) { for (let tries = 0; tries < 3 && g.amb.gates.has(t.id); tries++) for (let dx = -2.5; dx <= 2.5 && g.amb.gates.has(t.id); dx += .5) for (let dz = -2.5; dz <= 2.5 && g.amb.gates.has(t.id); dz += .5) { const x = t.station[0] + dx, z = t.station[1] + dz; if (g.blocked(x, z)) continue; g.player.set(x, g.groundY(x, z), z); g.ambush.interact(); } bought.push([t.id, !g.amb.gates.has(t.id)]); }
  g.amb.spots = null; g.scene.updateMatrixWorld(true);
  out.ambushOpen = {bought, open: [...g.amb.open].sort(), state: state(), world: world(), spots: summary(g.ambush.spots())};
  g.setMode('story'); g.reset();
  out.afterAmbush = {solids: summary(g.solids.map(s => [s.x, s.z, s.w, s.d])), walls: g.arenaWalls.map(o => [o.position.y, o.geometry.parameters.height])};
  return out;
}
function hashToNumber(h) { return parseInt(h.slice(0, 12), 16); }

// The first place two fingerprints differ, as a path, or null.
export function firstDifference(a, b, path = '') {
  if (typeof a !== typeof b || (a === null) !== (b === null)) return path || '(root)';
  if (a === null || typeof a !== 'object') return Object.is(a, b) || a === b ? null : path || '(root)';
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) { const d = firstDifference(a[k], b[k], path ? `${path}.${k}` : k); if (d) return d; }
  return null;
}

// Where reinforcements arrive and where they are sent, per stage, with the player standing in each of five places (an
// entry in sight of the player is never used) and no squad: every enemy is down from the start, and each arrival is put
// down again as soon as it is logged. `tune` is ENEMY_AI (changed for the run and put back).
export function reinforcements(g, tune, seconds = 20, stands = [[0, 55], [-60, -80], [60, 70], [-70, 30], [60, -80]]) {
  const keep = {...tune, spawnInterval: [...tune.spawnInterval]}, out = {};
  Object.assign(tune, {reinforce: true, firstSpawnDelay: 1, corpseMinAge: 0, spawnInterval: [1, 1]});
  try {
    for (const [sx, sz] of stands) for (const [stage_, mode, stage] of [['stage0', 'story', 0], ['stage1', 'story', 1], ['stage2', 'story', 2], ['skirmish', 'skirmish', 0]]) {
      const name = sx === stands[0][0] && sz === stands[0][1] ? stage_ : `${stage_} from ${sx},${sz}`;
      g.prepare({clearLane: false}); g.setMode(mode); g.reset(); g.play(); g.restoreAI(); g.set({hp: 1e9}); g.ai.setStage(stage); g.player.set(sx, g.groundY(sx, sz), sz); for (const a of g.actors) if (a.team === 'ally') { a.hp = 0; a.dead = 999; a.g.visible = false; }
      const en = g.actors.filter(a => a.team === 'enemy'), life = new Map(en.map(a => [a, a.life])), log = [];
      for (const a of en) { a.hp = 0; a.dead = 999; }
      let clock = 0; g.frame(0);
      for (let i = 0; i < seconds * 30; i++) { g.frame(clock += 1000 / 30); for (const a of en) if (a.life !== life.get(a)) { life.set(a, a.life); log.push([a.g.position.x, a.g.position.z, (a.ai.chain || []).flat(), a.ai.loop ? [...a.ai.loop].map(c => c.charCodeAt(0)) : []]); a.hp = 0; a.dead = 999; } }
      out[name] = {arrivals: log.length, hash: hashNumbers(log.flat(Infinity)), first: log[0]?.slice(0, 2) ?? null};
    }
  } finally { Object.assign(tune, keep); }
  return out;
}

// Every patrol loop in `names`, walked from every place in `nodes`: an enemy stands there, is sent on the loop, and the
// node it makes for and the end of its way there are written down.
export function patrols(g, names, nodes) {
  g.prepare({clearLane: false}); g.setMode('story'); g.reset(); const a = g.actors.find(x => x.team === 'enemy'), out = {};
  for (const name of names) out[name] = hashNumbers(nodes.map(([x, z]) => { a.g.position.set(x, g.groundY(x, z), z); g.ai.startPatrol(a, name); const end = a.route.at(-1); return [a.ai.node, end ? end.x : x, end ? end.z : z, a.route.length]; }).flat());
  return out;
}
