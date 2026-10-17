# 02 · Hero (baseline)

**Stack:** React islands + GSAP · **Status:** Hero done (learning-order step 2), Process in progress
**Built by:** Claude Code (cloud), from the Figma MCP server.

**Figma:** [Digit Fruition, node 60:159](https://www.figma.com/design/1mAbYyy2SEhAwcMuZqXBNL/Digit-Fruition?node-id=60-159)
(hero layers: Menu `142:1074`, Hero Content `142:1118`, Performance Dashboard `142:1135`)

## What's built
- Header: logo, five-tab nav (active tab has a 3px light-orange bar), EN
  selector, dark "Get a Free Audit" button.
- Brand row (logo + H1 "PPC Agency", Manrope Medium 67/80), subtitle
  (Manrope Medium 21/24 at 90%), orange "Book a Discovery Call" CTA.
- Dashboard: four metric cards (Sales bar dark orange, ACOS bar light
  orange), the Sales/ACOS chart, date row, "Live mode" toggle, closing copy.
- Colors, type, spacing and sizes come from `get_variable_defs` and
  `get_design_context` on the frame; `tokens.css` notes the Figma variable
  name next to each value. Measured against the frame at 1440px: every block
  lands within 2px of its Figma y position.
- Chart axes: Figma spaces the labels evenly over 310px (57.2px steps) while
  the gridlines are 53.4px apart, so the upper labels drifted off their lines.
  Here labels and gridlines share one box and one tick scale, so each label
  is centred on its line. The plot keeps Figma's 33px headroom above the 25
  line so the Sales line can overshoot it as in the frame.

## Motion spec (GSAP, one timeline, `power3.out` unless noted)
| Element | Start | Duration | Notes |
| --- | --- | --- | --- |
| Logo, nav, header actions | 0 | 0.6 | y -16 → 0, fade, stagger 0.08 |
| Amazon logo | 0.15 | 0.8 | y 28 → 0, fade |
| "PPC", "Agency" | 0.3 | 0.8 | y 28 → 0, stagger 0.08 |
| Subtitle | 0.6 | 0.7 | y 16 → 0 |
| CTA | 0.75 | 0.6 | y 12, scale 0.96 → 1, `back.out(2)` |
| Metric cards | 0.9 | 0.5 | y 16 → 0, stagger 0.06 |
| Axis labels, dates | 1.0 | 0.4 | fade, stagger 0.02 |
| Chart lines | 1.05 | 1.6 | stroke draw, `power2.inOut`, stagger 0.15 |
| Live mode, closing copy | 2.2 | 0.6 | y 12 → 0, stagger 0.1 |
| Guide line | 2.3 | 0.5 | scaleY from the baseline |
| Dot | 2.5 | 0.5 | scale 0 → 1, `back.out(3)` |

Hover: the guide and dot follow the pointer along the ACOS line (0.35s) and
settle back on Dec 2 on leave (0.6s). Live mode re-noises both series every
1.4s with a 1.1s `sine.inOut` morph. Reduced motion skips the intro timeline,
and hover and live mode jump straight to their end values instead of tweening.

## Type
Everything is set in Manrope Variable (`@fontsource-variable/manrope`).
Figma uses Neue Montreal for nav, buttons, metric cards and dates; the owner
chose Manrope for those instead, so widths there differ slightly from the frame.

## Assets
`assets/` holds the frame's own exports, downloaded through the Figma MCP
server and used at their Figma sizes: `df-logo.png` (node 142:1077),
`amazon-logo.svg` (142:1121), and the globe, chevron-down, download,
info-circle and phone-call icons. The chart series in `chartData.ts` are the
points of the Figma chart vector (142:1188), mapped to the plot's axis scale
rather than traced.

## Reference
`frame.png` is the 1x Figma export of the hero part of the frame: the Menu
(142:1074) and the Hero Section (142:1117), stacked at their positions in
the frame (1440 x 1362). The rest of frame 60:159 is the full landing page and
belongs to later sections.


## Page structure (2026-10-15)
The page now holds two landing sections, Hero then Process, in landing
order. `Section.astro` renders the sandbox root (`.page`, the scroll
container) with two islands; each section's root carries `data-lab-part`,
so the registry entry no longer sets `part`. `Hero.css`'s root rule now
styles that wrapper.

## Process (Claude Code, 2026-10-15)
Built from `docs/briefs/process/brief.md`. Files: `Process.tsx`,
`Process.css`, `processArt.ts`, `assets/process/` (copies of the brief's
SVG parts plus `arrow.svg`, copied from the /6 assets).

How it works:
- One inline SVG, viewBox 686 x 320 (the Figma graphic box). Shapes use
  `currentColor` = `--color-accent`. The path data is read from the SVG
  files with `?raw` imports.
- The seed, roots and sprout sit exactly where they are in
  `reference/seed-sprouting.svg` (offsets found by matching points); the
  three mangoes are `mango.svg` fitted to `reference/tree-with-mangoes.svg`
  (96 to 98% overlap). Numbers are in `processArt.ts`.
- A camera group zooms out from the seed (step 1) to the Figma framing of
  the tree (step 3 and 4: 277 x 320 at x 204). It is tweened through a
  plain object that writes the `transform` attribute.
- One paused GSAP timeline holds the whole story with labels `s0` (the
  thumbnail) to `s4`. A step change tweens the timeline's playhead to the
  label, so going back plays in reverse, skipping plays the steps in
  between at double speed, and a click mid-change takes over from wherever
  the playhead is.
- Nothing fades (owner, 2026-10-15): every change is continuous growth
  from the separate parts. The thumbnail's arrow pulls back into the seed
  and the mango shrinks toward it while the seed slides to the centre; the
  ground line draws out; roots and tree are clip-rect reveals; the sprout
  lives in the tree's group and rides the trunk's growing edge as its tip,
  then folds into the top leaf; the roots outgrow the seed, which shrinks
  into them, then spread into the tree's base; leaves and mangoes grow
  from where they attach (`svgOrigin`, `back.out`). The trunk reveal and
  the sprout's ride share one proxy tween.
- 1.6 s per step. Clicking the illustration (a button) shows the next
  step (4 goes back to 1) and stops autoplay, like the stepper.
- Step 4 -> 1 (owner, 2026-10-15) plays forwards, like the mango cycle
  on /8: the camera closes in on the centre mango (turned upright, at the
  seed's step 1 size) while the rest of the tree fades; then the mango's
  outline morphs into the seed's, its highlight fades out and the seed's
  grooves fade in. It lands on step 1's exact frame and the playhead jumps
  back to s1. It takes two steps' time (3.2 s). The morph runs between
  polygons of the two outlines sampled to matching points
  (`morphPolygons` in `processArt.ts`): the seed path has far more curve
  segments than the mango's, so morphing the paths as drawn goes lumpy.
  Here GSAP's MorphSVG tweens between the two polygons.
- Idle sway eases out from rest instead of jumping to its first angle.
- Idle sway runs on wrapper groups the timeline never touches, so the two
  never fight over one transform.
- Autoplay: an IntersectionObserver starts it when 40% of the section is
  visible; a `gsap.delayedCall` moves on every 5 s (step 4 rewinds to 1).
  The first click or arrow key stops it for good. Off screen, autoplay and
  idle pause.
- Reduced motion: a 0.35 s cross-fade between finished scenes, no idle.
- The body text still cross-fades (out, swap, in) on each change.
- Everything lives in one `gsap.context`, reverted on unmount (it also
  disconnects the observer).

Easy with GSAP: label-based scrubbing of one timeline (reverse, skip and
interrupt for free), `svgOrigin`, attribute tweens on clip rects.
Fiddly: the camera (SVG transform attribute, so a proxy object), and
keeping idle tweens off the elements the timeline animates.

## Unfinished
- Process: no review by a second agent yet; no Figma frame for the
  animated version, so motion timings are the brief's, not a designer's.

## Ads (Claude Code, 2026-10-16)
Figma: Services Section `142:1216` (1440 x 700), keywords `301:15`, arrows
`301:24`. Ported from page 5's behaviour (see 05's notes.md for the full
spec): five spokes 72° apart on one wheel about (720, 899.35), 1 s
in-out-quad turns counter-clockwise, spoke opacity = cos of its angle from
the top, full-viewport section, keywords on the right (current one bold),
arrows, autoplay 2 s hold / 1 s turn that the disc, an arrow or a keyword
stops until a reload, a glow that drifts to a random spot each turn, and
the one-time scroll hold (down past step 5 lets go for good). Files:
`Ads.tsx`, `Ads.css` (copy of 05's, renamed sandbox), `adsCopy.ts` and
`assets/ads/` (copies). Steps 1, 2, 4, 5 copy is placeholder.
- React + GSAP: one `useEffect` with a `gsap.context`; GSAP tweens plain
  objects (`{ angle }`, the glow) with `overwrite: true` and `onUpdate`
  writes the wheel transform, spoke opacities and `gradientTransform` by
  hand, so React re-renders only when the step changes (`useState`, for
  `aria-current` and the bold keyword). Buttons reach the effect through an
  `api` ref, as in Process. Ease `power1.inOut`; autoplay `delayedCall`.
- Cleanup: `ctx.revert()` (observer and scroll/key listeners), the turn,
  the autoplay call and `killTweensOf` on the plain objects.

## Results (Claude Code, 2026-10-16)
Figma: concept 142:1466 (icon pool), results card 142:1470. Same
behaviour, numbers, layout and hand-written physics as page 5 (see
05-hero-vanilla-anime/notes.md for the full spec); `resultsPhysics.ts`,
`Results.css` and `assets/results-icons/` are copies, not imports.
Mounted after Process with `client:visible={{ rootMargin: '100%' }}`, so
the island loads only when the page is a screen away from it (well before
the hold starts at the middle of the screen). Pool and overlay mark
`data-lab-part="Results"`.
- React + GSAP (`Results.tsx`): one `useState` for the icons; the engine
  sits in one `useEffect` with refs (callback refs fill the icon array).
  The physics clock is `gsap.ticker.add/remove`; the glide is a `gsap.to`
  on a proxy (`power3.out`, 0.7 s) inside a `gsap.context`; the release
  is `gsap.delayedCall(3)`. Pointer handlers reach the effect through an
  `api` ref.
- Cleanup: the effect's return reverts the context, kills the delayed
  call, removes the ticker callback, unlocks the scroll and removes the
  observers and listeners.
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
