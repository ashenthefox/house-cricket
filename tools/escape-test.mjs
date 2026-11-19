#!/usr/bin/env node
// [issue #4] Confirms check-world's trap candidates in the real sim: puts the cricket on a spot
// the checker says is stuck and searches the controls (walk, every jump height, wall kicks, the
// items' moves) for a way to stand somewhere that is not stuck, or to leave the room.
//   node tools/check-world.mjs --traps-json /tmp/traps.json   (writes the candidates)
//   node tools/escape-test.mjs /tmp/traps.json [--max 4000] [--only room]
//   node tools/escape-test.mjs --at room x y [--items a,b] [--cricket pip] [--bad x,y;x,y]
// A novelty search: every macro (8 frames of one input) whose end lands in a cell (half tiles,
// with the state) not seen before is kept and expanded. The search runs on cloned game states;
// a way out it finds is replayed from scratch (the exact sim) before it counts.
//   --setup "-+J -+j+D ..." macros played before the search (a pound, a kick), as the tool prints them
//   --good "room:x,y;..." only these cells (or another room) count as out
// Prints, per candidate: ESCAPES (with the inputs) or STUCK (cells explored, highest point).
import { readFileSync } from 'node:fs';
import { makeSim } from './sim.mjs';
import { Game } from '../game/src/game.js';
import { Input } from '../game/src/input.js';
import { World } from '../game/src/world.js';
import * as Mech from '../game/src/mechanics.js';
import { TILE } from '../game/data/movement.js';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const MAX = +opt('--max', 4000);

// ---- cloning a game state (the world and its rooms are shared: they never change) ----
function clone(v, memo = new Map()) {
  if (v === null || typeof v !== 'object') return v;
  if (v instanceof World) return v;
  if (v.constructor?.name === 'Room') return v;
  if (memo.has(v)) return memo.get(v);
  if (ArrayBuffer.isView(v)) { const c = v.slice(); memo.set(v, c); return c; }
  if (Array.isArray(v)) { const c = []; memo.set(v, c); for (const x of v) c.push(clone(x, memo)); return c; }
  if (v instanceof Set) { const c = new Set(); memo.set(v, c); for (const x of v) c.add(clone(x, memo)); return c; }
  if (v instanceof Map) { const c = new Map(); memo.set(v, c); for (const [k, x] of v) c.set(k, clone(x, memo)); return c; }
  const c = Object.create(Object.getPrototypeOf(v));
  memo.set(v, c);
  for (const k of Reflect.ownKeys(v)) {
    const d = Object.getOwnPropertyDescriptor(v, k);
    if ('value' in d) d.value = clone(d.value, memo);
    Object.defineProperty(c, k, d);
  }
  return c;
}
function cloneState(s) {
  const memo = new Map();
  const g = clone(s.game, memo), input = clone(s.input, memo);
  // the ctx closures point at the game they were made for: point them at the clone
  Object.assign(g.ctx, {
    emit: (t, d) => g.emit(t, d), breakUnder: (p) => g.breakUnder(p),
    surface: (p) => Mech.surfaceAt(g, p), liftAt: (p) => Mech.liftAt(g, p), springUnder: (p) => Mech.springUnder(g, p), dig: (p, dir) => Mech.dig(g, p, dir),
    unsafeTile: (tx, ty) => Mech.unsafeTile(g, tx, ty),
  });
  return { game: g, input, held: new Set(s.held) };
}

// ---- the macros: 8 frames of one input. Jump: 'off', 'press' (a fresh press, then held), 'keep' ----
const F = 8;
const DIRS = [null, 'ArrowLeft', 'ArrowRight'];
function macros(items) {
  const M = [];
  for (const d of DIRS) for (const j of ['off', 'press', 'keep']) M.push({ d, j });
  for (const d of DIRS) M.push({ d, j: 'off', down: true }, { d, j: 'press', down: true });
  if (items.includes('floss')) for (const d of DIRS) M.push({ d, j: 'off', use: 'tap' }, { d, j: 'keep', use: 'tap' });
  if (items.includes('band')) for (const d of DIRS) M.push({ d, j: 'off', use: 'charge' });
  return M;
}
function setKey(s, code, on) {
  if (on && !s.held.has(code)) { s.input.keyDown(code); s.held.add(code); }
  if (!on && s.held.has(code)) { s.input.keyUp(code); s.held.delete(code); }
}
function frame(s) { s.game.update(s.input.sample()); }
function apply(s, m, log) {
  const ev = (f, code, t) => log && log.push([f, code, t]);
  const f0 = s.f;
  for (const c of ['ArrowLeft', 'ArrowRight']) { const on = c === m.d; if (on !== s.held.has(c)) ev(f0, c, on ? 'down' : 'up'); setKey(s, c, on); }
  if (!!m.down !== s.held.has('ArrowDown')) ev(f0, 'ArrowDown', m.down ? 'down' : 'up');
  setKey(s, 'ArrowDown', !!m.down);
  if (m.j === 'off' && s.held.has('KeyZ')) { ev(f0, 'KeyZ', 'up'); setKey(s, 'KeyZ', false); }
  if (m.j === 'press') { if (s.held.has('KeyZ')) { ev(f0, 'KeyZ', 'up'); setKey(s, 'KeyZ', false); frame(s); s.f++; } ev(s.f, 'KeyZ', 'down'); setKey(s, 'KeyZ', true); }
  if (m.use === 'charge') {
    ev(s.f, 'KeyV', 'down'); setKey(s, 'KeyV', true);
    for (let i = 0; i < 40; i++) { frame(s); s.f++; }
    ev(s.f, 'KeyV', 'up'); setKey(s, 'KeyV', false);
  }
  for (let i = 0; i < F; i++) {
    if (m.use === 'tap' && i === 0) { ev(s.f, 'KeyV', 'down'); setKey(s, 'KeyV', true); }
    if (m.use === 'tap' && i === 3) { ev(s.f, 'KeyV', 'up'); setKey(s, 'KeyV', false); }
    frame(s); s.f++;
  }
}
const fmt = (pm) => `${pm.d ? pm.d.replace('Arrow', '') : '-'}${pm.j === 'press' ? '+J' : pm.j === 'keep' ? '+j' : ''}${pm.down ? '+D' : ''}${pm.use ? '+' + pm.use : ''}`;
function parseMacro(t) {
  const [d, ...fl] = t.split('+');
  return { d: d === '-' ? null : 'Arrow' + d, j: fl.includes('J') ? 'press' : fl.includes('j') ? 'keep' : 'off', down: fl.includes('D'), use: fl.includes('tap') ? 'tap' : fl.includes('charge') ? 'charge' : undefined };
}
const feet = (g) => { const p = g.player; return { tx: Math.floor(p.cx / TILE), ty: Math.floor((p.y + p.h - 1) / TILE) }; };

// One candidate: room, x, y (feet tile), items, cricket, bad (cells that do not count as out: "x,y").
export function escape(c) {
  const sim = makeSim({ modals: false });
  sim.game.startAt(c.room, c.x, c.y, { items: c.items || [], party: [c.cricket || 'pip'], rescued: c.rescued || [] });
  for (let i = 0; i < 30; i++) sim.step(); // settle
  if (c.prepare) c.prepare(sim); // (scripts: put the room in a state first, e.g. after a set piece)
  // --setup: macros (as this tool prints them) played first, e.g. to break a plug or kick a pebble
  const pre = (c.setup || []).map(parseMacro);
  const s0 = { game: sim.game, input: sim.input, held: new Set(), f: 0 };
  for (const m of pre) apply(s0, m);
  const room0 = sim.game.room.id;
  const bad = new Set(c.bad || []);
  const good = c.good ? new Set(c.good) : null;
  const pocketRooms = new Set([room0, ...(c.bad || []).filter((k) => k.includes(':')).map((k) => k.split(':')[0])]);
  // bad cells: "x,y" (the start room) or "room:x,y"
  const out = (g) => {
    const p = g.player;
    if (p.state !== 'ground' && p.state !== 'cling') return null;
    const { tx, ty } = feet(g);
    if (tx < 0 || ty < 0 || tx >= g.room.tw || ty >= g.room.th) return null; // still crossing an edge
    if (bad.has(`${g.room.id}:${tx},${ty}`) || (g.room.id === room0 && bad.has(`${tx},${ty}`))) return null;
    // with a `good` list (check-world's spots that do get out), only those count, or a room the pocket is not in
    if (good && !good.has(`${g.room.id}:${tx},${ty}`) && pocketRooms.has(g.room.id)) return null;
    return `stands at ${g.room.id === room0 ? '' : g.room.id + ' '}(${tx},${ty}) (${p.state})`;
  };
  const M = macros(c.items || []);
  const root = { game: sim.game, input: sim.input, held: s0.held, f: s0.f, path: [] };
  const seen = new Set();
  const key = (g) => { const p = g.player; return `${Math.round(p.cx / (TILE / 2))},${Math.round((p.y + p.h) / (TILE / 2))},${p.state},${g.player.id}`; };
  seen.add(key(root.game));
  let q = [root], tried = 0, top = Infinity;
  while (q.length && tried < MAX) {
    const next = [];
    for (const s of q) {
      for (const m of M) {
        if (tried >= MAX) break;
        tried++;
        const t = cloneState(s);
        t.f = s.f; t.path = [...s.path, m];
        let why = null;
        try { apply(t, m); why = out(t.game); } catch (e) { continue; }
        top = Math.min(top, feet(t.game).ty);
        if (why) {
          // the exact sim: replay the inputs from a fresh start
          const v = makeSim({ modals: false });
          v.game.startAt(c.room, c.x, c.y, { items: c.items || [], party: [c.cricket || 'pip'], rescued: c.rescued || [] });
          for (let i = 0; i < 30; i++) v.step();
          if (c.prepare) c.prepare(v);
          const vs = { game: v.game, input: v.input, held: new Set(), f: 0 };
          const log = [];
          for (const pm of pre) apply(vs, pm, log);
          let vwhy = null;
          for (const pm of t.path) { apply(vs, pm, log); vwhy = vwhy || out(vs.game); }
          if (vwhy) return { ok: true, why: vwhy, tried, path: t.path.map(fmt).join(' ') };
        }
        const k = key(t.game);
        if (seen.has(k)) continue;
        seen.add(k);
        next.push(t);
      }
    }
    q = next;
  }
  return { ok: false, tried, cells: seen.size, top };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let cands;
  if (args[0] === '--at') {
    const [, room, x, y] = args;
    const bad = (opt('--bad', '') || '').split(';').filter(Boolean);
    const setup = (opt('--setup', '') || '').split(' ').filter(Boolean);
    const good = opt('--good', null);
    cands = [{ label: `${room} (${x},${y})`, room, x: +x, y: +y, items: (opt('--items', '') || '').split(',').filter(Boolean), cricket: opt('--cricket', 'pip'), bad, setup, good: good ? good.split(';') : undefined }];
  } else {
    cands = JSON.parse(readFileSync(args[0], 'utf8'));
    const only = opt('--only', null);
    if (only) cands = cands.filter((c) => c.room === only || c.label.includes(only));
  }
  for (const c of cands) {
    const t0 = Date.now();
    const r = escape(c);
    console.log(`${r.ok ? 'ESCAPES' : 'STUCK  '} ${c.label} [${c.cricket || 'pip'}; ${(c.items || []).join(',') || 'no items'}]: ${r.ok ? `${r.why} after ${r.path}` : `${r.cells} states, highest row ${r.top}`} (${r.tried} tries, ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  }
}
