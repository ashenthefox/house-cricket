// Ember, the cave gecko (zone 9, the Basement): "dazzle" (design: "The ten gecko encounters" 9,
// house.js LAIRS.ember, design/zones/z09.md). Builder C.
//
// Her den (bas-lair) is dark; all you see of her are two red eyes. She hunts by SOUND: running,
// jumping, landing, kicking and chirping make noise rings she homes in on; standing still (or
// hiding in a coal lump) makes none and she loses track and sniffs about. When her eyes are within
// 4 tiles, flash the Glow Bead (tap Use): she is dazzled for 4 s (harmless, eyes screwed shut), then
// wary for 1.5 s (a flash does nothing while she squints).
//   Phase 1: reach the middle of the den (col 46).
//   Phase 2: she hisses (the tell + a pitched-up growl) and lunges at the last sound. Reach the crack (col 86).
//   Phase 3: the furnace grate cycles: lit 6 s (she SEES you and stalks you), dark 6 s (she hears you).
//            Kick Mote's crack 3 times while she is dazzled. A kick while she isn't is just noise.
// Losing (no hearts) restarts the phase (base.js). Nobody is hurt: she is only ever dazzled.
import { TILE, DT, FPS } from '../../data/movement.js';
import { makeBoss } from './base.js';

const T = TILE;
const FLOOR = 9 * T;                 // the den floor (upper level)
const X0 = 7 * T, X1 = 93 * T;       // where she can go
const CRACK = { x: 93.6 * T, y: 6 * T, w: 1.6 * T, h: 3 * T };
const MIDDLE = 46 * T, CRACK_X = 86 * T;
const SPEED = [0, 2.6, 3.0, 3.4];    // tiles/s while hunting, per phase
const HOME = [0, 28, 62, 74];        // where she starts each phase (tile column)
const DAZE = 4 * FPS, WARY = 90, LIT = 6 * FPS;
const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

const eye = (b) => ({ x: b.x + b.facing * 52, y: b.y - 90 });
const lit = (b) => b.phase === 3 && Math.floor(b.t / LIT) % 2 === 0;

function hear(b, x, y, radius, loud = false) {
  b.rings.push({ x, y, f: b.game.frame, r: radius, loud });
  if (b.rings.length > 12) b.rings.shift();
  if (b.mode === 'dazed' || b.mode === 'wait' || b.mode === 'lunge') return;
  if (Math.abs(x - b.x) <= radius) b.heard = { x, f: b.game.frame, loud };
}

export default makeBoss('ember', {
  phases: 3, len: 300,
  start(b, g) {
    b.x = HOME[b.phase] * T; b.y = FLOOR; b.facing = -1;
    b.mode = b.phase === 1 ? 'wait' : 'sniff'; b.mt = 60; b.heard = null; b.rings = [];
    b.dazeT = 0; b.wary = 0; b.kicks = 0; b.lastKick = -99; b.noiseCd = 0; b.pose = 'idle';
    b.hitCool = 0;
    if (g.rescued.has(b.cricket)) { b.done = true; b.mode = 'done'; b.pose = 'sleep'; return; } // [final-2] Mote is free: no refight, she sleeps by the furnace
  },
  tick(b, g) {
    const p = g.player;
    const feetY = p.y + p.h;
    if (b.phase === 1 && b.mode === 'wait') {          // she waits until you climb up into the den
      b.pose = 'idle';
      if (feetY <= FLOOR + 2 && p.state === 'ground' && p.cx < 20 * T) { b.mode = 'sniff'; b.mt = 30; }
      return;
    }
    // ---- noise: your movement, your jumps and chirps (game events of this step) ----
    if (b.noiseCd > 0) b.noiseCd--;
    if (!p.hidden && p.state === 'ground' && Math.abs(p.vx) > 40 && b.noiseCd === 0) { hear(b, p.cx, feetY, 7 * T); b.noiseCd = 18; }
    for (const e of g.fx) {
      if (e.f !== g.frame) continue;
      if (e.type === 'chirp') hear(b, p.cx, p.cy, 40 * T, true);                       // chirping gives you away, hidden or not
      else if (!p.hidden && (e.type === 'jump' || e.type === 'flutter' || e.type === 'land' || e.type === 'kick')) hear(b, p.cx, feetY, (e.type === 'land' && e.d?.hard ? 9 : 6) * T);
      else if (e.type === 'flash' && b.mode !== 'dazed' && b.wary === 0) {
        const ey = eye(b);
        if (Math.hypot(ey.x - e.d.x, ey.y - e.d.y) <= 4.2 * T) {
          b.mode = 'dazed'; b.dazeT = DAZE; b.heard = null; b.pose = 'idle';
          g.emit('sfx', { name: 'gecko-growl', rate: 1.7, gain: 0.6, x: b.x });
          g.emit('startle', { x: ey.x, y: ey.y });
        }
      }
    }
    // in the furnace light (phase 3) she can see you, wherever you are, unless you're hidden
    if (lit(b) && !p.hidden && b.mode !== 'dazed' && b.mode !== 'lunge' && b.mode !== 'tell') b.heard = { x: p.cx, f: g.frame, seen: true };

    // ---- Mote's crack (phase 3) ----
    const kb = p.kickBox();
    if (b.phase === 3 && kb && ov(kb, CRACK) && g.frame - b.lastKick > 12) {
      b.lastKick = g.frame;
      if (b.mode === 'dazed') {
        b.kicks++;
        g.emit('crumble', { x: CRACK.x + 10, y: CRACK.y + 2 * T });
        if (b.kicks >= 3) {
          b.mode = 'done'; b.pose = 'sleep';
          b.rescue();
          g.emit('dialog', { key: 'geckos.ember.post' });
          return;
        }
      } else hear(b, CRACK.x, CRACK.y + 2 * T, 40 * T, true);
    }

    // ---- her moves ----
    if (b.hitCool > 0) b.hitCool--;
    if (b.wary > 0) b.wary--;
    const v = SPEED[b.phase] * T * DT;
    const go = (tx, sp) => { const d = tx - b.x; if (Math.abs(d) > 2) b.facing = Math.sign(d); b.x += Math.sign(d) * Math.min(Math.abs(d), sp); b.x = Math.max(X0, Math.min(X1, b.x)); return Math.abs(tx - b.x) < 3; };
    switch (b.mode) {
      case 'dazed':
        b.pose = 'idle';
        if (--b.dazeT <= 0) { b.mode = 'sniff'; b.mt = 30; b.wary = WARY; }
        break;
      case 'sniff':                                   // lost track: nose about, then drift home
        b.pose = 'idle';
        if (b.heard) { b.mode = 'hunt'; break; }
        if (--b.mt <= 0) { if (go(HOME[b.phase] * T, v * 0.4)) b.mt = 60; else b.pose = 'walk'; }
        break;
      case 'hunt': {
        b.pose = 'walk';
        if (!b.heard) { b.mode = 'sniff'; b.mt = 90; break; }
        const near = Math.abs(b.heard.x - b.x) < 6 * T;
        if (b.phase >= 2 && near && b.hitCool === 0) { // the hiss, then a lunge at the sound
          b.mode = 'tell'; b.aim = Math.max(X0, Math.min(X1, b.heard.x)); b.mt = b.tell(eye(b).x, eye(b).y - 20);
          g.emit('sfx', { name: 'gecko-growl', rate: 1.4, gain: 0.8, x: b.x });
          break;
        }
        if (go(b.heard.x, v)) { b.heard = null; b.mode = 'sniff'; b.mt = 90; }
        break;
      }
      case 'tell':
        b.pose = 'idle'; b.facing = Math.sign(b.aim - b.x) || b.facing;
        if (--b.mt <= 0) { b.mode = 'lunge'; b.pose = 'strike'; }
        break;
      case 'lunge':
        b.pose = 'strike';
        if (go(b.aim, 10 * T * DT)) { b.mode = 'sniff'; b.mt = 70; b.heard = null; b.hitCool = 40; }
        break;
      case 'back':
        b.pose = 'walk';
        if (go(b.backTo, v * 1.5) || --b.mt <= 0) { b.mode = 'sniff'; b.mt = 60; }
        break;
      default: break;
    }
    // ---- caught (never while she's dazzled) ----
    const body = { x: b.x - 80, y: b.y - 70, w: 160, h: 70 };
    b.box = body;
    if (b.mode !== 'dazed' && p.invuln === 0 && !p.hidden && ov(body, { x: p.x + 4, y: p.y + 4, w: p.w - 8, h: p.h - 8 })) {
      b.hit(1, b.x);
      if (p.health <= 0) { b.lose(); return; }   // out of hearts: restart this phase (never game.die)
      b.mode = 'back'; b.mt = 60; b.backTo = Math.max(X0, Math.min(X1, b.x - Math.sign(p.cx - b.x || 1) * 4 * T)); b.heard = null; b.hitCool = 60;
    }
    // ---- phase goals ----
    if (b.phase === 1 && p.state === 'ground' && feetY <= FLOOR + 2 && p.cx >= MIDDLE) b.nextPhase();
    else if (b.phase === 2 && p.state === 'ground' && feetY <= FLOOR + 2 && p.cx >= CRACK_X) b.nextPhase();
  },
  after(b) { b.pose = 'sleep'; },

  // ---- drawing (render only) ----
  draw(b, c, r) {
    // Mote, peeking out of the crack until she's free
    if (!b.done) r.drawCricketAt(c, 'mote', 94.4 * T, FLOOR, -1, { look: Math.floor(r.t / 90) % 3 === 0 ? 'peek' : 'idle', t: r.t, scale: 0.75 });
    return false; // and the rig (dark until the furnace is lit)
  },
  drawDark(b, c, r, g) {
    if (b.phase !== 3 || b.done) { r.drawDark(c, g); return; }
    // the furnace grate cycles: fade between lit and dark over half a second
    const k = b.t % LIT, on = lit(b), f = Math.min(1, k / 30);
    const light = on ? f : 1 - f;
    const p = g.player, cam = g.camera;
    const sx = (p.cx - cam.x) * cam.zoom, sy = (p.cy - cam.y) * cam.zoom;
    const rad = (240 + 500 * light) * cam.zoom;
    const grad = c.createRadialGradient(sx, sy, rad * 0.25, sx, sy, rad);
    grad.addColorStop(0, 'rgba(8,10,18,0)'); grad.addColorStop(1, `rgba(8,10,18,${0.95 - 0.5 * light})`);
    c.fillStyle = grad; c.fillRect(0, 0, 1280, 720);
    const gx = (88 * T - cam.x) * cam.zoom, gy = (4 * T - cam.y) * cam.zoom;
    const og = c.createRadialGradient(gx, gy, 10, gx, gy, 900 * cam.zoom);
    og.addColorStop(0, `rgba(255,150,60,${0.45 * light})`); og.addColorStop(1, 'rgba(255,120,40,0)');
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = og; c.fillRect(0, 0, 1280, 720); c.restore();
  },
  drawOver(b, c, r, g) {
    const cam = g.camera, z = cam.zoom, t = r.t;
    const S = (x, y) => ({ x: (x - cam.x) * z, y: (y - cam.y) * z });
    c.save();
    // noise rings: the sounds she hears
    for (const n of b.rings || []) {
      const age = g.frame - n.f; if (age > 45) continue;
      const s = S(n.x, n.y), k = age / 45;
      c.strokeStyle = n.loud ? `rgba(255,170,120,${0.7 * (1 - k)})` : `rgba(244,235,221,${0.5 * (1 - k)})`;
      c.lineWidth = 2; c.beginPath(); c.ellipse(s.x, s.y - 8, (14 + k * 70) * z, (8 + k * 34) * z, 0, Math.PI, 0); c.stroke();
    }
    // her eyes: two red embers in the dark
    let ep = eye(b);
    if (b.rig && b.rig.meta && !b.done) { const s = b.rig.scaleFor(b.len); if (s) ep = b.rig.point('eye', b.x, b.y, s, b.facing); }
    const e = S(ep.x, ep.y);
    if (b.done) { // asleep: a soft contented blink
      c.fillStyle = 'rgba(224,122,58,0.35)'; c.beginPath(); c.ellipse(e.x, e.y, 6 * z, 1.5 * z, 0, 0, 7); c.fill();
    } else if (b.mode === 'dazed') {
      c.strokeStyle = '#E8603A'; c.lineWidth = 2.5;
      for (const dx of [-7, 7]) { c.beginPath(); c.moveTo(e.x + dx * z - 5, e.y - 3); c.lineTo(e.x + dx * z + 5, e.y + 3); c.moveTo(e.x + dx * z + 5, e.y - 3); c.lineTo(e.x + dx * z - 5, e.y + 3); c.stroke(); }
      c.fillStyle = '#F2C46D';
      for (let i = 0; i < 3; i++) { const a = t / 9 + i * 2.1; c.beginPath(); c.arc(e.x + Math.cos(a) * 26 * z, e.y - 26 * z + Math.sin(a) * 8 * z, 3.5 * z, 0, 7); c.fill(); }
    } else {
      const squint = b.wary > 0 ? 0.35 : 1, blink = t % 220 < 6 ? 0.15 : 1, h = 6 * squint * blink;
      const hot = b.mode === 'tell' || b.mode === 'lunge';
      for (const dx of [-7, 7]) {
        const gl = c.createRadialGradient(e.x + dx * z, e.y, 1, e.x + dx * z, e.y, 22 * z);
        gl.addColorStop(0, hot ? 'rgba(255,90,40,0.7)' : 'rgba(230,60,40,0.45)'); gl.addColorStop(1, 'rgba(230,60,40,0)');
        c.fillStyle = gl; c.beginPath(); c.arc(e.x + dx * z, e.y, 22 * z, 0, 7); c.fill();
        c.fillStyle = hot ? '#FFB070' : '#F2563A'; c.beginPath(); c.ellipse(e.x + dx * z, e.y, 5 * z, h * z, 0, 0, 7); c.fill();
        c.fillStyle = '#2A0E08'; c.beginPath(); c.ellipse(e.x + dx * z + b.facing * 1.5, e.y, 1.3 * z, h * 0.8 * z, 0, 0, 7); c.fill();
      }
    }
    // Mote's crack glints (where to kick) in phase 3
    if (b.phase === 3 && !b.done) {
      const s = S(CRACK.x + 0.6 * T, CRACK.y + 1.8 * T);
      c.fillStyle = `rgba(244,235,221,${0.45 + 0.35 * Math.sin(t / 7)})`;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(s.x - i * 9 * z, s.y + (i - 1) * 16 * z, (i < (b.kicks || 0) ? 2 : 4) * z, 0, 7); c.fill(); }
    }
    c.restore();
  },
});
