// House Cricket: the movement table and forgiveness numbers (design: "Movement table").
// Everything is in 40 px tiles and seconds unless noted. physics.js derives gravity
// and launch speeds from these targets, and tools/gen-reach.mjs proves the result
// (it fails if any move misses its row by more than 0.25 tile).
//
// Definitions used by the physics and gen-reach:
//   rise = how high the cricket's feet get above the take-off height, full hold.
//   gap  = the widest pit cleared landing at the same height from a full-speed run:
//          the horizontal travel of the hitbox from take-off to landing + the hitbox width.

export const TILE = 40;
export const FPS = 60;
export const DT = 1 / FPS;
export const SCREEN_W = 32;   // tiles per screen
export const SCREEN_H = 18;

// Jump stat -> rise and gap (at Speed 3).
export const JUMP = {
  1: { rise: 2.25, gap: 3.5 }, // not used by any cricket; here so a stat of 1 never breaks
  2: { rise: 2.5, gap: 4 },
  3: { rise: 3, gap: 5 },
  4: { rise: 3.5, gap: 5.5 },
  5: { rise: 4, gap: 6 },
};
// Speed shifts the running gap by +-0.5 tile per step from Speed 3.
export const SPEED_GAP_STEP = 0.5;
// Run speed per Speed stat, tiles per second.
export const RUN_SPEED = { 1: 5, 2: 5.5, 3: 6.5, 4: 7.25, 5: 8 };

export const MOVES = {
  hugeLeap:  { rise: 5, gap: 6, crouchTime: 0.4 },          // Hump: hold down 0.4 s, then Jump
  wallJump:  { rise: 2, out: 2 },                            // per kick, measured at the kick's apex
  wallRun:   { rise: 3, speed: 9 },                          // Jam: tiles up a wall; tiles/s
  glide:     { ratio: 4 },                                   // falls 1 per 4 across
  longGlide: { ratio: 6 },                                   // Katy
  superJump: { rise: 8, gap: 4, chargeTime: 0.25, apexTime: 0.55 },
  swing:     { reach: 5, fling: 6, minLen: 1.5, startLen: 2.5, grabRange: 1, gravity: 1900,
               pump: 5.0, maxAngle: 80, climbSpeed: 3, flingBoost: 3.0, flingScale: 0.92 },
  flutter:   { rise: 2.5 },
  pound:     { windup: 0.12, speed: 1150, recover: 0.12 },
  dash:      { mult: 1.8, time: 0.35, cooldown: 0.6 },       // Stripe's perk (double-tap a direction)
};

// Forgiveness (design: "Forgiveness").
export const FORGIVE = {
  coyote: 0.10,        // s after leaving a ledge a jump still counts as a ground jump
  jumpBuffer: 0.12,    // s a Jump press waits for the ground (or a wall) to arrive
  cornerNudge: 8,      // px: head bumps and ledge lips slide you round a corner this far
  wallGrace: 0.10,     // s after leaving a wall a Jump is still a wall-kick
  hookMagnet: 1,       // tiles: Use grabs a hook this close (measured from the hitbox edge)
  useBuffer: 0.12,     // s a Use press waits for a hook to come in range
  stickDown: { min: 0.6, halfAngle: 30 },  // a stick counts as down only past 60% and within +-30 deg
  stickUp:   { min: 0.5, halfAngle: 50 },
  stickSide: 0.3,      // horizontal threshold (fraction of the stick radius)
  padDeadzone: 0.25,
};

// Feel numbers (tuned by playing; see design/ENGINE_NOTES.md).
export const FEEL = {
  hitbox: { w: 30, h: 24 },     // px; a cricket fits a 1-tile tunnel
  fallMult: 1.6,                // gravity after the apex is this much stronger (snappy, weighty landings)
  jumpCut: 0.45,                // releasing Jump while rising multiplies the upward speed by this, once
  minJumpFrames: 4,             // a tap still gives at least this many frames of full rise
  maxFall: { 1: 950, 2: 1025, 3: 1100, 4: 1100, 5: 1100 },  // px/s by Weight: light crickets fall slowly
  groundAccel: 0.07,            // s to reach full run speed
  groundDecel: 0.05,            // s to stop
  airAccel: 0.11,
  airDecel: 0.22,
  flingDrag: 300,               // px/s^2: extra air speed from a fling decays at this rate
  groundDrag: 2400,             // px/s^2: extra speed after landing from a fling bleeds off fast
  wallSlide: 80,                // px/s while clinging
  wallSlideFast: 280,           // holding down
  raftSpeed: 0.6,               // run speed multiplier on the raft
  // [issue 20] the Raft floats: in water below the surface, bob up to it (player.js _bob). px/s:
  // the rise eases from `speed` to `min` over the last speed/ease px; accel takes the fall out of a dive
  bob: { speed: 320, min: 120, ease: 10, accel: 2400 },
  hurtInvuln: 1.0,              // s
  hurtKnock: { vx: 260, vy: -320, lock: 0.18 },
  hitStop: 0.06,                // s (design: 60 ms hit-pause)
  kickTime: 0.16, kickReach: 26,
  squashLand: 0.22,             // squash amount on a hard landing
};

export const HEALTH = { start: 5, max: 10 };
export const CHIRP = { meter: 3, refill: 2.0, baseRadius: 70, perStat: 30, baseStun: 1.2, stunPerStat: 0.5, lullaby: 3 };

export const toFrames = (s) => Math.round(s * FPS);
