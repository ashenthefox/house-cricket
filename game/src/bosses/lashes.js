// Lashes, crested gecko (Pantry, pan-lair): distract with fruit. Builder B.
// He patrols the middle shelf of the fruit shelf and licks his own eyeball between steps
// (*slurp*: while licking he isn't looking: the safe window). If he sees you ahead of him on his
// shelf (or you bump into him) his tail tip wiggles (the tell) and he lunges. Fruit that lands on
// his shelf draws him to it and he stops to lick it for 6 s; while he eats you can walk right past.
//   Phase 1: kick the hanging grape down into his path, pass him going left (ends: you're on the
//            left end of the middle shelf).
//   Phase 2: faster, random turns. Super-jump up through the hole in the top shelf and kick the
//            tipped jam jar: jam drips through onto his shelf. Get past him to the stairs at the
//            right (ends: you're on the stairs; the pickle jar at their top slides aside).
//   Phase 3: up on the top shelf he snaps up through its holes when you cross one above his head.
//            Kick the banana slice down through a hole for him; chirp the fruit-fly swarm apart
//            (it re-forms in 3 s) and kick the lid of Frost's jar (ends: rescue).
// Room: game/data/rooms/zone-04.js pan-lair. Floors: bottom row 16, middle row 11, top row 5.
import { TILE as T, DT, FPS } from '../../data/movement.js';
import { makeBoss } from './base.js';
import * as Mech from '../mechanics.js';
import * as Geckos from '../geckos.js';
import { constant } from '../world.js'; // [issue 11] frozen module constants: a rewind shares them

const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const MID = 11 * T, TOP = 5 * T;                       // shelf surfaces (feet y)
const HOLES = constant([15 * T, 31 * T]);                         // hole centres in the top shelf
const LEN = 320;                                        // nose to tail, px
const JAR = constant({ x: 1.5 * T, y: 2.6 * T, w: 2.2 * T, h: 2.4 * T }); // Frost's jar on the top shelf (far left)
const RANGES = constant({ 1: [26, 46], 2: [20, 48], 3: [13, 46] });
const SPEED = constant({ 1: 1.6, 2: 2.7, 3: 2.2 });              // tiles/s
const WALK = 100, LICK = 60, EAT = 6 * FPS, REFORM = 3 * FPS;

function onShelf(p, y) { return Math.abs(p.y + p.h - y) < 6 && (p.state === 'ground' || p.state === 'charge' || p.state === 'hide'); }
function noseX(b) { return b.x + b.facing * LEN * 0.42; }

function makeFruit(phase) {
  if (phase === 1) return [{ kind: 'grape', x: 42.5 * T, y: 8.5 * T, w: 40, h: 56, state: 'hang', anchor: 6 * T }];
  if (phase === 2) return [{ kind: 'jam', x: 13.3 * T, y: TOP, w: 44, h: 52, state: 'jar' }];
  return [{ kind: 'banana', x: 31.8 * T, y: 4.7 * T, w: 40, h: 30, state: 'hang', anchor: T }];
}

export default makeBoss('lashes', {
  art: () => ({ props: ['grape', 'banana-slice', 'jam-blob'], crickets: { frost: ['idle', 'chirp'] } }), // [art] what the fight draws (room-art.js loads it before the lair shows)
  phases: 3, len: LEN,
  start(b, g) {
    const [r0, r1] = RANGES[b.phase];
    b.x0 = r0 * T; b.x1 = r1 * T; b.speed = SPEED[b.phase] * T;
    b.x = [0, 40, 34, 30][b.phase] * T; b.facing = b.phase === 3 ? 1 : -1;
    b.y = MID; b.mode = 'walk'; b.mt = WALK; b.cool = 90; b.pose = 'walk'; b.lift = 0;
    b.fruit = makeFruit(b.phase); b.eating = null; b.turnAt = null; b.snapHole = null;
    if (b.phase === 3) Mech.setSwitch(g, 'lashes-stairs');
    if (g.rescued.has(b.cricket)) { b.done = true; b.dozing = true; b.mode = 'done'; b.pose = 'sleep'; Mech.setSwitch(g, 'lashes-stairs'); return; } // [final-2] Frost is free: no refight, he dozes on his shelf
  },
  tick(b, g) {
    const p = g.player;
    const nose = noseX(b);
    const pb = { x: p.x + 3, y: p.y + 3, w: p.w - 6, h: p.h - 6 };
    const kb = p.kickBox();

    // ---- the fruit: kicked down, falls, lands on a shelf ----
    for (const f of b.fruit) {
      const box = { x: f.x - f.w / 2, y: f.y - f.h, w: f.w, h: f.h };
      if ((f.state === 'hang' || f.state === 'jar') && kb && ov(kb, box)) {
        if (f.kind === 'jam') { f.state = 'tipped'; f.drip = 0; g.emit('sfx', { name: 'splat', gain: 0.5, x: f.x }); }
        else { f.state = 'fall'; f.vy = 0; g.emit('kick', {}); g.emit('sfx', { name: 'pillow-bonk', gain: 0.5, rate: 1.4, x: f.x }); }
      }
      if (f.state === 'tipped' && ++f.drip > 40) { // the jam pours through the hole beside the jar
        b.fruit.push({ kind: 'jamblob', x: HOLES[0], y: TOP + 6, w: 40, h: 18, state: 'fall', vy: 60 }); f.state = 'empty';
      }
      if (f.state === 'fall') {
        f.vy = Math.min(900, (f.vy || 0) + 1800 * DT); f.y += f.vy * DT;
        const land = Math.abs(f.x - HOLES[0]) < 40 || Math.abs(f.x - HOLES[1]) < 40 || f.y > TOP + 20 ? MID : TOP;
        if (f.y >= land) { f.y = land; f.state = land === MID ? 'rest' : 'top'; g.emit('land', { x: f.x, y: f.y, soft: true }); }
      }
    }

    // ---- what he does ----
    const restFruit = b.fruit.find((f) => f.state === 'rest' && f.x > b.x0 - 9 * T && f.x < b.x1 + 9 * T);
    const looking = !['lick', 'eat', 'snap', 'strike', 'recover'].includes(b.mode) && b.cool <= 0;
    if (b.cool > 0) b.cool--;
    if (b.mode === 'walk' || b.mode === 'lick') {
      if (restFruit && b.mode === 'walk') { // smell it: go to it
        const d = restFruit.x - nose; b.facing = Math.sign(restFruit.x - b.x) || b.facing;
        if (Math.abs(restFruit.x - noseX(b)) < 14) { b.mode = 'eat'; b.mt = EAT; b.eating = restFruit; g.emit('sfx', { name: 'gecko-chomp', gain: 0.7, x: nose }); }
        else b.x += Math.sign(d) * b.speed * 1.3 * DT;
        b.pose = 'walk';
      } else if (b.mode === 'walk') {
        b.pose = 'walk';
        if (b.phase === 2) { // random turns
          if (b.turnAt == null) b.turnAt = b.x0 + b.rng() * (b.x1 - b.x0);
          if ((b.facing < 0 && b.x <= b.turnAt) || (b.facing > 0 && b.x >= b.turnAt)) { b.facing = -b.facing; b.turnAt = null; }
        }
        b.x += b.facing * b.speed * DT;
        if (b.x <= b.x0) { b.x = b.x0; b.facing = 1; b.turnAt = null; } else if (b.x >= b.x1) { b.x = b.x1; b.facing = -1; b.turnAt = null; }
        if (--b.mt <= 0) { b.mode = 'lick'; b.mt = LICK; b.pose = 'lick'; g.emit('sfx', { name: 'splat', gain: 0.35, rate: 1.9, x: nose }); }
      } else if (--b.mt <= 0) { b.mode = 'walk'; b.mt = WALK; }
    } else if (b.mode === 'eat') {
      b.pose = (b.mt % 40) < 22 ? 'lick' : 'idle';
      if (b.mt % 40 === 0) g.emit('sfx', { name: 'splat', gain: 0.3, rate: 1.7, x: nose });
      if (--b.mt <= 0) { b.eating.state = 'eaten'; b.eating = null; b.mode = 'walk'; b.mt = WALK; b.cool = 45; }
    } else if (b.mode === 'tell') {
      b.pose = 'idle';
      if (--b.mt <= 0) { b.mode = 'strike'; b.mt = 22; b.pose = 'strike'; b.aim = b.x + b.facing * 3.5 * T; g.emit('sfx', { name: 'gecko-chomp', gain: 0.8, x: nose }); }
    } else if (b.mode === 'strike') {
      const d = b.aim - b.x, v = 13 * T * DT;
      b.x += Math.sign(d) * Math.min(Math.abs(d), v);
      b.x = Math.max(b.x0 - 4 * T, Math.min(b.x1 + 4 * T, b.x));
      const head = { x: noseX(b) - 30, y: b.y - 110, w: 60, h: 110 };
      if (!p.hidden && p.invuln === 0 && ov(head, pb)) b.hit(1, noseX(b));
      if (--b.mt <= 0) { b.mode = 'recover'; b.mt = 40; b.pose = 'idle'; }
    } else if (b.mode === 'snapTell') {
      b.pose = 'idle'; b.lift = Math.min(1, b.lift + 0.05);
      if (--b.mt <= 0) { b.mode = 'snap'; b.mt = 24; b.pose = 'strike'; g.emit('sfx', { name: 'gecko-chomp', gain: 0.8, x: b.snapHole }); }
    } else if (b.mode === 'snap') {
      b.lift = 1;
      const jaw = { x: b.snapHole - 50, y: TOP - 70, w: 100, h: 80 };
      if (!p.hidden && p.invuln === 0 && ov(jaw, pb)) b.hit(1, b.snapHole);
      if (--b.mt <= 0) { b.mode = 'recover'; b.mt = 40; b.pose = 'idle'; b.snapHole = null; }
    } else if (b.mode === 'recover') {
      b.lift = Math.max(0, b.lift - 0.08);
      if (--b.mt <= 0) { b.mode = 'walk'; b.mt = WALK; b.cool = 50; }
    }
    if (b.mode !== 'snapTell' && b.mode !== 'snap') b.lift = Math.max(0, b.lift - 0.08);

    // ---- seeing you ----
    if (looking && (b.mode === 'walk') && !p.hidden) {
      const ahead = (p.cx - noseX(b)) * b.facing;
      const body = { x: b.x - LEN * 0.32, y: b.y - 120, w: LEN * 0.64, h: 120 };
      if (onShelf(p, MID) && ((ahead > -20 && ahead < 6 * T) || ov(body, pb))) {
        b.facing = Math.sign(p.cx - b.x) || b.facing;
        b.mode = 'tell'; b.mt = b.tell(noseX(b), b.y - 110); b.pose = 'idle';
      } else if (b.phase === 3 && Math.abs(p.y + p.h - TOP) < 8) { // above him on the top shelf: snaps up through a hole
        const hole = HOLES.find((h) => Math.abs(p.cx - h) < 1.7 * T && Math.abs(noseX(b) - h) < 3 * T);
        if (hole != null) { b.snapHole = hole; b.mode = 'snapTell'; b.mt = b.tell(hole, TOP + 30); b.pose = 'idle'; }
      }
    }

    // ---- the swarm re-forms in 3 s ----
    for (const e of g.enemies) if (e.type === 'fruitflies' && e.state === 'gone' && e.goneT > REFORM) e.goneT = REFORM;

    // ---- progress ----
    if (b.phase === 1 && onShelf(p, MID) && p.cx < 18 * T) b.nextPhase();
    else if (b.phase === 2 && p.cx > 55.5 * T && p.y + p.h <= 12 * T + 2 && p.y + p.h > 6 * T) b.nextPhase();
    else if (kb && ov(kb, JAR)) {
      if (b.phase === 3) {
        g.emit('sfx', { name: 'unlock', gain: 0.9 });
        g.emit('dialog', { key: 'geckos.lashes.post' });
        b.mode = 'done'; b.pose = 'lick';
        b.rescue();
      } else if (!b.stuckToast || g.frame - b.stuckToast > 120) { b.stuckToast = g.frame; g.toast('The lid is stuck fast. (Lashes has his eye on it.)', 120); }
    }
  },
  after(b, g) { // a good sport: back to his fruit and his eyeball
    if (b.dozing) { b.pose = 'sleep'; return; } // [final-2]
    if (++b.t % 160 < 60) b.pose = 'lick'; else b.pose = 'idle';
    void g;
  },
  draw(b, c, r) {
    const g = b.game, t = g.frame;
    // Frost's jar (far left of the top shelf)
    drawJar(c, JAR, b.done ? 0 : 1);
    if (!b.done && r.drawCricketAt) r.drawCricketAt(c, 'frost', JAR.x + JAR.w / 2, JAR.y + JAR.h - 6, 1, { look: Math.floor(t / 50) % 3 === 0 ? 'chirp' : 'idle', scale: 0.8 });
    // fruit
    for (const f of b.fruit) {
      if (f.state === 'eaten') continue;
      if (f.kind === 'grape' || f.kind === 'banana') {
        if (f.state === 'hang') { c.save(); c.strokeStyle = '#5A4632'; c.lineWidth = 2; c.beginPath(); c.moveTo(f.x, f.anchor); c.quadraticCurveTo(f.x + Math.sin(t / 30) * 6, (f.anchor + f.y - f.h) / 2, f.x, f.y - f.h + 4); c.stroke(); c.restore(); }
        const sway = f.state === 'hang' ? Math.sin(t / 30) * 0.08 : 0;
        if (!r.drawProp(c, f.kind === 'grape' ? 'grape' : 'banana-slice', f.x, f.y, f.h, { rot: sway })) { c.fillStyle = f.kind === 'grape' ? '#7B4A8C' : '#F2D27A'; c.beginPath(); c.arc(f.x, f.y - f.h / 2, f.w / 2, 0, 7); c.fill(); }
        if (f === b.eating) drawSlurp(c, f.x, f.y - f.h - 6, t);
      } else if (f.kind === 'jam') {
        c.save(); c.translate(f.x, f.y);
        if (f.state !== 'jar') c.rotate(0.9);
        drawJar(c, { x: -f.w / 2, y: -f.h, w: f.w, h: f.h }, 1, '#B4413A');
        c.restore();
        if (f.state === 'tipped') { c.fillStyle = '#B4413A'; c.fillRect(HOLES[0] - 6, TOP, 12, Math.min(f.drip * 6, MID - TOP)); }
      } else if (f.kind === 'jamblob') {
        r.drawProp(c, 'jam-blob', f.x, f.y + 2, 18);
        if (f === b.eating) drawSlurp(c, f.x, f.y - 30, t);
      }
    }
    // the gecko: the rig (lifted and tilted when he snaps up through a hole)
    if (!Geckos.NAMES.includes('lashes')) return false;
    if (!b.rig) { b.rig = Geckos.create('lashes'); Geckos.preload('lashes'); }
    if (b._wiggle) { b.rig.wiggle(b._wiggle); b._wiggle = 0; }
    if (!Geckos.ready('lashes')) return false;
    const rig = b.rig, s = rig.scaleFor(LEN);
    rig.setPose(b.pose);
    c.save();
    if (b.lift > 0 && b.snapHole != null) {
      const hx = b.snapHole, dir = Math.sign(hx - b.x) || b.facing;
      c.translate(b.x, b.y); c.rotate(-dir * 0.5 * b.lift); c.translate(-b.x, -b.y - 50 * b.lift);
    }
    rig.draw(c, b.x, b.y, s, b.facing);
    c.restore();
    return true;
  },
});

function drawJar(c, j, alpha = 1, fill = null) {
  c.save(); c.globalAlpha *= alpha;
  c.fillStyle = fill ? fill : 'rgba(220,235,240,0.28)';
  c.strokeStyle = '#5A4632'; c.lineWidth = 3;
  const r = 10;
  c.beginPath();
  c.moveTo(j.x + 6, j.y + 10); c.lineTo(j.x + 6, j.y + j.h - r); c.quadraticCurveTo(j.x + 6, j.y + j.h, j.x + 6 + r, j.y + j.h);
  c.lineTo(j.x + j.w - 6 - r, j.y + j.h); c.quadraticCurveTo(j.x + j.w - 6, j.y + j.h, j.x + j.w - 6, j.y + j.h - r); c.lineTo(j.x + j.w - 6, j.y + 10);
  c.closePath();
  if (fill) { c.globalAlpha *= 0.85; c.fill(); c.globalAlpha /= 0.85; } else c.fill();
  c.stroke();
  // lid
  c.fillStyle = '#C8564B'; c.fillRect(j.x + 2, j.y, j.w - 4, 12); c.strokeRect(j.x + 2, j.y, j.w - 4, 12);
  // shine
  c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 3; c.beginPath(); c.moveTo(j.x + 14, j.y + 20); c.lineTo(j.x + 14, j.y + j.h - 14); c.stroke();
  c.restore();
}
function drawSlurp(c, x, y, t) { // wet little licks: three drops hopping off the fruit
  c.save(); c.fillStyle = 'rgba(160,200,215,0.85)'; c.strokeStyle = '#5A4632'; c.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    const a = ((t + i * 13) % 40) / 40, dx = (i - 1) * 10 + Math.sin(i * 2.1) * 4;
    c.globalAlpha = 1 - a; c.beginPath(); c.arc(x + dx, y - a * 18, 3.5, 0, 7); c.fill(); c.stroke();
  }
  c.restore();
}
