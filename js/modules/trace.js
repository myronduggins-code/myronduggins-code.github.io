// The travelling line and the border wrap.
//
// Dark sections: a lavender line runs from one key element to the next. When
// it touches an element, a border grows around it from the contact point in
// both directions, thickening from 1px to 5px. Once the wrap is complete the
// line that arrived retracts into it, a new line sets off for the next
// element, and the border it left unwraps the same way it appeared, gone by
// the time the next border is complete.
//
// Light sections (and every section on phones): no travelling line; each
// key element's border wraps by itself, still tied to scroll position.
//
// Performance: everything is drawn with short <line> segments whose
// visibility is toggled (no dash arrays, no masks), and only segments whose
// state changed since the last frame are touched. One ScrollTrigger drives
// the whole page.

import {
  docRect, rect, designPx, segmentPolyline, wrapSteps, clamp,
} from './geometry.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const PATH_STEP = 10;      // px per path segment
const WRAP_STEP = 8;       // px per border step (per arm)
const HEAD = 0.75;         // the line's head sits at 75% of the viewport
const DRAW_PORTION = 0.78; // share of the wrap spent drawing; the rest thickens to 5px

const mqMobile = window.matchMedia('(max-width: 767.98px)');
const mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');

export function initTrace(config) {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const page = document.querySelector('.page');

  const svg = document.createElementNS(SVGNS, 'svg');
  svg.classList.add('trace');
  svg.setAttribute('aria-hidden', 'true');
  page.appendChild(svg);

  let model = null;
  let target = 0, current = 0;
  let intro = { from: 0, to: -Infinity, p: 1 };
  let introTween = null;

  const css = getComputedStyle(document.documentElement);
  const colour = (name) => css.getPropertyValue(name).trim() || name;

  // ── build ─────────────────────────────────────────────────────────────
  function build() {
    svg.replaceChildren();
    svg.style.height = '0px';
    const H =Math.max(document.documentElement.scrollHeight, page.offsetHeight);
    const W = page.offsetWidth;
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.style.height = `${H}px`;

    const vh = window.innerHeight;
    const u = designPx();
    const mobile = mqMobile.matches;
    const W_SCROLL = Math.max(0.14 * vh, 110); // scroll distance for one wrap
    const pageLeft = page.getBoundingClientRect().left + window.scrollX;

    const pathLayer = el('g', { class: 'path-layer' });
    const wrapLayer = el('g', { class: 'wrap-layer' });
    svg.append(pathLayer, wrapLayer);

    const stops = new Map();
    const connectors = [];
    const squares = [];

    const toLocal = (R) => rect(R.l - pageLeft, R.t, R.w, R.h);
    const rectOf = (sel) => {
      const node = typeof sel === 'string' ? document.querySelector(sel) : sel;
      if (!node) { console.warn('[trace] missing element', sel); return null; }
      return { node, R: toLocal(docRect(node)) };
    };

    function getStop(node, R, strokeColour) {
      if (stops.has(node)) return stops.get(node);
      const g = el('g', { stroke: strokeColour, 'stroke-width': 1, 'stroke-linecap': 'square' });
      if (node.id) g.setAttribute('data-for', node.id);
      wrapLayer.appendChild(g);
      const st = {
        node, R, g, colour: strokeColour,
        wrap: null, unwrap: null, steps: null, contact: null,
        shown: 0, width: -1,
        // elements marked data-wrap-reveal fade in as their border forms
        fade: node.hasAttribute('data-wrap-reveal') ? [...node.children] : null,
        fadeLast: -1,
      };
      stops.set(node, st);
      return st;
    }

    function finishStop(st) {
      const contact = st.contact || [st.R.cx, st.R.t];
      const steps = wrapSteps(st.R, contact, 2.5, WRAP_STEP);
      st.steps = steps.map((pieces) => pieces.map(([x1, y1, x2, y2]) => {
        const ln = el('line', { x1, y1, x2, y2, visibility: 'hidden' });
        st.g.appendChild(ln);
        return ln;
      }));
    }

    function makeConnector(points, strokeColour) {
      const g = el('g', { stroke: strokeColour, 'stroke-width': 2, 'stroke-linecap': 'square' });
      pathLayer.appendChild(g);
      const lines = segmentPolyline(points, PATH_STEP).map(([x1, y1, x2, y2]) => {
        const ln = el('line', { x1, y1, x2, y2, visibility: 'hidden' });
        g.appendChild(ln);
        return ln;
      });
      const c = { lines, draw: null, retract: null, head: 0, tail: 0 };
      connectors.push(c);
      return c;
    }

    const lightColour = colour('--stroke-light');
    const selfStop = (node) => {
      const info = rectOf(node);
      if (!info) return;
      const isLight = !!info.node.closest('.sec--light');
      const st = getStop(info.node, info.R, isLight ? lightColour : colour('--accent'));
      if (!st.wrap) {
        let s0 = info.R.t - 0.8 * vh;
        let len = Math.max(0.3 * vh, 180);
        // Pages without a load intro: anything already on screen wraps over the
        // first stretch of scroll instead, higher elements a little sooner.
        if (config.intro === false && s0 < 2) {
          s0 = 2 + Math.max(0, info.R.t) * 0.04;
          len = Math.max(0.13 * vh, 100);
        }
        st.wrap = [s0, s0 + len];
      }
    };

    // ── chains (desktop only) ───────────────────────────────────────────
    if (!mobile) {
      for (const chain of config.chains || []) {
        const lineColour = colour(chain.colour || '--accent');
        let prevRect = null;
        let prevStops = [];
        let prevIncoming = [];
        let prevEnd = -Infinity;
        let floor = -Infinity; // nothing may start before this (the start square)
        let opening = false;   // the first line + wrap after a start square run fast

        // start node
        const s = chain.start;
        if (s.stop) {
          const info = rectOf(s.stop);
          if (!info) continue;
          const st = getStop(info.node, info.R, lineColour);
          const w0 = info.R.t - 0.8 * vh;
          st.wrap = [w0, w0 + W_SCROLL];
          prevEnd = st.wrap[1];
          prevRect = info.R;
          prevStops = [st];
        } else if (s.square) {
          const info = rectOf(s.square);
          if (!info) continue;
          prevRect = info.R;
          // the start square appears on the first bit of scroll, then the line leaves it
          // the square appears within the first few px of scroll
          const a = s.appear || [2, 2 + 0.02 * vh];
          const sq = { node: info.node, range: [a[0], a[1]], last: -1 };
          squares.push(sq);
          prevEnd = sq.range[1];
          floor = sq.range[1];
          opening = true;
        } else if (s.sectionTop) {
          const info = rectOf(s.sectionTop);
          if (!info) continue;
          prevRect = info.R;
        }

        for (const link of chain.links) {
          const targets = [].concat(link.to);
          const routes = [].concat(link.route);
          const infos = targets.map((t) => (link.toSectionBottom ? null : rectOf(t)));
          if (infos.some((i) => i === null) && !link.toSectionBottom) break;

          let pointsList;
          if (link.toSectionBottom) {
            const sec = rectOf(link.toSectionBottom);
            if (!sec) break;
            pointsList = [routes[0](prevRect, sec.R, u)];
          } else {
            pointsList = infos.map((info, i) => routes[i] (prevRect, info.R, u));
          }

          const firstY = Math.min(...pointsList.map((p) => p[0][1]));
          // The line sets off once the previous wrap is done and its start is on
          // screen, and arrives as its contact point reaches the head line (75%).
          // If it is running late it catches up with a short draw.
          const lastY = Math.max(...pointsList.map((p) => p[p.length - 1][1]));
          // Timing is locked to the page: the line always reaches an element
          // when that element reaches the head line, however fast you scroll.
          // If the previous wrap would still be running then, it is shortened
          // so the sequence never falls behind the scroll position.
          const arrive = lastY - HEAD * vh;
          const MIN_D = 0.07 * vh;
          // ...but every wrap still gets a minimum moment on screen, so
          // neighbours side by side (same height) each visibly wrap in turn.
          const W_MIN = 0.09 * vh;
          const prevWrapStart = Math.max(-Infinity, ...prevStops.map((ps) => (ps.wrap ? ps.wrap[0] : -Infinity)));
          const latestStart = Math.max(arrive - MIN_D, floor, prevWrapStart + W_MIN);
          floor = -Infinity;
          if (prevEnd > latestStart) {
            for (const ps of prevStops) {
              if (ps.wrap) ps.wrap[1] = Math.max(ps.wrap[0] + 1, latestStart);
            }
            prevEnd = Math.min(prevEnd, Math.max(latestStart, ...prevStops.map((ps) => (ps.wrap ? ps.wrap[1] : -Infinity))));
          }
          let t0 = Math.max(prevEnd, Math.min(firstY - HEAD * vh, latestStart));
          let D = Math.max(MIN_D, arrive - t0);
          // Opening move (square → first element): everything here is already
          // on screen, so draw and wrap over a short stretch of scroll so the
          // border is complete while the element is still in full view.
          let wrapLen = W_SCROLL;
          if (opening) {
            t0 = prevEnd;
            D = 0.035 * vh;
            wrapLen = 0.065 * vh;
            opening = false;
          }

          const conns = pointsList.map((pts) => {
            const c = makeConnector(pts, lineColour);
            c.draw = [t0, t0 + D];
            return c;
          });
          for (const pc of prevIncoming) pc.retract = [t0, t0 + Math.min(D, 0.15 * vh)];
          for (const ps of prevStops) ps.unwrap = [t0, t0 + D + (link.toSectionBottom || link.pass ? 0 : W_SCROLL)];

          if (link.toSectionBottom) { prevStops = []; prevIncoming = []; break; }

          // a pass-through point (e.g. a pill button): the line touches it and
          // carries on without wrapping it
          if (link.pass) {
            prevStops = [];
            prevIncoming = conns;
            prevEnd = t0 + D;
            prevRect = infos[infos.length - 1].R;
            continue;
          }

          prevStops = infos.map((info, i) => {
            const st = getStop(info.node, info.R, lineColour);
            const pts = pointsList[i];
            st.contact = pts[pts.length - 1];
            st.wrap = [t0 + D, t0 + D + wrapLen];
            return st;
          });
          prevIncoming = conns;
          prevEnd = t0 + D + wrapLen;
          prevRect = infos[infos.length - 1].R;
        }
      }
    }

    // ── self-drawing stops (light sections; every chain stop on phones) ──
    const selfList = [...(config.selfStops || [])];
    if (mobile) for (const chain of config.chains || []) selfList.push(...chainStops(chain));
    for (const sel of selfList) {
      document.querySelectorAll(sel).forEach((n) => {
        if (!stops.has(n)) selfStop(n);
      });
    }

    for (const st of stops.values()) finishStop(st);

    // ── fit: everything must finish by the bottom of the page ───────────
    const ranges = [];
    connectors.forEach((c) => { ranges.push(c.draw, c.retract); });
    stops.forEach((st) => { ranges.push(st.wrap, st.unwrap); });
    squares.forEach((sq) => ranges.push(sq.range));
    const maxScroll = Math.max(1, H - vh - 24);
    const lastEnd = Math.max(0, ...ranges.filter(Boolean).map((r) => r[1]));
    if (lastEnd > maxScroll) {
      const k = maxScroll / lastEnd;
      for (const r of ranges) if (r) { r[0] = r[0] > 0 ? r[0] * k : r[0]; r[1] = r[1] > 0 ? r[1] * k : r[1]; }
    }

    // Pages that opt out of the load intro (config.intro === false) start
    // with nothing drawn: anything above the fold waits for the first scroll.
    if (config.intro === false) {
      const FIRST = 2;
      for (const r of ranges) if (r && r[0] < FIRST) { const d = r[1] - r[0]; r[0] = FIRST; r[1] = FIRST + Math.max(d, 1); }
    }

    // ── intro: anything that starts above the fold plays on load ─────────
    let minStart = Infinity, introEnd = -Infinity;
    const consider = (range) => {
      if (!range) return;
      minStart = Math.min(minStart, range[0]);
      if (range[0] < 0.02 * vh) introEnd = Math.max(introEnd, range[1]);
    };
    connectors.forEach((c) => { consider(c.draw); });
    stops.forEach((st) => { consider(st.wrap); });

    if (config.intro === false) introEnd = -Infinity;
    return { stops: [...stops.values()], connectors, squares, minStart, introEnd };
  }

  function chainStops(chain) {
    const out = [];
    if (chain.start.stop) out.push(chain.start.stop);
    for (const link of chain.links) if (link.to && !link.pass) out.push(...[].concat(link.to));
    return out;
  }

  // ── render ────────────────────────────────────────────────────────────
  const prog = (range, s) => (range ? clamp((s - range[0]) / Math.max(1, range[1] - range[0]), 0, 1) : 0);

  function render(s) {
    if (!model) return;
    const full = mqReduced.matches;

    for (const c of model.connectors) {
      const n = c.lines.length;
      const head = full ? n : Math.round(prog(c.draw, s) * n);
      const tail = full ? 0 : Math.round(prog(c.retract, s) * n);
      if (head === c.head && tail === c.tail) continue;
      // touch only the indices whose visibility changed
      const lo = Math.min(c.tail, tail, c.head, head);
      const hi = Math.max(c.tail, tail, c.head, head);
      for (let i = lo; i < hi && i < n; i++) {
        const was = i >= c.tail && i < c.head;
        const now = i >= tail && i < head;
        if (was !== now) c.lines[i].setAttribute('visibility', now ? 'visible' : 'hidden');
      }
      c.head = head; c.tail = tail;
    }

    for (const st of model.stops) {
      const n = st.steps.length;
      let amount;
      if (full) amount = 1;
      else amount = Math.min(prog(st.wrap, s), st.unwrap ? 1 - prog(st.unwrap, s) : 1);
      const shown = full ? n : Math.ceil(clamp(amount / DRAW_PORTION, 0, 1) * n);
      const width = full ? 1 : Math.round((1 + 4 * amount) * 4) / 4;
      if (shown !== st.shown) {
        const lo = Math.min(shown, st.shown), hi = Math.max(shown, st.shown);
        for (let k = lo; k < hi; k++) {
          const vis = k < shown ? 'visible' : 'hidden';
          for (const ln of st.steps[k]) ln.setAttribute('visibility', vis);
        }
        st.shown = shown;
      }
      if (width !== st.width) {
        st.g.setAttribute('stroke-width', width);
        st.width = width;
      }
      if (st.fade) {
        const o = full ? 1 : Math.round(clamp(prog(st.wrap, s) / DRAW_PORTION, 0, 1) * 100) / 100;
        if (o !== st.fadeLast) {
          for (const n of st.fade) n.style.opacity = o;
          st.fadeLast = o;
        }
      }
    }

    for (const sq of model.squares) {
      const p = full ? 1 : Math.round(prog(sq.range, s) * 100) / 100;
      if (p === sq.last) continue;
      sq.node.style.opacity = p;
      sq.node.style.transform = `scale(${0.4 + 0.6 * p})`;
      sq.last = p;
    }
  }

  // ── scroll + smoothing ────────────────────────────────────────────────
  const effective = (scrollY) => {
    if (intro.p < 1) return Math.max(scrollY, intro.from + (intro.to - intro.from) * intro.p);
    return Math.max(scrollY, intro.to);
  };

  function tick() {
    // read the live scroll position: ScrollTrigger.refresh() briefly scrolls
    // to the top while measuring, which would otherwise leave a stale target
    target = window.scrollY;
    const goal = effective(target);
    if (Math.abs(goal - current) < 0.5) {
      if (current !== goal) { current = goal; render(current); }
      return;
    }
    // light smoothing, but never more than a fifth of a screen behind
    const maxLag = 0.1 * window.innerHeight;
    if (goal - current > maxLag) current = goal - maxLag;
    else if (current - goal > maxLag) current = goal + maxLag;
    current += (goal - current) * (mqReduced.matches ? 1 : 0.7);
    render(current);
  }

  function rebuild() {
    model = build();
    target = window.scrollY;
    if (mqReduced.matches) { intro = { from: 0, to: -Infinity, p: 1 }; }
    current = effective(target);
    render(current);
  }

  function startIntro(delay = 0) {
    if (!model || mqReduced.matches || !(model.introEnd > -Infinity)) return;
    intro = { from: model.minStart - 1, to: model.introEnd, p: 0 };
    current = effective(window.scrollY);
    render(current);
    introTween = gsap.to(intro, { p: 1, duration: 1.6, delay, ease: 'power1.inOut' });
  }

  rebuild();

  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: () => { target = window.scrollY; },
  });
  gsap.ticker.add(tick);

  // Rebuild on resize and when the page height changes (fonts, images).
  let raf = 0;
  const schedule = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      clearTimeout(schedule.t);
      schedule.t = setTimeout(() => {
        const keepIntro = intro.p;
        model = build();
        if (introTween && keepIntro < 1 && model.introEnd > -Infinity) {
          intro.from = model.minStart - 1; intro.to = model.introEnd;
        } else if (model.introEnd > -Infinity && intro.to > -Infinity) {
          intro.to = model.introEnd;
        }
        target = window.scrollY;
        current = effective(target);
        for (const c of model.connectors) { c.head = 0; c.tail = 0; }
        render(current);
        ScrollTrigger.refresh();
      }, 120);
    });
  };
  window.addEventListener('resize', schedule);
  new ResizeObserver(schedule).observe(page);
  mqMobile.addEventListener('change', schedule);
  mqReduced.addEventListener('change', schedule);

  return { rebuild: schedule, startIntro };
}

function el(name, attrs = {}) {
  const n = document.createElementNS(SVGNS, name);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  return n;
}
