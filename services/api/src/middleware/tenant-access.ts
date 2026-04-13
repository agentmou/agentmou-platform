import type { FastifyRequest, FastifyReply } from 'fastify';
import { db, memberships } from '@agentmou/db';
import { and, eq } from 'drizzle-orm';

declare module 'fastify' {
  interface FastifyRequest {
    tenantRole?: string;
  }
}

/**
 * Fastify preHandler that verifies the authenticated user is a member
 * of the tenant specified by the `:tenantId` route parameter.
 *
 * Must run AFTER `requireAuth` (depends on `request.userId`).
 * On success, sets `request.tenantRole`.
 */
export async function requireTenantAccess(request: FastifyRequest, reply: FastifyReply) {
  const { tenantId } = request.params as { tenantId: string };
  const userId = request.userId;

  if (!userId) {
    return reply.status(401).send({ error: 'Authentication required' });
  }

  if (!tenantId) {
    return reply.status(400).send({ error: 'Missing tenantId parameter' });
  }

  if (
    request.authContext?.isImpersonation &&
    request.authContext.targetTenantId &&
    request.authContext.targetTenantId !== tenantId
  ) {
    return reply.status(403).send({ error: 'Impersonation is restricted to the target tenant' });
  }

  const [membership] = await db
    .select({ role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.tenantId, tenantId), eq(memberships.userId, userId)))
    .limit(1);

  if (!membership) {
    return reply.status(403).send({ error: 'Not a member of this tenant' });
  }

  request.tenantRole = membership.role;
}
