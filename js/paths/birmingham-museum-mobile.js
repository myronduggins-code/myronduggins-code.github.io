// Birmingham Museum (mobile app) path — Figma vectors "Light Blue Path"
// 282:2 (Research) and 282:3 (Design Refinement) on frame 259:449.
// Both runs sit inside dark sections; every other section is light.

import { across, downAcrossDown, outDownAcrossDown } from '../modules/geometry.js';

export const museumMobilePath = {
  // nothing is drawn on load: borders on screen at the top wrap as you start scrolling
  intro: false,
  chains: [
    // Research: pain points → personas → journey maps
    {
      start: { stop: '#bmm-pain-1' },
      links: [
        { to: '#bmm-pain-2', route: across({ fy: 0.385 }) },
        { to: '#bmm-pain-3', route: across({ by: 0.36 }) },
        { to: '#bmm-persona-1', route: outDownAcrossDown({ fy: 0.51, out: 117, mid: 0.3, bx: 0.5 }) },
        { to: '#bmm-persona-2', route: across({ fy: 0.41 }) },
        { to: '#bmm-journey-1', route: downAcrossDown({ ax: 0.5, mid: 0.255, bx: 0.5 }) },
        { to: '#bmm-journey-2', route: across({ fy: 0.48 }) },
      ],
    },
    // Design refinement: title box → mock-ups → high-fidelity prototype
    {
      start: { stop: '#bmm-refine-box' },
      links: [
        { to: '#bmm-cmp-1', route: downAcrossDown({ ax: 0.5, mid: 0.5, bx: 0.5 }) },
        { to: '#bmm-cmp-2', route: across({ fy: 0.35 }) },
        { to: '#bmm-cmp-3', route: across({ fy: 0.35 }) },
        { to: '#bmm-hifi-img', route: outDownAcrossDown({ fy: 0.5, out: 183, mid: 0.94, bx: 0.5 }) },
      ],
    },
  ],
  selfStops: [
    '#bmm-sec-overview .stop',
    '#bmm-sec-hero .stop',
    '#bmm-sec-challenge .stop',
    '#bmm-sec-iteration .stop',
  ],
};
