import { db, tenantModules } from '@agentmou/db';
import { and, eq } from 'drizzle-orm';

type DatabaseClient = typeof db;

export class ClinicModulesRepository {
  constructor(private readonly database: DatabaseClient = db) {}

  async listModules(tenantId: string) {
    return this.database.select().from(tenantModules).where(eq(tenantModules.tenantId, tenantId));
  }

  async getModule(tenantId: string, moduleKey: string) {
    const [module] = await this.database
      .select()
      .from(tenantModules)
      .where(and(eq(tenantModules.tenantId, tenantId), eq(tenantModules.moduleKey, moduleKey)))
      .limit(1);

    return module ?? null;
  }

  async updateModule(
    tenantId: string,
    moduleKey: string,
    data: Partial<typeof tenantModules.$inferInsert>
  ) {
    const existing = await this.getModule(tenantId, moduleKey);

    if (!existing) {
      const [created] = await this.database
        .insert(tenantModules)
        .values({
          tenantId,
          moduleKey,
          ...data,
        })
        .returning();

      return created ?? null;
    }

    const [module] = await this.database
      .update(tenantModules)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(tenantModules.tenantId, tenantId), eq(tenantModules.moduleKey, moduleKey)))
      .returning();

    return module ?? null;
  }
}
