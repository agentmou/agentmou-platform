import {
  TenantSchema,
  TenantSettingsSchema,
  type Tenant,
  type TenantSettings,
} from '@agentmou/contracts';
import { tenants } from '@agentmou/db';

import type { TenantSettingsInput } from './tenants.schema.js';

type TenantRow = typeof tenants.$inferSelect;

const DEFAULT_TENANT_SETTINGS: TenantSettings = {
  timezone: 'UTC',
  defaultHITL: false,
  logRetentionDays: 30,
  memoryRetentionDays: 7,
  verticalClinicUi: false,
  clinicDentalMode: false,
};

export function normalizeTenantSettings(settings: unknown): TenantSettings {
  if (!isRecord(settings)) {
    return DEFAULT_TENANT_SETTINGS;
  }

  return TenantSettingsSchema.parse({
    timezone:
      typeof settings.timezone === 'string' ? settings.timezone : DEFAULT_TENANT_SETTINGS.timezone,
    defaultHITL:
      typeof settings.defaultHITL === 'boolean'
        ? settings.defaultHITL
        : DEFAULT_TENANT_SETTINGS.defaultHITL,
    logRetentionDays:
      typeof settings.logRetentionDays === 'number'
        ? settings.logRetentionDays
        : DEFAULT_TENANT_SETTINGS.logRetentionDays,
    memoryRetentionDays:
      typeof settings.memoryRetentionDays === 'number'
        ? settings.memoryRetentionDays
        : DEFAULT_TENANT_SETTINGS.memoryRetentionDays,
    verticalClinicUi:
      typeof settings.verticalClinicUi === 'boolean'
        ? settings.verticalClinicUi
        : DEFAULT_TENANT_SETTINGS.verticalClinicUi,
    clinicDentalMode:
      typeof settings.clinicDentalMode === 'boolean'
        ? settings.clinicDentalMode
        : DEFAULT_TENANT_SETTINGS.clinicDentalMode,
  });
}

export function mergeTenantSettings(
  current: unknown,
  updates: TenantSettingsInput
): TenantSettings {
  const normalizedCurrent = normalizeTenantSettings(current);

  return TenantSettingsSchema.parse({
    ...normalizedCurrent,
    ...updates,
  });
}

export function mapTenant(tenant: TenantRow): Tenant {
  return TenantSchema.parse({
    id: tenant.id,
    name: tenant.name,
    type: tenant.type,
    plan: tenant.plan,
    createdAt: tenant.createdAt.toISOString(),
    ownerId: tenant.ownerId,
    settings: normalizeTenantSettings(tenant.settings),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
