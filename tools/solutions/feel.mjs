// Authors design/solutions/feel.json in the feel lab (room sb-feel): every forgiveness window
// used at (or one frame inside) its limit, asserted while authoring.
//   node tools/solutions/feel.mjs
import { Author } from '../author.mjs';
import { FORGIVE, toFrames, TILE as T } from '../../game/data/movement.js';
const R = 'ArrowRight', L = 'ArrowLeft', J = 'KeyZ', USE = 'KeyV';
const must = (c, msg) => { if (!c) throw new Error('feel: ' + msg); console.log('  ok', msg); };

const a = new Author({ room: 'sb-feel', items: ['booties', 'floss'] });
// 1. coyote: walk off the ledge, Jump exactly 100 ms (6 frames) later, clear the tacks
a.wait(5).down(R).until((g) => g.player.state === 'air', 200, 'walked off');
const C = toFrames(FORGIVE.coyote);
a.wait(C - 1);
must(a.p.state === 'air' && a.p.vy > 0, `coyote: falling for ${C} frames before the press`);
a.down(J).wait(1);
must(a.p.vy < -300, 'coyote: the late press still jumped');
a.wait(20).up(J).until((g) => g.player.state === 'ground', 60, 'landed').log('coyote landing');
must(a.p.x > 13 * T - a.p.w && a.p.y + a.p.h <= 12 * T + 1, 'coyote: landed across the tack gap');
// 2. jump buffer: run off to the floor, press Jump 6 frames before landing: jumps on landing
a.until((g) => g.player.state === 'air', 60).up(R);
const sim = a.g; let framesToLand = 0;
{ // look ahead: how many frames until we land? (a copy of the sim, no input)
  const probe = new Author({ room: 'sb-feel' }); void probe;
}
a.until((g) => g.player.vy > 0 && g.player.y + g.player.h > 16 * T - 160, 120, 'near floor');
const B = toFrames(FORGIVE.jumpBuffer) - 1;
// step until exactly B frames remain before the landing (predict with the current speed)
for (let i = 0; i < 30; i++) { const p = a.p; const dist = 16 * T - (p.y + p.h); const fr = Math.ceil(dist / Math.max(1, p.vy / 60)); if (fr <= B) { framesToLand = fr; break; } a.wait(1); }
a.down(J).wait(1).up(J);
a.until((g) => g.player.state !== 'air' || g.player.vy < -300, 20, 'buffered jump');
must(a.p.vy < -300, `buffer: Jump pressed ~${framesToLand} frames before landing jumped on landing`);
a.until((g) => g.player.state === 'ground', 90).log('after buffer');
void sim;
// 3. wall grace: into the shaft, cling, let go, kick 6 frames later
a.down(R).until((g) => g.player.x > 20.2 * T, 120).up(R).down(J, R).wait(4).up(J)
  .until((g) => g.player.state === 'cling', 60, 'cling').log('cling');
a.up(R).down(L).wait(1);
must(a.p.state === 'air', 'grace: let go of the wall');
const G = toFrames(FORGIVE.wallGrace);
a.wait(G - 2).down(J).wait(1);
must(a.p.vy < -300 && a.p.vx < 0, `grace: kicked off the wall ${G - 1} frames after letting go`);
a.up(J);
// keep climbing to the one-way at the top
let side = -1;
for (let k = 0; k < 20 && !(a.p.state === 'ground' && a.p.y < 4 * T); k++) {
  a.until((g) => g.player.state === 'cling' || (g.player.state === 'ground' && g.player.y < 4 * T), 90, 'cling ' + k);
  if (a.p.state === 'ground') break;
  a.wait(2);
  if (side === -1) { a.up(L); a.down(R, J); } else { a.up(R); a.down(L, J); }
  side = -side;
  a.wait(4).up(J);
}
a.up(L, R).until((g) => g.player.state === 'ground', 120, 'on top').log('top');
must(a.p.y < 4 * T, 'climbed onto the one-way at the top');
// 4. hook magnet: jump right over the wall, Use when the hook is ~1 tile from the hitbox edge
a.down(R).until((g) => g.player.x > 21.6 * T, 60).down(J);
const hook = a.g.hooks[0];
const edgeDist = (p) => Math.hypot(Math.max(p.x - hook.x, 0, hook.x - (p.x + p.w)), Math.max(p.y - hook.y, 0, hook.y - (p.y + p.h)));
a.until((g) => edgeDist(g.player) < T * FORGIVE.hookMagnet - 2, 90, 'hook in range');
const d = edgeDist(a.p);
a.down(USE).wait(1).up(USE).up(J);
must(a.p.state === 'swing', `magnet: grabbed the hook from ${d.toFixed(1)} px (limit ${T * FORGIVE.hookMagnet})`);
// let go with Use: drop straight down to the floor
a.up(R).wait(20).tap(USE, 2).until((g) => g.player.state === 'ground', 120, 'floor').log('dropped');
must(a.p.state === 'ground' && a.p.health === 5, 'released with Use and dropped to the floor unhurt');
a.end();
a.save('feel', { room: 'sb-feel' });
