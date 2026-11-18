// Builder C: screenshots of the Dragon's Lair (design/screenshots/zlair-*.png) at moments of the
// recorded boss solution, plus the text scanner.   node tools/solutions/lair-shots.mjs [--url ...]
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const url = args.includes('--url') ? args[args.indexOf('--url') + 1] : 'http://127.0.0.1:8176/';
const S = 'CLshots';
const cli = (...a) => execFileSync('playwright-cli', [`-s=${S}`, ...a], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 600000 });
const SCAN = (process.env.GAMEGEN_DIR || '') + '/scripts/scan-text.js'; // set GAMEGEN_DIR to the gamegen skill folder
const boss = JSON.parse(readFileSync(path.join(root, 'design/solutions/zone-lair-boss.json'), 'utf8'));
const pathSol = JSON.parse(readFileSync(path.join(root, 'design/solutions/zone-lair-path.json'), 'utf8'));

// play a solution's events up to frame `until`, then let it render
function at(sol, until, name, extra = '') {
  const code = `async page => {
    const sol = ${JSON.stringify({ start: sol.start, events: sol.events })};
    await page.evaluate((st) => { window.__game.goToRoom(st.room, { x: st.x, y: st.y, items: st.items, party: st.party }); window.__game.freeze(); }, sol.start);
    let f = 0;
    for (const [ef, code, t] of sol.events) {
      if (ef > ${until}) break;
      if (ef > f) { await page.evaluate((n) => window.__game.step(n), ef - f); f = ef; }
      if (t === 'down') await page.keyboard.down(code); else await page.keyboard.up(code);
    }
    if (${until} > f) await page.evaluate((n) => window.__game.step(n), ${until} - f);
    for (const k of ['ArrowRight','ArrowLeft','ArrowUp','KeyB','KeyZ','KeyX']) await page.keyboard.up(k);
    ${extra}
    await page.waitForTimeout(700);
    return await page.evaluate(() => window.__game.state().room);
  }`;
  cli('run-code', code);
  cli('screenshot', `--filename=design/screenshots/zlair-${name}.png`);
  const scan = cli('run-code', `async page => { await page.addScriptTag({ path: '${SCAN}' }); return await page.evaluate(() => window.__scanText()); }`);
  const m = scan.match(/### Result\n([\s\S]*?)(\n### |$)/);
  console.log(name, 'scan:', m ? m[1].trim().slice(0, 300) : scan.slice(0, 300));
}

try { cli('close'); } catch { /* */ }
cli('open', url); cli('run-code', 'async page => { await page.waitForFunction(() => window.__game, null, { timeout: 60000 }); }'); cli('resize', '1280', '720'); cli('press', 'Enter');
at(pathSol, 120, 'lair-gap');
at(pathSol, 340, 'dragon-lair-door');
at(boss, 200, 'dragon-lair-p1-gaze');
at(boss, 1000, 'dragon-lair-p1-steps');
at(boss, 1500, 'dragon-lair-p2-claw');
at(boss, 1790, 'dragon-lair-p2-climb');
at(boss, 2790, 'dragon-lair-p3-summit');
at(boss, 2860, 'dragon-lair-p3-wave');
at(boss, 2929, 'dragon-lair-friend');
console.log(cli('console', 'error').slice(0, 1500));
cli('close');
