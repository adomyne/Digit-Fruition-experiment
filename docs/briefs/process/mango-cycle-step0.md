# Mango cycle brief: Step 0 report

What the nine SVGs actually contain, checked against the mango-cycle brief.
Nothing has been redrawn. The only change so far: the three reference files
had a dark background rectangle and an off-canvas copy of other artwork,
both removed from the copies in `docs/briefs/process/svg/reference/`. The
untouched originals are still in the uploads.

## Per file

| File (brief name) | viewBox | ids | Elements | Fill or stroke | Details | Colour |
| --- | --- | --- | --- | --- | --- | --- |
| seed.svg | 0 0 241 239 | none | 1 path | fill | 4 subpaths: outer outline plus the husk gap and grooves as holes | #FF6201 |
| root.svg | 0 0 180 137 | none | 1 path | fill | 1 subpath | #FF6201 |
| sprout.svg | 0 0 236 237 | none | 1 path | fill | 1 subpath (stem and both leaves, vein lines are notches in the outline) | #FF6201 |
| tree.svg | 0 0 486 561 | none | 3 paths | fill | body: 7 subpaths (canopy ring and leaf veins as holes); 2 loose top leaves, 1 subpath each | #FF6201 |
| fruit.svg | 0 0 213 287 | none | 1 path | fill | 2 subpaths: outline plus the highlight as a hole | #FF6201 |
| fruit-leaf.svg | 0 0 138 64 | none | 1 path | fill | 1 subpath (vein is a notch) | #FF6201 |
| ref-sprout.svg | 0 0 402 586 | `Mango seed sprouting` | 1 path (+ removed off-canvas tree) | fill | seed, roots and sprout fused into one path | #FF6201 |
| ref-tree.svg | 0 0 486 561 | `Mango tree_2`, `leaf1`, `leaf2` | 3 paths in `g#Mango tree` (+ removed off-canvas sprouting) | fill | tree and three fruits fused into one path | #FF6201 |
| ref-fruit.svg | 0 0 335 387 | `Mango`, `Mango leaf` | 2 paths in `g#Mango fruit` | fill | fruit (2 subpaths) and leaf separate | #FF6201 |

There is **no softer orange**: every shape in every file is #FF6201.

## Role map

| Role | File | id |
| --- | --- | --- |
| seed outline | seed.svg | no id; subpath 1 of the only path |
| seed grooves | seed.svg | holes: subpaths 2 to 4 of the same path |
| roots | root.svg | no id; the only path |
| stem + sprout leaves | sprout.svg | no id; the only path (stem and leaves are one shape) |
| tree body | tree.svg | no id; path 1 |
| loose tree leaves | tree.svg | no id; paths 2 and 3 (the two top side leaves; `leaf2`, `leaf1` in ref-tree) |
| fruit outline | fruit.svg | no id; subpath 1 |
| fruit highlight | fruit.svg | hole: subpath 2 |
| fruit leaf | fruit-leaf.svg | no id; the only path |

## Alignment (already measured)

- **ref-sprout:** translation only. seed at (78.76, 219.16), roots at
  (0, 448.94), sprout at (166.39, 0). Roots and sprout match point for point;
  the seed matches visually (its points change where it is fused to the stem).
- **ref-fruit:** translation only, exact. fruit at (19.81, 67.28), leaf at
  (193.42, 32.72).
- **ref-tree:** tree.svg sits at (0, 0). The three fruits are fruit.svg
  scaled and rotated (overlap 96 to 98%): centre (251, 243) at 0.425 and -8°,
  left (122, 335) at 0.435 and -8°, right (370.5, 348.5) at 0.45 and -15°.

## Things that block parts of the plan

1. **No ids anywhere in the parts.** Not a blocker: the build script can
   assign ids by file and path order. Re-exporting from Figma with layer
   names would make it sturdier if the art changes.
2. **Details are holes, not separate paths** (seed grooves, fruit
   highlight, tree veins). They can be split into their own paths by
   cutting the existing subpaths apart, without redrawing anything. If you
   would rather have them as separate layers, re-export seed and fruit from
   Figma with the details as their own shapes.
3. **The sprout is one shape.** Stem and leaves can't unfold separately
   along the stem unless the leaves are separate layers. To get that, split
   `Sprout` into stem, left leaf and right leaf in Figma and re-export.
4. **Tree leaves are mostly fused into the tree body.** Only the two top
   side leaves are loose. "Leaves pop in as their branch reaches them" works
   for those two; the rest can only appear through the growth mask. For
   every leaf to pop on its own, the tree's leaves need to be separate
   layers in Figma.
5. **ref-tree fruits are fused into the tree**, but they are the same
   drawing as fruit.svg, so reusing fruit.svg three times works (numbers
   above).
