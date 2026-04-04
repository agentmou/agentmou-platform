import type { TenantPlan } from '@agentmou/contracts';
import { db, clinicChannels, clinicProfiles, tenantModules, tenants } from '@agentmou/db';
import { eq } from 'drizzle-orm';

import { normalizeTenantSettings } from '../tenants/tenants.mapper.js';
import { mapClinicChannel, mapClinicProfile, mapTenantModule } from './clinic.mapper.js';

type DatabaseClient = typeof db;

export class ClinicExperienceRepository {
  constructor(private readonly database: DatabaseClient = db) {}

  async loadContext(tenantId: string) {
    const [tenant, profileRow, moduleRows, channelRows] = await Promise.all([
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
    ]);

    if (!tenant) {
      return null;
    }

    return {
      tenantId,
      plan: tenant.plan as TenantPlan,
      settings: normalizeTenantSettings(tenant.settings),
      profile: profileRow ? mapClinicProfile(profileRow) : null,
      modules: moduleRows.map(mapTenantModule),
      channels: channelRows.map(mapClinicChannel),
    };
  }
}
