// Synthesized voices (design "Audio direction", numbers from design/RESEARCH.md).
// Everything here is plain sample math: render(voice, sampleRate, opts) returns a Float32Array,
// so the same code runs in the page (cached into AudioBuffers by audio.js), in an
// OfflineAudioContext (__game.renderChirp) and in node (FFT checks). No DOM, no AudioContext.
//
// Voices: crickets (house, banded, twospot, field, snowy, katydid, mole, ground, bell, knock),
// the decoys (alarm, peeper, chikchak), the gecko tell, and small code-made effects
// (whoosh, swish, brush, clonk, thunk, ping, fall, ring, sweep, chime, sting).

const TAU = Math.PI * 2;

// Cricket id -> voice (data/crickets.js ids). Hump is wingless: his "voice" is a wooden knock.
export const CRICKET_VOICE = {
  pip: 'house', chip: 'house', stripe: 'banded', duo: 'twospot', jam: 'field', frost: 'snowy',
  katy: 'katydid', digby: 'mole', mote: 'ground', rin: 'bell', hump: 'knock',
};

// f: carrier Hz. every: seconds between calling songs at 70 F, [min, max] (per-individual pick).
// level: peak amplitude of the rendered song (relative loudness between voices).
export const VOICES = {
  // House cricket: 4.8 kHz sine + -20 dB 2nd harmonic; 2-3 pulses of 18 ms (2 ms attack,
  // 4 ms decay) at a 45 ms period, the last one softer; chirps every 0.5-1.2 s.
  house:   { kind: 'pulses', f: 4800, pulses: [2, 3], pulseMs: 18, atkMs: 2, decMs: 4, periodMs: 45, h2: 0.1, every: [0.5, 1.2], level: 0.5 },
  // Banded cricket: ~6 kHz, 2-3 pulses, faster chirps.
  banded:  { kind: 'pulses', f: 6000, pulses: [2, 3], pulseMs: 15, atkMs: 2, decMs: 4, periodMs: 36, h2: 0.1, every: [0.3, 0.6], level: 0.45 },
  // Two-spotted cricket: 4.6 kHz, 4-5 pulses, 3-4 chirps a second.
  twospot: { kind: 'pulses', f: 4600, pulses: [4, 5], pulseMs: 15, atkMs: 2, decMs: 4, periodMs: 32, h2: 0.1, every: [0.25, 0.33], level: 0.5 },
  // Jamaican field cricket (Jam): a Gryllus like Duo, 4.5 kHz, 3-4 pulses.
  field:   { kind: 'pulses', f: 4500, pulses: [3, 4], pulseMs: 16, atkMs: 2, decMs: 4, periodMs: 38, h2: 0.1, every: [0.45, 0.8], level: 0.5 },
  // Snowy tree cricket: 3 kHz steady mellow "treet"; ~70 pulses/s at 77 F; rate by Dolbear.
  snowy:   { kind: 'treet', f: 3000, pulses: 8, pulseRate77: 70, h2: 0.03, dolbear: true, level: 0.45 },
  // True katydid: 3 kHz rasp, 3 syllables "ka-ty-did" (each a burst of tooth impacts).
  katydid: { kind: 'rasp', f: 3000, syllables: [1, 0.75, 1], sylMs: 55, gapMs: 95, teeth: 220, every: [1.0, 1.4], level: 0.5 },
  // Mole cricket: a 2.5 kHz low pure droning trill (~50 pulses/s), long.
  mole:    { kind: 'trill', f: 2500, pulseRate: 50, durS: 1.4, duty: 0.6, h2: 0.02, every: [1.9, 2.4], level: 0.45 },
  // Ground cricket: a faint 7.5 kHz trill.
  ground:  { kind: 'trill', f: 7500, pulseRate: 30, durS: 0.7, duty: 0.5, h2: 0, every: [1.1, 1.6], level: 0.25 },
  // Bell cricket: ~4 kHz "ri-i-in" with a ~300 ms ringing decay.
  bell:    { kind: 'bell', f: 4000, decayS: 0.3, every: [1.2, 1.6], level: 0.4 },
  // Hump's foot-tap / case-tap: a short wooden knock (two taps).
  knock:   { kind: 'knock', f: 560, taps: 2, tapGapMs: 130, every: [0.8, 1.1], level: 0.6 },
  // Decoys (their rhythm is the puzzle, so it is exact):
  // smoke alarm, low battery: one short high piezo beep (~3 kHz). The real thing waits 30-60 s
  // (the Hall's alarm uses every: 40 on its decoy); as the Laundry's beacon (Beep herself) it
  // beeps every 8-10 s and answers your chirp a beat later (decoy answers: true).
  alarm:   { kind: 'beep', f: 3000, durMs: 70, every: [8, 10], level: 0.45, fixedRate: true },
  // Spring peeper: a clear rising peep, once a second.
  peeper:  { kind: 'peep', f: 2900, from: 2650, to: 3150, durMs: 150, every: [1, 1], level: 0.45, fixedRate: true },
  // Common house gecko: a run of 6-9 "chik" clicks.
  chikchak:{ kind: 'clicks', f: 3200, count: [6, 9], spacingMs: 115, every: [3, 4.5], level: 0.5, fixedRate: true },
  // The gecko tell: rattle-swish (filtered noise with a 12 Hz flutter); same for every gecko.
  tell:    { kind: 'noise', f: 2400, q: 1.2, durS: 0.5, flutterHz: 12, level: 0.5 },
  // Nana's tail sweep: a longer swish.
  sweep:   { kind: 'noise', f: 900, q: 0.8, durS: 0.9, flutterHz: 0, sweepTo: 2200, level: 0.45 },
  // code-made effects
  whoosh:  { kind: 'noise', f: 600, q: 0.9, durS: 0.32, sweepTo: 1800, level: 0.35 },
  swish:   { kind: 'noise', f: 1800, q: 1.0, durS: 0.18, sweepTo: 4000, level: 0.3 },
  brush:   { kind: 'noise', f: 5000, q: 0.6, durS: 0.12, level: 0.25 },
  steam:   { kind: 'noise', f: 3000, q: 0.5, durS: 0.6, level: 0.3 },
  clonk:   { kind: 'tone', f: 140, durS: 0.14, slide: 0.8, wave: 'square', level: 0.3 },
  thunk:   { kind: 'tone', f: 110, durS: 0.1, slide: 0.6, wave: 'sine', level: 0.45 },
  ping:    { kind: 'tone', f: 1568, durS: 0.18, slide: 1, wave: 'sine', level: 0.25 },
  fall:    { kind: 'tone', f: 600, durS: 0.32, slide: 0.35, wave: 'sine', level: 0.3 },
  ring:    { kind: 'tone', f: 2200, durS: 0.6, slide: 1, wave: 'sine', trem: 9, level: 0.18 },
  chime:   { kind: 'arp', notes: [784, 988, 1175, 1568], stepMs: 70, noteS: 0.35, level: 0.25 },
  sting:   { kind: 'arp', notes: [523, 659, 784, 1046, 1318], stepMs: 110, noteS: 0.6, level: 0.28 },
};

// ---- helpers ----
export function hash(s) { let h = 2166136261 >>> 0; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; }
export function rng(seed) { let a = (typeof seed === 'number' ? seed : hash(seed)) >>> 0 || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** Voice key for a cricket id, a voice key, or a species word ('house', 'snowy tree'...). */
export function voiceFor(id) {
  if (!id) return 'house';
  if (VOICES[id]) return id;
  if (CRICKET_VOICE[id]) return CRICKET_VOICE[id];
  const s = String(id).toLowerCase();
  const words = [['two', 'twospot'], ['band', 'banded'], ['snowy', 'snowy'], ['tree', 'snowy'], ['katy', 'katydid'], ['mole', 'mole'], ['ground', 'ground'], ['bell', 'bell'], ['camel', 'knock'], ['jamaica', 'field'], ['field', 'field'], ['house', 'house'], ['smoke', 'alarm'], ['peep', 'peeper'], ['gecko', 'chikchak']];
  for (const [w, v] of words) if (s.includes(w)) return v;
  return null;
}
/** Per-individual pitch: +-1.5 %, stable per name. */
export function individualPitch(name) { return 1 + ((hash('pitch:' + name) % 3001) / 3000 - 0.5) * 0.03; }
// Dolbear's law: F = 50 + (N - 40) / 4, N = chirps per minute.
export function dolbearN(F) { return 4 * (F - 50) + 40; }
export function dolbearF(N) { return 50 + (N - 40) / 4; }
/** Chirp-rate multiplier for a temperature (F), relative to 70 F (the Dolbear slope, clamped). */
export function rateMul(F = 70) { return Math.max(0.45, Math.min(1.7, dolbearN(F) / dolbearN(70))); }
/** Carrier pitch actually used (after the "Easier beacon pitch" option). */
export function pitchOf(voice, { pitch = 1, easier = false } = {}) {
  const v = VOICES[voiceFor(voice)]; if (!v) return 0;
  let f = (v.f || (v.notes ? v.notes[0] : 0)) * pitch;
  if (easier && f > 5500) f /= 2;
  return f;
}
/** Seconds between calling songs at temperature F for one individual (seed). */
export function songInterval(voice, F = 70, seed = 0) {
  const key = voiceFor(voice), v = VOICES[key];
  if (!v) return 1;
  if (v.dolbear) return 60 / Math.max(20, dolbearN(F));
  const r = rng('iv:' + seed)();
  const [a, b] = v.every || [1, 1];
  const base = a + (b - a) * r;
  return v.fixedRate ? base : base / rateMul(F);
}

// ---- rendering ----
function envAt(t, dur, atk, dec) {
  if (t < 0 || t >= dur) return 0;
  if (t < atk) return t / atk;
  if (t > dur - dec) return Math.max(0, (dur - t) / dec);
  return 1;
}
function addPulse(out, sr, t0, dur, f, amp, atk, dec, h2 = 0) {
  const i0 = Math.max(0, Math.round(t0 * sr)), n = Math.round(dur * sr);
  for (let i = 0; i < n && i0 + i < out.length; i++) {
    const t = i / sr, e = envAt(t, dur, atk, dec) * amp;
    const ph = TAU * f * t;
    out[i0 + i] += e * (Math.sin(ph) + h2 * Math.sin(2 * ph));
  }
}
// A 2-pole resonant band-pass over white noise (for swishes and the tell).
function bandNoise(out, sr, t0, dur, f0, f1, q, amp, envFn, r) {
  const i0 = Math.round(t0 * sr), n = Math.round(dur * sr);
  let y1 = 0, y2 = 0;
  for (let i = 0; i < n && i0 + i < out.length; i++) {
    const t = i / sr, f = f0 + (f1 - f0) * (t / dur);
    const w = TAU * f / sr, rr = Math.exp(-w / (2 * q));
    const a1 = 2 * rr * Math.cos(w), a2 = -rr * rr;
    const x = r() * 2 - 1;
    const y = (1 - rr) * x + a1 * y1 + a2 * y2;
    y2 = y1; y1 = y;
    out[i0 + i] += y * amp * envFn(t, dur);
  }
}

/**
 * Render one song of a voice.
 * opts: pitch (multiplier, per individual), temp (F), song ('calling' | 'rivalry'),
 *       easier (voices above 5.5 kHz an octave lower), seed (individual: picks pulse counts).
 * Returns Float32Array (mono) at sampleRate sr, peak = voice level.
 */
export function render(voice, sr = 44100, opts = {}) {
  const key = voiceFor(voice); const v = VOICES[key];
  if (!v) return new Float32Array(1);
  const { pitch = 1, temp = 70, song = 'calling', easier = false, seed = key } = opts;
  const r = rng(`${seed}:${song}`);
  let f = (v.f || 0) * pitch; if (easier && f > 5500) f /= 2;
  const rival = song === 'rivalry';
  const pick = (ab) => (Array.isArray(ab) ? ab[0] + Math.floor(r() * (ab[1] - ab[0] + 1)) : ab);
  let dur = 0.05; const parts = [];
  switch (v.kind) {
    case 'pulses': {
      // rivalry: loud, fast and harsh: two bursts of more, quicker pulses
      const bursts = rival ? 2 : 1, n = rival ? pick(v.pulses) + 3 : pick(v.pulses);
      const per = (rival ? 0.75 : 1) * v.periodMs / 1000, pl = v.pulseMs / 1000;
      for (let b = 0; b < bursts; b++) for (let i = 0; i < n; i++) {
        const t = b * (n * per + 0.09) + i * per;
        parts.push(['pulse', t, pl, f, i === n - 1 ? 0.7 : 1, v.atkMs / 1000, v.decMs / 1000, v.h2]);
        dur = Math.max(dur, t + pl);
      }
      break;
    }
    case 'treet': {
      const pr = v.pulseRate77 * (dolbearN(temp) / dolbearN(77));
      const n = rival ? v.pulses * 2 : v.pulses, per = 1 / Math.max(20, pr), pl = per * 0.62;
      for (let i = 0; i < n; i++) { const t = i * per; const a = Math.sin(Math.PI * (i + 0.5) / n) ** 0.5; parts.push(['pulse', t, pl, f, a, pl * 0.3, pl * 0.35, v.h2]); dur = t + pl; }
      break;
    }
    case 'rasp': {
      const syl = rival ? [...v.syllables, ...v.syllables] : v.syllables;
      syl.forEach((a, s) => {
        const t0 = s * (v.sylMs + v.gapMs) / 1000, sd = v.sylMs / 1000, per = 1 / v.teeth;
        for (let t = 0; t < sd; t += per) parts.push(['pulse', t0 + t, per * 0.8, f, a * (0.75 + 0.25 * Math.sin(Math.PI * t / sd)), 0.0004, per * 0.6, 0.25]);
        dur = t0 + sd;
      });
      break;
    }
    case 'trill': {
      const d = rival ? v.durS * 0.6 : v.durS, per = 1 / v.pulseRate, pl = per * v.duty;
      for (let t = 0; t + pl <= d; t += per) { const a = Math.min(1, t / 0.08, (d - t) / 0.08); parts.push(['pulse', t, pl, f, a, pl * 0.25, pl * 0.3, v.h2]); dur = t + pl; }
      break;
    }
    case 'bell': {
      const n = rival ? 3 : 1;
      for (let k = 0; k < n; k++) parts.push(['bell', k * 0.16, v.decayS, f]);
      dur = (n - 1) * 0.16 + v.decayS * 5;
      break;
    }
    case 'knock': {
      const n = rival ? 4 : v.taps;
      for (let k = 0; k < n; k++) parts.push(['knock', k * v.tapGapMs / 1000 * (rival ? 0.7 : 1), f]);
      dur = (n - 1) * v.tapGapMs / 1000 + 0.12;
      break;
    }
    case 'beep': parts.push(['beep', 0, v.durMs / 1000, f]); dur = v.durMs / 1000; break;
    case 'peep': {
      const n = rival ? 3 : 1;
      for (let k = 0; k < n; k++) parts.push(['peep', k * 0.3, v.durMs / 1000, v.from * pitch, v.to * pitch]);
      dur = (n - 1) * 0.3 + v.durMs / 1000;
      break;
    }
    case 'clicks': {
      const n = pick(v.count) + (rival ? 3 : 0);
      for (let k = 0; k < n; k++) parts.push(['click', k * v.spacingMs / 1000, f * (k % 2 ? 0.92 : 1)]);
      dur = (n - 1) * v.spacingMs / 1000 + 0.04;
      break;
    }
    case 'noise': parts.push(['noise', 0, v.durS]); dur = v.durS; break;
    case 'tone': parts.push(['tone', 0, v.durS]); dur = v.durS; break;
    case 'arp': v.notes.forEach((nf, k) => parts.push(['arpnote', k * v.stepMs / 1000, v.noteS, nf * pitch])); dur = (v.notes.length - 1) * v.stepMs / 1000 + v.noteS; break;
    default: break;
  }
  const out = new Float32Array(Math.ceil((dur + 0.02) * sr));
  const nr = rng(`noise:${seed}:${song}`);
  for (const p of parts) {
    switch (p[0]) {
      case 'pulse': addPulse(out, sr, p[1], p[2], p[3], p[4], p[5], p[6], p[7]); break;
      case 'bell': { // strike + ring: fundamental, a weak inharmonic partial, slow beating
        const i0 = Math.round(p[1] * sr), n = Math.round(p[2] * 5 * sr), fb = p[3];
        for (let i = 0; i < n && i0 + i < out.length; i++) {
          const t = i / sr, e = Math.min(1, t / 0.003) * Math.exp(-t / p[2]);
          out[i0 + i] += e * (Math.sin(TAU * fb * t) * (1 + 0.15 * Math.sin(TAU * 6 * t)) + 0.12 * Math.exp(-t / 0.05) * Math.sin(TAU * fb * 2.76 * t));
        }
        break;
      }
      case 'knock': { // wooden: two damped modes + a click
        const i0 = Math.round(p[1] * sr), n = Math.round(0.12 * sr), fk = p[2];
        for (let i = 0; i < n && i0 + i < out.length; i++) {
          const t = i / sr;
          out[i0 + i] += Math.exp(-t / 0.022) * Math.sin(TAU * fk * t) + 0.6 * Math.exp(-t / 0.01) * Math.sin(TAU * fk * 2.3 * t) + (t < 0.002 ? (nr() * 2 - 1) * 0.6 : 0);
        }
        break;
      }
      case 'beep': { // piezo: near-square (fundamental + weak odd harmonic), hard edges
        const i0 = Math.round(p[1] * sr), n = Math.round(p[2] * sr), fb = p[3];
        for (let i = 0; i < n && i0 + i < out.length; i++) { const t = i / sr, e = envAt(t, p[2], 0.001, 0.002); out[i0 + i] += e * (Math.sin(TAU * fb * t) + 0.18 * Math.sin(TAU * 3 * fb * t)); }
        break;
      }
      case 'peep': { // clear rising sweep
        const i0 = Math.round(p[1] * sr), n = Math.round(p[2] * sr); let ph = 0;
        for (let i = 0; i < n && i0 + i < out.length; i++) { const t = i / sr, fr = p[3] + (p[4] - p[3]) * Math.sqrt(t / p[2]); ph += TAU * fr / sr; out[i0 + i] += Math.sin(Math.PI * t / p[2]) ** 1.5 * Math.sin(ph); }
        break;
      }
      case 'click': { // "chik": a short damped tone with a noisy attack
        const i0 = Math.round(p[1] * sr), n = Math.round(0.035 * sr), fc = p[2];
        for (let i = 0; i < n && i0 + i < out.length; i++) { const t = i / sr; out[i0 + i] += Math.exp(-t / 0.008) * (Math.sin(TAU * fc * t) + 0.35 * (nr() * 2 - 1)); }
        break;
      }
      case 'noise': {
        const fl = v.flutterHz || 0;
        bandNoise(out, sr, 0, p[2], v.f, v.sweepTo || v.f, v.q, 1, (t, d) => Math.sin(Math.PI * Math.min(1, t / d)) ** (v.sweepTo ? 1 : 0.6) * (fl ? 0.55 + 0.45 * Math.sin(TAU * fl * t) : 1), nr);
        break;
      }
      case 'tone': {
        const n = Math.round(v.durS * sr); let ph = 0;
        for (let i = 0; i < n; i++) {
          const t = i / sr, fr = v.f * pitch * Math.pow(v.slide, t / v.durS); ph += TAU * fr / sr;
          const s = v.wave === 'square' ? Math.sign(Math.sin(ph)) * 0.6 : Math.sin(ph);
          out[i] += Math.min(1, t / 0.004) * Math.exp(-3 * t / v.durS) * s * (v.trem ? 0.6 + 0.4 * Math.sin(TAU * v.trem * t) : 1);
        }
        break;
      }
      case 'arpnote': {
        const i0 = Math.round(p[1] * sr), n = Math.round(p[2] * sr);
        for (let i = 0; i < n && i0 + i < out.length; i++) { const t = i / sr; out[i0 + i] += Math.min(1, t / 0.004) * Math.exp(-t / (p[2] / 3)) * (Math.sin(TAU * p[3] * t) + 0.2 * Math.sin(TAU * 2 * p[3] * t)); }
        break;
      }
      default: break;
    }
  }
  let peak = 0; for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i]));
  const g = peak > 0 ? (v.level || 0.4) * (rival ? 1.25 : 1) / peak : 0;
  for (let i = 0; i < out.length; i++) out[i] *= g;
  return out;
}

/** The rescue chord: the freed cricket's chirp stacked 1 : 5/4 : 3/2 : 2, staggered. */
export function renderRescueChord(cricket, sr = 44100, opts = {}) {
  let key = voiceFor(cricket); if (key === 'knock') key = 'house';
  const ratios = [1, 1.25, 1.5, 2];
  const songs = ratios.map((q, i) => render(key, sr, { ...opts, pitch: (opts.pitch || 1) * q * (key === 'ground' ? 0.6 : 1), seed: `${cricket}:chord${i}` }));
  const step = Math.round(0.07 * sr);
  const out = new Float32Array(Math.max(...songs.map((s, i) => s.length + i * step)));
  songs.forEach((s, i) => { for (let j = 0; j < s.length; j++) out[j + i * step] += s[j] * 0.5; });
  return out;
}

/** The finale chorus: the voice key for every singer (crickets and Not-Crickets). */
export const CHORUS = {
  pip: 'house', stripe: 'banded', katy: 'katydid', duo: 'twospot', frost: 'snowy', hump: 'knock',
  jam: 'field', rin: 'bell', digby: 'mole', mote: 'ground', chip: 'house',
  peeper: 'peeper', smoke: 'alarm', chikchak: 'chikchak',
  // Soot's swift chitter and Velvet's bat squeaks are audiogen files (audio.play('swift-chitter'), 'bat-squeaks')
};
