// Room art (issue #5): every file a room draws is loaded before the room is shown, and the rooms
// it links to load in the background, so art never pops in (no stand-in shapes, no missing gecko).
//
//   roomArt(game, room)  -> { gate, soon, late }: the asset paths (images and the JSON they need) the
//                           room draws on its first frames, in load order, and the rest.
//                           gate: 1. the painting and textures; 2. the room's things: decor
//                           (dozing geckos too), hiding spots, saves, sound holes, hooks, items,
//                           cages, enemies, mechanics, talkers, crumbs, and the boss's props,
//                           captives and gecko rig; 3. the party's base, idle, run and leap.
//                           soon: the near-layer silhouettes (asked for at once, low priority, not
//                           waited for). late: soon, then the party's other looks.
//                           The rules come from the drawing code that owns them (render.js,
//                           mech-draw.js, cricket-art.js, geckos.js, meta.js, each boss's art()).
//   ArtGate              -> main.js calls check(game) every step and frame. On a room change (new
//                           game, load, door, edge, zone change) it asks for the gate list in order
//                           and, if any of it is still loading, holds: the sim waits and the
//                           renderer draws an ink cover until it's in (or until nothing has
//                           arrived for STALL_MS, or CAP_MS in all, so a slow or broken file never
//                           blocks play). Then, in the background, two files at a time at low
//                           priority: the late list, the neighbours, and any prefetch() rooms.
//                           bossWaiting(game): the boss's rig isn't loaded (main.js keeps the
//                           boss from acting until it can be seen; game.bossWait).
//
// Memory (design: "Phones and memory"): on each room change the zone set (sprites.setZone) is
// the current room's zone plus its neighbours' (and prefetch rooms') zones (paintings, textures,
// the geckos of those zones), so leaving a zone still releases its art, but never anything on
// screen or next door.
//
// Safety net: while it holds, files the draws ask for that the list missed are waited for too,
// and ?artcheck in the URL logs every draw miss the list didn't cover (sprites.js), so a new
// kind of art can't silently pop in. Headless tools never load this (it is main.js's).
import * as S from './sprites.js';
import * as Geckos from './geckos.js';
import { TYPES as ENEMIES, ALIAS } from './enemies.js';
import { MECH_TYPES } from './mechanics.js';
import { BOSSES } from './bosses/index.js';
import { roomLook, bgFolder, bgFor, itemArt, npcFrame, terrainKinds, terrainPath, nearList, propPath, hideArtOf, enemyFrames } from './render.js';
import { mechArt } from './mech-draw.js';
import { lookFiles, LOOKS } from './cricket-art.js';
import { pickupFile } from './meta.js';

const STALL_MS = 6000;   // nothing new arrived for this long: show the room anyway (missing art then draws its stand-in until it lands)
const CAP_MS = 10000;   // never hold longer than this: a short wait beats a long ink screen on a slow line
const LABEL_MS = 600;    // "Loading" appears on the cover after this
const FADE = 12;         // frames the cover fades over after a hold (when no transition runs)
const BG_SLOTS = 2;      // background loads at a time, so the next room never queues behind them
const FIRST_LOOKS = ['base', 'idle', 'run', 'leap']; // the party's looks the gate waits for (a room is often entered in the air)

const geckoDir = (n) => `sprites/geckos/${n}/`;
const geckoArt = (n) => [`${geckoDir(n)}meta.json`, ...Geckos.files(n)];
// what a boss entity draws: { gecko, props, crickets: { id: [looks] } } (each boss's art())
const bossArt = (e, game) => BOSSES[e.boss]?.art?.(e, game) || { gecko: null, props: [], crickets: {} };

// the geckos a room shows (dozing decor, its boss's rig)
function roomGeckos(room) {
  const out = new Set();
  for (const d of roomLook(room).decor || []) if (d.gecko) out.add(d.gecko);
  for (const e of room.entities) if (e.type === 'boss') { const g = bossArt(e, null).gecko; if (g) out.add(g); }
  return out;
}

// What `room` draws, for this game's state (party, items, rescues, meta): { gate, late }.
export function roomArt(game, room) {
  const tiers = [new Set(), new Set(), new Set(), new Set()];
  const add = (t, p) => { if (p && S.exists(p)) tiers[t].add(p); }, addAll = (t, l) => l.forEach((p) => add(t, p));
  const look = roomLook(room), folder = bgFolder(room.zone);
  const p = game.player, has = (i) => !!p?.has?.(i), rescued = game.rescued || new Set();
  // 1. painting, zone texture, terrain swatches (render.js drawBackground, screenCanvas)
  const o = bgFor(room), bf = look.bg?.folder || folder;
  add(0, S.bgPath(bf, o.v) || S.bgPath(bf, 'a'));
  add(0, `textures/${folder}.webp`);
  for (const k of terrainKinds(room)) add(0, terrainPath(k));
  // 2. decor (drawDecor): props and dozing geckos
  for (const d of look.decor || []) {
    if (d.after && !rescued.has(d.after)) continue;
    if (d.gecko) addAll(1, geckoArt(d.gecko)); else if (d.prop) add(1, propPath(d.prop));
  }
  // 2. entities (game.buildEntities, drawEntities, mech-draw.js, main.js drawMetaWorld, the boss)
  const taken = game.roomState?.[room.id]?.taken;
  for (const e of room.entities) {
    switch (e.type) {
      case 'hook': add(1, 'props/hook.png'); break;
      case 'hide': case 'hideSmall': { const art = hideArtOf(e); if (art && art !== 'none') add(1, propPath(art)); break; }
      case 'save': add(1, 'props/save-crack.png'); break;
      case 'beacon': add(1, 'props/sound-hole.png'); break;
      case 'item': if (!has(e.item)) add(1, itemArt(e.item)); break;
      case 'cage': if (!rescued.has(e.cricket)) { add(1, 'props/bamboo-cage.png'); addAll(1, lookFiles(e.cricket, ['idle', 'listen'])); } break;
      case 'boss': {
        const b = bossArt(e, game);
        if (b.gecko) addAll(1, geckoArt(b.gecko));
        for (const x of b.props) add(1, propPath(x));
        for (const [id, looks] of Object.entries(b.crickets)) addAll(1, lookFiles(id, looks));
        break;
      }
      case 'npc': if (!taken?.has(`npc@${e.x},${e.y}`)) { add(1, npcFrame(e.who, false)); add(1, `sprites/npcs/${e.who}-talk.png`); } break;
      case 'crumbs': case 'secret': add(1, `items/${pickupFile(e)}.png`); break;
      default: {
        if (MECH_TYPES.includes(e.type)) { for (const m of mechArt(e)) add(1, propPath(m)); break; }
        const T = ENEMIES[ALIAS[e.type] || e.type];
        if (T?.sprite) addAll(1, enemyFrames(T.sprite));
      }
    }
  }
  // 3. the party, as it first shows (drawPlayer)
  for (const id of p?.trio || []) addAll(2, lookFiles(id, FIRST_LOOKS));
  const gate = [...new Set(tiers.flatMap((t) => [...t]))], inGate = new Set(gate);
  // soon: the near-layer silhouettes (drawNear: faint, in front; asked for at once, low priority,
  // not waited for); late: soon, then the party's other looks
  const keep = (l) => [...new Set(l)].filter((f) => !inGate.has(f) && S.exists(f));
  const soon = keep(nearList(room).map((n) => propPath(n.prop)));
  const late = keep([...soon, ...(p?.trio || []).flatMap((id) => lookFiles(id, LOOKS))]);
  return { gate, soon, late };
}
const allArt = (game, room) => { const a = roomArt(game, room); return [...a.gate, ...a.late]; };

// Rooms one step away: across an edge (the house grid) or through a door / lair entrance.
export function neighbours(world, room) {
  const out = new Set();
  for (let y = room.cy - 1; y <= room.cy + room.sh; y++) for (let x = room.cx - 1; x <= room.cx + room.sw; x++) {
    const nb = world.roomAtCell(x, y);
    if (nb && nb !== room) out.add(nb);
  }
  for (const e of room.entities) if (e.to && world.rooms[e.to] && world.rooms[e.to] !== room) out.add(world.rooms[e.to]);
  return [...out];
}

// The per-zone prefixes to keep (sprites.setZone): the zones of these rooms, with every gecko
// and borrowed painting in them.
const zoneMemo = new WeakMap();
function zonePrefixes(world, zone) {
  if (zoneMemo.has(zone)) return zoneMemo.get(zone);
  const f = bgFolder(zone), out = new Set([`bg/${f}/`, `textures/${f}.webp`]);
  for (const r of Object.values(world.rooms)) {
    if (r.zone !== zone) continue;
    const bf = roomLook(r).bg?.folder; if (bf) out.add(`bg/${bf}/`);
    for (const g of roomGeckos(r)) out.add(geckoDir(g));
  }
  const list = [...out];
  zoneMemo.set(zone, list);
  return list;
}
export function zoneKeep(world, rooms) {
  const out = new Set();
  for (const r of rooms) for (const p of zonePrefixes(world, r.zone)) out.add(p);
  for (const r of rooms) for (const g of roomGeckos(r)) out.add(geckoDir(g)); // a dozing gecko outside its own zone
  return [...out];
}

const now = () => performance.now();

export class ArtGate {
  constructor() {
    this.game = null; this.room = null; this.holding = false;
    this.need = []; this.watched = null; this.settledN = 0;
    this.t0 = null; this.enteredAt = 0; this.lastProgress = 0; this.fade = 0; this.last = null;
    this.gen = 0; this.bg = []; this.bgBusy = new Set(); this.extra = []; this.nbs = [];
  }
  // Call with the live game every step and before every frame. visible = false while a story
  // panel covers the game: the room's art starts loading, but the timeouts don't run yet.
  // Returns true while the room is held (the sim should wait).
  check(game, visible = true) {
    if (!game?.room || game.inCarrier) { if (this.holding) this.done(true); this.game = game; this.room = null; return false; }
    if (game !== this.game || game.room !== this.room) this.enter(game);
    if (this.holding) this.poll(visible);
    return this.holding;
  }
  // Rooms to load in the background as well, until they are entered (the first Bedroom room
  // during the opening panels: the tank doesn't link to it).
  prefetch(rooms) { this.extra = rooms.filter(Boolean); this.queue(); }
  // The boss's gecko isn't loaded yet: it mustn't act unseen (main.js sets game.bossWait).
  bossWaiting(game) {
    if (!game?.boss || !game.room) return false;
    const e = game.room.entities.find((x) => x.type === 'boss');
    const g = e && bossArt(e, game).gecko;
    return !!g && !Geckos.ready(g);
  }
  enter(game) {
    this.game = game; this.room = game.room; this.gen++;
    this.extra = this.extra.filter((r) => r !== game.room);
    const nbs = neighbours(game.world, game.room);
    S.setZone(zoneKeep(game.world, [game.room, ...nbs, ...this.extra]));
    this.nbs = nbs;
    const a = roomArt(game, game.room);
    this.need = a.gate; S.need(this.need);
    S.need(a.soon, 'low'); // the near layer: asked for now (it's drawn at once) but behind the gate, and not waited for
    this.enteredAt = now(); this.t0 = null; this.settledN = 0;
    if (this.need.every(S.settled)) { this.holding = true; this.done(false); return; }
    this.holding = true; this.watched = new Set(); S.watch(this.watched);
    this.queue(); // prefetch rooms load under a story panel once this room's files are in
  }
  poll(visible) {
    const t = now();
    if (this.t0 == null) {
      if (!visible) { if (this.need.every(S.settled)) this.pump(this.gen); return; } // under a story panel: the room is in, the prefetch rooms may load
      this.t0 = t; this.lastProgress = t;
    }
    this.need = roomArt(this.game, this.room).gate; S.need(this.need);
    const all = [...new Set([...this.need, ...this.watched])];
    const n = all.filter(S.settled).length;
    this.total = all.length;
    if (n > this.settledN) { this.settledN = n; this.lastProgress = t; }
    if (n === all.length) { this.done(false); return; }
    if (t - this.lastProgress > STALL_MS || t - this.t0 > CAP_MS) {
      console.warn(`[art] ${this.room.id}: showing the room without ${all.filter((p) => !S.settled(p)).join(', ')}`);
      this.done(true);
    }
  }
  done(timedOut) {
    if (!this.holding) return;
    const held = this.t0 != null ? now() - this.t0 : 0, waited = this.watched != null;
    S.watch(null); this.watched = null; this.holding = false;
    // a held room fades in, unless its own transition (wipe, fade) is still to run
    this.fade = waited && !this.game?.trans ? FADE : 0;
    this.last = { room: this.room?.id, files: this.need.length, held: waited, heldMs: Math.round(held), timedOut: !!timedOut };
    this.queue();
  }
  // The cover to draw over this frame, or null: { alpha, label }.
  cover() {
    if (this.holding && this.watched) {
      const t = this.t0 == null ? 0 : now() - this.t0;
      return { alpha: 1, label: t > LABEL_MS ? `Loading... ${this.settledN}/${this.total || this.need.length}` : '' };
    }
    if (this.fade > 0) return { alpha: this.fade-- / FADE, label: '' };
    return null;
  }
  // The background list, in order: this room's late files, its neighbours, the prefetch rooms.
  // While a room is held on screen only the hold loads (pump).
  queue() {
    const game = this.game, room = this.room, extra = this.extra.map((r) => () => allArt(game, r));
    if (!game) return;
    const late = () => (room ? roomArt(game, room).late : []), nbs = this.nbs.map((r) => () => allArt(game, r));
    // under a story panel (held, not on screen) the prefetch rooms come before the neighbours
    this.bg = this.holding && this.t0 == null ? [late, ...extra, ...nbs] : [late, ...nbs, ...extra];
    this.pump(this.gen);
  }
  // BG_SLOTS files at a time, at low fetch priority
  pump(gen) {
    const free = () => !this.holding || (this.t0 == null && this.need.every(S.settled)); // never ahead of the room's own files
    while (gen === this.gen && free() && this.bgBusy.size < BG_SLOTS) {
      const p = this.nextBg();
      if (!p) return;
      this.bgBusy.add(p);
      S.load(p).then(() => { this.bgBusy.delete(p); this.pump(this.gen); });
    }
  }
  nextBg() {
    while (this.bg.length) {
      const left = this.bg[0]().filter((p) => !S.settled(p));
      if (!left.length) { this.bg.shift(); continue; }
      return left.find((p) => !this.bgBusy.has(p)) || null; // the rest are on their way
    }
    return null;
  }
  info() {
    const left = (r) => allArt(this.game, r).filter((p) => !S.settled(p)).length;
    return { holding: this.holding, room: this.room?.id, need: this.need.length, settled: this.settledN, last: this.last, background: this.bg.length, bgBusy: [...this.bgBusy],
      bossWait: !!this.game?.bossWait, prefetch: this.extra.map((r) => ({ id: r.id, left: left(r) })) };
  }
}
