import type { TenantPlan, VerticalKey } from '@agentmou/contracts';
import {
  clinicChannels,
  clinicProfiles,
  db,
  tenantModules,
  tenantVerticalConfigs,
  tenants,
} from '@agentmou/db';
import { eq } from 'drizzle-orm';

import { normalizeTenantSettings } from '../tenants/tenants.mapper.js';
import { mapClinicChannel, mapClinicProfile, mapTenantModule } from './clinic.mapper.js';

type DatabaseClient = typeof db;

export class ClinicExperienceRepository {
  constructor(private readonly database: DatabaseClient = db) {}

  async loadContext(tenantId: string) {
    const [tenant, profileRow, moduleRows, channelRows, verticalConfigRows] = await Promise.all([
      this.database
        .select({ id: tenants.id, plan: tenants.plan, settings: tenants.settings })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .then((rows) => rows[0] ?? null),
      this.database
        .select()
        .from(clinicProfiles)
        .where(eq(clinicProfiles.tenantId, tenantId))
        .then((rows) => rows[0] ?? null),
      this.database.select().from(tenantModules).where(eq(tenantModules.tenantId, tenantId)),
      this.database.select().from(clinicChannels).where(eq(clinicChannels.tenantId, tenantId)),
      this.database
        .select({ verticalKey: tenantVerticalConfigs.verticalKey })
        .from(tenantVerticalConfigs)
        .where(eq(tenantVerticalConfigs.tenantId, tenantId)),
    ]);

    if (!tenant) {
      return null;
    }

    // `tenant_vertical_configs` is the multi-vertical source of truth
    // (PR-09). When empty, callers fall back to
    // `settings.activeVertical` via `resolveTenantVerticalConfig` —
    // that's the legacy single-vertical path every tenant still runs on.
    const enabledVerticals = verticalConfigRows.map((row) => row.verticalKey as VerticalKey);

    return {
      tenantId,
      plan: tenant.plan as TenantPlan,
      settings: normalizeTenantSettings(tenant.settings),
      profile: profileRow ? mapClinicProfile(profileRow) : null,
      modules: moduleRows.map(mapTenantModule),
      channels: channelRows.map(mapClinicChannel),
      enabledVerticals,
    };
  }
}
