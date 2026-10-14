// Birmingham Museum (desktop website) path — Figma vector "Light Blue Path"
// 282:4 in the Design Refinement section of frame 259:807, the only dark
// section on this page.

import { across, downAcrossDown } from '../modules/geometry.js';

export const museumDesktopPath = {
  // nothing is drawn on load: borders on screen at the top wrap as you start scrolling
  intro: false,
  chains: [
    {
      start: { stop: '#bmd-cmp-1' },
      links: [
        { to: '#bmd-cmp-2', route: across({ fy: 0.39 }) },
        { to: '#bmd-cmp-3', route: across({ fy: 0.39 }) },
        { to: '#bmd-hifi-img', route: downAcrossDown({ ax: 0.5, mid: 0.79, bx: 0.5 }) },
      ],
    },
  ],
  selfStops: [
    '#bmd-sec-overview .stop',
    '#bmd-sec-hero .stop',
    '#bmd-sec-iteration .stop',
  ],
};
