import { db, tenants } from '@agentmou/db';
import { eq } from 'drizzle-orm';

export class TenantsService {
  async listTenants() {
    return db.select().from(tenants);
  }

  async createTenant(data: {
    name: string;
    type: string;
    plan: string;
    ownerId: string;
    settings?: Record<string, unknown>;
  }) {
    const [tenant] = await db
      .insert(tenants)
      .values({
        name: data.name,
        type: data.type,
        plan: data.plan,
        ownerId: data.ownerId,
        settings: data.settings ?? {},
      })
      .returning();
    return tenant;
  }

  async getTenant(id: string) {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id));
    return tenant ?? null;
  }

  async updateTenant(
    id: string,
    updates: { name?: string; type?: string; plan?: string },
  ) {
    const [tenant] = await db
      .update(tenants)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return tenant ?? null;
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
      .select({ settings: tenants.settings })
      .from(tenants)
      .where(eq(tenants.id, id));
    return tenant?.settings ?? null;
  }

  async updateTenantSettings(id: string, settings: Record<string, unknown>) {
    const [tenant] = await db
      .update(tenants)
      .set({ settings, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning({ settings: tenants.settings });
    return tenant?.settings ?? null;
  }
}
