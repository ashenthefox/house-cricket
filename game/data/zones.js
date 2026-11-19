// Zone facts the engine and tools read (palettes from the design; rooms and links in data/house.js).
//
// Fields the engine already used (unchanged):
//   id, name, palette, item (the zone's gating item), cricket (who's freed), minItems (the item
//   sets the main path must work with; zone 6 has two), rescued (crickets home when the zone
//   starts on the main path: goToLevel), needsRescues (the Attic damper).
// Fields added by the world bible (audio, beacon, map, tools):
//   n, builder, music (assets/audio/music/<music>.mp3), temp (°F: chirp rates, Dolbear for Frost;
//   rooms may override with temp: n or {left, right}), beaconVoice (chirps.js voice names; the
//   beacon reads it), voiceKHz (the music-bus cut), decoySound ({voice, room, every}: the zone's
//   decoy; builders turn it into zone.decoys [{voice, room, x, y, every}] once the room exists),
//   soundHoleRoom (where the B marker goes, beside the item), lairRoom, boss, start (zone start
//   room), saves (the two save-crack rooms), prereq (entering), loops (zone-wide ambience).
// NOTE: soundHole / lair / decoys with tile x, y belong in the zone module (beacon.js prefers a
// ZONE_INFO soundHole over a B marker, so this file never sets soundHole or lair itself).
const B = ['booties'], BF = [...B, 'floss'], BFR = [...BF, 'raft'];
const MAIN_ORDER = ['stripe', 'katy', 'duo', 'frost', 'hump', 'jam', 'rin', 'digby', 'mote', 'chip'];
const before = (n) => MAIN_ORDER.slice(0, n - 1); // rescues home on the main path (zones in number order)

export const ZONE_INFO = {
  0:  { n: 0, id: 'z00-tank', name: 'The Tank', builder: 'A', palette: ['#E3A857', '#8FB8B0', '#D9C29A', '#2E3550'],
        music: 'title', temp: 76, start: 'tank-cup', saves: [],
        minItems: [[]], rescued: [] },
  1:  { n: 1, id: 'z01-bedroom', name: 'Bedroom', builder: 'A', palette: ['#3B4A7A', '#F2C46D', '#C8564B', '#7C98C4'],
        item: 'booties', cricket: 'stripe', boss: 'duchess', music: 'z01-bedroom', temp: 70,
        beaconVoice: 'banded', voiceKHz: 6.0, decoySound: { voice: 'alarm', room: 'hall-top', every: 40, note: 'the hallway smoke alarm, heard first (one beep every 40 s)' },
        soundHoleRoom: 'bed-desk', lairRoom: 'bed-lair', start: 'bed-carrier', saves: ['bed-carrier', 'bed-dresser'],
        minItems: [[]], rescued: [] },
  2:  { n: 2, id: 'z02-bathroom', name: 'Bathroom', builder: 'A', palette: ['#8CC9C4', '#E9F1EE', '#A9B8C2', '#4F7F86'],
        item: 'floss', cricket: 'katy', boss: 'chikchak', music: 'z02-bathroom', temp: 72,
        beaconVoice: 'katydid', voiceKHz: 3.0, decoySound: { voice: 'chikchak', room: 'bath-lair', every: 9, note: 'Chikchak\'s chirps: they lead you into her lair' },
        soundHoleRoom: 'bath-sink', lairRoom: 'bath-lair', start: 'bath-door', saves: ['bath-door', 'bath-sink'],
        minItems: [B], rescued: before(2) },
  3:  { n: 3, id: 'z03-kitchen', name: 'Kitchen', builder: 'A', palette: ['#F1D27A', '#C27A45', '#D0614A', '#8EA67A'],
        item: 'raft', cricket: 'duo', boss: 'bigtok', music: 'z03-kitchen', temp: 82,
        beaconVoice: 'twospot', voiceKHz: 4.6, decoySound: { voice: 'hinge-creak', room: 'kit-fridge', every: 14, note: 'the creaky fridge (hinge-creak pitched down; the dryer-hum loop quietly as its hum)' },
        soundHoleRoom: 'kit-undersink', lairRoom: 'kit-sink', start: 'kit-fridge', saves: ['kit-fridge', 'kit-counter'],
        minItems: [BF], rescued: before(3) },
  4:  { n: 4, id: 'z04-pantry', name: 'Pantry', builder: 'B', palette: ['#C9A57A', '#D99A3E', '#EFE6D5', '#7A5636'],
        item: 'band', cricket: 'frost', boss: 'lashes', music: 'z04-pantry', temp: 68,
        beaconVoice: 'snowy', voiceKHz: 3.0, decoySound: { voice: 'snowy', room: 'pan-shelves', note: 'the twist: the chirp that sounds wrong (a tree cricket indoors?) is the real one. No extra decoy plays.' },
        soundHoleRoom: 'pan-shelves', lairRoom: 'pan-lair', start: 'pan-door', saves: ['pan-door', 'pan-shelves'],
        minItems: [BFR], rescued: before(4) },
  5:  { n: 5, id: 'z05-laundry', name: 'Laundry', builder: 'B', palette: ['#B7A6D3', '#C9C3CC', '#A9C8E0', '#6F7487'],
        item: 'glider', cricket: 'hump', boss: 'peridot', music: 'z05-laundry', temp: 84, loops: ['dryer-hum'],
        beaconVoice: { hole: ['alarm', 'knock'], lair: ['alarm'] }, voiceKHz: 3.0,
        decoySound: { voice: 'alarm', room: 'laun-lair', note: 'the smoke alarm, for real: the zone\'s beacon IS the alarm; it beeps back when you chirp nearby, and every 8-10 s on its own' },
        soundHoleRoom: 'laun-dryer', lairRoom: 'laun-lair', start: 'laun-stairs', saves: ['laun-stairs', 'laun-stairs'],
        minItems: [BFR], rescued: before(5) },
  6:  { n: 6, id: 'z06-living', name: 'Living Room', builder: 'B', palette: ['#D48A8A', '#8C8F55', '#E8964A', '#6E4A5E'],
        item: 'thimble', cricket: 'jam', boss: 'gargy', music: 'z06-living', temp: 71,
        beaconVoice: 'field', voiceKHz: 4.5, decoySound: { voice: 'squeak-toy', room: 'liv-rug', every: 12, note: 'the squeaky dog toy (the vacuum bumps it)' },
        soundHoleRoom: 'liv-basket', lairRoom: 'liv-lair', start: 'liv-armchair', saves: ['liv-armchair', 'liv-rug'],
        minItems: [[...BFR, 'band'], [...BFR, 'glider']], rescued: before(6) },
  7:  { n: 7, id: 'z07-study', name: 'Study', builder: 'C', palette: ['#A07850', '#4E7A55', '#E7D7B5', '#8A3B32'],
        item: 'glow', cricket: 'rin', boss: 'mossy', music: 'z07-study', temp: 68,
        beaconVoice: 'bell', voiceKHz: 4.0,
        decoySound: [{ voice: 'hinge-creak', room: 'stu-door', every: 11 }, { voice: 'alarm', room: 'stu-desk', every: 20, note: 'through the air vent' }, { voice: 'peeper', room: 'stu-desk', every: 1, note: 'from below, through the floor register' }],
        soundHoleRoom: 'stu-shelves', lairRoom: 'stu-lair', start: 'stu-door', saves: ['stu-door', 'stu-shelves'],
        minItems: [[...BFR, 'glider']], rescued: before(7) },
  8:  { n: 8, id: 'z08-sunroom', name: 'Sunroom', builder: 'C', palette: ['#9CC97A', '#5E9A52', '#DDEBE3', '#C77B56'],
        item: 'earplugs', cricket: 'digby', boss: 'kite', music: 'z08-sunroom', temp: 76,
        beaconVoice: 'mole', voiceKHz: 2.5, decoySound: { voice: 'peeper', room: 'sun-pots', every: 1, note: 'Peeper (chirp-off)' },
        soundHoleRoom: 'sun-bench', lairRoom: 'sun-lair', start: 'sun-door', saves: ['sun-door', 'sun-glass'],
        minItems: [[...BFR, 'glider', 'thimble']], rescued: before(8) },
  9:  { n: 9, id: 'z09-basement', name: 'Basement', builder: 'C', palette: ['#4F5B6E', '#E07A3A', '#B9BDC4', '#26303D'],
        item: 'feather', cricket: 'mote', boss: 'ember', music: 'z09-basement', temp: 56, loops: ['furnace'],
        beaconVoice: 'ground', voiceKHz: 7.5, decoySound: { voice: 'swift-chitter', room: 'bas-chimney', every: 7, note: 'Soot\'s chicks chittering in the chimney' },
        soundHoleRoom: 'bas-chimney', lairRoom: 'bas-lair', start: 'bas-stairs', saves: ['bas-stairs', 'bas-coal'],
        minItems: [[...BFR, 'glider', 'thimble', 'glow']], rescued: before(9) },
  10: { n: 10, id: 'z10-attic', name: 'Attic', builder: 'D', palette: ['#9C7E6E', '#C9D6E8', '#6B5240', '#4D6E70'],
        cricket: 'chip', boss: 'nana', music: 'z10-attic', temp: 64,
        beaconVoice: 'house', voiceKHz: 4.9, decoySound: { voice: 'bat-squeaks', room: 'att-rafters', every: 6, note: 'Velvet and the roost' },
        soundHoleRoom: null, lairRoom: 'att-lair', start: 'att-entry', saves: ['att-entry', 'att-boxes'],
        minItems: [[...BFR, 'band', 'glider', 'thimble', 'glow', 'earplugs', 'feather']], rescued: before(10), needsRescues: 9 },
  // Linking spaces and the optional lair (string keys; their modules use these as `n`).
  hall:      { n: 'hall', id: 'hall', name: 'The Hall', builder: 'D', link: true, palette: ['#3B4A7A', '#F2C46D', '#C8564B', '#7C98C4'], bg: 'z01-bedroom', music: 'z01-bedroom', temp: 69, start: 'hall-floor', minItems: [B], rescued: before(2) },
  stairwell: { n: 'stairwell', id: 'stairwell', name: 'The Stairs', builder: 'D', link: true, palette: ['#A07850', '#4E7A55', '#E7D7B5', '#8A3B32'], bg: 'z07-study', music: 'z02-bathroom', temp: 68, start: 'stair-foot', saves: ['stair-foot'], minItems: [BF], rescued: before(3) },
  chimney:   { n: 'chimney', id: 'chimney', name: 'The Chimney', builder: 'D', link: true, palette: ['#A0523D', '#E0873A', '#B9C6D6', '#3A2F2A'], bg: 'chimney', music: 'z09-basement', temp: 55, start: 'chim-ash', minItems: [[...BFR, 'glider', 'thimble', 'glow', 'feather']], rescued: before(10) },
  lair:      { n: 'lair', id: 'lair', name: 'The Dragon\'s Lair', builder: 'C', link: true, optional: true, palette: ['#4F5B6E', '#E07A3A', '#B9BDC4', '#26303D'], bg: 'z09-basement', music: 'lair', temp: 90, boss: 'barty', reward: 'cloak', start: 'lair-gap', saves: ['lair-gap'], minItems: [[...BFR, 'glider', 'thimble', 'glow']], rescued: before(9) },
  99: { n: 99, id: 'zone-99', name: 'Sandbox', palette: ['#3B4A7A', '#F2C46D', '#C8564B', '#7C98C4'], minItems: [[]], rescued: [] },
};

// ---------------------------------------------------------------------------------------------
// The prerequisite graph (design: "Route and choice"). A zone can be entered when every item in
// `items` is held, at least one set in `anyOf` is held, every cricket in `rescued` is home and
// `rescues` crickets are home. Doing a zone gives its item (needs: entered) and then frees its
// cricket (needs: entered + the zone's item, because each item opens its own lair).
//   Bedroom -> Bathroom -> Kitchen are fixed (the onward exits of lairs 1-3 open on rescue);
//   then Pantry / Laundry in either order; Living Room by Rubber Band OR Glider; Study needs the
//   Glider; Sunroom needs the Thimble (and its canopy the Glider); Basement needs the Glow Bead
//   (and the Thimble: rubble on the stair door / the soot plug); Attic needs the Earplugs, the
//   Swift Feather and nine rescues (the damper).
// The optional Dragon's Lair (reward: the Cellophane Cloak) needs the Glow Bead and the Thimble.
// ---------------------------------------------------------------------------------------------
export const PREREQ = {
  1:  {},
  2:  { items: ['booties'], rescued: ['stripe'] },
  3:  { items: ['booties', 'floss'], rescued: ['katy'] },
  4:  { items: ['raft'], rescued: ['duo'] },
  5:  { items: ['raft'], rescued: ['duo'] },
  6:  { items: ['raft'], anyOf: [['band'], ['glider']] },
  7:  { items: ['raft', 'glider'] },
  8:  { items: ['thimble', 'glider'] },
  9:  { items: ['thimble', 'glow'] },
  10: { items: ['earplugs', 'feather'], rescues: 9 },
  lair: { items: ['thimble', 'glow'], optional: true },
};
// Which items open what, zone by zone (the backtracking list, for the map table and tools).
export const BACKTRACK = {
  floss: ['bed-weft'], raft: ['bath-seedheart-soap'],
  band: ['bed-seedheart-sill', 'bed-crumbs-shelf', 'bath-songseed-cabinet', 'kit-seedheart-cabinet', 'laun-songseed-shelf', 'liv-songseed-rod'],
  glider: ['bath-crumbs-shelf', 'kit-songseed-hood', 'liv-lumen'],
  thimble: ['bath-shelly', 'bath-chute', 'pan-songseed-cereal', 'liv-crumbs-keys', 'stu-crumbs-plaster'],
  glow: ['kit-crumbs-crawl', 'liv-crumbs-dark'],
  earplugs: ['hall-songseed-closet', 'laun-songseed-drum', 'liv-seedheart-piano'],
  feather: ['stu-songseed-window', 'sun-songseed-ridge', 'chim-songseed-lookout'],
  cloak: ['kit-cloak', 'liv-cloak', 'bas-cloak', 'att-cloak'],
};

const can = (p, items, rescued) => (!p.items || p.items.every((i) => items.has(i)))
  && (!p.anyOf || p.anyOf.some((s) => s.every((i) => items.has(i))))
  && (!p.rescued || p.rescued.every((c) => rescued.has(c)))
  && (!p.rescues || rescued.size >= p.rescues);

/** Can zone n be entered with these items and rescues? (Sets or arrays.) */
export function canEnter(n, items, rescued = []) {
  const p = PREREQ[n]; if (!p) return false;
  return can(p, new Set(items), new Set(rescued));
}

/**
 * Every state reachable from New Game through the prerequisite graph (all valid route orders).
 * Returns { states: [{items, rescued}], entries: {n: [{items, rescued}]} } where entries[n] lists
 * every distinct state in which zone n can first be entered. Used by check-world --graph.
 */
export function exploreRoutes() {
  const key = (it, rs) => [...it].sort().join(',') + '|' + [...rs].sort().join(',');
  const zones = Object.keys(PREREQ).filter((k) => !PREREQ[k].optional).map(Number);
  const start = { items: new Set(), rescued: new Set() };
  const seen = new Map([[key(start.items, start.rescued), start]]);
  const q = [start];
  const entries = {};
  while (q.length) {
    const s = q.shift();
    for (const n of zones) {
      const zi = ZONE_INFO[n];
      if (!can(PREREQ[n], s.items, s.rescued)) continue;
      (entries[n] ||= new Map()).set(key(s.items, s.rescued), { items: [...s.items].sort(), rescued: [...s.rescued].sort() });
      const next = [];
      if (zi.item && !s.items.has(zi.item)) next.push({ items: new Set([...s.items, zi.item]), rescued: s.rescued });
      if (zi.cricket && !s.rescued.has(zi.cricket) && (!zi.item || s.items.has(zi.item))) next.push({ items: s.items, rescued: new Set([...s.rescued, zi.cricket]) });
      for (const t of next) { const k = key(t.items, t.rescued); if (!seen.has(k)) { seen.set(k, t); q.push(t); } }
    }
  }
  const out = {};
  for (const n in entries) out[n] = [...entries[n].values()];
  return { states: [...seen.values()].map((s) => ({ items: [...s.items].sort(), rescued: [...s.rescued].sort() })), entries: out };
}
