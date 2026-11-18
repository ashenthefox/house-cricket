# House Cricket — assets and spending

## Prices used for estimates

Looked up 2026-11-15 at developers.openai.com/api/docs/pricing.

- **imagegen2 (gpt-image-2.6-flare/sunburst):**
  - $30 per 1M image output tokens
  - $8 per 1M image input tokens (reference images)
  - $5 per 1M text input tokens
  - OpenAI doesn't list a per-image price. Low quality at 1024² is about 824 output tokens (about $0.025). Estimate each image from the `usage` it reports.
- **nanogen** (from its skill): flash-3.1 is $0.034 at 1K and $0.050 at 2K; pro is $0.134.
- **audiogen** (from its skill): music about $0.30 a minute; a sound effect about $0.12.

## Budget

$20 in all, of which up to $5 goes on mockups for the shared design. Running total: **$27.36** ($3.93 mockups + $10.89 audio + $2.10 scenes + $1.87 objects + $2.00 geckos + $0.30 fixes + $2.25 crickets B + $3.97 crickets A) (mockups only; the mockup allowance was raised to $10 in request 2)

| ID | File | Tool | Prompt (short) | Tries | Est. cost |
|---|---|---|---|---|---|
| mock-pip (style anchor) | design/mockups/pip.png | imagegen2 medium 1536×1024, transparent | strict-profile house cricket, no antennae/cerci | 2 (take 2 kept: bigger hind legs) | $0.07 (1132 output tokens each) |
| mock-duchess | design/mockups/duchess.png | imagegen2 medium 2048×1152, transparent, Pip as style ref | leopard gecko, tail straight out, scary-friendly | 1 | $0.05 |
| mock-bedroom (scene anchor) | design/mockups/bedroom.jpg | nanogen gemini-3.1-flash-image 2K (2752×1536) | bedroom from floor level, tank glow | 1 | $0.05 |
| mock-carrier (stage 3) | design/mockups/carrier.jpg | nanogen 3.1 flash 2K, bedroom + Pip refs | cricket keeper turned cricket town | 1 | $0.05 |
| mock-story-tongs (opening panel 3) | design/mockups/story-tongs.jpg | nanogen 3.1 flash 2K, Pip + Duchess + bedroom refs | tongs lower toward the cup | 1 | $0.05 |
| mock-title | design/mockups/title.jpg | nanogen 3.1 flash 2K, Pip + Duchess + bedroom refs | Duchess looms over Pip | 1 | $0.05 |
| mock-bigtok | design/mockups/bigtok.png | imagegen2 medium 1024×1536, transparent, Pip + Duchess style refs | tokay rearing on a wall, bellowing | 1 | $0.05 |
| mock-soot | design/mockups/soot.png | imagegen2 medium 1024², transparent, Pip style ref | chimney swift clinging, exasperated | 1 | $0.05 |
| mock-katy | design/mockups/katy.png | imagegen2 medium 1536×1024, transparent, Pip style ref | katydid, leaf wings, no antennae | 1 | $0.04 |
| mock-cricket-pip | design/mockups/crickets/pip.png | imagegen2 2.6-flare medium 1536×1024, transparent, Pip style ref | Pip anchor edited to add antennae + cerci | 1 | $0.05 |
| mock-cricket-katy | design/mockups/crickets/katy.png | imagegen2 2.6-flare medium 1536×1024, transparent, Pip style ref | Katy edited to add long antennae | 1 | $0.05 |
| mock-cricket-stripe | design/mockups/crickets/stripe.png | imagegen2 2.6-flare medium 1536×1024, transparent, Pip style ref | banded cricket, sprinter | 1 | $0.05 |
| mock-cricket-duo | design/mockups/crickets/duo.png | imagegen2 2.6-flare medium 1536×1024, transparent, Pip style ref | two-spotted, glossy black, yellow spots | 1 | $0.05 |
| mock-cricket-frost | design/mockups/crickets/frost.png | imagegen2 2.6-flare medium 1536×1024, transparent, Pip style ref | snowy tree cricket, pale, calm | 1 | $0.05 |
| mock-cricket-hump | design/mockups/crickets/hump.png | imagegen2 2.6-flare medium 1536×1024, transparent, Pip style ref | camel cricket, wingless, toothpick drumstick | 1 | $0.05 |
| mock-cricket-jam | design/mockups/crickets/jam.png | imagegen2 2.6-flare medium 1536×1024, transparent, Pip style ref | Jamaican field cricket, waving | 1 | $0.05 |
| mock-cricket-rin | design/mockups/crickets/rin.png | imagegen2 2.6-flare medium 1536×1024, transparent, Pip style ref | bell cricket, glassy wings (take 2: black head) | 2 | $0.10 |
| mock-cricket-digby | design/mockups/crickets/digby.png | imagegen2 2.6-flare medium 1536×1024, transparent, Pip style ref | mole cricket, shovel legs, short antennae | 1 | $0.05 |
| mock-cricket-mote | design/mockups/crickets/mote.png | imagegen2 2.6-flare medium 1536×1024, transparent, Pip style ref | ground cricket, tiny and fuzzy | 1 | $0.05 |
| mock-cricket-chip | design/mockups/crickets/chip.png | imagegen2 2.6-flare medium 1536×1024, transparent, Pip style ref | house cricket with a chipped wing | 1 | $0.05 |
| mock-cast ×20 | design/mockups/cast/ | imagegen2 2.6-flare medium, transparent; geckos at 1536×1024 (Nana at 1024×1536) with Pip + Duchess refs; others at 1024² with the Pip ref | 8 geckos, Sir Bartholomew, Peeper, Velvet, Beep, 8 recruits | 22 (Weft and Dot retried: anatomy, no red cross) | $1.33 |
| mock-enemies ×20 | design/mockups/enemies/ | imagegen2 2.6-flare medium 1024² (beetle 1536×1024), Pip style ref | 18 bonkable critters, darkling beetle, robot vacuum | 22 (cockroach and centipede retried for anatomy) | $1.20 |
| mock-dragons-lair | design/mockups/dragons-lair.jpg | nanogen 3.1 flash 2K, Barty + Pip + bedroom refs | the bearded dragon's hoard | 2 (the second edit removed real brand logos from bottle caps) | $0.10 |
| mock-cast fixes | design/mockups/cast/{shelly,lashes,kite,rolo}.png | imagegen2 2.6-flare medium (Shelly and Lashes as edits of their own picture) | person's notes: Shelly's extra head eyes, Rolo's anatomy and apron, Kite's anatomy, Lashes' fifth leg | 4 | $0.22 |

**Measured:** imagegen2 2.6-flare medium is about $0.035 per 1536×1024 image (1132 output tokens), well under the $0.08 estimate. nanogen 3.1 flash 2K comes back at 2752×1536.

## Build assets (request 9, $50 budget)

### Audio (audio helper, 2026-11-16): $10.89
- **15 music tracks** in `game/assets/audio/music/` ($5.73), one try each:
  - zones are about 77–80 s, not 90 s, to stay within the share;
  - silence trimmed and levelled; less than 1% of each track's energy is above 2.5 kHz.
- **40 sound effects** in `game/assets/audio/sfx/` ($5.16, 43 tries).
- **Loop gains to apply in code:** vacuum +12 dB, dryer-hum +25 dB, rain-roof +18 dB, furnace +16 dB.
- **Boosted +24 dB, may be a little noisy:** land, wall-cling, raft-splash, gecko-snore.
- Full list: `.gamegen/candidates/audio/LIST.tsv`.

### Scenes (scenes helper): $2.10
- **Paintings:** 21 far paintings (2 per zone, plus the tank and the chimney), 4 Carrier shells, 8 story panels, the title and the lair, in `game/assets/bg/`, `story/`, `title.webp` and `lair.webp`.
- **Notes for the build:**
  - bedroom far-a has a light floor band in its bottom third, so pair it with a code floor;
  - flip alternate chimney tiles vertically to hide the seam;
  - the Carrier box frame shifts slightly between shells, so set object slots per stage.

### Objects (objects helper): $1.87
- **Enemies:** 20 enemies × 2 frames, plus flipped frames for the 18 critters.
- **Pickups and props:** 14 items, 54 props.
- **Carrier and UI:** 23 Carrier objects, 6 terrain swatches, 5 UI blots, a panel and the app-icon source.
- All on 2.5-flare medium, except the icon. The cost log is `.gamegen/candidates/objects/costs.log`.

### Geckos and talking characters (gecko helper): $2.00
- **Geckos:** 10 geckos, each with idle, strike and sleep frames plus a tail and leg rig (`meta.json`, from `tools/split-gecko.py`).
- **Sir Bartholomew:** 4 parts.
- **Talking characters:** 12, each with a talk frame.

### Orchestrator fixes: $0.30
- **Kite's glide pose:** two open eyes, no wink. Geckos without eyelids can't wink; it took 2 tries.
- **Sir Bartholomew:** round pupils on all 4 of his pictures, since bearded dragons have round pupils. The mockups were updated to match.

### Crickets B (jam, rin, digby, mote, chip): $2.25
- **Per cricket:** base, portrait, 4-frame idle (5 fps) and 4-frame run (10 fps) loops from anim8gen, 10 poses (Digby also has dig), and anchors.json.
- **Shrunk poses:** some poses carry `"fit": k` in anchors.json; draw them at 1/k.

### Crickets A (pip, stripe, katy, duo, frost, hump): $3.97
- **Per cricket:** base, portrait, idle and run loops, 10 poses and anchors.
- **Pip:** also has jump, kick, chirp, hide and peek loops.
- **Pose scales:** these are in `poses/fit.json`. The orchestrator wrote one for crickets B as well, from their anchors.

### Final-review fixes: about $0.05
- `bg/z01-bedroom/far-c.webp` (the Rug room's own painting, plus a phone copy). Made with imagegen2, using the bedroom painting as the style reference.

### Polish pass [polish-V]: $0
- `sprites/geckos/bigtok/portrait.png`, `sprites/geckos/nana/portrait.png`: face portraits for the Ready? card and dialogs, cropped from each rig's `idle.png` (soft fade at the bottom edge). No generation.
