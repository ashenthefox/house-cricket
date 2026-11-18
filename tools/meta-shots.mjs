#!/usr/bin/env node
// Meta/UI play-test helper: opens every menu, card and screen at a size, screenshots each to
// design/screenshots/m4-<name>-<tag>.png and runs gamegen's text scanner on it.
//   node tools/meta-shots.mjs [--url http://127.0.0.1:8157/] [--size 1280x720] [--tag desktop]
//        [--device "iPhone 15"] [--pad]   (pad: a pretend DualSense drives the menus)
// Needs the game served (any port). Run from the project root.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const url = opt('--url', 'http://127.0.0.1:8157/');
const size = opt('--size', '1280x720');
const tag = opt('--tag', 'desktop');
const device = opt('--device', null);
const session = opt('--session', `meta-${tag}`);   // [playtest] --session, --prefix (pt- for the play-test)
const prefix = opt('--prefix', 'm4');
const SCAN = (process.env.GAMEGEN_DIR || '') + '/scripts/scan-text.js'; // set GAMEGEN_DIR to the gamegen skill folder
const cli = (...a) => execFileSync('playwright-cli', [`-s=${session}`, ...a], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 300000 });

try { cli('close'); } catch { /* not open */ }
cli('open', ...(device ? ['--device', device] : []), url);
cli('run-code', 'async page => { await page.waitForFunction(() => window.__game, null, { timeout: 60000 }); }'); // [final-S] the game loads after the title is up
const [w, h] = size.split('x');
cli('resize', w, h);

const code = `async page => {
  const shots = ${JSON.stringify(path.join(root, 'design/screenshots'))};
  const tag = ${JSON.stringify(tag)};
  const report = [];
  const wait = (ms) => page.waitForTimeout(ms);
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const shot = async (name) => {
    await wait(350);
    await page.screenshot({ path: shots + '/' + ${JSON.stringify(prefix)} + '-' + name + '-' + tag + '.png' });
    await page.addScriptTag({ path: ${JSON.stringify(SCAN)} });
    const found = await ev(() => window.__scanText());
    const fr = await ev(() => window.__game.frames().slice(-1)[0][0]);
    report.push({ name, frame: fr, problems: found });
  };
  const key = async (k) => { await page.keyboard.press(k); await wait(120); };
  await wait(800);
  await shot('press');
  await key('Enter');
  await shot('title');
  // settings from the title
  // focus by label (Continue is skipped while it's disabled), then press with keys
  const focusTo = async (label) => { for (let i = 0; i < 12; i++) { const t = await ev(() => document.activeElement?.textContent || ''); if (t.startsWith(label)) return; await key('ArrowDown'); } };
  await focusTo('Settings'); await key('Enter');
  await shot('settings');
  await key('ArrowRight'); await key('ArrowDown'); await key('ArrowDown'); await key('ArrowDown'); await key('ArrowRight');
  const st1 = await ev(() => JSON.parse(localStorage.getItem('housecricket.v1.settings') || '{}'));
  report.push({ name: 'settings-persist', music: st1.music, beaconChirps: st1.beaconChirps });
  await key('Escape');
  await focusTo('How to Play'); await key('Enter');
  await shot('howto');
  await key('KeyE'); await shot('howto-touch');
  await key('KeyE'); await shot('howto-pad');
  await key('Escape');
  await focusTo('Credits'); await key('Enter');
  await wait(1500); await shot('credits');
  await key('Escape'); await wait(200);
  await focusTo('New Game'); await key('Enter');
  await shot('newgame');
  await key('Enter'); await wait(600);              // slot 1 -> the opening
  await shot('story');
  await page.keyboard.down('KeyZ'); await wait(1500); await page.keyboard.up('KeyZ'); // hold: skip all
  await wait(400);
  await shot('after-skip');
  await page.keyboard.down('KeyZ'); await wait(1500); await page.keyboard.up('KeyZ');
  await wait(500);
  await shot('play');
  await key('Escape'); await shot('pause');
  await key('KeyE'); await wait(300); await shot('map');
  await key('KeyE'); await shot('crickets');
  await key('KeyQ'); await key('KeyQ'); await focusTo('How to Play'); await key('Enter'); await shot('pause-howto');
  await key('Escape'); await key('Escape');
  // cards and dialog (set-up through the debug hook, then driven by keys)
  await ev(() => { const g = window.__game; g.goToRoom('sb-meadow', { rescued: ['stripe', 'katy', 'duo', 'frost', 'hump', 'jam', 'rin', 'digby', 'mote'], party: ['digby', 'duo', 'mote'] }); });
  await wait(200);
  await ev(() => window.__game.open('complete', 'stripe')); await shot('complete');
  await key('ArrowDown'); await key('Enter');
  await ev(() => window.__game.open('ready', 'nana')); await shot('ready-nana');
  await key('ArrowDown'); await key('Enter'); await shot('trio-nana');
  await key('Escape');
  await ev(() => window.__game.open('ready', 'duchess')); await shot('ready');
  await key('Escape');
  await ev(() => window.__game.open('crack')); await shot('crack');
  await key('Escape');
  await ev(() => window.__game.open('damper')); await shot('damper');
  await key('Enter');
  await ev(() => window.__game.open('dialog', 'geckos.lashes.pre')); await wait(700); await shot('dialog-lashes');
  for (let i = 0; i < 8; i++) await key('KeyZ');
  await ev(() => { const g = window.__game; for (const r of ['rolo', 'page', 'lumen', 'dot', 'weft', 'crumb', 'glim', 'shelly', 'peeper', 'soot', 'velvet', 'beep']) g.recruit(r); g.carrier(); g.freeze(); g.step(2200); g.unfreeze(); });
  for (let i = 0; i < 6; i++) await key('KeyZ');
  await shot('carrier');
  await key('Escape'); await key('KeyE'); await key('KeyE'); await key('KeyE'); await shot('soundbook');
  await key('KeyE'); await key('KeyE'); await key('KeyE'); await key('KeyE'); await key('KeyE');
  await key('Escape');
  // save and quit, then load
  await key('Escape'); await focusTo('Save and Quit'); await key('Enter');
  await wait(300);
  await focusTo('Load'); await key('Enter'); await shot('load');
  await key('Enter'); await wait(500);
  report.push({ name: 'loaded', state: await ev(() => { const s = window.__game.state(); const m = window.__game.meta(); return { screen: s.screen, inCarrier: m.inCarrier, rescued: s.rescued.length, recruits: s.recruits.length, crumbs: m.crumbs, shown: m.shown.length }; }) });
  await key('Escape');
  await ev(() => window.__game.open && 0);
  const errs = await ev(() => 0);
  return JSON.stringify(report);
}`;
const out = cli('run-code', code);
const m = out.match(/### Result\n([\s\S]*?)(\n### |\n*$)/);
let rep = m ? m[1].trim() : out;
try { rep = JSON.parse(JSON.parse(rep)); } catch { try { rep = JSON.parse(rep); } catch { /* raw */ } }
let bad = 0;
if (Array.isArray(rep)) for (const r of rep) {
  const probs = r.problems || [];
  bad += probs.length;
  console.log(`${r.name.padEnd(16)} ${r.frame || ''} ${probs.length ? JSON.stringify(probs) : (r.problems ? 'clean' : JSON.stringify(r))}`);
} else console.log(rep);
const errs = cli('console', 'error');
console.log((errs.match(/Total messages: .*/) || ['?'])[0]);
if (/Errors: [1-9]/.test(errs)) console.log(errs.split('\n').filter((l) => /ERROR/.test(l)).slice(0, 10).join('\n'));
process.exit(bad ? 1 : 0);
