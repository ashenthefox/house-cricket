// A practice gecko for the test zone (zone-98) and the pattern every real fight follows: built on
// the shared plumbing in base.js. It paces its floor; when you're in front of it, it tells (tail
// wiggle, 0.8 s / 1.2 s Gentle) and lunges along the floor. Each phase, kick that phase's target
// (entity targets: [[x, y], ...] tiles) to advance; after the last one the cricket is rescued.
// Entity: { type:'boss', boss:'practice', x, y, range:[x0, x1], targets:[[x,y],[x,y],[x,y]],
//           cricket:'stripe', rig:'duchess', checkpoints:[[x,y], ...] }
import { TILE, DT } from '../../data/movement.js';
import { makeBoss } from './base.js';

const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export default makeBoss('practice', {
  phases: 3, len: 300, chirp: { radius: 4, stun: 1 },
  start(b) {
    const e = b.e;
    b.x0 = (e.range?.[0] ?? e.x - 6) * TILE; b.x1 = (e.range?.[1] ?? e.x + 6) * TILE;
    b.mode = 'pace'; b.cool = 60; b.speed = 90 + 30 * (b.phase - 1);
    b.target = e.targets?.[b.phase - 1] ? { x: e.targets[b.phase - 1][0] * TILE, y: e.targets[b.phase - 1][1] * TILE, w: TILE, h: TILE } : null;
  },
  tick(b, g) {
    const p = g.player;
    const body = { x: b.x - b.len * 0.25, y: b.y - 44, w: b.len * 0.5, h: 44 };
    b.box = body;
    if (b.mode === 'pace') {
      b.pose = 'walk';
      b.x += b.facing * b.speed * DT;
      if (b.x < b.x0) { b.x = b.x0; b.facing = 1; } else if (b.x > b.x1) { b.x = b.x1; b.facing = -1; }
      if (b.cool > 0) b.cool--;
      else if (!p.hidden && Math.abs(p.cy - (b.y - 20)) < 2 * TILE && Math.sign(p.cx - b.x) === b.facing) { b.mode = 'tell'; b.pose = 'idle'; b.mt = b.tell(b.x + b.facing * b.len * 0.25, b.y - 50); b.aim = p.cx; }
    } else if (b.mode === 'tell') {
      if (--b.mt <= 0) { b.mode = 'lunge'; b.pose = 'strike'; }
    } else if (b.mode === 'lunge') {
      const v = 12 * TILE * DT, d = b.aim - b.x;
      b.x += Math.sign(d) * Math.min(Math.abs(d), v);
      b.x = Math.max(b.x0, Math.min(b.x1, b.x));
      if (Math.abs(d) <= v || b.x === b.x0 || b.x === b.x1) { b.mode = 'pace'; b.cool = 120 - 20 * b.phase; b.pose = 'walk'; }
    }
    if (p.invuln === 0 && !p.hidden && ov(body, { x: p.x + 4, y: p.y + 4, w: p.w - 8, h: p.h - 8 })) b.hit(1, b.x);
    const kb = p.kickBox();
    if (b.target && kb && ov(kb, b.target)) { g.emit('switch', { id: `practice-${b.phase}`, x: b.target.x + 20, y: b.target.y + 20 }); b.nextPhase(); }
  },
  draw(b, c) {
    if (b.target && !b.done) { c.save(); c.fillStyle = '#F2C46D'; c.strokeStyle = '#5A4632'; c.lineWidth = 3; c.beginPath(); c.arc(b.target.x + 20, b.target.y + 20, 12, 0, 7); c.fill(); c.stroke(); c.restore(); }
    return false; // and the default body (rig or shapes)
  },
});
