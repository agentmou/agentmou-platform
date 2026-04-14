export const QA_SEED_ADMIN_EMAIL = 'admin@agentmou.dev';
export const QA_SEED_ADMIN_PASSWORD = 'Demo1234!';
export const QA_SEED_ADMIN_PASSWORD_HASH =
  '10a4edfff587919abdfe1649f43cf23e:9f2cb2ca9bc9da1b7de5c0a59185530a55979fc722b9e58fc7767deaa45112b01fae2b27c759e7a29bed02329dc3e9bf4763e5d9a0ac2c26242b585df9d1d059';

export const INTERNAL_QA_TENANT_NAME = 'Demo Workspace';
export const CLINIC_QA_TENANT_NAME = 'Dental Demo Clinic';
export const FISIO_QA_TENANT_NAME = 'Fisio Pilot Workspace';

export const internalQaTenantSeed = {
  name: INTERNAL_QA_TENANT_NAME,
  type: 'business' as const,
  plan: 'pro' as const,
  membershipRole: 'owner' as const,
  settings: {
    timezone: 'America/New_York',
    defaultHITL: true,
    logRetentionDays: 30,
    memoryRetentionDays: 7,
    activeVertical: 'internal' as const,
    isPlatformAdminTenant: true,
    settingsVersion: 2,
    verticalClinicUi: false,
    clinicDentalMode: false,
    internalPlatformVisible: false,
  },
  verticalConfig: {
    label: 'control_plane',
    isPlatformAdminTenant: true,
  },
};

export const fisioQaTenantSeed = {
  name: FISIO_QA_TENANT_NAME,
  type: 'business' as const,
  plan: 'starter' as const,
  membershipRole: 'admin' as const,
  settings: {
    timezone: 'Europe/Madrid',
    defaultHITL: false,
    logRetentionDays: 30,
    memoryRetentionDays: 7,
    activeVertical: 'fisio' as const,
    isPlatformAdminTenant: false,
    settingsVersion: 2,
    verticalClinicUi: false,
    clinicDentalMode: false,
    internalPlatformVisible: false,
  },
  verticalConfig: {
    specialty: 'sports_rehab',
    status: 'architecture_fixture',
  },
};
