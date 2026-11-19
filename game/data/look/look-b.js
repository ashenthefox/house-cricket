// [polish] look overlay: zones 4-6 (pantry, laundry, living room). Tile units, like the room grids.
const shelf = (x, y, w, h = 1, color = '#A8794C') => ({ obj: 'wood', x, y, w, h, color, grain: 'h' });
export default {
  // ---- zone 4: the Pantry ----
  'pan-door': {
    paint: [
      shelf(13, 20, 12, 1, '#B08452'),                                              // shelf on top of the upright
      { obj: 'wood', x: 24, y: 21, w: 1, h: 11, color: '#9A6E44', grain: 'v' },     // the shelf upright
      { obj: 'wood', x: 28, y: 17, w: 3, h: 1, color: '#E2D2B4' },                  // the door frame (painted)
      { obj: 'wood', x: 28, y: 18, w: 4, h: 12, color: '#E2D2B4', grain: 'v', doors: 1 },
    ],
  },
  'pan-high': {
    paint: [
      { obj: 'wood', x: 7, y: 15, w: 2, h: 2, color: '#9A6E44', planks: 14 },       // a crate onto the cereal boxes
      { obj: 'glass', x: 26, y: 13, w: 5, h: 4, color: '#D99A3E' },                 // jars of preserves
    ],
  },
  'pan-floor': {
    paint: [
      { obj: 'cardboard', x: 49, y: 4, w: 14, h: 6, color: '#D99A3E', label: true, flaps: true }, // the cracker box (tunnel roof)
      { obj: 'cardboard', x: 49, y: 10, w: 8, h: 1, color: '#C98A34', tape: false },              // its bottom edge
      { obj: 'fabric', x: 30, y: 9, w: 6, h: 3, color: '#C9A57A', stitch: true },   // rice sack
      { obj: 'fabric', x: 44, y: 10, w: 5, h: 2, color: '#BC9868', stitch: true },  // rice sack
      { obj: 'fabric', x: 36, y: 11, w: 1, h: 1, color: '#C9A57A', stitch: true },  // a spilled grain bag
      shelf(6, 0, 58, 4, '#8E6440'),                                                // the shelf board overhead
      shelf(15, 12, 48, 1, '#A8794C'),                                              // the low shelf over the sneak
      { obj: 'wood', x: 6, y: 12, w: 4, h: 4, color: '#B58A58', planks: 16 },       // crates: steps up on the left
      { obj: 'wood', x: 10, y: 14, w: 4, h: 2, color: '#9C7046', planks: 16 },
      { obj: 'wood', x: 4, y: 14, w: 2, h: 2, color: '#9C7046', planks: 16 },        // a step back up from the jar wall
    ],
  },
  'pan-shelves': {
    paint: [
      shelf(21, 4, 25, 1, '#A8794C'),                                               // shelf D, the high shelf
      { obj: 'wood', x: 21, y: 13, w: 1, h: 3, color: '#8E6440', grain: 'v' },      // the upright (wood below the jar glass)
      shelf(44, 11, 7, 1, '#A8794C'),                                               // the jam-jar alcove floor
      { obj: 'wood', x: 51, y: 11, w: 12, h: 4, color: '#9A6E44', drawers: 2 },     // a shelf block under the alcove
      shelf(1, 16, 21, 1, '#B08452'),                                               // shelf C, the lair shelf
      { obj: 'wood', x: 0, y: 17, w: 22, h: 9, color: '#86603E', doors: 3 },        // the cupboard under it
      shelf(25, 15, 38, 1, '#B08452'),                                              // shelf B
      { obj: 'wood', x: 25, y: 16, w: 38, h: 12, color: '#7E5A3A', doors: 4 },      // the cupboards under shelf B
      shelf(6, 28, 57, 1, '#A8794C'),                                               // shelf A
      { obj: 'wood', x: 6, y: 29, w: 57, h: 7, color: '#8E6440', drawers: 2 },      // the drawers under shelf A
    ],
  },
  'pan-jars': {
    paint: [
      shelf(0, 0, 64, 7, '#8E6440'),                                                // the deep shelf board overhead
      { obj: 'glass', x: 4, y: 29, w: 4, h: 5, color: '#C9D6C8' },                  // a jar of beans (Hump's ledge)
      { obj: 'glass', x: 14, y: 28, w: 5, h: 6, color: '#E0A43E' },                 // the honey jar
      { obj: 'glass', x: 46, y: 19, w: 6, h: 15, color: '#D9C49A' },                // the tall pasta jar
      { obj: 'glass', x: 40, y: 27, w: 6, h: 7, color: '#C9B6D0' },                 // a jar of dried beans
      { obj: 'fabric', x: 54, y: 32, w: 6, h: 2, color: '#E6DCC6', stitch: true },  // flour sacks
    ],
  },
  'pan-lair': {
    paint: [
      shelf(1, 5, 58, 1, '#A8794C'),                                                // the top shelf
      shelf(1, 11, 55, 1, '#B08452'),                                               // the middle shelf
      { obj: 'wood', x: 56, y: 12, w: 4, h: 4, color: '#9C7046', planks: 16 },      // crates up from the floor
      { obj: 'wood', x: 60, y: 14, w: 3, h: 2, color: '#B58A58', planks: 16 },
    ],
  },

  // ---- zone 5: the Laundry ----
  'laun-stairs': {
    paint: [
      { obj: 'wood', x: 1, y: 10, w: 2, h: 6, color: '#8C6A4E', grain: 'v' },       // the post beside the shaft
      { obj: 'wood', x: 13, y: 14, w: 2, h: 2, color: '#A2805E' },                  // the steps up
      { obj: 'wood', x: 15, y: 12, w: 2, h: 4, color: '#987656' },
      { obj: 'wood', x: 17, y: 10, w: 2, h: 6, color: '#A2805E' },
      { obj: 'wood', x: 19, y: 8, w: 2, h: 8, color: '#987656' },
      { obj: 'wood', x: 21, y: 7, w: 32, h: 9, color: '#8C6A4E', grain: 'h', planks: 40 }, // the stair head landing
      { obj: 'stone', x: 63, y: 0, w: 1, h: 16, color: '#B7A6D3' },                 // the painted wall by the lair door
    ],
  },
  'laun-sink': {
    paint: [
      { obj: 'porcelain', x: 12, y: 10, w: 9, h: 3 },                               // the utility sink
      { obj: 'cardboard', x: 21, y: 12, w: 3, h: 4, color: '#5E8FC4', label: true }, // a detergent box
      { obj: 'metal', x: 24, y: 14, w: 3, h: 2, color: '#9CA6B4', axis: 'v', bands: 34 }, // a bucket
      { obj: 'metal', x: 5, y: 14, w: 3, h: 2, color: '#8E9AAE', axis: 'v', bands: 34 },  // a bucket
      { obj: 'wood', x: 8, y: 12, w: 3, h: 4, color: '#A2805E', planks: 16 },       // a crate under the sill
      { obj: 'metal', x: 11, y: 14, w: 2, h: 2, color: '#8E9AAE', axis: 'v', bands: 34 }, // a pail under the sink
      { obj: 'appliance', x: 46, y: 7, w: 5, h: 6, color: '#C9C3CC', panel: false, seams: 2 }, // the water heater
      { obj: 'metal', x: 46, y: 13, w: 5, h: 3, color: '#6F7487', axis: 'v' },      // its legs
      { obj: 'wood', x: 35, y: 12, w: 4, h: 4, color: '#9A8FB0' },                  // the thermostat cubby
      { obj: 'appliance', x: 39, y: 14, w: 2, h: 2, color: '#7FA6C8', panel: false }, // a detergent jug beside it
    ],
  },
  'laun-dryer': {
    paint: [
      { obj: 'appliance', x: 30, y: 9, w: 21, h: 24, color: '#D9D3E6', dials: 3, ring: [40.5, 26, 7.6], inside: 'drum', holes: [[33, 21, 15, 10], [30, 26, 3, 5]] },
      { obj: 'cardboard', x: 22, y: 32, w: 3, h: 2, color: '#C8A06A' },
      { obj: 'cardboard', x: 25, y: 30, w: 3, h: 4, color: '#B98C5A' },
      { obj: 'wood', x: 1, y: 12, w: 13, h: 1 },
      { obj: 'wood', x: 52, y: 5, w: 6, h: 1 },
    ],
  },
  'laun-basket': {
    paint: [
      { obj: 'fabric', x: 20, y: 24, w: 4, h: 2, color: '#E8B4A8', pattern: 'stripe', accent: '#F4EBDD' }, // a towel heap
      { obj: 'fabric', x: 9, y: 26, w: 15, h: 8, color: '#A9C8E0', pattern: 'stripe', accent: '#F4EBDD' }, // towels in the basket
      { obj: 'wood', x: 8, y: 22, w: 17, h: 12, color: '#C9A46A', grain: 'v' },     // the wicker basket's sides
      { obj: 'fabric', x: 27, y: 31, w: 4, h: 3, color: '#B7A6D3', pattern: 'dots', accent: '#F4EBDD' }, // a sock pile
      { obj: 'wood', x: 1, y: 26, w: 2, h: 6, color: '#D8D0DC' },                   // the baseboard
    ],
  },
  'laun-washer': {
    paint: [
      { obj: 'wood', x: 14, y: 13, w: 5, h: 3, color: '#C9A46A', grain: 'v' },      // a laundry basket
      { obj: 'cardboard', x: 30, y: 13, w: 3, h: 3, color: '#C49A66', tape: true }, // a box
      { obj: 'fabric', x: 19, y: 15, w: 1, h: 1, color: '#B7A6D3', pattern: 'dots', accent: '#F4EBDD' }, // a sock
      { obj: 'fabric', x: 33, y: 15, w: 1, h: 1, color: '#E8B4A8', pattern: 'stripe', accent: '#F4EBDD' }, // a sock
    ],
  },
  'laun-shelf': {
    paint: [
      shelf(1, 3, 11, 1, '#A2805E'),                                                // the top shelf
      { obj: 'wood', x: 1, y: 1, w: 1, h: 15, color: '#D8D0DC', grain: 'v' },       // painted shelf uprights
      { obj: 'wood', x: 30, y: 1, w: 1, h: 12, color: '#D8D0DC', grain: 'v' },
      { obj: 'appliance', x: 6, y: 12, w: 5, h: 4, color: '#7FA6C8', panel: false }, // detergent jugs (plastic)
      shelf(26, 13, 5, 1, '#A2805E'),                                               // the cubby's shelf
    ],
  },
  'laun-lair': {
    paint: [
      { obj: 'metal', x: 1, y: 2, w: 94, h: 2, color: '#A3A9B8', axis: 'h', bands: 160, rivets: true }, // the dryer exhaust duct
      { obj: 'wood', x: 1, y: 10, w: 6, h: 6, color: '#8C6A4E', planks: 20 },       // the landing by the door
      { obj: 'wood', x: 89, y: 13, w: 6, h: 1, color: '#A2805E' },                  // Beep's wall plate
      { obj: 'wood', x: 1, y: 16, w: 94, h: 2, color: '#86684E', grain: 'h' },      // the joists
    ],
  },

  // ---- zone 6: the Living room ----
  'liv-armchair': {
    racks: [{ x: 24, y: 45, w: 3, h: 7, color: '#8A5E44' }], // [cracks] its one-way slats drawn as the rack's
    paint: [
      { obj: 'fabric', x: 1, y: 50, w: 2, h: 2, color: '#E8964A', pattern: 'knit' }, // a footstool
      { obj: 'fabric', x: 3, y: 43, w: 3, h: 9, color: '#B86A6E', pattern: 'plain' }, // the armchair's back
      { obj: 'fabric', x: 21, y: 44, w: 3, h: 8, color: '#B86A6E', pattern: 'plain' }, // its arm
      { obj: 'fabric', x: 6, y: 47, w: 15, h: 5, color: '#D48A8A', pattern: 'stripe', accent: '#F2D2B8' }, // the seat cushion
      { obj: 'wood', x: 0, y: 8, w: 7, h: 1, color: '#7A5A4A' },                    // the curtain pelmet
      shelf(40, 22, 10, 1, '#8A5E44'),                                              // a bookshelf
      { obj: 'stone', x: 0, y: 0, w: 1, h: 48, color: '#C99A9A' },                  // the papered wall by the stairs
    ],
  },
  'liv-rug': {
    paint: [
      { obj: 'wood', x: 4, y: 1, w: 1, h: 13, color: '#8A5E44', grain: 'v' },       // the side table's legs
      { obj: 'wood', x: 8, y: 1, w: 1, h: 13, color: '#8A5E44', grain: 'v' },
      { obj: 'cardboard', x: 20, y: 1, w: 5, h: 9, color: '#C49A66', tape: false }, // the cracker chute (a cardboard tube)
    ],
  },
  'liv-basket': {
    paint: [
      { obj: 'wood', x: 9, y: 14, w: 10, h: 1, color: '#C9A46A' },                  // the sewing basket's rim
      { obj: 'fabric', x: 19, y: 18, w: 2, h: 2, color: '#D48A8A', pattern: 'knit', accent: '#F2D2B8' }, // a ball of yarn
      { obj: 'cardboard', x: 20, y: 21, w: 5, h: 14, color: '#C49A66', tape: false }, // the cracker chute (a cardboard tube)
      shelf(8, 20, 13, 1, '#8A5E44'), shelf(24, 20, 7, 1, '#8A5E44'),               // the table top
      { obj: 'fabric', x: 9, y: 21, w: 11, h: 14, color: '#8C8F55', pattern: 'knit', accent: '#E8964A' }, // shelves of yarn
      { obj: 'fabric', x: 25, y: 21, w: 6, h: 14, color: '#D48A8A', pattern: 'knit', accent: '#F2D2B8' },
      { obj: 'wood', x: 4, y: 12, w: 1, h: 23, color: '#7A5240', grain: 'v' },      // the table legs
      { obj: 'wood', x: 8, y: 15, w: 1, h: 20, color: '#7A5240', grain: 'v' },
      shelf(21, 16, 10, 1, '#9A6A4C'),                                              // the shelf to the piano
      { obj: 'stone', x: 1, y: 5, w: 1, h: 11, color: '#C99A9A' },                  // the papered wall
    ],
  },
  'liv-piano': {
    paint: [
      { obj: 'paper', x: 55, y: 29, w: 2, h: 5, books: 'stack', spines: ['#6E4A5E', '#8C8F55', '#E8964A', '#D48A8A'] }, // music books
      { obj: 'paper', x: 57, y: 30, w: 2, h: 4, books: 'stack', spines: ['#8C8F55', '#D48A8A', '#6E4A5E'] },            // [cracks] shorter piles
      { obj: 'paper', x: 59, y: 32, w: 2, h: 2, books: 'stack', spines: ['#E8964A', '#6E4A5E'] },
      { obj: 'wood', x: 6, y: 28, w: 6, h: 6, color: '#4E3438', drawers: 1 },       // the piano bench
      { obj: 'wood', x: 24, y: 20, w: 5, h: 5, color: '#5A3C40' },                  // the cubby beside the keys
      { obj: 'wood', x: 23, y: 4, w: 13, h: 4, color: '#4E3438', grain: 'h' },      // the open top (lid and props)
      { obj: 'wood', x: 19, y: 8, w: 32, h: 1, color: '#4E3438', grain: 'h' },      // the piano top
      { obj: 'wood', x: 50, y: 9, w: 1, h: 21, color: '#4E3438', grain: 'v' },      // the piano's side
      shelf(1, 16, 9, 1, '#8A5E44'),                                                // the ledge from the basket
    ],
  },
  'liv-lamp': {
    paint: [
      { obj: 'fabric', x: 8, y: 10, w: 12, h: 1, color: '#E8C48A', pattern: 'plain' }, // the lampshade
      { obj: 'metal', x: 13, y: 11, w: 2, h: 18, color: '#B08A4E', axis: 'v' },     // the pole (brass)
      { obj: 'metal', x: 9, y: 32, w: 10, h: 2, color: '#9A7A48', axis: 'h' },      // the base
      { obj: 'brick', x: 24, y: 32, w: 8, h: 2, color: '#A85A44' },                 // the hearth step up to the mantel
    ],
  },
  'liv-hearth': {
    paint: [
      shelf(0, 14, 8, 1, '#7A5240'),                                                // the mantel ([cracks] 8 wide)
      { obj: 'brick', x: 10, y: 0, w: 12, h: 30, color: '#9C4F3B' },                // the chimney breast, lips, smoke shelf
      { obj: 'brick', x: 22, y: 32, w: 4, h: 2, color: '#A85A44' },                 // the hearth step
    ],
  },
  'liv-lair': {
    paint: [
      { obj: 'fabric', x: 6, y: 15, w: 3, h: 1, color: '#E8964A', pattern: 'knit' }, // a pouf
      { obj: 'fabric', x: 10, y: 13, w: 4, h: 3, color: '#7E8150' },               // the sofa's left arm
      { obj: 'fabric', x: 48, y: 13, w: 4, h: 3, color: '#7E8150' },               // the right arm
      { obj: 'wood', x: 52, y: 15, w: 1, h: 1, color: '#9C7046' },                 // a dropped coaster
      { obj: 'fabric', x: 14, y: 15, w: 34, h: 1, color: '#8C8F55', pattern: 'quilt', accent: '#D48A8A' }, // the seat base
      { obj: 'fabric', x: 14, y: 7, w: 34, h: 1, color: '#8C8F55' },               // the sofa back's top
    ],
  },
};
