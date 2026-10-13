// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import svelte from '@astrojs/svelte';
import vue from '@astrojs/vue';

// Dev-only workaround. @vitejs/plugin-vue compiles `<script lang="ts">` with
// the dev server's oxc options, and @vitejs/plugin-react turns on React Fast
// Refresh there. A Vue component that calls a use*() composable then gets
// $RefreshSig$() calls, which crash `pnpm dev` (500 on every route, since
// [n].astro imports all sections). This makes those calls no-ops in .vue
// modules. Prepended on line 1 so line numbers stay the same.
/** @type {import('astro').ViteUserConfig['plugins']} */
const vueRefreshPlugins = [{
  name: 'lab:vue-refresh-shim',
  apply: 'serve',
  enforce: 'post',
  transform(code, id) {
    if (!/\.vue(\?|$)/.test(id) || !code.includes('$RefreshSig$')) return;
    return { code: 'var $RefreshSig$ = () => (t) => t, $RefreshReg$ = () => {};' + code, map: null };
  },
}];

// Framework integrations (React, Svelte, Vue) get added here as sections need them:
//   pnpm astro add react | svelte | vue
export default defineConfig({
  // GitHub Pages serves the lab under /<repo>/; the deploy workflow sets
  // LAB_BASE for that. Local dev and preview stay at the root.
  site: 'https://adomyne.github.io',
  base: process.env.LAB_BASE ?? '/',
  integrations: [react(), svelte(), vue()],
  vite: {
    plugins: vueRefreshPlugins,
    // Sections fence their CSS with native nesting ([data-sandbox] { ... }).
    // Browsers only read that since late 2023, so the build flattens it to
    // plain selectors for older ones. `pnpm dev` serves it as written.
    build: { cssTarget: ['chrome100', 'edge100', 'firefox100', 'safari15'] },
  },
});
