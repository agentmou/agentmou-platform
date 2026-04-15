import type { FastifyReply } from 'fastify';
import {
  AUTH_SESSION_COOKIE_NAME,
  type AuthSessionType,
  authSessions,
  createOpaqueSessionToken,
  db,
  hashAuthSessionToken,
  isAuthSessionActive,
  resolveAuthSessionExpiry,
  users,
  adminImpersonationSessions,
} from '@agentmou/db';
import { resolvePublicOrigins } from '@agentmou/contracts';
import { and, eq, isNull } from 'drizzle-orm';
import { verifyToken } from '@agentmou/auth';

type DbAuthSession = typeof authSessions.$inferSelect;
type DbUser = Pick<typeof users.$inferSelect, 'id' | 'email' | 'name'>;

export interface AuthenticatedRequestContext {
  userId: string;
  email: string;
  sessionId?: string | null;
  sessionType?: AuthSessionType | 'bearer';
  isImpersonation?: boolean;
  impersonationSessionId?: string | null;
  actorUserId?: string | null;
  actorTenantId?: string | null;
  targetUserId?: string | null;
  targetTenantId?: string | null;
}

export interface ActiveAuthSession {
  session: DbAuthSession;
  user: DbUser;
  authContext: AuthenticatedRequestContext;
}

function parseCookieHeader(cookieHeader?: string) {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce<Record<string, string>>((cookies, part) => {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (!rawName) {
      return cookies;
    }

    cookies[rawName] = decodeURIComponent(rawValue.join('='));
    return cookies;
  }, {});
}

function isLocalHostname(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.localhost')
  );
}

function resolveCookieDomain() {
  const origins = resolvePublicOrigins(
    {
      marketingPublicBaseUrl: process.env.MARKETING_PUBLIC_BASE_URL,
      appPublicBaseUrl: process.env.APP_PUBLIC_BASE_URL,
      apiPublicBaseUrl: process.env.API_PUBLIC_BASE_URL,
    },
    {
      nodeEnv: process.env.NODE_ENV,
    }
  );
  const appHostname = new URL(origins.appPublicBaseUrl).hostname;
  const apiHostname = new URL(origins.apiPublicBaseUrl).hostname;

  if (isLocalHostname(appHostname) || isLocalHostname(apiHostname)) {
    return undefined;
  }

  if (
    (appHostname === 'agentmou.io' || appHostname.endsWith('.agentmou.io')) &&
    (apiHostname === 'agentmou.io' || apiHostname.endsWith('.agentmou.io'))
  ) {
    return '.agentmou.io';
  }

  return undefined;
}

function shouldUseSecureCookie() {
  const origins = resolvePublicOrigins(
    {
      marketingPublicBaseUrl: process.env.MARKETING_PUBLIC_BASE_URL,
      appPublicBaseUrl: process.env.APP_PUBLIC_BASE_URL,
      apiPublicBaseUrl: process.env.API_PUBLIC_BASE_URL,
    },
    {
      nodeEnv: process.env.NODE_ENV,
    }
  );
  const appHostname = new URL(origins.appPublicBaseUrl).hostname;
  const apiHostname = new URL(origins.apiPublicBaseUrl).hostname;
  return !isLocalHostname(appHostname) && !isLocalHostname(apiHostname);
}

function serializeCookie(
  name: string,
  value: string,
  options: {
    expires?: Date;
    maxAge?: number;
    domain?: string;
    path?: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Lax' | 'Strict' | 'None';
  }
) {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  if (options.expires) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }

  parts.push(`Path=${options.path ?? '/'}`);

  if (options.domain) {
    parts.push(`Domain=${options.domain}`);
  }

  if (options.httpOnly) {
    parts.push('HttpOnly');
  }

  if (options.secure) {
    parts.push('Secure');
  }

  parts.push(`SameSite=${options.sameSite ?? 'Lax'}`);

  return parts.join('; ');
}

function buildAuthContextFromCookieSession(params: {
  session: DbAuthSession;
  user: DbUser;
  impersonation?: {
    id: string | null;
    actorUserId: string | null;
    actorTenantId: string | null;
    targetUserId: string | null;
    targetTenantId: string | null;
    endedAt: Date | null;
    expiresAt: Date | null;
  } | null;
}): AuthenticatedRequestContext {
  if (params.session.sessionType === 'impersonation') {
    return {
      userId: params.user.id,
      email: params.user.email,
      sessionId: params.session.id,
      sessionType: 'impersonation',
      isImpersonation: true,
      impersonationSessionId:
        params.impersonation?.id ?? params.session.adminImpersonationSessionId ?? null,
      actorUserId: params.impersonation?.actorUserId ?? null,
      actorTenantId: params.impersonation?.actorTenantId ?? null,
      targetUserId: params.impersonation?.targetUserId ?? params.user.id,
      targetTenantId: params.impersonation?.targetTenantId ?? null,
    };
  }

  return {
    userId: params.user.id,
    email: params.user.email,
    sessionId: params.session.id,
    sessionType: 'standard',
    isImpersonation: false,
    impersonationSessionId: null,
    actorUserId: null,
    actorTenantId: null,
    targetUserId: null,
    targetTenantId: null,
  };
}

export function getAuthSessionTokenFromCookie(cookieHeader?: string) {
  return parseCookieHeader(cookieHeader)[AUTH_SESSION_COOKIE_NAME] ?? null;
}

export async function createAuthSession(params: {
  userId: string;
  sessionType?: AuthSessionType;
  rememberMe?: boolean;
  adminImpersonationSessionId?: string | null;
  expiresAt?: Date;
}) {
  const token = createOpaqueSessionToken();
  const expiresAt =
    params.expiresAt ??
    resolveAuthSessionExpiry({
      rememberMe: params.rememberMe,
      sessionType: params.sessionType ?? 'standard',
    });

  const [session] = await db
    .insert(authSessions)
    .values({
      userId: params.userId,
      sessionTokenHash: hashAuthSessionToken(token),
      sessionType: params.sessionType ?? 'standard',
      adminImpersonationSessionId: params.adminImpersonationSessionId ?? null,
      expiresAt,
      lastSeenAt: new Date(),
    })
    .returning();

  return { session, token };
}

export async function getActiveAuthSessionByToken(token: string, now = new Date()) {
  const [row] = await db
    .select({
      session: authSessions,
      user: {
        id: users.id,
        email: users.email,
        name: users.name,
      },
      impersonation: {
        id: adminImpersonationSessions.id,
        actorUserId: adminImpersonationSessions.actorUserId,
        actorTenantId: adminImpersonationSessions.actorTenantId,
        targetUserId: adminImpersonationSessions.targetUserId,
        targetTenantId: adminImpersonationSessions.targetTenantId,
        endedAt: adminImpersonationSessions.endedAt,
        expiresAt: adminImpersonationSessions.expiresAt,
      },
    })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .leftJoin(
      adminImpersonationSessions,
      eq(authSessions.adminImpersonationSessionId, adminImpersonationSessions.id)
    )
    .where(eq(authSessions.sessionTokenHash, hashAuthSessionToken(token)))
    .limit(1);

  if (!row || !isAuthSessionActive(row.session, now)) {
    return null;
  }

  if (row.session.sessionType === 'impersonation') {
    if (
      !row.impersonation?.id ||
      row.impersonation.endedAt !== null ||
      !row.impersonation.expiresAt ||
      row.impersonation.expiresAt.getTime() <= now.getTime()
    ) {
      return null;
    }
  }

  await db
    .update(authSessions)
    .set({
      lastSeenAt: now,
    })
    .where(eq(authSessions.id, row.session.id));

  return {
    session: row.session,
    user: row.user,
    authContext: buildAuthContextFromCookieSession(row),
  } satisfies ActiveAuthSession;
}

export async function revokeAuthSessionById(sessionId: string, revokedAt = new Date()) {
  const [session] = await db
    .update(authSessions)
    .set({
      revokedAt,
    })
    .where(and(eq(authSessions.id, sessionId), isNull(authSessions.revokedAt)))
    .returning();

  return session ?? null;
}

export async function revokeUserAuthSessions(userId: string, revokedAt = new Date()) {
  return db
    .update(authSessions)
    .set({
      revokedAt,
    })
    .where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)))
    .returning();
}

export async function resolveBearerAuthContext(authorization?: string) {
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
  if (!token) {
    return null;
  }

  const payload = await verifyToken(token);
  if (!payload || payload.isImpersonationRestore) {
    return null;
  }

  return {
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
  } satisfies AuthenticatedRequestContext;
}

export async function setAuthSessionCookie(
  reply: FastifyReply,
  params: {
    token: string;
    expiresAt: Date;
  }
) {
  const now = Date.now();
  const maxAge = Math.max(0, Math.floor((params.expiresAt.getTime() - now) / 1000));

  reply.header(
    'Set-Cookie',
    serializeCookie(AUTH_SESSION_COOKIE_NAME, params.token, {
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
      secure: shouldUseSecureCookie(),
      domain: resolveCookieDomain(),
      expires: params.expiresAt,
      maxAge,
    })
  );
}

export async function clearAuthSessionCookie(reply: FastifyReply) {
  reply.header(
    'Set-Cookie',
    serializeCookie(AUTH_SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      sameSite: 'Lax',
      path: '/',
      secure: shouldUseSecureCookie(),
      domain: resolveCookieDomain(),
      expires: new Date(0),
      maxAge: 0,
    })
  );
}
