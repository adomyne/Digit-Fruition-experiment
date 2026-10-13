#!/usr/bin/env node
// Screenshots several lab routes in ONE run: starts `astro preview` on the
// current dist/, shoots each route, then stops the server it started (by
// PID, so no `pkill -f` that can kill your own shell). Run `pnpm build` first.
//   node .claude/skills/efficient-execution/scripts/shoot.mjs --out <scratchpad dir> 2 3 4 5
//   node .claude/skills/efficient-execution/scripts/shoot.mjs --out <dir> --width 1440 --height 900 --wait 3000 4
// Prints one line per PNG with its size. Read only the image you need to look
// at; every PNG you Read stays in context for the rest of the session.
import { spawn, execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = argv[i + 1];
  argv.splice(i, 2);
  return v;
};
const out = opt('out', null);
const width = Number(opt('width', 1440));
const height = Number(opt('height', 900));
const wait = Number(opt('wait', 3000));
const port = Number(opt('port', 4329));
const routes = argv;

if (!out || !routes.length) {
  console.error('Usage: shoot.mjs --out <dir outside the repo> <route> [route...]');
  process.exit(1);
}
if (!existsSync('dist')) {
  console.error('No dist/. Run `pnpm build` first.');
  process.exit(1);
}
mkdirSync(out, { recursive: true });

// Playwright is installed globally in the cloud container, not in the repo.
const req = createRequire(join(execSync('npm root -g', { encoding: 'utf8' }).trim(), '_'));
const { chromium } = req('playwright');

const server = spawn('pnpm', ['exec', 'astro', 'preview', '--port', String(port)], {
  stdio: 'ignore',
  detached: true,
});
const stop = () => {
  try {
    process.kill(-server.pid);
  } catch {}
};
process.on('exit', stop);

const base = `http://localhost:${port}`;
for (let i = 0; i < 40; i++) {
  try {
    await fetch(`${base}/1/`);
    break;
  } catch {
    await new Promise((r) => setTimeout(r, 250));
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height } });
for (const r of routes) {
  await page.goto(`${base}/${r}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(wait); // let intro timelines settle
  const file = join(out, `route-${r}-${width}.png`);
  await page.screenshot({ path: file });
  console.log(`${file}\t${(statSync(file).size / 1024).toFixed(0)} KB`);
}
await browser.close();
stop();
