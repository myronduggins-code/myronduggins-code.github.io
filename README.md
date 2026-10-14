# Myron Duggins — Portfolio

Four static pages built from the Figma file *Portfolio Designs* (page "Animation frames"). Plain HTML, CSS and ES modules. GSAP 3.15.0 and ScrollTrigger load from jsDelivr. There is no build step.

## Run it

From this folder:

```
python3 -m http.server 8000
```

Then open http://localhost:8000. Any static server works. Opening the files straight from disk (`file://`) won't work, because ES modules need a server.

## Pages

| File | Figma frame |
|---|---|
| `index.html` | Wireframe Home Screen (259:1016) |
| `helping-hand.html` | Helping Hand Work + Case Study (259:56) |
| `birmingham-museum-mobile.html` | Birmingham Museum Work + Case Study, Mobile App (259:449) |
| `birmingham-museum-desktop.html` | Birmingham Museum Work + Case Study, Desktop App (259:807) |

## Structure

```
css/tokens.css        colours, type, spacing (from the Figma variables)
css/base.css          shared sections, nav, type, media placeholders
css/home.css          home layout
css/case-study.css    case study layouts
js/modules/trace.js   the travelling line + border wrap (one engine for every page)
js/modules/geometry.js  route builders and segmenting
js/modules/reveal.js  load intro + scroll reveals
js/paths/*.js         each page's path, as data: which elements, in what order, which route
js/pages/*.js         page entry points
assets/icons/         × mark, mail, map pin, download (exported from Figma)
assets/graph-tile.png graph-paper tile (exported from Figma)
assets/img/           your images (see below)
```

## Images

The images in `assets/img/` were exported from Figma and renamed to match their slots, for example `hh-07-wireframe-homepage.png`. The 5px borders Figma baked into some exports were trimmed off, because the borders are drawn by the scroll animation instead.

To replace an image, save a new file with the same name. Images are cropped to fill their slot.

## Other things to fill in

- **CV download:** put your CV at `assets/Myron-Duggins-CV.pdf`.
- **Prototype links:** each "View the … prototype →" link opens the Figma prototype in a new tab. For visitors to see them, each Figma file must be shared as "Anyone with the link can view".
- **Contact form:** sends messages through Web3Forms to myronduggins@googlemail.com (access key in `js/modules/contact-form.js`). It works once the site is on a real host; the Claude preview blocks it.

## Changing a path

Each page's path lives in `js/paths/<page>.js` as a list of links (from one element to the next) with a route shape: `down`, `across`, `downAcross`, `downAcrossDown`, `outDownAcrossDown`, `fromSectionTop`, `toSectionBottom`. The numbers are where the line meets an element's edge, as a fraction of its width or height. They're taken from the Figma vectors, so the line stays attached at any screen width.

- Light sections list their key elements under `selfStops`. Those borders draw themselves on scroll.
- Add `pass: true` to let the line touch an element without wrapping it.
