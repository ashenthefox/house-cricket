#!/usr/bin/env node
// [issue 10] The ear guide (src/ear.js, the way to walk in src/beacon.js route()), headless:
//   (a) along every zone's recorded path the ear rests except while Listening or in the 4 s after an
//       answer, and "lost" never fires;
//   (b) standing still for 60 s of in-control play brings it out (not a frame sooner; the item card
//       and a hold don't count); 1000 px closer keeps it out, 1280 px closer rests it;
//   (c) every portal node of every beacon (each zone, both phases): the doorway aimed at from it is
//       in the room, is where the path leaves the room (never a twin within 2 tiles of it, never a
//       door's partner), and the choice of doorway has a tile of hysteresis;
//   (d) the smoothed angle: the short way round across +-pi, an exact half-turn keeps its direction,
//       at most a half-turn a second (dt clamped to 50 ms);
//   (e) the settings migration (issue #3's `indicator` -> Ear guide "When it helps") and the
//       effective mode (Beacon chirps Off: "When it helps" counts as "Always out").
//   node tools/ear-test.mjs
import { readFileSync } from 'node:fs';
import { makeSim } from './sim.mjs';
import { ZONES } from '../game/data/rooms/index.js';
import { ZONE_INFO } from '../game/data/zones.js';
import { TILE } from '../game/data/movement.js';
import { beaconSpec, measure, route, aimFrom, portalGraph, beaconField } from '../game/src/beacon.js';
import * as Ear from '../game/src/ear.js';
import { migrateSettings } from '../game/src/save.js';

let pass = 0, fail = 0;
const ok = (c, label) => { if (c) pass++; else { fail++; console.log('  FAIL', label); } };
const BEAT = 50; // audio.js: the trapped cricket answers a beat after your call

// main.js earStep(), headless: the same inputs, the answer frame from the call events (audio.js callAnswer)
function earRunner(g, settings = { ear: 'helps', beaconChirps: 'always' }, lostFrames) {
  const r = { ear: Ear.initial(), via: null, answerAt: null, log: [] };
  r.step = () => {
    const spec = g.inCarrier ? null : beaconSpec(g), m = spec ? measure(g, spec) : null;
    for (const e of g.fx) if (e.f === g.frame && (e.type === 'chirp' || e.type === 'tap') && spec) r.answerAt = e.f + BEAT;
    const dist = m?.pathDist ?? null;
    const followable = !g.inCarrier && g.zone?.n >= 1 && !!spec && dist != null && !g.inFight();
    if (g.fx.some((e) => e.type === 'die' && e.f === g.frame)) r.ear = Ear.restart(r.ear, dist);
    const rt = followable ? route(g, spec, r.via) : null; r.via = rt?.via ?? null;
    r.ear = Ear.step(r.ear, { followable, key: spec ? `${spec.zone}|${spec.phase}` : null, pathDist: dist, inControl: !g.card && !(g.hold > 0), listening: !!g.player.listening, frame: g.frame, answerAt: r.answerAt, mode: Ear.earMode(settings), lostFrames });
    r.dist = dist; r.followable = followable;
    return r.ear;
  };
  return r;
}

// ---- (a) the recorded paths ----
console.log('(a) zone paths: rests except Listen / answer windows, never lost');
const PATHS = ['zone-00-path', 'zone-01-path', 'zone-02-path', 'zone-03-path', 'zone-04-path', 'zone-05-path', 'zone-06-path-band', 'zone-06-path-glider', 'zone-07-path', 'zone-08-path', 'zone-09-path', 'zone-10-path', 'zone-lair-path'];
for (const name of PATHS) {
  const sol = JSON.parse(readFileSync(new URL(`../design/solutions/${name}.json`, import.meta.url), 'utf8'));
  if (sol.start?.from === 'title') continue;
  const sim = makeSim(), g = sim.game, st = sol.start;
  g.startAt(st.room, st.x, st.y, { items: st.items || [], party: st.party || ['pip'], rescued: st.rescued || [] });
  const er = earRunner(g);
  let lost = 0, bad = 0, out = 0, listen = 0, answer = 0, maxIdle = 0, shown = 0;
  sim.run(sol.events, sol.frames, () => {
    const e = er.step();
    if (er.followable) shown++;
    if (e.lostNow || e.reason === 'lost') lost++;
    if (e.out) out++;
    if (e.reason === 'listen') listen++;
    if (e.reason === 'answer') answer++;
    if (e.reason && e.reason !== 'listen' && e.reason !== 'answer') bad++;
    if (e.reason === 'answer' && !(g.frame >= er.answerAt && g.frame < er.answerAt + Ear.ANSWER_FRAMES)) bad++;
    if (!e.out && er.followable && (g.player.listening || (er.answerAt != null && g.frame >= er.answerAt && g.frame < er.answerAt + Ear.ANSWER_FRAMES))) bad++;
    maxIdle = Math.max(maxIdle, e.lost);
  });
  ok(lost === 0 && bad === 0, `${name}: lost ${lost}, wrong ${bad}`);
  console.log(`  ${lost || bad ? 'FAIL' : 'ok  '} ${name.padEnd(20)} frames ${sol.frames}, followable ${shown}, out ${out} (listen ${listen}, answer ${answer}), longest without getting closer ${(maxIdle / 60).toFixed(1)} s`);
}

// ---- (b) lost: standing still, then closer ----
console.log('(b) lost timer');
{
  const z1 = ZONES.find((z) => z.n === 1);
  const sim = makeSim(), g = sim.game;
  g.startAt(z1.start.room, undefined, undefined, { items: [], party: ['pip'] });
  const er = earRunner(g);
  for (let i = 0; i < 120; i++) { sim.step(); er.step(); } // settle (the landing, the camera)
  const d0 = er.dist;
  ok(er.followable && d0 != null, `zone 1 start is followable (pathDist ${d0})`);
  let at = null;
  for (let i = 1; i <= Ear.LOST_FRAMES + 5 && at == null; i++) { sim.step(); const e = er.step(); if (e.out) at = i; }
  // the best was set on the first step (counting starts on the next): out on exactly the 3600th counted step
  ok(at + 120 === Ear.LOST_FRAMES + 1, `out after 60 s standing still (step ${at + 120} from the start)`);
  ok(er.ear.reason === 'lost' && er.ear.lostFrom === er.dist, `reason lost, from ${er.ear.lostFrom}`);
  // pure: 1000 px closer stays out, 1280+ rests
  const base = { followable: true, key: er.ear.key, inControl: true, listening: false, frame: 0, answerAt: null, mode: 'helps' };
  let s = Ear.step(er.ear, { ...base, pathDist: er.ear.lostFrom - 1000 });
  ok(s.out && s.reason === 'lost', '1000 px closer: still out');
  s = Ear.step(s, { ...base, pathDist: er.ear.lostFrom - 1281 });
  ok(!s.out && s.lost === 0, '1281 px closer: rests');
  // pure: the card / a hold (inControl false) never count; null path distance is never lost
  let t = Ear.step(Ear.initial(), { ...base, key: 'k', pathDist: 5000 });
  for (let i = 0; i < Ear.LOST_FRAMES * 2; i++) t = Ear.step(t, { ...base, key: 'k', pathDist: 5000, inControl: false });
  ok(!t.out && t.lost === 0, 'out of control: the timer waits');
  t = Ear.initial(); for (let i = 0; i < Ear.LOST_FRAMES + 2; i++) t = Ear.step(t, { ...base, key: 'k', pathDist: null });
  ok(!t.out, 'pathDist null: never lost');
  // closer = beats the best by a tile; creeping (less than a tile) still counts as not closer
  t = Ear.initial(); let dd = 5000;
  for (let i = 0; i <= Ear.LOST_FRAMES; i++) { dd -= 0.01; t = Ear.step(t, { ...base, key: 'k', pathDist: dd }); }
  ok(t.out && t.reason === 'lost', 'creeping closer by less than a tile: still lost');
  // the answer window: answerAt .. answerAt + 240 frames, from the answer; a dismissal holds until the next answer
  t = Ear.initial(); const win = [];
  for (let f = 0; f < 600; f++) { t = Ear.step(t, { ...base, key: 'k', pathDist: 5000 - f * 50, frame: f, answerAt: 100 }); if (t.reason === 'answer') win.push(f); }
  ok(win[0] === 100 && win.length === 240, `answer window ${win[0]}..${win[win.length - 1]}`);
  t = Ear.initial(); t = Ear.step(t, { ...base, key: 'k', pathDist: 5000, frame: 120, answerAt: 100 });
  ok(Ear.clickAction(t, 'helps') === 'dismiss', 'a click on an answer-out ear dismisses');
  t = Ear.dismiss(t, 5000, 100); t = Ear.step(t, { ...base, key: 'k', pathDist: 5000, frame: 121, answerAt: 100 });
  ok(!t.out, 'dismissed: rests for the rest of that window');
  t = Ear.step(t, { ...base, key: 'k', pathDist: 5000, frame: 400, answerAt: 400 });
  ok(t.out && t.reason === 'answer', 'the next answer brings it out again');
  // clicks: resting -> pin, pinned -> rest, listening -> nothing
  ok(Ear.clickAction(Ear.step(Ear.initial(), { ...base, key: 'k', pathDist: 1 }), 'helps') === 'pin', 'resting click pins');
  ok(Ear.clickAction(Ear.step(Ear.initial(), { ...base, key: 'k', pathDist: 1, mode: 'always' }), 'always') === 'rest', 'pinned click rests');
  ok(Ear.clickAction(Ear.step(Ear.initial(), { ...base, key: 'k', pathDist: 1, listening: true }), 'helps') === null, 'clicks while Listening are ignored');
  // a key change (zone / phase) starts over; not followable waits (a link room)
  t = Ear.initial(); for (let i = 0; i < 3000; i++) t = Ear.step(t, { ...base, key: 'a', pathDist: 5000 });
  const t2 = Ear.step(t, { ...base, followable: false, key: null, pathDist: null });
  ok(!t2.out && t2.lost === t.lost, 'a link room (not followable) keeps the timer');
  ok(Ear.step(t2, { ...base, key: 'b', pathDist: 5000 }).lost === 0 && Ear.step(t2, { ...base, key: 'b', pathDist: 5000 }).best === 5000, 'another beacon starts it over');
  // "Only when I listen" and "Always out"
  ok(!Ear.step(t, { ...base, key: 'a', pathDist: 5000, mode: 'listen', frame: 10, answerAt: 5 }).out, 'Only when I listen: an answer does not bring it out');
  ok(Ear.step(Ear.initial(), { ...base, key: 'a', pathDist: 5000, mode: 'always' }).out, 'Always out: out');
}

// ---- (c) the portal sweep ----
console.log('(c) every portal node: the doorway aimed at');
{
  const sim = makeSim(), g = sim.game, G = portalGraph(g.world);
  const twinNear = (a, b) => a.rooms.length === 2 && b.rooms.length === 2 && a.rooms[0] === b.rooms[1] && a.rooms[1] === b.rooms[0] && Math.hypot(a.wx - b.wx, a.wy - b.wy) < 2 * TILE;
  let specs = 0, checks = 0, probs = [];
  for (const z of ZONES) {
    if (!(z.n >= 1)) continue;
    const it = ZONE_INFO[z.n]?.item;
    for (const items of [[], it ? [it] : null]) {
      if (!items) continue;
      g.startAt(z.start.room, undefined, undefined, { items, party: ['pip'], rescued: ZONE_INFO[z.n]?.rescued || [] });
      const spec = beaconSpec(g); if (!spec) continue;
      specs++;
      const f = beaconField(g.world, spec);
      G.nodes.forEach((nd, n) => {
        if (!Number.isFinite(f.dist[n])) return;
        for (const R of nd.rooms) {
          if (R === spec.target.room) continue; // in the target's room the ear aims at the target itself
          if (g.world.rooms[R].zone !== z) continue; // the ear follows the zone's own beacon in the zone's own rooms
          const a = aimFrom(g.world, f, R, n), A = G.nodes[a], s = f.next[a];
          checks++;
          const why = [];
          if (!A.rooms.includes(R)) why.push('not in the room');
          if (s >= 0 && twinNear(A, G.nodes[s])) why.push('successor is its twin');
          if (s >= 0 && A.door !== 'src' && G.nodes[s].rooms.includes(R)) why.push('the path stays in the room');
          // (a door's arrival spot in this room is a place in the room: beacon.js links doors both ways, so the
          // path may run through one back to its door, as at the Laundry's stair head; aimed at, it is still
          // "go there", never the door's other room)
          if (A.door === 'dst' && !A.rooms.includes(R)) why.push('a door\'s far end in another room');
          if (nd.door === 'src' && a !== n) why.push('a door not aimed at itself');
          if (why.length && probs.length < 12) probs.push(`${spec.zone}/${spec.phase} node ${n} in ${R} -> ${a}: ${why.join(', ')}`);
          if (why.length) fail++, pass--;
          pass++;
        }
      });
    }
  }
  for (const p of probs) console.log('  FAIL', p);
  console.log(`  ${probs.length ? 'FAIL' : 'ok  '} ${specs} beacons, ${checks} node/room pairs`);
  // hysteresis: from a room with two ways out, the kept doorway stays unless another beats it by a tile
  let hyst = 0;
  for (const z of ZONES) {
    if (!(z.n >= 1)) continue;
    g.startAt(z.start.room, undefined, undefined, { items: [], party: ['pip'] });
    const spec = beaconSpec(g); if (!spec) continue;
    for (const room of z.rooms.map((r) => g.world.rooms[r.id]).filter(Boolean)) {
      if (room.id === spec.target.room) continue;
      const ids = G.byRoom[room.id] || [], fl = beaconField(g.world, spec);
      const p = g.player; const save = [g.room, p.x, p.y];
      g.room = room; p.x = room.pw / 2 - p.w / 2; p.y = room.ph / 2 - p.h / 2;
      const r0 = route(g, spec, null); if (!r0) { [g.room, p.x, p.y] = save; continue; }
      const cost = (i) => Math.hypot(G.nodes[i].wx - (room.wx + p.cx), G.nodes[i].wy - (room.wy + p.cy)) + fl.dist[i];
      for (const k of ids) {
        if (k === r0.via || !Number.isFinite(fl.dist[k])) continue;
        const r1 = route(g, spec, k), within = cost(k) <= cost(r0.via) + TILE;
        if ((r1.via === k) !== within) { ok(false, `hysteresis ${room.id}: keep ${k} (${within ? 'within' : 'beyond'} a tile) gave ${r1.via}`); }
        else { pass++; hyst++; }
      }
      [g.room, p.x, p.y] = save;
    }
  }
  console.log(`  ok   hysteresis checked on ${hyst} kept doorways`);
}

// ---- (d) the smoothed angle ----
console.log('(d) angle smoothing');
{
  const PI = Math.PI, near = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 1e-9;
  let r = Ear.turn(PI - 0.02, -PI + 0.02, 0.05, 1);
  ok(near(r.c, -PI + 0.02) && r.sign === 1, `across +pi the short way (${r.c.toFixed(4)})`);
  r = Ear.turn(-PI + 0.02, PI - 0.02, 0.05, 1);
  ok(near(r.c, PI - 0.02) && r.sign === -1, `across -pi the short way (${r.c.toFixed(4)})`);
  r = Ear.turn(0, PI, 0.05, 1); ok(near(r.c, PI * 0.05) && r.sign === 1, 'exact half-turn keeps +');
  r = Ear.turn(0, PI, 0.05, -1); ok(near(r.c, -PI * 0.05) && r.sign === -1, 'exact half-turn keeps -');
  r = Ear.turn(0, -PI, 0.05, 1); ok(near(r.c, PI * 0.05), 'exact half-turn to -pi keeps + too');
  r = Ear.turn(0, 2, 1, 1); ok(near(r.c, PI * 0.05), 'dt clamped to 50 ms');
  r = Ear.turn(0, 2, 0, 1); ok(near(r.c, 0), 'dt 0 (paused): frozen');
  let c = 0, sign = 1; for (let i = 0; i < 60; i++) ({ c, sign } = Ear.turn(c, PI, 1 / 60, sign));
  ok(near(c, PI), `a half-turn takes a second (${c.toFixed(4)})`);
  c = 0; sign = 1; for (let i = 0; i < 30; i++) ({ c, sign } = Ear.turn(c, PI, 1 / 60, sign));
  ok(near(c, PI / 2), 'half a second: a quarter-turn');
  // a flip mid-turn (the target jumps to the opposite side): it keeps turning the way it was going
  c = 0.3; sign = -1; ({ c, sign } = Ear.turn(c, 0.3 + PI, 1 / 60, sign)); ok(c < 0.3 && sign === -1, 'flip mid-turn keeps the direction');
}

// ---- (e) settings ----
console.log('(e) settings migration and the mode in effect');
{
  const rows = [
    [{}, 'helps'], [{ indicator: true }, 'helps'], [{ indicator: false }, 'helps'], [{ indicator: false, beaconChirps: 'call' }, 'helps'],
    [{ ear: 'always' }, 'always'], [{ ear: 'listen', indicator: false }, 'listen'], [{ ear: 'bogus' }, 'helps'], [null, 'helps'],
  ];
  for (const [inp, want] of rows) { const s = migrateSettings(inp); ok(s.ear === want && !('indicator' in s), `${JSON.stringify(inp)} -> ear ${s.ear}`); }
  const keep = migrateSettings({ indicator: false, music: 0.3, beaconChirps: 'off' });
  ok(keep.music === 0.3 && keep.beaconChirps === 'off', 'other settings kept');
  const modes = [['helps', 'always', 'helps'], ['always', 'always', 'always'], ['listen', 'always', 'listen'], ['helps', 'call', 'helps'], ['helps', 'off', 'always'], ['always', 'off', 'always'], ['listen', 'off', 'listen']];
  for (const [ear, bc, want] of modes) ok(Ear.earMode({ ear, beaconChirps: bc }) === want, `ear ${ear} + chirps ${bc} -> ${want}`);
}

console.log(`\near-test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
