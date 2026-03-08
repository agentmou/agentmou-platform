import { db, memberships, users } from '@agentmou/db';
import { eq, and } from 'drizzle-orm';

export class MembershipsService {
  async listMembers(tenantId: string) {
    return db
      .select({
        id: memberships.id,
        tenantId: memberships.tenantId,
        userId: memberships.userId,
        role: memberships.role,
        joinedAt: memberships.joinedAt,
        lastActiveAt: memberships.lastActiveAt,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
        },
      })
      .from(memberships)
      .leftJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.tenantId, tenantId));
  }

  async addMember(tenantId: string, data: { userId: string; role: string }) {
    const [membership] = await db
      .insert(memberships)
      .values({
        tenantId,
        userId: data.userId,
        role: data.role,
      })
      .returning();
    return membership;
  }

  async getMember(tenantId: string, memberId: string) {
    const [membership] = await db
      .select({
        id: memberships.id,
        tenantId: memberships.tenantId,
        userId: memberships.userId,
        role: memberships.role,
        joinedAt: memberships.joinedAt,
        lastActiveAt: memberships.lastActiveAt,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
        },
      })
      .from(memberships)
      .leftJoin(users, eq(memberships.userId, users.id))
      .where(
        and(eq(memberships.id, memberId), eq(memberships.tenantId, tenantId)),
      );
    return membership ?? null;
  }

  async updateMemberRole(tenantId: string, memberId: string, role: string) {
    const [membership] = await db
      .update(memberships)
      .set({ role })
      .where(
        and(eq(memberships.id, memberId), eq(memberships.tenantId, tenantId)),
      )
      .returning();
    return membership ?? null;
  }

  async removeMember(tenantId: string, memberId: string) {
    const [deleted] = await db
      .delete(memberships)
      .where(
        and(eq(memberships.id, memberId), eq(memberships.tenantId, tenantId)),
      )
      .returning({ id: memberships.id });
    return deleted ? { success: true } : { success: false };
  }
}
