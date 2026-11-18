#!/usr/bin/env node
// Headless replay of recorded solutions (the same events through the node sim): a quick check
// that a sim change kept every solution's end state, before the slower browser replay.
//   node tools/replay-headless.mjs [solution.json ...]     (default: every design/solutions/*.json)
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeSim } from './sim.mjs';
import { endState } from './author.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let files = process.argv.slice(2);
if (!files.length) { const dir = path.join(root, 'design', 'solutions'); files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => path.join(dir, f)); }
let bad = 0;
for (const file of files) {
  const sol = JSON.parse(readFileSync(file, 'utf8'));
  if (sol.start?.from === 'title') { console.log(`skip ${path.basename(file)} (a whole-game run from the title: browser only, tools/replay.mjs)`); continue; } // [playtest]
  const sim = makeSim();
  const st = sol.start;
  sim.game.startAt(st.room, st.x, st.y, { items: st.items || [], party: st.party || ['pip'], rescued: st.rescued || [] });
  sim.run(sol.events, sol.frames);
  const got = endState(sim.game.snapshot());
  const ok = JSON.stringify(got) === JSON.stringify(sol.endState);
  if (!ok) bad++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${path.basename(file)}${ok ? '' : `\n   want ${JSON.stringify(sol.endState)}\n   got  ${JSON.stringify(got)}`}`);
}
process.exit(bad ? 1 : 0);
