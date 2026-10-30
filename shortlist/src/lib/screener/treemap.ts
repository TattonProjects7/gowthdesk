// Squarified treemap layout (Bruls, Huizing & van Wijk): lays out weighted
// items as rectangles that fill a box, keeping each as close to square as
// possible, so small companies stay readable next to giants.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Placed<T> {
  item: T;
  rect: Rect;
}

function worst(row: number[], side: number): number {
  const s = row.reduce((a, b) => a + b, 0);
  const max = Math.max(...row);
  const min = Math.min(...row);
  const s2 = s * s;
  const w2 = side * side;
  return Math.max((w2 * max) / s2, s2 / (w2 * min));
}

export function squarify<T>(items: { value: number; item: T }[], box: Rect): Placed<T>[] {
  const valid = items.filter((i) => i.value > 0 && Number.isFinite(i.value)).sort((a, b) => b.value - a.value);
  const total = valid.reduce((a, b) => a + b.value, 0);
  if (!valid.length || box.w <= 0 || box.h <= 0 || total <= 0) return [];
  const scale = (box.w * box.h) / total;
  const areas = valid.map((v) => v.value * scale);

  const out: Placed<T>[] = [];
  let rect = { ...box };
  let i = 0;
  while (i < areas.length) {
    const side = Math.min(rect.w, rect.h);
    const row: number[] = [areas[i]];
    let j = i + 1;
    while (j < areas.length && worst([...row, areas[j]], side) <= worst(row, side)) {
      row.push(areas[j]);
      j++;
    }
    // Lay the row along the shorter side of what's left.
    const sum = row.reduce((a, b) => a + b, 0);
    if (rect.w >= rect.h) {
      const w = sum / rect.h;
      let y = rect.y;
      for (let k = 0; k < row.length; k++) {
        const h = row[k] / w;
        out.push({ item: valid[i + k].item, rect: { x: rect.x, y, w, h } });
        y += h;
      }
      rect = { x: rect.x + w, y: rect.y, w: rect.w - w, h: rect.h };
    } else {
      const h = sum / rect.w;
      let x = rect.x;
      for (let k = 0; k < row.length; k++) {
        const w = row[k] / h;
        out.push({ item: valid[i + k].item, rect: { x, y: rect.y, w, h } });
        x += w;
      }
      rect = { x: rect.x, y: rect.y + h, w: rect.w, h: rect.h - h };
    }
    i = j;
  }
  return out;
}

/** Diverging colour for a value: red below zero, green above, dark at zero. `span` is the value of full colour. */
export function heatColor(v: number | null | undefined, span: number, invert = false): string {
  if (v == null || !Number.isFinite(v)) return "rgb(42,46,62)";
  let t = Math.max(-1, Math.min(1, v / span));
  if (invert) t = -t;
  // Neutral #2a2e3e → green #10b981 / red #e11d48, eased so small moves still show.
  const e = Math.sign(t) * Math.pow(Math.abs(t), 0.75);
  const base = [42, 46, 62];
  const to = e >= 0 ? [16, 185, 129] : [225, 29, 72];
  const k = Math.abs(e);
  const c = base.map((b, n) => Math.round(b + (to[n] - b) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
