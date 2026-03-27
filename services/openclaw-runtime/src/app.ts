import Fastify from 'fastify';
import cors from '@fastify/cors';

import { OpenClawRuntimeService } from './runtime/openclaw-runtime.service.js';
import { internalOpsRoutes } from './routes/internal-ops.routes.js';
import { getOpenClawRuntimeConfig } from './config.js';

export function buildApp(options?: { service?: OpenClawRuntimeService; apiKey?: string }) {
  const config = getOpenClawRuntimeConfig();
  const app = Fastify({
    logger: {
      level: config.logLevel,
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
    await routeApp.register(internalOpsRoutes, {
      ...(options ?? {}),
      apiKey: options?.apiKey ?? config.apiKey,
    });
  });

  return app;
}
