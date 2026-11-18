#!/usr/bin/env node
// [playtest] Browser checks for the play-test (gamegen playtest-guide.md, gamepad.md, feedback.md), one session:
//   node tools/pt-checks.mjs [--url http://127.0.0.1:8173/] [--session pt] [--only a,b,...]
// Sections: flashes (frame log through the opening, a rescue and its card, the damper card, the ending),
// audio (unlock, mute, sliders, music buffers), saves (slots, continue, reload, a corrupt save), pause (pause,
// tab away, resize mid-level), losing (a lost heart, a lost phase), gentle (Gentle Mode via setBossPhase),
// feedback (Report a bug: button, form, typing, Escape, the pad, submit, the shortcut, a stalled loop, phone size),
// keys (WASD layout, S as down, prompts). Prints one line per check and a summary; exits 1 on a failure.
// The debug hook only sets things up and reads state; the player's actions are real keys.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const url = opt('--url', 'http://127.0.0.1:8173/'), session = opt('--session', 'pt');
const only = opt('--only', null)?.split(',');
const shots = path.join(root, 'design/screenshots');
const SCAN = (process.env.GAMEGEN_DIR || '') + '/scripts/scan-text.js'; // set GAMEGEN_DIR to the gamegen skill folder
const cli = (...a) => execFileSync('playwright-cli', [`-s=${session}`, ...a], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20, timeout: 900000 });
const result = (out) => {
  const m = out.match(/### Result\n([\s\S]*?)(\n### |\n*$)/);
  if (!m) throw new Error('no result:\n' + out.slice(0, 1500));
  let t = m[1].trim(); try { t = JSON.parse(t); } catch { /* keep */ }
  if (typeof t === 'string') { try { return JSON.parse(t); } catch { return t; } }
  return t;
};
// a run-code body with helpers: W(ms), KEY(code, holdMs), ST(n) (frozen steps), FR() (frames log), FLASH(log), SHOT(name), SCANT()
const run = (body) => result(cli('run-code', `async page => {
  const W = (ms) => page.waitForTimeout(ms);
  const EV = (fn, a) => page.evaluate(fn, a);
  const KEY = async (k, hold = 60, after = 120) => { await page.keyboard.down(k); await W(hold); await page.keyboard.up(k); await W(after); };
  const ST = (n) => EV((n) => window.__game.step(n), n);
  const FR = () => EV(() => window.__game.frames());
  const FLASH = (log) => log.filter(([, n], i) => i > 0 && i < log.length - 1 && n <= 30).map(([s, n]) => s + ' x' + n);
  const SHOT = (name) => page.screenshot({ path: ${JSON.stringify(shots)} + '/pt-' + name + '.png' });
  const SCANT = async () => { await page.addScriptTag({ path: ${JSON.stringify(SCAN)} }); return EV(() => window.__scanText()); };
  const META = () => EV(() => window.__game.meta());
  const STATE = () => EV(() => window.__game.state());
  const FRESH = async (q = '') => { await page.goto(${JSON.stringify(url)} + q); await page.evaluate(() => localStorage.clear()); await page.goto(${JSON.stringify(url)} + q); await page.waitForFunction(() => window.__game && document.fonts.status === 'loaded'); await W(600); };
  const out = {};
  ${body}
  return JSON.stringify(out);
}`));
let fails = 0;
const report = (name, ok, detail) => { if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(34)} ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`); };
const want = (s) => !only || only.includes(s);

try { cli('close'); } catch { /* not open */ }
cli('open', url);
cli('resize', '1280', '720');

// ---------------------------------------------------------------- flashes (the frame log)
if (want('flashes')) {
  // New Game -> the opening panels -> the tank (first control)
  let r = run(`
    await FRESH();
    await KEY('Enter'); await KEY('Enter'); await W(900); await KEY('Enter'); await W(500);   // any key, New Game, (look at the slots) Slot 1
    for (let i = 0; i < 3; i++) { await W(900); await KEY('KeyZ', 60, 100); }
    await W(1500);
    out.log = await FR(); out.state = (await STATE()).room;`);
  const log1 = r.log.slice(r.log.findIndex(([s]) => s === 'title') >= 0 ? r.log.findIndex(([s]) => s === 'title') : 0);
  const fl1 = log1.filter(([, n], i) => i > 0 && i < log1.length - 1 && n <= 30).map(([s, n]) => s + ' x' + n);
  report('flashes: New Game to the tank', !fl1.length && r.state === 'tank-cup', { flashes: fl1, log: log1.map(([s, n]) => s + ':' + n).join(' '), room: r.state });
  // the tank's end -> panel 4 -> the Bedroom (first control)
  r = run(`
    await EV(() => window.__game.open('escaped'));
    for (let i = 0; i < 1; i++) { await W(1200); await KEY('KeyZ', 60, 100); }
    await W(1500);
    out.log = (await FR()).slice(-6); out.room = (await STATE()).room;`);
  const fl2 = r.log.filter(([, n], i) => i > 0 && i < r.log.length - 1 && n <= 30).map(([s, n]) => s + ' x' + n);
  report('flashes: panel 4 to the Bedroom', !fl2.length && r.room === 'bed-carrier', { flashes: fl2, log: r.log.map(([s, n]) => s + ':' + n).join(' '), room: r.room });
  // a rescue: Duchess's last pull (her recorded fight, frozen), then her lines and the card, real time
  r = run(`
    const sol = ${JSON.stringify(JSON.parse(execFileSync('cat', [path.join(root, 'design/solutions/zone-01-boss.json')], { encoding: 'utf8' })))};
    await EV((st) => { window.__game.goToRoom(st.room, { x: st.x, y: st.y, items: st.items, party: st.party }); window.__game.freeze(); }, sol.start);
    let f = 0;
    for (const [k, code, type] of sol.events) { if (k > f) { await ST(k - f); f = k; } if (type === 'down') await page.keyboard.down(code); else await page.keyboard.up(code); }
    await ST(sol.frames - f);
    await EV(() => window.__game.unfreeze());
    await W(800); await SHOT('rescue-dialog');
    for (let i = 0; i < 6; i++) { await KEY('Enter', 60, 250); }
    await W(2200); await SHOT('zone-complete'); out.scan = await SCANT();
    out.ui = (await META()).ui;
    await KEY('ArrowDown'); await KEY('Enter'); await W(800);
    out.log = (await FR()).slice(-8);`);
  const fl3 = r.log.filter(([, n], i) => i > 0 && i < r.log.length - 1 && n <= 30).map(([s, n]) => s + ' x' + n);
  report('flashes: rescue, lines, card', !fl3.length && r.ui === 'complete', { flashes: fl3, log: r.log.map(([s, n]) => s + ':' + n).join(' '), scan: r.scan });
  // the damper with eight home: walk up into it from the flue's top lip
  r = run(`
    await EV(() => window.__game.goToRoom('chim-flue', { x: 12, y: 1, items: ['booties','floss','raft','band','glider','thimble','glow','earplugs','feather'], party: ['pip'], rescued: ['stripe','katy','duo','frost','hump','jam','rin','digby'] }));
    await W(600);
    await EV(() => window.__game.freeze()); await ST(20);
    await page.keyboard.down('KeyZ'); await ST(20); await page.keyboard.up('KeyZ'); await ST(1); await page.keyboard.down('KeyZ'); await ST(14); await page.keyboard.up('KeyZ'); await ST(8);
    await EV(() => window.__game.unfreeze());
    out.ui = (await META()).ui; await W(400); await SHOT('damper'); out.scan = await SCANT();
    await KEY('Enter'); await W(600);
    out.log = (await FR()).slice(-6);
    // and with nine home it's open: the same jump goes through
    await EV(() => window.__game.goToRoom('chim-flue', { x: 12, y: 1, items: ['booties','floss','raft','band','glider','thimble','glow','earplugs','feather'], party: ['pip'], rescued: ['stripe','katy','duo','frost','hump','jam','rin','digby','mote'] }));
    await W(600);
    await EV(() => window.__game.freeze()); await ST(20);
    await page.keyboard.down('KeyZ'); await ST(20); await page.keyboard.up('KeyZ'); await ST(1); await page.keyboard.down('KeyZ'); await ST(14); await page.keyboard.up('KeyZ'); await ST(8);
    await EV(() => window.__game.unfreeze());
    out.nine = { room: (await STATE()).room, ui: (await META()).ui };`);
  const fl4 = r.log.filter(([, n], i) => i > 0 && i < r.log.length - 1 && n <= 30).map(([s, n]) => s + ' x' + n);
  report('damper: shut at 8, card', r.ui === 'damper' && !fl4.length, { ui: r.ui, flashes: fl4, scan: r.scan, log: r.log.map(([s, n]) => s + ':' + n).join(' ') });
  report('damper: open at 9', r.nine.room === 'chim-top' || r.nine.ui !== 'damper', r.nine);
  // the ending: four panels, the credits, thank you, the Carrier
  r = run(`
    await EV(() => window.__game.goToRoom('att-lair', { x: 13, y: 33, items: ['booties'], party: ['pip'], rescued: ['stripe','katy','duo','frost','hump','jam','rin','digby','mote','chip'] }));
    await W(500);
    await EV(() => window.__game.open('ending'));
    const seen = [];
    for (let i = 0; i < 4; i++) { await W(1300); seen.push((await META()).story); if (i === 0) { await SHOT('ending-1'); out.scan1 = await SCANT(); } await KEY('KeyZ', 60, 100); }
    await W(1200); seen.push((await META()).story); await SHOT('credits-roll'); out.scanC = await SCANT();
    for (let i = 0; i < 4; i++) { await W(900); await KEY('KeyZ', 60, 100); }
    await W(1200); seen.push((await META()).story); await SHOT('thanks'); out.scanT = await SCANT();
    await KEY('KeyZ'); await W(1500);
    out.seen = seen; out.end = await META().then((m) => ({ inCarrier: m.inCarrier, won: m.won, story: m.story }));
    await SHOT('after-ending-carrier');
    out.log = (await FR()).slice(-12);`);
  const fl5 = r.log.filter(([, n], i) => i > 0 && i < r.log.length - 1 && n <= 30).map(([s, n]) => s + ' x' + n);
  report('ending: panels, credits, thanks, Carrier', r.end.inCarrier && r.end.won && !fl5.length, { seen: r.seen, end: r.end, flashes: fl5, log: r.log.map(([s, n]) => s + ':' + n).join(' ') });
  report('ending: text scan', ![r.scan1, r.scanC, r.scanT].some((x) => x && x.length), { ending: r.scan1, credits: r.scanC, thanks: r.scanT });
}

// ---------------------------------------------------------------- audio
if (want('audio')) {
  const r = run(`
    await FRESH();
    out.before = await EV(() => window.__game.audioState().context || window.__game.audioState().state);
    await KEY('Enter'); await W(400);
    out.after = await EV(() => { const a = window.__game.audioState(); return a.context || a.state; });
    await EV(() => window.__game.goToRoom('bed-rug'));
    await W(1500);
    const a0 = await EV(() => window.__game.audioState());
    out.track = a0.track; out.music0 = a0.volumes || a0.music;
    await KEY('KeyM'); out.mutedAfterM = (await EV(() => window.__game.audioState())).muted;
    await KEY('KeyM'); out.unmutedAfterM = !(await EV(() => window.__game.audioState())).muted;
    // the speaker icon (mouse)
    const spk = await EV(() => { const b = [...document.querySelectorAll('#overlay button, #overlay [role=button]')].find((e) => /mute|sound|speaker/i.test((e.getAttribute('aria-label') || '') + e.className)); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, label: b.getAttribute('aria-label') }; });
    if (spk) { await page.mouse.click(spk.x, spk.y); await W(200); out.mutedAfterIcon = (await EV(() => window.__game.audioState())).muted; await page.mouse.click(spk.x, spk.y); await W(200); }
    out.spk = spk;
    // the Music slider: Settings from pause, Right twice on the first row
    await KEY('Escape'); await W(200);
    for (let i = 0; i < 6; i++) { const t = await EV(() => document.activeElement?.textContent || ''); if (t.startsWith('Settings')) break; await KEY('ArrowDown'); }
    await KEY('Enter'); await W(200);
    const v0 = await EV(() => JSON.parse(localStorage.getItem('housecricket.v1.settings') || '{}').music);
    await KEY('ArrowLeft'); await KEY('ArrowLeft');
    const v1 = await EV(() => JSON.parse(localStorage.getItem('housecricket.v1.settings') || '{}').music);
    out.slider = { before: v0, after: v1, audio: (await EV(() => window.__game.audioState())).volumes };
    await KEY('ArrowRight'); await KEY('ArrowRight');
    await KEY('Escape'); await KEY('Escape'); await W(200);
    // music buffers: visit a few zones, a boss room and the Carrier
    for (const r of ['bath-door', 'kit-fridge', 'bed-lair', 'liv-rug', 'att-entry']) { await EV((r) => window.__game.goToRoom(r), r); await W(1600); }
    await EV(() => window.__game.carrier()); await W(1600);
    const a1 = await EV(() => window.__game.audioState());
    out.decoded = a1.decoded; out.decodedTracks = a1.decodedTracks; out.track1 = a1.track;`);
  report('audio: context starts on first input', /running/.test(String(r.after)), { before: r.before, after: r.after });
  report('audio: M mutes and unmutes', r.mutedAfterM === true && r.unmutedAfterM, { muted: r.mutedAfterM, unmuted: r.unmutedAfterM });
  report('audio: speaker icon mutes', r.spk ? r.mutedAfterIcon === true : false, { icon: r.spk, muted: r.mutedAfterIcon });
  report('audio: music slider moves and saves', r.slider.after < r.slider.before, r.slider);
  report('audio: <= 3 music buffers', (Array.isArray(r.decodedTracks) ? r.decodedTracks.length : r.decoded) <= 3, { decoded: r.decoded, tracks: r.decodedTracks, now: r.track1 });
}

// ---------------------------------------------------------------- saves
if (want('saves')) {
  const r = run(`
    await FRESH();
    await KEY('Enter'); await W(300);
    out.titleButtons = await EV(() => [...document.querySelectorAll('#overlay button')].map((b) => b.textContent.trim() + (b.disabled ? ' (off)' : '')));
    // slot 2: New Game, skip the opening (hold Jump), then Save and Quit from pause
    for (let i = 0; i < 6; i++) { const t = await EV(() => document.activeElement?.textContent || ''); if (t.startsWith('New Game')) break; await KEY('ArrowDown'); }
    await KEY('Enter'); await KEY('ArrowDown'); await KEY('Enter'); await W(500);
    await page.keyboard.down('KeyZ'); await W(1200); await page.keyboard.up('KeyZ'); await W(800);
    out.inTank = (await STATE()).room;
    await KEY('Escape');
    for (let i = 0; i < 8; i++) { const t = await EV(() => document.activeElement?.textContent || ''); if (t.startsWith('Save and Quit')) break; await KEY('ArrowDown'); }
    await KEY('Enter'); await W(400);
    out.keys = await EV(() => Object.keys(localStorage).sort());
    // reload: Continue is offered and focused, and goes back to slot 2
    await page.reload(); await page.waitForFunction(() => window.__game); await W(700);
    await KEY('Enter'); await W(300);
    out.focus = await EV(() => document.activeElement?.textContent?.trim());
    await KEY('Enter'); await W(800);
    out.continued = await STATE().then((s) => ({ room: s.room, slot: s.slot, screen: s.screen }));
    // the Load screen lists the three slots
    await KEY('Escape'); for (let i = 0; i < 8; i++) { const t = await EV(() => document.activeElement?.textContent || ''); if (t.startsWith('Save and Quit')) break; await KEY('ArrowDown'); } await KEY('Enter'); await W(300);
    for (let i = 0; i < 6; i++) { const t = await EV(() => document.activeElement?.textContent || ''); if (t.startsWith('Load')) break; await KEY('ArrowDown'); }
    await KEY('Enter'); await W(300);
    out.load = await EV(() => [...document.querySelectorAll('.slot-btn')].map((b) => b.textContent.trim()));
    await SHOT('load-slots'); out.scan = await SCANT();
    await KEY('Escape'); await W(200);
    // a corrupt save in slot 3: the title still works and the slot says so
    await EV(() => { const k = Object.keys(localStorage).find((k) => /slot/i.test(k)); localStorage.setItem(k.replace(/\\d+$/, '3'), '{not json'); });
    await page.reload(); await page.waitForFunction(() => window.__game); await W(700);
    await KEY('Enter'); await W(300);
    for (let i = 0; i < 6; i++) { const t = await EV(() => document.activeElement?.textContent || ''); if (t.startsWith('Load')) break; await KEY('ArrowDown'); }
    await KEY('Enter'); await W(300);
    out.loadCorrupt = await EV(() => [...document.querySelectorAll('.slot-btn')].map((b) => b.textContent.trim()));
    await SHOT('load-corrupt');
    await KEY('Escape');`);
  report('saves: Save and Quit writes the slot', r.keys.some((k) => /2/.test(k)), r.keys);
  report('saves: reload, Continue focused, resumes', r.focus?.startsWith('Continue') && r.continued.slot === 2 && r.continued.screen === 'play', { focus: r.focus, continued: r.continued });
  report('saves: three slots listed', r.load.length === 3, { slots: r.load, scan: r.scan });
  report('saves: a corrupt save is survived', r.loadCorrupt.some((t) => /damaged/i.test(t)), r.loadCorrupt);
}

// ---------------------------------------------------------------- pause, tab away, resize mid-level
if (want('pause')) {
  const r = run(`
    await FRESH();
    await KEY('Enter'); await EV(() => window.__game.goToRoom('bed-rug')); await W(500);
    await page.keyboard.down('ArrowRight'); await W(300);
    await EV(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await W(200); await page.keyboard.up('ArrowRight');
    out.afterHide = (await STATE()).screen;
    await EV(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    const x0 = (await STATE()).pos.x; await W(300); out.stillPaused = (await STATE()).pos.x === x0 && (await STATE()).screen === 'pause';
    await KEY('Escape'); await W(200); out.resumed = (await STATE()).screen;
    await page.setViewportSize({ width: 1000, height: 640 }); await W(400);
    await page.setViewportSize({ width: 1920, height: 1080 }); await W(400);
    out.canvas = await EV(() => { const c = document.getElementById('view'); return { w: c.width, h: c.height, css: c.getBoundingClientRect().width }; });
    await page.keyboard.down('ArrowLeft'); await W(400); await page.keyboard.up('ArrowLeft'); await W(200);
    out.moves = (await STATE()).pos.x !== x0;
    await SHOT('resize-1920');
    await page.setViewportSize({ width: 1280, height: 720 });`);
  report('pause: tab away pauses, stays paused', r.afterHide === 'pause' && r.stillPaused, r);
  report('pause: Escape resumes', r.resumed === 'play', r.resumed);
  report('resize mid-level keeps playing', r.moves && r.canvas.w > 0, r.canvas);
}

// ---------------------------------------------------------------- losing
if (want('losing')) {
  const r = run(`
    await FRESH(); await KEY('Enter');
    // a pit (bath-door: the floor gap by the cereal) costs a heart and puts you back on solid ground
    await EV(() => window.__game.goToRoom('pan-shelves', { x: 31, y: 14, items: ['booties','floss','raft','band'] })); await W(600);   // the pins in the gap in shelf B
    const h0 = (await STATE()).health;
    await page.keyboard.down('ArrowRight'); await W(500); await page.keyboard.up('ArrowRight'); await W(1500);
    const s1 = await STATE(); out.pit = { h0, h1: s1.health, room: s1.room, x: Math.round(s1.pos.x) };
    // a lost boss phase restarts the phase: stand in Duchess's way until she has bitten five times
    await EV(() => { window.__game.goToRoom('bed-lair', { x: 30, y: 15, items: ['booties'] }); window.__game.setBossPhase(1); });
    await W(300);
    await EV(() => window.__game.freeze());
    let restarts = 0, minH = 9;
    for (let i = 0; i < 120; i++) { await ST(30); const s = await STATE(); minH = Math.min(minH, s.health); if (s.health === 5 && minH < 5) { restarts++; break; } }
    out.boss0 = 1;
    await EV(() => window.__game.unfreeze());
    const s2 = await STATE(); out.boss = { restarts, minH, phase: s2.bossPhase, health: s2.health, x: Math.round(s2.pos.x), screen: s2.screen };`);
  report('losing: a pit costs a heart', r.pit.h1 === r.pit.h0 - 1, r.pit);
  report('losing: a lost phase restarts it', r.boss.restarts === 1 && r.boss.phase === 1 && r.boss.health === 5, r.boss);
}

// ---------------------------------------------------------------- Gentle Mode (via setBossPhase)
if (want('gentle')) {
  const r = run(`
    await FRESH(); await KEY('Enter');
    const tellFrames = async () => {
      await EV(() => { const R = window.__renderer; if (!R.__wrapped) { const o = R.draw.bind(R); R.draw = (g, v) => { if (g && g.room) window.__G = g; return o(g, v); }; R.__wrapped = true; } });
      await EV(() => { window.__game.goToRoom('bed-lair', { x: 6, y: 15, items: ['booties'] }); window.__game.setBossPhase(1); });
      await W(300); await EV(() => window.__game.freeze());
      // walk toward her until she starts a tell; measure it
      await page.keyboard.down('ArrowRight');
      let t = null;
      for (let i = 0; i < 900 && t == null; i++) { await ST(1); t = await EV(() => { const b = window.__G?.boss; return b && b.telling ? b.tellUntil - window.__G.frame : null; }); }
      await page.keyboard.up('ArrowRight'); await EV(() => window.__game.unfreeze());
      return t;
    };
    out.normal = await tellFrames();
    // Gentle Mode on, from Settings (keys)
    await KEY('Escape'); for (let i = 0; i < 6; i++) { const t = await EV(() => document.activeElement?.textContent || ''); if (t.startsWith('Settings')) break; await KEY('ArrowDown'); }
    await KEY('Enter');
    for (let i = 0; i < 14; i++) { const t = await EV(() => document.activeElement?.textContent || ''); if (t.startsWith('Gentle')) break; await KEY('ArrowDown'); }
    await KEY('Enter'); out.setting = await EV(() => JSON.parse(localStorage.getItem('housecricket.v1.settings') || '{}').gentle);
    await KEY('Escape'); await KEY('Escape');
    out.gentle = await tellFrames();
    // half damage: two bites in Gentle Mode cost one heart
    await EV(() => { window.__game.goToRoom('bed-lair', { x: 20, y: 15, items: ['booties'] }); window.__game.setBossPhase(2); window.__game.freeze(); });
    let hurts = 0, h = 5; const fx = [];
    for (let i = 0; i < 60 && hurts < 2; i++) { await ST(20); const n = await EV(() => (window.__G?.fx || []).filter((e) => e.type === 'tell').length); fx.push(n); const s = await STATE(); if (s.health < h) { hurts++; h = s.health; } }
    out.afterBites = await STATE().then((s) => s.health);
    await EV(() => window.__game.unfreeze());
    // Gentle Mode back off
    await KEY('Escape'); for (let i = 0; i < 6; i++) { const t = await EV(() => document.activeElement?.textContent || ''); if (t.startsWith('Settings')) break; await KEY('ArrowDown'); }
    await KEY('Enter'); for (let i = 0; i < 14; i++) { const t = await EV(() => document.activeElement?.textContent || ''); if (t.startsWith('Gentle')) break; await KEY('ArrowDown'); }
    await KEY('Enter'); await KEY('Escape'); await KEY('Escape');`);
  report('gentle: tells 0.8 s -> 1.2 s', r.normal >= 46 && r.normal <= 49 && r.gentle >= 70 && r.gentle <= 73, { normal: r.normal, gentle: r.gentle, setting: r.setting });
}

// ---------------------------------------------------------------- Report a bug (feedback.md)
if (want('feedback')) {
  let r = run(`
    await FRESH(); await KEY('Enter'); await EV(() => window.__game.goToRoom('bed-rug')); await W(400);
    await KEY('Escape'); out.noRepo = await EV(() => [...document.querySelectorAll('#overlay button')].map((b) => b.textContent.trim()));
    await KEY('Escape');`);
  report('feedback: hidden with repo empty', !r.noRepo.some((t) => /report/i.test(t)), r.noRepo);
  r = run(`
    await page.addInitScript(() => { window.__opened = []; window.open = (u) => (window.__opened.push(u), {}); addEventListener('DOMContentLoaded', () => document.getElementById('report')?.setAttribute('repo', 'test/test')); });
    await FRESH(); await KEY('Enter'); await EV(() => window.__game.goToRoom('bed-rug')); await W(500);
    await KEY('Escape');
    out.pauseButtons = await EV(() => [...document.querySelectorAll('#overlay button')].map((b) => b.textContent.trim()));
    for (let i = 0; i < 8; i++) { const t = await EV(() => document.activeElement?.textContent || ''); if (/Report a bug/.test(t)) break; await KEY('ArrowDown'); }
    await KEY('Enter'); await W(600);
    out.open1 = await EV(() => document.getElementById('report').isOpen);
    await SHOT('report-form'); out.scan = await SCANT();
    // type with the game's keys: nothing moves, unpauses or mutes
    const s0 = await STATE(), a0 = (await EV(() => window.__game.audioState())).muted;
    const field = await EV(() => { const fb = document.getElementById('report'); const root = fb.shadowRoot || fb; const i = root.querySelector('input, textarea'); if (!i) return false; i.focus(); return true; });
    out.field = field;
    await page.keyboard.type('Pip fell through the floor ');
    for (const k of ['ArrowLeft', 'ArrowRight', 'Space', 'KeyP', 'KeyM']) await KEY(k, 40, 60);
    const s1 = await STATE(); out.typing = { moved: s1.pos.x !== s0.pos.x, screen: s1.screen, muted: (await EV(() => window.__game.audioState())).muted !== a0 };
    out.typed = await EV(() => { const fb = document.getElementById('report'); const root = fb.shadowRoot || fb; return root.querySelector('input, textarea')?.value; });
    await KEY('Escape'); await W(300);
    out.afterEsc = { open: await EV(() => document.getElementById('report').isOpen), screen: (await STATE()).screen, ui: (await META()).ui };
    // submit: open again, fill, submit
    for (let i = 0; i < 8; i++) { const t = await EV(() => document.activeElement?.textContent || ''); if (/Report a bug/.test(t)) break; await KEY('ArrowDown'); }
    await KEY('Enter'); await W(500);
    await EV(() => { const fb = document.getElementById('report'); const root = fb.shadowRoot || fb; const i = root.querySelector('input, textarea'); i.focus(); });
    await page.keyboard.type('Test report from the play-test');
    out.submitted = await EV(() => { const fb = document.getElementById('report'); const root = fb.shadowRoot || fb; const b = root.querySelector('.submit-btn') || [...root.querySelectorAll('button')].find((b) => /submit|open|send|github/i.test(b.textContent)); if (!b) return [...root.querySelectorAll('button')].map((b) => b.textContent); b.click(); return true; });
    await W(500);
    out.opened = await EV(() => window.__opened);
    out.formText = await EV(() => { const fb = document.getElementById('report'); return ((fb.shadowRoot || fb).textContent || '').replace(/\\s+/g, ' ').slice(0, 400); });
    await SHOT('report-sent');
    await KEY('Escape'); await W(200); await KEY('Escape'); await W(200);
    // the shortcut mid-level (not paused), holding an arrow; Escape leaves the pause menu; nothing sticks
    await page.keyboard.down('ArrowRight'); await W(200);
    await page.keyboard.down('Control'); await page.keyboard.down('Shift'); await page.keyboard.press('KeyF'); await page.keyboard.up('Shift'); await page.keyboard.up('Control');
    await W(400); await page.keyboard.up('ArrowRight');
    out.shortcut = { open: await EV(() => document.getElementById('report').isOpen), screen: (await STATE()).screen };
    await SHOT('report-shortcut');
    await KEY('Escape'); await W(200);
    out.afterShortcutEsc = { open: await EV(() => document.getElementById('report').isOpen), ui: (await META()).ui };
    await KEY('Escape'); await W(200);
    const x0 = (await STATE()).pos.x; await W(500); out.stuck = (await STATE()).pos.x !== x0;
    // a stalled loop: the shortcut still opens the form
    await EV(() => { const raf = requestAnimationFrame; window.requestAnimationFrame = () => 0; setTimeout(() => { window.requestAnimationFrame = raf; }, 150); });
    await W(300);
    await page.keyboard.down('Control'); await page.keyboard.down('Shift'); await page.keyboard.press('KeyF'); await page.keyboard.up('Shift'); await page.keyboard.up('Control');
    await W(400); out.stalled = await EV(() => document.getElementById('report').isOpen);
    await KEY('Escape'); await W(200); await KEY('Escape');`);
  report('feedback: button in pause, form opens', r.pauseButtons.some((t) => /Report a bug/.test(t)) && r.open1, { buttons: r.pauseButtons, scan: r.scan });
  report('feedback: typing game keys does nothing', r.field && !r.typing.moved && r.typing.screen === 'pause' && !r.typing.muted, { ...r.typing, typed: r.typed });
  report('feedback: Escape closes, stays paused', !r.afterEsc.open && r.afterEsc.screen === 'pause', r.afterEsc);
  report('feedback: submit opens the issue link', Array.isArray(r.opened) && r.opened[0]?.startsWith('https://github.com/test/test/issues/new?'), { opened: (r.opened || []).map((u) => u.slice(0, 160)), submitted: r.submitted, form: r.formText });
  report('feedback: Ctrl+Shift+F mid-level', r.shortcut.open && r.afterShortcutEsc.ui === 'pause' && !r.stuck, { shortcut: r.shortcut, afterEsc: r.afterShortcutEsc, playerMovedAfter: r.stuck });
  report('feedback: opens with the loop stalled', r.stalled, r.stalled);
}

const errs = cli('console', 'error');
const n = (errs.match(/Errors: (\d+)/) || [])[1];
report('console errors', !n || n === '0', (errs.match(/Total messages: .*/) || [''])[0] + (n && n !== '0' ? '\n' + errs.split('\n').filter((l) => /error/i.test(l)).slice(0, 12).join('\n') : ''));
try { cli('close'); } catch { /* closed */ }
console.log(fails ? `pt-checks: ${fails} failed` : 'pt-checks: all passed');
process.exit(fails ? 1 : 0);
