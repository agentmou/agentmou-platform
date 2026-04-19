import { db, memberships, tenantVerticalConfigs, tenants, users } from '@agentmou/db';
import { and, desc, eq, or, sql } from 'drizzle-orm';

import { mergeTenantSettings, normalizeTenantSettings } from '../modules/tenants/tenants.mapper.js';

const CREATOR_ADMIN_EMAIL = 'timbrandtlopez@gmail.com';
const CREATOR_ADMIN_TENANT_NAME = 'Agentmou';

function isCreatorAccount(email?: string | null) {
  return email?.trim().toLowerCase() === CREATOR_ADMIN_EMAIL;
}

function buildCreatorAdminSettings(settings: unknown) {
  const normalized = normalizeTenantSettings(settings, {
    defaultActiveVertical: 'internal',
  });

  return mergeTenantSettings(normalized, {
    activeVertical: 'internal',
    isPlatformAdminTenant: true,
    verticalClinicUi: false,
    clinicDentalMode: false,
    internalPlatformVisible: true,
  });
}

export async function ensureCreatorAdminTenantForUser(params: {
  userId: string;
  email?: string | null;
}) {
  if (!isCreatorAccount(params.email)) {
    return null;
  }

  return db.transaction(async (tx) => {
    const [user] = await tx
      .select({
        id: users.id,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, params.userId))
      .limit(1);

    if (!user || !isCreatorAccount(user.email)) {
      return null;
    }

    const candidateRows = await tx
      .select({
        tenant: tenants,
        role: memberships.role,
        activeVertical: sql<string>`coalesce(${tenants.settings} ->> 'activeVertical', 'internal')`,
        isPlatformAdminTenant: sql<boolean>`coalesce((${tenants.settings} ->> 'isPlatformAdminTenant')::boolean, false)`,
      })
      .from(memberships)
      .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
      .where(
        and(
          eq(memberships.userId, user.id),
          or(
            eq(tenants.ownerId, user.id),
            eq(memberships.role, 'owner'),
            eq(memberships.role, 'admin')
          )
        )
      )
      .orderBy(
        desc(
          sql<number>`case when ${tenants.name} = ${CREATOR_ADMIN_TENANT_NAME} then 1 else 0 end`
        ),
        desc(
          sql<number>`case when coalesce((${tenants.settings} ->> 'isPlatformAdminTenant')::boolean, false) then 1 else 0 end`
        ),
        desc(
          sql<number>`case when coalesce(${tenants.settings} ->> 'activeVertical', 'internal') = 'internal' then 1 else 0 end`
        ),
        desc(sql<number>`case when ${memberships.role} = 'owner' then 1 else 0 end`),
        desc(tenants.createdAt)
      );

    const candidate =
      candidateRows.find((row) => row.tenant.name === CREATOR_ADMIN_TENANT_NAME) ??
      candidateRows.find((row) => row.isPlatformAdminTenant) ??
      candidateRows.find((row) => row.activeVertical === 'internal') ??
      null;

    const nextSettings = buildCreatorAdminSettings(candidate?.tenant.settings);

    let tenantRow = candidate?.tenant ?? null;

    if (!tenantRow) {
      [tenantRow] = await tx
        .insert(tenants)
        .values({
          name: CREATOR_ADMIN_TENANT_NAME,
          type: 'business',
          plan: 'pro',
          ownerId: user.id,
          status: 'active',
          settings: nextSettings,
        })
        .returning();
    } else {
      [tenantRow] = await tx
        .update(tenants)
        .set({
          name: CREATOR_ADMIN_TENANT_NAME,
          ownerId: user.id,
          status: 'active',
          settings: nextSettings,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenantRow.id))
        .returning();
    }

    const [membership] = await tx
      .select()
      .from(memberships)
      .where(and(eq(memberships.tenantId, tenantRow.id), eq(memberships.userId, user.id)))
      .limit(1);

    if (!membership) {
      await tx.insert(memberships).values({
        tenantId: tenantRow.id,
        userId: user.id,
        role: 'owner',
      });
    } else if (membership.role !== 'owner') {
      await tx
        .update(memberships)
        .set({
          role: 'owner',
        })
        .where(eq(memberships.id, membership.id));
    }

    const [verticalConfig] = await tx
      .select()
      .from(tenantVerticalConfigs)
      .where(
        and(
          eq(tenantVerticalConfigs.tenantId, tenantRow.id),
          eq(tenantVerticalConfigs.verticalKey, 'internal')
        )
      )
      .limit(1);

    if (!verticalConfig) {
      await tx.insert(tenantVerticalConfigs).values({
        tenantId: tenantRow.id,
        verticalKey: 'internal',
        config: {
          label: 'control_plane',
          isPlatformAdminTenant: true,
        },
      });
    }

    return tenantRow.id;
  });
}

export function sortAuthTenants<T extends { name: string; status?: string; settings?: unknown }>(
  tenantsToSort: T[]
) {
  return [...tenantsToSort].sort((left, right) => {
    const leftSettings = normalizeTenantSettings(left.settings, {
      defaultActiveVertical: 'internal',
    });
    const rightSettings = normalizeTenantSettings(right.settings, {
      defaultActiveVertical: 'internal',
    });

    if ((left.status ?? 'active') !== (right.status ?? 'active')) {
      return (left.status ?? 'active') === 'active' ? -1 : 1;
    }

    if (leftSettings.isPlatformAdminTenant !== rightSettings.isPlatformAdminTenant) {
      return leftSettings.isPlatformAdminTenant ? -1 : 1;
    }

    if (leftSettings.activeVertical !== rightSettings.activeVertical) {
      return leftSettings.activeVertical === 'internal' ? -1 : 1;
    }

    if (left.name !== right.name) {
      return left.name.localeCompare(right.name, 'es');
    }

    return 0;
  });
}
