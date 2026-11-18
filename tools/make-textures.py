#!/usr/bin/env python3
"""Seamless platform textures for the code painter (Pillow only).

Usage:
  python3 tools/make-textures.py            every zone painting + every terrain swatch
  python3 tools/make-textures.py z03-kitchen chimney   only these

Zone textures (design: "Platforms and walls"):
  - cut a 640 px square from the zone's far-a painting (the busiest, mid-value patch);
  - make it tile seamlessly (blend with itself rolled by half, feathered from the centre);
  - remap its luminance to a gradient between the zone's two darkest palette colours, pushed
    darker so platforms are always the darkest values on screen and never blend into the
    painting behind them;
  -> game/assets/textures/<bg>.webp, 512x512 (the painter draws it at 0.75 world px per px).

Terrain swatches (game/assets/terrain/<kind>.png, already painted as swatches):
  - made seamless the same way, slightly deepened and lowered in contrast so they read as
    terrain, not as the light painting
  -> game/assets/textures/terrain-<kind>.webp, 256x256.
"""
import os, sys
from PIL import Image, ImageChops, ImageFilter, ImageOps, ImageStat

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'game/assets')
OUT = os.path.join(ASSETS, 'textures')

# Palettes from design/GAME_DESIGN.md ("Palettes"); keyed by the bg folder name.
PALETTES = {
    'z00-tank':     ['#E3A857', '#8FB8B0', '#D9C29A', '#2E3550'],
    'z01-bedroom':  ['#3B4A7A', '#F2C46D', '#C8564B', '#7C98C4'],
    'z02-bathroom': ['#8CC9C4', '#E9F1EE', '#A9B8C2', '#4F7F86'],
    'z03-kitchen':  ['#F1D27A', '#C27A45', '#D0614A', '#8EA67A'],
    'z04-pantry':   ['#C9A57A', '#D99A3E', '#EFE6D5', '#7A5636'],
    'z05-laundry':  ['#B7A6D3', '#C9C3CC', '#A9C8E0', '#6F7487'],
    'z06-living':   ['#D48A8A', '#8C8F55', '#E8964A', '#6E4A5E'],
    'z07-study':    ['#A07850', '#4E7A55', '#E7D7B5', '#8A3B32'],
    'z08-sunroom':  ['#9CC97A', '#5E9A52', '#DDEBE3', '#C77B56'],
    'z09-basement': ['#4F5B6E', '#E07A3A', '#B9BDC4', '#26303D'],
    'z10-attic':    ['#9C7E6E', '#C9D6E8', '#6B5240', '#4D6E70'],
    'chimney':      ['#A0523D', '#E0873A', '#B9C6D6', '#3A2F2A'],
}
NEAR_BLACK = (22, 17, 15)
TERRAIN = ['cereal', 'plaster', 'crumbling-floor', 'soil', 'sand', 'syrup']


def hex2rgb(h):
    n = int(h[1:], 16)
    return ((n >> 16) & 255, (n >> 8) & 255, n & 255)


def lum(c):
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def ramp_for(pal):
    """the two darkest palette colours, deepened: (shadow, light) for the luminance ramp."""
    cs = sorted((hex2rgb(h) for h in pal), key=lum)
    d0, d1 = cs[0], cs[1]
    # How much to deepen depends on how light the darkest colour is (Bathroom/Kitchen are pale).
    k0 = 0.30 + 0.45 * min(1, lum(d0) / 200)
    k1 = 0.25 + 0.40 * min(1, lum(d1) / 220)
    shadow = mix(d0, NEAR_BLACK, k0)
    light = mix(mix(d1, d0, 0.45), NEAR_BLACK, k1)
    if lum(light) < lum(shadow) + 18:  # keep some texture range
        light = mix(light, (255, 255, 255), 0.12)
    return shadow, light


def seamless(img):
    """blend an image with itself rolled by half, weighted by distance from the centre."""
    w, h = img.size
    rolled = ImageChops.offset(img, w // 2, h // 2)
    # weight: 1 in the middle, 0 at the edges (a soft diamond-ish falloff)
    m = Image.new('L', (w, h))
    px = m.load()
    for y in range(h):
        dy = abs(y - h / 2) / (h / 2)
        for x in range(w):
            dx = abs(x - w / 2) / (w / 2)
            d = max(dx, dy)
            v = 1 - max(0.0, (d - 0.35) / 0.65)
            px[x, y] = int(255 * max(0, min(1, v)) ** 1.2)
    m = m.filter(ImageFilter.GaussianBlur(w / 40))
    return Image.composite(img, rolled, m)


def tile_wash(n, seed=1):
    """tileable soft blotches: sums of sines with whole periods over n px, so it wraps exactly."""
    import math, random
    r = random.Random(seed)
    waves = [(r.randint(1, 3), r.randint(-3, 3), r.random() * 6.28, 0.5 + r.random()) for _ in range(6)]
    m = Image.new('L', (n, n)); px = m.load()
    tot = sum(w[3] for w in waves)
    for y in range(n):
        for x in range(n):
            v = 0
            for fx, fy, ph, a in waves:
                v += a * math.sin(2 * math.pi * (fx * x + fy * y) / n + ph)
            px[x, y] = int(128 + 60 * v / tot)
    return m


def quilt_patches(gray, n, seed=1, patch=80, count=260):
    import random
    r = random.Random(seed)
    W, H = gray.size
    out = Image.new('L', (n, n), 128)
    base = gray.filter(ImageFilter.GaussianBlur(1))
    soft = Image.new('L', (patch, patch), 0)
    sp = soft.load()
    for y in range(patch):
        for x in range(patch):
            d = (((x - patch / 2) ** 2 + (y - patch / 2) ** 2) ** 0.5) / (patch / 2)
            sp[x, y] = int(255 * max(0, min(1, (1 - d) * 2.2)))
    for _ in range(count):
        sx = r.randint(int(W * 0.05), int(W * 0.95) - patch)
        sy = r.randint(int(H * 0.05), int(H * 0.9) - patch)
        pc = base.crop((sx, sy, sx + patch, sy + patch)).rotate(r.choice((0, 90, 180, 270)))
        if r.random() < 0.5: pc = ImageOps.mirror(pc)
        # normalise each patch's mean so the quilt has no blocky value jumps
        m = ImageStat.Stat(pc).mean[0]
        pc = pc.point(lambda v, m=m: max(0, min(255, int(v - m + 128))))
        x, y = r.randrange(n), r.randrange(n)
        for ox in (0, -n):
            for oy in (0, -n):
                out.paste(pc, (x + ox, y + oy), soft)
    return out


def busiest_crop(img, size):
    """the size x size crop (from a coarse grid, avoiding the outer margin) with the most detail."""
    g = img.convert('L')
    W, H = g.size
    edges = g.filter(ImageFilter.FIND_EDGES)
    best = None
    for fy in (0.12, 0.25, 0.4, 0.55):
        for fx in (0.08, 0.2, 0.32, 0.44, 0.56, 0.68):
            x, y = int((W - size) * fx / 0.76), int((H - size) * fy / 0.67)
            x = max(0, min(W - size, x)); y = max(0, min(H - size, y))
            box = (x, y, x + size, y + size)
            s = ImageStat.Stat(edges.crop(box)).mean[0] + 0.3 * ImageStat.Stat(g.crop(box)).stddev[0]
            if best is None or s > best[0]:
                best = (s, box)
    return img.crop(best[1])


def zone_texture(key):
    src = os.path.join(ASSETS, 'bg', key, 'far-a.webp')
    if not os.path.exists(src):
        print('skip (no painting):', key); return
    img = Image.open(src).convert('RGB')
    # Quilt the texture from many small soft-edged patches of the painting, rotated and pasted
    # with wrap-around (seamless by construction). Ink lines become short brush-like fragments,
    # so no recognisable object repeats across a platform.
    quilt = quilt_patches(img.convert('L'), 512, seed=sum(map(ord, key)))
    hp = ImageChops.subtract(quilt, quilt.filter(ImageFilter.GaussianBlur(8)), scale=1, offset=128)
    hp = ImageOps.autocontrast(hp, cutoff=1)
    wash = tile_wash(512, seed=sum(map(ord, key)))
    L = ImageChops.add(hp.point(lambda v: int((v - 128) * 0.3 + 128)), wash, scale=1, offset=-128)
    L = ImageOps.autocontrast(L, cutoff=1).point(lambda v: int(30 + v * 0.75))
    shadow, light = ramp_for(PALETTES[key])
    out = ImageOps.colorize(L, black=shadow, white=light)
    os.makedirs(OUT, exist_ok=True)
    dst = os.path.join(OUT, f'{key}.webp')
    out.save(dst, quality=82, method=6)
    print('zone', key, 'ramp', shadow, light, '->', os.path.relpath(dst, ROOT))


def terrain_texture(kind):
    src = os.path.join(ASSETS, 'terrain', f'{kind}.png')
    if not os.path.exists(src):
        print('skip (no swatch):', kind); return
    img = Image.open(src).convert('RGB').resize((256, 256), Image.LANCZOS)
    tile = seamless(img)
    # deepen a little so pale swatches (plaster, sand) still read against light paintings
    deep = {'plaster': 0.30, 'sand': 0.22, 'cereal': 0.10, 'crumbling-floor': 0.12, 'soil': 0.0, 'syrup': 0.08}.get(kind, 0.1)
    if deep:
        tile = Image.blend(tile, Image.new('RGB', tile.size, (70, 52, 38)), deep)
    os.makedirs(OUT, exist_ok=True)
    dst = os.path.join(OUT, f'terrain-{kind}.webp')
    tile.save(dst, quality=85, method=6)
    print('terrain', kind, '->', os.path.relpath(dst, ROOT))


if __name__ == '__main__':
    args = sys.argv[1:]
    zones = [a for a in args if a in PALETTES] or (list(PALETTES) if not args else [])
    kinds = [a for a in args if a in TERRAIN] or (TERRAIN if not args else [])
    for z in zones:
        zone_texture(z)
    for k in kinds:
        terrain_texture(k)
