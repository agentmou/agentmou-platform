import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': rootDir,
      'server-only': fileURLToPath(new URL('./vitest-server-only-shim.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    setupFiles: [fileURLToPath(new URL('../../vitest.setup.ts', import.meta.url))],
  },
});
