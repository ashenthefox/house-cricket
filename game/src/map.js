// The map: a cut-away dollhouse of every room the player has visited, painted per zone, with
// markers. Drawn on a canvas inside the pause menu's Map tab. Zooms on the current zone; the
// "Whole house" view shows everything. With Weft recruited, a cursor sews stitches.
//
// Data: rooms and cells come from the World (data/rooms/*), names and the dollhouse floors from
// data/house.js when it provides them (see houseInfo()); markers from room entities.
import { ZONE_INFO } from '../data/zones.js';
import { ITEMS } from '../data/items.js';
import * as S from './sprites.js';

const SW = 32, SH = 18; // tiles per screen cell
export const HUB_ZONE = 'carrier';

const zoneInfoById = (id) => Object.values(ZONE_INFO).find((z) => z.id === id) || null;
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

export class MapView {
  constructor(game, opts = {}) {
    this.game = game; this.opts = opts; // {house, settings, stitchMode}
    this.mode = 'zone';
    this.cursor = null;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'map-canvas';
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'Map of the house');
    this.canvas.addEventListener('pointerdown', (e) => this.onPointer(e));
  }
  // rooms of the house (not the Carrier's hub rooms)
  // [final-S] and not the test zones (n >= 90: the Sandbox, the Engine test) or the opening tank (off the house map)
  rooms() { return Object.values(this.game.world.rooms).filter((r) => r.zone.id !== HUB_ZONE && !(r.zone.n >= 90) && r.zone.n !== 0 && r.zone.id !== 'z00-tank'); }
  currentZoneId() {
    const g = this.game;
    if (g.inCarrier) return this.carrierZone();
    return g.zone?.id;
  }
  carrierZone() { const c = this.carrierSpot(); return c ? c.zone : this.rooms()[0]?.zone.id; }
  // Where the Carrier sits on the map: a {type:'carrier'} entity, house.js's `carrier`, or the
  // first zone's start room.
  carrierSpot() {
    const H = this.opts.house;
    for (const r of this.rooms()) for (const e of r.entities) if (e.type === 'carrier') return { x: r.cx + e.x / SW, y: r.cy + e.y / SH, zone: r.zone.id, room: r.id };
    const hr = H?.ROOMS?.find((r) => (r.purpose || []).includes('carrier') || r.carrierDoor);
    if (hr) { const r = this.game.world.rooms[hr.id]; return r ? { x: r.cx + 0.5, y: r.cy + 0.82, zone: r.zone.id, room: r.id } : { x: hr.x + 0.5, y: hr.y + 0.82, zone: hr.zone, room: hr.id }; }
    const z1 = Object.values(this.game.world.zones).find((z) => z.n === 1);
    const r = z1 && this.game.world.rooms[z1.start.room];
    return r ? { x: r.cx + 0.5, y: r.cy + 0.8, zone: r.zone.id, room: r.id } : null;
  }
  visitedRoom(r) {
    for (let y = 0; y < r.sh; y++) for (let x = 0; x < r.sw; x++) if (this.game.visited.has(`${r.cx + x},${r.cy + y}`)) return true;
    return false;
  }
  bounds() {
    const zid = this.currentZoneId();
    const all = this.rooms();
    let rs = all.filter((r) => this.visitedRoom(r) || this.opts.echo);
    if (this.mode === 'zone' && zid) { const z = rs.filter((r) => r.zone.id === zid); if (z.length) rs = z; }
    if (!rs.length) rs = all.filter((r) => r.zone.id === zid);
    if (!rs.length) rs = all;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const r of rs) { x0 = Math.min(x0, r.cx); y0 = Math.min(y0, r.cy); x1 = Math.max(x1, r.cx + r.sw); y1 = Math.max(y1, r.cy + r.sh); }
    // [polish-T] zoom to what's been found: never closer than about 1.6 x 1 cells (was 4 x 2.5: one room was a speck on the parchment)
    const mw = 1.6, mh = 1;
    if (x1 - x0 < mw) { const c = (x0 + x1) / 2; x0 = c - mw / 2; x1 = c + mw / 2; }
    if (y1 - y0 < mh) { const c = (y0 + y1) / 2; y0 = c - mh / 2; y1 = c + mh / 2; }
    return { x0: x0 - 0.4, y0: y0 - 1.15, x1: x1 + 0.4, y1: y1 + 0.25 }; // [final-S] room for the top zone names (the Attic, the Chimney); [polish-T] tighter: the roof (0.8) and the name
  }
  // markers per visited room
  markers() {
    const g = this.game, m = g.meta || {}, out = [];
    for (const r of this.rooms()) {
      if (!this.visitedRoom(r) && !this.opts.echo) continue;
      const taken = g.roomState[r.id]?.taken || new Set();
      const info = zoneInfoById(r.zone.id);
      for (const e of r.entities) {
        const at = { x: r.cx + (e.x + 0.5) / SW, y: r.cy + (e.y + 0.5) / SH, room: r.id };
        const key = `${e.type}@${e.x},${e.y}`;
        if (e.type === 'save') out.push({ ...at, kind: 'save' });
        else if (e.type === 'item' && !g.player.has(e.item)) out.push({ ...at, kind: 'item', label: ITEMS[e.item]?.name });
        else if ((e.type === 'crumbs' || e.type === 'secret') && !taken.has(key)) out.push({ ...at, kind: 'ledge' });
        else if (e.type === 'npc' && e.recruit && !g.recruits.has(e.recruit) && !(m.notCrickets || []).includes(e.recruit)) out.push({ ...at, kind: 'recruit' });
        else if (e.type === 'boss' || e.type === 'lair') {
          const freed = info?.cricket ? g.rescued.has(info.cricket) : false;
          if (!out.some((o) => o.kind.startsWith('lair') && o.room === r.id)) out.push({ ...at, kind: freed ? 'lair-free' : 'lair' });
        } else if (e.type === 'cage' && !g.rescued.has(e.cricket)) {
          if (!out.some((o) => o.kind.startsWith('lair') && o.room === r.id)) out.push({ ...at, kind: 'lair' });
        }
      }
    }
    for (const [zid, h] of Object.entries(m.heardAt || {})) { const r = g.world.rooms[h.room]; if (r) out.push({ x: r.cx + h.x / SW, y: r.cy + h.y / SH, kind: 'ear', zone: zid }); }
    const c = this.carrierSpot(); if (c) out.push({ ...c, kind: 'carrier' });
    for (const s of m.stitches || []) out.push({ x: s.x, y: s.y, kind: 'stitch' });
    return out;
  }
  draw() {
    const cv = this.canvas, g = this.game;
    const W = cv.clientWidth || 640, H = cv.clientHeight || 300, dpr = Math.min(devicePixelRatio || 1, 2);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const c = cv.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    const b = this.bounds();
    const s = Math.min(W / (b.x1 - b.x0), H / (b.y1 - b.y0));
    const ox = (W - (b.x1 - b.x0) * s) / 2 - b.x0 * s, oy = (H - (b.y1 - b.y0) * s) / 2 - b.y0 * s;
    this.xf = { s, ox, oy, b };
    const X = (x) => ox + x * s, Y = (y) => oy + y * s;
    // the dollhouse: a roof over the visible rooms and a ground line
    const vis = this.rooms().filter((r) => this.visitedRoom(r) || this.opts.echo);
    if (vis.length) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const r of vis) { x0 = Math.min(x0, r.cx); y0 = Math.min(y0, r.cy); x1 = Math.max(x1, r.cx + r.sw); y1 = Math.max(y1, r.cy + r.sh); }
      c.strokeStyle = 'rgba(90,70,50,.55)'; c.lineWidth = 2.5; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(X(x0 - 0.3), Y(y0 - 0.05)); c.lineTo(X((x0 + x1) / 2), Y(y0 - 0.8)); c.lineTo(X(x1 + 0.3), Y(y0 - 0.05)); c.stroke();
      c.beginPath(); c.moveTo(X(x0 - 0.4), Y(y1 + 0.08)); c.lineTo(X(x1 + 0.4), Y(y1 + 0.08)); c.stroke();
    }
    // rooms
    const curRoom = g.inCarrier ? null : g.room;
    for (const r of this.rooms()) {
      const seen = this.visitedRoom(r);
      if (!seen && !this.opts.echo) continue;
      const pal = r.zone.palette || zoneInfoById(r.zone.id)?.palette || ['#B9A88C', '#E8D9B5', '#C8564B', '#7C98C4'];
      for (let y = 0; y < r.sh; y++) for (let x = 0; x < r.sw; x++) {
        const v = g.visited.has(`${r.cx + x},${r.cy + y}`);
        const px = X(r.cx + x), py = Y(r.cy + y);
        c.fillStyle = v ? rgba(pal[3] || pal[0], 0.55) : 'rgba(120,100,80,.12)';
        c.beginPath(); c.roundRect ? c.roundRect(px + 1.5, py + 1.5, s - 3, s - 3, Math.min(8, s * 0.12)) : c.rect(px + 1.5, py + 1.5, s - 3, s - 3); c.fill();
        if (v) { c.fillStyle = rgba(pal[1] || '#F2C46D', 0.25); c.beginPath(); c.ellipse(px + s * 0.4, py + s * 0.45, s * 0.3, s * 0.2, 0.4, 0, 7); c.fill(); }
      }
      c.strokeStyle = r === curRoom ? '#E8B85A' : 'rgba(62,42,32,.7)'; c.lineWidth = r === curRoom ? 3 : 1.5;
      c.strokeRect(X(r.cx) + 1.5, Y(r.cy) + 1.5, r.sw * s - 3, r.sh * s - 3);
    }
    // zone names
    c.font = `700 ${Math.max(12, Math.min(18, s * 0.16))}px Nunito, sans-serif`; c.textAlign = 'center'; c.fillStyle = 'rgba(62,42,32,.85)';
    const byZone = {};
    for (const r of vis) (byZone[r.zone.id] ||= []).push(r);
    for (const [zid, rs] of Object.entries(byZone)) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9;
      for (const r of rs) { x0 = Math.min(x0, r.cx); y0 = Math.min(y0, r.cy); x1 = Math.max(x1, r.cx + r.sw); }
      const name = rs[0].zone.name || zoneInfoById(zid)?.name || zid;
      c.fillText(name, X((x0 + x1) / 2), Math.max(Math.max(12, Math.min(18, s * 0.16)) + 3, Y(y0 - 0.85) - 4)); // [final-S] never above the canvas top
    }
    // markers
    for (const mk of this.markers()) this.drawMarker(c, mk, X(mk.x), Y(mk.y), Math.max(9, Math.min(16, s * 0.12)));
    // Pip
    if (curRoom) {
      const p = g.player, px = X(curRoom.cx + p.cx / 40 / SW), py = Y(curRoom.cy + p.cy / 40 / SH);
      const t = performance.now() / 300;
      c.fillStyle = '#E8B85A'; c.strokeStyle = '#3E2A20'; c.lineWidth = 2;
      c.beginPath(); c.arc(px, py, 6 + Math.sin(t) * 1.5, 0, 7); c.fill(); c.stroke();
    }
    if (this.cursor) {
      const cx = X(this.cursor.x), cy = Y(this.cursor.y);
      c.strokeStyle = '#E8B85A'; c.lineWidth = 2.5;
      c.beginPath(); c.arc(cx, cy, 12, 0, 7); c.moveTo(cx - 18, cy); c.lineTo(cx - 6, cy); c.moveTo(cx + 6, cy); c.lineTo(cx + 18, cy); c.moveTo(cx, cy - 18); c.lineTo(cx, cy - 6); c.moveTo(cx, cy + 6); c.lineTo(cx, cy + 18); c.stroke();
    }
  }
  drawMarker(c, mk, x, y, r) {
    c.save(); c.lineWidth = 2; c.strokeStyle = '#2A201A';
    switch (mk.kind) {
      case 'save': // a baseboard crack: zigzag on a dark slot
        c.fillStyle = '#3E2A20'; c.fillRect(x - r * 0.7, y - r * 0.5, r * 1.4, r);
        c.strokeStyle = '#F2C46D'; c.beginPath(); c.moveTo(x - r * 0.5, y - r * 0.3); c.lineTo(x - r * 0.1, y + r * 0.3); c.lineTo(x + r * 0.15, y - r * 0.2); c.lineTo(x + r * 0.5, y + r * 0.3); c.stroke(); break;
      case 'item': c.fillStyle = '#E8B85A'; c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r * 0.8, y); c.lineTo(x, y + r); c.lineTo(x - r * 0.8, y); c.closePath(); c.fill(); c.stroke(); break;
      case 'ledge': c.fillStyle = '#F4EBDD'; c.beginPath(); c.arc(x, y, r * 0.75, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#5A4632'; c.font = `800 ${r * 1.2}px Nunito, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', x, y + 1); break;
      case 'recruit': c.fillStyle = '#7C98C4'; c.beginPath(); c.arc(x, y, r * 0.75, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#F4EBDD'; c.beginPath(); c.arc(x, y - r * 0.15, r * 0.25, 0, 7); c.fill(); break;
      case 'lair': case 'lair-free':
        c.fillStyle = mk.kind === 'lair' ? '#C8564B' : '#8FB35A';
        c.beginPath(); c.ellipse(x, y, r * 1.1, r * 0.8, 0, 0, 7); c.fill(); c.stroke();
        c.fillStyle = '#F4EBDD'; c.beginPath(); c.arc(x - r * 0.35, y - r * 0.1, r * 0.22, 0, 7); c.arc(x + r * 0.35, y - r * 0.1, r * 0.22, 0, 7); c.fill(); break;
      case 'ear':
        c.strokeStyle = '#3B4A7A'; c.lineWidth = 2.5; c.beginPath(); c.arc(x, y - r * 0.1, r * 0.6, Math.PI * 0.9, Math.PI * 2.3); c.quadraticCurveTo(x + r * 0.3, y + r * 0.6, x - r * 0.1, y + r * 0.8); c.stroke();
        c.beginPath(); c.arc(x + r * 1.1, y, r * 0.5, -0.8, 0.8); c.stroke(); break;
      case 'carrier': {
        const img = S.get('carrier/feeder-cup-bed.png');
        c.fillStyle = '#F4EBDD'; c.strokeStyle = '#3E2A20';
        c.beginPath(); c.roundRect ? c.roundRect(x - r * 1.2, y - r * 0.8, r * 2.4, r * 1.6, 4) : c.rect(x - r * 1.2, y - r * 0.8, r * 2.4, r * 1.6); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(x - r * 1.3, y - r * 0.8); c.lineTo(x + r * 1.3, y - r * 0.8); c.lineWidth = 3; c.stroke();
        c.fillStyle = '#C9A46A'; c.beginPath(); c.ellipse(x, y + r * 0.2, r * 0.55, r * 0.3, 0, 0, 7); c.fill();
        void img; break;
      }
      case 'stitch':
        c.strokeStyle = '#C8564B'; c.lineWidth = 3; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x - r * 0.6, y - r * 0.6); c.lineTo(x + r * 0.6, y + r * 0.6); c.moveTo(x + r * 0.6, y - r * 0.6); c.lineTo(x - r * 0.6, y + r * 0.6); c.stroke(); break;
      default: break;
    }
    c.restore();
  }
  // cursor (stitch mode)
  startCursor() {
    const g = this.game;
    if (g.inCarrier || !g.room) { const c = this.carrierSpot(); this.cursor = c ? { x: c.x, y: c.y } : { x: 0, y: 0 }; }
    else this.cursor = { x: g.room.cx + g.player.cx / 40 / SW, y: g.room.cy + g.player.cy / 40 / SH };
  }
  moveCursor(dx, dy) { if (!this.cursor) this.startCursor(); const st = 0.25; this.cursor.x += dx * st; this.cursor.y += dy * st; const b = this.xf?.b; if (b) { this.cursor.x = Math.max(b.x0, Math.min(b.x1, this.cursor.x)); this.cursor.y = Math.max(b.y0, Math.min(b.y1, this.cursor.y)); } }
  toggleStitch() {
    const m = this.game.meta; if (!m || !this.cursor) return;
    const i = m.stitches.findIndex((s) => Math.hypot(s.x - this.cursor.x, s.y - this.cursor.y) < 0.2);
    if (i >= 0) m.stitches.splice(i, 1); else m.stitches.push({ x: Math.round(this.cursor.x * 100) / 100, y: Math.round(this.cursor.y * 100) / 100 });
  }
  onPointer(e) {
    if (!this.opts.stitchMode || !this.xf) return;
    const r = this.canvas.getBoundingClientRect();
    const { s, ox, oy } = this.xf;
    this.cursor = { x: (e.clientX - r.left - ox) / s, y: (e.clientY - r.top - oy) / s };
    this.toggleStitch(); this.draw();
  }
}

// Per-zone item tallies for Lumen's map table: found and missing items, by zone.
export function itemTally(game) {
  const out = [];
  for (const z of Object.values(game.world.zones)) {
    if (z.id === HUB_ZONE) continue;
    let found = 0, all = 0, crumbs = 0, crumbsAll = 0;
    for (const r of z.rooms) for (const e of r.entities || []) {
      if (e.type === 'item') { all++; if (game.player.has(e.item)) found++; }
      if (e.type === 'crumbs' || e.type === 'secret') { crumbsAll++; if (game.roomState[r.id]?.taken.has(`${e.type}@${e.x},${e.y}`)) crumbs++; }
    }
    out.push({ zone: z.name || z.id, found, all, secrets: crumbs, secretsAll: crumbsAll });
  }
  return out;
}
