# House Cricket

*Bought as gecko food. Escaped. Coming back for everyone.*

You're Pip, a house cricket from a pet-store cup. You were meant to be Duchess the leopard gecko's dinner, but you got away. Your cupmates weren't so lucky. Ten of them are trapped in ten rooms of a big watercolor house, and each one is guarded by a gecko who is polite, toothy and very sorry you look delicious.

Follow each cricket's real chirp through one connected house. Find the household odds and ends that open new paths, and outwit every gecko without hurting a single one. Watch the Cricket Carrier grow from a bare plastic box into a little cricket town that sings.

**[▶ Play House Cricket](https://housecricket.synapticnoise.com/)** in your browser. No install. It works on desktop and on phones, and plays start to finish with a controller.

![Title screen: Duchess the leopard gecko looms over Pip on a moonlit floorboard](media/screenshots/title.jpg)

## The house

| | |
|---|---|
| ![The tank escape: Duchess wiggles her tail and lunges into the sand](media/screenshots/tank.jpg) **The tank.** Escape Duchess's tank and learn the one tell every gecko shares: a wiggling tail tip. | ![The bedroom at night, a shoe rack and a toy car](media/screenshots/bedroom.jpg) **Ten rooms, painted in watercolor.** Bedroom, Bathroom, Kitchen, Pantry, Laundry, Living Room, Study, Sunroom, Basement and Attic, plus a hall, the stairs and the chimney. |
| ![Big Tok the tokay gecko bellowing on the kitchen backsplash](media/screenshots/big-tok.jpg) **Ten geckos, ten kinds of fight.** Avoid, hide, distract, lure with fruit, put to sleep, bonk with a pillow, play hide-and-seek, chase, dazzle, and sing a lullaby. Nobody gets hurt. | ![Lashes the crested gecko on the pantry shelves](media/screenshots/lashes.jpg) **Real geckos with real habits.** Lashes has no eyelids, so he licks his eyeballs, and while he's licking he isn't looking. |
| ![The Cricket Carrier fully grown, with fairy lights, shops and residents](media/screenshots/carrier.jpg) **The Cricket Carrier.** Every cricket and friend you bring home adds something: a chalk running track, a bamboo bell, a crumb shop, a library, a lily-pad pond. | ![Nana the giant gecko in the attic during the chorus](media/screenshots/nana.jpg) **The finale.** Everyone you rescued sings giant Nana to sleep. |

There are 11 crickets you can swap between, each a real species with its own real song, built from measurements of real cricket chirps. There are 18 kinds of household critter, darkling beetles and a robot vacuum you have to hide from, and a crew of things that chirp but are *not* crickets: a tired smoke alarm, a chirping gecko, a tree frog, a chimney swift who is sick of being called a sparrow, and a bat. Somewhere behind the basement furnace, a bearded dragon guards a hoard.

## How to play

| Action | Keyboard | Controller | Phone |
|---|---|---|---|
| Move | ← → or A D | left stick / d-pad | the stick, left thumb |
| Jump (hold for higher; press again in the air to flutter; hold while falling to glide) | Space / Z | ✕ (A) | Jump |
| Chirp: call out, stun bugs, wake things up | C / K | △ (Y) | Chirp |
| Kick | X / J | □ (X) | Kick |
| Listen for the trapped cricket (hold) | B / L | ○ (B) | Ear |
| Use an item (swing, super-jump, glow) | V / I | R2 | Use |
| Hide (next to a crack or bottle cap) | ↑ / W | stick up | stick up |
| Swap cricket | Q / E | L1 / R1 | tap a face |
| Map · Pause · Mute | Tab · Esc · M | Create · Options | top-right icons |

- **On a phone:** hold it sideways and use the on-screen buttons. You can install the game from your browser's menu to play full screen, even offline.
- **With a controller:** plug in a PS5 controller (USB or Bluetooth) and press any button. It works best in Chrome or Edge, and Xbox and other controllers work too.
- **Following the chirp:** listen for the trapped cricket's chirp. The ear at the edge of the screen points toward it and pulses with each chirp, and the chirp gets louder as you get closer. Click or tap the ear to tuck it in beside the buttons at the top (and again to bring it back), or double-click it to switch the cricket's chirping between on its own and only when you call.
- **Losing and saving:** there's no game over. A fall costs one heart and puts you back on solid ground, and losing a gecko fight restarts only that part of the fight. Save at the cracks in the baseboards (three save slots). Every crack can take you home to the Carrier.
- **Gentle Mode:** in Settings, it halves damage and slows the geckos' warnings.

## How it was made

House Cricket was made by [Claude Code](https://claude.com/claude-code) with [gamegen](https://github.com/zeveck/gamegen), from this request:

> --plan-only --share-design The game will probably be called House Cricket. The idea is it's a cricket that was bought for feeding a gecko, but it escaped! We def need an opening to show that. But then you're playing a Metroidvania style game in which you're moving through the house with the goal of rescuing your fellow crickets. To make it more interesting, there'll be, say, 10 zones, each with a different style, probably representing different rooms of the house, and in each you have a "Boss Gecko" fight in which you have to save a different cricket. We should be sure to research real crickets and that we match their chirps properly. While in a zone you can hear the cricket chirping, and it gets louder/softer to help guide you to it. Like any Metroidvania you should need some items to get to some areas and you need to explore around and build a map. Each "Boss Gecko" fight isn't about you hurting the gecko, so much as somehow avoiding it, stunning it, distracting it, or putting it to sleep or something so you can save the cricket. You can swap your player to any saved crickets and maybe they have slightly different states. The art should all lean water-color. The Gecko should be scary but friendly. There's a "Cricket Carrier" place the crickets live as you get them, and it gets nicer as youg et more, like the castle buildont in Suikoden.  MAybe some other crickets/insects can join you. Not sure what enemies should be, but we need a range of them, maybe other insects. Also, there should be a plot/joke/puzzle around a bat, a tree frog, a chimney sparrow, and and other things that make cricket-like-noises but aren't crickets. --gamepad

Then, more mock pictures, one of each cricket:

> Let's do another pass on the plan artifact with --mock-budget $10 so we get a mock of each main cricket. make sure they have antennas when appropriate and reflect their real cricket species, but fun and with character, of course!

Then, a note on the gecko's name:

> LOVE the name Duchess for the Gecko!

Then, adding the Report a bug button:

> It probably doesn't affect the artifact, but I forgot to include --feedback in the planning flags.

Then, mock pictures of the whole cast, plus hiding, beetles, the eye-licking gecko and the Dragon's Lair:

> Let's generate mock art for all major/minor characters. I assume many of them have lines and such? Also, as a mechanic, crickets can fit into small spaces, so maybe some enemies are indestructable (beetles perhaps?) and you have to kinda sneak, hide while they pass, and continue. This could also be part of some boss fights. We don't want to OVERuse it, but I think the key cricket traits are probably chirp, jump, and hide. We'll have to make sure to spend time getting the animations right. One gecko should probably keep licking its eye as it talks to you or something. There should be a "dragon's lair" somewhere but it's a bearded dragon! That fight is probably about it being too big for the screeen and you skittering around and hiding. Not sure. It can have a cool item or befriend you after, or maybe you steal a ring from its horde that makes you invisible. Anyways, not saying any of these must be in verbatim, just throwing some ideas at the design so we can iterate. Let me know when the new copy of the shared plan is up.

Then, the chirp indicator and the chirp setting:

> Oh, also, we should probably either by default or have an option to have a way to visualize the area's chirp and mute it in case users don't want to keep the chirp on the whole time and/or it's hard to judge. It just be a chirp indicator or something. And/or, you could turn off "autochirp" and just have it chirp in response to you chirping since you should also definitnely be able to have a button that makes your cricket chirp.

Then, mock pictures of every enemy:

> Remember, being metroidvania style, the game does need non-boss "enemies" of some sort, I'm not sure what those are here, but I'm not sure if we mentioned them much, but I'd like mock graphics for each of them too.

Then, fixes to four of the pictures:

> A couple of notes: The graphic for Shelly has eyes on the stalks (correct) AND on the head (incorrect/odd). The graphic for Rolo is cute and I like the apron but something about how it comes together feels wrong. Kite is great but looks slightly impossible/wrong. Lashes is great but has 5 legs.

Then, building the game, with a $50 budget:

> --continue --art-sheet --budget $50 --gamepad --publish --feedback

Then, publishing it:

> --publish

Then, publishing it again at synapticnoise.com, with this section:

> --publish

gamegen planned the game and had review agents check the design over two rounds. A shared design page with mock pictures let the idea be refined before building. Then it made the art, animation, music and sound with these plugins, built the game with a team of helpers (one for the engine, sound, rendering and menus, and four for the rooms), and play-tested it:

| | |
|---|---|
| ![A watercolor bedroom seen from the floor](media/making-of/nanogen-bedroom.jpg) | **[nanogen](https://github.com/zeveck/nanogen)** painted the rooms: two backgrounds per zone, the tank, the chimney, the Carrier at its four stages, the story panels and the title art. |
| ![Duchess the leopard gecko](media/making-of/imagegen2-duchess.jpg) | **[imagegen2](https://github.com/zeveck/imagegen2)** drew the characters (11 crickets, 10 geckos, a bearded dragon and 16 friends), 20 enemies, about 100 props, items and pieces of Carrier furniture, and every pose. |
| ![Pip the cricket running](media/making-of/anim8gen-pip-run.gif) | **[anim8gen](https://github.com/zeveck/anim8gen)** animated the crickets: idle and running loops for all 11, plus Pip's jump, kick, chirp, hide and peek. |
| | **[audiogen](https://github.com/zeveck/audiogen)** made the 15 music tracks and 40 sound effects. The cricket chirps themselves are synthesized in the game, from measurements of real cricket songs. |

The design notes are in [`design/`](design/): the brief, the design, the research on real crickets, the reviews, the mock pictures and the build notes.

## Replaying the tests

Every zone, every gecko fight and the whole game from New Game to the credits have recorded solutions in `design/solutions/`, the proof the game can be finished. To replay them:

- **Without a browser:** `node tools/replay-headless.mjs` replays every zone and fight (all but the full run, which needs the browser).
- **In a browser, with real key presses:** serve the game (`cd game && python3 -m http.server 8131`), then run `node tools/replay.mjs design/solutions/full-run.json`. It needs playwright-cli.

Other checks:

- `node tools/check-world.mjs` checks every room can be reached, in every order the items can be found, and that no spot is a trap (somewhere you can get into and not get out of by playing). `node tools/escape-test.mjs` confirms a trap it names in the real sim.
- `node tools/check-cracks.mjs` checks every save point can be left on foot.
- `node tools/entity-test.mjs` and `node tools/feel-test.mjs` test the mechanics and the jump feel.
- `node tools/chirp-check.mjs` checks every cricket's song against the real species' pitch and rhythm.

## Playing locally

House Cricket is a plain web page with no build step. Serve the `game` folder with any static web server, for example:

    cd game
    python3 -m http.server 8000

then open http://localhost:8000. Opening the file directly by double-clicking won't work, because browsers don't run games from files on disk.

## Credits

- An idea by Rich Conlan.
- Fonts: [Patrick Hand](https://fonts.google.com/specimen/Patrick+Hand) and [Nunito](https://fonts.google.com/specimen/Nunito), under the SIL Open Font License (bundled in `game/fonts/` with their licenses).
- Bug reports use [gh-feedback](https://github.com/zeveck/gh-feedback).
