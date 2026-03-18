import { describe, it, expect } from 'vitest';
import {
  AgentTemplateSchema,
  TenantSchema,
  TenantsResponseSchema,
  TenantMembersResponseSchema,
  InstallationsResponseSchema,
  ExecutionRunSchema,
  ApprovalRequestSchema,
  ApprovalRequestsResponseSchema,
  ConnectorsResponseSchema,
  InvoiceSchema,
  CategorySchema,
} from '../index';

describe('CategorySchema', () => {
  it('accepts valid categories', () => {
    expect(CategorySchema.parse('core')).toBe('core');
    expect(CategorySchema.parse('support')).toBe('support');
    expect(CategorySchema.parse('sales')).toBe('sales');
  });

  it('rejects invalid categories', () => {
    expect(() => CategorySchema.parse('invalid')).toThrow();
    expect(() => CategorySchema.parse('')).toThrow();
  });
});

describe('TenantSchema', () => {
  const validTenant = {
    id: 'tenant-1',
    name: 'Acme Corp',
    type: 'business',
    plan: 'pro',
    createdAt: '2024-01-01T00:00:00Z',
    ownerId: 'user-1',
    settings: {
      timezone: 'UTC',
      defaultHITL: true,
      logRetentionDays: 30,
      memoryRetentionDays: 7,
    },
  };

  it('parses a valid tenant', () => {
    const result = TenantSchema.parse(validTenant);
    expect(result.id).toBe('tenant-1');
    expect(result.plan).toBe('pro');
  });

  it('rejects missing required fields', () => {
    expect(() => TenantSchema.parse({ id: 'x' })).toThrow();
  });

  it('parses tenant envelopes with fully normalized settings', () => {
    const result = TenantsResponseSchema.parse({
      tenants: [validTenant],
    });

    expect(result.tenants[0].settings.timezone).toBe('UTC');
  });
});

describe('AgentTemplateSchema', () => {
  const validAgent = {
    id: 'inbox-triage',
    name: 'Inbox Triage',
    outcome: 'Categorize emails',
    domain: 'support',
    description: 'Auto-triage incoming emails',
    inputs: ['email'],
    outputs: ['label'],
    requiredIntegrations: ['gmail'],
    workflows: ['wf-01'],
    riskLevel: 'low',
    hitl: 'optional',
    kpis: [{ name: 'accuracy', description: 'Label accuracy' }],
    complexity: 'S',
    version: '0.1.0',
    channel: 'stable',
    setupTimeMinutes: 5,
    monthlyPrice: null,
  };

  it('parses a valid agent template', () => {
    const result = AgentTemplateSchema.parse(validAgent);
    expect(result.id).toBe('inbox-triage');
    expect(result.riskLevel).toBe('low');
  });

  it('accepts optional fields', () => {
    const result = AgentTemplateSchema.parse({
      ...validAgent,
      availability: 'available',
      audience: 'business',
      tags: ['email', 'automation'],
      featured: true,
    });
    expect(result.tags).toEqual(['email', 'automation']);
  });

  it('rejects invalid risk level', () => {
    expect(() =>
      AgentTemplateSchema.parse({ ...validAgent, riskLevel: 'extreme' }),
    ).toThrow();
  });
});

describe('ExecutionRunSchema', () => {
  const validRun = {
    id: 'run-1',
    tenantId: 'tenant-1',
    status: 'success',
    startedAt: '2024-01-01T00:00:00Z',
    durationMs: 1200,
    costEstimate: 0.05,
    tokensUsed: 500,
    logs: ['Started', 'Completed'],
    timeline: [],
    triggeredBy: 'manual',
    tags: ['test'],
  };

  it('parses a valid execution run', () => {
    const result = ExecutionRunSchema.parse(validRun);
    expect(result.status).toBe('success');
  });

  it('rejects invalid status', () => {
    expect(() =>
      ExecutionRunSchema.parse({ ...validRun, status: 'unknown' }),
    ).toThrow();
  });
});

describe('InstallationsResponseSchema', () => {
  it('fills empty kpiValues when installations omit them', () => {
    const result = InstallationsResponseSchema.parse({
      installations: {
        agents: [
          {
            id: 'install-1',
            tenantId: 'tenant-1',
            templateId: 'inbox-triage',
            status: 'active',
            installedAt: '2024-01-01T00:00:00Z',
            config: {},
            hitlEnabled: true,
            lastRunAt: null,
            runsTotal: 10,
            runsSuccess: 8,
          },
        ],
        workflows: [],
      },
    });

    expect(result.installations.agents[0].kpiValues).toEqual({});
  });
});

describe('ApprovalRequestSchema', () => {
  it('parses a valid approval request', () => {
    const result = ApprovalRequestSchema.parse({
      id: 'appr-1',
      tenantId: 'tenant-1',
      runId: 'run-1',
      agentId: 'inbox-triage',
      actionType: 'send_email',
      riskLevel: 'medium',
      title: 'Send newsletter',
      description: 'Bulk email campaign',
      payloadPreview: { to: 'list@example.com' },
      context: { inputs: {}, sources: [] },
      status: 'pending',
      requestedAt: '2024-01-01T00:00:00Z',
    });
    expect(result.status).toBe('pending');
  });

  it('normalizes optional approval fields without widening the contract', () => {
    const result = ApprovalRequestSchema.parse({
      id: 'appr-2',
      tenantId: 'tenant-1',
      runId: 'run-1',
      agentId: 'inbox-triage',
      actionType: 'create_ticket',
      riskLevel: 'low',
      title: 'Create support ticket',
      payloadPreview: ['case-1'],
      context: {
        sources: ['crm'],
        traceId: 'trace-1',
      },
      status: 'pending',
      requestedAt: '2024-01-01T00:00:00Z',
    });

    expect(result.description).toBe('');
    expect(result.payloadPreview).toEqual(['case-1']);
    expect(result.context.traceId).toBe('trace-1');
  });

  it('parses approval response envelopes', () => {
    const result = ApprovalRequestsResponseSchema.parse({
      approvals: [
        {
          id: 'appr-3',
          tenantId: 'tenant-1',
          runId: 'run-1',
          agentId: 'inbox-triage',
          actionType: 'send_email',
          riskLevel: 'medium',
          title: 'Send campaign',
          payloadPreview: { to: 'ops@example.com' },
          context: {},
          status: 'pending',
          requestedAt: '2024-01-01T00:00:00Z',
        },
      ],
    });

    expect(result.approvals).toHaveLength(1);
  });
});

describe('ConnectorsResponseSchema', () => {
  it('parses connector envelopes', () => {
    const result = ConnectorsResponseSchema.parse({
      connectors: [
        {
          id: 'gmail',
          name: 'Gmail',
          icon: 'mail',
          category: 'communication',
          status: 'connected',
          scopes: ['gmail.readonly'],
          requiredScopes: ['gmail.readonly'],
          lastTestAt: '2024-01-01T00:00:00Z',
        },
      ],
    });

    expect(result.connectors[0].id).toBe('gmail');
  });
});

describe('TenantMembersResponseSchema', () => {
  it('parses flattened tenant members', () => {
    const result = TenantMembersResponseSchema.parse({
      members: [
        {
          id: 'member-1',
          tenantId: 'tenant-1',
          email: 'ops@example.com',
          name: 'Ops User',
          role: 'operator',
          joinedAt: '2024-01-01T00:00:00Z',
          lastActiveAt: '2024-01-02T00:00:00Z',
        },
      ],
    });

    expect(result.members[0].role).toBe('operator');
  });
});

describe('InvoiceSchema', () => {
  it('parses a valid invoice', () => {
    const result = InvoiceSchema.parse({
      id: 'inv-1',
      tenantId: 'tenant-1',
      date: '2024-01-31',
      amount: 99.99,
      status: 'paid',
      items: [{ description: 'Pro plan', amount: 99.99 }],
    });
    expect(result.items).toHaveLength(1);
  });
});
