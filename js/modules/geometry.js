// Geometry helpers: document-space rects, route builders and segmenting.
// Routes return an array of [x, y] points in document coordinates; the last
// point is where the line touches the next element (the wrap's contact point).

export function docRect(el) {
  const r = el.getBoundingClientRect();
  const l = r.left + window.scrollX;
  const t = r.top + window.scrollY;
  return rect(l, t, r.width, r.height);
}

export function rect(l, t, w, h) {
  return { l, t, w, h, r: l + w, b: t + h, cx: l + w / 2, cy: t + h / 2 };
}

/** Size of one design px (Figma px) at the current viewport. */
export function designPx() {
  return parseFloat(getComputedStyle(document.documentElement).fontSize) / 10;
}

const lerp = (a, b, f) => a + (b - a) * f;

// ── Route builders (all coordinates come from element rects) ───────────
// Fractions (ax, by, …) are positions along an edge, read from the Figma path.

/** Straight down from A's bottom to B's top, at x (default: B's centre). */
export const down = (opts = {}) => (A, B) => {
  const x = opts.x != null ? lerp(B.l, B.r, opts.x) : (opts.ax != null ? lerp(A.l, A.r, opts.ax) : B.cx);
  return [[x, A.b], [x, B.t]];
};

/** Horizontal from A's facing side to B's facing side at a height on A (fy) or B (by). */
export const across = (opts = {}) => (A, B) => {
  const y = opts.by != null ? lerp(B.t, B.b, opts.by) : lerp(A.t, A.b, opts.fy ?? 0.5);
  const toRight = B.cx >= A.cx;
  return toRight ? [[A.r, y], [B.l, y]] : [[A.l, y], [B.r, y]];
};

/** Down from A, across at a mid height, down into B's top edge. */
export const downAcrossDown = (opts = {}) => (A, B, u = 1) => {
  const x1 = lerp(A.l, A.r, opts.ax ?? 0.5);
  const x2 = lerp(B.l, B.r, opts.bx ?? 0.5);
  // midPx: a fixed drop below A in design px (keeps both arms of a fork level)
  const midY = opts.midPx != null ? A.b + opts.midPx * u : lerp(A.b, B.t, opts.mid ?? 0.5);
  return [[x1, A.b], [x1, midY], [x2, midY], [x2, B.t]];
};

/** Down from A's bottom, then across into B's facing side at height `by` on B. */
export const downAcross = (opts = {}) => (A, B) => {
  const x = lerp(A.l, A.r, opts.ax ?? 0.5);
  const y = lerp(B.t, B.b, opts.by ?? 0.5);
  const toRight = B.cx >= x;
  return [[x, A.b], [x, y], [toRight ? B.l : B.r, y]];
};

/** Out of A's right side, a short way right, down to a mid height, across to B, down into B. */
export const outDownAcrossDown = (opts = {}) => (A, B, u) => {
  const y1 = lerp(A.t, A.b, opts.fy ?? 0.5);
  const outX = A.r + (opts.out ?? 40) * u;
  const midY = lerp(A.b, B.t, opts.mid ?? 0.5);
  const x2 = lerp(B.l, B.r, opts.bx ?? 0.5);
  return [[A.r, y1], [outX, y1], [outX, midY], [x2, midY], [x2, B.t]];
};

/** Enter from the top edge of a section straight down into B. */
export const fromSectionTop = (opts = {}) => (S, B) => {
  const x = lerp(B.l, B.r, opts.bx ?? 0.5);
  return [[x, S.t], [x, B.t]];
};

/** Leave A straight down to the bottom edge of a section. */
export const toSectionBottom = (opts = {}) => (A, S) => {
  const x = lerp(A.l, A.r, opts.ax ?? 0.5);
  return [[x, A.b], [x, S.b]];
};

// ── Segmenting ──────────────────────────────────────────────────────────

/** Split a polyline into short pieces of at most `step` px, in travel order. */
export function segmentPolyline(points, step) {
  const pieces = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 0.5) continue;
    const n = Math.max(1, Math.ceil(len / step));
    for (let k = 0; k < n; k++) {
      const a = k / n, b = (k + 1) / n;
      pieces.push([x1 + (x2 - x1) * a, y1 + (y2 - y1) * a, x1 + (x2 - x1) * b, y1 + (y2 - y1) * b]);
    }
  }
  return pieces;
}

/** Weighted travel length: vertical runs count fully, horizontal runs partly,
 *  so the scroll distance a line takes follows how far down the page it goes. */
export function travelLength(points, horizontalWeight = 0.35) {
  let len = 0;
  for (let i = 0; i < points.length - 1; i++) {
    len += Math.abs(points[i + 1][1] - points[i][1]);
    len += Math.abs(points[i + 1][0] - points[i][0]) * horizontalWeight;
  }
  return len;
}

/**
 * Border geometry for a rect: two arms that grow from a contact point in both
 * directions around the perimeter and meet on the far side.
 * Returns steps[k] = array of line pieces drawn at step k (both arms).
 */
export function wrapSteps(R, contact, inset, step) {
  const l = R.l + inset, t = R.t + inset, r = R.r - inset, b = R.b - inset;
  const w = Math.max(0, r - l), h = Math.max(0, b - t);
  const P = 2 * (w + h);
  if (P <= 0) return [];

  // perimeter coordinate, clockwise from top-left
  const at = (s) => {
    s = ((s % P) + P) % P;
    if (s <= w) return [l + s, t];
    if (s <= w + h) return [r, t + (s - w)];
    if (s <= 2 * w + h) return [r - (s - w - h), b];
    return [l, b - (s - 2 * w - h)];
  };
  const corners = [0, w, w + h, 2 * w + h];

  // project the contact point onto the nearest edge
  const [cx, cy] = contact;
  const cand = [
    { s: clamp(cx - l, 0, w), d: Math.abs(cy - t) },
    { s: w + clamp(cy - t, 0, h), d: Math.abs(cx - r) },
    { s: w + h + clamp(r - cx, 0, w), d: Math.abs(cy - b) },
    { s: 2 * w + h + clamp(b - cy, 0, h), d: Math.abs(cx - l) },
  ].sort((a, b2) => a.d - b2.d);
  const s0 = cand[0].s;

  const half = P / 2;
  const n = Math.max(1, Math.ceil(half / step));
  const steps = [];
  for (let k = 0; k < n; k++) {
    const pieces = [];
    for (const dir of [1, -1]) {
      const a = s0 + dir * k * (half / n);
      const c = s0 + dir * (k + 1) * (half / n);
      pieces.push(...arcPieces(a, c, at, corners, P));
    }
    steps.push(pieces);
  }
  return steps;
}

function arcPieces(a, c, at, corners, P) {
  // walk from perimeter coord a to c (either direction), splitting at corners
  const lo = Math.min(a, c), hi = Math.max(a, c);
  const cuts = [lo];
  for (let base = Math.floor(lo / P) * P; base <= hi; base += P) {
    for (const cn of corners) {
      const v = base + cn;
      if (v > lo && v < hi) cuts.push(v);
    }
  }
  cuts.push(hi);
  cuts.sort((x, y) => x - y);
  const out = [];
  for (let i = 0; i < cuts.length - 1; i++) {
    const p = at(cuts[i]), q = at(cuts[i + 1]);
    out.push([p[0], p[1], q[0], q[1]]);
  }
  return out;
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
