---
name: lane-check
description: Declares this agent's lane and warns about collisions with other agents' open branches in the Frontend Lab repo before any code is written. Use at the start of every task in this repo (before the first edit), before each push, and before opening a PR.
---

# Lane check

Several agents (Claude Code threads, Gemini in Antigravity, `agy`) work on
this repo at once, one branch each. AGENTS.md says never edit files another
agent is working on, but an agent can't see that unless it looks. This skill
is how it looks. It only detects and asks: it never resolves a collision on
its own.

## When to run it

1. **At the start of every task, before the first edit.** The lane card
   below is your first output in the conversation, before any code.
2. **Before every push**, using the files you actually changed.
3. **Before opening a PR**, the same way.

## Step 1: run the check

Pass the files and folders you plan to edit; the script adds whatever the
branch has already changed.

```sh
.claude/skills/lane-check/scripts/lane-check.sh src/sections/07-ads-svelte/ src/registry.ts
```

It fetches `origin`, compares your files with every branch that has work not
yet on `main`, and exits 1 if it finds a collision. It is read-only.

What counts as a collision:

| Kind | Test |
| --- | --- |
| Same file | a file is in both lists |
| Textual conflict | `git merge-tree` says the branches conflict |
| Structure vs section | one branch changes a structure file and the other a section (`src/sections/`, `apps/`), even with no shared file |

Structure files: `docs/site-structure.md`, `src/registry.ts`,
`src/layouts/`, `src/styles/shell.css`, `src/styles/tokens.css`,
`src/pages/`, `AGENTS.md`, `CLAUDE.md`, `astro.config.mjs`, `package.json`,
`pnpm-lock.yaml`, `tsconfig.json`.

"Structure vs section" exists because a section can be written against an
order, name, token or registry shape that the other branch is changing. Git
merges both cleanly and the result is still wrong.

## Step 2: post the lane card

Before writing any code, post this as your first message, filled in from the
script's output:

```
Lane: <branch>
Directory: <the folder this task lives in, e.g. src/sections/07-ads-svelte/>
Also touches: <shared files, e.g. src/registry.ts, or "nothing shared">
Other open lanes: <N>
Collision: none
```

If there is a collision, replace the last line with one block per colliding
branch:

```
Collision with <branch> (<PR link if one exists>): <kind>
  Files: <overlapping files, or their structure files for structure vs section>
```

## Step 3: if there is a collision, ask before coding

Stop before editing the overlapping files and ask the user to choose, with
one option recommended:

- **Wait:** let the other branch merge first, then start from the new `main`.
  Recommend this when the other branch changes structure.
- **Proceed:** keep going and resolve the conflict when the second PR merges.
  Recommend this when the overlap is a small append, such as two new
  registry entries.
- **Split:** move the shared change into its own small PR that merges first.

In a Claude project thread, ask with a decision card if one is available,
otherwise in one short message. Work on files that don't overlap while you
wait. Never edit, rebase or push another agent's branch to clear a collision.

Before a push or PR, re-run the script. If a new collision appears, post an
updated lane card and ask again; if not, a one-line "Lane check: clear" is
enough.
