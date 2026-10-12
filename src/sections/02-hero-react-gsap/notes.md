# 02 · Hero (baseline)

**Stack:** React island + GSAP · **Status:** in progress (learning-order step 2)

**Figma:** [Digit Fruition, node 60:159](https://www.figma.com/design/1mAbYyy2SEhAwcMuZqXBNL/Digit-Fruition?node-id=60-159)

## Spec
To fill in from the Figma frame. Motion spec per element: trigger, duration,
easing, delay, stagger. Every later hero version (Svelte, Vue, vanilla) is
built from this same spec and judged against this baseline.

## Unfinished
- React integration and GSAP are installed; the hero itself is not built yet.
- Blocked on reading the frame: the cloud sandbox's Figma connector here has no
  `get_design_context` / `get_variable_defs`, and its network policy denies
  www.figma.com, so asset and export URLs can't be downloaded. Needs either
  www.figma.com allowed in the environment, or a 1x PNG export of the frame
  saved as `frame.png` in this folder.
