import { describe, expect, it } from 'vitest';

import {
  AUTH_SESSION_COOKIE_NAME,
  IMPERSONATION_SESSION_TTL_MS,
  REMEMBER_ME_SESSION_TTL_MS,
  STANDARD_SESSION_TTL_MS,
  createOpaqueSessionToken,
  hashAuthSessionToken,
  isAuthSessionActive,
  resolveAuthSessionExpiry,
} from './auth-sessions';

describe('auth session helpers', () => {
  it('uses the canonical browser session cookie name', () => {
    expect(AUTH_SESSION_COOKIE_NAME).toBe('agentmou-session');
  });

  it('creates opaque random session tokens', () => {
    const first = createOpaqueSessionToken();
    const second = createOpaqueSessionToken();

    expect(first).toHaveLength(64);
    expect(second).toHaveLength(64);
    expect(first).not.toBe(second);
  });

  it('hashes tokens deterministically for storage lookups', () => {
    expect(hashAuthSessionToken('session-token')).toBe(hashAuthSessionToken('session-token'));
    expect(hashAuthSessionToken('session-token')).not.toBe(hashAuthSessionToken('other-token'));
  });

  it('resolves default, remember-me, and impersonation expiries', () => {
    const now = new Date('2026-04-15T10:00:00.000Z');

    expect(resolveAuthSessionExpiry({ now }).getTime() - now.getTime()).toBe(
      STANDARD_SESSION_TTL_MS
    );
    expect(resolveAuthSessionExpiry({ now, rememberMe: true }).getTime() - now.getTime()).toBe(
      REMEMBER_ME_SESSION_TTL_MS
    );
    expect(
      resolveAuthSessionExpiry({
        now,
        sessionType: 'impersonation',
      }).getTime() - now.getTime()
    ).toBe(IMPERSONATION_SESSION_TTL_MS);
  });

  it('treats revoked or expired sessions as inactive', () => {
    const now = new Date('2026-04-15T10:00:00.000Z');

    expect(
      isAuthSessionActive(
        {
          expiresAt: new Date('2026-04-15T11:00:00.000Z'),
          revokedAt: null,
        },
        now
      )
    ).toBe(true);

    expect(
      isAuthSessionActive(
        {
          expiresAt: new Date('2026-04-15T09:59:59.000Z'),
          revokedAt: null,
        },
        now
      )
    ).toBe(false);

    expect(
      isAuthSessionActive(
        {
          expiresAt: new Date('2026-04-15T11:00:00.000Z'),
          revokedAt: new Date('2026-04-15T10:30:00.000Z'),
        },
        now
      )
    ).toBe(false);
  });
});
