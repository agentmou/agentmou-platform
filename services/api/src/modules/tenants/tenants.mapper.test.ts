import { describe, expect, it } from 'vitest';

import { mapTenant, mergeTenantSettings, normalizeTenantSettings } from './tenants.mapper.js';

describe('tenants.mapper', () => {
  it('normalizes partial settings with canonical defaults', () => {
    expect(
      normalizeTenantSettings({
        timezone: 'Europe/Madrid',
      })
    ).toEqual({
      timezone: 'Europe/Madrid',
      defaultHITL: false,
      logRetentionDays: 30,
      memoryRetentionDays: 7,
    });
  });

  it('merges updates onto normalized tenant settings', () => {
    expect(
      mergeTenantSettings(
        {
          timezone: 'Europe/Madrid',
          defaultHITL: true,
        },
        {
          logRetentionDays: 14,
        }
      )
    ).toEqual({
      timezone: 'Europe/Madrid',
      defaultHITL: true,
      logRetentionDays: 14,
      memoryRetentionDays: 7,
    });
  });

  it('maps tenants to the shared contract shape', () => {
    const tenant = mapTenant({
      id: 'tenant-1',
      name: 'Acme',
      type: 'business',
      plan: 'pro',
      ownerId: 'user-1',
      settings: {},
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
    });

    expect(tenant).toEqual({
      id: 'tenant-1',
      name: 'Acme',
      type: 'business',
      plan: 'pro',
      ownerId: 'user-1',
      createdAt: '2024-01-01T00:00:00.000Z',
      settings: {
        timezone: 'UTC',
        defaultHITL: false,
        logRetentionDays: 30,
        memoryRetentionDays: 7,
      },
    });
  });
});
