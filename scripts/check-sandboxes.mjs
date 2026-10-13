#!/usr/bin/env node
// Sandbox check: fails the build when a section breaks the per-section CSS
// rules in AGENTS.md. Run from the repo root (`pnpm check:sandboxes`; also
// part of `pnpm build`). It checks every folder in src/sections/:
//
//   1. The section's root element carries data-sandbox="<folder name>".
//   2. No import reaches into another section's folder, and no CSS file is
//      imported from outside the section (npm packages like fonts are fine).
//   3. No `is:global` or `:global(` styles.
//   4. Every top-level rule in a plain .css file sits inside
//      [data-sandbox="<id>"]; @keyframes names carry the section number.
//   5. No raw colors (hex, rgb(), hsl() ...): colors come from tokens.css.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';

const ROOT = 'src/sections';
const SOURCE = /\.(astro|tsx?|jsx?|svelte|vue|css)$/;
const errors = [];
const fail = (file, msg) => errors.push(`${file}: ${msg}`);

const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const stripJsComments = (js) => js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');

// CSS found in a file: the whole file for .css, <style> blocks otherwise.
const cssOf = (file, text) =>
  file.endsWith('.css')
    ? text
    : [...text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');

const RAW_COLOR_CSS = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(\s*[\d.]/;
const RAW_COLOR_JS = /['"`]#[0-9a-fA-F]{3,8}['"`]|\b0x[0-9a-fA-F]{6}\b/;

// Top-level blocks of a stylesheet: [prelude, body] pairs.
const topLevel = (css) => {
  const blocks = [];
  let depth = 0;
  let start = 0;
  let prelude = '';
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '{') {
      if (depth === 0) {
        prelude = css.slice(start, i).trim();
        start = i + 1;
      }
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0) {
        blocks.push([prelude, css.slice(start, i)]);
        start = i + 1;
      }
    } else if (c === ';' && depth === 0) {
      start = i + 1; // @import / @charset lines
    }
  }
  return blocks;
};

// Split a selector list on top-level commas (not the ones inside :not(a, b)).
const selectors = (list) => {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i++) {
    if (list[i] === '(') depth++;
    else if (list[i] === ')') depth--;
    else if (list[i] === ',' && depth === 0) {
      out.push(list.slice(start, i));
      start = i + 1;
    }
  }
  return [...out, list.slice(start)];
};

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

for (const id of readdirSync(ROOT).sort()) {
  const dir = join(ROOT, id);
  if (!statSync(dir).isDirectory()) continue;
  const num = id.slice(0, 2);
  const files = walk(dir).filter((f) => SOURCE.test(f));
  let hasRoot = false;

  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    if (text.includes(`data-sandbox="${id}"`)) hasRoot = true;

    // 2. Imports
    for (const m of text.matchAll(/(?:import|from)\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      const spec = m[1] ?? m[2];
      if (!spec.startsWith('.')) continue;
      const target = resolve(dirname(file), spec.split('?')[0]);
      const rel = relative(resolve(ROOT), target);
      const outside = rel.startsWith('..') || rel.split(sep)[0] !== id;
      if (!outside) continue;
      if (!rel.startsWith('..')) fail(file, `imports from another section: ${spec}`);
      else if (/\.css$/.test(spec)) fail(file, `imports CSS from outside the section: ${spec}`);
    }

    // 3. Global styles
    if (/\bis:global\b/.test(text)) fail(file, 'uses <style is:global>; style the section from its own CSS');
    const css = stripCssComments(cssOf(file, text));
    if (/:global\(/.test(css)) fail(file, 'uses :global(); keep rules inside the section');

    // 4. Plain .css files stay inside the section root
    if (file.endsWith('.css')) {
      for (const [prelude, body] of topLevel(css)) {
        const kf = prelude.match(/^@(?:-\w+-)?keyframes\s+([\w-]+)/);
        if (kf) {
          if (!kf[1].includes(num)) fail(file, `@keyframes ${kf[1]} needs the section number (${num}) in its name`);
          continue;
        }
        if (/^@(media|supports|container|layer|scope)\b/.test(prelude)) {
          for (const [inner] of topLevel(body)) {
            if (!selectors(inner).every((s) => s.includes(`[data-sandbox="${id}"]`))) {
              fail(file, `rule "${inner.slice(0, 60)}" inside ${prelude.split(/\s/)[0]} is not inside [data-sandbox="${id}"]`);
            }
          }
          continue;
        }
        if (prelude.startsWith('@')) {
          fail(file, `top-level ${prelude.split(/\s/)[0]} is not allowed; nest it inside [data-sandbox="${id}"]`);
          continue;
        }
        const outsideSelectors = selectors(prelude).filter((s) => !s.includes(`[data-sandbox="${id}"]`));
        if (outsideSelectors.length) {
          fail(file, `rule "${outsideSelectors[0].trim().slice(0, 60)}" is not inside [data-sandbox="${id}"]`);
        }
      }
    }

    // 5. Raw colors
    const cssMatch = css.match(RAW_COLOR_CSS);
    if (cssMatch) fail(file, `raw color ${cssMatch[0]}… in CSS; use a token from tokens.css`);
    if (/\.(tsx?|jsx?|svelte|vue|astro)$/.test(file)) {
      const script = stripJsComments(text.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, ''));
      const jsMatch = script.match(RAW_COLOR_JS);
      if (jsMatch) {
        fail(file, `raw color ${jsMatch[0]} (line ${lineOf(script, jsMatch.index)}); read it from a token instead`);
      }
    }
  }

  // 1. Root marker
  if (!existsSync(join(dir, 'Section.astro'))) fail(dir, 'missing Section.astro');
  if (!hasRoot) fail(dir, `no element has data-sandbox="${id}"; put it on the section's root element`);
}

if (errors.length) {
  console.error(`Sandbox check failed (${errors.length}). See "Per-section CSS" in AGENTS.md.\n`);
  for (const e of errors) console.error(`  ${e}`);
  process.exit(1);
}
console.log('Sandbox check: every section is self-contained.');
