// Sprite registry keyed by the asset paths in design/BUILD_PLAN.md (relative to game/assets/).
// get(path) returns a loaded image, or null while loading or when the file doesn't exist yet;
// callers draw shapes when it's null. Only files listed in data/assets.js (written by
// tools/list-assets.mjs) are requested, so missing art never 404s.
// Add ?shapes=1 to the URL to force the shape fallbacks.
//
// Memory (design: "Phones and memory"): per-zone art (paintings, textures, gecko art) is
// released when the zone changes: setZone(paths) keeps the listed prefixes and drops every
// earlier zone's prefixes. Phones get the -phone painting copies (bgPath()).
import { ASSET_FILES } from '../data/assets.js';

const have = new Set(ASSET_FILES);
const cache = new Map();
const forceShapes = typeof location !== 'undefined' && new URLSearchParams(location.search).has('shapes');

export function exists(path) { return !forceShapes && have.has(path); }

export function get(path) {
  if (!exists(path)) return null;
  let e = cache.get(path);
  if (!e) {
    e = { img: new Image(), ok: false, bad: false };
    e.img.onload = () => { e.ok = true; };
    e.img.onerror = () => { e.bad = true; };
    e.img.decoding = 'async';
    e.img.src = 'assets/' + path;
    cache.set(path, e);
  }
  return e.ok ? e.img : null;
}
// start loading without drawing (next zone at its exit, a boss's frames before the fight)
export function preload(paths) { for (const p of paths) get(p); }
// true once every listed (existing) file has loaded
export function ready(paths) { return paths.every((p) => !exists(p) || get(p)); }

const json = new Map();
export function getJSON(path) {
  if (!exists(path)) return null;
  let e = json.get(path);
  if (!e) {
    e = { data: null };
    json.set(path, e);
    fetch('assets/' + path).then((r) => (r.ok ? r.json() : null)).then((d) => { e.data = d; }).catch(() => {});
  }
  return e.data;
}

// Animation frames: sprites/crickets/<id>/anim/<anim>/NN.png -> the list that exists.
const framesCache = new Map();
export function frames(dir) {
  if (framesCache.has(dir)) return framesCache.get(dir);
  const list = forceShapes ? [] : ASSET_FILES.filter((f) => f.startsWith(dir + '/') && /\/\d+\.png$/.test(f)).sort();
  framesCache.set(dir, list);
  return list;
}

// Release everything under a prefix (per-zone art on leaving a zone).
export function release(prefix) {
  for (const k of [...cache.keys()]) if (k.startsWith(prefix)) { const e = cache.get(k); e.img.src = ''; cache.delete(k); }
  for (const k of [...bboxes.keys()]) if (k.startsWith(prefix)) bboxes.delete(k);
}

// Per-zone sets. setZone(['bg/z03-kitchen/', 'textures/z03-kitchen', 'sprites/geckos/bigtok/'])
// releases the prefixes of the previous set that aren't in the new one.
let zoneSet = [];
export function setZone(prefixes) {
  const keep = new Set(prefixes);
  for (const p of zoneSet) if (!keep.has(p)) release(p);
  zoneSet = [...keep];
}
// add a prefix to the current zone's set (released with it), e.g. a boss's gecko folder
export function zoneHold(prefix) { if (!zoneSet.includes(prefix)) zoneSet.push(prefix); }

// Paintings: phones (small backing stores) get the 1920-wide copies.
let phone = false;
export function setPhone(v) { phone = !!v; }
export function isPhone() { return phone; }
export function bgPath(folder, variant = 'a') {
  const full = `bg/${folder}/far-${variant}.webp`, small = `bg/${folder}/far-${variant}-phone.webp`;
  if (phone && exists(small)) return small;
  if (exists(full)) return full;
  return exists(small) ? small : null;
}

// Opaque bounding box of a loaded image in its own pixels {x, y, w, h} (measured once on a
// small canvas). Used to align poses (cling to the wall, hang from the hands) and props.
const bboxes = new Map();
export function bbox(path) {
  if (bboxes.has(path)) return bboxes.get(path);
  const img = get(path);
  if (!img) return null;
  const k = Math.min(1, 128 / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
  let b = { x: 0, y: 0, w: img.width, h: img.height };
  try {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0, w, h);
    const d = g.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 >= 0) b = { x: x0 / k, y: y0 / k, w: (x1 - x0 + 1) / k, h: (y1 - y0 + 1) / k };
  } catch { /* tainted or no canvas: whole image */ }
  bboxes.set(path, b);
  return b;
}
