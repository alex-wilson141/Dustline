// Build 24: height. What a body can stand on, walk into, climb and fall from, on a map that is built of boxes with a
// top and a bottom (Dehrun Terraces). Kohar Valley has no space of this kind: there the game keeps its flat rules, and
// nothing in this file is asked.
// The body is a cylinder: `radius` wide, `stand` tall (or `crouch` tall when crouching), its feet at y. It steps up
// onto anything no higher than `step`, pulls itself onto a ledge no higher than `mantle` when there is room to crouch
// on it, and falls off anything it walks past. A box is `solid` (it stops a body) and, if solid, its top is a floor.
import './build.js'; // DEPLOY-01 upgrade guard

export const BODY = {radius: .34, stand: 1.8, crouch: 1.1, step: .35, mantle: 1.35, lean: .2, reach: .75, climb: 1.5, gravity: 9.8, jump: 3.7};
// Fall damage: nothing up to `safe` metres, everything at `fatal`, and between them a curve that starts gently.
export const FALL = {safe: 3, fatal: 12, power: 1.5};
export const fallDamage = h => h <= FALL.safe ? 0 : h >= FALL.fatal ? 100 : 100 * ((h - FALL.safe) / (FALL.fatal - FALL.safe)) ** FALL.power;

export function makeSpace({boxes, ground, ladders = [], body = BODY, cell = 2}) {
  // The boxes, indexed by the 2 m squares they cover, so that a body asks only about what is near it.
  const grid = new Map(), key = (i, j) => i * 100003 + j, at = v => Math.floor(v / cell);
  const list = boxes.filter(b => b.solid !== false).map((b, i) => ({...b, i}));
  for (const b of list) for (let i = at(b.min[0] - body.radius - .01); i <= at(b.max[0] + body.radius + .01); i++) for (let j = at(b.min[2] - body.radius - .01); j <= at(b.max[2] + body.radius + .01); j++) { const k = key(i, j); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(b); }
  const near = (x, z) => grid.get(key(at(x), at(z))) || [];
  const inside = (b, x, z, r) => x > b.min[0] - r && x < b.max[0] + r && z > b.min[2] - r && z < b.max[2] + r;
  // Whether a body standing at (x, z) with its feet at y0 and its head at y1 hits anything.
  function clear(x, z, y0, y1, r = body.radius) { for (const b of near(x, z)) if (b.min[1] < y1 && b.max[1] > y0 && inside(b, x, z, r)) return false; return true; }
  // The highest floor under (x, z) that is no higher than yTop: a box top the body's middle stands over (it may lean
  // `lean` past an edge), or the ground.
  // What the body's middle is straight over counts first; only past every edge does the lean count, so that a foot on a
  // stair rests on its own tread and not the next one up.
  function floor(x, z, yTop, lean = body.lean) { let best = ground(x, z), on = null; for (const b of near(x, z)) if (b.max[1] <= yTop && b.max[1] >= best && inside(b, x, z, 0)) { best = b.max[1]; on = b; }
    if (!on && lean > 0) for (const b of near(x, z)) if (b.max[1] <= yTop && b.max[1] >= best && inside(b, x, z, lean)) { best = b.max[1]; on = b; } return {y: best, on}; }
  // The lowest thing over the body's head at (x, z) above yFrom.
  function ceiling(x, z, yFrom, r = body.radius) { let best = Infinity; for (const b of near(x, z)) if (b.min[1] >= yFrom && b.min[1] < best && inside(b, x, z, r)) best = b.min[1]; return best; }
  // How much room there is over a body's feet at (x, z): up to the lowest thing that is at least a crouching body's
  // height above them (what is lower than that is in the way, not overhead).
  const headroom = (x, z, y) => ceiling(x, z, y + body.crouch) - y;
  // A horizontal move of a body whose feet are at y and whose head is at y + height, in steps of .25 m, each axis on
  // its own; it steps up onto anything within `step` of its feet. Returns the distance moved and the new floor.
  function move(p, dx, dz, height, r = body.radius) {
    const ox = p.x, oz = p.z, steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .25));
    for (let i = 0; i < steps; i++) for (const [ax, az] of [[dx / steps, 0], [0, dz / steps]]) { if (!ax && !az) continue; const nx = p.x + ax, nz = p.z + az;
      // Where the feet would be after the step, what is in the way is judged from there: on a stair the next tread is
      // not in the way of a body already on the one below.
      const f = floor(nx, nz, p.y + body.step), feet = Math.max(p.y, f.y);
      if (clear(nx, nz, feet + body.step, feet + height, r) && (f.y <= p.y || ceiling(nx, nz, f.y + body.crouch, r) - f.y >= height)) { p.x = nx; p.z = nz; if (f.y > p.y) p.y = f.y; } }
    return Math.hypot(p.x - ox, p.z - oz);
  }
  // A ledge the body could pull itself onto: ahead by up to `reach`, its top between `step` and `mantle` above the
  // feet, with room to crouch on it. Returns where the body ends up, or null.
  function ledge(p, fx, fz) { const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    for (const d of [.45, .6, body.reach]) { const x = p.x + fx * d, z = p.z + fz * d, f = floor(x, z, p.y + body.mantle, .05); if (f.y <= p.y + body.step || !f.on) continue;
      if (clear(x, z, f.y + .02, f.y + body.crouch, body.radius * .8)) return {x, y: f.y, z, on: f.on}; }
    return null; }
  // The ladder a body at p can take hold of. From below: within reach of its foot and facing it (walking forward). From
  // above: standing near its top and backing onto it (walking backwards, facing away from it); `back` says which.
  function ladderAt(p, fx, fz, back = false) { for (const l of ladders) { const dx = p.x - l.x, dz = p.z - l.z, facing = fx * l.dir[0] + fz * l.dir[1];
    if (!back) { if (Math.hypot(dx, dz) > .75 || p.y < l.bottom - .4 || p.y > l.top - .6 || facing > -.35) continue; return l; }
    else { if (Math.hypot(p.x - l.exit[0], p.z - l.exit[1]) > .8 || Math.abs(p.y - l.top) > .8 || facing < .35) continue; return l; } } return null; }
  return {boxes: list, clear, floor, ceiling, headroom, move, ledge, ladderAt, ladders, body,
    // Everything a body can stand on within a square, for the checks: box tops and the ground.
    floors(x0, x1, z0, z1, stepBy = .5) { const out = []; for (let x = x0; x <= x1; x += stepBy) for (let z = z0; z <= z1; z += stepBy) out.push([x, z, floor(x, z, 1e9).y]); return out; }};
}
