import type { FastifyPluginAsync } from 'fastify';

import {
  AgentProfileSchema,
  OpenClawCapabilitySchema,
  OpenClawTurnInputSchema,
} from '@agentmou/contracts';

import { OpenClawRuntimeService } from '../runtime/openclaw-runtime.service.js';

export const internalOpsRoutes: FastifyPluginAsync<{
  service?: OpenClawRuntimeService;
  apiKey?: string;
}> = async (app, options) => {
  const service = options.service ?? new OpenClawRuntimeService();
  const expectedApiKey = options.apiKey ?? process.env.OPENCLAW_API_KEY;

  app.addHook('preHandler', async (request, reply) => {
    if (!expectedApiKey) {
      return;
    }

    const header = request.headers.authorization;
    if (header === `Bearer ${expectedApiKey}`) {
      return;
    }

    reply.code(401);
    throw new Error('Unauthorized OpenClaw request');
  });

  app.post('/v1/internal-ops/agent-profiles/register', async (request) => {
    const body = request.body as {
      tenantId: string;
      profiles: unknown[];
    };

    await service.registerAgentProfiles(
      body.tenantId,
      body.profiles.map((profile) => AgentProfileSchema.parse(profile))
    );

    return { ok: true };
  });

  app.post('/v1/internal-ops/capabilities/register', async (request) => {
    const body = request.body as {
      tenantId: string;
      capabilities: unknown[];
    };

    await service.registerCapabilities(
      body.tenantId,
      body.capabilities.map((capability) => OpenClawCapabilitySchema.parse(capability))
    );

    return { ok: true };
  });

  app.post('/v1/internal-ops/turns/start', async (request) => {
    const turnInput = OpenClawTurnInputSchema.parse(request.body);
    return service.startTurn(turnInput);
  });

  app.post('/v1/internal-ops/turns/continue', async (request) => {
    const turnInput = OpenClawTurnInputSchema.parse(request.body);
    return service.continueTurn(turnInput);
  });

  app.post('/v1/internal-ops/objectives/:objectiveId/cancel', async (request, reply) => {
    const params = request.params as { objectiveId: string };
    const body = request.body as {
      tenantId: string;
      remoteSessionId: string;
      reason?: string;
    };

    await service.cancelObjective({
      tenantId: body.tenantId,
      objectiveId: params.objectiveId,
      remoteSessionId: body.remoteSessionId,
      reason: body.reason,
    });

    reply.code(204);
    return null;
  });

  app.get('/v1/internal-ops/objectives/:objectiveId/trace', async (request) => {
    const params = request.params as { objectiveId: string };
    const query = request.query as {
      tenantId: string;
      remoteSessionId: string;
    };

    return service.fetchTrace({
      tenantId: query.tenantId,
      objectiveId: params.objectiveId,
      remoteSessionId: query.remoteSessionId,
    });
  });
};
