#!/usr/bin/env python3
"""Cut a gecko idle into body / tail / leg pieces for the game (Pillow only).

Usage:
  python3 tools/split-gecko.py [name ...]            split idle.png -> body.png tail.png legs-*.png meta.json
                                                    (+ .gamegen/candidates/geckos/edits/<name>-notail-canvas.png,
                                                     the tailless body on a generation canvas, for strike/sleep edits)
  python3 tools/split-gecko.py --frame <name> <strike|sleep> <generated.png>
                                                    trim a strike/sleep edit past the tail cut, align it to the body,
                                                    save <frame>.png and record its offset in meta.json

All coordinates in meta.json are pixels of idle.png (body.png has the same canvas).
  frame     "wide" (side profile, tail runs right) or "tall" (clinging upright, tail runs down)
  size      [w, h] of idle.png / body.png
  tailBox   [x0, y0, x1, y1]: where tail.png sits (its top-left is x0,y0)
  tailAxis  "x" (wide: base at the left of tail.png, tip at the right) or "y" (tall: base at top, tip at bottom)
  pivot     [x, y]: the tail base (where the strip attaches to the body)
  overlap   px of body duplicated at the start of tail.png / top of each leg, to hide the seam when bent
  legs      [{name, file, box:[x0,y0,x1,y1], pivot:[x,y]}]: near front and back lower legs, swung in code
  eye       [x, y]: centre of the near eye (glint)
  frames    {"strike": {"file", "at":[x,y]}, "sleep": {...}}: top-left of that image in idle coords
"""
import json, os, sys
from PIL import Image, ImageChops, ImageDraw, ImageStat

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GECKOS = os.path.join(ROOT, 'game/assets/sprites/geckos')
EDITS = os.path.join(ROOT, '.gamegen/candidates/geckos/edits')
OV = 12  # seam overlap in px

# Per-gecko cut data, in idle.png pixels. tail/legs are polygons; box = their bounding box.
CFG = {
    'duchess': dict(frame='wide', tail=[(1005, 110), (1520, 110), (1520, 380), (1005, 380)], eye=(205, 92),
                    legs=dict(front=dict(poly=[(390, 388), (478, 398), (478, 545), (305, 545), (305, 480), (385, 470)], pivot=(432, 392)),
                              back=dict(poly=[(860, 420), (1000, 400), (1085, 470), (1085, 540), (865, 540)], pivot=(930, 420)))),
    'chikchak': dict(frame='wide', tail=[(905, 200), (1506, 200), (1506, 340), (905, 340)], eye=(205, 95),
                     legs=dict(front=dict(poly=[(395, 370), (500, 400), (500, 600), (300, 600), (300, 520), (370, 505), (380, 380)], pivot=(445, 385)),
                               back=dict(poly=[(830, 370), (905, 345), (1000, 420), (1110, 500), (1110, 595), (900, 595), (900, 520), (860, 430)], pivot=(865, 360)))),
    'peridot': dict(frame='wide', tail=[(905, 190), (1503, 190), (1503, 300), (1000, 340), (905, 392)], eye=(215, 78),
                    legs=dict(front=dict(poly=[(410, 440), (505, 455), (505, 679), (270, 679), (270, 590), (380, 560)], pivot=(460, 450)),
                              back=dict(poly=[(800, 440), (905, 398), (1060, 470), (1215, 550), (1215, 679), (975, 679), (975, 560), (1000, 520), (840, 480)], pivot=(850, 440)))),
    'gargy': dict(frame='wide', tail=[(965, 185), (1499, 185), (1499, 400), (965, 400)], eye=(205, 160),
                  legs=dict(front=dict(poly=[(395, 430), (500, 445), (535, 520), (535, 597), (310, 597), (310, 520), (390, 500)], pivot=(450, 440)),
                            back=dict(poly=[(850, 440), (970, 410), (1085, 500), (1085, 597), (845, 597), (845, 520), (880, 500)], pivot=(910, 435)))),
    'mossy': dict(frame='wide', tail=[(975, 90), (1515, 90), (1515, 400), (975, 400)], eye=(205, 92),
                  legs=dict(front=dict(poly=[(370, 395), (470, 400), (480, 556), (300, 556), (300, 495), (350, 470)], pivot=(420, 400)),
                            back=dict(poly=[(840, 395), (960, 380), (1015, 470), (1015, 556), (800, 556), (800, 480), (850, 460)], pivot=(895, 400)))),
    'ember': dict(frame='wide', tail=[(875, 155), (1515, 155), (1515, 312), (875, 312)], eye=(180, 100),
                  legs=dict(front=dict(poly=[(455, 345), (535, 355), (575, 480), (575, 561), (365, 561), (365, 490), (450, 470)], pivot=(495, 350)),
                            back=dict(poly=[(775, 330), (885, 312), (960, 440), (1040, 475), (1040, 561), (830, 561), (830, 480), (880, 450), (790, 380)], pivot=(830, 330)))),
    'lashes': dict(frame='wide', tail=[(990, 310), (1499, 310), (1499, 480), (990, 480)], eye=(235, 150),
                   legs=dict(front=dict(poly=[(345, 545), (545, 570), (570, 700), (570, 806), (380, 806), (335, 760), (375, 715), (385, 640)], pivot=(450, 560)),
                             back=dict(poly=[(760, 550), (860, 525), (925, 640), (1015, 700), (1015, 806), (780, 806), (790, 720), (820, 690), (770, 600)], pivot=(810, 550)))),
    'kite': dict(frame='wide', tail=[(960, 65), (1520, 65), (1520, 292), (1000, 292), (965, 250)], eye=(165, 105),
                 legs=dict(front=dict(poly=[(380, 290), (450, 290), (470, 390), (530, 410), (530, 504), (265, 504), (265, 430), (330, 410), (385, 400)], pivot=(415, 295)),
                           back=dict(poly=[(880, 300), (960, 280), (1000, 390), (1115, 400), (1115, 504), (860, 504), (860, 420), (930, 395), (890, 340)], pivot=(915, 300)))),
    'bigtok': dict(frame='tall', tail=[(212, 1120), (372, 1120), (372, 1505), (212, 1505)], eye=(410, 110), legs={}),
    'nana': dict(frame='tall', tail=[(500, 1120), (781, 1120), (781, 1490), (440, 1490), (440, 1400), (500, 1330)], eye=(360, 175), legs={}),
}


def poly_mask(size, poly, dx=0, dy=0):
    m = Image.new('L', size, 0)
    ImageDraw.Draw(m).polygon([(x + dx, y + dy) for x, y in poly], fill=255)
    return m


def cut(idle, mask):
    """pixels of idle inside mask (alpha multiplied)."""
    out = idle.copy()
    out.putalpha(ImageChops.multiply(idle.getchannel('A'), mask))
    return out


def remove(img, mask):
    out = img.copy()
    out.putalpha(ImageChops.multiply(img.getchannel('A'), ImageChops.invert(mask)))
    return out


def split(name):
    c = CFG[name]
    d = os.path.join(GECKOS, name)
    idle = Image.open(os.path.join(d, 'idle.png')).convert('RGBA')
    W, H = idle.size
    wide = c['frame'] == 'wide'
    meta = {'frame': c['frame'], 'size': [W, H], 'overlap': OV}
    old = os.path.join(d, 'meta.json')
    if os.path.exists(old):
        meta['frames'] = json.load(open(old)).get('frames', {})

    # tail: polygon, plus an overlap band reaching back into the body (kept in the body too)
    tmask = poly_mask(idle.size, c['tail'])
    band = poly_mask(idle.size, c['tail'], dx=-OV) if wide else poly_mask(idle.size, c['tail'], dy=-OV)
    tfull = cut(idle, ImageChops.lighter(tmask, band))
    tb = tfull.getchannel('A').getbbox()
    tfull.crop(tb).save(os.path.join(d, 'tail.png'))
    meta['tailBox'] = list(tb)
    meta['tailAxis'] = 'x' if wide else 'y'
    # pivot: middle of the tail's opaque run on the cut line
    ta = cut(idle, tmask).getchannel('A')
    xs = [p[0] for p in c['tail']]; ys = [p[1] for p in c['tail']]
    if wide:
        x = min(xs) + 8
        col = [y for y in range(H) if ta.getpixel((x, y)) > 128]
        meta['pivot'] = [min(xs), (min(col) + max(col)) // 2 if col else (min(ys) + max(ys)) // 2]
    else:
        y = min(ys) + 8
        row = [x for x in range(W) if ta.getpixel((x, y)) > 128]
        meta['pivot'] = [(min(row) + max(row)) // 2 if row else (min(xs) + max(xs)) // 2, min(ys)]
    notail = remove(idle, tmask)

    # legs: the lower leg below where it leaves the body silhouette, swung on pivot
    body = notail
    meta['legs'] = []
    for lname, L in c['legs'].items():
        lm = poly_mask(idle.size, L['poly'])
        piece = cut(idle, ImageChops.lighter(lm, poly_mask(idle.size, L['poly'], dy=-OV)))
        lb = piece.getchannel('A').getbbox()
        fn = f'legs-{lname}.png'
        piece.crop(lb).save(os.path.join(d, fn))
        body = remove(body, lm)
        meta['legs'].append({'name': lname, 'file': fn, 'box': list(lb), 'pivot': list(L['pivot'])})
    body.save(os.path.join(d, 'body.png'))
    meta['eye'] = list(c['eye'])
    json.dump(meta, open(old, 'w'), indent=1)

    # generation canvas for strike/sleep edits: tailless body (legs on), centred
    os.makedirs(EDITS, exist_ok=True)
    cw, ch = (1536, 1024) if wide else (1024, 1536)
    canvas = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    ox, oy = (cw - W) // 2, (ch - H) // 2
    canvas.paste(notail, (ox, oy))
    canvas.save(os.path.join(EDITS, f'{name}-notail-canvas.png'))
    json.dump({'offset': [ox, oy]}, open(os.path.join(EDITS, f'{name}-notail-canvas.json'), 'w'))
    print(name, meta['frame'], 'tailBox', meta['tailBox'], 'pivot', meta['pivot'], 'legs', len(meta['legs']))


def _nearest_run(flags, target):
    """(start, end) of the opaque run (thicker than 20 px) whose middle is nearest target."""
    runs, st = [], None
    for i, f in enumerate(flags + [False]):
        if f and st is None: st = i
        if not f and st is not None:
            if i - st > 20: runs.append((st, i - 1))
            st = None
    return min(runs, key=lambda r: abs((r[0] + r[1]) / 2 - target)) if runs else None


def frame(name, fname, src):
    """Trim a strike/sleep edit past the tail cut and align it to the idle body."""
    c = CFG[name]
    d = os.path.join(GECKOS, name)
    meta = json.load(open(os.path.join(d, 'meta.json')))
    wide = c['frame'] == 'wide'
    off = json.load(open(os.path.join(EDITS, f'{name}-notail-canvas.json')))['offset']
    im = Image.open(src).convert('RGBA')
    cw, ch = (1536, 1024) if wide else (1024, 1536)
    if im.size != (cw, ch):
        im = im.resize((cw, ch), Image.LANCZOS)
    px, py = meta['pivot']
    # Edits come back re-framed (often re-scaled to fill the canvas), so search scale and shift.
    # Match alpha against the tailless idle inside a rear window (hips and back legs, which strike
    # and sleep keep in place), working at 1/4 resolution.
    W, H = meta['size']
    q = 4
    notail = Image.open(os.path.join(EDITS, f'{name}-notail-canvas.png')).getchannel('A')
    notail = notail.crop((off[0], off[1], off[0] + W, off[1] + H))  # idle coords
    if wide:
        win = (int(W * 0.5), 0, px + meta['overlap'], H)
    else:
        win = (0, int(H * 0.55), W, py + meta['overlap'])
    win = tuple(v // q for v in win)
    A = notail.resize((W // q, H // q), Image.BILINEAR).crop(win)
    abox = notail.resize((W // q, H // q)).getbbox()
    G0 = im.getchannel('A').crop(im.getchannel('A').getbbox())
    best = None
    sc = 0.6
    while sc <= 1.45:
        g = G0.resize((max(1, int(G0.width * sc / q)), max(1, int(G0.height * sc / q))), Image.BILINEAR)
        # anchor: wide -> right edges and bottoms meet; tall -> bottoms meet, centres meet
        if wide:
            ax, ay = abox[2] - g.width, abox[3] - g.height
        else:
            ax, ay = (abox[0] + abox[2]) // 2 - g.width // 2, win[3] - g.height
        for ddy in range(-20, 21, 2):
            for ddx in range(-20, 21, 2):
                ox_, oy_ = ax + ddx, ay + ddy
                B = Image.new('L', (W // q, H // q), 0); B.paste(g, (ox_, oy_))
                v = ImageStat.Stat(ImageChops.difference(A, B.crop(win))).sum[0]
                if best is None or v < best[0]:
                    best = (v, sc, ox_, oy_)
        sc += 0.03
    _, sc, ox_, oy_ = best
    if fname == 'strike' and not wide:
        # clinging geckos re-pose too much for the rear match: keep the leg span (bbox width),
        # centre on the body and stand the lowest point on the idle's lowest point
        nb_ = notail.getbbox()
        gb = im.getchannel('A').getbbox()
        sc = (nb_[2] - nb_[0]) / (gb[2] - gb[0])
        gw, gh = round((gb[2] - gb[0]) * sc), round((gb[3] - gb[1]) * sc)
        ox_, oy_ = nb_[0] / q, (nb_[3] - gh) / q
    elif fname == 'sleep':
        # lying down changes the hips, so scale by body length (nose to tail cut) instead,
        # put the cut end on the tail base and the lowest point on the idle's floor line
        nb_ = notail.getbbox()
        gb = im.getchannel('A').getbbox()
        if wide:
            sc = (px - nb_[0]) / (gb[2] - gb[0])
            gw, gh = round((gb[2] - gb[0]) * sc), round((gb[3] - gb[1]) * sc)
            ox_, oy_ = (px - gw) / q, (nb_[3] - gh) / q
        else:
            sc = (py - nb_[1]) / (gb[3] - gb[1])
            gw, gh = round((gb[2] - gb[0]) * sc), round((gb[3] - gb[1]) * sc)
            ox_, oy_ = ((nb_[0] + nb_[2]) / 2 - gw / 2) / q, (py - gh) / q
    # refine shift at full resolution scale
    full = im.crop(im.getchannel('A').getbbox())
    full = full.resize((max(1, round(full.width * sc)), max(1, round(full.height * sc))), Image.LANCZOS)
    im = full
    dx, dy = round(ox_ * q), round(oy_ * q)
    piece = im
    at = [dx, dy]
    print(name, fname, 'scale %.2f' % sc)
    # erase anything past the cut line inside the tail's band (tail stubs); feet outside the band stay
    tb = meta['tailBox']
    if wide:
        clear = (px + meta['overlap'] - at[0], 0, piece.width, tb[3] + 8 - at[1])  # feet sit below the tail band
    else:
        clear = (tb[0] - at[0], py + meta['overlap'] - at[1], tb[2] - at[0], piece.height)
    clear = (max(0, clear[0]), max(0, clear[1]), min(piece.width, clear[2]), min(piece.height, clear[3]))
    if clear[2] > clear[0] and clear[3] > clear[1]:
        piece.paste((0, 0, 0, 0), clear)
    nb = piece.getchannel('A').getbbox()
    piece = piece.crop(nb)
    at = [at[0] + nb[0], at[1] + nb[1]]
    piece.save(os.path.join(d, f'{fname}.png'))
    # where this frame's tail stub actually ends (the tail strip attaches there in this frame)
    pa = piece.getchannel('A')
    if wide:
        x = min(piece.width - 1, max(0, px - at[0] - 6))
        run = _nearest_run([pa.getpixel((x, y)) > 128 for y in range(piece.height)], py - at[1])
        fp = [px, at[1] + (run[0] + run[1]) // 2] if run else [px, py]
    else:
        y = min(piece.height - 1, max(0, py - at[1] - 6))
        run = _nearest_run([pa.getpixel((x, y)) > 128 for x in range(piece.width)], px - at[0])
        fp = [at[0] + (run[0] + run[1]) // 2, py] if run else [px, py]
    meta.setdefault('frames', {})[fname] = {'file': f'{fname}.png', 'at': at, 'pivot': fp, 'scale': round(sc, 3)}
    json.dump(meta, open(os.path.join(d, 'meta.json'), 'w'), indent=1)
    print(name, fname, 'at', at, 'size', piece.size)


if __name__ == '__main__':
    args = sys.argv[1:]
    if args and args[0] == '--frame':
        frame(args[1], args[2], args[3])
    else:
        for n in (args or list(CFG)):
            split(n)
