# Comparison rubric

Record these whenever an equivalent feature exists, or is being built, in more
than one sandbox. Put the numbers in each section's `notes.md` and a one-line
table in the PR description. Measure on the same build, same machine.

| Criterion | How to measure | Where it goes |
| --- | --- | --- |
| JS shipped per route | `pnpm build`, then `node .claude/skills/sandbox-isolation/scripts/route-js.mjs [n ...]` (gzipped and raw, entry scripts plus static imports) | `notes.md` "JS shipped" |
| No-JS / SSR state | Load the built route with JS disabled (`pnpm preview`, browser or Playwright `javaScriptEnabled: false`); screenshot | `notes.md`, plus any fallback you added |
| Hydration flash | Does the server HTML show the end state then replay (02, 03), the start state (04), or no hydration at all (05)? | `notes.md` |
| Motion fidelity | Map each line of the motion spec; list eases or staggers that had to be approximated | `notes.md` "Motion spec" |
| Cleanup surface | List everything created (timelines, intervals, listeners, motion values) and what kills it | `notes.md` bullets |
| Visual parity | Settled page at 1440px against `02-hero-react-gsap` (or `frame.png`) | PR description |
| Code size / DX | `wc -l` of the component file(s); what fought you | `notes.md` |
| Dependencies added | Packages added to the shared `package.json` and what else they affect | PR description |

Baseline numbers for the hero (PR #2's branch, measured with the script):

| Route | Stack | JS gzip | Component lines |
| --- | --- | --- | --- |
| `/2` | React + GSAP | 98.8 KB | 264 (`Hero.tsx`) |
| `/3` | Svelte 5 + GSAP | 45.9 KB | 231 (`Hero.svelte`) |
| `/4` | Vue 3 + motion-v | 76.3 KB | 286 (`Hero.vue`) + 28 (`Section.astro` fallback) |
| `/5` | Vanilla + Anime.js v4 | 17.9 KB | 251 (`Section.astro`) |

The shell's own navigation script is `is:inline` and not counted by the
script; it is the same on every route.
