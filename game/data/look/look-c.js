// [polish] look overlay: zones 7-9 (study, sunroom, basement) + the Dragon's Lair. Tile units, like the room grids.
// Soil ('s'), cereal/plaster ('C') and crack ('%') tiles are kept out of every box (regions would repaint them).
const books = (x, y, w, h, kind, spines) => ({ obj: 'paper', x, y, w, h, books: kind, spines });
const SP = ['#8A3B32', '#4E7A55', '#3F5A6B', '#A8823C', '#6B4A6E', '#7C4A3A', '#C0A070'];
const pot = (x, y, w, h, color, rim = 10) => ({ obj: 'terracotta', x, y, w, h, color, rim });
const basket = (x, y, w, color = '#B8925E') => ({ obj: 'fabric', x, y, w, h: 1, color, pattern: 'knit' });
const box = (x, y, w, h, color, more = {}) => ({ obj: 'cardboard', x, y, w, h, color, ...more });

export default {
  // ---- zone 7: the Study ----
  'stu-door': {
    paint: [
      { obj: 'wood', x: 0, y: 12, w: 8, h: 2, color: '#8C5E3C', grain: 'h' },          // the door-frame ledge
    ],
  },
  'stu-desk': {
    paint: [
      { obj: 'appliance', x: 13, y: 21, w: 9, h: 3, color: '#5E7F6A', panel: false, seams: 2 }, // the typewriter
      { obj: 'wood', x: 42, y: 22, w: 8, h: 2, color: '#7A4E3A' },                       // the pin box round the plaster patch
      books(33, 21, 6, 1, 'stack', ['#8A3B32']),                                         // the cracked book (crack stays)
      books(33, 22, 1, 2, 'stack', ['#8A3B32']),
      books(35, 22, 4, 2, 'stack', ['#8A3B32']),
      { obj: 'wood', x: 40, y: 26, w: 10, h: 4, color: '#8A5A3A', drawers: 2 },          // the drawer pedestal
      { obj: 'wood', x: 10, y: 24, w: 40, h: 2, color: '#A07850', grain: 'h' },          // the desktop
    ],
  },
  'stu-globe': {
    paint: [
      { obj: 'glass', x: 41, y: 9, w: 4, h: 5 },                                         // the mantel clock's glass door
      { obj: 'wood', x: 40, y: 8, w: 6, h: 7, color: '#7A4A30', grain: 'v' },            // ... and its case (on little feet: a crawl under it)
      books(8, 13, 4, 3, 'stack', ['#4E7A55', '#8A3B32', '#A8823C']),                    // a stack of books
    ],
  },
  'stu-nook': {
    paint: [
      books(4, 12, 9, 4, 'stack', ['#6B3A32', '#4E3A5E']),                               // the big dictionary
    ],
  },
  'stu-shelves': {
    paint: [
      // shelf boards and uprights of the bookcase
      { obj: 'wood', x: 4, y: 7, w: 46, h: 1, color: '#9A6A44', grain: 'h' },            // the top shelf
      { obj: 'wood', x: 0, y: 18, w: 39, h: 1, color: '#9A6A44', grain: 'h' },           // the second shelf's board
      { obj: 'wood', x: 11, y: 19, w: 1, h: 11, color: '#8A5A3A', grain: 'v' },          // cubby dividers
      { obj: 'wood', x: 22, y: 19, w: 1, h: 11, color: '#8A5A3A', grain: 'v' },
      { obj: 'wood', x: 34, y: 19, w: 1, h: 13, color: '#8A5A3A', grain: 'v' },
      { obj: 'wood', x: 0, y: 34, w: 64, h: 2, color: '#A07850', grain: 'h' },           // the bottom shelf board
      // the solid books (glass walls stay glass)
      books(41, 8, 12, 8, 'row', SP),
      books(39, 16, 7, 18, 'row', [SP[2], SP[0], SP[4], SP[3], SP[1]]),
      books(47, 16, 6, 18, 'row', [SP[3], SP[5], SP[1], SP[6], SP[0]]),
      books(57, 14, 7, 16, 'row', [SP[1], SP[0], SP[3], SP[2]]),
      books(0, 16, 5, 2, 'stack', [SP[0], SP[3]]),
      books(8, 50, 5, 2, 'stack', [SP[2], SP[6]]),                                       // P1: a short stack
      books(20, 45, 8, 7, 'row', [SP[4], SP[1], SP[3], SP[0]]),                          // P2 and its step
      books(36, 40, 6, 12, 'row', [SP[0], SP[2], SP[5], SP[3]]),                         // P3 and its step
    ],
  },
  'stu-window': {
    paint: [
      { obj: 'metal', x: 18, y: 9, w: 12, h: 5, color: '#A9A49A', axis: 'h', bands: 20, rivets: false }, // the radiator under the window
    ],
  },
  'stu-lair': {
    paint: [
      { obj: 'wood', x: 0, y: 16, w: 9, h: 2, color: '#9A6A44', grain: 'h' },           // the entry ledge
      { obj: 'wood', x: 9, y: 10, w: 14, h: 23, color: '#8C5E3C', grain: 'h' },          // the middle shelves
      { obj: 'wood', x: 1, y: 10, w: 30, h: 23, color: '#A07850', grain: 'h' },          // the side shelves
    ],
  },

  // ---- zone 8: the Sunroom ----
  'sun-fern': {
    paint: [
      { obj: 'wood', x: 1, y: 26, w: 9, h: 1, color: '#9A6A44', grain: 'h' },           // the fern stand's lower shelf
      { obj: 'wood', x: 1, y: 21, w: 3, h: 1, color: '#9A6A44', grain: 'h' },           // its back post's cap
      { obj: 'wood', x: 22, y: 16, w: 10, h: 2, color: '#B9C8B2', grain: 'h' },          // the painted window ledge out to the canopy
    ],
  },
  'sun-canopy': {
    paint: [
      { obj: 'wood', x: 0, y: 16, w: 8, h: 1, color: '#B9C8B2', grain: 'h' },            // A: the painted entry ledge
      basket(16, 16, 6), basket(30, 17, 6, '#A8814E'), basket(44, 18, 6),                // B, C, D: hanging baskets
      { obj: 'fabric', x: 54, y: 20, w: 13, h: 1, color: '#D2BE98', pattern: 'knit' },   // E: the macrame tray
      basket(96, 22, 6, '#A8814E'), basket(113, 22, 6), basket(91, 23, 5, '#C09A64'),    // F, the far basket, the chain basket
    ],
  },
  'sun-pots': {
    paint: [
      pot(8, 33, 5, 1, '#C77B56'),                                                       // a little pot (soil tops stay)
      pot(16, 31, 8, 3, '#BF6A47', 14),                                                  // a big pot
      pot(27, 31, 9, 3, '#D08A62', 14),                                                  // Peeper's pot
      pot(37, 29, 3, 5, '#B05E3E', 12),                                                  // the tall narrow one
      pot(40, 29, 4, 5, '#C47250', 12), pot(47, 29, 3, 5, '#C47250', 12),                // the deep pot (either side of its soil)
      pot(50, 31, 2, 3, '#BA6A4A'),                                                      // a slim pot
      pot(53, 33, 5, 1, '#D08A62'),                                                      // a low pot
    ],
  },
  'sun-bench': {
    paint: [
      { obj: 'wood', x: 24, y: 20, w: 19, h: 5, color: '#9A6A44', grain: 'h' },          // the thermostat cubby + bench top (right)
      { obj: 'wood', x: 2, y: 24, w: 2, h: 1, color: '#9A6A44', grain: 'h' },            // bench top (left of the seed tray)
      { obj: 'wood', x: 2, y: 25, w: 40, h: 1, color: '#7E5636', grain: 'h' },           // the bench's front rail
      { obj: 'wood', x: 0, y: 1, w: 1, h: 29, color: '#B9C8B2', grain: 'v' },            // the painted wall board by the bench
      { obj: 'wood', x: 44, y: 1, w: 19, h: 1, color: '#B9C8B2', grain: 'h' },           // the glass wall's painted frame
      pot(10, 33, 4, 1, '#C77B56'), pot(48, 33, 5, 1, '#BF6A47'),                         // floor pots (soil tops stay)
    ],
  },
  'sun-glass': {
    paint: [
      { obj: 'metal', x: 52, y: 1, w: 3, h: 17, color: '#8A9298', axis: 'v', bands: 120 }, // the downpipe
      { obj: 'brick', x: 24, y: 1, w: 39, h: 17, color: '#A85E48' },                     // the house wall housing the downpipe
      { obj: 'wood', x: 6, y: 3, w: 18, h: 1, color: '#B9C8B2', grain: 'h' },            // the painted lair ledge
      { obj: 'wood', x: 1, y: 21, w: 62, h: 2, color: '#8E6440', grain: 'h' },           // the long plant shelf
    ],
  },
  'sun-lair': {
    paint: [
      basket(8, 26, 6), basket(50, 26, 6, '#A8814E'),                                    // the low baskets
      basket(3, 15, 6, '#C09A64'), basket(55, 15, 6, '#C09A64'),                          // the high baskets
    ],
  },

  // ---- zone 9: the Basement (foundation walls stay stone) ----
  'bas-stairs': {
    paint: [
      { obj: 'wood', x: 1, y: 4, w: 22, h: 2, color: '#8A6A4A', grain: 'h' },            // the stair head
      { obj: 'wood', x: 53, y: 16, w: 10, h: 2, color: '#7E5E40', grain: 'h' },          // landing 1
      { obj: 'wood', x: 1, y: 35, w: 10, h: 2, color: '#7E5E40', grain: 'h' },           // landing 2
    ],
  },
  'bas-storage': {
    paint: [
      // the tops of the stacked storage boxes over the beetle corridor
      box(8, 11, 10, 4, '#B4855A', { label: true }), box(18, 11, 12, 4, '#C49A66', { marks: true }),
      box(30, 11, 9, 4, '#A8774E'), box(39, 11, 11, 4, '#BE925E', { label: true }),
      box(50, 11, 14, 4, '#B08050', { marks: true }), box(64, 11, 10, 4, '#C8A070'),
      box(74, 11, 10, 4, '#A8774E', { label: true }),
      { obj: 'wood', x: 8, y: 15, w: 76, h: 2, color: '#7E5E40', grain: 'h' },           // the plank the corridor runs on
      box(92, 11, 3, 5, '#BE925E'),                                                      // a box on the wire shelving
      box(15, 32, 2, 2, '#C49A66'), box(37, 32, 3, 2, '#B4855A', { tape: false }),       // floor box stacks
      box(61, 32, 2, 2, '#A8774E'), box(76, 32, 3, 2, '#C8A070'),
    ],
  },
  'bas-workbench': {
    paint: [
      { obj: 'metal', x: 27, y: 32, w: 3, h: 2, color: '#8E969E', axis: 'v', bands: 0 }, // the tin
      { obj: 'metal', x: 46, y: 30, w: 3, h: 3, color: '#5E6A7A', axis: 'v', bands: 20 }, // the vise
      { obj: 'wood', x: 18, y: 18, w: 66, h: 8, color: '#9A6A44', grain: 'h' },          // the workbench and its aprons
      { obj: 'wood', x: 42, y: 13, w: 7, h: 1, color: '#7E5E40', grain: 'h' },           // the high joist
      { obj: 'wood', x: 1, y: 1, w: 94, h: 6, color: '#7E5E40', grain: 'h' },            // the floor joists (ceiling) and their ends
      { obj: 'stone', x: 0, y: 1, w: 1, h: 29, color: '#56606E' },                       // the damp cellar wall (not glass)
    ],
  },
  'bas-sump': {
    paint: [
      ...[[20, 2], [33, 1], [47, 3], [60, 1], [71, 2]].map(([x, h]) => ({ obj: 'metal', x, y: 19, w: 2, h, color: '#8A7A6A', axis: 'v', bands: 0 })), // dripping pipe stubs
      { obj: 'appliance', x: 85, y: 32, w: 4, h: 2, color: '#6A8270', panel: false },     // the sump pump (crack stays)
      { obj: 'appliance', x: 84, y: 32, w: 1, h: 1, color: '#6A8270', panel: false },
    ],
  },
  'bas-coal': {
    paint: [
      { obj: 'metal', x: 43, y: 0, w: 9, h: 17, color: '#5A5E66', axis: 'v', bands: 80 }, // the sheet-iron coal chute and its lips
      { obj: 'metal', x: 51, y: 17, w: 1, h: 11, color: '#5A5E66', axis: 'v', bands: 80 }, // ... its right wall's foot
      { obj: 'brick', x: 1, y: 1, w: 42, h: 14, color: '#9A5A44' },                      // brick over the heap
      { obj: 'brick', x: 52, y: 1, w: 43, h: 17, color: '#8E5240' },                     // brick (right)
      { obj: 'stone', x: 14, y: 18, w: 33, h: 15, color: '#3E4250' },                    // the coal heap and its lumps
    ],
  },
  'bas-furnace': {
    paint: [
      { obj: 'appliance', x: 30, y: 30, w: 17, h: 18, color: '#4E5560', panel: false, door: 'front', vents: true }, // the furnace (dark iron)
      { obj: 'metal', x: 40, y: 16, w: 3, h: 14, color: '#6A6E76', axis: 'v' },          // the flue riser
      { obj: 'metal', x: 36, y: 14, w: 27, h: 2, color: '#6A6E76', axis: 'h' },          // the flue-pipe walkway
      { obj: 'metal', x: 1, y: 31, w: 29, h: 1, color: '#8A939E', axis: 'h', bands: 120 }, // the duct ledges
      { obj: 'metal', x: 11, y: 32, w: 1, h: 18, color: '#8A939E', axis: 'v', bands: 120 }, // the cold-air return walls
      { obj: 'metal', x: 16, y: 32, w: 1, h: 18, color: '#8A939E', axis: 'v', bands: 120 },
      { obj: 'wood', x: 1, y: 26, w: 4, h: 5, color: '#7E5E40' },                        // the song-seed cubby
      { obj: 'metal', x: 54, y: 48, w: 9, h: 1, color: '#8A939E', axis: 'h', bands: 120 }, // a duct over the crawl gap
    ],
  },
  'bas-chimney': {
    paint: [
      { obj: 'metal', x: 0, y: 14, w: 12, h: 2, color: '#6A6E76', axis: 'h' },           // the flue-pipe walkway
      { obj: 'brick', x: 1, y: 1, w: 31, h: 11, color: '#9A5A44' },                      // the chimney base and its flue
      { obj: 'brick', x: 11, y: 12, w: 1, h: 1, color: '#9A5A44' },                      // the flue wall's foot
      { obj: 'brick', x: 12, y: 16, w: 4, h: 1, color: '#8E5240' },                      // the ash ledge
    ],
  },
  'bas-lair': {
    paint: [
      { obj: 'brick', x: 48, y: 9, w: 47, h: 7, color: '#8E5240' },                      // the den floor's brick bulk
      { obj: 'brick', x: 6, y: 9, w: 42, h: 2, color: '#9A5A44' },                       // the den floor over the coal tunnel
    ],
  },

  // ---- the Dragon's Lair (the hoard and the glass vivarium stay as they are) ----
  'lair-gap': {
    paint: [
      { obj: 'metal', x: 0, y: 0, w: 32, h: 3, color: '#7E8690', axis: 'h', bands: 160 }, // the dusty duct ceiling
      { obj: 'appliance', x: 0, y: 3, w: 16, h: 10, color: '#4E5560', panel: false, vents: true }, // the furnace's back
      { obj: 'wood', x: 24, y: 3, w: 8, h: 6, color: '#7E5E40', grain: 'h' },            // the lintel over the vivarium door
    ],
  },
};
