# 06 · Landing reference

**Built by:** Claude Code
**Stack:** plain Astro, no islands, no animation
**Figma:** frame 60:159 ("Hero", the whole 1440 x 9063 page),
https://www.figma.com/design/1mAbYyy2SEhAwcMuZqXBNL/Digit-Fruition?node-id=60-159

## What it is
The polished landing page recreated at 1440px as the visual baseline for
every stack experiment. It replaced the 06 placeholder skeleton (the folder
was `06-landing-skeleton`).

## Structure and isolation
- `Section.astro`: the `.landing` scroll container (`data-sandbox`), imports
  Manrope Variable once, mounts the parts in page order.
- `parts/*.astro`: one file per landing section. Each has its own scoped
  `<style>`; its root sets font, colour, background and box-sizing from
  `tokens.css` and carries `data-lab-part` (names from `src/landing.ts`).
  No part inherits styles from another or from `Section.astro`.
- One-off Figma geometry is in rem with the px value commented. Shared values
  (type styles, shadows, widths, colours) were added to `tokens.css`.
- `assets/`: Figma exports. SVGs imported with `?url`; raster images were
  converted to WebP once (the repo has no `sharp`, so `astro:assets` can't
  optimise at build time; adding it would touch `package.json`).

## Figma nodes (one get_design_context call each)
| Part | Node | Size |
| --- | --- | --- |
| Menu | 142:1074 | 1400 x 64, at x 20 |
| Hero headline | 142:1118 | 1440 x 251 |
| Hero dashboard + CTA | 214:222 | 1044 x 608 |
| Ads (Services Section) | 142:1216 | 1440 x 831 |
| Audits | 142:1233 | 1440 x 910.6 |
| Process | 142:1274 | 1440 x 903.2 |
| About us (Values and Partners) | 142:1298 | 1440 x 780 |
| Results heading + pile | 142:1466 | 1440 x 826.5 |
| Results numbers (impact poster) | 142:1469 | 1440 x 1000 |
| Case studies (Latest news) | 142:1503 | 1440 x 715 |
| Testimonials | 142:1589 | 1440 x 681.7 |
| Form & FAQ (Quick answers FAQ) | 142:1606 | 1440 x 627 |
| Logo | 142:1695 | 1440 x 600 |
| Footer | 142:1697 | 1441 x 153.2 |

`get_design_context` on 60:159 returns only sparse metadata (too big), which
is how the child ids above were found. `download_assets` on the Page frame
(142:1116) exports the whole page, capped at 4096px tall (651 x 4096).

## Checked against Figma
Full-page screenshot at 1440 compared section by section with the Figma
export (upscaled to 1440). Section heights match within 1px except where
noted below. Hero, Ads, Process and the Results numbers differ in under 3%
of pixels (anti-aliasing and the upscaled export).

## Design decisions (owner's answers, 2026-10-15)
Where these differ from Figma, the build follows the decision.
1. Form and FAQ stay one block, "Form & FAQ"; Results covers the pile and
   the numbers poster.
2. Value cards keep whole words (Figma breaks "Outsourc / ing"). The title
   uses the card's side padding and is 20px instead of 21px, the only
   way "Communication" fits the 154px card whole.
3. Form labels are dark (Figma: white on white) and the privacy shield is
   white on the orange circle (`shield-check-white.svg`, Figma: orange).
4. Manrope everywhere: Figma's Arimo (form) and Neue Montreal (CTA, form
   buttons) are not loaded.
5. Only the 1440 layout exists; narrower windows scroll sideways.
6. Ads shows one service (3, Streaming TV); the full section is planned in
   its own brief.
7. Testimonials heading uses the 50px H2 (Figma: 44.65px).

## Known differences
- The footer text box is 112px tall in Figma but holds six lines, so the
  last line hangs below the 153px footer. Kept as in Figma.
- A stray "Line 18" (60:230) and a hidden "Sales 250.000,00" label sit on
  the frame outside the Page frame; not built.

## Unfinished
- No hover or motion spec yet; each compared section (Hero, Process,
  Results) gets a brief first.
- Form fields, FAQ rows, tabs and buttons are real elements but do nothing.

## Environment note
`astro preview` in Astro 7 runs as a background daemon on port 4329 and
refuses a second instance on another port; reuse it (`astro preview stop`
ends it).
