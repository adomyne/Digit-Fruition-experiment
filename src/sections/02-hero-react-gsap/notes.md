# 02 · Hero (baseline)

**Stack:** React island + GSAP · **Status:** in progress (learning-order step 2)
**Built by:** Claude Code (cloud), from the Figma MCP server.

**Figma:** [Digit Fruition, node 60:159](https://www.figma.com/design/1mAbYyy2SEhAwcMuZqXBNL/Digit-Fruition?node-id=60-159)
(hero layers: Menu `142:1074`, Hero Content `142:1118`, Performance Dashboard `142:1135`)

## What's built
- Header: logo, five-tab nav (active tab has a 3px light-orange bar), EN
  selector, dark "Get a Free Audit" button.
- Brand row (logo + H1 "PPC Agency", Manrope Medium 67/80), subtitle
  (Manrope Medium 21/24 at 90%), orange "Book a Discovery Call" CTA.
- Dashboard: four metric cards (Sales bar dark orange, ACOS bar light
  orange), the Sales/ACOS chart, date row, "Live mode" toggle, closing copy.
- Colors, type, spacing and sizes come from `get_variable_defs` and
  `get_design_context` on the frame; `tokens.css` notes the Figma variable
  name next to each value. Measured against the frame at 1440px: every block
  lands within 2px of its Figma y position.
- Chart axes: Figma spaces the labels evenly over 310px (57.2px steps) while
  the gridlines are 53.4px apart, so the upper labels drifted off their lines.
  Here labels and gridlines share one box and one tick scale, so each label
  is centred on its line. The plot keeps Figma's 33px headroom above the 25
  line so the Sales line can overshoot it as in the frame.

## Motion spec (GSAP, one timeline, `power3.out` unless noted)
| Element | Start | Duration | Notes |
| --- | --- | --- | --- |
| Logo, nav, header actions | 0 | 0.6 | y -16 → 0, fade, stagger 0.08 |
| Amazon word | 0.15 | 0.8 | y 28 → 0, fade |
| Smile stroke | 0.55 | 0.7 | draw on, `power2.inOut` |
| "PPC", "Agency" | 0.3 | 0.8 | y 28 → 0, stagger 0.08 |
| Subtitle | 0.6 | 0.7 | y 16 → 0 |
| CTA | 0.75 | 0.6 | y 12, scale 0.96 → 1, `back.out(2)` |
| Metric cards | 0.9 | 0.5 | y 16 → 0, stagger 0.06 |
| Axis labels, dates | 1.0 | 0.4 | fade, stagger 0.02 |
| Chart lines | 1.05 | 1.6 | stroke draw, `power2.inOut`, stagger 0.15 |
| Live mode, closing copy | 2.2 | 0.6 | y 12 → 0, stagger 0.1 |
| Guide line | 2.3 | 0.5 | scaleY from the baseline |
| Dot | 2.5 | 0.5 | scale 0 → 1, `back.out(3)` |

Hover: the guide and dot follow the pointer along the ACOS line (0.35s) and
settle back on Dec 2 on leave (0.6s). Live mode re-noises both series every
1.4s with a 1.1s `sine.inOut` morph. Reduced motion skips the intro timeline.

## Unfinished
- **Assets are stand-ins.** The cloud environment's network policy denies
  www.figma.com, so the MCP asset URLs can't be downloaded. Still drawn here:
  the DF logo (PNG, node `142:1077`), the Amazon logo (SVG, node `142:1121`),
  and the globe, chevron, download, info and phone icons. Once www.figma.com
  is allowed, download them into this folder and swap them in.
- **Neue Montreal** (nav, buttons, metric cards, dates) is a licensed font
  and isn't in the repo; Inter stands in, which makes the CTA about 24px wider
  than in Figma. Manrope is installed from Fontsource.
- The chart is a single vector in Figma, so the series in `chartData.ts` are
  traced from it rather than read as data.
- No `frame.png` yet (same download block).
