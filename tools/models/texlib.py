# Build 38: texture work for the Rocketbox avatars, in numpy (run inside Blender's Python).
import bpy, numpy as np

def load(path):
    img = bpy.data.images.load(path, check_existing=False); w, h = img.size
    a = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(a); bpy.data.images.remove(img)
    return a.reshape(h, w, 4)[:, :, :3].copy()          # row 0 is the BOTTOM of the picture

def save(arr, path, fmt='PNG', quality=90):
    h, w = arr.shape[:2]; img = bpy.data.images.new('out', w, h, alpha=False)
    a = np.ones((h, w, 4), np.float32); a[:, :, :3] = np.clip(arr, 0, 1); img.pixels.foreach_set(a.ravel())
    s = bpy.context.scene.render.image_settings; s.file_format = fmt; s.quality = quality; s.color_mode = 'RGB'
    img.save_render(path); bpy.data.images.remove(img)

def to_image(arr, name):
    h, w = arr.shape[:2]; img = bpy.data.images.new(name, w, h, alpha=False)
    a = np.ones((h, w, 4), np.float32); a[:, :, :3] = np.clip(arr, 0, 1); img.pixels.foreach_set(a.ravel()); img.pack(); return img

def blur(x, sigma):
    if sigma <= 0: return x
    h, w = x.shape[:2]; fy = np.fft.fftfreq(h)[:, None]; fx = np.fft.rfftfreq(w)[None, :]
    g = np.exp(-2 * (np.pi ** 2) * (sigma ** 2) * (fx ** 2 + fy ** 2))
    if x.ndim == 2: return np.fft.irfft2(np.fft.rfft2(x) * g, s=(h, w)).astype(np.float32)
    return np.stack([np.fft.irfft2(np.fft.rfft2(x[:, :, c]) * g, s=(h, w)) for c in range(x.shape[2])], 2).astype(np.float32)

def mblur(x, m, sigma):
    """Blur of x counting only where m is set (m: weights 0..1)."""
    num = blur(x * (m[:, :, None] if x.ndim == 3 else m), sigma); den = blur(m, sigma)
    den = np.maximum(den, 1e-4); return num / (den[:, :, None] if x.ndim == 3 else den)

def half(x):
    h, w = x.shape[:2]; return x.reshape(h // 2, 2, w // 2, 2, -1).mean((1, 3)) if x.ndim == 3 else x.reshape(h // 2, 2, w // 2, 2).mean((1, 3))

def lum(x): return x[:, :, 0] * .299 + x[:, :, 1] * .587 + x[:, :, 2] * .114

def rect_mask(shape, rects, view=1024):
    """rects: (x0, y0, x1, y1) as seen in a `view`-pixel-wide picture with y from the TOP."""
    h, w = shape[:2]; k = w / view; m = np.zeros((h, w), np.float32)
    for x0, y0, x1, y1 in rects: m[max(0, h - int(y1 * k)):h - int(y0 * k), int(x0 * k):int(x1 * k)] = 1
    return m

def inpaint(x, island, rects, view=1024, sigma=14):
    """Fill the rects from what surrounds them."""
    r = rect_mask(x.shape, rects, view)
    if not r.any(): return x
    soft = np.clip(blur(r, 2.5) * 1.6, 0, 1); keep = island * (1 - np.clip(blur(r, 1.5) * 3, 0, 1))
    fill = x.copy()
    for s in (sigma, sigma * 2.5, sigma * 6):      # widening: every rect pixel gets something
        f = mblur(x, keep, s); ok = np.clip(blur(keep, s) * 40, 0, 1)[:, :, None]; fill = fill * (1 - ok * 0) ; fill = np.where((ok > .5), f, fill) if s == sigma else np.where((blur(keep, sigma) < .012)[:, :, None] & (ok > .5), f, fill)
    return x * (1 - soft[:, :, None]) + fill * soft[:, :, None]

def classes(x):
    """island: not background. family: the grey-green of uniform and gear. energy: how patterned (chroma and tone change at the scale of the pattern's blocks)."""
    L = lum(x); island = (x.max(2) > .035).astype(np.float32)
    rb = x[:, :, 0] - x[:, :, 2]; sat = x.max(2) - x.min(2)
    family = island * (rb < .125) * (rb > -.06) * (L > .16) * (sat < .2)
    e = np.abs(mblur(rb, island, 1.5) - mblur(rb, island, 9)); e2 = np.abs(mblur(L, island, 1.5) - mblur(L, island, 9))
    energy = mblur(e * 6 + e2 * 1.2, island, 15)
    return island, family.astype(np.float32), energy

def closing(m, r):
    d = (blur(m, r) > .12).astype(np.float32); return (blur(d, r) > .88).astype(np.float32)

def decamo(x, uniform, gear, camo_at=.074, close=16, gear_rects=(), cloth_rects=(), force_rects=(), shade=30, weave=.035, debug=None, seed=7):
    """Patterned cloth becomes plain cloth of colour `uniform` (its broad shading kept, a fine weave added); the rest of the
    grey-green family (webbing, straps, pads, gloves) keeps its detail and is tinted `gear`. Rects (as seen at 1024, y from
    the top) say where the guess is to be overruled; `force_rects` are cloth whatever the picture shows there."""
    island, family0, energy = classes(x); L = lum(x)
    solid = (mblur(family0, island, 7) > .4).astype(np.float32) * island
    camo = closing((energy > camo_at).astype(np.float32) * solid, close) * solid
    if len(cloth_rects): camo = np.maximum(camo, rect_mask(x.shape, cloth_rects) * solid)
    if len(gear_rects): camo = camo * (1 - rect_mask(x.shape, gear_rects))
    camo = np.clip(blur(camo, 2), 0, 1) * solid
    if len(force_rects): camo = np.maximum(camo, np.clip(blur(rect_mask(x.shape, force_rects), 2), 0, 1) * island)      # cloth whatever was there (Build 39: a bare forearm becomes a sleeve)
    family = np.maximum(family0 * solid, camo)
    m = max(1e-3, float((L * camo).sum() / max(1, camo.sum())))
    rng = np.random.default_rng(seed); n = rng.standard_normal(L.shape).astype(np.float32); n = blur(n, .8) * 2.2
    sh = (np.clip(mblur(L, camo, shade) / m, .62, 1.3) if shade else 1) * (1 + weave * n)      # shade 0 (Build 40, the arms): no broad light and dark taken from the patterned picture; the folds are given by `folds`
    if len(force_rects):      # what was not cloth is shaded by its own light and dark about the cloth's middle tone, not by how dark skin is beside cloth
        fm = np.clip(blur(rect_mask(x.shape, force_rects), 2), 0, 1) * island * (1 - family0 * solid); mf = max(1e-3, float((L * fm).sum() / max(1, fm.sum())))
        own = np.clip(mblur(L, np.maximum(fm, 1e-4), shade) / mf, .82, 1.15) * (1 + weave * n); sh = sh * (1 - fm) + own * fm
    cloth = sh[:, :, None] * np.array(uniform, np.float32)[None, None, :]
    g = family * (1 - camo); mg = max(1e-3, float((L * g).sum() / max(1, g.sum())))
    gearc = np.clip(L / mg, .15, 1.6)[:, :, None] * np.array(gear, np.float32)[None, None, :] if gear is not None else x
    out = x * (1 - family[:, :, None]) + family[:, :, None] * (gearc * (1 - camo[:, :, None]) + cloth * camo[:, :, None])
    if debug: save(np.stack([camo, family, island], 2), debug)
    return out, island

def bleed(x, island, sigma=6):
    """Background takes the colour of the nearest cloth, so that smaller copies of the picture show no dark seams."""
    f = mblur(x, island, sigma); f2 = mblur(x, island, sigma * 5); far = (blur(island, sigma) < .02)[:, :, None]
    bg = np.where(far, f2, f); return x * island[:, :, None] + bg * (1 - island[:, :, None])

def tint_where(x, mask, colour, keepL=True):
    L = lum(x); m = max(1e-3, float((L * mask).sum() / max(1, mask.sum())))
    t = (np.clip(L / m, .2, 2)[:, :, None] if keepL else 1) * np.array(colour, np.float32)[None, None, :]
    return x * (1 - mask[:, :, None]) + t * mask[:, :, None]

def worn(mesh, picture, names):
    """The middle colour (the median of each channel: a glove's cuff over a sleeve does not tint it) of the picture where the faces of the bones `names` (by most weight) are drawn: what that limb wears.
    Written into the file (Build 39) so that a check can tell a sleeve from a bare arm without drawing the picture."""
    vg = {g.index: g.name for g in mesh.vertex_groups}; uv = mesh.data.uv_layers.active.data; H, W = picture.shape[:2]; got = []
    lead = {}
    for v in mesh.data.vertices:
        best = max(v.groups, key=lambda g: g.weight, default=None); lead[v.index] = vg[best.group] if best else ''
    for poly in mesh.data.polygons:
        if not all(any(k in lead[vi] for k in names) for vi in poly.vertices): continue
        u = np.mean([uv[li].uv[0] for li in poly.loop_indices]); v_ = np.mean([uv[li].uv[1] for li in poly.loop_indices])
        got.append(picture[min(H - 1, max(0, int(v_ * H))), min(W - 1, max(0, int(u * W)))])
    return [round(float(c), 3) for c in np.median(np.array(got), 0)] if got else [0, 0, 0]

def folds(normal, slope=.9, side=.35, fine=1.4, floor=.62):
    """Build 40: what light and dark a cloth's folds have of themselves, from its normal picture: darker where the surface
    tilts (the flanks of a fold and the creases between), a little lighter or darker by which way it tilts across the
    picture (as if lit from one side), about 1 on the flat. Multiplied into the cloth's colour so that the folds are there
    in any light: a normal picture alone shows nothing in the shade (the arms looked like cardboard indoors)."""
    nx = normal[:, :, 0] * 2 - 1; ny = normal[:, :, 1] * 2 - 1
    tilt = np.sqrt(nx * nx + ny * ny); tilt = blur(tilt, fine)
    lit = blur(nx, fine) - blur(nx, 12)                                   # which way it tilts, without the broad shape
    sh = 1 - slope * tilt + side * lit
    return np.clip(sh, floor, 1.12).astype(np.float32)                    # the flat (no tilt) stays the cloth's own colour

def weave(shape, seed=11, strength=.06):
    """A woven cloth's grain: threads both ways, a pixel or two wide, uneven."""
    h, w = shape[:2]; rng = np.random.default_rng(seed); y, x = np.mgrid[0:h, 0:w]
    warp = np.sin(x * 2.1 + rng.standard_normal((h, 1)) * .6) * np.sin(y * .23 + 1.3); weft = np.sin(y * 2.1 + rng.standard_normal((1, w)) * .6) * np.sin(x * .23 + .4)
    n = blur(rng.standard_normal((h, w)).astype(np.float32), .7) * 1.6
    return (1 + strength * (.45 * warp + .45 * weft + .6 * n)).astype(np.float32)

def contrast(mesh, picture, names):
    """How much light and dark the picture has where the faces of the bones `names` are drawn: the spread of its brightness
    over its middle brightness there (a plain coat of paint is near 0)."""
    vg = {g.index: g.name for g in mesh.vertex_groups}; uv = mesh.data.uv_layers.active.data; H, W = picture.shape[:2]; got = []; lead = {}
    for v in mesh.data.vertices:
        best = max(v.groups, key=lambda g: g.weight, default=None); lead[v.index] = vg[best.group] if best else ''
    L = lum(picture)
    for poly in mesh.data.polygons:
        if not all(any(k in lead[vi] for k in names) for vi in poly.vertices): continue
        us = [uv[li].uv[0] for li in poly.loop_indices]; vs = [uv[li].uv[1] for li in poly.loop_indices]
        for a in (0, .5, 1):
            for b in (0, .5, 1):
                if a + b > 1: continue
                u = us[0] + (us[1] - us[0]) * a + (us[2] - us[0]) * b if len(us) > 2 else us[0]; v_ = vs[0] + (vs[1] - vs[0]) * a + (vs[2] - vs[0]) * b if len(vs) > 2 else vs[0]
                got.append(L[min(H - 1, max(0, int(v_ * H))), min(W - 1, max(0, int(u * W)))])
    got = np.array(got); return round(float(np.std(got) / max(1e-3, np.median(got))), 3) if len(got) else 0
