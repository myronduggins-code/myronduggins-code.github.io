// Shared page setup: GSAP plugins, image placeholders, and a ready promise.

// ── Start at the top ────────────────────────────────────────────────────
// Following a link to another page should always open it at the top.
// Some browsers and embedded viewers carry the previous page's scroll
// position over, which made Helping Hand open part-way down at FOOD × ACCESS.
// Back/forward and reload keep their position; links with a #section still
// jump to that section. We stop forcing the top as soon as the visitor scrolls.
(function startAtTop() {
  const nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
  const type = nav ? nav.type : 'navigate';
  if (type !== 'navigate' || location.hash) return;
  try { history.scrollRestoration = 'manual'; } catch (e) { /* not supported */ }
  let userMoved = false;
  const stop = () => { userMoved = true; };
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach((ev) =>
    window.addEventListener(ev, stop, { once: true, passive: true }));
  const toTop = () => { if (!userMoved && window.scrollY !== 0) window.scrollTo(0, 0); };
  toTop();
  requestAnimationFrame(() => requestAnimationFrame(toTop));
  window.addEventListener('load', () => { toTop(); setTimeout(toTop, 120); setTimeout(toTop, 400); }, { once: true });
  // let the browser restore positions again for Back/Forward later on
  window.addEventListener('pagehide', () => {
    try { history.scrollRestoration = 'auto'; } catch (e) { /* ignore */ }
  });
})();

export function ready() {
  return new Promise((resolve) => {
    const go = () => {
      const { gsap, ScrollTrigger } = window;
      if (!gsap || !ScrollTrigger) {
        console.error('GSAP failed to load; the page stays static.');
        return; // content is fully visible without JS animation
      }
      gsap.registerPlugin(ScrollTrigger);
      document.documentElement.classList.add('js');
      markMissingImages();
      resolve({ gsap, ScrollTrigger });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go, { once: true });
    else go();
  });
}

/** Show a labelled placeholder (the expected file name) until an image file exists. */
export function markMissingImages() {
  document.querySelectorAll('.media img').forEach((img) => {
    const fig = img.closest('.media');
    const miss = () => fig.classList.add('is-missing');
    const ok = () => fig.classList.remove('is-missing');
    if (img.complete) {
      if (img.naturalWidth === 0) miss();
    }
    img.addEventListener('error', miss);
    img.addEventListener('load', ok);
  });
}

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
