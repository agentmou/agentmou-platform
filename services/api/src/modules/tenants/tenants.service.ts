import { db, tenants } from '@agentmou/db';
import { eq } from 'drizzle-orm';
import {
  mapTenant,
  mergeTenantSettings,
  normalizeTenantSettings,
} from './tenants.mapper.js';
import type {
  CreateTenantInput,
  TenantSettingsInput,
  UpdateTenantInput,
} from './tenants.schema.js';

export class TenantsService {
  async listTenants() {
    const tenantRows = await db.select().from(tenants);
    return tenantRows.map(mapTenant);
  }

  async createTenant(data: CreateTenantInput) {
    const [tenant] = await db
      .insert(tenants)
      .values({
        name: data.name,
        type: data.type,
        plan: data.plan,
        ownerId: data.ownerId,
        settings: normalizeTenantSettings(data.settings),
      })
      .returning();
    return mapTenant(tenant);
  }

  async getTenant(id: string) {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id));
    return tenant ? mapTenant(tenant) : null;
  }

  async updateTenant(
    id: string,
    updates: UpdateTenantInput,
  ) {
    const [tenant] = await db
      .update(tenants)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return tenant ? mapTenant(tenant) : null;
  }

  async deleteTenant(id: string) {
    const [deleted] = await db
      .delete(tenants)
      .where(eq(tenants.id, id))
      .returning({ id: tenants.id });
    return deleted ? { success: true } : { success: false };
  }

  async getTenantSettings(id: string) {
    const [tenant] = await db
      .select({ id: tenants.id, settings: tenants.settings })
      .from(tenants)
      .where(eq(tenants.id, id));

    if (!tenant) {
      return null;
    }

    return normalizeTenantSettings(tenant.settings);
  }

  async updateTenantSettings(id: string, settings: TenantSettingsInput) {
    const [existingTenant] = await db
      .select({ id: tenants.id, settings: tenants.settings })
      .from(tenants)
      .where(eq(tenants.id, id));

    if (!existingTenant) {
      return null;
    }

    const normalizedSettings = mergeTenantSettings(existingTenant.settings, settings);
    const [tenant] = await db
      .update(tenants)
      .set({ settings: normalizedSettings, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning({ settings: tenants.settings });

    if (!tenant) {
      return null;
    }

    return normalizeTenantSettings(tenant.settings);
  }
}
