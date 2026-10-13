#!/usr/bin/env node
// Prints a line-numbered map of the landmarks in lab files, so you can Read
// just the part you need (Read with offset/limit) instead of the whole file.
//   node .claude/skills/efficient-execution/scripts/outline.mjs src/sections/03-hero-svelte-gsap/Hero.svelte
//   node .claude/skills/efficient-execution/scripts/outline.mjs src/sections/0[2-5]*/*.{tsx,svelte,vue,astro}
// Landmarks: script/template/style blocks, top-level functions and consts,
// lifecycle hooks (useEffect, onMount, $effect, watch, onUnmounted, scopes),
// hero__ block elements in markup, top-level CSS selectors, markdown headings.
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('Usage: outline.mjs <file> [file...]');
  process.exit(1);
}

const code = [
  /^(export\s+)?(default\s+)?(async\s+)?function\s+\w+/,
  /^(export\s+)?(const|let)\s+[A-Z_a-z]\w*\s*=/,
  /^\s*(useEffect|useLayoutEffect|onMount|onDestroy|onUnmounted|onMounted|watch|\$effect)\s*\(/,
  /gsap\.(context|matchMedia|timeline)\(|createTimeline\(|createScope\(/,
  /^\s*return\s*\($/,
];
const blocks = /^<\/?(script|template|style)\b|^---\s*$/;
const markup = /<(header|section|main|footer|nav|svg|aside)\b|class(Name)?=["{][^"}]*\bhero__[a-z]+(?![-_])/;
const cssRule = /^[^\s@}/*][^{]*\{\s*$|^@(media|keyframes|supports|layer)\b/;
const heading = /^#{1,4}\s/;

for (const file of files) {
  const ext = extname(file);
  const lines = readFileSync(file, 'utf8').split('\n');
  const hits = [];
  lines.forEach((line, i) => {
    let keep = false;
    if (ext === '.md') keep = heading.test(line);
    else if (ext === '.css') keep = cssRule.test(line);
    else keep = blocks.test(line) || code.some((re) => re.test(line)) || markup.test(line);
    if (keep) hits.push(`${String(i + 1).padStart(5)}  ${line.trim().slice(0, 110)}`);
  });
  console.log(`== ${file} (${lines.length} lines)`);
  console.log(hits.join('\n') || '  (no landmarks)');
}
