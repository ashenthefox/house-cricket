#!/usr/bin/env node
// Checks every synthesized voice in game/src/chirps.js against design/RESEARCH.md:
// FFT peak frequency and pulse timing from the samples. Exit 1 on a mismatch.
//   node tools/chirp-check.mjs            (node: renders with chirps.js directly)
//   node tools/chirp-check.mjs --json f   (check samples dumped from __game.renderChirp: {voice: {sampleRate, samples}})
//   node tools/chirp-check.mjs --browser http://127.0.0.1:8131/   (renders every voice in the page through
//        __game.renderChirp (an OfflineAudioContext) with playwright-cli, then checks; run from the project root)
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { render, VOICES } from '../game/src/chirps.js';

export const EXPECT = {
  house:   { hz: [4600, 5000], pulses: [2, 3], periodMs: [40, 50], pulseMs: [15, 21] },
  banded:  { hz: [5800, 6200], pulses: [2, 3] },
  twospot: { hz: [4500, 4800], pulses: [4, 5] },
  field:   { hz: [4300, 4700], pulses: [3, 4] },
  snowy:   { hz: [2900, 3100], pulseRate: [55, 80] },
  katydid: { hz: [2500, 4000], pulses: [3, 3], group: true },
  mole:    { hz: [2400, 2600] },
  ground:  { hz: [7000, 8000] },
  bell:    { hz: [3800, 4200], decayMs: [200, 450] },
  alarm:   { hz: [2800, 3300], pulses: [1, 1] },
  peeper:  { hz: [2600, 3200], rising: true },
  chikchak:{ hz: [2800, 3600], pulses: [6, 9] },
};

export function peakHz(x, sr) {
  let n = 1; while (n < x.length) n <<= 1; n = Math.min(n, 1 << 16);
  const re = new Float64Array(n), im = new Float64Array(n);
  for (let i = 0; i < Math.min(n, x.length); i++) re[i] = x[i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / Math.min(n, x.length)));
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) {
      const ur = re[i + k], ui = im[i + k], xr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, xi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
      re[i + k] = ur + xr; im[i + k] = ui + xi; re[i + k + len / 2] = ur - xr; im[i + k + len / 2] = ui - xi;
      const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } }
  }
  let best = 0, bi = 0; for (let k = 1; k < n / 2; k++) { const m = re[k] * re[k] + im[k] * im[k]; if (m > best) { best = m; bi = k; } }
  return bi * sr / n;
}
// Pulses: envelope (1 ms RMS) above 30% of peak, merged across gaps < gapMs.
export function pulses(x, sr, gapMs = 3) {
  const w = Math.round(sr / 1000), env = [];
  for (let i = 0; i + w <= x.length; i += w) { let s = 0; for (let j = 0; j < w; j++) s += x[i + j] ** 2; env.push(Math.sqrt(s / w)); }
  const pk = Math.max(...env), on = env.map((e) => e > pk * 0.3);
  const out = []; let cur = null, off = 0;
  on.forEach((o, ms) => { if (o) { if (cur && off <= gapMs) cur.end = ms; else { cur = { start: ms, end: ms }; out.push(cur); } off = 0; } else off++; });
  return out.map((p) => ({ start: p.start, len: p.end - p.start + 1 }));
}
export function check(voice, x, sr) {
  const e = EXPECT[voice], errs = [];
  const hz = peakHz(x, sr);
  if (hz < e.hz[0] || hz > e.hz[1]) errs.push(`peak ${hz.toFixed(0)} Hz not in ${e.hz}`);
  const ps = pulses(x, sr, e.group ? 20 : 3);
  const info = { hz: Math.round(hz), pulses: ps.length };
  if (e.pulses && (ps.length < e.pulses[0] || ps.length > e.pulses[1])) errs.push(`${ps.length} pulses, want ${e.pulses}`);
  if (e.periodMs && ps.length > 1) { const per = (ps[ps.length - 1].start - ps[0].start) / (ps.length - 1); info.periodMs = per; if (per < e.periodMs[0] || per > e.periodMs[1]) errs.push(`period ${per} ms`); }
  if (e.pulseMs) { const l = ps[0].len; info.pulseMs = l; if (l < e.pulseMs[0] || l > e.pulseMs[1]) errs.push(`pulse ${l} ms`); }
  if (e.pulseRate) { const pr = pulses(x, sr, 0); const rate = (pr.length - 1) / ((pr[pr.length - 1].start - pr[0].start) / 1000); info.pulseRate = Math.round(rate); if (rate < e.pulseRate[0] || rate > e.pulseRate[1]) errs.push(`pulse rate ${rate}`); }
  if (e.decayMs) { const l = ps[0].len; info.ringMs = l; if (l < e.decayMs[0] || l > e.decayMs[1]) errs.push(`ring ${l} ms`); }
  if (e.rising) { const h = Math.floor(x.length / 2); const a = peakHz(x.slice(0, h), sr), b = peakHz(x.slice(h), sr); info.rise = [Math.round(a), Math.round(b)]; if (!(b > a)) errs.push('not rising'); }
  return { voice, ok: !errs.length, ...info, errs };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const i = process.argv.indexOf('--json');
  let set;
  const b = process.argv.indexOf('--browser');
  if (i > 0) set = JSON.parse(readFileSync(process.argv[i + 1], 'utf8'));
  else if (b > 0) {
    const cli = (...a) => execFileSync('playwright-cli', ['-s=chirpcheck', ...a], { encoding: 'utf8', maxBuffer: 256 << 20 });
    cli('open', process.argv[b + 1] || 'http://127.0.0.1:8131/');
    cli('run-code', 'async page => { await page.waitForFunction(() => window.__game, null, { timeout: 60000 }); }'); // [final-S] the game loads after the title is up
    const out = cli('eval', `async () => { const o = {}; for (const v of ${JSON.stringify(Object.keys(EXPECT))}) { const r = await window.__game.renderChirp(v); o[v] = { sampleRate: r.sampleRate, samples: r.samples }; } return JSON.stringify(o); }`);
    cli('close');
    set = JSON.parse(JSON.parse(out.match(/### Result\n([\s\S]*?)\n### /)[1]));
  }
  else { set = {}; for (const v of Object.keys(EXPECT)) set[v] = { sampleRate: 44100, samples: render(v, 44100, { temp: 77, seed: v }) }; }
  let bad = 0;
  for (const [v, { sampleRate, samples }] of Object.entries(set)) {
    if (!EXPECT[v]) continue;
    const r = check(v, Float32Array.from(samples), sampleRate);
    if (!r.ok) bad++;
    console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${v.padEnd(9)} ${JSON.stringify({ ...r, voice: undefined, ok: undefined, errs: r.errs.length ? r.errs : undefined })}`);
  }
  if (VOICES && bad) process.exit(1);
}
