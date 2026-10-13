# 06 · Landing skeleton

**Built by:** Claude Code
**Stack:** plain Astro, no islands, no animation

## What it is
The landing page's 11 sections, in the order from
[docs/site-structure.md](../../../docs/site-structure.md), as plain labelled
blocks in one scroll container. Each block has `data-lab-part="<name>"`, which
drives the section tag in the info bar: as a block is pushed off the top of
the viewport, its name is pushed out of the tag by the same amount.

## Section tag convention
- Scrolling sections: put `data-lab-part="<name>"` on each landing section's
  root, inside the section's scroll container. The shell finds the scroll
  container itself.
- One-screen sections: set `part` in the registry entry instead.
- Sections with neither show no tag.
- Every page's info bar also lists all 11 names from `src/landing.ts` and
  lights the section on screen (split between two while one pushes the
  other out). Names in `data-lab-part` and `part` must match that list.

## Unfinished
- Placeholder blocks only. Swap each block for the real section as it is
  built; keep the `data-lab-part` attribute on its root.
