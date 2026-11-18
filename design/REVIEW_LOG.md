# House Cricket — design review log

## Round 1

Reviewers: Player, Builder and Art and sound director. Their condensed findings are in `review/round1-findings.md`. The refiner then rewrote GAME_DESIGN.md.

| Finding | Severity | Outcome |
|---|---|---|
| P1 The Carrier wasn't on the map and had no way back | must | Fixed: it sits on the Bedroom floor; every save crack can send you there from the start; Shelly adds crack-to-crack travel; after a rescue the game asks whether to go to the Carrier |
| P2 / B1 Swapping was banned in boss fights, but Nana's fight needs it; entering as Hump could leave you stuck | must | Fixed: you carry a trio and can swap during fights; lair doors check the trio; boss arenas use a fixed chirp radius |
| P3 The beacon led to a gated lair, and always-on ripples made Listen pointless | should | Fixed: the call comes from a sound hole by the item until it's found; ripples show only while listening or just after a call; an "Always show" setting |
| P4 On touch, Use shared the Kick button | should | Fixed: a permanent Use button |
| P5 The opening was a slideshow | should | Fixed: 3 panels, then a 6-beat playable escape, then the cup-tip panel |
| P6 The Laundry alarm beeped only every 40 s | should | Fixed: it beeps back when you chirp and every 8–10 s; Hump taps its case |
| P7 Falling in a pit sent you back to the start of a big room | should | Fixed: respawn on the last solid ground, plus a soft checkpoint per screen |
| P8 Nothing showed what each rescue changed in the Carrier | should | Fixed: an arrivals table of 22 painted objects |
| P9 Bosses restarted from phase 1 | should | Fixed: phase checkpoints in zones 6–10 and in Gentle Mode; Gentle Mode offered after 2 retries |
| P10 / B9 Key collisions | nice/should | Fixed: Jump is Space or Z; Listen is L or holding ↓; ↓+Jump drops through a platform; walls are cling-only |
| B2 Recorded solutions couldn't be replayed reliably, and the in-game `solve()` broke the play-test rule | must | Fixed: replays are frame-locked with real key presses in tools/; the debug hook was extended |
| B3 No movement model, so cricket stats could break the gates | must | Fixed: a movement table in tiles and a two-pass world check |
| B4 / A3 / A9 audiogen can't make stems, theme variations or a beat-locked finale | must | Fixed: one Carrier track plus synthesized chirp layers; the finale chorus runs on a code clock |
| B5 Phones would run out of memory | must | Fixed: a per-screen cache capped at 2×, per-zone loading, streamed music |
| B6 / A2 The gecko tail would tear and the poses wouldn't match | must | Fixed: poses are edits of the idle; the tail is a code chain |
| B7 / A4 The anchor was the wrong view, poses were missing, sizes disagreed | must | Fixed: a strict-profile anchor, 5 extra poses, one 128×80 size at 2×, a leap pose for each cricket |
| B8 The beacon's low-pass muted the chirp | should | Fixed: a −24 dB floor, reverb, a gentler filter, an easier-pitch setting. Not changed: chirp rate stays tied to temperature (for Dolbear's law) |
| B10 Phones show the game at about half size | should | Fixed: DOM overlays for the HUD and menus, bigger tells on touch, a 1.15× zoom in rooms |
| A1 Props and Carrier facilities weren't in the asset list | must | Fixed: about 40 props and 22 Carrier objects on sheets |
| A5 Portraits weren't listed | should | Fixed: portraits are cropped from the source images; close-ups go to the $35 option |
| A6 Nothing tied the scenes to the characters; no real palette | should | Fixed: a reference chain and hex colors for each zone |
| A7 Backgrounds might look like platforms and repeat | should | Fixed: low-contrast prompt rules, 2 variants per zone plus mirroring |
| A8 Decoy rhythms and about 20 missing sounds | should | Fixed: synthesized decoys; a full list of sounds |
| A10 No room left in the budget | should | Fixed: a quality rule and a reserve; the plan is $18.78 plus a $1.22 reserve, $20 in all |

Verdict: several must-fix findings were fixed in this round, so it hasn't converged yet. Round 2 follows.

## Round 2

The same three roles reviewed the revised design afresh. Their condensed findings are in `review/round2-findings.md`. The refiner rewrote GAME_DESIGN.md again.

| Finding | Severity | Outcome |
|---|---|---|
| P1 / B9 Jump did too many things; Hump's held leap clashed with "hold to jump higher" | must | Fixed: one meaning per input (press, early release, fresh press in the air to flutter, hold while falling to glide); Hump's huge leap is ↓ held 0.4 s, then Jump |
| P2 No movement forgiveness | should | Fixed: coyote time, jump buffer, corner nudge, wall-jump grace and a hook magnet in movement.js, plus a recorded "feel" solution |
| P3 Geckos 4–9 could be skipped | should | Fixed: the Attic opens at the 9th rescue, so the finale chorus always has all 10 crickets |
| P4 Nothing led to the Glider in zone 5 | should | Fixed: the beeps carry through the dryer vent next to the Glider |
| P5 Touch chains | should | Fixed: Use sits next to Jump; a deadzone and cone for ↓; the floss grab and release written out for every input |
| P6 Mossy's tag and Nana's stones had no action | should | Fixed: kick or touch Mossy during the glint; kick the stones |
| P7 Keyboard gaps | should | Fixed: S is down; Listen on B or L; key caps and pad glyphs in prompts; M mutes; Tab opens the map |
| P8 Frost's perk had no action | nice | Fixed: a HUD thermometer plus thermostat locks |
| P9 Early bosses restarted from phase 1 | nice | Fixed: every fight restarts the current phase |
| B1 Music through media elements | must | Fixed: AudioBuffers, at most 3 decoded at once |
| B2 The route branches, but only one order was checked | must | Fixed: a prerequisite graph; check-world searches every order; zone 6 recorded twice |
| B3 Swapping in mid-air | should | Fixed: a swap pressed in the air waits until you land |
| B4 check-world claimed too much | should | Fixed: reach figures generated from the real physics, with margins; moving parts as edges; arenas left to replays |
| B5 The finale clock ran on AudioContext time | should | Fixed: beats come from fixed-step game time |
| B6 / A1 / A3 Gecko sizes, tails and legs | must | Fixed: sized by length (≤1.1 screen widths); tail and legs cut from the idle first; spline tail; leg rig; a Kite glide pose; tall frames for Nana and Big Tok |
| B7 Retries and prices | should | Fixed: models pinned; 2.5 Flare for cheap art; 1.5 tries for characters; corrected cut triggers |
| B8 / A6 Antenna anchors per frame | should | Fixed: per-frame anchors from find-anchors.py; painted antennae cleaned off or the frame re-rolled |
| B10 The definition of done contradicted the design | should | Fixed: zone exceptions; a monotonic gain check per room entry; Gentle Mode checked with setBossPhase; textures remapped dark |
| A2 Crickets had no movement art | must | Fixed: an 8-pose sheet for each cricket |
| A4 The 5 kHz low-pass protected only 2 voices | should | Fixed: a peaking cut at the zone's voice plus a duck while listening; melodies kept under about 2 kHz |
| A5 The strike tell had no sound | should | Fixed: a synthesized rattle-swish |
| A7 Missing assets (tank props, chimney, water, the kid) | should | Fixed: tank prop sheets; palettes for the Hall, stairwell and chimney; water drawn in code; the kid shown off-face |
| A8 Breakable terrain wouldn't match the platforms | should | Fixed: drawn by the code painter from 6 swatches |
| A9 Crickets might come out as recolored Pips | should | Fixed: anatomy first in the prompt, "style NOT body shape", a fallback without the reference. The Katy mockup confirms a distinct shape |
| A10 The near layer would fringe | nice | Fixed differently: built in code from props |

**Follow-up by me:** the refiner had planned to pin a model in the person's `.env`. I changed that to a per-command environment variable, so `.env` is never edited. I also wrote the measured mockup prices into the cost section: about half the estimate.

**Verdict:** this round's must-fix findings were all fixed. The `--rounds` limit is 2, so the review stops here. The design is consistent and every request in the brief is covered (see the check below).

### Brief checklist, re-read as the person who asked

Every item is in the design:
- the name
- the escape opening, which is now playable
- the 10 room zones
- a gecko in each zone, guarding a different cricket
- real chirps from research
- the louder/softer beacon
- items and gates
- the map
- gecko fights that never hurt them (avoid, stealth, distract, sleep, stun, hide and seek, chase, dazzle, lullaby)
- swapping crickets with different stats
- watercolor art
- geckos that are scary but friendly
- a Carrier that grows Suikoden-style
- other insects joining (Hump plus 8 recruits)
- a range of enemies (16 types)
- the Not-Crickets joke and puzzle (bat, tree frog, chimney swift, smoke alarm, a chirping gecko, squeaks)
- gamepad support
