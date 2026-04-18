import type { BrowserContext } from '@playwright/test';

/**
 * Browser-side test helpers.
 *
 * The heavy lifting — returning canned JSON for /api/v1/* — happens in
 * `mock-server.ts`, which runs as a real HTTP listener so Next's SSR
 * boundaries see consistent responses. The helpers here just set up
 * browser state (cookies) before a test navigates.
 */

const SESSION_COOKIE_NAME = 'agentmou-session';

/**
 * Inject the session cookie before navigating so SSR boundaries see an
 * authenticated user without walking through the login form.
 */
export async function primeSession(context: BrowserContext, baseUrl: string) {
  const url = new URL(baseUrl);
  await context.addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: 'fake-session-token',
      domain: url.hostname,
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
}

export async function clearSession(context: BrowserContext) {
  await context.clearCookies({ name: SESSION_COOKIE_NAME });
}
