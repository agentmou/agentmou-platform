import { describe, expect, it } from 'vitest';

import { authSessions } from './schema';

describe('database auth session schema', () => {
  it('defines the opaque auth_sessions table used by browser auth', () => {
    expect(authSessions.id.name).toBe('id');
    expect(authSessions.userId.name).toBe('user_id');
    expect(authSessions.sessionTokenHash.name).toBe('session_token_hash');
    expect(authSessions.sessionType.name).toBe('session_type');
    expect(authSessions.adminImpersonationSessionId.name).toBe('admin_impersonation_session_id');
    expect(authSessions.expiresAt.name).toBe('expires_at');
    expect(authSessions.revokedAt.name).toBe('revoked_at');
    expect(authSessions.lastSeenAt.name).toBe('last_seen_at');
    expect(authSessions.createdAt.name).toBe('created_at');
  });
});
