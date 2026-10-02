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

def decamo(x, uniform, gear, camo_at=.074, close=16, gear_rects=(), cloth_rects=(), shade=30, weave=.035, debug=None, seed=7):
    """Patterned cloth becomes plain cloth of colour `uniform` (its broad shading kept, a fine weave added); the rest of the
    grey-green family (webbing, straps, pads, gloves) keeps its detail and is tinted `gear`. Rects (as seen at 1024, y from
    the top) say where the guess is to be overruled."""
    island, family0, energy = classes(x); L = lum(x)
    solid = (mblur(family0, island, 7) > .4).astype(np.float32) * island
    camo = closing((energy > camo_at).astype(np.float32) * solid, close) * solid
    if len(cloth_rects): camo = np.maximum(camo, rect_mask(x.shape, cloth_rects) * solid)
    if len(gear_rects): camo = camo * (1 - rect_mask(x.shape, gear_rects))
    camo = np.clip(blur(camo, 2), 0, 1) * solid; family = np.maximum(family0 * solid, camo)
    m = max(1e-3, float((L * camo).sum() / max(1, camo.sum())))
    rng = np.random.default_rng(seed); n = rng.standard_normal(L.shape).astype(np.float32); n = blur(n, .8) * 2.2
    sh = np.clip(mblur(L, camo, shade) / m, .62, 1.3) * (1 + weave * n)
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
