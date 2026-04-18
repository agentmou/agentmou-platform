import { expect, test } from '@playwright/test';

import { clearSession, primeSession } from './fixtures/mock-api';

/**
 * Auth flow smoke tests.
 *
 * Cover the two regressions PR-01 fixed (logout → /login race) and the
 * happy login path. The in-process mock API server (see
 * `fixtures/mock-server.ts`) returns canned payloads for every
 * /api/v1/* call from both SSR and the browser.
 *
 * Playwright's baseURL is 127.0.0.1 but Next's server-side redirects
 * can normalise the host to `localhost`, so URL assertions use a
 * host-agnostic pattern that only pins path + port.
 */

test.describe('auth flow', () => {
  test('login form lands the user on the workspace home', async ({ page, context }) => {
    await clearSession(context);

    await page.goto('/login');
    await expect(page.getByRole('tab', { name: /sign in/i })).toBeVisible();

    await page.getByLabel(/email/i).fill('admin@agentmou.test');
    await page.getByLabel(/^password$/i).fill('changeme');
    await page.getByRole('button', { name: /^sign in$/i }).click();

    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/app(\/|$)/);
  });

  test('logout clears the session and redirects to /login', async ({ page, context, baseURL }) => {
    if (!baseURL) throw new Error('baseURL not configured');
    await primeSession(context, baseURL);

    await page.goto('/admin/tenants');
    await expect(page.getByRole('heading', { name: 'Tenants' })).toBeVisible();

    // The button is rendered inside a server-action <form action="/logout">.
    // Submitting it hits the route handler and redirects to /login.
    await page.getByRole('button', { name: /cerrar sesión/i }).click();

    await expect(page).toHaveURL(/^https?:\/\/[^/]+\/login(\?|$)/);
  });
});
