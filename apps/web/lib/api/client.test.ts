import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('api client runtime parsing', () => {
  const originalFetch = globalThis.fetch;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const env = process.env as Record<string, string | undefined>;

  beforeEach(() => {
    vi.resetModules();
    env.NODE_ENV = 'development';
    env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    env.NODE_ENV = originalNodeEnv;
    env.NEXT_PUBLIC_API_URL = originalApiUrl;
    vi.restoreAllMocks();
  });

  it('parses tenants through the shared contract envelopes', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          tenants: [
            {
              id: 'tenant-1',
              name: 'Acme',
              type: 'business',
              plan: 'pro',
              createdAt: '2024-01-01T00:00:00Z',
              ownerId: 'user-1',
              settings: {
                timezone: 'UTC',
                defaultHITL: false,
                logRetentionDays: 30,
                memoryRetentionDays: 7,
              },
            },
          ],
        }),
        { status: 200 }
      )
    ) as typeof fetch;

    const { fetchTenants } = await import('./client');
    const tenants = await fetchTenants();

    expect(tenants).toHaveLength(1);
    expect(tenants[0]?.settings.timezone).toBe('UTC');
  });

  it('parses tenant experience through the generic routing contract', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          experience: {
            tenantId: 'tenant-1',
            activeVertical: 'internal',
            shellKey: 'platform_internal',
            defaultRoute: '/app/tenant-1/dashboard',
            role: 'owner',
            normalizedRole: 'owner',
            permissions: ['view_internal_platform'],
            allowedNavigation: ['platform_internal'],
            modules: [],
            flags: {
              activeVertical: 'internal',
              isPlatformAdminTenant: true,
              adminConsoleEnabled: true,
              verticalClinicUi: false,
              clinicDentalMode: false,
              voiceInboundEnabled: false,
              voiceOutboundEnabled: false,
              whatsappOutboundEnabled: false,
              intakeFormsEnabled: false,
              appointmentConfirmationsEnabled: false,
              smartGapFillEnabled: false,
              reactivationEnabled: false,
              advancedClinicModeEnabled: false,
              internalPlatformVisible: true,
            },
            settingsSections: [
              'general',
              'team',
              'integrations',
              'plan',
              'security',
              'internal_defaults',
              'internal_approvals',
            ],
            canAccessInternalPlatform: true,
            canAccessAdminConsole: true,
          },
        }),
        { status: 200 }
      )
    ) as typeof fetch;

    const { fetchTenantExperience } = await import('./client');
    const experience = await fetchTenantExperience('tenant-1');

    expect(experience?.activeVertical).toBe('internal');
    expect(experience?.shellKey).toBe('platform_internal');
  });

  it('fills installation defaults from the validated contract', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          installations: {
            agents: [
              {
                id: 'install-1',
                tenantId: 'tenant-1',
                templateId: 'agent-1',
                status: 'active',
                installedAt: '2024-01-01T00:00:00Z',
                config: {},
                hitlEnabled: true,
                lastRunAt: null,
                runsTotal: 1,
                runsSuccess: 1,
              },
            ],
            workflows: [],
          },
        }),
        { status: 200 }
      )
    ) as typeof fetch;

    const { fetchInstalledAgents } = await import('./client');
    const agents = await fetchInstalledAgents('tenant-1');

    expect(agents[0]?.kpiValues).toEqual({});
  });

  it('parses catalog endpoints through the shared catalog contracts', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            agents: [
              {
                id: 'inbox-triage',
                name: 'Inbox Triage',
                outcome: 'Keep inboxes organized',
                domain: 'support',
                description: 'Auto-triage incoming emails',
                inputs: ['emails'],
                outputs: ['labels'],
                requiredIntegrations: ['gmail'],
                workflows: ['wf-01-auto-label-gmail'],
                riskLevel: 'low',
                hitl: 'optional',
                kpis: [{ name: 'accuracy', description: 'Label accuracy' }],
                complexity: 'S',
                version: '0.1.0',
                channel: 'stable',
                setupTimeMinutes: 15,
                monthlyPrice: null,
                catalogGroup: 'support',
              },
            ],
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            workflows: [
              {
                id: 'wf-01-auto-label-gmail',
                name: 'Auto Label Gmail Messages',
                summary: 'Automatically label Gmail messages after AI triage',
                trigger: 'email',
                integrations: ['gmail'],
                output: 'Applied labels in Gmail',
                useCase: 'Inbox management',
                riskLevel: 'low',
                version: '0.1.0',
                changelog: ['0.1.0: Initial release'],
                nodesOverview: [{ id: '1', type: 'action', name: 'Analyze' }],
                catalogGroups: ['support'],
              },
            ],
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            packs: [
              {
                id: 'support-starter',
                name: 'Support Starter Pack',
                slug: 'support-starter',
                vertical: 'support',
                description: 'Essential support automations',
                includedCategories: ['support'],
                includedAgents: ['inbox-triage'],
                includedWorkflows: ['wf-01-auto-label-gmail'],
                setupTimeEstimate: '20 minutes',
                kpis: ['Time to first triage'],
                riskProfile: 'low',
                monthlyPrice: null,
              },
            ],
          }),
          { status: 200 }
        )
      );
    globalThis.fetch = fetchMock as typeof fetch;

    const { fetchCatalogAgents, fetchCatalogWorkflows, fetchCatalogPacks } = await import(
      './client'
    );

    await expect(fetchCatalogAgents()).resolves.toHaveLength(1);
    await expect(fetchCatalogWorkflows()).resolves.toHaveLength(1);
    await expect(fetchCatalogPacks()).resolves.toHaveLength(1);
  });

  it('rejects malformed tenant members with a visible contract error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          members: [
            {
              id: 'member-1',
              tenantId: 'tenant-1',
              user: {
                email: 'ops@example.com',
              },
            },
          ],
        }),
        { status: 200 }
      )
    ) as typeof fetch;

    const { ApiContractError, fetchTenantMembers } = await import('./client');
    const promise = fetchTenantMembers('tenant-1');

    await expect(promise).rejects.toBeInstanceOf(ApiContractError);
    await expect(promise).rejects.toThrow('/api/v1/tenants/tenant-1/members');
  });

  it('returns null for 404 run lookups but rejects malformed run payloads', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('Not found', { status: 404, statusText: 'Not Found' }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            run: {
              id: 'run-1',
            },
          }),
          { status: 200 }
        )
      );
    globalThis.fetch = fetchMock as typeof fetch;

    const { ApiContractError, fetchTenantRun } = await import('./client');

    await expect(fetchTenantRun('tenant-1', 'missing-run')).resolves.toBeNull();
    await expect(fetchTenantRun('tenant-1', 'run-1')).rejects.toBeInstanceOf(ApiContractError);
  });

  it('parses approval decisions through the shared response schema', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          approval: {
            id: 'approval-1',
            tenantId: 'tenant-1',
            runId: 'run-1',
            agentInstallationId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
            agentId: 'agent-1',
            actionType: 'send_email',
            riskLevel: 'medium',
            title: 'Send newsletter',
            description: '',
            payloadPreview: { to: 'ops@example.com' },
            context: {},
            status: 'approved',
            requestedAt: '2024-01-01T00:00:00Z',
            decidedAt: '2024-01-01T00:05:00Z',
            decidedBy: 'user-1',
            decisionReason: 'Looks good',
          },
        }),
        { status: 200 }
      )
    ) as typeof fetch;

    const { approveRequest } = await import('./client');
    const result = await approveRequest('tenant-1', 'approval-1', 'Looks good');

    expect(result.approval.status).toBe('approved');
    expect(result.approval.agentInstallationId).toBe('3fa85f64-5717-4562-b3fc-2c963f66afa6');
  });

  it('parses install responses with explicit installation types', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          installation: {
            id: 'install-1',
            tenantId: 'tenant-1',
            templateId: 'agent-1',
            status: 'active',
            installedAt: '2024-01-01T00:00:00Z',
            config: {},
            hitlEnabled: true,
            lastRunAt: null,
            runsTotal: 1,
            runsSuccess: 1,
            type: 'agent',
          },
        }),
        { status: 201 }
      )
    ) as typeof fetch;

    const { installAgent } = await import('./client');
    const result = await installAgent('tenant-1', 'agent-1');

    expect(result.installation.type).toBe('agent');
  });

  it('parses billing overview and workflow engine status through shared contracts', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            overview: {
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
                  billableRuns: 123,
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
                billableRuns: 123,
                overageRuns: 0,
                totalTokens: 4567,
                totalCostEstimate: 12.34,
                overageAmount: 0,
                currency: 'usd',
                metrics: [
                  {
                    metric: 'agent_runs',
                    used: 123,
                    limit: 10000,
                    unit: 'runs',
                  },
                ],
              },
              invoices: [],
              paymentMethods: [],
            },
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            status: {
              tenantId: 'tenant-1',
              availability: 'online',
              baseUrl: 'https://n8n.example.com',
              apiKeySet: true,
              executionCount: 44,
              installedWorkflows: 3,
              activeWorkflows: 2,
              platformManaged: true,
            },
          }),
          { status: 200 }
        )
      );
    globalThis.fetch = fetchMock as typeof fetch;

    const { fetchBillingOverview, fetchWorkflowEngineStatus } = await import('./client');
    const overview = await fetchBillingOverview('tenant-1');
    const workflowStatus = await fetchWorkflowEngineStatus('tenant-1');

    expect(overview.subscription.plan).toBe('pro');
    expect(workflowStatus.availability).toBe('online');
  });
});
