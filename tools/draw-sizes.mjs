#!/usr/bin/env node
// [issue 14] The largest size each picture is drawn at, in screen pixels: replays every solution in
// the browser (keys, frame-locked, drawing every few steps), then visits every room and the Carrier,
// recording each canvas drawImage of an assets/ picture (its size after the canvas transform) and
// every <img> / CSS background on screen. For tools/asset-weight.mjs --draws (which pictures are
// stored far larger than drawn) and art/max-size.json (tools/build-art.py's downscaling).
//
//   node tools/draw-sizes.mjs --out draws.json [--url http://127.0.0.1:8131/] [--size 1920x1080]
//        [--session draws] [--every 3] [solution.json ...]
// Serve the game first (cd game && python3 -m http.server 8131). Needs playwright-cli; run from
// the project root. Takes ~15 min for every solution. The replays only drive the game to show its
// art: they don't check end states (tools/replay.mjs does).
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const url = opt('--url', 'http://127.0.0.1:8131/'), session = opt('--session', 'draws'), out = opt('--out', null);
const [W, H] = opt('--size', '1920x1080').split('x').map(Number), EVERY = +opt('--every', 3);
if (!out) { console.error('usage: node tools/draw-sizes.mjs --out draws.json [...]'); process.exit(2); }
const valued = new Set(['--url', '--session', '--out', '--size', '--every']);
let files = args.filter((a, i) => !a.startsWith('--') && !valued.has(args[i - 1]));
if (!files.length) files = readdirSync(path.join(root, 'design', 'solutions')).filter((f) => f.endsWith('.json') && f !== 'full-run.json').sort().map((f) => path.join(root, 'design', 'solutions', f));
const cli = (...a) => execFileSync('playwright-cli', [`-s=${session}`, ...a], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 1800000 });
const result = (o) => { const m = o.match(/### Result\n([\s\S]*?)(\n### |\n*$)/); let t = m ? m[1].trim() : ''; try { t = JSON.parse(t); } catch { /* */ } try { return typeof t === 'string' ? JSON.parse(t) : t; } catch { return t; } };

// installed before the game loads: wraps drawImage and records the largest drawn size per file
const HOOK = `() => {
  const rec = (window.__draws = {});
  const note = (src, w, h, nw, nh) => {
    const i = src.indexOf('/assets/'); if (i < 0) return;
    const p = decodeURIComponent(src.slice(i + 8).split('?')[0]);
    const r = rec[p] || (rec[p] = { w: 0, h: 0, k: 0, nw, nh });
    if (w > r.w) r.w = w; if (h > r.h) r.h = h;
    const k = Math.max(w / nw, h / nh); if (k > r.k) r.k = k;
  };
  const orig = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function (img, ...a) {
    try {
      if (img instanceof HTMLImageElement && img.naturalWidth) {
        const t = this.getTransform(), sx = Math.hypot(t.a, t.b), sy = Math.hypot(t.c, t.d);
        let sw = img.naturalWidth, sh = img.naturalHeight, dw = sw, dh = sh;
        if (a.length === 4) { dw = a[2]; dh = a[3]; }
        if (a.length === 8) { sw = a[2]; sh = a[3]; dw = a[6]; dh = a[7]; }
        note(img.src, Math.abs(dw * sx) / Math.max(1, Math.abs(sw)) * img.naturalWidth, Math.abs(dh * sy) / Math.max(1, Math.abs(sh)) * img.naturalHeight, img.naturalWidth, img.naturalHeight);
      }
    } catch { /* never break a draw */ }
    return orig.call(this, img, ...a);
  };
  window.__domScan = () => {
    for (const el of document.querySelectorAll('img')) { const r = el.getBoundingClientRect(); if (r.width && el.naturalWidth && el.offsetParent !== null) note(el.src, r.width * devicePixelRatio, r.height * devicePixelRatio, el.naturalWidth, el.naturalHeight); }
    for (const el of document.querySelectorAll('*')) {
      const bg = getComputedStyle(el).backgroundImage; if (!bg || !bg.includes('/assets/')) continue;
      const r = el.getBoundingClientRect(); if (!r.width) continue;
      const m = bg.match(/url\\("?([^")]+)"?\\)/); if (!m) continue;
      const im = (window.__bgImgs ||= {})[m[1]] || (window.__bgImgs[m[1]] = Object.assign(new Image(), { src: m[1] }));
      if (im.naturalWidth) note(m[1], r.width * devicePixelRatio, r.height * devicePixelRatio, im.naturalWidth, im.naturalHeight);
    }
  };
}`;
// one solution: keys on its game frames, a frame drawn every EVERY steps; modals closed as tools/replay.mjs does
const replay = (sol) => `async page => {
  const sol = ${JSON.stringify({ start: sol.start, events: sol.events, frames: sol.frames })}, every = ${EVERY};
  await page.evaluate((st) => { window.__game.goToRoom(st.room, { x: st.x, y: st.y, items: st.items || [], party: st.party || ['pip'], rescued: st.rescued || [] }); window.__game.freeze(); }, sol.start);
  await page.waitForFunction(() => !window.__gate.info().holding, null, { timeout: 30000 }).catch(() => {});
  const f0 = await page.evaluate(() => window.__game.state().frame), held = new Set();
  const advance = async (k) => {
    for (let guard = 0; guard < 400; guard++) {
      const r = await page.evaluate(async ([f0, k, every]) => {
        const raf = () => new Promise((res) => requestAnimationFrame(res));
        for (let n = 0; n < 200000; n++) {
          const m = window.__game.meta(), s = window.__game.state();
          const modal = m && (m.ui || (m.dialog ? 'dialog' : null) || m.story);
          if (modal) { await raf(); window.__domScan(); }
          if (modal || s.frame - f0 >= k) return { modal, reached: s.frame - f0 >= k };
          window.__game.step(1);
          if (n % every === 0) await raf();
        }
        return { stuck: true };
      }, [f0, k, every]);
      if (r.stuck) return;
      if (!r.modal) return;
      for (const c of held) await page.keyboard.up(c);
      for (let i = 0; i < 60; i++) {
        const open = await page.evaluate(() => { const m = window.__game.meta(); return m ? (m.ui || (m.dialog ? 'dialog' : null) || m.story) : null; });
        if (!open) break;
        const key = open === 'dialog' ? 'Enter' : 'Escape';
        await page.keyboard.down(key); await page.evaluate(() => window.__game.step(1)); await page.keyboard.up(key);
        await page.evaluate(() => { const m = window.__game.meta(); if (m && (m.ui || m.dialog || m.story)) window.__game.step(1); });
      }
      for (const c of held) await page.keyboard.down(c);
    }
  };
  for (const [frame, code, type] of sol.events) {
    await advance(frame);
    if (type === 'down') { held.add(code); await page.keyboard.down(code); } else { held.delete(code); await page.keyboard.up(code); }
  }
  await advance(sol.frames);
  for (const c of held) await page.keyboard.up(c);
  await page.evaluate(() => window.__game.unfreeze());
  return JSON.stringify(await page.evaluate(() => window.__game.state().room));
}`;
const ROOMS = `async page => {
  const all = ['booties', 'floss', 'raft', 'band', 'glider', 'thimble', 'glow', 'earplugs', 'feather', 'cloak'];
  for (const r of await page.evaluate(() => window.__game.zones().flatMap((z) => z.rooms))) {
    await page.evaluate(([r, all]) => window.__game.goToRoom(r, { items: all }), [r, all]);
    await page.waitForFunction(() => !window.__gate.info().holding, null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(250);
  }
  await page.evaluate(() => window.__game.carrier()); await page.waitForTimeout(1500); await page.evaluate(() => window.__domScan());
  return JSON.stringify(await page.evaluate(() => window.__draws));
}`;

try { cli('close'); } catch { /* not open */ }
cli('open', 'about:blank');
cli('resize', W, H);
cli('run-code', `async page => { await page.addInitScript(${HOOK}); await page.goto(${JSON.stringify(url + (url.includes('?') ? '&' : '?') + 'dev')}); await page.waitForFunction(() => window.__game, null, { timeout: 60000 }); await page.waitForTimeout(800); await page.keyboard.press('Enter'); await page.waitForTimeout(500); await page.evaluate(() => window.__domScan()); }`);
const t0 = Date.now();
for (const f of files) {
  const sol = JSON.parse(readFileSync(f, 'utf8'));
  if (!sol.start?.room) continue;
  const room = result(cli('run-code', replay(sol)));
  console.log(`${path.basename(f).padEnd(30)} ${room}  ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
const draws = result(cli('run-code', ROOMS));
cli('close');
writeFileSync(out, JSON.stringify({ viewport: [W, H], draws }, null, 1));
console.log(`draw-sizes: ${Object.keys(draws).length} pictures -> ${out}`);
