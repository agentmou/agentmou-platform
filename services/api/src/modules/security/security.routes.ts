import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SecurityService } from './security.service';

export async function securityRoutes(fastify: FastifyInstance) {
  const securityService = new SecurityService(fastify);

  // Get security settings
  fastify.get('/tenants/:tenantId/security/settings', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const settings = await securityService.getSecuritySettings(tenantId);
    return reply.send({ settings });
  });

  // Update security settings
  fastify.put('/tenants/:tenantId/security/settings', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const settings = request.body as any;
    const result = await securityService.updateSecuritySettings(tenantId, settings);
    return reply.send(result);
  });

  // Get audit logs
  fastify.get('/tenants/:tenantId/security/audit-logs', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const filters = request.query as any;
    const logs = await securityService.getAuditLogs(tenantId, filters);
    return reply.send({ logs });
  });

  // Export audit logs
  fastify.get('/tenants/:tenantId/security/audit-logs/export', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const export_ = await securityService.exportAuditLogs(tenantId);
    return reply.send(export_);
  });

  // Get security alerts
  fastify.get('/tenants/:tenantId/security/alerts', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const alerts = await securityService.getSecurityAlerts(tenantId);
    return reply.send({ alerts });
  });

  // Dismiss alert
  fastify.post('/tenants/:tenantId/security/alerts/:alertId/dismiss', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, alertId } = request.params as { tenantId: string; alertId: string };
    const result = await securityService.dismissAlert(tenantId, alertId);
    return reply.send(result);
  });

  // Rotate API keys
  fastify.post('/tenants/:tenantId/security/rotate-api-keys', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = request.params as { tenantId: string };
    const result = await securityService.rotateApiKeys(tenantId);
    return reply.send(result);
  });
}
