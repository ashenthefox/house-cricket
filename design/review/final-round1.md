# Final review, round 1

## Bug hunter
1. **(must-fix) Stuck in the Carrier forever** after reloading a Carrier save from a game that never used a save crack.
   - Cause: "Return to the Carrier" calls `goCarrier(game.saveCrack || A.here())` (screens.js:389), which saves crack `{room:'carrier-0'}` (save.js:59). After a reload, `hub.returnCrack` is null and `hubCrack` (screens.js:495) offers no "Back to…".
   - Repro: `localStorage.clear(); __game.goToLevel(1); __game.open('complete','stripe')`, then Return to the Carrier, reload, Continue, press Up at the crack.
   - Fix: never save a hub room as the crack; persist `returnCrack` with a fallback to zone 1's start crack; `hubCrack` always offers a way out. (This goes with the orchestrator's decision to return to the lair's crack.)
2. **(must-fix) A gecko's killing blow runs `game.die()`, not the boss phase restart.**
   - Cause: the boss ticks first (game.js:165), then `checkHazards` → `die()` (game.js:262), before `BossBase.update`'s `lose()` (base.js:70). Pit/hazard `fallOut` → `die` has the same problem.
   - Fix: in `checkHazards` and `fallOut`, call `this.boss.lose()` when `this.boss && !this.boss.done`.
   - Repro: `scratchpad/die2.mjs kit-sink 58 29 3`.
3. **(should-fix) Music overrides stick after Save and Quit.** The Carrier override (main.js:263) and Nana's finale (nana.js:71) carry over to the title and later zones.
   - Fix: call `Audio.music(null)` in `quitToTitle`, `newGame` and `continueGame`.
4. **(should-fix) A stale `ui.onKey` after the stitch mode.** `closeMenu()` doesn't clear it (ui.js:153, screens.js:220). Afterwards the pause menu ignores the arrows, Enter sews stitches, and Backspace opens the map.
   - Fix: set `onKey = null` in `closeMenu()` and at the start of `menu()`.
5. **(nice) Escape and Tab skip Back.** main.js:313–314 resumes or opens the map before `ui.onBack` runs.
   - Fix: Escape means back in submenus; clear `_trioDraft` when the picker closes; ignore Tab while a card is open (complete, ready, crack, damper, hubcrack).
6. **(should-fix) Portrait on a phone doesn't pause the game.** The rotate note is CSS only.
   - Fix: on resize, pause if `(orientation: portrait) and (pointer: coarse)`.
7. **(must-fix before publishing) No Pages workflow,** so the unstamped sw.js would serve stale files.
   - Fix: add `.github/workflows/pages.yml` with the stamp step from web-target.md (Phase 9 wrap-up).

## Playtester (screenshots in design/screenshots/fr/)
1. **(must-fix) Tank trap.** In `tank-decor`, the gap between the water dish (cols 16–23) and the glass (col 30) has a floor at cols 24–29 that you can't jump out of.
   - Fix: add a one-way leaf step at about row 31, cols 25–28 (or make it a pit back onto the dish). Also add a general "Back to room entrance" option to Pause.
2. **(should-fix) The pebble jump is pixel-exact.** The row-18 ledge is exactly 3 tiles up and right beside the pebble.
   - Fix: lower it 1 tile, or move it 1 column right.
3. **(should-fix) The whole-house map breaks once Velvet joins.**
   - Cause: echo includes every room in `world.rooms`, so the Sandbox and Engine test show and the map squashes.
   - Fix: leave out zones with n ≥ 90 and the tank in map.js:29, and drop 98/99 from the release build's index.
4. **(should-fix) The tank doesn't teach the tail tell if you just run.** Duchess stalks at 70 px/s.
   - Fix: block the exit until both scripted lunges have happened, or start her in range ahead of Pip.
5. **(should-fix) Chikchak hits you on arrival** (at 4,15, under her ledge), and knockback can push you out of the arena.
   - Fix: she faces away for about 2 s, or Pip starts hidden in a crack; block the arena's left edge; add a one-line hint to the Ready card.
6. **(should-fix) Phone camera.** Pip sits at the bottom under the thumbs and is tiny (about 25 px).
   - Fix: on touch, offset the camera so Pip is about 40% from the top (as the design says), and zoom about 1.2×.
7. **(should-fix) Nana's eyelids are misplaced** during the chorus and sleep: one floats beside her head.
8. **(nice) The chirp indicator is a plain gold dot** that looks like a pickup, and the Listen arrow is small.
   - Fix: a pulsing ear or sound-wave icon in time with each chirp, and a bigger glowing Listen arrow (with the rhythm strip and ripples, per the design).
9. **(nice) Peridot and Gargy phase 1 end in about 3 s.**
   - Fix: two chains or two bonks in phase 1, or one more beat.
10. **(nice) Rough edges:**
    - The Rug room reuses the Carrier painting, mirrored, behind a ladder of plain planks.
    - The Carrier's outside in bed-carrier never changes as it grows.
    - The touch story hint says "Jump" (it should say "Tap").
    - The title "Press any key or button" is low-contrast and overlaps the antenna.
