# 03 · Hero + Ads + Process · Svelte

**Stack:** Svelte 5 islands + GSAP · **Status:** Hero done (learning-order step 3), Process in progress
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

## Page structure
`Section.astro` is the sandbox root (`data-sandbox`) and the page's scroll
container; it holds the Hero and then the Process section, in landing page
order. Each marks itself with `data-lab-part` (`Hero`, `Process`), so the
registry has no `part`.

## Process (Claude Code, 2026-10-15)
Built from `docs/briefs/process/brief.md`, ported from 02's `Process.tsx`.
Files: `Process.svelte`, `Process.css` (copy of 02's, renamed sandbox),
`processArt.ts` and `assets/process/` (copies of 02's). Same markup,
timeline, timings and numbers as 02, so the two can be compared; see 02's
`notes.md` for how the animation works (continuous growth, no fades,
1.6 s per step, clickable illustration, autoplay every 5 s, idle sway,
roots outgrow the seed into the tree's base).

Svelte specifics:
- `step` and `shown` (the text on screen) are `$state`; the text is a
  `$derived`. Everything GSAP writes stays out of runes.
- The timeline, observer and autoplay live in `onMount` inside one
  `gsap.context`; the returned cleanup reverts it and kills the rest.
- `goTo` is created inside `onMount` and reached through a plain `api`
  object, like 02's ref.
- Clip path ids are `process03-*` so they can't clash with another page.

- Step 4 -> 1 (owner, 2026-10-15) plays forwards, like the mango cycle
  on /8: the camera closes in on the centre mango (turned upright, at the
  seed's step 1 size) while the rest of the tree fades; then the mango's
  outline morphs into the seed's, its highlight fades out and the seed's
  grooves fade in. It lands on step 1's exact frame and the playhead jumps
  back to s1. It takes two steps' time (3.2 s). The morph runs between
  polygons of the two outlines sampled to matching points
  (`morphPolygons` in `processArt.ts`): the seed path has far more curve
  segments than the mango's, so morphing the paths as drawn goes lumpy.
  Here GSAP's MorphSVG tweens between the two polygons, as on 02.
- Idle sway eases out from rest instead of jumping to its first angle.

## Motion spec
Same as 02 (see `../02-hero-react-gsap/notes.md`), GSAP eases unchanged.

## JS shipped
45.7 KB gzipped (117 KB raw) for the route, against 98.6 KB for 02.

Reduced motion: hover and live mode jump straight to their end values instead of tweening.

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
`Ads.svelte`, `Ads.css` (copy of 05's, renamed sandbox), `adsCopy.ts` and
`assets/ads/` (copies). Steps 1, 2, 4, 5 copy is placeholder.
- Svelte 5 + GSAP: same GSAP code as 02 inside `onMount`; elements via
  `bind:this`, the step is `$state`, everything GSAP writes every frame
  stays in plain objects. `onclick` attributes, `style:--i`, keyed `{#each}`.
- Cleanup: `onMount`'s return reverts the context (observer and
  listeners) and kills the turn, the autoplay call and the tweens.
