import Fastify from 'fastify';
import cors from '@fastify/cors';

import { InternalOpsService } from './orchestrator/internal-ops.service.js';
import { internalRoutes } from './routes/internal.routes.js';
import { telegramRoutes } from './routes/telegram.routes.js';

export function buildApp(options?: { service?: InternalOpsService }) {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  app.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
  });

  app.get('/health', async () => ({
    status: 'ok',
    service: 'internal-ops',
    timestamp: new Date().toISOString(),
  }));

  app.register(async function registerInternalOpsRoutes(routeApp) {
    const routeOptions = options ?? {};
    await routeApp.register(telegramRoutes, routeOptions);
    await routeApp.register(internalRoutes, routeOptions);
  });

  return app;
}
