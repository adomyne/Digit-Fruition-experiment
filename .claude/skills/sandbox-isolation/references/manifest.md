# Sandbox manifest

Surveyed 2026-10-13 from `main` at a8c34c9 (PRs #2, #3 and #5 merged) and PR #6's branch at 63aa72f (07 and `apps/next`, not merged yet). Versions are the ones the lockfile
resolves. Re-survey if the repo has moved on; the repo wins over this file.

## Shared lab (repo root)

- **Framework:** Astro 7.3.8 (pinned), Vite under the hood, static output.
- **Language:** TypeScript 6.0.3, `astro/tsconfigs/strict`, global
  `jsx: react-jsx` / `jsxImportSource: react`. No `paths` aliases.
- **Tooling:** pnpm 10.28.0 (`packageManager`), Node >= 22.12. One
  `package.json`, one lockfile, no pnpm workspace. `pnpm build` =
  `astro check && astro build`.
- **Integrations** (`astro.config.mjs`): `react(), svelte(), vue()`, plus
  `site: 'https://adomyne.github.io'` and `base: process.env.LAB_BASE ?? '/'`.
  `svelte.config.js` only sets `vitePreprocess()`.
- **Deploy:** `.github/workflows/deploy.yml` builds on every push to `main`
  with `LAB_BASE=/Digit-Fruition-experiment` and publishes `dist/` to GitHub
  Pages. Only the Astro lab is published.
- **Routing:** `src/pages/index.astro` meta-refreshes to `/1`;
  `src/pages/[n].astro` builds one static page per `src/registry.ts` entry and
  loads `../sections/<id>/Section.astro` via `import.meta.glob` (eager).
- **Shell:** `src/layouts/LabShell.astro` imports `tokens.css` and
  `shell.css`, renders `.lab-stage` (`position: fixed; overflow: hidden`) and
  the corner label (with the section tag, see SKILL.md), and handles ← / → and swipe with an `is:inline
  define:vars` script doing full page loads (`location.assign`). Elements with
  `data-lab-noswipe` opt out of swipe. Prefetches prev/next.
- **Tokens:** `src/styles/tokens.css`, generated from Figma variables
  (comments name the Figma variable). Names are stable; values change.
- **Fonts:** `@fontsource-variable/manrope` (imported per section),
  `@fontsource-variable/inter` (installed, unused by current sections).

## 01-static-check (`/1`), on main

- **Stack:** plain Astro component, no island, no client JS of its own.
- **Animation:** none.
- **Routing:** route 1 by registry position.
- **Styling:** Astro scoped `<style>` in `Section.astro`, tokens only; a
  token specimen (color and spacing swatches via inline `style` strings).
- **Deps:** none beyond the shell.
- **Gotchas:** it is the token specimen; regenerate tokens and check it.
  Scrolls inside itself (`height: 100%; overflow-y: auto`).

## 02-hero-react-gsap (`/2`), on main: the baseline

- **Stack:** React 19.3.0 island (`@astrojs/react` 7.0.1), `Hero.tsx`
  mounted with `<Hero client:load />`.
- **Animation:** GSAP 3.15.0. One `gsap.context` per effect, `gsap.matchMedia`
  for reduced motion, `ctx.revert()` in the `useEffect` cleanup. Live mode
  runs in a second effect keyed on `live` that clears its interval and kills
  its tween.
- **Styling:** `Hero.css`, a global BEM sheet (`.hero__*`), imported by the
  component. Tokens only. The animation library owns transform/opacity.
- **Data:** `chartData.ts` (static series from Figma node 142:1188, axis
  ticks, metrics, `toPath`, `valueAt`).
- **Assets:** `assets/*.svg|png` imported with `?url`.
- **Reference:** `frame.png` (1x Figma export), Figma node 60:159.
- **Gotchas:** `Hero.css`, `chartData.ts` and `assets/` are imported by
  03, 04 and 05; treat them as shared. `notes.md` holds
  the motion spec table every port follows. JSX uses `className`, a `tick()`
  helper casting `{ '--t': t }` to `CSSProperties`, and an extensionless
  `import Hero from './Hero'`.

## 03-hero-svelte-gsap (`/3`), on main

- **Stack:** Svelte 5.57.2 with runes (`@astrojs/svelte` 9.0.1),
  `Hero.svelte`, `<script lang="ts">`, `<Hero client:load />`.
- **Animation:** GSAP 3.15.0, same timeline code as 02 inside `onMount`
  (returns `ctx.revert`). Live mode in an `$effect` keyed on the `live` rune;
  its return kills the interval and tween.
- **Styling:** imports `../02-hero-react-gsap/Hero.css`; no scoped `<style>`.
- **Idioms:** `bind:this` on plain `let` refs; series and highlight are
  plain objects (not `$state`) because GSAP writes them every frame;
  `onclick={...}` attribute events; `class:name={cond}`; `style:--t={t}`;
  keyed `{#each}`.
- **Gotchas:** Svelte 4 syntax (`on:click`, `export let`, `$:`) is wrong
  here. No Motion package for Svelte.

## 04-hero-vue-motion (`/4`), on main

- **Stack:** Vue 3.5.44 (`@astrojs/vue` 7.0.3), `Hero.vue` with
  `<script setup lang="ts">`, `<Hero client:load />`.
- **Animation:** Motion for Vue, `motion-v` 2.7.0. Declarative `motion.*`
  components with `initial`/`animate`/`transition` built by small helpers
  (`enter`, `fade`, `pop`, `draw`); cubic-bezier eases (`EASE` map);
  `pathLength` line drawing; `useMotionValue` + `animate()` for hover;
  `animate(0, 1, { onUpdate })` per live tick in a `watch` on `live`.
  `onUnmounted` stops everything and unsubscribes the motion value.
- **Styling:** imports 02's `Hero.css`; `Section.astro` adds an
  `<style is:global>` no-JS fallback keyed on `astro-island[ssr]`.
- **Gotchas:** template refs on `motion.*` give the component, not the
  element, so guide/dot are found with `querySelector` from the plot.
  Motion SSRs the hidden start state (hence the fallback). Reduced motion is
  `initial: false`, guarded by `typeof window`. GSAP `back.out(n)` has no exact
  bezier; approximations are listed in `notes.md`.

## 05-hero-vanilla-anime (`/5`), on main

- **Stack:** no UI framework. `Section.astro` renders the markup at build
  time; one processed `<script>` (Vite-bundled module, runs once) animates it.
- **Animation:** Anime.js 4.5.0 named exports. One `createTimeline` inside a
  `createScope({ root, mediaQueries })`; `utils.set` for start states;
  `svg.createDrawable` for lines; hover via `animate()` on a plain object
  with `composition: 'replace'`.
- **Styling:** imports 02's `Hero.css`; uses `class:list` and
  `style={{ '--t': t }}` in Astro markup.
- **Cleanup:** an `astro:before-swap` listener (`{ once: true }`) reverts the
  scope, stops live mode and removes listeners. Today navigation is full page
  loads, so unload does the work.
- **Gotchas:** live-mode button state (`aria-pressed`, label) is set by hand.
  Anime ease names differ from GSAP's (`outQuart` = `power3.out`).

## 06-landing-skeleton (`/6`), on main, in progress

- **Stack:** plain Astro component, no island, no client JS of its own.
- **Animation:** none.
- **What it is:** the 11 landing page sections from `docs/site-structure.md`
  (Hero, Ads, Audits, Process, About us, Results, Case studies, Testimonials,
  Form, Logo, Footer) as placeholder blocks in one `.skeleton` scroll
  container. Each block's root carries `data-lab-part="<name>"`, which drives
  the shell's section tag as you scroll.
- **Styling:** Astro scoped `<style>`, tokens only; `class:list` for the short
  Logo and Footer blocks.
- **Gotchas:** real sections replace the blocks one by one and must keep
  `data-lab-part` on their root. The registry entry has no `part`, because the
  tag comes from the markup here (the heroes do the opposite).

## 07-three-react-motion (`/7`), pending merge (PR #6), in progress

- **Stack:** React 19 island (`Scene.tsx`) mounted with
  `client:only="react"`, plus Three.js 0.186 (`three`, `@types/three`).
- **Animation:** Three.js's own `renderer.setAnimationLoop` spins a torus
  knot inside the canvas; Motion for React (`motion` 14.2, imported from
  `motion/react`) fades the title and subtitle in with the hero's
  `power3.out` bezier. One library per element.
- **Styling:** `Scene.css` (`.three-stage`, `.three-canvas`, `.three-copy`,
  ...), imported by both `Section.astro` and `Scene.tsx` so the island and the
  `slot="fallback"` copy look the same. Tokens only; mesh colours are read from
  CSS variables with `getComputedStyle` at runtime.
- **Cleanup:** the effect return stops the loop, disconnects the
  `ResizeObserver` and disposes geometry, material and renderer.
- **Registry:** `stack: 'react'`, `animation: 'motion'`, no `figma`, no
  `part`.
- **Gotchas:** WebGL needs `client:only` plus a fallback slot; `useReducedMotion`
  from `motion/react` gates both the loop and the copy intro. The near-copy in
  `apps/next/app/Scene.tsx` differs in `'use client'`, class names and the
  token import; don't sync one from the other by copy-paste.

## apps/next, pending merge (PR #6)

- **Stack:** Next.js 16.4.0 (pinned), App Router, React 19, Turbopack. Own
  `package.json` (`lab-next`), `pnpm-lock.yaml`, `tsconfig.json` (with an
  `@/*` path alias) and `.gitignore`.
- **Routing:** `app/layout.tsx` (root layout, imports `./tokens.css` and
  `./globals.css`), `app/page.tsx` (server component rendering `<Scene />`),
  `app/Scene.tsx` (`'use client'`, Three.js icosahedron + Motion copy).
  `/` and `/_not-found` prerender as static.
- **Styling:** plain global CSS in `app/globals.css` (`.stage`, `.canvas`,
  `.copy`, `.title`, `.sub`) and `app/tokens.css`, a copy of the lab's tokens
  ("re-copy when the lab's tokens change").
- **Deps:** `next`, `react`, `react-dom`, `three`, `motion` installed in the
  app only; separate from the root even where the names match.
- **Running:** `cd apps/next && pnpm install && pnpm dev` (port 3000). Not
  in the lab registry, not in the Pages deploy.
- **Gotchas:** `next build` warns about two lockfiles and picks the lab root
  as the Turbopack workspace root; set `turbopack.root`. The root
  `tsconfig.json` excludes `apps` so the lab's type check skips it.

## apps/ (other frameworks)

- `apps/README.md` reserves it for Next.js, SvelteKit and Nuxt spikes that
  can't be Astro islands. Each runs its own dev server; a registry entry's
  `appUrl` points at it. The registry `Stack` union includes
  `'nextjs' | 'sveltekit' | 'nuxt'`. No SvelteKit or Nuxt app exists yet.
