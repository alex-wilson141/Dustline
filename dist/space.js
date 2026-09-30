// Build 24: height. What a body can stand on, walk into, climb and fall from, on a map that is built of boxes with a
// top and a bottom (Dehrun Terraces). Kohar Valley has no space of this kind: there the game keeps its flat rules, and
// nothing in this file is asked.
// The body is a cylinder: `radius` wide, `stand` tall (or `crouch` tall when crouching), its feet at y. It steps up
// onto anything no higher than `step`, pulls itself onto a ledge no higher than `mantle` when there is room to crouch
// on it, and falls off anything it walks past. A box is `solid` (it stops a body) and, if solid, its top is a floor.
import './build.js'; // DEPLOY-01 upgrade guard

export const BODY = {radius: .34, stand: 1.8, crouch: 1.1, step: .35, mantle: 1.35, lean: .2, reach: .75, climb: 1.5, gravity: 9.8, jump: 3.7, stance: .2, nudge: .2, ease: [1, 4.5], sag: .3};   // Build 30: `ease`, `sag`: the eye follows the feet up and down treads at the feet's own rate (1 to 4.5 m/s), never more than .3 m behind
// Fall damage: nothing up to `safe` metres, everything at `fatal`, and between them a curve that starts gently.
export const FALL = {safe: 3, fatal: 12, power: 1.5};
export const fallDamage = h => h <= FALL.safe ? 0 : h >= FALL.fatal ? 100 : 100 * ((h - FALL.safe) / (FALL.fatal - FALL.safe)) ** FALL.power;

export function makeSpace({boxes, ground, ladders = [], body = BODY, cell = 2, edges = null}) {
  // The boxes, indexed by the 2 m squares they cover, so that a body asks only about what is near it.
  const grid = new Map(), key = (i, j) => i * 100003 + j, at = v => Math.floor(v / cell);
  // A box narrower than `stance` across (a post, a rail, a beam end) stops a body but holds none up (Build 25).
  const list = boxes.filter(b => b.solid !== false).map((b, i) => ({...b, i, thin: b.max[0] - b.min[0] < body.stance || b.max[2] - b.min[2] < body.stance, tread: b.tag === 'stair' || b.tag === 'steps'}));
  // Each box is filed under every square within `reach` of it: the widest body that asks (the enemies', .45), not the player's.
  const reach = Math.max(body.radius, .5) + .01;
  for (const b of list) for (let i = at(b.min[0] - reach); i <= at(b.max[0] + reach); i++) for (let j = at(b.min[2] - reach); j <= at(b.max[2] + reach); j++) { const k = key(i, j); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(b); }
  const near = (x, z) => grid.get(key(at(x), at(z))) || [];
  // A box's footprint includes its edges: on the seam between two slabs a body stands on both, not on neither (Build 25).
  // A box switched `off` is not there (Build 30: what went with a broken window's pane).
  const inside = (b, x, z, r) => !b.off && x >= b.min[0] - r && x <= b.max[0] + r && z >= b.min[2] - r && z <= b.max[2] + r;
  // Whether a body standing at (x, z) with its feet at y0 and its head at y1 hits anything.
  // The map's edges hold at every height: nothing walks, jumps or falls past them.
  // The same for a body to which treads near its feet are no obstacle (the enemies' stair rule, `stairs`).
  // A tread is no obstacle to a wide body that only brushes it with its rim, when its top is within .65 m above the
  // feet (the next treads of a flight); a tread the body's middle is over is its floor or a wall (Build 28: no body
  // stands inside a flight).
  const brushed = (b, x, z, feet, stairs) => stairs && b.tread && b.max[1] <= feet + .66 && !inside(b, x, z, 0);
  function stands(x, z, y0, y1, r = body.radius, stairs = false) { if (edges && (x < edges.x[0] || x > edges.x[1] || z < edges.z[0] || z > edges.z[1])) return false; for (const b of near(x, z)) if (b.min[1] < y1 && b.max[1] > y0 && inside(b, x, z, r) && !brushed(b, x, z, y0 - body.step, stairs)) return false; return true; }
  function clear(x, z, y0, y1, r = body.radius) { if (edges && (x < edges.x[0] || x > edges.x[1] || z < edges.z[0] || z > edges.z[1])) return false; for (const b of near(x, z)) if (b.min[1] < y1 && b.max[1] > y0 && inside(b, x, z, r)) return false; return true; }
  // The highest floor under (x, z) that is no higher than yTop: a box top the body's middle stands over (it may lean
  // `lean` past an edge), or the ground.
  // What the body's middle is straight over counts first; only past every edge does the lean count, so that a foot on a
  // stair rests on its own tread and not the next one up.
  // A walking body (its `feet` given) whose middle is over a hole narrower than itself, what is straight under being
  // more than a step below its feet, rests on what is within its lean on either side, as a body does over a gap
  // (Build 25); a falling body lands on what is straight under it.
  function floor(x, z, yTop, lean = body.lean, feet = null) { let best = ground(x, z), on = null; for (const b of near(x, z)) if (!b.thin && b.max[1] <= yTop && b.max[1] >= best && inside(b, x, z, 0)) { best = b.max[1]; on = b; }
    if ((!on || feet != null && best < feet - body.step) && lean > 0) for (const b of near(x, z)) if (!b.thin && b.max[1] <= yTop && b.max[1] >= best && inside(b, x, z, lean)) { best = b.max[1]; on = b; } return {y: best, on}; }
  // The lowest thing over the body's head at (x, z) above yFrom.
  function ceiling(x, z, yFrom, r = body.radius) { let best = Infinity; for (const b of near(x, z)) if (b.min[1] >= yFrom && b.min[1] < best && inside(b, x, z, r)) best = b.min[1]; return best; }
  // How much room there is over a body's feet at (x, z): up to the lowest thing that is at least a crouching body's
  // height above them (what is lower than that is in the way, not overhead).
  // Only what is over the body's middle counts: a body is held down under a thing, not made to duck as it approaches one.
  const headroom = (x, z, y, r = .12) => ceiling(x, z, y + body.crouch, r) - y;
  // How far into a box (grown by the body's radius) a body's middle stands: the least of its distances to the four sides.
  const depth = (b, x, z, r) => Math.min(x - (b.min[0] - r), b.max[0] + r - x, z - (b.min[2] - r), b.max[2] + r - z);
  // Whether a body may step from (ox, oz) to (nx, nz): nothing in its way there, except what it already stands against
  // or in, and that no deeper than before. A body that a fall has left against a wall, under a sill, can so slide out
  // along the wall or away from it, and never further in (Build 25; before, such a body could not move at all).
  // `stairs` (Build 26, the enemies' stair rule): treads within a metre above the feet do not stand in the way of a body
  // wider than a tread is long; such a body climbs by what is under its middle, as the player's narrower body does by
  // its edge. Everything else (walls, rails, the flight above) counts as for any body.
  // What the body stands against at its origin is judged at the origin's own height (`oy0`..`oy1`): stepping down, a
  // thing that was under its feet and is now in its way is new, not something it may slide along (Build 28).
  // A tread the body only brushed at its origin (stepped over, by the stair rule) is not something it stands against
  // either: stepping off a flight's foot to its side, the tread is met, and the body does not slide out beside the
  // flight overlapping it (Build 28: T36 found such a place at a district house's stair).
  function passable(ox, oz, nx, nz, y0, y1, r, stairs = false, oy0 = y0, oy1 = y1) { if (edges && (nx < edges.x[0] || nx > edges.x[1] || nz < edges.z[0] || nz > edges.z[1])) return false;
    for (const b of near(nx, nz)) { if (!(b.min[1] < y1 && b.max[1] > y0 && inside(b, nx, nz, r))) continue; if (brushed(b, nx, nz, y0 - body.step, stairs)) continue; if (brushed(b, ox, oz, oy0 - body.step, stairs) || !(b.min[1] < oy1 && b.max[1] > oy0 && inside(b, ox, oz, r)) || depth(b, nx, nz, r) > depth(b, ox, oz, r) + 1e-9) return false; } return true; }
  // Where a body that has landed at (x, z) comes to rest: pushed out of whatever it overlaps by the shortest way, a few
  // times over if need be (off a wall's face after a fall along it, from under a sill). Null where no push frees it:
  // a gap narrower than the body (Build 25).
  function settle(x, z, y0, y1, r = body.radius) { for (let i = 0; i < 4; i++) { let worst = null, most = -1; for (const b of near(x, z)) if (b.min[1] < y1 && b.max[1] > y0 && inside(b, x, z, r)) { const d = depth(b, x, z, r); if (d > most) { most = d; worst = b; } }
      if (!worst) return {x, z}; const b = worst, ways = [[x - (b.min[0] - r), -1, 0], [b.max[0] + r - x, 1, 0], [z - (b.min[2] - r), 0, -1], [b.max[2] + r - z, 0, 1]].sort((p, q) => p[0] - q[0])[0]; x += ways[1] * (ways[0] + .001); z += ways[2] * (ways[0] + .001); }
    return null; }
  // A horizontal move of a body whose feet are at y and whose head is at y + height, in steps of .25 m, each axis on
  // its own; it steps up onto anything within `step` of its feet. Returns the distance moved and the new floor.
  // `nudge` (Build 29, the player's own moves): a step that something small stops (a beam end, a doorpost, a coping a
  // few centimetres proud of the wall the body walks along) is tried again from up to `nudge` metres to any side;
  // the body slips past what it used to stop dead against. Nothing is passed that the body does not fit past.
  function move(p, dx, dz, height, r = body.radius, {stairs = false, nudge = 0} = {}) {
    const ox = p.x, oz = p.z, steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / .25));
    const step = (ax, az) => { const nx = p.x + ax, nz = p.z + az;
      // Where the feet would be after the step, what is in the way is judged from there: on a stair the next tread is
      // not in the way of a body already on the one below.
      // Where it would drop, the body must also fit where it lands, or be pushed somewhere it fits (`settle`): it does
      // not step off a crate into a gap narrower than itself (Build 25; before, it landed wedged there).
      // Stepping down, what is in the way is judged from the lower level too (a low thing there is met, not stood in).
      const f = floor(nx, nz, p.y + body.step, body.lean, p.y), drop = f.y < p.y - body.step, feet = drop ? p.y : f.y;
      if (passable(p.x, p.z, nx, nz, feet + body.step, feet + height, r, stairs, p.y + body.step, p.y + height) && (!drop || settle(nx, nz, f.y + body.step, f.y + height, r)) && (f.y <= p.y || ceiling(nx, nz, f.y + body.crouch, r) - f.y >= height)) { p.x = nx; p.z = nz; if (f.y > p.y || !drop) p.y = f.y; return true; } return false; };   // up a step, or down one within `step` (Build 28: as the game settles a body every frame; a drop is left to gravity)
    const ax = dx / steps, az = dz / steps, L = Math.hypot(ax, az);
    for (let i = 0; i < steps; i++) { const sx = p.x, sy = p.y, sz = p.z; if (ax) step(ax, 0); if (az) step(0, az); if (!nudge || !L) continue;
      // Hardly any way made (under a quarter of the step, measured along what was asked): the same step from a little to
      // one side or the other, whichever makes the most way, and only if it makes more. Sliding along a plain wall makes
      // seven tenths of the way and is never nudged; a body square against a wall gains nothing to either side and stays.
      const way = () => (Math.max(0, (p.x - sx) * Math.sign(ax)) * Math.abs(ax) + Math.max(0, (p.z - sz) * Math.sign(az)) * Math.abs(az)) / L, made = way();   /* way made on each axis asked for; stepping aside costs nothing */ if (made >= .25 * L) continue;
      let best = made, at = [p.x, p.y, p.z];
      for (let d = .04; d <= nudge + 1e-9; d += .04) for (const [lx, lz] of [[d, 0], [-d, 0], [0, d], [0, -d]]) { p.x = sx; p.y = sy; p.z = sz; if (!step(lx, lz)) continue; if (ax) step(ax, 0); if (az) step(0, az); if (way() > best + 1e-6) { best = way(); at = [p.x, p.y, p.z]; } }
      [p.x, p.y, p.z] = at; }
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
    else { if (Math.hypot(p.x - l.exit[0], p.z - l.exit[1]) > .8 || p.y < l.top - 1.3 || p.y > l.top + .3 || facing < .35) continue; return l; } } return null; }
  return {boxes: list, clear, stands, floor, ceiling, headroom, move, ledge, ladderAt, ladders, body, settle,
    // Whether a body under something may stand up yet: only once the whole of it is out from under (else it is held down).
    mayStand: (x, z, y) => headroom(x, z, y, body.radius) >= body.stand,
    // Everything a body can stand on within a square, for the checks: box tops and the ground.
    floors(x0, x1, z0, z1, stepBy = .5) { const out = []; for (let x = x0; x <= x1; x += stepBy) for (let z = z0; z <= z1; z += stepBy) out.push([x, z, floor(x, z, 1e9).y]); return out; }};
}
