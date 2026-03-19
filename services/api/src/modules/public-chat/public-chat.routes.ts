import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  PublicChatRequestSchema,
  PublicChatResponseSchema,
  type PublicChatRequest,
} from '@agentmou/contracts';

import { PublicChatService } from './public-chat.service.js';

export async function publicChatRoutes(fastify: FastifyInstance) {
  const publicChatService = new PublicChatService();

  fastify.post(
    '/public/chat',
    {
      schema: {
        body: PublicChatRequestSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const response = await publicChatService.reply(
        request.body as PublicChatRequest,
      );
      return reply.send(PublicChatResponseSchema.parse(response));
    },
  );
}
