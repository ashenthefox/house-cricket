// [polish] Render-only look overlay per room id (the sim never reads it; collision is untouched).
// Merged by render.js roomLook(): paint regions here come before the room's own; decor is appended;
// bg / near / hazard / burners replace. Fields: see design/ENGINE_NOTES.md "Rendering" and
// src/objpaint.js (object painters: { obj: 'appliance' | 'porcelain' | 'wood' | 'fabric' |
// 'cardboard' | 'terracotta' | 'metal' | 'brick' | 'paper' | 'glass' | 'stone', x, y, w, h, color, ... }).
import a from './look-a.js';   // zones 0-3 (tank, bedroom, bathroom, kitchen)
import b from './look-b.js';   // zones 4-6 (pantry, laundry, living room)
import c from './look-c.js';   // zones 7-9 + the Dragon's Lair (study, sunroom, basement)
import d from './look-d.js';   // hall, stairwell, chimney, attic

export const LOOK = { ...a, ...b, ...c, ...d };
