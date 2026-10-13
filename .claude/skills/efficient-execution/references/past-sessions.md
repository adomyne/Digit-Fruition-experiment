# Where the spend went in earlier sessions

Audited 2026-10-13 from the transcripts of the five sessions that built this
repo. Costs are each session's cumulative total. Call counts are approximate.
"Est." marks an inference.

| Session | Work | Cost | Tool calls |
| --- | --- | --- | --- |
| Lab shell | Astro shell, registry, tokens, route 1 | $1.51 | ~33 |
| Hero, first attempt | hero from a PNG while Figma tools were missing | $5.92 | ~66 |
| Hero from Figma data | route 2 from Figma MCP, PR #1 | $7.70 | ~99 |
| Other stacks + Pages | routes 3 to 5, GitHub Pages deploy | $7.51 | ~119 |
| sandbox-isolation skill | skill plus two eval rounds | $11.86+ | ~80 + ~149 in subagents |

## Ranked by estimated cost

1. **Large context carried through long turns.**
   - Figma design context: about 208 KB in total.
     - Frame 60:159 returned 54 KB.
     - Its children 142:1074, 142:1118 and 142:1135 returned 21, 36 and 97 KB.
   - 50 KB or more of baseline source was dumped with `cat` at the start of ports.
   - Notification reads returned 15 to 27 KB, seven times.
   - Each of these was re-sent on every later call in its turn.
2. **Eval fan-out.**
   - 12 subagents each ran their own install, builds and source reads.
   - 14 hand-back wakes did nothing but end the turn.
   - Together about $9.60.
3. **Throwaway work while a tool was missing.**
   - A PNG-sampled hero cost $2.29 and was replaced by Figma data the same evening.
   - Three more small turns just confirmed the Figma tools still weren't loaded.
   - 9 ToolSearch calls hunted for them.
4. **Cold-cache wakes on heavy threads.**
   - A next-morning status answer cost $1.54.
   - A next-day `frame.png` export cost $2.28 (est. most of it re-caching).
5. **Build and screenshot loops.**
   - The port turn ran 9 builds, 7 Playwright runs, 6 preview starts and 6 PNG reads (about 1 MB of base64).
   - The eval agents ran 45 builds.
6. **`pkill -f` killing its own shell (exit 144).**
   - Happened 6 times in all five sessions.
   - Each time needed a status check and a re-commit.
7. **Environment dead ends retried.**
   - Figma asset downloads got 403 from the proxy.
   - A 30-try curl loop polled github.io (5 min 12 s).
   - GitHub wasn't linked yet.
8. **Small API errors repeated across sessions.**
   - A review was requested from the PR's own author.
   - A merge was sent a short SHA.
   - The `_astro/` Artifact path was rejected.
   - A tool was called without its `mcp__` prefix.
   - The full PR body was resent on every push.

## What went well (keep doing it)

- The lab shell session stayed lean: 3 builds and 2 screenshots.
- The ports were built from the 02 baseline and its motion table, not from
  Figma again. That avoided another 200 KB of design context per stack.
