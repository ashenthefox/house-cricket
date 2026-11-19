// [issue 10] The ear guide: when the ear rests (a button beside mute / map / pause) and when it
// comes out to the screen edge (design "Beacon options", "The ear guide"). Pure display state:
// step(state, inputs) -> a new state, no DOM, never reads or writes the game. main.js keeps the state
// outside `game` (so replays, saves and rewind snapshots never see it) and resets it on a rewind, a
// new game and a respawn; a change of the beacon (zone or phase) starts it over by itself.
//
//   inputs (one fixed step): {
//     followable  - there's a cricket to follow here and now (not the Carrier, the Tank, a rescued
//                   zone, an unreachable target or a gecko fight); otherwise the ear is hidden and
//                   its timers wait (a link room between zones doesn't reset them)
//     key         - the beacon's zone + phase ('zone-01|hole')
//     pathDist    - the path distance to the beacon (px), null when unreachable (never lost)
//     inControl   - this step was play (not paused, a dialog, card, story panel or art hold)
//     listening   - Listen is held
//     frame       - the game frame
//     answerAt    - the frame the trapped cricket's last answer came (or will come), or null
//     mode        - the effective Ear guide setting: 'helps' | 'always' | 'listen' (earMode())
//     lostFrames  - optional: frames without getting closer before it comes out (default 60 s)
//   }
//   state: {out, reason ('listen' | 'always' | 'answer' | 'lost' | null), cameOut (it came out this
//     step), lostNow (it came out for being lost this step), key, best, lost, lostFrom, dismissedAnswer}
import { TILE } from '../data/movement.js';

export const LOST_FRAMES = 60 * 60;    // 60 s of in-control play without getting closer
export const ANSWER_FRAMES = 240;      // out for 4 s from the answer
export const LOST_BACK = 1280;         // lost-out ends a screen's width closer than where it came out
export const MODES = ['helps', 'always', 'listen'];

/** The Ear guide setting in effect: with Beacon chirps Off, "When it helps" counts as "Always out". */
export function earMode(settings) {
  const m = MODES.includes(settings?.ear) ? settings.ear : 'helps';
  return m === 'helps' && settings?.beaconChirps === 'off' ? 'always' : m;
}

export function initial() {
  return { out: false, reason: null, cameOut: false, lostNow: false, key: null, best: null, lost: 0, lostFrom: null, dismissedAnswer: null };
}

/** The lost timer starts over from where you are (a respawn, a dismissal). */
export function restart(s, pathDist) {
  return { ...s, best: pathDist ?? null, lost: 0, lostFrom: null };
}

export function step(prev, inp) {
  const s = { ...prev, cameOut: false, lostNow: false };
  if (!inp.followable) { s.out = false; s.reason = null; return s; }
  const d = inp.pathDist;
  const fresh = s.key !== inp.key; // another beacon (zone or phase): start over from here
  if (fresh) { s.key = inp.key; s.best = d; s.lost = 0; s.lostFrom = null; s.dismissedAnswer = null; }
  // lost: 60 s of in-control play without beating the best path distance by a tile
  if (fresh) { /* counted from the next step */ }
  else if (d == null || inp.mode !== 'helps') { s.best = d; s.lost = 0; s.lostFrom = null; } // lost counts only in "When it helps"
  else if (s.lostFrom != null) {
    if (d < s.lostFrom - LOST_BACK) { s.lostFrom = null; s.best = d; s.lost = 0; }
  } else {
    if (s.best == null || d < s.best - TILE) { s.best = d; s.lost = 0; }
    else if (inp.inControl) s.lost++;
    if (s.lost >= (inp.lostFrames || LOST_FRAMES)) { s.lostFrom = d; s.lost = 0; s.lostNow = true; }
  }
  const answering = inp.answerAt != null && inp.frame >= inp.answerAt && inp.frame < inp.answerAt + ANSWER_FRAMES && s.dismissedAnswer !== inp.answerAt;
  let reason = null;
  if (inp.listening) reason = 'listen';
  else if (inp.mode === 'always') reason = 'always';
  else if (inp.mode === 'helps') reason = s.lostFrom != null ? 'lost' : answering ? 'answer' : null;
  s.cameOut = !!reason && !prev.out;
  s.lostNow = s.lostNow && reason === 'lost';
  s.out = !!reason; s.reason = reason;
  return s;
}

/**
 * What a click on the ear does, decided from its state at the press:
 * 'pin' (resting -> Always out), 'rest' (pinned -> When it helps), 'dismiss' (out on its own), or null (Listening).
 */
export function clickAction(s, mode) {
  if (!s || s.reason === 'listen') return null;
  if (!s.out) return 'pin';
  if (s.reason === 'always' || mode === 'always') return 'rest';
  return 'dismiss';
}
/** Dismiss an ear that came out on its own: until its next reason (a new answer; the lost timer starts over). */
export function dismiss(s, pathDist, answerAt) {
  return { ...restart(s, pathDist), dismissedAnswer: answerAt ?? s.dismissedAnswer, out: false, reason: null };
}

/**
 * Turn the shown angle `c` toward the raw angle `t`: the short way round, at most a half-turn a
 * second (dt in seconds, clamped to 50 ms); on an exact half-turn it keeps its last turn direction.
 * Returns {c, sign}.
 */
export function turn(c, t, dt, sign = 1) {
  const EPS = 1e-6;
  let d = Math.atan2(Math.sin(t - c), Math.cos(t - c));
  if (Math.abs(d) > Math.PI - EPS) d = (sign || 1) * Math.abs(d);
  const max = Math.PI * Math.max(0, Math.min(dt, 0.05));
  const stepd = Math.sign(d) * Math.min(Math.abs(d), max);
  let n = c + stepd;
  n = Math.atan2(Math.sin(n), Math.cos(n));
  return { c: n, sign: d !== 0 ? Math.sign(d) : sign };
}
