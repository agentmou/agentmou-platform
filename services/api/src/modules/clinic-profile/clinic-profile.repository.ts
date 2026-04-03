import { clinicProfiles, db } from '@agentmou/db';
import { eq } from 'drizzle-orm';

type DatabaseClient = typeof db;

export class ClinicProfileRepository {
  constructor(private readonly database: DatabaseClient = db) {}

  async getProfile(tenantId: string) {
    const [profile] = await this.database
      .select()
      .from(clinicProfiles)
      .where(eq(clinicProfiles.tenantId, tenantId))
      .limit(1);

    return profile ?? null;
  }

  async updateProfile(
    tenantId: string,
    data: Partial<typeof clinicProfiles.$inferInsert>
  ) {
    const [profile] = await this.database
      .update(clinicProfiles)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(clinicProfiles.tenantId, tenantId))
      .returning();

    return profile ?? null;
  }
}
