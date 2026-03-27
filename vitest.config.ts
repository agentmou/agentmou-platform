import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [fileURLToPath(new URL('./vitest.setup.ts', import.meta.url))],
  },
});
