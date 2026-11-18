# Round 1 findings (condensed from the three reviewers)

## Player
- **P1 (must-fix): The Carrier has no place on the map and no way back.**
  - Fast travel comes only from Shelly (optional, zone 6 or later).
  - Fix: put the Carrier on the map (bedroom floor by the tank). Make save-crack→Carrier travel a base ability; Shelly adds crack-to-crack travel. After each rescue, offer "Return to the Carrier?" and bring the player back to the same crack.
- **P2 (must-fix): Nana's phase 2 needs swapping, but swapping is banned in boss fights.**
  - Cycling a 10-cricket party under attack is frustrating.
  - Fix: allow swaps in fights. Stones highlight the voices that fit. Add a quick-pick (hold L1 for a radial of low/mid/high; three portrait buttons on touch), or a three-cricket active party chosen at save cracks.
- **P3 (should-fix): The beacon points at the lair, which is gated until the item is found, so it leads to a dead end.**
  - Always-on edge ripples make Listen pointless.
  - Fix: before the item is found, the cricket answers from near the item, or the item rings on Chirp; retarget to the lair after pickup. Show ripples only while listening or for a few seconds after a Chirp-call. Add an accessibility option, "Always show beacon ripples".
- **P4 (should-fix): Touch Use covers Kick and is almost always available** (Rubber Band, Glow Bead).
  - Fix: a permanent Use button (64 px) once the first Use item is found.
- **P5 (should-fix): The opening is about 36 s of slides, and the tank escape is undefined.**
  - Fix: control starts at the tongs panel. Dodge the tongs in the cup, leap out, a short no-fail chase past a dozing Duchess, climb the decor, exit through the lid gap. Then the cup-tip panel, and the first chirp right away. Script 4–6 beats.
- **P6 (should-fix): The zone 5 beacon is a smoke alarm beeping every ~40 s, and Hump can't answer a call.**
  - Fix: the alarm beeps when you chirp, plus every 8–10 s; Hump taps its case. Keep 40 s for the zone-1 hallway decoy.
- **P7 (should-fix): A pit fall sends you back to the start of a room up to 3 screens wide.**
  - Fix: respawn at the last solid ground or a marked respawn point, for 1 heart. Add mid-room soft checkpoints in multi-screen rooms in zones 8–10.
- **P8 (should-fix): Carrier change per rescue is undesigned, and the $20 trim thins it.**
  - Fix: a small painted prop appears per arrival. List what each of the 19 arrivals adds. If recruits are cut, at least paint each facility prop.
- **P9 (should-fix): Bosses restart from phase 1, even Nana.**
  - Fix: checkpoint at each phase for zones 6–10, or for all bosses in Gentle Mode. Offer Gentle Mode after 2 retries.
- **P10 (nice): ↑ is both jump and climb.**
  - Fix: remove W/↑ from Jump (keep Space/Z).

## Builder
- **B1 (must-fix): Swap rule vs bosses.**
  - Lashes, Mossy and Kite need Chirp. Hump has Chirp 0 and Mote has 1, so entering a lair as Hump softlocks.
  - Fix: one rule. Either allow swaps in every fight, or the arena door swaps or asks. Fight logic should use a fixed stun and chirp radius, separate from party stats.
- **B2 (must-fix): Replays aren't deterministic, and `solve()` in-game breaks the play-test rule** ("JS only to read state, never fake actions", playtest-guide.md lines 95–98 and 186–191).
  - Fix: frame-locked replay. Freeze, press real keys with keyboard.down/up, `__game.step(frames)` between changes. Store solutions as `[frame,key,down/up]`; the replayer lives in tools/.
  - The hook needs `goToRoom(id,{items,party})`, `levels()`, `audioState()`, `buttons()`, `beacon()` (gain, cutoff, pan, pathDist) and `renderChirp(species)` (OfflineAudioContext, for the FFT). See web-target.md lines 296–310.
  - Record only zone critical paths and bosses, not every room. Replay each twice.
- **B3 (must-fix): check-world has no movement model; Jump stats 2–5 and Speed 2–5 break the gates** (Hump can be rescued before the Pantry).
  - Fix: a movement table in tiles in data/, shared by physics.js and the checker: rise and gap per Jump stat, wall-jump, glide, super-jump, swing reach, flutter.
  - The checker runs every gate twice: with the weakest owned stats (the main path must pass) and the strongest (gates must hold).
  - Prefer gates by kind (water, darkness, cereal walls, loud zones, hooks) over pure height. Super-jump must clear far more than Hump.
- **B4 (must-fix): audiogen can't do Carrier stems, title-theme variations or a beat-locked finale** (audiogen SKILL.md: prompt and length only; no composition_plan, no melody input).
  - Fix, Carrier: crossfade full variations, or one track plus code-synthesized layers.
  - Fix, Attic: an "in the style of" track.
  - Fix, finale: the rhythm comes from a code clock with synthesized chirps and percussion; the music is a bed (or measure the BPM offline).
- **B5 (must-fix): Phones run out of memory.**
  - 3-screen rooms at DPR 3 are about 25 MP, beyond the iOS canvas limit of about 16.7 MP. 2560×1440 paintings are 14.7 MB each decoded. 90 s stereo music is about 32 MB per decoded buffer.
  - Fix: cap the platform cache at DPR 2 and tile it per screen. Load and release paintings and music per zone; never decode all the music at boot.
- **B6 (should-fix): The gecko tail slices will tear, and the poses won't match.**
  - Fix: tail straight out horizontally. Strike and sleep as `--image` edits of the idle, aligned with Pillow. A tailBox and pivot per gecko, or a code-drawn tail tip. 1536×1024.
- **B7 (should-fix): Pip is missing poses** for wall-cling, swing/hang, glide, listen and pound. Code antennae will double the painted ones. Sizes disagree (128×80 vs 256×160).
  - Fix: single-pose edits for the missing states. Prompt "antennae omitted" and record a headAnchor. One size at 2×. Budget anim8gen at 10–12 images per animation (insect legs need retries).
- **B8 (should-fix): The beacon's low-pass on a pure 4.8 kHz sine just mutes it**; −30 dB plus the LPF makes it silent. 6–7.5 kHz voices are hard for adults and phone speakers.
  - Fix: distance = gain (clamped at about −24 dB far) + reverb wet + an LPF floor of about 6 kHz + a slower chirp rate far away. Duck music only while Listen is held. Test the curve with `beacon()`.
- **B9 (should-fix): Key collisions.** ↑ is jump and climb; ↓ is Listen and pound; there's no drop-through for one-way platforms; wall climb vs cling is unspecified.
  - Fix: Jump = Space/Z only. Listen = L, or ↓ held for 0.3 s while still. ↓+Jump drops through. State that walls are cling-only (or not); mirror on touch and pad.
- **B10 (should-fix): Phones show the game at about 0.52 scale.** Pip is about 34 CSS px; the rhythm strip and text are tiny.
  - Fix: HUD, dialog, rhythm strip and menus as a DOM overlay at screen resolution, minimum 14 CSS px. Bigger tells on touch. Optionally a 1.15× camera zoom on phones, with critical hazards in the central 85%.

## Art and sound director
- **A1 (must-fix): Boss props, hazards and Carrier facilities are missing from the asset list.**
  - Fix: a props row of about 40 objects (imagegen2, transparent, anchor ref, 4 per sheet, about 10 calls). carrier-facility-× overlays (12) placed by code on Carrier shells with slots.
- **A2 (must-fix): The gecko tail slicing will tear, and the poses drift.**
  - Fix: body and tail as separate pieces (tail bent in code as a segmented chain). Poses as `--image` edits of the approved idle. A per-species landscape framing such as 1536×1024 (looming, peering down).
- **A3 (must-fix): Carrier stems are impossible** (same as B4).
  - Fix: one Carrier track plus residents' synthesized chirps added on the track's measured BPM, one voice per rescue.
- **A4 (must-fix): The anchor view is three-quarter, but the game is strict side view, and anim8gen inherits it.** Sizes disagree. Ten playable crickets have no movement art.
  - Fix: anchor in strict profile facing right, at game scale, with "bold sepia outline, simplified shapes, readable at 64 px". Antennae and cerci code-drawn. One size (128×80 at 2×). Each rescued cricket gets a second pose (mid-leap stretch) as an `--image` edit (about $0.70).
- **A5 (should-fix): Portraits are used everywhere but not listed.**
  - Fix: gecko portraits cropped from the idle (free). Crickets and Not-Crickets get a head-and-shoulders close-up each by edit (about 15). Recruits keep one small painted image as both sprite and portrait, never code-drawn.
- **A6 (should-fix): No reference chain ties nanogen scenes to the imagegen2 characters, and there's no real palette.**
  - Fix, the chain: Pip anchor → Bedroom far painting with the anchor as nanogen reference (the scene anchor) → every other scene gets the scene anchor plus the Pip anchor → story, title and ending panels get the Pip, Duchess and Carrier refs. Zone textures come from (or are cropped from) that zone's painting.
  - Fix, palette: 4–5 hex values per zone in zones.js and in the prompts, also used for the code-drawn wet edges.
- **A7 (should-fix): Background paintings will read as platforms, and one painting repeats across about 7 rooms.**
  - Fix: low contrast, light values, "no horizontal surfaces in the lower two-thirds"; platforms are always the darkest values. 2–3 far-painting variants per zone as nanogen edits, assigned per room. Check nanogen's real output size.
- **A8 (should-fix): Decoy rhythms matter for the puzzles, and about 20 actions have no sound.**
  - Fix: synthesize the smoke alarm, the peeper and the chik-chak in chirps.js to match RESEARCH.md; keep audiogen for the swift and the bat. Write a full SFX list per verb and hazard (wall-jump, dash, wall-run, shove, dig, Hump leap, steam, faucet, flood, pull-chain, fruit splat/lick, pillow bonk, tail sweep, jaw-stuck, glow dazzle, enemy flip, buzz, stink, vacuum, dialog blip, map/pause, item-fail, upgrade and zone-complete stings). UI blips and stings synthesized.
- **A9 (should-fix): The finale has no known beat, and the music low-pass would always be on** (same as B4 and B8).
  - Fix: code-driven chorus. A music cut of about 4–6 kHz at most, with full ducking only while Listen is held.
- **A10 (should-fix): No budget slack for the missing assets.**
  - Fix: enemies, items, props and facilities at imagegen2 `--quality low`, 1024², 4 per sheet, downscaled; medium only for the anchor, geckos and portraits (512² may not be a valid size). Synthesized decoys, a single Carrier track. Spend the unused mockup allowance on anchors (Pip, Duchess, Bedroom scene, Carrier shell, title). Confirm the image price on the first generation.

## Pricing (looked up 2026-11-15)
- gpt-image-2.6: $30 per 1M image output tokens, $8 per 1M image input tokens.
- Low quality at 1024² is about 824 tokens, about $0.025.
- Medium and high aren't published. Estimate medium at about $0.06–0.10 until measured.
