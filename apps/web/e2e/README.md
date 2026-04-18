# Playwright Smoke Tests

Smoke tests covering the four flows most likely to silently regress when a UI
PR refactors shared chrome:

1. Login → workspace landing
2. Logout → `/login`
3. Admin tenants list (filters update the URL, results re-render)
4. Admin tenant detail → features page navigation

## What this is and isn't

- **Is**: a fast UI regression net. Real Next dev server, real React render
  tree. Every `/api/v1/*` call is intercepted with a canned JSON payload from
  [`fixtures/mock-api.ts`](./fixtures/mock-api.ts). No DB, no Redis, no
  Fastify process.
- **Isn't**: a contract test. The `clinic-demo-validation` CI job already
  exercises the real backend. If a contract drifts, this suite will fail
  because the mocked payload no longer matches the page's expectations —
  that's a feature.

## Running locally

```bash
# One-time: install Playwright browsers (~80 MB)
pnpm --filter @agentmou/web exec playwright install chromium --with-deps

# All tests
pnpm --filter @agentmou/web test:e2e

# Headed UI mode for debugging
pnpm --filter @agentmou/web test:e2e:ui

# Single spec
pnpm --filter @agentmou/web exec playwright test e2e/admin-flow.spec.ts
```

The config defaults to port `3100` so the suite does not collide with a
running `next dev` on `:3000`.

## Adding a test

1. Drop a new `*.spec.ts` in this directory.
2. Always start with `await installMockApi(page)` so unmocked calls fail loudly
   with HTTP 599.
3. For authenticated surfaces, also call `await primeSession(context, baseURL)`
   before navigating — the SSR boundaries read the session cookie and would
   bounce to `/login` otherwise.
4. Prefer role-based locators (`page.getByRole('button', { name: ... })`).

## CI

The `e2e` GitHub Actions job in `.github/workflows/ci.yml` runs the suite on
every PR. It shares the same Postgres-less harness as local — no service
containers needed.
