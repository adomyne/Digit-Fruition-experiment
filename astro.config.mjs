// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import svelte from '@astrojs/svelte';
import vue from '@astrojs/vue';

// Framework integrations (React, Svelte, Vue) get added here as sections need them:
//   pnpm astro add react | svelte | vue
export default defineConfig({
  integrations: [react(), svelte(), vue()]
});
