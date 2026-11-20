// Gargy, gargoyle gecko (Living Room, liv-lair): stun. Builder B.
// A grumpy couch potato lounging along the back of the sofa. If you're on a seat cushion near
// his head his tail tip wiggles (the tell) and he swats down: it knocks you off the sofa (1 heart).
// A throw pillow rests on some of the three cushions. Ground-pound (Thimble) a cushion and the
// pillows on the cushions NEXT to it fly up: if one hits him it's a soft "bonk" and he's dazed
// for 3 s. Never hurt, just bonked.
//   Phase 1: he lounges over the middle cushion (one pillow, on it). Pound a side cushion. (1 bonk)
//   Phase 2: he rolls along the back after you and swats twice. Two pillows, on the side cushions:
//            lure him over one, then pound the middle. (2 bonks)
//   Phase 3: grumpy: he shoves cushions so they bounce you high (dynamic springs). A third bonk
//            and he sulks off to the armchair; Jam pops out of the TV remote (rescue).
// Room: game/data/rooms/zone-06.js liv-lair (64x18): cushions on row 14 (springs), back top row 7.
import { TILE as T, DT, FPS } from '../../data/movement.js';
import { TEXT } from '../../data/text.js';
import { makeBoss } from './base.js';
import * as Geckos from '../geckos.js';
import { constant } from '../world.js'; // [issue 11] frozen module constants: a rewind shares them

const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const LEN = 360, BACK = 7 * T, SEAT = 14 * T;
const CUSH = constant([{ x0: 15, x1: 24 }, { x0: 26, x1: 35 }, { x0: 37, x1: 46 }].map((c) => ({ ...c, cx: (c.x0 + c.x1 + 1) / 2 * T })));
const PILLOWS = constant({ 1: [1], 2: [0, 2], 3: [0, 1, 2] });
const DAZED = 3 * FPS;
const REMOTE = constant({ x: 49.8 * T, y: 13 * T });

const head = (b) => b.x + b.facing * LEN * 0.4;

export default makeBoss('gargy', {
  sfx: ['gecko-growl', 'pillow-bonk'], // [issue 14] the recorded effects the fight plays (src/zone-sfx.js loads them with the zone)
  art: () => ({ props: ['throw-pillow', 'tv-remote'], crickets: { jam: ['idle', 'chirp'] } }), // [art] what the fight draws (room-art.js loads it before the lair shows)
  phases: 3, len: LEN,
  start(b, g) {
    b.y = BACK; b.x = [0, 31, 31, 31][b.phase] * T; b.facing = -1;
    b.mode = 'lounge'; b.mt = 60; b.cool = 60; b.daze = 0; b.pose = 'idle'; b.swats = 0;
    b.pillows = PILLOWS[b.phase].map((i) => ({ home: i, x: CUSH[i].cx, y: SEAT, vy: 0, state: 'rest' }));
    b.once = false; b.side1 = -1; b.saidSide = false; b.bonks = b.phase - 1; b.shoveT = 120; b.shoved = -1; b.alpha = 1;
    for (const s of g.mech?.springs || []) if (s.y === 14) s.power = 4;
    if (g.rescued.has(b.cricket)) { b.done = true; b.dozing = true; b.mode = 'sulk'; b.pose = 'sleep'; return; } // [final-2] Jam is free: no refight, he dozes on the sofa back
  },
  tick(b, g) {
    const p = g.player;
    const pb = { x: p.x + 3, y: p.y + 3, w: p.w - 6, h: p.h - 6 };
    if (b.cool > 0) b.cool--;

    // ---- pounds: the pillows on the neighbouring cushions fly up ----
    for (const e of g.fx) {
      if (e.f !== g.frame || e.type !== 'pound') continue;
      const ci = CUSH.findIndex((c) => e.d.x >= c.x0 * T - 6 && e.d.x <= (c.x1 + 1) * T + 6 && Math.abs(e.d.y - SEAT) < 10);
      if (ci < 0) continue;
      // [final-G] phase 1's second bonk must come from the other side cushion (past his swat)
      if (b.phase === 1 && b.once && ci === b.side1) { if (!b.saidSide) { b.saidSide = true; g.toast(TEXT.geckos.gargy.otherSide, 150); } continue; }
      b.lastPound = ci;
      g.emit('sfx', { name: 'pillow-bonk', gain: 0.4, rate: 0.8, x: e.d.x });
      for (const pl of b.pillows) if (pl.state === 'rest' && Math.abs(pl.home - ci) === 1) { pl.state = 'fly'; pl.vy = -980; }
    }
    for (const pl of b.pillows) {
      if (pl.state === 'fly' || pl.state === 'fall') {
        pl.vy += 1800 * DT; pl.y += pl.vy * DT;
        const body = { x: b.x - LEN * 0.32, y: b.y - 70, w: LEN * 0.64, h: 70 };
        if (pl.state === 'fly' && b.mode !== 'sulk' && ov({ x: pl.x - 24, y: pl.y - 40, w: 48, h: 40 }, body)) {
          pl.state = 'fall'; pl.vy = 120; b.bonks++; b.daze = DAZED; b.mode = 'dazed'; b.pose = 'sleep';
          g.emit('sfx', { name: 'pillow-bonk', gain: 1 }); g.emit('bonk', { x: pl.x, y: pl.y });
          // [final-G] phase 1 takes two bonks (the middle fight was over in 3 s)
          if (b.phase === 1 && !b.once) { b.once = true; b.side1 = b.lastPound; b.bonks--; b.daze = FPS; g.toast(TEXT.geckos.gargy.again, 150); }
          else if (b.bonks >= b.phase) {
            if (b.phase < 3) { b.nextPhase(); return; }
            b.mode = 'sulk'; b.pose = 'walk'; b.facing = 1;
            g.emit('dialog', { lines: [...TEXT.geckos.gargy.post.map((l) => ['gargy', l]), ['jam', TEXT.crickets.jam.thanks]], id: 'gargy-post' });
            b.rescue();
            return;
          }
        }
        if (pl.vy > 0 && pl.y >= SEAT) { pl.y = SEAT; pl.vy = 0; pl.state = 'rest'; pl.x = CUSH[pl.home].cx; }
        if (pl.y < 2 * T) { pl.state = 'fall'; pl.vy = Math.max(pl.vy, 0); }
      }
    }

    // ---- phase 3: he shoves a cushion so it bounces you high ----
    if (b.phase === 3 && b.mode !== 'dazed') {
      if (--b.shoveT <= 0) {
        const springs = (g.mech?.springs || []).filter((s) => s.y === 14);
        for (const s of springs) s.power = 4;
        b.shoved = Math.floor(b.rng() * 3); b.shoveT = 150;
        const s = springs.find((x) => x.x === CUSH[b.shoved].x0);
        if (s) { s.power = 8; g.emit('sfx', { name: 'pillow-bonk', gain: 0.5, rate: 0.6, x: CUSH[b.shoved].cx }); }
      }
    }

    // ---- what he does ----
    const onSeat = p.y + p.h <= SEAT + 2 && p.y + p.h > 9 * T && p.cx > 14 * T && p.cx < 48 * T && !p.hidden;
    switch (b.mode) {
      case 'lounge': {
        b.pose = 'idle';
        const want = b.phase === 1 ? 31 * T + Math.sin(g.frame / 90) * 3 * T : Math.max(19 * T, Math.min(43 * T, p.cx));
        const d = want - b.x, v = (b.phase === 1 ? 0.8 : 2.2) * T * DT;
        if (Math.abs(d) > 4) { b.x += Math.sign(d) * Math.min(Math.abs(d), v); b.pose = 'walk'; }
        if (b.phase > 1 && Math.abs(p.cx - b.x) > 8) b.facing = Math.sign(p.cx - b.x);
        if (b.cool <= 0 && onSeat && Math.abs(p.cx - head(b)) < 3.2 * T) {
          b.facing = Math.sign(p.cx - b.x) || b.facing;
          b.mode = 'tell'; b.mt = b.tell(head(b), b.y + 10); b.swats = b.phase >= 2 ? 2 : 1;
        }
        break;
      }
      case 'tell': b.pose = 'idle'; if (--b.mt <= 0) { b.mode = 'swat'; b.mt = 18; b.pose = 'strike'; g.emit('sfx', { name: 'gecko-growl', gain: 0.5, x: head(b) }); } break;
      case 'swat': {
        const paw = { x: head(b) - 1.8 * T, y: b.y + 20, w: 3.6 * T, h: SEAT - b.y - 10 };
        if (!p.hidden && p.invuln === 0 && ov(paw, pb) && b.hit(1, head(b))) { p.vx = Math.sign(p.cx - head(b)) * 380 || 380; p.vy = -380; }
        if (--b.mt <= 0) {
          if (--b.swats > 0) { b.mode = 'tell'; b.mt = 26; b.pose = 'idle'; }
          else { b.mode = 'lounge'; b.cool = 70; }
        }
        break;
      }
      case 'dazed': b.pose = 'sleep'; if (--b.daze <= 0) { b.mode = 'lounge'; b.cool = 40; } break;
      default: break;
    }
  },
  after(b) { // sulks off to the armchair
    if (b.dozing) { b.pose = 'sleep'; return; } // [final-2]
    b.pose = 'walk'; b.facing = 1; b.x += 2 * T * DT; b.alpha = Math.max(0, b.alpha - 0.006);
  },
  draw(b, c, r) {
    const t = b.game.frame;
    // pillows
    for (const pl of b.pillows || []) {
      const rot = pl.state === 'rest' ? 0 : t * 0.25;
      if (!r.drawProp(c, 'throw-pillow', pl.x, pl.y + 4, 1.5 * T, { rot })) { c.fillStyle = '#E8964A'; c.fillRect(pl.x - 26, pl.y - 40, 52, 40); }
    }
    // the shoved cushion: a wobble mark
    if (b.phase === 3 && b.shoved >= 0 && !b.done) {
      const cx = CUSH[b.shoved].cx, a = 0.5 + 0.5 * Math.sin(t / 4);
      c.save(); c.strokeStyle = `rgba(110,74,94,${a})`; c.lineWidth = 3;
      for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(cx + k * 60 - 14, SEAT - 6); c.quadraticCurveTo(cx + k * 60, SEAT - 22, cx + k * 60 + 14, SEAT - 6); c.stroke(); }
      c.restore();
    }
    // the TV remote with Jam stuck in the battery slot
    r.drawProp(c, 'tv-remote', REMOTE.x, REMOTE.y, 0.9 * T, { rot: -0.15 });
    if (!b.done && r.drawCricketAt) r.drawCricketAt(c, 'jam', REMOTE.x + 6, REMOTE.y - 14, -1, { look: Math.floor(t / 40) % 3 === 0 ? 'chirp' : 'idle', scale: 0.75 });
    // Gargy
    if (!b.rig) { b.rig = Geckos.create('gargy'); Geckos.preload('gargy'); }
    if (b._wiggle) { b.rig.wiggle(b._wiggle); b._wiggle = 0; }
    if (!Geckos.ready('gargy')) return false;
    c.save(); c.globalAlpha *= b.alpha ?? 1;
    b.rig.setPose(b.pose);
    if (b.mode === 'swat') { c.translate(head(b), b.y); c.rotate(b.facing * 0.35); c.translate(-head(b), -b.y); }
    b.rig.draw(c, b.x, b.y, b.rig.scaleFor(LEN), b.facing);
    c.restore();
    if (b.mode === 'dazed') { // little stars round his head (a soft bonk, never hurt)
      const hx = head(b), hy = b.y - 60;
      c.save(); c.fillStyle = '#F2C46D'; c.strokeStyle = '#5A4632'; c.lineWidth = 1.5;
      for (let k = 0; k < 3; k++) { const a = t / 12 + k * 2.1, x = hx + Math.cos(a) * 34, y = hy + Math.sin(a) * 10; star(c, x, y, 7); }
      c.restore();
    }
    return true;
  },
});

function star(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fill(); c.stroke();
}
