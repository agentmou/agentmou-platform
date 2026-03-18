import Fastify, { type FastifyRequest } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { zodValidatorCompiler } from '../../routes/zod-validator.js';

const mockService = {
  listApprovals: vi.fn(),
  getApproval: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
  requestApproval: vi.fn(),
};

vi.mock('./approvals.service.js', () => ({
  ApprovalsService: vi.fn().mockImplementation(() => mockService),
}));

const validApproval = {
  id: 'approval-1',
  tenantId: 'tenant-1',
  runId: 'run-1',
  agentId: 'agent-template-1',
  actionType: 'send_email',
  riskLevel: 'medium',
  title: 'Send newsletter',
  description: '',
  payloadPreview: { to: 'team@example.com' },
  context: {
    sources: ['crm'],
  },
  status: 'pending',
  requestedAt: '2024-01-01T00:00:00.000Z',
};

async function buildApprovalsApp() {
  const app = Fastify();
  app.setValidatorCompiler(zodValidatorCompiler);

  app.addHook('preHandler', async (request) => {
    (request as FastifyRequest & { userId?: string }).userId = 'user-123';
  });

  const { approvalRoutes } = await import('./approvals.routes.js');
  await app.register(approvalRoutes);
  await app.ready();

  return app;
}

describe('approvalRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates approval creation payloads', async () => {
    const app = await buildApprovalsApp();

    const response = await app.inject({
      method: 'POST',
      url: '/tenants/tenant-1/approvals',
      payload: {
        title: 'Missing required fields',
      },
    });

    expect(response.statusCode).toBe(400);
    expect(mockService.requestApproval).not.toHaveBeenCalled();

    await app.close();
  });

  it('derives approve decisions from the authenticated user', async () => {
    mockService.approve.mockResolvedValue(validApproval);
    const app = await buildApprovalsApp();

    const response = await app.inject({
      method: 'POST',
      url: '/tenants/tenant-1/approvals/approval-1/approve',
      payload: {
        decidedBy: 'forged-user',
        reason: 'Looks safe',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mockService.approve).toHaveBeenCalledWith(
      'tenant-1',
      'approval-1',
      'user-123',
      'Looks safe',
    );

    await app.close();
  });

  it('derives reject decisions from the authenticated user', async () => {
    mockService.reject.mockResolvedValue({
      ...validApproval,
      status: 'rejected',
      decidedAt: '2024-01-01T00:05:00.000Z',
      decidedBy: 'user-123',
      decisionReason: 'Needs more review',
    });
    const app = await buildApprovalsApp();

    const response = await app.inject({
      method: 'POST',
      url: '/tenants/tenant-1/approvals/approval-1/reject',
      payload: {
        decidedBy: 'forged-user',
        reason: 'Needs more review',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mockService.reject).toHaveBeenCalledWith(
      'tenant-1',
      'approval-1',
      'user-123',
      'Needs more review',
    );

    await app.close();
  });

  it('fails visibly when the service returns a malformed approval payload', async () => {
    mockService.listApprovals.mockResolvedValue([
      {
        id: 'broken-approval',
      },
    ]);
    const app = await buildApprovalsApp();

    const response = await app.inject({
      method: 'GET',
      url: '/tenants/tenant-1/approvals',
    });

    expect(response.statusCode).toBe(500);

    await app.close();
  });
});
