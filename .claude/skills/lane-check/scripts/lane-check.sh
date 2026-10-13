#!/usr/bin/env bash
# Lane check: compares this branch's files with every other branch that has
# work not yet on main. Usage:
#   .claude/skills/lane-check/scripts/lane-check.sh [planned-file ...]
# Planned files are paths you are about to edit (before the first edit).
# Exit code 0 = no collision, 1 = collision found. Read-only: it never edits,
# rebases or pushes anything.
set -euo pipefail

git fetch --quiet --prune origin
ME=$(git rev-parse --abbrev-ref HEAD)

STRUCTURE='^(docs/site-structure\.md|src/registry\.ts|src/layouts/|src/styles/(shell|tokens)\.css|src/pages/|AGENTS\.md|CLAUDE\.md|astro\.config\.mjs|package\.json|pnpm-lock\.yaml|tsconfig\.json)'
SECTION='^(src/sections/|apps/)'

mine=$(
  { git diff --name-only origin/main...HEAD
    git diff --name-only
    git diff --name-only --cached
    git ls-files --others --exclude-standard
    printf '%s\n' "$@"
  } | sed '/^$/d' | sort -u
)

echo "Lane: $ME"
echo "Files: $(echo "$mine" | grep -c . || true)"
echo "$mine" | sed 's/^/  /'

found=0
for b in $(git branch -r --no-merged origin/main | sed 's/^ *//' | grep -v -e '->' -e "^origin/$ME$"); do
  theirs=$(git diff --name-only origin/main..."$b" | sort -u)
  [ -z "$theirs" ] && continue
  kinds=()
  shared=$(comm -12 <(echo "$mine") <(echo "$theirs"))
  [ -n "$shared" ] && kinds+=("same file")
  if ! git merge-tree --write-tree --name-only HEAD "$b" >/dev/null 2>&1; then kinds+=("textual conflict"); fi
  if { echo "$mine" | grep -Eq "$STRUCTURE" && echo "$theirs" | grep -Eq "$SECTION"; } ||
     { echo "$theirs" | grep -Eq "$STRUCTURE" && echo "$mine" | grep -Eq "$SECTION"; }; then
    kinds+=("structure vs section")
  fi
  if [ ${#kinds[@]} -gt 0 ]; then
    found=1
    echo
    echo "COLLISION with $b: $(printf '%s, ' "${kinds[@]}" | sed 's/, $//')"
    [ -n "$shared" ] && echo "$shared" | sed 's/^/  shared: /'
    echo "$theirs" | grep -E "$STRUCTURE" | sed 's/^/  their structure file: /' || true
  else
    echo
    echo "Clear: $b"
  fi
done

[ $found -eq 0 ] && echo && echo "No collisions."
exit $found
