#!/usr/bin/env python3
"""Colour-match sprite animation frames to their reference picture, so they don't flicker (Pillow + numpy).

Usage:
  python3 tools/match-frames.py              match every frame below to its reference (idempotent)
  python3 tools/match-frames.py --check      report and fail (exit 1) if any group's frames spread too far
  python3 tools/match-frames.py --report     print the table, never fail
  python3 tools/match-frames.py pip soot     only these crickets / npcs / enemies

What is matched (reference -> frames):
  crickets  sprites/crickets/<id>/base.png  -> anim/*/NN.png and poses/*.png
  npcs      sprites/npcs/<id>.png           -> <id>-talk.png (the talk flap alternates the two ~7.5/s)
  enemies   sprites/enemies/<id>/0.png      -> 1.png (0 and 1 are the walk loop)
Not matched: an enemy's 2.png (flipped / stunned: a different view, belly up, drawn once, not
looped), the vacuum's 1.png (its glowing ring is the art), gecko rigs (body/tail/legs are pieces
of one picture; strike/sleep are one-off poses), portraits.

Method: per-channel histogram matching on opaque pixels (alpha >= 250). For each of R, G, B the
frame's quantiles (0.5 %..99.5 %) are mapped onto the reference's, giving a monotone tone curve
that is smoothed (no kinks -> no banding) and has its slope held to 0.6..1.6 (no posterising,
no crushed line art); a few passes are composed and the result rounded once. The curve is applied
to every pixel with any alpha; alpha is untouched. The generated frames differ from their base by
a tone and white-balance shift (a lighter, greyer, bluer frame: darks darker and lights lighter
at once), not just an offset, so a full curve fits better than levels or mean/std (measured on
the talk frames, which line up pixel for pixel with their base: median error 1.8 levels for
histogram matching, 1.8 mean/std, 2.9 two-point levels, 7.7 untouched). Per channel also puts
back the hue the player sees in base.
Two-tone pictures (a clear gap between a dark and a light group, e.g. Rin's black body and pale
wings) are matched with each group weighted to the reference's proportions, so a frame that
shows less wing is not "corrected" by greying the body. See split().

Idempotent: a channel whose matching curve would move its pixels by <= TOL (0.75) levels on
average is left alone; a frame with all three channels matched is not rewritten at all.

Check (--check): mean luminance (Rec. 601, opaque pixels; two-tone pictures with their groups
weighted to the reference's proportions) may spread by at most MAX_SPREAD within each animation
loop (a talk/walk frame and its reference count as a loop), and each frame and pose may differ
from the reference by at most MAX_SPREAD. Poses are separate looks, so only the second applies.
"""
import glob, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPR = os.path.join(ROOT, 'game/assets/sprites')

# Luminance points (0..255). Before matching, spreads ran to 16.6 (Pip's idle: 132 -> 148.5 every
# other frame) and 18-22 (centipede walk, Rin's poses); the smallest that read as a flicker when
# played were ~4-5 (Chip's idle 5.8, Dot's talk 5.4). After matching, the largest left anywhere
# is 0.5. 2 is four times that (room for a new frame's honest content differences) and well under
# the smallest visible step.
MAX_SPREAD = 2.0
OPAQUE = 250
QS = np.concatenate([[0.5], np.arange(2.5, 98, 2.5), [99.5]])
SLOPE = (0.6, 1.6)
GAP = 0.08          # see split()
SKIP_ENEMY_FRAMES = {('vacuum', '1.png')}


def load(p):
    return np.asarray(Image.open(p).convert('RGBA')).astype(np.float64)


LUMA = np.array([0.299, 0.587, 0.114])  # Rec. 601 luma weights (the issue's numbers use these)


def opaque(a):
    return a[..., :3][a[..., 3] >= OPAQUE]


def lum(a):
    rgb = opaque(a)
    return float((rgb @ LUMA).mean()) if len(rgb) else float('nan')


def otsu(L):
    h = np.bincount(np.clip(L, 0, 255).astype(int), minlength=256).astype(float)
    p = h / h.sum()
    w = np.cumsum(p)
    mu = np.cumsum(p * np.arange(256))
    with np.errstate(divide='ignore', invalid='ignore'):
        var = (mu[-1] * w - mu) ** 2 / (w * (1 - w))
    return int(np.nanargmax(var))


def split(rgb):
    """-> (is_light mask, light fraction, gap): the picture's two tone groups split at the Otsu
    threshold of its luminance; gap is True when few pixels (<= GAP) lie within 15 levels of the
    threshold, i.e. it really is two separate tones (Rin's black body and pale wings)."""
    L = rgb @ LUMA
    t = otsu(L)
    light = L > t
    return light, light.mean(), (np.abs(L - t) < 15).mean() <= GAP


def two_tone(rgb):
    """The reference's light fraction if it is a two-tone picture, else None."""
    _, f, gap = split(rgb)
    return f if gap else None


def weights(rgb, ref_frac):
    """Per-pixel weights that give a two-tone frame the reference's dark/light proportions. Rin's
    run shows less wing than her base: that is the drawing, not its tone, and plain histogram
    matching would 'correct' it by greying the body. Pictures without a clear gap between tones
    (every other sprite) get weight 1: there the Otsu split falls inside a busy tone range and
    moves with the shift being corrected, so reweighting would chase noise."""
    if ref_frac is None:
        return np.ones(len(rgb))
    light, f, _ = split(rgb)
    if f <= 0 or f >= 1:
        return np.ones(len(rgb))
    return np.where(light, ref_frac / f, (1 - ref_frac) / (1 - f))


def balanced_lum(a, ref_frac):
    """Mean luminance with the frame's dark/light groups weighted to the reference's proportions."""
    rgb = opaque(a)
    w = weights(rgb, ref_frac)
    return float(((rgb @ LUMA) * w).sum() / w.sum())


def wquant(x, w, qs):
    o = np.argsort(x)
    cw = np.cumsum(w[o])
    return np.interp(qs / 100 * cw[-1], cw - w[o] / 2, x[o])


def curve(src, w, ref):
    """256-entry tone curve mapping src channel values (weighted by w) onto ref's distribution."""
    sq, rq = wquant(src, w, QS), np.percentile(ref, QS)
    sq, rq = np.maximum.accumulate(sq), np.maximum.accumulate(rq)
    # anchor the ends with slope 1 beyond the extreme quantiles
    xs = np.concatenate([[sq[0] - 255], sq, [sq[-1] + 255]])
    ys = np.concatenate([[rq[0] - 255], rq, [rq[-1] + 255]])
    keep = np.concatenate([[True], np.diff(xs) > 1e-6])
    xs, ys = xs[keep], ys[keep]
    lut = np.interp(np.arange(256), xs, ys)
    k = np.ones(15) / 15  # smooth (+-7 levels) so the curve has no corners
    lut = np.convolve(np.pad(lut, 7, mode='edge'), k, mode='valid')
    d = np.clip(np.diff(lut), *SLOPE)  # limit contrast change: no gaps (banding), no flattening
    lut = np.concatenate([[lut[0]], lut[0] + np.cumsum(d)])
    # the clamp can drift the level: put the (weighted) mean back on the reference's
    lut += ref.mean() - (np.interp(src, np.arange(256), lut) * w).sum() / w.sum()
    return lut


TOL = 0.75  # levels: mean change a matching curve would make to a channel, below which a frame counts as matched
PASSES = 4  # the smoothed, slope-limited curve lands a little short; a few passes (composed, rounded once) close it


def match(path, ref_rgb, ref_frac):
    a = load(path)
    rgb = opaque(a)
    w = weights(rgb, ref_frac)
    levels = np.arange(256, dtype=np.float64)
    luts = []
    for c in range(3):
        total, cur = levels.copy(), rgb[:, c]
        for i in range(PASSES):
            lut = curve(cur, w, ref_rgb[:, c])
            step = np.interp(cur, levels, lut)
            if i == 0 and (np.abs(step - cur) * w).sum() / w.sum() <= TOL:
                break  # this channel is already matched
            total, cur = np.interp(total, levels, lut), step
        luts.append(total)
    if all(np.array_equal(t, levels) for t in luts):
        return False  # idempotent: a matched frame is left byte-for-byte alone
    out = a.copy()
    vis = a[..., 3] > 0
    for c in range(3):
        ch = a[..., c]
        out[..., c] = np.where(vis, np.interp(ch, levels, luts[c]), ch)
    out[..., :3] = np.clip(np.round(out[..., :3]), 0, 255)
    out[..., 3] = a[..., 3]
    Image.fromarray(out.astype(np.uint8), 'RGBA').save(path, optimize=True)
    return True


def groups(only):
    """-> [(name, ref, {set: [frames]})]"""
    out = []
    for d in sorted(glob.glob(os.path.join(SPR, 'crickets/*/'))):
        cid = os.path.basename(d.rstrip('/'))
        if only and cid not in only:
            continue
        sets = {os.path.basename(a): sorted(glob.glob(os.path.join(a, '*.png'))) for a in sorted(glob.glob(d + 'anim/*'))}
        sets['poses'] = sorted(glob.glob(d + 'poses/*.png'))
        out.append((f'cricket {cid}', d + 'base.png', sets))
    for t in sorted(glob.glob(os.path.join(SPR, 'npcs/*-talk.png'))):
        nid = os.path.basename(t)[:-9]
        if only and nid not in only:
            continue
        out.append((f'npc {nid}', t.replace('-talk.png', '.png'), {'talk': [t]}))
    for d in sorted(glob.glob(os.path.join(SPR, 'enemies/*/'))):
        eid = os.path.basename(d.rstrip('/'))
        if only and eid not in only:
            continue
        fr = [d + '1.png'] if os.path.exists(d + '1.png') and (eid, '1.png') not in SKIP_ENEMY_FRAMES else []
        if fr:
            out.append((f'enemy {eid}', d + '0.png', {'walk': fr}))
    return out


def main():
    args = sys.argv[1:]
    check, report = '--check' in args, '--report' in args
    only = {a for a in args if not a.startswith('--')}
    bad = changed = 0
    for name, ref, sets in groups(only):
        a = load(ref)
        ref_rgb = opaque(a)
        ref_frac = two_tone(ref_rgb)
        if not (check or report):
            for fs in sets.values():
                for f in fs:
                    if match(f, ref_rgb, ref_frac):
                        changed += 1
                        print('matched', os.path.relpath(f, ROOT))
            continue
        base = lum(a)
        for s, fs in sets.items():
            if not fs:
                continue
            ims = [load(f) for f in fs]
            ls = [lum(x) for x in ims]
            bs = [balanced_lum(x, ref_frac) for x in ims]
            loop = bs if len(bs) > 1 else bs + [base]  # a lone talk/walk frame flaps with its reference
            within = max(loop) - min(loop) if s != 'poses' else 0.0  # poses are separate looks, not a loop
            vs_base = max(abs(x - base) for x in bs)
            raw = (max(ls) - min(ls)) if len(ls) > 1 else abs(ls[0] - base)
            flag = within > MAX_SPREAD or vs_base > MAX_SPREAD
            bad += flag
            if report or flag:
                print(f"{'FAIL' if flag else 'ok  '} {name:18s} {s:6s} base {base:6.1f}  frames "
                      + ' '.join(f'{x:6.1f}' for x in ls)
                      + f'  | raw spread {raw:4.1f} | balanced: within {within:4.1f}  vs base {vs_base:4.1f}')
    if check or report:
        print(f'{bad} group(s) over {MAX_SPREAD} luminance spread' if bad else f'all frame groups within {MAX_SPREAD}')
        sys.exit(1 if bad and check else 0)
    print(f'{changed} frame(s) matched')


if __name__ == '__main__':
    main()
