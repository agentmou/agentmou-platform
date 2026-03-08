// Control Plane API - Fastify server
import Fastify from 'fastify';
import cors from '@fastify/cors';

// Import modules
import { authRoutes } from './modules/auth';
import { tenantRoutes } from './modules/tenants';
import { membershipRoutes } from './modules/memberships';
import { catalogRoutes } from './modules/catalog';
import { installationRoutes } from './modules/installations';
import { connectorRoutes } from './modules/connectors';
import { secretRoutes } from './modules/secrets';
import { approvalRoutes } from './modules/approvals';
import { runRoutes } from './modules/runs';
import { usageRoutes } from './modules/usage';
import { billingRoutes } from './modules/billing';
import { securityRoutes } from './modules/security';
import { webhookRoutes } from './modules/webhooks';
import { n8nRoutes } from './modules/n8n';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Register plugins
fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || '*',
});

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register routes
fastify.register(async function routes(fastify) {
  fastify.register(authRoutes, { prefix: '/api/v1/auth' });
  fastify.register(tenantRoutes, { prefix: '/api/v1/tenants' });
  fastify.register(membershipRoutes, { prefix: '/api/v1' });
  fastify.register(catalogRoutes, { prefix: '/api/v1/catalog' });
  fastify.register(installationRoutes, { prefix: '/api/v1' });
  fastify.register(connectorRoutes, { prefix: '/api/v1' });
  fastify.register(secretRoutes, { prefix: '/api/v1' });
  fastify.register(approvalRoutes, { prefix: '/api/v1' });
  fastify.register(runRoutes, { prefix: '/api/v1' });
  fastify.register(usageRoutes, { prefix: '/api/v1' });
  fastify.register(billingRoutes, { prefix: '/api/v1' });
  fastify.register(securityRoutes, { prefix: '/api/v1' });
  fastify.register(webhookRoutes, { prefix: '/api/v1' });
  fastify.register(n8nRoutes, { prefix: '/api/v1' });
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001', 10);
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    console.log(`🚀 Control Plane API running at http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

export { fastify };
