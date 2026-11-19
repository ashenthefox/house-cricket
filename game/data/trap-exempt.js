// [issue #4] Spots tools/check-world.mjs's trap check lets stand: places with no way back out by
// moving, jumping, climbing or a door, on purpose. Only two kinds belong here:
//   - a plainly intentional hazard (a visible bottomless fall, thorns, water) that resolves at once:
//     you are put back on the last safe ground right away;
//   - the test zones, which are not in the release build.
// Never an ordinary spot that only the fall-respawn or damage would get you out of: fix those in
// the room data (a step, a lower ledge, a way back up).
// Read by the tools only (the game does not load this file).
//   { zone }                         the whole zone
//   { room, rect: [x, y, w, h] }     the room's tiles (a stuck pocket counts as exempt only when every
//                                    one of its spots is inside an exempt rect)
//   { rule: 'hazard-wall' }         every wall-cling spot with thorns, water (no Raft) or a bottomless fall
//                                    straight below it: letting go (or sliding down) drops you in at once
//   { fight: boss, room, rect }      not an exemption: a gecko fight's ground. Until the boss's cricket is
//                                    rescued, every spot in the rect is a way on (the fight itself moves you:
//                                    the check otherwise counts only the boss's own spot)
export const TRAP_EXEMPT = [
  { rule: 'hazard-wall', why: 'clinging (Booties) to the wall of a thorn, water or bottomless pit: you slide or drop into it and are put back at once' },
  { fight: 'duchess', room: 'bed-lair', rect: [4, 11, 54, 5], why: 'Duchess stalks the whole sand floor, over the rock; stuck in a berm, her body is the step up to the rock and the cup' },
  { zone: 'zone-99', why: 'the Sandbox: a dev-only test zone, not in the release build' },
  { zone: 'zone-98', why: 'the engine test rooms: a dev-only test zone, not in the release build' },
];
