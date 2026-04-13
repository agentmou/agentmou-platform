import { describe, expect, it } from 'vitest';

import { adminImpersonationSessions, memberships } from './schema';

describe('database admin schema', () => {
  it('defines the admin impersonation sessions table', () => {
    expect(adminImpersonationSessions.id.name).toBe('id');
    expect(adminImpersonationSessions.actorUserId.name).toBe('actor_user_id');
    expect(adminImpersonationSessions.actorTenantId.name).toBe('actor_tenant_id');
    expect(adminImpersonationSessions.targetUserId.name).toBe('target_user_id');
    expect(adminImpersonationSessions.targetTenantId.name).toBe('target_tenant_id');
    expect(adminImpersonationSessions.expiresAt.name).toBe('expires_at');
  });

  it('keeps memberships keyed by tenant and user for admin upserts', () => {
    expect(memberships.tenantId.name).toBe('tenant_id');
    expect(memberships.userId.name).toBe('user_id');
  });
});
