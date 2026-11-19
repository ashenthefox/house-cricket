// [builder A] The tank escape (zone 0): the scripted set pieces of the opening's six beats, as
// boss-registry scripts (one per room; they never hurt: "No damage anywhere in the tank").
//   { type: 'boss', boss: 'tank', beat: 'cup' | 'sand' | 'decor' | 'lid', x, y }
//   cup   (beats 1-2) the tongs dip three times (left, right, middle): dodge them; a catch just
//         lifts Pip and plops him back in the middle. Then hold Jump to leap out over the rim.
//   sand  (beat 3)    Duchess wakes, her tail tip wiggles (the tell, taught here) and she lunges,
//         slowly, into the sand berm behind you. Twice. No-fail.
//   decor (beat 4)    a loose pebble on a ledge: kick it off and it lands as a step.
//   lid   (beats 5-6) hold Up under the lid gap to squeeze through; Pip's leap off the rim tips the
//         feeder cup off the tank; then story 'tankEscaped' (panel 4, the Bedroom).
// Deterministic, no DOM in update; draws with the renderer's props and the gecko rig.
// [issue 11] Each beat's state is an object whose methods (update, draw, finish) live on a shared
// prototype and read it through `this`, never a closure: a rewind (src/rewind.js) copies the state and
// the copy runs. Room constants come from the entity (s.e); the game is s.g.
import { TILE, DT } from '../../data/movement.js';
import { TEXT } from '../../data/text.js';
import * as S from '../sprites.js';
import { K } from '../physics.js';
import * as Geckos from '../geckos.js';

const T = TILE;
const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const TK = TEXT.opening.tank;

function img(c, path, x, y, w, h, alpha = 1, rot = 0) {
  const im = S.get(path);
  if (!im) return false;
  c.save(); c.globalAlpha *= alpha; c.translate(x, y); if (rot) c.rotate(rot);
  c.drawImage(im, -w / 2, -h, w, h); c.restore();
  return true;
}

// ---------------------------------------------------------------- beat 1-2: the tongs
const CUP_XS = Object.freeze([12.5, 15.5, 14]); // tile columns of the three dips (left, right, middle)
const cupFloor = (e) => (e.floor ?? 10) * T;   // the cup floor (px)
function cup(g, e) {
  return Object.assign(Object.create(Cup), { g, e, phase: null, music: 'title', i: 0, t: -90, mode: 'wait', tipY: -6 * T, x: CUP_XS[0] * T, caught: 0, done: false });
}
const Cup = {
  setPhase() {},
  inCup() { const { g, e } = this, p = g.player; return p.cx > (e.cup?.[0] ?? 11) * T && p.cx < (e.cup?.[1] ?? 17) * T && p.y + p.h > cupFloor(e) - 2.5 * T; },
  update() {
    const s = this, g = s.g, xs = CUP_XS, floorY = cupFloor(s.e), inCup = () => s.inCup();
    const p = g.player;
    if (s.done) return;
    s.t++;
    if (s.mode === 'wait') {
      s.tipY += (-6 * T - s.tipY) * 0.1;
      if (s.t > 0 && inCup()) { s.mode = 'aim'; s.t = 0; s.x = xs[s.i] * T; g.emit('sfx', { name: 'hinge-creak', gain: 0.4, rate: 1.6 }); }
      if (!inCup() && p.y + p.h < floorY - 2.5 * T) s.finish();
    } else if (s.mode === 'aim') {           // the tongs hover over a spot (a shadow on the floor): the warning
      s.tipY += (floorY - 4.2 * T - s.tipY) * 0.12;
      if (s.t > 50) { s.mode = 'dip'; s.t = 0; }
    } else if (s.mode === 'dip') {
      s.tipY = Math.min(floorY - 0.2 * T, s.tipY + 22 * T * DT);
      const box = { x: s.x - 0.6 * T, y: s.tipY - 1.2 * T, w: 1.2 * T, h: 1.2 * T };
      if (ov(box, { x: p.x, y: p.y, w: p.w, h: p.h })) { s.mode = 'lift'; s.t = 0; s.caught++; g.emit('sfx', { name: 'squeak-toy', gain: 0.5, rate: 1.4 }); g.toast('Pinched! (Gently.) Plop.', 90); }
      else if (s.tipY >= floorY - 0.25 * T) { s.mode = 'up'; s.t = 0; g.emit('land', { x: s.x, y: floorY, hard: false }); s.i++; if (s.i < 3) g.toast(['Missed you!', 'Missed again!', ''][s.i - 1], 80); }
    } else if (s.mode === 'lift') {           // caught: up a little, then dropped back in the middle
      s.tipY = Math.max(floorY - 3.5 * T, s.tipY - 6 * T * DT);
      p.x = s.x - p.w / 2; p.y = s.tipY - p.h * 0.6; p.vx = 0; p.vy = 0; p.state = 'air';
      if (s.t > 40) { p.x = 14 * T - p.w / 2; p.vy = -100; s.mode = 'up'; s.t = 0; }
    } else if (s.mode === 'up') {
      s.tipY += (-6 * T - s.tipY) * 0.08;
      if (s.t > 40) { if (s.i >= 3) s.finish(); else { s.mode = 'wait'; s.t = -20; } }
    }
  },
  finish() {
    const s = this, g = s.g, e = s.e, floorY = cupFloor(e);
    if (s.done) return;
    s.done = true; s.mode = 'gone';
    g.signs.push({ x: (e.cup?.[0] ?? 10) * T - 2 * T, y: floorY - T, w: 12 * T, text: TK.rim });
  },
  draw(c) {
    const s = this, e = s.e, floorY = cupFloor(e);
    // the feeder cup (its lower half: the lid is off), behind Pip
    const im = S.get('props/feeder-cup.png');
    if (im) { const cx = ((e.cup?.[0] ?? 11) + (e.cup?.[1] ?? 17)) / 2 * T, w = ((e.cup?.[1] ?? 17) - (e.cup?.[0] ?? 11) + 1.2) * T, h = w * 0.5;
      c.save(); c.globalAlpha = 0.85; c.drawImage(im, 0, im.height * 0.48, im.width, im.height * 0.52, cx - w / 2, floorY - h + 4, w, h); c.restore(); }
    if (s.mode === 'gone' && s.tipY < -5 * T) return;
    if (s.mode === 'gone') s.tipY += (-7 * T - s.tipY) * 0.05;
    if (s.mode === 'aim') { // the shadow where they'll land
      c.save(); c.globalAlpha = 0.18 + 0.12 * Math.sin(s.t * 0.4); c.fillStyle = '#2E3550';
      c.beginPath(); c.ellipse(s.x, floorY - 4, 26, 7, 0, 0, 7); c.fill(); c.restore();
    }
    const h = 11 * T, w = h * 68 / 474;
    if (!img(c, 'props/tongs.png', s.x, s.tipY + 6, w * 1.1, h)) {
      c.save(); c.strokeStyle = '#8A7A5A'; c.lineWidth = 8; c.beginPath(); c.moveTo(s.x - 6, s.tipY - h); c.lineTo(s.x - 3, s.tipY); c.moveTo(s.x + 6, s.tipY - h); c.lineTo(s.x + 3, s.tipY); c.stroke(); c.restore();
    }
  },
};

// ---------------------------------------------------------------- beat 3: Duchess stirs (no-fail)
function sand(g, e) {
  return Object.assign(Object.create(Sand), { g, e, phase: null, music: 'title', mode: 'asleep', t: 0, x: (e.x + 0.5) * T, y: (e.y + 1) * T, facing: 1, lunges: 0, pose: 'sleep', rig: null, wig: 0 });
}
const Sand = {
  setPhase() {},
  update() {
    const s = this, g = s.g, e = s.e;
    const berms = (e.berms || [30, 48]).map((b) => (b + 0.5) * T);
    const EXIT = (e.exit ?? 60) * T;
    const p = g.player;
    s.t++;
    // [final-G] the way on waits until she has lunged twice (so everyone sees the tail tell)
    if (s.lunges < 2 && p.x + p.w > EXIT) {
      p.x = EXIT - p.w; if (p.vx > 0) p.vx = 0;
      if (!s.heldBack) { s.heldBack = true; g.toast(TK.waitTell, 150); }
    }
    if (s.mode === 'asleep') {
      if (p.cx > s.x + 5 * T) { s.mode = 'eye'; s.t = 0; s.pose = 'idle'; g.emit('sfx', { name: 'gecko-growl', gain: 0.5, rate: 1.1 }); g.toast(TK.duchessWakes[0], 150); }
    } else if (s.mode === 'eye') {
      if (s.t === 70) g.toast(TK.duchessWakes[1], 150);
      if (s.t > 110) { s.mode = 'stalk'; s.t = 0; }
    } else if (s.mode === 'stalk') {
      // [final-G] she always gets her two lunges in (the tank teaches the tell): she scurries to
      // catch up when you run ahead, stops behind the next berm, and the exit waits for her
      s.pose = 'walk';
      const next = berms.find((b) => b > s.x + 120 && !s.bit?.includes(b));
      let target = p.cx - 6 * T;
      if (next != null && next < p.cx) target = Math.min(target, next - 8 * T); // room for a real lunge into it
      const v = p.cx - s.x > 10 * T ? 240 : 70;
      if (s.x < target) s.x = Math.min(target, s.x + v * DT);
      const there = s.x >= target - 4 || p.cx - s.x < 9 * T;
      if (s.t > 50 && there && s.lunges < 2) { s.mode = 'tell'; s.t = 0; s.pose = 'idle'; s.wig = 48; g.emit('tell', { x: s.x + 140, y: s.y - 60 }); }
    } else if (s.mode === 'tell') {
      if (s.t > 48) {
        // she lunges at where you were... and into the sand berm if there's one between you
        const ahead = berms.find((b) => b > s.x + 120 && !s.bit?.includes(b));
        if (ahead != null && ahead < p.cx + 40) { s.aim = ahead - 150; (s.bit ||= []).push(ahead); }
        else s.aim = Math.min((ahead ?? s.x + 4 * T) - 150, p.cx - 60);
        s.mode = 'lunge'; s.t = 0; s.pose = 'strike';
      }
    } else if (s.mode === 'lunge') {
      s.x += Math.sign(s.aim - s.x) * Math.min(Math.abs(s.aim - s.x), 6 * T * DT);
      if (Math.abs(s.aim - s.x) < 2 || s.t > 60) { s.mode = 'stuck'; s.t = 0; s.lunges++; g.emit('dust', { x: s.x + 150, y: s.y }); g.emit('sfx', { name: 'gecko-chomp', gain: 0.6 }); if (s.lunges === 1) g.toast('Missed! She bit the sand.', 120); }
    } else if (s.mode === 'stuck') {
      s.pose = 'idle';
      if (s.t > 80) { s.mode = s.lunges >= 2 ? 'sulk' : 'stalk'; s.t = 0; }
    } else if (s.mode === 'sulk') {
      s.pose = 'idle';
    }
  },
  draw(c, r) {
    const s = this;
    if (!s.rig) { s.rig = Geckos.create('duchess'); Geckos.preload('duchess'); }
    if (!Geckos.ready('duchess')) return;
    if (s.wig) { s.rig.wiggle(s.wig); s.wig = 0; }
    s.rig.setPose(s.pose); s.rig.walkSpeed = 1.2;
    s.rig.draw(c, s.x, s.y, s.rig.scaleFor(400), s.facing);
    if (s.mode === 'asleep') {
      const tt = (r.t % 150) / 150;
      c.save(); c.globalAlpha = Math.sin(tt * Math.PI) * 0.8; c.fillStyle = '#5A4632'; c.font = `bold ${18 + 10 * tt}px "Patrick Hand", sans-serif`;
      c.fillText('z', s.x + 90 + 10 * tt, s.y - 110 - 30 * tt); c.restore();
    }
  },
};

// ---------------------------------------------------------------- beat 4: kick the pebble
function decor(g, e) {
  return Object.assign(Object.create(Decor), { g, e, phase: null, music: 'title', mode: 'sit', t: 0, px: (e.x + 0.2) * T, py: (e.y + 1) * T, vy: 0, rot: 0, land: e.land });
}
// [final-G] land: [x, y, w, h] tiles (default 1x1): a 2x2 rock makes a step 2 below the ledge (a 3 rise was pixel-exact)
const landSize = (s) => [s.land[2] || 1, s.land[3] || 1];
const Decor = {
  setPhase() {},
  place() { const s = this, g = s.g, [LW, LH] = landSize(s); for (let i = 0; i < LW; i++) for (let j = 0; j < LH; j++) g.grid.set(s.land[0] + i, s.land[1] + j, LH > 1 ? K.PROP : 1); g.gridVersion++; /* a big rock: solid, unpainted (the rock is drawn) */ s.px = (s.land[0] + LW / 2) * T; s.py = (s.land[1] + LH) * T; },
  update() {
    const s = this, g = s.g, [LW, LH] = landSize(s), place = () => s.place();
    const p = g.player;
    s.t++;
    if (s.mode === 'sit') {
      const kb = p.kickBox();
      const box = { x: s.px - 0.9 * T, y: s.py - 1.1 * T, w: 1.5 * T, h: 2.1 * T }; // it overhangs the ledge: kick it from below
      if (kb && ov(kb, box)) { s.mode = 'fall'; s.vx = (s.land[0] + LW / 2) * T - s.px; s.t = 0; g.emit('kick', { x: s.px, y: s.py - 20, dir: p.facing }); g.emit('bonk', { x: s.px, y: s.py - 20 }); }
    } else if (s.mode === 'fall') {
      const k = Math.min(1, s.t / 24);
      s.vy += 1600 * DT;
      s.px += s.vx / 24; s.py += s.vy * DT; s.rot += 0.25;
      const landY = (s.land[1] + LH) * T;
      if (k >= 1 && s.py >= landY) {
        s.mode = 'step'; s.rot = 0; place();
        g.emit('land', { x: s.px, y: s.py, hard: true }); g.emit('sfx', { name: 'bonk', gain: 0.7, rate: 0.6 });
        g.toast('Clonk! A step.', 100);
        // keep the player out of the new tile
        const tb = { x: s.land[0] * T, y: s.land[1] * T, w: LW * T, h: LH * T };
        if (ov(tb, { x: p.x, y: p.y, w: p.w, h: p.h })) p.y = tb.y - p.h;
      }
    }
  },
  draw(c) {
    const s = this, g = s.g, [LW, LH] = landSize(s);
    const big = LH > 1, h = big ? (s.mode === 'step' ? LH * T + 6 : LH * T * 0.92) : (s.mode === 'step' ? 1.1 * T : 0.9 * T), w = big ? LW * T * 1.18 : h * 343 / 233;
    if (!img(c, 'props/pebble.png', s.px, s.py + (s.mode === 'step' ? 4 : 2), w * (s.mode === 'step' && !big ? 1.15 : 1), h, 1, s.rot)) {
      c.fillStyle = '#9A9486'; c.beginPath(); c.ellipse(s.px, s.py - h / 2, w / 2, h / 2, 0, 0, 7); c.fill();
    }
    if (s.mode === 'sit' && (g.frame % 90) < 45) { c.save(); c.globalAlpha = 0.6; c.fillStyle = '#F4EBDD'; c.font = 'bold 22px "Patrick Hand", sans-serif'; c.fillText('?', s.px - 5, s.py - h - 8); c.restore(); }
  },
};

// ---------------------------------------------------------------- beats 5-6: the lid gap
function lid(g, e) {
  return Object.assign(Object.create(Lid), { g, e, phase: null, music: 'title', mode: 'wait', t: 0, held: 0, cupX: (e.cup[0] + 0.5) * T, cupY: (e.cup[1] + 1) * T, cupRot: 0, cupVy: 0, cupVx: 0 });
}
const Lid = {
  setPhase() {},
  update() {
    const s = this, g = s.g, e = s.e;
    const gx = e.gap[0], gy = e.gap[1];       // the gap tile (solid until squeezed)
    const p = g.player, inp = g.inp;
    s.t++;
    if (s.mode === 'wait') {
      const under = Math.abs(p.cx - (gx + 0.5) * T) < 0.9 * T && p.y < (gy + 3) * T && p.y > gy * T && p.grounded;
      if (under && inp?.held?.up) { s.held++; p.squash = -0.25 * Math.min(1, s.held / 30); }
      else s.held = Math.max(0, s.held - 2);
      if (s.held >= 30) { s.mode = 'squeeze'; s.t = 0; g.emit('sfx', { name: 'crinkle', gain: 0.8 }); }
    } else if (s.mode === 'squeeze') {    // through the mesh, one wriggle at a time
      p.vx = 0; p.vy = 0; p.state = 'air'; p.x = (gx + 0.5) * T - p.w / 2;
      p.y = (gy + 1) * T - p.h - (s.t / 40) * (T + p.h + 4);
      if (s.t >= 40) { p.y = gy * T - p.h - 1; p.vy = -200; s.mode = 'out'; s.t = 0; g.toast('Out! Now, off the rim...', 150); }
    } else if (s.mode === 'out') {
      if (p.cx > (e.edge ?? 27) * T) { s.mode = 'leap'; s.t = 0; p.vy = -520; p.vx = 300; p.state = 'air'; g.emit('jump', { x: p.cx, y: p.y + p.h }); }
    } else if (s.mode === 'leap') {
      if (s.t === 14) { s.cupVx = 160; s.cupVy = -260; g.emit('bonk', { x: s.cupX, y: s.cupY - 40 }); }
      if (s.t > 14) { s.cupVy += 1200 * DT; s.cupX += s.cupVx * DT; s.cupY += s.cupVy * DT; s.cupRot += 0.07; }
      if (s.t === 50) { g.emit('bellow', {}); g.emit('sfx', { name: 'splat', gain: 0.7 }); }
      if (s.t === 75) { s.mode = 'done'; if (g.meta?.flags?.inTank) g.emit('story', { name: 'tankEscaped' }); else g.toast('Free! (The story carries on from New Game.)', 180); } // only a real New Game hands over to panel 4
    }
  },
  draw(c) {
    const s = this, g = s.g, gx = s.e.gap[0], gy = s.e.gap[1];
    const mesh = S.get('props/mesh-lid.png');
    if (mesh) {
      const y0 = gy * T - 6, hh = T + 10;
      for (const [a, b] of [[2, gx], [gx + 1, 30]]) { c.drawImage(mesh, 0, 0, mesh.width, mesh.height, a * T, y0, (b - a) * T, hh); }
      c.save(); c.fillStyle = 'rgba(46,53,80,0.55)'; c.fillRect(gx * T + 4, gy * T, T - 8, T); c.restore();
    }
    const tipped = s.mode === 'leap' || s.mode === 'done';
    const h = tipped ? 2.2 * T : 2.8 * T;
    img(c, tipped ? 'props/feeder-cup-tipped.png' : 'props/feeder-cup.png', s.cupX, s.cupY, h * (tipped ? 415 / 255 : 274 / 312), h, 1, s.cupRot);
    if (s.mode === 'wait' && s.held > 0) { c.save(); c.globalAlpha = 0.7; c.strokeStyle = '#F2C46D'; c.lineWidth = 4; c.beginPath(); c.arc(g.player.cx, g.player.y - 14, 12, -Math.PI / 2, -Math.PI / 2 + (s.held / 30) * Math.PI * 2); c.stroke(); c.restore(); }
  },
};

const BEATS = { cup, sand, decor, lid };
// [art] what each beat draws (room-art.js loads it before the room shows); the sand's Duchess rig
const ART = {
  cup: { gecko: null, props: ['feeder-cup', 'tongs'] }, sand: { gecko: 'duchess', props: [] },
  decor: { gecko: null, props: ['pebble'] }, lid: { gecko: null, props: ['mesh-lid', 'feeder-cup', 'feeder-cup-tipped'] },
};
export default {
  create(game, e) { return (BEATS[e.beat] || cup)(game, e); },
  art(e) { return { crickets: {}, ...(ART[e.beat] || ART.cup) }; },
};
