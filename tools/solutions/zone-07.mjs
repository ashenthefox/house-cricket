// Authors zone 7's recorded solutions (builder C) with the headless sim:
//   design/solutions/zone-07-path.json  stu-door -> the Glow Bead -> Mossy's lair door
//   design/solutions/zone-07-boss.json  Mossy: three tags
// Run: node tools/solutions/zone-07.mjs [path|boss]
import { Author } from '../author.mjs';
import { ZONE_INFO } from '../../game/data/zones.js';
import { K } from '../../game/src/physics.js';
const R = 'ArrowRight', L = 'ArrowLeft', U = 'ArrowUp', D = 'ArrowDown', J = 'KeyZ', KICK = 'KeyX', CHIRP = 'KeyC', USE = 'KeyV';
const T = 40;
const only = process.argv[2];
const want = (n) => !only || n === only;
const ground = (g) => g.player.state === 'ground';
const tx = (g) => g.player.cx / T, ty = (g) => (g.player.y + g.player.h) / T; // feet (tile units)

// helpers on an Author
export function helpers(a) {
  const h = {
    // walk toward a column (centre), stop there
    walkTo(col, max = 600, label = `walk to ${col}`) {
      const dir = tx(a.g) < col ? R : L;
      a.down(dir).until((g) => (dir === R ? tx(g) >= col : tx(g) <= col), max, label).up(dir);
      return a;
    },
    // run in a direction until cond; chirp at booklice ahead, hop silverfish ahead
    runTo(dir, cond, max = 900, label = 'run') {
      const d = dir === R ? 1 : -1;
      a.down(dir);
      for (let i = 0; i < max; i++) {
        const g = a.g, p = g.player;
        if (cond(g)) { a.up(dir); return a; }
        if (p.state === 'ground') {
          const ahead = (e, r) => e.state === 'walk' && Math.sign(e.x + e.w / 2 - p.cx) === d && Math.abs(e.x + e.w / 2 - p.cx) < r * T && Math.abs(e.y + e.h - (p.y + p.h)) < T;
          if (g.enemies.some((e) => e.type === 'booklouse' && ahead(e, 3.2)) && p.chirpMeter > 0 && g.frame - g.lastCall > 20) { a.tap(CHIRP, 2); continue; }
          if (g.enemies.some((e) => (e.type === 'silverfish' || e.type === 'booklouse') && ahead(e, 1.9))) { a.tap(J, 10); continue; }
        }
        a.wait(1);
      }
      throw new Error(`timed out: ${label} ${JSON.stringify(a.state())}`);
    },
    // wall-jump up a shaft (Tape Booties) until cond: hold toward a wall, kick off, switch
    wallClimb(firstDir, cond, max = 600, label = 'wall climb') {
      let dir = firstDir;
      a.down(dir).down(J).wait(12).up(J);
      for (let i = 0; i < max; i++) {
        const p = a.g.player;
        if (cond(a.g)) { a.up(dir); return a; }
        if (p.state === 'cling' && p.clingDir === (dir === R ? 1 : -1)) {
          a.up(dir); dir = dir === R ? L : R; a.down(dir).tap(J, 10); continue;
        }
        if (p.state === 'ground') { a.tap(J, 12); continue; }
        a.wait(1);
      }
      throw new Error(`timed out: ${label} ${JSON.stringify(a.state())}`);
    },
    // plan a route over standing tiles (walk, drop, jump up to 2 rows and 2 columns) and run it.
    // Nodes are (col, feet row): the tile row the feet rest on top of.
    navTo(col, feet, label = 'nav') {
      const g = a.g, G = g.grid;
      const solid = (x, y) => { const k = G.at(x, y); return k !== K.EMPTY; };
      const stand = (x, y) => { const k = G.at(x, y); return k !== K.EMPTY && k !== K.WATER && k !== K.HAZARD && G.at(x, y - 1) === K.EMPTY; };
      const free = (x, y) => { const k = G.at(x, y); return k === K.EMPTY || k === K.ONEWAY; };
      const fall = (x, y) => { for (let yy = y; yy < G.h; yy++) if (stand(x, yy)) return yy; return null; };
      const start = [Math.floor(g.player.cx / T), Math.round((g.player.y + g.player.h) / T)];
      const key = (n) => n.join(',');
      const prev = new Map([[key(start), null]]); const q = [start];
      while (q.length) {
        const [x, y] = q.shift();
        if (x === col && y === feet) break;
        const nb = [];
        for (const d of [-1, 1]) {
          if (stand(x + d, y)) nb.push([x + d, y, 'walk']);
          else if (free(x + d, y - 1)) { const f = fall(x + d, y); if (f != null) nb.push([x + d, f, 'drop']); }
          for (const up of [1, 2]) for (const dx of [1, 2]) {
            const tx2 = x + d * dx, ty2 = y - up;
            if (!stand(tx2, ty2)) continue;
            let ok = true;
            for (let k = 1; k <= up + 1 && ok; k++) if (!free(x, y - k)) ok = false;
            for (let k = 1; k <= dx && ok; k++) if (!free(x + d * k, ty2 - 1) || !free(x + d * k, ty2 - 2)) ok = false;
            if (ok) nb.push([tx2, ty2, 'jump']);
          }
          // a flat hop over a gap of up to 3
          for (const dx of [2, 3]) if (stand(x + d * dx, y) && !stand(x + d, y) && free(x + d, y - 1)) nb.push([x + d * dx, y, 'hop']);
        }
        for (const n of nb) { const k = key([n[0], n[1]]); if (!prev.has(k)) { prev.set(k, [x, y, n[2]]); q.push([n[0], n[1]]); } }
      }
      if (!prev.has(`${col},${feet}`)) throw new Error(`${label}: no route to ${col},${feet} from ${start}`);
      const path = []; let cur = [col, feet];
      while (prev.get(key(cur))) { const pv = prev.get(key(cur)); path.unshift({ to: cur, how: pv[2], from: [pv[0], pv[1]] }); cur = [pv[0], pv[1]]; }
      for (const st of path) {
        const [x2, y2] = st.to, d = Math.sign(x2 - st.from[0]), dir = d > 0 ? R : L;
        if (st.how === 'walk') { h.walkTo(x2 + 0.5 - d * 0.3, 120, label); continue; }
        if (st.how === 'drop') { a.down(dir).until((gg) => tx(gg) * d > (st.from[0] + 0.5) * d + 0.6, 60, label).up(dir).until((gg) => ground(gg), 120, label); continue; }
        // jumps: line up near the edge, then go
        h.walkTo(st.from[0] + 0.5 - d * 0.2, 120, label); a.wait(2);
        a.down(dir).down(J);
        let held = true;
        for (let i = 0; i < 120; i++) {
          const gg = a.g;
          if (i === 18) a.up(J);
          if (held && (tx(gg) - (x2 + 0.5)) * d > -0.15) { a.up(dir); held = false; }
          if (i > 2 && ground(gg)) break;
          a.wait(1);
        }
        if (held) a.up(dir);
        if (a.held.has(J)) a.up(J);
        a.until((gg) => ground(gg) && Math.abs(ty(gg) - y2) < 0.2, 5, `${label}: ${st.how} to ${x2},${y2}`);
      }
      return a;
    },
    // a jump with a direction held until landing on ground above/at a row
    jumpTo(dir, cond, hold = 14, max = 120, label = 'jump') {
      if (dir) a.down(dir);
      a.down(J).wait(hold).up(J);
      a.until((g) => ground(g) && cond(g), max, label);
      if (dir) a.up(dir);
      return a;
    },
    // jump (dir held) and grab the hook at tile (hx, hy) as it comes in reach
    grab(dir, hx, hy, hold = 16, label = 'grab') {
      const X = (hx + 0.5) * T, Y = (hy + 0.5) * T;
      if (dir) a.down(dir);
      a.down(J);
      for (let i = 0; i < 90; i++) {
        const p = a.g.player;
        if (i === hold) a.up(J);
        const dx = Math.max(p.x - X, 0, X - (p.x + p.w)), dy = Math.max(p.y - Y, 0, Y - (p.y + p.h));
        if (Math.hypot(dx, dy) < 0.9 * T) { a.tap(USE, 2); break; }
        a.wait(1);
      }
      if (a.held.has(J)) a.up(J);
      if (dir) a.up(dir);
      a.until((g) => g.player.state === 'swing', 20, `${label}: grabbed`);
      return a;
    },
    // swing from a hook: grab (Use), pump toward dir, fling (Jump) when the swing points that way
    swing(dir, minAng = 0.5, label = 'swing') {
      if (a.g.player.state !== 'swing') a.tap(USE, 2).until((g) => g.player.state === 'swing', 40, `${label}: grab`);
      a.down(dir);
      const want = dir === R ? 1 : -1;
      a.until((g) => { const s = g.player.swing; return s && Math.sign(s.ang) === want && Math.abs(s.ang) > minAng && Math.sign(s.w) === want; }, 400, `${label}: pump`);
      a.tap(J, 2);
      return a;
    },
  };
  return h;
}

if (want('path') && process.argv[1]?.endsWith('zone-07.mjs')) {
  const items = ZONE_INFO[7].minItems[0];
  const a = new Author({ room: 'stu-door', items, party: ['pip'], rescued: ZONE_INFO[7].rescued });
  const h = helpers(a);
  a.wait(20).log('start');
  // stu-door -> stu-desk -> under the desk -> stu-shelves (chirp the booklice away, hop the silverfish)
  h.runTo(R, (g) => g.room.id === 'stu-desk', 900, 'to the desk').log('desk');
  h.runTo(R, (g) => g.room.id === 'stu-shelves', 1200, 'to the bookcase').log('shelves');
  h.runTo(R, (g) => tx(g) > 5, 200).wait(4).log('bookcase floor');
  // onto P1, swing H1 to P2
  h.walkTo(6.5).wait(4);
  h.jumpTo(R, (g) => ty(g) <= 50.1, 14, 90, 'P1').log('P1');
  h.walkTo(11.6).wait(4);
  h.grab(R, 15, 46, 40, 'H1').log('H1');
  h.swing(R, 0.7, 'H1');
  a.down(R).until((g) => ground(g), 120, 'land P2').up(R).log('P2');
  h.jumpTo(R, (g) => ty(g) <= 45.1, 20, 90, 'P2 step').log('P2 step');
  h.walkTo(26.8).wait(4);
  h.grab(R, 31, 41, 40, 'H2').log('H2');
  h.swing(R, 0.7, 'H2');
  a.down(R).until((g) => ground(g), 120, 'land P3').up(R).log('P3');
  h.walkTo(38.2).wait(3);
  h.jumpTo(R, (g) => ty(g) <= 40.1, 20, 90, 'P3 step').log('P3 step');
  h.walkTo(39.6).wait(3);
  h.jumpTo(L, (g) => ty(g) <= 38.1, 22, 90, 'rail 1').log('rail 1');
  h.walkTo(34.5).wait(3);
  h.jumpTo(L, (g) => ty(g) <= 36.1, 22, 90, 'rail 2').log('rail 2');
  h.walkTo(31).wait(3);
  h.jumpTo(null, (g) => ty(g) <= 34.1, 22, 90, 'corridor').log('corridor');
  // cubby 4, the true one: wall-jump up the shaft and out on the second shelf
  h.walkTo(36.4).wait(4);
  h.wallClimb(R, (g) => ty(g) < 16.9, 600, 'shaft').log('out of the shaft');
  a.until((g) => ground(g), 90, 'on rail 1').log('second shelf');
  for (const [col, feet] of [[35.6, 15], [30.6, 13], [25.6, 11], [20.6, 9]]) {
    h.walkTo(col).wait(3);
    h.jumpTo(L, (g) => ty(g) <= feet + 0.1, 22, 90, `rail to ${feet}`);
  }
  h.walkTo(16.5).wait(3);
  h.jumpTo(null, (g) => ty(g) <= 7.1, 22, 90, 'top shelf').log('top shelf');
  h.runTo(R, (g) => g.player.has('glow'), 600, 'the Glow Bead').log('Glow Bead');
  a.wait(50);
  h.runTo(R, (g) => tx(g) > 51 && ground(g), 300, 'window landing').log('window landing');
  a.down(R).until((g) => tx(g) > 54.3, 120).up(R).until((g) => ground(g) && ty(g) > 33.9, 200, 'down the chute').log('lair ledge');
  h.walkTo(59.5).wait(10).log('at the lair door');
  a.end();
  a.save('zone-07-path', {});
}

if (want('boss') && process.argv[1]?.endsWith('zone-07.mjs')) {
  const items = [...ZONE_INFO[7].minItems[0], 'glow'];
  const a = new Author({ room: 'stu-lair', x: 2, y: 15, items, party: ['pip'], rescued: ZONE_INFO[7].rescued });
  const h = helpers(a);
  a.wait(10).log('arena');
  for (let tries = 0; tries < 12 && !a.g.boss.done && a.g.boss.mode !== 'concede'; tries++) {
    a.until((g) => (g.boss.mode === 'hide' && g.boss.glintT === 0) || g.boss.mode === 'concede', 600, 'hidden');
    if (a.g.boss.mode === 'concede') break;
    const b = a.g.boss, sx = Math.floor(b.x / T), sy = Math.round(b.y / T), ph = b.phase;
    const G = a.g.grid, st = (x) => G.at(x, sy) !== K.EMPTY && G.at(x, sy - 1) === K.EMPTY;
    const prefer = sx > 16 ? [-3, -2, 3, 2] : [3, 2, -3, -2];
    const off = prefer.find((o) => st(sx + o) && st(sx + o - Math.sign(o)));
    a.log(`phase ${ph}: he hides at ${sx},${sy}; stand at ${sx + off}`);
    h.navTo(sx + off, sy, `to his spot (phase ${ph})`);
    a.wait(4);
    if (a.g.boss.mode !== 'hide') continue;            // he slipped away: find him again
    a.tap(CHIRP, 2).until((g) => g.boss.glintT > 0 || g.boss.mode !== 'hide', 10, 'glint');
    if (a.g.boss.glintT === 0) continue;
    const dir = off > 0 ? L : R;
    a.down(dir).until((g) => g.boss.phase > ph || g.boss.mode === 'concede' || g.boss.glintT === 0, 80, 'tag').up(dir)
      .log(a.g.boss.phase > ph || a.g.boss.mode === 'concede' ? `tagged in phase ${ph}` : 'missed');
  }
  a.until((g) => g.levelComplete, 200, 'rescued').log('Rin is free');
  for (const c of [...a.held]) a.up(c);   // end on the rescue frame: the post dialog pauses the sim in the browser
  a.save('zone-07-boss', { levelComplete: true });
}
