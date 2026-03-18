import { db, memberships, users } from '@agentmou/db';
import { eq, and } from 'drizzle-orm';
import { mapMembership } from './memberships.mapper.js';

const membershipSelection = {
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
};

export class MembershipsService {
  async listMembers(tenantId: string) {
    const members = await db
      .select(membershipSelection)
      .from(memberships)
      .leftJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.tenantId, tenantId));

    return members.map(mapMembership);
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

    const createdMember = await this.getMember(tenantId, membership.id);
    if (!createdMember) {
      throw new Error(`Created membership ${membership.id} could not be loaded`);
    }

    return createdMember;
  }

  async getMember(tenantId: string, memberId: string) {
    const [membership] = await db
      .select(membershipSelection)
      .from(memberships)
      .leftJoin(users, eq(memberships.userId, users.id))
      .where(
        and(eq(memberships.id, memberId), eq(memberships.tenantId, tenantId)),
      );
    return membership ? mapMembership(membership) : null;
  }

  async updateMemberRole(tenantId: string, memberId: string, role: string) {
    const [membership] = await db
      .update(memberships)
      .set({ role })
      .where(
        and(eq(memberships.id, memberId), eq(memberships.tenantId, tenantId)),
      )
      .returning();

    if (!membership) {
      return null;
    }

    return this.getMember(tenantId, membership.id);
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
