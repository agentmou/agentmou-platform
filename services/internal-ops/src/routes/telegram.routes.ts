import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { InternalOpsService } from '../orchestrator/internal-ops.service.js';

export async function telegramRoutes(
  fastify: FastifyInstance,
  options?: { service?: InternalOpsService },
) {
  const service = options?.service ?? new InternalOpsService();

  fastify.post(
    '/telegram/webhook',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await service.handleTelegramUpdate(request.body, {
          secretToken: request.headers['x-telegram-bot-api-secret-token'] as
            | string
            | undefined,
        });
        return reply.send(result);
      } catch (error) {
        request.log.error(error);
        return reply.status(400).send({
          ok: false,
          summary: error instanceof Error ? error.message : 'Invalid Telegram update.',
        });
      }
    },
  );
}
