// Dialog: a parchment box at the bottom with the speaker's portrait and name, typed out by the
// Text speed setting. Driven from the fixed step (so replays stay frame-exact): any action
// press (or a tap on the box) finishes the line, the next press goes on.
//
//   dialog.open(lines, {id, onDone})
//   lines: [{who, text}] or [[who, text]] or strings ('narrator' lines). `who` is a cricket id,
//   an npc id (sprites/npcs/<id>.png + <id>-talk.png flap), a gecko id (sprites/geckos/<id>/),
//   or null. `*slurp*` (any *word*) is a beat: shown in italics with a short pause; for Lashes
//   the portrait licks its eye (lick.png) during the beat.
import { CRICKETS } from '../data/crickets.js';
import * as S from './sprites.js';
import { line } from './lines.js';
import { pairTokens } from './ui.js'; // [polish-T]

const GECKOS = ['duchess', 'chikchak', 'bigtok', 'lashes', 'peridot', 'gargy', 'mossy', 'kite', 'ember', 'nana'];
const SPEED = { slow: 0.5, normal: 1.2, fast: 3, instant: 9999 }; // characters per fixed update
const BEAT = 26;     // frames a *beat* holds
const FLAP = 7;      // talk-frame flap period (frames)

const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

export function speakerInfo(who) {
  if (!who) return { name: '', base: null, talk: null, kind: 'none' };
  if (CRICKETS[who]) return { name: CRICKETS[who].name, base: `sprites/crickets/${who}/portrait.png`, talk: null, kind: 'cricket' };
  if (GECKOS.includes(who)) {
    const base = S.exists(`sprites/geckos/${who}/portrait.png`) ? `sprites/geckos/${who}/portrait.png` : `sprites/geckos/${who}/idle.png`; // [polish-V] Big Tok's and Nana's face portraits
    return { name: line(`geckos.${who}.name`), base, talk: null, lick: S.exists(`sprites/geckos/${who}/lick.png`) ? `sprites/geckos/${who}/lick.png` : null, kind: 'gecko' };
  }
  const base = `sprites/npcs/${who}.png`, talk = `sprites/npcs/${who}-talk.png`;
  if (who === 'barty') return { name: line('npcs.barty.name'), base: 'sprites/npcs/barty-head.png', talk: null, kind: 'npc' };
  if (who === 'kid') return { name: 'The kid', base: null, talk: null, kind: 'none' };
  return { name: line(`npcs.${who}.name`), base: S.exists(base) ? base : null, talk: S.exists(talk) ? talk : null, kind: 'npc' };
}

// Split a line into typed pieces: text runs and *beats*.
function tokens(text) {
  const out = [];
  for (const part of pairTokens(text).split(/(\*[^*]+\*|\{[a-zA-Z]+\})/)) {
    if (!part) continue;
    const m = part.match(/^\*([^*]+)\*$/), c = part.match(/^\{([a-zA-Z]+)\}$/);
    out.push(m ? { beat: m[1] } : c ? { cap: c[1] } : { text: part });
  }
  return out;
}

export class Dialog {
  constructor(root, opts) {
    this.opts = opts; // {settings, ui, onOpen, onClose, sfx}
    this.box = el('div', 'dialog');
    this.box.setAttribute('data-screen', 'dialog');
    this.box.setAttribute('role', 'dialog');
    this.box.setAttribute('aria-live', 'polite');
    this.box.hidden = true;
    this.pic = el('div', 'dlg-pic');
    this.img = el('img'); this.img.alt = ''; this.pic.append(this.img);
    this.name = el('div', 'dlg-name');
    this.text = el('div', 'dlg-text');
    this.more = el('div', 'dlg-more');
    const body = el('div', 'dlg-body'); body.append(this.name, this.text, this.more);
    this.box.append(this.pic, body);
    this.box.addEventListener('pointerdown', (e) => { e.preventDefault(); this.tapped = true; });
    root.append(this.box);
    this.active = false;
  }
  open(lines, o = {}) {
    this.lines = (Array.isArray(lines) ? lines : [lines]).map((l) => (typeof l === 'string' ? { who: o.who ?? null, text: l } : Array.isArray(l) ? { who: l[0], text: l[1] } : l));
    if (!this.lines.length) { o.onDone && o.onDone(); return; }
    this.o = o; this.i = -1; this.active = true; this.box.hidden = false; this.tapped = false;
    this.opts.onOpen && this.opts.onOpen();
    this.next();
  }
  next() {
    this.i++;
    if (this.i >= this.lines.length) return this.close();
    const L = this.lines[this.i];
    this.who = speakerInfo(L.who);
    this.box.className = `dialog who-${this.who.kind}`;
    this.name.textContent = this.who.name;
    this.name.hidden = !this.who.name;
    this.pic.hidden = !this.who.base;
    if (this.who.base) this.setPic(this.who.base);
    this.toks = tokens(L.text);
    this.text.innerHTML = '';
    this.spans = this.toks.map((t) => { const s = el('span', t.beat ? 'beat' : 'run'); this.text.append(s); return s; });
    this.ti = 0; this.ci = 0; this.acc = 0; this.hold = 0; this.done = false; this.f = 0; this.beatF = 0;
    this.more.hidden = true;
    if (this.opts.settings.textSpeed === 'instant') this.finish();
  }
  // put token i on screen ({action} tokens become key caps / pad glyphs)
  fill(i, t, text) {
    const sp = this.spans[i];
    if (t.beat) sp.textContent = `\u2026${t.beat}\u2026`;
    else if (t.cap) { if (!sp.firstChild) sp.append(this.opts.ui.cap(t.cap)); }
    else sp.textContent = text;
  }
  setPic(path) { const src = 'assets/' + path; if (this._pic !== src) { this._pic = src; this.img.src = src; } }
  finish() {
    this.toks.forEach((t, i) => this.fill(i, t, t.text));
    this.ti = this.toks.length; this.done = true; this.more.hidden = false;
    if (this.who.base) this.setPic(this.who.base);
  }
  close() {
    this.active = false; this.box.hidden = true;
    const o = this.o || {}; this.o = null;
    this.opts.onClose && this.opts.onClose(o.id);
    o.onDone && o.onDone();
  }
  // One fixed update. f = the input frame.
  step(f) {
    if (!this.active) return;
    this.f++;
    const press = this.tapped || ['jump', 'confirm', 'use', 'kick', 'chirp', 'back', 'listen', 'up'].some((a) => f.pressed[a]);
    this.tapped = false;
    if (press) { if (!this.done) this.finish(); else { this.next(); return; } }
    if (this.done) return;
    if (this.hold > 0) {
      this.hold--;
      if (this.who.lick) this.setPic(this.who.lick);
      return;
    }
    const tk = this.toks[this.ti];
    if (!tk) { this.done = true; this.more.hidden = false; if (this.who.base) this.setPic(this.who.base); return; }
    if (tk.beat) {
      this.fill(this.ti, tk);
      this.ti++; this.hold = BEAT;
      return;
    }
    if (tk.cap) { this.fill(this.ti, tk); this.ti++; return; }
    this.acc += SPEED[this.opts.settings.textSpeed] || SPEED.normal;
    const n = Math.floor(this.acc); this.acc -= n;
    this.ci = Math.min(tk.text.length, this.ci + n);
    this.spans[this.ti].textContent = tk.text.slice(0, this.ci);
    if (this.ci >= tk.text.length) { this.ti++; this.ci = 0; }
    // talk-frame flap while typing
    if (this.who.talk) this.setPic(Math.floor(this.f / FLAP) % 2 ? this.who.talk : this.who.base);
    else if (this.who.base) this.setPic(this.who.base);
    this.pic.classList.toggle('bob', Math.floor(this.f / FLAP) % 2 === 1);
  }
}
