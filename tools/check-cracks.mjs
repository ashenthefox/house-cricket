#!/usr/bin/env node
// [cracks] Every save crack can be left on foot (no Shelly's Post).
//
// A crack is where Continue, the Carrier's "Back" (game.returnCrack) and a zone-complete card's
// "Return to the Carrier" (meta.js lairCrack) put you, so a crack you can't walk away from is a
// soft-lock. For every save crack in the house (zones 1-10, the Hall/stairwell/chimney links and
// the Dragon's Lair) and every state in which a player can first stand there, the weakest-stats
// reach graph (check-world's model, house-wide) must get from the crack to
//   (a) the zone's other crack or its start (link areas: any other crack or zone start), and
//   (b) onward progress: the zone's item or rescue while the zone is unfinished, else the start
//       room of a zone the prerequisite graph lets you enter next (all ten home: no target).
// States: every minimal entry state of the zone (data/zones.js exploreRoutes, minimal under
// inclusion), from which the crack's own first-reach state is found (the zone's rooms only, then
// each extra item / switch / rescue / broken cereal / opened side gate is dropped while the crack
// stays reachable without it), and the state right after the zone's rescue (the same, minimal for
// reaching the boss, plus the cricket and what the win sets). Link-area cracks are checked in every
// zone's entry and post-rescue state in which they can be reached.
//
// Model (check-world's, with these differences): house-wide nodes (column buckets, early exit);
// one-way platforms are standable and jumped up through, and Down+Jump drops through them; broken
// cereal is per clump (with the Thimble a clump breaks when you stand on it; until then it is solid
// from below and from the side); lair doors with `to` are edges (Up at the door: the arena); door
// entities are edges one way; the wall kick from a cling keeps its full rise (2) in the weakest pass
// (all crickets kick the same and the cling node is a tile under the highest real cling) but never
// climbs a single wall (a kick goes away from it: real sim); with the Raft you can wade along a
// water's bottom; a spring bounce can end in a glide; a gecko's fight counts as won once you are
// in its arena; the weakest pass's jump, flutter and super-jump are measured (below). A zone entered
// through a cereal link starts with it broken. Shelly's Post and the Carrier are never used.
//
//   node tools/check-cracks.mjs [--pass weakest|strongest|pip] [--zone n] [--verbose]
// Exit 1 if a crack fails (a) or (b) in any state. (~2-3 min; importing it with CRACKS_LIB=1 set only
// builds the model and exports `_dbg`, for scratch debugging.)
import { World } from '../game/src/world.js';
import { K } from '../game/src/physics.js';
import { ZONES } from '../game/data/rooms/index.js';
import { ZONE_INFO, PREREQ, exploreRoutes, canEnter } from '../game/data/zones.js';
import { LINKS as PLAN_LINKS } from '../game/data/house.js';
import { REACH } from '../game/data/reach.js';
import { MOVES, SCREEN_W, SCREEN_H } from '../game/data/movement.js';
import { TYPES } from '../game/src/enemies.js';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const verbose = args.includes('--verbose');
const PASS = opt('--pass', 'weakest');
const onlyZone = opt('--zone', null);

const HOUSE = ZONES.filter((z) => z.n !== 0 && !(z.n >= 98));
const world = new World(HOUSE);
const ROOMS = Object.values(world.rooms);
const HIT_W = 0.75;
const MAIN = Object.values(ZONE_INFO).filter((z) => typeof z.n === 'number' && z.n >= 1 && z.n <= 10);
const ZONE_ITEMS = new Set(MAIN.map((z) => z.item).filter(Boolean));
const ALL_CRICKETS = MAIN.map((z) => z.cricket);
const BOSS_SWITCHES = { frost: ['lashes-stairs'] }; // switches a win sets (lashes.js)

function passStats(pass) {
  const c = REACH.crickets;
  if (pass === 'weakest') return { rise: Math.min(c.duo.rise, c.digby.rise) - 0.5, gap: Math.min(c.duo.gap, c.digby.gap) - 0.5, shrink: 0.5 };
  if (pass === 'strongest') return { rise: Math.max(...Object.values(c).map((x) => x.rise)) + 0.5, gap: Math.max(...Object.values(c).map((x) => x.gap)) + 0.5, shrink: -0.5 };
  return { rise: c.pip.rise, gap: c.pip.gap, shrink: 0 };
}
const st = passStats(PASS);
function envelope(dx, up, R, D, slack = 0.6) {
  if (up > R + 0.01) return false;
  const k = Math.sqrt(Math.max(0, 1 - up / Math.max(R, 0.01)));
  return Math.abs(dx) <= (D / 2) * (1 + k) + slack;
}
function glideEnv(dx, up, R, D, ratio) {
  if (up > R + 0.01) return false;
  return Math.abs(dx) <= D / 2 + ratio * (R - up) + 0.6;
}

// ---- entities in world tiles ----
const ENTS = [];
for (const r of ROOMS) for (const e of r.entities) ENTS.push({ ...e, room: r, wx: r.cx * SCREEN_W + e.x, wy: r.cy * SCREEN_H + e.y });
const loud = ENTS.filter((e) => e.type === 'loud');
const inLoud = (x, y) => loud.some((z) => x >= z.wx && x < z.wx + z.w && y >= z.wy && y < z.wy + z.h);
const gateKey = (e) => `${e.room.id}:${e.x},${e.y}`;
const overlay = new Map();
const TK = { '#': K.SOLID, G: K.SLICK, C: K.CEREAL, '=': K.ONEWAY };
for (const e of ENTS) {
  const box = e.type === 'gate' ? [e.w || 1, e.h || 1] : e.type === 'spring' ? [e.w || 2, 1] : e.type === 'terrain' && e.kind === 'crumble' ? [e.w || 1, e.h || 1, '#']
    : e.type === 'piano' ? [(e.kw || 2) * (e.keys || Math.floor((e.w || 8) / (e.kw || 2))), 1]
    : e.type === 'push' ? [e.w || 1, e.h || 1, 'G'] : null;
  if (!box) continue;
  const g = e.type === 'gate' ? { ...e, key: gateKey(e) } : null;
  for (let y = 0; y < box[1]; y++) for (let x = 0; x < box[0]; x++) overlay.set(`${e.wx + x},${e.wy + y}`, { gate: g, kind: TK[e.tile || box[2] || 'G'] ?? K.SLICK, spring: e.type === 'spring' ? e.power ?? 6 : null });
}
const MAXX = Math.max(...ROOMS.map((r) => (r.cx + r.sw) * SCREEN_W)), MAXY = Math.max(...ROOMS.map((r) => (r.cy + r.sh) * SCREEN_H));
const baseAt = (wx, wy) => {
  const r = world.roomAtCell(Math.floor(wx / SCREEN_W), Math.floor(wy / SCREEN_H));
  return r ? { r, k: r.base[(wy - r.cy * SCREEN_H) * r.tw + (wx - r.cx * SCREEN_W)] } : null;
};
// cereal clumps (world tile key -> clump id)
const clumpOf = new Map();
{
  let id = 0;
  for (const r of ROOMS) for (let y = 0; y < r.th; y++) for (let x = 0; x < r.tw; x++) {
    const wx = r.cx * SCREEN_W + x, wy = r.cy * SCREEN_H + y, k0 = `${wx},${wy}`;
    if (clumpOf.has(k0) || baseAt(wx, wy).k !== K.CEREAL) continue;
    const q = [[wx, wy]]; clumpOf.set(k0, ++id);
    while (q.length) {
      const [a, b] = q.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = `${a + dx},${b + dy}`, t = baseAt(a + dx, b + dy);
        if (!clumpOf.has(k) && t && t.k === K.CEREAL) { clumpOf.set(k, id); q.push([a + dx, b + dy]); }
      }
    }
  }
}
const doors = ENTS.filter((e) => e.type === 'door' || (e.type === 'lair' && e.to));
const lifts = ENTS.filter((e) => e.type === 'lift').map((e) => ({ x0: e.wx, x1: e.wx + (e.w || 1) - 1, top: e.wy, bot: e.wy + (e.h || 4) - 1, glide: e.glide ?? e.kind === 'updraft' }));
const syrup = ENTS.filter((e) => e.type === 'terrain' && e.kind === 'syrup');
const aphids = ENTS.filter((e) => e.type === 'aphid' || TYPES[e.type]?.spring);
const hooks = ENTS.filter((e) => e.type === 'hook');

// ---- the weakest pass's moves, measured in the real game ----
// check-world's envelopes (rise 2 / gap 3 and guesses for the flutter and the super-jump) are far
// under what a Jump-2 cricket really does: they call the sun-glass staircase (2 up, 2 across) and the
// chimney lips (4 up, 5 centre to centre, flutter) impossible, while Duo really does both. So the weakest pass measures Duo's and Digby's own moves at
// start-up: from a standstill on an open floor, holding right, every jump-hold length (and for the
// flutter every flutter frame; for the super-jump a full charge); the widest centre travel at each
// height (0.5-tile steps) of the weaker of the two is kept. A move reaches a cell `up` tiles higher
// and `dx` cells across if both reached that height (rounded up to 0.5) and dx is within that travel
// plus 1.25 tiles: a cricket stands on a tile with its centre up to 0.875 past the tile's middle
// (hitbox 0.75) at take-off and at landing (1.75 in all; 0.5 kept as margin). Drops (up < 0) keep
// check-world's envelope or the flat travel, whichever is wider.
let MEASURED = null;
if (PASS === 'weakest') {
  const { makeSim } = await import('./sim.mjs');
  const T = 40;
  const openRow = (row, y) => (y >= 1 && y <= 15 ? '#' + '.'.repeat(30) + '#' : row);
  const open = ZONES.map((z) => (z.n !== 99 ? z : { ...z, rooms: z.rooms.map((r) => (r.id !== 'sb-meadow' ? r : { ...r, entities: [], grid: r.grid.map(openRow) })) }));
  const trials = {
    jump: { items: [], list: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24].map((rel) => [[0, 'ArrowRight', 'down'], [0, 'KeyZ', 'down'], [rel, 'KeyZ', 'up']]) },
    flutter: { items: ['feather'], list: [] },
    superJump: { items: ['band'], list: [0, 2, 4, 6, 8].map((d) => [[0, 'KeyV', 'down'], [24, 'KeyV', 'up'], [24 + d, 'ArrowRight', 'down']]) },
  };
  for (let fl = 4; fl <= 60; fl += 2) for (const rel of [6, 12, 20]) if (fl > rel) trials.flutter.list.push([[0, 'ArrowRight', 'down'], [0, 'KeyZ', 'down'], [rel, 'KeyZ', 'up'], [fl, 'KeyZ', 'down'], [fl + 14, 'KeyZ', 'up']]);
  MEASURED = {};
  for (const [move, tr] of Object.entries(trials)) {
    const best = {};
    for (const c of ['duo', 'digby']) {
      const sim = makeSim({ modals: false, zones: open }); const g = sim.game;
      for (const ev of tr.list) {
        g.startAt('sb-meadow', 2, 15, { party: [c], items: tr.items });
        for (let i = 0; i < 20; i++) sim.step();
        const x0 = g.player.cx / T, y0 = (g.player.y + g.player.h) / T;
        sim.run(ev, 200, (f, gg) => {
          const pl = gg.player; const dx = pl.cx / T - x0, up = y0 - (pl.y + pl.h) / T;
          for (let u = 0; u <= 10; u += 0.5) if (up >= u) best[`${c}:${u}`] = Math.max(best[`${c}:${u}`] ?? -1, dx);
          if (f > 30 && pl.grounded) return false;
        });
        for (const k of ['ArrowRight', 'KeyZ', 'KeyV']) sim.input.keyUp(k);
      }
    }
    const at = (u) => Math.min(...['duo', 'digby'].map((c) => best[`${c}:${u}`] ?? -1));
    let maxUp = 0; for (let u = 0; u <= 10; u += 0.5) if (at(u) >= 0) maxUp = u;
    MEASURED[move] = { maxUp, dx: (up) => at(Math.ceil(Math.max(0, up) * 2) / 2) + 0.65 }; // + the 0.6 every move gets = 1.25
  }
  if (verbose) for (const [m, t] of Object.entries(MEASURED)) console.log(`measured ${m}: up to ${t.maxUp}; ${[0, 1, 2, 3, 4, 5, 6, 7, 8].filter((u) => u <= t.maxUp).map((u) => `${u}:${t.dx(u).toFixed(2)}`).join(' ')}`);
}

// ---- a state: what the player holds and what the world remembers ----
const mkState = (o = {}) => ({ items: new Set(o.items || []), rescued: new Set(o.rescued || []), switches: new Set(o.switches || []), sides: new Set(o.sides || []), broken: new Set(o.broken || []) });
const cloneState = (s) => mkState({ items: s.items, rescued: s.rescued, switches: s.switches, sides: s.sides, broken: s.broken });
const stateKey = (s) => ['items', 'rescued', 'switches', 'sides', 'broken'].map((f) => [...s[f]].sort().join(',')).join('|');
const tokens = (s) => [...[...s.items].map((x) => `item:${x}`), ...[...s.rescued].map((x) => `rescue:${x}`), ...[...s.switches].map((x) => `sw:${x}`), ...[...s.sides].map((x) => `side:${x}`), ...[...s.broken].map((x) => `cereal:${x}`)];
const FIELD = { item: 'items', rescue: 'rescued', sw: 'switches', side: 'sides', cereal: 'broken' };
const without = (s, tok) => { const c = cloneState(s); const i = tok.indexOf(':'); c[FIELD[tok.slice(0, i)]].delete(tok.slice(i + 1)); return c; };
const describe = (s) => `items [${[...s.items].sort()}] rescued [${[...s.rescued].sort()}]${s.switches.size ? ` switches [${[...s.switches]}]` : ''}${s.broken.size ? ` cereal ${s.broken.size}` : ''}${s.sides.size ? ` sides ${s.sides.size}` : ''}`;

// ---- the reach graph for one state (nodes over a set of rooms; edges computed lazily) ----
function makeGraph(S, region) {
  const has = (i) => S.items.has(i);
  const gateOpen = (g) => {
    const o = g.opens || {};
    if (o.item && !has(o.item)) return false;
    if (o.rescued && !S.rescued.has(o.rescued)) return false;
    if (o.rescues != null && [...S.rescued].filter((c) => c !== 'pip').length < o.rescues) return false;
    if (o.switch && !S.switches.has(o.switch)) return false;
    if (o.flag) return false;
    if (o.side && !S.sides.has(g.key)) return false;
    return true;
  };
  const tileAt = (wx, wy) => {
    const t = baseAt(wx, wy);
    if (!t) return null;
    if (t.k === K.CEREAL && S.broken.has(String(clumpOf.get(`${wx},${wy}`)))) return { r: t.r, k: K.EMPTY };
    const o = overlay.get(`${wx},${wy}`);
    if (o && t.k === K.EMPTY && !(o.gate && gateOpen(o.gate))) return { r: t.r, k: o.kind, spring: o.spring };
    if (o?.spring && t.k !== K.EMPTY) return { ...t, spring: o.spring }; // a cushion drawn on solid tiles (liv-armchair's seat)
    return t;
  };
  const inRegion = (t) => !region || region.has(t.r);
  // with the Raft, water is a floor at its surface and you can wade along its bottom (real sim: kit-pantrydoor)
  const passable = (t) => t && (t.k === K.EMPTY || t.k === K.ONEWAY || (t.k === K.WATER && has('raft')));
  const allowed = (t, x, y) => t && inRegion(t) && (!t.r.needs || has(t.r.needs)) && (!inLoud(x, y) || has('earplugs'));
  const standOn = (t, x, y) => {
    if (!t) return false;
    if ([K.SOLID, K.SLICK, K.CRACK, K.SOIL, K.ONEWAY, K.CEREAL, K.PROP].includes(t.k)) return true;
    if (t.k === K.WATER) { const above = tileAt(x, y - 1); return has('raft') && above && above.k !== K.WATER; }
    return false;
  };
  const clingWall = (t) => t && (t.k === K.SOLID || t.k === K.CEREAL || t.k === K.SOIL);
  const nodes = new Map(); const cols = new Map();
  const add = (key, n) => { nodes.set(key, n); n.key = key; (cols.get(n.x) || cols.set(n.x, []).get(n.x)).push(n); };
  for (const r of ROOMS) {
    if (region && !region.has(r)) continue;
    if (r.needs && !has(r.needs)) continue;
    for (let y = 0; y < r.th; y++) for (let x = 0; x < r.tw; x++) {
      const wx = r.cx * SCREEN_W + x, wy = r.cy * SCREEN_H + y;
      const t = tileAt(wx, wy);
      if (!passable(t) || !allowed(t, wx, wy)) continue;
      const below = tileAt(wx, wy + 1);
      if (standOn(below, wx, wy + 1)) add(`${wx},${wy}`, { kind: 'spot', x: wx, y: wy, below });
      else if (has('booties')) for (const d of [-1, 1]) if (clingWall(tileAt(wx + d, wy)) && clingWall(tileAt(wx + d, wy - 1))) { add(`${wx},${wy}`, { kind: 'cling', x: wx, y: wy, d }); break; }
    }
  }
  if (has('floss')) for (const e of hooks) if (!region || region.has(e.room)) add(`h${e.wx},${e.wy}`, { kind: 'hook', x: e.wx, y: e.wy + 2 });
  function headroom(x, y, up) {
    for (let i = 1; i <= Math.ceil(up); i++) { const t = tileAt(x, y - i); if (!passable(t)) return i - 1; }
    return up;
  }
  // passable-and-allowed cells, precomputed (the hot path)
  const OKW = MAXX + 2, OK = new Uint8Array(OKW * (MAXY + 2));
  for (const r of ROOMS) for (let y = 0; y < r.th; y++) for (let x = 0; x < r.tw; x++) {
    const wx = r.cx * SCREEN_W + x, wy = r.cy * SCREEN_H + y, t = tileAt(wx, wy);
    if (passable(t) && allowed(t, wx, wy)) OK[wy * OKW + wx] = 1;
  }
  const okCell = (x, y) => x >= 0 && y >= 0 && x < OKW && OK[y * OKW + x] === 1;
  function clearLine(x0, y0, x1, y1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 1; i < n; i++) if (!okCell(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n))) return false;
    return true;
  }
  function clearPath(n, m) {
    const ax = n.x, ay = n.y, bx = m.x, by = m.y, top = Math.min(ay, by);
    if (okCell(ax, top) && okCell(bx, top) && clearLine(ax, ay, ax, top) && clearLine(ax, top, bx, top) && clearLine(bx, top, bx, by)) return true;
    if (okCell(bx, ay) && clearLine(ax, ay, bx, ay) && clearLine(bx, ay, bx, by)) return true;
    return clearLine(ax, ay, bx, by);
  }
  function launches(n) {
    const L = [];
    let R = st.rise, D = st.gap - HIT_W;
    if (n.kind === 'spot') {
      if (syrup.some((e) => n.x >= e.wx && n.x < e.wx + (e.w || 1) && n.y + 1 >= e.wy && n.y + 1 < e.wy + (e.h || 1))) { R *= 0.5; D *= 0.7; }
      const bounce = (pw) => { L.push({ R: pw - st.shrink, D: (st.gap - HIT_W) * Math.sqrt(pw / st.rise) }); if (has('glider')) L.push({ R: pw - st.shrink, D: st.gap - HIT_W, glide: REACH.moves.glide.ratio }); }; // a bounce, then a glide (real sim: liv-armchair)
      if (n.below?.spring) bounce(n.below.spring);
      const aph = aphids.find((e) => Math.abs(e.wx - n.x) <= 1 && e.wy === n.y);
      if (aph) bounce(aph.spring ?? TYPES[aph.type]?.spring ?? 5);
      L.push({ R, D });
      const plain = MEASURED && R === st.rise; // not in syrup
      if (plain) L.push({ R: MEASURED.jump.maxUp, table: MEASURED.jump.dx, D });
      if (has('feather')) L.push(plain ? { R: MEASURED.flutter.maxUp, table: MEASURED.flutter.dx, D: D + 2 } : { R: R + MOVES.flutter.rise, D: D + 2 });
      if (has('band')) L.push(MEASURED ? { R: MEASURED.superJump.maxUp, table: MEASURED.superJump.dx, D: REACH.moves.superJump.gap - HIT_W } : { R: REACH.moves.superJump.rise - st.shrink, D: REACH.moves.superJump.gap - HIT_W });
      if (has('glider')) L.push({ R, D, glide: REACH.moves.glide.ratio });
    } else if (n.kind === 'cling') {
      // the wall kick is the same for every cricket (reach.js wallRise), and a cling node sits a tile
      // under the highest real cling, so the weakest pass's -0.5 margin is not taken off it
      const wr = REACH.crickets.pip.wallRise - Math.min(0, st.shrink);
      L.push({ R: wr, D: 4 });
      if (has('feather')) L.push({ R: wr + MOVES.flutter.rise, D: 5 });
      if (has('glider')) L.push({ R: 2, D: 4, glide: REACH.moves.glide.ratio });
    } else if (n.kind === 'hook') {
      L.push({ R: 2, D: REACH.moves.swing.fling - HIT_W - st.shrink });
      L.push({ R: 0, D: 1 });
      if (has('glider')) L.push({ R: 2, D: 4, glide: REACH.moves.glide.ratio });
    }
    return L;
  }
  function doorTarget(d) {
    const r = world.rooms[d.to]; if (!r || (region && !region.has(r))) return null;
    const m = d.at ? { x: d.at[0], y: d.at[1] } : (r.entities.find((e) => e.type === 'start') || r.entities.find((e) => e.type === 'save'));
    if (!m) return null;
    const x = r.cx * SCREEN_W + m.x; let y = r.cy * SCREEN_H + m.y;
    for (let i = 0; i < 20 && !standOn(tileAt(x, y + 1), x, y + 1); i++) y++;
    return `${x},${y}`;
  }
  const near = (n, x0, x1, y0, y1) => { const out = []; for (let x = x0; x <= x1; x++) for (const m of cols.get(x) || []) if (m.y >= y0 && m.y <= y1) out.push(m); return out; };
  // the successors of node n
  function next(n) {
    const out = [];
    for (const d of doors) {
      if (d.needs && !has(d.needs)) continue;
      const w = d.w || 1, h = d.h || 1;
      const ok = d.type === 'lair' ? n.x >= d.wx - 1 && n.x <= d.wx + w && n.y >= d.wy - h + 1 && n.y <= d.wy + 1 && n.kind === 'spot'
        : Math.abs(n.x - d.wx) <= 1 && n.y >= d.wy - 1 && n.y <= d.wy;
      if (!ok) continue;
      const tk = doorTarget(d);
      if (tk && nodes.has(tk)) out.push(nodes.get(tk));
    }
    for (const L of lifts) {
      if (L.glide && !has('glider')) continue;
      if (n.x < L.x0 - 1 || n.x > L.x1 + 1 || n.y < L.top - 1 || n.y > L.bot + 1) continue;
      for (const m of near(n, L.x0 - 30, L.x1 + 30, L.top - 3, L.top + 40)) {
        const ox = Math.max(L.x0, Math.min(L.x1, m.x)), oy = L.top;
        const dx = m.x - ox, up = oy - m.y;
        if (Math.abs(dx) > 30 || up > 3) continue;
        if ((L.glide || has('glider') ? glideEnv(dx, up, 1, st.gap - HIT_W, REACH.moves.glide.ratio) : envelope(dx, up, 1, st.gap - HIT_W)) && clearPath({ x: ox, y: oy }, m)) out.push(m);
      }
    }
    const Ls = launches(n);
    const dropOne = n.kind === 'spot' && n.below?.k === K.ONEWAY; // Down+Jump through a one-way platform
    for (const m of near(n, n.x - 30, n.x + 30, n.y - 12, n.y + 40)) {
      if (m === n) continue;
      const dx = m.x - n.x, up = n.y - m.y;
      let ok = false;
      if (n.kind !== 'hook' && up === 0 && Math.abs(dx) === 1) ok = true;
      if (n.kind === 'cling' && m.kind === 'cling' && dx === 0 && up === -1) ok = true;
      // no climbing a single wall: a kick goes away from it and never back onto it higher (real sim)
      const sameWall = n.kind === 'cling' && m.kind === 'cling' && dx === 0 && m.d === n.d && up > 0;
      for (const l of Ls) {
        if (ok || sameWall) break;
        const room2 = headroom(n.x, n.y, Math.min(Math.max(up, 0) + 1, l.R));
        if (up > room2 + 0.01 && n.kind === 'spot') continue;
        const tgtUp = m.kind === 'hook' ? up - 1 : up;
        ok = l.table ? tgtUp <= l.R + 0.01 && (Math.abs(dx) <= l.table(tgtUp) + 0.6 || (tgtUp < 0 && envelope(dx, tgtUp, Math.max(l.R, 0.01), l.D))) : l.glide ? glideEnv(dx, tgtUp, l.R, l.D, l.glide) : envelope(dx, tgtUp, l.R, l.D);
      }
      // a one-way platform: you only land on it from above (or rise through it), so a jump that ends
      // under one is fine; dropping through it needs Down+Jump while standing on it
      if (!ok && dropOne && up < 0 && Math.abs(dx) <= 2 && m.kind !== 'hook') ok = true;
      if (ok && m.kind !== 'hook' && n.kind !== 'hook' && !clearPath(n, m)) ok = false;
      if (ok && (m.kind === 'hook' || n.kind === 'hook') && !clearLine(n.x, n.y, m.x, m.y) && !clearPath(n, m)) ok = false;
      if (ok) out.push(m);
    }
    return out;
  }
  return { nodes, next, tileAt };
}

// BFS from a world tile; stops at the first node `goal` accepts (if given)
function bfs(G, startKey, goal) {
  const s = G.nodes.get(startKey);
  if (!s) return { seen: new Set(), hit: null, missingStart: true };
  const seen = new Set([s.key]); const q = [s];
  if (goal && goal(s)) return { seen, hit: s };
  const memo = G.memo || (G.memo = new Map());
  for (let i = 0; i < q.length; i++) {
    const n = q[i];
    let nx = memo.get(n.key); if (!nx) memo.set(n.key, nx = G.next(n));
    for (const m of nx) {
      if (seen.has(m.key)) continue;
      seen.add(m.key); q.push(m);
      if (goal && goal(m)) return { seen, hit: m };
    }
  }
  return { seen, hit: null };
}
const graphCache = new Map();
function graphFor(S, region, regionKey) {
  const k = stateKey(S) + '#' + regionKey;
  if (!graphCache.has(k)) { if (graphCache.size > 40) graphCache.clear(); graphCache.set(k, makeGraph(S, region)); }
  return graphCache.get(k);
}

// ---- what reaching places gives (the fixpoint) ----
function gains(S, seen, deny) {
  const roomsSeen = new Set(); for (const k of seen) { const [x, y] = k.replace('h', '').split(',').map(Number); roomsSeen.add(world.roomAtCell(Math.floor(x / SCREEN_W), Math.floor(y / SCREEN_H))); }
  const inRoom = (r) => roomsSeen.has(r);
  const reached = (e, r = 1) => { for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) if (seen.has(`${e.wx + dx},${e.wy + dy}`)) return true; return false; };
  const got = [];
  const add = (tok) => { if (!deny.has(tok)) got.push(tok); };
  for (const e of ENTS) {
    if (e.type === 'item' && ZONE_ITEMS.has(e.item) && !S.items.has(e.item) && reached(e)) add(`item:${e.item}`);
    if (e.type === 'cage' && !S.rescued.has(e.cricket) && reached(e)) add(`rescue:${e.cricket}`);
    // a gecko fight is won once you are in its arena (the recorded boss runs prove each fight with the zone's items)
    if (e.type === 'boss' && e.cricket && !S.rescued.has(e.cricket) && inRoom(e.room)) add(`rescue:${e.cricket}`);
    if (e.type === 'switch' && !S.switches.has(e.id) && (e.by !== 'pound' || S.items.has('thimble')) && reached(e, e.by === 'chirp' ? 2 : 1)) add(`sw:${e.id}`);
    if (e.type === 'thermostat' && !S.switches.has(e.id) && S.rescued.has('frost') && reached(e, 6)) add(`sw:${e.id}`);
    if (e.type === 'piano' && !S.switches.has(e.id) && S.items.has('thimble') && reached({ ...e, wy: e.wy - 1 })) add(`sw:${e.id}`);
    if (e.type === 'gate' && e.opens?.side && !S.sides.has(gateKey(e))) {
      const w = e.w || 1, h = e.h || 1, sd = e.opens.side; const cells = [];
      for (let i = 0; i < Math.max(w, h); i++) cells.push(sd === 'left' ? [e.wx - 1, e.wy + Math.min(i, h - 1)] : sd === 'right' ? [e.wx + w, e.wy + Math.min(i, h - 1)] : sd === 'top' ? [e.wx + Math.min(i, w - 1), e.wy - 1] : [e.wx + Math.min(i, w - 1), e.wy + h]);
      if (cells.some(([x, y]) => seen.has(`${x},${y}`))) add(`side:${gateKey(e)}`);
    }
  }
  if (S.items.has('thimble')) for (const k of seen) {
    if (k[0] === 'h') continue;
    const [x, y] = k.split(',').map(Number); const c = clumpOf.get(`${x},${y + 1}`);
    if (c && !S.broken.has(String(c))) add(`cereal:${c}`);
  }
  return [...new Set(got)];
}
function apply(S, toks) {
  const T = cloneState(S);
  for (const tok of toks) {
    const i = tok.indexOf(':'), f = tok.slice(0, i), v = tok.slice(i + 1);
    T[FIELD[f]].add(v);
    if (f === 'rescue') for (const sw of BOSS_SWITCHES[v] || []) T.switches.add(sw);
  }
  return T;
}
// repeat BFS + pickups until `goal` is hit or nothing changes
function fixpoint(S0, startKey, { region = null, regionKey = 'house', goal = null, deny = new Set(), log = null } = {}) {
  let S = S0;
  for (let it = 0; it < 30; it++) {
    const G = graphFor(S, region, regionKey);
    const res = bfs(G, startKey, goal ? (n) => goal(n, S) : null);
    if (res.missingStart) return { S, hit: null, seen: res.seen, missingStart: true };
    if (res.hit) return { S, hit: res.hit, seen: res.seen };
    const g = gains(S, res.seen, deny);
    if (!g.length) return { S, hit: null, seen: res.seen };
    if (log) log.push(...g);
    S = apply(S, g);
  }
  return { S, hit: null, seen: new Set() };
}

// ---- cracks, zones, targets ----
const zoneKeyOf = (room) => room.zone.n;
const cracks = ENTS.filter((e) => e.type === 'save').map((e) => ({ ...e, key: `${e.wx},${e.wy}`, zn: zoneKeyOf(e.room), name: `${e.room.id} ${e.x},${e.y}` }));
const zoneStart = (z) => {
  const r = world.rooms[z.start?.room]; if (!r) return null;
  const m = r.entities.find((e) => e.type === 'start') || r.entities.find((e) => e.type === 'save');
  let x = r.cx * SCREEN_W + m.x, y = r.cy * SCREEN_H + m.y;
  return { room: r, key: `${x},${y}` };
};
const ZONE_BY_N = Object.fromEntries(HOUSE.map((z) => [z.n, z]));
const cellRoom = (n) => world.roomAtCell(Math.floor(n.x / SCREEN_W), Math.floor(n.y / SCREEN_H));
const LINK_ZONES = ['hall', 'stairwell', 'chimney', 'lair'];

// minimal entry states of each main zone (prerequisite graph)
const { entries } = exploreRoutes();
const sub = (a, b) => a.every((x) => b.includes(x));
function minimalEntries(n) {
  const E = entries[n] || [];
  return E.filter((e) => !E.some((f) => f !== e && sub(f.items, e.items) && sub(f.rescued, e.rescued) && (f.items.length + f.rescued.length) < (e.items.length + e.rescued.length)));
}

// The crack's first-reach state from S0 in zone z: the fixpoint over the zone's rooms until the crack
// is reached, then every gained token dropped while the crack stays reachable without it.
function minimalReach(S0, z, goalFn) {
  const region = new Set(z.rooms.map((r) => world.rooms[r.id]));
  const start = zoneStart(z);
  const run = (deny) => fixpoint(S0, start.key, { region, regionKey: `zone${z.n}`, goal: goalFn, deny });
  let r = run(new Set());
  if (!r.hit) return null;
  const deny = new Set();
  const base = new Set(tokens(S0));
  for (const tok of tokens(r.S).filter((t) => !base.has(t))) {
    const d2 = new Set([...deny, tok]);
    const r2 = run(d2);
    if (r2.hit) { deny.add(tok); r = r2; }
  }
  return r.S;
}
const atCrack = (c) => (n) => n.key === c.key || (Math.abs(n.x - c.wx) <= 1 && n.y === c.wy);

// the checks from a crack in state S
function checkCrack(c, S, zn) {
  const zone = ZONE_BY_N[zn];
  const info = ZONE_INFO[zn];
  // (a) another crack of the zone or its start
  const own = cracks.filter((d) => d.zn === zn && d !== c);
  const zs = zoneStart(zone);
  const aTargets = [...own.map((d) => ({ x: d.wx, y: d.wy, room: d.room })), ...(zs ? [{ x: +zs.key.split(',')[0], y: +zs.key.split(',')[1], room: zs.room }] : [])]
    .filter((t) => !(t.room === c.room && Math.abs(t.x - c.wx) + Math.abs(t.y - c.wy) <= 6));
  const anyOther = !aTargets.length;
  const others = anyOther ? [...cracks.filter((d) => d !== c && !(d.room === c.room && Math.abs(d.wx - c.wx) + Math.abs(d.wy - c.wy) <= 6)).map((d) => ({ x: d.wx, y: d.wy }))] : aTargets;
  const aGoal = (n) => others.some((t) => Math.abs(n.x - t.x) <= 1 && n.y === t.y);
  const a = fixpoint(S, c.key, { goal: aGoal });
  // (b) onward progress
  const unfinishedHere = info && info.cricket && !S.rescued.has(info.cricket);
  const nextZones = [];
  for (let n = 1; n <= 10; n++) if (n !== zn && !S.rescued.has(ZONE_INFO[n].cricket)) nextZones.push(n);
  const bGoal = (n, S2) => {
    if (unfinishedHere && (S2.rescued.has(info.cricket) || (info.item && S2.items.has(info.item) && !S.items.has(info.item)))) return true;
    const r = cellRoom(n); if (!r) return false;
    return nextZones.some((m) => canEnter(m, S2.items, S2.rescued) && world.rooms[ZONE_INFO[m].start] === r);
  };
  const done = ALL_CRICKETS.every((x) => S.rescued.has(x));
  const b = done ? null : fixpoint(S, c.key, { goal: (n, S2) => bGoal(n, S2) });
  let bWhat = null;
  if (b?.hit) { const r = cellRoom(b.hit); bWhat = unfinishedHere && r && r.zone.n === zn ? `${info.item && b.S.items.has(info.item) && !S.items.has(info.item) ? info.item : info.cricket} (zone ${zn})` : `${r.zone.id} (${r.id})`; }
  return { a: a.hit ? `${cellRoom(a.hit).id} ${a.hit.x - cellRoom(a.hit).cx * SCREEN_W},${a.hit.y - cellRoom(a.hit).cy * SCREEN_H}` : null, aMissing: a.missingStart, aAny: anyOther,
    b: done ? 'n/a (all home)' : bWhat, bSeen: b?.seen.size, aSeen: a.seen.size };
}

// ---- run ----
if (process.env.CRACKS_LIB) { /* library use */ } else {
let fails = 0, checks = 0;
const results = [];
const t0 = Date.now();
// A zone entered through a cereal link (house.js gate kind 'cereal' into its start room: the liv-hearth
// threshold for the Sunroom, the laun-washer rubble for the Basement) was entered by pounding it.
function entryCereal(n) {
  const startRoom = ZONE_BY_N[n]?.start?.room, out = [];
  for (const l of PLAN_LINKS) {
    if (l.door || l.gate?.kind !== 'cereal' || (l.b !== startRoom && l.a !== startRoom)) continue;
    const step = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] }[l.side];
    const [cx, cy] = l.cell;
    const ex = step[0] > 0 ? (cx + 1) * SCREEN_W : step[0] < 0 ? cx * SCREEN_W : null, ey = step[1] > 0 ? (cy + 1) * SCREEN_H : step[1] < 0 ? cy * SCREEN_H : null;
    for (let i = l.span[0]; i <= l.span[1]; i++) for (let d = -8; d < 8; d++) {
      const x = ex != null ? ex + d : cx * SCREEN_W + i, y = ey != null ? ey + d : cy * SCREEN_H + i;
      const c = clumpOf.get(`${x},${y}`); if (c) out.push(`cereal:${c}`);
    }
  }
  return [...new Set(out)];
}
const stateOf = (e, n) => apply(mkState({ items: e.items, rescued: e.rescued }), n != null ? entryCereal(n) : []);
const zoneList = [...MAIN.map((z) => z.n), ...LINK_ZONES].filter((n) => ZONE_BY_N[n] && (onlyZone == null || String(n) === onlyZone));
// every zone's minimal entry states and post-rescue states (for the link cracks)
const zoneStates = {};
for (const n of MAIN.map((z) => z.n)) {
  const z = ZONE_BY_N[n]; if (!z) continue;
  const info = ZONE_INFO[n];
  const ents = minimalEntries(n);
  const boss = ENTS.find((e) => (e.type === 'boss' || e.type === 'cage') && e.cricket === info.cricket);
  const post = [];
  for (const e of ents) {
    const S0 = stateOf(e, n);
    const bossGoal = (nd) => boss && (boss.type === 'boss' ? cellRoom(nd) === boss.room : Math.abs(nd.x - boss.wx) <= 1 && Math.abs(nd.y - boss.wy) <= 1);
    const Sb = minimalReach(S0, z, bossGoal);
    if (!Sb) { console.log(`zone ${n}: the boss/cage of ${info.cricket} is not reached from [${e.items}] (weakest pass, zone rooms only)`); continue; }
    post.push(apply(Sb, [`item:${info.item}`, `rescue:${info.cricket}`].filter((t) => !t.endsWith(':undefined'))));
  }
  zoneStates[n] = { entries: ents.map((e) => stateOf(e, n)), post };
}
for (const zn of zoneList) {
  const z = ZONE_BY_N[zn];
  const zc = cracks.filter((c) => c.zn === zn);
  for (const c of zc) {
    const states = []; // [label, S]
    if (typeof zn === 'number') {
      for (const S0 of zoneStates[zn].entries) {
        const S = minimalReach(S0, z, atCrack(c));
        if (S) states.push([`first reach from ${describe(S0)}`, S]);
        else states.push([`NOT reachable from the zone start with ${describe(S0)} (zone rooms only)`, null]);
      }
      for (const P of zoneStates[zn].post) states.push(['after the rescue', P]);
    } else {
      // link areas: every zone state in which the crack can be reached from that zone's start
      const info = ZONE_INFO[zn];
      for (const m of info.minItems) states.push([`link minItems`, mkState({ items: m, rescued: info.rescued })]);
      for (const n of Object.keys(zoneStates).map(Number)) for (const [lab, list] of [['entry', zoneStates[n].entries], ['after rescue', zoneStates[n].post]]) for (const S of list) {
        const zs = zoneStart(ZONE_BY_N[n]);
        const r = fixpoint(S, zs.key, { goal: atCrack(c) });
        if (r.hit) states.push([`zone ${n} ${lab}`, r.S]);
      }
    }
    const seenKeys = new Set();
    for (const [label, S] of states) {
      if (!S) { console.log(`  FAIL ${c.name}: ${label}`); fails++; continue; }
      const k = stateKey(S); if (seenKeys.has(k)) continue; seenKeys.add(k);
      checks++;
      const r = checkCrack(c, S, zn);
      const ok = r.a && r.b;
      if (!ok) fails++;
      results.push({ crack: c.name, zone: z.id, label, ok });
      if (!ok || verbose) console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${z.id} ${c.name} [${label}] ${describe(S)}\n       (a) ${r.a ? `-> ${r.a}${r.aAny ? ' (any crack/start)' : ''}` : r.aMissing ? 'the crack is not a standing spot' : `NO (${r.aSeen} nodes reached)`}; (b) ${r.b ? `-> ${r.b}` : `NO (${r.bSeen} nodes reached)`}`);
    }
  }
}
const nCracks = new Set(results.map((r) => r.crack)).size;
console.log(`save cracks [${PASS}]: ${nCracks} cracks, ${checks} crack-states checked, ${fails ? `${fails} FAIL` : 'all can be left on foot'} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(fails ? 1 : 0);
}
export const _dbg = { world, cracks, fixpoint, mkState, apply, cellRoom, graphFor, bfs, clumpOf, SCREEN_W, SCREEN_H };
