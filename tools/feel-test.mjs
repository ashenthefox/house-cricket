#!/usr/bin/env node
// Checks the forgiveness windows at their exact limits, headless, with the real player code:
// coyote 100 ms, jump buffer 120 ms, wall-jump grace 100 ms, hook magnet 1 tile, corner nudge
// 8 px, the stick's down cone, and that flutter / glide / variable height / Hump's crouch-leap
// each fire only from their own input.   node tools/feel-test.mjs
import { TILE, FORGIVE, MOVES, toFrames } from '../game/data/movement.js';
import { CRICKETS } from '../game/data/crickets.js';
import { Grid, K } from '../game/src/physics.js';
import { Player } from '../game/src/player.js';
import { stickDirs } from '../game/src/input.js';

const W = 80, H = 40;
const grid = (fn) => { const d = new Uint8Array(W * H); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) d[y * W + x] = fn(x, y); return new Grid(W, H, d, () => K.EMPTY); };
const KEYS = ['left', 'right', 'up', 'down', 'jump', 'use', 'chirp', 'kick', 'listen', 'swapPrev', 'swapNext'];
function driver(p, ctx) {
  let prev = {};
  return (held = {}) => {
    const h = {}, pr = {}, rl = {};
    for (const k of KEYS) { h[k] = !!held[k]; pr[k] = h[k] && !prev[k]; rl[k] = !h[k] && !!prev[k]; }
    prev = h;
    p.update({ held: h, pressed: pr, released: rl }, ctx);
  };
}
const ctxOf = (g, extra = {}) => ({ grid: g, hooks: [], hideSpots: [], currents: [], emit() {}, breakUnder() { return false; }, ...extra });
let pass = 0, fail = 0;
const ok = (cond, label) => { if (cond) pass++; else { fail++; console.log('  FAIL', label); } };

// ---- coyote: walk off a ledge, press Jump k frames after leaving the ground ----
const ledge = grid((x, y) => (y >= 20 && x < 30 ? K.SOLID : K.EMPTY));
function coyote(k) {
  const p = new Player('pip'), ctx = ctxOf(ledge), step = driver(p, ctx);
  p.x = 25 * TILE; p.y = 20 * TILE - p.h; p.state = 'ground';
  let left = -1;
  for (let f = 0; f < 200; f++) {
    const press = left >= 0 && f === left + k;
    step({ right: true, jump: press });
    if (left < 0 && p.state === 'air') left = f;
    if (press) return p.vy < -100;
  }
  return false;
}
const C = toFrames(FORGIVE.coyote);
ok(coyote(1), 'coyote: jump 1 frame after leaving the ledge');
ok(coyote(C), `coyote: jump ${C} frames (${FORGIVE.coyote * 1000} ms) after leaving`);
ok(!coyote(C + 2), `coyote: no jump ${C + 2} frames after leaving`);

// ---- jump buffer: press Jump k frames before landing ----
const floor = grid((x, y) => (y >= 30 ? K.SOLID : K.EMPTY));
function buffer(k) {
  // drop from a height; find the landing frame, then replay pressing k frames before it
  const sim = (pressAt) => {
    const p = new Player('pip'), ctx = ctxOf(floor), step = driver(p, ctx);
    p.x = 10 * TILE; p.y = 20 * TILE; p.state = 'air';
    let landed = -1, jumped = false;
    for (let f = 0; f < 200; f++) {
      step({ jump: f >= pressAt && f < pressAt + 2 });
      if (landed < 0 && (p.state === 'ground' || (f > 0 && p.vy < -100))) { landed = f; jumped = p.vy < -100; break; }
    }
    return { landed, jumped };
  };
  const land = sim(9999).landed;
  return sim(land - k).jumped;
}
const B = toFrames(FORGIVE.jumpBuffer);
ok(buffer(2), 'buffer: press 2 frames before landing jumps on landing');
ok(buffer(B - 1), `buffer: press ${B - 1} frames before landing jumps`);
ok(!buffer(B + 2), `buffer: press ${B + 2} frames before landing does not`);

// ---- wall-jump grace: cling, press away, Jump k frames later ----
const wall = grid((x, y) => (x === 40 || y >= 35 ? K.SOLID : K.EMPTY));
function grace(k) {
  const p = new Player('pip'); p.give('booties');
  const ctx = ctxOf(wall), step = driver(p, ctx);
  p.x = 40 * TILE - p.w; p.y = 15 * TILE; p.state = 'air';
  for (let f = 0; f < 20; f++) step({ right: true });
  if (p.state !== 'cling') return 'no-cling';
  step({ left: true }); // let go
  for (let f = 1; f < k; f++) step({ left: true });
  step({ left: true, jump: true });
  return p.vy < -300 && p.vx < 0;
}
const G = toFrames(FORGIVE.wallGrace);
ok(grace(1) === true, 'wall grace: kick 1 frame after letting go');
ok(grace(G) === true, `wall grace: kick ${G} frames (${FORGIVE.wallGrace * 1000} ms) after letting go`);
ok(grace(G + 2) !== true, `wall grace: no kick ${G + 2} frames after`);

// ---- hook magnet: hook d px from the hitbox edge ----
function magnet(d) {
  const p = new Player('pip'); p.give('floss');
  const hook = { x: 20 * TILE, y: 10 * TILE };
  const ctx = ctxOf(grid(() => K.EMPTY), { hooks: [hook] }), step = driver(p, ctx);
  p.x = hook.x + d; p.y = hook.y - p.h / 2; p.state = 'air'; p.vy = 0;
  p.prof = { ...p.P.fall, gUp: 0, gDown: 0 }; // hold still in the air for the test
  step({ use: true });
  return p.state === 'swing';
}
const M = FORGIVE.hookMagnet * TILE;
ok(magnet(M - 1), `hook magnet: grabs at ${M - 1} px`);
ok(!magnet(M + 4), `hook magnet: misses at ${M + 4} px`);
// buffered Use: press 5 frames before the hook comes in range
{
  const p = new Player('pip'); p.give('floss');
  const hook = { x: 20 * TILE, y: 10 * TILE };
  const ctx = ctxOf(grid(() => K.EMPTY), { hooks: [hook] }), step = driver(p, ctx);
  p.x = hook.x + M + 5 * 4.3 + 2; p.y = hook.y - p.h / 2; p.state = 'air'; p.vx = -260; p.prof = { ...p.P.fall, gUp: 0, gDown: 0, airSpeed: 260 };
  step({ use: true, left: true });
  let grabbed = false;
  for (let f = 0; f < 7; f++) { step({ left: true }); if (p.state === 'swing') { grabbed = true; break; } }
  ok(grabbed, 'hook magnet: Use pressed shortly before reaching range still grabs (buffer)');
}

// ---- corner nudge: head bump 7 px into a block's corner slides past ----
{
  const g = grid((x, y) => ((y === 10 && x === 20) || y >= 30 ? K.SOLID : K.EMPTY));
  const p = new Player('pip'), step = driver(p, ctxOf(g));
  p.x = 21 * TILE - 7; p.y = 12 * TILE; p.state = 'air'; p.vy = -700; p.prof = p.P.jump; p.cutDone = true;
  let passed = false;
  for (let f = 0; f < 20; f++) { step({}); if (p.y < 10 * TILE) { passed = true; break; } }
  ok(passed, 'corner nudge: 7 px overlap slides round the corner');
  const q = new Player('pip'), s2 = driver(q, ctxOf(g));
  q.x = 21 * TILE - 12; q.y = 12 * TILE; q.state = 'air'; q.vy = -700; q.prof = q.P.jump; q.cutDone = true;
  let p2 = false;
  for (let f = 0; f < 20; f++) { s2({}); if (q.y < 10 * TILE) { p2 = true; break; } }
  ok(!p2, 'corner nudge: 12 px overlap bumps');
}

// ---- each move fires only from its own input ----
{
  const g = floor;
  // variable height: tap vs hold
  const rise = (holdFrames) => { const p = new Player('pip'), step = driver(p, ctxOf(g)); p.x = 10 * TILE; p.y = 30 * TILE - p.h; p.state = 'ground'; const y0 = p.y; let top = y0; for (let f = 0; f < 80; f++) { step({ jump: f < holdFrames }); top = Math.min(top, p.y); } return (y0 - top) / TILE; };
  const tap = rise(1), full = rise(60);
  ok(tap < 1.6 && tap > 0.5, `variable height: a tap rises ${tap.toFixed(2)} tiles`);
  ok(Math.abs(full - 3) < 0.25, `variable height: a full hold rises ${full.toFixed(2)} tiles`);
  // flutter needs a fresh press: holding Jump through the apex does not flutter
  const flutter = (fresh) => { const p = new Player('pip'); p.give('feather'); const step = driver(p, ctxOf(g)); p.x = 10 * TILE; p.y = 30 * TILE - p.h; p.state = 'ground'; let top = p.y; const y0 = p.y; let apexF = -1; for (let f = 0; f < 120; f++) { let j = f < 18; if (fresh && apexF > 0 && f >= apexF + 3 && f < apexF + 13) j = true; step({ jump: j }); if (apexF < 0 && p.vy >= 0 && f > 3) apexF = f; top = Math.min(top, p.y); } return (y0 - top) / TILE; };
  ok(flutter(false) < 3.3, 'flutter: holding Jump through the apex does not flutter');
  ok(flutter(true) > 4.5, 'flutter: a fresh press in the air flutters');
  // glide: hold Jump while falling only with the Glider
  const fallSpeed = (items, holding) => { const p = new Player('pip'); items.forEach((i) => p.give(i)); const step = driver(p, ctxOf(grid(() => K.EMPTY))); p.x = 10 * TILE; p.y = 2 * TILE; p.state = 'air'; for (let f = 0; f < 60; f++) step({ jump: holding, right: true }); return p.vy; };
  ok(fallSpeed(['glider'], true) < 80, 'glide: holding Jump while falling glides');
  ok(fallSpeed(['glider'], false) > 500, 'glide: not holding Jump falls normally');
  ok(fallSpeed([], true) > 500, 'glide: no Glider, no glide');
  // ground-pound needs Down + a fresh Jump press in the air with the Thimble; Down alone does nothing
  const pound = (items, withJump) => { const p = new Player('pip'); items.forEach((i) => p.give(i)); const step = driver(p, ctxOf(g)); p.x = 10 * TILE; p.y = 20 * TILE; p.state = 'air'; step({ down: true }); step({ down: true, jump: withJump }); return p.state === 'pound'; };
  ok(pound(['thimble', 'feather'], true), 'pound: Down + Jump in the air pounds (and beats flutter)');
  ok(!pound(['thimble'], false), 'pound: Down alone does not');
  ok(!pound([], true), 'pound: no Thimble, no pound');
  // Hump: a quick Down+Jump is a normal jump; after 0.4 s crouched it is the huge leap
  const hump = (crouchF) => { const p = new Player('hump'); const step = driver(p, ctxOf(g)); p.x = 10 * TILE; p.y = 30 * TILE - p.h; p.state = 'ground'; for (let f = 0; f < crouchF; f++) step({ down: true }); step({ down: true, jump: true }); return p.prof === p.P.leap; };
  ok(!hump(5), "Hump: a quick Down + Jump isn't the huge leap");
  ok(hump(toFrames(MOVES.hugeLeap.crouchTime) + 1), 'Hump: crouched 0.4 s, Jump is the huge leap');
  // drop-through: Down + Jump on a one-way platform drops; on solid ground it jumps
  const ow = grid((x, y) => (y === 20 ? K.ONEWAY : y >= 30 ? K.SOLID : K.EMPTY));
  const p = new Player('pip'), step = driver(p, ctxOf(ow)); p.x = 10 * TILE; p.y = 20 * TILE - p.h; p.state = 'ground';
  step({ down: true }); step({ down: true, jump: true }); for (let f = 0; f < 20; f++) step({});
  ok(p.y > 20 * TILE, 'drop-through: Down + Jump drops through a one-way platform');
  // swap waits for the ground
  const s = new Player('pip'); s.trio = ['pip', 'duo']; const ss = driver(s, ctxOf(g)); s.x = 10 * TILE; s.y = 20 * TILE; s.state = 'air';
  ss({ swapNext: true }); ok(s.id === 'pip' && s.queuedSwap === 1, 'swap pressed in the air is queued');
  for (let f = 0; f < 120 && s.state !== 'ground'; f++) ss({});
  ss({}); ok(s.id === 'duo', 'queued swap happens on landing');
}

// ---- the stick cone ----
ok(stickDirs(0, 0.65).down, 'stick: straight down past 60% is down');
ok(!stickDirs(0, 0.55).down, 'stick: straight down under 60% is not down');
ok(!stickDirs(0.42, 0.65).down, 'stick: 33 degrees off down is not down');
ok(stickDirs(0.3, 0.7).down, 'stick: 23 degrees off down is down');
ok(!stickDirs(0.1, 0.1, 0.25).left && !stickDirs(0.1, 0.1, 0.25).down, 'pad stick: resting just off centre is nothing');

console.log(`feel-test: ${pass} passed, ${fail} failed`);
void CRICKETS;
process.exit(fail ? 1 : 0);
