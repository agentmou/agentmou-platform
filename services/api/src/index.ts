// Control Plane API - Fastify server
import Fastify from 'fastify';
import cors from '@fastify/cors';

import { authRoutes } from './modules/auth';
import { tenantRoutes } from './modules/tenants';
import { membershipRoutes } from './modules/memberships';
import { catalogRoutes } from './modules/catalog';
import { installationRoutes } from './modules/installations';
import { connectorRoutes, oauthCallbackRoutes } from './modules/connectors';
import { secretRoutes } from './modules/secrets';
import { approvalRoutes } from './modules/approvals';
import { runRoutes } from './modules/runs';
import { usageRoutes } from './modules/usage';
import { billingRoutes } from './modules/billing';
import { securityRoutes } from './modules/security';
import { webhookRoutes } from './modules/webhooks';
import { n8nRoutes } from './modules/n8n';
import { requireAuth, requireTenantAccess } from './middleware';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || '*',
});

fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// --- Public routes (no auth) ------------------------------------------------
fastify.register(authRoutes, { prefix: '/api/v1/auth' });
fastify.register(catalogRoutes, { prefix: '/api/v1/catalog' });
fastify.register(oauthCallbackRoutes, { prefix: '/api/v1' });

// --- Authenticated routes (JWT required) ------------------------------------
fastify.register(async function authenticatedRoutes(app) {
  app.addHook('preHandler', requireAuth);

  app.register(tenantRoutes, { prefix: '/api/v1/tenants' });

  // Tenant-scoped routes (JWT + tenant membership required)
  app.register(async function tenantRoutes(tenant) {
    tenant.addHook('preHandler', requireTenantAccess);

    tenant.register(membershipRoutes, { prefix: '/api/v1' });
    tenant.register(installationRoutes, { prefix: '/api/v1' });
    tenant.register(connectorRoutes, { prefix: '/api/v1' });
    tenant.register(secretRoutes, { prefix: '/api/v1' });
    tenant.register(approvalRoutes, { prefix: '/api/v1' });
    tenant.register(runRoutes, { prefix: '/api/v1' });
    tenant.register(usageRoutes, { prefix: '/api/v1' });
    tenant.register(billingRoutes, { prefix: '/api/v1' });
    tenant.register(securityRoutes, { prefix: '/api/v1' });
    tenant.register(webhookRoutes, { prefix: '/api/v1' });
    tenant.register(n8nRoutes, { prefix: '/api/v1' });
  });
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001', 10);
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`Control Plane API running at http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

export { fastify };
