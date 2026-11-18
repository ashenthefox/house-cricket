// [playtest] Movement helpers for authoring (copied from zones-a.mjs, which runs its zones on import).
export const R = 'ArrowRight', L = 'ArrowLeft', U = 'ArrowUp', D = 'ArrowDown', J = 'KeyZ', KICK = 'KeyX', CHIRP = 'KeyC', USE = 'KeyV';
export const T = 40;
export const ground = (g) => g.player.state === 'ground';
// walk to a column (tile units, centre) and stop there
export function walkTo(a, x, label = `col ${x}`, max = 900) {
  const p = a.p;
  if (p.cx < x * T) a.down(R).until((g) => g.player.cx >= x * T - 6, max, label).up(R);
  else a.down(L).until((g) => g.player.cx <= x * T + 6, max, label).up(L);
  return a.wait(3);
}
// a full jump toward a direction, held for n frames
export function hop(a, dir, n = 16) { a.down(dir).tap(J, n); return a; }


// Jump onto a platform: run toward column x, jump (held), steer, land standing on row `row`
// (the tile the feet rest on). Fails loudly if it doesn't land there.
export function jumpTo(a, x, row, o = {}) {
  const g = a.g, p = () => g.player;
  const tx = x * T;
  const dir0 = Math.sign(tx - p().cx);
  const key = dir0 > 0 ? R : L;
  if (o.run && dir0) { a.down(key); for (let i = 0; i < 40 && Math.abs(tx - p().cx) > o.run * T; i++) a.wait(1); }
  a.down(J);
  let held = true, dirHeld = !!dir0;
  if (dir0 && !o.run) a.down(key);
  const up = Math.round((p().y + p().h) / T) - row;
  if (o.delay == null && up >= 2 && Math.abs(tx - p().cx) > 0.8 * T) o = { ...o, delay: 9 };
  if (o.delay) { if (dirHeld) { a.up(key); dirHeld = false; } a.wait(o.delay); if (dir0) { a.down(key); dirHeld = true; } }
  let f = 0;
  for (; f < (o.max || 120); f++) {
    a.wait(1);
    const pl = p();
    if (held && f > (o.hold ?? 18)) { a.up(J); held = false; }
    const d = tx - pl.cx;
    if (dirHeld && Math.sign(d) !== dir0) { a.up(key); dirHeld = false; }
    if (!dirHeld && Math.abs(d) > 10 && f > 3 && pl.state === 'air' && !o.noSteer) { const k2 = d > 0 ? R : L; a.down(k2); a.wait(1); a.up(k2); }
    if (f > 4 && pl.state === 'ground') break;
  }
  if (held) a.up(J);
  if (dirHeld) a.up(key);
  a.wait(2);
  const feetRow = Math.round((p().y + p().h) / T);
  if (feetRow !== row) throw new Error(`jumpTo(${x}, ${row}): landed on row ${feetRow} at ${JSON.stringify(a.state())}`);
  return a;
}
// Autopilot along a floor: hold a direction; kick bugs that come close in front; hop when
// blocked by a step. Stops when cond(g) is true.
export function travel(a, dir, cond, max = 1500, label = 'travel') {
  const key = dir > 0 ? R : L;
  a.down(key);
  let stuck = 0, jumping = 0;
  for (let f = 0; f < max; f++) {
    if (cond(a.g)) { a.up(key); if (jumping) a.up(J); return a.wait(2); }
    const p = a.p;
    const foe = (a.g.enemies || []).find((e) => !['flipped', 'scurry', 'gone'].includes(e.state) && !e.stun && Math.abs(e.y + (e.h || 20) / 2 - p.cy) < 30 && (e.x + (e.w || 30) / 2 - p.cx) * dir > 0 && Math.abs(e.x + (e.w || 30) / 2 - p.cx) < 62);
    if (foe && p.kickT === 0 && p.grounded) { a.tap(KICK, 2); continue; }
    if (jumping) { jumping--; if (jumping === 0) a.up(J); }
    if (p.grounded && Math.abs(p.vx) < 20) stuck++; else stuck = 0;
    if (stuck > 3 && !jumping) { a.down(J); jumping = 18; stuck = 0; }
    a.wait(1);
  }
  throw new Error(`${label}: timed out at ${JSON.stringify(a.state())}`);
}
// Wall-jump up a shaft: cling to the wall on side `first` (-1 left / 1 right), then kick back and
// forth until cond(g).
export function wallClimb(a, first, cond, max = 30, exit = 0) {
  let d = first;
  const k = (x) => (x > 0 ? R : L);
  a.down(k(d)).down(J).wait(10).up(J);
  for (let i = 0; i < max; i++) {
    a.until((g) => g.player.state === 'cling' || cond(g) || g.player.state === 'ground', 90, `cling ${i}`);
    if (cond(a.g)) { a.up(k(d)); if (exit) { a.down(k(exit)); a.until((g) => g.player.state === 'ground', 90, 'off the wall'); a.up(k(exit)); } return a.wait(2); }
    if (a.p.state === 'ground') { a.down(J).wait(10).up(J); continue; }
    a.up(k(d)); d = -d; a.down(J).wait(2).down(k(d)).wait(10).up(J);
  }
  a.up(k(d));
  if (!cond(a.g)) throw new Error(`wallClimb: ${JSON.stringify(a.state())}`);
  return a;
}

// drop down through one-way platforms (Down + Jump) until cond
export function dropDown(a, cond, max = 20) {
  for (let i = 0; i < max && !cond(a.g); i++) { a.until((g) => g.player.state === 'ground' || cond(g), 120, 'drop'); if (cond(a.g)) break; a.down(D).tap(J, 3).up(D).wait(12); }
  return a;
}

// a ladder of platforms: [[x, row], ...]
export function climb(a, steps, o = {}) {
  for (const [x, row, oo] of steps) { if (oo?.from != null) walkTo(a, oo.from); jumpTo(a, x, row, { ...o, ...(oo || {}) }); } return a; }
