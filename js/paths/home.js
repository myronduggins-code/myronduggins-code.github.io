// Home path — from the Figma layers Line 1–16 + Rectangle 1 on
// "Wireframe Home Screen" (259:1016), joined in travel order.
// Fractions are where each line meets an element edge in Figma.
// Edit this file to change the route; the animation code reads it as data.

import { across, downAcross, downAcrossDown, down } from '../modules/geometry.js';

export const homePath = {
  // nothing is drawn on load: the square appears on the first scroll,
  // then the line sets off from it
  intro: false,
  chains: [
    {
      colour: '--accent',
      start: { square: '#start-square' },
      links: [
        // Line 1: start square → Birmingham Museum (mobile) card, left side
        { to: '#card-museum-mobile', route: across({ fy: 0.5 }) },
        // Line 2: mobile card → desktop card, 75% down the desktop card
        { to: '#card-museum-desktop', route: across({ by: 0.75 }) },
        // Lines 4 + 3: down from the desktop card, across into Helping Hand
        { to: '#card-helping-hand', route: downAcross({ ax: 0.81, by: 0.112 }) },
        // Line 6: Helping Hand → photo card, 43% down the photo card
        { to: '#card-photo', route: across({ by: 0.43 }) },
        // Lines 14–16: photo card → CURRICULUM × VITAE
        { to: '#box-cv', route: downAcrossDown({ ax: 0.149, mid: 0.369, bx: 0.44 }) },
        // Line 8: CV box → Download CV button (the line passes through the pill)
        { to: '#btn-cv', pass: true, route: down({ x: 0.5 }) },
        // Lines 9–13: the fork into GET × IN TOUCH and the form, drawn together
        {
          to: ['#box-contact', '#form-contact'],
          route: [
            downAcrossDown({ ax: 0.5, midPx: 117, bx: 0.53 }),
            downAcrossDown({ ax: 0.5, midPx: 117, bx: 0.555 }),
          ],
        },
      ],
    },
  ],
  selfStops: [],
};
