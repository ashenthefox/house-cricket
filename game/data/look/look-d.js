// [polish] look overlay: the Hall, the stairwell, the chimney, zone 10 (the Attic). Tile units, like the room grids.
const tread = (x, y, i) => ({ obj: 'wood', x, y, w: 2, h: 1, color: ['#9A6A44', '#8C5E3C', '#A47450'][i % 3], grain: 'h' });
const floorboards = (x, y, w, h, color = '#8E6A4E') => ({ obj: 'wood', x, y, w, h, color, grain: 'h', planks: 40 });
// the chimney shaft: sooty brick lips (cols 12-19) first, then the brick of the flue walls
const flue = (h) => [
  { obj: 'brick', x: 12, y: 0, w: 8, h, color: '#7A4A3A' },                                  // the soot-darkened lips
  { obj: 'brick', x: 0, y: 0, w: 32, h, color: '#9C4F3B' },                                  // the flue walls
];
export default {
  // ---- the Hall (the Bedroom's paintings: variant b, the curtained window, no gecko tank) ----
  'hall-top': {
    bg: { v: 'b', mirror: true, x: 0.5, y: 0.2 },
    paint: [
      { obj: 'wood', x: 30, y: 0, w: 18, h: 1, color: '#B08A62', grain: 'h' },                // the attic hatch's frame
      { obj: 'wood', x: 0, y: 14, w: 7, h: 4, color: '#E6DCCB', grain: 'v' },                 // the bedroom door frame (painted)
      { obj: 'wood', x: 10, y: 14, w: 2, h: 4, color: '#6E4B33', grain: 'v' },                // the coat-stand pole's top
      { obj: 'stone', x: 63, y: 0, w: 1, h: 18, color: '#7C98C4' },                           // the far wall (painted plaster)
    ],
  },
  'hall-floor': {
    paint: [
      { obj: 'wood', x: 0, y: 0, w: 7, h: 30, color: '#7C98C4', grain: 'v', planks: 60, knobs: [[4, 20]] }, // the bedroom door (painted blue)
      { obj: 'wood', x: 7, y: 30, w: 9, h: 2, color: '#E6DCCB', grain: 'h' },                 // the linen shelf
      { obj: 'wood', x: 0, y: 30, w: 7, h: 2, color: '#E6DCCB', grain: 'h' },                 // the door frame's foot
      { obj: 'wood', x: 10, y: 0, w: 2, h: 28, color: '#6E4B33', grain: 'v' },                // the coat-stand pole
      { obj: 'fabric', x: 0, y: 34, w: 64, h: 2, color: '#C8564B', pattern: 'stripe', accent: '#F2C46D' }, // the runner rug
    ],
  },
  // ---- the stairwell (the Study's paintings) ----
  'stair-landing': {
    paint: [
      { obj: 'wood', x: 22, y: 25, w: 1, h: 9, color: '#E6DCCB', grain: 'v' },                // the baby gate (white-painted slats)
      { obj: 'wood', x: 23, y: 24, w: 2, h: 10, color: '#7A4E32', grain: 'v' },               // the newel post
      { obj: 'wood', x: 0, y: 34, w: 28, h: 2, color: '#9A6A44', grain: 'h', planks: 40 },    // the landing floor and the top step
      { obj: 'stone', x: 63, y: 0, w: 1, h: 36, color: '#C9B48E' },                           // the far wall (painted plaster)
    ],
  },
  'stair-flight': {
    paint: [
      ...Array.from({ length: 14 }, (_, k) => tread(28 + 2 * k, 2 * k, k)),                   // flight A treads
      ...Array.from({ length: 4 }, (_, j) => tread(52 - 2 * j, 28 + 2 * j, j + 1)),           // flight B treads
      { obj: 'wood', x: 1, y: 0, w: 27, h: 1, color: '#8C5E3C', grain: 'h' },                 // the underside of the landing floor
      { obj: 'wood', x: 63, y: 0, w: 1, h: 36, color: '#B08A62', grain: 'v' },                // the banister spindles
      { obj: 'stone', x: 0, y: 0, w: 1, h: 36, color: '#C9B48E' },                            // the stairwell wall (plaster)
    ],
  },
  'stair-foot': {
    paint: [
      ...Array.from({ length: 17 }, (_, i) => tread(44 - 2 * i, 2 * i, i + 2)),               // flight B treads down to the hall
      { obj: 'stone', x: 63, y: 0, w: 1, h: 34, color: '#C9B48E' },                           // the wall by the Living Room door (plaster)
    ],
  },
  // ---- the chimney ----
  'chim-flue': {
    paint: [
      { obj: 'brick', x: 7, y: 34, w: 7, h: 1, color: '#7A4A3A' },                            // the floor of Soot's lookout niche
      ...flue(72),
    ],
  },
  'chim-top': {
    paint: [
      { obj: 'wood', x: 0, y: 32, w: 14, h: 2, color: '#8E6A4E', grain: 'h' },                // the attic joist through the gap
      { obj: 'brick', x: 0, y: 0, w: 32, h: 1, color: '#A0523D' },                            // the chimney pot's rim
      ...flue(54),
    ],
  },
  'chim-ash': {
    paint: [
      { obj: 'brick', x: 12, y: 0, w: 8, h: 1, color: '#6A4236' },                            // the hearth floor's underside
      ...flue(36),
    ],
  },
  // ---- zone 10: the Attic ----
  'att-entry': {
    paint: [
      { obj: 'wood', x: 18, y: 2, w: 27, h: 10, color: '#7A5638', grain: 'h', planks: 50 },   // the roost rafter
      { obj: 'wood', x: 1, y: 14, w: 62, h: 4, color: '#8A6444', grain: 'h' },                // the beam
      floorboards(0, 34, 64, 2),                                                              // the floorboards
    ],
  },
  'att-rafters': {
    paint: [
      { obj: 'wood', x: 87, y: 14, w: 2, h: 16, color: '#7A5638', grain: 'v' },               // post A
      { obj: 'wood', x: 82, y: 14, w: 2, h: 19, color: '#6E4B33', grain: 'v' },               // post B
      { obj: 'wood', x: 56, y: 14, w: 26, h: 1, color: '#8A6444', grain: 'h' },               // the high beam
      { obj: 'wood', x: 30, y: 18, w: 22, h: 1, color: '#94704E', grain: 'h' },               // the second beam
      floorboards(108, 32, 19, 4, '#8A6444'),                                                  // the entry joists
      floorboards(82, 33, 16, 3, '#7E5E44'),                                                   // the landing joist
      floorboards(0, 32, 11, 4),                                                              // the ledge by the insulation
    ],
  },
  'att-trunks': {
    paint: [
      { obj: 'wood', x: 96, y: 12, w: 6, h: 4, color: '#7A4E3A', grain: 'h', planks: 40, knobs: [[3, 1]] }, // a steamer trunk
      { obj: 'wood', x: 70, y: 12, w: 7, h: 4, color: '#5E6F7A', grain: 'h', planks: 40, knobs: [[3.5, 1]] }, // a painted blue trunk
      { obj: 'wood', x: 44, y: 12, w: 7, h: 4, color: '#8E5A3C', grain: 'h', planks: 40, knobs: [[3.5, 1]] }, // a leather-brown trunk
      { obj: 'wood', x: 18, y: 12, w: 6, h: 4, color: '#6E7A5A', grain: 'h', planks: 40, knobs: [[3, 1]] }, // a green trunk
      { obj: 'wood', x: 2, y: 8, w: 13, h: 1, color: '#9A6A44', grain: 'h' },                 // the high shelf
      floorboards(0, 16, 128, 2),                                                             // the floorboards
    ],
  },
  'att-insulation': {
    paint: [
      { obj: 'brick', x: 42, y: 16, w: 3, h: 20, color: '#9C4F3B' },                          // the chimney-brick wall
      { obj: 'wood', x: 87, y: 14, w: 2, h: 18, color: '#7A5638', grain: 'v' },               // post 2
      { obj: 'wood', x: 82, y: 15, w: 2, h: 21, color: '#6E4B33', grain: 'v' },               // post 1
      { obj: 'wood', x: 79, y: 14, w: 5, h: 1, color: '#8A6444', grain: 'h' },                // post 1's cap
      { obj: 'wood', x: 89, y: 14, w: 38, h: 2, color: '#8A6444', grain: 'h' },               // the upper joist
      { obj: 'wood', x: 46, y: 20, w: 27, h: 1, color: '#94704E', grain: 'h' },               // the joist the swing reaches
      { obj: 'fabric', x: 1, y: 2, w: 14, h: 28, color: '#E3A2A6', pattern: 'fluff' },        // the gable wall stuffed with pink insulation
      floorboards(84, 34, 43, 2),                                                             // the lower floor
      floorboards(0, 34, 42, 2, '#7E5E44'),                                                   // the floor by the fan
    ],
  },
  'att-boxes': {
    paint: [
      { obj: 'cardboard', x: 100, y: 27, w: 6, h: 9, color: '#D2B48A', tape: true, label: true }, // box 1 (taped all over: smooth)
      { obj: 'cardboard', x: 74, y: 28, w: 16, h: 8, color: '#B4855A', flaps: true, marks: true }, // box 2
      { obj: 'cardboard', x: 50, y: 30, w: 7, h: 6, color: '#C49A66', tape: true },           // box 3
      ...[0, 1, 2, 3, 4, 5].map((i) => ({ obj: 'cardboard', x: 46 - 4 * i, y: 28 - 2 * i, w: 4, h: 8 + 2 * i,
        color: ['#CDA977', '#A8774E', '#C49A66', '#B4855A', '#CDA977', '#A8774E'][i], tape: i % 2 === 0, label: i === 3 })), // the box steps
      { obj: 'cardboard', x: 1, y: 16, w: 25, h: 2, color: '#BE925E', tape: true, label: true }, // the top box (a hole in its lid)
      floorboards(106, 34, 21, 2),                                                            // the floor by the door in
      floorboards(0, 34, 26, 2),                                                              // the floor under the top box
    ],
  },
  'att-hatch': {
    paint: [
      { obj: 'wood', x: 36, y: 16, w: 6, h: 2, color: '#B08A62', grain: 'h', knobs: [[3, 0.5]] }, // the hatch (its latch)
      floorboards(0, 16, 64, 2),                                                              // the floorboards
    ],
  },
  'att-lair': {
    paint: [
      { obj: 'brick', x: 0, y: 0, w: 12, h: 36, color: '#A0523D' },                           // the chimney breast (Nana clings here)
      floorboards(12, 34, 84, 2),                                                             // the floorboards
    ],
  },
};
