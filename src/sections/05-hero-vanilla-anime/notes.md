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
- **Success story popup:** slides up after 5s if the reader is still on the
  hero. Leaving the hero first cancels it for good; leaving while it shows
  slides it away for good (Escape too). Its button scrolls to Results.

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
