// Room art (issue #5): every file a room draws is loaded before the room is shown, and the rooms
// it links to load in the background, so art never pops in (no stand-in shapes, no missing gecko).
//
//   roomArt(game, room)  -> the asset paths the room will draw (images and the JSON they need):
//                           painting, textures, near props, decor (dozing geckos too), hiding spots,
//                           save cracks, sound holes, hooks, items, cages, enemies, mechanics, the
//                           boss's props, captive and rig, talkers, crumbs, and the party's crickets.
//   ArtGate              -> main.js calls check(game) every step and frame. On a room change (new
//                           game, load, door, edge, zone change) it asks for the room's art and, if
//                           any of it is still loading, holds: the sim waits and the renderer draws
//                           an ink cover until it's in (or until nothing has arrived for STALL_MS,
//                           or CAP_MS in all, so a slow or broken file never blocks play). Then the
//                           neighbours load in the background, two files at a time.
//
// Memory (design: "Phones and memory"): on each room change the zone set (sprites.setZone) is
// the current room's zone plus its neighbours' zones (paintings, textures, the geckos of those
// zones), so leaving a zone still releases its art, but never anything on screen or next door.
//
// Safety net: while it holds, files the draws ask for that this list missed are waited for too,
// and ?artcheck in the URL logs every draw miss the list didn't cover (sprites.js), so a new
// kind of art can't silently pop in. Headless tools never load this (it is main.js's).
import * as S from './sprites.js';
import * as Geckos from './geckos.js';
import { TYPES as ENEMIES, ALIAS } from './enemies.js';
import { MECH_TYPES } from './mechanics.js';
import { roomLook, bgFolder, bgFor, NEAR, itemArt, npcFrame } from './render.js';
import { secretKind } from './meta.js';
import { ASSET_FILES } from '../data/assets.js';

const STALL_MS = 6000;   // nothing new arrived for this long: show the room anyway (missing art then draws its stand-in until it lands)
const CAP_MS = 10000;   // never hold longer than this: a short wait beats a long ink screen on a slow line
const LABEL_MS = 600;    // "Loading" appears on the cover after this
const FADE = 12;         // frames the cover fades over after a hold (when no transition runs)
const BG_SLOTS = 2;      // background (neighbour) loads at a time, so the next room never queues behind them

const propPath = (p) => (p.includes('/') ? p : `props/${p}.png`);
const geckoDir = (n) => `sprites/geckos/${n}/`;

// Bosses draw their own props, captives and rig (src/bosses/*.js); what each one needs.
// gecko: the rig (default: e.rig, else the boss name when it is a gecko); crickets: id -> looks.
const BOSS_ART = {
  tank: (e) => ({ gecko: e.beat === 'sand' ? 'duchess' : null, props: ['tongs', 'pebble', 'mesh-lid', 'feeder-cup', 'feeder-cup-tipped'] }),
  practice: () => ({ gecko: 'duchess' }),
  duchess: () => ({ props: ['feeder-cup', 'feeder-cup-tipped', 'cup-tab', 'cup-tab-pulled'], crickets: { stripe: ['idle'] } }),
  chikchak: () => ({ props: ['steam-puff', 'faucet-handle'], crickets: { katy: ['idle'] } }),
  bigtok: () => ({ props: ['cork', 'wooden-spoon', 'sponge'], crickets: { duo: ['idle'] } }),
  lashes: () => ({ props: ['grape', 'banana-slice', 'jam-blob'], crickets: { frost: ['idle', 'chirp'] } }),
  peridot: () => ({ props: ['pull-chain'], crickets: { hump: ['idle', 'kick'] } }),
  gargy: () => ({ props: ['throw-pillow', 'tv-remote'], crickets: { jam: ['idle', 'chirp'] } }),
  mossy: () => ({ props: ['bamboo-cage'] }),
  kite: () => ({ props: ['leaf-glider'], crickets: { digby: ['leap', 'cling'] } }),
  ember: () => ({ crickets: { mote: ['idle', 'peek'] } }),
  barty: () => ({ props: ['sprites/npcs/barty-eye.png', 'sprites/npcs/barty-head.png', 'sprites/npcs/barty-head-black.png', 'sprites/npcs/barty-claw.png'] }),
  nana: () => ({ crickets: { chip: ['idle', 'leap'] } }),
};
function bossArt(e) {
  const a = BOSS_ART[e.boss]?.(e) || {};
  const gecko = a.gecko !== undefined ? a.gecko : (e.rig || (Geckos.NAMES.includes(e.boss) ? e.boss : null));
  return { gecko, props: a.props || [], crickets: a.crickets || {} };
}

// a cricket's files: every one but the portrait (the party), or a few looks (a captive)
const cricketAll = new Map();
function cricketArt(id, looks) {
  const base = `sprites/crickets/${id}/`;
  if (!looks) {
    if (!cricketAll.has(id)) cricketAll.set(id, ASSET_FILES.filter((f) => f.startsWith(base) && !f.endsWith('/portrait.png')));
    return cricketAll.get(id);
  }
  const out = [base + 'base.png', base + 'anchors.json', base + 'poses/fit.json'];
  for (const l of looks) { out.push(...S.frames(base + 'anim/' + l), base + `poses/${l}.png`); }
  return out;
}
// a gecko rig: meta.json first; its legs and frames join the list once meta.json is in
const geckoArt = (n) => [`${geckoDir(n)}meta.json`, ...Geckos.files(n)];

// the geckos a room shows (dozing decor, its boss's rig)
function roomGeckos(room) {
  const out = new Set();
  for (const d of roomLook(room).decor || []) if (d.gecko) out.add(d.gecko);
  for (const e of room.entities) if (e.type === 'boss') { const g = bossArt(e).gecko; if (g) out.add(g); }
  return out;
}

// Everything `room` draws, for this game's state (party, items, rescues, meta).
export function roomArt(game, room) {
  const out = new Set(), add = (p) => { if (p && S.exists(p)) out.add(p); }, addAll = (l) => l.forEach(add);
  const look = roomLook(room), zone = room.zone, folder = bgFolder(zone);
  const p = game.player, has = (i) => !!p?.has?.(i), rescued = game.rescued || new Set();
  // painting, zone texture, terrain swatches (render.js drawBackground, screenCanvas, terrainReady)
  const o = bgFor(room), bf = look.bg?.folder || folder;
  add(S.bgPath(bf, o.v) || S.bgPath(bf, 'a'));
  add(`textures/${folder}.webp`);
  const kinds = new Set(['cereal', 'soil', ...Object.values(look.terrainKinds || {})]);
  for (const r of look.paint || []) if (r.kind) kinds.add(r.kind);
  for (const k of kinds) add(`textures/terrain-${k}.webp`);
  // near-layer silhouettes (drawNear)
  if (look.near !== false && !room.dark) for (const n of look.near || zone?.near || NEAR[folder] || []) add(propPath(typeof n === 'string' ? n : n.prop));
  // decor (drawDecor): props and dozing geckos
  for (const d of look.decor || []) {
    if (d.after && !rescued.has(d.after)) continue;
    if (d.gecko) addAll(geckoArt(d.gecko)); else if (d.prop) add(propPath(d.prop));
  }
  // the party (drawPlayer)
  for (const id of p?.trio || []) addAll(cricketArt(id));
  // entities (game.buildEntities, drawEntities, drawMech, main.js drawMetaWorld)
  const taken = game.roomState?.[room.id]?.taken;
  for (const e of room.entities) {
    switch (e.type) {
      case 'hook': add('props/hook.png'); break;
      case 'hide': case 'hideSmall': { const art = e.art || (e.type === 'hideSmall' || e.small ? null : 'hide-log'); if (art && art !== 'none') add(propPath(art)); break; }
      case 'save': add('props/save-crack.png'); break;
      case 'beacon': add('props/sound-hole.png'); break;
      case 'item': if (!has(e.item)) add(itemArt(e.item)); break;
      case 'cage': if (!rescued.has(e.cricket)) { add('props/bamboo-cage.png'); addAll(cricketArt(e.cricket, ['idle', 'listen'])); } break;
      case 'boss': { const b = bossArt(e); if (b.gecko) addAll(geckoArt(b.gecko)); b.props.forEach((x) => add(propPath(x))); for (const [id, looks] of Object.entries(b.crickets)) addAll(cricketArt(id, looks)); break; }
      case 'npc': if (!taken?.has(`npc@${e.x},${e.y}`)) { add(npcFrame(e.who, false)); add(`sprites/npcs/${e.who}-talk.png`); } break;
      case 'crumbs': add('items/crumb.png'); break;
      case 'secret': { const k = secretKind(e.id || ''); add(`items/${k === 'heart' ? 'seed-heart' : k === 'song' ? 'song-seed' : 'crumb'}.png`); break; }
      case 'spring': add('props/cushion.png'); break;
      case 'gate': if (e.card === 'damper') add('props/damper.png'); break;
      case 'piano': add('props/piano-key.png'); break;
      case 'thermostat': add('props/thermostat-lock.png'); break;
      case 'switch': if (e.draw !== false && (e.by === 'up' || e.by === 'touch')) add('props/pull-chain.png'); break;
      case 'lift': add(`props/${{ updraft: 'dryer-vent', mister: 'mister-nozzle' }[e.kind] || 'steam-vent'}.png`); add('props/steam-puff.png'); break;
      case 'push': add(propPath(e.prop || ((e.kind || 'box') === 'box' ? '' : e.kind))); break;
      default: {
        if (MECH_TYPES.includes(e.type)) break;
        const T = ENEMIES[ALIAS[e.type] || e.type];
        if (T?.sprite) for (const f of [0, 1, 2]) add(`${T.sprite}/${f}.png`);
      }
    }
  }
  return [...out];
}

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
    this.gen = 0; this.bgRooms = []; this.bgBusy = new Set();
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
  enter(game) {
    this.game = game; this.room = game.room; this.gen++; this.bgRooms = [];
    const nbs = neighbours(game.world, game.room);
    S.setZone(zoneKeep(game.world, [game.room, ...nbs]));
    this.nbs = nbs;
    this.need = roomArt(game, game.room); S.need(this.need);
    this.enteredAt = now(); this.t0 = null; this.settledN = 0;
    if (this.need.every(S.settled)) { this.holding = true; this.done(false); return; }
    this.holding = true; this.watched = new Set(); S.watch(this.watched);
  }
  poll(visible) {
    const t = now();
    if (this.t0 == null) { if (!visible) return; this.t0 = t; this.lastProgress = t; }
    this.need = roomArt(this.game, this.room); S.need(this.need); // grows once a rig's meta.json is in
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
    if (this.room) { this.bgRooms = [...this.nbs]; this.pump(this.gen); }
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
  // neighbours in the background, BG_SLOTS files at a time; paused while a room is held
  pump(gen) {
    while (gen === this.gen && !this.holding && this.bgBusy.size < BG_SLOTS) {
      const p = this.nextBg();
      if (!p) return;
      this.bgBusy.add(p);
      S.load(p).then(() => { this.bgBusy.delete(p); this.pump(this.gen); });
    }
  }
  nextBg() {
    while (this.bgRooms.length) {
      const left = roomArt(this.game, this.bgRooms[0]).filter((p) => !S.settled(p));
      if (!left.length) { this.bgRooms.shift(); continue; }
      return left.find((p) => !this.bgBusy.has(p)) || null; // the rest are on their way (a rig's meta.json, say)
    }
    return null;
  }
  info() { return { holding: this.holding, room: this.room?.id, need: this.need.length, settled: this.settledN, last: this.last, background: this.bgRooms.map((r) => r.id), bgBusy: [...this.bgBusy] }; }
}
