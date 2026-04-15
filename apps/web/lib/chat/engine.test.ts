import { describe, expect, it } from 'vitest';

import { generateResponse } from './engine';
import { PUBLIC_DEMO_CLINIC_HREF } from '@/lib/marketing/public-links';
import type { WorkspaceContextSnapshot } from './types';

const readyContext: WorkspaceContextSnapshot = {
  workspaceId: 'tenant-acme',
  workspaceName: 'Acme',
  workspaceStatus: 'GO_LIVE_READY',
  workspaceReasons: [],
  checklistProgress: 4,
  checklistTotal: 4,
  pendingTasks: [],
  installedAgents: [],
  integrations: [{ id: 'slack', name: 'Slack', status: 'connected', missingScopes: [] }],
  pendingApprovalsCount: 0,
  recentErrors: [],
};

const blockedContext: WorkspaceContextSnapshot = {
  ...readyContext,
  workspaceStatus: 'BLOCKED',
  pendingTasks: [
    {
      label: 'Review integrations',
      description: 'Slack still needs connection details before this setup can move forward.',
      completed: false,
    },
  ],
  integrations: [{ id: 'slack', name: 'Slack', status: 'disconnected', missingScopes: [] }],
};

describe('generateResponse', () => {
  it('frames public how-it-works answers around the clinic product', () => {
    const response = generateResponse({
      mode: 'public',
      userMessage: 'How does this work for clinics?',
    });

    expect(response.content).toContain('recepción');
    expect(response.content).toContain('llamadas perdidas');
    expect(response.content).toContain('journey de paciente');
    expect(response.actions).toEqual(
      expect.arrayContaining([
        { label: 'Solicitar demo', href: '/contact-sales' },
        { label: 'Ver pricing', href: '/pricing' },
      ])
    );
    expect(response.actions?.some((action) => action.href === '/platform')).toBe(false);
  });

  it('keeps public pricing answers focused on modules instead of runs', () => {
    const response = generateResponse({
      mode: 'public',
      userMessage: 'Tell me about pricing',
    });

    expect(response.content).toContain('Reception + Voice');
    expect(response.content).toContain('teléfono');
    expect(response.content.toLowerCase()).not.toContain('1,000 runs');
    expect(response.actions?.some((action) => action.href === '/contact-sales')).toBe(true);
    expect(response.actions?.some((action) => action.href === '/platform')).toBe(false);
  });

  it('keeps public security answers free of unsupported security claims', () => {
    const response = generateResponse({
      mode: 'public',
      userMessage: 'Tell me about your security posture',
    });

    expect(response.content).toContain('Aislamiento por clínica');
    expect(response.content).toContain('Tu clínica, tus reglas');
    expect(response.content).not.toContain('SOC 2 Type II');
    expect(response.content).not.toContain('End-to-end encryption');
    expect(response.content).not.toContain('automatic rotation');
    expect(response.actions?.some((action) => action.href === PUBLIC_DEMO_CLINIC_HREF)).toBe(true);
  });

  it('keeps public module recommendations inside the commercial journey', () => {
    const response = generateResponse({
      mode: 'public',
      userMessage: 'Which voice or growth module do you recommend for a clinic?',
    });

    expect(response.actions).toEqual(
      expect.arrayContaining([
        { label: 'Ver módulos', href: '/#modulos' },
        { label: 'Ver demo clinic', href: PUBLIC_DEMO_CLINIC_HREF },
      ])
    );
    expect(response.actions?.some((action) => action.href === '/platform')).toBe(false);
    expect(response.content).not.toContain('/docs/engine');
  });

  it('treats go-live requests as preview-only in copilot mode', () => {
    const response = generateResponse({
      mode: 'copilot',
      userMessage: 'Can you help me go live?',
      context: readyContext,
    });

    expect(response.content).toContain('cannot activate production from chat');
    expect(response.actions?.some((action) => action.label.includes('Go Live'))).toBe(false);
    expect(response.actions?.some((action) => action.label === 'Review Fleet')).toBe(true);
  });

  it('points blocked integration issues to review surfaces instead of fake fixes', () => {
    const response = generateResponse({
      mode: 'copilot',
      userMessage: 'Why is this workspace still blocked?',
      context: blockedContext,
    });

    expect(response.content).toContain('cannot connect them for you');
    expect(response.actions).toEqual([
      {
        label: 'Review Security Surface',
        href: '/app/tenant-acme/security',
      },
    ]);
  });
});
