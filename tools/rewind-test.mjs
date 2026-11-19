#!/usr/bin/env node
// [issue 11] The debug rewind (src/rewind.js, Backspace with ?rewind) is exact: play a recorded
// solution to frame T, rewind (about 5 s), play the same inputs again, and the whole state at T
// (the game, the input layer, the modal layer) must be what it was the first time, character for
// character. Then play on to the end: the solution's end state must still hold.
// Cases: mid-room in several zones, the Duchess fight and two other gecko fights, and right after
// a room change (the rewind goes back into the room before).
//   node tools/rewind-test.mjs [filter]
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Game } from '../game/src/game.js';
import { Input } from '../game/src/input.js';
import { ZONES } from '../game/data/rooms/index.js';
import { MetaLite } from './sim.mjs';
import { endState } from './author.mjs';
import { Rewinder, digest, BACK } from '../game/src/rewind.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const only = process.argv[2] || '';
let pass = 0, fail = 0;
const ok = (c, label) => { if (c) pass++; else { fail++; console.log('  FAIL', label); } };

// A sim like tools/sim.mjs makeSim(), but its loop state (frame, next event, keys held) lives in
// one object so the rewind can take it along (main.js takes the meta layer's pending card).
function load(name) {
  const sol = JSON.parse(readFileSync(path.join(root, 'design', 'solutions', `${name}.json`), 'utf8'));
  const game = new Game(ZONES), st = sol.start;
  game.startAt(st.room, st.x, st.y, { items: st.items || [], party: st.party || ['pip'], rescued: st.rescued || [] });
  const ev = [...sol.events].sort((a, b) => a[0] - b[0]);
  let s = { input: new Input(), meta: null, f: 0, i: 0, phys: new Set() };
  s.meta = new MetaLite(game, s.input); s.meta.lastFx = game.frame;
  const rw = new Rewinder();
  const step = () => {
    rw.record(game, () => s);
    const { input, meta, phys } = s;
    while (s.i < ev.length && ev[s.i][0] <= s.f) { const [, code, t] = ev[s.i++]; if (t === 'down') { input.keyDown(code); phys.add(code); } else { input.keyUp(code); phys.delete(code); } }
    meta.press(phys);
    game.update(input.sample()); meta.check(s.f + 1);
    s.f++;
  };
  return {
    sol, game, rw,
    get s() { return s; },
    to(f) { while (s.f < f) step(); },
    rewind() { const r = rw.rewind(game); if (r) s = r.extra; return r; },
    state() { return digest({ game, s }); },
  };
}

// Play to T, rewind, replay to T: the same state. Returns the run (played on to the end).
function check(name, T, label) {
  const run = load(name);
  run.to(T);
  const room = run.game.room.id, phase = run.game.boss?.phase, first = run.state();
  const r = run.rewind();
  ok(r && r.frames >= BACK && r.frames < BACK + 40, `${label}: went back ${r?.frames} frames (want ${BACK}..${BACK + 39})`);
  ok(run.s.f === T - r.frames, `${label}: the loop went back with it`);
  ok(run.state() !== first, `${label}: the rewound state differs`);
  const backRoom = run.game.room.id;
  run.to(T);
  const again = run.state();
  ok(again === first, `${label}: same state after replaying (${first.length} chars)`);
  if (again !== first) { let k = 0; while (first[k] === again[k]) k++; console.log(`     first diff at ${k}:\n     was ${first.slice(Math.max(0, k - 120), k + 80)}\n     got ${again.slice(Math.max(0, k - 120), k + 80)}`); }
  // rewind twice in a row, then on to the end
  run.rewind(); run.to(T - 100); run.rewind(); run.to(run.sol.frames);
  const got = endState(run.game.snapshot());
  ok(JSON.stringify(got) === JSON.stringify(run.sol.endState), `${label}: the solution still ends where it should (${JSON.stringify(got)})`);
  console.log(`ok-ish ${label}: T=${T} in ${room}${phase ? ` (boss phase ${phase})` : ''}, back ${r?.frames} frames to ${backRoom}`);
  return run;
}
// The first frame after `from` where the room changes (by an edge or a door).
function roomChange(name, from) {
  const run = load(name);
  run.to(from); let id = run.game.room.id;
  while (run.s.f < run.sol.frames) { run.to(run.s.f + 1); if (run.game.room.id !== id) return run.s.f; }
  return null;
}

const cases = [
  ['zone-01-boss', [450, 900, 1400], 'Duchess'],
  ['zone-05-boss', [700, 1500], 'laundry gecko'],
  ['zone-09-boss', [600], 'basement gecko'],
  ['zone-00-path', [800], 'tank'],
  ['zone-01-path', [1200, 3000], 'Bedroom'],
  ['zone-08-path', [2500], 'sunroom'],
  ['entities-2-lifts', [380], 'lifts'],
  ['entities-3-terrain', [500], 'terrain'],
];
for (const [name, Ts, what] of cases) {
  if (only && !name.includes(only) && !what.includes(only)) continue;
  for (const T of Ts) check(name, T, `${what} ${name} @${T}`);
}
// right after a room change: the rewind lands in the room before
for (const name of ['zone-01-path', 'zone-08-path']) {
  if (only && !name.includes(only) && !'room change'.includes(only)) continue;
  const c = roomChange(name, 400);
  ok(c != null, `${name}: a room change after frame 400`);
  if (c == null) continue;
  const run = load(name); run.to(c - 1); const before = run.game.room.id;
  const r = check(name, c + 20, `room change ${name} @${c}+20`);
  ok(r != null, `${name}: ran`);
  const again = load(name); again.to(c + 20); const after = again.game.room.id; again.rewind();
  ok(after !== before && again.game.room.id === before, `${name}: rewound from ${after} into ${again.game.room.id} (want ${before})`);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
