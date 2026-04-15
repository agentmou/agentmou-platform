import type {
  AdminCreateTenantUserInput,
  AdminStartImpersonationInput,
  AdminStopImpersonationInput,
  AdminTenantDetail,
  AdminTenantListFilters,
  AdminTenantListResponse,
  AdminTenantUserMutationResponse,
  AdminTenantUsersResponse,
  AdminUpdateTenantUserInput,
  VerticalKey,
} from '@agentmou/contracts';

import {
  createAuthSession,
  revokeAuthSessionById,
  type AuthenticatedRequestContext,
} from '../../lib/auth-sessions.js';
import { recordAdminAuditEvent } from '../../lib/audit.js';
import { issuePasswordResetToken } from '../../lib/password-reset.js';
import { AdminRepository, type AdminTenantCursor } from './admin.repository.js';

const IMPERSONATION_TTL_MS = 30 * 60 * 1000;

function createHttpError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode });
}

function encodeTenantCursor(cursor: AdminTenantCursor) {
  return `${cursor.createdAt.toISOString()}::${cursor.id}`;
}

function decodeTenantCursor(cursor?: string): AdminTenantCursor | undefined {
  if (!cursor) {
    return undefined;
  }

  const [createdAt, id] = cursor.split('::');
  if (!createdAt || !id) {
    throw createHttpError('Invalid tenant cursor', 400);
  }

  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    throw createHttpError('Invalid tenant cursor', 400);
  }

  return {
    createdAt: date,
    id,
  };
}

interface AdminServiceDependencies {
  issuePasswordResetToken: typeof issuePasswordResetToken;
  recordAdminAuditEvent: typeof recordAdminAuditEvent;
  createAuthSession: typeof createAuthSession;
  revokeAuthSessionById: typeof revokeAuthSessionById;
  now: () => Date;
}

const DEFAULT_DEPENDENCIES: AdminServiceDependencies = {
  issuePasswordResetToken,
  recordAdminAuditEvent,
  createAuthSession,
  revokeAuthSessionById,
  now: () => new Date(),
};

export class AdminService {
  constructor(
    private readonly repository = new AdminRepository(),
    private readonly dependencies: AdminServiceDependencies = DEFAULT_DEPENDENCIES
  ) {}

  async listTenants(filters: AdminTenantListFilters): Promise<AdminTenantListResponse> {
    const limit = Math.min(filters.limit ?? 50, 100);
    const result = await this.repository.listTenants({
      q: filters.q,
      plan: filters.plan,
      vertical: filters.vertical,
      isPlatformAdminTenant: filters.isPlatformAdminTenant,
      limit,
      cursor: decodeTenantCursor(filters.cursor),
    });

    return {
      tenants: result.tenants,
      nextCursor: result.nextCursor ? encodeTenantCursor(result.nextCursor) : undefined,
    };
  }

  async getTenantDetail(tenantId: string) {
    return this.repository.getTenantDetail(tenantId);
  }

  async changeTenantVertical(params: {
    tenantId: string;
    activeVertical: VerticalKey;
    actorUserId: string;
    actorTenantId: string;
  }): Promise<AdminTenantDetail> {
    const existing = await this.repository.getTenantDetail(params.tenantId);
    if (!existing) {
      throw createHttpError('Tenant not found', 404);
    }

    if (existing.activeVertical !== params.activeVertical) {
      await this.repository.updateTenantActiveVertical(params.tenantId, params.activeVertical);
      await this.repository.ensureTenantVerticalConfig(params.tenantId, params.activeVertical);

      await this.dependencies.recordAdminAuditEvent({
        actorId: params.actorUserId,
        actorTenantId: params.actorTenantId,
        targetTenantId: params.tenantId,
        action: 'admin.tenant.vertical_changed',
        details: {
          oldVertical: existing.activeVertical,
          newVertical: params.activeVertical,
        },
      });
    }

    const updated = await this.repository.getTenantDetail(params.tenantId);
    if (!updated) {
      throw createHttpError('Tenant not found', 404);
    }

    return updated;
  }

  async listTenantUsers(tenantId: string): Promise<AdminTenantUsersResponse> {
    return {
      users: await this.repository.listTenantUsers(tenantId),
    };
  }

  async createTenantUser(params: {
    tenantId: string;
    body: AdminCreateTenantUserInput;
    actorUserId: string;
    actorTenantId: string;
  }): Promise<AdminTenantUserMutationResponse> {
    const email = params.body.email.trim().toLowerCase();
    let user = await this.repository.findUserByEmail(email);
    let createdGlobalUser = false;

    if (!user) {
      user = await this.repository.createUser({
        email,
        name: params.body.name?.trim() ?? null,
      });
      createdGlobalUser = true;
    }

    let membership = await this.repository.getMembership(params.tenantId, user.id);
    const previousRole = membership?.role;
    let createdMembership = false;

    if (!membership) {
      membership = await this.repository.createMembership({
        tenantId: params.tenantId,
        userId: user.id,
        role: params.body.role,
      });
      createdMembership = true;
    } else if (membership.role !== params.body.role) {
      membership = await this.repository.updateMembershipRole(membership.id, params.body.role);
      if (!membership) {
        throw createHttpError('Membership not found', 404);
      }
    }

    let activation: AdminTenantUserMutationResponse['activation'];
    if (!user.passwordHash) {
      const issuedToken = await this.dependencies.issuePasswordResetToken(user.id);
      activation = {
        token: issuedToken.token,
        link: issuedToken.link,
        expiresAt: issuedToken.expiresAt.toISOString(),
      };
    }

    const adminUser = await this.repository.getTenantUser(params.tenantId, user.id);
    if (!adminUser) {
      throw createHttpError('Tenant user could not be loaded', 500);
    }

    if (createdMembership) {
      await this.dependencies.recordAdminAuditEvent({
        actorId: params.actorUserId,
        actorTenantId: params.actorTenantId,
        targetTenantId: params.tenantId,
        action: 'admin.user.created',
        details: {
          targetUserId: user.id,
          membershipId: adminUser.membershipId,
          role: adminUser.role,
          createdGlobalUser,
        },
      });
    }

    if (previousRole && previousRole !== membership?.role) {
      await this.dependencies.recordAdminAuditEvent({
        actorId: params.actorUserId,
        actorTenantId: params.actorTenantId,
        targetTenantId: params.tenantId,
        action: 'admin.user.role_changed',
        details: {
          targetUserId: user.id,
          membershipId: adminUser.membershipId,
          oldRole: previousRole,
          newRole: adminUser.role,
        },
      });
    }

    return {
      user: adminUser,
      activation,
    };
  }

  async updateTenantUser(params: {
    tenantId: string;
    userId: string;
    body: AdminUpdateTenantUserInput;
    actorUserId: string;
    actorTenantId: string;
  }): Promise<AdminTenantUserMutationResponse> {
    const existingMembership = await this.repository.getMembership(params.tenantId, params.userId);
    const existingUser = await this.repository.getUserById(params.userId);

    if (!existingMembership || !existingUser) {
      throw createHttpError('Tenant user not found', 404);
    }

    if (
      params.body.role &&
      params.body.role !== existingMembership.role &&
      existingMembership.role === 'owner'
    ) {
      const ownerCount = await this.repository.countOwners(params.tenantId);
      if (ownerCount <= 1) {
        throw createHttpError('A tenant must keep at least one owner', 409);
      }
    }

    const nextName = params.body.name?.trim();

    if (nextName && nextName !== existingUser.name) {
      await this.repository.updateUserName(params.userId, nextName);
      await this.dependencies.recordAdminAuditEvent({
        actorId: params.actorUserId,
        actorTenantId: params.actorTenantId,
        targetTenantId: params.tenantId,
        action: 'admin.user.updated',
        details: {
          targetUserId: params.userId,
          membershipId: existingMembership.id,
          oldName: existingUser.name,
          newName: nextName,
        },
      });
    }

    if (params.body.role && params.body.role !== existingMembership.role) {
      await this.repository.updateMembershipRole(existingMembership.id, params.body.role);
      await this.dependencies.recordAdminAuditEvent({
        actorId: params.actorUserId,
        actorTenantId: params.actorTenantId,
        targetTenantId: params.tenantId,
        action: 'admin.user.role_changed',
        details: {
          targetUserId: params.userId,
          membershipId: existingMembership.id,
          oldRole: existingMembership.role,
          newRole: params.body.role,
        },
      });
    }

    const updated = await this.repository.getTenantUser(params.tenantId, params.userId);
    if (!updated) {
      throw createHttpError('Tenant user not found', 404);
    }

    return {
      user: updated,
    };
  }

  async deleteTenantUser(params: {
    tenantId: string;
    userId: string;
    actorUserId: string;
    actorTenantId: string;
  }) {
    const existingMembership = await this.repository.getMembership(params.tenantId, params.userId);
    if (!existingMembership) {
      throw createHttpError('Tenant user not found', 404);
    }

    if (existingMembership.role === 'owner') {
      const ownerCount = await this.repository.countOwners(params.tenantId);
      if (ownerCount <= 1) {
        throw createHttpError('A tenant must keep at least one owner', 409);
      }
    }

    await this.repository.deleteMembership(existingMembership.id);

    await this.dependencies.recordAdminAuditEvent({
      actorId: params.actorUserId,
      actorTenantId: params.actorTenantId,
      targetTenantId: params.tenantId,
      action: 'admin.user.deleted',
      details: {
        targetUserId: params.userId,
        membershipId: existingMembership.id,
        role: existingMembership.role,
      },
    });

    return { success: true };
  }

  async startImpersonation(params: {
    tenantId: string;
    body: AdminStartImpersonationInput;
    actorUserId: string;
    actorTenantId: string;
  }) {
    if (params.actorUserId === params.body.targetUserId) {
      throw createHttpError('Cannot impersonate the current user', 409);
    }

    const targetUser = await this.repository.getUserById(params.body.targetUserId);
    const targetMembership = await this.repository.getMembership(
      params.tenantId,
      params.body.targetUserId
    );
    const actorUser = await this.repository.getUserById(params.actorUserId);

    if (!targetUser || !targetMembership) {
      throw createHttpError('Target user not found in tenant', 404);
    }

    if (!actorUser) {
      throw createHttpError('Actor user not found', 404);
    }

    const expiresAt = new Date(this.dependencies.now().getTime() + IMPERSONATION_TTL_MS);
    const session = await this.repository.createImpersonationSession({
      actorUserId: params.actorUserId,
      actorTenantId: params.actorTenantId,
      targetUserId: targetUser.id,
      targetTenantId: params.tenantId,
      reason: params.body.reason,
      expiresAt,
      metadata: {
        targetRole: targetMembership.role,
      },
    });

    const authSession = await this.dependencies.createAuthSession({
      userId: targetUser.id,
      sessionType: 'impersonation',
      adminImpersonationSessionId: session.id,
      expiresAt: session.expiresAt,
    });

    await this.dependencies.recordAdminAuditEvent({
      actorId: params.actorUserId,
      actorTenantId: params.actorTenantId,
      targetTenantId: params.tenantId,
      action: 'admin.impersonation.started',
      details: {
        targetUserId: targetUser.id,
        impersonationSessionId: session.id,
        reason: params.body.reason,
      },
    });

    return {
      sessionId: session.id,
      expiresAt: session.expiresAt.toISOString(),
      cookieSession: {
        token: authSession.token,
        expiresAt: authSession.session.expiresAt,
      },
    };
  }

  async stopImpersonation(params: {
    body: AdminStopImpersonationInput;
    authContext?: AuthenticatedRequestContext;
    authSessionId?: string;
  }) {
    if (
      !params.authContext?.isImpersonation ||
      !params.authContext.impersonationSessionId ||
      !params.authContext.actorUserId ||
      !params.authContext.actorTenantId ||
      !params.authContext.targetTenantId ||
      !params.authSessionId
    ) {
      throw createHttpError('Impersonation session not active', 403);
    }

    const session = await this.repository.getImpersonationSession(
      params.authContext.impersonationSessionId
    );

    if (!session) {
      throw createHttpError('Impersonation session not found', 404);
    }

    const now = this.dependencies.now();
    if (session.endedAt) {
      throw createHttpError('Impersonation session has already ended', 409);
    }

    if (session.expiresAt.getTime() <= now.getTime()) {
      throw createHttpError('Impersonation session has expired', 409);
    }

    const actorUser = await this.repository.getUserById(params.authContext.actorUserId);
    if (!actorUser) {
      throw createHttpError('Actor user not found', 404);
    }

    await this.repository.endImpersonationSession(session.id, now);
    await this.dependencies.revokeAuthSessionById(params.authSessionId, now);

    const restoredSession = await this.dependencies.createAuthSession({
      userId: actorUser.id,
      sessionType: 'standard',
    });

    await this.dependencies.recordAdminAuditEvent({
      actorId: params.authContext.actorUserId,
      actorTenantId: params.authContext.actorTenantId,
      targetTenantId: params.authContext.targetTenantId,
      action: 'admin.impersonation.stopped',
      details: {
        targetUserId: params.authContext.targetUserId,
        impersonationSessionId: session.id,
      },
    });

    return {
      sessionId: restoredSession.session.id,
      endedAt: now.toISOString(),
      cookieSession: {
        token: restoredSession.token,
        expiresAt: restoredSession.session.expiresAt,
      },
    };
  }
}
