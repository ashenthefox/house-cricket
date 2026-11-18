// [builder A] Chikchak, common house gecko (Bathroom, bath-lair): STEALTH. Design: "The ten gecko
// encounters" 2 and house.js LAIRS.chikchak.
// She hunts by sight (10 tiles) and chirps decoy calls (the zone decoy: "chik-chak-chak") so the
// Listen arrow wobbles. Steam bursts fill clouds she can't see into (every 4 s, 3 s long, 6 tiles
// wide); grout cracks hide you too. Seen in the open: her tail tip wiggles (the tell) and she
// darts at you; get into steam or a crack before the tell ends and she loses you ("Peekaboo!").
//   Phase 1: she creeps along the tiles above the rim. Kick faucet 1 (the hot tap, in its cloud).
//   Phase 2: clouds from two vents, alternating; she climbs down and patrols the rim (she sees
//            ahead of her). Kick faucet 2.
//   Phase 3: faucet 3 is on the shower riser: wall-jump the 4-wide tiled shaft inside its cloud and
//            kick it. Water floods her mirror ledge; she retreats to dry tile, and the towel hooks
//            to the soap dish are clear: swing to Katy (rescue).
// Room: data/rooms/zone-02.js bath-lair. Floor row 16; mirror ledge row 6; riser shaft cols 44-47.
import { TILE as T, DT, FPS } from '../../data/movement.js';
import { TEXT } from '../../data/text.js';
import { makeBoss } from './base.js';
import * as S from '../sprites.js';

const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const LEN = 300, FLOOR = 16 * T, WALL_Y = 6 * T;
const SIGHT = 10 * T, EVERY = 4 * FPS, LASTS = 3 * FPS;
const FAUCETS = [{ x: 22.5 * T, y: FLOOR }, { x: 36.5 * T, y: FLOOR }, { x: 39.5 * T, y: 6 * T }];
const VENTS = { a: { x: 22.5 * T, y0: 9 * T, y1: FLOOR, w: 6 * T }, b: { x: 34 * T, y0: 9 * T, y1: FLOOR, w: 6 * T }, riser: { x: 46 * T, y0: 1.5 * T, y1: FLOOR, w: 9 * T } };
const DISH = { x: 57 * T, y: 7 * T, w: 5 * T, h: 2.2 * T };
const LURE = TEXT.geckos.chikchak.lure;

function cloudsOn(b, g) {
  const t = g.frame - b.t0;
  const on = (off) => ((t - off) % EVERY + EVERY) % EVERY < LASTS && t >= off;
  const list = [];
  if (b.phase === 1) { if (on(30)) list.push(VENTS.a); }
  else if (b.phase === 2) { if (on(30)) list.push(VENTS.a); if (on(30 + EVERY / 2)) list.push(VENTS.b); }
  else { if (on(30)) list.push(VENTS.riser); if (on(30 + EVERY / 2)) list.push(VENTS.a); }
  return list;
}
const inCloud = (p, list) => list.some((v) => p.cx > v.x - v.w / 2 && p.cx < v.x + v.w / 2 && p.cy > v.y0 && p.cy < v.y1);

export default makeBoss('chikchak', { postLines: true, // [playtest] base.rescue() emits geckos.<name>.post
 
  phases: 3, len: LEN,
  start(b, g) {
    b.t0 = g.frame; b.on = b.on || [false, false, false];
    for (let i = 0; i < 3; i++) b.on[i] = i < b.phase - 1;
    if (g.rescued.has(b.cricket)) { b.done = true; b.gone = true; return; }
    b.mode = 'hunt'; b.mt = 0; b.cool = 60; b.pose = 'walk'; b.flooded = false;
    b.wall = b.phase === 1;
    b.x = b.phase === 1 ? 8 * T : 12 * T; b.y = b.wall ? WALL_Y : FLOOR; b.facing = 1;
    b.home = { x: b.x, y: b.y }; b.lureT = 120; b.lure = 0;
    b.away = 2.5 * FPS; // [final-G] she starts facing away for 2.5 s: never a hit on arrival (or a phase restart)
  },
  tick(b, g) {
    const p = g.player;
    const pb = { x: p.x + 3, y: p.y + 3, w: p.w - 6, h: p.h - 6 };
    const clouds = cloudsOn(b, g);
    b.clouds = clouds;
    // steam puffs (sound + look) when a cloud starts
    for (const v of clouds) if (!b.prevClouds?.includes(v)) { g.emit('steam', { x: v.x, y: v.y1 }); g.emit('sfx', { name: 'steam', gain: 0.5, x: v.x }); }
    b.prevClouds = clouds;
    const hidden = p.hidden || inCloud(p, clouds);
    const dx = p.cx - b.x;
    if (b.away > 0) b.away--;
    // [final-G] a knock-back can't push you out of the arena (the door to the sink, cols 0-1)
    if (p.invuln > 0 && p.x < 2 * T) { p.x = 2 * T; if (p.vx < 0) p.vx = 0; }
    const sees = b.away <= 0 && !hidden && !b.flooded && (b.wall ? Math.abs(dx) < SIGHT : (Math.abs(dx) < SIGHT && Math.sign(dx) === b.facing) || Math.abs(dx) < 1.5 * T) && Math.abs(p.cy - b.y) < 12 * T;
    if (b.cool > 0) b.cool--;

    // faucets: kick this phase's handle
    const kb = p.kickBox();
    const f = FAUCETS[b.phase - 1];
    if (kb && !b.on[b.phase - 1] && ov(kb, { x: f.x - 28, y: f.y - 54, w: 56, h: 54 })) {
      b.on[b.phase - 1] = true;
      g.emit('switch', { id: `chikchak-faucet-${b.phase}`, x: f.x, y: f.y - 30 });
      g.emit('sfx', { name: 'raft-splash', gain: 0.6, x: f.x });
      if (b.phase < 3) { g.toast(['The hot tap is on! Steam everywhere.', 'Two taps running!'][b.phase - 1], 150); b.nextPhase(); return; }
      b.flooded = true; b.mode = 'retreat'; b.pose = 'walk'; b.facing = -1;
      g.toast('The shower floods her ledge! Swing to Katy!', 180);
    }
    // phase 3, after the shower: reach Katy's soap dish
    if (b.phase === 3 && b.flooded && ov(pb, DISH)) { b.rescue(); return; }
    if (b.phase === 3 && !b.flooded && ov(pb, DISH) && !b.saidWait) { b.saidWait = true; g.toast('Katy: "Turn the shower on first! She\'ll see you!"', 180); }

    // her chik-chak lines from the tiles (phases 1-2)
    if (b.phase < 3 && --b.lureT <= 0) { b.lureT = 7 * FPS; g.toast(`Chikchak: ${LURE[b.lure++ % (LURE.length - 1)]}`, 160); }

    switch (b.mode) {
      case 'hunt': {
        b.pose = 'walk';
        if (b.away > 0) { b.facing = 1; b.x = Math.min(40 * T, b.x + 1.3 * T * DT); break; } // [final-G] strolling off, back to you
        if (b.wall) { // creep along the tiles above the rim, after you
          const tx = Math.max(6 * T, Math.min(40 * T, p.cx));
          if (Math.abs(tx - b.x) > T) { b.facing = Math.sign(tx - b.x); b.x += b.facing * 1.3 * T * DT; } else b.pose = 'idle';
        } else {      // patrol the rim
          b.x += b.facing * 2.2 * T * DT;
          if (b.x < 6 * T) b.facing = 1; if (b.x > 40 * T) b.facing = -1;
        }
        if (sees && b.cool === 0) { b.mode = 'tell'; b.mt = b.tell(b.x + b.facing * LEN * 0.3, b.y - 60); b.pose = 'idle'; b.facing = Math.sign(dx) || b.facing; }
        break;
      }
      case 'tell':
        b.pose = 'idle';
        if (hidden) { b.mode = 'lost'; b.mt = 70; g.toast(`Chikchak: ${LURE[LURE.length - 1]}`, 140); break; }
        if (--b.mt <= 0) { b.mode = 'dart'; b.aim = { x: p.cx, y: p.y + p.h }; b.from = { x: b.x, y: b.y }; b.mt = 0; b.pose = 'strike'; g.emit('sfx', { name: 'gecko-chomp', gain: 0.5, x: b.x }); }
        break;
      case 'dart': {
        b.mt++;
        if (!hidden) b.aim = { x: p.cx, y: p.y + p.h };   // she homes in while she can see you
        const k = Math.min(1, b.mt / 14);
        b.x = b.from.x + (b.aim.x - b.facing * LEN * 0.3 - b.from.x) * k;
        b.y = b.from.y + (b.aim.y - b.from.y) * k;
        const head = { x: b.x + b.facing * LEN * 0.3 - 26, y: b.y - 50, w: 52, h: 50 };
        if (p.invuln === 0 && !p.hidden && ov(head, pb)) b.hit(1, b.x);
        if (k >= 1) { b.mode = 'back'; b.mt = 0; b.pose = 'walk'; b.from = { x: b.x, y: b.y }; }
        break;
      }
      case 'back': {   // back up onto the tiles (phase 1) or back on patrol
        b.mt++;
        const k = Math.min(1, b.mt / 50);
        const ty = b.wall ? WALL_Y : FLOOR;
        b.y = b.from.y + (ty - b.from.y) * k;
        if (k >= 1) { b.mode = 'hunt'; b.cool = 50; }
        break;
      }
      case 'lost':
        b.pose = 'idle';
        if (--b.mt <= 0) { b.mode = 'hunt'; b.cool = 40; b.facing *= -1; }
        break;
      case 'retreat':   // the flood: off to the dry tile by the door, sulking
        b.y += (FLOOR - b.y) * 0.1;
        if (b.x > 5 * T) b.x -= 4 * T * DT; else b.pose = 'idle';
        break;
      default: break;
    }
  },
  after(b) { b.pose = 'idle'; },
  draw(b, c, r) {
    // steam clouds
    const puff = S.get('props/steam-puff.png');
    for (const v of b.clouds || []) {
      const t = (r?.t || 0) * 0.02;
      for (let i = 0; i < 6; i++) {
        const w = v.w * 0.55, h = w * 1.1, x = v.x - v.w / 2 + (i % 3) * v.w * 0.3 + Math.sin(t + i) * 8, y = v.y1 - (Math.floor(i / 3) + 0.4) * (v.y1 - v.y0) * 0.5;
        if (puff) { c.save(); c.globalAlpha = 0.62; c.drawImage(puff, x - w * 0.1, y - h * 0.6, w, h); c.restore(); }
        else { c.save(); c.globalAlpha = 0.5; c.fillStyle = '#F4F7F6'; c.beginPath(); c.arc(x + w / 2, y, w / 2, 0, 7); c.fill(); c.restore(); }
      }
    }
    // faucets (and running water)
    const fh = S.get('props/faucet-handle.png');
    FAUCETS.forEach((f, i) => {
      const w = 1.4 * T, h = fh ? w * fh.height / fh.width : w;
      if (fh) c.drawImage(fh, f.x - w / 2, f.y - h, w, h);
      if (b.on?.[i] || (b.done && i < 3)) { c.save(); c.strokeStyle = 'rgba(140,201,196,0.85)'; c.lineWidth = 6; c.beginPath(); const yy = f.y - h * 0.55; c.moveTo(f.x + w * 0.4, yy); c.quadraticCurveTo(f.x + w * 0.7, yy + 10, f.x + w * 0.65, (i === 2 ? FLOOR : f.y)); c.stroke(); c.restore(); }
      else if (i === b.phase - 1 && !b.done && Math.floor((r?.t || 0) / 20) % 2) { c.save(); c.strokeStyle = '#F2C46D'; c.lineWidth = 3; c.beginPath(); c.arc(f.x, f.y - h / 2, 22, 0, 7); c.stroke(); c.restore(); }
    });
    if (b.flooded || b.done) { c.save(); c.fillStyle = 'rgba(140,201,196,0.55)'; c.fillRect(4 * T, 5.6 * T, 8 * T, 0.4 * T); c.restore(); }
    // Katy in the soap dish
    if (!b.done && r) r.drawCricketAt(c, 'katy', 59 * T, 9 * T, -1, { look: 'idle' });
    return b.gone ? true : false;
  },
});
