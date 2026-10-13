#!/usr/bin/env node
// Picks the cheapest check that covers what changed, and which lab routes
// those changes reach. Run from the repo root.
//   node .claude/skills/efficient-execution/scripts/verify.mjs          # advise only
//   node .claude/skills/efficient-execution/scripts/verify.mjs --run    # also run the check, print only the tail
//   node .claude/skills/efficient-execution/scripts/verify.mjs --final  # the pre-commit check (pnpm build)
// Changes = working tree + staged + untracked + commits since origin/main.
import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const sh = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
};
const args = new Set(process.argv.slice(2));
const base = sh('git merge-base HEAD origin/main').trim() || 'HEAD';
const changed = [
  ...new Set(
    [sh(`git diff --name-only ${base}`), sh('git ls-files --others --exclude-standard')]
      .join('\n')
      .split('\n')
      .filter(Boolean),
  ),
];

if (!changed.length) {
  console.log('No changes since origin/main. Nothing to verify.');
  process.exit(0);
}

// Route numbers come from registry order (position + 1).
const ids = [...readFileSync('src/registry.ts', 'utf8').matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]);
const routeOf = (id) => ids.indexOf(id) + 1;

// Sections that import a file from another section folder (the 02 baseline's
// Hero.css, chartData.ts and assets/ are imported by 03, 04 and 05).
const importers = (sectionId) =>
  ids.filter((id) => {
    const dir = `src/sections/${id}`;
    if (!existsSync(dir) || id === sectionId) return false;
    return readdirSync(dir).some((f) => {
      if (!/\.(astro|tsx?|svelte|vue)$/.test(f)) return false;
      return readFileSync(`${dir}/${f}`, 'utf8').includes(`../${sectionId}/`);
    });
  });

const routes = new Set();
let allRoutes = false;
let needInstall = false;
let needCheck = false;
let needBuild = false;
const notes = [];

for (const f of changed) {
  const sec = f.match(/^src\/sections\/([^/]+)\//);
  if (/^(package\.json|pnpm-lock\.yaml)$/.test(f)) {
    needInstall = needCheck = needBuild = allRoutes = true;
  } else if (/^(astro\.config\.mjs|svelte\.config\.js|tsconfig\.json|src\/(layouts|pages|styles)\/)/.test(f)) {
    needCheck = needBuild = allRoutes = true;
  } else if (f === 'src/registry.ts') {
    needCheck = needBuild = allRoutes = true;
    notes.push('registry.ts changed: route numbers follow array order, so check the arrows still reach every route.');
  } else if (sec) {
    const id = sec[1];
    if (/\.md$/.test(f) || /frame\.png$/.test(f)) continue;
    if (routeOf(id)) routes.add(routeOf(id));
    const reached = importers(id);
    if (reached.length && /\.(css|ts|svg|png)$/.test(f)) {
      reached.forEach((r) => routes.add(routeOf(r)));
      notes.push(`${f} is imported by ${reached.join(', ')}: a shared-file change.`);
    }
    if (/\.(tsx?|svelte|vue|astro)$/.test(f)) needCheck = true;
    needBuild = true;
  } else if (/^apps\//.test(f)) {
    notes.push(`${f} is in an apps/ spike: use that app's own checks, not the lab's.`);
  }
}

const docsOnly = !needCheck && !needBuild && !needInstall;
console.log(`Changed (${changed.length}): ${changed.join(', ')}`);
if (docsOnly) {
  console.log('Docs, notes, skills or reference images only: no build or check needed.');
  notes.forEach((n) => console.log(`Note: ${n}`));
  process.exit(0);
}

const touched = allRoutes ? 'every route' : [...routes].sort((a, b) => a - b).map((r) => `/${r}`).join(' ');
console.log(`Routes affected: ${touched || 'none'}`);
notes.forEach((n) => console.log(`Note: ${n}`));

let cmd;
if (args.has('--final')) cmd = 'pnpm build';
else if (needCheck) cmd = 'pnpm check';
else cmd = 'pnpm astro build';
if (needInstall) cmd = `pnpm install && ${cmd}`;
console.log(`Cheapest check now: ${cmd}${args.has('--final') ? '' : '   (run `pnpm build` once before committing)'}`);

if (args.has('--run') || args.has('--final')) {
  const r = spawnSync('sh', ['-c', `${cmd} 2>&1`], { encoding: 'utf8' });
  const out = (r.stdout || '').trimEnd().split('\n');
  const errors = out.filter((l) => /error|Error|✗|failed/.test(l));
  console.log(r.status === 0 ? `PASS (${cmd})` : `FAIL (${cmd}), exit ${r.status}`);
  console.log((r.status === 0 ? out.slice(-3) : [...errors.slice(0, 30), '...', ...out.slice(-15)]).join('\n'));
  process.exit(r.status ?? 1);
}
