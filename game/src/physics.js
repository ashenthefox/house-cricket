// AABB vs tile grid, one-way platforms, walls, forgiveness helpers, and the launch
// profiles derived from data/movement.js. No DOM: node (gen-reach, check-world, the
// headless sim) imports this directly.
import { TILE, DT, JUMP, RUN_SPEED, SPEED_GAP_STEP, MOVES, FEEL, FORGIVE } from '../data/movement.js';

// ---- tile kinds -------------------------------------------------------------
export const K = {
  EMPTY: 0, SOLID: 1, SLICK: 2, ONEWAY: 3, CEREAL: 4, CRACK: 5, WATER: 6, HAZARD: 7, SOIL: 8,
  PROP: 9, // [fixer] a solid prop drawn by mech-draw, not the platform painter (Duo's shove blocks); never clingable
};
// ASCII legend (see design/ENGINE_NOTES.md). Entity markers are handled by world.js.
export const CHAR_KIND = {
  '.': K.EMPTY, ' ': K.EMPTY,
  '#': K.SOLID,   // ordinary wall/floor; clingable with the Tape Booties
  'G': K.SLICK,   // glass/porcelain: solid but never clingable
  '=': K.ONEWAY,  // one-way platform: stand on it, jump up through it, Down+Jump drops through
  'C': K.CEREAL,  // cereal wall: solid; a ground-pound landing on it breaks the whole connected clump
  '%': K.CRACK,   // crack: solid for everyone but Mote (Tiny)
  '~': K.WATER,   // water: a pit without the Raft; the surface is a floor with it
  '^': K.HAZARD,  // tacks/thorns: hurt and put you back on the last solid ground
  's': K.SOIL,    // soft soil: solid (Digby's dig is a later perk)
};

const EPS = 1e-6;

export function solidSide(kind, body) {
  return kind === K.SOLID || kind === K.SLICK || kind === K.CEREAL || kind === K.SOIL || kind === K.PROP ||
    (kind === K.CRACK && !body.tiny);
}
export function clingable(kind) {
  return kind === K.SOLID || kind === K.CEREAL || kind === K.SOIL;
}

// A grid: w x h tiles, data Uint8Array, plus oob(tx, ty) for outside tiles.
export class Grid {
  constructor(w, h, data, oob) {
    this.w = w; this.h = h; this.data = data;
    this.oob = oob || ((tx, ty) => (ty >= h ? K.EMPTY : K.SOLID));
  }
  at(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return this.oob(tx, ty);
    return this.data[ty * this.w + tx];
  }
  set(tx, ty, k) { if (tx >= 0 && ty >= 0 && tx < this.w && ty < this.h) this.data[ty * this.w + tx] = k; }
  isSurface(tx, ty) { return this.at(tx, ty) === K.WATER && this.at(tx, ty - 1) !== K.WATER; }
}

function solidDown(grid, tx, ty, body) {
  const k = grid.at(tx, ty);
  if (solidSide(k, body)) return true;
  if (k === K.ONEWAY) return !body.dropping;
  if (k === K.WATER) return !!body.raft && grid.isSurface(tx, ty);
  return false;
}

const colSpan = (b) => [Math.floor(b.x / TILE), Math.floor((b.x + b.w - EPS) / TILE)];
const rowSpan = (b) => [Math.floor(b.y / TILE), Math.floor((b.y + b.h - EPS) / TILE)];

function columnBlocked(grid, col, b) {
  const [r0, r1] = rowSpan(b);
  for (let r = r0; r <= r1; r++) if (solidSide(grid.at(col, r), b)) return r;
  return -1;
}
function rowBlockedUp(grid, row, b) {
  const [c0, c1] = colSpan(b);
  const out = [];
  for (let c = c0; c <= c1; c++) if (solidSide(grid.at(c, row), b)) out.push(c);
  return out;
}
export function boxFree(grid, b) {
  const [c0, c1] = colSpan(b), [r0, r1] = rowSpan(b);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (solidSide(grid.at(c, r), b)) return false;
  return true;
}

// Move horizontally. Returns {hit, dir}. With b.lip (in the air), a ledge whose top is
// within cornerNudge px above the feet pops you up onto it instead of stopping you.
export function moveX(grid, b, dx) {
  if (dx === 0) return { hit: false };
  const dir = Math.sign(dx);
  const edge = dir > 0 ? b.x + b.w : b.x;
  const target = edge + dx;
  const c0 = dir > 0 ? Math.floor((edge + EPS) / TILE) : Math.floor((edge - EPS) / TILE);
  const c1 = dir > 0 ? Math.floor((target - EPS) / TILE) : Math.floor(target / TILE);
  for (let c = c0; dir > 0 ? c <= c1 : c >= c1; c += dir) {
    const r = columnBlocked(grid, c, b);
    if (r < 0) continue;
    // ledge lip nudge
    if (b.lip) {
      const top = r * TILE;
      const feet = b.y + b.h;
      let onlyBottom = true;
      for (let rr = Math.floor(b.y / TILE); rr < r; rr++) if (solidSide(grid.at(c, rr), b)) onlyBottom = false;
      if (onlyBottom && feet - top <= FORGIVE.cornerNudge + EPS && feet - top > 0) {
        const test = { ...b, y: top - b.h };
        if (boxFree(grid, test)) { b.y = top - b.h; b.lipped = true; return moveX(grid, b, dx); }
      }
    }
    if (dir > 0) b.x = c * TILE - b.w; else b.x = (c + 1) * TILE;
    return { hit: true, dir, col: c };
  }
  b.x += dx;
  return { hit: false };
}

// Move vertically. Returns {landed, ceiling, row}. Head bumps nudge round corners.
export function moveY(grid, b, dy) {
  if (dy === 0) return {};
  if (dy > 0) {
    const bottom = b.y + b.h, target = bottom + dy;
    const r0 = Math.ceil((bottom - 1e-4) / TILE), r1 = Math.floor((target - EPS) / TILE);
    const [c0, c1] = colSpan(b);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (solidDown(grid, c, r, b)) { b.y = r * TILE - b.h; return { landed: true, row: r }; }
      }
    }
    b.y += dy;
    return {};
  }
  const top = b.y, target = top + dy;
  const r0 = Math.floor((top + 1e-4) / TILE) - 1, r1 = Math.floor((target + EPS) / TILE);
  for (let r = r0; r >= r1; r--) {
    const blocked = rowBlockedUp(grid, r, b);
    if (!blocked.length) continue;
    // corner nudge: blocked only at one end and overlapping by <= cornerNudge px
    const [c0, c1] = colSpan(b);
    const n = FORGIVE.cornerNudge;
    if (b.nudge !== false) {
      const allLeft = blocked.every((c) => c === c0) && c0 !== c1;
      const allRight = blocked.every((c) => c === c1) && c0 !== c1;
      if (allLeft) {
        const over = (c0 + 1) * TILE - b.x;
        if (over <= n) { const t = { ...b, x: b.x + over, y: (r + 1) * TILE }; if (boxFree(grid, t)) { b.x += over; return moveY(grid, b, dy); } }
      } else if (allRight) {
        const over = b.x + b.w - c1 * TILE;
        if (over <= n) { const t = { ...b, x: b.x - over, y: (r + 1) * TILE }; if (boxFree(grid, t)) { b.x -= over; return moveY(grid, b, dy); } }
      }
    }
    b.y = (r + 1) * TILE;
    return { ceiling: true, row: r };
  }
  b.y += dy;
  return {};
}

// Is the body standing on something? Returns the list of supporting tiles (or null).
export function groundUnder(grid, b) {
  const feet = b.y + b.h;
  const r = Math.round(feet / TILE);
  if (Math.abs(feet - r * TILE) > 0.01) return null;
  const [c0, c1] = colSpan(b);
  const out = [];
  for (let c = c0; c <= c1; c++) if (solidDown(grid, c, r, b)) out.push({ tx: c, ty: r, kind: grid.at(c, r) });
  return out.length ? out : null;
}

// Wall directly beside the body on side dir (-1 left, +1 right): returns {kind, cling} or null.
export function wallBeside(grid, b, dir) {
  const edge = dir > 0 ? b.x + b.w : b.x;
  const c = Math.round(edge / TILE);
  if (Math.abs(edge - c * TILE) > 0.01) return null;
  const col = dir > 0 ? c : c - 1;
  // use the middle rows of the body so a lip at the feet doesn't count as a wall
  const ys = [b.y + 2, b.y + b.h * 0.5, b.y + b.h - 3];
  let anyCling = false, any = null;
  for (const y of ys) {
    const k = grid.at(col, Math.floor(y / TILE));
    if (solidSide(k, b)) { any = k; if (clingable(k)) anyCling = true; }
  }
  // cling needs wall along the whole upper body (no clinging by your toes)
  const kTop = grid.at(col, Math.floor((b.y + 2) / TILE));
  return any == null ? null : { kind: any, cling: anyCling && clingable(kTop) };
}

export function overlapKinds(grid, b) {
  const [c0, c1] = colSpan(b), [r0, r1] = rowSpan(b);
  const set = new Set();
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) set.add(grid.at(c, r));
  return set;
}

// Flood-fill a connected clump of `kind` from (tx,ty); returns the tile list.
export function clump(grid, tx, ty, kind) {
  const seen = new Set(), out = [], stack = [[tx, ty]];
  while (stack.length) {
    const [x, y] = stack.pop();
    const key = y * 10000 + x;
    if (seen.has(key)) continue;
    seen.add(key);
    if (x < 0 || y < 0 || x >= grid.w || y >= grid.h || grid.at(x, y) !== kind) continue;
    out.push([x, y]);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return out;
}

// ---- launch profiles ---------------------------------------------------------
// A profile is what a launch sets: initial upward speed, gravity up/down, air speed.
function fallTime(h, g, vmax) {
  const d1 = (vmax * vmax) / (2 * g);
  if (d1 >= h) return Math.sqrt((2 * h) / g);
  return vmax / g + (h - d1) / vmax;
}
function airTime(h, gUp, fallMult, vmax) {
  return Math.sqrt((2 * h) / gUp) + fallTime(h, gUp * fallMult, vmax);
}
// Solve gUp so that a jump of height h stays airborne for time T.
function solveGravity(h, T, fallMult, vmax) {
  let lo = 50, hi = 50000;
  for (let i = 0; i < 80; i++) {
    const mid = Math.sqrt(lo * hi);
    if (airTime(h, mid, fallMult, vmax) > T) lo = mid; else hi = mid;
  }
  return Math.sqrt(lo * hi);
}
// Discrete-step correction: a frame-stepped jump overshoots/undershoots slightly, so we
// aim the analytic solve a hair off. (gen-reach checks the real stepped result.)
const RISE_FUDGE = 1.0;

export function jumpProfile(riseTiles, gapTiles, hSpeed, vmax, hitW = FEEL.hitbox.w) {
  const h = riseTiles * TILE * RISE_FUDGE;
  const travel = gapTiles * TILE - hitW;
  const T = travel / hSpeed;
  const gUp = solveGravity(h, T, FEEL.fallMult, vmax);
  return { v0: Math.sqrt(2 * gUp * h), gUp, gDown: gUp * FEEL.fallMult, airSpeed: hSpeed, cut: true };
}

export function runSpeedPx(spd) { return (RUN_SPEED[spd] ?? RUN_SPEED[3]) * TILE; }

// Every profile a cricket can launch with, from its stats.
export function makeProfiles(stats) {
  const run = runSpeedPx(stats.spd);
  const vmax = FEEL.maxFall[stats.wt] ?? FEEL.maxFall[3];
  const j = JUMP[stats.jmp] ?? JUMP[3];
  const gap = j.gap + SPEED_GAP_STEP * (stats.spd - 3);
  const jump = jumpProfile(j.rise, gap, run, vmax);
  const leap = jumpProfile(MOVES.hugeLeap.rise, MOVES.hugeLeap.gap + SPEED_GAP_STEP * (stats.spd - 3), run, vmax);
  // super-jump: fixed apex time, air speed solved for the gap
  const sj = MOVES.superJump;
  const sh = sj.rise * TILE;
  const sgUp = (2 * sh) / (sj.apexTime * sj.apexTime);
  const sT = airTime(sh, sgUp, FEEL.fallMult, vmax);
  const sup = { v0: Math.sqrt(2 * sgUp * sh), gUp: sgUp, gDown: sgUp * FEEL.fallMult, airSpeed: (sj.gap * TILE - FEEL.hitbox.w) / sT, cut: false };
  // wall-kick: 2 up, 2 out by the apex; uses the cricket's own jump gravity
  const wh = MOVES.wallJump.rise * TILE;
  const wv0 = Math.sqrt(2 * jump.gUp * wh);
  const wtUp = wv0 / jump.gUp;
  const wall = { v0: wv0, gUp: jump.gUp, gDown: jump.gDown, airSpeed: Math.max(run, (MOVES.wallJump.out * TILE) / wtUp), cut: false,
    outSpeed: (MOVES.wallJump.out * TILE) / wtUp, lockFrames: Math.round(wtUp / DT) };
  const flutter = { v0: Math.sqrt(2 * jump.gUp * MOVES.flutter.rise * TILE), gUp: jump.gUp, gDown: jump.gDown, airSpeed: run, cut: false };
  const fall = { v0: 0, gUp: jump.gUp, gDown: jump.gDown, airSpeed: run, cut: false };
  return { run, vmax, jump, leap, sup, wall, flutter, fall };
}

// Integrate one step of vertical motion under constant gravity (exact for constant g).
export function stepVy(vy, g, vmax) {
  if (vy >= vmax) return { dy: vmax * DT, vy: vmax };
  if (g > 0 && vy + g * DT > vmax) {
    const t1 = (vmax - vy) / g;
    return { dy: vy * t1 + 0.5 * g * t1 * t1 + vmax * (DT - t1), vy: vmax };
  }
  return { dy: vy * DT + 0.5 * g * DT * DT, vy: vy + g * DT };
}
