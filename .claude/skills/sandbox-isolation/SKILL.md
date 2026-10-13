---
name: sandbox-isolation
description: Keeps the Frontend Lab's framework sandboxes from bleeding into each other. Use before editing, generating or reviewing code anywhere under src/sections/, apps/, astro.config.mjs, svelte.config.js, tsconfig.json, package.json or src/registry.ts in this repo, and whenever a task says "rebuild X in Svelte/Vue/vanilla/React", "port the hero", "add a section", "add a Next.js/SvelteKit/Nuxt spike", or compares stacks, even if the user never says "sandbox".
---

# Sandbox isolation

This repo (Frontend Lab) compares stacks by building the same thing several
times. The comparison is only worth something if each version is idiomatic for
its own stack. The risk is that the sections look alike (same markup, same
class names, same chart data, same motion spec), so it is easy to carry a
React habit into the Svelte file, a GSAP ease name into Anime.js, or a Next.js
convention into Astro. This skill exists to stop that.

Read `AGENTS.md` and the target section's `notes.md` first; this skill adds to
them and does not replace them.

## What a "sandbox" is here

This is **not** a monorepo of separate apps. It is one Astro 7 project
(one `package.json`, one `pnpm-lock.yaml`, one `node_modules`, one
`astro.config.mjs`, one `tsconfig.json`). Each sandbox is a section folder
under `src/sections/<NN-name>/`, mounted as one route (`/1`, `/2`, ...) by
`src/pages/[n].astro` from the order in `src/registry.ts`. The isolation is
per route at runtime (every arrow press is a full page load) and per folder
in source, not per package.

`apps/` is reserved for full-framework spikes (Next.js, SvelteKit, Nuxt) with
their own dev servers. Today it holds only a README: there are no apps yet.

Full manifest with versions and per-sandbox idioms:
[references/manifest.md](references/manifest.md). Summary:

| Sandbox | Route | Stack | Animation |
| --- | --- | --- | --- |
| `src/sections/01-static-check` | `/1` | Plain Astro, no island | none |
| `src/sections/02-hero-react-gsap` | `/2` | React 19 island | GSAP 3 |
| `src/sections/03-hero-svelte-gsap` | `/3` | Svelte 5 island (runes) | GSAP 3 |
| `src/sections/04-hero-vue-motion` | `/4` | Vue 3 island (`<script setup>`) | Motion for Vue (`motion-v`) |
| `src/sections/05-hero-vanilla-anime` | `/5` | Astro markup + one bundled `<script>` | Anime.js v4 |
| `apps/` | n/a | Next.js / SvelteKit / Nuxt, none built yet | n/a |

`main` is deployed to GitHub Pages on every push
(`.github/workflows/deploy.yml`) under a `/Digit-Fruition-experiment` base
path. Only the static Astro lab is published; nothing in `apps/` is.

If the manifest and the repo disagree, trust the repo and say so in your
summary. Don't edit the skill's own files as part of a section change; the
manifest is updated in its own change.

## The hard rule

Before editing or generating any code:

1. **Name the sandbox in scope.** Say which folder (and so which route,
   framework and animation library) the change belongs to. Read its
   `Section.astro`, its component file and its `notes.md`, and its
   `src/registry.ts` entry. If the task spans several sandboxes, handle them
   one at a time and re-state the scope when you switch.
2. **Use only that stack's idioms, imports and patterns.** Take them from the
   framework's own conventions and from this sandbox's existing code, never
   from a sibling sandbox, even when the sibling's file looks like a
   line-for-line match. The hero ports deliberately share markup and class
   names; that sameness is exactly what makes copying across them dangerous.
3. **Treat the shared baseline files as shared.** Sections 03-05 import
   `Hero.css`, `chartData.ts` and `assets/` from
   `src/sections/02-hero-react-gsap/` (see "Shared vs isolated" below). An
   edit there changes four routes. Only make it if the task is about all of
   them, and say so.
4. **Never edit another sandbox's folder** as a side effect, and never edit
   files another agent is working on (AGENTS.md lanes rule).
5. **Check before finishing:** run through the contamination checklist below
   for the stack you touched, run `pnpm build` (it runs `astro check`), and
   update the section's `notes.md` and registry `status`.

Porting a feature from one sandbox to another is the one time you read the
sibling's code, and you read it for *behaviour* (what happens, in what order,
with what timings), then write it fresh in the target's idioms. The motion
spec in `02-hero-react-gsap/notes.md` is the shared source of truth for the
hero; port from that table, not from another port.

## Contamination checklist

Each item is something that already differs between sandboxes in this repo.
Check the row for the stack you are writing; the other columns are what *not*
to write.

| Area | 02 React | 03 Svelte 5 | 04 Vue 3 | 05 Vanilla (Astro) | 01 Astro |
| --- | --- | --- | --- | --- | --- |
| Class attr | `className={...}` with template string | `class=` + `class:name={cond}` | `class=` / `:class` | `class:list={[...]}` | `class=` |
| Events | `onClick` (camelCase prop) | `onclick={...}` (Svelte 5 attribute; not `on:click`) | `@click` | `addEventListener` in the `<script>` | none |
| Local state | `useState` / `useRef` | `$state` rune; non-reactive plain objects for values GSAP writes every frame | `ref()`, `useMotionValue` | DOM attributes (`aria-pressed`, text) set by hand | none |
| Element refs | `useRef` + `ref={x}` | `let x` + `bind:this={x}` (not `$state`) | template refs **don't** reach elements wrapped in `motion.*` (you get the component); query from a parent element instead | `root.querySelector` from `[data-hero]` | none |
| Lists | `.map` with `key=` | `{#each items as x (key)}` | `v-for` with `:key` | `.map` in Astro markup (no keys) | `.map` |
| CSS var inline (`--t`) | `tick(t)` helper casting to `CSSProperties` | `style:--t={t}` | `:style="{ '--t': t }"` | `style={{ '--t': t }}` | `style={\`...\`}` string |
| Cleanup | `useEffect` return; one `gsap.context` + `ctx.revert()` | `onMount` return `ctx.revert()`; `$effect` return for live mode | `onUnmounted` stops `animate()` controls, interval, motion-value listener | `astro:before-swap` listener (`{ once: true }`) reverts the Anime `createScope` | none |
| Reduced motion | `gsap.matchMedia()` | `gsap.matchMedia()` | `initial: false` when `matchMedia` says reduce (guarded by `typeof window`) | `createScope({ mediaQueries })` | n/a |
| Island directive | `<Hero client:load />` | `<Hero client:load />` | `<Hero client:load />` | no island; plain `<script>` (bundled, runs once) | none |
| Component import | `import Hero from './Hero'` (no extension) | `'./Hero.svelte'` | `'./Hero.vue'` | n/a | n/a |

### Animation libraries (one per element; record it in the registry)

- **GSAP (02, 03):** string eases (`power3.out`, `back.out(2)`), `from()`
  hides the element immediately, timelines and `matchMedia` inside one
  `gsap.context(..., root)`. Same API in React and Svelte; only the lifecycle
  hook wrapping it differs.
- **Motion for Vue (04):** declarative `motion.*` components with
  `initial`/`animate`/`transition`; eases are cubic-bezier arrays (GSAP names
  are not valid); staggers become explicit per-item delays; line drawing is
  `pathLength`; imperative tweens use `animate()` and return controls you
  must `.stop()`. Import from `motion-v`, not `motion/react` or
  `framer-motion`.
- **Anime.js v4 (05):** named exports (`animate`, `createTimeline`,
  `createScope`, `stagger`, `svg`, `utils`) from `animejs`. The v3 default
  `anime({...})` / `anime.timeline()` API is wrong here. Ease names differ
  (GSAP `power3.out` is `outQuart`, `back.out(n)` is `outBack(n)`). There is
  no `from()`-style hide on the first frame: set start states up front with
  `utils.set`. Draw lines with `svg.createDrawable`.
- **Motion has no Svelte package.** A Svelte sandbox uses GSAP, Anime.js,
  Svelte transitions or Motion's vanilla `animate()`.
- Registry `animation` values: `'none' | 'gsap' | 'motion' | 'motion-v' |
  'animejs' | 'svelte-transition'`. Extend the union in `src/registry.ts`
  rather than writing a free-form string.

### Rendering and hydration (SSR behaviour)

Output is static (`astro build`, `getStaticPaths` in `[n].astro`); there is
no server runtime, no API routes, no data fetching. Islands still render on
the server at build time, and that is where the stacks differ:

- **02 and 03** server-render the hero fully drawn, then GSAP hides and
  replays it on hydration (a brief flash).
- **04** server-renders Motion's initial (hidden) state. To avoid a blank page
  if the island never hydrates, its `Section.astro` has an `is:global` CSS
  fallback keyed on `astro-island[ssr]`. Copying that fallback into a GSAP
  section would fight GSAP; leaving it out of a new Motion section ships a
  blank page without JS.
- **05** has no hydration at all: markup is static Astro and the `<script>`
  is a Vite-bundled module that runs once per page. It is not
  `is:inline`; only the shell uses `is:inline define:vars`.
- If a library breaks during SSR, use `client:only="react|svelte|vue"`
  (AGENTS.md); don't add `typeof window` checks to a sibling that doesn't
  need them.

### Routing

- Sections are **not** routes and contain no pages. The only routes are
  `src/pages/index.astro` (redirects to `/1`) and `src/pages/[n].astro`.
  A section's URL number is its position in `src/registry.ts`; reordering the
  array renumbers routes.
- Each sandbox's entry point must be `src/sections/<id>/Section.astro`
  (picked up by `import.meta.glob` in `[n].astro`), with `<id>` equal to the
  registry `id`.
- No client-side routers in sections. Next.js App Router folders, SvelteKit
  `+page.svelte`/`load`, and Nuxt `pages/` belong only inside an `apps/<name>/`
  spike, linked from the registry with `appUrl`.
- The deployed lab lives under a base path (`/Digit-Fruition-experiment/` on
  GitHub Pages; `/` locally). Build internal links from
  `import.meta.env.BASE_URL` like the shell does, and reference files through
  imports (`?url`), never root-relative strings like `/2` or `/assets/x.png`;
  those work in `pnpm dev` and break on Pages. Hero links are `#top`
  placeholders.
- `[n].astro` currently requires a `Section.astro` for every registry entry,
  including ones with `appUrl`; an app entry needs that handled (a stub
  `Section.astro` that frames the app, or an `appUrl` branch in `[n].astro`).

### Imports, aliases, assets

- There are **no path aliases** (`tsconfig.json` has no `paths`). Use relative
  imports. `@/...` or `~/...` from Next/Nuxt habits will not resolve.
- Assets are imported with Vite's `?url` suffix
  (`import dfLogo from './assets/df-logo.png?url'`), not `next/image`,
  `astro:assets` `<Image>`, or `public/` paths.
- Fonts are imported once in the sandbox's `Section.astro`
  (`import '@fontsource-variable/manrope'`), not inside the island component.

### Styling

- All values come from `src/styles/tokens.css` (imported by the shell, so
  every route has it). No raw hex or pixel spacing in sections; no Tailwind
  classes (CLAUDE.md), even though Figma MCP output is React + Tailwind.
- The hero ports share one global BEM stylesheet (`02/Hero.css`, classes like
  `.hero__metric--accent`). Svelte and Vue sections don't add scoped
  `<style>` blocks for those classes; 01 uses an Astro scoped `<style>`, and
  04 uses `<style is:global>` only for its hydration fallback.
- `Hero.css` comment: the animation library owns `transform` and `opacity` on
  animated elements; CSS only handles hover colours. Keep it that way in every
  port.
- Each section scrolls inside its own container (`.hero` has
  `overflow-y: auto`; the stage is `overflow: hidden`). ScrollTrigger needs
  `scroller` pointed at it.

### Env vars and data

- Sections read no env vars today; only the shell and `index.astro` read
  `import.meta.env.BASE_URL`. `astro.config.mjs` is the one place that reads
  `process.env` (`LAB_BASE`, set by the deploy workflow). `.env` is gitignored.
- A var needed on the live site must also be passed to `pnpm build` in
  `.github/workflows/deploy.yml`. Values are inlined at build time (static
  output), so a change needs a redeploy, not a restart.
- Read a var once, in the sandbox's `Section.astro`, and hand it to the
  island as a prop in that framework's own way (React props, Svelte
  `$props()`, Vue `defineProps`), rather than adding a module every island
  imports. A shared module is a new cross-sandbox dependency; add one only
  when the task says the sandboxes should share it, and say so.
- If a section ever needs one: Astro exposes only `PUBLIC_`-prefixed vars to
  client code via `import.meta.env`. Don't reach for `process.env`,
  `NEXT_PUBLIC_`, `NUXT_PUBLIC_`/`useRuntimeConfig`, or SvelteKit's
  `$env/static/public` in `src/`; those belong to their `apps/` spike only.
- Data is static TypeScript (`02/chartData.ts`). No `fetch` in components,
  no `getServerSideProps`, no `load` functions, no Astro endpoints.

### TypeScript and JSX

- `tsconfig.json` extends `astro/tsconfigs/strict` and sets
  `jsx: react-jsx` with `jsxImportSource: react` **globally**. Every `.tsx`
  file compiles as React. Adding Preact, Solid or Vue JSX would need per-file
  pragmas or integration `include` patterns; Vue and Svelte SFCs are
  unaffected because they use their own compilers.
- Svelte uses `<script lang="ts">`, Vue `<script setup lang="ts">`; Svelte 5
  runes (`$state`, `$effect`), never Svelte 4 `export let` / `$:` / stores
  for new code.

## Shared vs isolated

**Shared across every sandbox (repo root, one copy):**
`package.json`, `pnpm-lock.yaml`, `node_modules`, `astro.config.mjs`
(`integrations: [react(), svelte(), vue()]`, `site`, `base`),
`svelte.config.js` (`vitePreprocess()`), `tsconfig.json`,
`.github/workflows/deploy.yml`, `src/registry.ts`,
`src/layouts/LabShell.astro`, `src/pages/`, `src/styles/tokens.css`,
`src/styles/shell.css`.

**De-facto shared (lives in one sandbox, imported by others):**
`src/sections/02-hero-react-gsap/Hero.css`, `chartData.ts`, `assets/`, used
by 03, 04 and 05 so only the framework differs. Changing them is a four-route
change; regressions show up on routes you didn't open.

**Isolated per sandbox:** everything else in the section folder: the
component file, `Section.astro`, `notes.md`, `frame.png`, its own scoped
styles and any island-only helpers. A new helper belongs in the folder that
uses it; don't move one into 02 or a shared folder unless every user is
updated in the same change.

**Isolated per app (future `apps/`):** each spike gets its own
`package.json`, lockfile, config and dev server. Don't add Next/Nuxt/SvelteKit
packages to the root `package.json`, don't add a pnpm workspace that hoists
`apps/*` into the lab's `node_modules` unless that's the explicit task, and
don't import from `src/` into an app (copy tokens if needed and note it).
Setup gotchas a Next.js spike ran into here (check them against the version
you install):

- Add `apps` to the root `tsconfig.json` `exclude`, or `astro check` (and so
  `pnpm build`) type-checks the app and fails.
- Next looks upward for a lockfile and may take the lab's `pnpm-lock.yaml` as
  its workspace root; pin the root to the app folder in `next.config`.
- `next dev` can write its own `AGENTS.md` into the app. The lab keeps one
  rules file at the root; turn that off or delete the generated file.
- Write the app in its framework's own idioms (Next: App Router, server
  components by default, `'use client'` only where needed, `next/font`,
  `next/image`). Copying 02's island in with `'use client'` on top measures
  React-in-Next, not Next, and say which you did in `notes.md`.
- Apps aren't part of the Pages deploy. A registry `appUrl` pointing at
  `localhost` shows nothing on the live lab; note that in the section's
  `notes.md` until the app is hosted.

Dependency rules that follow from the single `package.json`:

- Add a framework with `pnpm astro add react|svelte|vue` (it edits the
  shared `astro.config.mjs`); add an animation library with `pnpm add`.
  Only when a section actually needs it (AGENTS.md).
- A version bump of a shared package (e.g. `gsap`) moves every sandbox that
  uses it (02 and 03 for GSAP). Re-check those routes and note it.
- `astro` is pinned exactly (`7.3.8`); other deps use `^`. Keep that unless
  asked.
- Don't add a second copy of a library under a different name (e.g.
  `framer-motion` next to `motion-v`, or `animejs@3`) to suit one section.

## Comparison rubric

Since the point of the repo is comparing stacks, when you build or change an
equivalent feature in more than one sandbox, record these in each section's
`notes.md` (and in the PR description when it spans sandboxes). Details and how
to measure: [references/comparison-rubric.md](references/comparison-rubric.md).

- **JS shipped per route** (gzipped): `pnpm build`, then
  `node .claude/skills/sandbox-isolation/scripts/route-js.mjs`.
- **No-JS / SSR behaviour:** what the route shows before or without
  hydration.
- **Motion fidelity:** how the shared motion spec translated (ease names,
  staggers, approximations).
- **Cleanup surface:** what had to be torn down and how.
- **DX notes:** anything that fought you (refs on motion components, SSR
  guards, missing packages), and lines of component code.
- **Visual parity:** settled page at 1440px against 02's screenshot.
