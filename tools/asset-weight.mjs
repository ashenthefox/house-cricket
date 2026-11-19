#!/usr/bin/env node
// How heavy the game is to download (issue #14): bytes before the first room (title -> the tank),
// per lair, in total, the biggest files, and (with --draws) the pictures stored much larger than
// they are ever drawn.
//
//   node tools/asset-weight.mjs [--top 25] [--draws draws.json] [--json out.json]
//
// Worked out with the game's own lists (src/room-art.js roomArt/zoneArt, src/audio.js's sound lists),
// so it follows the code:
//   title       the page (HTML, CSS, scripts, data, fonts), the title painting and title music
//   first room  + the opening story panels, the tank's first room as the art gate waits for it, and
//               the sound effects asked for before it (audio.js: sfxFirst)
//   tank ahead  what the title loads in the background for a new game (the tank's critical art
//               and its neighbours: room-art.js gate.ahead), counted apart
//   lair        a boss room as the gate waits for it plus its near layer (as zoneArt's lairs), the
//               boss music and the zone's sound effects (audio.js: sfxForZone)
//   total       every file under game/ (the published service worker caches all of them)
// --draws: a JSON {draws: {path: {nw, nh, w, h}}} of the largest size each picture was drawn at (in
// screen pixels at 1920x1080), e.g. from a browser sweep; pictures stored more than 2x larger than
// that (the hi-DPI headroom) are listed.
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const game = path.join(root, 'game');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const TOP = +opt('--top', 25);

const { Game } = await import('../game/src/game.js');
const { ZONES } = await import('../game/data/rooms/index.js');
const { ZONE_INFO } = await import('../game/data/zones.js');
const { TEXT } = await import('../game/data/text.js');
const RA = await import('../game/src/room-art.js');
const Audio = await import('../game/src/audio.js');

const size = (rel) => { try { return statSync(path.join(game, rel)).size; } catch { return 0; } };
const asset = (p) => 'assets/' + p;
const sum = (list) => [...new Set(list)].reduce((s, f) => s + size(f), 0);
const MB = (b) => (b / 1e6).toFixed(2).padStart(6) + ' MB';

function walk(dir, out = []) {
  for (const n of readdirSync(dir).sort()) {
    if (n.startsWith('.')) continue;
    const p = path.join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out); else out.push(path.relative(game, p).split(path.sep).join('/'));
  }
  return out;
}
const all = walk(game);

// the page itself: everything outside assets/ but the icons, the social card and the sw (loaded later or never)
const page = all.filter((f) => !f.startsWith('assets/') && !/^(icon-|apple-touch|social-card|favicon|robots|sitemap|sw\.js|fonts\/OFL)/.test(f));
const sfxFirst = Audio.sfxFirst ? Audio.sfxFirst() : Audio.SFX_NAMES;              // before: every effect at start
const sfxZone = (zone) => (Audio.sfxForZone ? Audio.sfxForZone(zone) : []);          // before: none per zone (all up front)
const sfxFile = (n) => `assets/audio/sfx/${n}.mp3`;

const newGame = (room, opts = {}) => { const g = new Game(ZONES); g.startAt(room, undefined, undefined, { party: ['pip'], items: [], ...opts }); return g; };

// ---- title and first room
const tankZone = ZONES.find((z) => z.n === 0);
const g0 = newGame(tankZone.start.room);
const title = [...page, 'assets/title.webp', 'assets/audio/music/title.mp3'];
const panels = [...TEXT.opening.panels, TEXT.opening.after].map((p) => asset(p.img));
const firstGate = RA.roomArt(g0, g0.room).gate.map(asset);
const firstSfx = [...sfxFirst, ...sfxZone(g0.room.zone)].map(sfxFile);
const firstRoom = [...title, ...panels, ...firstGate, ...firstSfx];
const za = RA.zoneArt(g0, g0.room.zone);
const ahead = [...za.lairs, ...za.rest, ...RA.neighbours(g0.world, g0.room).flatMap((r) => { const a = RA.roomArt(g0, r); return [...a.gate, ...a.late]; })].map(asset).filter((f) => !firstRoom.includes(f));

// ---- lairs
const lairs = [];
for (const z of ZONES) {
  if (z.n >= 98) continue;
  for (const r of z.rooms) {
    if (!r.entities?.some((e) => e.type === 'boss')) continue;
    const info = ZONE_INFO[z.n] || {};
    const g = newGame(r.id, { items: info.minItems?.[0] || [], rescued: info.rescued || [] });
    const a = RA.roomArt(g, g.room);
    const art = [...a.gate, ...a.soon].map(asset);
    const music = [`assets/audio/music/${z.n === 0 ? 'title' : 'boss'}.mp3`];
    const sfx = sfxZone(g.room.zone).map(sfxFile);
    const geckoArt = art.filter((f) => f.includes('/geckos/'));
    lairs.push({ zone: z.n, room: r.id, art: sum(art), gecko: sum(geckoArt), files: new Set(art).size, music: sum(music), sfx: sum(sfx), total: sum([...art, ...music, ...sfx]) });
  }
}

// ---- totals by folder
const groups = {};
for (const f of all) {
  const p = f.split('/'), k = p[0] !== 'assets' ? '(page, icons)' : p[1] === 'sprites' || p[1] === 'audio' ? `${p[1]}/${p[2]}` : p[1].includes('.') ? 'assets/*' : p[1];
  const s = (groups[k] ||= { n: 0, b: 0, ext: {} });
  s.n++; s.b += size(f); const e = f.split('.').pop(); s.ext[e] = (s.ext[e] || 0) + 1;
}
const total = sum(all);

// ---- report
const lines = [];
const out = (s = '') => lines.push(s);
out('Before the first room (title -> the tank):');
out(`  title screen (page, fonts, title art, title music) ${MB(sum(title))}`);
out(`  opening panels                                     ${MB(sum(panels))}`);
out(`  the tank's first room (art the gate waits for)     ${MB(sum(firstGate))}   ${new Set(firstGate).size} files`);
out(`  sound effects asked for by then                    ${MB(sum(firstSfx))}   ${new Set(firstSfx).size} files`);
out(`  = first room                                       ${MB(sum(firstRoom))}`);
out(`  (+ loaded ahead during the title: the tank's other art and neighbours ${MB(sum(ahead))})`);
out();
out('Lairs (the boss room\'s art + near layer, boss music, the zone\'s sound effects):');
for (const l of lairs) out(`  ${String(l.zone).padStart(2)} ${l.room.padEnd(14)} art ${MB(l.art)} (gecko ${MB(l.gecko)}, ${String(l.files).padStart(3)} files)  music ${MB(l.music)}  sfx ${MB(l.sfx)}  = ${MB(l.total)}`);
out();
out(`Total under game/ (the service worker caches it all): ${MB(total)} in ${all.length} files`);
for (const [k, s] of Object.entries(groups).sort((a, b) => b[1].b - a[1].b)) out(`  ${k.padEnd(20)} ${MB(s.b)}  ${String(s.n).padStart(4)} files  ${Object.entries(s.ext).map(([e, n]) => `${n} ${e}`).join(', ')}`);
out();
out(`Biggest ${TOP} files:`);
for (const f of [...all].sort((a, b) => size(b) - size(a)).slice(0, TOP)) out(`  ${MB(size(f))}  ${f}`);

const drawsFile = opt('--draws', null);
let over = [];
if (drawsFile) {
  const D = JSON.parse(readFileSync(drawsFile, 'utf8'));
  const draws = D.draws || D;
  const imgs = all.filter((f) => /^assets\/.*\.(png|webp)$/.test(f) && !/^assets\/(bg|story|textures|terrain)\//.test(f) && !/^assets\/[^/]+\.webp$/.test(f));
  for (const f of imgs) {
    const d = draws[f.slice(7)];
    if (!d) continue;
    const k = Math.max(d.w / d.nw, d.h / d.nh); // the largest drawn size over the stored size
    if (k * 2 < 0.8) over.push({ f, k, nw: d.nw, nh: d.nh, w: Math.round(d.w), h: Math.round(d.h), bytes: size(f) });
  }
  over.sort((a, b) => a.k - b.k);
  const never = imgs.filter((f) => !draws[f.slice(7)]);
  out();
  out(`Stored more than 2x their largest drawn size (drawn at ${D.viewport ? D.viewport.join('x') : '?'}; ${over.length} files, ${MB(over.reduce((s, o) => s + o.bytes, 0))}):`);
  for (const o of over.slice(0, 60)) out(`  ${(o.k * 100).toFixed(0).padStart(3)}%  ${o.f}  stored ${o.nw}x${o.nh}, drawn at most ${o.w}x${o.h}`);
  if (over.length > 60) out(`  ... and ${over.length - 60} more`);
  out(`Not drawn in that sweep (${never.length}): ${never.slice(0, 40).join(', ')}${never.length > 40 ? ' ...' : ''}`);
}
console.log(lines.join('\n'));
const json = opt('--json', null);
if (json) writeFileSync(json, JSON.stringify({ firstRoom: sum(firstRoom), title: sum(title), panels: sum(panels), firstGate: sum(firstGate), firstSfx: sum(firstSfx), ahead: sum(ahead), lairs, total, groups, over }, null, 1));
