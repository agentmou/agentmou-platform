import { describe, expect, it } from 'vitest';

import { mapMembership } from './memberships.mapper.js';

describe('memberships.mapper', () => {
  it('flattens membership rows to tenant members', () => {
    const member = mapMembership({
      id: 'membership-1',
      tenantId: 'tenant-1',
      userId: 'user-1',
      role: 'admin',
      joinedAt: new Date('2024-01-01T00:00:00Z'),
      lastActiveAt: new Date('2024-01-02T00:00:00Z'),
      user: {
        id: 'user-1',
        email: 'ops@example.com',
        name: 'Ops User',
      },
    });

    expect(member).toEqual({
      id: 'membership-1',
      tenantId: 'tenant-1',
      email: 'ops@example.com',
      name: 'Ops User',
      role: 'admin',
      joinedAt: '2024-01-01T00:00:00.000Z',
      lastActiveAt: '2024-01-02T00:00:00.000Z',
    });
  });

  it('maps legacy member roles to operator and fills missing names', () => {
    const member = mapMembership({
      id: 'membership-2',
      tenantId: 'tenant-1',
      userId: 'user-2',
      role: 'member',
      joinedAt: new Date('2024-01-01T00:00:00Z'),
      lastActiveAt: new Date('2024-01-02T00:00:00Z'),
      user: {
        id: 'user-2',
        email: 'viewer@example.com',
        name: null,
      },
    });

    expect(member.role).toBe('operator');
    expect(member.name).toBe('viewer@example.com');
  });
});
