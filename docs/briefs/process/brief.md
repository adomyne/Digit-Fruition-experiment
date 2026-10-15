# Process section brief (DRAFT)

Status: **draft v2**, with the owner's answers of 2026-10-15 (see "Decisions").
Every stack rebuild of the Process section follows this file. Where a stack
can't do something here, it says so in its own `notes.md` instead of
quietly doing something else.

## What the section is

A card with four parts, laid out like the `/6` reference
(`src/sections/06-landing-reference/parts/Process.astro`, Figma 142:1274):

1. **Header:** the section title ("The Process").
2. **Illustration:** one vector scene that changes with the step.
3. **Stepper:** the timeline bar with four numbered circles (1 to 4).
4. **Body:** the active step's title, paragraph and "Read more" link.

Picking a step on the stepper does two things at the same time: the
illustration animates to that step's scene, and the body text changes to
that step's copy. All copy is lorem ipsum.

## The four steps

| Step | Name | What the illustration shows |
| --- | --- | --- |
| 1 | Seed | The mango seed, alone, resting on a thin ground line. |
| 2 | Growing seed | Roots grow down out of the seed and a sproutling grows up out of it (match `reference/seed-sprouting.svg`). |
| 3 | Tree | The sproutling grows into the fruitless tree (`parts/tree.svg`). The seed and roots sink below the ground line and fade. |
| 4 | Tree with fruits | Mangoes grow on the branches (match `reference/tree-with-mangoes.svg`). |

**Thumbnail** (the picture shown before anyone touches the stepper):
the seed, an arrow, and a mango, side by side ("this seed becomes this
fruit"). It is the opening state only: it shows until the first step
plays (by itself or by a click) and never comes back. In it no stepper
circle is active.

## How the illustration is built

All artwork is in `docs/briefs/process/svg/` (see the overview image
`overview.png`). Every file is one or a few **filled** shapes in the brand
orange, not lines. That decides the technique:

- **Growing = revealing + scaling, not drawing.** A shape "grows" by a mask
  or `clip-path` that uncovers it (roots: top to bottom, sprout and tree:
  bottom to top) combined with a scale from its base (set the
  `transform-origin` at the stem or trunk base). Leaves and mangoes pop in
  one by one with a small overshoot, scaling from where they attach.
- **One scene, fixed frame.** Everything lives in a single inline `<svg>`
  with one `viewBox` that never changes size on the page, so the card
  never jumps. Each part is a `<g>` placed with a transform.
- **Camera pull-back.** The seed is drawn much bigger than it would be
  next to a tree. Steps 1 and 2 are framed close; from step 2 to 3 the
  whole scene scales down and moves so the tree fits (one transform on a
  wrapper group, animated with the rest).
- **Mangoes on the tree.** In `reference/tree-with-mangoes.svg` the
  mangoes are fused into the tree shape, so they can't be animated on their
  own. Build step 4 as `parts/tree.svg` plus three copies of
  `parts/mango.svg` (scaled to about 35 x 90 units of the tree's 486 x 561
  frame), placed to match the reference: one inside the heart-shaped gap in
  the middle (around x 250, y 205) and one hanging under each side branch
  (around x 121, y 294 and x 375, y 305). Line them up by laying the
  reference over the build at 30% opacity, then remove the overlay.
- **Colour.** Inline the SVG markup, replace `fill="#FF6201"` with
  `fill="currentColor"`, and set `color: var(--color-accent)` on the
  scene. No raw hex values in the section.
- **Ground line and arrow** are the only new artwork: a thin line in a
  token colour for the ground, and for the thumbnail a copy of
  `06-landing-reference/assets/arrow-right-orange.svg`.

### Assets

| File | Use |
| --- | --- |
| `svg/parts/seed.svg` | Steps 1 to 2, the thumbnail |
| `svg/parts/roots.svg` | Step 2 (grows down from the seed's lower tip) |
| `svg/parts/sprout.svg` | Step 2 (grows up from the seed's upper tip) |
| `svg/parts/tree.svg` | Steps 3 to 4 (3 shapes: the tree, plus two top leaves that can pop in last) |
| `svg/parts/mango.svg` | Step 4 (three copies), the thumbnail |
| `svg/parts/mango-leaf.svg` | Optional: a leaf on a hanging mango |
| `svg/reference/seed-sprouting.svg` | Target look for step 2 (not used directly) |
| `svg/reference/tree-with-mangoes.svg` | Target look for step 4 (not used directly) |
| `svg/reference/mango-with-leaf.svg` | Target look for a mango with its leaf |

The three reference files came from Figma with a dark background
rectangle and leftover artwork off the edge of the canvas; both were
removed. Copy the files you need into your section's own `assets/`
folder (sections never import from `docs/` or from each other).

## Motion

- Each step change takes about 1.2 s (`--ease-out` easing), with parts
  staggered so it reads as growth, not a slide show.
- The body text cross-fades (out, swap, in) during the first half of the
  illustration change. The text box has a fixed height so nothing below
  it moves.
- **Going back** plays the change in reverse (the tree shrinks back into
  the sprout). **Skipping** (1 to 4) runs through the steps in between at
  double speed.
- **Clicking mid-animation** takes over at once from wherever the
  animation is; clicks never queue up.
- **Reduced motion** (`prefers-reduced-motion`): no growth, just a quick
  cross-fade between finished scenes.
- **Idle:** once a step has finished, a gentle loop keeps it alive: leaves
  sway a few degrees, and in step 4 the mangoes swing slightly from their
  stems. Small, slow (several seconds per cycle), out of sync between
  parts, and stopped under reduced motion and while the section is off
  screen.

## Stepper behaviour

- **Clicks drive it, never scrolling.**
- **Autoplay:** when the section scrolls into view it leaves the thumbnail
  and plays step 1, then moves to the next step every 5 s, and after step
  4 starts over at step 1. The first click, tap or key press on the
  stepper stops autoplay for good. Autoplay pauses while the section is
  off screen.

- The four circles are real `<button>`s: click, tap, Tab plus Enter or
  Space, and the left and right arrow keys move between steps.
- The active step has `aria-current="step"` and the filled circle style
  from the reference; the bar between circles can fill up to the active
  step.
- The illustration has an accessible label per step (e.g. "Step 2: the
  seed grows roots and a sprout"), announced when it changes.
- The stepper sits inside `data-lab-noswipe` so the lab's swipe
  navigation doesn't fire on it.

## Rules for every stack (the "don'ts")

1. **Artwork:** only the SVGs in this folder plus the ground line and
   arrow. No new drawings, no traced or AI-generated images, no PNG, GIF,
   video or Lottie version of the illustration.
2. **No line drawing on these shapes.** `stroke-dashoffset` "draw-on"
   effects trace the outline of a filled shape and look wrong here.
3. **No shape morphing** from one drawing into another (seed into tree).
   The shapes have different point counts, and only some libraries can
   morph, which would make the stack comparison unfair.
4. **One animation library per section**, the one in the registry. No
   CSS transitions on the same properties the library animates, and no
   extra animation packages.
5. **No new npm packages** without asking the owner.
6. **Tokens only:** colours, type, spacing and timing from `tokens.css`;
   no raw hex values or pixel spacing (`pnpm check:sandboxes` enforces it).
7. **Sandbox rules** from AGENTS.md: section root has `data-sandbox`,
   assets are copied in, nothing imported from another section or from
   `docs/`.
8. **No scroll hijacking** and no autoplay that keeps going after the
   user has picked a step.
9. **No layout jumps:** the illustration frame and the text box keep the
   same size on every step.
10. **Cleanup:** every timeline, tween, observer, timer and listener is
    removed when the section unmounts.
11. **Copy:** lorem ipsum only. No invented marketing claims, numbers or
    client names.
12. **Don't touch** the `/6` reference, the Hero sections, `tokens.css`
    names or the shell.

## Where the rebuilds go

No new pages. Each stack already has its page, and the Process section
goes **on that page, below its Hero**, in the landing page order from
`docs/site-structure.md` (the same structure the `/6` reference and the
old skeleton follow):

| Route | Folder | Stack | Animation |
| --- | --- | --- | --- |
| /2 | `02-hero-react-gsap` | React | GSAP |
| /3 | `03-hero-svelte-gsap` | Svelte | GSAP |
| /4 | `04-hero-vue-motion` | Vue | Motion for Vue |
| /5 | `05-hero-vanilla-anime` | Vanilla | Anime.js v4 |

- Process uses the page's own framework and animation library, the one
  already in the registry (one library per section).
- Layout and sizes come from the `/6` Process part
  (`06-landing-reference/parts/Process.astro`), copied in, not imported.
- With two landing sections the page now scrolls inside its own
  container. So the Hero and Process roots each carry
  `data-lab-part` ("Hero", "Process") and the registry `part` is removed
  from that entry (sandbox-isolation skill, "Section tag").
- Each page's `notes.md` gets a Process part: what was easy, what was hard
  and what it couldn't match.
- The Three.js page (/7) is not part of this comparison.
- **Each stack works on its own.** No shared helper file, component or
  animation script that several pages use; each page builds the scene,
  stepper and motion with its own framework and library. Copying the SVG
  files in is the only thing they share.

## Decisions (owner, 2026-10-15)

1. Thumbnail is the opening state only.
2. The stepper advances on its own until the visitor clicks.
3. Clicks, not scrolling.
4. Gentle idle motion after a step: yes.
5. Camera pull-back between steps 2 and 3: yes.
6. Step titles are lorem ipsum for now.
7. No new pages; Process goes into each stack's existing page.
8. Stacks: the four Hero pages, /2 to /5, each built independently with
   its own tools.
