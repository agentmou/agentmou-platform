import {
  TenantSchema,
  TenantSettingsSchema,
  type Tenant,
  type TenantSettings,
  type VerticalKey,
} from '@agentmou/contracts';
import { tenants } from '@agentmou/db';

import type { TenantSettingsInput } from './tenants.schema.js';

type TenantRow = typeof tenants.$inferSelect;

const DEFAULT_TENANT_SETTINGS: TenantSettings = {
  timezone: 'UTC',
  defaultHITL: false,
  logRetentionDays: 30,
  memoryRetentionDays: 7,
  activeVertical: 'internal',
  isPlatformAdminTenant: false,
  settingsVersion: 2,
  verticalClinicUi: false,
  clinicDentalMode: false,
  internalPlatformVisible: false,
};

interface NormalizeTenantSettingsOptions {
  defaultActiveVertical?: VerticalKey;
}

function resolveActiveVertical(
  settings: Record<string, unknown>,
  defaultActiveVertical: VerticalKey
): VerticalKey {
  // activeVertical is the canonical source of truth. Legacy booleans stay as
  // a read fallback while older payloads are still being normalized.
  if (
    settings.activeVertical === 'internal' ||
    settings.activeVertical === 'clinic' ||
    settings.activeVertical === 'fisio'
  ) {
    return settings.activeVertical;
  }

  if (typeof settings.verticalClinicUi === 'boolean') {
    return settings.verticalClinicUi ? 'clinic' : 'internal';
  }

  return defaultActiveVertical;
}

export function normalizeTenantSettings(
  settings: unknown,
  options: NormalizeTenantSettingsOptions = {}
): TenantSettings {
  if (!isRecord(settings)) {
    return TenantSettingsSchema.parse({
      ...DEFAULT_TENANT_SETTINGS,
      activeVertical: options.defaultActiveVertical ?? DEFAULT_TENANT_SETTINGS.activeVertical,
      verticalClinicUi:
        (options.defaultActiveVertical ?? DEFAULT_TENANT_SETTINGS.activeVertical) === 'clinic',
    });
  }

  const activeVertical = resolveActiveVertical(
    settings,
    options.defaultActiveVertical ?? DEFAULT_TENANT_SETTINGS.activeVertical
  );

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
    activeVertical,
    isPlatformAdminTenant:
      typeof settings.isPlatformAdminTenant === 'boolean'
        ? settings.isPlatformAdminTenant
        : DEFAULT_TENANT_SETTINGS.isPlatformAdminTenant,
    settingsVersion:
      typeof settings.settingsVersion === 'number'
        ? settings.settingsVersion
        : DEFAULT_TENANT_SETTINGS.settingsVersion,
    // Legacy compatibility flags remain persisted so older reads keep parsing,
    // but downstream experience resolution should prefer activeVertical and
    // resolved capability decisions instead of these booleans.
    verticalClinicUi:
      typeof settings.verticalClinicUi === 'boolean'
        ? settings.verticalClinicUi
        : activeVertical === 'clinic',
    clinicDentalMode:
      typeof settings.clinicDentalMode === 'boolean'
        ? settings.clinicDentalMode
        : DEFAULT_TENANT_SETTINGS.clinicDentalMode,
    internalPlatformVisible:
      typeof settings.internalPlatformVisible === 'boolean'
        ? settings.internalPlatformVisible
        : DEFAULT_TENANT_SETTINGS.internalPlatformVisible,
  });
}

export function mergeTenantSettings(
  current: unknown,
  updates: TenantSettingsInput
): TenantSettings {
  const normalizedCurrent = normalizeTenantSettings(current);
  const nextSettings: Record<string, unknown> = {
    ...normalizedCurrent,
    ...updates,
  };

  if (updates.activeVertical && typeof updates.verticalClinicUi !== 'boolean') {
    nextSettings.verticalClinicUi = updates.activeVertical === 'clinic';
  }

  if (updates.activeVertical && updates.activeVertical !== 'clinic') {
    nextSettings.clinicDentalMode =
      typeof updates.clinicDentalMode === 'boolean' ? updates.clinicDentalMode : false;
  }

  return normalizeTenantSettings(nextSettings, {
    defaultActiveVertical: normalizedCurrent.activeVertical,
  });
}

export function mapTenant(tenant: TenantRow): Tenant {
  return TenantSchema.parse({
    id: tenant.id,
    name: tenant.name,
    type: tenant.type,
    plan: tenant.plan,
    status: tenant.status,
    createdAt: tenant.createdAt.toISOString(),
    ownerId: tenant.ownerId,
    settings: normalizeTenantSettings(tenant.settings),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
