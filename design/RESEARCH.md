# Cricket and sound-alike research (for the chirps and the jokes)

The research was done on 2026-11-15. Sources: Orthoptera Species File / SINA species pages (orthsoc.org/sina), fssbirding.org.uk sonograms, UF/IFAS EDIS IN221, Hedwig "Pulses, patterns and paths" (ioa.org.uk), Frontiers in Ecology & Evolution 2018 (10.3389/fevo.2018.00197), Wikipedia, tpwd.texas.gov, canr.msu.edu, mdc.mo.gov, JCU Wildlife Research 2020.

## How crickets sing
- **Only males sing.** They rub a scraper on one forewing along a toothed file on the other. Each wing closing makes one pulse (also called a syllable).
- **Crickets hear through ears on their front legs** (the tympana).
- **Three songs:**
  - **calling:** loud and regular; this is our beacon;
  - **courtship:** soft rustle with high ticks;
  - **rivalry:** loud, fast and harsh, when two males meet.

## Species used in the game

| Species | Carrier | Pattern | Look |
|---|---|---|---|
| House cricket *Acheta domesticus* (hero, Chip) | 4.6–5.0 kHz | 2–3 pulses/chirp, pulse ~15–20 ms, period ~40–50 ms, 40–200 chirps/min (warmer = faster) | 16–21 mm, straw-tan, dark bands on head, full wings |
| Banded cricket *Gryllodes sigillatus* (Stripe) | ~6 kHz (one recording) | 2–3 pulses, faster chirps | 13–18 mm, flat, mottled bands, short wings |
| Two-spotted cricket *Gryllus bimaculatus* (Duo) | 4.5–4.8 kHz | 3–5 pulses, 3–4 chirps/s | 25–35 mm, glossy black, two yellow spots |
| Snowy tree cricket *Oecanthus fultoni* (Frost) | ~3 kHz | steady mellow "treet-treet", ~70 pulses/s at 25°C; the Dolbear's-law cricket | slender, pale green-white |
| True katydid (Katy) | 2.5–4 kHz | loud rasping 2–4 pulse "ka-ty-did" | leaf-green, leaf wings |
| Mole cricket (Digby) | ~2.5 kHz | low pure droning trill, burrow amplifies | velvety brown, shovel forelegs |
| Ground cricket *Allonemobius* (Mote) | 7–8 kHz | faint high trill | tiny, dark brown |
| Bell cricket *Meloimorpha japonica* (Rin) | high, bell-like (from general knowledge; not in the sources) | ringing "ri-i-in" | black, wide paddle wings |
| Camel cricket (Hump) | — | **wingless and silent** | humpbacked, very long legs and antennae |

## Dolbear's law
- °F = 50 + (N − 40)/4, where N is chirps per minute.
- Shortcut: count the chirps in 15 seconds and add 40.
- It's reliable only for the snowy tree cricket. Use it with Frost only.

## Sound-alikes (the "not a cricket" cast)
- **Smoke alarm, low battery:** one high chirp every 30–60 s. It's the thing most often mistaken for a cricket.
- **Bats:** audible squeaks and chittering in attics at dusk. Bats aren't blind.
- **Chimney swift:** loud rattling chitter from nestlings in chimneys. People usually take it for bats. Old folk names are "chimney swallow", "chimney sweep" and "chimney bat". "Chimney sparrow" isn't documented; the game uses the confusion as a joke.
- **Spring peeper (a tree frog):** a clear rising "peep" about once a second. It's often mistaken for crickets.
- **Common house gecko** *Hemidactylus frenatus*: a run of 6–9 "chik-chak" chirps at dusk. A gecko that chirps.
- **Tokay gecko:** a loud "to-KAY". Leopard geckos are mostly quiet. Crested geckos chirp and bark.

## Synthesis recipe (house cricket)
- **Pulse:** a sine at 4.6–5.0 kHz, plus a 2nd harmonic at −20 dB. 15–20 ms long, with a 2–3 ms attack and a 3–5 ms decay.
- **Chirp:** 2–3 pulses at a 40–50 ms period, the last one softer.
- **Spacing:** 0.3–1.5 s between chirps.
- **Each individual:** ±1–2% pitch.
- **Distance:** gain falls off with distance, and a low-pass filter makes far sounds feel far.
