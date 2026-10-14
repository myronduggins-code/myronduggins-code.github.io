// Helping Hand path — from the Figma vector "Light Blue Path" (280:2) on
// "Helping Hand Work + Case Study" (259:56). The Figma line has three runs and
// skips both light sections, so it is three chains here. Fractions are where
// the Figma line meets each element.

import {
  down, across, downAcrossDown, outDownAcrossDown, fromSectionTop, toSectionBottom,
} from '../modules/geometry.js';

export const helpingHandPath = {
  // as on Home: nothing is drawn on load; the square appears on the first
  // scroll, then the line runs from it to the mobile preview
  intro: false,
  chains: [
    // Run 1 — project overview, hero, challenge
    {
      start: { square: '#hh-start-square' },
      links: [
        // square → mobile preview (100px), then down to the desktop preview;
        // the mobile border unwraps as the line travels on
        { to: '#hh-prev-mobile', route: across({ fy: 0.5 }) },
        { to: '#hh-prev-desktop', route: down({ ax: 0.5 }) },
        { to: '#hh-lockup', route: downAcrossDown({ ax: 0.5, mid: 0.506, bx: 0.5 }) },
        { to: '#hh-intro', route: across({ fy: 0.296 }) },
        { to: '#hh-challenge', route: outDownAcrossDown({ fy: 0.5, out: 31, mid: 0.82, bx: 0.953 }) },
        { to: '#hh-problem', route: down({ x: 0.5 }) },
        { to: '#hh-goal', route: across({ fy: 0.41 }) },
        // the line runs off the bottom of the dark section into the light one
        { toSectionBottom: '#hh-sec-challenge', route: toSectionBottom({ ax: 0.5 }) },
      ],
    },
    // Run 2 — design iteration 01 (enters from the section's top edge)
    {
      start: { sectionTop: '#hh-sec-iteration' },
      links: [
        { to: '#hh-wire-box', route: fromSectionTop({ bx: 0.5 }) },
        { to: '#hh-wf-1', route: downAcrossDown({ ax: 0.5, mid: 0.5, bx: 0.5 }) },
        { to: '#hh-wf-2', route: across({ fy: 0.26 }) },
        { to: '#hh-wf-3', route: across({ by: 0.31 }) },
        { to: '#hh-lofi-img', route: outDownAcrossDown({ fy: 0.576, out: 80, mid: 0.83, bx: 0.5 }) },
        { to: '#hh-lofi-card', route: across({ fy: 0.365 }) },
        { to: '#hh-findings', route: down({ ax: 0.5 }) },
      ],
    },
    // Run 3 — retrospective
    {
      start: { sectionTop: '#hh-sec-retro' },
      links: [
        { to: '#hh-takeaways', route: fromSectionTop({ bx: 0.5 }) },
      ],
    },
  ],
  // Light sections: borders draw themselves on scroll (Figma "Frame 22" note)
  selfStops: [
    '#hh-sec-research .stop',
    '#hh-sec-refine .stop',
  ],
};
