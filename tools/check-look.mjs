#!/usr/bin/env node
// Checks game/data/look (the render-only look overlay): every room id exists, every object region
// is inside the room and covers solid tiles, and prints each region's solid coverage. Also prints a
// room's grid with region letters so you can see what a region paints:
//   node tools/check-look.mjs                 (all rooms: problems only)
//   node tools/check-look.mjs --show bed-bedtop   (the grid with region letters A, B, C...)
//   node tools/check-look.mjs --grid kit-stove    (just the grid, with column numbers)
import { ZONES } from '../game/data/rooms/index.js';
import { LOOK } from '../game/data/look/index.js';

const args = process.argv.slice(2);
const show = args.includes('--show') ? args[args.indexOf('--show') + 1] : null;
const onlyGrid = args.includes('--grid') ? args[args.indexOf('--grid') + 1] : null;
const rooms = new Map();
for (const z of ZONES) for (const r of z.rooms) rooms.set(r.id, r);
const SOLID = new Set(['#', 'G', 'C', 's', '%']);
const OBJ = new Set(['appliance', 'porcelain', 'wood', 'fabric', 'cardboard', 'terracotta', 'metal', 'brick', 'paper', 'glass', 'stone']);
let bad = 0;
const ruler = (w) => '    ' + Array.from({ length: w }, (_, i) => (i % 10 === 0 ? String((i / 10) % 10) : ' ')).join('') + '\n    ' + Array.from({ length: w }, (_, i) => i % 10).join('');

if (onlyGrid) {
  const r = rooms.get(onlyGrid);
  if (!r) { console.log('no room', onlyGrid); process.exit(1); }
  console.log(ruler(r.grid[0].length));
  r.grid.forEach((row, y) => console.log(String(y).padStart(3) + ' ' + row));
  process.exit(0);
}
for (const [id, L] of Object.entries(LOOK)) {
  const r = rooms.get(id);
  if (!r) { console.log(`?? ${id}: no such room`); bad++; continue; }
  const H = r.grid.length, W = r.grid[0].length;
  (L.paint || []).forEach((p, i) => {
    const tag = String.fromCharCode(65 + (i % 26));
    if (p.obj && !OBJ.has(p.obj)) { console.log(`!! ${id} ${tag}: unknown obj '${p.obj}'`); bad++; }
    if (!p.obj && !p.kind) { console.log(`!! ${id} ${tag}: needs obj or kind`); bad++; }
    const w = p.w || 1, h = p.h || 1;
    if (p.x < 0 || p.y < 0 || p.x + w > W || p.y + h > H) { console.log(`!! ${id} ${tag}: outside the room (${W}x${H})`); bad++; }
    let n = 0;
    for (let y = p.y; y < p.y + h; y++) for (let x = p.x; x < p.x + w; x++) if (SOLID.has(r.grid[y]?.[x])) n++;
    if (!n) { console.log(`!! ${id} ${tag} (${p.obj || p.kind} ${p.x},${p.y} ${w}x${h}): no solid tiles`); bad++; }
    else if (show === id || args.includes('-v')) console.log(`   ${id} ${tag} ${p.obj || p.kind} ${p.x},${p.y} ${w}x${h}: ${Math.round((100 * n) / (w * h))}% solid`);
  });
  if (show === id) {
    const g = r.grid.map((row) => row.split(''));
    (L.paint || []).forEach((p, i) => { const tag = String.fromCharCode(65 + (i % 26)); for (let y = p.y; y < p.y + (p.h || 1); y++) for (let x = p.x; x < p.x + (p.w || 1); x++) if (g[y] && SOLID.has(r.grid[y][x]) && /[#GCs%]/.test(g[y][x])) g[y][x] = tag; });
    console.log(ruler(W));
    g.forEach((row, y) => console.log(String(y).padStart(3) + ' ' + row.join('')));
  }
}
console.log(bad ? `${bad} problem(s)` : `look ok: ${Object.keys(LOOK).length} rooms`);
process.exit(bad ? 1 : 0);
