import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import {
  AssignConversationBodySchema,
  ConversationMessagesResponseSchema,
  ConversationResponseSchema,
  ConversationsResponseSchema,
  EscalateConversationBodySchema,
  ReplyConversationBodySchema,
  ResolveConversationBodySchema,
} from '@agentmou/contracts';

import { handleClinicRouteError } from '../clinic-shared/clinic.errors.js';
import {
  conversationFiltersSchema,
  conversationParamsSchema,
} from '../clinic-shared/clinic.schema.js';
import { ConversationsService } from './conversations.service.js';

export async function conversationRoutes(fastify: FastifyInstance) {
  const service = new ConversationsService();

  fastify.get(
    '/tenants/:tenantId/conversations',
    {
      schema: {
        params: conversationParamsSchema.pick({ tenantId: true }),
        querystring: conversationFiltersSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId } = request.params as { tenantId: string };
        const result = await service.listThreads(
          tenantId,
          request.query as never,
          request.tenantRole
        );
        return reply.send(ConversationsResponseSchema.parse(result));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.get(
    '/tenants/:tenantId/conversations/:threadId',
    {
      schema: {
        params: conversationParamsSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, threadId } = request.params as { tenantId: string; threadId: string };
        const thread = await service.getThread(tenantId, threadId, request.tenantRole);
        if (!thread) {
          return reply.status(404).send({ error: 'Conversation thread not found' });
        }
        return reply.send(ConversationResponseSchema.parse({ thread }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.get(
    '/tenants/:tenantId/conversations/:threadId/messages',
    {
      schema: {
        params: conversationParamsSchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, threadId } = request.params as { tenantId: string; threadId: string };
        const messages = await service.listMessages(tenantId, threadId, request.tenantRole);
        return reply.send(ConversationMessagesResponseSchema.parse({ messages }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/tenants/:tenantId/conversations/:threadId/assign',
    {
      schema: {
        params: conversationParamsSchema,
        body: AssignConversationBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, threadId } = request.params as { tenantId: string; threadId: string };
        const thread = await service.assignThread(
          tenantId,
          threadId,
          request.body as never,
          request.userId,
          request.tenantRole
        );
        if (!thread) {
          return reply.status(404).send({ error: 'Conversation thread not found' });
        }
        return reply.send(ConversationResponseSchema.parse({ thread }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/tenants/:tenantId/conversations/:threadId/escalate',
    {
      schema: {
        params: conversationParamsSchema,
        body: EscalateConversationBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, threadId } = request.params as { tenantId: string; threadId: string };
        const thread = await service.escalateThread(
          tenantId,
          threadId,
          request.body as never,
          request.userId,
          request.tenantRole
        );
        if (!thread) {
          return reply.status(404).send({ error: 'Conversation thread not found' });
        }
        return reply.send(ConversationResponseSchema.parse({ thread }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/tenants/:tenantId/conversations/:threadId/resolve',
    {
      schema: {
        params: conversationParamsSchema,
        body: ResolveConversationBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, threadId } = request.params as { tenantId: string; threadId: string };
        const thread = await service.resolveThread(
          tenantId,
          threadId,
          request.body as never,
          request.userId,
          request.tenantRole
        );
        if (!thread) {
          return reply.status(404).send({ error: 'Conversation thread not found' });
        }
        return reply.send(ConversationResponseSchema.parse({ thread }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );

  fastify.post(
    '/tenants/:tenantId/conversations/:threadId/reply',
    {
      schema: {
        params: conversationParamsSchema,
        body: ReplyConversationBodySchema,
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { tenantId, threadId } = request.params as { tenantId: string; threadId: string };
        const thread = await service.replyToThread(
          tenantId,
          threadId,
          request.body as never,
          request.userId,
          request.tenantRole
        );
        if (!thread) {
          return reply.status(404).send({ error: 'Conversation thread not found' });
        }
        return reply.send(ConversationResponseSchema.parse({ thread }));
      } catch (error) {
        return handleClinicRouteError(reply, error);
      }
    }
  );
}
