# 08 · Mango cycle (GSAP)

**Built by:** Claude Code, 2026-10-15
**Stack:** plain Astro + TypeScript, GSAP 3.15 with DrawSVG and MorphSVG
**Brief:** `docs/briefs/process/mango-cycle-brief.md` (Step 0 report:
`docs/briefs/process/mango-cycle-step0.md`)

## What it is
A looping showcase of the Process illustration: seed → sprout → tree →
mango → back to the seed. It sits beside the stack comparison (the stepper
version of Process lives on /2 to /5) and uses GSAP-only plugins, so it is
not part of the fair comparison.

## Files
- `assets/parts/`, `assets/reference/`: the art, renamed as in the brief.
  The references are only used for alignment and checks, never rendered.
- `scripts/mango-build.py` (repo root): aligns the parts, finds the growth
  centre lines and writes `stage.svg` and `constants.json`. Re-run it after
  the art changes: `python3 -m pip install scikit-image svgelements`, then
  `python3 scripts/mango-build.py`.
- `stage.svg`: the generated inline stage (46 KB), inlined by
  `Section.astro` with `set:html`.
- `mango-cycle.ts`: the timeline and controls. `mango-cycle.css`: layout.

## Geometry (from the build script)
- World units = ref-sprout units. seed at (78.76, 219.16), roots at
  (0, 448.94), sprout at (166.39, 0): translation only, matched point for
  point against ref-sprout.
- Tree: tree.svg at 2.4x, its trunk base (241, 525) on the ground point
  (where the roots leave the seed, world (110, 449)).
- Fruits: fruit.svg three times, fitted to ref-tree (96 to 98% overlap).
  The hero is the centre fruit; its leaf sits at (173.61, -34.56) in fruit
  units, from ref-fruit (exact translation).
- Seed grooves and the fruit highlight are holes in the art. They are
  split out and drawn as black shapes in a mask, so they fade on their own
  while the outline morphs.
- The loop morph target is the seed outline carried into the hero fruit's
  units (inverse hero, inverse mango camera, seed camera, seed placement),
  checked in the script.

## Growth
Roots, stem and tree grow through masks: white strokes along each branch's
skeleton centre line (scikit-image), drawn with DrawSVG at constant speed,
each starting when the front reaches its junction. Stroke width = 2 x the
branch's widest half-width + 3. A white rect fades in at the end to cover
slivers. Root 5 branches, sprout 7, tree 23.

## Timeline
Labels `seed`, `sprout`, `tree`, `mango`, `loop`; transitions 2.6, 3.6,
2.8 and 2.0 s (the brief's starting values). Camera frames: seed 40% of the
stage height, sprout 75%, tree 85%, mango + leaf 65%, turned 8° so the
mango stands upright. The camera tweens log(scale) and is re-applied after
every seek.

Where the brief was silent:
- Phase 3: the seed shrinks into the ground point with the sprout, and the
  roots draw back into it while the tree's own root flares grow out.
- The fruit leaf only exists in phase 4 and 5; ref-tree's fruits have none.

## Controls (owner, 2026-10-15)
A four-step stepper (Seed, Sprout, Tree, Mango) under the stage, like an
auto-slider; no scrubber.
- Autoplay holds `HOLD` = 2 s on each step, then moves on; Mango wraps
  back to Seed through the morph. Pause / Play stops and resumes it.
- Every move takes `TRAVEL` = 1 s, however many steps it crosses: clicking
  Tree from Seed plays sprout and tree growth sped up to fit 1 s. Going to
  an earlier step plays backwards. A click mid-move takes over from where
  the playhead is.
- The transitions are authored at 2.6 / 3.6 / 2.8 / 2.0 s, so one step
  plays 2 to 3.6 times faster than authored. Both numbers are constants at
  the top of `mango-cycle.ts`.
- The focus ring and the orange fill follow the playhead (the timeline's
  `onUpdate` writes `--pos`, 0 to 3, on the stepper); during the loop morph
  they glide from Mango back to Seed.
- Keys while focus is inside: → next step, ← previous (from Seed it plays
  the morph backwards to Mango), Space pauses or plays.
- Reduced motion jumps between finished steps instead of travelling.

## Checks (Playwright, 612px stage)
- Pose diff vs the references, orange pixels: sprout 0.35%, tree 1.15%,
  mango 1.25%.
- Loop seam: the `loop` and `seed` frames are the same picture; 1% of
  pixels differ, all on anti-aliased edges (different transform chains).
- Frames every 200 ms through all transitions: no pops or early parts.
  The trunk's wide stroke reveals it as a short stump before the branches
  grow.
- 390px and 1440px wide both fit.

## Unfinished
- SVGO isn't in the repo, so the stage is written compact by the script
  instead (adding SVGO means a new package).
- Art fixes that would help (see the Step 0 report): sprout stem and leaves
  as separate layers; tree leaves as separate layers.
