// Peridot, giant day gecko (Laundry, laun-lair): put her to sleep. Builder B.
// A bright-green fitness nut, wide awake in the light and dozy in the dark. Three lamps hang from
// the duct along the laundry ceiling, each with a pull-chain; the duct leaks warm updrafts at five
// seams (glide into one and it carries you up). Kick a chain (gliding past it) to switch its lamp
// off: that third of the room goes dark, and in the dark she runs at half speed, can't see you,
// and yawns.
//   Phase 1: she runs laps of the floor and lunges along it at you (tell first). Ride the first
//            seam up and kick the left chain (ends: chain 1).
//   Phase 2: she stops under each lit lamp and leaps straight up at you if you pass over her
//            (tell first). She starts under the middle lamp, guarding its chain, runs faster and
//            rests less [fixer]: kick the middle chain while she's away at the far lamp (ends: chain 2).
//   Phase 3: only the right lamp is on and she guards it. Show yourself at the edge of its light,
//            run into the dark: she follows, slows, yawns (2 s). Double back up the dark seam and
//            glide to the last chain: full dark, she naps. Hump is under the smoke alarm (ends:
//            rescue, then Beep's scene).
// Room: game/data/rooms/zone-05.js laun-lair (96x18; floor row 16, duct rows 2-3).
import { TILE as T, DT, FPS } from '../../data/movement.js';
import { TEXT } from '../../data/text.js';
import { makeBoss } from './base.js';
import * as Geckos from '../geckos.js';

const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const FLOOR = 16 * T, LEN = 320;
const LAMPS = [16, 48, 76];                       // lamp x (tiles); each lights a third of the room
const CHAINS = [14, 46, 74];                      // the pull-chains hang beside them
const THIRD = (x) => Math.max(0, Math.min(2, Math.floor(x / (32 * T))));
const HUMP = { x: 91.2 * T, y: 15 * T - 6, w: 1.6 * T, h: T + 6 }; // under Beep's wall plate
const RUN = 4.5 * T, LUNGE = 15 * T, YAWN = 2 * FPS;

const litFor = (phase, done) => (done ? [false, false, false] : [phase < 2, phase < 3, true]);
function onFloor(p) { return Math.abs(p.y + p.h - FLOOR) < 6 && p.state !== 'air'; }

export default makeBoss('peridot', {
  phases: 3, len: LEN,
  start(b, g) {
    b.lit = litFor(b.phase, false);
    b.x = [0, 60, 48, 78][b.phase] * T; b.y = FLOOR; b.facing = -1; b.jy = 0; b.vj = 0; // [fixer] phase 2 starts under the middle lamp, guarding its chain
    b.mode = b.phase === 1 ? 'run' : 'pause'; b.mt = 90; b.cool = 60; b.pose = b.phase === 1 ? 'walk' : 'idle';
    b.goal = b.phase === 1 ? 12 * T : null; b.seen = null; b.yawned = false; b.swing = [0, 0, 0];
    b.half = false; b.needFloor = false; b.flicker = 0;
    if (g.rescued.has(b.cricket)) { b.done = true; b.lit = litFor(3, true); b.x = 78 * T; b.mode = 'nap'; b.pose = 'sleep'; b.chainsDone = true; return; } // [final-2] Hump is free: no refight, she naps in the dark
  },
  tick(b, g) {
    const p = g.player;
    const pb = { x: p.x + 3, y: p.y + 3, w: p.w - 6, h: p.h - 6 };
    const kb = p.kickBox();
    const litHere = b.lit[THIRD(b.x)];
    const speed = RUN * (litHere ? 1 : 0.5) * (b.phase === 3 ? 0.9 : b.phase === 2 ? 1.2 : 1); // [fixer] quicker in phase 2
    const seesP = litHere && b.lit[THIRD(p.cx)] && !p.hidden; // in the dark she can't see you (or anything)
    const body = { x: b.x - LEN * 0.28, y: b.y - b.jy - 110, w: LEN * 0.56, h: 110 };
    if (b.cool > 0) b.cool--;
    for (let i = 0; i < 3; i++) if (b.swing[i] > 0) b.swing[i]--;
    if (b.needFloor && onFloor(p)) b.needFloor = false;
    if (b.flicker > 0) b.flicker--;

    // ---- the chains (kick one while you pass it) ----
    for (let i = 0; i < 3; i++) {
      const ch = { x: (CHAINS[i] - 0.5) * T, y: 4.6 * T, w: T, h: 5 * T };
      if (kb && ov(kb, ch) && !b.swing[i]) {
        b.swing[i] = 30;
        g.emit('sfx', { name: 'crinkle', gain: 0.6, rate: 1.6, x: ch.x });
        if (i === b.phase - 1 && b.needFloor) continue; // [final-G] the second tug needs a fresh ride up
        if (i === b.phase - 1) {
          g.emit('sfx', { name: 'hinge-creak', gain: 0.5, rate: 2.2, x: ch.x }); // click
          // [final-G] phase 1 takes two tugs: the first only makes the lamp flicker, and she comes for the light
          if (b.phase === 1 && !b.half) {
            b.half = true; b.needFloor = true; b.flicker = 40;
            g.toast(TEXT.geckos.peridot.flicker, 150);
            if (b.mode === 'run' || b.mode === 'pause') { b.mode = 'run'; b.goal = 12 * T; }
            continue;
          }
          if (b.phase < 3) { b.nextPhase(); return; }
          b.lit = litFor(3, true); b.mode = 'nap'; b.pose = 'sleep'; b.jy = 0; b.mt = 0; b.chainsDone = true;
          g.emit('sfx', { name: 'gecko-snore', gain: 0.8, x: b.x });
          return;
        }
      }
    }

    // ---- what she does ----
    switch (b.mode) {
      case 'run': { // laps (phase 1), or between the lit lamps (phases 2, 3)
        b.pose = 'walk';
        const goal = b.goal ?? b.x;
        const d = goal - b.x; b.facing = Math.sign(d) || b.facing;
        b.x += Math.sign(d) * Math.min(Math.abs(d), speed * DT);
        if (Math.abs(d) < 4) {
          if (b.phase === 1) b.goal = b.goal < 50 * T ? 88 * T : 12 * T;
          else { b.mode = 'pause'; b.mt = (b.phase === 2 ? 1.2 : 2) * FPS; b.pose = 'idle'; } // [fixer] shorter rests in phase 2
        }
        break;
      }
      case 'pause': { // under a lit lamp, stretching
        b.pose = 'idle';
        if (--b.mt <= 0) {
          const lamps = LAMPS.filter((x, i) => b.lit[i] && Math.abs(x * T - b.x) > 2 * T).map((x) => x * T);
          if (b.phase === 3) b.goal = (b.x > 76 * T ? 70 : 88) * T; // pace the right third
          else b.goal = lamps.length ? lamps[0] : LAMPS[2] * T;
          b.mode = 'run';
        }
        break;
      }
      case 'tell': if (--b.mt <= 0) { b.mode = 'lunge'; b.pose = 'strike'; b.mt = 22; b.aim = b.x + b.facing * 4 * T; g.emit('sfx', { name: 'gecko-chomp', gain: 0.8, x: b.x }); } break;
      case 'lunge': {
        const d = b.aim - b.x; b.x += Math.sign(d) * Math.min(Math.abs(d), LUNGE * DT);
        b.x = Math.max(9 * T, Math.min(90 * T, b.x));
        const head = { x: b.x + b.facing * LEN * 0.3 - 40, y: b.y - 90, w: 80, h: 90 };
        if (!p.hidden && p.invuln === 0 && ov(head, pb)) b.hit(1, b.x);
        if (--b.mt <= 0) { b.mode = 'recover'; b.mt = 40; b.pose = 'idle'; }
        break;
      }
      case 'leapTell': if (--b.mt <= 0) { b.mode = 'leap'; b.pose = 'strike'; b.vj = 1250; g.emit('sfx', { name: 'gecko-growl', gain: 0.6, x: b.x }); } break;
      case 'leap': {
        b.jy += b.vj * DT; b.vj -= 2600 * DT;
        if (!p.hidden && p.invuln === 0 && ov(body, pb)) b.hit(1, b.x);
        if (b.jy <= 0) { b.jy = 0; b.vj = 0; b.mode = 'recover'; b.mt = 45; b.pose = 'idle'; g.emit('land', { x: b.x, y: b.y, hard: true }); }
        break;
      }
      case 'recover': if (--b.mt <= 0) { b.mode = b.phase === 1 ? 'run' : 'pause'; b.mt = 40; b.cool = 50; } break;
      case 'chase': { // phase 3: after you, into the dark
        b.pose = 'walk';
        const d = b.seen - b.x; b.facing = Math.sign(d) || b.facing;
        b.x += Math.sign(d) * Math.min(Math.abs(d), speed * DT);
        if (!litHere && !b.yawned && (Math.abs(d) < 8 || b.x < 60 * T)) { b.mode = 'yawn'; b.mt = YAWN; b.yawned = true; g.emit('sfx', { name: 'gecko-snore', gain: 0.5, rate: 1.3, x: b.x }); }
        else if (Math.abs(d) < 8) { b.mode = 'pause'; b.mt = 30; }
        break;
      }
      case 'yawn': b.pose = (b.mt % 60) < 40 ? 'sleep' : 'idle'; if (--b.mt <= 0) { b.mode = 'run'; b.goal = 78 * T; b.yawned = false; } break;
      case 'nap': b.pose = 'sleep'; if (++b.mt % 150 === 1) g.emit('sfx', { name: 'gecko-snore', gain: 0.7, x: b.x }); break;
      default: break;
    }

    // ---- seeing you ----
    if (b.cool <= 0 && seesP && ['run', 'pause'].includes(b.mode)) {
      const ahead = (p.cx - b.x) * b.facing;
      const above = Math.abs(p.cx - b.x) < 3.2 * T && p.y + p.h < FLOOR - 1.5 * T && p.y > 4 * T;
      if (onFloor(p) && ahead > 0 && ahead < 7 * T) { // along the floor: tell, then lunge
        b.mode = 'tell'; b.mt = b.tell(b.x + b.facing * LEN * 0.3, b.y - 90); b.pose = 'idle';
        if (b.phase === 3 && THIRD(p.cx) === 2) b.seen = p.cx;
      } else if (b.phase >= 2 && above) { // passing over her: tell, then leap
        b.mode = 'leapTell'; b.mt = b.tell(b.x, b.y - 100); b.pose = 'idle';
      } else if (b.phase === 3 && onFloor(p) && Math.abs(p.cx - b.x) < 14 * T) { // the edge of the light: she comes for you
        b.seen = p.cx - 2 * T; b.mode = 'chase';
      }
    }
    if (b.phase === 3 && b.mode === 'chase' && seesP) b.seen = p.cx;
    if (b.phase === 3 && b.mode === 'recover' && b.seen != null && !b.lit[THIRD(p.cx)]) { b.mode = 'chase'; b.seen = p.cx; }

    // ---- Hump, under the smoke alarm ----
    if (ov(pb, { x: HUMP.x - T, y: HUMP.y - T, w: HUMP.w + 2 * T, h: HUMP.h + T }) && g.frame % 150 === 0 && b.mode !== 'nap') g.emit('tap', { msg: TEXT.hump.tap, x: HUMP.x });
    if (b.mode === 'nap' && ov(pb, HUMP)) {
      const lines = [...TEXT.geckos.peridot.post.map((l) => ['peridot', l]), ...TEXT.npcs.beep.meet.map((l) => ['beep', l])];
      g.emit('dialog', { lines, id: 'peridot-post' });
      b.rescue();
    }
  },
  after(b, g) { b.pose = 'sleep'; b.lit = [false, false, false]; if (b.t % 150 === 1) g.emit('sfx', { name: 'gecko-snore', gain: 0.5, x: b.x }); },
  draw(b, c, r) {
    const t = b.game.frame;
    // lamp light (lit thirds) and darkness (pulled ones)
    for (let i = 0; i < 3; i++) {
      const x0 = i * 32 * T, lx = LAMPS[i] * T;
      if (b.lit[i] && !(i === 0 && b.flicker > 0 && (b.flicker >> 2) & 1)) { // [final-G] the first tug flickers it
        const gr = c.createRadialGradient(lx, 5 * T, 10, lx, 9 * T, 15 * T);
        gr.addColorStop(0, 'rgba(255,236,170,0.45)'); gr.addColorStop(1, 'rgba(255,236,170,0)');
        c.fillStyle = gr; c.fillRect(x0, 4 * T, 32 * T, 12 * T);
      } else { c.fillStyle = 'rgba(24,22,48,0.5)'; c.fillRect(x0, 0, 32 * T, 18 * T); }
    }
    // the lamps and their chains
    for (let i = 0; i < 3; i++) {
      const lx = LAMPS[i] * T, cx = CHAINS[i] * T, sw = Math.sin(t / 7) * b.swing[i] * 0.6;
      c.save(); c.strokeStyle = '#5A4632'; c.lineWidth = 3;
      c.fillStyle = b.lit[i] ? '#F7E7A8' : '#8C8AA8';
      c.beginPath(); c.moveTo(lx - 30, 4.6 * T); c.quadraticCurveTo(lx, 3.6 * T, lx + 30, 4.6 * T); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.arc(lx, 4.7 * T, 9, 0, 7); c.fillStyle = b.lit[i] ? '#FFF6D0' : '#6F7487'; c.fill(); c.stroke();
      // chain: beads down to a pull
      c.fillStyle = '#B9BDC4';
      for (let k = 0; k < 14; k++) { const y = 4.6 * T + k * 13, x = cx + sw * k / 14; c.beginPath(); c.arc(x, y, 2.6, 0, 7); c.fill(); }
      if (!r.drawProp(c, 'pull-chain', cx + sw, 9.6 * T, 0.9 * T)) { c.beginPath(); c.arc(cx + sw, 9.4 * T, 6, 0, 7); c.fill(); c.stroke(); }
      c.restore();
    }
    // Hump under the alarm (tapping), until he's home
    if (!b.done && r.drawCricketAt) r.drawCricketAt(c, 'hump', HUMP.x + HUMP.w / 2, HUMP.y + HUMP.h, -1, { look: Math.floor(t / 20) % 4 === 0 ? 'kick' : 'idle', scale: 0.9 });
    // Peridot: the rig, raised while she leaps
    if (!b.rig) { b.rig = Geckos.create('peridot'); Geckos.preload('peridot'); }
    if (b._wiggle) { b.rig.wiggle(b._wiggle); b._wiggle = 0; }
    if (!Geckos.ready('peridot')) return false;
    b.rig.setPose(b.pose);
    b.rig.draw(c, b.x, b.y - b.jy, b.rig.scaleFor(LEN), b.facing);
    if (b.mode === 'nap' || b.done || b.mode === 'yawn') {
      const a = (t % 120) / 120;
      c.save(); c.globalAlpha = Math.sin(a * Math.PI) * 0.8; c.fillStyle = '#F4EBDD'; c.font = `bold ${18 + 12 * a}px "Patrick Hand", sans-serif`;
      c.fillText('z', b.x - b.facing * 20 + 14 * a, b.y - 120 - 40 * a); c.restore();
    }
    return true;
  },
});
