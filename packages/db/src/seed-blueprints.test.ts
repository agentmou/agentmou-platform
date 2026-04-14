import { describe, expect, it } from 'vitest';

import {
  CLINIC_QA_TENANT_NAME,
  fisioQaTenantSeed,
  INTERNAL_QA_TENANT_NAME,
  internalQaTenantSeed,
  QA_SEED_ADMIN_EMAIL,
  QA_SEED_ADMIN_PASSWORD,
} from './seed-blueprints';
import { buildTenantVerticalConfigSeedRows } from './tenant-vertical-config-fixture';

describe('local QA seed blueprints', () => {
  it('keeps the internal admin workspace explicit for local QA', () => {
    expect(QA_SEED_ADMIN_EMAIL).toBe('admin@agentmou.dev');
    expect(QA_SEED_ADMIN_PASSWORD).toBe('Demo1234!');
    expect(internalQaTenantSeed).toMatchObject({
      name: INTERNAL_QA_TENANT_NAME,
      membershipRole: 'owner',
      plan: 'pro',
      settings: {
        activeVertical: 'internal',
        isPlatformAdminTenant: true,
        settingsVersion: 2,
      },
      verticalConfig: {
        label: 'control_plane',
        isPlatformAdminTenant: true,
      },
    });
  });

  it('keeps the fisio workspace minimal but structurally valid for regression QA', () => {
    expect(fisioQaTenantSeed).toMatchObject({
      membershipRole: 'admin',
      plan: 'starter',
      settings: {
        activeVertical: 'fisio',
        isPlatformAdminTenant: false,
        settingsVersion: 2,
      },
      verticalConfig: {
        specialty: 'sports_rehab',
        status: 'architecture_fixture',
      },
    });
  });

  it('reuses the same vertical config row builder for seeded internal and fisio tenants', () => {
    expect(
      buildTenantVerticalConfigSeedRows({
        tenantId: 'tenant-internal',
        activeVertical: internalQaTenantSeed.settings.activeVertical,
        config: internalQaTenantSeed.verticalConfig,
      })
    ).toEqual([
      {
        tenantId: 'tenant-internal',
        verticalKey: 'internal',
        config: internalQaTenantSeed.verticalConfig,
      },
    ]);

    expect(
      buildTenantVerticalConfigSeedRows({
        tenantId: 'tenant-fisio',
        activeVertical: fisioQaTenantSeed.settings.activeVertical,
        config: fisioQaTenantSeed.verticalConfig,
      })
    ).toEqual([
      {
        tenantId: 'tenant-fisio',
        verticalKey: 'fisio',
        config: fisioQaTenantSeed.verticalConfig,
      },
    ]);
  });

  it('keeps the seeded clinic name aligned with the dental demo fixture', () => {
    expect(CLINIC_QA_TENANT_NAME).toBe('Dental Demo Clinic');
  });
});
