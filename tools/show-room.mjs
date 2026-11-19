#!/usr/bin/env node
// Print a room's tiles (or a window of them) as ASCII, entities as their first letter, with
// column/row numbers: a quick look at a spot check-world names.
//   node tools/show-room.mjs <room> [x0 y0 x1 y1]
import { World } from '../game/src/world.js';
import { ZONES } from '../game/data/rooms/index.js';

const [id, x0, y0, x1, y1] = process.argv.slice(2);
const w = new World(ZONES);
const r = w.rooms[id];
if (!r) { console.log(`no room ${id}`); process.exit(1); }
const C = '.#G=C%~^sP';
console.log(`${id}: ${r.tw}x${r.th} tiles at cell ${r.cx},${r.cy} (${r.zone.id})`);
const X0 = +(x0 ?? 0), Y0 = +(y0 ?? 0), X1 = +(x1 ?? r.tw - 1), Y1 = +(y1 ?? r.th - 1);
let hdr = '    ';
for (let x = X0; x <= X1; x++) hdr += Math.abs(x) % 10;
console.log(hdr);
for (let y = Y0; y <= Y1; y++) {
  let line = String(y).padStart(3) + ' ';
  for (let x = X0; x <= X1; x++) {
    if (x < 0 || y < 0 || x >= r.tw || y >= r.th) { line += ' '; continue; }
    const e = r.entities.find((q) => q.x === x && q.y === y && q.type !== 'sign');
    line += e ? e.type[0].toUpperCase() : C[r.base[y * r.tw + x]];
  }
  console.log(line);
}
for (const e of r.entities) if (e.type !== 'sign' && e.x >= X0 && e.x <= X1 && e.y >= Y0 && e.y <= Y1) console.log('  ' + JSON.stringify(e).slice(0, 200));
