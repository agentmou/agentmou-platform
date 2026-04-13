import type { FastifyRequest, FastifyReply } from 'fastify';

import { normalizeTenantMembershipRole } from '../lib/tenant-roles.js';
import { normalizeTenantSettings } from '../modules/tenants/tenants.mapper.js';
import { PlatformAdminAccessRepository } from './platform-admin-access.repository.js';

const ADMIN_ROLES = new Set(['owner', 'admin']);

export async function requirePlatformAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (!request.userId) {
    return reply.status(401).send({ error: 'Authentication required' });
  }

  if (request.authContext?.isImpersonation) {
    return reply
      .status(403)
      .send({ error: 'Impersonation sessions cannot access admin endpoints' });
  }

  const adminTenantId = request.headers['x-tenant-id'];
  if (typeof adminTenantId !== 'string' || adminTenantId.length === 0) {
    return reply.status(400).send({ error: 'Missing x-tenant-id header' });
  }

  const repository = new PlatformAdminAccessRepository();
  const context = await repository.getTenantMembershipContext(request.userId, adminTenantId);

  if (!context) {
    return reply.status(403).send({ error: 'Platform admin access is restricted' });
  }

  const normalizedRole = normalizeTenantMembershipRole(context.role);
  const settings = normalizeTenantSettings(context.settings, {
    defaultActiveVertical: 'internal',
  });

  if (!normalizedRole || !ADMIN_ROLES.has(normalizedRole) || !settings.isPlatformAdminTenant) {
    return reply.status(403).send({ error: 'Platform admin access is restricted' });
  }

  request.adminTenantId = adminTenantId;
  request.adminTenantRole = normalizedRole;
}
