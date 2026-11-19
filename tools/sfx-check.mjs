#!/usr/bin/env node
// [issue 14] Checks every recorded sound effect is loaded before it is heard. audio.js loads the
// effects every room uses at start (sfxFirst()) and the rest per zone (src/zone-sfx.js zoneSfx, with
// the zone's art). This replays every solution in the node sim and checks each effect the game
// asks for (fx events through audio.js fxSound, Audio.cue, the glide and raft sounds, each room's
// ambience loops) is in sfxFirst() or the current zone's list; and that every room's loops and
// decoys are. A miss would play late (skipped the first time) in the browser.
//   node tools/sfx-check.mjs [solution.json ...]     (default: every design/solutions/*.json)
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeSim } from './sim.mjs';
import * as Audio from '../game/src/audio.js';
import { zoneSfx } from '../game/src/zone-sfx.js';
import { info as zoneInfo } from '../game/src/beacon.js';
import { ZONES } from '../game/data/rooms/index.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let files = process.argv.slice(2);
if (!files.length) { const dir = path.join(root, 'design', 'solutions'); files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => path.join(dir, f)); }

const first = new Set(Audio.sfxFirst());
const missing = new Map(); // "zone: name" -> where
const want = (name, zone, where) => {
  if (!name || !Audio.SFX_NAMES.includes(name) || first.has(name) || zoneSfx(zone).includes(name)) return;
  const k = `${zone?.id}: ${name}`;
  if (!missing.has(k)) missing.set(k, where);
};

// every room: its ambience loops (audio.js roomChanged) and decoys
for (const z of ZONES) for (const r of z.rooms) {
  for (const n of r.loops || zoneInfo(z).loops || []) want(n, z, `room ${r.id} loops`);
  for (const e of r.entities || []) {
    if (e.type === 'vacuum') want('vacuum', z, `room ${r.id} vacuum`);
    if (e.type === 'decoy') want(e.voice, z, `room ${r.id} decoy`);
  }
  for (const d of [...(r.decoys || []), ...(z.decoys || [])]) want(d.voice, z, `room ${r.id} decoys`);
}

// every solution: what the game asks to hear, frame by frame
let n = 0;
for (const file of files) {
  const sol = JSON.parse(readFileSync(file, 'utf8'));
  if (sol.start?.from === 'title') continue; // the whole-game run (browser only); its rooms are in the zone solutions
  const sim = makeSim(), g = sim.game, st = sol.start, name = path.basename(file);
  g.startAt(st.room, st.x, st.y, { items: st.items || [], party: st.party || ['pip'], rescued: st.rescued || [] });
  Audio.clearCues();
  let lastF = g.frame;
  sim.run(sol.events, sol.frames, (f, game) => {
    const z = game.room?.zone, where = `${name} @${f} ${game.room?.id}`;
    for (const e of game.fx) if (e.f > lastF) { want(Audio.fxSound(e), z, where); n++; }
    lastF = game.frame;
    for (const c of Audio.queuedCues()) want(c, z, where);
    Audio.clearCues();
    if (game.player.gliding) want('glide-whoosh', z, where);
    if (game.player.onRaft) want('raft-splash', z, where);
  });
}
if (missing.size) {
  console.log(`sfx-check: ${missing.size} effect(s) a zone plays but doesn't load (add them to the boss's sfx, or to src/zone-sfx.js):`);
  for (const [k, w] of missing) console.log(`  ${k}   (first: ${w})`);
  process.exit(1);
}
console.log(`sfx-check: OK (${files.length} solutions, ${n} effect events; ${first.size} effects at start, the rest per zone: ${ZONES.map((z) => `${z.id} ${zoneSfx(z).length}`).join(', ')})`);
