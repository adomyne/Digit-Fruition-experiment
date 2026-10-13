// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import svelte from '@astrojs/svelte';
import vue from '@astrojs/vue';

// Framework integrations (React, Svelte, Vue) get added here as sections need them:
//   pnpm astro add react | svelte | vue
export default defineConfig({
  // GitHub Pages serves the lab under /<repo>/; the deploy workflow sets
  // LAB_BASE for that. Local dev and preview stay at the root.
  site: 'https://adomyne.github.io',
  base: process.env.LAB_BASE ?? '/',
  integrations: [react(), svelte(), vue()]
});
