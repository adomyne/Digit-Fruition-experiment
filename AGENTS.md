# Frontend Lab: agent rules

Single source of rules for every agent working here (Claude Code, Gemini in
Antigravity, `agy`). Read this, then the target section's `notes.md`, before
starting.

## Stack
- Astro 7 (Vite under the hood), TypeScript strict, pnpm, Node 22.12+.
- Framework islands: React, Svelte 5, Vue 3, added per section as needed
  with `pnpm astro add react|svelte|vue`. Not installed until a section needs one.
- Animation: GSAP, Anime.js v4, Motion (`motion/react`, formerly Framer Motion), Motion for Vue (`motion-v`).
  Motion has no Svelte package: Svelte sections use GSAP, Anime.js, Svelte
  transitions or Motion's vanilla `animate()`.
- 3D: Three.js (`three`), installed at the root so any section can use it.
- Design input: Figma through the Figma MCP server. No Anima.
- Full frameworks (Next.js, SvelteKit, Nuxt) live in `apps/`, never in `src/`.
  `apps/next/` is a Next.js 16 spike with its own `package.json` and lockfile.

## Layout
```
src/
  registry.ts            ordered list of sections (id, title, stack, animation, figma, status)
  layouts/LabShell.astro  ← / → and swipe navigation, corner label, imports tokens
  pages/[n].astro         one route per registry entry (/1, /2, ...)
  styles/tokens.css       design tokens as CSS custom properties
  styles/shell.css        shell chrome only
  sections/<NN-name>/
    Section.astro         entry point; mounts the island, if any
    *.tsx|*.svelte|*.vue  the experiment component
    notes.md              what was built, by which agent, what's unfinished, motion spec
    frame.png             1x Figma export of the frame (when there is one)
apps/                     Next.js / SvelteKit / Nuxt spikes with their own dev servers
```

## Adding a section
1. Append an entry to `src/registry.ts`. Its position is its URL number.
2. Create `src/sections/<id>/Section.astro` (id must match the registry) and `notes.md`.
3. Mount islands with `client:load`; use `client:only="<framework>"` if a library breaks in SSR.

## Naming
- Section folders: two-digit order prefix + kebab-case, e.g. `03-hero-svelte-gsap`.
- Components: PascalCase (`Hero.tsx`, `Hero.svelte`, `Hero.vue`).
- Registry `id` = folder name.

## Tokens
- All colors, type, spacing, radius and motion values come from `src/styles/tokens.css`.
  No raw hex values or pixel spacing in sections.
- `tokens.css` is generated from Figma variables (via Figma MCP in Claude Code).
  Keep variable names stable; change values, not names.
- The shell imports `tokens.css`, so every island on every route gets it.

## Rules
- **One animation library per element.** Two libraries on the same `transform`
  fight. Pick one per section and record it in the registry.
- **Cleanup rule.** Every animation, ScrollTrigger, observer, timer and listener a
  section creates must be killed on unmount (React effect cleanup, Svelte
  `onDestroy`/`$effect` return, Vue `onUnmounted`, `gsap.context().revert()`).
  Navigation is full page loads today; once Astro view transitions are added,
  plain scripts also clean up on `astro:before-swap`.
- **Scroll sections** scroll inside their own container (the stage is
  `overflow: hidden`); point ScrollTrigger's `scroller` at that container.
- **Horizontal drag/swipe inside a section**: add `data-lab-noswipe` to the
  element so the shell's swipe navigation ignores it.
- **Lanes.** One agent per branch or worktree per experiment. Never edit files
  another agent is working on. The human merges. Review is done by the agent
  that didn't write the code.
- **Reverse-engineered sections** are private study: rebuild from a written spec,
  never paste the source site's code, images, fonts or copy. Note the source in `notes.md`.
- Before finishing: update the section's `notes.md` and its registry `status`,
  and run `pnpm build` (runs `astro check`).

## Commands
- `pnpm dev`: dev server at http://localhost:4321 (redirects to `/1`)
- `pnpm build`: type-check and build to `dist/`
- `pnpm preview`: serve the build
