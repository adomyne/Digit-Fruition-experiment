# 05 · Hero · Vanilla

**Stack:** no framework (Astro markup + one bundled script) + Anime.js v4 · **Status:** done (learning-order step 3)
**Built by:** Claude Code (cloud), rebuilt from the baseline (02), not re-read from Figma.

**Figma:** [Digit Fruition, node 60:159](https://www.figma.com/design/1mAbYyy2SEhAwcMuZqXBNL/Digit-Fruition?node-id=60-159)

## What's built
The baseline hero as static Astro markup with one `<script>` that Vite bundles.
It imports 02's `Hero.css`, `chartData.ts` and `assets/`, so only the
runtime differs. At 1440px the settled page matches 02's screenshot pixel for
pixel apart from the corner label.

- Intro: one `createTimeline` inside a `createScope` (with a
  reduced-motion media query that skips it). Start states are set up front with
  `utils.set` so late elements stay hidden from the first frame, as GSAP's
  `from()` does. Lines draw with `svg.createDrawable`.
- Hover: `animate()` on a plain object with `composition: 'replace'`.
- Live mode: `animate()` on a mix value per tick; the button toggles
  `aria-pressed` and its label by hand.
- Cleanup: navigation is full page loads, so the page unload tears it down; an
  `astro:before-swap` listener reverts the scope, cancels live mode and
  removes the listeners for when view transitions arrive.

## Motion spec
Same timings as 02. Anime names GSAP's eases differently: power3.out is
`outQuart`, power2.inOut `inOutCubic`, sine.inOut `inOutSine`,
back.out(n) `outBack(n)`.

## JS shipped
17.9 KB gzipped (45 KB raw) for the route, against 98.6 KB for 02.

## Unfinished
- Nothing for this section.
