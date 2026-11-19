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
export const TRAP_EXEMPT = [
  { zone: 'zone-99', why: 'the Sandbox: a dev-only test zone, not in the release build' },
  { zone: 'zone-98', why: 'the engine test rooms: a dev-only test zone, not in the release build' },
  { room: 'pan-shelves', rect: [33, 15, 4, 4], why: 'the thorn pit under the hook: clinging to its walls (Booties) you slide onto the thorns and are put back on the ledge at once' },
  { room: 'att-rafters', rect: [81, 15, 1, 20], why: 'the thorn pit left of the rafter wall: clinging to the wall (Booties) you slide onto the thorns and are put back at once' },
];
