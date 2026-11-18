#!/usr/bin/env node
// World check (skeleton): loads every zone in game/data/rooms/index.js, joins the rooms into
// one house-wide tile grid, and searches reachability with the reach envelopes in
// game/data/reach.js (written by gen-reach.mjs).
//
// Nodes: standing spots, wall-cling cells (Booties), hooks (Floss). Edges: a parabola envelope
// per move (jump, flutter, glide, super-jump, wall-kick, fling), checked for headroom at the
// take-off but NOT for mid-arc collisions (skeleton: the recorded solutions are the real proof).
// Items are picked up when reached; abilities only add, so the fixpoint covers every order.
//
//   node tools/check-world.mjs [--zone 99] [--pass weakest|strongest|pip] [--items a,b] [--deny a,b] [--verbose]
//   --deny band: pretend the Rubber Band is never found, to prove what it gates.
// Exit 1 if a zone's items or rescue can't be reached in its pass.
//
// Also (always, unless --zone is given; or alone with --plan / --graph):
//   plan:  game/data/house.js against itself (no overlapping cells, every link joins adjacent
//          rooms on the side and cell it names) and against the built rooms (same cell, size and
//          zone; exact links open on both sides once both rooms exist). Unbuilt rooms are listed,
//          not failed.
//   graph: the prerequisite graph in data/zones.js over every valid route order: each zone's
//          entry states hold one of its minItems sets, each minItems set really occurs, the
//          Attic never opens before nine rescues, and every state can still finish the game.
// Mechanics (src/mechanics.js) it understands: gates (item / rescued / rescues / switch / flag /
// side; shut tiles are solid), levers, thermostats (with Frost home: --rescued frost), piano
// melodies (with the Thimble), springs and aphids (bounce launches), lifts (to the lift's top, then
// a hop or a glide), syrup (half rise), crumbling floors (standable), door entities (edges).
//   --rescued a,b  crickets home at the start   --flags x,y  meta flags set
// TODO: per-zone search over every route order, "no gate opens before its item", "every spot
// gets back to a save crack".
import { World } from '../game/src/world.js';
import { K } from '../game/src/physics.js';
import { ZONES } from '../game/data/rooms/index.js';
import { ZONE_INFO, PREREQ, exploreRoutes } from '../game/data/zones.js';
import { ROOMS as PLAN, LINKS as PLAN_LINKS, ROOM_BY_ID as PLAN_BY_ID } from '../game/data/house.js';
import { REACH } from '../game/data/reach.js';
import { MOVES, SCREEN_W, SCREEN_H } from '../game/data/movement.js';
import { TYPES } from '../game/src/enemies.js';

const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const verbose = args.includes('--verbose');
const onlyZone = opt('--zone', null);
const passArg = opt('--pass', null);
const extraItems = (opt('--items', '') || '').split(',').filter(Boolean);
const denied = new Set((opt('--deny', '') || '').split(',').filter(Boolean)); // never picked up (gate test)
const extraRescued = (opt('--rescued', '') || '').split(',').filter(Boolean);   // crickets home at the start (rescue gates, thermostats: frost)
const extraFlags = (opt('--flags', '') || '').split(',').filter(Boolean);       // meta flags set (gates with opens:{flag})

const world = new World(ZONES);
const HIT_W = 0.75; // hitbox width in tiles (30 px)

// envelope: can a launch with rise R and flat travel D reach a cell dx across and `up` higher?
function envelope(dx, up, R, D, slack = 0.6) {
  if (up > R + 0.01) return false;
  const k = Math.sqrt(Math.max(0, 1 - up / Math.max(R, 0.01)));
  return Math.abs(dx) <= (D / 2) * (1 + k) + slack;
}
function glideEnv(dx, up, R, D, ratio) {
  if (up > R + 0.01) return false;
  return Math.abs(dx) <= D / 2 + ratio * (R - up) + 0.6;
}

function passStats(pass) {
  const c = REACH.crickets;
  if (pass === 'weakest') return { name: 'weakest (Jump 2 / Speed 2, -0.5 tile)', rise: Math.min(c.duo.rise, c.digby.rise) - 0.5, gap: Math.min(c.duo.gap, c.digby.gap) - 0.5, shrink: 0.5 };
  if (pass === 'strongest') return { name: 'strongest (+0.5 tile)', rise: Math.max(...Object.values(c).map((x) => x.rise)) + 0.5, gap: Math.max(...Object.values(c).map((x) => x.gap)) + 0.5, shrink: -0.5 };
  return { name: 'Pip', rise: c.pip.rise, gap: c.pip.gap, shrink: 0 };
}

function check(zone, pass, startItems, startRescued = []) {
  const st = passStats(pass);
  const rooms = zone.rooms.map((r) => world.rooms[r.id]);
  // entities in world tiles
  const ents = [];
  for (const r of rooms) for (const e of r.entities) ents.push({ ...e, room: r, wx: r.cx * SCREEN_W + e.x, wy: r.cy * SCREEN_H + e.y });
  const loud = ents.filter((e) => e.type === 'loud');
  const inLoud = (x, y) => loud.some((z) => x >= z.wx && x < z.wx + z.w && y >= z.wy && y < z.wy + z.h);

  let items = new Set(startItems);
  const has = (i) => items.has(i);
  // [mech] state the mechanics read: rescues, switches (levers, thermostats, piano melodies), side gates
  const rescued = new Set(startRescued), switches = new Set(), sides = new Set();
  const gateOpenCW = (g) => {
    const o = g.opens || {};
    if (o.item && !has(o.item)) return false;
    if (o.rescued && !rescued.has(o.rescued)) return false;
    if (o.rescues != null && [...rescued].filter((c) => c !== 'pip').length < o.rescues) return false;
    if (o.switch && !switches.has(o.switch)) return false;
    if (o.flag && !flags.has(o.flag)) return false;
    if (o.side && !sides.has(g)) return false;
    return true;
  };
  // tiles the mechanics add: shut gates, spring cushions, crumbling floors, piano keys (world tile -> info)
  const overlay = new Map();
  const TK = { '#': K.SOLID, G: K.SLICK, C: K.CEREAL, '=': K.ONEWAY };
  for (const r of Object.values(world.rooms)) for (const e of r.entities) {
    const box = e.type === 'gate' ? [e.w || 1, e.h || 1] : e.type === 'spring' ? [e.w || 2, 1] : e.type === 'terrain' && e.kind === 'crumble' ? [e.w || 1, e.h || 1, '#']
      : e.type === 'piano' ? [(e.kw || 2) * (e.keys || Math.floor((e.w || 8) / (e.kw || 2))), 1]
      : e.type === 'push' ? [e.w || 1, e.h || 1, 'G'] : null; // [fixer] push blocks: solid where they start
    if (!box) continue;
    const g = e.type === 'gate' ? { ...e, room: r } : null;
    for (let y = 0; y < box[1]; y++) for (let x = 0; x < box[0]; x++) overlay.set(`${r.cx * SCREEN_W + e.x + x},${r.cy * SCREEN_H + e.y + y}`, { gate: g, kind: TK[e.tile || box[2] || 'G'] ?? K.SLICK, spring: e.type === 'spring' ? e.power ?? 6 : null });
  }
  // world tile helpers
  const tileAt = (wx, wy) => {
    const r = world.roomAtCell(Math.floor(wx / SCREEN_W), Math.floor(wy / SCREEN_H));
    if (!r) return null;
    let k = r.base[(wy - r.cy * SCREEN_H) * r.tw + (wx - r.cx * SCREEN_W)];
    const o = overlay.get(`${wx},${wy}`);
    if (o && k === K.EMPTY && !(o.gate && gateOpenCW(o.gate))) return { r, k: o.kind, spring: o.spring };
    return { r, k };
  };
  const flags = new Set(extraFlags);
  const passable = (t) => t && (t.k === K.EMPTY || t.k === K.ONEWAY || (t.k === K.CEREAL && has('thimble')));
  const allowed = (t, x, y) => t && (!t.r.needs || has(t.r.needs)) && (!inLoud(x, y) || has('earplugs'));
  const standOn = (t, x, y) => {
    if (!t) return false;
    if ([K.SOLID, K.SLICK, K.CRACK, K.SOIL, K.ONEWAY].includes(t.k)) return true;
    if (t.k === K.CEREAL) return !has('thimble') || true;
    if (t.k === K.WATER) { const above = tileAt(x, y - 1); return has('raft') && above && above.k !== K.WATER; }
    return false;
  };
  const clingWall = (t) => t && (t.k === K.SOLID || t.k === K.CEREAL || t.k === K.SOIL);

  function buildNodes() {
    const nodes = new Map();
    for (const r of rooms) {
      if (r.needs && !has(r.needs)) continue;
      for (let y = 0; y < r.th; y++) for (let x = 0; x < r.tw; x++) {
        const wx = r.cx * SCREEN_W + x, wy = r.cy * SCREEN_H + y;
        const t = tileAt(wx, wy);
        if (!passable(t) || !allowed(t, wx, wy)) continue;
        const below = tileAt(wx, wy + 1);
        if (standOn(below, wx, wy + 1) && !(below.k === K.CEREAL && has('thimble'))) nodes.set(`${wx},${wy}`, { kind: 'spot', x: wx, y: wy });
        else if (has('booties')) for (const d of [-1, 1]) if (clingWall(tileAt(wx + d, wy)) && clingWall(tileAt(wx + d, wy - 1))) nodes.set(`${wx},${wy}`, { kind: 'cling', x: wx, y: wy, d });
      }
    }
    if (has('floss')) for (const e of ents) if (e.type === 'hook') nodes.set(`h${e.wx},${e.wy}`, { kind: 'hook', x: e.wx, y: e.wy + 2 });
    return nodes;
  }
  function headroom(x, y, up) {
    for (let i = 1; i <= Math.ceil(up); i++) { const t = tileAt(x, y - i); if (!passable(t)) return i - 1; }
    return up;
  }
  // Is a straight run of cells clear (passable and allowed)? Endpoints excluded.
  function clearLine(x0, y0, x1, y1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 1; i < n; i++) {
      const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n);
      const t = tileAt(x, y);
      if (!passable(t) || !allowed(t, x, y)) return false;
    }
    return true;
  }
  // A coarse stand-in for the arc: up-over-down, or over-then-down/up. One must be clear.
  function clearPath(n, m) {
    const ax = n.x, ay = n.y, bx = m.x, by = m.y, top = Math.min(ay, by);
    const pts = (xs) => xs.every(([x, y]) => { const t = tileAt(x, y); return passable(t) && allowed(t, x, y); });
    if (pts([[ax, top], [bx, top]]) && clearLine(ax, ay, ax, top) && clearLine(ax, top, bx, top) && clearLine(bx, top, bx, by)) return true;
    if (pts([[bx, ay]]) && clearLine(ax, ay, bx, ay) && clearLine(bx, ay, bx, by)) return true;
    return clearLine(ax, ay, bx, by);
  }
  // [mech] syrup halves jump height (and so most of the gap); springs and aphids bounce
  const syrup = ents.filter((e) => e.type === 'terrain' && e.kind === 'syrup');
  const aphids = ents.filter((e) => e.type === 'aphid' || TYPES[e.type]?.spring);
  function launches(n) {
    const L = [];
    let R = st.rise, D = st.gap - HIT_W;
    if (n.kind === 'spot') {
      const below = tileAt(n.x, n.y + 1);
      if (syrup.some((e) => n.x >= e.wx && n.x < e.wx + (e.w || 1) && n.y + 1 >= e.wy && n.y + 1 < e.wy + (e.h || 1))) { R *= 0.5; D *= 0.7; }
      if (below?.spring) L.push({ R: below.spring - st.shrink, D: (st.gap - HIT_W) * Math.sqrt(below.spring / st.rise) });
      const aph = aphids.find((e) => Math.abs(e.wx - n.x) <= 1 && e.wy === n.y);
      if (aph) { const pw = aph.spring ?? TYPES[aph.type]?.spring ?? 5; L.push({ R: pw - st.shrink, D: (st.gap - HIT_W) * Math.sqrt(pw / st.rise) }); }
      L.push({ R, D });
      if (has('feather')) L.push({ R: R + MOVES.flutter.rise, D: D + 2 });
      if (has('band')) L.push({ R: REACH.moves.superJump.rise - st.shrink, D: REACH.moves.superJump.gap - HIT_W });
      if (has('glider')) L.push({ R, D, glide: REACH.moves.glide.ratio });
    } else if (n.kind === 'cling') {
      L.push({ R: REACH.crickets.pip.wallRise - st.shrink, D: 4, from: { x: n.x, y: n.y } });
      if (has('feather')) L.push({ R: REACH.crickets.pip.wallRise + MOVES.flutter.rise - st.shrink, D: 5 });
      if (has('glider')) L.push({ R: 2, D: 4, glide: REACH.moves.glide.ratio });
    } else if (n.kind === 'hook') {
      L.push({ R: 2, D: REACH.moves.swing.fling - HIT_W - st.shrink });
      L.push({ R: 0, D: 1 });
      if (has('glider')) L.push({ R: 2, D: 4, glide: REACH.moves.glide.ratio });
    }
    return L;
  }
  // [mech] lifts (steam, updrafts: glide only, misters) carry you to their top; doors link rooms
  const lifts = ents.filter((e) => e.type === 'lift').map((e) => ({ x0: e.wx, x1: e.wx + (e.w || 1) - 1, top: e.wy, bot: e.wy + (e.h || 4) - 1, glide: e.glide ?? e.kind === 'updraft' }));
  const doors = ents.filter((e) => e.type === 'door');
  function doorTarget(d) {
    const r = world.rooms[d.to]; if (!r || !rooms.includes(r)) return null;
    const m = d.at ? { x: d.at[0], y: d.at[1] } : (r.entities.find((e) => e.type === 'start') || r.entities.find((e) => e.type === 'save'));
    if (!m) return null;
    const x = r.cx * SCREEN_W + m.x; let y = r.cy * SCREEN_H + m.y;
    for (let i = 0; i < 20 && !standOn(tileAt(x, y + 1), x, y + 1); i++) y++; // falls to the floor
    return `${x},${y}`;
  }
  function search(startKey) {
    const nodes = buildNodes();
    const list = [...nodes.values()];
    const seen = new Set([startKey]);
    const q = [startKey];
    while (q.length) {
      const key = q.shift();
      const n = nodes.get(key);
      if (!n) continue;
      for (const d of doors) {
        if (d.needs && !has(d.needs)) continue;
        if (Math.abs(n.x - d.wx) > 1 || n.y < d.wy - 1 || n.y > d.wy) continue;
        const tk = doorTarget(d);
        if (tk && nodes.has(tk) && !seen.has(tk)) { seen.add(tk); q.push(tk); }
      }
      for (const L of lifts) {
        if (L.glide && !has('glider')) continue;
        if (n.x < L.x0 - 1 || n.x > L.x1 + 1 || n.y < L.top - 1 || n.y > L.bot + 1) continue;
        for (const m of list) {
          const mk = m.kind === 'hook' ? `h${m.x},${m.y - 2}` : `${m.x},${m.y}`;
          if (seen.has(mk)) continue;
          const ox = Math.max(L.x0, Math.min(L.x1, m.x)), oy = L.top;
          const dx = m.x - ox, up = oy - m.y;
          if (Math.abs(dx) > 30 || up > 3) continue;
          const ok = (L.glide || has('glider') ? glideEnv(dx, up, 1, st.gap - HIT_W, REACH.moves.glide.ratio) : envelope(dx, up, 1, st.gap - HIT_W)) && clearPath({ x: ox, y: oy }, m);
          if (ok) { seen.add(mk); q.push(mk); }
        }
      }
      const Ls = launches(n);
      const room = Math.floor(n.y / SCREEN_H);
      for (const m of list) {
        const mk = m.kind === 'hook' ? `h${m.x},${m.y - 2}` : `${m.x},${m.y}`;
        if (seen.has(mk)) continue;
        const dx = m.x - n.x, up = n.y - m.y;
        if (Math.abs(dx) > 30 || up > 12 || up < -40) continue;
        let ok = false;
        // walking along the floor / sliding down a wall
        if (n.kind !== 'hook' && up === 0 && Math.abs(dx) === 1) ok = true;
        if (n.kind === 'cling' && m.kind === 'cling' && dx === 0 && up === -1) ok = true;
        for (const l of Ls) {
          if (ok) break;
          const room2 = headroom(n.x, n.y, Math.min(Math.max(up, 0) + 1, l.R));
          if (up > room2 + 0.01 && n.kind === 'spot') continue;
          const tgtUp = m.kind === 'hook' ? up - 1 : up; // hooks grab from a tile below
          ok = l.glide ? glideEnv(dx, tgtUp, l.R, l.D, l.glide) : envelope(dx, tgtUp, l.R, l.D);
        }
        if (ok && m.kind !== 'hook' && n.kind !== 'hook' && !clearPath(n, m)) ok = false;
        if (ok && (m.kind === 'hook' || n.kind === 'hook') && !clearLine(n.x, n.y, m.x, m.y) && !clearPath(n, m)) ok = false;
        if (ok) { seen.add(mk); q.push(mk); }
      }
      void room;
    }
    return { seen, nodes };
  }
  // start
  const sr = world.rooms[zone.start.room];
  const sm = sr.entities.find((e) => e.type === 'start') || { x: 2, y: sr.th - 3 };
  const startKey = `${sr.cx * SCREEN_W + sm.x},${sr.cy * SCREEN_H + sm.y}`;
  const order = [];
  let res;
  for (let iter = 0; iter < 40; iter++) {
    res = search(startKey);
    const near = (e, r = 1) => { for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) if (res.seen.has(`${e.wx + dx},${e.wy + dy}`)) return true; return false; };
    let changed = false;
    const fresh = ents.filter((e) => e.type === 'item' && !items.has(e.item) && !denied.has(e.item) && near(e));
    for (const e of fresh) { items.add(e.item); order.push(`${e.item} (${e.room.id})`); changed = true; }
    // [mech] cages rescue (rescue gates), levers and keys flip, thermostats open (Frost home), side gates get touched
    for (const e of ents) {
      if (e.type === 'cage' && !rescued.has(e.cricket) && near(e)) { rescued.add(e.cricket); order.push(`rescue ${e.cricket}`); changed = true; }
      if (e.type === 'boss' && e.cricket && !rescued.has(e.cricket) && near(e, 3)) { rescued.add(e.cricket); order.push(`rescue ${e.cricket} (boss)`); changed = true; }
      if (e.type === 'switch' && !switches.has(e.id) && (e.by !== 'pound' || has('thimble')) && near(e, e.by === 'chirp' ? 2 : 1)) { switches.add(e.id); order.push(`switch ${e.id}`); changed = true; }
      if (e.type === 'thermostat' && !switches.has(e.id) && (rescued.has('frost') || extraFlags.includes('frost')) && near(e, 6)) { switches.add(e.id); order.push(`thermostat ${e.id}`); changed = true; }
      if (e.type === 'piano' && !switches.has(e.id) && has('thimble') && near({ ...e, wy: e.wy - 1 }, 1)) { switches.add(e.id); order.push(`piano ${e.id}`); changed = true; }
      if (e.type === 'gate' && e.opens?.side && ![...sides].some((g) => g.x === e.x && g.y === e.y && g.room === e.room)) {
        const w = e.w || 1, h = e.h || 1, sd = e.opens.side;
        const cells = [];
        for (let i = 0; i < Math.max(w, h); i++) cells.push(sd === 'left' ? [e.wx - 1, e.wy + Math.min(i, h - 1)] : sd === 'right' ? [e.wx + w, e.wy + Math.min(i, h - 1)] : sd === 'top' ? [e.wx + Math.min(i, w - 1), e.wy - 1] : [e.wx + Math.min(i, w - 1), e.wy + h]);
        if (cells.some(([x, y]) => res.seen.has(`${x},${y}`))) { sides.add(overlay.get(`${e.wx},${e.wy}`)?.gate); order.push(`gate ${e.id || e.x + ',' + e.y} from the ${sd}`); changed = true; }
      }
    }
    if (!changed) break;
  }
  const near = (e) => [-1, 0, 1].some((dx) => [-1, 0, 1].some((dy) => res.seen.has(`${e.wx + dx},${e.wy + dy}`)));
  const missingItems = ents.filter((e) => e.type === 'item' && !items.has(e.item)).map((e) => `${e.item} (${e.room.id})`);
  const cages = ents.filter((e) => e.type === 'cage');
  const cagesReached = cages.filter(near).map((e) => e.cricket);
  const roomsReached = rooms.filter((r) => [...res.seen].some((k) => { const [x, y] = k.replace('h', '').split(',').map(Number); return r.containsCell(Math.floor(x / SCREEN_W), Math.floor(y / SCREEN_H)); })).map((r) => r.id);
  return { pass: st.name, order, missingItems, cagesReached, cages: cages.map((c) => c.cricket), roomsReached, rooms: rooms.map((r) => r.id), nodes: res.nodes.size, reached: res.seen.size };
}

// ---- the house plan (data/house.js) ----
function checkPlan() {
  const errs = [], notes = [];
  const cells = new Map();
  for (const r of PLAN) for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
    const k = `${r.x + x},${r.y + y}`;
    if (cells.has(k)) errs.push(`plan: ${cells.get(k)} and ${r.id} overlap at cell ${k}`); else cells.set(k, r.id);
  }
  const inside = (r, cx, cy) => cx >= r.x && cx < r.x + r.w && cy >= r.y && cy < r.y + r.h;
  const step = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] };
  for (const l of PLAN_LINKS) {
    const a = PLAN_BY_ID[l.a], b = PLAN_BY_ID[l.b];
    if (!a || !b) { errs.push(`plan link ${l.a} -> ${l.b}: unknown room`); continue; }
    if (l.door) continue;
    const [cx, cy] = l.cell, [dx, dy] = step[l.side] || [0, 0];
    if (!inside(a, cx, cy)) errs.push(`plan link ${l.a} -> ${l.b}: cell ${cx},${cy} is not in ${l.a}`);
    else if (!inside(b, cx + dx, cy + dy)) errs.push(`plan link ${l.a} -> ${l.b}: the ${l.side} of cell ${cx},${cy} is not ${l.b} (it is ${cells.get(`${cx + dx},${cy + dy}`) || 'empty'})`);
  }
  // built rooms vs the plan
  const built = Object.values(world.rooms);
  let matched = 0;
  for (const r of built) {
    const p = PLAN_BY_ID[r.id];
    if (!p) { if (!(r.zone.n >= 98)) notes.push(`built room ${r.id} (${r.zone.id}) is not in house.js`); continue; }
    matched++;
    if (p.x !== r.cx || p.y !== r.cy || p.w !== r.sw || p.h !== r.sh) errs.push(`${r.id}: built at ${r.cx},${r.cy} ${r.sw}x${r.sh}, planned at ${p.x},${p.y} ${p.w}x${p.h}`);
    if (p.zone !== r.zone.id) errs.push(`${r.id}: built in zone ${r.zone.id}, planned in ${p.zone}`);
    if (!!p.dark !== r.dark) notes.push(`${r.id}: dark is ${r.dark}, planned ${!!p.dark}`);
    if ((p.needs || null) !== r.needs) notes.push(`${r.id}: needs '${r.needs}', planned '${p.needs || null}'`);
  }
  // exact links: the span must be open on both sides (gates built as solid tiles are skipped)
  const SOLIDISH = [K.SOLID, K.SLICK, K.CRACK, K.SOIL];
  for (const l of PLAN_LINKS.filter((x) => x.exact && !x.door)) {
    const a = world.rooms[l.a], b = world.rooms[l.b];
    if (!a || !b) continue;
    if (l.gate && ['cereal', 'damper'].includes(l.gate.kind)) continue;
    const [cx, cy] = l.cell, [s0, s1] = l.span;
    const vertical = l.side === 'left' || l.side === 'right';
    const tileOf = (room, wx, wy) => room.base[(wy - room.cy * SCREEN_H) * room.tw + (wx - room.cx * SCREEN_W)];
    const bad = [];
    for (let i = s0; i <= s1; i++) {
      let ax, ay, bx, by;
      if (vertical) { ay = by = cy * SCREEN_H + i; ax = l.side === 'right' ? (cx + 1) * SCREEN_W - 1 : cx * SCREEN_W; bx = l.side === 'right' ? ax + 1 : ax - 1; }
      else { ax = bx = cx * SCREEN_W + i; ay = l.side === 'bottom' ? (cy + 1) * SCREEN_H - 1 : cy * SCREEN_H; by = l.side === 'bottom' ? ay + 1 : ay - 1; }
      if (SOLIDISH.includes(tileOf(a, ax, ay)) || SOLIDISH.includes(tileOf(b, bx, by))) bad.push(i);
    }
    if (bad.length) errs.push(`link ${l.a} -> ${l.b} (${l.side}): span ${s0}-${s1} is closed at ${bad.join(',')}`);
  }
  const unbuilt = PLAN.filter((p) => !world.rooms[p.id]).map((p) => p.id);
  console.log(`house plan: ${PLAN.length} rooms, ${PLAN_LINKS.length} links; ${matched} built, ${unbuilt.length} not built yet${errs.length ? `; ${errs.length} problem(s)` : '; OK'}`);
  if (verbose && unbuilt.length) console.log(`   not built: ${unbuilt.join(', ')}`);
  for (const n of notes) console.log(`   note: ${n}`);
  for (const e of errs) console.log(`   FAIL: ${e}`);
  return errs.length;
}

// ---- the prerequisite graph (data/zones.js) ----
function checkGraph() {
  const errs = [];
  const { states, entries } = exploreRoutes();
  const sub = (a, b) => a.every((x) => b.includes(x));
  for (let n = 1; n <= 10; n++) {
    const info = ZONE_INFO[n], ent = entries[n] || [];
    if (!ent.length) { errs.push(`zone ${n} can never be entered`); continue; }
    for (const e of ent) if (!(info.minItems || [[]]).some((m) => sub(m, e.items))) errs.push(`zone ${n} can be entered with [${e.items}] which holds none of its minItems`);
    for (const m of info.minItems || []) if (!ent.some((e) => sub(e.items, m))) errs.push(`zone ${n}: minItems [${m}] never occurs as an entry state`);
    if (PREREQ[n].rescues && ent.some((e) => e.rescued.length < PREREQ[n].rescues)) errs.push(`zone ${n} opens before ${PREREQ[n].rescues} rescues`);
  }
  if (entries[10]?.some((e) => e.rescued.length < 9)) errs.push('the Attic opens before nine rescues');
  // every state can still reach the end (all ten crickets): a reachable state with nothing left to do but unfinished = softlock
  const all = Object.values(ZONE_INFO).filter((z) => typeof z.n === 'number' && z.cricket).map((z) => z.cricket);
  const won = states.filter((s) => all.every((c) => s.rescued.includes(c)));
  if (!won.length) errs.push('no route rescues all ten crickets');
  const orders = new Set(states.filter((s) => s.rescued.length === 10).map((s) => s.items.join('+'))).size;
  console.log(`route graph: ${states.length} states over every valid order; ${won.length ? 'the game can be finished' : 'NOT finishable'}; ${orders} final item set(s)${errs.length ? `; ${errs.length} problem(s)` : '; OK'}`);
  if (verbose) for (let n = 1; n <= 10; n++) console.log(`   zone ${n}: entered in ${(entries[n] || []).length} distinct states; minItems ${JSON.stringify(ZONE_INFO[n].minItems)}`);
  for (const e of errs) console.log(`   FAIL: ${e}`);
  return errs.length;
}

let failed = 0;
const onlyPlan = args.includes('--plan'), onlyGraph = args.includes('--graph');
if (onlyZone == null || onlyPlan || onlyGraph) {
  if (!onlyGraph) failed += checkPlan();
  if (!onlyPlan) failed += checkGraph();
  if (onlyPlan || onlyGraph) process.exit(failed ? 1 : 0);
}
for (const zone of ZONES) {
  if (onlyZone != null && String(zone.n) !== onlyZone && zone.id !== onlyZone) continue;
  const info = ZONE_INFO[zone.n] || zone; // test zones carry their own minItems / rescued
  const passes = passArg ? [passArg] : zone.n >= 98 ? ['pip', 'strongest'] : ['weakest', 'strongest'];
  if (!zone.start || !world.rooms[zone.start.room]) { console.log(`${zone.id}: no start room yet; skipped`); continue; }
  for (const pass of passes) {
    const start = [...(info.minItems?.[0] || []), ...extraItems];
    const r = check(zone, pass, start, [...(info.rescued || []), ...extraRescued]);
    const ok = !r.missingItems.length && r.cagesReached.length === r.cages.length;
    const main = pass === passes[0];
    if (!ok && main) failed++;
    console.log(`${zone.id} [${r.pass}] ${ok ? 'OK' : main ? 'FAIL' : 'note'}: ${r.reached}/${r.nodes} nodes; rooms ${r.roomsReached.length}/${r.rooms.length}; items in order: ${r.order.join(' -> ') || 'none'}`);
    if (r.missingItems.length) console.log(`   unreachable items: ${r.missingItems.join(', ')}`);
    if (r.cages.length) console.log(`   rescues reached: ${r.cagesReached.join(', ') || 'none'} of ${r.cages.join(', ')}`);
    if (verbose) console.log(`   rooms not reached: ${r.rooms.filter((x) => !r.roomsReached.includes(x)).join(', ') || 'none'}`);
  }
}
process.exit(failed ? 1 : 0);
