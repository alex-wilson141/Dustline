// Enemy behaviour data (Build 07, waves and corpse limits Build 08): tunables, patrol loops, spawn points, reinforcement
// entries and the cover table.
// game.js reads ENEMY_AI at call time (never copied at load), so every value here is live and testable.
// Hit chance, damage and fire cadence are NOT here: they stay in game.js's unchanged fire block and aiHit.
import './build.js'; // DEPLOY-01: an older cached page that fetches this new file reloads instead of mixing builds

export const ENEMY_AI = {
  // Movement (all below player walk speed 3.5 × class multiplier).
  patrolSpeed: 1.6, relocateSpeed: 2.8, reinforceSpeed: 2.2, peekStepSpeed: 2.0,
  patrolDwell: [2, 5], nodeArrive: 1.0, coverArrive: .35,
  // Awareness: enemies share a sighting within alertRadius and react to shots within hearRadius.
  alertRadius: 25, hearRadius: 35, threatMemory: 8,
  // Cover search.
  coverSearchRadius: 18, coverCandidates: 6, coverPathTries: 2, coverClaimRadius: 1.5,
  coverMinHumanDist: 12, engageMinDist: 16, coverMaxThreatDist: 45, coverSideCos: -.57, coverPrefRange: 22,
  // Hide / rise / peek cycle. Firing is only allowed while peeking (or holding when no cover exists).
  hideTime: [1.5, 3], riseDelay: .45, peekTime: [2, 3.5],
  // At most this many enemies may shoot at the same target at once.
  attackTokens: 3,
  // Repositioning.
  relocateOnHit: .6, maxCoverHold: [10, 16], relocateMinInterval: 3, maxRelocating: 2,
  // After lostTargetSearch s without sight an engaged enemy hunts toward the last known position. While its foe (the
  // target it last saw) is alive and within engageLeash m it stays in the fight; otherwise it returns to duty (AI-04).
  lostTargetSearch: 6, searchStopDist: 12, noCoverRetry: [4, 6], engageLeash: 60,
  stuckRepath: 1.5, stuckAbandon: 4,
  // Reinforcements recycle dead enemy actors (at most 7 are ever alive) and arrive in waves of waveSize from one
  // entry point, spawnInterval seconds apart. Budgets are per stage, so every stage can be cleared for good.
  reinforce: true, budget: {0: 6, 1: 9, 2: 6, skirmish: 12}, maxAlive: {0: 6, 1: 7, 2: 6, skirmish: 7}, waveSize: {0: 2, 1: 3, 2: 3, skirmish: 3},
  firstSpawnDelay: 20, spawnInterval: [22, 32], directorTick: 1, corpseMinAge: 8,
  // Bodies stay shootable, then sink away after corpseLife seconds or when more than corpseMax are lying (oldest first).
  corpseLife: 40, corpseMax: 5, corpseSinkTime: 1.5,
  spawnMinHumanDist: 35, spawnMinObjectiveDist: 35, spawnMinAllyDist: 15, humanSightRange: 90,
  // Mission safety: the relay capture must stay winnable.
  relayNoGo: 16, garrisonRadius: 15, garrisonFlushAfter: 12, extractQuietRadius: 20,
  // Crouched enemies are .3 m lower; hit zones add this back so headshots still count.
  crouchDrop: .3,
};

// Fixed enemy spawns. (12,-17) sat inside the low wall at (11,-17) (AI-02); every spawn is also validated at runtime.
export const ENEMY_SPAWNS = [[-13, 2], [12, -19], [-30, -26], [34, -26], [-6, -45], [8, -55], [-36, -45]];

// Patrol loops (every leg checked with pathTo in Step A). Stage-0 loops stay 45 m+ from the player start.
export const PATROL_LOOPS = {
  MW: [[-32, 4], [-14, 4], [-14, -20], [-34, -20], [-40, -6]],
  MC: [[-6, 8], [4, 2], [4, -8], [-4, -22], [-16, -8]],
  ME: [[16, 12], [34, 12], [40, -18], [18, -22], [12, 2]],
  RING: [[-18, -30], [18, -30], [22, -48], [24, -76], [-2, -80], [-24, -74], [-22, -48]],
  SW: [[-30, -32], [-54, -38], [-56, -60], [-34, -62], [-28, -48]],
  SE: [[32, -28], [56, -40], [58, -60], [34, -62], [38, -46]],
  NW: [[-24, 26], [-48, 26], [-54, 44], [-28, 46]],
  NE: [[24, 32], [48, 30], [52, 50], [30, 52]],
};
// Per original enemy (index 0-6). Two hold the relay; the rest patrol sectors.
export const LOOP_ASSIGN = ['MC', 'ME', 'MW', 'SE', 'GARRISON', 'GARRISON', 'SW'];
// Loops a reinforcement joins after its entry chain, by stage.
export const REINFORCE_LOOPS = {0: ['MW', 'MC', 'SW'], 1: ['RING', 'SW', 'SE'], 2: ['ME', 'NE'], skirmish: ['RING', 'SW', 'SE']};

// Reinforcement entry points: spawn point, then entry legs. Stages where each may be used.
export const REINFORCE_POINTS = [
  {chain: [[80, 10], [52, -4], [40, -18]], stages: [0, 1, 2]},
  {chain: [[-80, -14], [-52, -20], [-40, -6]], stages: [0, 1, 2]},
  {chain: [[-60, -84], [-48, -66], [-56, -60]], stages: [0, 1, 2]},
  {chain: [[64, -84], [58, -60]], stages: [0, 1, 2]},
  {chain: [[30, -86], [34, -62]], stages: [0, 1, 2]},
  {chain: [[-24, -86], [-34, -62]], stages: [0, 1, 2]},
  {chain: [[-80, 40], [-54, 44]], stages: [0, 1, 2]},
  {chain: [[-52, -20], [-40, -6]], stages: [1, 2]},
  {chain: [[52, -4], [40, -18]], stages: [0, 1, 2]},
  {chain: [[-48, -44], [-54, -38]], stages: [0, 1, 2]},
  {chain: [[12, -64], [24, -76]], stages: [0, 2]},
  {chain: [[20, -8], [18, -22]], stages: [0, 1, 2]},
];

// Separate seeded stream for AI decisions so the game's seeded rand() (spread, reset) is disturbed as little as possible.
export function aiRandom(seed) {
  let s = seed >>> 0;
  const next = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  next.range = ([a, b]) => a + next() * (b - a);
  return next;
}

// Cover points .9 m out from the faces of standing-height occluder boxes (boxes are unrotated and unscaled).
// Low cover (top < 1.3 m) is used crouched; tall cover needs a peek spot beside the face end to shoot from.
export function buildCoverTable(occluders, groundY, isFree) {
  const points = [], buckets = new Map(), key = (x, z) => `${Math.floor(x / 8)},${Math.floor(z / 8)}`;
  for (const o of occluders) {
    const b = o.geometry.boundingBox || (o.geometry.computeBoundingBox(), o.geometry.boundingBox), e = o.matrixWorld.elements;
    const lo = [b.min.x + e[12], b.min.y + e[13], b.min.z + e[14]], hi = [b.max.x + e[12], b.max.y + e[13], b.max.z + e[14]];
    const cx = (lo[0] + hi[0]) / 2, cz = (lo[2] + hi[2]) / 2, ground = groundY(cx, cz), top = hi[1] - ground;
    if (lo[1] - ground > .45 || top < .95) continue;
    const low = top < 1.3;
    for (const [axis, sign] of [[0, 1], [0, -1], [2, 1], [2, -1]]) {
      const t = axis === 0 ? 2 : 0, a0 = lo[t] + .4, a1 = hi[t] - .4, len = a1 - a0, n = len < .01 ? 1 : Math.max(1, Math.round(len / 1.5) + 1);
      const face = sign > 0 ? hi[axis] : lo[axis];
      for (let i = 0; i < n; i++) {
        const along = n === 1 ? (lo[t] + hi[t]) / 2 : a0 + len * i / (n - 1);
        const x = axis === 0 ? face + sign * .9 : along, z = axis === 2 ? face + sign * .9 : along;
        if (!isFree(x, z)) continue;
        const nx = axis === 0 ? sign : 0, nz = axis === 2 ? sign : 0;
        let peek = null;
        if (!low) {
          // Step past the nearer face end to shoot around the wall.
          const end = along - lo[t] < hi[t] - along ? lo[t] - .7 : hi[t] + .7;
          const px = axis === 0 ? x : end, pz = axis === 2 ? z : end;
          if (Math.abs(end - along) <= 2.5 && isFree(px, pz)) peek = [px, pz];
          else continue;
        }
        const p = {id: points.length, x, z, nx, nz, low, top, peek};
        points.push(p);
        const k = key(x, z); if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(p);
      }
    }
  }
  return {
    points,
    near(x, z, r) {
      const out = [], x0 = Math.floor((x - r) / 8), x1 = Math.floor((x + r) / 8), z0 = Math.floor((z - r) / 8), z1 = Math.floor((z + r) / 8);
      for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) for (const p of buckets.get(`${i},${j}`) || []) if (Math.hypot(p.x - x, p.z - z) <= r) out.push(p);
      return out;
    },
  };
}
