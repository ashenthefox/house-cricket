// Sir Bartholomew, bearded dragon (the optional Dragon's Lair; design: "The Dragon's Lair",
// house.js LAIRS.barty). Builder C. Not a fight you win: you hide, you climb, then you WAVE.
//
// He is far too big for the screen, so only parts of him are drawn (sprites/npcs/barty-*.png):
//   phase 1  a golden eye in the gloom, its gaze sweeping a cone over the hoard (eyeSweep 3 s).
//            Seen in the open = he hisses (1 heart, blown back). Chirping gives you away (he
//            hears it: a tell, then the hiss finds you even under a cap). Ends: tier 2.
//   phase 2  his head (beard black) and his claw: the claw lifts (the tell, 1 s) at your height,
//            then sweeps the hoard right to left. Duck under a cap or into a coin gap. Ends: the
//            top of the hoard.
//   phase 3  in plain view on the summit he stares, beard black. Wave: hold Listen and press
//            Kick. He waves back, his beard pales, "...Nobody ever waves." Reward: the
//            Cellophane Cloak; he befriends you (meta.barty: the Carrier's hoard corner).
// Entity: { type:'boss', boss:'barty', x, y, checkpoints:[[x,y] x3] } in dragon-lair (3x2).
import { TILE as T, DT } from '../../data/movement.js';
import { TEXT } from '../../data/text.js';
import { makeBoss } from './base.js';
import * as S from '../sprites.js';
import { ensure } from '../meta.js';
import { constant } from '../world.js'; // [issue 11] frozen module constants: a rewind shares them

const IMG = constant({ eye: 'sprites/npcs/barty-eye.png', head: 'sprites/npcs/barty-head.png', black: 'sprites/npcs/barty-head-black.png', claw: 'sprites/npcs/barty-claw.png' });
// Tile geometry of dragon-lair (tools/make-lair.py)
const TIER2 = { feet: 28, x0: 38 };          // stand row 27: feet at the top of row 28
const TOP = constant({ feet: 20, x0: 70, x1: 79 });    // the summit: feet at the top of row 20
const HEAD = constant({ left: 77 * T, w: 1000 });      // head image placement (eye at 0.37 w, 0.2 h)
const E = constant({ x: HEAD.left + 0.37 * HEAD.w, y: 13.5 * T });
const HALF = 3 * T;                          // half-width of the patch of hoard his gaze lights (px)
const SWEEP = 180;                           // frames for one pass of the gaze (eyeSweep 3 s)
const CLAW_V = 20 * T;                       // px/s
const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const lines = (k) => TEXT.npcs.barty[k];
// the surface (feet y, px) of the hoard at a column, for drawing the gaze (tools/make-lair.py tops)
const SURF = constant([[0, 34], [30, 32], [34, 30], [38, 28], [58, 26], [62, 24], [66, 22], [70, 20]]);
const surfaceAt = (x) => { let y = 34; for (const [c, r] of SURF) if (x >= c * T) y = r; return y * T; };

function feet(p) { return p.y + p.h; }
// The gaze: a patch of light (where his eye is looking) sweeping along the hoard, from tier 2 out
// to the door and back (one pass = eyeSweep 3 s): returns its centre x (px).
export function gazeAt(sweepT) {
  const x0 = 9 * T, x1 = 58 * T; // the doorway (x < 6) is out of his sight: a place to watch first
  return x0 + (x1 - x0) * (0.5 + 0.5 * Math.cos((Math.PI * sweepT) / SWEEP));
}
const gazeAngle = (b) => gazeAt(b.sweepT);
export const EYE = E, GAZE_HALF = HALF;

export default makeBoss('barty', {
  art: () => ({ props: Object.values(IMG) }), // [art] what the fight draws (room-art.js loads it before the lair shows)
  phases: 3, len: 900,
  focus() { return { x0: E.x - 230, y0: E.y - 150, x1: E.x + 230, y1: E.y + 130 }; }, // [polish-V] the arena camera frames his eye
  start(b, g) {
    b.beard = false; b.spotT = 0; b.cool = 60; b.sweepT = 0; b.hearT = 0; b.waveF = -1; b.say = 240;
    b.mode = b.phase === 1 ? 'search' : b.phase === 2 ? 'rest' : 'watch';
    b.mt = b.phase === 2 ? 90 : 0;
    b.claw = null;
    if (b.phase === 2) g.toast(lines('sweep')[0], 150);
    if (g.player.has('cloak')) { b.done = true; b.friend = true; b.mode = 'friend'; }
  },
  tick(b, g) {
    const p = g.player;
    // [fixer] a hiss or claw blows you back, but never out through the arena door (left edge)
    if (p.invuln > 0 && p.x < 1.5 * T) { p.x = 1.5 * T; if (p.vx < 0) p.vx = 0; }
    const pb = { x: p.x + 4, y: p.y + 4, w: p.w - 8, h: p.h - 8 };
    const chirped = g.lastCall === g.frame;
    if (b.cool > 0) b.cool--;
    if (b.spotT > 0) b.spotT--;
    b.beard = b.mode === 'waveBack' || b.mode === 'friend' ? false : b.phase >= 2 || b.spotT > 0 || b.mode === 'hear';

    if (b.phase === 1) {
      if (b.mode === 'search') {
        b.sweepT++;
        b.gaze = gazeAngle(b);
        if (--b.say <= 0) { b.say = 420; g.toast(lines('search')[(b.sweepT / 420 | 0) % 3], 140); }
        if (chirped) { b.mode = 'hear'; b.mt = b.tell(E.x - 120, E.y + 60); b.gaze = b.gaze ?? gazeAngle(b); }
        else if (b.cool === 0 && !p.hidden && p.cx < 84 * T) {
          if (Math.abs(p.cx - b.gaze) < HALF) { // spotted in the open: the hiss
            b.spotT = 70; b.cool = 100;
            g.emit('sfx', { name: 'dragon-hiss', x: E.x, gain: 1 });
            g.emit('bellow', {});
            b.hit(1, E.x);
          }
        }
      } else if (b.mode === 'hear') { // he heard your chirp: the gaze swings to you, then the hiss
        b.gaze += (p.cx - b.gaze) * 0.12;
        if (--b.mt <= 0) {
          b.spotT = 70; b.cool = 100; b.mode = 'search';
          g.emit('sfx', { name: 'dragon-hiss', x: E.x, gain: 1 }); g.emit('bellow', {});
          b.hit(1, E.x);
        }
      }
      if (p.grounded && feet(p) <= TIER2.feet * T + 1 && p.cx >= TIER2.x0 * T) b.nextPhase();
      return;
    }

    if (b.phase === 2) {
      if (b.mode === 'rest') {
        if (chirped) b.mt = Math.min(b.mt, 1);
        if (--b.mt <= 0) { // the claw lifts at your height: the tell
          const y = Math.min(feet(p), 34 * T);
          b.claw = { x: 90 * T, y, lift: true };
          b.mode = 'lift'; b.mt = b.tell(90 * T, y - 3 * T);
          g.emit('sfx', { name: 'gecko-growl', x: 90 * T, gain: 0.8, rate: 0.7 });
        }
      } else if (b.mode === 'lift') {
        if (--b.mt <= 0) { b.mode = 'sweep'; b.claw.lift = false; g.emit('sfx', { name: 'whoosh', x: b.claw.x, gain: 0.9 }); }
      } else if (b.mode === 'sweep') {
        const c = b.claw;
        c.x -= CLAW_V * DT;
        const box = { x: c.x, y: c.y - 2.5 * T, w: 4 * T, h: 2.5 * T };
        if (!p.hidden && p.invuln === 0 && ov(box, pb)) b.hit(1, c.x + 4 * T);
        if (c.x < 28 * T) { b.mode = 'rest'; b.mt = 110 + (b.rng() * 50 | 0); b.claw = null; }
      }
      if (p.grounded && feet(p) <= TOP.feet * T + 1 && p.cx >= TOP.x0 * T && p.cx <= TOP.x1 * T) b.nextPhase();
      return;
    }

    // phase 3: the wave
    if (b.mode === 'watch') {
      const onTop = p.state === 'ground' && feet(p) <= TOP.feet * T + 1 && p.cx >= TOP.x0 * T && p.cx <= TOP.x1 * T;
      const kicked = g.fx.some((e) => e.f === g.frame && e.type === 'kick');
      if (onTop && kicked && p.listening && !p.hidden) {
        b.mode = 'waveBack'; b.mt = 110; b.waveF = g.frame;
        g.emit('sfx', { name: 'crinkle', x: E.x, gain: 0.6, rate: 0.8 });
        g.toast(TEXT.npcs.barty.wave, 150);
      } else if (kicked && onTop && !p.listening) {
        g.toast('A kick? How rude. (Hold {listen} too: a slow, polite wave.)', 150);
      }
    } else if (b.mode === 'waveBack') {
      if (--b.mt <= 0) {
        b.mode = 'friend';
        // the Cloak: an item card like a pickup (game.give would rebuild the room and this fight)
        if (!p.has('cloak')) { p.give('cloak'); g.card = { item: 'cloak', f: g.frame }; g.hold = 40; g.emit('item', { item: 'cloak', x: p.cx, y: p.y }); }
        g.emit('dialog', { lines: lines('after').map((t) => ['barty', t]), id: 'barty-after' });
        ensure(g).barty = true; // befriended: the Carrier's hoard corner (he is far too big to move in)
        g.emit('recruit', { id: 'barty' }); // [fixer] meta-run: the gift toast and an autosave
        // [polish-T] the gift toast is meta-run's (recruit): one toast, not two
        g.levelComplete = true; b.done = true; b.friend = true;
      }
    }
  },
  after(b) { b.beard = false; },

  // ---------------------------------------------------------------- drawing (render only)
  draw(b, c, r) {
    const t = r.t, g = b.game, p = g.player;
    const img = (k) => S.get(IMG[k]);
    for (const k in IMG) img(k); // start loading every part
    c.save();
    // the basking lamp's pool of warm light over the summit
    const lx = 76 * T, ly = 2 * T;
    const lamp = c.createRadialGradient(lx, ly + 300, 30, lx, ly + 300, 760);
    lamp.addColorStop(0, 'rgba(255,190,110,0.30)'); lamp.addColorStop(1, 'rgba(255,170,90,0)');
    c.fillStyle = lamp; c.fillRect(lx - 800, ly, 1600, 1100);
    c.fillStyle = '#3A2A1E'; c.beginPath(); c.ellipse(lx, ly + 150, 70, 34, 0, Math.PI, 0); c.fill();
    c.fillStyle = 'rgba(255,214,140,0.95)'; c.beginPath(); c.ellipse(lx, ly + 152, 46, 12, 0, 0, 7); c.fill();

    const bob = b.friend ? Math.sin(t / 40) * 6 : b.phase === 1 ? (Math.floor(t / 150) % 2 ? Math.abs(Math.sin(t / 6)) * 18 : 0) : Math.abs(Math.sin(t / 7)) * (b.mode === 'watch' ? 10 : 4);

    if (b.phase === 1 && !b.done) {
      // the gloom he lies in, and the golden eye
      const gl = c.createRadialGradient(E.x, E.y, 80, E.x, E.y, 760);
      gl.addColorStop(0, 'rgba(18,12,10,0.55)'); gl.addColorStop(1, 'rgba(18,12,10,0)');
      c.fillStyle = gl; c.fillRect(E.x - 800, E.y - 800, 1600, 1600);
      // the gaze: a beam from the eye to a bright patch on the hoard (what he is looking at)
      const gx = b.gaze ?? gazeAngle(b), gy = surfaceAt(gx);
      const hot = b.spotT > 0 || b.mode === 'hear';
      const col = hot ? '232,90,60' : '255,214,120';
      const bg2 = c.createLinearGradient(E.x, E.y, gx, gy);
      bg2.addColorStop(0, `rgba(${col},0.05)`); bg2.addColorStop(1, `rgba(${col},0.26)`);
      c.fillStyle = bg2; c.beginPath(); c.moveTo(E.x, E.y); c.lineTo(gx - HALF, gy); c.lineTo(gx + HALF, gy); c.closePath(); c.fill();
      const pg = c.createRadialGradient(gx, gy - 30, 10, gx, gy - 30, HALF * 1.2);
      pg.addColorStop(0, `rgba(${col},0.45)`); pg.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = pg; c.beginPath(); c.ellipse(gx, gy - 30, HALF * 1.2, 90, 0, 0, 7); c.fill();
      c.strokeStyle = `rgba(${col},0.7)`; c.lineWidth = 3; c.setLineDash([8, 10]);
      c.beginPath(); c.ellipse(gx, gy - 4, HALF, 16, 0, 0, 7); c.stroke(); c.setLineDash([]);
      const eye = img('eye');
      const blink = (t % 260) < 8 ? 0.15 : 1;
      if (eye) { const w = 520, h = w * eye.height / eye.width; c.drawImage(eye, E.x - w / 2, E.y - (h * blink) / 2 - bob, w, h * blink); }
      else { c.fillStyle = '#E0A23A'; c.beginPath(); c.ellipse(E.x, E.y, 120, 110 * blink, 0, 0, 7); c.fill(); }
    } else {
      // the wave back: his claw raised and rocking, slow and polite
      if (b.mode === 'waveBack' || b.friend) {
        const claw = img('claw');
        const k = b.friend && b.mode !== 'waveBack' ? Math.sin(t / 30) * 0.08 : Math.sin(t / 9) * 0.35;
        if (claw) { const cw = 420, ch = cw * claw.height / claw.width; c.save(); c.translate(79 * T, 21 * T); c.rotate(0.35 + k); c.drawImage(claw, -cw * 0.15, -ch * 0.9, cw, ch); c.restore(); }
      }
      // his head, lying on the hoard (beard black when he is upset)
      const head = img(b.beard ? 'black' : 'head');
      const w = HEAD.w, h = head ? w * head.height / head.width : 780;
      const top = E.y - 0.2 * h - bob + (b.friend ? 30 : 0);
      if (head) c.drawImage(head, HEAD.left, top, w, h);
    }
    // phase 2: the claw (lifting = the tell; sweeping right to left)
    if (b.claw) {
      const claw = img('claw'), cw = 620, ch = claw ? cw * claw.height / claw.width : 380;
      const lift = b.claw.lift ? 3 * T + Math.sin(t / 3) * 8 : 0;
      const x = b.claw.x - 30, y = b.claw.y + 24 - ch - lift;
      if (claw) c.drawImage(claw, x, y, cw, ch);
      else { c.fillStyle = '#C8783A'; c.fillRect(b.claw.x, b.claw.y - 2.5 * T - lift, 4 * T, 2.5 * T); }
      if (!b.claw.lift && t % 4 === 0) r.fx.dust(b.claw.x + 40, b.claw.y - 10);
    }
    // your wave: little motion arcs by the cricket
    if (b.waveF >= 0 && g.frame - b.waveF < 60) {
      c.strokeStyle = 'rgba(244,235,221,0.85)'; c.lineWidth = 2.5;
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(p.cx + 4, p.y - 6, 14 + i * 8, -2.4, -0.7); c.stroke(); }
    }
    c.restore();
    return true;
  },
});
