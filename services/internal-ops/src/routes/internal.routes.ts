import { z } from 'zod';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { InternalOpsService } from '../orchestrator/internal-ops.service.js';

const approvalCallbackBodySchema = z.object({
  decision: z.enum(['approved', 'rejected', 'postponed', 'reformulate']),
  reason: z.string().trim().min(1).optional(),
  actorLabel: z.string().trim().min(1).optional(),
});

export async function internalRoutes(
  fastify: FastifyInstance,
  options?: { service?: InternalOpsService },
) {
  const service = options?.service ?? new InternalOpsService();

  fastify.post(
    '/internal/approvals/:approvalId/callback',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { approvalId } = request.params as { approvalId: string };
        const body = approvalCallbackBodySchema.parse(request.body);
        const result = await service.handleApprovalCallback({
          approvalId,
          decision: body.decision,
          reason: body.reason,
          actorLabel: body.actorLabel,
        });
        return reply.send(result);
      } catch (error) {
        request.log.error(error);
        return reply.status(400).send({
          ok: false,
          summary: error instanceof Error ? error.message : 'Invalid callback payload.',
        });
      }
    },
  );
}
