// [builder A] Big Tok, tokay gecko (Kitchen, kit-sink): DISTRACT. Design: "The ten gecko
// encounters" 3 and house.js LAIRS.bigtok.
// He clings to the backsplash above the faucet. His "TO-KAY!" bellow sends a floor-level shockwave
// out along both counters (jump it; 1 heart) and slops the sink, shoving a raft back to the shore
// it came from. He bites anything that moves within his reach (the tell first; keep moving). Kick a
// decoy into the sink: he chomps it and his jaw is stuck for 5 s: no bellows, no bites.
//   Phase 1: kick the cork off the right counter; raft across while he chews; climb to ledge 1.
//   Phase 2: two shockwaves per bellow (a short and a tall one). Kick the wooden spoon off ledge 1
//            and climb the jars (in his reach) to ledge 2.
//   Phase 3: kick the sponge off ledge 2, climb to the top of the spice rack, kick Duo's jar loose
//            (rescue).
// Room: data/rooms/zone-03.js kit-sink. Counters at row 30 (left cols 2-23, right 38-61), the
// basin cols 24-37; the rack's shelves (safe, out of reach) at rows 26, 18, 10, cols 2-9.
import { TILE as T, DT, FPS } from '../../data/movement.js';
import { makeBoss } from './base.js';
import * as S from '../sprites.js';
import * as Geckos from '../geckos.js';
import { constant } from '../world.js'; // [issue 11] frozen module constants: a rewind shares them

const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const LEN = 560;                                   // drawn height (tall rig), px
const HOME = constant({ x: 31 * T, y: 18.5 * T });            // body centre on the backsplash
const COUNTER = 30 * T, BASIN = [24 * T, 38 * T];
const SHELF = constant([0, 26 * T, 18 * T, 10 * T]);         // phase goals: ledge 1, ledge 2, the top
const STUCK = 5 * FPS, WAVE = 9 * T;
const EVERY = constant([0, 4.5, 4, 3.5].map((s) => Math.round(s * FPS)));
const DECOYS = constant([
  null,
  { kind: 'cork', x: 39.5 * T, y: COUNTER, h: 0.9 * T },
  { kind: 'wooden-spoon', x: 9 * T, y: SHELF[1], h: 0.55 * T },
  { kind: 'sponge', x: 9 * T, y: SHELF[2], h: 0.9 * T },
]);
const JAR = constant({ x: 3.6 * T, y: SHELF[3] });
const reach = (p) => p.cx > 10 * T && p.cx < 52 * T;

export default makeBoss('bigtok', { postLines: true, // [playtest] base.rescue() emits geckos.<name>.post
  sfx: ['bigtok-bellow', 'gecko-chomp', 'gecko-growl', 'raft-splash'], // [issue 14] the recorded effects the fight plays (src/zone-sfx.js loads them with the zone)
  art: () => ({ props: DECOYS.filter(Boolean).map((d) => d.kind), crickets: { duo: ['idle'] } }), // [art] what the fight draws (room-art.js loads it before the lair shows)
 
  phases: 3, len: LEN,
  // [polish-V] the arena camera frames his head and shoulders (where he is drawn round his HOME)
  focus(b) { return b.gone ? null : { x0: b.x - LEN * 0.3, y0: b.y - LEN * 0.5 - 60, x1: b.x + LEN * 0.3, y1: b.y + LEN * 0.05 }; },
  start(b, g) {
    if (g.rescued.has(b.cricket)) { b.done = true; b.gone = true; return; }
    b.x = HOME.x; b.y = HOME.y; b.facing = 1; b.pose = 'idle';
    b.mode = 'watch'; b.mt = 0; b.cool = 60; b.bellowT = EVERY[b.phase]; b.stuck = 0; b.waves = []; b.head = null;
    const d = DECOYS[b.phase];
    b.decoy = { ...d, state: 'sit', vx: 0, vy: 0, rot: 0 };
    b.raftFrom = 0;
  },
  tick(b, g) {
    const p = g.player;
    const pb = { x: p.x + 3, y: p.y + 3, w: p.w - 6, h: p.h - 6 };
    const feet = p.y + p.h;
    const moving = Math.abs(p.vx) > 40 || !p.grounded;
    if (b.cool > 0) b.cool--;

    // ---- the decoy: kick it into the sink ----
    const d = b.decoy, kb = p.kickBox();
    if (d.state === 'sit' && kb && ov(kb, { x: d.x - 30, y: d.y - 40, w: 60, h: 40 })) {
      d.state = 'fly'; d.vy = -420; { const dy = COUNTER - d.y, tt = (-d.vy + Math.sqrt(d.vy * d.vy + 2 * 1100 * dy)) / 1100; d.vx = (31 * T - d.x) / tt; } g.emit('kick', { x: d.x, y: d.y - 20, dir: p.facing }); g.emit('bonk', { x: d.x, y: d.y - 20 });
    }
    if (d.state === 'fly') {
      d.vy += 1100 * DT; d.x += d.vx * DT; d.y += d.vy * DT; d.rot += 0.2;
      if (d.y >= COUNTER && d.x > BASIN[0] && d.x < BASIN[1]) { d.y = COUNTER; d.state = 'float'; g.emit('sfx', { name: 'raft-splash', gain: 0.6, x: d.x }); }
      else if (d.y > 36 * T) d.state = 'gone';
    }
    if (d.state === 'float' && b.mode !== 'chomp' && b.mode !== 'stuck') { b.mode = 'chomp'; b.mt = 16; b.pose = 'strike'; b.head = { x: d.x, y: d.y - 20 }; b.waves = []; }

    // ---- phase goals ----
    if (b.phase < 3 && p.grounded && Math.abs(feet - SHELF[b.phase]) < 4 && p.cx < 10 * T) {
      g.toast(['Ledge one! He can\'t reach you here.', 'Ledge two! Nearly there.'][b.phase - 1], 150);
      b.nextPhase(); return;
    }
    if (b.phase === 3 && kb && ov(kb, { x: JAR.x - 34, y: JAR.y - 60, w: 68, h: 60 })) { g.emit('switch', { id: 'bigtok-jar', x: JAR.x, y: JAR.y - 30 }); b.rescue(); return; }

    // ---- the shockwaves ----
    for (const w of b.waves) {
      w.x += w.dir * WAVE * DT; if (w.delay > 0) { w.delay--; w.x -= w.dir * WAVE * DT; }
      const box = { x: w.x - 0.5 * T, y: COUNTER - w.h, w: T, h: w.h };
      if (w.delay <= 0 && p.invuln === 0 && Math.abs(feet - COUNTER) < 6 && ov(box, pb)) b.hit(1, w.x - w.dir * T);
    }
    b.waves = b.waves.filter((w) => w.x > 1.5 * T && w.x < 62.5 * T);

    // ---- raft: remember which shore you set off from ----
    if (p.onRaft) { if (!b.raftFrom) b.raftFrom = p.cx > 31 * T ? 1 : -1; } else if (p.grounded) b.raftFrom = 0;

    switch (b.mode) {
      case 'watch': {
        b.pose = 'idle';
        if (--b.bellowT <= 0) { b.mode = 'puff'; b.mt = b.tell(b.x, b.y - LEN * 0.45); break; }
        if (moving && reach(p) && b.cool === 0) { b.mode = 'eye'; b.mt = b.tell(b.x, b.y - LEN * 0.45); }
        break;
      }
      case 'eye':   // the tell before a bite; the aim locks 12 frames before it lands
        if (b.mt === 12) b.aim = { x: p.cx, y: p.cy };
        if (--b.mt <= 0) {
          if (!b.aim) b.aim = { x: p.cx, y: p.cy };
          b.mode = 'bite'; b.mt = 10; b.pose = 'strike'; b.head = { ...b.aim }; g.emit('sfx', { name: 'gecko-chomp', gain: 0.7, x: b.aim.x });
        }
        break;
      case 'bite':
        if (--b.mt === 6 && p.invuln === 0 && Math.hypot(p.cx - b.aim.x, p.cy - b.aim.y) < 0.9 * T) b.hit(1, b.aim.x);
        if (b.mt <= 0) { b.mode = 'watch'; b.head = null; b.aim = null; b.cool = [0, 70, 55, 45][b.phase]; }
        break;
      case 'puff':  // TO-KAY!
        b.pose = 'idle';
        if (--b.mt <= 0) {
          g.emit('bellow', { x: b.x, y: b.y }); g.emit('sfx', { name: 'bigtok-bellow', gain: 0.9 });
          const hs = b.phase === 1 ? [[0.9 * T, 0]] : [[0.7 * T, 0], [1.6 * T, 30]];
          for (const [h, delay] of hs) { b.waves.push({ x: BASIN[0], dir: -1, h, delay }); b.waves.push({ x: BASIN[1], dir: 1, h, delay }); }
          if (p.onRaft) { p.vx = (b.raftFrom || 1) * 560; p.vy = -180; p.state = 'air'; g.toast('The sink sloshes you back!', 120); }
          b.mode = 'watch'; b.bellowT = EVERY[b.phase]; b.cool = 30; b.shout = 40;
        }
        break;
      case 'chomp': // lunges at the decoy
        if (--b.mt <= 0) { b.mode = 'stuck'; b.stuck = STUCK; d.state = 'chewed'; g.emit('sfx', { name: 'gecko-chomp', gain: 0.8, x: d.x }); g.toast('MMMF! His jaw is stuck. Go, go, go!', 160); }
        break;
      case 'stuck':
        b.pose = 'strike';
        if (--b.stuck <= 0) { b.mode = 'watch'; b.head = null; b.cool = 40; b.bellowT = Math.max(b.bellowT, 60); g.emit('sfx', { name: 'gecko-growl', gain: 0.6 }); g.toast('TO-KAY! ...Ptoo.', 120);
          if (b.phase < 3 || d.state === 'chewed') { const dd = DECOYS[b.phase]; b.decoy = { ...dd, state: 'sit', vx: 0, vy: 0, rot: 0 }; } }
        break;
      default: break;
    }
    if (b.shout > 0) b.shout--;
  },
  after(b) { b.pose = 'idle'; b.head = null; b.waves = []; },
  draw(b, c, r) {
    // the shockwaves: ink ripples running along the counters
    for (const w of b.waves || []) {
      if (w.delay > 0) continue;
      c.save(); c.strokeStyle = 'rgba(208,97,74,0.85)'; c.lineWidth = 5; c.beginPath();
      for (let i = -1; i <= 1; i++) { c.moveTo(w.x + i * 10 - 16, COUNTER); c.quadraticCurveTo(w.x + i * 10, COUNTER - w.h * (1 - Math.abs(i) * 0.3), w.x + i * 10 + 16, COUNTER); }
      c.stroke(); c.restore();
    }
    // the decoy
    const d = b.decoy;
    if (d && d.state !== 'gone' && d.state !== 'chewed') {
      const im = S.get(`props/${d.kind}.webp`);
      if (im) { const h = d.h, w = h * im.width / im.height; c.save(); c.translate(d.x, d.y - h / 2); c.rotate(d.rot); c.drawImage(im, -w / 2, -h / 2, w, h); c.restore(); }
      if (d.state === 'sit' && Math.floor((r?.t || 0) / 20) % 2) { c.save(); c.strokeStyle = '#F2C46D'; c.lineWidth = 3; c.beginPath(); c.arc(d.x, d.y - d.h / 2, 26, 0, 7); c.stroke(); c.restore(); }
    }
    // Duo behind his jar at the top of the rack
    if (!b.done && r) {
      r.drawCricketAt(c, 'duo', JAR.x, JAR.y, 1, { look: 'idle', scale: 0.9 });
      c.save(); c.globalAlpha = 0.45; c.fillStyle = '#E9F1EE'; c.strokeStyle = '#5A4632'; c.lineWidth = 2;
      c.beginPath(); c.roundRect ? c.roundRect(JAR.x - 30, JAR.y - 64, 60, 64, 10) : c.rect(JAR.x - 30, JAR.y - 64, 60, 64); c.fill(); c.stroke(); c.restore();
    }
    if (b.gone) return true;
    // [polish] render-only framing: he slides along the backsplash so his whole head stays in view
    // and below the HUD (the sim's HOME is where his bites and bellows come from; only the drawing moves)
    // [polish-V] inside the camera's safe band: below the HUD, left of the touch buttons
    const cam = b.game.camera, sf = cam.safe ? cam.safe() : { l: 0.03, r: 0.97, t: 0.18 }, top = cam.y + cam.vh * sf.t + LEN * 0.5 + 20, bot = cam.y + cam.vh - LEN * 0.32;
    const want = Math.max(Math.min(b.y, bot), Math.min(top, bot + LEN));
    b._dy = b._dy == null ? want : b._dy + (want - b._dy) * 0.08;
    const by = b._dy;
    const half = LEN * 0.3, wantX = Math.max(cam.x + cam.vw * sf.l + half, Math.min(cam.x + cam.vw * sf.r - half, b.x)); // [polish-V]
    b._dx = b._dx == null ? wantX : b._dx + (wantX - b._dx) * 0.08;
    const bx = b._dx;
    if (!b.rig) { b.rig = Geckos.create('bigtok'); Geckos.preload('bigtok'); }
    if (b._wiggle) { b.rig.wiggle(b._wiggle); b._wiggle = 0; }
    if (Geckos.ready('bigtok')) { b.rig.setPose(b.pose); b.rig.draw(c, bx, by, b.rig.scaleFor(LEN), b.facing); }
    // his head darts out to bite: a quick ink stroke from the body to the aim
    if (b.head && (b.mode === 'bite' || b.mode === 'chomp' || b.mode === 'stuck')) {
      c.save(); c.strokeStyle = 'rgba(90,70,50,0.6)'; c.lineWidth = 16; c.lineCap = 'round';
      c.beginPath(); c.moveTo(bx, by - LEN * 0.38); c.quadraticCurveTo((bx + b.head.x) / 2, by - LEN * 0.6, b.head.x, b.head.y); c.stroke();
      c.fillStyle = '#7C98C4'; c.beginPath(); c.ellipse(b.head.x, b.head.y, 22, 14, 0, 0, 7); c.fill(); c.restore();
    }
    if (b.shout > 0) { c.save(); c.globalAlpha = Math.min(1, b.shout / 20); c.fillStyle = '#D0614A'; c.font = 'bold 44px "Patrick Hand", sans-serif'; c.fillText('TO-KAY!', bx - 80, by - LEN / 2 - 16); c.restore(); }
    return true;
  },
});
