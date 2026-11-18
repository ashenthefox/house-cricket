#!/usr/bin/env node
// Drives the meta screens by touch only on a phone (iPhone 15, 844x390 landscape): title, new
// game, the opening (tap / long-press), HUD pause and map icons, pause tabs, a card, the Carrier
// facility prompt, settings. Prints where each tap led; screenshots m4-touch-*.png.
//   node tools/meta-touch.mjs [--url http://127.0.0.1:8157/]
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const url = (() => { const i = args.indexOf('--url'); return i >= 0 ? args[i + 1] : 'http://127.0.0.1:8157/'; })();
const session = 'meta-touch';
const cli = (...a) => execFileSync('playwright-cli', [`-s=${session}`, ...a], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 300000 });
try { cli('close'); } catch { /* not open */ }
cli('open', '--device', 'iPhone 15', url);
cli('run-code', 'async page => { await page.waitForFunction(() => window.__game, null, { timeout: 60000 }); }'); // [final-S] the game loads after the title is up
cli('resize', '844', '390');
const code = `async page => {
  const shots = ${JSON.stringify(path.join(root, 'design/screenshots'))};
  const log = [];
  const wait = (ms) => page.waitForTimeout(ms);
  const ev = (fn, a) => page.evaluate(fn, a);
  const where = async (label) => { const f = await ev(() => window.__game.frames().slice(-1)[0][0]); log.push([label, f]); };
  const tapText = async (sel, text) => { await page.locator(sel, { hasText: text }).first().tap(); await wait(250); };
  const tapAt = async (x, y) => { await page.touchscreen.tap(x, y); await wait(250); };
  await wait(800);
  await tapAt(420, 200); await where('tap: press any');
  await tapText('.menu-btn', 'New Game'); await where('new game');
  await tapText('.slot-btn', 'Slot 1'); await wait(400); await where('story');
  await tapAt(420, 200); await where('tap skips a panel');
  // long press skips the rest
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 420, y: 200 }] });
  await wait(1300);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await wait(500); await where('long press');
  if ((await ev(() => window.__game.meta().story))) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 420, y: 200 }] }); await wait(1300); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await wait(500); }
  await where('play');
  await page.locator('button[aria-label=pause]').tap(); await wait(250); await where('pause icon');
  await tapText('.tab', 'Map'); await where('map tab');
  await page.screenshot({ path: shots + '/m4-touch-map.png' });
  await tapText('.tab', 'Crickets'); await where('crickets tab');
  await tapText('.menu-btn', 'Back'); await where('back');
  await page.locator('button[aria-label=map]').tap(); await wait(250); await where('map icon');
  await tapText('.menu-btn', 'Back'); await where('map back');
  await ev(() => window.__game.open('complete', 'stripe')); await wait(200);
  await tapText('.menu-btn', 'Return to the Carrier'); await wait(500); await where('card -> carrier');
  await ev(() => { window.__game.freeze(); window.__game.step(300); window.__game.unfreeze(); });
  // walk to the crack with the touch stick is slow; tap the prompt instead when it shows
  const pr = await ev(() => { const p = document.querySelector('.prompt'); return p && !p.hidden ? p.textContent : null; });
  log.push(['prompt in carrier', pr]);
  if (pr) { await page.locator('.prompt').tap(); await wait(300); await where('tap prompt'); await page.screenshot({ path: shots + '/m4-touch-hubcrack.png' }); await tapText('.menu-btn', 'Stay a while'); await where('stay'); }
  await page.locator('button[aria-label=pause]').tap(); await wait(250);
  await tapText('.menu-btn', 'Settings'); await where('settings');
  const before = await ev(() => document.querySelector('[data-id=shake] .mb-val').textContent);
  await page.locator('[data-id=shake]').tap(); await wait(150);
  const after = await ev(() => document.querySelector('[data-id=shake] .mb-val').textContent);
  log.push(['shake toggle by tap', before, after]);
  await page.locator('[data-id=music] .slider').tap({ position: { x: 10, y: 5 } }); await wait(150);
  log.push(['music slider tap', await ev(() => JSON.parse(localStorage.getItem('housecricket.v1.settings')).music)]);
  await page.screenshot({ path: shots + '/m4-touch-settings.png' });
  await tapText('.menu-btn', 'Back'); await tapText('.menu-btn', 'Resume'); await where('resume');
  return JSON.stringify(log);
}`;
const out = cli('run-code', code);
const m = out.match(/### Result\n([\s\S]*?)(\n### |\n*$)/);
let rep = m ? m[1].trim() : out;
try { rep = JSON.parse(JSON.parse(rep)); } catch { /* raw */ }
if (Array.isArray(rep)) for (const r of rep) console.log(r.map((x) => String(x)).join(' | ')); else console.log(rep);
console.log((cli('console', 'error').match(/Total messages: .*/) || ['?'])[0]);
