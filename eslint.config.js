import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

/** Stricter static hygiene for product-critical paths (see docs/architecture/conventions.md). */
const coreStaticHygieneRules = {
  '@typescript-eslint/no-unused-vars': [
    'error',
    { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
  ],
  '@typescript-eslint/no-explicit-any': 'error',
  'no-console': ['error', { allow: ['warn', 'error'] }],
};

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/coverage/**',
      'infra/**',
      // Playwright smoke suite — lives under its own tsconfig (apps/web/e2e)
      // and exercises Node-level test helpers that legitimately call
      // `console.log`, so the core-hygiene rules don't apply.
      'apps/web/e2e/**',
      'apps/web/playwright.config.ts',
      'apps/web/test-results/**',
      'apps/web/playwright-report/**',
    ],
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: [
      'apps/web/lib/**/*.{ts,tsx}',
      'packages/contracts/**/*.{ts,tsx}',
      'packages/db/**/*.{ts,tsx}',
      'services/api/src/**/*.{ts,tsx}',
      'services/worker/src/**/*.{ts,tsx}',
    ],
    rules: coreStaticHygieneRules,
  },
  {
    files: ['apps/web/app/app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/lib/providers/demo',
                '@/lib/data/demo-provider',
                '@/lib/data/mock-provider',
                '@/lib/demo-catalog/*',
                '@/lib/demo/*',
                '@/lib/control-plane/mock-api',
                '@/lib/control-plane/mock-data',
              ],
              message:
                'Product app routes must consume tenant-scoped data through the provider boundary.',
            },
          ],
        },
      ],
    },
  },
  {
    // Authorization is never driven by the client-side Reflag SDK. Read from
    // the server-resolved TenantExperience payload instead.
    files: [
      'apps/web/lib/auth/**/*.{ts,tsx}',
      'apps/web/lib/providers/**/*.{ts,tsx}',
      'apps/web/proxy.ts',
      'apps/web/**/*-access.{ts,tsx}',
      'services/api/src/middleware/**/*.{ts,tsx}',
      'services/api/src/**/*-access.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/lib/feature-flags/client',
                '@/lib/feature-flags/client.js',
                '@/lib/feature-flags/client.tsx',
              ],
              message:
                'Authorization paths must not depend on client-side Reflag flags. Use TenantExperience.flags resolved server-side.',
            },
          ],
        },
      ],
    },
  }
);
