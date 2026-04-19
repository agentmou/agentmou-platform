import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { RetellToolCallWebhookPayloadSchema } from '@agentmou/contracts';

import { ClinicWebhooksService } from './clinic-webhooks.service.js';

function ensureFormBodyParser(fastify: FastifyInstance) {
  if (
    (fastify as FastifyInstance & { __clinicTwilioFormParser?: boolean }).__clinicTwilioFormParser
  ) {
    return;
  }

  fastify.addContentTypeParser(
    /^application\/x-www-form-urlencoded(?:\s*;.*)?$/i,
    { parseAs: 'string' },
    (_request, body, done) => {
      const params = new URLSearchParams(body as string);
      const parsed = Object.fromEntries(params.entries());
      done(null, parsed);
    }
  );

  (fastify as FastifyInstance & { __clinicTwilioFormParser?: boolean }).__clinicTwilioFormParser =
    true;
}

function getSignature(request: FastifyRequest) {
  const value = request.headers['x-twilio-signature'];
  return Array.isArray(value) ? value[0] : (value ?? null);
}

function getRetellSignature(request: FastifyRequest) {
  const value = request.headers['x-retell-signature'];
  return Array.isArray(value) ? value[0] : (value ?? null);
}

export async function clinicWebhookRoutes(fastify: FastifyInstance) {
  ensureFormBodyParser(fastify);
  const service = new ClinicWebhooksService();

  fastify.post(
    '/webhooks/twilio/whatsapp',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const result = await service.handleTwilioWebhook('whatsapp', request, getSignature(request));
      return reply.send(result);
    }
  );

  fastify.post('/webhooks/twilio/voice', async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await service.handleTwilioWebhook('voice', request, getSignature(request));
    return reply.send(result);
  });

  fastify.post('/webhooks/retell/tool', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = RetellToolCallWebhookPayloadSchema.parse(request.body);
      const result = await service.handleRetellToolCall(body, getRetellSignature(request));
      return reply.send(result);
    } catch {
      return reply.send({
        result: 'No he podido completar la accion, derivo con mi equipo.',
      });
    }
  });

  fastify.post(
    '/webhooks/retell/post-call',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const result = await service.handleRetellPostCall(request, getRetellSignature(request));
      return reply.send(result);
    }
  );
}
