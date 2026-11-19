// [issue 11] Debug rewind: Backspace jumps the game back about five seconds (main.js turns it on
// with ?rewind in the URL; nothing else does). No DOM, so node tools can test it
// (tools/rewind-test.mjs).
//
// How: a ring buffer of whole-simulation snapshots. Every EVERY game frames the buffer deep-copies
// the Game (the player, enemies, the boss and its script state, mechanics, room state, progress
// and meta flags, toasts and the item card, the camera, the fx list, every seeded generator part
// way through its sequence) plus whatever the caller adds (main.js: the meta layer's pending
// rescue card). A rewind copies one back INTO the live Game object, so closures that hold the
// game (game.ctx, the world's tile hook) keep working, and references back to the game stay it.
//   - shared, never copied: the World (rooms, entities: read-only after load), the boss tables,
//     frozen objects (module constants: world.js constant() deep-freezes them, so code that
//     compares against them by identity still finds them after a rewind), functions, and anything
//     that isn't a plain object, array, Set, Map or typed array (images, canvases, audio nodes:
//     render and audio caches, not game state);
//   - so sim state must never live in a closure: a function in the state is shared as it is, and
//     would go on writing to the original (tools/rewind-test.mjs checks for any);
//   - copied as generators: seeded() / rngFrom() functions (they expose rngState()).
// Snapshots never touch a save slot: a rewind writes nothing and a save already written stays.
import { rngFrom } from './world.js';
import { LAIRS } from '../data/house.js';
import { BOSSES } from './bosses/index.js';

export const EVERY = 30;          // frames between snapshots
export const KEEP = 6 * 60 + 30;  // frames of history kept (a little over 6 s)
export const BACK = 300;          // a rewind goes back at least this far (5 s), or as far as it can

const shared = new WeakMap();     // object -> id (the digest names shared objects by id)
const marked = new WeakSet();
let nextId = 1;
function markShared(root) {
  if (!root || typeof root !== 'object' || marked.has(root)) return;
  marked.add(root);
  const stack = [root];
  while (stack.length) {
    const v = stack.pop();
    if (shared.has(v)) continue;
    shared.set(v, nextId++);
    const kids = v instanceof Map ? [...v.keys(), ...v.values()] : v instanceof Set ? [...v] : ArrayBuffer.isView(v) ? [] : Object.values(v);
    for (const k of kids) if (k && typeof k === 'object' && !shared.has(k)) stack.push(k);
  }
}
export const isShared = (v) => shared.has(v) || (typeof v === 'object' && v !== null && Object.isFrozen(v));
export function markStatics(game) { markShared(game.world); markShared(LAIRS); markShared(BOSSES); }

const PLAIN = new Set(['[object Object]', '[object Array]', '[object Set]', '[object Map]']);
const copyable = (v) => PLAIN.has(Object.prototype.toString.call(v)) || (ArrayBuffer.isView(v) && !(v instanceof DataView));

// A deep copy that keeps prototypes, cycles and shared references. memo: Map(original -> copy).
export function copy(v, memo) {
  if (typeof v === 'function') {
    if (!v.rngState) return v;
    if (!memo.has(v)) memo.set(v, rngFrom(v.rngState()));
    return memo.get(v);
  }
  if (v === null || typeof v !== 'object') return v;
  if (memo.has(v)) return memo.get(v);
  if (isShared(v) || !copyable(v)) return v;
  let c;
  if (ArrayBuffer.isView(v)) { c = v.slice(); memo.set(v, c); return c; }
  if (v instanceof Set) { c = new Set(); memo.set(v, c); for (const x of v) c.add(copy(x, memo)); return c; }
  if (v instanceof Map) { c = new Map(); memo.set(v, c); for (const [k, x] of v) c.set(copy(k, memo), copy(x, memo)); return c; }
  if (Array.isArray(v)) { c = new Array(v.length); memo.set(v, c); for (let i = 0; i < v.length; i++) c[i] = copy(v[i], memo); return c; }
  c = Object.create(Object.getPrototypeOf(v)); memo.set(v, c);
  for (const k of Reflect.ownKeys(v)) {
    const d = Object.getOwnPropertyDescriptor(v, k);
    if ('value' in d) d.value = copy(d.value, memo);
    Object.defineProperty(c, k, d);
  }
  return c;
}

// A snapshot of the game (and `extra`, the caller's own state that must go back with it).
export function snapshot(game, extra = null) {
  markStatics(game);
  const memo = new Map([[game, game]]);
  const props = {};
  for (const k of Reflect.ownKeys(game)) props[k] = copy(game[k], memo);
  return { frame: game.frame, props, extra: copy(extra, memo) };
}

// Put a snapshot back into the live game; returns a fresh copy of its `extra`. The snapshot stays
// usable (it is copied again, never handed out). gridVersion only keys the renderer's platform
// cache: it moves on, never back, so the cache redraws the restored tiles.
export function restore(game, snap) {
  const memo = new Map([[game, game]]);
  const gv = game.gridVersion || 0;
  const props = copy(snap.props, memo), extra = copy(snap.extra, memo);
  for (const k of Reflect.ownKeys(game)) if (!(k in props)) delete game[k];
  Object.assign(game, props);
  game.gridVersion = Math.max(gv, game.gridVersion || 0) + 1;
  for (const e of game.fx || []) { e._fx = true; e._pl = true; } // the renderer has already shown these
  return extra;
}

// The ring buffer: record() after every game step, rewind() on Backspace.
export class Rewinder {
  constructor({ every = EVERY, keep = KEEP } = {}) { this.every = every; this.keep = keep; this.reset(null); }
  reset(game) { this.game = game; this.snaps = []; }
  // extra: a function returning the caller's state to snapshot with the game (called only when one is taken)
  record(game, extra) {
    if (game !== this.game) this.reset(game);
    const last = this.snaps[this.snaps.length - 1];
    if (last && game.frame < last.frame) this.reset(game); // the clock went back: a new run on this game
    if (last && game.frame - last.frame < this.every) return false;
    this.snaps.push(snapshot(game, extra ? extra() : null));
    while (this.snaps.length > 1 && this.snaps[1].frame <= game.frame - this.keep) this.snaps.shift();
    return true;
  }
  // Back to the newest snapshot at least `back` frames old (else the oldest one there is).
  // Returns { frames: how far it went, extra } or null when there is no older history (nothing changes).
  rewind(game, back = BACK) {
    if (game !== this.game || !this.snaps.length) return null;
    let i = this.snaps.length - 1;
    while (i > 0 && this.snaps[i].frame > game.frame - back) i--;
    const snap = this.snaps[i], frames = game.frame - snap.frame;
    if (frames <= 0) return null;
    this.snaps.length = i + 1; // the later ones are gone; this one stays (the game is at it now)
    return { frames, extra: restore(game, snap) };
  }
}

// A canonical text of the state (tools/rewind-test.mjs compares two runs with it). Shared objects
// by the order they are met (markStatics(game) first, in both runs); generators by their state; gridVersion and the renderer's marks (_fx, _pl) left out.
const SKIP = new Set(['gridVersion', '_fx', '_pl']);
export function digest(root) {
  const seen = new Map(), sh = new Map(); let n = 0;
  const out = [];
  const walk = (v) => {
    if (typeof v === 'function') { out.push(v.rngState ? `rng(${v.rngState()})` : 'fn'); return; }
    if (v === null || typeof v !== 'object') { out.push(typeof v === 'number' ? (Object.is(v, -0) ? '-0' : String(v)) : JSON.stringify(v) ?? 'undefined'); return; }
    if (isShared(v)) { if (!sh.has(v)) sh.set(v, sh.size); out.push(`S${sh.get(v)}`); return; } // numbered as met: two games compare
    if (seen.has(v)) { out.push(`@${seen.get(v)}`); return; }
    seen.set(v, n++);
    if (!copyable(v)) { out.push(`<${Object.prototype.toString.call(v)}>`); return; }
    if (ArrayBuffer.isView(v)) { out.push(`[${Array.from(v).join(',')}]`); return; }
    if (v instanceof Set || v instanceof Map || Array.isArray(v)) {
      out.push(v instanceof Set ? 'Set[' : v instanceof Map ? 'Map[' : '[');
      for (const x of (v instanceof Map ? [].concat(...v) : v)) { walk(x); out.push(','); }
      out.push(']'); return;
    }
    out.push(`${v.constructor?.name || ''}{`);
    for (const k of Reflect.ownKeys(v)) { if (SKIP.has(k)) continue; out.push(`${String(k)}:`); walk(v[k]); out.push(','); }
    out.push('}');
  };
  walk(root);
  return out.join('');
}
