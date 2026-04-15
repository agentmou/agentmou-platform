import type {
  AdminChangeTenantVerticalInput,
  AdminCreateTenantUserInput,
  AdminDeleteTenantUserResponse,
  AdminStartImpersonationInput,
  AdminStartImpersonationResponse,
  AdminStopImpersonationInput,
  AdminStopImpersonationResponse,
  AdminTenantDetail,
  AdminTenantListFilters,
  AdminTenantListResponse,
  AdminTenantUser,
  AdminTenantUserMutationResponse,
  AdminUpdateTenantUserInput,
  Tenant,
  VerticalKey,
} from '@agentmou/contracts';

import { tenantMembers, tenants } from '@/lib/demo-catalog';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso() {
  return new Date('2026-02-01T10:30:00.000Z').toISOString();
}

function normalizeVertical(tenant: Tenant): VerticalKey {
  return (
    tenant.settings.activeVertical ?? (tenant.settings.verticalClinicUi ? 'clinic' : 'internal')
  );
}

let demoTenants = clone(tenants);
const demoUsersByTenant = new Map<string, AdminTenantUser[]>(
  Array.from(
    new Set([
      ...tenants.map((tenant) => tenant.id),
      ...tenantMembers.map((member) => member.tenantId),
    ])
  ).map((tenantId) => [
    tenantId,
    tenantMembers
      .filter((member) => member.tenantId === tenantId)
      .map((member) => ({
        userId: `user-${member.id}`,
        membershipId: member.id,
        tenantId: member.tenantId,
        email: member.email,
        name: member.name,
        role: member.role,
        hasPassword: true,
        joinedAt: member.joinedAt,
        lastActiveAt: member.lastActiveAt,
      })),
  ])
);

function ensureTenantUsers(tenantId: string) {
  if (!demoUsersByTenant.has(tenantId)) {
    demoUsersByTenant.set(tenantId, []);
  }

  return demoUsersByTenant.get(tenantId)!;
}

function buildTenantDetail(tenantId: string): AdminTenantDetail | null {
  const tenant = demoTenants.find((item) => item.id === tenantId);
  if (!tenant) {
    return null;
  }

  const activeVertical = normalizeVertical(tenant);
  const users = ensureTenantUsers(tenantId);

  return {
    id: tenant.id,
    name: tenant.name,
    type: tenant.type,
    plan: tenant.plan,
    ownerId: tenant.ownerId,
    createdAt: tenant.createdAt,
    activeVertical,
    isPlatformAdminTenant: Boolean(tenant.settings.isPlatformAdminTenant),
    userCount: users.length,
    settings: clone(tenant.settings),
    verticalConfigs: [
      {
        id: `config-${tenant.id}-${activeVertical}`,
        tenantId: tenant.id,
        verticalKey: activeVertical,
        config: {},
        createdAt: tenant.createdAt,
        updatedAt: nowIso(),
      },
    ],
  };
}

export function listAdminTenants(filters: AdminTenantListFilters = {}): AdminTenantListResponse {
  const query = filters.q?.trim().toLowerCase();

  const items = demoTenants
    .filter((tenant) => {
      if (filters.plan && tenant.plan !== filters.plan) {
        return false;
      }

      if (filters.vertical && normalizeVertical(tenant) !== filters.vertical) {
        return false;
      }

      if (
        typeof filters.isPlatformAdminTenant === 'boolean' &&
        Boolean(tenant.settings.isPlatformAdminTenant) !== filters.isPlatformAdminTenant
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const tenantUsers = ensureTenantUsers(tenant.id);
      return (
        tenant.name.toLowerCase().includes(query) ||
        tenantUsers.some(
          (user) =>
            user.email.toLowerCase().includes(query) || user.name?.toLowerCase().includes(query)
        )
      );
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, filters.limit ?? 25)
    .map((tenant) => {
      const users = ensureTenantUsers(tenant.id);
      return {
        id: tenant.id,
        name: tenant.name,
        type: tenant.type,
        plan: tenant.plan,
        ownerId: tenant.ownerId,
        createdAt: tenant.createdAt,
        activeVertical: normalizeVertical(tenant),
        isPlatformAdminTenant: Boolean(tenant.settings.isPlatformAdminTenant),
        userCount: users.length,
      };
    });

  return {
    tenants: clone(items),
  };
}

export function getAdminTenantDetail(tenantId: string) {
  return clone(buildTenantDetail(tenantId));
}

export function listAdminTenantUsers(tenantId: string) {
  return clone(ensureTenantUsers(tenantId));
}

export function createAdminTenantUser(
  tenantId: string,
  body: AdminCreateTenantUserInput
): AdminTenantUserMutationResponse {
  const users = ensureTenantUsers(tenantId);
  const existing = users.find((user) => user.email.toLowerCase() === body.email.toLowerCase());
  const timestamp = nowIso();

  if (existing) {
    existing.role = body.role;
    return { user: clone(existing) };
  }

  const idSuffix = `${users.length + 1}`;
  const nextUser: AdminTenantUser = {
    userId: `user-${tenantId}-${idSuffix}`,
    membershipId: `membership-${tenantId}-${idSuffix}`,
    tenantId,
    email: body.email.toLowerCase(),
    name: body.name ?? null,
    role: body.role,
    hasPassword: false,
    joinedAt: timestamp,
    lastActiveAt: timestamp,
  };

  users.push(nextUser);

  return {
    user: clone(nextUser),
    activation: {
      token: `demo-reset-${nextUser.userId}`,
      link: `http://localhost:3000/reset-password?token=demo-reset-${nextUser.userId}`,
      expiresAt: new Date(Date.parse(timestamp) + 1000 * 60 * 60).toISOString(),
    },
  };
}

export function updateAdminTenantUser(
  tenantId: string,
  userId: string,
  body: AdminUpdateTenantUserInput
): AdminTenantUserMutationResponse {
  const users = ensureTenantUsers(tenantId);
  const user = users.find((item) => item.userId === userId);

  if (!user) {
    throw new Error('User not found');
  }

  if (body.name !== undefined) {
    user.name = body.name;
  }

  if (body.role !== undefined) {
    user.role = body.role;
  }

  user.lastActiveAt = nowIso();

  return { user: clone(user) };
}

export function deleteAdminTenantUser(
  tenantId: string,
  userId: string
): AdminDeleteTenantUserResponse {
  const users = ensureTenantUsers(tenantId);
  const user = users.find((item) => item.userId === userId);

  if (!user) {
    throw new Error('User not found');
  }

  const ownerCount = users.filter((item) => item.role === 'owner').length;
  if (user.role === 'owner' && ownerCount === 1) {
    throw new Error('Cannot remove the last owner from this tenant');
  }

  demoUsersByTenant.set(
    tenantId,
    users.filter((item) => item.userId !== userId)
  );

  return { success: true };
}

export function changeAdminTenantVertical(
  tenantId: string,
  body: AdminChangeTenantVerticalInput
): AdminTenantDetail {
  demoTenants = demoTenants.map((tenant) => {
    if (tenant.id !== tenantId) {
      return tenant;
    }

    return {
      ...tenant,
      settings: {
        ...tenant.settings,
        activeVertical: body.activeVertical,
        verticalClinicUi: body.activeVertical === 'clinic',
        clinicDentalMode: body.activeVertical === 'clinic',
        internalPlatformVisible:
          body.activeVertical === 'internal' || tenant.settings.internalPlatformVisible,
      },
    };
  });

  const detail = buildTenantDetail(tenantId);
  if (!detail) {
    throw new Error('Tenant not found');
  }

  return clone(detail);
}

export function startAdminImpersonation(
  tenantId: string,
  body: AdminStartImpersonationInput
): AdminStartImpersonationResponse {
  const user = ensureTenantUsers(tenantId).find((item) => item.userId === body.targetUserId);
  if (!user) {
    throw new Error('Target user not found');
  }

  return {
    sessionId: `demo-session-${tenantId}-${user.userId}`,
    expiresAt: new Date(Date.parse(nowIso()) + 1000 * 60 * 30).toISOString(),
  };
}

export function stopAdminImpersonation(
  _body: AdminStopImpersonationInput
): AdminStopImpersonationResponse {
  return {
    sessionId: 'demo-restored-session',
    endedAt: nowIso(),
  };
}
