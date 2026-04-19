import { createHash } from 'node:crypto';
import {
  adminImpersonationSessions,
  db,
  emailVerificationTokens,
  memberships,
  passwordResetTokens,
  tenants,
  users,
} from '@agentmou/db';
import { verifyToken, hashPassword, verifyPassword } from '@agentmou/auth';
import { and, eq, isNull } from 'drizzle-orm';

import {
  createAuthSession,
  getActiveAuthSessionByToken,
  getAuthSessionTokenFromCookie,
  revokeAuthSessionById,
  revokeUserAuthSessions,
  type AuthenticatedRequestContext,
} from '../../lib/auth-sessions.js';
import { sendEmailVerificationEmail } from '../../lib/auth-email.js';
import { issueEmailVerificationToken } from '../../lib/email-verification.js';
import {
  ensureCreatorAdminTenantForUser,
  sortAuthTenants,
} from '../../lib/platform-admin-tenant.js';
import { normalizeTenantMembershipRole } from '../../lib/tenant-roles.js';
import { issuePasswordResetToken } from '../../lib/password-reset.js';
import { sendPasswordResetEmail } from '../../lib/password-reset-email.js';
import { normalizeTenantSettings } from '../tenants/tenants.mapper.js';

interface AuthBrowserSessionCookie {
  token: string;
  expiresAt: Date;
}

interface AuthUserPayload {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
}

interface AuthTenantPayload {
  id: string;
  name: string;
  plan: string;
  status: string;
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
  requiresEmailVerification: boolean;
  emailVerificationSent: boolean;
}

export class AuthService {
  private async listUserTenants(userId: string): Promise<AuthTenantPayload[]> {
    const [currentUser] = await db
      .select({
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    await ensureCreatorAdminTenantForUser({
      userId,
      email: currentUser?.email ?? null,
    });

    const userTenants = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        plan: tenants.plan,
        status: tenants.status,
        role: memberships.role,
        settings: tenants.settings,
      })
      .from(memberships)
      .innerJoin(tenants, eq(memberships.tenantId, tenants.id))
      .where(eq(memberships.userId, userId));

    return sortAuthTenants(userTenants).map((tenant) => ({
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
            emailVerified: true,
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
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        emailVerifiedAt: users.emailVerifiedAt,
      })
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
        emailVerified: Boolean(user.emailVerifiedAt),
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

  private async sendVerificationEmail(params: {
    userId: string;
    email: string;
    name?: string | null;
  }) {
    const issuedToken = await issueEmailVerificationToken(params.userId);
    await sendEmailVerificationEmail({
      email: params.email,
      name: params.name ?? null,
      link: issuedToken.link,
      expiresAt: issuedToken.expiresAt,
    });
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
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          emailVerifiedAt: users.emailVerifiedAt,
        });

      const [tenant] = await tx
        .insert(tenants)
        .values({
          name: `${name}'s Workspace`,
          type: 'business',
          plan: 'free',
          status: 'active',
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
          status: tenants.status,
          settings: tenants.settings,
        });

      await tx.insert(memberships).values({
        tenantId: tenant.id,
        userId: user.id,
        role: 'owner',
      });

      return { user, tenant };
    });
    let emailVerificationSent = true;
    try {
      await this.sendVerificationEmail({
        userId: result.user.id,
        email: result.user.email,
        name: result.user.name,
      });
    } catch (error) {
      emailVerificationSent = false;
      console.error('[auth] verification email delivery failed', {
        userId: result.user.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name ?? null,
        emailVerified: Boolean(result.user.emailVerifiedAt),
      },
      tenant: {
        ...result.tenant,
        role: 'owner',
        settings: normalizeTenantSettings(result.tenant.settings),
      },
      session: null,
      requiresEmailVerification: true,
      emailVerificationSent,
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

    if (!user.emailVerifiedAt) {
      throw Object.assign(new Error('Debes confirmar tu email antes de iniciar sesion'), {
        statusCode: 403,
      });
    }

    const { session, token } = await createAuthSession({
      userId: user.id,
      sessionType: 'standard',
      rememberMe,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        emailVerified: Boolean(user.emailVerifiedAt),
      },
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
   * client perspective (no email enumeration). In production the link is
   * delivered through the configured webhook relay; non-production may log the
   * link when LOG_PASSWORD_RESET_LINK=1 or no relay is configured.
   */
  async forgotPassword(email: string) {
    const normalized = email.trim().toLowerCase();
    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, normalized))
      .limit(1);

    if (user) {
      try {
        const issuedToken = await issuePasswordResetToken(user.id);
        await sendPasswordResetEmail({
          email: user.email,
          link: issuedToken.link,
          expiresAt: issuedToken.expiresAt,
        });
      } catch (error) {
        console.error('[auth] password reset delivery failed', {
          userId: user.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { ok: true as const };
  }

  async verifyEmail(token: string) {
    const tokenHash = createHash('sha256').update(token, 'utf8').digest('hex');
    const [row] = await db
      .select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.tokenHash, tokenHash))
      .limit(1);

    if (!row || row.consumedAt || row.expiresAt < new Date()) {
      throw Object.assign(new Error('Invalid or expired verification token'), {
        statusCode: 400,
      });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          emailVerifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, row.userId));
      await tx
        .update(emailVerificationTokens)
        .set({ consumedAt: new Date() })
        .where(eq(emailVerificationTokens.id, row.id));
    });

    return { ok: true as const };
  }

  async resendVerification(email: string) {
    const normalized = email.trim().toLowerCase();
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        emailVerifiedAt: users.emailVerifiedAt,
      })
      .from(users)
      .where(eq(users.email, normalized))
      .limit(1);

    if (user && !user.emailVerifiedAt) {
      try {
        await this.sendVerificationEmail({
          userId: user.id,
          email: user.email,
          name: user.name,
        });
      } catch (error) {
        console.error('[auth] resend verification delivery failed', {
          userId: user.id,
          error: error instanceof Error ? error.message : String(error),
        });
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
        .set({
          passwordHash: pwHash,
          emailVerifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, row.userId));
      await tx
        .update(passwordResetTokens)
        .set({ consumedAt: new Date() })
        .where(eq(passwordResetTokens.id, row.id));
    });
    await revokeUserAuthSessions(row.userId, new Date());

    return { ok: true as const };
  }
}
