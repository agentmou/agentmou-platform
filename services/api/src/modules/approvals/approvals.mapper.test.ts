import { describe, expect, it } from 'vitest';

import { mapApproval } from './approvals.mapper.js';

describe('mapApproval', () => {
  it('maps approvals to the shared contract shape', () => {
    const requestedAt = new Date('2024-01-01T00:00:00Z');
    const decidedAt = new Date('2024-01-01T00:05:00Z');

    const approval = mapApproval(
      {
        id: 'approval-1',
        tenantId: 'tenant-1',
        runId: 'run-1',
        agentInstallationId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        actionType: 'send_email',
        riskLevel: 'medium',
        title: 'Send newsletter',
        description: null,
        payloadPreview: null,
        context: {
          inputs: 'invalid',
          sources: ['crm', 123],
          previousMessages: 'invalid',
          traceId: 'trace-1',
        },
        status: 'approved',
        source: null,
        sourceMetadata: null,
        resumeToken: null,
        objectiveId: null,
        workOrderId: null,
        requestedAt,
        decidedAt,
        decidedBy: 'user-1',
        decisionReason: 'LGTM',
      },
      'agent-template-1',
    );

    expect(approval).toEqual({
      id: 'approval-1',
      tenantId: 'tenant-1',
      runId: 'run-1',
      agentInstallationId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      agentId: 'agent-template-1',
      actionType: 'send_email',
      riskLevel: 'medium',
      title: 'Send newsletter',
      description: '',
      payloadPreview: {},
      context: {
        sources: ['crm'],
        traceId: 'trace-1',
      },
      status: 'approved',
      requestedAt: requestedAt.toISOString(),
      decidedAt: decidedAt.toISOString(),
      decidedBy: 'user-1',
      decisionReason: 'LGTM',
    });
  });

  it('keeps the installation id canonical when the template id is unavailable', () => {
    const approval = mapApproval({
      id: 'approval-2',
      tenantId: 'tenant-1',
      runId: 'run-2',
      agentInstallationId: '3fa85f64-5717-4562-b3fc-2c963f66afa7',
      actionType: 'create_ticket',
      riskLevel: 'low',
      title: 'Create support case',
      description: 'Open a case for the customer',
      payloadPreview: { ticketId: 'case-1' },
      context: {},
      status: 'pending',
      source: null,
      sourceMetadata: null,
      resumeToken: null,
      objectiveId: null,
      workOrderId: null,
      requestedAt: new Date('2024-01-02T00:00:00Z'),
      decidedAt: null,
      decidedBy: null,
      decisionReason: null,
    });

    expect(approval.agentInstallationId).toBe(
      '3fa85f64-5717-4562-b3fc-2c963f66afa7',
    );
    expect(approval.agentId).toBeUndefined();
    expect(approval.status).toBe('pending');
  });
});
