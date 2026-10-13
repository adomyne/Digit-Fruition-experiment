#!/usr/bin/env node
// Gzipped JS each lab route ships, for the comparison rubric.
// Run after `pnpm build` from the repo root:
//   node .claude/skills/sandbox-isolation/scripts/route-js.mjs        # every route
//   node .claude/skills/sandbox-isolation/scripts/route-js.mjs 2 3    # some routes
// Follows the entry scripts in dist/<n>/index.html (island component and
// renderer URLs, module scripts) through their static imports. Dynamic
// imports are not followed.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, posix } from 'node:path';
import { gzipSync } from 'node:zlib';

const dist = 'dist';
if (!existsSync(dist)) {
  console.error('No dist/. Run `pnpm build` first.');
  process.exit(1);
}

const routes = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(dist).filter((d) => /^\d+$/.test(d)).sort((a, b) => a - b);

const entryAttr = /(?:component-url|renderer-url|before-hydration-url|src)="([^"]+\.js)"/g;
const staticImport = /(?:import|export)\s*(?:[\w*{}\s,$]*from\s*)?["']([^"']+\.js)["']/g;

function collect(url, seen) {
  if (seen.has(url)) return;
  seen.add(url);
  const file = join(dist, url);
  if (!existsSync(file)) return;
  const code = readFileSync(file, 'utf8');
  for (const [, spec] of code.matchAll(staticImport)) {
    collect(spec.startsWith('/') ? spec : posix.join(posix.dirname(url), spec), seen);
  }
}

for (const n of routes) {
  const html = readFileSync(join(dist, n, 'index.html'), 'utf8');
  const seen = new Set();
  for (const [, url] of html.matchAll(entryAttr)) collect(url, seen);
  let raw = 0;
  let gz = 0;
  for (const url of seen) {
    const file = join(dist, url);
    if (!existsSync(file)) continue;
    const buf = readFileSync(file);
    raw += buf.length;
    gz += gzipSync(buf).length;
  }
  const kb = (b) => (b / 1024).toFixed(1);
  console.log(`/${n}\t${kb(gz)} KB gzip\t${kb(raw)} KB raw\t${seen.size} file(s)`);
}
