// Builder B's little room kit (zones 4, 5, 6): grids are drawn with rectangles instead of
// hand-typed strings so the 32x18 screen sizes and the exact link spans can't drift.
//   const g = grid(2, 1);            // 2x1 screens = 64x18 tiles, all empty
//   g.r(0, 16, 64, 2);               // fill a box with '#' (or any tile char)
//   g.r(0, 12, 1, 4, '.');           // open a doorway
//   g.rows()                         // the room's grid strings
// Plain data at import time: the game, check-world and the tools see ordinary grid strings.
export function grid(sw, sh) {
  const w = 32 * sw, h = 18 * sh;
  const g = Array.from({ length: h }, () => Array(w).fill('.'));
  return {
    w, h, g,
    // fill a box with a tile (clipped to the room)
    r(x, y, ww, hh, ch = '#') {
      for (let j = y; j < y + hh; j++) for (let i = x; i < x + ww; i++) if (j >= 0 && j < h && i >= 0 && i < w) g[j][i] = ch;
      return this;
    },
    // the outer walls (a frame of `ch`), thickness t
    frame(ch = '#', t = 1) { this.r(0, 0, w, t, ch); this.r(0, h - t, w, t, ch); this.r(0, 0, t, h, ch); this.r(w - t, 0, t, h, ch); return this; },
    at(x, y) { return g[y]?.[x]; },
    rows() { return g.map((row) => row.join('')); },
  };
}
