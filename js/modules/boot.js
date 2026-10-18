// Shared boot for every page: reveal intro, path + wraps, small link fixes.
import { ready } from './site.js';
import { initReveal } from './reveal.js';
import { initTrace } from './trace.js';

export function boot(pathConfig, { afterIntro } = {}) {
  // Prototype links without a URL yet do nothing instead of jumping to the top.
  document.querySelectorAll('a[data-figma-link][href="#"]').forEach((a) => {
    a.addEventListener('click', (e) => e.preventDefault());
  });

  return ready().then((libs) => {
    const intro = initReveal(libs);
    const trace = initTrace(pathConfig);
    trace.startIntro(Math.max(0.5, intro.duration() - 0.7));
    // Starting states are set, so it's safe to show the page now.
    document.documentElement.classList.remove('is-loading');
    if (afterIntro) afterIntro(libs);
    return { libs, trace };
  });
}
