// Kite, the flying gecko (Sunroom; builder C). Design: "The ten gecko encounters" #8 and
// house.js LAIRS.kite. He glides round the high canopy on his skin flaps, holding the big leaf
// Digby clings to. Nobody gets hurt: you startle him with a chirp (the arena's fixed chirp,
// radius 5 tiles, stun 0) and he drops out of the air.
//   Phase 1: a slow loop (10 s). Chirp when he's within 5 tiles: startled, he drops 3 tiles and
//            lands on a chain for 2 s. Ends: startle 1.
//   Phase 2: a faster, higher loop (8 s). If you stand on his line he tells (tail wiggle) and
//            swoops at where you stood, then hangs there a moment, puffing: chirp him then
//            (chirps don't reach him during a tell or a swoop). Ends: startle 2.
//   Phase 3: a figure-eight up under the glass (7 s), reached from the high baskets the misters
//            lift you to; he still swoops. One more startle: Digby lets go and drops into the
//            soil bed. Ends: rescue.
// Entity: { type:'boss', boss:'kite', x, y, cricket:'digby', checkpoints:[[x,y] x3] }.
import { TILE, DT, FPS } from '../../data/movement.js';
import { makeBoss } from './base.js';
import * as S from '../sprites.js';
import * as Geckos from '../geckos.js';

const T = TILE;
const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const TAU = Math.PI * 2;
const LOOP = [10, 8, 7];                      // seconds per lap, by phase
const SOIL = { x0: 27, x1: 39, y: 34 };       // the soil bed Digby drops into (tiles; y = its surface row)

// path position (px) at lap fraction u (0..1), by phase
function pathAt(phase, u) {
  const a = u * TAU;
  if (phase === 1) return { x: (32 + 20 * Math.sin(a)) * T, y: (15 + 8 * Math.cos(a)) * T };
  if (phase === 2) return { x: (32 + 22 * Math.sin(a)) * T, y: (13 + 7 * Math.cos(a)) * T };
  return { x: (32 + 22 * Math.sin(a)) * T, y: (10 + 5 * Math.sin(2 * a)) * T };   // the figure-eight
}

export default makeBoss('kite', { postLines: true, // [playtest] base.rescue() emits geckos.<name>.post
 
  phases: 3, len: 230,
  start(b, g) {
    b.u = b.phase === 1 ? 0.5 : (b.u ?? 0.5);   // lap position (phase 1 starts over the soil bed)
    b.mode = b.phase === 1 ? 'intro' : 'return';
    b.mt = b.phase === 1 ? 45 : 0;
    b.cool = 90; b.landY = 0; b.digby = null; b.posted = false;
    if (b.phase === 1) { const p0 = pathAt(1, b.u); b.x = p0.x; b.y = p0.y; }
    b.vx = 0; b.vy = 0; b.bank = 0; b.facing = -1;
    if (g.rescued.has(b.cricket)) { b.done = true; b.x = 56 * T; b.y = 15 * T; b.mode = 'nap'; b.pose = 'sleep'; return; } // [final-2] Digby is free: no refight, he dozes on the high basket
  },
  tick(b, g) {
    const p = g.player, per = LOOP[b.phase - 1] * FPS;
    const px = p.cx, py = p.cy;
    const dist = Math.hypot(px - b.x, py - b.y);
    const ox = b.x, oy = b.y;
    // a chirp this step? (game.js fixes its radius to the arena's 5 tiles)
    const chirp = g.fx.find((e) => e.type === 'chirp' && e.f === g.frame);
    const heard = chirp && Math.hypot(chirp.d.x - b.x, chirp.d.y - b.y) <= chirp.d.radius + T * 0.5;
    const flying = b.mode === 'fly' || b.mode === 'return' || b.mode === 'hover' || b.mode === 'intro';
    if (heard && flying) {
      b.mode = 'drop'; b.mt = 30; b.dropTo = b.y + 3 * T;
      g.emit('startle', { x: b.x, y: b.y });
      g.emit('sfx', { name: 'gecko-growl', rate: 1.5, gain: 0.7, x: b.x });
      g.emit('bonk', { x: b.x, y: b.y - 20 });
    }
    if (b.cool > 0) b.cool--;
    switch (b.mode) {
      case 'intro':  // hangs in the air a moment so you can find your feet
        if (--b.mt <= 0) b.mode = 'fly';
        break;
      case 'fly': {
        b.u = (b.u + 1 / per) % 1;
        const q = pathAt(b.phase, b.u);
        b.x = q.x; b.y = q.y;
        // phases 2-3: on his line? tell, then swoop at where you stand
        if (b.phase >= 2 && b.cool === 0 && !p.hidden && p.health > 0) {
          const ahead = pathAt(b.phase, (b.u + 0.5 / LOOP[b.phase - 1]) % 1);
          if (Math.hypot(px - ahead.x, py - ahead.y) < 8 * T && dist < 7.5 * T) {
            b.mode = 'tell'; b.mt = b.tell(b.x, b.y - 30); b.aim = { x: px, y: Math.min(py, 33 * T) };
          }
        }
        break;
      }
      case 'tell':    // the tail tip wiggles; he hangs in the air, eyeing the spot
        b.y += Math.sin(b.t * 0.4) * 0.6;
        if (--b.mt <= 0) { b.mode = 'swoop'; g.emit('sfx', { name: 'glide-whoosh', gain: 0.9, x: b.x }); }
        break;
      case 'swoop': {
        const v = 15 * T * DT, dx = b.aim.x - b.x, dy = b.aim.y - b.y, d = Math.hypot(dx, dy);
        if (d <= v) { b.x = b.aim.x; b.y = b.aim.y; b.mode = 'hover'; b.mt = Math.round(1.4 * FPS); }
        else { b.x += (dx / d) * v; b.y += (dy / d) * v; }
        break;
      }
      case 'hover':   // puffing after the swoop: the moment to chirp
        b.y += Math.sin(b.t * 0.15) * 0.5;
        if (--b.mt <= 0) { b.mode = 'return'; }
        break;
      case 'return': { // glide back onto the lap at the nearest point ahead
        if (b.target == null) {
          let best = 0, bd = 1e9;
          for (let i = 0; i < 60; i++) { const q = pathAt(b.phase, i / 60); const dd = Math.hypot(q.x - b.x, q.y - b.y); if (dd < bd) { bd = dd; best = i / 60; } }
          b.target = best;
        }
        const q = pathAt(b.phase, b.target), v = 7 * T * DT, dx = q.x - b.x, dy = q.y - b.y, d = Math.hypot(dx, dy);
        if (d <= v) { b.x = q.x; b.y = q.y; b.u = b.target; b.target = null; b.mode = 'fly'; b.cool = 100; }
        else { b.x += (dx / d) * v; b.y += (dy / d) * v; }
        break;
      }
      case 'drop':    // startled right out of the sky: three tiles down
        b.y += (b.dropTo - b.y) * 0.18;
        if (--b.mt <= 0) {
          b.y = b.dropTo; b.mode = 'landed'; b.mt = 2 * FPS;
          if (b.phase === 3) b.digby = { x: b.x, y: b.y + 50, vx: 0, vy: -120, t: 0 };
        }
        break;
      case 'landed':  // clinging to a chain, blinking, for 2 s
        if (b.digby) {
          const dg = b.digby, tx = (Math.max(SOIL.x0, Math.min(SOIL.x1, dg.x / T)) + 0.5) * T;
          dg.t++; dg.vy = Math.min(dg.vy + 1500 * DT, 700); dg.y += dg.vy * DT; dg.x += (tx - dg.x) * 0.05;
          if (dg.y >= SOIL.y * T) { dg.y = SOIL.y * T; g.emit('dig', { x: dg.x, y: dg.y }); g.emit('land', { x: dg.x, y: dg.y, hard: false, v: 0 }); b.digby = null; b.rescue(); g.emit('dialog', { key: 'geckos.kite.post' }); return; }
        } else if (--b.mt <= 0) { b.target = null; b.nextPhase(); return; }
        break;
      default: break;
    }
    b.vx = b.x - ox; b.vy = b.y - oy;
    if (Math.abs(b.vx) > 0.3) b.facing = b.vx > 0 ? 1 : -1;
    b.bank += (Math.max(-0.35, Math.min(0.35, b.vy * 0.06)) - b.bank) * 0.1;
    // his body hurts on contact while he's flying (landed, he's just a startled gecko on a chain)
    b.box = { x: b.x - 1.4 * T, y: b.y - 0.55 * T, w: 2.8 * T, h: 1.1 * T };
    if (b.mode !== 'landed' && b.mode !== 'drop' && p.invuln === 0 && !p.hidden && ov(b.box, { x: p.x + 4, y: p.y + 4, w: p.w - 8, h: p.h - 8 })) b.hit(1, b.x);
  },
  // after the rescue (the post lines open on the rescue step): he flutters off to the right high basket and dozes
  after(b, g) {
    b.at = (b.at || 0) + 1;
    const tx = 56 * T, ty = 15 * T;
    if (b.mode !== 'nap') {
      const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy), v = 5 * T * DT;
      if (d <= v) { b.x = tx; b.y = ty; b.mode = 'nap'; } else { b.x += (dx / d) * v; b.y += (dy / d) * v; b.facing = dx > 0 ? 1 : -1; }
    }
  },
  draw(b, c, r) {
    const t = b.game.frame;
    const glide = S.get('sprites/geckos/kite/glide.png');
    const perched = b.mode === 'landed' || b.mode === 'nap';
    // Digby: clinging to the leaf under him, or falling into the soil
    if (b.digby) r.drawCricketAt(c, 'digby', b.digby.x, b.digby.y, 1, { look: 'leap', scale: 0.9 });
    if (perched && !b.done) {
      // clinging to a basket chain, startled (rig idle) with the leaf and Digby still under him
      if (!b.rig) { b.rig = Geckos.create('kite'); Geckos.preload('kite'); }
      if (Geckos.ready('kite')) {
        b.rig.setPose('idle');
        c.save(); c.strokeStyle = 'rgba(90,70,50,0.8)'; c.lineWidth = 2; c.beginPath(); c.moveTo(b.x, 2 * T); c.lineTo(b.x, b.y - 10); c.stroke(); c.restore();
        b.rig.draw(c, b.x, b.y + 22, b.rig.scaleFor(b.len), b.facing);
        return true;
      }
    }
    if (b.done && b.mode === 'nap') {
      if (!b.rig) { b.rig = Geckos.create('kite'); Geckos.preload('kite'); }
      if (Geckos.ready('kite')) { b.rig.setPose('sleep'); b.rig.draw(c, b.x, b.y, b.rig.scaleFor(b.len * 0.9), -1); return true; }
    }
    if (!glide) return false;
    const w = b.len, h = w * glide.height / glide.width;
    const wob = b.mode === 'tell' ? Math.sin(t * 0.9) * 0.12 : 0;
    c.save();
    c.translate(b.x, b.y);
    c.rotate(b.bank * b.facing + wob);
    c.scale(b.facing > 0 ? -1 : 1, 1);
    // flaps ripple a little as he glides
    const flap = 1 + Math.sin(t * 0.25) * 0.04;
    c.drawImage(glide, -w / 2, (-h / 2) * flap, w, h * flap);
    c.restore();
    // the big leaf hangs from his feet, Digby clinging underneath
    if (!b.done && !b.digby) {
      const sw = Math.sin(t / 14) * 0.06;
      r.drawProp(c, 'leaf-glider', b.x, b.y + h * 0.5 + 34, 56, { rot: b.bank * 0.5 + sw, flip: b.facing > 0 });
      r.drawCricketAt(c, 'digby', b.x - 6 * b.facing, b.y + h * 0.5 + 18, b.facing, { look: 'cling', at: 'center', scale: 1, t, rot: sw + 0.2 * b.facing });
    }
    return true;
  },
});
