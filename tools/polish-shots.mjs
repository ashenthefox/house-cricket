#!/usr/bin/env node
// Visual polish screenshots (render only; never plays).
//   node tools/polish-shots.mjs --session S --url http://127.0.0.1:8391/ --out DIR [--mode overview|play]
//        [--prefix p] [--size 1280x720] room[@x,y][:items] ...   (or --zone 5 / --all)
// overview: the whole room stitched from every screen (camera set per screen, half scale, no HUD)
//           -> DIR/<prefix>ov-<room>.png
// play:     goToRoom, run ~1.3 s, a normal page screenshot (HUD included) -> DIR/<prefix><room>.png
// --tips:   [issue 9] play-mode shots of sample tutorial notes and their cards (the tongs' lower slot, a plain
//           note, one by the ceiling, a dark room's glint, a fight's band, a note on cereal before and after the
//           pound); prints each card's slot. For touch, open the session with --device 'iPhone 15' and pass
//           --size 844x390:   node tools/polish-shots.mjs --session S --tips --size 844x390 --prefix touch-
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const url = opt('--url', 'http://127.0.0.1:8391/'), session = opt('--session', 'polish');
const out = path.resolve(opt('--out', path.join(root, 'design/screenshots'))), prefix = opt('--prefix', '');
const mode = opt('--mode', args.includes('--tips') ? 'play' : 'overview'), size = opt('--size', '1280x720'), zone = opt('--zone', null);
const items = opt('--items', 'booties,floss,raft,band,glider,thimble,glow,earplugs,feather,cloak');
const valued = new Set(['--url', '--session', '--out', '--prefix', '--mode', '--size', '--zone', '--items']);
const TIPS = [ // [issue 9] room@x,y[:items][#phase][~ms]=name[!pound]
  'tank-cup@13,9:~1500=tip-tank-cup', 'bed-carrier@11,14:~1600=tip-bed-carrier', 'sun-glass@9,2~1600=tip-sun-glass',
  'bas-stairs@6,51:earplugs~1600=tip-bas-stairs-dark', 'bed-lair@11,15:#1~1600=tip-bed-lair-fight',
  'laun-washer@47,15:thimble~1600=tip-laun-washer-before', 'laun-washer@47,15:thimble~1600=tip-laun-washer-after!pound',
];
const rooms = args.includes('--tips') ? TIPS : args.filter((a, i) => !a.startsWith('--') && !valued.has(args[i - 1]));
const cli = (...a) => execFileSync('playwright-cli', [`-s=${session}`, ...a], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 900000 });

const specs = rooms.map((r0) => {
  // room[@x,y][:items][#phase][~ms][=name]  (#phase: __game.setBossPhase; ~ms: run that long first; =name: file name)
  let r = r0, name = null, phase = null, wait = null, act = null;
  if (r.includes('!')) [r, act] = r.split('!');
  if (r.includes('=')) [r, name] = r.split('=');
  if (r.includes('~')) { const [a, w] = r.split('~'); r = a; wait = +w; }
  if (r.includes('#')) { const [a, ph] = r.split('#'); r = a; phase = +ph; }
  const [head, it] = r.split(':');
  const [room, at] = head.split('@');
  const [x, y] = at ? at.split(',').map(Number) : [undefined, undefined];
  return { room, x, y, items: (it ?? items).split(',').filter(Boolean), phase, wait, name, act };
});
const [W, H] = size.split('x').map(Number);
const code = `async page => {
  const specs = ${JSON.stringify(specs)};
  if (${!args.includes('--no-reload')}) { await page.goto(${JSON.stringify(url)}); await page.waitForFunction(() => window.__game, null, { timeout: 60000 }); await page.waitForTimeout(800); await page.keyboard.press('Enter'); await page.waitForTimeout(500); }
  if (${JSON.stringify(zone)} || ${args.includes('--all')}) {
    const zs = await page.evaluate(() => window.__game.zones());
    for (const z of zs) if (${args.includes('--all')} ? (typeof z.n !== 'number' || z.n < 98) : String(z.n) === ${JSON.stringify(zone)}) for (const r of z.rooms) specs.push({ room: r, items: ${JSON.stringify(items.split(','))} });
  }
  const done = [];
  for (const s of specs) {
    await page.setViewportSize({ width: ${W}, height: ${H} });
    await page.evaluate((s) => {
      const R = window.__renderer;
      if (!R.__wrapped) { const o = R.draw.bind(R); R.draw = (g, v) => { if (g && g.room) window.__G = g; return o(g, v); }; R.__wrapped = true; }
      window.__game.unfreeze();
      window.__game.goToRoom(s.room, { x: s.x, y: s.y, items: s.items, party: ['pip'] });
    }, s);
    if (s.phase) { await page.waitForTimeout(200); await page.evaluate((n) => window.__game.setBossPhase(n), s.phase); }
    await page.waitForTimeout(s.wait ?? ${mode === 'play' ? 1300 : 900});
    const file = ${JSON.stringify(out)} + '/' + ${JSON.stringify(prefix)} + (${JSON.stringify(mode)} === 'overview' ? 'ov-' : '') + (s.name || (s.room + (s.x != null ? '-' + s.x + '-' + s.y : ''))) + '.png';
    if (s.act === 'pound') { await page.evaluate(() => { const G = window.__G; G.breakUnder(G.player); }); await page.waitForTimeout(1200); } // the pound's own break (game.breakUnder)
    if (${JSON.stringify(mode)} === 'play' || ${args.includes('--tips')}) {
      await page.screenshot({ path: file });
      const t = ${args.includes('--tips')} ? await page.evaluate(() => window.__game.tips()) : null;
      done.push(file + (t ? '  card: ' + (t.shown ? t.shown.slot + ' ' + JSON.stringify(t.shown.text) + (t.shown.under ? ' (under)' : '') : 'none') + '; notes: ' + t.notes.map((n) => (n.kind === 'card' ? 'card' : n.live ? (n.read ? 'read' : 'unread') : 'retired')).join(',') : ''));
      continue;
    }
    const dims = await page.evaluate(() => {
      window.__game.freeze();
      const G = window.__G, R = window.__renderer, cv = R.canvas, room = G.room;
      const sw = room.sw, sh = room.sh, k = 0.5;
      const comp = document.createElement('canvas'); comp.width = 1280 * sw * k; comp.height = 720 * sh * k;
      const cg = comp.getContext('2d');
      const cam = G.camera, keep = [cam.x, cam.y];
      for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
        cam.x = x * 1280; cam.y = y * 720; cam.shake = 0;
        R.draw(G, { shake: false });
        cg.drawImage(cv, 0, 0, cv.width, cv.height, x * 640, y * 360, 640, 360);
      }
      cg.strokeStyle = 'rgba(255,0,0,0.35)'; cg.setLineDash([6, 6]);
      for (let x = 1; x < sw; x++) { cg.beginPath(); cg.moveTo(x * 640, 0); cg.lineTo(x * 640, comp.height); cg.stroke(); }
      for (let y = 1; y < sh; y++) { cg.beginPath(); cg.moveTo(0, y * 360); cg.lineTo(comp.width, y * 360); cg.stroke(); }
      [cam.x, cam.y] = keep;
      const img = document.createElement('img'); img.id = '__ov'; img.src = comp.toDataURL('image/png');
      img.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;width:' + comp.width + 'px;height:' + comp.height + 'px';
      document.body.appendChild(img);
      return { w: comp.width, h: comp.height };
    });
    await page.setViewportSize({ width: dims.w, height: dims.h });
    await page.waitForTimeout(150);
    await page.screenshot({ path: file });
    await page.evaluate(() => { document.getElementById('__ov')?.remove(); window.__game.unfreeze(); });
    done.push(file);
  }
  await page.setViewportSize({ width: ${W}, height: ${H} });
  return done.length + ' shots: ' + done.join(' | ');
}`;
console.log(cli('run-code', code).split('### Result')[1]?.split('###')[0]?.trim());
