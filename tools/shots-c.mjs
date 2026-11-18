#!/usr/bin/env node
// Builder C: screenshot rooms (design/screenshots/<prefix>-<room>.png) and run the text scanner.
//   node tools/shots-c.mjs --url http://127.0.0.1:8172/ --session C7shots --prefix z07 \
//        room[@x,y][:items] ...      (items comma list; default: the zone's minItems + glow)
// Each shot: goToRoom (fresh game), let it run ~1.2 s, screenshot, scan the page text.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const url = opt('--url', 'http://127.0.0.1:8172/'), session = opt('--session', 'Cshots'), prefix = opt('--prefix', 'z');
const size = opt('--size', '1280x720'), device = opt('--device', null), items = opt('--items', 'booties,floss,raft,glider,thimble,glow');
const party = opt('--party', 'pip');
const optVals = new Set(['--url', '--session', '--prefix', '--size', '--device', '--items', '--party'].map((n) => opt(n)).filter(Boolean));
const rooms = args.filter((a) => !a.startsWith('--') && !optVals.has(a));
const SCAN = (process.env.GAMEGEN_DIR || '') + '/scripts/scan-text.js'; // set GAMEGEN_DIR to the gamegen skill folder
const cli = (...a) => execFileSync('playwright-cli', [`-s=${session}`, ...a], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 600000 });

try { cli('close'); } catch { /* not open */ }
cli('open', ...(device ? ['--device', device] : []), url);
cli('run-code', 'async page => { await page.waitForFunction(() => window.__game, null, { timeout: 60000 }); }'); // [final-S] the game loads after the title is up
const [w, h] = size.split('x');
cli('resize', w, h);
cli('press', 'Enter');
const specs = rooms.map((r) => {
  const [head, it] = r.split(':');
  const [room, at] = head.split('@');
  const [x, y] = at ? at.split(',').map(Number) : [undefined, undefined];
  return { room, x, y, items: (it || items).split(',').filter(Boolean) };
});
const code = `async page => {
  const out = [];
  for (const s of ${JSON.stringify(specs)}) {
    await page.evaluate((s) => { window.__game.goToRoom(s.room, { x: s.x, y: s.y, items: s.items, party: ${JSON.stringify(party.split(','))} }); }, s);
    await page.waitForTimeout(1300);
    await page.screenshot({ path: ${JSON.stringify(path.join(root, 'design/screenshots'))} + '/${prefix}-' + s.room + (s.x != null ? '-' + s.x + '-' + s.y : '') + '.png' });
    await page.addScriptTag({ path: ${JSON.stringify(SCAN)} });
    out.push({ room: s.room, problems: await page.evaluate(() => window.__scanText()) });
  }
  return JSON.stringify(out);
}`;
console.log(cli('run-code', code).split('### Result')[1]?.split('###')[0]?.trim());
console.log(cli('console', 'error').split('\n').filter((l) => /error/i.test(l)).slice(0, 10).join('\n') || 'no console errors');
