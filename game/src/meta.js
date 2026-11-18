// Meta progress that isn't the sim's: crumbs, upgrades, secrets, the Carrier's arrivals, map
// stitches, where each beacon was first heard, sounds heard, flags. It lives on game.meta
// (a plain object, saved with the slot). No DOM here, so tools can read it.
import { CRICKETS, CRICKET_IDS } from '../data/crickets.js';
import { TOTALS as HOUSE_TOTALS, SECRETS, ROOMS as HOUSE_ROOMS, LAIRS } from '../data/house.js';

export const RECRUITS = ['rolo', 'page', 'lumen', 'dot', 'weft', 'crumb', 'glim', 'shelly'];
export const NOT_CRICKETS = ['peeper', 'soot', 'velvet', 'beep'];
export const RESCUABLE = CRICKET_IDS.filter((id) => id !== 'pip'); // the 10 to rescue

// 100%: 10 crickets, 8 recruits, 4 Not-Crickets, Sir Bartholomew, all seed-hearts and song-seeds.
// Seed-hearts and song-seeds are `secret` pickups whose id is a data/house.js SECRETS id
// (kind 'seedHeart' / 'songSeed'), or any id starting 'heart:' / 'song:'. Totals from house.js.
export const TOTALS = { hearts: HOUSE_TOTALS.seedHearts || 5, songs: HOUSE_TOTALS.songSeeds || 5 };
const SECRET_KIND = Object.fromEntries((SECRETS || []).map((x) => [x.id, x.kind]));
export function secretKind(id) {
  const k = SECRET_KIND[id];
  if (k === 'seedHeart' || id.startsWith('heart:')) return 'heart';
  if (k === 'songSeed' || id.startsWith('song:')) return 'song';
  if (k === 'crumbs' || id.startsWith('crumbs:')) return 'crumbs';
  return k || 'secret';
}

export function fresh() {
  return {
    crumbs: 0,
    upgrades: { hearts: 0, songs: 0, ears: 0 },   // bought in the Crumb Shop
    secrets: [],          // ids of secrets taken ('heart:bed', 'song:tub', 'cache:pantry-1', ...)
    notCrickets: [],      // Not-Crickets met and moved in
    barty: false,         // Sir Bartholomew befriended
    shown: [],            // arrival ids whose Carrier object has popped in already
    stitches: [],         // Weft's map stitches: [{x, y}] in house cells (fractional)
    heardAt: {},          // zoneId -> {room, x, y} where the beacon was first heard
    sounds: ['pip'],      // Sound Book ids heard
    songs: [],            // music tracks heard (Stage jukebox)
    lairsSeen: [],        // geckos met at their lair door
    cracks: [],           // save cracks used: [{room, tx, ty}] (Post fast travel)
    flags: {},            // free-form flags for zone builders and the story
    damperOpen: false,
    opened: false,        // the opening has been watched
    won: false,
  };
}
export function ensure(game) {
  if (!game.meta) game.meta = fresh();
  const m = game.meta, f = fresh();
  for (const k of Object.keys(f)) if (m[k] === undefined) m[k] = f[k];
  return m;
}

// Everyone who has arrived at the Carrier (in arrival-table terms).
export function arrived(game) {
  const m = ensure(game);
  const out = [];
  for (const id of RESCUABLE) if (game.rescued.has(id)) out.push(id);
  for (const id of RECRUITS) if (game.recruits.has(id)) out.push(id);
  for (const id of NOT_CRICKETS) if (m.notCrickets.includes(id)) out.push(id);
  if (m.barty) out.push('barty');
  return out;
}
// [final-S] The lair's save crack (design: after a rescue, "Return to the Carrier?" then back to
// the lair's save crack): the save crack nearest the lair door in the room whose lairDoor is the
// arena (house.js). arena: the arena room id, or a boss name. null if there is none.
export function lairCrack(world, arena) {
  const roomId = LAIRS[arena]?.room || arena;
  const door = HOUSE_ROOMS.find((r) => r.lairDoor === roomId);
  const r = door && world.rooms[door.id];
  if (!r) return null;
  const saves = r.entities.filter((e) => e.type === 'save');
  if (!saves.length) return null;
  const lair = r.entities.find((e) => e.type === 'lair') || saves[0];
  const s = saves.reduce((a, b) => (Math.hypot(b.x - lair.x, b.y - lair.y) < Math.hypot(a.x - lair.x, a.y - lair.y) ? b : a));
  return { room: r.id, tx: s.x, ty: s.y };
}
// [final-S] Where a save made in the Carrier with no crack yet sends you: zone 1's start crack.
export function homeCrack(world) {
  const z = Object.values(world.zones || {}).find((zz) => zz.n === 1);
  const r = z && world.rooms[z.start.room];
  if (!r) return null;
  const s = r.entities.find((e) => e.type === 'save');
  return s ? { room: r.id, tx: s.x, ty: s.y } : { room: r.id, tx: null, ty: null };
}
export const isHubCrack = (c) => !c || typeof c.room !== 'string' || c.room.startsWith('carrier-');
export function rescueCount(game) { return RESCUABLE.filter((id) => game.rescued.has(id)).length; }
// The Carrier's painting: bare box (0-2), moss and a second level (3), lights and windows (6), rooftops (9).
export function shellStage(n) { return n >= 9 ? 3 : n >= 6 ? 2 : n >= 3 ? 1 : 0; }

export function completion(game) {
  const m = ensure(game);
  const hearts = m.secrets.filter((s) => secretKind(s) === 'heart').length;
  const songs = m.secrets.filter((s) => secretKind(s) === 'song').length;
  const got = rescueCount(game) + RECRUITS.filter((r) => game.recruits.has(r)).length + m.notCrickets.length + (m.barty ? 1 : 0)
    + Math.min(hearts, TOTALS.hearts) + Math.min(songs, TOTALS.songs);
  const all = RESCUABLE.length + RECRUITS.length + NOT_CRICKETS.length + 1 + TOTALS.hearts + TOTALS.songs;
  return Math.floor((got / all) * 100);
}
export function completionOf(d) {
  // the same from save data (for the slot list)
  const g = { rescued: new Set(d.rescued || []), recruits: new Set(d.recruits || []), meta: { ...fresh(), ...(d.meta || {}) } };
  return completion(g);
}

// Voices for Nana's door: low <= 3.5 kHz, middle 4-5 kHz, high >= 5.5 kHz.
export function voiceOf(id) {
  const k = CRICKETS[id]?.khz || 0;
  if (!k) return null;
  if (k <= 3.5) return 'low';
  if (k >= 5.5) return 'high';
  if (k >= 4 && k <= 5) return 'mid';
  return null;
}
export function voicesCovered(trio) {
  const v = new Set(trio.map(voiceOf).filter(Boolean));
  return { low: v.has('low'), mid: v.has('mid'), high: v.has('high'), all: v.has('low') && v.has('mid') && v.has('high') };
}
// A suggested trio covering all three voices from who's home (Pip counts).
export function suggestVoiceTrio(available) {
  const pick = (v) => available.find((id) => voiceOf(id) === v);
  const t = [pick('mid'), pick('low'), pick('high')].filter(Boolean);
  return t.length === 3 ? t : null;
}
export function canChirp(id) { return (CRICKETS[id]?.chp || 0) > 0; }

// Temperature for Frost's thermometer (Dolbear's law readout). Rooms may set
// `temp: 68` or `temp: [left, right]` (degrees F at the left and right edges, read by x);
// zones may set `temp` in data/zones.js; otherwise 70.
export function temperatureAt(game, zoneInfo) {
  const r = game.room?.def;
  const t = r?.temp ?? zoneInfo?.temp ?? 70;
  if (Array.isArray(t)) {
    const fx = Math.max(0, Math.min(1, game.player.cx / game.room.pw));
    return Math.round(t[0] + (t[1] - t[0]) * fx);
  }
  return Math.round(t);
}
