# 04 · Hero + Ads + Process · Vue

**Stack:** Vue 3 islands + Motion for Vue (`motion-v`) · **Status:** Hero done (learning-order step 3), Process in progress
**Built by:** Claude Code (cloud), rebuilt from the baseline (02), not re-read from Figma.

**Figma:** [Digit Fruition, node 60:159](https://www.figma.com/design/1mAbYyy2SEhAwcMuZqXBNL/Digit-Fruition?node-id=60-159)

## What's built
The baseline hero in Vue 3 `<script setup>`. Markup and class names match 02,
and it has its own copies of 02's `Hero.css`, `chartData.ts` and `assets/`, so only the
framework and animation library differ. At 1440px the settled page matches
02's screenshot pixel for pixel apart from the corner label.

- Intro: each animated element is a `motion.*` component with
  `initial`/`animate` and its own `delay`; the GSAP staggers become
  explicit per-item delays. Chart lines draw with `pathLength`.
- Hover: `animate()` on a motion value for the highlight x; a new
  `animate()` on the same value stops the previous one.
- Live mode: `animate(0, 1, { onUpdate })` per tick, inside a `watch` on
  `live`. Interval, animations and the motion-value listener are stopped in
  `onUnmounted`.
- Reduced motion: `initial` is `false`, so the intro is skipped, and hover
  and live mode jump straight to their end values instead of tweening.
- Motion components render their initial state on the server, so the hero
  doesn't flash fully drawn before hydration (02 and 03 do). The flip side is
  a blank page if the island never hydrates, so its `Hero.css` ends with a CSS
  fallback: while the island still carries Astro's `ssr` attribute, the
  content fades in after 1.5s (the guide and dot stay hidden).

## Page structure
`Section.astro` is the sandbox root (`data-sandbox`) and the page's scroll
container; it holds the Hero and then the Process section, in landing page
order. Each marks itself with `data-lab-part` (`Hero`, `Process`), so the
registry has no `part`. The Hero's no-JS fallback rules in `Hero.css` now
start at the sandbox root (the island sits inside it).

## Process (Claude Code, 2026-10-15)
Built from `docs/briefs/process/brief.md`, ported from 02's `Process.tsx`.
Files: `Process.vue`, `Process.css` (copy of 02's, renamed sandbox, plus
the bar fill's start state), `processArt.ts` and `assets/process/` (copies
of 02's). Same art, timings and numbers as 02; see 02's `notes.md` for what
the animation does. Frames match 02 through every change (Playwright, fake
clock), and reduced motion lands on identical scenes.

How it differs from GSAP:
- Motion has no seekable label timeline for SVG attributes, so the scene
  is a pure function of one number: `sceneAt(t)` returns every transform,
  clip and visibility for story time `t` (label sN = N x 1.6 s). The parts
  of the story are `seg(t, start, duration, ease)` calls with 02's starts
  and durations.
- `t` is a motion value (`useMotionValue`); a step change is
  `animate(story, N x 1.6, ...)`. A new animation on the value stops the
  last, so reverse, skip (double speed) and interrupt work as in 02.
- The value is mirrored into a ref and the template binds `pose`
  (a `computed` of `sceneAt`), so Vue patches the SVG attributes each frame.
  This also means the server renders the opening thumbnail exactly, with
  no flash before hydration.
- GSAP's eases are written out as functions (Motion accepts any
  `(p) => number`), so back.out(1.4 / 1.7 / 2) are exact, not bezier
  approximations.
- Idle sway: `animate(from, to, { repeat: Infinity, repeatType: 'mirror' })`
  per part, writing a reactive angle; the bar fill and body text use
  `animate()` on the elements. A run counter drops callbacks from a change
  that was superseded.
- Cleanup in `onUnmounted`: observer, autoplay timer, the story value and
  its listener, and every running animation.

- Step 4 -> 1 (owner, 2026-10-15) plays forwards, like the mango cycle
  on /8: the camera closes in on the centre mango (turned upright, at the
  seed's step 1 size) while the rest of the tree fades; then the mango's
  outline morphs into the seed's, its highlight fades out and the seed's
  grooves fade in. It lands on step 1's exact frame and the playhead jumps
  back to s1. It takes two steps' time (3.2 s). The morph runs between
  polygons of the two outlines sampled to matching points
  (`morphPolygons` in `processArt.ts`): the seed path has far more curve
  segments than the mango's, so morphing the paths as drawn goes lumpy.
  Motion has no path morph, so `sceneAt` draws the points in
  between itself.
- Idle sway eases out from rest instead of jumping to its first angle.

## Motion spec
Same timings as 02. Eases are cubic-beziers: power3.out `[0.25, 1, 0.5, 1]`,
power2.inOut `[0.65, 0, 0.35, 1]`, sine.inOut `[0.37, 0, 0.63, 1]`.
GSAP's back.out(2) and back.out(3) have no exact bezier; they're approximated
with `[0.34, 1.56, 0.64, 1]` and `[0.3, 1.9, 0.55, 1]`.

## JS shipped
76.1 KB gzipped (219 KB raw) for the route, against 98.6 KB for 02.

## Unfinished
- Hero: nothing.
- Process: no review by a second agent yet; motion timings are the
  brief's, not a designer's.

## Ads (Claude Code, 2026-10-16)
Figma: Services Section `142:1216` (1440 x 700), keywords `301:15`, arrows
`301:24`. Ported from page 5's behaviour (see 05's notes.md for the full
spec): five spokes 72° apart on one wheel about (720, 899.35), 1 s
in-out-quad turns counter-clockwise, spoke opacity = cos of its angle from
the top, full-viewport section, keywords on the right (current one bold),
arrows, autoplay 2 s hold / 1 s turn that the disc, an arrow or a keyword
stops until a reload, a glow that drifts to a random spot each turn, and
the one-time scroll hold (down past step 5 lets go for good). Files:
`Ads.vue`, `Ads.css` (copy of 05's, renamed sandbox), `adsCopy.ts` and
`assets/ads/` (copies). Steps 1, 2, 4, 5 copy is placeholder.
- Vue 3 + Motion for Vue: `animate(from, to, { onUpdate })` tweens the
  angle `ref` and a `reactive` glow; the template derives the wheel
  transform, each spoke's opacity and the gradient from them (no
  `motion.*` components, so there is no hidden SSR state). Ease is the
  cubic-bezier for in-out quad `[0.455, 0.03, 0.515, 0.955]`; autoplay is a
  `setTimeout`. A `run` counter drops callbacks of superseded turns.
- Cleanup: `onUnmounted` stops every `animate()` control, the timer, the
  observer and the listeners.

## Results (Claude Code, 2026-10-16)
Figma: concept 142:1466 (icon pool), results card 142:1470. Same
behaviour, numbers, layout and hand-written physics as page 5 (see
05-hero-vanilla-anime/notes.md for the full spec); `resultsPhysics.ts`,
`Results.css` and `assets/results-icons/` are copies, not imports.
Mounted after Process with `client:visible={{ rootMargin: '100%' }}`, so
the island loads only when the page is a screen away from it (well before
the hold starts at the middle of the screen). Pool and overlay mark
`data-lab-part="Results"`.
- Vue 3 + Motion for Vue (`Results.vue`): one `shallowRef` for the icons
  (no deep reactivity), `useTemplateRef` for the fixed elements and a
  function `:ref` filling a plain array for the icons; `await nextTick()`
  before dropping. The physics clock is Motion's frame loop
  (`frame.update(cb, true)` / `cancelFrame`); the glide is Motion's
  `animate(from, to)` with `onUpdate` (outQuart `[0.25, 1, 0.5, 1]`,
  0.7 s); the release is a `setTimeout`.
- Cleanup: `onUnmounted` stops the glide, clears the timer, cancels the
  frame callback, unlocks and removes observers and listeners.
- Performance: the icon list is the only reactive state, set once when
  the drop starts, so the framework renders the icons once (they wait above
  the pool with `translate3d(0, -100%, 0)` until they fall). The physics and
  every per-frame value live in plain objects and write `transform`,
  `--glow` and `is-glowing` straight to the elements, skipping sleeping
  icons. The clock runs only while the pool is on screen (an
  IntersectionObserver) and stops once the pile has rested 45 frames.
  Checked at 1440 x 900: 16.7 ms median frame during the drop, a settled
  pile doesn't move, no errors; 390 x 844 too.
- Hold: the scroller gets `overflow: hidden` + `scrollbar-gutter: stable`
  for the 3 s, as the Ads hold does, plus wheel, touch and key blocking.

## Case studies (shared, 2026-10-16, Claude Code)

The Resources block (Figma 142:1504: "Case Studies / Blogs" tabs and three
result cards) sits after Results. It is not rebuilt per stack: the page
includes the one static Astro component at
`src/components/case-studies/CaseStudies.astro`, copied from page 6's
`parts/CaseStudies.astro` with its own copies of the images. No animation
and no island. Its root has `id="resources"` and
`data-lab-part="Case studies"`. Below about 1056px wide the cards stack.
The Blogs tab does nothing yet.

## Form & FAQ (shared, 2026-10-16, Claude Code)

The audit form and FAQ block (Figma 142:1607 "Audit form and FAQ", inside
142:1606) sits after Case studies. It is not rebuilt per stack: the page
includes the one static Astro component at
`src/components/forms/FormFaq.astro`, copied from page 6's
`parts/FormFaq.astro` with its own copies of the icons. No animation and no
island. Its root has `id="forms"` and `data-lab-part="Form & FAQ"`. Below
about 1056px wide the form and the FAQ stack. The form does not send
anything yet and the FAQ rows don't open.

## Footer (shared, 2026-10-16, Claude Code)

The footer (Figma 142:1697 "Footer") is the last block on the page, after
Form & FAQ. It is not rebuilt per stack: the page includes the shared static
piece `src/components/footer/Footer.astro`, copied from page 6's
`parts/Footer.astro` with its own copy of the creator logo. No animation and
no island. Its root has `id="footer"` and `data-lab-part="Footer"`. Below
768px wide the two columns stack and the social links wrap (not in Figma).
The social links point at `#` until real URLs exist.

## Logo (shared, 2026-10-16, Claude Code)

The logo block sits between Form & FAQ and the footer, as in the landing
order. It is the shared piece `src/components/logo/Logo.astro`, built from
the user's Paper design: their logo SVG with Paper's Gem Smoke shader, from
the plain `@paper-design/shaders` package (0.0.81), mounted with vanilla
TypeScript (no React, no animation library, so nothing fights this page's
own). It uses the user's own Paper settings (speed 1, size 0.8, outer/inner
distortion 0.55/0.6, outer glow 0, inner glow 0.65, scale 0.6, diamond,
their starting frame), mapped the way Paper's React wrapper does, on an
800 x 600 canvas that shrinks with the same ratio on narrow screens. Colours
are read from tokens.css at start (`--color-accent`, `--color-gem-yellow`,
`--color-gem-white`, `--color-gem-inner`) and the background is
transparent. The plain SVG shows until the shader is ready and stays if
WebGL is missing; reduced motion gets one still frame; it pauses when off
screen. Root has `id="logo"` and `data-lab-part="Logo"`. Figma 142:1695 (a
static glow PNG) was the rough example only.

## Audits (shared, 2026-10-17, Claude Code)

The audits block (Figma 142:1233 "Audit Section") sits between Ads and
Process, as in the landing order. It is the shared static piece
`src/components/audits/Audits.astro`: no animation and no island. Its root
has `id="audits"` and `data-lab-part="Audits"`. In Figma the audit sheet is a
screenshot; here it is real HTML (12 metric tiles, the match-type table and
the sheet tabs), and the empty Takeaways panel holds a paired bar chart of
% of spend vs % of ad sales per match type. Figures fixed from the frame:
Total Sales $321.78 -> $321,780 (so TACOS 7.51% and % of ad sales 27.84%),
ACOS 31.23% -> 26.98%, and the table's % of spend / % of sales recomputed
from Ad Spend and Ad Sales; the component computes every derived figure.
The five "What we offer" icons are the Figma ones, downloaded 2026-10-17.

## About us (shared, 2026-10-17, Claude Code)

The About us block (Figma 142:1298 "Values and Partners") sits between
Process and Results, as in the landing order. It is the shared piece
`src/components/about/AboutUs.astro`, with no island and no animation
library. Root has `id="about"` and `data-lab-part="About us"`. Assets are the
frame's own Figma exports (icons, backdrop and photo as WebP).

The four value cards flip like a coin: on hover they tip 20% of a half turn
(36deg, 450ms, `--ease-out`); a click finishes the turn (750ms, the new
`--ease-in-out` token) and a second click turns it back. While a click's
turn runs, the hover tip waits until the pointer leaves, so the card lands
flat. Plain CSS transitions on one `transform`, toggled by a small script
whose listeners are removed on `astro:before-swap`. Each card is a button
with `aria-pressed`; reduced motion swaps sides with no turn and no tip.
The back follows Figma 375:104: grey card, orange 16px title, 13px Small
text and the Digit Fruition logo at the foot. Not done: the back text is
draft copy (Figma has "Body"); replace the `body` lines in AboutUs.astro
when the real copy arrives. Cards grow past Figma's 215px so the three-line
"Flexible Payment Structure" isn't clipped as it is in the frame.

Card polish (owner's call): the icons are trimmed to their shapes and sized
by area of colour (84 / 91 / 84 / 104px) in one 104px slot, so the diamond
no longer looks smaller than the leaf and icons and titles line up. All four
titles share one size: 21px when it fits, otherwise the script steps it down
until no word touches the card's padding (CSS guess `100cqi / 8.6` without JS).
