// Object painters (render-only): big solid masses that stand for household things (a dryer, a
// dresser, a mattress, boxes, pots, pipes, bricks, books, glass) painted in watercolour in the
// object's own colours, with light from the upper left, wet-edge pooling, painted details and an
// ink outline. Called by render.js paintScreen for `paint` regions with an `obj` (room data or
// data/look.js), inside the per-screen platform cache, so they cost nothing per frame.
//
//   { obj: 'appliance', x, y, w, h, color?: '#hex', tone?: 0..1, ...options }   (tile units)
//   appliance  enamel box: panel (control strip + dials: true | n), door: 'front' | 'oven' | 'porthole',
//              handle, vents, gloss. Holes inside the box (a drum) get a chrome rim.
//   porcelain  same as appliance, white glaze (toilet, sink, tub)
//   wood       grain: 'h' | 'v' (default by shape), drawers: n, doors: n, planks: px, knobs
//   fabric     pattern: 'plain' | 'quilt' | 'stripe' | 'plaid' | 'dots' | 'fluff' | 'knit', stitch, folds
//   cardboard  tape, flaps, marks (printed arrows), label
//   terracotta rim (px, default 26), bands
//   metal      axis: 'v' | 'h' (pipe / cylinder shading), bands: px, rivets
//   brick      course (px), brick (px)
//   paper      books: 'row' | 'stack' | false (plain paper with lines)
//   glass      a few soft reflections, lighter
//   stone      the zone stone tinted to color (plaster walls, concrete)
import { TILE } from '../data/movement.js';

const T = TILE;
export const OBJ_DEFAULTS = {
  appliance: '#C9C5D6', porcelain: '#E2E6E8', wood: '#8E5F3A', fabric: '#C08A8A', cardboard: '#BE925E',
  terracotta: '#BF6A47', metal: '#7F8B98', brick: '#9C4F3B', paper: '#D6C49C', glass: '#B9D3DC', stone: '#8A8090',
};
// how far toward the zone's darkest colour the local colour goes (keeps solids the darkest shapes)
const TONE = { appliance: 0.2, porcelain: 0.2, wood: 0.15, fabric: 0.16, cardboard: 0.16, terracotta: 0.12, metal: 0.18, brick: 0.12, paper: 0.18, glass: 0.06, stone: 0.3 };
// edge wobble per kind: [base, amp, lumpy]
export const OBJ_EDGE = { appliance: [0.3, 1.6, false], porcelain: [0.3, 2, false], wood: [0.3, 2.2, false], fabric: [2, 4.5, true], cardboard: [0.3, 2.4, false], terracotta: [0.4, 2.2, false], metal: [0.2, 1.4, false], brick: [0.3, 2.6, false], paper: [0.3, 2, false], glass: [0.2, 1.2, false], stone: [0.4, 3.2, false] };

const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const INKD = [34, 24, 18], PAPER = [244, 235, 221];

// colours for one region
export function objColors(r, col) {
  const local = hex(r.color || OBJ_DEFAULTS[r.obj] || '#8A8090');
  const base = mix(local, col.dark, r.tone ?? TONE[r.obj] ?? 0.2);
  return { local, base, light: mix(base, PAPER, 0.32), lighter: mix(base, PAPER, 0.55), shade: mix(base, INKD, 0.28), deep: mix(base, INKD, 0.5), ink: mix(base, INKD, 0.72) };
}

// paint one object region. s = { fill, ink, tops, edges } (Path2D shapes in screen-local px),
// b = { L, T, W, H } the region's box in screen-local px, o = { rnd, grain, tex, col, inRegion(tx,ty) }
export function paintObject(g, r, s, b, o) {
  const c = objColors(r, o.col), k = r.obj;
  const { L, W, H } = b, Tp = b.T;
  // its inside (holes: [[x, y, w, h], ...] in tiles, relative to the room): a dryer's drum, an
  // oven, a cubby. Painted behind (the holes are open tiles, so this is the backdrop the cricket
  // walks in front of), with the object's colour in shadow.
  for (const [hx, hy, hw, hh] of r.holes || []) {
    const x = L + (hx - r.x) * T, y = Tp + (hy - r.y) * T, w = hw * T, h = hh * T;
    const ig = g.createLinearGradient(x, y, x, y + h);
    ig.addColorStop(0, rgb(c.deep, 0.92)); ig.addColorStop(0.5, rgb(c.shade, 0.75)); ig.addColorStop(1, rgb(c.deep, 0.85));
    g.fillStyle = ig; g.fillRect(x - 4, y - 4, w + 8, h + 8);
    if (r.inside === 'drum') { // perforated steel drum with a lifter fin
      g.fillStyle = 'rgba(20,18,24,0.35)';
      for (let yy = y + 12; yy < y + h; yy += 18) for (let xx = x + 12 + ((yy / 18) % 2) * 9; xx < x + w; xx += 18) { g.beginPath(); g.arc(xx, yy, 2.4, 0, 7); g.fill(); }
      const sh = g.createRadialGradient(x + w * 0.35, y + h * 0.3, 10, x + w * 0.35, y + h * 0.3, w * 0.6);
      sh.addColorStop(0, 'rgba(255,255,255,0.22)'); sh.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.fillRect(x, y, w, h);
    }
    const ao = g.createLinearGradient(x, y, x, y + 26); ao.addColorStop(0, 'rgba(15,10,10,0.45)'); ao.addColorStop(1, 'rgba(15,10,10,0)'); g.fillStyle = ao; g.fillRect(x, y, w, 26);
  }
  g.save();
  g.clip(s.fill);
  // base wash with light from the upper left, a form shadow on the far side, a bevel on top
  g.fillStyle = rgb(c.base); g.fillRect(L - 20, Tp - 20, W + 40, H + 40);
  const gr = g.createLinearGradient(L, Tp, L + Math.min(W, H) * 0.6, Tp + H);
  gr.addColorStop(0, rgb(c.lighter, k === 'glass' ? 0.5 : 0.7)); gr.addColorStop(0.4, rgb(c.light, 0.15)); gr.addColorStop(1, rgb(c.shade, 0.75));
  g.fillStyle = gr; g.fillRect(L - 20, Tp - 20, W + 40, H + 40);
  if (k !== 'fabric' && k !== 'glass') {
    const fs = g.createLinearGradient(L + W * 0.72, 0, L + W, 0);
    fs.addColorStop(0, rgb(c.deep, 0)); fs.addColorStop(1, rgb(c.deep, 0.42));
    g.fillStyle = fs; g.fillRect(L + W * 0.72, Tp - 20, W * 0.28 + 20, H + 40);
  }
  // watercolour: blots with darker dried rims (cauliflower edges), lighter lifted patches
  const smooth = k === 'appliance' || k === 'porcelain' || k === 'metal' || k === 'glass';
  const nb = smooth ? Math.min(6, 2 + Math.round((W * H) / (T * T * 40))) : Math.min(14, 2 + Math.round((W * H) / (T * T * 7)));
  for (let i = 0; i < nb; i++) {
    const x = L + o.rnd() * W, y = Tp + o.rnd() * H, rr = T * (0.6 + o.rnd() * 2.4), dark = o.rnd() < 0.6;
    blot(g, x, y, rr, o.rnd() * 9);
    g.fillStyle = rgb(dark ? c.shade : c.lighter, dark ? 0.12 : 0.18); g.fill();
    if (dark) { g.strokeStyle = rgb(c.shade, 0.16); g.lineWidth = 1.2; g.stroke(); }
  }
  // a whisper of the zone texture for pigment variation
  if (o.tex && k !== 'glass') {
    const pat = g.createPattern(o.tex, 'repeat');
    if (pat.setTransform) pat.setTransform(new DOMMatrix().translate(-o.ox % (o.tex.width * 0.75), -o.oy % (o.tex.height * 0.75)).scale(0.75));
    g.globalCompositeOperation = 'soft-light'; g.globalAlpha = smooth ? 0.35 : 0.9; g.fillStyle = pat; g.fillRect(L - 20, Tp - 20, W + 40, H + 40);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  }
  // the object's own details (inside the shape)
  g.lineJoin = 'round'; g.lineCap = 'round';
  (DETAIL[k] || DETAIL.stone)(g, r, c, b, o, s);
  // wet-edge pooling: pigment collects at the boundary (wide and soft for fabric: puffy)
  if (k === 'fabric') { g.strokeStyle = rgb(c.shade, 0.32); g.lineWidth = 34; g.stroke(s.ink); g.strokeStyle = rgb(c.deep, 0.18); g.lineWidth = 12; g.stroke(s.ink); }
  else { g.strokeStyle = rgb(c.deep, k === 'glass' ? 0.1 : 0.2); g.lineWidth = 14; g.stroke(s.ink); g.strokeStyle = rgb(c.deep, k === 'glass' ? 0.12 : 0.26); g.lineWidth = 5; g.stroke(s.ink); }
  // paper grain
  if (o.grain) { g.globalCompositeOperation = 'multiply'; g.fillStyle = g.createPattern(o.grain, 'repeat'); g.globalAlpha = 0.45; g.fillRect(L - 20, Tp - 20, W + 40, H + 40); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; }
  g.restore();
  // ink outline, a light rim on open tops
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.strokeStyle = rgb(c.ink, k === 'glass' ? 0.6 : 0.92); g.lineWidth = k === 'fabric' ? 2.4 : 2.8; g.stroke(s.ink);
  g.strokeStyle = rgb(c.ink, 0.22); g.lineWidth = 5.5; g.stroke(s.ink);
  g.strokeStyle = rgb(c.lighter, k === 'glass' ? 0.7 : 0.6); g.lineWidth = 2.2; g.stroke(s.tops);
  // holes in appliances (a drum, a porthole): a chrome rim
  if ((k === 'appliance' || k === 'porcelain') && s.edges) {
    const rim = new Path2D(); let any = false;
    for (const e of s.edges) {
      if (!e.open || !o.inRegion(e.gx + e.nx, e.gy + e.ny, true)) continue;
      rim.moveTo(e.pts[0][0], e.pts[0][1]); for (const p of e.pts) rim.lineTo(p[0], p[1]); any = true;
    }
    if (any) { g.strokeStyle = 'rgba(70,74,84,0.9)'; g.lineWidth = 9; g.stroke(rim); g.strokeStyle = 'rgba(214,220,228,0.95)'; g.lineWidth = 5; g.stroke(rim); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.5; g.stroke(rim); }
  }
}

// ---- details ----
function blot(g, x, y, r, seed) {
  g.beginPath();
  for (let i = 0; i <= 18; i++) { const a = (i / 18) * Math.PI * 2, rr = r * (1 + 0.14 * Math.sin(a * 3 + seed) + 0.06 * Math.sin(a * 7 + seed * 2)); i ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8); }
  g.closePath();
}
function line(g, x1, y1, x2, y2) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
function wavy(g, x1, y, x2, amp, f, ph) { g.beginPath(); g.moveTo(x1, y); for (let x = x1; x <= x2; x += 6) g.lineTo(x, y + Math.sin(x * f + ph) * amp); g.stroke(); }
function knob(g, x, y, rr, c) {
  g.fillStyle = rgb(c.deep, 0.9); g.beginPath(); g.arc(x + 1, y + 1.5, rr, 0, 7); g.fill();
  g.fillStyle = rgb(c.light); g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill();
  g.strokeStyle = rgb(c.ink, 0.8); g.lineWidth = 1.4; g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(x - rr * 0.35, y - rr * 0.35, rr * 0.3, 0, 7); g.fill();
}
function brass(g, x, y, rr) {
  g.fillStyle = 'rgba(40,26,14,0.55)'; g.beginPath(); g.ellipse(x + 2, y + 3, rr * 1.1, rr * 0.9, 0, 0, 7); g.fill();
  const gr = g.createRadialGradient(x - rr * 0.4, y - rr * 0.4, 1, x, y, rr);
  gr.addColorStop(0, '#FFF1B8'); gr.addColorStop(0.5, '#D9A441'); gr.addColorStop(1, '#7A5320');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill();
  g.strokeStyle = 'rgba(60,38,16,0.85)'; g.lineWidth = 1.5; g.stroke();
}
function gloss(g, L, Tp, W, H, a = 0.32) {
  const x = L + W * 0.12, w = Math.max(8, Math.min(40, W * 0.07));
  const gr = g.createLinearGradient(x, 0, x + w, 0);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(x, Tp + 6, w, H - 12);
  g.fillStyle = `rgba(255,255,255,${a * 0.8})`; g.fillRect(x + w * 1.6, Tp + 10, Math.max(3, w * 0.18), H * 0.5);
}

const DETAIL = {
  appliance(g, r, c, b, o) {
    const { L, W, H } = b, Tp = b.T;
    gloss(g, L, Tp, W, H, r.obj === 'porcelain' ? 0.38 : 0.3);
    g.strokeStyle = rgb(c.deep, 0.55); g.lineWidth = 2;
    const panel = r.panel !== false && H > 3 * T && W > 3 * T;
    const ph = Math.min(T * 1.4, H * 0.18);
    if (panel) {
      g.fillStyle = rgb(c.shade, 0.22); g.fillRect(L, Tp, W, ph);
      g.strokeStyle = rgb(c.deep, 0.7); g.lineWidth = 2.4;
      line(g, L + 6, Tp + ph, L + W - 6, Tp + ph);
      g.strokeStyle = rgb(c.lighter, 0.5); g.lineWidth = 1.5; line(g, L + 6, Tp + ph + 3, L + W - 6, Tp + ph + 3);
      const n = typeof r.dials === 'number' ? r.dials : W > 8 * T ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const x = L + W - 26 - i * 34, y = Tp + ph / 2 + 2;
        knob(g, x, y, Math.min(10, ph * 0.3), c);
        g.strokeStyle = rgb(c.ink, 0.8); g.lineWidth = 1.6; line(g, x, y, x + 5 * Math.cos(i * 1.7 - 1), y + 5 * Math.sin(i * 1.7 - 1));
      }
      // a little display
      g.fillStyle = 'rgba(60,70,62,0.75)'; g.beginPath(); g.roundRect(L + 18, Tp + ph * 0.3, Math.min(70, W * 0.2), ph * 0.42, 3); g.fill();
      g.fillStyle = 'rgba(170,230,190,0.5)'; g.fillRect(L + 22, Tp + ph * 0.38, Math.min(30, W * 0.08), 3);
    }
    const top = panel ? Tp + ph : Tp;
    if (r.ring) { // a round door (porthole) around a hole: a chrome torus with a soft inner shadow
      const [rx, ry, rr] = r.ring, cx = L + (rx - r.x) * T, cy = Tp + (ry - r.y) * T, R = rr * T;
      g.strokeStyle = rgb(c.deep, 0.35); g.lineWidth = 34; g.beginPath(); g.arc(cx + 4, cy + 6, R, 0, 7); g.stroke();
      g.strokeStyle = 'rgba(120,124,136,0.95)'; g.lineWidth = 26; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
      g.strokeStyle = 'rgba(214,220,230,0.95)'; g.lineWidth = 16; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, R - 2, Math.PI * 1.05, Math.PI * 1.6); g.stroke();
      g.strokeStyle = rgb(c.ink, 0.7); g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R + 13, 0, 7); g.stroke(); g.beginPath(); g.arc(cx, cy, R - 13, 0, 7); g.stroke();
      // the latch
      g.fillStyle = 'rgba(150,154,166,0.95)'; g.beginPath(); g.roundRect(cx + R + 6, cy - 22, 16, 44, 6); g.fill(); g.strokeStyle = rgb(c.ink, 0.7); g.lineWidth = 1.6; g.stroke();
    }
    if (r.door === 'front' || r.door === 'oven') {
      const dx = L + W * 0.08, dy = top + (H - (top - Tp)) * 0.1, dw = W * 0.84, dh = (H - (top - Tp)) * (r.door === 'oven' ? 0.72 : 0.82);
      g.strokeStyle = rgb(c.deep, 0.6); g.lineWidth = 2.5; g.beginPath(); g.roundRect(dx, dy, dw, dh, 8); g.stroke();
      if (r.door === 'oven') { // window
        g.fillStyle = 'rgba(40,30,28,0.55)'; g.beginPath(); g.roundRect(dx + dw * 0.15, dy + dh * 0.3, dw * 0.7, dh * 0.5, 6); g.fill();
        g.fillStyle = 'rgba(255,170,90,0.25)'; g.beginPath(); g.roundRect(dx + dw * 0.18, dy + dh * 0.55, dw * 0.64, dh * 0.22, 6); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3; line(g, dx + dw * 0.2, dy + dh * 0.36, dx + dw * 0.3, dy + dh * 0.36);
      }
      // handle bar
      g.strokeStyle = rgb(c.deep, 0.9); g.lineWidth = 6; line(g, dx + dw * 0.2, dy + 12, dx + dw * 0.8, dy + 12);
      g.strokeStyle = 'rgba(235,238,242,0.9)'; g.lineWidth = 3; line(g, dx + dw * 0.2, dy + 11, dx + dw * 0.8, dy + 11);
    }
    if (r.handle) { // a tall fridge handle on one side
      const hx = r.handle === 'left' ? L + 18 : L + W - 18;
      g.strokeStyle = rgb(c.deep, 0.9); g.lineWidth = 7; line(g, hx, Tp + H * 0.12, hx, Tp + H * 0.42);
      g.strokeStyle = 'rgba(235,238,242,0.95)'; g.lineWidth = 3.5; line(g, hx - 1, Tp + H * 0.12, hx - 1, Tp + H * 0.42);
      if (r.freezer !== false && H > 8 * T) { g.strokeStyle = rgb(c.deep, 0.6); g.lineWidth = 2.5; line(g, L + 4, Tp + H * 0.3, L + W - 4, Tp + H * 0.3); }
    }
    if (r.vents) { g.strokeStyle = rgb(c.deep, 0.55); g.lineWidth = 2.5; for (let i = 0; i < 5; i++) line(g, L + W * 0.3, Tp + H - 14 - i * 7, L + W * 0.7, Tp + H - 14 - i * 7); }
    if (r.seams) { g.strokeStyle = rgb(c.deep, 0.45); g.lineWidth = 1.8; for (let x = L + r.seams * T; x < L + W - 10; x += r.seams * T) line(g, x, top + 4, x, Tp + H - 4); }
    // a soft cast shadow at the foot
    const sh = g.createLinearGradient(0, Tp + H - T * 0.8, 0, Tp + H);
    sh.addColorStop(0, rgb(c.deep, 0)); sh.addColorStop(1, rgb(c.deep, 0.35)); g.fillStyle = sh; g.fillRect(L, Tp + H - T * 0.8, W, T * 0.8);
  },
  porcelain(g, r, c, b, o, s) { DETAIL.appliance(g, { ...r, panel: r.panel ?? false }, c, b, o, s); },
  wood(g, r, c, b, o) {
    const { L, W, H } = b, Tp = b.T;
    const dir = r.grain || (W >= H ? 'h' : 'v');
    const plank = r.planks || (dir === 'h' ? Math.min(T * 0.9, Math.max(T * 0.5, H / Math.max(1, Math.round(H / (T * 0.8))))) : T * 1.1);
    g.lineWidth = 1.4;
    if (dir === 'h') {
      for (let y = Tp; y < Tp + H; y += plank) {
        g.strokeStyle = rgb(c.deep, 0.5); g.lineWidth = 1.8; if (y > Tp + 2) line(g, L, y, L + W, y);
        g.strokeStyle = rgb(c.lighter, 0.3); g.lineWidth = 1.2; if (y > Tp + 2) line(g, L, y + 2, L + W, y + 2);
        g.strokeStyle = rgb(c.shade, 0.45); g.lineWidth = 1.1;
        for (let i = 0; i < 2; i++) wavy(g, L - 10, y + plank * (0.3 + 0.35 * i) + o.rnd() * 3, L + W + 10, 1.8 + o.rnd() * 1.5, 0.02 + o.rnd() * 0.02, o.rnd() * 6);
        if (o.rnd() < 0.5 && W > 2 * T) { const kx = L + o.rnd() * W, ky = y + plank * 0.5; g.strokeStyle = rgb(c.deep, 0.55); g.lineWidth = 1.3; g.beginPath(); g.ellipse(kx, ky, 7, 3, 0, 0, 7); g.stroke(); g.beginPath(); g.ellipse(kx, ky, 3, 1.4, 0, 0, 7); g.stroke(); }
      }
    } else {
      for (let x = L; x < L + W; x += plank) {
        g.strokeStyle = rgb(c.deep, 0.5); g.lineWidth = 1.8; if (x > L + 2) line(g, x, Tp, x, Tp + H);
        g.strokeStyle = rgb(c.shade, 0.42); g.lineWidth = 1.1;
        for (let i = 0; i < 2; i++) { const xx = x + plank * (0.3 + 0.35 * i), f = 0.02 + o.rnd() * 0.02, ph = o.rnd() * 6; g.beginPath(); g.moveTo(xx, Tp); for (let y = Tp; y <= Tp + H; y += 6) g.lineTo(xx + Math.sin(y * f + ph) * 2, y); g.stroke(); }
      }
    }
    if (r.drawers) {
      const n = r.drawers, dh = H / n;
      for (let i = 0; i < n; i++) {
        const y = Tp + i * dh;
        const sg = g.createLinearGradient(0, y + dh - 16, 0, y + dh); sg.addColorStop(0, rgb(c.deep, 0)); sg.addColorStop(1, rgb(c.deep, 0.45)); g.fillStyle = sg; g.fillRect(L, y + dh - 16, W, 16);
        g.strokeStyle = rgb(c.ink, 0.85); g.lineWidth = 3; g.beginPath(); g.roundRect(L + 10, y + 8, W - 20, dh - 16, 5); g.stroke();
        g.strokeStyle = rgb(c.lighter, 0.5); g.lineWidth = 2; line(g, L + 13, y + 12, L + W - 13, y + 12);
        const kr = Math.min(11, Math.max(6, dh * 0.09));
        if (W > 5 * T) { brass(g, L + W * 0.3, y + dh / 2, kr); brass(g, L + W * 0.7, y + dh / 2, kr); } else brass(g, L + W / 2, y + dh / 2, kr);
      }
    }
    if (r.doors) {
      const n = r.doors, dw = W / n;
      for (let i = 0; i < n; i++) {
        const x = L + i * dw;
        g.strokeStyle = rgb(c.deep, 0.75); g.lineWidth = 2.6; g.beginPath(); g.roundRect(x + 7, Tp + 8, dw - 14, H - 16, 4); g.stroke();
        g.strokeStyle = rgb(c.deep, 0.4); g.lineWidth = 1.6; g.beginPath(); g.roundRect(x + 17, Tp + 20, dw - 34, H - 40, 3); g.stroke();
        knob(g, i % 2 ? x + 20 : x + dw - 20, Tp + H * 0.45, 5.5, c);
      }
    }
    if (r.knobs) for (const [kx, ky] of r.knobs) knob(g, L + kx * T, Tp + ky * T, 6, c);
  },
  fabric(g, r, c, b, o) {
    const { L, W, H } = b, Tp = b.T, pat = r.pattern || 'plain';
    const acc = r.accent ? hex(r.accent) : mix(c.base, PAPER, 0.4);
    if (pat === 'stripe') { g.fillStyle = rgb(acc, 0.38); for (let x = L + 8; x < L + W; x += 34) g.fillRect(x, Tp - 10, 12, H + 20); }
    if (pat === 'plaid') { g.fillStyle = rgb(acc, 0.22); for (let x = L + 6; x < L + W; x += 46) g.fillRect(x, Tp, 16, H); for (let y = Tp + 6; y < Tp + H; y += 46) g.fillRect(L, y, W, 16); g.strokeStyle = rgb(c.deep, 0.22); g.lineWidth = 1.5; for (let x = L + 32; x < L + W; x += 46) line(g, x, Tp, x, Tp + H); }
    if (pat === 'dots') { g.fillStyle = rgb(acc, 0.5); for (let y = Tp + 14; y < Tp + H; y += 26) for (let x = L + 14 + ((y / 26) % 2) * 13; x < L + W; x += 26) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); } }
    if (pat === 'quilt') { // diamond stitching with soft puffs
      const q = r.cell || 44;
      for (let y = Tp; y < Tp + H + q; y += q) for (let x = L; x < L + W + q; x += q) { const pg = g.createRadialGradient(x, y, 2, x, y, q * 0.6); pg.addColorStop(0, rgb(c.lighter, 0.28)); pg.addColorStop(1, rgb(c.base, 0)); g.fillStyle = pg; g.fillRect(x - q, y - q, q * 2, q * 2); }
      g.strokeStyle = rgb(c.deep, 0.35); g.lineWidth = 1.4; g.setLineDash([5, 4]);
      for (let d = -H; d < W + H; d += q) { line(g, L + d, Tp, L + d + H, Tp + H); line(g, L + d + H, Tp, L + d, Tp + H); }
      g.setLineDash([]);
      g.fillStyle = rgb(c.deep, 0.4); for (let y = Tp + q / 2; y < Tp + H; y += q) for (let x = L + q / 2 + ((Math.round((y - Tp) / q)) % 2 ? q / 2 : 0); x < L + W; x += q) { g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill(); }
    }
    if (pat === 'fluff') { // insulation batts: puffy bumps
      for (let i = 0; i < (W * H) / 500; i++) { const x = L + o.rnd() * W, y = Tp + o.rnd() * H, rr = 8 + o.rnd() * 16; const pg = g.createRadialGradient(x - rr * 0.3, y - rr * 0.3, 1, x, y, rr); pg.addColorStop(0, rgb(c.lighter, 0.45)); pg.addColorStop(0.7, rgb(c.base, 0.1)); pg.addColorStop(1, rgb(c.shade, 0.25)); g.fillStyle = pg; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fill(); }
      g.strokeStyle = rgb(c.deep, 0.25); g.lineWidth = 1.2; for (let i = 0; i < (W * H) / 1400; i++) { const x = L + o.rnd() * W, y = Tp + o.rnd() * H; g.beginPath(); g.arc(x, y, 5 + o.rnd() * 8, Math.PI * 0.9, Math.PI * 2.1); g.stroke(); }
    }
    if (pat === 'knit') { g.strokeStyle = rgb(c.deep, 0.3); g.lineWidth = 1.6; for (let y = Tp + 6; y < Tp + H; y += 12) for (let x = L; x < L + W; x += 12) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6, y + 6); g.lineTo(x + 12, y); g.stroke(); } }
    // soft folds
    if (r.folds !== false) {
      const nf = Math.max(1, Math.min(14, Math.round((W * H) / 26000) + 1));
      for (let i = 0; i < nf; i++) {
        const vert = H > W ? o.rnd() < 0.8 : o.rnd() < 0.3;
        g.lineWidth = 3 + o.rnd() * 4;
        const x = L + o.rnd() * W, y = Tp + o.rnd() * H, len = Math.min(200, (vert ? H : W) * (0.3 + o.rnd() * 0.35)), bend = (o.rnd() - 0.5) * 40;
        g.strokeStyle = rgb(c.shade, 0.28); g.beginPath();
        if (vert) { g.moveTo(x, y - len / 2); g.quadraticCurveTo(x + bend, y, x + bend * 0.3, y + len / 2); } else { g.moveTo(x - len / 2, y); g.quadraticCurveTo(x, y + bend, x + len / 2, y + bend * 0.3); }
        g.stroke();
        g.strokeStyle = rgb(c.lighter, 0.25); g.lineWidth = 2; g.beginPath();
        if (vert) { g.moveTo(x + 5, y - len / 2); g.quadraticCurveTo(x + bend + 5, y, x + bend * 0.3 + 5, y + len / 2); } else { g.moveTo(x - len / 2, y + 5); g.quadraticCurveTo(x, y + bend + 5, x + len / 2, y + bend * 0.3 + 5); }
        g.stroke();
      }
    }
    if (r.stitch !== false && W > T && H > T * 0.8) { g.strokeStyle = rgb(c.deep, 0.42); g.lineWidth = 1.4; g.setLineDash([6, 5]); g.beginPath(); g.roundRect(L + 9, Tp + 9, W - 18, H - 18, 12); g.stroke(); g.setLineDash([]); }
  },
  cardboard(g, r, c, b, o) {
    const { L, W, H } = b, Tp = b.T;
    // corrugated edge hatching on the right side, flaps at the top, a tape strip
    g.strokeStyle = rgb(c.shade, 0.35); g.lineWidth = 1;
    for (let y = Tp + 4; y < Tp + H; y += 5) line(g, L + W - 7, y, L + W - 2, y + 2);
    if (r.flaps !== false && H > T) { g.strokeStyle = rgb(c.deep, 0.6); g.lineWidth = 2; line(g, L + 4, Tp + Math.min(T * 0.7, H * 0.3), L + W - 4, Tp + Math.min(T * 0.7, H * 0.3)); }
    if (r.tape !== false && W > T) { g.fillStyle = 'rgba(214,190,140,0.75)'; const tw = Math.min(26, W * 0.18); g.fillRect(L + W / 2 - tw / 2, Tp, tw, Math.min(H, T * 1.2)); g.strokeStyle = 'rgba(150,120,70,0.5)'; g.lineWidth = 1; g.strokeRect(L + W / 2 - tw / 2, Tp, tw, Math.min(H, T * 1.2)); }
    g.strokeStyle = rgb(c.deep, 0.35); g.lineWidth = 1.5; line(g, L + W * 0.5, Tp + T * 1.2, L + W * 0.5 + 2, Tp + H - 6);
    if (r.marks !== false && W > 2 * T && H > 2 * T) { // "this side up" arrows
      g.strokeStyle = 'rgba(70,48,30,0.6)'; g.lineWidth = 2.2;
      const ax = L + W * 0.2, ay = Tp + H * 0.55;
      for (let i = 0; i < 2; i++) { const x = ax + i * 14; line(g, x, ay + 12, x, ay - 8); line(g, x - 5, ay - 3, x, ay - 8); line(g, x + 5, ay - 3, x, ay - 8); }
      g.strokeRect(ax - 8, ay + 18, 34, 10);
    }
    if (r.label) { g.fillStyle = 'rgba(240,232,214,0.75)'; g.fillRect(L + W * 0.62, Tp + H * 0.5, Math.min(60, W * 0.25), Math.min(36, H * 0.25)); g.strokeStyle = 'rgba(70,48,30,0.5)'; g.lineWidth = 1.2; for (let i = 1; i < 4; i++) line(g, L + W * 0.62 + 5, Tp + H * 0.5 + i * 8, L + W * 0.62 + Math.min(60, W * 0.25) - 6, Tp + H * 0.5 + i * 8); }
  },
  terracotta(g, r, c, b, o) {
    const { L, W, H } = b, Tp = b.T, rim = r.rim ?? Math.min(26, H * 0.3);
    g.fillStyle = rgb(c.light, 0.45); g.fillRect(L - 10, Tp - 10, W + 20, rim + 10);
    g.strokeStyle = rgb(c.deep, 0.7); g.lineWidth = 3; line(g, L - 10, Tp + rim, L + W + 10, Tp + rim);
    const sg = g.createLinearGradient(0, Tp + rim, 0, Tp + rim + 12); sg.addColorStop(0, rgb(c.deep, 0.35)); sg.addColorStop(1, rgb(c.deep, 0)); g.fillStyle = sg; g.fillRect(L, Tp + rim, W, 12);
    // pot body: rounded shading across
    const cg = g.createLinearGradient(L, 0, L + W, 0); cg.addColorStop(0, rgb(c.shade, 0.3)); cg.addColorStop(0.3, rgb(c.lighter, 0.18)); cg.addColorStop(1, rgb(c.deep, 0.35));
    g.fillStyle = cg; g.fillRect(L, Tp + rim, W, H - rim);
    // white mineral blooms
    g.fillStyle = 'rgba(245,235,220,0.25)'; for (let i = 0; i < W / 30; i++) { g.beginPath(); g.ellipse(L + o.rnd() * W, Tp + rim + 10 + o.rnd() * (H - rim) * 0.6, 6 + o.rnd() * 12, 3 + o.rnd() * 5, 0, 0, 7); g.fill(); }
    if (r.soil) { g.fillStyle = 'rgba(70,46,30,0.9)'; g.fillRect(L + 4, Tp - 2, W - 8, 6); }
  },
  metal(g, r, c, b, o) {
    const { L, W, H } = b, Tp = b.T, ax = r.axis || (H > W ? 'v' : 'h');
    const cg = ax === 'v' ? g.createLinearGradient(L, 0, L + W, 0) : g.createLinearGradient(0, Tp, 0, Tp + H);
    cg.addColorStop(0, rgb(c.deep, 0.35)); cg.addColorStop(0.25, 'rgba(255,255,255,0.32)'); cg.addColorStop(0.42, rgb(c.light, 0.1)); cg.addColorStop(0.85, rgb(c.deep, 0.3)); cg.addColorStop(1, rgb(c.deep, 0.5));
    g.fillStyle = cg; g.fillRect(L - 10, Tp - 10, W + 20, H + 20);
    const band = r.bands ?? T * 3;
    if (band) {
      for (let p = band; p < (ax === 'v' ? H : W) - 8; p += band) {
        g.fillStyle = rgb(c.deep, 0.35);
        if (ax === 'v') { g.fillRect(L - 4, Tp + p - 5, W + 8, 10); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(L - 4, Tp + p - 5, W + 8, 2.5); if (r.rivets !== false) for (let x = L + 8; x < L + W - 4; x += 16) { g.fillStyle = rgb(c.deep, 0.7); g.beginPath(); g.arc(x, Tp + p, 2.2, 0, 7); g.fill(); } }
        else { g.fillRect(L + p - 5, Tp - 4, 10, H + 8); g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(L + p - 5, Tp - 4, 2.5, H + 8); if (r.rivets !== false) for (let y = Tp + 8; y < Tp + H - 4; y += 16) { g.fillStyle = rgb(c.deep, 0.7); g.beginPath(); g.arc(L + p, y, 2.2, 0, 7); g.fill(); } }
      }
    }
    // scuffs
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1; for (let i = 0; i < (W + H) / 40; i++) { const x = L + o.rnd() * W, y = Tp + o.rnd() * H; line(g, x, y, x + 8 + o.rnd() * 10, y + (o.rnd() - 0.5) * 3); }
  },
  brick(g, r, c, b, o) {
    const { L, W, H } = b, Tp = b.T, ch = r.course || 20, bw = r.brick || 46;
    for (let y = Tp, row = 0; y < Tp + H; y += ch, row++) {
      for (let x = L - (row % 2 ? bw / 2 : 0); x < L + W; x += bw) {
        const t = o.rnd();
        g.fillStyle = t < 0.33 ? rgb(c.shade, 0.25) : t < 0.66 ? rgb(c.light, 0.18) : rgb(c.base, 0);
        g.fillRect(x + 2, y + 2, bw - 4, ch - 4);
      }
      g.strokeStyle = 'rgba(225,210,190,0.55)'; g.lineWidth = 2.2; line(g, L, y, L + W, y);
      for (let x = L - (row % 2 ? bw / 2 : 0); x < L + W; x += bw) line(g, x, y, x, y + ch);
    }
    g.strokeStyle = rgb(c.deep, 0.25); g.lineWidth = 1; for (let i = 0; i < W * H / 3000; i++) { const x = L + o.rnd() * W, y = Tp + o.rnd() * H; line(g, x, y, x + 4, y + 3); }
  },
  paper(g, r, c, b, o) {
    const { L, W, H } = b, Tp = b.T;
    const SP = (r.spines || ['#7C4A3A', '#3F5A6B', '#6E7A3F', '#A8823C', '#5A3F5E', '#8C5A4A', '#4A6A5A']).map(hex);
    if (r.books === 'row') {
      for (let x = L; x < L + W;) {
        const w = 14 + o.rnd() * 22, col = mix(SP[Math.floor(o.rnd() * SP.length)], PAPER, 0.08), top = Tp + o.rnd() * Math.min(18, H * 0.2);
        g.fillStyle = rgb(col, 0.9); g.fillRect(x, top, w - 1.5, Tp + H - top + 4);
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x + 2, top, 3, Tp + H - top);
        g.fillStyle = 'rgba(232,200,120,0.6)'; g.fillRect(x + 2, top + 14, w - 6, 3); g.fillRect(x + 2, Tp + H - 20, w - 6, 3);
        g.strokeStyle = 'rgba(30,20,14,0.5)'; g.lineWidth = 1.2; line(g, x + w - 1, top, x + w - 1, Tp + H);
        x += w;
      }
    } else if (r.books === 'stack') {
      for (let y = Tp + H; y > Tp - 20;) {
        const h = 12 + o.rnd() * 18, col = SP[Math.floor(o.rnd() * SP.length)], inset = o.rnd() * 10;
        g.fillStyle = rgb(col, 0.92); g.fillRect(L - 4 + inset, y - h, W + 8 - inset * 2, h - 1);
        g.fillStyle = 'rgba(245,238,220,0.85)'; g.fillRect(L + W - 14 - inset, y - h + 3, 10, h - 7); // page edges
        g.strokeStyle = 'rgba(160,140,110,0.6)'; g.lineWidth = 0.8; for (let k = 1; k < 3; k++) line(g, L + W - 14 - inset, y - h + 3 + k * (h - 7) / 3, L + W - 4 - inset, y - h + 3 + k * (h - 7) / 3);
        g.fillStyle = 'rgba(232,200,120,0.55)'; g.fillRect(L + 10 + inset, y - h * 0.6, 22, 2.5);
        g.strokeStyle = 'rgba(30,20,14,0.45)'; g.lineWidth = 1.2; line(g, L - 4, y - 0.5, L + W + 4, y - 0.5);
        y -= h;
      }
    } else {
      g.strokeStyle = 'rgba(120,140,170,0.35)'; g.lineWidth = 1; for (let y = Tp + 14; y < Tp + H; y += 12) line(g, L, y, L + W, y);
      g.strokeStyle = 'rgba(200,110,110,0.35)'; line(g, L + 22, Tp, L + 22, Tp + H);
    }
  },
  glass(g, r, c, b, o) {
    const { L, W, H } = b, Tp = b.T;
    g.fillStyle = 'rgba(235,245,250,0.18)'; g.fillRect(L - 10, Tp - 10, W + 20, H + 20);
    g.lineWidth = Math.max(10, Math.min(28, W * 0.12));
    const n = Math.max(1, Math.round(W / 220));
    for (let i = 0; i < n; i++) { const x = L + W * (0.18 + i / (n + 0.6)); g.strokeStyle = 'rgba(255,255,255,0.3)'; line(g, x, Tp + H, x + Math.min(H, 160) * 0.5, Tp + H - Math.min(H, 160)); g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth *= 0.4; line(g, x + 26, Tp + H, x + 26 + Math.min(H, 120) * 0.5, Tp + H - Math.min(H, 120)); g.lineWidth = Math.max(10, Math.min(28, W * 0.12)); }
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2; line(g, L + 5, Tp + 6, L + 5, Tp + H - 6);
  },
  stone(g, r, c, b, o) {
    const { L, W, H } = b, Tp = b.T;
    g.strokeStyle = rgb(c.deep, 0.3); g.lineWidth = 1.2;
    for (let i = 0; i < (W * H) / 6000; i++) { let x = L + o.rnd() * W, y = Tp + o.rnd() * H; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 3; k++) { x += (o.rnd() - 0.5) * 16; y += 4 + o.rnd() * 8; g.lineTo(x, y); } g.stroke(); }
  },
};
