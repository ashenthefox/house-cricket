# House Cricket — build plan (shared by every helper)

The design is `design/GAME_DESIGN.md`. The research is `design/RESEARCH.md`. The mock pictures in `design/mockups/` are the approved look. Plugin skills live under `<plugin folder>/`, and the gamegen skill folder is `<gamegen skill folder>`.

## Rules for asset helpers
- **Spending is pre-approved** within your share of the budget (below). You can't ask the person anything; decide and note it.
- **Work in `.gamegen/candidates/<your-area>/`.** Copy only accepted files into `game/assets/…` under the exact names below. Never overwrite another helper's files.
- **Look at every image you make** (Read it). Check:
  - correct anatomy (count the legs: insects 6, spiders 8, lizards 4);
  - matches the mockup and the style line;
  - a clean transparent background where needed;
  - **no text, letters, logos, brand names or red-cross symbols**.

  Re-roll a bad one up to twice with a better prompt, then change approach.
- **Style line** (in every image prompt): "soft storybook watercolor illustration, visible cold-press paper grain, loose wet-on-wet washes with gentle color bleeding at the edges, fine sepia ink linework, warm household lighting, muted cozy palette, no text".
- **imagegen2:**
  - Medium character art: `--model gpt-image-2.6-flare --quality medium`, measured at about $0.035–0.06 per image.
  - Cheap work: `--model gpt-image-2.5-flare` (about 4× cheaper).
  - anim8gen frames: run anim8gen with `IMAGEGEN2_MODEL=gpt-image-2.6-flare` in that command's environment (quality matters more for animation). **Never edit `.env`.**
- **nanogen:** `--model gemini-3.1-flash-image` ($0.05 at 2K).
- **Return to the orchestrator:** for each asset, the final file, the tool, the number of tries, the estimated cost, and a one-line verdict. Also give your total spent.

## Where files go (`game/assets/`)
```
sprites/crickets/<name>/base.png            antenna-less idle, strict profile facing RIGHT, trimmed, 256×160 canvas, bottom-center anchor
sprites/crickets/<name>/portrait.png         the mockup WITH antennae (copy of design/mockups/crickets/<name>.png, trimmed, max 512 px)
sprites/crickets/<name>/poses/<pose>.png     run-a run-b leap cling hang glide pound listen hide peek (same 256×160 canvas)
sprites/crickets/<name>/anim/<anim>/NN.png   anim8gen frames (idle, run; Pip also jump kick chirp hide peek), 256×160 canvas
sprites/crickets/<name>/anchors.json         {"<anim or pose>": [{"head":[x,y],"tail":[x,y]}, …]} per frame, canvas pixels
sprites/geckos/<name>/idle.png strike.png sleep.png body.png tail.png [legs-*.png]  + meta.json (frame wide|tall, tailBox, pivot, legs)
sprites/npcs/<name>.png                      Not-Crickets, recruits, Sir Bartholomew parts (barty-eye, barty-claw, barty-head, barty-body)
sprites/enemies/<name>/0.png 1.png           two frames, facing LEFT, trimmed
props/<name>.png   items/<name>.png   carrier/<object>.png   ui/<name>.png   terrain/<kind>.png
bg/<zone>/far-a.webp far-b.webp (2752×1536 as returned) + far-a-phone.webp far-b-phone.webp (1920×1072)
bg/carrier/shell-0..3.webp   story/open-1..4.webp end-1..4.webp   title.webp   lair.webp
audio/music/<track>.mp3      audio/sfx/<name>.mp3
```
- **Zone ids:**
  - z00-tank, z01-bedroom, z02-bathroom, z03-kitchen, z04-pantry, z05-laundry, z06-living, z07-study, z08-sunroom, z09-basement, z10-attic;
  - linking spaces: hall (uses the Bedroom's), stairwell (uses the Study's), chimney;
  - optional: lair.
- **Cricket names:** pip stripe katy duo frost hump jam rin digby mote chip.
- **Geckos:** duchess chikchak bigtok lashes peridot gargy mossy kite ember nana.

## Budget shares ($50 total, $3.93 already spent on mockups)
| Helper | Share |
|---|---|
| Audio (music + effects) | $11.00 |
| Scenes (nanogen: paintings, Carrier shells, story, title, lair) | $3.00 |
| Crickets A (pip stripe katy duo frost hump) | $6.00 |
| Crickets B (jam rin digby mote chip) | $5.00 |
| Geckos and talking characters | $4.00 |
| Enemies, props, items, Carrier objects, UI, terrain | $4.00 |
| Reserve, kept by the orchestrator, for fixes | about $13 |

## Engine milestones
1. **Core:** movement feel, rooms, camera, input (keys, touch, pad), physics with shapes, debug hook, tools.
2. **Art and sound in.**
3. **All content:** the zones are built by helpers, two or three zones each, from the shared bible (`game/data/text.js`, `game/data/zones.js`).
4. **The whole game:** screens, save, map, Carrier, settings, bug report, installing as an app.
5. **Polish.**
