import { describe, it, expect } from 'vitest';
import {
  AgentTemplateSchema,
  WorkflowTemplateSchema,
  PackTemplateSchema,
  TenantSchema,
  InstalledAgentSchema,
  ExecutionRunSchema,
  ApprovalRequestSchema,
  SecurityFindingSchema,
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
