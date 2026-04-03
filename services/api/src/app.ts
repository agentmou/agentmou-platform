import Fastify from 'fastify';
import cors from '@fastify/cors';

import { authRoutes } from './modules/auth/index.js';
import { tenantRoutes } from './modules/tenants/index.js';
import { membershipRoutes } from './modules/memberships/index.js';
import { catalogRoutes } from './modules/catalog/index.js';
import { installationRoutes } from './modules/installations/index.js';
import { connectorRoutes, oauthCallbackRoutes } from './modules/connectors/index.js';
import { secretRoutes } from './modules/secrets/index.js';
import { approvalRoutes } from './modules/approvals/index.js';
import { runRoutes } from './modules/runs/index.js';
import { usageRoutes } from './modules/usage/index.js';
import { billingRoutes } from './modules/billing/index.js';
import { securityRoutes } from './modules/security/index.js';
import { webhookRoutes } from './modules/webhooks/index.js';
import { n8nRoutes } from './modules/n8n/index.js';
import { publicChatRoutes } from './modules/public-chat/index.js';
import { stripeWebhookRoutes } from './modules/webhooks/index.js';
import { clinicDashboardRoutes } from './modules/clinic-dashboard/index.js';
import { clinicProfileRoutes } from './modules/clinic-profile/index.js';
import { clinicModulesRoutes } from './modules/clinic-modules/index.js';
import { clinicChannelsRoutes } from './modules/clinic-channels/index.js';
import { patientRoutes } from './modules/patients/index.js';
import { conversationRoutes } from './modules/conversations/index.js';
import { callRoutes } from './modules/calls/index.js';
import { appointmentRoutes } from './modules/appointments/index.js';
import { formRoutes } from './modules/forms/index.js';
import { followUpRoutes } from './modules/follow-up/index.js';
import { reactivationRoutes } from './modules/reactivation/index.js';
import { requireAuth, requireTenantAccess } from './middleware/index.js';
import { zodValidatorCompiler } from './routes/zod-validator.js';
import { getApiConfig } from './config.js';

export function buildApp() {
  const config = getApiConfig();
  const app = Fastify({
    logger: {
      level: config.logLevel,
    },
  });

  app.setValidatorCompiler(zodValidatorCompiler);

  app.register(cors, {
    origin: config.corsOrigin,
  });

  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // --- Public routes (no auth) ----------------------------------------------
  app.register(authRoutes, { prefix: '/api/v1/auth' });
  app.register(catalogRoutes, { prefix: '/api/v1/catalog' });
  app.register(oauthCallbackRoutes, { prefix: '/api/v1' });
  app.register(publicChatRoutes, { prefix: '/api/v1' });
  app.register(stripeWebhookRoutes, { prefix: '/api/v1' });

  // --- Authenticated routes (JWT required) ----------------------------------
  app.register(async function authenticatedRoutes(authedApp) {
    authedApp.addHook('preHandler', requireAuth);

    authedApp.register(tenantRoutes, { prefix: '/api/v1/tenants' });

    // Tenant-scoped routes (JWT + tenant membership required)
    authedApp.register(async function tenantScopedRoutes(tenantApp) {
      tenantApp.addHook('preHandler', requireTenantAccess);

      tenantApp.register(membershipRoutes, { prefix: '/api/v1' });
      tenantApp.register(installationRoutes, { prefix: '/api/v1' });
      tenantApp.register(connectorRoutes, { prefix: '/api/v1' });
      tenantApp.register(secretRoutes, { prefix: '/api/v1' });
      tenantApp.register(approvalRoutes, { prefix: '/api/v1' });
      tenantApp.register(runRoutes, { prefix: '/api/v1' });
      tenantApp.register(usageRoutes, { prefix: '/api/v1' });
      tenantApp.register(billingRoutes, { prefix: '/api/v1' });
      tenantApp.register(securityRoutes, { prefix: '/api/v1' });
      tenantApp.register(webhookRoutes, { prefix: '/api/v1' });
      tenantApp.register(n8nRoutes, { prefix: '/api/v1' });
      tenantApp.register(clinicDashboardRoutes, { prefix: '/api/v1' });
      tenantApp.register(clinicProfileRoutes, { prefix: '/api/v1' });
      tenantApp.register(clinicModulesRoutes, { prefix: '/api/v1' });
      tenantApp.register(clinicChannelsRoutes, { prefix: '/api/v1' });
      tenantApp.register(patientRoutes, { prefix: '/api/v1' });
      tenantApp.register(conversationRoutes, { prefix: '/api/v1' });
      tenantApp.register(callRoutes, { prefix: '/api/v1' });
      tenantApp.register(appointmentRoutes, { prefix: '/api/v1' });
      tenantApp.register(formRoutes, { prefix: '/api/v1' });
      tenantApp.register(followUpRoutes, { prefix: '/api/v1' });
      tenantApp.register(reactivationRoutes, { prefix: '/api/v1' });
    });
  });

  return app;
}
