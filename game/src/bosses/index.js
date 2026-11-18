// Boss registry. A boss module exports { create(game, entity) } returning an object with:
//   update(game)         every fixed step (after the player and enemies)
//   draw(ctx, renderer)  in room coordinates, after enemies (optional)
//   setPhase(n)          debug hook setBossPhase(n); also how "losing restarts the phase" works
//   phase                current phase number (state().bossPhase reads it)
// Register it here, then place { "type": "boss", "boss": "<name>", "x": .., "y": .. } in the lair room.
// No DOM in update(); bosses must be deterministic (use seeded() from world.js, never Math.random).
// Most fights should be built on base.js (phases, checkpoints, tells, Gentle Mode, rescue): see
// practice.js for a complete small example.
import practice from './practice.js';
import nana from './nana.js'; // builder D
import mossy from './mossy.js'; // builder C
import kite from './kite.js';   // builder C
import ember from './ember.js'; // builder C
import barty from './barty.js'; // builder C
import lashes from './lashes.js';   // builder B
import peridot from './peridot.js'; // builder B
import gargy from './gargy.js';     // builder B
import tank from './tank.js';         // builder A (the opening's set pieces)
import duchess from './duchess.js';   // builder A
import chikchak from './chikchak.js'; // builder A
import bigtok from './bigtok.js';     // builder A
export { BossBase, makeBoss, TELL } from './base.js';

export const BOSSES = {
  practice,
  nana, // builder D
  mossy, kite, ember, barty, // builder C
  lashes, peridot, gargy, // builder B
  tank, duchess, chikchak, bigtok, // builder A
  // duchess: (await import('./duchess.js')).default,   <- example shape; add real ones here
  dummy: {
    create(game, e) {
      return {
        phase: 1, t: 0, x: (e.x + 0.5) * 40, y: (e.y + 1) * 40,
        update() { this.t++; },
        setPhase(n) { this.phase = n; this.t = 0; },
        draw(c) { c.fillStyle = 'rgba(200,86,75,0.5)'; c.beginPath(); c.ellipse(this.x, this.y - 30, 60, 30, 0, 0, 7); c.fill(); },
      };
    },
  },
};
