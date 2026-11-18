// Every zone the game loads. Zone builders: add your zone module here.
// [final-S] The test zones (99 the Sandbox, 98 the engine test rooms) are not part of the release
// build: they load only for the tools (node, no `location`) or with `?dev` in the URL.
const DEV = typeof location === 'undefined' || /[?&]dev\b/.test(location.search || '');
const [zone99, zone98] = DEV ? await Promise.all([import('./zone-99.js'), import('./zone-98.js')]).then((ms) => ms.map((m) => m.default)) : [null, null];

import zone07 from './zone-07.js'; // builder C
import zone08 from './zone-08.js'; // builder C
import zone09 from './zone-09.js'; // builder C
import lair from './lair.js';      // builder C (the Dragon's Lair)

import zone00 from './zone-00.js'; // builder A (the tank escape)
import zone01 from './zone-01.js'; // builder A
import zone02 from './zone-02.js'; // builder A
import zone03 from './zone-03.js'; // builder A

export const ZONES = DEV ? [zone99, zone98] : [];
ZONES.push(zone07, zone08, zone09, lair); // builder C
ZONES.push(zone00, zone01, zone02, zone03); // builder A

import { hall, stairwell, chimney } from './links.js'; // builder D (the linking spaces)
ZONES.push(hall, stairwell, chimney); // builder D

import zone04 from './zone-04.js'; // builder B
import zone05 from './zone-05.js'; // builder B
import zone06 from './zone-06.js'; // builder B
ZONES.push(zone04, zone05, zone06); // builder B
import zone10 from './zone-10.js'; // builder D (the Attic)
ZONES.push(zone10); // builder D
