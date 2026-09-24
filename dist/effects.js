// Colours are linear (vertex colours are not sRGB-decoded): keep them dark or blood reads as glowing red.
// Pooled blood particles and persistent blood decals. Every buffer is allocated once: a hit never
// creates geometry or materials, draw calls stay constant (three particle pools + one decal mesh)
// and a mission reset simply clears the pools, so nothing can accumulate or leak.
import * as THREE from './three.module.js';

export const DECAL_LIMIT = 40;
const BODY = {droplets: 30, mist: 5, backspatter: 6}, HEAD = {droplets: 54, mist: 7, backspatter: 10};

function canvas(size, draw) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d'); if (ctx) draw(ctx, size);
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
function softDot(ctx, n) {
  const g = ctx.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.45, 'rgba(255,255,255,.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, n, n);
}
// Irregular splat with satellite droplets; fixed seed so every client draws the same texture.
function splat(ctx, n) {
  let seed = 7; const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  ctx.fillStyle = 'rgba(255,255,255,1)';
  const blob = (x, y, rad) => { ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill(); };
  for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2, d = r() * n * .16; blob(n / 2 + Math.cos(a) * d, n / 2 + Math.sin(a) * d, n * (.07 + r() * .09)); }
  for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, d = n * (.22 + r() * .24); blob(n / 2 + Math.cos(a) * d, n / 2 + Math.sin(a) * d, n * (.008 + r() * .025)); }
  for (let i = 0; i < 7; i++) { const a = r() * Math.PI * 2; ctx.save(); ctx.translate(n / 2, n / 2); ctx.rotate(a); ctx.fillRect(n * .12, -n * .012, n * (.18 + r() * .16), n * .024); ctx.restore(); }
}

class ParticlePool {
  constructor(capacity, size, texture, {gravity = 0, drag = 0, grow = 0} = {}) {
    Object.assign(this, {capacity, gravity, drag, grow, next: 0, live: 0, enabled: true});
    this.position = new Float32Array(capacity * 3); this.velocity = new Float32Array(capacity * 3);
    this.color = new Float32Array(capacity * 4); this.age = new Float32Array(capacity); this.life = new Float32Array(capacity); this.alpha = new Float32Array(capacity);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.position, 3).setUsage(THREE.DynamicDrawUsage));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.color, 4).setUsage(THREE.DynamicDrawUsage));
    this.points = new THREE.Points(geometry, new THREE.PointsMaterial({size, map: texture, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true}));
    this.points.frustumCulled = false; this.points.renderOrder = 3; this.points.visible = false;
  }
  emit(x, y, z, vx, vy, vz, life, r, g, b, a) {
    const i = this.next; this.next = (i + 1) % this.capacity;
    if (this.life[i] <= 0) this.live++;
    this.position.set([x, y, z], i * 3); this.velocity.set([vx, vy, vz], i * 3); this.color.set([r, g, b, a], i * 4);
    this.age[i] = 0; this.life[i] = life; this.alpha[i] = a; this.dirty = true;
  }
  // An empty pool is hidden so it costs no draw call.
  update(dt) {
    this.points.visible = this.enabled && (this.live > 0 || this.dirty);
    if (!this.live && !this.dirty) return;
    const p = this.position, v = this.velocity, c = this.color, damping = Math.exp(-this.drag * dt);
    for (let i = 0; i < this.capacity; i++) {
      if (this.life[i] <= 0) continue;
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) { this.life[i] = 0; c[i * 4 + 3] = 0; this.live--; continue; }
      const j = i * 3; v[j] *= damping; v[j + 1] = v[j + 1] * damping - this.gravity * dt; v[j + 2] *= damping;
      p[j] += v[j] * dt; p[j + 1] += v[j + 1] * dt; p[j + 2] += v[j + 2] * dt;
      const u = this.age[i] / this.life[i]; c[i * 4 + 3] = this.alpha[i] * (1 - u * u);
    }
    const g = this.points.geometry.attributes; g.position.needsUpdate = g.color.needsUpdate = true; this.dirty = false;
    this.points.visible = this.enabled && this.live > 0;
  }
  clear() { this.life.fill(0); for (let i = 3; i < this.color.length; i += 4) this.color[i] = 0; this.live = 0; this.next = 0; this.dirty = true; this.update(0); }
}

class DecalRing {
  constructor(limit, texture) {
    this.limit = limit; this.next = 0; this.total = 0; this.ids = new Array(limit).fill(-1); this.data = new Float32Array(limit * 8);
    // Lit like the surfaces beneath it (sun shadow, sky light, fog); never casts into the static shadow map.
    const material = new THREE.MeshStandardMaterial({color: 0x6e0f0b, map: texture, transparent: true, depthWrite: false, roughness: .5, metalness: 0, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4});
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, limit);
    // frustumCulled off: r169 caches an InstancedMesh bounding sphere, which would cull rewritten slots.
    this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.renderOrder = -1; this.mesh.castShadow = false; this.mesh.receiveShadow = true;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.spin = new THREE.Quaternion(); this.n = new THREE.Vector3(); this.pos = new THREE.Vector3(); this.scale = new THREE.Vector3();
  }
  // Oldest-first retirement: the ring overwrites the slot that was filled longest ago. The position already
  // includes the placer's surface offset. No local de-duplication: every peer applies the host's decals in order.
  add([x, y, z, nx, ny, nz, size, rot]) {
    const i = this.next; this.next = (i + 1) % this.limit;
    this.n.set(nx, ny, nz).normalize();
    this.q.setFromUnitVectors(Z, this.n).multiply(this.spin.setFromAxisAngle(Z, rot));
    this.pos.set(x, y, z);
    this.mesh.setMatrixAt(i, this.m.compose(this.pos, this.q, this.scale.set(size, size, 1)));
    this.mesh.instanceMatrix.needsUpdate = true;
    this.data.set([x, y, z, nx, ny, nz, size, rot], i * 8); this.ids[i] = this.total++;
    this.mesh.count = Math.min(this.limit, this.total);
    return i;
  }
  clear() { this.next = 0; this.total = 0; this.ids.fill(-1); this.mesh.count = 0; }
  // Live decals, oldest first (for tests and diagnostics).
  list() { return this.ids.map((id, i) => ({id, i})).filter(e => e.id >= 0).sort((a, b) => a.id - b.id).map(({id, i}) => ({id, slot: i, position: [...this.data.subarray(i * 8, i * 8 + 3)], normal: [...this.data.subarray(i * 8 + 3, i * 8 + 6)], size: this.data[i * 8 + 6]})); }
}
const Z = new THREE.Vector3(0, 0, 1);

export function createBloodEffects(scene) {
  const dot = canvas(64, softDot), splatTexture = canvas(128, splat);
  const droplets = new ParticlePool(1024, .085, dot, {gravity: 9.8, drag: .6});
  const mist = new ParticlePool(128, .62, dot, {gravity: .35, drag: 2.4});
  const mistHead = new ParticlePool(96, 1.0, dot, {gravity: .35, drag: 2.4});
  const decals = new DecalRing(DECAL_LIMIT, splatTexture);
  const pools = [droplets, mist, mistHead], baseSize = pools.map(p => p.points.material.size), NORMAL_FOV = 70;
  for (const pool of pools) scene.add(pool.points);
  scene.add(decals.mesh);
  let visible = true, spawned = 0;
  const rnd = () => Math.random() - .5;
  return {
    DECAL_LIMIT,
    // Cosmetic randomness uses Math.random so blood never shifts the seeded gameplay rand().
    spray(point, dir, head) {
      if (!visible) return;
      spawned++;
      const n = head ? HEAD : BODY, speed = head ? 5.2 : 4, cone = head ? 1.5 : 1.1;
      for (let i = 0; i < n.droplets; i++) {
        const s = speed * (.35 + Math.random() * .75);
        droplets.emit(point.x, point.y, point.z, dir.x * s + rnd() * cone * s, dir.y * s + .6 + Math.random() * 1.6, dir.z * s + rnd() * cone * s, .55 + Math.random() * .35, .17, .012, .008, .95);
      }
      for (let i = 0; i < n.backspatter; i++) { // entry spatter toward the shooter, so it reads from the shooter's side
        const s = 1.2 + Math.random() * 1.6;
        droplets.emit(point.x, point.y, point.z, -dir.x * s + rnd() * 2.6, .4 + Math.random() * 1.4, -dir.z * s + rnd() * 2.6, .45 + Math.random() * .25, .2, .015, .01, .9);
      }
      const pool = head ? mistHead : mist;
      for (let i = 0; i < n.mist; i++) pool.emit(point.x + rnd() * .2, point.y + rnd() * .2, point.z + rnd() * .2, rnd() * 2.2 - dir.x * .5, rnd() * 1.4 + .25, rnd() * 2.2 - dir.z * .5, (head ? .75 : .6) + Math.random() * .25, .3, .025, .018, head ? .62 : .55);
    },
    decal(d) { return visible && d ? decals.add(d) : -1; },
    // Point sprites are sized in screen space, so scale them with zoom to keep blood in proportion to the target.
    update(dt, fov = NORMAL_FOV) { const zoom = Math.tan(NORMAL_FOV * Math.PI / 360) / Math.tan(fov * Math.PI / 360); pools.forEach((p, i) => { p.points.material.size = baseSize[i] * zoom; p.update(dt); }); },
    clear() { for (const pool of pools) pool.clear(); decals.clear(); },
    setVisible(on) { visible = !!on; for (const pool of pools) { pool.enabled = visible; if (!visible) pool.clear(); pool.points.visible = visible && pool.live > 0; } decals.mesh.visible = visible; },
    stats: () => ({liveParticles: droplets.live + mist.live + mistHead.live, droplets: droplets.live, mist: mist.live + mistHead.live, decals: decals.mesh.count, sprays: spawned, visible}),
    decals: () => decals.list(),
    objects: [...pools.map(p => p.points), decals.mesh],
  };
}
