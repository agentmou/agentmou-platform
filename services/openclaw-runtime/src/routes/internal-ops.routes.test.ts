import Fastify from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { internalOpsRoutes } from './internal-ops.routes.js';

describe('internalOpsRoutes', () => {
  const service = {
    registerAgentProfiles: vi.fn(),
    registerCapabilities: vi.fn(),
    startTurn: vi.fn(),
    continueTurn: vi.fn(),
    cancelObjective: vi.fn(),
    fetchTrace: vi.fn(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('starts a turn when the request is authorized', async () => {
    service.startTurn.mockResolvedValue({
      remoteSessionId: 'session-1',
      activeAgentId: 'cto',
      summary: 'planned',
      status: 'active',
      closeObjective: false,
      delegations: [],
      workOrders: [],
      operatorMessages: [],
      participants: ['ceo', 'cto'],
      contextChannels: ['telegram'],
      toolCalls: ['plan_execution'],
      successfulResults: 1,
      retryCount: 0,
      checkpointToken: 'cp-1',
      traceReference: {},
    });

    const app = Fastify();
    await app.register(internalOpsRoutes, {
      service: service as never,
      apiKey: 'test-key',
    });
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/v1/internal-ops/turns/start',
      headers: {
        authorization: 'Bearer test-key',
      },
      payload: {
        tenantId: '00000000-0000-0000-0000-000000000001',
        sessionId: '00000000-0000-0000-0000-000000000002',
        objectiveId: '00000000-0000-0000-0000-000000000003',
        trigger: 'telegram_message',
        activeAgentId: 'ceo',
        operatorMessage: 'Prepare a launch brief',
        agentProfiles: [],
        capabilities: [],
        memory: [],
        context: {},
      },
    });

    expect(response.statusCode).toBe(200);
    expect(service.startTurn).toHaveBeenCalledTimes(1);

    await app.close();
  });

  it('rejects unauthorized requests when an api key is configured', async () => {
    const app = Fastify();
    await app.register(internalOpsRoutes, {
      service: service as never,
      apiKey: 'test-key',
    });
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/v1/internal-ops/turns/start',
      payload: {},
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });
});
