#!/usr/bin/env node
// [playtest] The beacon rule from the design's definition of done, along each zone's recorded path:
// the beacon gain (src/beacon.js, the same code audio.js uses for __game.beacon()) at each room entry
// is at least the previous room's, except once when the target moves (sound hole -> lair), and never
// below -24 dB. Headless (the node sim replays the solution).   node tools/beacon-check.mjs
import { readFileSync } from 'node:fs';
import { makeSim } from './sim.mjs';
import { beaconSpec, measure, FLOOR_DB } from '../game/src/beacon.js';

const PATHS = ['zone-01-path', 'zone-02-path', 'zone-03-path', 'zone-04-path', 'zone-05-path', 'zone-06-path-band', 'zone-06-path-glider', 'zone-07-path', 'zone-08-path', 'zone-09-path', 'zone-10-path'];
let bad = 0;
for (const name of PATHS) {
  const sol = JSON.parse(readFileSync(new URL(`../design/solutions/${name}.json`, import.meta.url), 'utf8'));
  const sim = makeSim(), g = sim.game, st = sol.start;
  g.startAt(st.room, st.x, st.y, { items: st.items || [], party: st.party || ['pip'], rescued: st.rescued || [] });
  // first entry into each of the zone's own rooms (a climb that straddles a room edge re-enters it;
  // a path that starts in a link room, the stairwell, is in another zone)
  const zoneN = /zone-(\d+)/.exec(name) ? +/zone-(\d+)/.exec(name)[1] : null;
  const rows = [], seen = new Set(); let lastRoom = null;
  const sample = () => { if (g.zone?.n !== zoneN) return; const s = beaconSpec(g), m = s && measure(g, s); const key = g.room.id + (s?.phase || ''); if (seen.has(key)) return; seen.add(key); rows.push({ room: g.room.id, phase: s?.phase, gain: m ? +m.gainDb.toFixed(2) : null, target: s?.target?.room }); };
  sample(); lastRoom = g.room.id;
  sim.run(sol.events, sol.frames, () => { if (g.room.id !== lastRoom) { lastRoom = g.room.id; sample(); } });
  const probs = []; let resets = 0;
  rows.forEach((r, i) => {
    if (r.gain == null) { probs.push(`${r.room}: no beacon`); return; }
    if (r.gain < FLOOR_DB - 1e-9) probs.push(`${r.room}: ${r.gain} dB below the floor`);
    if (i === 0) return;
    const p = rows[i - 1];
    if (r.phase !== p.phase) { resets++; return; }           // the retarget (sound hole -> lair)
    if (r.gain < p.gain - 0.01) probs.push(`${p.room} ${p.gain} -> ${r.room} ${r.gain} dB`);
  });
  if (resets > 1) probs.push(`${resets} retargets`);
  if (probs.length) bad++;
  console.log(`${probs.length ? 'FAIL' : 'ok  '} ${name.padEnd(20)} ${rows.map((r) => `${r.room}:${r.gain}${r.phase === 'lair' ? 'L' : ''}`).join(' ')}${probs.length ? '\n      ' + probs.join('; ') : ''}`);
}
process.exit(bad ? 1 : 0);
