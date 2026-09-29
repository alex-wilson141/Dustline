// Build 19 equipment: the sidearm, the knife and the three throwables. This module holds the data and the pure rules;
// game.js wires them to the world, the HUD and co-op. Rifles are untouched: nothing here changes a class rifle's damage,
// accuracy, rate of fire or reload. Everything visible is built from simple shapes and the game's materials (no new assets).
import './build.js'; // DEPLOY-01 upgrade guard

// The sidearm every class carries beside its rifle. It is what you change to when the rifle runs dry: in hand in DRAW.sidearm
// (.45 s, against 2.15 to 5.1 s to reload a rifle), 26 a hit up close (a rifle does 34 to 78), and weaker with range:
// full damage to falloff[0] metres, falling in a straight line to `floor` of it at falloff[1] and beyond. A head hit does
// headDamage (a rifle's head hit kills outright; the sidearm's takes two), reduced with range the same way. Semi-automatic.
export const SIDEARM = {name: 'Sidearm', weapon: 'M9 SIDEARM', caliber: '9 × 19', capacity: 15, reserve: 45, reload: 1.6, interval: .16, damage: 26, headDamage: 80,
  recoil: .02, spread: .006, automatic: false, zoom: 58, falloff: [12, 40], floor: .45, sidearm: true};
export const DRAW = {sidearm: .45, rifle: .7};
// Damage of one hit at `distance`. Rifles have no falloff entry and do what they always did (110 to the head).
export function hitDamage(config, head, distance) {
  const base = head ? (config.headDamage ?? 110) : config.damage; if (!config.falloff) return base;
  const [a, b] = config.falloff, f = distance <= a ? 1 : distance >= b ? config.floor : 1 - (1 - config.floor) * (distance - a) / (b - a);
  return Math.round(base * f * 10) / 10;
}

// The knife: on its own key, without changing weapons. It reaches `range` metres inside a cone of `cone` degrees either
// side of where you look, and can be used again after `cooldown`. From the front it does `front`; an enemy facing away
// (your thrust within `behind` degrees of the way it faces) takes `back`, which kills. A teammate takes `front`.
export const KNIFE = {range: 2.3, cone: 50, cooldown: .8, front: 65, back: 250, behind: 60, swing: .3};
// `to` is the horizontal direction from attacker to victim, `facing` the victim's yaw (a character looks along
// (-sin yaw, -cos yaw)). From behind means the thrust runs the way the victim faces.
export function fromBehind(to, facing) { const l = Math.hypot(to.x, to.z) || 1; return (-Math.sin(facing) * to.x - Math.cos(facing) * to.z) / l >= Math.cos(KNIFE.behind * Math.PI / 180); }
// Whether a point at `to` (relative, any height) is in reach of a knife held by someone looking along `look` (unit, 3D).
export function knifeReach(to, look) { const d = Math.hypot(to.x, to.z); if (d > KNIFE.range) return false; if (d < .35) return true; const l = Math.hypot(look.x, look.z) || 1; return (to.x * look.x + to.z * look.z) / (d * l) >= Math.cos(KNIFE.cone * Math.PI / 180); }

// Throwables. All are thrown at THROW.speed along the view, lifted by THROW.lift, fall at THROW.gravity and bounce off walls
// and ground keeping THROW.bounce of their speed; below THROW.rest they lie still.
export const THROW = {speed: 17, lift: .18, gravity: 9.8, bounce: .32, rest: 1.2, radius: .07, hand: [.22, -.18, -.35], maxFlight: 8};
export const ITEMS = {
  // Fragmentation grenade: the fuse starts when you take it in hand (hold the throw key to cook it; it goes off in the hand
  // at the end of the fuse). Everyone within `radius` with nothing solid between them and the blast is hurt: `damage`
  // inside `inner` metres, falling in a straight line to nothing at `radius`. Armor applies to players.
  frag: {key: 'frag', name: 'FRAG', fuse: 3.5, radius: 8, inner: 2, damage: 170, price: 300, carry: 2},
  // Smoke: bursts `fuse` after it is thrown, fills a ball of `radius` within `grow` seconds and stands for `life`. Nobody
  // sees through it: not the enemies, not the players.
  smoke: {key: 'smoke', name: 'SMOKE', fuse: 1.5, radius: 5, grow: 1.5, life: 14, fade: 2.5, price: 200, carry: 2},
  // Flashbang: bursts `fuse` after it is thrown. Whoever has it in sight within `radius`, with it inside `cone` degrees of
  // where they look, is blinded for up to `blind` seconds: less with distance, less toward the edge of the cone, never
  // under `least` when caught at all. Looking away, or having a wall or smoke in between, you are not.
  flash: {key: 'flash', name: 'FLASH', fuse: 1.6, radius: 25, cone: 75, blind: 4.5, least: .6, price: 250, carry: 2},
};
export const ITEM_ORDER = ['frag', 'smoke', 'flash'];
// What a player starts a mission with. Story and Skirmish hand everything out; in Ambush the sidearm comes with two
// magazines and throwables are bought at the crates.
export const LOADOUT = {
  story: {sidearmReserve: 45, frag: 2, smoke: 1, flash: 1},
  ambush: {sidearmReserve: 15, frag: 0, smoke: 0, flash: 0},
};
export const loadoutFor = mode => mode === 'ambush' ? LOADOUT.ambush : LOADOUT.story;
// Ambush prices rise with the wave exactly as magazines and dressings do (x1 at wave 1 to x2.5 from wave 16), in tens.
export function itemPrice(kind, wave, scale = {step: .1, cap: 2.5}) { const s = Math.min(scale.cap, 1 + scale.step * (Math.max(1, wave) - 1)); return Math.ceil(ITEMS[kind].price * s / 10) * 10; }

// Blast damage at `distance` from a fragmentation grenade, before armor.
export function blastDamage(distance, item = ITEMS.frag) { if (distance >= item.radius) return 0; if (distance <= item.inner) return item.damage; return Math.round(item.damage * (1 - (distance - item.inner) / (item.radius - item.inner)) * 10) / 10; }
// Seconds of blindness for someone `distance` from a flashbang who looks along `look` (unit) with the flash in direction
// `to` (unit). 0 when it is outside the cone or the radius. Sight is the caller's business.
export function blindFor(distance, look, to, item = ITEMS.flash) {
  if (distance >= item.radius) return 0; const c = look.x * to.x + look.y * to.y + look.z * to.z, edge = Math.cos(item.cone * Math.PI / 180); if (c < edge) return 0;
  const facing = (c - edge) / (1 - edge), near = 1 - distance / item.radius; return Math.max(item.least, Math.round(item.blind * near * (.4 + .6 * facing) * 100) / 100);
}
// Whether the straight line from a to b passes through a ball at c of radius r (smoke). Points inside the ball count.
export function throughBall(a, b, c, r) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, l2 = dx * dx + dy * dy + dz * dz; let t = l2 > 0 ? ((c.x - a.x) * dx + (c.y - a.y) * dy + (c.z - a.z) * dz) / l2 : 0; t = Math.max(0, Math.min(1, t));
  return Math.hypot(a.x + dx * t - c.x, a.y + dy * t - c.y, a.z + dz * t - c.z) < r;
}
// How much of its radius a smoke cloud has at `age` seconds: it grows, stands, and thins out at the end.
export function smokeRadius(age, item = ITEMS.smoke) { if (age < 0 || age >= item.life) return 0; const grown = Math.min(1, age / item.grow), left = Math.min(1, (item.life - age) / item.fade); return item.radius * grown * (left < 1 ? .5 + .5 * left : 1); }
// The velocity a throwable leaves the hand with, for a unit view direction.
export function throwVelocity(look) { const x = look.x, y = look.y + THROW.lift, z = look.z, l = Math.hypot(x, y, z) || 1; return [x / l * THROW.speed, y / l * THROW.speed, z / l * THROW.speed]; }
// Where a throw lands on flat, open ground (no walls): used by the tests to say where an arc should come down.
export function flatLanding(origin, look, groundY = 0) { const [vx, vy, vz] = throwVelocity(look), g = THROW.gravity, h = origin.y - groundY, t = (vy + Math.sqrt(vy * vy + 2 * g * h)) / g; return {x: origin.x + vx * t, z: origin.z + vz * t, t}; }
