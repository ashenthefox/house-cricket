// [builder A] A tiny tile painter for the zone-00..03 room grids. Rooms are still plain data
// (an array of 32xN-character strings) once built: this only saves hand-counting columns.
//   const g = grid(2, 1);            // 2 screens wide, 1 tall, all '#'
//   g.clear(1, 1, 62, 15)            // carve air
//   g.box(10, 12, 3, 4, 'G')         // a block of any tile char
//   g.row(20, 12, 5, '=')            // a 1-tall run
//   g.put(4, 15, 'S')                // one char (markers: P S k H h m B)
//   g.rows()                         // -> ['####...', ...]
export function grid(sw, sh, fill = '#') {
  const w = sw * 32, h = sh * 18;
  const a = Array.from({ length: h }, () => Array(w).fill(fill));
  const g = {
    w, h,
    box(x, y, bw, bh, ch) {
      for (let yy = y; yy < y + bh; yy++) for (let xx = x; xx < x + bw; xx++) if (yy >= 0 && yy < h && xx >= 0 && xx < w) a[yy][xx] = ch;
      return g;
    },
    clear(x, y, bw, bh) { return g.box(x, y, bw, bh, '.'); },
    row(x, y, n, ch) { return g.box(x, y, n, 1, ch); },
    col(x, y, n, ch) { return g.box(x, y, 1, n, ch); },
    put(x, y, ch) { return g.box(x, y, 1, 1, ch); },
    at(x, y) { return a[y]?.[x]; },
    rows() { return a.map((r) => r.join('')); },
  };
  return g;
}
