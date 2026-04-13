import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken, type TokenPayload } from '@agentmou/auth';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    authContext?: TokenPayload;
    adminTenantId?: string;
    adminTenantRole?: string;
  }
}

/**
 * Fastify preHandler that extracts and verifies a JWT from the
 * `Authorization: Bearer <token>` header.
 *
 * On success, sets `request.userId` for downstream handlers.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    return reply.status(401).send({ error: 'Missing authorization token' });
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
  request.authContext = payload;
}
