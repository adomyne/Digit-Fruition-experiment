import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const config: NextConfig = {
  // This app has its own lockfile inside the lab repo; pin the root here so
  // Next doesn't pick the lab's pnpm-lock.yaml as the workspace root.
  turbopack: { root: dirname(fileURLToPath(import.meta.url)) },
};

export default config;
