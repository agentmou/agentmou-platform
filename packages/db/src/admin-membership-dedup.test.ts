import { describe, expect, it } from 'vitest';

import { resolveMembershipDeduplication } from './admin-membership-dedup';

describe('resolveMembershipDeduplication', () => {
  it('keeps the oldest membership, the most privileged role, and latest activity', () => {
    const result = resolveMembershipDeduplication([
      {
        id: 'membership-3',
        tenantId: 'tenant-1',
        userId: 'user-1',
        role: 'viewer',
        joinedAt: new Date('2026-01-03T10:00:00.000Z'),
        lastActiveAt: new Date('2026-01-03T12:00:00.000Z'),
      },
      {
        id: 'membership-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        role: 'operator',
        joinedAt: new Date('2026-01-01T10:00:00.000Z'),
        lastActiveAt: new Date('2026-01-01T12:00:00.000Z'),
      },
      {
        id: 'membership-2',
        tenantId: 'tenant-1',
        userId: 'user-1',
        role: 'admin',
        joinedAt: new Date('2026-01-02T10:00:00.000Z'),
        lastActiveAt: new Date('2026-01-04T08:30:00.000Z'),
      },
    ]);

    expect(result).toEqual({
      canonicalMembershipId: 'membership-1',
      role: 'admin',
      lastActiveAt: new Date('2026-01-04T08:30:00.000Z'),
      deleteMembershipIds: ['membership-2', 'membership-3'],
    });
  });

  it('rejects empty candidate sets', () => {
    expect(() => resolveMembershipDeduplication([])).toThrow(
      'resolveMembershipDeduplication requires at least one membership'
    );
  });
});
