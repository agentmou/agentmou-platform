import {
  adminImpersonationSessions,
  db,
  memberships,
  tenantVerticalConfigs,
  tenants,
  users,
} from '@agentmou/db';
import { and, asc, desc, eq, ilike, inArray, lt, or, sql, type SQL } from 'drizzle-orm';
import type {
  AdminTenantDetail,
  AdminTenantListSortBy,
  AdminTenantListSortDir,
  AdminTenantSummary,
  AdminTenantUser,
  VerticalKey,
} from '@agentmou/contracts';

import { normalizeTenantMembershipRole } from '../../lib/tenant-roles.js';
import { mergeTenantSettings, normalizeTenantSettings } from '../tenants/tenants.mapper.js';

export interface AdminTenantCursor {
  createdAt: Date;
  id: string;
}

interface ListAdminTenantsParams {
  q?: string;
  plan?: AdminTenantSummary['plan'];
  vertical?: VerticalKey;
  isPlatformAdminTenant?: boolean;
  sortBy?: AdminTenantListSortBy;
  sortDir?: AdminTenantListSortDir;
  limit: number;
  cursor?: AdminTenantCursor;
}

function buildSearchQuery(query: string) {
  return `%${query.trim()}%`;
}

function mapAdminTenantSummary(
  tenant: typeof tenants.$inferSelect,
  userCount: number
): AdminTenantSummary {
  const settings = normalizeTenantSettings(tenant.settings, {
    defaultActiveVertical: 'internal',
  });

  return {
    id: tenant.id,
    name: tenant.name,
    type: tenant.type as AdminTenantSummary['type'],
    plan: tenant.plan as AdminTenantSummary['plan'],
    ownerId: tenant.ownerId,
    createdAt: tenant.createdAt.toISOString(),
    activeVertical: settings.activeVertical,
    isPlatformAdminTenant: settings.isPlatformAdminTenant,
    userCount,
  };
}

function mapAdminTenantUser(row: {
  membershipId: string;
  tenantId: string;
  role: string;
  joinedAt: Date;
  lastActiveAt: Date;
  userId: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
}): AdminTenantUser {
  return {
    userId: row.userId,
    membershipId: row.membershipId,
    tenantId: row.tenantId,
    email: row.email,
    name: row.name,
    role: normalizeTenantMembershipRole(row.role) ?? 'viewer',
    hasPassword: Boolean(row.passwordHash),
    joinedAt: row.joinedAt.toISOString(),
    lastActiveAt: row.lastActiveAt.toISOString(),
  };
}

export class AdminRepository {
  async listTenants(params: ListAdminTenantsParams) {
    const conditions = [];

    if (params.plan) {
      conditions.push(eq(tenants.plan, params.plan));
    }

    if (params.vertical) {
      conditions.push(sql`${tenants.settings} ->> 'activeVertical' = ${params.vertical}`);
    }

    if (typeof params.isPlatformAdminTenant === 'boolean') {
      conditions.push(
        sql`coalesce((${tenants.settings} ->> 'isPlatformAdminTenant')::boolean, false) = ${params.isPlatformAdminTenant}`
      );
    }

    if (params.q) {
      const query = buildSearchQuery(params.q);
      conditions.push(
        or(
          ilike(tenants.name, query),
          sql`exists (
            select 1
            from ${memberships} as membership_search
            inner join ${users} as user_search
              on user_search.id = membership_search.user_id
            where membership_search.tenant_id = ${tenants.id}
              and (
                user_search.email ilike ${query}
                or coalesce(user_search.name, '') ilike ${query}
              )
          )`
        )
      );
    }

    if (params.cursor) {
      conditions.push(
        or(
          lt(tenants.createdAt, params.cursor.createdAt),
          and(eq(tenants.createdAt, params.cursor.createdAt), lt(tenants.id, params.cursor.id))
        )
      );
    }

    // Sort columns are whitelisted on the type. The cursor pagination above is
    // anchored to (createdAt, id) so when the consumer asks for a different
    // sort we still need a stable secondary order — keep id desc as the
    // tiebreaker so paging stays deterministic.
    const sortDir = params.sortDir ?? 'desc';
    const dirFn = sortDir === 'asc' ? asc : desc;
    const orderBy: SQL[] = [];
    switch (params.sortBy) {
      case 'name':
        orderBy.push(dirFn(tenants.name));
        break;
      case 'plan':
        orderBy.push(dirFn(tenants.plan));
        break;
      case 'vertical':
        orderBy.push(dirFn(sql`${tenants.settings} ->> 'activeVertical'`));
        break;
      case 'createdAt':
      default:
        orderBy.push(dirFn(tenants.createdAt));
        break;
    }
    orderBy.push(desc(tenants.id));

    const rows = await db
      .select()
      .from(tenants)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(...orderBy)
      .limit(params.limit + 1);

    const hasMore = rows.length > params.limit;
    const pageRows = hasMore ? rows.slice(0, params.limit) : rows;
    const userCounts = await this.listTenantUserCounts(pageRows.map((row) => row.id));

    return {
      tenants: pageRows.map((row) => mapAdminTenantSummary(row, userCounts.get(row.id) ?? 0)),
      nextCursor: hasMore
        ? {
            createdAt: pageRows[pageRows.length - 1].createdAt,
            id: pageRows[pageRows.length - 1].id,
          }
        : undefined,
    };
  }

  async getTenantDetail(tenantId: string): Promise<AdminTenantDetail | null> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);

    if (!tenant) {
      return null;
    }

    const settings = normalizeTenantSettings(tenant.settings, {
      defaultActiveVertical: 'internal',
    });
    const [userCountRow] = await db
      .select({
        userCount: sql<number>`count(*)`,
      })
      .from(memberships)
      .where(eq(memberships.tenantId, tenantId));

    const verticalConfigs = await db
      .select()
      .from(tenantVerticalConfigs)
      .where(eq(tenantVerticalConfigs.tenantId, tenantId))
      .orderBy(tenantVerticalConfigs.createdAt, tenantVerticalConfigs.verticalKey);

    return {
      ...mapAdminTenantSummary(tenant, Number(userCountRow?.userCount ?? 0)),
      settings,
      verticalConfigs: verticalConfigs.map((config) => ({
        id: config.id,
        tenantId: config.tenantId,
        verticalKey: config.verticalKey as VerticalKey,
        config: isRecord(config.config) ? config.config : {},
        createdAt: config.createdAt.toISOString(),
        updatedAt: config.updatedAt.toISOString(),
      })),
    };
  }

  async listTenantUsers(tenantId: string): Promise<AdminTenantUser[]> {
    const rows = await db
      .select({
        membershipId: memberships.id,
        tenantId: memberships.tenantId,
        role: memberships.role,
        joinedAt: memberships.joinedAt,
        lastActiveAt: memberships.lastActiveAt,
        userId: users.id,
        email: users.email,
        name: users.name,
        passwordHash: users.passwordHash,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.tenantId, tenantId))
      .orderBy(memberships.joinedAt, users.email);

    return rows.map(mapAdminTenantUser);
  }

  async getTenantUser(tenantId: string, userId: string): Promise<AdminTenantUser | null> {
    const [row] = await db
      .select({
        membershipId: memberships.id,
        tenantId: memberships.tenantId,
        role: memberships.role,
        joinedAt: memberships.joinedAt,
        lastActiveAt: memberships.lastActiveAt,
        userId: users.id,
        email: users.email,
        name: users.name,
        passwordHash: users.passwordHash,
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(and(eq(memberships.tenantId, tenantId), eq(memberships.userId, userId)))
      .limit(1);

    return row ? mapAdminTenantUser(row) : null;
  }

  async findUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user ?? null;
  }

  async getUserById(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return user ?? null;
  }

  async createUser(values: { email: string; name: string | null }) {
    const [user] = await db
      .insert(users)
      .values({
        email: values.email,
        name: values.name,
        passwordHash: null,
      })
      .returning();

    return user;
  }

  async updateUserName(userId: string, name: string) {
    const [user] = await db
      .update(users)
      .set({
        name,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    return user ?? null;
  }

  async getMembership(tenantId: string, userId: string) {
    const [membership] = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.tenantId, tenantId), eq(memberships.userId, userId)))
      .limit(1);

    return membership ?? null;
  }

  async createMembership(values: { tenantId: string; userId: string; role: string }) {
    const [membership] = await db.insert(memberships).values(values).returning();
    return membership;
  }

  async updateMembershipRole(membershipId: string, role: string) {
    const [membership] = await db
      .update(memberships)
      .set({
        role,
      })
      .where(eq(memberships.id, membershipId))
      .returning();

    return membership ?? null;
  }

  async deleteMembership(membershipId: string) {
    const [deleted] = await db
      .delete(memberships)
      .where(eq(memberships.id, membershipId))
      .returning();

    return deleted ?? null;
  }

  async countOwners(tenantId: string) {
    const [row] = await db
      .select({
        ownerCount: sql<number>`count(*)`,
      })
      .from(memberships)
      .where(and(eq(memberships.tenantId, tenantId), eq(memberships.role, 'owner')));

    return Number(row?.ownerCount ?? 0);
  }

  async updateTenantActiveVertical(tenantId: string, activeVertical: VerticalKey) {
    const [tenant] = await db
      .select({
        settings: tenants.settings,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      return null;
    }

    const settings = mergeTenantSettings(tenant.settings, {
      activeVertical,
    });

    await db
      .update(tenants)
      .set({
        settings,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));

    return settings;
  }

  async ensureTenantVerticalConfig(tenantId: string, verticalKey: VerticalKey) {
    const [existing] = await db
      .select()
      .from(tenantVerticalConfigs)
      .where(
        and(
          eq(tenantVerticalConfigs.tenantId, tenantId),
          eq(tenantVerticalConfigs.verticalKey, verticalKey)
        )
      )
      .limit(1);

    if (existing) {
      return existing;
    }

    const [created] = await db
      .insert(tenantVerticalConfigs)
      .values({
        tenantId,
        verticalKey,
        config: {},
      })
      .returning();

    return created;
  }

  async createImpersonationSession(values: {
    actorUserId: string;
    actorTenantId: string;
    targetUserId: string;
    targetTenantId: string;
    reason?: string;
    expiresAt: Date;
    metadata?: Record<string, unknown>;
  }) {
    const [session] = await db
      .insert(adminImpersonationSessions)
      .values({
        actorUserId: values.actorUserId,
        actorTenantId: values.actorTenantId,
        targetUserId: values.targetUserId,
        targetTenantId: values.targetTenantId,
        reason: values.reason,
        expiresAt: values.expiresAt,
        metadata: values.metadata ?? {},
      })
      .returning();

    return session;
  }

  async getImpersonationSession(sessionId: string) {
    const [session] = await db
      .select()
      .from(adminImpersonationSessions)
      .where(eq(adminImpersonationSessions.id, sessionId))
      .limit(1);

    return session ?? null;
  }

  async endImpersonationSession(sessionId: string, endedAt: Date) {
    const [session] = await db
      .update(adminImpersonationSessions)
      .set({
        endedAt,
      })
      .where(eq(adminImpersonationSessions.id, sessionId))
      .returning();

    return session ?? null;
  }

  private async listTenantUserCounts(tenantIds: string[]) {
    if (tenantIds.length === 0) {
      return new Map<string, number>();
    }

    const rows = await db
      .select({
        tenantId: memberships.tenantId,
        userCount: sql<number>`count(*)`,
      })
      .from(memberships)
      .where(inArray(memberships.tenantId, tenantIds))
      .groupBy(memberships.tenantId);

    return new Map(rows.map((row) => [row.tenantId, Number(row.userCount)]));
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
