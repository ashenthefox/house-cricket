// Mossy, the leaf-tailed gecko (Study, stu-lair): hide and seek. Builder C.
// Design: GAME_DESIGN "The ten gecko encounters" 7, house.js LAIRS.mossy, design/zones/z07.md.
//
// He lies camouflaged (drawn at 10% alpha) in one of the arena's hiding places (entity `spots`:
// [[x, y, facing], ...] = the tile row he lies in). A chirp (the arena's fixed chirp: 6 tiles)
// that reaches him makes his eyes shine back for 1 s (+ an echo blip). Touch or kick him during
// the glint: a TAG (no damage either way). Outside a glint, bumping into him costs a heart.
// After a tag he scurries to another spot (3 / 2 / 1.5 s, visible while he runs).
//   Phase 1: low spots. Ends: tag 1.
//   Phase 2: relocates faster and prefers the high shelves. Ends: tag 2.
//   Phase 3: he also slips away on his own (twice between your chirps), and if you pass his
//            spot without seeing him he strikes (tell first). Ends: tag 3; he concedes, opens
//            Rin's bamboo cage.
// Deterministic (b.rng is seeded per phase); no DOM in tick.
import { TILE, FPS } from '../../data/movement.js';
import { makeBoss } from './base.js';
import * as Geckos from '../geckos.js';
import * as S from '../sprites.js';
import { constant } from '../world.js'; // [issue 11] frozen module constants: a rewind shares them

const LEN = 190;                                  // nose-to-tail px on screen (he fits a shelf)
const GLINT = constant({ normal: 1.0, gentle: 1.5 });       // s
const RELOCATE = constant([3, 2, 1.5]);                     // s per phase
const ALPHA = constant({ hidden: 0.1, gentleHidden: 0.16, moving: 0.45 });
const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

function spotsOf(b) {
  const list = b.e.spots || [[b.e.x, b.e.y, -1]];
  return list.map(([x, y, f]) => ({ x: (x + 0.5) * TILE, y: (y + 1) * TILE, f: f || -1, ty: y }));
}
function bodyBox(b) { return { x: b.x - 46, y: b.y - 34, w: 92, h: 34 }; }

// pick a hiding place: away from the player, not the current one; phase 2 likes it high up
function pickSpot(b, g) {
  const p = g.player, all = spotsOf(b);
  let cands = all.filter((s) => s !== b.spot && Math.hypot(s.x - p.cx, s.y - p.cy) > 5 * TILE && !(b.spot && s.x === b.spot.x && s.y === b.spot.y));
  if (b.phase === 1) cands = cands.filter((s) => s.ty >= 21).length ? cands.filter((s) => s.ty >= 21) : cands;
  if (b.phase === 2) cands = cands.filter((s) => s.ty <= 21).length ? cands.filter((s) => s.ty <= 21) : cands;
  if (!cands.length) cands = all.filter((s) => s !== b.spot);
  return cands[Math.floor(b.rng() * cands.length) % cands.length];
}
function moveTo(b, g, spot, secs) {
  b.from = { x: b.x, y: b.y }; b.to = spot; b.spot = spot;
  b.mode = 'move'; b.mt = 0; b.mdur = Math.max(20, Math.round(secs * FPS));
  b.facing = Math.sign(spot.x - b.x) || spot.f;
  g.emit('sfx', { name: 'swish', gain: 0.5, x: b.x });
}

export default makeBoss('mossy', {
  sfx: ['gecko-chomp', 'pillow-bonk'], // [issue 14] the recorded effects the fight plays (src/zone-sfx.js loads them with the zone)
  art: (e, o) => ({ props: ['bamboo-cage'], crickets: { [o.cricket || 'rin']: ['idle', 'listen'] } }), // [art] what the fight draws (room-art.js loads it before the lair shows)
  phases: 3, len: LEN,
  // [polish-V] the arena camera frames him only while he can be seen (it must not give a hiding place
  // away), and for a first look as the fight starts
  focus(b) {
    const seen = b.mode === 'move' || b.glintT > 0 || b.mode === 'tell' || b.mode === 'strike' || (b.phase === 1 && b.t < 150);
    return seen ? b.rig?.lastBox || { x0: b.x - LEN / 2, y0: b.y - 90, x1: b.x + LEN / 2, y1: b.y } : null;
  },
  start(b, g) {
    b.glintT = 0; b.cool = 0; b.selfMove = 0; b.lastChirpF = -1;
    b.cage = b.e.cage ? { x: (b.e.cage[0] + 0.5) * TILE, y: (b.e.cage[1] + 1) * TILE } : null;
    if (b.phase === 1 && !b.spot) { const s = spotsOf(b)[0]; b.x = s.x; b.y = s.y; b.spot = s; b.facing = s.f; }
    if (g.rescued.has(b.cricket)) { b.done = true; b.mode = 'concede'; b.pose = 'sleep'; return; } // [final-2] Rin is free: no refight, he sleeps in plain sight
    // every phase begins with him slipping off to a fresh hiding place (after a tag: that
    // phase's relocation time; on a restart: quickly)
    moveTo(b, g, pickSpot(b, g), b.fromTag ? RELOCATE[b.phase - 2] : 1.2);
    b.fromTag = false;
    b.pose = 'walk';
  },
  tick(b, g) {
    const p = g.player;
    const glintLen = Math.round((g.gentle ? GLINT.gentle : GLINT.normal) * FPS);
    // chirps this step (the arena's fixed chirp radius)
    for (const e of g.fx) {
      if (e.f !== g.frame || e.type !== 'chirp' || e.f === b.lastChirpF) continue;
      b.lastChirpF = e.f;
      if (b.mode === 'move') continue;
      const r = b.chirp.radius;
      if (Math.hypot(e.d.x - b.x, e.d.y - (b.y - 16)) <= r) {
        b.glintT = glintLen; b.pose = 'idle';
        g.emit('sfx', { name: 'chime', gain: 0.7, x: b.x });   // the echo blip
        g.emit('glint', { x: b.x, y: b.y - 20 });
        if (b.mode === 'tell') { b.mode = 'hide'; b.tellUntil = -1; }
      }
      if (b.phase === 3) b.selfMove = (b.selfMove || 0) + 1;     // two slips per chirp interval
    }
    if (b.glintT > 0) b.glintT--;
    const box = bodyBox(b);
    b.box = box;
    const pb = { x: p.x + 3, y: p.y + 3, w: p.w - 6, h: p.h - 6 };

    if (b.mode === 'move') {
      b.mt++;
      const k = Math.min(1, b.mt / b.mdur), e = k * k * (3 - 2 * k);
      b.x = b.from.x + (b.to.x - b.from.x) * e;
      b.y = b.from.y + (b.to.y - b.from.y) * e - Math.sin(k * Math.PI) * Math.min(160, Math.abs(b.to.x - b.from.x) * 0.25 + 40);
      b.pose = 'walk';
      if (k >= 1) {
        b.x = b.to.x; b.y = b.to.y; b.facing = b.to.f; b.mode = 'hide'; b.pose = 'idle';
        b.cool = 40; b.idleT = 0;
      }
      return;
    }

    if (b.mode === 'hide' || b.mode === 'tell' || b.mode === 'strike') {
      // a tag: touch or kick him while his eyes shine
      const kb = p.kickBox();
      if (b.glintT > 0 && (ov(pb, box) || (kb && ov(kb, box)))) {
        b.glintT = 0;
        g.emit('tag', { x: b.x, y: b.y - 20 });
        g.emit('sfx', { name: 'pillow-bonk', gain: 0.9, x: b.x });
        if (b.phase >= b.phases) {           // he concedes
          b.mode = 'concede'; b.pose = 'idle'; b.mt = 0;
          return;
        }
        b.fromTag = true; b.nextPhase();
        return;
      }
      // bumping into a camouflaged gecko: a heart, as usual
      if (b.glintT === 0 && p.invuln === 0 && !p.hidden && ov(pb, box)) b.hit(1, b.x);
    }

    if (b.mode === 'hide') {
      b.idleT = (b.idleT || 0) + 1;
      if (b.cool > 0) b.cool--;
      if (b.phase === 3) {
        // slips away on his own: twice between chirps (and every 6 s anyway)
        if (b.glintT === 0 && ((b.selfMove >= 1 && b.idleT > 50) || b.idleT > 6 * FPS)) { b.selfMove = Math.max(0, b.selfMove - 1); moveTo(b, g, pickSpot(b, g), RELOCATE[2]); return; }
        // you walk past his spot without seeing him: tell, then strike
        if (b.cool === 0 && b.glintT === 0 && !p.hidden && Math.abs(p.cx - b.x) < 2.6 * TILE && Math.abs(p.y + p.h - b.y) < TILE * 0.6) {
          b.mode = 'tell'; b.mt = b.tell(b.x - b.facing * 60, b.y - 30); b.aim = p.cx;
          b.facing = Math.sign(p.cx - b.x) || b.facing;
        }
      }
    } else if (b.mode === 'tell') {
      if (--b.mt <= 0) { b.mode = 'strike'; b.mt = 18; b.pose = 'strike'; b.sx = b.x; g.emit('sfx', { name: 'gecko-chomp', gain: 0.8, x: b.x }); }
    } else if (b.mode === 'strike') {
      const k = 1 - b.mt / 18;
      b.x = b.sx + b.facing * Math.sin(k * Math.PI) * 1.6 * TILE;
      if (p.invuln === 0 && !p.hidden && ov(pb, { x: b.x - 50, y: b.y - 36, w: 100, h: 36 })) b.hit(1, b.x);
      if (--b.mt <= 0) { b.x = b.sx; b.mode = 'hide'; b.pose = 'idle'; b.cool = 90; }
    } else if (b.mode === 'concede') {
      b.mt++;
      // a beat for the "found you" moment, then he opens the cage and says so (same step:
      // the dialog pauses the sim, so nothing else may follow it)
      if (b.mt === 30) { b.rescue(); g.emit('dialog', { key: 'geckos.mossy.post' }); }
    }
  },
  after(b) { b.pose = 'sleep'; },
  draw(b, c, renderer) {
    const t = renderer.t || 0;
    // Rin's bamboo cage, hanging at the top (open once she's free)
    if (b.cage) {
      const cx = b.cage.x, cy = b.cage.y;
      c.save(); c.strokeStyle = 'rgba(90,70,50,0.8)'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, 40); c.lineTo(cx, cy - 64); c.stroke(); c.restore();
      if (!b.done) renderer.drawCricketAt(c, b.cricket || 'rin', cx, cy - 6, -1, { look: Math.floor(t / 90) % 2 ? 'listen' : 'idle', t, scale: 0.8 });
      const img = S.get('props/bamboo-cage.png');
      if (img) {
        const h = 72, w = h * img.width / img.height;
        c.save(); c.translate(cx, cy - 36); c.rotate(Math.sin(t / 50) * 0.04 + (b.done ? 0.5 : 0)); c.globalAlpha = b.done ? 0.85 : 1;
        c.drawImage(img, -w / 2, -36, w, h); c.restore();
      }
    }
    // the gecko: camouflaged (10%), clearer while he scurries, fully seen in a glint or after the game
    const gentle = b.game.gentle;
    let alpha = gentle ? ALPHA.gentleHidden : ALPHA.hidden;
    if (b.mode === 'move') alpha = ALPHA.moving;
    if (b.glintT > 0) alpha = Math.max(alpha, 0.55);
    if (b.mode === 'tell' || b.mode === 'strike') alpha = 0.7;
    if (b.mode === 'concede' || b.done) alpha = 1;
    if (!b.rig) { b.rig = Geckos.create('mossy'); }
    if (b._wiggle) { b.rig.wiggle(b._wiggle); b._wiggle = 0; }
    const rig = b.rig;
    if (Geckos.ready('mossy')) {
      rig.setPose(b.done ? 'sleep' : b.pose); rig.alpha = alpha; rig.walkSpeed = 2.4;
      const s = rig.scaleFor(LEN);
      rig.draw(c, b.x, b.y, s, b.facing);
      // the eyes shine back
      if (b.glintT > 0) {
        const e = rig.point('eye', b.x, b.y, s, b.facing), k = b.glintT / 60;
        const gl = c.createRadialGradient(e.x, e.y, 1, e.x, e.y, 26 + 8 * Math.sin(t / 3));
        gl.addColorStop(0, `rgba(255,250,200,${0.95 * Math.min(1, k + 0.3)})`); gl.addColorStop(0.35, `rgba(242,196,109,${0.6 * Math.min(1, k + 0.3)})`); gl.addColorStop(1, 'rgba(242,196,109,0)');
        c.fillStyle = gl; c.beginPath(); c.arc(e.x, e.y, 34, 0, 7); c.fill();
        c.fillStyle = '#FFFBE6'; c.beginPath(); c.arc(e.x, e.y, 4, 0, 7); c.fill();
      }
      return true;
    }
    // shapes until the art loads
    c.save(); c.globalAlpha = alpha; c.fillStyle = '#8A7A4A'; c.beginPath(); c.ellipse(b.x, b.y - 16, 46, 16, 0, 0, 7); c.fill(); c.restore();
    if (b.glintT > 0) { c.fillStyle = '#FFF6C8'; c.beginPath(); c.arc(b.x + b.facing * 34, b.y - 22, 6, 0, 7); c.fill(); }
    return true;
  },
});
