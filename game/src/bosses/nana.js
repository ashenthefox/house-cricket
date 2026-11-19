// Nana, the New Caledonian giant gecko (zone 10, the Attic): the lullaby. Builder D.
// Built on base.js (phases, checkpoints, tells, Gentle Mode, losing restarts the phase).
//
//   Phase 1: she growls and sweeps her tail across the attic, low (along the floor and the low
//            rafters) or high (over the high rafters), always after a tell (the tail tip wiggles
//            at the height it will sweep). Duck into a rafter gap (hide) or be on the other level.
//            Kick each of the three music stones once to light it. Ends: three stones lit.
//   Phase 2: each stone glows the colour of the voice it wants (fork low, glass middle, bell high);
//            the trio portraits with that voice glow too. Swap and chirp at each stone with the
//            right voice (the arena's fixed chirp: radius 6). Sweeps go on, slower. Ends: all sung.
//   Phase 3: the chorus. No sweeps. Rings close on the cricket on the beat (72 BPM = 50 frames,
//            the game clock); press Chirp on the beat (+/-150 ms). Nothing fails: every good
//            chirp makes the chorus louder (every rescued cricket and every Not-Cricket met
//            joins). 16 beats, then Nana yawns, sings along a little and falls asleep: Chip free.
//   After: her post lines, then the ending story (the zone-complete card is skipped: final).
//
// Entity: { type:'boss', boss:'nana', x, y, cricket:'chip', checkpoints:[[x,y]x3] }
// No DOM in the sim parts; Audio.cue schedules on the game clock (no-op in node).
import { TILE, DT } from '../../data/movement.js';
import { makeBoss } from './base.js';
import * as Geckos from '../geckos.js';
import * as Audio from '../audio.js';
import { voiceOf } from '../meta.js';
import { line } from '../lines.js';
import { constant } from '../world.js'; // [issue 11] frozen module constants: a rewind shares them

const T = TILE;
const X0 = 12 * T, X1 = 95 * T;                        // the arena floor between the chimney breast and the door
const BANDS = constant({ low: [27 * T, 34 * T], high: [19 * T, 27 * T] });
const STONES = constant([
  { id: 'fork', prop: 'music-stone-fork', voice: 'low', x: 16, y: 31, note: 0 },
  { id: 'glass', prop: 'music-stone-glass', voice: 'mid', x: 50, y: 25, note: 2 },
  { id: 'bell', prop: 'music-stone-bell', voice: 'high', x: 75, y: 21, note: 4 },
]);
const VOICE_COLOR = constant({ low: '#9DB2E0', mid: '#E8B85A', high: '#E8846F' });
const VOICE_NAME = constant({ low: 'low', mid: 'middle', high: 'high' });
const BEAT = 50, BEATS = 16, WINDOW = 9;               // 72 BPM; +/-150 ms
const STONE_HEAR = 9;                                  // [fixer] tiles: a stone hears its voice this far (was 6)
const NC_VOICE = constant({ peeper: 'peeper', soot: 'swift-chitter', velvet: 'bat-squeaks', beep: 'alarm' });
const ov = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const stoneBox = (s) => ({ x: s.x * T - 4, y: s.y * T - 8, w: T + 8, h: T + 8 });

function setHint(g, text) {
  // [issue 9] a card-only tip (no paper note, glint or read tracking): the phase hint shows while it's up
  // (the HUD card renders {chirp} etc. as key caps)
  g.signs = (g.signs || []).filter((s) => !s.nana);
  if (text) g.signs.push({ nana: true, kind: 'card', key: 'nana', x: 0, y: 0, w: 96 * T, text });
}

function chorusMembers(g) {
  const out = [];
  for (const id of g.rescued || []) if (id !== 'chip') out.push({ kind: 'cricket', id, voice: id });
  out.push({ kind: 'cricket', id: 'pip', voice: 'pip' });
  for (const id of g.meta?.notCrickets || []) if (NC_VOICE[id]) out.push({ kind: 'npc', id, voice: NC_VOICE[id] });
  return out;
}
// [art] the stones, Chip, and the chorus that came along (drawn in phase 3)
function nanaArt(g) {
  const crickets = { chip: ['idle', 'leap'] }, props = STONES.map((s) => s.prop);
  for (const m of g ? chorusMembers(g) : []) {
    if (m.kind === 'npc') props.push(`sprites/npcs/${m.id}.webp`);
    else crickets[m.id] = ['idle', 'chirp'];
  }
  return { props, crickets };
}

export default makeBoss('nana', {
  sfx: ['bat-squeaks', 'gecko-growl', 'gecko-snore', 'swift-chitter'], // [issue 14] the recorded effects the fight plays (src/zone-sfx.js loads them with the zone)
  art: (e, o) => nanaArt(o.game), // [art] what the fight draws (room-art.js loads it before the lair shows)
  phases: 3, len: 980,
  focus() { return null; }, // [polish-V] she is painted on the far wall relative to the view (always in frame)
  start(b, g) {
    b.x = 6.5 * T; b.y = 17 * T; b.facing = 1;
    b.stones = b.stones || STONES.map((s) => ({ ...s }));
    b.front = X0; b.band = null; b.sweeps = 0; b.pose = 'idle'; b.growl = 0; b.pops = [];
    g.portraitGlow = null;
    if (g.rescued?.has('chip')) { b.done = true; b.asleep = true; b.mode = 'asleep'; b.pose = 'sleep'; b.after = 9999; setHint(g, null); return; }
    if (b.phase === 1) { for (const s of b.stones) { s.lit = false; s.sung = false; } b.mode = 'idle'; b.cool = 100; setHint(g, line('nana.p1')); }
    if (b.phase === 2) { for (const s of b.stones) { s.lit = true; s.sung = false; } b.mode = 'idle'; b.cool = 220; setHint(g, line('nana.p2')); } // [fixer] a breather first
    if (b.phase === 3) {
      for (const s of b.stones) { s.lit = true; s.sung = true; }
      b.mode = 'chorus'; b.beat0 = g.frame + 130; b.hits = 0; b.hitBeats = new Set(); b.cued = -1; // [fixer] the count-in is shorter (was 200)
      setHint(g, line('nana.chorus'));
      Audio.music('finale');
      for (let k = -4; k < BEATS; k++) Audio.cue(b.beat0 + k * BEAT, 'brush', { gain: k < 0 ? 0.45 : 0.8 });
    }
  },

  tick(b, g) {
    const p = g.player, f = g.frame;
    if (b.phase < 3) {
      // ---- the tail sweep cycle ----
      if (b.mode === 'idle') {
        b.pose = 'idle';
        if (--b.cool <= 0) {
          b.band = b.sweeps % 2 === 0 ? 'low' : 'high';
          if (b.phase === 2 && b.rng() < 0.35) b.band = b.band === 'low' ? 'high' : 'low';
          const [t0, t1] = BANDS[b.band];
          b.mt = b.tell(X0 + 2 * T, (t0 + t1) / 2);
          b.mode = 'tell';
          if (b.phase === 1) { b.growl = 50; Audio.cue(f + 2, 'gecko-growl', { gain: 0.7 }); }
        }
      } else if (b.mode === 'tell') {
        if (--b.mt <= 0) { b.mode = 'sweep'; b.front = X0; b.hold = 18; const [t0, t1] = BANDS[b.band]; g.emit('tailSweep', { x: X0 + 10 * T, y: (t0 + t1) / 2 }); }
      } else if (b.mode === 'sweep') {
        b.pose = 'strike';
        b.front = Math.min(X1, b.front + (b.phase === 2 ? 1.7 : 1.25) * T); // [fixer] phase 2: faster sweeps
        if (b.front >= X1 && --b.hold <= 0) b.mode = 'retract';
      } else if (b.mode === 'retract') {
        b.front -= 2 * T;
        if (b.front <= X0) { b.front = X0; b.mode = 'idle'; b.sweeps++; b.cool = b.phase === 1 ? 230 : 340; b.band = null; } // [fixer] phase 2: fewer sweeps
      }
      if ((b.mode === 'sweep' || b.mode === 'retract') && b.band) {
        const [t0, t1] = BANDS[b.band];
        const body = { x: p.x + 3, y: p.y + 3, w: p.w - 6, h: p.h - 6 };
        if (!p.hidden && p.invuln === 0 && body.y + body.h > t0 && body.y < t1 && body.x < b.front) b.hit(1, X0);
      }
      if (b.growl > 0) b.growl--;
    }

    if (b.phase === 1) {
      const kb = p.kickBox();
      for (const s of b.stones) if (!s.lit && kb && ov(kb, stoneBox(s))) {
        s.lit = true; g.emit('note', { i: s.note, x: (s.x + 0.5) * T, y: s.y * T }); g.emit('unlock', { x: (s.x + 0.5) * T, y: s.y * T });
      }
      if (b.stones.every((s) => s.lit) && (b.mode === 'idle' || b.mode === 'tell')) b.nextPhase();
    } else if (b.phase === 2) {
      // portraits glow for the voices still wanted
      const want = new Set(b.stones.filter((s) => !s.sung).map((s) => s.voice));
      const glow = {};
      for (const id of p.trio) { const v = voiceOf(id); if (v && want.has(v)) glow[id] = VOICE_COLOR[v]; }
      g.portraitGlow = glow;
      for (const e of g.fx) {
        if (e.f !== f || e.type !== 'chirp') continue;
        const v = voiceOf(e.d.id), cx = e.d.x, cy = e.d.y, r = STONE_HEAR * T; // [fixer] quicker recognition: a wider ear
        for (const s of b.stones) {
          if (s.sung || Math.hypot((s.x + 0.5) * T - cx, (s.y + 0.5) * T - cy) > r) continue;
          if (v === s.voice) { s.sung = true; g.emit('note', { i: s.note + 7, x: (s.x + 0.5) * T, y: s.y * T }); g.emit('unlock', { x: (s.x + 0.5) * T, y: s.y * T }); }
          else g.toast(line('nana.wants', { stone: line(`nana.${s.id}`), voice: VOICE_NAME[s.voice] }), 150);
        }
      }
      if (b.stones.every((s) => s.sung) && (b.mode === 'idle' || b.mode === 'tell')) { g.portraitGlow = null; b.nextPhase(); }
    } else if (b.phase === 3) {
      p.chirpMeter = Math.max(p.chirpMeter, 3);
      const last = b.beat0 + (BEATS - 1) * BEAT;
      // the chorus: on each beat, more voices the more good chirps
      const k = Math.round((f + 6 - b.beat0) / BEAT);
      if (k >= 0 && k < BEATS && k !== b.cued && b.beat0 + k * BEAT === f + 6) {
        b.cued = k;
        const all = chorusMembers(g), n = Math.min(all.length, 2 + b.hits * 2);
        for (let i = 0; i < n; i++) {
          const m = all[(i + k) % all.length];
          if ((i + k) % 2 === 0 || n >= all.length) Audio.cue(f + 6, m.voice, { gain: 0.18 + 0.03 * Math.min(10, b.hits), seed: m.id });
        }
      }
      for (const e of g.fx) {
        if (e.f !== f || (e.type !== 'chirp' && e.type !== 'tap')) continue;
        const kk = Math.round((f - b.beat0) / BEAT);
        if (kk < 0 || kk >= BEATS || b.hitBeats.has(kk) || Math.abs(f - (b.beat0 + kk * BEAT)) > WINDOW) continue;
        b.hitBeats.add(kk); b.hits++;
        b.pops.push({ f, x: p.cx, y: p.y - 10 });
        g.emit('chorusHit', { beat: kk, hits: b.hits });
      }
      if (b.mode === 'chorus' && f > last + 40) { b.mode = 'yawn'; b.mt = 150; setHint(g, null); Audio.cue(f + 4, 'gecko-growl', { gain: 0.35, rate: 0.6 }); }
      if (b.mode === 'yawn') {
        b.pose = b.mt > 100 ? 'strike' : 'idle';
        if (b.mt === 90 || b.mt === 60 || b.mt === 30) Audio.cue(f + 6, 'house', { pitch: 0.42, gain: 0.5, seed: 'nana' }); // she sings along, low
        if (--b.mt <= 0) {
          b.mode = 'asleep'; b.pose = 'sleep'; b.asleep = true;
          Audio.cue(f + 6, 'gecko-snore', { gain: 0.6 });
          // the rescue (final: no zone-complete card; the ending follows)
          b.done = true; b.after = 0; g.portraitGlow = null;
          b.chipTo = { x: p.cx + (p.cx > 40 * T ? -46 : 46), y: p.y + p.h }; // [fixer] where Chip lands (draw)
          g.rescue(b.cricket); g.levelComplete = true;
          g.emit('rescue', { cricket: b.cricket, x: 17 * T, y: 9 * T, boss: 'nana', final: true });
        }
      }
    }
  },

  // after the win (base calls this every step once done)
  after(b, g) {
    if (b.after == null || b.after >= 9999) return;
    b.after++;
    if (b.after === 60) g.emit('dialog', { key: 'geckos.nana.post', then: 'ending' }); // [polish-T] the ending starts as her lines close (meta-run handoff; it was 30 frames later, after a flash of the arena)
    if (b.after > 120) b.after = 9999;
  },

  // [polish] render-only: Nana is enormous, so she is painted on the attic's far wall behind the
  // platforms, drifting with the view (parallax) so her face is always in frame below the HUD,
  // in every phase; she nods off as the chorus grows and sleeps at the end. Her tail is hidden on
  // the rig while it sweeps the arena (drawn in front, in draw()).
  drawBack(b, c, R) {
    const g = b.game, cam = g.camera, t = R.t ?? g.frame;
    if (!b.rig) { b.rig = Geckos.create('nana'); Geckos.preload('nana'); }
    if (b._wiggle) { b.rig.wiggle(b._wiggle); b._wiggle = 0; }
    if (!Geckos.ready('nana')) return;
    const rig = b.rig, vw = cam.vw, vh = cam.vh;
    const len = Math.min(1100, vh * 1.5), s = rig.scaleFor(len);
    const cx = cam.x + vw / 2;
    let wantX = cx + (48 * T - cx) * 0.25;
    const p = g.player;
    const facing = b.asleep ? 1 : (p.cx > (b._dx ?? wantX) ? 1 : -1);
    if (facing !== b._face) { b._face = facing; }
    rig.setPose(b.pose);
    rig.showTail = !(b.band && (b.mode === 'sweep' || b.mode === 'retract' || b.mode === 'tell'));
    const eye = rig.point('eye', 0, 0, s, facing);
    const y = cam.y + vh * 0.27 - eye.y + (b.asleep ? Math.sin(t / 40) * 5 : 0);
    // [polish-V] keep her face clear of the music stones (the bell sat on it): slide her along the wall
    // to the nearest place where her head (top third of the body) misses every stone and its tag
    const stones = (b.stones || []).map((st) => ({ x0: (st.x + 0.5) * T - 50, x1: (st.x + 0.5) * T + 50, y0: (st.y + 1) * T - 110, y1: (st.y + 1) * T + 6 }));
    const clear = (xx) => { const bx = rig.box(xx, y, s, facing), hd = { x0: bx.x, x1: bx.x + bx.w, y0: bx.y - 20, y1: bx.y + bx.h * 0.36 }; return !stones.some((r) => r.x0 < hd.x1 && r.x1 > hd.x0 && r.y0 < hd.y1 && r.y1 > hd.y0); };
    for (let d = 0; d <= 900; d += 30) { if (clear(wantX - d)) { wantX -= d; break; } if (clear(wantX + d)) { wantX += d; break; } }
    b._dx = b._dx == null ? wantX : b._dx + (wantX - b._dx) * 0.06;
    const sway = b.phase === 3 && !b.asleep ? Math.sin(((g.frame - (b.beat0 || 0)) / 50) * Math.PI) * 10 : 0;
    const x = b._dx + sway;
    // a soft shadow sits her on the wall
    c.save(); c.globalAlpha = 0.18; c.fillStyle = '#2A1E16';
    c.beginPath(); c.ellipse(x + 30, y + 40, len * 0.28, len * 0.52, 0, 0, 7); c.fill(); c.restore();
    rig.alpha = b.asleep ? 0.9 : 0.74; // on the far wall: the cricket and the planks stay readable over her
    // drowsy eyelids: the more the chorus sings, the lower they droop (phase 3). [final-G] drawn by the
    // rig in art space over both eyes (geckos.js _lids)
    // [polish-V] from fully open (a thin lid at the start read as a floating brow); geckos.js draws the lid inside the eye's rim
    const drowse = b.phase === 3 && !b.asleep ? Math.min(0.85, (b.hits || 0) * 0.07 + (b.mode === 'yawn' ? 0.4 : 0)) : 0;
    rig.lids = b.pose !== 'sleep' && drowse >= 0.12 ? drowse : 0;
    rig.draw(c, x, y, s, facing);
    b._head = rig.point('eye', x, y, s, facing); b._s = s;
  },

  draw(b, c, R) {
    const g = b.game, f = g.frame, t = R.t ?? f;
    // growl rings (the loud pulse)
    if (b.growl > 0) {
      c.save(); c.strokeStyle = `rgba(90,70,50,${(b.growl / 50) * 0.5})`; c.lineWidth = 5;
      for (let i = 0; i < 3; i++) { const r = 60 + ((50 - b.growl) * 6 + i * 70) % 260; const hx = b._head?.x ?? b.x + 120, hy = b._head?.y ?? 8 * T; c.beginPath(); c.arc(hx, hy, r, -0.9, 0.9); c.stroke(); c.beginPath(); c.arc(hx, hy, r, Math.PI - 0.9, Math.PI + 0.9); c.stroke(); }
      c.restore();
    }
    // Chip in the old shoebox by her chin (13-15, 9-10), then hopping out after the rescue
    const sb = { x: 13.2 * T, y: 10 * T };
    c.save(); c.fillStyle = '#C9A57A'; c.strokeStyle = '#5A4632'; c.lineWidth = 3;
    c.beginPath(); c.rect(sb.x, sb.y - 34, 74, 34); c.fill(); c.stroke();
    c.fillStyle = '#E8D9BC'; c.fillRect(sb.x + 4, sb.y - 30, 66, 6); c.restore();
    // [fixer] after the win Chip hops all the way down to land beside you (in view), not just out of the box
    const hop = b.done && b.after != null ? Math.min(1, b.after / 55) : 0;
    const x0 = sb.x + 37, y0 = sb.y - 18;
    const to = b.chipTo || { x: x0 + 120, y: y0 + 18 };
    const hx = x0 + (to.x - x0) * hop, hy = y0 + (to.y - y0) * hop - Math.sin(hop * Math.PI) * 140;
    R.drawCricketAt?.(c, 'chip', hx, hy, hop > 0 ? (to.x >= x0 ? 1 : -1) : -1, { look: hop > 0 && hop < 1 ? 'leap' : 'idle', scale: 0.9 });
    c.save(); c.strokeStyle = '#5A4632'; c.lineWidth = 3; c.beginPath(); c.moveTo(sb.x - 4, sb.y - 34); c.lineTo(sb.x + 78, sb.y - 34); c.stroke(); c.restore();

    // ---- the tail sweep: her real tail, banded, round and tapering, swishing along its band ----
    if (b.band && (b.mode === 'sweep' || b.mode === 'retract' || b.mode === 'tell')) {
      const [t0, t1] = BANDS[b.band], mid = (t0 + t1) / 2, th = (t1 - t0) * 0.4;
      const end = b.mode === 'tell' ? X0 + 3 * T : b.front + 20;
      const x0 = X0 - 60, n = 40, L = end - x0;
      const cl = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n, x = x0 + L * u;
        let y = mid + Math.sin(t / 6 - u * 7) * 14 * u + Math.sin(u * 3.1) * 10;
        if (b.mode === 'tell') y += Math.sin(t * 0.9) * 22 * u * u;
        cl.push([x, y, th * Math.pow(1 - u, 0.7) * 0.97 + 4]);
      }
      const nrm = (i) => { const a = cl[Math.max(0, i - 1)], bb = cl[Math.min(n, i + 1)], dx = bb[0] - a[0], dy = bb[1] - a[1], d = Math.hypot(dx, dy) || 1; return [-dy / d, dx / d]; };
      const path = new Path2D();
      cl.forEach((q, i) => { const [nx, ny] = nrm(i); i ? path.lineTo(q[0] + nx * q[2], q[1] + ny * q[2]) : path.moveTo(q[0] + nx * q[2], q[1] + ny * q[2]); });
      const tip = cl[n]; path.arc(tip[0], tip[1], tip[2], Math.atan2(nrm(n)[1], nrm(n)[0]), Math.atan2(nrm(n)[1], nrm(n)[0]) + Math.PI);
      for (let i = n; i >= 0; i--) { const q = cl[i], [nx, ny] = nrm(i); path.lineTo(q[0] - nx * q[2], q[1] - ny * q[2]); }
      path.closePath();
      c.save();
      c.fillStyle = '#C9A46C'; c.fill(path);
      c.clip(path);
      // dark bands across the tail, like the art (wider near the base)
      for (let i = 1; i < n; i += 3) {
        const q = cl[i], [nx, ny] = nrm(i), w = Math.max(6, L / n * 1.3);
        c.strokeStyle = 'rgba(107,82,58,0.8)'; c.lineWidth = w; c.lineCap = 'round';
        c.beginPath(); c.moveTo(q[0] + nx * q[2] * 1.1 - 8, q[1] + ny * q[2] * 1.1); c.quadraticCurveTo(q[0] + 10, q[1], q[0] - nx * q[2] * 1.1 - 8, q[1] - ny * q[2] * 1.1); c.stroke();
      }
      // speckled skin
      c.fillStyle = 'rgba(90,66,44,0.35)';
      for (let i = 0; i < n * 6; i++) { const q = cl[(i * 7) % (n + 1)], a = (i * 2.39) % 6.28, r = q[2] * (((i * 37) % 100) / 100); c.fillRect(q[0] + Math.cos(a) * r + (i % 5) * 4, q[1] + Math.sin(a) * r, 3, 3); }
      // round: light along the top, shadow underneath
      c.lineCap = 'round'; c.lineJoin = 'round';
      const edge = (side, col, w) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); cl.forEach((q, i) => { const [nx, ny] = nrm(i); const k = side * q[2] * 0.75; i ? c.lineTo(q[0] + nx * k, q[1] + ny * k) : c.moveTo(q[0] + nx * k, q[1] + ny * k); }); c.stroke(); };
      edge(-1, 'rgba(255,240,205,0.35)', th * 0.35); edge(1, 'rgba(60,40,24,0.35)', th * 0.5);
      c.restore();
      c.strokeStyle = 'rgba(74,52,32,0.95)'; c.lineWidth = 4; c.stroke(path);
      // motion swish lines behind it
      if (b.mode === 'sweep') { c.save(); c.strokeStyle = 'rgba(244,235,221,0.6)'; c.lineWidth = 3; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(end - 30, mid + k * th * 0.6); c.lineTo(end - 160, mid + k * th * 0.6); c.stroke(); } c.restore(); }
    }

    // ---- the music stones ----
    for (const s of b.stones || []) {
      const x = (s.x + 0.5) * T, y = (s.y + 1) * T;
      let glow = null;
      if (b.phase === 2 && !s.sung && !b.done) glow = VOICE_COLOR[s.voice];
      else if (s.sung) glow = '#FFF3C8';
      else if (s.lit) glow = '#F2C46D';
      if (glow) {
        const pulse = 0.55 + 0.3 * Math.sin(t / 8 + s.note);
        const gr = c.createRadialGradient(x, y - 24, 4, x, y - 24, 70);
        gr.addColorStop(0, glow); gr.addColorStop(1, 'rgba(255,255,255,0)');
        c.save(); c.globalAlpha = pulse; c.fillStyle = gr; c.beginPath(); c.arc(x, y - 24, 70, 0, 7); c.fill(); c.restore();
      }
      if (!R.drawProp?.(c, s.prop, x, y, 1.6 * T)) { c.save(); c.fillStyle = glow || '#A9B8C2'; c.strokeStyle = '#5A4632'; c.lineWidth = 3; c.beginPath(); c.arc(x, y - 24, 18, 0, 7); c.fill(); c.stroke(); c.restore(); }
      if (b.phase === 2 && !s.sung && !b.done) { // a voice tag over the stone
        c.save(); c.font = 'bold 20px Nunito, sans-serif'; c.textAlign = 'center'; c.lineWidth = 5; c.strokeStyle = 'rgba(42,32,26,0.8)'; c.fillStyle = glow;
        const lbl = VOICE_NAME[s.voice]; c.strokeText(lbl, x, y - 78); c.fillText(lbl, x, y - 78); c.restore();
      }
    }

    // ---- the chorus ----
    if (b.phase === 3 && !b.asleep) {
      const p = g.player;
      // everyone who came along, along the floor, bobbing on the beat
      const all = chorusMembers(g).filter((m) => m.id !== p.id);
      const k = (f - b.beat0) / BEAT, onBeat = Math.max(0, 1 - Math.abs(k - Math.round(k)) * 5);
      all.forEach((m, i) => {
        const x = (22 + i * (66 / Math.max(1, all.length))) * T, y = 34 * T - onBeat * 8 * ((i + Math.round(k)) % 2);
        if (Math.abs(x - p.cx) < 40) return;
        if (m.kind === 'npc') R.drawNPC?.(c, m.id, x, y, { h: 50, t, facing: x < 48 * T ? 1 : -1 });
        else R.drawCricketAt?.(c, m.id, x, y, x < 48 * T ? 1 : -1, { look: onBeat > 0.5 ? 'chirp' : 'idle', t });
      });
      // rings closing on the cricket for the next beats
      for (let j = 0; j < BEATS; j++) {
        const bf = b.beat0 + j * BEAT, d = bf - f;
        if (d < -8 || d > 45) continue;
        const r = 26 + Math.max(0, d) * 4, hit = b.hitBeats.has(j);
        c.save(); c.globalAlpha = d < 0 ? 0.5 : 0.85; c.strokeStyle = hit ? '#F2C46D' : '#F4EBDD'; c.lineWidth = hit ? 7 : 4;
        c.beginPath(); c.arc(p.cx, p.cy, r, 0, 7); c.stroke(); c.restore();
      }
      // beat counter
      const done = Math.max(0, Math.min(BEATS, Math.floor(k) + 1));
      c.save(); c.textAlign = 'center'; c.font = 'bold 22px Nunito, sans-serif';
      for (let j = 0; j < BEATS; j++) { c.fillStyle = b.hitBeats.has(j) ? '#F2C46D' : j < done ? 'rgba(244,235,221,0.45)' : 'rgba(244,235,221,0.18)'; c.beginPath(); c.arc(p.cx - (BEATS - 1) * 9 + j * 18, p.y - 70, 6, 0, 7); c.fill(); }
      c.restore();
    }
    // "Louder!" pops
    for (const pp of b.pops || []) {
      const a = (f - pp.f) / 45; if (a > 1) continue;
      c.save(); c.globalAlpha = 1 - a; c.textAlign = 'center'; c.font = `bold ${26 + a * 10}px Nunito, sans-serif`;
      c.lineWidth = 6; c.strokeStyle = 'rgba(42,32,26,0.85)'; c.fillStyle = '#F2C46D';
      const txt = line('nana.louder'); c.strokeText(txt, pp.x, pp.y - a * 50); c.fillText(txt, pp.x, pp.y - a * 50); c.restore();
    }
    if (b.pops && b.pops.length > 20) b.pops.splice(0, b.pops.length - 20);
    // Zzz once asleep
    if (b.asleep) {
      c.save(); c.font = 'bold 44px "Patrick Hand", sans-serif'; c.fillStyle = 'rgba(74,52,32,0.85)';
      for (let i = 0; i < 3; i++) { const ph = ((t / 60) + i / 3) % 1; c.globalAlpha = 1 - ph; c.fillText('z', (b._head?.x ?? b.x + 140) + 60 + ph * 80 + i * 6, (b._head?.y ?? 6 * T) - 40 - ph * 120); }
      c.restore();
    }
    return true;
  },
});
