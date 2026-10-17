# 05 · Hero + Ads + Process · Vanilla

**Stack:** no framework (Astro markup + bundled scripts) + Anime.js v4 · **Status:** Hero rebuilt from Figma 142:1117 with a live chart (2026-10-16), Process in progress
**Built by:** Claude Code (cloud). The first hero was a port of the baseline (02); the 2026-10-16 hero is page 5's own, read from Figma.

**Figma:** [Digit Fruition, node 60:159](https://www.figma.com/design/1mAbYyy2SEhAwcMuZqXBNL/Digit-Fruition?node-id=60-159)

## Hero and menu (Claude Code, 2026-10-16)
Figma: Menu `142:1074`, Hero Section `142:1117`, Chart Data `142:1189`
(inside Chart Marker `142:1188`), success story popup `329:84`. Files:
`Section.astro` (markup + one `<script>`), `Hero.css`, `heroChart.json`
(the data), `heroChart.ts` (reads the JSON, formats, paths),
`assets/hero/`, `assets/popup/`.

What it does:
- **Data:** `heroChart.json` has one row per day (`date`, `spend`, `sales`,
  `acos`, `impressions`), the resting day (`defaultDate`) and the axis tops
  (`salesMax` 25000, `acosMax` 25, `steps` 5). The x axis runs from the
  first row to the last. Replace the file with real rows to change the chart.
- **Dummy data:** traced from the Figma vector. Its visible window is the
  plot (690px) centred on the dot, at path x 288 to 978; gridlines at y
  41.26 (25) to 199.26 (0), 6.32px per unit. Each vertex snaps to its
  nearest day, days between are interpolated. ACOS is shifted up 4.2 units
  (Figma's line dips below 0%); the Figma lines stop at 81% of the plot, so
  Dec 15 to Dec 29 are hand-made. Sales above 25K runs off the top, as in
  Figma (not rescaled, by the owner's call).
- **Load:** the chart frame is there from the first frame; the two lines
  draw in (`svg.createDrawable`, 1.6s), the four cards count up from 0 to
  the resting day's values, and the dot pops onto the ACOS line.
- **Timeline:** the guide snaps from day to day under the pointer (or a
  finger dragged sideways; arrow keys when the plot has focus). The date
  under it and all four cards change with the day. Leaving the plot slides
  the guide back to Dec 02. The first and last dates step aside when the
  moving date reaches them.
- **Focus mode:** pressing a line (a 16px invisible hit path) or its card
  highlights that line, dims the other line and card, and moves the dot onto
  the focused line. Pressing it again, or anywhere off the lines and cards,
  turns it off. A drag along the chart isn't a press.
- **Menu:** an overlay that is always on screen (owner's call, 2026-10-16):
  sticky at the top of the page's scroll container, with a see-through bar
  that lets presses through, so only the tabs and buttons float over the
  page (they lift with a shadow once it scrolls). Links scroll to the landing parts
  by `data-lab-part`: Home Hero, Services Ads, About Process, Resources
  Results, Contact Us the end of the page (no contact part yet). The tab of
  the part under the menu is marked current. A jump past the Ads wheel is
  instant, because the wheel holds a scroll that comes down onto it.
  Below 1081px the tabs and language button move into a burger panel; below
  641px the audit button does too.
- **Success story popup:** slides up from below the screen after 5s if the
  reader is still on the hero, and settles with an Anime.js
  `spring({ bounce: 0.45, duration: 2000 })`: about 18px of overshoot at
  ~1.2s on desktop, at rest by ~2s. Reduced motion shows it in place.
  Leaving the hero first cancels it for good; leaving while it shows slides
  it back down for good, as do its close X, Escape and a press anywhere off
  the popup (that press still does its own job). Its button scrolls to the
  section named in `STORY.part`.
  Owner's quieter version of 329:84 (2026-10-16): a 1360 × 80 bar, H5
  numbers and title (21px), 16px bold label, 40px button; copy and button
  split the free width 3 : 1 (763 : 288 in Figma).
  Owner's light version with a close X (same day): white to `#d8d7d7`
  gradient (`--color-popup-fade`), Gray (`--color-ink`) text and button
  label, dark arrow, orange X (`assets/popup/close.svg`, Figma 353:156) in
  the top right with 12px side padding; copy and button + X split 5 : 2.
  Below 1000px the X sits in the card's top right corner.

Not done / open:
- The language button and Get a Free Audit go nowhere yet.
- While Results holds the scroll for its icon drop (3.7s after arriving),
  menu clicks are ignored by Results' lock.
- Over full-screen parts (Ads, Results) the menu covers their top corners.
- `tokens.css` gained `--color-sales` and the chart, menu and popup sizes.

## Page structure
`Section.astro` is the sandbox root (`data-sandbox`) and the page's scroll
container; it holds the menu, the Hero markup, then `<Ads />`,
`<Process />` and `<Results />`, in landing page order, and the popup. Each
part marks itself with `data-lab-part`, so the registry has no `part`.

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
- Under the pinned menu (owner, 2026-10-16): the heading and the keyword
  column sit 57px lower than in Figma (`--ads-drop` = menu height + 20px -
  48px), so the title starts 20px below the menu even on viewports 700px or
  shorter. The wheel, disc and arrows keep Figma's places.
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

## Results (Claude Code, 2026-10-16)
Figma: concept 142:1466 (icon pool), results card 142:1470. Files:
`Results.astro` (markup + its own `<script>`), `Results.css`,
`resultsPhysics.ts` (the physics) and `assets/results-icons/` (the owner's
four 90 x 90 icons, unedited). Mounted after `<Process />`; pool and
overlay both mark `data-lab-part="Results"`.

- Title: "Results That Speak For Themselves" is sticky (zero height, above
  pool and card), so it stays on screen while the card comes up. The card
  holds its place with a hidden copy, as Figma does (0% opacity there).
  Once that slot reaches the title, the script moves the title with it, so
  the title rides on the card instead of covering its content (checked at
  1440 and 390 wide). The slot sits 64 px below the card's top, as the
  title does below the section's top, with 64 px under it too, so the card
  reaches the title as its top edge reaches the top of the screen and
  pushes it on from there.
- Phase 1, icon pool: one viewport tall (`100dvh`), sticky. Scrolling down,
  when the section's top reaches the middle of the screen, Anime.js
  `animate()` glides the scroll so the section fills the screen, then the
  scroll is held for 3 s (wheel, touch, keys and scrollbar put back) while
  icons fall from the top. Once per page load; coming back, the pile stays.
- Icon count fills about 60% of the height (94 at 1440 x 900, 24 on a
  phone). Each icon is a random one of the four shapes in a random one of
  the two orange tokens (`--color-accent`, `--color-accent-light`): the SVG
  is a CSS mask and the token color fills it, so the files stay as uploaded.
- Physics is hand-written, no physics library (the stacks are compared on
  their own tools). Each icon is a rigid body whose hitbox is 1 to 9
  circles fitted inside its real shape (clover, leaf, scalloped disc,
  diamond), so icons touch where they look like they touch (deepest
  overlap in a settled pile about 2.5 px) and flat sides rest flat. Contacts
  apply bounce and friction at the contact point, so off-centre hits turn
  an icon. Grid broad phase, 4 substeps x 4 passes per frame.
- Rest: spin is damped hard once an icon is nearly still, and an icon slow
  for 0.25 s falls asleep: it holds still like the floor until a moving or
  held icon touches it. A settled pile doesn't move at all (checked: 0 px
  and 0 rad over 1.5 s), and Anime.js `createTimer`, the physics clock,
  pauses until a pointer or a resize wakes it.
- Drag, throw: pointer events on the icons (`touch-action: none`), the held
  icon follows the pointer and pushes the others, release keeps its speed.
  The pool has `data-lab-noswipe`.
- Glow: every contact faster than 90 px/s makes the icon glow: a white-orange
  radial light over it with `mix-blend-mode: color-dodge`, fading over
  about 0.4 s; resting contacts don't.
- Phase 2, overlay: see-through. Only the white card (142:1470: 60 px
  sides, 64 px above and below the title slot, 4 px radius on the top corners only, 4 metric rows, note, audit
  button) covers the pool, so icons stay visible and grabbable around it;
  it scrolls up over the sticky pool and runs to the section's bottom with
  no gap. The
  faded coin from Figma is left out by the owner's call.
- Reduced motion: no glide or hold; the pile is settled off screen and
  appears at rest, still draggable.
- Cleanup on `astro:before-swap`: timer, glide, hold timeout, observers,
  listeners.
- Performance pass (with the 02-04 ports): a frame writes only icons that
  moved or changed glow (sleeping icons are skipped), and the hold now
  sets `overflow: hidden` + `scrollbar-gutter: stable` on the scroller, as
  the Ads hold does. The shell's section tag now finds a scroller that is
  `overflow: hidden` too, so it no longer sticks on "Hero" after the hold.
- Other stacks: 02 (React + GSAP), 03 (Svelte + GSAP) and 04 (Vue + Motion
  for Vue) have the same section, each written with its own tools.

## Testimonials (Claude Code, 2026-10-16)

Figma 142:1589 (section), 203:219 (second card). Files: `Testimonials.astro`,
`Testimonials.css`, `testimonialsCopy.ts`, `videos/`, `assets/testimonials/`.
Started from the `/6` reference part (copied, not imported).

- Two cards in a carousel: the active card on the left, the other peeking in
  at 20% opacity on the right. Click the peek or swipe (touch or mouse drag)
  to switch; the old card leaves left and comes back as the peek.
  `data-lab-noswipe` on the track. The new card's video starts after the
  slide when the visitor has already watched one.
- The section is at least one full screen tall (`min-height: 100dvh`, owner's
  call, 2026-10-16), content centred in it.
- Arrival: scrolling down, once per visit, when the section fills half the
  screen the page glides 0.7 s so the section fills the screen. 1.5 s later the
  active video plays muted; on `playing` the thumbnail fades out (0.6 s), so
  there is never a black frame. Scrolling up into it, a reload lower down or
  reduced motion: no glide, start 1.5 s after it fills half the screen.
- Owner's answers: starts muted with a "Tap for sound" pill; small custom
  controls on hover, focus, tap or pause (play/pause, sound, thin seek bar,
  CC when subtitles exist); keeps playing when scrolled away; at the end the
  thumbnail returns with a replay button.
- The thumbnail cover has no text (owner's call; Figma's caption line was
  dropped). While playing, the current subtitle cue shows in that caption's
  spot and style (track mode `hidden`, cues drawn by the script).
- Videos: re-encoded H.264 + AAC mono, `+faststart`, CRF 26, max 900 kbps
  (Ellington 480 px wide, 4.9 MB; Elovate 360 px, 3.2 MB). `preload="none"`
  until the section is a screen away. Originals stay out of the repo.
- Card 2 (Elovate) has the real thumbnail and wordmark, dummy text.
- Narrow screens (≤ 64rem): video above the quote, small peek on the right.
- Cleanup on `astro:before-swap`: animations, timers, observers, listeners,
  videos paused.
- Subtitles: `videos/*.en.vtt`, transcribed by machine (Parakeet word timings,
  checked against Whisper medium.en) and hand-corrected for names (Nojus,
  Digit Fruition, TACoS, ACoS). Edit the text there to fix a word. Unsure:
  "They dove into our artworks" (Elovate, 0:27). While playing the caption
  drops to body size and widens so a two-line cue fits.
- Not done: card 2 copy.

## Case studies (shared, 2026-10-16, Claude Code)

The Resources block (Figma 142:1504: "Case Studies / Blogs" tabs and three
result cards) sits after Results. It is not rebuilt per stack: the page
includes the one static Astro component at
`src/components/case-studies/CaseStudies.astro`, copied from page 6's
`parts/CaseStudies.astro` with its own copies of the images. No animation
and no island. Its root has `id="resources"` and
`data-lab-part="Case studies"`. Below about 1056px wide the cards stack.
The Blogs tab does nothing yet.
On page 5 the menu's Resources link and the popup's "View Case Studies"
button now scroll here (they went to Results before).

## Form & FAQ (shared, 2026-10-16, Claude Code)

The audit form and FAQ block (Figma 142:1607 "Audit form and FAQ", inside
142:1606) sits after Testimonials. It is not rebuilt per stack: the page
includes the one static Astro component at
`src/components/forms/FormFaq.astro`, copied from page 6's
`parts/FormFaq.astro` with its own copies of the icons. No animation and no
island. Its root has `id="forms"` and `data-lab-part="Form & FAQ"`. Below
about 1056px wide the form and the FAQ stack. The form does not send
anything yet and the FAQ rows don't open.

On page 5 the menu's Contact Us link scrolls to it.

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
On page 5 the menu's About link now scrolls to About us (it went to Process).
