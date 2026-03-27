import { describe, it, expect } from 'vitest';
import {
  AgentTemplateSchema,
  AgentTemplateResponseSchema,
  AgentTemplatesResponseSchema,
  TenantSchema,
  TenantsResponseSchema,
  TenantMembersResponseSchema,
  InstallationResponseSchema,
  InstallationsResponseSchema,
  InstallPackQueuedResponseSchema,
  ExecutionStepSchema,
  ExecutionRunSchema,
  ExecutionRunsResponseSchema,
  ExecutionRunResponseSchema,
  ExecutionRunLogsResponseSchema,
  ApprovalRequestSchema,
  ApprovalRequestsResponseSchema,
  ConnectorsResponseSchema,
  BillingOverviewSchema,
  InvoiceSchema,
  PublicChatResponseSchema,
  WorkflowEngineStatusSchema,
  CategorySchema,
  OperationalAgentManifestSchema,
  OperationalWorkflowManifestSchema,
  OperationalPackManifestSchema,
  WorkflowTemplatesResponseSchema,
  PackTemplatesResponseSchema,
  AgentProfileSchema,
  ProtocolEnvelopeSchema,
  TelegramUpdateSchema,
  OpenClawTurnInputSchema,
  OpenClawTurnResultSchema,
  InternalOpsResponseSchema,
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

  it('accepts preview availability', () => {
    const result = AgentTemplateSchema.parse({
      ...validAgent,
      availability: 'preview',
    });
    expect(result.availability).toBe('preview');
  });

  it('rejects invalid availability', () => {
    expect(() =>
      AgentTemplateSchema.parse({ ...validAgent, availability: 'soon' }),
    ).toThrow();
  });

  it('rejects invalid risk level', () => {
    expect(() =>
      AgentTemplateSchema.parse({ ...validAgent, riskLevel: 'extreme' }),
    ).toThrow();
  });

  it('parses catalog response envelopes', () => {
    expect(
      AgentTemplatesResponseSchema.parse({ agents: [validAgent] }).agents,
    ).toHaveLength(1);
    expect(
      AgentTemplateResponseSchema.parse({ agent: validAgent }).agent.id,
    ).toBe('inbox-triage');
  });
});

describe('Operational manifest schemas', () => {
  it('parses an operational agent manifest with runtime and catalog metadata', () => {
    const manifest = OperationalAgentManifestSchema.parse({
      id: 'inbox-triage',
      name: 'Inbox Triage',
      version: '0.1.0',
      description: 'Triage inbox messages',
      category: 'support',
      runtime: {
        requiredConnectors: ['gmail'],
        credentialStrategy: 'platform_managed',
        installStrategy: 'platform_managed_installation',
        runtimeOwner: 'agent_engine',
        linkedWorkflows: ['wf-01-auto-label-gmail'],
      },
      catalog: {
        outcome: 'Keep inboxes organized',
        domain: 'support',
        inputs: ['emails'],
        outputs: ['labels'],
        riskLevel: 'low',
        hitl: 'optional',
        kpis: [{ name: 'accuracy', description: 'Classification accuracy' }],
        complexity: 'S',
        channel: 'stable',
        setupTimeMinutes: 15,
        monthlyPrice: null,
      },
    });

    expect(manifest.runtime?.runtimeOwner).toBe('agent_engine');
    expect(manifest.catalog?.domain).toBe('support');
  });

  it('parses catalog.availability preview on operational agent manifests', () => {
    const manifest = OperationalAgentManifestSchema.parse({
      id: 'preview-agent',
      name: 'Preview Agent',
      version: '0.1.0',
      description: 'Preview-only listing',
      category: 'core',
      runtime: {
        requiredConnectors: [],
        credentialStrategy: 'platform_managed',
        installStrategy: 'platform_managed_installation',
        runtimeOwner: 'agent_engine',
        linkedWorkflows: [],
      },
      catalog: {
        outcome: 'Preview',
        domain: 'core',
        inputs: [],
        outputs: [],
        riskLevel: 'low',
        hitl: 'optional',
        kpis: [{ name: 'k', description: 'd' }],
        complexity: 'S',
        channel: 'stable',
        setupTimeMinutes: 5,
        monthlyPrice: null,
        availability: 'preview',
      },
    });
    expect(manifest.catalog?.availability).toBe('preview');
  });

  it('parses an operational workflow manifest with an n8n-native credential exception', () => {
    const manifest = OperationalWorkflowManifestSchema.parse({
      id: 'wf-01',
      name: 'Auto Label',
      version: '0.1.0',
      description: 'Apply inbox labels',
      type: 'n8n',
      status: 'public',
      category: 'support',
      runtime: {
        requiredConnectors: ['gmail'],
        credentialStrategy: 'n8n_native_exception',
        installStrategy: 'shared_n8n_per_installation',
        runtimeOwner: 'n8n',
      },
      catalog: {
        summary: 'Auto-label Gmail messages',
        integrations: ['gmail'],
        output: 'Labels applied',
        useCase: 'Inbox management',
        riskLevel: 'low',
        changelog: ['0.1.0: Initial release'],
        nodesOverview: [{ id: '1', type: 'action', name: 'Analyze' }],
      },
    });

    expect(manifest.runtime?.credentialStrategy).toBe('n8n_native_exception');
  });

  it('parses an operational pack manifest with nested catalog metadata', () => {
    const manifest = OperationalPackManifestSchema.parse({
      id: 'support-starter',
      name: 'Support Starter',
      version: '0.1.0',
      description: 'Support pack',
      category: 'support',
      agents: ['inbox-triage'],
      workflows: ['wf-01'],
      catalog: {
        slug: 'support-starter',
        vertical: 'support',
        includedCategories: ['support'],
        setupTimeEstimate: '20 minutes',
        kpis: ['Time to first triage'],
        riskProfile: 'low',
        monthlyPrice: null,
      },
    });

    expect(manifest.catalog?.vertical).toBe('support');
  });
});

describe('WorkflowTemplateSchema', () => {
  it('parses workflow and pack catalog response envelopes', () => {
    const workflow = {
      id: 'wf-01',
      name: 'Auto Label',
      summary: 'Auto-label Gmail messages',
      trigger: 'email',
      integrations: ['gmail'],
      output: 'Labels applied',
      useCase: 'Inbox management',
      riskLevel: 'low',
      version: '0.1.0',
      changelog: ['0.1.0: Initial release'],
      nodesOverview: [{ id: '1', type: 'action', name: 'Analyze' }],
    };

    const pack = {
      id: 'support-starter',
      name: 'Support Starter',
      slug: 'support-starter',
      vertical: 'support',
      description: 'Support pack',
      includedCategories: ['support'],
      includedAgents: ['inbox-triage'],
      includedWorkflows: ['wf-01'],
      setupTimeEstimate: '20 minutes',
      kpis: ['Time to first triage'],
      riskProfile: 'low',
      monthlyPrice: null,
    };

    expect(
      WorkflowTemplatesResponseSchema.parse({ workflows: [workflow] }).workflows,
    ).toHaveLength(1);
    expect(
      PackTemplatesResponseSchema.parse({ packs: [pack] }).packs,
    ).toHaveLength(1);
  });
});

describe('ExecutionRunSchema', () => {
  const validRun = {
    id: 'run-1',
    tenantId: 'tenant-1',
    agentInstallationId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    agentId: 'agent-inbox-triage',
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
    expect(result.agentInstallationId).toBe(
      '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    );
  });

  it('rejects invalid status', () => {
    expect(() =>
      ExecutionRunSchema.parse({ ...validRun, status: 'unknown' }),
    ).toThrow();
  });

  it('normalizes legacy execution values', () => {
    const result = ExecutionRunSchema.parse({
      ...validRun,
      status: 'completed',
      workflowInstallationId: '3fa85f64-5717-4562-b3fc-2c963f66afa7',
      timeline: [
        {
          id: 'step-1',
          type: 'n8n-execution',
          name: 'Execute workflow',
          status: 'completed',
          startedAt: '2024-01-01T00:00:00Z',
        },
      ],
    });

    expect(result.status).toBe('success');
    expect(result.timeline[0]).toMatchObject({
      type: 'n8n_execution',
      status: 'success',
    });
    expect(result.workflowInstallationId).toBe(
      '3fa85f64-5717-4562-b3fc-2c963f66afa7',
    );
  });

  it('parses execution response envelopes', () => {
    expect(
      ExecutionRunsResponseSchema.parse({ runs: [validRun] }).runs,
    ).toHaveLength(1);
    expect(
      ExecutionRunResponseSchema.parse({ run: validRun }).run.id,
    ).toBe('run-1');
    expect(
      ExecutionRunLogsResponseSchema.parse({ logs: ['log-1'] }).logs,
    ).toEqual(['log-1']);
  });
});

describe('InternalOps schemas', () => {
  it('parses an internal agent profile', () => {
    const profile = AgentProfileSchema.parse({
      id: 'cto',
      roleTitle: 'CTO',
      department: 'engineering',
      mission: 'Ship product safely.',
      kpis: [{ name: 'delivery_health' }],
      allowedTools: ['repo-analysis'],
      allowedWorkflowTags: ['engineering'],
      memoryScope: 'objective',
      riskBudget: 'high',
      escalationPolicy: 'Escalate on production changes.',
      playbooks: ['incident-response'],
    });

    expect(profile.department).toBe('engineering');
  });

  it('parses protocol envelopes carrying coherence metadata', () => {
    const envelope = ProtocolEnvelopeSchema.parse({
      contract: {
        system: 'agentmou-internal-ops',
        version: '2.0.0',
      },
      kind: 'delegation',
      senderAgentId: 'ceo',
      recipientAgentId: 'cto',
      sessionId: '11111111-1111-4111-8111-111111111111',
      objectiveId: '22222222-2222-4222-8222-222222222222',
      headline: 'Delegate product work',
      summary: 'Prepare the execution plan',
      requestedAction: 'execute',
      constraints: ['deterministic execution'],
      expectedArtifacts: ['brief'],
      capabilityKeys: ['internal.prepare_brief'],
      executionTarget: 'native',
      coherence: {
        continueMode: 'continue',
        alertIds: [],
        controlTypes: ['structure'],
        reviewRequired: false,
        paused: false,
      },
      payload: {},
    });

    expect(envelope.contract.system).toBe('agentmou-internal-ops');
  });

  it('parses telegram webhook updates and internal ops responses', () => {
    const update = TelegramUpdateSchema.parse({
      update_id: 123,
      message: {
        message_id: 456,
        from: { id: 789, first_name: 'Tim' },
        chat: { id: 999, type: 'private' },
        date: 1740000000,
        text: 'Prepare next week launch brief',
      },
    });

    const response = InternalOpsResponseSchema.parse({
      ok: true,
      sessionId: '11111111-1111-4111-8111-111111111111',
      objectiveId: '22222222-2222-4222-8222-222222222222',
      summary: 'Queued work orders',
      approvalRequired: true,
      queuedWorkOrderIds: ['33333333-3333-4333-8333-333333333333'],
    });

    expect(update.message?.text).toContain('launch');
    expect(response.approvalRequired).toBe(true);
  });

  it('parses OpenClaw turn input and output contracts', () => {
    const turnInput = OpenClawTurnInputSchema.parse({
      tenantId: '11111111-1111-4111-8111-111111111111',
      sessionId: '22222222-2222-4222-8222-222222222222',
      objectiveId: '33333333-3333-4333-8333-333333333333',
      trigger: 'telegram_message',
      activeAgentId: 'ceo',
      operatorMessage: 'Review next week priorities',
      agentProfiles: [],
      capabilities: [],
      memory: [],
      context: {},
    });

    const turnResult = OpenClawTurnResultSchema.parse({
      remoteSessionId: 'openclaw-session-1',
      activeAgentId: 'ceo',
      summary: 'CEO delegated the request to CTO and COO.',
      status: 'active',
      closeObjective: false,
      delegations: [],
      workOrders: [],
      operatorMessages: [],
      participants: ['ceo', 'cto', 'coo'],
      contextChannels: ['telegram'],
      toolCalls: ['internal.prepare_brief'],
      successfulResults: 1,
      retryCount: 0,
      traceReference: { traceId: 'trace-1' },
    });

    expect(turnInput.trigger).toBe('telegram_message');
    expect(turnResult.remoteSessionId).toBe('openclaw-session-1');
  });
});

describe('ExecutionStepSchema', () => {
  it('accepts canonical execution step types', () => {
    const result = ExecutionStepSchema.parse({
      id: 'step-1',
      type: 'agent_invoke',
      name: 'Generate answer',
      status: 'success',
      startedAt: '2024-01-01T00:00:00Z',
      output: { subject: 'hello' },
    });

    expect(result.type).toBe('agent_invoke');
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

  it('parses single installation responses with explicit record type', () => {
    const result = InstallationResponseSchema.parse({
      installation: {
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
        type: 'agent',
      },
    });

    expect(result.installation.type).toBe('agent');
  });

  it('parses queued pack installation responses', () => {
    const result = InstallPackQueuedResponseSchema.parse({
      jobId: 'job-1',
      status: 'queued',
      message: 'Pack queued',
    });

    expect(result.status).toBe('queued');
  });
});

describe('ApprovalRequestSchema', () => {
  it('parses a valid approval request', () => {
    const result = ApprovalRequestSchema.parse({
      id: 'appr-1',
      tenantId: 'tenant-1',
      runId: 'run-1',
      agentInstallationId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
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
    expect(result.agentInstallationId).toBe(
      '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    );
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
          agentInstallationId: '3fa85f64-5717-4562-b3fc-2c963f66afa8',
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

describe('BillingOverviewSchema', () => {
  it('parses billing overview envelopes with usage and payment details', () => {
    const result = BillingOverviewSchema.parse({
      subscription: {
        id: 'sub-1',
        tenantId: 'tenant-1',
        provider: 'stripe',
        plan: 'pro',
        status: 'active',
        cancelAtPeriodEnd: false,
        entitlements: {
          plan: 'pro',
          includedRuns: 10000,
          includedAgents: 10,
          includedTeamMembers: 10,
          logRetentionDays: 30,
          monthlyBaseAmount: 99,
          overageRunPrice: 0.005,
          currency: 'usd',
          softLimit: true,
        },
        usage: {
          billableRuns: 210,
          includedRuns: 10000,
          overageRuns: 0,
        },
        monthlyBaseAmount: 99,
        overageAmount: 0,
        currency: 'usd',
      },
      usage: {
        tenantId: 'tenant-1',
        periodStart: '2024-01-01T00:00:00Z',
        periodEnd: '2024-02-01T00:00:00Z',
        includedRuns: 10000,
        billableRuns: 210,
        overageRuns: 0,
        totalTokens: 42000,
        totalCostEstimate: 12.3,
        overageAmount: 0,
        currency: 'usd',
        metrics: [
          {
            metric: 'agent_runs',
            used: 210,
            limit: 10000,
            unit: 'runs',
          },
        ],
      },
      invoices: [
        {
          id: 'inv-1',
          tenantId: 'tenant-1',
          date: '2024-01-01T00:00:00Z',
          amount: 99,
          status: 'paid',
          currency: 'usd',
          items: [{ description: 'Pro plan', amount: 99 }],
        },
      ],
      paymentMethods: [
        {
          id: 'pm-1',
          type: 'card',
          brand: 'visa',
          last4: '4242',
          isDefault: true,
        },
      ],
    });

    expect(result.subscription.plan).toBe('pro');
    expect(result.paymentMethods[0]?.last4).toBe('4242');
  });
});

describe('WorkflowEngineStatusSchema', () => {
  it('parses platform-managed n8n status payloads', () => {
    const result = WorkflowEngineStatusSchema.parse({
      tenantId: 'tenant-1',
      availability: 'online',
      baseUrl: 'https://n8n.example.com',
      apiKeySet: true,
      executionCount: 12,
      installedWorkflows: 3,
      activeWorkflows: 2,
      platformManaged: true,
    });

    expect(result.availability).toBe('online');
    expect(result.installedWorkflows).toBe(3);
  });
});

describe('PublicChatResponseSchema', () => {
  it('parses cited public chat responses', () => {
    const result = PublicChatResponseSchema.parse({
      reply: 'Here is what I can confirm.',
      citations: [
        {
          id: 'citation-1',
          title: 'Pricing',
          href: '/pricing',
          excerpt: 'Starter is $29/month.',
          sourcePath: 'apps/web/app/(marketing)/pricing/page.tsx',
        },
      ],
      actions: [{ label: 'View Pricing', href: '/pricing' }],
      provider: 'retrieval',
      fallback: false,
    });

    expect(result.citations[0]?.title).toBe('Pricing');
    expect(result.provider).toBe('retrieval');
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
