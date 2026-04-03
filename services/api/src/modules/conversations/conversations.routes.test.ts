import Fastify, { type FastifyRequest } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { zodValidatorCompiler } from '../../routes/zod-validator.js';
import { createConversationThreadDetail } from '../clinic-shared/clinic-test-fixtures.js';

const { mockService } = vi.hoisted(() => ({
  mockService: {
    listThreads: vi.fn(),
    getThread: vi.fn(),
    listMessages: vi.fn(),
    assignThread: vi.fn(),
    escalateThread: vi.fn(),
    resolveThread: vi.fn(),
    replyToThread: vi.fn(),
  },
}));

vi.mock('./conversations.service.js', () => ({
  ConversationsService: vi.fn().mockImplementation(() => mockService),
}));

async function buildConversationsApp() {
  const app = Fastify();
  app.setValidatorCompiler(zodValidatorCompiler);

  app.addHook('preHandler', async (request) => {
    const clinicRequest = request as FastifyRequest & {
      userId?: string;
      tenantRole?: string;
    };
    clinicRequest.userId = 'user-123';
    clinicRequest.tenantRole = 'operator';
  });

  const { conversationRoutes } = await import('./conversations.routes.js');
  await app.register(conversationRoutes);
  await app.ready();

  return app;
}

describe('conversationRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockService.assignThread.mockResolvedValue(createConversationThreadDetail());
    mockService.escalateThread.mockResolvedValue(
      createConversationThreadDetail({ status: 'escalated', requiresHumanReview: true })
    );
    mockService.resolveThread.mockResolvedValue(
      createConversationThreadDetail({ status: 'resolved', resolution: 'Handled by front desk' })
    );
    mockService.replyToThread.mockResolvedValue(
      createConversationThreadDetail({ lastOutboundAt: '2025-01-15T09:30:00.000Z' })
    );
  });

  it('derives operational conversation actions from the authenticated request context', async () => {
    const app = await buildConversationsApp();

    const assignResponse = await app.inject({
      method: 'POST',
      url: '/tenants/tenant-1/conversations/thread-1/assign',
      payload: {
        assignedUserId: 'staff-2',
        note: 'Needs manual review',
      },
    });
    const escalateResponse = await app.inject({
      method: 'POST',
      url: '/tenants/tenant-1/conversations/thread-1/escalate',
      payload: {
        reason: 'Complex insurance question',
      },
    });
    const resolveResponse = await app.inject({
      method: 'POST',
      url: '/tenants/tenant-1/conversations/thread-1/resolve',
      payload: {
        resolution: 'Booked and closed',
      },
    });
    const replyResponse = await app.inject({
      method: 'POST',
      url: '/tenants/tenant-1/conversations/thread-1/reply',
      payload: {
        body: 'Te propongo el miercoles a las 10:00',
      },
    });

    expect(assignResponse.statusCode).toBe(200);
    expect(escalateResponse.statusCode).toBe(200);
    expect(resolveResponse.statusCode).toBe(200);
    expect(replyResponse.statusCode).toBe(200);

    expect(mockService.assignThread).toHaveBeenCalledWith(
      'tenant-1',
      'thread-1',
      {
        assignedUserId: 'staff-2',
        note: 'Needs manual review',
      },
      'user-123',
      'operator'
    );
    expect(mockService.escalateThread).toHaveBeenCalledWith(
      'tenant-1',
      'thread-1',
      {
        reason: 'Complex insurance question',
      },
      'user-123',
      'operator'
    );
    expect(mockService.resolveThread).toHaveBeenCalledWith(
      'tenant-1',
      'thread-1',
      {
        resolution: 'Booked and closed',
      },
      'user-123',
      'operator'
    );
    expect(mockService.replyToThread).toHaveBeenCalledWith(
      'tenant-1',
      'thread-1',
      {
        body: 'Te propongo el miercoles a las 10:00',
      },
      'user-123',
      'operator'
    );

    await app.close();
  });
});
