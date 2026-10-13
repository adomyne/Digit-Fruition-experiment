---
name: efficient-execution
description: Cuts wasted tool calls and token spend while working in this Frontend Lab repo (Astro 7 with React, Svelte, Vue and vanilla section sandboxes, Figma MCP hero, GitHub Pages deploy). Use at the start of any coding, porting, Figma-to-code, review, eval or PR task here, and whenever about to re-read a file, rewrite a component, grep the repo, call Figma get_design_context, run pnpm build, start a preview server or take screenshots, even if the user never mentions cost or efficiency.
---

# Efficient execution

Five earlier sessions on this repo cost about $34 in total. Most of the waste
was not in the code that shipped. It was in context that was loaded once and
then paid for on every later request, and in checks or dead ends that were
repeated. Evidence and numbers: [references/past-sessions.md](references/past-sessions.md).

This skill is about cost. `sandbox-isolation` (in `.claude/skills/`) is about
keeping each sandbox idiomatic, and its manifest already says where every
piece of code lives. Use it for "where is X" and "which idiom is right"; use
this one for "how do I get there with the fewest, smallest calls". When the
two seem to pull apart, correctness wins: never skip a read that
sandbox-isolation requires (the target section's `Section.astro`, component,
`notes.md` and registry entry). Read them once, in one batch.

## Why context size is the main cost here

Every byte that enters the conversation (a file you read, a tool result, a
PNG) is re-sent on every later model call in that session. A 50 KB read at
the start of a 40-call turn costs roughly forty times its size. So:

- the cheapest read is the one you don't need, and the next cheapest is a
  slice (`Read` with `offset`/`limit`, `sed -n 120,180p`, `rg -n`);
- a big result early in a long session is far worse than the same result
  near the end;
- after a long idle gap (overnight), the whole context is re-cached at full
  price. A quick status question on a huge old thread cost $1.54; one PNG
  export cost $2.28. For new work on a stale, heavy thread, suggest a fresh
  thread with a short handoff instead.

## 1. Reading: once, and only the part you need

- **Don't re-read a file you just wrote or edited.** The Edit/Write result
  already confirms it. Don't re-read a file you read earlier in the session
  unless something else changed it (a build tool, a merge, another agent).
- **Map before you read big files.** The hero components are 230 to 290 lines
  (`Hero.tsx`, `Hero.svelte`, `Hero.vue`, `05/Section.astro`) and
  each port's `Hero.css` is about 360. Run
  `node .claude/skills/efficient-execution/scripts/outline.mjs <files>` to get
  line numbers for script blocks, hooks, `hero__*` elements, CSS selectors or
  markdown headings, then read just that range.
- **Look things up instead of reading:**
  - a CSS class: `rg -n "hero__metric" src/sections/02-hero-react-gsap/Hero.css`
  - a token: `rg -n -- "--space-" src/styles/tokens.css` (tokens.css also
    names the Figma variable next to each value, so you rarely need
    `get_variable_defs` again)
  - a motion timing: the "Motion spec" table in `02-hero-react-gsap/notes.md`
    (outline gives its line range). Port from that table, as
    sandbox-isolation says, not from another port's code.
- **Never read** `pnpm-lock.yaml` (147 KB), `dist/`, `node_modules/` or
  `.astro/`. To check a version: `pnpm why gsap` or
  `rg -n '"gsap"' package.json`.
- **Skill files:** read this SKILL.md and sandbox-isolation's once per
  session. Open their `references/` files only when the step needs them.
- **Saved tool output** (`tool-results/*.txt` after an output was too big):
  `rg` or `sed -n` into it; don't Read the whole file back in.
- **Images:** every PNG you Read stays in context (150 to 250 KB each). Look
  at one screenshot at the size you need, not a series. `frame.png` in 02 is
  the reference; read it at most once per session.

## 2. Figma MCP: target the node, fetch once

The hero frame **60:159 is the whole 1440 x 10740 landing page**. One
`get_design_context` on it returned 54 KB, and its three hero children added
150 KB more (Dashboard 142:1135 alone was 97 KB). All of it stayed in context
for a 39-call build turn.

- Ask for the smallest node that answers the question. Known hero nodes:
  Menu `142:1074`, Hero Content `142:1118`, Performance Dashboard
  `142:1135`, chart vector `142:1188`. Later landing sections (Ads, Audits,
  Process...; order in `docs/site-structure.md`) are other children of
  60:159: use `get_metadata` on 60:159 once to list child node ids (small
  output), then call `get_design_context` per child, one at a time, as each
  part is built.
- Call each node once per session. Write what you took from it (sizes,
  colours, node ids) into the section's `notes.md` as you go, so the next
  session reads 20 lines of notes instead of 100 KB of Figma output.
- Prefer `get_screenshot` of a child node over reading `frame.png` again,
  and skip both if the notes already give the measurement.
- The Figma output is React + Tailwind reference. Translate it straight into
  the target sandbox's file (see sandbox-isolation); don't write the Tailwind
  version to disk first and then rewrite it.
- **If the Figma tools aren't in the tool list, stop after one ToolSearch.**
  They only load when a session starts. Tell the user to start a new thread
  (one line), and don't build from a PNG guess in the meantime: that guess
  cost $2.29 and was thrown away the same evening.
- Asset downloads to `figma.com` URLs are fetched through the proxy. If one
  returns 403, read the network docs once and ask the user; don't retry.

## 3. Edits, not rewrites

- **Patch with Edit.** Use Write only for a new file or when more than about
  half the file really changes. A wrong-idiom fix (say `on:click` to
  `onclick` in Svelte 5, a GSAP ease name in Anime.js, `className` in Vue) is
  a one-line Edit, even when the same slip appears several times: use one
  Edit per spot or `replace_all`, never a regenerate.
- **Porting the hero to another stack** is the one time a whole new file is
  right. Write it once, then fix review findings and build errors with Edit.
- **No shared section files.** Each hero port (02-05) has its own `Hero.css`,
  `chartData.ts` and `assets/`; a change to one reaches one route. Change the
  one rule you need in the section you're working on.
- **Repeated PR descriptions:** only update a PR body when its content
  changed, not on every push.

## 4. Batch and remember

- Put independent calls in one message: the reads for a task (component,
  `Section.astro`, `notes.md`, registry entry) together; `git status`,
  `git log` and `git diff --stat` in one Bash call; several `rg` patterns in
  one `rg -n -e a -e b`.
- Don't repeat a search you already ran this session; scroll up. If you
  expect to need a result again (route numbers, node ids, class names),
  write it into your status checklist or a scratchpad note.
- Several sandboxes, same change? Do the reads for all of them in one batch,
  make the Edits, then run **one** check at the end, not one per sandbox.

## 5. Scope the search

Don't sweep the repo; sandbox-isolation's manifest already says what lives
where.

- Section code: `src/sections/<NN-name>/` only. Shell: `src/layouts/`,
  `src/pages/`, `src/styles/`. Route order: `src/registry.ts`.
- Which routes a change touches: `node .claude/skills/efficient-execution/scripts/verify.mjs`
  prints them (it knows 03 to 05 import 02's shared files).
- When you do need a search, use `rg` (it skips `.gitignore`d `node_modules`,
  `dist`, `.astro`) and give it a path: `rg -n "createScope" src/sections`.
  `apps/next/` (and any later spike) has its own `node_modules` and build
  output (`.next`, `.svelte-kit`, `.nuxt`); keep apps out of lab searches with
  a path, and keep lab paths out of app searches. The root `tsconfig.json`
  excludes `apps/`, so `pnpm check` never type-checks them; check an app with
  its own `pnpm build` inside its folder.

## 6. Verification ladder: the narrowest check first

Measured in this container: `pnpm check` (astro check) about 12 s,
`pnpm astro build` about 5 s, `pnpm build` (both) about 14 s,
`pnpm install` about 25 s. Builds are cheap in seconds; what costs is running
them after every edit and pasting their full output into context.

| What changed | Check |
| --- | --- |
| `notes.md`, docs, `.claude/`, `frame.png` | none |
| CSS only | `pnpm astro build` (catches broken imports) |
| `.ts`/`.tsx`/`.svelte`/`.vue`/`.astro` | `pnpm check`, once after the batch of edits |
| `package.json`, lockfile | `pnpm install`, then `pnpm check` |
| Config, shell, registry | `pnpm build`, then check every route's arrows |
| Before committing | `pnpm build` once (AGENTS.md requires it) |
| Visual parity | screenshots, at most once per change set (below) |

`node .claude/skills/efficient-execution/scripts/verify.mjs --run` picks and
runs the cheapest row for your actual changes and prints only the result and
any errors. `--final` runs `pnpm build`.

**Screenshots:** don't start a dev server, shoot, edit, restart, shoot again.
After `pnpm build`, shoot all affected routes in one run:
`node .claude/skills/efficient-execution/scripts/shoot.mjs --out <scratchpad>/shots 2 3 4 5`.
It starts `astro preview`, shoots at 1440 x 900, and stops the server by PID.
Save into the scratchpad, never inside the repo (a `shots/` folder was
committed by accident once). Then Read only the one image you need.

**Comparison rubric numbers** (JS per route): measure once at the end with
sandbox-isolation's `route-js.mjs`, not after every change.

## 7. Known dead ends in this environment

Each of these cost a retry or a whole turn before. Skip straight to the fix.

| Trap | What happens | Do instead |
| --- | --- | --- |
| `pkill -f "astro preview"; git commit` | the pattern matches your own shell, so the shell is killed (exit 144) and the commit never runs. Happened 6 times in 5 sessions | `pkill -f "[a]stro preview"` in its own Bash call, or kill by PID; `shoot.mjs` does this for you |
| Polling `adomyne.github.io` with curl | proxy returns `000`; a 30-try loop wasted 5 minutes | ask the GitHub Actions run status (`actions_get` / `actions_list`) |
| Requesting a review from `adomyne` on their own PR | GitHub refuses (author can't review) | skip the reviewer step if the call fails once |
| `merge_pull_request` with a short SHA | rejected | pass the full 40-character SHA (`git rev-parse HEAD`) |
| Publishing `dist/` as an Artifact | paths starting with `_` (Astro's `_astro/`) are rejected; inline scripts need care | rename the assets folder at publish time, and check inline scripts before the first publish, not after |
| Importing `playwright` from the repo | not installed in the repo | use the global install (`npm root -g`), as `shoot.mjs` does |
| A tool name without its prefix (`update_status`) | fails | use the full `mcp__…` name |
| Figma tools missing / proxy 403 / GitHub not linked | won't fix itself mid-session | say so once, then stop or work on something else |
| `ReadNotifications` when nothing is pending | returned 15 to 27 KB of stale task text | call it only when a notice says something is pending |

## 8. Subagents and skill evals

The sandbox-isolation eval spent about $9.60 on 12 subagents, each running its
own `pnpm install` (25 in total), 45 builds and the same source reads, plus
14 wake-ups that only said "no reply needed".

- Start a subagent only for work that is truly parallel. Hand it the facts it
  needs (file paths, line ranges, the motion table) in the prompt so it
  doesn't re-discover them.
- For a skill eval: 2 to 3 prompts, with and without the skill, is enough to
  start. Install once and share the checkout with worktrees; tell agents not
  to build unless the check needs a build. Run the next round only if the
  first one showed a real difference worth chasing.
- Prefer one agent that runs the prompts in sequence over many background
  agents whose every hand-back wakes the main session.

## Before you finish

- Did you run `pnpm build` exactly once at the end (not after each edit)?
- Are screenshots and scratch files outside the repo?
- Did what you learned (node ids, measurements, a new dead end) go into the
  section's `notes.md`, so the next session doesn't pay to rediscover it? A
  new environment dead end belongs in the table above, in its own change.
