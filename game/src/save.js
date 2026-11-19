// Three save slots in localStorage, versioned JSON, with migration and a corrupt-save guard.
// Settings are shared across slots.
export const VERSION = 1;
const KEY = (n) => `housecricket.v1.slot${n}`;
const SETTINGS = 'housecricket.v1.settings';
export const SLOTS = [1, 2, 3];

const store = () => { try { return globalThis.localStorage || null; } catch { return null; } };

function migrate(d) {
  if (!d || typeof d !== 'object') return null;
  if (d.v === VERSION) return d;
  // future versions: step d.v up one at a time here
  return null;
}
function valid(d) {
  return d && typeof d.room === 'string' && Array.isArray(d.items) && Array.isArray(d.trio) && d.trio.length > 0;
}

export function readSlot(n) {
  const s = store(); if (!s) return null;
  try {
    const raw = s.getItem(KEY(n));
    if (!raw) return null;
    const d = migrate(JSON.parse(raw));
    return valid(d) ? d : { corrupt: true };
  } catch { return { corrupt: true }; }
}
export function writeSlot(n, data) {
  const s = store(); if (!s) return false;
  try { s.setItem(KEY(n), JSON.stringify({ ...data, v: VERSION, savedAt: Date.now() })); return true; } catch { return false; }
}
export function clearSlot(n) { try { store()?.removeItem(KEY(n)); } catch { /* ignore */ } }
export function listSlots() { return SLOTS.map((n) => ({ n, data: readSlot(n) })); }
export function latestSlot() {
  let best = null;
  for (const { n, data } of listSlots()) if (data && !data.corrupt && (!best || data.savedAt > best.data.savedAt)) best = { n, data };
  return best;
}

// every setting in the design's Settings screen (shared across slots)
export const SETTINGS_DEFAULTS = {
  muted: false, music: 0.8, sfx: 0.9, beacon: 0.9,
  beaconChirps: 'always',      // 'always' | 'call' (only when I chirp) | 'off'
  ear: 'helps',                // [issue 10] the Ear guide: 'helps' | 'always' (out) | 'listen' (only when I listen)
  vibration: true, gentle: false, ripples: false, easyPitch: false, shake: true,
  textSpeed: 'normal',         // 'slow' | 'normal' | 'fast' | 'instant'
};
/** Stored settings -> today's. [issue 10] Issue #3's `indicator` (true or false) becomes Ear guide "When it helps". */
export function migrateSettings(stored) {
  const s = { ...SETTINGS_DEFAULTS, ...(stored && typeof stored === 'object' ? stored : {}) };
  if (!['helps', 'always', 'listen'].includes(s.ear)) s.ear = 'helps';
  delete s.indicator;
  return s;
}
export function loadSettings() {
  try { return migrateSettings(JSON.parse(store()?.getItem(SETTINGS) || '{}')); } catch { return migrateSettings({}); }
}
export function saveSettings(st) { try { store()?.setItem(SETTINGS, JSON.stringify(st)); } catch { /* ignore */ } }

// Game -> save data, and back.
export function fromGame(game) {
  const p = game.player;
  const broken = {};
  for (const [id, rs] of Object.entries(game.roomState)) if (rs.broken.size) broken[id] = [...rs.broken];
  // [final-S] never save a Carrier (hub) room as the crack: the crack, else where "Back" goes, else zone 1's start crack
  const hub = (c) => !c || typeof c.room !== 'string' || c.room.startsWith('carrier-');
  const ret = !hub(game.returnCrack) ? game.returnCrack : null;
  let crack = !hub(game.saveCrack) ? game.saveCrack : null;
  if (!crack && !game.inCarrier && !hub({ room: game.room?.id })) crack = { room: game.room.id, tx: null, ty: null };
  if (!crack) crack = ret || game.homeCrack || { room: game.room.id, tx: null, ty: null };
  return {
    zone: game.zone?.id, room: crack.room, crack, returnCrack: ret || (game.inCarrier ? crack : null),
    items: [...p.items], rescued: [...game.rescued], recruits: [...game.recruits],
    trio: [...p.trio], active: p.active, maxHealth: p.maxHealth,
    visited: [...game.visited], broken,
    secrets: [...(game.meta?.secrets || [])], crumbs: game.meta?.crumbs || 0, upgrades: { ...(game.meta?.upgrades || {}) },
    taken: Object.fromEntries(Object.entries(game.roomState).filter(([, rs]) => rs.taken.size).map(([id, rs]) => [id, [...rs.taken]])),
    meta: game.meta ? JSON.parse(JSON.stringify(game.meta)) : null,
    carrier: !!game.inCarrier,          // saved in the Carrier: load back into it
    zoneName: game.zone?.name || '',
    playTime: Math.round(game.playFrames / 60),
  };
}
export function intoGame(game, d) {
  game.rescued = new Set(d.rescued || []);
  game.recruits = new Set(d.recruits || []);
  game.visited = new Set(d.visited || []);
  game.roomState = {};
  for (const [id, list] of Object.entries(d.broken || {})) game.roomState[id] = { broken: new Set(list), taken: new Set() };
  for (const [id, list] of Object.entries(d.taken || {})) (game.roomState[id] ||= { broken: new Set(), taken: new Set() }).taken = new Set(list);
  if (d.meta) game.meta = JSON.parse(JSON.stringify(d.meta));
  if (game.meta) { game.meta.crumbs = d.crumbs ?? game.meta.crumbs; game.meta.secrets = d.secrets || game.meta.secrets; }
  game.playFrames = (d.playTime || 0) * 60;
  game.player.maxHealth = d.maxHealth || game.player.maxHealth;
  // [final-S] old saves may hold a Carrier room as the crack: use where "Back" goes, else zone 1's start crack
  const hub = (c) => !c || typeof c.room !== 'string' || c.room.startsWith('carrier-') || (game.world && !game.world.rooms[c.room]);
  const crack = !hub(d.crack) ? d.crack : !hub(d.returnCrack) ? d.returnCrack : !hub({ room: d.room }) ? { room: d.room, tx: null, ty: null } : (game.homeCrack || null);
  game.returnCrack = !hub(d.returnCrack) ? d.returnCrack : null;
  game.startAt(crack.room, crack.tx ?? undefined, crack.ty ?? undefined, { items: d.items, party: d.trio });
  game.player.active = Math.min(d.active || 0, game.player.trio.length - 1);
  game.player.setCricket(game.player.id);
  game.saveCrack = !hub(d.crack) ? d.crack : null;
}
