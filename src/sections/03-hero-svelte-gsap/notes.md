# 03 · Hero · Svelte

**Stack:** Svelte 5 island + GSAP · **Status:** done (learning-order step 3)
**Built by:** Claude Code (cloud), rebuilt from the baseline (02), not re-read from Figma.

**Figma:** [Digit Fruition, node 60:159](https://www.figma.com/design/1mAbYyy2SEhAwcMuZqXBNL/Digit-Fruition?node-id=60-159)

## What's built
The baseline hero in Svelte 5 (runes). Markup and class names match 02, and it
has its own copies of 02's `Hero.css`, `chartData.ts` and `assets/` so the
design is identical and only the framework differs. At 1440px the settled page matches
02's screenshot pixel for pixel apart from the corner label.

- Intro, hover and live mode use the same GSAP code as 02, inside one
  `gsap.context` created in `onMount` and reverted on destroy.
- Live mode runs in an `$effect` keyed on the `live` rune; its return kills
  the interval and tween.
- Series and highlight position are plain objects, not `$state`: GSAP writes
  them every frame and the DOM is updated directly.

## Motion spec
Same as 02 (see `../02-hero-react-gsap/notes.md`), GSAP eases unchanged.

## JS shipped
45.7 KB gzipped (117 KB raw) for the route, against 98.6 KB for 02.

## Unfinished
- Nothing for this section.
