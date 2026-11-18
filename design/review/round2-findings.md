# Round 2 findings

## Player
- **P1 (must-fix): Jump does too much.** Glide and flutter are both "hold Jump in the air". Hump's "hold 0.5 s" huge leap delays his takeoff. Variable height and glide overlap. (GAME_DESIGN lines 69, 156, 211, 215)
  - Fix: flutter is a fresh *press* in the air; glide is *holding* Jump while falling, only after the apex or a flutter; variable height comes from an early release; Hump jumps on press, and his huge leap comes from a crouch-charge (↓ held, then Jump). Write this into the movement table.
- **P2 (should-fix): No movement forgiveness specified.**
  - Fix: about 100 ms coyote time, a 120 ms jump buffer, corner nudge, about 100 ms wall-jump grace, and a magnet radius for floss hooks, all in data/movement.js. The play-test checks they're on.
- **P3 (should-fix): Bosses 4–9 can be skipped,** because every item comes before its lair and the Attic is gated by items only. The finale chorus can be just 3 crickets, which undercuts "coming back for everyone". (lines 189, 217–223, 320, 323)
  - Fix: gate the Attic on rescues too (Soot opens the flue once 9 crickets are home; the map table shows who's missing), or make Nana's door need the full chorus. Lean: require the rescues.
- **P4 (should-fix): Zone 5's beacon points at the alarm inside Peridot's arena**, which is gated by the Glider, so nothing leads you to the Glider. (lines 44–46, 103, 258, 296–299, 495)
  - Fix: before pickup, the beep and taps carry through a dryer-vent sound hole beside the Glider; retarget afterwards. Add it to the DoD.
- **P5 (should-fix): Touch chains.** Use sits two buttons away from Jump. Swing release is unspecified. A drifting stick turns ↓+Jump into a pound or drop.
  - Fix: Use goes next to Jump, or hooks grab with Jump in the air near a hook and release with Jump. ↓ counts only past 60% of the stick's radius in a ±30° cone. State the swing release for every input method.
- **P6 (should-fix): Mossy's "tag" has no verb** (touching a gecko normally hurts). **Nana's phase 1 "lighting" stones has no action.**
  - Fix: kick or touch Mossy during his eye-glint, with no damage; light Nana's stones with a kick or ground-pound between tail sweeps.
- **P7 (should-fix): Keyboard.** S isn't listed as down; Listen on L is unreachable with the arrow keys; keyboard X is Kick while the pad's ✕ is Jump, which is confusing.
  - Fix: add S as down; put Listen in the left cluster (for example B or Left Ctrl); prompts always show key caps or glyphs, never a bare "X".
- **P8 (nice): Frost's Dolbear perk has no player action.**
  - Fix: a HUD thermometer while Frost leads; thermostat locks show a target temperature, matched by bringing Frost to the right warm or cold spot; the Sound Book explains the formula.
- **P9 (nice): Bosses in zones 1–5 restart from phase 1.**
  - Fix: phase checkpoints for every fight, or restart from phase 2 when losing in phase 3.

## Builder
Line numbers refer to GAME_DESIGN.md. The cost arithmetic was checked and holds: images $11.14, total $18.78.

- **B1 (must-fix): Music through media elements contradicts web-target.md and breaks offline play on iPhone.** web-target.md lines 138–143 say to avoid `<audio>` for music, because files from the offline cache can fail to play. Carrier chirp layers timed against a media element's currentTime drift.
  - Fix: decode only the current zone track plus the Carrier and boss tracks as looping AudioBuffers, released per zone. Schedule against AudioContext time. DoD: at most 3 music buffers decoded at once.
- **B2 (must-fix): check-world and goToLevel assume one route order, but the route branches** (Pantry or Laundry first; Living Room needs the Rubber Band OR the Glider).
  - Fix: a prerequisite graph in zones.js. check-world runs every valid order. `goToLevel(n, variant)` takes explicit item sets. Record zone 6 twice (Rubber-Band-only and Glider-only).
- **B3 (should-fix, leaning must): Swapping in mid-air is undefined.** Hump's leap, then a swap to Jam's wall-run or Katy's glide, can cross item gates. check-world only tests one cricket at a time.
  - Fix: either ground-only swaps outside arenas, or a mid-air swap keeps velocity and air state, gives no new leap, blocks perks until landing, and shares the flutter count. Model it in check-world.
- **B4 (should-fix): check-world claims more than a static flood fill can prove.** It leaves out dynamic elements (vents, updrafts, currents, raft, cushions, crumbling floors, syrup, piano keys). One table can't serve both the weakest and strongest passes, and it can drift from physics.js.
  - Fix: generate the reach table by running the real physics.js per stat. Margins of −0.5 tile (weakest pass) and +0.5 tile (strongest). Dynamic elements as graph edges. Drop "every arena passes" from check-world and leave arenas to boss replays recorded with a Jump 2 / Speed 2 cricket.
- **B5 (should-fix): The finale clock in audio.js (and the beacon's "one beat later" answer) runs on AudioContext time,** which breaks frame-locked replays.
  - Fix: drive beats from the fixed-step game time and schedule audio from it with a lookahead that stops while frozen. Gameplay never reads AudioContext time.
- **B6 (should-fix): Gecko pose edits will repaint the tail,** so the tailBox cuts the body or leaves a double tail. Rigid tail segments show wedge gaps.
  - Fix: cut the tail from the idle first, then make the strike and sleep edits from the tailless body (sleep: "tail hidden", or drawn in code). Draw the tail as a strip bent along a spline, column slices with drawImage, never rigid segments.
- **B7 (should-fix): Retries and prices.** The $1.22 reserve covers only about 10 retries; 43 medium images get one try each. "Medium > $0.10 → cut items 4 and 5" points at the wrong items (item 4 is low quality). nanogen's default is now Nano Banana 2.1, whose price isn't listed and which adds about 1,100 thinking tokens; $0.034/$0.05 are the old 3.1 Flash prices.
  - Fix: budget 1.5 tries for geckos and crickets. Pin `--model gemini-3.1-flash-image` (known price) or measure 2.1 on the first call. Use `--model gpt-image-2.5-flare` (about 4× cheaper) for low sheets and anim8gen frames, which frees about $2. Fix the overrun trigger.
- **B8 (should-fix): Antenna anchors must be per frame and per pose,** not per cricket, and imagegen2 may paint antennae anyway.
  - Fix: `anchors[anim][frame]={head,tail}` from a Pillow helper or set by hand. An acceptance check rejects any frame with painted antennae or cerci.
- **B9 (should-fix): Hump's "hold Jump 0.5 s" clashes with hold-for-higher** (same as Player P1).
  - Fix: a crouch-charge, or Use while Hump is in front.
- **B10 (should-fix): The DoD contradicts the design.**
  - Zone 5 targets the alarm, not an item.
  - Zone 4's "decoy" is Frost herself.
  - "Gain rises along the path" fails because of straight-line distance in rooms and the retarget. Change it to: gain at each room entry ≥ the previous room's, reset at the retarget.
  - Gentle Mode bosses aren't recorded, so the Gentle claim can't be replayed. Limit it to checkpoints and slower tells, via setBossPhase.
  - Textures cut from light, low-contrast paintings will be light, but platforms must be the darkest values. Remap texture luminance to the zone's two darkest palette colors.

## Art and sound director
- **A1 (must-fix): Gecko sizes don't fit.**
  - Problem: a 1536×1024 side view with the tail straight out gives an animal about 1400 px long and 350–450 px tall. Scaled to 480 px tall it's 1700–1900 px long, wider than the screen. Upscaling for 2× turns the watercolor to mush.
  - Fix: size geckos by length, at most about 1.1 screen widths nose to tail, which makes them about 300–420 px tall. Generate at 2048×1152 (a valid size), or accept 1× sharpness. Tall bosses (Nana, Big Tok) rear up or cling to a wall in a 1024×1536 portrait frame. Record the frame per gecko in data/geckos.js. Arena layouts follow.
- **A2 (must-fix): Ten playable crickets have no run, cling, swing or glide art** (only idle and leap), so they slide frozen.
  - Fix: one pose-sheet edit per cricket (1536×1024 medium, with the cricket's idle and Pip's poses as refs) holding run-A, run-B, cling, hang, glide and pound, cut out with Pillow. About 10 × $0.13 = $1.30. The leap pose folds into the sheet. Hump has no glide; Digby gets a dig pose. Fund it from the leap item, the near strips or the reserve.
- **A3 (should-fix): Geckos move with frozen legs, and Kite has no glide art.**
  - Fix: cut the legs as code-rigged pieces (pivots in geckos.js) for a 2-beat walk, at no cost. Add one Kite glide-pose edit, flaps spread (about $0.13).
- **A4 (should-fix): The 5 kHz music low-pass protects only 2 of 11 voices,** since most chirps are 2.5–4.8 kHz. The Bedroom celesta, Attic music box and glockenspiel imitate chirps.
  - Fix: drop the always-on low-pass. Put a peaking cut on the music bus (about −6 dB, Q 1.5) at the current beacon voice's pitch, set per zone, and keep the 12 dB duck while Listen is held. Prompt melodies below about 2 kHz: low-register celesta or music box, or felt piano and harp; no glockenspiel in zone tracks.
- **A5 (should-fix): The gecko strike tell has no sound.**
  - Fix: a synthesized tail-swish or rattle cue, the same for every gecko and panned to it, starting with the wiggle. Add it to the DoD.
- **A6 (should-fix): Antenna anchors per frame and pose** (same as Builder B8). Prompt "antennae and cerci omitted"; erase any painted ones with Pillow before acceptance.
- **A7 (should-fix): Missing assets.**
  - Tank-escape props: tongs, feeder cup, hide log, fake plant, water dish, pebble, mesh lid. Fix: one low sheet.
  - The Hall, stairwell and chimney shaft have no painting or palette. Fix: the Hall uses the Bedroom palette, the stairwell the Study's; the chimney gets its own palette and one far painting (+$0.05), tiled vertically.
  - Water is unspecified (sink, bath, washer). Fix: code-drawn as a wobbly band with a lighter wet edge and ripple lines.
  - The kid has no reference. Fix: keep the kid off-face (hands, sleeve, sneakers).
  - The ending panel shows "the geckos" but only Duchess is a reference. Fix: pass the relevant gecko idles.
- **A8 (should-fix): Breakable and soft terrain as painted props won't match code-drawn platforms.**
  - Fix: draw cereal wall, plaster, crumbling floor, soil and syrup with the code painter. One low sheet of 6 seamless swatches, plus kind-specific edges (cracks, speckle, glossy rim). Keep true objects (keys, faucets, hooks, dice) as sprites.
- **A9 (should-fix): Using the Pip anchor as reference may turn every cricket into a recolored Pip** (high-fidelity reference edits keep the body plan).
  - Fix: species anatomy first in the prompt, plus "match the painting style and ink line of the reference, NOT its body shape". If one drifts, generate it without a reference, then do one style pass. Check silhouettes at 64 px.
- **A10 (nice): Chroma-keyed blurred near strips will fringe.**
  - Fix: imagegen2 low with native transparency (about $0.025), or sharp silhouettes blurred in code.
