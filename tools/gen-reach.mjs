#!/usr/bin/env node
// Runs the real physics + player (headless) for every stat and move, writes
// game/data/reach.js, and fails (exit 1) if any move misses the movement table
// (game/data/movement.js) by more than 0.25 tile.
//   node tools/gen-reach.mjs          # check + write
//   node tools/gen-reach.mjs --check  # check only
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { TILE, DT, JUMP, SPEED_GAP_STEP, MOVES } from '../game/data/movement.js';
import { CRICKETS } from '../game/data/crickets.js';
import { Grid, K } from '../game/src/physics.js';
import { Player } from '../game/src/player.js';

const TOL = 0.25;
const W = 200, H = 60, FLOOR = 50;

function grid(fn) {
  const d = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) d[y * W + x] = fn(x, y) ? K.SOLID : K.EMPTY;
  return new Grid(W, H, d, () => K.EMPTY);
}
const blank = () => ({ left: false, right: false, up: false, down: false, jump: false, use: false, chirp: false, kick: false, listen: false, swapPrev: false, swapNext: false });
function frame(held, prevHeld) {
  const pressed = {}, released = {};
  for (const k in held) { pressed[k] = held[k] && !prevHeld[k]; released[k] = !held[k] && prevHeld[k]; }
  return { held, pressed, released };
}
function mkPlayer(stats, items = []) {
  const id = '__t';
  CRICKETS[id] = { ...CRICKETS.pip, ...stats, name: 'test' };
  const p = new Player(id);
  for (const i of items) p.give(i);
  return p;
}
function ctxFor(g, extra = {}) { return { grid: g, hooks: [], hideSpots: [], currents: [], emit() {}, breakUnder() { return false; }, ...extra }; }
function place(p, tx, feetRow) { p.reset(); p.x = tx * TILE + 5; p.y = feetRow * TILE - p.h; p.state = 'ground'; }

// Runs a script: script(f, p) returns the held map for frame f; observer(f, p) may return true to stop.
function run(p, ctx, frames, script, observer) {
  let prev = blank();
  for (let f = 0; f < frames; f++) {
    const held = { ...blank(), ...script(f, p) };
    const before = { x: p.x, y: p.y, state: p.state };
    p.update(frame(held, prev), ctx);
    prev = held;
    if (observer && observer(f, p, before)) return f;
  }
  return frames;
}

// Full-speed running jump off a ledge edge: returns {rise, gap} in tiles.
function measureJump(stats, kind = 'jump') {
  const edge = 120; // floor is cols 0..edge-1
  const g = grid((x, y) => y >= FLOOR && x < edge);
  const p = mkPlayer(stats);
  const ctx = ctxFor(g);
  place(p, edge - 25, FLOOR);
  const floorY = FLOOR * TILE;
  let takeoff = null, apex = 0, cross = null, jumped = false;
  run(p, ctx, 600, (f, pl) => {
    const h = { right: true };
    if (!jumped && pl.state === 'ground' && pl.x + pl.w + pl.vx * DT > edge * TILE - 0.5 && Math.abs(pl.vx) >= pl.P.run - 1) { h.jump = true; jumped = true; }
    else if (jumped && pl.state !== 'ground') h.jump = true; // hold for full height
    return h;
  }, (f, pl, before) => {
    if (jumped && takeoff == null && pl.state === 'air') takeoff = before.x;
    if (takeoff != null) {
      apex = Math.max(apex, floorY - (pl.y + pl.h));
      const feet = pl.y + pl.h, bfeet = before.y + pl.h;
      if (pl.vy > 0 && feet >= floorY && bfeet < floorY) {
        const t = (floorY - bfeet) / (feet - bfeet);
        cross = before.x + (pl.x - before.x) * t;
        return true;
      }
    }
    return false;
  });
  return { rise: apex / TILE, gap: (cross - takeoff + p.w) / TILE };
}

// Hump's huge leap: crouch 0.4 s standing at the edge, then Jump while holding right.
function measureLeap(stats) {
  const edge = 120;
  const g = grid((x, y) => y >= FLOOR && x < edge);
  const p = mkPlayer({ ...stats, perk: 'hugeLeap' });
  const ctx = ctxFor(g);
  place(p, edge - 1, FLOOR); p.x = edge * TILE - p.w - 0.5;
  const floorY = FLOOR * TILE;
  const crouchF = Math.round(MOVES.hugeLeap.crouchTime / DT) + 2;
  let takeoff = null, apex = 0, cross = null;
  run(p, ctx, 400, (f) => (f < crouchF ? { down: true } : f === crouchF ? { down: true, jump: true, right: true } : { jump: true, right: true }),
    (f, pl, before) => {
      if (takeoff == null && pl.state === 'air') takeoff = before.x;
      if (takeoff != null) {
        apex = Math.max(apex, floorY - (pl.y + pl.h));
        const feet = pl.y + pl.h, bfeet = before.y + pl.h;
        if (pl.vy > 0 && feet >= floorY && bfeet < floorY) { cross = before.x + (pl.x - before.x) * ((floorY - bfeet) / (feet - bfeet)); return true; }
      }
      return false;
    });
  return { rise: apex / TILE, gap: (cross - takeoff + p.w) / TILE };
}

function measureSuper(stats) {
  const edge = 120;
  const g = grid((x, y) => y >= FLOOR && x < edge);
  const p = mkPlayer(stats, ['band']);
  const ctx = ctxFor(g);
  place(p, edge - 1, FLOOR); p.x = edge * TILE - p.w - 0.5;
  const floorY = FLOOR * TILE;
  const chargeF = Math.round(MOVES.superJump.chargeTime / DT) + 2;
  let takeoff = null, apex = 0, cross = null;
  run(p, ctx, 600, (f) => (f < chargeF ? { use: true } : { right: true }),
    (f, pl, before) => {
      if (takeoff == null && pl.state === 'air') takeoff = before.x;
      if (takeoff != null) {
        apex = Math.max(apex, floorY - (pl.y + pl.h));
        const feet = pl.y + pl.h, bfeet = before.y + pl.h;
        if (pl.vy > 0 && feet >= floorY && bfeet < floorY) { cross = before.x + (pl.x - before.x) * ((floorY - bfeet) / (feet - bfeet)); return true; }
      }
      return false;
    });
  return { rise: apex / TILE, gap: (cross - takeoff + p.w) / TILE };
}

// Cling to a tall wall, kick off: rise and distance out at the kick's apex.
function measureWallJump(stats) {
  const wx = 100;
  const g = grid((x, y) => x === wx || y >= FLOOR);
  const p = mkPlayer(stats, ['booties']);
  const ctx = ctxFor(g);
  p.reset(); p.x = wx * TILE - p.w; p.y = 30 * TILE; p.state = 'air'; p.vy = 0;
  let y0 = null, x0 = null, apexRise = 0, outAtApex = 0, kicked = false, done = false;
  run(p, ctx, 200, (f, pl) => {
    if (!kicked && pl.state === 'cling' && f > 10) { kicked = true; return { jump: true }; }
    if (!kicked) return { right: true };
    return { jump: true };
  }, (f, pl, before) => {
    if (kicked && y0 == null) { y0 = before.y; x0 = before.x; }
    if (y0 != null && !done) {
      const rise = y0 - pl.y;
      if (rise > apexRise) { apexRise = rise; outAtApex = x0 - pl.x; }
      if (pl.vy > 0) { done = true; return true; }
    }
    return false;
  });
  return { rise: apexRise / TILE, out: outAtApex / TILE };
}

function measureGlide(stats, perk) {
  const g = grid(() => false);
  const p = mkPlayer({ ...stats, perk }, ['glider']);
  const ctx = ctxFor(g);
  p.reset(); p.x = 10 * TILE; p.y = 2 * TILE; p.state = 'air'; p.vy = 0;
  let s = null;
  run(p, ctx, 240, () => ({ right: true, jump: true }), (f, pl) => { if (f === 120) s = { x: pl.x, y: pl.y }; if (f === 239) s = { dx: pl.x - s.x, dy: pl.y - s.y }; });
  return { ratio: s.dx / s.dy };
}

function measureFlutter(stats) {
  const g = grid((x, y) => y >= FLOOR);
  const p = mkPlayer(stats, ['feather']);
  const ctx = ctxFor(g);
  place(p, 50, FLOOR);
  let fy = null, top = 1e9, pressedAt = -1;
  run(p, ctx, 200, (f, pl) => {
    if (f < 3) return { jump: true };
    if (pressedAt < 0 && pl.state === 'air' && pl.vy >= 0) { pressedAt = f; return { jump: true }; }
    return pressedAt > 0 && f > pressedAt ? { jump: true } : {};
  }, (f, pl, before) => {
    if (pressedAt === f) fy = before.y;
    if (fy != null) { top = Math.min(top, pl.y); if (pl.vy > 0 && f > pressedAt + 2) return true; }
    return false;
  });
  return { rise: (fy - top) / TILE };
}

function measureWallRun(stats) {
  const wx = 100;
  const g = grid((x, y) => x === wx || y >= FLOOR);
  const p = mkPlayer({ ...stats, perk: 'wallRun' });
  const ctx = ctxFor(g);
  place(p, wx - 6, FLOOR);
  const y0 = p.y; let top = y0;
  run(p, ctx, 120, () => ({ right: true }), (f, pl) => { top = Math.min(top, pl.y); return pl.state === 'air' && pl.vy > 0 && top < y0; });
  return { rise: (y0 - top) / TILE };
}

// Floss: hang from a hook, pump to the top of the swing, fling at the best moment.
function measureSwing(stats) {
  let best = { gap: 0 };
  for (let rel = 0; rel < 90; rel += 1) {
    const g = grid(() => false);
    const p = mkPlayer(stats, ['floss']);
    const hook = { x: 100 * TILE, y: 10 * TILE };
    const ctx = ctxFor(g, { hooks: [hook] });
    p.reset(); p.x = hook.x - p.w / 2; p.y = hook.y + 10; p.state = 'air';
    let grabbed = false, pumpF = 0, released = false, ry = null, rx = null, cross = null, phaseStart = -1;
    run(p, ctx, 900, (f, pl) => {
      if (!grabbed) { grabbed = pl.state === 'swing'; return { use: f % 2 === 0 }; }
      if (pl.state === 'swing') {
        pumpF++;
        if (pumpF < 420) return pl.swing.w > 0 ? { right: true } : { left: true };
        // after pumping: wait for a rightward pass and release `rel` frames after the bottom
        if (phaseStart < 0 && pl.swing.w > 0 && Math.abs(pl.swing.ang) < 0.08) phaseStart = f;
        if (phaseStart >= 0 && f - phaseStart === rel) return { jump: true, right: true };
        return pl.swing.w > 0 ? { right: true } : { left: true };
      }
      return { right: true };
    }, (f, pl, before) => {
      if (grabbed && !released && before.state === 'swing' && pl.state === 'air') { released = true; ry = pl.y; rx = pl.x; }
      if (released) {
        if (pl.vy > 0 && pl.y >= ry && before.y < ry) { cross = before.x + (pl.x - before.x) * ((ry - before.y) / (pl.y - before.y)); return true; }
      }
      return f > 880;
    });
    if (cross != null) { const gap = (cross - rx + p.w) / TILE; if (gap > best.gap) best = { gap, rel }; }
  }
  return best;
}

// [mech] A spring (cushion) of `power` tiles: drop onto it, measure the bounce's rise.
function measureSpring(stats, power) {
  const g = grid((x, y) => y >= FLOOR);
  const p = mkPlayer(stats);
  const ctx = ctxFor(g, { springUnder: () => ({ power }) });
  p.reset(); p.x = 50 * TILE; p.y = (FLOOR - 1) * TILE - p.h; p.state = 'air';
  let top = 1e9, bounced = false;
  run(p, ctx, 240, () => ({}), (f, pl) => { if (!bounced && pl.vy < 0) bounced = true; if (bounced) top = Math.min(top, pl.y); return bounced && pl.vy > 0; });
  return { rise: (FLOOR * TILE - p.h - top) / TILE };
}
// [mech] A lift column `h` tiles tall (steam, vy tiles/s): stand at its foot, how high do the feet get?
function measureLift(stats, h, vy, glide) {
  const g = grid((x, y) => y >= FLOOR);
  const p = mkPlayer(stats, glide ? ['glider'] : []);
  const L = { x: 49 * TILE, y: (FLOOR - h) * TILE, w: 3 * TILE, h: h * TILE, v: vy * TILE, acc: 40 * TILE, glide };
  const ctx = ctxFor(g, { liftAt: (pl) => (pl.cx >= L.x && pl.cx <= L.x + L.w && pl.y + pl.h > L.y && pl.y < L.y + L.h ? L : null) });
  place(p, 50, FLOOR);
  let top = 1e9;
  run(p, ctx, 300, (f) => (glide ? { jump: f < 2 || f > 30 } : {}), (f, pl) => { top = Math.min(top, pl.y); return false; });
  return { rise: (FLOOR * TILE - p.h - top) / TILE };
}

// ---------------------------------------------------------------------------
const results = { jump: {}, crickets: {}, moves: {} };
const fails = [];
const check = (label, got, want) => {
  const ok = Math.abs(got - want) <= TOL;
  if (!ok) fails.push(`${label}: got ${got.toFixed(2)}, table ${want}`);
  return Math.round(got * 100) / 100;
};
const base = { spd: 3, jmp: 3, chp: 3, wt: 3 };

for (const j of [2, 3, 4, 5]) {
  const m = measureJump({ ...base, jmp: j });
  results.jump[j] = { rise: check(`jump stat ${j} rise`, m.rise, JUMP[j].rise), gap: check(`jump stat ${j} gap`, m.gap, JUMP[j].gap) };
}
for (const s of [2, 4, 5]) {
  const m = measureJump({ ...base, spd: s });
  results.jump[`spd${s}`] = { gap: check(`speed ${s} gap`, m.gap, JUMP[3].gap + SPEED_GAP_STEP * (s - 3)) };
}
for (const [id, c] of Object.entries(CRICKETS)) {
  if (id.startsWith('__')) continue;
  const st = { spd: c.spd, jmp: c.jmp, chp: c.chp, wt: c.wt };
  const m = measureJump(st);
  const want = JUMP[c.jmp].gap + SPEED_GAP_STEP * (c.spd - 3);
  const wj = measureWallJump(st);
  results.crickets[id] = {
    spd: c.spd, jmp: c.jmp,
    rise: check(`${id} rise`, m.rise, JUMP[c.jmp].rise),
    gap: check(`${id} gap`, m.gap, want),
    wallRise: check(`${id} wall-jump rise`, wj.rise, MOVES.wallJump.rise),
    wallOut: check(`${id} wall-jump out`, wj.out, MOVES.wallJump.out),
    flutter: check(`${id} flutter`, measureFlutter(st).rise, MOVES.flutter.rise),
  };
  if (c.perk === 'hugeLeap') { const l = measureLeap(st); results.crickets[id].leapRise = check(`${id} huge leap rise`, l.rise, MOVES.hugeLeap.rise); results.crickets[id].leapGap = check(`${id} huge leap gap`, l.gap, MOVES.hugeLeap.gap); }
  if (c.perk === 'wallRun') results.crickets[id].wallRun = check(`${id} wall-run`, measureWallRun(st).rise, MOVES.wallRun.rise);
}
const sj = measureSuper(base);
results.moves.superJump = { rise: check('super-jump rise', sj.rise, MOVES.superJump.rise), gap: check('super-jump gap', sj.gap, MOVES.superJump.gap) };
results.moves.glide = { ratio: check('glide ratio', measureGlide(base).ratio, MOVES.glide.ratio) };
results.moves.longGlide = { ratio: check('long glide ratio', measureGlide({ ...base, wt: 2 }, 'longGlide').ratio, MOVES.longGlide.ratio) };
const sw = measureSwing(base);
results.moves.swing = { fling: check('floss fling (best release)', sw.gap, MOVES.swing.fling), bestReleaseFrame: sw.rel, reach: MOVES.swing.reach };

// [mech] springs bounce exactly `power` tiles (any cricket); lifts carry you to their top (+ a little)
for (const pw of [4, 6, 8]) {
  const r = measureSpring(base, pw), rw = measureSpring({ spd: 2, jmp: 2, chp: 4, wt: 5 }, pw);
  results.moves[`spring${pw}`] = { rise: check(`spring ${pw} rise`, r.rise, pw) };
  check(`spring ${pw} rise (Duo)`, rw.rise, pw);
}
{
  const l = measureLift(base, 5, 9, false), lg = measureLift(base, 5, 9, true);
  results.moves.lift = { h: 5, rise: Math.round(l.rise * 100) / 100, glideRise: Math.round(lg.rise * 100) / 100 };
  if (l.rise < 5 - TOL) fails.push(`steam lift 5 tall: feet rose only ${l.rise.toFixed(2)}`);
  if (lg.rise < 5 - TOL) fails.push(`updraft 5 tall (gliding): feet rose only ${lg.rise.toFixed(2)}`);
}

console.log(JSON.stringify(results, null, 1));
if (fails.length) {
  console.error('\nFAIL: misses the movement table by more than ' + TOL + ' tile:\n  ' + fails.join('\n  '));
  process.exit(1);
}
if (!process.argv.includes('--check')) {
  const out = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'game', 'data', 'reach.js');
  writeFileSync(out, `// Generated by tools/gen-reach.mjs from the real physics. Do not edit by hand.\n// Tiles. rise = feet height gained; gap = widest pit cleared at the same height.\nexport const REACH = ${JSON.stringify(results, null, 2)};\n`);
  console.log('wrote', out);
}
console.log('gen-reach: all moves within', TOL, 'tile of the table');
