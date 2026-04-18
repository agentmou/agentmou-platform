import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the Agentmou web smoke suite.
 *
 * Strategy: spin up a production `next start` and intercept every
 * `/api/v1/*` call from inside the tests. No real backend, no DB, no
 * seed — these tests catch UI-level regressions (routing, redirects,
 * button wiring, page rendering, URL state) without paying for
 * end-to-end infra. The `clinic-demo-validation` job already covers
 * the actual API contract.
 *
 * The web server uses placeholder envs because the protected pages
 * (admin shell, app shell) hydrate from `getServerAuthSnapshot()` →
 * `/api/v1/auth/me`, which we mock per-test.
 *
 * Build step: the `test:e2e` npm script runs `next build` before this
 * config loads so the webServer command below stays a single process
 * — Playwright's readiness probe is reliable when it only has to wait
 * for `next start`.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;

const MOCK_API_PORT = Number(process.env.E2E_MOCK_API_PORT ?? 47321);
const MOCK_API_URL = `http://127.0.0.1:${MOCK_API_PORT}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.ts$/,
  globalSetup: require.resolve('./e2e/global-setup'),
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['github']] : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: `pnpm exec next start --hostname 127.0.0.1 --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      // Point the API origin at the in-process mock server so both SSR
      // boundaries and browser fetches hit the same canned responses.
      NEXT_PUBLIC_API_URL: MOCK_API_URL,
      MARKETING_PUBLIC_BASE_URL: BASE_URL,
      APP_PUBLIC_BASE_URL: BASE_URL,
      API_PUBLIC_BASE_URL: MOCK_API_URL,
      NODE_ENV: 'production',
      // Skip the canonical-host redirect so `http://127.0.0.1:3100` is a
      // valid test host — production builds never set this flag.
      E2E_DISABLE_CANONICAL_REDIRECT: '1',
    },
  },
});
