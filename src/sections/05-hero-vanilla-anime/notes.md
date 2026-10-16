# 05 · Hero + Ads + Process · Vanilla

**Stack:** no framework (Astro markup + bundled scripts) + Anime.js v4 · **Status:** Hero done (learning-order step 3), Process in progress
**Built by:** Claude Code (cloud), rebuilt from the baseline (02), not re-read from Figma.

**Figma:** [Digit Fruition, node 60:159](https://www.figma.com/design/1mAbYyy2SEhAwcMuZqXBNL/Digit-Fruition?node-id=60-159)

## What's built
The baseline hero as static Astro markup with one `<script>` that Vite bundles.
It has its own copies of 02's `Hero.css`, `chartData.ts` and `assets/`, so only the
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

## Page structure
`Section.astro` is the sandbox root (`data-sandbox`) and the page's scroll
container; it holds the Hero markup and then `<Process />`, in landing page
order. Each marks itself with `data-lab-part` (`Hero`, `Process`), so the
registry has no `part`.

## Process (Claude Code, 2026-10-15)
Built from `docs/briefs/process/brief.md`, ported from 02's `Process.tsx`.
Files: `Process.astro` (markup + its own `<script>`), `processCopy.ts`
(step text, shared by markup and script), `Process.css` (copy of 02's,
renamed sandbox, plus the bar fill's start state), `processArt.ts` and
`assets/process/` (copies of 02's). Same art, timings and numbers as 02;
see 02's `notes.md` for what the animation does. Frames match 02 through
every change, backwards skips included (Playwright, fake clock), and
reduced motion lands on identical scenes.

How it differs from GSAP:
- Anime.js animates the scene's numbers in plain objects (thumbnail,
  camera, sprouting parts, tree, leaves, mangoes), and `render()` writes
  them to the SVG as transform and clip attributes, with each pivot in the
  art's own units. Anime's CSS transforms on SVG can't take those pivots.
- One paused `createTimeline` holds the story with labels `s0` to `s4`
  (the same positions as 02, in ms). A step change animates a `play.t`
  proxy with `animate()`, and its `onUpdate` calls `tl.seek()` then
  `render()`. A new animation on the proxy replaces the running one, so
  reverse, skip (double speed) and interrupt work as in 02.
- The eases have exact Anime names: power1/2 are Quad/Cubic, and
  `outBack(1.4 / 1.7 / 2)` uses the same formula as GSAP's back.out.
- Leaves and mangoes stagger with `stagger()` on arrays of objects.
- Idle sway: `animate()` on seven `{ a }` objects with `loop` and
  `alternate`, written by `renderSway()`; a new animation on an object
  replaces its loop.
- The server markup is the opening thumbnail with the world hidden, so
  nothing flashes before the script runs.
- Cleanup on `astro:before-swap`: observer, autoplay timer, the timeline,
  every running animation (`utils.remove`) and the listeners.

- Step 4 -> 1 (owner, 2026-10-15) plays forwards, like the mango cycle
  on /8: the camera closes in on the centre mango (turned upright, at the
  seed's step 1 size) while the rest of the tree fades; then the mango's
  outline morphs into the seed's, its highlight fades out and the seed's
  grooves fade in. It lands on step 1's exact frame and the playhead jumps
  back to s1. It takes two steps' time (3.2 s). The morph runs between
  polygons of the two outlines sampled to matching points
  (`morphPolygons` in `processArt.ts`): the seed path has far more curve
  segments than the mango's, so morphing the paths as drawn goes lumpy.
  The polygons have the same structure, so Anime.js tweens `d`
  directly.
- Idle sway eases out from rest instead of jumping to its first angle.
## Ads (Claude Code, 2026-10-15; controls 2026-10-16)
Figma: Services Section `142:1216` (1440 x 700), keywords `301:15`, arrows
`301:24`. Files: `Ads.astro` (markup + its own `<script>`), `Ads.css`,
`adsCopy.ts`, `assets/ads/` (ring, line and the two arrow icons from
Figma; `arc.svg` is no longer used, the disc is inline). Sits between Hero
and Process.

- The section fills the viewport (`min-height: 100%` of the page's scroll
  container); the 1440 x 700 frame is centred in it and the disc runs on
  below the frame.
- Five services are spokes 72° apart on one wheel that turns about
  (720, 899.35), the disc's centre line under the number. The disc stays
  still (Figma puts its centre at x 711.86, 8px off; the spokes use 720 so
  step 1 lands exactly where Figma has its content).
- One step: the wheel turns 72° counter-clockwise in 1 s, `inOutQuad`.
  Each spoke's opacity is cos of its angle from the top, so it fades out
  by the next spoke's place. Anime.js animates `{ angle }`, `render()`
  writes the transform and opacities.
- The disc is inline SVG; on every turn its radial gradient's centre and
  angle drift to a random spot (x 260-810, y 330-620, angle -170 to -10,
  disc units; Figma's colours and scale kept) over the same turn.
- Keywords (owner: right side, as Figma): the five titles, the current one
  bold; a hidden bold copy reserves its width so the column never shifts.
  Clicking one turns the shorter way round, 1 s plus 0.4 s per extra step.
- Arrows: previous turns clockwise, next counter-clockwise; both wrap.
- Autoplay as the Process stepper: 2 s hold, 1 s turn, starts when 40% is
  on screen, loops 5 -> 1 still turning the same way. Clicking the disc,
  an arrow or a keyword stops it until a reload (the disc click does
  nothing else, owner 2026-10-16).
- Scroll hold: scrolling down onto the section stops it at the top of the
  viewport and each ~60px of wheel/touch/arrow keys turns one step (input
  ignored for the first 60% of a turn, so one flick is one step). Up at
  step 1 lets go upwards. Down at step 5 lets go and sets `done`: no more
  holding until a reload. A scrollbar drag of a third of the viewport lets
  go. While held, autoplay stops at step 5.
- Steps 1, 2, 4, 5 copy is placeholder (`adsCopy.ts`); Figma only has
  Streaming TV, which is step 3.
- Cleanup on `astro:before-swap`: observer, timer, the turn, the glow,
  click and scroll listeners.

## Motion spec
Same timings as 02. Anime names GSAP's eases differently: power3.out is
`outQuart`, power2.inOut `inOutCubic`, sine.inOut `inOutSine`,
back.out(n) `outBack(n)`.

## JS shipped
17.9 KB gzipped (45 KB raw) for the route, against 98.6 KB for 02.

Reduced motion: hover and live mode jump straight to their end values instead of tweening.

## Unfinished
- Hero: nothing.
- Ads: placeholder copy for steps 1, 2, 4, 5; no review by a second agent yet.
- Process: no review by a second agent yet; motion timings are the
  brief's, not a designer's.
