// Load intro and scroll reveals for text and images.
// Only transform and opacity are animated. Elements the border wraps around
// (.stop) never move themselves, so the path geometry stays exact.

const TEXT = [
  'h2', 'h3', 'h4', 'p', 'li', 'blockquote', 'dt', 'dd',
  '.display', '.xmark', '.tag', '.pill', '.arrow-link', '.label', '.num',
].map((s) => `.sec ${s}`).join(',');

export function initReveal({ gsap, ScrollTrigger }) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return gsap.timeline();

  const vh = window.innerHeight;
  const inView = (el) => el.getBoundingClientRect().top < vh * 0.92;

  // leaf text elements, minus intro items and anything that is itself a stop
  const all = [...document.querySelectorAll(TEXT)];
  const set = new Set(all);
  const text = all.filter((el) =>
    !el.hasAttribute('data-intro') &&
    !el.classList.contains('stop') &&
    !el.closest('.nav') &&
    !el.closest('[data-wrap-reveal]') &&
    !el.closest('form') &&   // form messages must never be hidden by the reveal
    !el.closest('.visually-hidden') &&
    !el.classList.contains('visually-hidden') &&
    ![...el.querySelectorAll('*')].some((c) => set.has(c)));

  const images = [...document.querySelectorAll('.sec .media img')].filter((img) => !img.closest('[data-wrap-reveal]'));

  const introText = text.filter(inView);
  const introImages = images.filter((img) => inView(img.closest('.media')));
  const laterText = text.filter((el) => !introText.includes(el));
  const laterImages = images.filter((img) => !introImages.includes(img));

  // ── intro ──────────────────────────────────────────────────────────
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.from('.nav', { opacity: 0, y: -8, duration: 0.6, ease: 'power2.out' }, 0);
  const introItems = [...document.querySelectorAll('[data-intro]')];
  if (introItems.length) {
    tl.from(introItems, { y: 24, opacity: 0, duration: 0.9, stagger: 0.1 }, 0.1);
  }
  if (introText.length) {
    tl.from(introText, { y: 24, opacity: 0, duration: 0.9, stagger: Math.min(0.1, 0.8 / introText.length) }, 0.35);
  }
  if (introImages.length) {
    tl.from(introImages, { opacity: 0, scale: 0.98, duration: 0.9, stagger: 0.1 }, 0.45);
  }

  // ── scroll reveals, once ───────────────────────────────────────────
  gsap.set(laterText, { y: 16, opacity: 0 });
  ScrollTrigger.batch(laterText, {
    start: 'top 85%',
    once: true,
    onEnter: (batch) => gsap.to(batch, {
      y: 0, opacity: 1, duration: 0.7, ease: 'power2.out', stagger: 0.08, overwrite: true,
    }),
  });

  gsap.set(laterImages, { opacity: 0, scale: 0.98 });
  ScrollTrigger.batch(laterImages.map((i) => i.closest('.media')), {
    start: 'top 88%',
    once: true,
    onEnter: (batch) => gsap.to(batch.map((f) => f.querySelector('img')), {
      opacity: 1, scale: 1, duration: 0.9, ease: 'power2.out', stagger: 0.1, overwrite: true,
    }),
  });

  return tl;
}
