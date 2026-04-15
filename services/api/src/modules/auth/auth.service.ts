import { createHash } from 'node:crypto';
import {
  adminImpersonationSessions,
  db,
  memberships,
  tenants,
  users,
  passwordResetTokens,
} from '@agentmou/db';
import { verifyToken, hashPassword, verifyPassword } from '@agentmou/auth';
import { and, eq, isNull } from 'drizzle-orm';

import {
  createAuthSession,
  getActiveAuthSessionByToken,
  getAuthSessionTokenFromCookie,
  revokeAuthSessionById,
  type AuthenticatedRequestContext,
} from '../../lib/auth-sessions.js';
import { normalizeTenantMembershipRole } from '../../lib/tenant-roles.js';
import { issuePasswordResetToken } from '../../lib/password-reset.js';
import { normalizeTenantSettings } from '../tenants/tenants.mapper.js';

interface AuthBrowserSessionCookie {
  token: string;
  expiresAt: Date;
}

interface AuthUserPayload {
  id: string;
  email: string;
  name: string | null;
}

interface AuthTenantPayload {
  id: string;
  name: string;
  plan: string;
  role?: string;
  settings?: unknown;
}

interface AuthSessionPayload {
  isImpersonation: boolean;
  impersonationSessionId: string | null;
  actorUserId: string | null;
  actorTenantId: string | null;
  targetUserId: string | null;
  targetTenantId: string | null;
}

interface LoginLikeResponse {
  user: AuthUserPayload;
  tenants: AuthTenantPayload[];
  session: AuthSessionPayload | null;
  cookieSession: AuthBrowserSessionCookie;
}

interface RegisterResponse {
  user: AuthUserPayload;
  tenant: AuthTenantPayload;
  session: AuthSessionPayload | null;
  cookieSession: AuthBrowserSessionCookie;
}

export class AuthService {
  private async listUserTenants(userId: string): Promise<AuthTenantPayload[]> {
    const userTenants = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        plan: tenants.plan,
        role: memberships.role,
        settings: tenants.settings,
      })
      .from(memberships)
      .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
      .where(eq(memberships.userId, userId));

    return userTenants.map((tenant) => ({
      ...tenant,
      role: normalizeTenantMembershipRole(tenant.role),
      settings: normalizeTenantSettings(tenant.settings),
    }));
  }

  private buildSessionPayload(authContext?: AuthenticatedRequestContext | null) {
    if (!authContext?.isImpersonation) {
      return null;
    }

    return {
      isImpersonation: true,
      impersonationSessionId: authContext.impersonationSessionId ?? null,
      actorUserId: authContext.actorUserId ?? null,
      actorTenantId: authContext.actorTenantId ?? null,
      targetUserId: authContext.targetUserId ?? null,
      targetTenantId: authContext.targetTenantId ?? null,
    } satisfies AuthSessionPayload;
  }

  private async resolveRequestUser(params: {
    cookieHeader?: string;
    authorization?: string;
  }): Promise<{ user: AuthUserPayload; authContext: AuthenticatedRequestContext }> {
    const cookieToken = getAuthSessionTokenFromCookie(params.cookieHeader);

    if (cookieToken) {
      const activeSession = await getActiveAuthSessionByToken(cookieToken);
      if (activeSession) {
        return {
          user: {
            id: activeSession.user.id,
            email: activeSession.user.email,
            name: activeSession.user.name ?? null,
          },
          authContext: activeSession.authContext,
        };
      }
    }

    const token = params.authorization?.startsWith('Bearer ')
      ? params.authorization.slice(7)
      : undefined;
    if (!token) {
      throw Object.assign(
        new Error(cookieToken ? 'Invalid or expired session' : 'Missing authorization'),
        {
          statusCode: 401,
        }
      );
    }

    const payload = await verifyToken(token);
    if (!payload || payload.isImpersonationRestore) {
      throw Object.assign(new Error('Invalid token'), { statusCode: 401 });
    }

    if (
      payload.isImpersonation &&
      (!payload.impersonationSessionId ||
        !payload.actorUserId ||
        !payload.actorTenantId ||
        !payload.targetUserId ||
        !payload.targetTenantId)
    ) {
      throw Object.assign(new Error('Invalid impersonation token'), { statusCode: 401 });
    }

    const [user] = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
      },
      authContext: {
        userId: payload.userId,
        email: payload.email,
        sessionId: null,
        sessionType: 'bearer',
        isImpersonation: Boolean(payload.isImpersonation),
        impersonationSessionId: payload.impersonationSessionId ?? null,
        actorUserId: payload.actorUserId ?? null,
        actorTenantId: payload.actorTenantId ?? null,
        targetUserId: payload.targetUserId ?? null,
        targetTenantId: payload.targetTenantId ?? null,
      },
    };
  }

  async register(body: {
    email: string;
    password: string;
    name: string;
  }): Promise<RegisterResponse> {
    const { email, password, name } = body;

    if (!email || !password || !name) {
      throw Object.assign(new Error('Email, password, and name are required'), { statusCode: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const [existing] = await db.select().from(users).where(eq(users.email, normalizedEmail));
    if (existing) {
      throw Object.assign(new Error('Email already registered'), { statusCode: 409 });
    }

    const result = await db.transaction(async (tx) => {
      const pwHash = hashPassword(password);
      const [user] = await tx
        .insert(users)
        .values({ email: normalizedEmail, name, passwordHash: pwHash })
        .returning({ id: users.id, email: users.email, name: users.name });

      const [tenant] = await tx
        .insert(tenants)
        .values({
          name: `${name}'s Workspace`,
          type: 'business',
          plan: 'free',
          ownerId: user.id,
          settings: normalizeTenantSettings(
            {
              activeVertical: 'clinic',
            },
            {
              defaultActiveVertical: 'clinic',
            }
          ),
        })
        .returning({
          id: tenants.id,
          name: tenants.name,
          plan: tenants.plan,
          settings: tenants.settings,
        });

      await tx.insert(memberships).values({
        tenantId: tenant.id,
        userId: user.id,
        role: 'owner',
      });

      return { user, tenant };
    });

    const { session, token } = await createAuthSession({
      userId: result.user.id,
      sessionType: 'standard',
    });

    return {
      user: result.user,
      tenant: {
        ...result.tenant,
        role: 'owner',
        settings: normalizeTenantSettings(result.tenant.settings),
      },
      session: null,
      cookieSession: {
        token,
        expiresAt: session.expiresAt,
      },
    };
  }

  async login(body: {
    email: string;
    password: string;
    rememberMe?: boolean;
  }): Promise<LoginLikeResponse> {
    const { email, password, rememberMe = false } = body;

    if (!email || !password) {
      throw Object.assign(new Error('Email and password are required'), { statusCode: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail));
    if (!user || !user.passwordHash) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    const { session, token } = await createAuthSession({
      userId: user.id,
      sessionType: 'standard',
      rememberMe,
    });

    return {
      user: { id: user.id, email: user.email, name: user.name ?? null },
      tenants: await this.listUserTenants(user.id),
      session: null,
      cookieSession: {
        token,
        expiresAt: session.expiresAt,
      },
    };
  }

  async getCurrentUser(params: { cookieHeader?: string; authorization?: string }) {
    const { user, authContext } = await this.resolveRequestUser(params);

    return {
      user: {
        ...user,
        tenants: await this.listUserTenants(user.id),
      },
      session: this.buildSessionPayload(authContext),
    };
  }

  async logout(params: { cookieHeader?: string }) {
    const cookieToken = getAuthSessionTokenFromCookie(params.cookieHeader);

    if (!cookieToken) {
      return { ok: true as const };
    }

    const activeSession = await getActiveAuthSessionByToken(cookieToken);
    if (!activeSession) {
      return { ok: true as const };
    }

    await revokeAuthSessionById(activeSession.session.id, new Date());

    if (
      activeSession.session.sessionType === 'impersonation' &&
      activeSession.session.adminImpersonationSessionId
    ) {
      await db
        .update(adminImpersonationSessions)
        .set({
          endedAt: new Date(),
        })
        .where(
          and(
            eq(adminImpersonationSessions.id, activeSession.session.adminImpersonationSessionId),
            isNull(adminImpersonationSessions.endedAt)
          )
        );
    }

    return { ok: true as const };
  }

  /**
   * Creates a password-reset token if the user exists. Always succeeds from the
   * client perspective (no email enumeration). Email delivery is not wired;
   * in development the reset URL is logged when LOG_PASSWORD_RESET_LINK=1.
   */
  async forgotPassword(email: string) {
    const normalized = email.trim().toLowerCase();
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalized))
      .limit(1);

    if (user) {
      const issuedToken = await issuePasswordResetToken(user.id);

      if (process.env.LOG_PASSWORD_RESET_LINK === '1' || process.env.NODE_ENV !== 'production') {
        process.stdout.write(`[auth] password reset link for ${normalized}: ${issuedToken.link}\n`);
      }
    }

    return { ok: true as const };
  }

  async resetPassword(token: string, password: string) {
    const tokenHash = createHash('sha256').update(token, 'utf8').digest('hex');
    const [row] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1);

    if (!row || row.consumedAt || row.expiresAt < new Date()) {
      throw Object.assign(new Error('Invalid or expired reset token'), {
        statusCode: 400,
      });
    }

    const pwHash = hashPassword(password);
    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ passwordHash: pwHash, updatedAt: new Date() })
        .where(eq(users.id, row.userId));
      await tx
        .update(passwordResetTokens)
        .set({ consumedAt: new Date() })
        .where(eq(passwordResetTokens.id, row.id));
    });

    return { ok: true as const };
  }
}
