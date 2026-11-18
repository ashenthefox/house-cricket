// Authors the Sunroom's recorded solutions (builder C) with the headless sim:
//   design/solutions/zone-08-path.json  sun-door -> the canopy glides -> the Cotton Earplugs ->
//                                       the loud tunnel -> the lair door (no Up pressed there)
//   design/solutions/zone-08-boss.json  Kite's three phases in sun-lair
//   node tools/solutions/zone-08.mjs [path|boss]
import { Author } from '../author.mjs';
import { ZONE_INFO } from '../../game/data/zones.js';

const R = 'ArrowRight', L = 'ArrowLeft', J = 'KeyZ', CHIRP = 'KeyC';
const T = 40;
const only = process.argv[2];
const want = (n) => !only || n.includes(only);
const ground = (g) => g.player.state === 'ground';
const ITEMS = ZONE_INFO[8].minItems[0];

// The one-way fronds of a room, bottom to top: [{x0, x1, row}] (one run per row).
function fronds(a, roomId, rowMin = 0, rowMax = 99, xMin = 0, xMax = 999) {
  const rows = a.g.world.rooms[roomId].def.grid, out = [];
  rows.forEach((line, y) => {
    if (y < rowMin || y > rowMax) return;
    for (const m of line.matchAll(/=+/g)) if (m.index >= xMin && m.index <= xMax) { out.push({ x0: m.index, x1: m.index + m[0].length - 1, row: y }); break; }
  });
  return out.sort((p, q) => q.row - p.row);
}
const feetRow = (g) => Math.round((g.player.y + g.player.h) / T);
// Hop up onto a platform [x0..x1] whose top is row `row` (tiles, in the current room).
function hop(a, { x0, x1, row }, label = `row ${row}`) {
  const room0 = a.g.room;
  const lo = x0 * T + 6, hi = (x1 + 1) * T - 6, mid = (lo + hi) / 2;
  const near = (g) => { const cx = g.player.cx; return Math.max(lo - cx, cx - hi, 0) < 1.1 * T; };
  const dir = () => (a.p.cx < mid ? R : L);
  let d = dir();
  if (!near(a.g)) { a.down(d).until(near, 400, `near ${label}`).up(d); }
  d = dir();
  a.down(J).down(d).until((g) => g.player.vy > 0 || (ground(g) && feetRow(g) === row), 60, `rising ${label}`);
  a.until((g) => { const c = g.player.cx; if (c > lo + 8 && c < hi - 8 && a.held.has(d)) a.up(d); return ground(g); }, 120, `landed ${label}`);
  for (const k of [J, R, L]) if (a.held.has(k)) a.up(k);
  a.wait(3);
  const wrow = a.g.room.cy * 18 + feetRow(a.g);
  if (wrow !== room0.cy * 18 + row) throw new Error(`missed ${label}: feet row ${feetRow(a.g)} at x ${Math.round(a.p.cx / T)} (${a.g.room.id})`);
  return a;
}
// Run off the edge and glide (hold Jump) to a basket at `row` starting at column x0.
function glideTo(a, dirKey, x0, x1, row, label) {
  const edge = dirKey === R ? (g) => !ground(g) : (g) => !ground(g);
  a.down(dirKey).until(edge, 300, `off the edge to ${label}`).tap(J, 1).down(J);
  a.until((g) => ground(g), 400, `landed ${label}`).up(J);
  a.until(() => true, 1).up(dirKey).wait(8);
  const wrow = a.g.room.cy * 18 + feetRow(a.g);
  if (wrow !== room0.cy * 18 + row) throw new Error(`glide missed ${label}: feet ${feetRow(a.g)} x ${a.p.cx / T}`);
  return a;
}

if (want('path')) {
  const a = new Author({ room: 'sun-door', items: ITEMS, party: ['pip'], rescued: ZONE_INFO[8].rescued });
  a.wait(20).log('start');
  for (const f of fronds(a, 'sun-door')) hop(a, f, `door ${f.row}`);
  // up into the fern stand: its fronds continue the zig-zag
  for (const f of fronds(a, 'sun-fern', 16, 35)) {
    hop(a, f, `fern ${f.row}`);
  }
  a.log('top of the fern');
  // the ledge out to the canopy, then A
  a.down(R).until((g) => g.room.id === 'sun-canopy' && g.player.cx > 6 * T, 300, 'canopy A').up(R).wait(6).log('canopy A');
  // glide A -> B -> C -> D (8 tiles of air each), then down to E
  for (const [x0, x1, row, name] of [[16, 21, 16, 'B'], [30, 35, 17, 'C'], [44, 49, 18, 'D'], [54, 66, 20, 'E']]) {
    a.down(R).until((g) => !ground(g), 200, `off to ${name}`).down(J)
      .until((g) => g.player.cx > (x0 + 1.6) * T, 300, `over ${name}`).up(R)
      .until(ground, 200, `on ${name}`).up(J).wait(8).log(`basket ${name}`);
    if (feetRow(a.g) !== row) throw new Error(`glide missed ${name}`);
    if (name !== 'E') a.down(R).until((g) => g.player.cx > (x1 + 0.3) * T, 120).up(R);
  }
  // off E into the hole: down onto the potting bench
  a.down(R).until((g) => g.room.id === 'sun-bench', 300, 'into the bench').up(R).until(ground, 200, 'on the bench').log('bench top');
  a.down(R).until((g) => g.player.has('earplugs'), 300, 'earplugs').up(R).log('EARPLUGS');
  a.until((g) => g.hold === 0, 60).wait(4);
  // off the left end of the bench to the floor, then right to the glass corner
  a.down(L).until((g) => !ground(g), 400, 'off the bench').until(ground, 200, 'floor').up(L).wait(4).log('bench floor');
  a.down(R).until((g) => g.player.cx > 8.6 * T, 200, 'by pot 1').tap(J, 12).until(ground, 90).until((g) => g.player.cx > 46.6 * T, 400, 'by pot 2').tap(J, 12).until(ground, 90)
    .until((g) => g.room.id === 'sun-glass', 400, 'into the glass corner').up(R).wait(4).log('glass');
  for (const f of fronds(a, 'sun-glass', 23, 33)) hop(a, f, `ivy ${f.row}`);
  // up through the ivy gap onto the slab, then west through the roaring tunnel (Earplugs)
  hop(a, { x0: 52, x1: 56, row: 21 }, 'slab');
  a.down(L).log('slab');
  a.until((g) => g.player.cx < 22 * T, 600, 'through the tunnel').up(L).wait(6).log('through the tunnel');
  for (const f of fronds(a, 'sun-glass', 4, 19)) hop(a, f, `corner ${f.row}`);
  hop(a, { x0: 12, x1: 19, row: 3 }, 'lair ledge');
  a.log('at the lair door').end();
  a.save('zone-08-path', { room: 'sun-glass' });
}

if (want('boss')) {
  const a = new Author({ room: 'sun-lair', x: 16, y: 34, items: [...ITEMS, 'earplugs'], party: ['pip'], rescued: ZONE_INFO[8].rescued });
  const k = () => a.g.boss;
  const dist = (g) => Math.hypot(g.boss.x - g.player.cx, g.boss.y - g.player.cy) / T;
  a.wait(10);
  // phase 1: the middle perch, chirp as he passes overhead
  a.down(R).until((g) => g.player.cx > 18.3 * T, 200).tap(J, 8).until((g) => g.player.cx > 26 * T, 200).up(R).until(ground, 60);
  for (const f of fronds(a, 'sun-lair', 28, 32, 24, 40)) hop(a, f, `mid ${f.row}`);
  hop(a, { x0: 31, x1: 35, row: 26 }, 'perch');
  a.log('perch');
  a.until((g) => k().mode === 'fly' && dist(g) < 4.4, 900, 'he passes').tap(CHIRP, 3).until(() => k().phase === 2, 300, 'phase 2').log('phase 2');
  // phase 2: let him swoop at the perch, step off to the left frond, chirp while he puffs
  a.until(() => k().mode === 'tell', 900, 'tell').log('tell');
  a.down(L).until((g) => g.player.cx < 29.4 * T, 60).up(L).until(ground, 60);
  a.until(() => k().mode === 'hover', 120, 'hover').until((g) => dist(g) < 5.0, 60, 'close').tap(CHIRP, 3).log('chirp 2')
    .until(() => k().phase === 3, 300, 'phase 3').log('phase 3');
  // phase 3: down, left to the mister, up to the high basket
  a.down(L).until((g) => g.player.cx < 20.5 * T && ground(g) && feetRow(g) === 35, 400, 'in the dip').until((g) => g.player.cx < 12.7 * T, 100).tap(J, 8)
    .until((g) => g.player.cx < 2 * T, 400, 'into the mister').up(L);
  a.until((g) => g.player.y + g.player.h < 14 * T, 600, 'lifted').down(R).until((g) => ground(g) && feetRow(g) === 15, 120, 'high basket').up(R);
  a.down(R).until((g) => g.player.cx > 5.5 * T, 30).up(R).wait(4).log('high basket');
  a.until((g) => (k().mode === 'fly' || k().mode === 'hover') && dist(g) < 4.6, 1500, 'he comes round').tap(CHIRP, 3).log('chirp 3');
  a.until((g) => g.levelComplete, 300, 'Digby free').log('rescued');
  for (const k of [...a.held]) a.up(k); // end on the rescue step: the post dialog opens now in the browser
  a.save('zone-08-boss', { levelComplete: true });
}
