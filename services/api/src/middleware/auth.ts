import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from '@agentmou/auth';

import {
  getActiveAuthSessionByToken,
  getAuthSessionTokenFromCookie,
  type ActiveAuthSession,
  type AuthenticatedRequestContext,
} from '../lib/auth-sessions.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    authContext?: AuthenticatedRequestContext;
    authSession?: ActiveAuthSession['session'];
    adminTenantId?: string;
    adminTenantRole?: string;
  }
}

/**
 * Fastify preHandler that resolves an opaque auth session from the
 * `agentmou-session` cookie and falls back to bearer JWTs for compatibility.
 *
 * On success, sets `request.userId` for downstream handlers.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const cookieToken = getAuthSessionTokenFromCookie(request.headers.cookie);
  if (cookieToken) {
    const activeSession = await getActiveAuthSessionByToken(cookieToken);

    if (activeSession) {
      request.userId = activeSession.user.id;
      request.authContext = activeSession.authContext;
      request.authSession = activeSession.session;
      return;
    }
  }

  const header = request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    return reply.status(401).send({ error: 'Authentication required' });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }

  if (payload.isImpersonationRestore) {
    return reply.status(401).send({ error: 'Invalid session token' });
  }

  if (
    payload.isImpersonation &&
    (!payload.impersonationSessionId ||
      !payload.actorUserId ||
      !payload.actorTenantId ||
      !payload.targetUserId ||
      !payload.targetTenantId)
  ) {
    return reply.status(401).send({ error: 'Invalid impersonation token' });
  }

  request.userId = payload.userId;
  request.authContext = {
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
  };
  request.authSession = undefined;
}
