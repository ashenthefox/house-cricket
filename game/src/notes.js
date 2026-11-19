// [issue 9] Tutorial notes on the path: where a tip's paper note stands, and whether it still stands.
// Pure (no DOM): the game (buildEntities, the tank's script notes), the renderer, the HUD card
// (ui.js) and tools/sign-check.mjs share it.
//   A sign entity: { type: 'sign', x, y, w, text, nx?, kind?: 'note' | 'card', at?: 'low' }
//   x..x+w-1 is its trigger span (tile columns), y its row. The note stands at column nx (else the
//   span's centre column) on the first standable tile at the sign's row or one below (never water
//   or a hazard; a one-way platform counts; a solid tile at the row holds it on top). It steps up to
//   2 columns sideways (within the span) to keep clear of a save crack, checkpoint, hide spot, door,
//   lair door, item or cage. The ground is read from the live grid: if it breaks or opens later, the
//   note retires (noteLive()).
import { TILE } from '../data/movement.js';
import { K } from './physics.js';

const T = TILE;
export const STANDABLE = new Set([K.SOLID, K.SLICK, K.CEREAL, K.CRACK, K.SOIL, K.PROP, K.ONEWAY]);
const BLOCKS = new Set([K.SOLID, K.SLICK, K.CEREAL, K.CRACK, K.SOIL, K.PROP]); // the note's own cell must not be one
const STEPS = [0, 1, -1, 2, -2];

// The timing of the card (sim frames, 60 a second) and the ranges (tiles): design, HUD, Tutorial notes.
export const NOTE = Object.freeze({
  appear: 2, stay: 3,      // tiles from the note: it shows inside `appear`, stays until he's `stay` past (hysteresis)
  dwell: 9,                // 0.15 s in range before it shows (at once if he's standing still)
  minShow: 150,            // shown at least 2.5 s
  linger: 24,              // out of range this long (0.4 s), then it fades
  fadeIn: 9,               // 150 ms (CSS): "fully shown" starts after it
  read: 90,                // fully shown 1.5 s: read
});

// Floor props a note keeps clear of: [{x0, x1, y0, y1}] in tiles (the rows they stand in).
export function floorProps(entities) {
  const out = [];
  for (const e of entities || []) {
    const w = e.w || 1;
    switch (e.type) {
      case 'save': case 'item': case 'cage': out.push({ type: e.type, x0: e.x, x1: e.x, y0: e.y, y1: e.y }); break;
      case 'checkpoint': case 'door': case 'lair': out.push({ type: e.type, x0: e.x, x1: e.x + (e.type === 'checkpoint' ? 0 : w - 1), y0: e.y - 1, y1: e.y }); break;
      case 'hide': case 'hideSmall': out.push({ type: e.type, x0: e.x, x1: e.x + w - 1, y0: e.y, y1: e.y }); break;
      default:
    }
  }
  return out;
}

// The ground under column tx for a sign on row y: {gy} or {err}. at(x, y) -> tile kind.
export function groundAt(at, tx, y) {
  for (let dy = 0; dy <= 1; dy++) {
    const k = at(tx, y + dy);
    if (k === K.WATER) return { err: 'water' };
    if (k === K.HAZARD) return { err: 'hazard' };
    if (STANDABLE.has(k)) {
      if (BLOCKS.has(at(tx, y + dy - 1))) return { err: 'buried' };
      return { gy: y + dy };
    }
  }
  return { err: 'floats' };
}

const crowds = (props, tx, gy) => props.find((p) => tx >= p.x0 && tx <= p.x1 && p.y1 >= gy - 2 && p.y0 <= gy);

// Where the note of sign entity e stands: {tx, gy, x, y (px: the column's middle, the ground's top), step}
// or {err, tx}. at(x, y) -> tile kind; props: floorProps(...).
export function anchorNote(e, at, props = []) {
  const w = e.w || 4, x0 = e.x, x1 = e.x + w - 1;
  const base = e.nx ?? Math.floor(e.x + w / 2);
  let first = null;
  for (const d of STEPS) {
    const tx = base + d;
    if (tx < x0 || tx > x1) continue;
    const g = groundAt(at, tx, e.y);
    if (g.err) { if (d === 0) first = { err: g.err, tx }; continue; }
    if (crowds(props, tx, g.gy)) { if (d === 0) first = { err: 'crowded', tx }; continue; }
    if (d !== 0 && first?.err !== 'crowded') break; // only a floor prop moves the note; bad ground is a data fix
    return { tx, gy: g.gy, x: (tx + 0.5) * T, y: g.gy * T, step: d };
  }
  return first || { err: 'floats', tx: base };
}

// A game sign (game.signs) from a sign entity. key: the read-set key (room:x,y; a script tip's text id).
// grid: the live grid; pristine: the room's unbroken grid (a note anchors where its ground was).
export function makeSign(e, key, grid, pristine, props) {
  const kind = e.kind === 'card' ? 'card' : 'note';
  const s = { x: e.x * T, y: e.y * T, w: (e.w || 4) * T, text: e.text, key, kind, at: e.at || null };
  if (kind === 'note') {
    const at = (x, y) => { const v = grid.at(x, y); return v === K.EMPTY && pristine ? pristine.at(x, y) : v; };
    const a = anchorNote(e, at, props);
    if (!a.err) Object.assign(s, { tx: a.tx, gy: a.gy, nx: a.x, ny: a.y });
    else s.bad = a.err;
  }
  return s;
}

// Does the note still stand (its ground not broken or opened)?
export const noteLive = (game, s) => s.kind === 'note' && s.gy != null && STANDABLE.has(game.grid.at(s.tx, s.gy));

// A note's stable tilt (radians) and which way its corner lifts, from its position.
export function noteTilt(s) {
  let h = (s.tx * 73856093) ^ (s.gy * 19349663); h = (h ^ (h >>> 13)) >>> 0;
  return { tilt: ((h % 1000) / 1000 - 0.5) * 0.24, flip: h & 1 ? 1 : -1 };
}
