import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  AuditEventsResponseSchema,
  SecurityAlertsResponseSchema,
  SecurityFindingsResponseSchema,
  SecurityOverviewResponseSchema,
  SecurityPoliciesResponseSchema,
} from '@agentmou/contracts';

import { SecurityService } from './security.service.js';

type TenantParams = { tenantId: string };
type AlertParams = TenantParams & { alertId: string };
type AuditLogQuery = { category?: string };

export async function securityRoutes(fastify: FastifyInstance) {
  const securityService = new SecurityService(fastify);

  fastify.get(
    '/tenants/:tenantId/security/overview',
    async (
      request: FastifyRequest<{ Params: TenantParams }>,
      reply: FastifyReply,
    ) => {
      const { tenantId } = request.params;
      const overview = await securityService.getOverview(tenantId);
      return reply.send(SecurityOverviewResponseSchema.parse({ overview }));
    },
  );

  fastify.get(
    '/tenants/:tenantId/security/findings',
    async (
      request: FastifyRequest<{ Params: TenantParams }>,
      reply: FastifyReply,
    ) => {
      const { tenantId } = request.params;
      const findings = await securityService.listFindings(tenantId);
      return reply.send(SecurityFindingsResponseSchema.parse({ findings }));
    },
  );

  fastify.get(
    '/tenants/:tenantId/security/policies',
    async (
      request: FastifyRequest<{ Params: TenantParams }>,
      reply: FastifyReply,
    ) => {
      const { tenantId } = request.params;
      const policies = await securityService.listPolicies(tenantId);
      return reply.send(SecurityPoliciesResponseSchema.parse({ policies }));
    },
  );

  // Get security settings
  fastify.get(
    '/tenants/:tenantId/security/settings',
    async (
      request: FastifyRequest<{ Params: TenantParams }>,
      reply: FastifyReply,
    ) => {
      const { tenantId } = request.params;
      const settings = await securityService.getSecuritySettings(tenantId);
      return reply.send({ settings });
    },
  );

  // Update security settings
  fastify.put(
    '/tenants/:tenantId/security/settings',
    async (
      request: FastifyRequest<{ Params: TenantParams; Body: unknown }>,
      reply: FastifyReply,
    ) => {
      const { tenantId } = request.params;
      const result = await securityService.updateSecuritySettings(
        tenantId,
        request.body,
      );
      return reply.send(result);
    },
  );

  // Get audit logs
  fastify.get(
    '/tenants/:tenantId/security/audit-logs',
    async (
      request: FastifyRequest<{
        Params: TenantParams;
        Querystring: AuditLogQuery;
      }>,
      reply: FastifyReply,
    ) => {
      const { tenantId } = request.params;
      const logs = await securityService.getAuditLogs(tenantId, request.query);
      return reply.send(AuditEventsResponseSchema.parse({ logs }));
    },
  );

  // Export audit logs
  fastify.get(
    '/tenants/:tenantId/security/audit-logs/export',
    async (
      request: FastifyRequest<{ Params: TenantParams }>,
      reply: FastifyReply,
    ) => {
      const { tenantId } = request.params;
      const export_ = await securityService.exportAuditLogs(tenantId);
      return reply.send(export_);
    },
  );

  // Get security alerts
  fastify.get(
    '/tenants/:tenantId/security/alerts',
    async (
      request: FastifyRequest<{ Params: TenantParams }>,
      reply: FastifyReply,
    ) => {
      const { tenantId } = request.params;
      const alerts = await securityService.getSecurityAlerts(tenantId);
      return reply.send(SecurityAlertsResponseSchema.parse({ alerts }));
    },
  );

  // Dismiss alert
  fastify.post(
    '/tenants/:tenantId/security/alerts/:alertId/dismiss',
    async (
      request: FastifyRequest<{ Params: AlertParams }>,
      reply: FastifyReply,
    ) => {
      const { tenantId, alertId } = request.params;
      const result = await securityService.dismissAlert(tenantId, alertId);
      return reply.send(result);
    },
  );

  // Rotate API keys
  fastify.post(
    '/tenants/:tenantId/security/rotate-api-keys',
    async (
      request: FastifyRequest<{ Params: TenantParams }>,
      reply: FastifyReply,
    ) => {
      const { tenantId } = request.params;
      const result = await securityService.rotateApiKeys(tenantId);
      return reply.send(result);
    },
  );
}
