# 04 · Hero + Process · Vue

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
