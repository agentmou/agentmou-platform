import { db, memberships, tenants } from '@agentmou/db';
import { and, eq } from 'drizzle-orm';

export class PlatformAdminAccessRepository {
  async getTenantMembershipContext(userId: string, tenantId: string) {
    const [row] = await db
      .select({
        role: memberships.role,
        settings: tenants.settings,
      })
      .from(memberships)
      .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
      .where(and(eq(memberships.userId, userId), eq(memberships.tenantId, tenantId)))
      .limit(1);

    return row ?? null;
  }
}
