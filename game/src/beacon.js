// The beacon: where the trapped cricket's call comes from, and how far away it is along the
// house's rooms. Pure logic (no DOM, no AudioContext), so game.js, the HUD and node tools can
// use it; audio.js turns it into gain / low-pass / reverb / pan.
//
// Target (design "The beacon"): until the zone's item is picked up, the zone's sound hole;
// afterwards the lair. Data, in order of preference:
//   before the item: zone.soundHole {room, x, y} | a `beacon` entity (B marker) without `after` | zone.beacon | the item
//   after the item:  zone.lair {room, x, y}      | a `beacon` entity with `after: true` | the cage | the boss | zone.beacon
//   zones without an item (sandbox, attic) go straight to the lair; a rescued zone has no beacon.
//   Voice: zone.beaconVoice = 'alarm' | ['alarm','knock'] | {hole: [...], lair: [...]};
//          default: the zone cricket's species (chirps.js CRICKET_VOICE).
//   Zone 5 (Laundry): soundHole = the dryer vent by the Glider, beaconVoice = {hole: ['alarm','knock'], lair: ['alarm']},
//          lair = the alarm in Peridot's arena.
// Distance: shortest path over room exits (portal midpoints, from world.exits) and doors, plus the
// straight distance inside the player's and the target's rooms. Gain: 0 dB at the target to
// -24 dB at the zone's far side, never lower.
import { TILE } from '../data/movement.js';
import { ZONE_INFO } from '../data/zones.js';
import { CRICKET_VOICE, individualPitch, pitchOf } from './chirps.js';

export const FLOOR_DB = -24;
// Default temperatures (F) per zone number (design: Kitchen and Laundry warm, Basement cold).
// zone.temp overrides; room def `temp` overrides that: a number, or {left, right} for a
// thermostat-lock gradient across the room (F at the left and right edges).
export const ZONE_TEMP = { 0: 76, 1: 70, 2: 72, 3: 82, 4: 68, 5: 84, 6: 71, 7: 68, 8: 76, 9: 56, 10: 64, 99: 72 };

export function tempAt(room, x = null) {
  const zt = room?.zone?.temp ?? ZONE_INFO[room?.zone?.n]?.temp ?? ZONE_TEMP[room?.zone?.n] ?? 70;
  const t = room?.def?.temp;
  if (typeof t === 'number') return t;
  if (t && typeof t === 'object' && t.left != null && t.right != null) {
    const fx = x == null ? 0.5 : Math.max(0, Math.min(1, x / room.pw));
    return t.left + (t.right - t.left) * fx;
  }
  return zt;
}

/** Zone facts: data/zones.js ZONE_INFO[n] merged with the zone module's own fields. */
export function info(zone) { return { ...(ZONE_INFO[zone?.n] || {}), ...(zone || {}) }; }
function zoneRooms(world, zone) { return Object.values(world.rooms).filter((r) => r.zone === zone); }
function findEnt(world, zone, pred) {
  for (const r of zoneRooms(world, zone)) for (const e of r.entities) if (pred(e)) return { room: r.id, x: e.x, y: e.y, e };
  return null;
}
const asVoices = (v) => (Array.isArray(v) ? v : v ? [v] : []);

/** What the beacon is right now (cached per zone/item/rescue state). */
export function beaconSpec(game) {
  const zone = game.zone, world = game.world;
  if (!zone || !world) return null;
  const zi = info(zone);
  const cage = findEnt(world, zone, (e) => e.type === 'cage');
  const cricket = zi.cricket || cage?.e.cricket || null;
  const item = zi.item || null;
  const hasItem = item ? game.player.has(item) : true;
  const freed = cricket ? game.rescued.has(cricket) : false;
  const key = `${zone.id}|${hasItem}|${freed}`;
  game._beaconCache ||= {};
  if (key in game._beaconCache) return game._beaconCache[key];
  let spec = null;
  if (!freed) {
    let t = null, phase;
    if (!hasItem) {
      phase = 'hole';
      t = zi.soundHole || findEnt(world, zone, (e) => e.type === 'beacon' && !e.after) || zi.beacon || findEnt(world, zone, (e) => e.type === 'item' && e.item === item);
    }
    if (!t) {
      phase = 'lair';
      t = zi.lair || findEnt(world, zone, (e) => e.type === 'beacon' && e.after) || cage || findEnt(world, zone, (e) => e.type === 'boss') || zi.beacon;
    }
    const room = t && world.rooms[t.room];
    if (room) {
      const bv = zi.beaconVoice;
      let voices = bv && !Array.isArray(bv) && typeof bv === 'object' ? asVoices(bv[phase]) : asVoices(bv);
      if (!voices.length) voices = [CRICKET_VOICE[cricket] || 'house'];
      const px = (t.x + 0.5) * TILE, py = (t.y + 0.5) * TILE;
      spec = {
        zone: zone.id, phase, cricket, voices, voice: voices[0],
        pitch: cricket ? individualPitch(cricket) : 1,
        target: { room: room.id, x: px, y: py, tx: t.x, ty: t.y, wx: room.wx + px, wy: room.wy + py },
        temp: tempAt(room, px),
      };
      spec.hz = pitchOf(spec.voice, { pitch: spec.pitch });
    }
  }
  game._beaconCache[key] = spec;
  return spec;
}

// ---- the portal graph (cached on the world) ----
function graph(world) {
  if (world._portalGraph) return world._portalGraph;
  const nodes = [], byRoom = {};
  const add = (wx, wy, rooms) => { const i = nodes.length; nodes.push({ wx, wy, rooms }); for (const r of rooms) (byRoom[r] ||= []).push(i); return i; };
  const links = [];
  for (const room of Object.values(world.rooms)) {
    for (const ex of world.exits(room)) {
      const mid = ((ex.start + ex.end + 1) / 2) * TILE;
      const p = ex.side === 'left' ? [room.wx, room.wy + mid] : ex.side === 'right' ? [room.wx + room.pw, room.wy + mid]
        : ex.side === 'top' ? [room.wx + mid, room.wy] : [room.wx + mid, room.wy + room.ph];
      add(p[0], p[1], [room.id, ex.to]);
    }
    for (const e of room.entities) if (e.type === 'door' && world.rooms[e.to]) {
      const to = world.rooms[e.to];
      const a = add(room.wx + (e.x + 0.5) * TILE, room.wy + (e.y + 0.5) * TILE, [room.id]);
      const at = e.at || [2, to.th - 3];
      const b = add(to.wx + (at[0] + 0.5) * TILE, to.wy + (at[1] + 0.5) * TILE, [to.id]);
      links.push([a, b]);
    }
  }
  // adjacency: every pair of nodes sharing a room (straight distance), plus door links (0)
  const adj = nodes.map(() => []);
  for (const ids of Object.values(byRoom)) for (const a of ids) for (const b of ids) if (a !== b) adj[a].push([b, Math.hypot(nodes[a].wx - nodes[b].wx, nodes[a].wy - nodes[b].wy)]);
  for (const [a, b] of links) { adj[a].push([b, 0]); adj[b].push([a, 0]); }
  world._portalGraph = { nodes, byRoom, adj };
  return world._portalGraph;
}

// Dijkstra from the target to every portal node; plus the zone's far-side distance.
function field(world, spec) {
  const key = `${spec.target.room}@${spec.target.wx},${spec.target.wy}`;
  world._beaconFields ||= {};
  if (world._beaconFields[key]) return world._beaconFields[key];
  const { nodes, byRoom, adj } = graph(world);
  const dist = new Float64Array(nodes.length).fill(Infinity), done = new Uint8Array(nodes.length);
  for (const i of byRoom[spec.target.room] || []) dist[i] = Math.hypot(nodes[i].wx - spec.target.wx, nodes[i].wy - spec.target.wy);
  for (;;) {
    let u = -1, best = Infinity;
    for (let i = 0; i < nodes.length; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }
    if (u < 0) break;
    done[u] = 1;
    for (const [v, w] of adj[u]) if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
  }
  const f = { dist, maxDist: 1 };
  // far side: the farthest corner of any room in the target's zone
  const tz = world.rooms[spec.target.room].zone;
  for (const r of Object.values(world.rooms)) {
    if (r.zone !== tz) continue;
    for (const [cx, cy] of [[0, 0], [r.pw, 0], [0, r.ph], [r.pw, r.ph]]) {
      const d = pathFrom(world, f, spec, r, cx, cy).d;
      if (Number.isFinite(d)) f.maxDist = Math.max(f.maxDist, d);
    }
  }
  world._beaconFields[key] = f;
  return f;
}
function pathFrom(world, f, spec, room, x, y) {
  const wx = room.wx + x, wy = room.wy + y;
  if (room.id === spec.target.room) return { d: Math.hypot(spec.target.wx - wx, spec.target.wy - wy), via: null };
  const { nodes, byRoom } = graph(world);
  let d = Infinity, via = null;
  for (const i of byRoom[room.id] || []) {
    const c = Math.hypot(nodes[i].wx - wx, nodes[i].wy - wy) + f.dist[i];
    if (c < d) { d = c; via = nodes[i]; }
  }
  return { d, via };
}

/**
 * Measure the beacon from the player: path distance, gain (dB), and the next waypoint
 * (the exit on the path, or the target itself) in the current room's coordinates.
 */
export function measure(game, spec = beaconSpec(game)) {
  if (!spec || !game.room) return null;
  const world = game.world, room = game.room, p = game.player;
  const f = field(world, spec);
  const { d, via } = pathFrom(world, f, spec, room, p.cx, p.cy);
  const reach = Number.isFinite(d);
  const frac = reach ? Math.max(0, Math.min(1, d / f.maxDist)) : 1;
  const wp = via ? { x: via.wx - room.wx, y: via.wy - room.wy } : { x: spec.target.wx - room.wx, y: spec.target.wy - room.wy };
  return { pathDist: reach ? Math.round(d) : null, maxDist: Math.round(f.maxDist), frac, gainDb: FLOOR_DB * frac, waypoint: wp, sameRoom: !via && reach };
}

/** The Listen arrow's target in the current room's coordinates (game.beaconTarget delegates here). */
export function targetInRoom(game) {
  const spec = beaconSpec(game);
  if (!spec || !game.room) return null;
  const m = measure(game, spec);
  return { x: spec.target.wx - game.room.wx, y: spec.target.wy - game.room.wy, room: spec.target.room, via: m?.waypoint || null };
}

// [fixer] Listen range: the Crumb Shop's big ears (player.listenRange, +0.5 each) and Pip's perk
// (listen2: twice as far) make a listening cricket hear the beacon as if it were that much nearer.
export function listenReach(p) { return (p?.listenRange || 1) * (p?.stats?.perk === 'listen2' ? 2 : 1); }
/** The beacon's gain (dB) while listening: the distance fraction shrinks by listenReach, plus `boost`. */
export function listenGainDb(m, p, boost) { return FLOOR_DB * Math.min(1, m.frac / listenReach(p)) + boost; }
