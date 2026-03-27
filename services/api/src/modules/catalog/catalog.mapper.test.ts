import { describe, expect, it } from 'vitest';

import { mapAgentManifest, mapPackManifest, mapWorkflowManifest } from './catalog.mapper.js';

describe('catalog.mapper', () => {
  it('maps an operational agent manifest to the shared catalog template shape', () => {
    const agent = mapAgentManifest({
      id: 'inbox-triage',
      name: 'Inbox Triage',
      version: '0.1.0',
      description: 'Automatically categorize incoming email.',
      category: 'support',
      tags: ['gmail', 'triage'],
      runtime: {
        requiredConnectors: ['gmail'],
        credentialStrategy: 'platform_managed',
        installStrategy: 'platform_managed_installation',
        runtimeOwner: 'agent_engine',
        linkedWorkflows: ['wf-01-auto-label-gmail'],
      },
      catalog: {
        outcome: 'Triage inboxes faster',
        domain: 'support',
        inputs: ['emails'],
        outputs: ['labels', 'priority'],
        riskLevel: 'low',
        hitl: 'optional',
        kpis: [{ name: 'SLA adherence', description: 'Time to first triage' }],
        complexity: 'S',
        channel: 'stable',
        setupTimeMinutes: 15,
        monthlyPrice: null,
        availability: 'available',
        audience: 'business',
        catalogGroup: 'support',
        family: 'email',
        tags: ['gmail', 'triage'],
        visibility: 'public',
      },
      metadata: {
        createdAt: '2026-03-07',
      },
    });

    expect(agent).toMatchObject({
      id: 'inbox-triage',
      requiredIntegrations: ['gmail'],
      workflows: ['wf-01-auto-label-gmail'],
      domain: 'support',
      catalogGroup: 'support',
      availability: 'available',
    });
  });

  it('defaults agent availability to preview when catalog omits availability', () => {
    const agent = mapAgentManifest({
      id: 'preview-agent',
      name: 'Preview Agent',
      version: '0.1.0',
      description: 'Listed but not GA',
      category: 'core',
      runtime: {
        requiredConnectors: [],
        credentialStrategy: 'platform_managed',
        installStrategy: 'platform_managed_installation',
        runtimeOwner: 'agent_engine',
        linkedWorkflows: [],
      },
      catalog: {
        outcome: 'Do things',
        domain: 'core',
        inputs: [],
        outputs: [],
        riskLevel: 'low',
        hitl: 'optional',
        kpis: [{ name: 'k', description: 'd' }],
        complexity: 'S',
        channel: 'stable',
        setupTimeMinutes: 10,
        monthlyPrice: null,
      },
    });
    expect(agent.availability).toBe('preview');
  });

  it('maps an operational workflow manifest and normalizes workflow trigger labels', () => {
    const workflow = mapWorkflowManifest({
      id: 'wf-01-auto-label-gmail',
      name: 'Auto Label Gmail Messages',
      version: '0.1.0',
      description: 'Automatically categorize and label incoming Gmail messages.',
      type: 'n8n',
      status: 'public',
      category: 'support',
      trigger: {
        type: 'gmail',
      },
      steps: [
        {
          id: 1,
          name: 'Analyze Message',
          type: 'action',
          node: 'httpRequest',
          agent: 'inbox-triage',
        },
      ],
      runtime: {
        requiredConnectors: ['gmail'],
        credentialStrategy: 'n8n_native_exception',
        installStrategy: 'shared_n8n_per_installation',
        runtimeOwner: 'n8n',
      },
      catalog: {
        summary: 'Label Gmail messages through a managed workflow.',
        integrations: ['gmail'],
        output: 'Applied labels in Gmail',
        useCase: 'Auto-label inbox traffic for support teams.',
        riskLevel: 'low',
        changelog: ['0.1.0: Initial release'],
        nodesOverview: [
          {
            id: 'analyze',
            type: 'action',
            name: 'Analyze Message',
          },
        ],
        availability: 'available',
        catalogGroups: ['support'],
      },
      metadata: {
        createdAt: '2026-03-07',
      },
    });

    expect(workflow).toMatchObject({
      id: 'wf-01-auto-label-gmail',
      trigger: 'email',
      integrations: ['gmail'],
      catalogGroups: ['support'],
      availability: 'available',
    });
  });

  it('defaults workflow availability to preview when catalog omits availability', () => {
    const workflow = mapWorkflowManifest({
      id: 'wf-preview',
      name: 'Preview Workflow',
      version: '0.1.0',
      description: 'Preview workflow',
      type: 'n8n',
      status: 'public',
      category: 'core',
      trigger: { type: 'manual' },
      runtime: {
        requiredConnectors: [],
        credentialStrategy: 'platform_managed',
        installStrategy: 'platform_managed_installation',
        runtimeOwner: 'n8n',
      },
      catalog: {
        summary: 'S',
        integrations: [],
        output: 'O',
        useCase: 'U',
        riskLevel: 'low',
        changelog: ['0.1.0: Initial'],
        nodesOverview: [{ id: '1', type: 'action', name: 'Step' }],
      },
    });
    expect(workflow.availability).toBe('preview');
  });

  it('maps an operational pack manifest to the shared pack template shape', () => {
    const pack = mapPackManifest({
      id: 'support-starter',
      name: 'Support Starter Pack',
      version: '0.1.0',
      description: 'Essential support automations.',
      category: 'support',
      agents: ['inbox-triage'],
      workflows: ['wf-01-auto-label-gmail'],
      connectors: ['gmail'],
      catalog: {
        slug: 'support-starter',
        vertical: 'support',
        includedCategories: ['support'],
        setupTimeEstimate: '20 minutes',
        kpis: ['Time to triage'],
        riskProfile: 'low',
        monthlyPrice: null,
      },
    });

    expect(pack).toMatchObject({
      id: 'support-starter',
      slug: 'support-starter',
      includedAgents: ['inbox-triage'],
      includedWorkflows: ['wf-01-auto-label-gmail'],
      availability: 'preview',
    });
  });
});
