# Mango growth cycle — animation brief

Build a looping SVG animation in four phases: **seed → sprout → tree → mango → back to seed**. Use GSAP (DrawSVG, MorphSVG). It must stay vector and stay light, with no frame sequences, no video and no canvas.

Work through the steps in order. **Stop after Step 0 and report back before writing any animation code.**

---

## Files

Put the files in two folders. Two names repeat across the sets ("Mango fruit.svg", and "Mango Tree.svg" vs "Mango tree.svg", which is the same name on Windows), so they must not share a folder. Rename everything to kebab-case.

| Folder | Original file | Rename to | What it is |
| --- | --- | --- | --- |
| `assets/mango/parts/` | Seed.svg | `seed.svg` | Seed with its grooves |
| | root.svg | `root.svg` | Roots only |
| | Sprout.svg | `sprout.svg` | Stem with two leaves |
| | Mango Tree.svg | `tree.svg` | Trunk, branches, leaves, empty ring in the canopy, no fruit |
| | Mango fruit.svg | `fruit.svg` | Mango with its highlight line |
| | Mango fruit leaf.svg | `fruit-leaf.svg` | The single mango leaf |
| `assets/mango/reference/` | Mango seed sprouting.svg | `ref-sprout.svg` | Seed + roots + sprout, assembled |
| | Mango tree.svg | `ref-tree.svg` | Tree with three fruits, assembled |
| | Mango fruit.svg | `ref-fruit.svg` | Mango + leaf, assembled |

The **parts** get animated. The **references** are the target poses: they define where every part sits in each phase. Never render the references in the final page; use them only for alignment and for checking your work.

---

## Step 0 — Inspect and report (no animation code yet)

1. Open every SVG and list, per file:
   - its `viewBox`, every `id`/layer name, and the element types (`path`, `g`, `use`…)
   - whether each shape is a **fill** or a **stroke**
   - how details are built: are the seed grooves, the fruit highlight and the leaf veins holes inside one compound path, or separate paths?
   - the fill colours (the seed, root and sprout use a softer orange than the tree, fruit and leaf; keep both)
2. Map each id to a role in this table and show me the filled-in table:

   | Role | Expected file | id |
   | --- | --- | --- |
   | seed outline | seed.svg | ? |
   | seed grooves | seed.svg | ? (may be holes in the outline) |
   | roots | root.svg | ? |
   | stem + sprout leaves | sprout.svg | ? |
   | tree body (trunk, branches, attached leaves) | tree.svg | ? |
   | loose tree leaves (if any are separate shapes) | tree.svg | ? |
   | fruit outline | fruit.svg | ? |
   | fruit highlight | fruit.svg | ? (may be a hole) |
   | fruit leaf | fruit-leaf.svg | ? |
3. Flag anything that blocks the plan below, e.g. a part merged into another shape, a missing piece, or the fruits in `ref-tree.svg` being a different drawing from `fruit.svg`. Tell me exactly which layer to split or re-export in Figma. **Don't redraw or "clean up" the artwork yourself.**

---

## Step 1 — Build one stage SVG

- Optimise with SVGO but **keep every id and the viewBox** (`cleanupIds: false`). Prefix ids per file (`prefixIds`) so `path1`/`Layer_1` from different files can't collide.
- Combine all parts into **one inline `<svg>`** in a single coordinate system. Inline it in the markup (not `<img>`), so the script can reach the ids.
- **Match the poses exactly.** Give each part the transform that lays it precisely over its counterpart in the reference:
  - `seed`, `root`, `sprout` → `ref-sprout.svg`
  - `tree` + 3 fruits → `ref-tree.svg`
  - `fruit` + `fruit-leaf` → `ref-fruit.svg`

  The parts appear to be exported at the same scale as the references, so this is probably translation only. Find it by rasterising both at the same scale and template-matching (OpenCV), then confirm with a pixel diff. If the parts don't line up cleanly, tell me and I'll export one aligned SVG from Figma.
- **Small fruits:** there's no separate small-fruit file. Reuse `fruit.svg` three times, scaled and rotated to match the three fruits in `ref-tree.svg` (search scale and angle; they're roughly 40% size, tilted a few degrees). The centre fruit sits inside the ring in the canopy.
- **Stacking order:** roots and stem behind the seed; fruits above the tree.
- **Separate the details:** split the seed grooves and the fruit highlight into their own paths, or keep them as holes and draw them as black shapes in a mask. Either way they need to fade on their own while the outline morphs. Outlines must be single subpaths.
- Write the alignment and geometry work as a script (`scripts/mango-build.(py|ts)`) that writes the stage SVG and a small JSON of constants. Re-running it after I update the art should regenerate everything.

---

## Step 2 — Storyboard

One paused master timeline with labels `seed`, `sprout`, `tree`, `mango`, `loop`. The durations are starting values; I'll tune them.

| # | Transition | What happens | Technique | Start duration |
| --- | --- | --- | --- | --- |
| 1 | **Seed** (start) | The seed alone, in the exact pose it has in `ref-sprout.svg`, so nothing jumps when the sprout grows | — | — |
| 2 | **Seed → sprout** | The seed wobbles (about ±4°). Roots grow downward from where they touch the seed; the stem grows up from the seed and the leaves unfold along it. The camera eases out a little to fit the whole sprout | Masked reveal + DrawSVG, camera | 2.6 s |
| 3 | **Sprout → tree** | The camera pulls back while the tree grows from the **ground point** (where the roots meet the seed): trunk first, then out along the branches into the leaves. The sprout shrinks toward the ground point and fades. Loose tree leaves pop in as their branch reaches them. Then the fruits swell from their stems with a small stagger, centre fruit last | Masked reveal + DrawSVG, camera, `back.out` scale | 3.6 s |
| 4 | **Tree → mango** | The camera zooms and turns onto the centre fruit until it stands upright and fills the frame like `ref-fruit.svg`. The rest of the tree and the other fruits fade. The leaf grows from the stem (scale from its base, slight rotation). The hero mango **is** the centre fruit, with no swap | Camera, fade, pivot scale | 2.8 s |
| 5 | **Mango → seed** (loop) | The leaf falls and fades. The highlight fades. MorphSVG turns the mango outline into the seed outline while the fill tweens to the seed's orange, then the grooves fade in. The last frame must match the first frame pixel for pixel, so the cycle loops seamlessly | MorphSVG, colour tween, fade | 2.0 s |

Scale idea for phase 3: in world coordinates, make the tree about **2.4×** larger than the sprout. The camera zoom-out then makes it fill the frame, and that's what sells the growth.

---

## Step 3 — Techniques

### Growth reveal on filled shapes
Roots, stem and tree are fills, and DrawSVG only works on strokes. So:
- Put each growing shape under a `<mask>`. Inside the mask, place **white strokes along the shape's centre lines**, then DrawSVG those strokes `0% → 100%`. Whatever they cover becomes visible.
  ```html
  <mask id="m-stem" maskUnits="userSpaceOnUse" x="…" y="…" width="…" height="…">
    <path class="grow" d="…centre line…" fill="none" stroke="#fff" stroke-width="18" stroke-linecap="round"/>
  </mask>
  <path id="stem" d="…filled stem…" mask="url(#m-stem)"/>
  ```
- **Centre lines:** if the files contain guide strokes (e.g. `root-guide`), use them. Otherwise generate them in the build script:
  1. Rasterise the shape at 4×.
  2. Skeletonise it (scikit-image).
  3. Build a shortest-path tree from the growth start point (roots: the point nearest the seed; stem: its base at the seed; tree: the trunk base).
  4. Emit one path per branch, from its junction to its tip.
  5. Simplify (Ramer–Douglas–Peucker), then smooth (Catmull-Rom → cubic Bézier).
- **Stroke width per branch** = 2 × the largest half-width along that branch (from a distance transform) + a small margin.
- **Constant speed:** each branch's tween starts at *(distance of its junction from the start) / speed* and lasts *length / speed*, with `ease: "none"`. Branches then leave their junction just as the parent passes it. Put these in a paused sub-timeline and tween its `time` from the master with an ease.
- At the end of each growth, fade in a full-size white rect inside the mask to cover any slivers the strokes missed.
- Round caps draw a dot even at `drawSVG: "0%"`, so keep each stroke at `opacity: 0` until its start time.

### Camera
- Wrap everything in `<g id="camera">`. Give each phase a frame `{fx, fy, scale, rotation}` and write the transform as `translate(cx cy) rotate(r) scale(s) translate(-fx -fy)`, where `cx cy` is the stage centre.
- Tween `log(scale)` rather than `scale`, so the zoom speed feels even.
- Compute the frames from bounding boxes. Starting values: the seed fills ~40% of the stage height, the sprout ~75%, the tree ~85%, and the hero mango + leaf ~65%.

### Pivots
- For scale and rotation around a point, write the `transform` attribute yourself from tweened numbers (`translate(px py) rotate() scale() translate(-px -py)`). `svgOrigin` gets confusing inside nested transformed groups.
- Pivots: fruit → top of its stem; fruit leaf → its base; sprout group → the ground point; seed wobble → the seed's centre.

### The loop morph
- The morph target is the seed outline, carried into the fruit's own coordinate space so that, under the mango camera, it lands exactly where the seed appears under the seed camera:
  `target = inverse(treeGroup) · inverse(camera_mango) · camera_seed · seedPlacement`
- Bake that into path data in the build script, and do the same for the grooves. At the end of the loop, `seek("seed")`; the two frames are identical.
- Morph outlines only (single subpaths). Fade the details separately.

### Timeline and controls
- `→` plays to the next label with `tweenTo`. From `mango`: `tweenTo("loop")`, then `seek("seed")`.
- `←` plays to the previous label. From `seed`: `seek("loop")`, then `tweenTo("mango")`, which plays the morph backwards.
- `Space` toggles autoplay, holding about 1 s on each phase. Add a scrubber (range input → `tl.progress()`).
- With `prefers-reduced-motion`, jump between phases instead of tweening.
- `seek()` suppresses callbacks by default, so re-apply any hand-written transforms after every seek.
- Clean up on unmount: kill the timeline and listeners (in the Astro lab, on `astro:before-swap`).

---

## Step 4 — Setup

- GSAP 3.13 or later. All plugins are free, including for commercial use.
  ```ts
  import { gsap } from "gsap";
  import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
  import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
  gsap.registerPlugin(DrawSVGPlugin, MorphSVGPlugin);
  ```
- **Where:** if this repo has the Astro lab described in `AGENTS.md`, add it as a new section: `src/sections/mango-cycle/` with an `.astro` component holding the inline SVG plus `mango-cycle.ts`, registered in the section registry. Otherwise create a standalone page with `npm create vite@latest mango-cycle -- --template vanilla-ts`.
- Plain TypeScript, with no React/Vue/Svelte needed for this section.

---

## Step 5 — Check your work before telling me it's done

1. **Poses:** use Playwright to screenshot the stage at the `sprout`, `tree` and `mango` labels, and diff each against its reference rendered at the same size (pixelmatch). Report the diff percentage per phase.
2. **Loop seam:** the frames at `loop` and `seed` must be identical (diff ≈ 0).
3. **No jumps:** capture a frame every 100 ms through each transition and look for pops, flicker or parts appearing early.
4. **Sizes:** check at 390 px and 1440 px wide. Report the total weight of the inline SVG.
5. **Report:** what you built, the id → role mapping you used, the timings, and anything in the artwork I should fix in Figma.

## Don't
- Don't redraw, simplify or recolour the artwork.
- Don't use raster images, frame sequences, video or Lottie.
- Don't animate the reference files. They're for alignment and checks only.
