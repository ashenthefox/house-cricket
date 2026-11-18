// Enemies, data-driven (design: "Enemies"). Two kinds:
//  - bonkable critters: a kick flips them (2.png), a chirp stuns them (radius and stun from the
//    Chirp stat; Rin's Lullaby x3); they scurry off and come back to their spawn 6 s later.
//  - unbeatable hazards (darkling beetle, robot vacuum): kicks clonk, chirps do nothing; hide.
// Add a type: an entry in TYPES naming a behaviour in BEHAVIOURS (or write a new one).
// Room entity: { type:'ant', x, y, range:[x0, x1], dir, path:[[x,y],...], ...overrides } (tiles).
// Per-type fields (all optional): fly (no gravity; spawns centred in its tile), damage (0 =
// harmless), block (pushes you out like a wall), frontOnly (only its front hurts; its back
// blocks), kick: 'flip' | 'rear' (only from behind or while recovering) | 'stunned' (only
// while stunned) | 'push' | 'none', chirp: 'stun' | 'scatter' | 'none', flash: 'stun' | 'none',
// pound: 'split', spring (tiles: landing on it bounces you), loud (tiles: a moving loud zone),
// caught: 'checkpoint' (sends you to the room checkpoint instead of hurting), gone (frames away
// after a flip/scatter). Entity fields override the type's numbers (e.g. every, speed, sight).
// No DOM; randomness only from seeded() (deterministic replays).
import { TILE, DT, FPS } from '../data/movement.js';
import { solidSide, K, moveX, moveY } from './physics.js';
import { seeded } from './world.js';

const E = (name, o) => ({ bonkable: true, damage: 1, speed: 50, w: 30, h: 16, sprite: `sprites/enemies/${o.folder || name}`, kick: 'flip', chirp: 'stun', flash: 'stun', color: '#7A3B2A', dark: '#3E1E16', ...o });
export const TYPES = {
  ant:         E('ant',         { behaviour: 'patrol', w: 30, h: 16, speed: 55, name: 'Ant' }),
  mites:       E('mites',       { behaviour: 'drift', fly: true, w: 28, h: 24, speed: 16, chirp: 'scatter', name: 'Dust mites', color: '#C9C3CC', dark: '#6F7487' }),
  silverfish:  E('silverfish',  { behaviour: 'dart', w: 34, h: 12, speed: 300, dartT: 0.45, restT: 0.8, name: 'Silverfish', color: '#A9B8C2', dark: '#4F5B6E' }),
  mosquito:    E('mosquito',    { behaviour: 'dive', fly: true, w: 28, h: 20, speed: 40, diveSpeed: 380, sight: 5, tellT: 0.45, name: 'Mosquito', color: '#5A4632', dark: '#2A2220' }),
  cockroach:   E('cockroach',   { behaviour: 'roach', w: 40, h: 18, speed: 110, startle: 2.5, kick: 'stunned', name: 'Cockroach', color: '#6B3A22', dark: '#331A10' }),
  fruitflies:  E('fruitflies',  { behaviour: 'swarm', fly: true, w: 70, h: 90, speed: 12, damage: 0, block: true, kick: 'none', chirp: 'scatter', gone: 600, drawW: 110, name: 'Fruit-fly swarm', color: '#8C6A3A', dark: '#3E2F22' }),
  weevil:      E('weevil',      { behaviour: 'roller', w: 30, h: 18, speed: 0, every: 2.5, grainSpeed: 170, name: 'Weevil', color: '#5C3F27', dark: '#2A1C10' }),
  antsoldier:  E('antsoldier',  { behaviour: 'charger', w: 40, h: 22, speed: 45, chargeSpeed: 330, sight: 7, windT: 0.6, recoverT: 1.2, kick: 'rear', name: 'Ant soldier', color: '#8A2E1E', dark: '#3E1410' }),
  clothesmoth: E('clothesmoth', { behaviour: 'moth', fly: true, w: 34, h: 26, speed: 85, sight: 4, name: 'Clothes moth', color: '#D9CBA8', dark: '#7A6A4A' }),
  earwig:      E('earwig',      { behaviour: 'patrol', w: 44, h: 20, speed: 22, kick: 'rear', frontOnly: true, name: 'Earwig', color: '#5C2E1E', dark: '#2A140C' }),
  dustbunny:   E('dustbunny',   { behaviour: 'roll', w: 30, h: 28, speed: 45, maxSpeed: 240, grow: 2, kick: 'push', pound: 'split', name: 'Dust bunny', color: '#B9B4AE', dark: '#6F6A66' }),
  stinkbug:    E('stinkbug',    { behaviour: 'stinker', w: 36, h: 24, speed: 28, every: 5, cloudT: 4, name: 'Stink bug', color: '#7C8B4A', dark: '#3A4222' }),
  booklouse:   E('booklouse',   { behaviour: 'crowd', w: 20, h: 14, speed: 30, chirp: 'scatter', name: 'Booklouse', color: '#D8C9A8', dark: '#7A6A4A' }),
  wolfspider:  E('wolfspider',  { behaviour: 'pounce', w: 44, h: 26, speed: 0, sight: 7, watchT: 0.9, restT: 1.0, name: 'Wolf spider', color: '#5A4632', dark: '#2A2018' }),
  wasp:        E('wasp',        { behaviour: 'diver', fly: true, w: 36, h: 28, speed: 120, diveSpeed: 520, sight: 8, tellT: 0.6, name: 'Wasp', color: '#E0B03A', dark: '#3A2A10' }),
  aphid:       E('aphid',       { behaviour: 'patrol', w: 30, h: 18, speed: 14, damage: 0, spring: 5, name: 'Aphids', color: '#9CC97A', dark: '#5E9A52' }),
  centipede:   E('centipede',   { behaviour: 'crawler', w: 60, h: 14, speed: 420, chirp: 'none', kick: 'stunned', name: 'House centipede', color: '#8A6844', dark: '#4E3824', frameRate: 4 }),
  cellarspider: E('cellarspider', { behaviour: 'dropper', w: 34, h: 30, upT: 2.0, downT: 1.0, dropSpeed: 360, climbSpeed: 150, name: 'Cellar spider', color: '#8C7A66', dark: '#3E342A' }),
  beetle:      E('beetle',      { bonkable: false, behaviour: 'route', w: 50, h: 28, speed: 50, kick: 'none', chirp: 'none', flash: 'none', name: 'Darkling beetle', knock: 1.4, pause: 40, color: '#2B2730', dark: '#121016' }),
  vacuum:      E('vacuum',      { bonkable: false, behaviour: 'vacuum', w: 120, h: 44, speed: 110, damage: 0, loud: 2.5, caught: 'checkpoint', kick: 'none', chirp: 'none', flash: 'none', drawW: 150, name: 'Robot vacuum', color: '#3A3A42', dark: '#121216' }),
};
// friendlier spellings builders may use
const ALIAS = { dustmites: 'mites', mite: 'mites', 'fruit-flies': 'fruitflies', soldier: 'antsoldier', moth: 'clothesmoth', bunny: 'dustbunny', centipedes: 'centipede', spider: 'wolfspider' };

const flipFrames = 80, scurryFrames = 90, goneFrames = 360;
const f = (s) => Math.round(s * FPS);

export function spawnEnemy(def, idx, roomId = '') {
  const type = ALIAS[def.type] || def.type;
  const T0 = TYPES[type];
  if (!T0) throw new Error(`unknown enemy type ${def.type}`);
  const T = { ...T0 };
  for (const k of ['speed', 'every', 'sight', 'diveSpeed', 'chargeSpeed', 'spring', 'loud', 'damage', 'grainSpeed', 'upT', 'downT', 'watchT', 'restT', 'tellT', 'cloudT', 'maxSpeed', 'block', 'knock']) if (def[k] != null) T[k] = def[k]; // [fixer] block, knock
  const e = {
    id: `${type}-${idx}`, type, T, def,
    w: T.w, h: T.h,
    x: def.x * TILE + (TILE - T.w) / 2, y: T.fly ? def.y * TILE + (TILE - T.h) / 2 : (def.y + 1) * TILE - T.h,
    dir: def.dir ?? -1, state: 'walk', mode: 'idle', mt: 0, t: 0, stun: 0, vx: 0, vy: 0, hitBy: -1, alpha: 1, pauseT: 0,
    rng: seeded(`enemy:${roomId}:${idx}:${type}`),
  };
  e.home = { x: e.x, y: e.y, dir: e.dir };
  if (def.range) { e.minX = def.range[0] * TILE; e.maxX = Math.max(e.minX, (def.range[1] + 1) * TILE - e.w); }
  if (def.path) { e.path = def.path.map(([x, y]) => ({ x: x * TILE + (TILE - T.w) / 2, y: (y + 1) * TILE - T.h })); e.wp = 0; e.x = e.path[0].x; e.y = e.path[0].y; e.home = { x: e.x, y: e.y, dir: e.dir }; }
  if (type === 'cellarspider') { e.topY = e.y; e.botY = def.drop != null ? e.y + def.drop * TILE : null; }
  return e;
}

const body = (e) => ({ x: e.x, y: e.y, w: e.w, h: e.h, tiny: false });
function floorAhead(grid, e, dir) {
  const fx = dir > 0 ? e.x + e.w + 1 : e.x - 1;
  const tx = Math.floor(fx / TILE), ty = Math.floor((e.y + e.h + 1) / TILE);
  const k = grid.at(tx, ty);
  return solidSide(k, body(e)) || k === K.ONEWAY;
}
function wallAhead(grid, e, dir) {
  const fx = dir > 0 ? e.x + e.w + 1 : e.x - 1;
  const tx = Math.floor(fx / TILE);
  for (const y of [e.y + 2, e.y + e.h - 2]) if (solidSide(grid.at(tx, Math.floor(y / TILE)), body(e))) return true;
  return false;
}
// Move with tile collisions and gravity (walkers that fall, pounce, roll). Returns {landed, hitX}.
function physStep(e, g, grav = 1800) {
  e.vy = Math.min(e.vy + grav * DT, 900);
  const b = body(e);
  const rx = moveX(g.grid, b, e.vx * DT);
  const ry = moveY(g.grid, b, e.vy * DT);
  e.x = b.x; e.y = b.y;
  if (ry.landed || ry.ceiling) e.vy = 0;
  return { landed: !!ry.landed, hitX: rx.hit };
}
const inRange = (e, nx) => e.minX == null || (nx >= e.minX && nx <= e.maxX);
const ecx = (e) => e.x + e.w / 2, ecy = (e) => e.y + e.h / 2;
// Can it see the player? (not hidden, within `tiles`, roughly the same height band unless `any`)
function sees(e, p, tiles, band = 2.5) {
  if (p.hidden) return false;
  const dx = p.cx - ecx(e), dy = p.cy - ecy(e);
  return Math.abs(dx) <= tiles * TILE && Math.abs(dy) <= band * TILE;
}
function toward(e, tx, ty, speed) {
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
  if (d < 1) return true;
  const s = Math.min(d, speed * DT);
  e.x += (dx / d) * s; e.y += (dy / d) * s;
  if (Math.abs(dx) > 2) e.dir = Math.sign(dx);
  return d <= speed * DT;
}

function patrolStep(e, g, speed) {
  if (e.minX != null && e.maxX - e.minX < 1) return false; // range of one tile: stands its ground
  const nx = e.x + e.dir * speed * DT;
  const turn = wallAhead(g.grid, e, e.dir) || !floorAhead(g.grid, e, e.dir) || !inRange(e, nx);
  if (turn) { e.dir = -e.dir; return true; }
  e.x = nx; return false;
}

export const BEHAVIOURS = {
  // walks a platform; turns at walls, ledges and the ends of its range
  patrol(e, g) { patrolStep(e, g, e.T.speed); },
  // plods a fixed route back and forth, pausing at each end; oblivious to everything
  route(e, g) {
    if (e.pauseT > 0) { e.pauseT--; return; }
    const nx = e.x + e.dir * e.T.speed * DT;
    const end = !inRange(e, nx) || wallAhead(g.grid, e, e.dir) || !floorAhead(g.grid, e, e.dir);
    if (end) { e.dir = -e.dir; e.pauseT = e.T.pause || 0; } else e.x = nx;
  },
  // dust mites: drift slowly round home, leaning toward a nearby cricket (leash 3 tiles)
  drift(e, g) {
    const p = g.player, a = e.t / 90;
    let tx = e.home.x + Math.sin(a) * TILE * 0.8, ty = e.home.y + Math.sin(a * 1.7) * TILE * 0.4;
    if (sees(e, p, 4, 3)) { tx += Math.max(-3 * TILE, Math.min(3 * TILE, p.cx - ecx(e))) * 0.6; ty += Math.max(-2 * TILE, Math.min(2 * TILE, p.cy - ecy(e))) * 0.5; }
    toward(e, tx, ty, e.T.speed + 20);
  },
  // silverfish: darts fast along the floor in bursts, then freezes
  dart(e, g) {
    if (e.mode === 'rest') { if (--e.mt <= 0) { e.mode = 'dart'; e.mt = f(e.T.dartT); if (e.rng() < 0.3) e.dir = -e.dir; } return; }
    patrolStep(e, g, e.T.speed);
    if (--e.mt <= 0) { e.mode = 'rest'; e.mt = f(e.T.restT); }
  },
  // mosquito: hovers, then (tell) dives at where you were, then climbs back
  dive(e, g) {
    const p = g.player;
    if (e.mode === 'idle') {
      e.x = e.home.x + Math.sin(e.t / 25) * TILE * 0.6; e.y = e.home.y + Math.sin(e.t / 13) * 6;
      if (sees(e, p, e.T.sight, 5) && e.mt <= 0) { e.mode = 'tell'; e.mt = f(e.T.tellT); e.dir = Math.sign(p.cx - ecx(e)) || e.dir; g.emit('enemyTell', { x: ecx(e), y: e.y, type: e.type }); }
      else e.mt--;
    } else if (e.mode === 'tell') {
      e.x += Math.sin(e.t * 1.7) * 1.5;
      if (--e.mt <= 0) { e.mode = 'dive'; e.target = { x: p.x + p.w / 2 - e.w / 2, y: p.y + p.h / 2 - e.h / 2 }; e.mt = f(1.2); }
    } else if (e.mode === 'dive') {
      if (toward(e, e.target.x, e.target.y, e.T.diveSpeed) || --e.mt <= 0) { e.mode = 'back'; }
    } else if (e.mode === 'back') {
      if (toward(e, e.home.x, e.home.y, e.T.speed * 3)) { e.mode = 'idle'; e.mt = f(1.0); }
    }
  },
  // cockroach: scuttles; if you come close (or kick it unstunned) it flies off in an arc away
  roach(e, g) {
    const p = g.player;
    if (e.mode === 'fly') {
      const r = physStep(e, g, 700);
      if (r.hitX) e.vx = -e.vx;
      if (r.landed && e.vy >= 0 && e.mt-- <= 0) { e.mode = 'idle'; e.vx = 0; }
      return;
    }
    if (sees(e, p, e.T.startle, 1.5)) return startle(e, g, Math.sign(ecx(e) - p.cx) || 1);
    patrolStep(e, g, e.T.speed);
  },
  // fruit-fly swarm: a cloud hanging in a corridor (blocks; chirp scatters it)
  swarm(e) { e.x = e.home.x + Math.sin(e.t / 40) * 4; e.y = e.home.y + Math.sin(e.t / 23) * 5; },
  // weevil: sits (or plods) and rolls a rice grain along the floor every `every` s
  roller(e, g) {
    if (e.T.speed) patrolStep(e, g, e.T.speed);
    if (e.mt-- <= 0) {
      e.mt = f(e.T.every);
      g.projectiles.push({ kind: 'grain', x: e.dir > 0 ? e.x + e.w : e.x - 14, y: e.y + e.h - 10, w: 14, h: 10, vx: e.dir * e.T.grainSpeed, vy: 0, life: f(8), damage: 1, from: e.id });
      g.emit('grain', { x: ecx(e), y: e.y });
    }
  },
  // ant soldier: patrols; sees you ahead -> wind-up (tell) -> charge -> dazed recovery (kick it then)
  charger(e, g) {
    const p = g.player;
    if (e.mode === 'idle') {
      patrolStep(e, g, e.T.speed);
      const ahead = Math.sign(p.cx - ecx(e)) === e.dir;
      if (ahead && sees(e, p, e.T.sight, 1.2)) { e.mode = 'wind'; e.mt = f(e.T.windT); g.emit('enemyTell', { x: ecx(e), y: e.y, type: e.type }); }
    } else if (e.mode === 'wind') {
      if (--e.mt <= 0) { e.mode = 'charge'; e.mt = f(3); }
    } else if (e.mode === 'charge') {
      const stop = patrolStep(e, g, e.T.chargeSpeed);
      if (stop || --e.mt <= 0) { e.dir = -e.dir; e.mode = 'recover'; e.mt = f(e.T.recoverT); g.emit('thunk', { x: ecx(e), y: e.y }); }
    } else if (e.mode === 'recover') { if (--e.mt <= 0) e.mode = 'idle'; }
  },
  // clothes moth: flutters to light (a Glow Bead flash for 8 s, a {type:'light'} in the room, or
  // your glow in a dark room); otherwise hovers home and swoops if you come close
  moth(e, g) {
    const p = g.player;
    const flash = g.lightAt && g.frame - g.lightAt.f < 8 * FPS ? g.lightAt : null;
    let tgt = flash || (g.room?.dark && p.has('glow') && !p.hidden ? { x: p.cx, y: p.cy - 30 } : null) || g.mech?.lights?.[0] || null;
    if (!tgt && sees(e, p, e.T.sight, 3)) tgt = { x: p.cx, y: p.cy };
    const wob = Math.sin(e.t / 9) * 18;
    if (tgt) toward(e, tgt.x - e.w / 2 + Math.cos(e.t / 17) * 20, tgt.y - e.h / 2 + wob, e.T.speed);
    else toward(e, e.home.x + Math.sin(e.t / 50) * TILE, e.home.y + wob, e.T.speed * 0.6);
  },
  // dust bunny: rolls along; downhill (falling) it speeds up and grows; walls bounce it back
  roll(e, g) {
    if (!e.rolling) { e.rolling = true; e.vx = e.dir * e.T.speed; }
    const wasY = e.y;
    const r = physStep(e, g);
    if (r.hitX) { e.dir = -e.dir; e.vx = e.dir * Math.max(e.T.speed, Math.abs(e.vx) * 0.6); }
    if (e.y > wasY + 0.5) { e.vx = e.dir * Math.min(e.T.maxSpeed, Math.abs(e.vx) + 300 * DT); grow(e, g, 0.12); }
    else if (r.landed) e.vx = e.dir * Math.max(e.T.speed, Math.abs(e.vx) - 60 * DT);
    if (e.minX != null && (e.x < e.minX || e.x > e.maxX)) { e.x = Math.max(e.minX, Math.min(e.maxX, e.x)); e.dir = -e.dir; e.vx = -e.vx; }
    if (e.y > g.room.ph + 80) { Object.assign(e, { x: e.home.x, y: e.home.y, w: e.T.w, h: e.T.h, vx: e.dir * e.T.speed, vy: 0 }); }
  },
  // stink bug: plods; leaves a stink cloud every `every` s (and when kicked) that lingers cloudT s
  stinker(e, g) {
    patrolStep(e, g, e.T.speed);
    if (e.mt-- <= 0) { e.mt = f(e.T.every); stink(e, g); }
  },
  // booklice: crowd a gap, jittering in place
  crowd(e) { e.x = e.home.x + Math.round(Math.sin(e.t / 6 + e.home.x) * 6); e.dir = Math.sin(e.t / 50 + e.home.x) > 0 ? 1 : -1; },
  // wolf spider: watches you (turns to face), then pounces where you stand; can't see you hidden
  pounce(e, g) {
    const p = g.player;
    if (e.mode === 'jump') {
      const r = physStep(e, g);
      if (r.hitX) e.vx = 0;
      if (r.landed) { e.mode = 'rest'; e.mt = f(e.T.restT); e.vx = 0; }
      return;
    }
    if (e.mode === 'rest') { if (--e.mt <= 0) e.mode = 'idle'; return; }
    if (sees(e, p, e.T.sight, 4)) {
      e.dir = Math.sign(p.cx - ecx(e)) || e.dir;
      if (e.mode !== 'watch') { e.mode = 'watch'; e.mt = f(e.T.watchT); g.emit('enemyTell', { x: ecx(e), y: e.y, type: e.type }); }
      else if (--e.mt <= 0) {
        const dx = p.cx - ecx(e), tAir = 0.7;
        e.vx = Math.max(-420, Math.min(420, dx / tAir)); e.vy = -Math.max(380, 1800 * tAir / 2 + (ecy(e) - p.cy) / tAir);
        e.mode = 'jump';
      }
    } else e.mode = 'idle';
  },
  // wasp: hovers; sees you -> tell -> dives in a straight line through where you were -> flies back
  diver(e, g) {
    const p = g.player;
    if (e.mode === 'idle') {
      e.x = e.home.x + Math.sin(e.t / 30) * TILE; e.y = e.home.y + Math.sin(e.t / 11) * 5;
      if (e.mt > 0) e.mt--;
      else if (sees(e, p, e.T.sight, 8)) { e.mode = 'tell'; e.mt = f(e.T.tellT); e.dir = Math.sign(p.cx - ecx(e)) || e.dir; g.emit('enemyTell', { x: ecx(e), y: e.y, type: e.type }); }
    } else if (e.mode === 'tell') {
      if (--e.mt <= 0) {
        const dx = p.cx - ecx(e), dy = p.cy - ecy(e), d = Math.hypot(dx, dy) || 1;
        e.vx = (dx / d) * e.T.diveSpeed; e.vy = (dy / d) * e.T.diveSpeed; e.mode = 'dive'; e.mt = f(12 * TILE / e.T.diveSpeed);
      }
    } else if (e.mode === 'dive') {
      e.x += e.vx * DT; e.y += e.vy * DT;
      const hit = solidSide(g.grid.at(Math.floor(ecx(e) / TILE), Math.floor(ecy(e) / TILE)), body(e));
      if (hit || --e.mt <= 0) { e.mode = 'back'; e.vx = 0; e.vy = 0; }
    } else if (toward(e, e.home.x, e.home.y, e.T.speed * 2.5)) { e.mode = 'idle'; e.mt = f(1.2); }
  },
  // house centipede: very fast along a looped path of tile waypoints (walls and ceilings too);
  // without a path it races its floor. Only a Glow Bead flash stops it.
  crawler(e, g) {
    if (e.path) { const w = e.path[e.wp]; if (toward(e, w.x, w.y, e.T.speed)) e.wp = (e.wp + 1) % e.path.length; return; }
    patrolStep(e, g, e.T.speed);
  },
  // cellar spider: hangs up high, drops on its silk (timed, or when you pass below), climbs back
  dropper(e, g) {
    const p = g.player;
    if (e.botY == null) { // drop to the floor below its spawn
      let ty = Math.floor((e.y + e.h) / TILE);
      while (ty < g.grid.h && !solidSide(g.grid.at(Math.floor(ecx(e) / TILE), ty), body(e))) ty++;
      e.botY = ty * TILE - e.h;
    }
    if (e.mode === 'idle') {
      const below = !p.hidden && Math.abs(p.cx - ecx(e)) < 1.5 * TILE && p.y > e.y;
      if (--e.mt <= 0 || (below && e.mt < f(e.T.upT) - 20)) { e.mode = 'drop'; g.emit('enemyTell', { x: ecx(e), y: e.y, type: e.type }); }
    } else if (e.mode === 'drop') {
      e.y = Math.min(e.botY, e.y + e.T.dropSpeed * DT);
      if (e.y >= e.botY) { e.mode = 'down'; e.mt = f(e.T.downT); }
    } else if (e.mode === 'down') { if (--e.mt <= 0) e.mode = 'climb'; }
    else if (e.mode === 'climb') {
      e.y = Math.max(e.topY, e.y - e.T.climbSpeed * DT);
      if (e.y <= e.topY) { e.mode = 'idle'; e.mt = f(e.T.upT); }
    }
  },
  // robot vacuum: a looped route of waypoints (or back and forth in its range), never stops
  vacuum(e, g) {
    if (e.path) { const w = e.path[e.wp]; if (toward(e, w.x, w.y, e.T.speed)) e.wp = (e.wp + 1) % e.path.length; return; }
    const nx = e.x + e.dir * e.T.speed * DT;
    if (!inRange(e, nx) || wallAhead(g.grid, e, e.dir) || !floorAhead(g.grid, e, e.dir)) e.dir = -e.dir; else e.x = nx;
  },
};

function startle(e, g, away) {
  e.mode = 'fly'; e.dir = away; e.vx = away * 260; e.vy = -420; e.mt = 0;
  g.emit('startle', { x: ecx(e), y: e.y, type: e.type });
}
function stink(e, g) {
  g.projectiles.push({ kind: 'stink', x: ecx(e) - 1.5 * TILE, y: e.y + e.h - 2 * TILE, w: 3 * TILE, h: 2 * TILE, vx: 0, vy: 0, life: f(e.T.cloudT), max: f(e.T.cloudT), damage: 1, still: true, from: e.id });
  g.emit('stink', { x: ecx(e), y: e.y });
}
function grow(e, g, n) {
  const max = e.T.w * (e.T.grow || 1);
  if (e.w >= max) return;
  const b = { x: e.x - n / 2, y: e.y - n, w: e.w + n, h: e.h + n, tiny: false };
  const [c0, c1, r0, r1] = [Math.floor(b.x / TILE), Math.floor((b.x + b.w) / TILE), Math.floor(b.y / TILE), Math.floor((b.y + b.h - 1) / TILE)];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (solidSide(g.grid.at(c, r), b)) return;
  Object.assign(e, b);
}

// Flip (kicked): lies on its back (2.png), falls to the floor, scurries off, comes back later.
function flip(e, g, dir) {
  e.state = 'flipped'; e.flipT = flipFrames; e.vy = -360; e.vx = dir * 120; e.dir = dir; e.stun = 0; e.mode = 'idle';
  g.emit('bonk', { x: ecx(e), y: e.y, type: e.type });
  if (e.type === 'stinkbug') stink(e, g);
}
function scatter(e, g, fromX) {
  e.state = 'scurry'; e.scurryT = scurryFrames; e.dir = Math.sign(ecx(e) - fromX) || e.dir; e.stun = 0;
  g.emit('scatter', { x: ecx(e), y: ecy(e), type: e.type });
}
function goneFor(e) { return e.T.gone || goneFrames; }

export function updateEnemies(list, g) {
  const p = g.player;
  for (const e of list) {
    e.t++;
    if (e.state === 'gone') {
      if (--e.goneT <= 0) Object.assign(e, { x: e.home.x, y: e.home.y, w: e.T.w, h: e.T.h, dir: e.home.dir, state: 'walk', mode: 'idle', mt: 0, alpha: 0, vx: 0, vy: 0, rolling: false, wp: 0 });
      continue;
    }
    if (e.alpha < 1) e.alpha = Math.min(1, e.alpha + 0.03);
    if (e.state === 'flipped') {
      e.vx *= 0.92;
      physStep(e, g);
      if (--e.flipT <= 0) { e.state = 'scurry'; e.scurryT = scurryFrames; }
      continue;
    }
    if (e.state === 'scurry') {
      const sp = e.T.fly ? 160 : Math.max(e.T.speed, 60) * 3;
      e.x += e.dir * sp * DT; if (e.T.fly) e.y -= 40 * DT;
      e.alpha = Math.max(0, e.alpha - 1 / scurryFrames);
      if (--e.scurryT <= 0) { e.state = 'gone'; e.goneT = goneFor(e); }
      continue;
    }
    if (e.stun > 0) { e.stun--; if (!e.T.fly && e.mode !== 'drop' && e.type !== 'cellarspider' && !e.path) physStep(e, g); continue; }
    BEHAVIOURS[e.T.behaviour](e, g);
    if (e.alpha <= 0.5) continue;
    // the vacuum's hum: a loud zone that moves with it
    if (e.T.loud && !p.has('earplugs')) {
      const L = e.T.loud * TILE;
      if (!p.hidden && Math.abs(p.cx - ecx(e)) < e.w / 2 + L && Math.abs(p.cy - ecy(e)) < e.h / 2 + L * 0.6 && !overlap(e, p)) p.daze(Math.sign(p.cx - ecx(e)) || 1, g.ctx);
    }
    if (p.hidden) continue;
    // aphids and other springs: landing on top bounces you
    if (e.T.spring && p.vy > 0 && p.state === 'air' && p.x + p.w > e.x + 2 && p.x < e.x + e.w - 2 && p.y + p.h >= e.y - 4 && p.y + p.h <= e.y + 14) {
      p.y = e.y - p.h; p.bounce(e.T.spring, g.ctx); continue;
    }
    // ground-pound splits a dust bunny
    if (e.T.pound === 'split' && p.state === 'pound' && overlap({ x: e.x - 12, y: e.y - 16, w: e.w + 24, h: e.h + 16 }, p)) { scatter(e, g, p.cx); g.emit('split', { x: ecx(e), y: ecy(e) }); continue; } // [fixer] a forgiving pound
    if (!overlap(e, shrink(p, 4))) continue;
    if (e.T.caught === 'checkpoint') { if (p.invuln === 0) g.sendBack(e.type); continue; }
    const front = e.T.frontOnly ? Math.sign(p.cx - ecx(e)) === e.dir : true;
    if (e.T.block || (e.T.frontOnly && !front)) { pushOut(p, e); if (!e.T.damage || !front) continue; }
    if (!e.T.damage || p.invuln > 0) continue;
    const knock = e.T.knock || 1;
    if (p.hurt(e.T.damage, ecx(e), g.ctx)) {
      p.vx *= knock; p.vy *= knock;
      g.emit(e.T.bonkable ? 'enemyHit' : 'bump', { x: p.cx, y: p.cy, type: e.type });
    }
  }
  updateProjectiles(g);
}
function pushOut(p, e) {
  if (p.cx < ecx(e)) p.x = Math.min(p.x, e.x - p.w + 4); else p.x = Math.max(p.x, e.x + e.w - 4);
  if (Math.sign(p.vx) === Math.sign(ecx(e) - p.cx)) p.vx = 0;
}

// Rice grains roll (gravity, die at walls); stink clouds sit and fade. Both hurt on contact.
function updateProjectiles(g) {
  const p = g.player, list = g.projectiles || [];
  for (const q of list) {
    q.life--;
    if (!q.still) {
      const b = { x: q.x, y: q.y, w: q.w, h: q.h, tiny: false };
      q.vy = Math.min(q.vy + 1800 * DT, 900);
      const rx = moveX(g.grid, b, q.vx * DT); const ry = moveY(g.grid, b, q.vy * DT);
      q.x = b.x; q.y = b.y; if (ry.landed) q.vy = 0;
      q.rot = (q.rot || 0) + q.vx * DT / 7;
      if (rx.hit || q.y > g.room.ph + 40) q.life = 0;
    }
    const live = !q.still || (q.max - q.life > 18 && q.life > 12); // clouds hurt once grown, not while fading
    if (live && q.life > 0 && !p.hidden && p.invuln === 0 && overlap(q, shrink(p, 4))) {
      if (p.hurt(q.damage, q.x + q.w / 2, g.ctx)) g.emit('enemyHit', { x: p.cx, y: p.cy, type: q.kind });
      if (!q.still) q.life = 0;
    }
  }
  g.projectiles = list.filter((q) => q.life > 0);
}

export function kickEnemies(list, box, dir, g) {
  for (const e of list) {
    if (e.state !== 'walk' || e.alpha < 0.5 || !overlap(e, box)) continue;
    if (!e.T.bonkable || e.T.kick === 'none') { g.emit('clonk', { x: ecx(e), y: e.y }); continue; }
    if (e.hitBy === g.frame) continue;
    e.hitBy = g.frame;
    const k = e.T.kick;
    if (k === 'rear' && !(dir === e.dir || e.mode === 'recover' || e.stun > 0)) { g.emit('clonk', { x: ecx(e), y: e.y }); continue; }
    if (k === 'stunned' && e.stun <= 0) {
      if (e.type === 'cockroach') startle(e, g, dir); else g.emit('clonk', { x: ecx(e), y: e.y });
      continue;
    }
    if (k === 'push') { e.dir = dir; e.vx = dir * 260; e.vy = -120; g.emit('bonk', { x: ecx(e), y: e.y, type: e.type }); continue; }
    flip(e, g, dir);
  }
}

// Chirp: stun (Chirp stat; Rin x3), or scatter (mites, fruit flies, booklice), or nothing.
export function stunEnemies(list, x, y, radius, frames, g) {
  for (const e of list) {
    if (!e.T.bonkable || e.state !== 'walk' || e.T.chirp === 'none') continue;
    if (Math.hypot(ecx(e) - x, ecy(e) - y) > radius + e.w / 2) continue;
    if (e.T.chirp === 'scatter') { scatter(e, g, x); continue; }
    e.stun = Math.max(e.stun, frames); g.emit('stun', { x: ecx(e), y: e.y });
  }
}
// Glow Bead flash: stuns everything bonkable that isn't flash-proof (the centipede's only weakness).
export function flashEnemies(list, x, y, radius, frames, g) {
  for (const e of list) {
    if (!e.T.bonkable || e.state !== 'walk' || e.T.flash === 'none') continue;
    if (Math.hypot(ecx(e) - x, ecy(e) - y) <= radius + e.w / 2) { e.stun = Math.max(e.stun, frames); g.emit('stun', { x: ecx(e), y: e.y }); }
  }
}

export const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const shrink = (p, n) => ({ x: p.x + n, y: p.y + n, w: p.w - 2 * n, h: p.h - 2 * n });
