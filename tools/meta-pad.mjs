#!/usr/bin/env node
// Drives every meta screen with a pretend DualSense only (gamepad.md): title, settings,
// how-to, new game, the opening (hold Cross to skip), pause tabs (L1/R1), map (Create),
// cards, the Carrier, unplugging. Prints what each press led to; screenshots m4-pad-*.png.
//   node tools/meta-pad.mjs [--url http://127.0.0.1:8157/]
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const url = (() => { const i = args.indexOf('--url'); return i >= 0 ? args[i + 1] : 'http://127.0.0.1:8157/'; })();
const session = 'meta-pad';
const cli = (...a) => execFileSync('playwright-cli', [`-s=${session}`, ...a], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 300000 });
const PAD_INIT = `() => {
  const blank = () => ({ pressed: false, touched: false, value: 0 });
  const pad = { id: 'DualSense Wireless Controller (STANDARD GAMEPAD Vendor: 054c Product: 0ce6)', index: 0, connected: false, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, blank) };
  const fire = (type) => { const e = new Event(type); Object.defineProperty(e, 'gamepad', { value: pad }); window.dispatchEvent(e); };
  window.__pad = {
    connect(id) { if (id) pad.id = id; pad.connected = true; fire('gamepadconnected'); },
    disconnect() { pad.connected = false; fire('gamepaddisconnected'); },
    button(i, down) { pad.buttons[i] = down ? { pressed: true, touched: true, value: 1 } : blank(); pad.timestamp = performance.now(); },
    stick(x, y) { pad.axes[0] = x; pad.axes[1] = y; pad.timestamp = performance.now(); },
  };
  navigator.getGamepads = () => [pad.connected ? pad : null, null, null, null];
}`;
try { cli('close'); } catch { /* not open */ }
cli('open', url);
cli('resize', '1280', '720');
cli('run-code', `async page => { await page.addInitScript(${PAD_INIT}); await page.reload(); }`);
cli('run-code', 'async page => { await page.waitForFunction(() => window.__game, null, { timeout: 60000 }); }'); // [final-S] the game loads after the title is up
const code = `async page => {
  const shots = ${JSON.stringify(path.join(root, 'design/screenshots'))};
  const log = [];
  const wait = (ms) => page.waitForTimeout(ms);
  const ev = (fn, a) => page.evaluate(fn, a);
  const B = { cross: 0, circle: 1, square: 2, triangle: 3, L1: 4, R1: 5, create: 8, options: 9, up: 12, down: 13, left: 14, right: 15 };
  const btn = async (name, hold = 70) => { await ev(([i]) => window.__pad.button(i, true), [B[name]]); await wait(hold); await ev(([i]) => window.__pad.button(i, false), [B[name]]); await wait(110); };
  const where = async (label) => { const s = await ev(() => ({ f: window.__game.frames().slice(-1)[0][0], focus: (document.activeElement && document.activeElement.textContent || '').slice(0, 30), input: window.__game.state().input })); log.push([label, s.f, s.focus, s.input]); return s; };
  const focusTo = async (label) => { for (let i = 0; i < 14; i++) { const t = await ev(() => document.activeElement?.textContent || ''); if (t.startsWith(label)) return true; await btn('down'); } return false; };
  await wait(600);
  await ev(() => window.__pad.connect());
  await btn('cross'); await where('press');
  await focusTo('Settings'); await btn('cross'); await where('settings');
  const before = await ev(() => JSON.parse(localStorage.getItem('housecricket.v1.settings') || '{}').music ?? 0.8);
  await btn('right'); await btn('right');
  const after = await ev(() => JSON.parse(localStorage.getItem('housecricket.v1.settings') || '{}').music);
  log.push(['music slider by d-pad', before, after]);
  // held d-pad repeats: down held 1 s moves several times
  await ev(() => window.__pad.button(13, true)); await wait(1000); await ev(() => window.__pad.button(13, false)); await wait(120);
  await where('after held down (repeat)');
  await btn('circle'); await where('back to title');
  await focusTo('How to Play'); await btn('cross'); await where('howto');
  await page.screenshot({ path: shots + '/m4-pad-howto.png' });
  await btn('R1'); await where('howto tab R1');
  await btn('circle');
  await focusTo('New Game'); await btn('cross'); await where('new game');
  await btn('cross'); await wait(300); await where('story');
  await btn('cross', 1400); await wait(300); await where('after hold cross');
  await btn('cross', 1400); await wait(500); await where('play');
  await btn('options'); await where('pause (Options)');
  await page.screenshot({ path: shots + '/m4-pad-pause.png' });
  await btn('R1'); await where('R1 -> map');
  await btn('R1'); await where('R1 -> crickets');
  await btn('right'); await where('right in crickets grid');
  await btn('L1'); await btn('L1'); await where('L1 L1 -> paused');
  await btn('circle'); await where('circle resumes');
  await btn('create'); await where('Create opens map');
  await btn('create'); await where('Create closes map');
  await ev(() => window.__game.open('complete', 'stripe')); await where('card');
  await btn('cross'); await wait(500); await where('cross: return to the Carrier');
  await ev(() => { window.__game.freeze(); window.__game.step(200); window.__game.unfreeze(); });
  await btn('options'); await focusTo('Settings'); await btn('cross'); await where('settings from pause');
  await btn('circle'); await btn('circle'); await where('back out');
  await ev(() => window.__pad.disconnect()); await wait(200); await where('unplugged');
  await page.screenshot({ path: shots + '/m4-pad-unplugged.png' });
  await ev(() => window.__pad.connect('Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)'));
  await btn('circle'); await wait(200);
  await btn('options'); await focusTo('How to Play'); await btn('cross'); await where('xbox howto');
  const caps = await ev(() => [...document.querySelectorAll('.howto .cap')].map((c) => c.textContent || c.querySelector('svg')?.getAttribute('aria-label')).slice(0, 6));
  log.push(['xbox caps', caps.join(' ')]);
  await page.keyboard.press('Escape'); await wait(150);
  const kb = await where('keyboard press switches prompts');
  return JSON.stringify(log);
}`;
const out = cli('run-code', code);
const m = out.match(/### Result\n([\s\S]*?)(\n### |\n*$)/);
let rep = m ? m[1].trim() : out;
try { rep = JSON.parse(JSON.parse(rep)); } catch { /* raw */ }
if (Array.isArray(rep)) for (const r of rep) console.log(r.map((x) => String(x)).join(' | ')); else console.log(rep);
console.log((cli('console', 'error').match(/Total messages: .*/) || ['?'])[0]);
