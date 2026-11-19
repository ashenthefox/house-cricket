// [polish] look overlay: zones 0-3 (tank, bedroom, bathroom, kitchen). Tile units, like the room grids.
const pillow = (x, y, w, h, color, pattern = 'plain') => ({ obj: 'fabric', x, y, w, h, color, pattern });
export default {
  // ---- zone 0: the Tank ----
  'tank-cup': {
    paint: [
      { obj: 'stone', x: 2, y: 10, w: 20, h: 4, color: '#A89A86' },               // Duchess's basking rock, up to the glass (its foot is sand)
      { obj: 'metal', x: 2, y: 0, w: 30, h: 1, color: '#6F7782', axis: 'h', bands: 0 }, // the tank's top rim
    ],
  },
  'tank-sand': {
    paint: [
      { obj: 'metal', x: 0, y: 0, w: 64, h: 1, color: '#6F7782', axis: 'h', bands: 0 }, // the tank's top rim
    ],
  },
  'tank-decor': {
    paint: [
      { obj: 'wood', x: 6, y: 32, w: 8, h: 2, color: '#7A5A40', grain: 'h' },     // the hide log (bark)
      { obj: 'porcelain', x: 16, y: 30, w: 8, h: 4, color: '#8FB8B0' },           // the water dish
      { obj: 'wood', x: 18, y: 22, w: 6, h: 1, color: '#8A6A4C' },                // cork-bark ledge under the pebble
      { obj: 'wood', x: 24, y: 18, w: 6, h: 1, color: '#7E5E44' },                // cork-bark ledge (the pebble's edge)
    ],
  },
  'tank-lid': {
    paint: [
      { obj: 'wood', x: 16, y: 8, w: 8, h: 1, color: '#7E5E44' },                 // the top of the cork decor (under the gap)
    ],
  },
  // ---- zone 1: the Bedroom ----
  'bed-underbed': {
    paint: [
      { obj: 'wood', x: 1, y: 5, w: 62, h: 1, color: '#8A6444', grain: 'h' },     // the bed slats
      { obj: 'wood', x: 10, y: 6, w: 2, h: 1, color: '#7A5638' }, { obj: 'wood', x: 30, y: 6, w: 2, h: 1, color: '#7A5638' }, { obj: 'wood', x: 50, y: 6, w: 2, h: 1, color: '#7A5638' },
      { obj: 'paper', x: 20, y: 14, w: 5, h: 2, books: 'stack', spines: ['#C8564B', '#3B6A8A'] },  // a fallen picture book
      { obj: 'wood', x: 40, y: 14, w: 2, h: 2, color: '#C8564B' },                 // the block letter
    ],
  },
  'bed-rug': {
    bg: { v: 'c', x: 0.35, y: 0.75 },   // [final-G] its own painting (the rug, the shoe rack, the toy chest)
    racks: [{ x: 10, y: 0, w: 12, h: 16 }], // [final-G] the plank ladder is the shoe rack's slats, between two uprights
    decor: [{ prop: 'sock', x: 18.5, y: 9.1, h: 0.9, layer: 'mid' }, { prop: 'sock', x: 12.5, y: 3.1, h: 0.8, layer: 'mid', flip: true }],
    paint: [
      { obj: 'wood', x: 30, y: 14, w: 3, h: 2, color: '#D9A441' },                 // toy blocks
      { obj: 'wood', x: 33, y: 12, w: 3, h: 4, color: '#5C8FB8' },
      { obj: 'wood', x: 36, y: 14, w: 3, h: 2, color: '#C8564B' },
    ],
  },
  'bed-desk': {
    paint: [
      { obj: 'wood', x: 10, y: 16, w: 16, h: 2, color: '#9A6A44', grain: 'h' },    // the desk top
      { obj: 'wood', x: 14, y: 18, w: 12, h: 30, color: '#8C5E3C', drawers: 5 },   // the desk body
      { obj: 'wood', x: 0, y: 14, w: 2, h: 1, color: '#9A6A44' },
      { obj: 'porcelain', x: 3, y: 32, w: 3, h: 4, color: '#7FA6C4' },             // the pencil cup
      { obj: 'paper', x: 3, y: 36, w: 8, h: 1, books: 'stack', spines: ['#C8564B', '#E2B65A', '#4F7F86'] }, // a picture book lying flat
      ...[46, 42, 38, 34, 30, 26, 22].map((y, i) => ({ obj: 'paper', x: 11, y, w: 3, h: 1, books: 'stack', spines: [['#5A3F5E', '#3F5A6B', '#6E7A3F', '#A8823C'][i % 4]] })),
    ],
  },
  'bed-closet': {
    paint: [
      // shoe boxes stacked up to the bed side
      ...[[32, 32, 37], [30, 28, 31], [28, 24, 27], [26, 20, 23], [24, 16, 19], [22, 12, 15], [20, 8, 11], [18, 4, 7], [16, 0, 3]]
        .map(([r, a, b], i) => ({ obj: 'cardboard', x: a, y: r, w: b - a + 1, h: 34 - r, color: ['#C49A66', '#B4855A', '#CDA977', '#A8774E'][i % 4], marks: i % 3 === 0, label: i % 3 === 1, tape: false })),
      { obj: 'wood', x: 4, y: 11, w: 4, h: 1, color: '#E6DCCB' },                  // Hump's ledge (painted, slick)
      { obj: 'wood', x: 70, y: 2, w: 9, h: 1, color: '#E6DCCB' },                  // the top shelf
      { obj: 'wood', x: 82, y: 14, w: 14, h: 1, color: '#B08A62' },                // the shelf to the desk
    ],
  },
  'bed-bedtop': {
    paint: [
      { obj: 'stone', x: 56, y: 0, w: 8, h: 8, color: '#9FA9C9' },                 // the painted wall round the window
      { obj: 'wood', x: 46, y: 8, w: 9, h: 1, color: '#EDE3D2' },                  // the window sill
      pillow(36, 24, 6, 2, '#E9D2C8', 'stripe'), pillow(42, 22, 4, 4, '#C9D6EC', 'dots'), pillow(46, 20, 4, 6, '#E6C9A8'),
      pillow(50, 18, 4, 8, '#D7B4C8', 'stripe'), { obj: 'wood', x: 54, y: 16, w: 10, h: 10, color: '#8A6444', doors: 2 },  // the headboard
      { obj: 'fabric', x: 14, y: 22, w: 6, h: 4, color: '#C8564B', pattern: 'plaid', accent: '#F2C46D' }, // a folded quilt
      { obj: 'fabric', x: 1, y: 26, w: 62, h: 10, color: '#8DA2D0', pattern: 'quilt', accent: '#F4EBDD' }, // the bedspread
    ],
  },
  'bed-dresser': {
    paint: [{ obj: 'wood', x: 38, y: 16, w: 20, h: 16, color: '#9A6A44', drawers: 4 }],
  },
  // ---- zone 2: the Bathroom ----
  'bath-steam': {
    paint: [
      { obj: 'metal', x: 2, y: 24, w: 21, h: 1, color: '#B9C2C8', axis: 'h', bands: 40 }, // the radiator top and valve
      { obj: 'wood', x: 22, y: 14, w: 8, h: 1, color: '#B89270' },                // the ledge to the mirror shelf
    ],
  },
  'bath-toilet': {
    paint: [
      { obj: 'porcelain', x: 26, y: 14, w: 16, h: 12, color: '#E2E6E8' },         // the cistern
      { obj: 'porcelain', x: 26, y: 26, w: 12, h: 8, color: '#DCE2E4' },          // the bowl
      { obj: 'wood', x: 44, y: 14, w: 18, h: 1, color: '#B89270' },               // the vanity-side shelf
      { obj: 'porcelain', x: 2, y: 1, w: 16, h: 21, color: '#7FB3AE', seams: 2 }, // the tiled wall
      { obj: 'porcelain', x: 18, y: 1, w: 3, h: 31, color: '#86B9B3', seams: 2 }, // tile pillar (left of the shaft)
      { obj: 'porcelain', x: 24, y: 1, w: 2, h: 9, color: '#86B9B3' },            // tile pillar (right, top)
      { obj: 'porcelain', x: 24, y: 14, w: 2, h: 20, color: '#86B9B3' },          // tile pillar (right, bottom)
    ],
  },
  'bath-cabinet': {
    paint: [
      { obj: 'wood', x: 6, y: 7, w: 10, h: 5, color: '#A9C4C4', doors: 2 },       // the mirror (medicine) cabinet
      { obj: 'stone', x: 0, y: 1, w: 2, h: 9, color: '#9CC7C2' },                 // slick paint by the radiator
      { obj: 'porcelain', x: 18, y: 15, w: 3, h: 3, color: '#86B9B3' },           // the tile pillar coming up from the toilet
      // the two shelves under the mirror (row 15) are real glass: left as glass
    ],
  },
  'bath-sink': {
    paint: [
      { obj: 'porcelain', x: 5, y: 16, w: 19, h: 2, color: '#E2E6E8' },          // the countertop
      { obj: 'wood', x: 5, y: 18, w: 15, h: 32, color: '#9C7A5C', doors: 2 },            // the vanity
      { obj: 'porcelain', x: 22, y: 34, w: 8, h: 2, color: '#E0E6E6' },          // the tub-side ledge (the tub's rim)
      { obj: 'porcelain', x: 30, y: 0, w: 2, h: 8, color: '#86B9B3' },            // slick tiles by the tub
      { obj: 'porcelain', x: 30, y: 12, w: 2, h: 18, color: '#86B9B3' },
    ],
  },
  'bath-shelf': {
    paint: [
      { obj: 'fabric', x: 10, y: 10, w: 6, h: 2, color: '#E6B9A6', pattern: 'stripe', accent: '#F4EBDD' }, // folded towels
      { obj: 'wood', x: 0, y: 12, w: 24, h: 1, color: '#B89270' },                // the towel shelf
      { obj: 'fabric', x: 24, y: 14, w: 3, h: 2, color: '#8FB8C8' },              // a fallen towel
      { obj: 'porcelain', x: 40, y: 13, w: 20, h: 3, color: '#E2E6E8' },          // the tub's far rim
    ],
  },
  'bath-lair': { // Chikchak's arena
    paint: [
      { obj: 'porcelain', x: 57, y: 9, w: 3, h: 1, color: '#D8B4B0' },           // the soap dish (Katy)
      { obj: 'porcelain', x: 4, y: 6, w: 8, h: 1, color: '#DCE4E4' },            // the mirror ledge (Chikchak's perch)
      { obj: 'porcelain', x: 2, y: 1, w: 2, h: 11, color: '#86B9B3' },           // slick tiles (left)
      { obj: 'porcelain', x: 60, y: 1, w: 2, h: 11, color: '#86B9B3' },          // slick tiles (right)
      { obj: 'metal', x: 38, y: 6, w: 4, h: 1, color: '#B9C2C8', axis: 'h' },    // the riser's top shelf (faucet 3)
      { obj: 'porcelain', x: 42, y: 6, w: 2, h: 8, color: '#7FB3AE', seams: 1 }, // the shower riser's tiled pillars
      { obj: 'porcelain', x: 47, y: 6, w: 3, h: 10, color: '#7FB3AE', seams: 1 },
    ],
  },
  'bath-tub': {
    paint: [
      { kind: 'cereal', x: 46, y: 15, w: 4, h: 1 },                              // keep the hair-and-soap plug as it was
      { obj: 'wood', x: 28, y: 11, w: 4, h: 1, color: '#B89270' },               // the soap ledge
      { obj: 'porcelain', x: 62, y: 0, w: 2, h: 13, color: '#86B9B3' },          // tiled wall at the tub's end
      { obj: 'porcelain', x: 8, y: 13, w: 56, h: 5, color: '#E2E6E8' },          // the tub (rims, ridge, dry end, bottom)
    ],
  },
  // ---- zone 3: the Kitchen ----
  'kit-fridge': {
    paint: [
      { obj: 'metal', x: 38, y: 1, w: 6, h: 1, color: '#B07A52', axis: 'h' },   // the thermostat cubby on top
      { obj: 'appliance', x: 20, y: 2, w: 28, h: 48, color: '#BFD6CC', handle: 'left', panel: false }, // the fridge
      { obj: 'wood', x: 51, y: 1, w: 13, h: 31, color: '#A86E44', doors: 2 },    // the wall cabinet
      { obj: 'wood', x: 51, y: 32, w: 3, h: 18, color: '#A86E44', grain: 'v' },  // the cabinet's side down to the floor
      { obj: 'wood', x: 0, y: 16, w: 6, h: 1, color: '#C9A06A' },                // the counter's end
      { obj: 'wood', x: 0, y: 34, w: 12, h: 1, color: '#C9A06A' },               // the stove-side counter edge
      { obj: 'metal', x: 4, y: 50, w: 12, h: 2, color: '#9AA3AA', axis: 'h' },   // the drip tray
    ],
  },
  'kit-stove': {
    paint: [
      { obj: 'appliance', x: 14, y: 6, w: 34, h: 16, color: '#E2D4AE', door: 'oven', dials: 4 }, // the oven
      { obj: 'wood', x: 2, y: 14, w: 12, h: 16, color: '#A86E44', doors: 2 },    // the cabinet base
      { obj: 'wood', x: 56, y: 16, w: 8, h: 1, color: '#C9A06A' },               // the counter from the fridge
    ],
  },
  'kit-counter': {
    hazard: 'burner',                                                             // the three '^' are hot rings
    paint: [
      { obj: 'appliance', x: 14, y: 16, w: 34, h: 2, color: '#E2D4AE', panel: false }, // the stovetop (top of the oven)
      { obj: 'wood', x: 0, y: 16, w: 14, h: 2, color: '#C9A06A', grain: 'h' },   // the countertop
      { obj: 'wood', x: 52, y: 16, w: 12, h: 2, color: '#C9A06A', grain: 'h' },
      { obj: 'metal', x: 54, y: 14, w: 5, h: 2, color: '#C27A45', axis: 'h' },   // the bread bin (copper)
      { obj: 'wood', x: 4, y: 8, w: 20, h: 3, color: '#8EA67A', doors: 4 },      // the glass-fronted cabinets
      { obj: 'appliance', x: 52, y: 9, w: 10, h: 2, color: '#C9C5BE', panel: false, vents: true }, // the range hood
    ],
  },
  'kit-sink': { // Big Tok's arena
    paint: [
      { obj: 'metal', x: 24, y: 34, w: 14, h: 2, color: '#A3ACB3', axis: 'h' },  // the steel sink basin
      { obj: 'wood', x: 0, y: 30, w: 24, h: 1, color: '#C9A06A', grain: 'h' },   // the countertop (left)
      { obj: 'wood', x: 38, y: 30, w: 26, h: 1, color: '#C9A06A', grain: 'h' },  // the countertop (right)
      { obj: 'wood', x: 0, y: 31, w: 24, h: 5, color: '#8EA67A', doors: 3 },     // the cabinets under it
      { obj: 'wood', x: 38, y: 31, w: 26, h: 5, color: '#8EA67A', doors: 3 },
      { obj: 'wood', x: 0, y: 8, w: 6, h: 1, color: '#E0CFAE' },                 // the window sill
      ...[10, 18, 26].map((y) => ({ obj: 'wood', x: 2, y, w: 8, h: 1, color: '#B5774A' })), // the spice rack shelves
      { obj: 'wood', x: 54, y: 16, w: 10, h: 1, color: '#C9A06A' },              // the counter ledge
    ],
  },
  'kit-undersink': {
    paint: [
      { obj: 'metal', x: 18, y: 1, w: 3, h: 9, color: '#9AA3AA', axis: 'v' },    // the drain pipe
      { obj: 'metal', x: 18, y: 9, w: 10, h: 2, color: '#9AA3AA', axis: 'h' },   // the U-bend
      { obj: 'metal', x: 36, y: 1, w: 2, h: 6, color: '#B07A52', axis: 'v' },    // the copper supply pipe
      { obj: 'metal', x: 9, y: 14, w: 1, h: 2, color: '#9AA3AA', axis: 'v' },    // the pipe foot
    ],
  },
  'kit-window': {
    paint: [
      { obj: 'wood', x: 30, y: 10, w: 54, h: 1, color: '#E0CFAE' },              // the window sill
      { obj: 'wood', x: 2, y: 10, w: 12, h: 1, color: '#E0CFAE' },               // the far end of the sill
      { obj: 'wood', x: 84, y: 8, w: 10, h: 1, color: '#C9A06A' },               // the ledge from the sink
      { obj: 'wood', x: 53, y: 3, w: 4, h: 1, color: '#D0614A' },                // the curtain pelmet above the rod
    ],
  },
  'kit-table': {
    paint: [
      { obj: 'wood', x: 4, y: 16, w: 42, h: 1, color: '#A86E44', grain: 'h' },   // the table top
      { obj: 'appliance', x: 80, y: 18, w: 10, h: 15, color: '#D4D0C6', door: 'front', dials: 2 }, // the dishwasher
      { obj: 'stone', x: 94, y: 0, w: 2, h: 30, color: '#E2C98A' },              // the painted wall (slick)
    ],
  },
  'kit-pantrydoor': {
    paint: [
      { obj: 'wood', x: 48, y: 21, w: 12, h: 1, color: '#8C5E3C' },              // the boot shelf
    ],
  },
  // ---- zone 5: the Laundry (see look-b) ----
};
