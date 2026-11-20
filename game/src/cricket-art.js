// Drawing a cricket: sprite frames and poses (sprites/crickets/<id>/), squash and stretch,
// code-drawn antennae and cerci from anchors.json, the dryer sheet over a glider, a shaded
// "tucked" look when hidden, and the shape fallback when no art is there. Render-only.
//
//   drawCricket(ctx, id, x, y, facing, {
//     look: 'idle' | 'run' | 'jump' | 'kick' | 'chirp' | 'hide' | 'peek'   (anims; frame from t or o.frame)
//         | 'leap' | 'cling' | 'hang' | 'glide' | 'pound' | 'listen' | 'dig' | 'run-a' | 'run-b' | 'crouch',
//     t,                // render frame counter (anim timing, sway)
//     frame,            // force an anim frame (else from t and fps)
//     at: 'feet' | 'wall' | 'hands' | 'center',  // what (x, y) is: feet on the floor (default), the
//                       // wall contact at mid-body (cling; facing = the wall side), the hands (hang), the middle
//     rot, squash,      // radians about the anchor; squash > 0 squashes, < 0 stretches
//     vx, vy,           // px/s: antennae and cerci lag and sway with motion
//     scale, alpha, shade (0..1, darkens: hidden), sheet (draw the dryer sheet)
//   })
// Every look falls back to the nearest one that exists (jump -> leap, kick -> run-b, chirp -> idle,
// dig -> pound, peek -> hide -> idle), so crickets without Pip's extra loops still read.
import { CRICKETS } from '../data/crickets.js';
import * as S from './sprites.js';

const CW = 256, CH = 160;          // sprite canvas (bottom-centre anchor)
const PX = 64 / 256;               // canvas px -> world px at species scale 1 (shown at 64x40)
const ANIM_FPS = { idle: 5, run: 10, jump: 12, kick: 20, chirp: 10, hide: 10, peek: 6 };
const ANIMS = ['idle', 'run', 'jump', 'kick', 'chirp', 'hide', 'peek'];
const FALLBACK = { jump: 'leap', kick: 'run-b', chirp: 'idle', dig: 'pound', peek: 'hide', hide: 'idle', crouch: 'idle', 'run-a': 'run', 'run-b': 'run', run: 'run-a', leap: 'base', cling: 'base', hang: 'base', glide: 'leap', pound: 'leap', listen: 'idle', idle: 'base' };

// Antennae and cerci per species (design: Hump very long, Digby short stubs, Rin a white band,
// Katy longer than her body). style: 'back' sweeps up and back over the body (house-cricket
// type), 'up' rises and curls forward, 'stub' short and forward. len from data/crickets.js.
const ANT = {
  pip:    { style: 'back' }, chip: { style: 'back' }, stripe: { style: 'back' },
  katy:   { style: 'back', lift: 0.8 }, frost: { style: 'back', lift: 1.1 },
  hump:   { style: 'back', lift: 0.7, cerci: 1.3 }, jam: { style: 'up' }, duo: { style: 'up' },
  rin:    { style: 'up' }, digby: { style: 'stub', width: 2.2, cerci: 1.2 }, mote: { style: 'back', cerci: 0.8 },
};

// anchors.json, fit.json (two formats: {"scale": {...}} or flat {...})
function anchorsOf(id) { return S.getJSON(`sprites/crickets/${id}/anchors.json`); }
function fitOf(id, key) {
  const f = S.getJSON(`sprites/crickets/${id}/poses/fit.json`);
  const m = f ? (f.scale || f) : null;
  const k = m && typeof m[key] === 'number' ? m[key] : null;
  if (k) return k;
  const a = anchorsOf(id)?.[key]?.[0];
  return a?.fit || 1;
}

// [art] the files drawing `looks` can use (resolveLook's search, every frame), plus anchors and
// fit: what room-art.js loads before a room with this cricket shows
export function lookFiles(id, looks) {
  const base = `sprites/crickets/${id}`, out = new Set([`${base}/anchors.json`, `${base}/poses/fit.json`]);
  for (const look of looks) {
    if (look === 'glide') out.add('items/dryer-sheet.webp'); // the sheet over a glider
    let want = look || 'idle', guard = 0;
    while (want && guard++ < 6) {
      if (ANIMS.includes(want)) {
        const fr = S.frames(`${base}/anim/${want}`);
        if (fr.length) { fr.forEach((f) => out.add(f)); break; }
        if (want === 'run') ['run-a', 'run-b'].forEach((k) => S.exists(`${base}/poses/${k}.webp`) && out.add(`${base}/poses/${k}.webp`));
      }
      if (want === 'base') { out.add(`${base}/base.webp`); break; }
      const p = `${base}/poses/${want}.webp`;
      if (S.exists(p)) { out.add(p); break; }
      want = FALLBACK[want];
    }
  }
  return [...out];
}
// every look a cricket can be drawn in
export const LOOKS = [...ANIMS, 'leap', 'cling', 'hang', 'glide', 'pound', 'listen', 'dig', 'run-a', 'run-b', 'crouch', 'base'];

// -> { img, key, idx, path } or null
export function resolveLook(id, look, t = 0, frame) {
  const base = `sprites/crickets/${id}`;
  let want = look || 'idle', guard = 0;
  while (want && guard++ < 6) {
    if (ANIMS.includes(want)) {
      const fr = S.frames(`${base}/anim/${want}`);
      if (fr.length) {
        const idx = frame != null ? Math.min(fr.length - 1, Math.max(0, frame)) : Math.floor((t * (ANIM_FPS[want] || 8)) / 60) % fr.length;
        const img = S.get(fr[idx]);
        if (img) return { img, key: want, idx, path: fr[idx] };
        if (S.exists(fr[idx])) return null; // still loading: draw nothing rather than flicker shapes
      }
      if (want === 'run') { const k = Math.floor(t / 6) % 2 ? 'run-a' : 'run-b'; const p = `${base}/poses/${k}.webp`; const img = S.get(p); if (img) return { img, key: k, idx: 0, path: p }; }
    }
    if (want === 'base') { const p = `${base}/base.webp`; const img = S.get(p); return img ? { img, key: 'base', idx: 0, path: p } : null; }
    const p = `${base}/poses/${want}.webp`;
    if (S.exists(p)) { const img = S.get(p); return img ? { img, key: want, idx: 0, path: p } : null; }
    want = FALLBACK[want];
  }
  return null;
}

let shadeCanvas = null;
function shaded(img, shade) {
  if (!shadeCanvas) { shadeCanvas = document.createElement('canvas'); shadeCanvas.width = CW; shadeCanvas.height = CH; }
  const g = shadeCanvas.getContext('2d');
  g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, CW, CH);
  g.drawImage(img, 0, 0, CW, CH);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(28,20,16,${shade})`; g.fillRect(0, 0, CW, CH);
  return shadeCanvas;
}

export function drawCricket(c, id, x, y, facing = 1, o = {}) {
  const cr = CRICKETS[id] || CRICKETS.pip;
  const t = o.t || 0;
  const look = o.look || 'idle';
  const sp = resolveLook(id, look, t, o.frame);
  c.save();
  if (o.alpha != null) c.globalAlpha *= o.alpha;
  c.translate(x, y);
  if (!sp) {
    // shape fallback (no art yet)
    if (o.rot) c.rotate(o.rot);
    const sq = o.squash || 0, sc = (o.scale || 1) * cr.scale;
    c.scale(facing * sc * (1 + sq), sc * (1 - sq));
    if (o.at === 'center' || o.at === 'wall' || o.at === 'hands') c.translate(0, 12);
    drawCricketShape(c, cr, look, t);
    drawAntennaPair(c, cr, id, 21, -19, 0, t, o);
    c.restore();
    return;
  }
  const fit = sp.key === 'base' || ANIMS.includes(sp.key) ? 1 : fitOf(id, sp.key);
  const s = PX * (o.scale || 1) * cr.scale / fit;
  // the anchor point in canvas px
  let ox = CW / 2, oy = CH;
  const bb = S.bbox(sp.path);
  if (o.at === 'wall' && bb) { ox = bb.x + bb.w; oy = bb.y + bb.h / 2; }
  else if (o.at === 'hands' && bb) { ox = bb.x + bb.w / 2; oy = bb.y; }
  else if (o.at === 'center' && bb) { ox = bb.x + bb.w / 2; oy = bb.y + bb.h / 2; }
  if (o.rot) c.rotate(o.rot);
  const sq = o.squash || 0;
  c.scale(facing * s * (1 + sq), s * (1 - sq));
  c.translate(-ox, -oy);
  // anchors (canvas px)
  const A = anchorsOf(id);
  const a = (A && ((A[sp.key] && (A[sp.key][sp.idx] || A[sp.key][0])) || (A.base && A.base[0]))) || { head: [206, 69], tail: [46, 113] };
  const a0 = (A && A.base && A.base[0]) || { head: [206, 69], tail: [46, 113] };
  // body-axis rotation of this frame vs the base frame (antennae and cerci follow it)
  const ang = Math.atan2(a.head[1] - a.tail[1], a.head[0] - a.tail[0]) - Math.atan2(a0.head[1] - a0.tail[1], a0.head[0] - a0.tail[0]);
  const k = 1 / s; // world px -> canvas px (antennae are drawn in world-ish units)
  // far antenna and cerci behind the body
  c.save(); c.translate(a.tail[0], a.tail[1]); c.scale(k, k); drawCerci(c, cr, id, ang, t, o); c.restore();
  c.save(); c.translate(a.head[0], a.head[1]); c.scale(k, k); drawAntenna(c, cr, id, ang, t, o, 1, 0.75); c.restore();
  c.drawImage(o.shade ? shaded(sp.img, o.shade) : sp.img, 0, 0, CW, CH);
  c.save(); c.translate(a.head[0], a.head[1]); c.scale(k, k); drawAntenna(c, cr, id, ang, t, o, 0, 1); c.restore();
  if (o.sheet) drawSheet(c, a, t, k);
  c.restore();
}

// the Dryer-Sheet Glider held overhead (items/dryer-sheet.webp, or a code sheet)
function drawSheet(c, a, t, k) {
  const img = S.get('items/dryer-sheet.webp');
  const w = 88 * k, h = w * 0.8; // ~70 world px wide (k: world px -> canvas px)
  c.save();
  c.translate(a.head[0] - 70, a.head[1] - 22);
  c.rotate(-0.12 + Math.sin(t / 7) * 0.05);
  c.scale(1, 0.85 + Math.sin(t / 4) * 0.08);
  if (img) { c.globalAlpha *= 0.95; c.drawImage(img, -w / 2, -h * 0.75, w, h); }
  else {
    c.fillStyle = 'rgba(250,248,252,0.92)'; c.strokeStyle = 'rgba(90,70,50,0.6)'; c.lineWidth = 1.5 * k;
    c.beginPath(); c.moveTo(-w / 2, 0); c.quadraticCurveTo(0, -h * 0.6, w / 2, 0); c.lineTo(w / 2 - 6, h * 0.15); c.quadraticCurveTo(0, -h * 0.3, -w / 2 + 6, h * 0.15); c.closePath(); c.fill(); c.stroke();
  }
  c.restore();
}

// one antenna in world px, origin at the head anchor, +x = forward (the outer transform flips)
function antennaPoints(cr, id, ang, t, o, which) {
  const st = ANT[id] || { style: 'back' };
  const L = 44 * cr.antenna.len * (o.scale || 1) * (cr.scale || 1) * (which ? 0.93 : 1);
  const lift = st.lift || 1;
  let cx, cy, ex, ey;
  if (st.style === 'up') { cx = 0.12; cy = -0.72; ex = 0.5 + which * 0.12; ey = -0.82 + which * 0.12; }
  else if (st.style === 'stub') { cx = 0.35; cy = -0.35; ex = 0.8; ey = -0.55 + which * 0.15; }
  else { cx = -0.05 + which * 0.08; cy = -0.6 * lift; ex = -0.86 + which * 0.12; ey = -0.4 * lift - which * 0.08; }
  // motion: running streamlines them back and down; rising bends the tips down, falling lifts them
  const run = Math.min(1, Math.abs(o.vx || 0) / 400);
  const vyN = Math.max(-1, Math.min(1, (o.vy || 0) / 900));
  const sway = Math.sin(t / 14 + which * 1.7) * 0.05 + Math.sin(t / 5.3 + which) * 0.015 * (1 + run * 2);
  ex += -run * 0.18; ey += run * 0.16 - vyN * 0.22 + sway;
  cx += -run * 0.08; cy += run * 0.08 - vyN * 0.08;
  if (o.look === 'listen') { ey -= 0.25; cy -= 0.15; ex += 0.15; }
  if (o.look === 'hide' || o.look === 'peek') { ey += 0.12; }
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const r = (px, py) => [(px * ca - py * sa) * L, (px * sa + py * ca) * L];
  return { c: r(cx, cy), e: r(ex, ey), L };
}
function drawAntenna(c, cr, id, ang, t, o, which, alpha) {
  const st = ANT[id] || {};
  const { c: q, e } = antennaPoints(cr, id, ang, t, o, which);
  const w0 = st.width || 1.7;
  c.strokeStyle = cr.antenna.color; c.lineCap = 'round';
  c.globalAlpha *= alpha;
  // tapered: segments get thinner toward the tip
  let px = 0, py = 0;
  for (let i = 1; i <= 10; i++) {
    const u = i / 10, iu = 1 - u;
    const x = 2 * iu * u * q[0] + u * u * e[0], y = 2 * iu * u * q[1] + u * u * e[1];
    c.lineWidth = w0 * (1 - u * 0.6);
    c.beginPath(); c.moveTo(px, py); c.lineTo(x, y); c.stroke();
    if (cr.antenna.band && i === 2) { // Rin's white band near the base
      c.strokeStyle = cr.antenna.band; c.lineWidth = w0 + 1;
      c.beginPath(); c.moveTo(px, py); c.lineTo(x, y); c.stroke();
      c.strokeStyle = cr.antenna.color;
    }
    px = x; py = y;
  }
  c.globalAlpha /= alpha;
}
function drawAntennaPair(c, cr, id, hx, hy, ang, t, o) {
  c.save(); c.translate(hx, hy); drawAntenna(c, cr, id, ang, t, o, 1, 0.75); drawAntenna(c, cr, id, ang, t, o, 0, 1); c.restore();
}
function drawCerci(c, cr, id, ang, t, o) {
  const st = ANT[id] || {};
  const L = 11 * (st.cerci || 1) * (o.scale || 1) * cr.scale;
  const run = Math.min(1, Math.abs(o.vx || 0) / 400);
  const ca = Math.cos(ang), sa = Math.sin(ang);
  c.strokeStyle = cr.antenna.color; c.lineCap = 'round'; c.lineWidth = 1.3;
  for (const [dy, ph] of [[-0.35, 0], [0.12, 1.3]]) {
    const wob = Math.sin(t / 9 + ph) * 0.06 + run * 0.08;
    const x = -L, y = (dy + wob) * L;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(x * ca - y * sa, x * sa + y * ca); c.stroke();
  }
}

// ---- shape fallback (no art) ----
export function drawCricketShape(c, cr, pose, t) {
  const run = pose === 'run' ? Math.sin(t / 3) : 0;
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = cr.dark; c.lineWidth = 4.5;
  const kneeUp = pose === 'leap' || pose === 'pound' ? 6 : 0;
  c.beginPath(); c.moveTo(-4, -12); c.lineTo(-20, -24 - kneeUp + run * 2); c.lineTo(-26 + (pose === 'leap' ? -8 : 0), -1 + (pose === 'leap' ? -6 : 0)); c.stroke();
  c.lineWidth = 2;
  const lift = pose === 'listen' ? 1 : 0;
  c.beginPath(); c.moveTo(12, -9); c.lineTo(lift ? 22 : 16 + run * 3, lift ? -26 : 0); c.stroke();
  c.beginPath(); c.moveTo(4, -9); c.lineTo(lift ? 10 : 2 - run * 3, lift ? -28 : 0); c.stroke();
  c.strokeStyle = cr.antenna.color; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(-24, -13); c.lineTo(-37, -18 + Math.sin(t / 9) * 1.5); c.moveTo(-24, -11); c.lineTo(-36, -9); c.stroke();
  c.fillStyle = cr.color; c.strokeStyle = cr.dark; c.lineWidth = 2;
  c.beginPath(); c.ellipse(-6, -13, 20, 9.5, -0.05, 0, 7); c.fill(); c.stroke();
  c.fillStyle = cr.dark; c.globalAlpha *= 0.45; c.beginPath(); c.ellipse(-8, -18, 16, 4.5, -0.08, 0, 7); c.fill(); c.globalAlpha /= 0.45;
  c.fillStyle = cr.color; c.beginPath(); c.ellipse(15, -14, 9, 8.5, 0, 0, 7); c.fill(); c.stroke();
  c.fillStyle = '#111'; c.beginPath(); c.arc(18, -16, 2.2, 0, 7); c.fill();
}
