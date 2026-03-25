import Fastify from 'fastify';
import cors from '@fastify/cors';

import { OpenClawRuntimeService } from './runtime/openclaw-runtime.service.js';
import { internalOpsRoutes } from './routes/internal-ops.routes.js';

export function buildApp(options?: { service?: OpenClawRuntimeService; apiKey?: string }) {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  app.register(cors, {
    origin: false,
  });

  app.get('/health', async () => ({
    status: 'ok',
    service: 'openclaw-runtime',
    timestamp: new Date().toISOString(),
  }));

  app.register(async function registerInternalOpsRoutes(routeApp) {
    await routeApp.register(internalOpsRoutes, options ?? {});
  });

  return app;
}
