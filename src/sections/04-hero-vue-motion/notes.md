# 04 · Hero · Vue

**Stack:** Vue 3 island + Motion for Vue (`motion-v`) · **Status:** done (learning-order step 3)
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
- Reduced motion: `initial` is `false`, so the intro is skipped.
- Motion components render their initial state on the server, so the hero
  doesn't flash fully drawn before hydration (02 and 03 do). The flip side is
  a blank page if the island never hydrates, so its `Hero.css` ends with a CSS
  fallback: while the island still carries Astro's `ssr` attribute, the
  content fades in after 1.5s (the guide and dot stay hidden).

## Motion spec
Same timings as 02. Eases are cubic-beziers: power3.out `[0.25, 1, 0.5, 1]`,
power2.inOut `[0.65, 0, 0.35, 1]`, sine.inOut `[0.37, 0, 0.63, 1]`.
GSAP's back.out(2) and back.out(3) have no exact bezier; they're approximated
with `[0.34, 1.56, 0.64, 1]` and `[0.3, 1.9, 0.55, 1]`.

## JS shipped
76.1 KB gzipped (219 KB raw) for the route, against 98.6 KB for 02.

## Unfinished
- Nothing for this section.
