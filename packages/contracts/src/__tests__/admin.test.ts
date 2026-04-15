import { describe, expect, it } from 'vitest';

import {
  AdminCreateTenantUserSchema,
  AdminStartImpersonationResponseSchema,
  AdminTenantDetailResponseSchema,
  AdminTenantListFiltersSchema,
  AdminTenantListResponseSchema,
  AdminTenantUserMutationResponseSchema,
  AuditEventCategorySchema,
} from '../index';

describe('admin contracts', () => {
  it('parses tenant list filters with cursor pagination', () => {
    const result = AdminTenantListFiltersSchema.parse({
      q: 'smile',
      plan: 'pro',
      vertical: 'clinic',
      isPlatformAdminTenant: true,
      limit: 25,
      cursor: '2026-04-13T10:00:00.000Z::tenant-2',
    });

    expect(result.vertical).toBe('clinic');
    expect(result.limit).toBe(25);
  });

  it('parses admin tenant list and detail envelopes', () => {
    const list = AdminTenantListResponseSchema.parse({
      tenants: [
        {
          id: 'tenant-1',
          name: 'Dental Demo Clinic',
          type: 'business',
          plan: 'enterprise',
          ownerId: 'user-1',
          createdAt: '2026-01-01T00:00:00.000Z',
          activeVertical: 'clinic',
          isPlatformAdminTenant: false,
          userCount: 4,
        },
      ],
      nextCursor: '2026-01-01T00:00:00.000Z::tenant-1',
    });

    const detail = AdminTenantDetailResponseSchema.parse({
      tenant: {
        ...list.tenants[0],
        settings: {
          timezone: 'Europe/Madrid',
          defaultHITL: false,
          logRetentionDays: 30,
          memoryRetentionDays: 7,
          activeVertical: 'clinic',
          isPlatformAdminTenant: false,
          settingsVersion: 2,
          verticalClinicUi: true,
          clinicDentalMode: true,
          internalPlatformVisible: false,
        },
        verticalConfigs: [
          {
            id: 'config-1',
            tenantId: 'tenant-1',
            verticalKey: 'clinic',
            config: { specialty: 'implantology' },
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
          },
        ],
      },
    });

    expect(detail.tenant.verticalConfigs[0].verticalKey).toBe('clinic');
  });

  it('parses user mutation and impersonation envelopes', () => {
    const userResult = AdminTenantUserMutationResponseSchema.parse({
      user: {
        userId: 'user-1',
        membershipId: 'membership-1',
        tenantId: 'tenant-1',
        email: 'operator@example.com',
        name: 'Operator',
        role: 'operator',
        hasPassword: false,
        joinedAt: '2026-01-01T00:00:00.000Z',
        lastActiveAt: '2026-01-02T00:00:00.000Z',
      },
      activation: {
        token: 'plain-token',
        link: 'https://app.example.com/reset-password?token=plain-token',
        expiresAt: '2026-01-02T00:00:00.000Z',
      },
    });

    const impersonation = AdminStartImpersonationResponseSchema.parse({
      sessionId: 'session-1',
      expiresAt: '2026-01-02T00:00:00.000Z',
    });

    expect(userResult.activation?.token).toBe('plain-token');
    expect(impersonation.sessionId).toBe('session-1');
  });

  it('accepts admin as an audit event category', () => {
    expect(AuditEventCategorySchema.parse('admin')).toBe('admin');
  });

  it('rejects empty admin user create payloads', () => {
    expect(() => AdminCreateTenantUserSchema.parse({})).toThrow();
  });
});
