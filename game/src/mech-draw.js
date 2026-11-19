// Render-only drawing for the engine mechanics (src/mechanics.js) and enemy extras (projectiles,
// silk, the vacuum's hum). Installed by main.js as renderer.drawMech; render.js calls it after
// the enemies (one commented hook). Reads the sim, never writes it. Uses props when present
// (cushion, steam-vent, steam-puff, mister-nozzle, dryer-vent, piano-key, thermostat-lock,
// pull-chain, damper, smoke-alarm-wall), else ink-and-wash shapes.
import * as S from './sprites.js';
import { TILE } from '../data/movement.js';
import { paintObject } from './objpaint.js'; // [polish] painted push boxes and music boxes
import { seeded } from './world.js';

const INK = '#5A4632';
function prop(c, name, x, feetY, h, o = {}) {
  const img = S.get(`props/${name}.png`);
  if (!img) return false;
  const w = (h * img.width) / img.height;
  c.save(); c.globalAlpha = o.alpha ?? 1; c.translate(x, feetY);
  if (o.flipY) c.scale(1, -1);
  c.drawImage(img, -w / 2, -h, w, h); c.restore();
  return true;
}

export function drawMech(c, game, t) {
  const m = game.mech;
  if (m) {
    for (const L of m.lifts) drawLift(c, L, t);
    for (const s of m.springs) {
      const sq = Math.max(0, 1 - (m.t - s.t) / 12) * 0.25;
      const x = (s.x + s.w / 2) * TILE, y = (s.y + 1) * TILE;
      if (!prop(c, 'cushion', x, y + 4, TILE * (1.2 - sq))) {
        c.fillStyle = 'rgba(212,138,138,0.9)'; c.strokeStyle = INK; c.lineWidth = 2.5;
        c.beginPath(); c.roundRect(s.x * TILE + 2, s.y * TILE + sq * 20, s.w * TILE - 4, TILE - sq * 20, 14); c.fill(); c.stroke();
      }
    }
    for (const g of m.gates) if (!g.open) {
      const { x, y, w, h } = g.px;
      if (g.card === 'damper') { prop(c, 'damper', x + w / 2, y + h, Math.min(h, TILE * 1.2)); continue; }
      c.strokeStyle = 'rgba(90,70,50,0.75)'; c.lineWidth = 2;
      for (let i = 1; i < w / 12; i++) { c.beginPath(); c.moveTo(x + i * 12, y + 4); c.lineTo(x + i * 12 - 6, y + h - 4); c.stroke(); }
      c.fillStyle = g.opens.rescued || g.opens.rescues ? '#C8564B' : g.opens.side ? '#7C98C4' : '#F2C46D';
      c.beginPath(); c.arc(x + w / 2, y + h / 2, 7, 0, 7); c.fill(); c.strokeStyle = INK; c.stroke();
    }
    for (const s of m.switches) drawSwitch(c, s, t);
    for (const cb of m.crumbles) if (cb.state === 'shake') {
      c.strokeStyle = INK; c.lineWidth = 1.5;
      for (let tx = cb.x; tx < cb.x + cb.w; tx++) { const ox = Math.sin(t * 2.3 + tx) * 2; c.beginPath(); c.moveTo(tx * TILE + 8 + ox, cb.y * TILE + 4); c.lineTo(tx * TILE + 20 + ox, cb.y * TILE + 22); c.lineTo(tx * TILE + 30 + ox, cb.y * TILE + 10); c.stroke(); }
    }
    for (const pn of m.pianos) for (let i = 0; i < pn.n; i++) {
      const x = (pn.x + i * pn.kw) * TILE, y = pn.y * TILE + pn.sink[i] * 0.6, w = pn.kw * TILE;
      if (!prop(c, 'piano-key', x + w / 2, y + TILE, TILE)) {
        c.fillStyle = '#F4EBDD'; c.strokeStyle = INK; c.lineWidth = 2; c.fillRect(x + 1, y, w - 2, TILE); c.strokeRect(x + 1, y, w - 2, TILE);
      }
      if (pn.melody.includes(i) && !pn.solved) { c.fillStyle = 'rgba(200,86,75,0.5)'; c.beginPath(); c.arc(x + w / 2, y + 10, 4, 0, 7); c.fill(); }
    }
    for (const th of m.thermostats) {
      if (!prop(c, 'thermostat-lock', th.x + TILE / 2, th.y + TILE, TILE * 1.1)) {
        c.fillStyle = th.open ? '#9CC97A' : '#E9F1EE'; c.strokeStyle = INK; c.lineWidth = 2.5;
        c.beginPath(); c.arc(th.x + 20, th.y + 20, 16, 0, 7); c.fill(); c.stroke();
      }
      c.fillStyle = INK; c.font = 'bold 13px sans-serif'; c.textAlign = 'center'; c.fillText(`${th.target}°`, th.x + 20, th.y - 6); c.textAlign = 'left';
    }
    for (const d of m.decoys) if (!d.far && d.room === game.room.id) {
      const age = game.frame - (d.lastF ?? -999);
      if (age < 24) { c.strokeStyle = `rgba(200,86,75,${1 - age / 24})`; c.lineWidth = 2; for (let k = 1; k <= 2; k++) { c.beginPath(); c.arc(d.x, d.y, 10 + age * 1.2 * k, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(d.x, d.y, 10 + age * 1.2 * k, Math.PI - 0.9, Math.PI + 0.9); c.stroke(); } }
    }
    for (const b of m.pushes || []) drawPush(c, b);   // [fixer] Duo's shove blocks
    for (const du of m.duets || []) drawDuet(c, du, t); // [fixer] Chip's duet music boxes
    for (const L of m.lights) { const gr = c.createRadialGradient(L.x, L.y, 2, L.x, L.y, 60); gr.addColorStop(0, 'rgba(242,196,109,0.5)'); gr.addColorStop(1, 'rgba(242,196,109,0)'); c.fillStyle = gr; c.fillRect(L.x - 60, L.y - 60, 120, 120); }
  }
  for (const e of game.enemies || []) {
    if (e.state === 'gone') continue;
    if (e.type === 'cellarspider') { c.strokeStyle = 'rgba(233,241,238,0.7)'; c.lineWidth = 1; c.beginPath(); c.moveTo(e.x + e.w / 2, e.topY - TILE * 0.6); c.lineTo(e.x + e.w / 2, e.y + 4); c.stroke(); }
    if (e.T.loud && e.state === 'walk') { const r = e.T.loud * TILE; c.strokeStyle = `rgba(200,86,75,${0.25 + 0.15 * Math.sin(t / 5)})`; c.lineWidth = 2; c.setLineDash([6, 8]); c.strokeRect(e.x - r, e.y + e.h / 2 - r * 0.6, e.w + 2 * r, r * 1.2); c.setLineDash([]); }
    if (e.mode === 'tell' || e.mode === 'wind' || e.mode === 'watch') { c.fillStyle = '#C8564B'; c.font = 'bold 20px sans-serif'; c.fillText('!', e.x + e.w / 2 - 4, e.y - 8); }
  }
  for (const q of game.projectiles || []) {
    if (q.kind === 'grain') {
      c.save(); c.translate(q.x + q.w / 2, q.y + q.h / 2); c.rotate(q.rot || 0);
      c.fillStyle = '#F4EBDD'; c.strokeStyle = INK; c.lineWidth = 1.5; c.beginPath(); c.ellipse(0, 0, q.w / 2, q.h / 2, 0, 0, 7); c.fill(); c.stroke(); c.restore();
    } else if (q.kind === 'stink') {
      const a = Math.min(1, (q.max - q.life) / 18, q.life / 30) * 0.45;
      for (let i = 0; i < 5; i++) { c.fillStyle = `rgba(140,143,85,${a})`; c.beginPath(); c.arc(q.x + q.w * (0.2 + i * 0.15), q.y + q.h * (0.55 + Math.sin(t / 15 + i) * 0.15), q.h * 0.32, 0, 7); c.fill(); }
    }
  }
}

// [art] the drawing rules, shared with room-art.js through mechArt()
const liftBase = (kind) => ({ steam: 'steam-vent', updraft: 'dryer-vent', mister: 'mister-nozzle' }[kind] || 'steam-vent');
const chainSwitch = (def, by) => def?.draw !== false && (by === 'up' || by === 'touch');
const pushProp = (def, kind) => def.prop || (kind === 'dice' ? 'dice' : kind === 'spool' ? 'spool' : null);
// the props a mechanics entity (room data) draws, as props/ names
export function mechArt(e) {
  switch (e.type) {
    case 'spring': return ['cushion'];
    case 'gate': return e.card === 'damper' ? ['damper'] : [];
    case 'piano': return ['piano-key'];
    case 'thermostat': return ['thermostat-lock'];
    case 'lift': return [liftBase(e.kind || 'steam'), 'steam-puff'];
    case 'switch': return chainSwitch(e, e.by || 'kick') ? ['pull-chain'] : [];
    case 'push': { const p = pushProp(e, e.kind || 'box'); return p ? [p] : []; }
    default: return [];
  }
}

function drawLift(c, L, t) {
  const base = liftBase(L.kind);
  const bx = L.x + L.w / 2, by = L.y + L.h;
  if (L.kind === 'mister') prop(c, base, bx, L.y + TILE * 0.2, TILE * 0.9, { flipY: false });
  else prop(c, base, bx, by, TILE * 0.8);
  if (!L.active && !L.warn) return;
  const n = Math.max(3, Math.round(L.h / 50)), a = L.active ? 0.38 : 0.15;
  for (let i = 0; i < n; i++) {
    const ph = ((t * (L.v / 300) + i * (L.h / n)) % L.h);
    const y = L.kind === 'mister' ? L.y + ph : by - ph, x = bx + Math.sin((t + i * 37) / 14) * L.w * 0.2;
    if (!prop(c, 'steam-puff', x, y + 20, 40 + (ph / L.h) * 30, { alpha: a * (1 - ph / L.h) + 0.05 })) {
      c.fillStyle = L.kind === 'updraft' ? `rgba(244,235,221,${a * 0.6})` : `rgba(233,241,238,${a})`;
      c.beginPath(); c.arc(x, y, 12 + (ph / L.h) * 16, 0, 7); c.fill();
    }
  }
}
function drawSwitch(c, s, t) {
  if (s.def?.draw === false) return; // [builder C] invisible switches (Peeper's chirp-off)
  const x = s.x + s.w / 2;
  if (chainSwitch(s.def, s.by)) {
    if (prop(c, 'pull-chain', x, s.y + s.h + (s.on ? 8 : 0), TILE * 1.6)) return;
  }
  c.strokeStyle = INK; c.lineWidth = 4; c.lineCap = 'round';
  const ang = s.on ? 0.7 : -0.7;
  c.beginPath(); c.moveTo(x, s.y + s.h - 6); c.lineTo(x + Math.sin(ang) * 26, s.y + s.h - 6 - Math.cos(ang) * 26); c.stroke();
  c.fillStyle = s.on ? '#9CC97A' : '#C8564B'; c.beginPath(); c.arc(x + Math.sin(ang) * 26, s.y + s.h - 6 - Math.cos(ang) * 26, 6, 0, 7); c.fill();
  c.fillStyle = INK; c.fillRect(x - 10, s.y + s.h - 8, 20, 8);
  void t;
}

// [fixer] a push block (dice / spool / box): drawn where it is sliding (b.anim px behind its tiles)
function drawPush(c, b) {
  const T = TILE, x = b.x * T - b.adir * b.anim, y = b.y * T - b.fall, w = b.w * T, h = b.h * T;
  const name = pushProp(b.def, b.kind);
  if (name) {
    const img = S.get(`props/${name}.png`);
    if (img) { c.drawImage(img, x - 2, y - 2, w + 4, h + 4); return; }
  }
  if (b.kind === 'box') { // [polish] a painted detergent box (cardboard painter, cached) with its label band
    c.drawImage(painted('cardboard', w, h, { color: '#7C98C4', tape: false, marks: false, label: true, flaps: true }), x - 6, y - 6);
    c.save(); c.fillStyle = 'rgba(244,235,221,0.85)'; c.beginPath(); c.ellipse(x + w * 0.5, y + h * 0.55, w * 0.22, h * 0.16, 0, 0, 7); c.fill();
    c.fillStyle = '#C8564B'; c.font = `bold ${Math.round(h * 0.16)}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('SUDS', x + w * 0.5, y + h * 0.56); c.restore();
    return;
  }
  c.save();
  c.fillStyle = b.kind === 'dice' ? '#F4EBDD' : b.kind === 'spool' ? '#C8A26A' : '#C9B79A';
  c.strokeStyle = INK; c.lineWidth = 3;
  c.beginPath(); c.roundRect(x + 2, y + 2, w - 4, h - 4, b.kind === 'dice' ? 8 : 4); c.fill(); c.stroke();
  if (b.kind === 'box') { // a detergent box: a label band and a scoop
    c.fillStyle = '#7C98C4'; c.fillRect(x + 6, y + h * 0.35, w - 12, h * 0.3);
    c.strokeStyle = 'rgba(90,70,50,0.6)'; c.lineWidth = 2; c.strokeRect(x + 6, y + h * 0.35, w - 12, h * 0.3);
  } else if (b.kind === 'dice') {
    c.fillStyle = INK; for (const [px, py] of [[0.3, 0.3], [0.7, 0.7], [0.5, 0.5]]) { c.beginPath(); c.arc(x + w * px, y + h * py, 4, 0, 7); c.fill(); }
  }
  c.restore();
}
// [fixer] a duet music box: two keyholes, each lit while its voice hums
function drawDuet(c, du, t) {
  const x = du.x + du.w / 2, y = du.y + du.h;
  c.save();
  if (du.glow > 0 || du.on) {
    const a = du.on ? 0.35 + 0.15 * Math.sin(t / 10) : du.glow / 80;
    const gr = c.createRadialGradient(x, y - 24, 4, x, y - 24, 64);
    gr.addColorStop(0, `rgba(242,196,109,${a})`); gr.addColorStop(1, 'rgba(242,196,109,0)');
    c.fillStyle = gr; c.fillRect(x - 64, y - 88, 128, 128);
  }
  // [polish] a painted wooden music box (wood painter, cached), brass corners, a hinged lid
  c.drawImage(painted('wood', 56, 32, { color: '#8A3B32', grain: 'h' }), x - 28 - 6, y - 32 - 6);
  c.fillStyle = '#D9A441'; c.strokeStyle = INK; c.lineWidth = 1.5;
  for (const dx of [-28, 22]) { c.fillRect(x + dx, y - 32, 6, 6); c.fillRect(x + dx, y - 6, 6, 6); }
  c.save(); c.translate(x - 30, y - 34); if (du.on) c.rotate(-0.35);
  c.fillStyle = '#9E4A3C'; c.lineWidth = 3; c.beginPath(); c.roundRect(0, -8, 60, 10, 3); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,230,180,0.35)'; c.fillRect(3, -6, 54, 2.5);
  c.fillStyle = '#D9A441'; c.beginPath(); c.arc(30, -3, 3, 0, 7); c.fill();
  c.restore();
  const lit = du.last && !du.on ? du.last.who : null;
  [['pip', -11], ['chip', 11]].forEach(([who, dx]) => {
    c.fillStyle = du.on || lit === who ? '#F2C46D' : '#2A201A';
    c.beginPath(); c.arc(x + dx, y - 18, 4, 0, 7); c.fill(); c.fillRect(x + dx - 1.5, y - 18, 3, 8);
  });
  if (du.on) { c.strokeStyle = 'rgba(242,196,109,0.8)'; c.lineWidth = 2; for (let i = 0; i < 2; i++) { const ph = ((t / 40) + i / 2) % 1; c.globalAlpha = 1 - ph; c.beginPath(); c.arc(x + 14 + ph * 20, y - 50 - ph * 30, 4, 0, 7); c.stroke(); } }
  c.restore();
}

// [polish] small painted objects (src/objpaint.js) cached per kind and size: drawn with a 6 px margin
const paintCache = new Map();
function painted(obj, w, h, opts) {
  const key = `${obj}:${w}x${h}:${JSON.stringify(opts)}`;
  if (paintCache.has(key)) return paintCache.get(key);
  const cv = document.createElement('canvas'); cv.width = w + 12; cv.height = h + 12;
  const g = cv.getContext('2d'); g.translate(6, 6);
  const box = new Path2D(); box.roundRect(0, 0, w, h, 4);
  const top = new Path2D(); top.moveTo(4, 2); top.lineTo(w - 4, 2);
  paintObject(g, { obj, x: 0, y: 0, w: w / TILE, h: h / TILE, ...opts }, { fill: box, ink: box, tops: top, edges: [] }, { L: 0, T: 0, W: w, H: h },
    { rnd: seeded(key), grain: null, tex: null, col: { dark: [52, 40, 34] }, ox: 0, oy: 0, inRegion: () => false });
  paintCache.set(key, cv);
  return cv;
}
