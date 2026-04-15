import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockSearch = vi.fn();

vi.mock('./public-knowledge.service.js', () => ({
  PublicKnowledgeService: vi.fn().mockImplementation(() => ({
    search: mockSearch,
  })),
}));

vi.mock('../n8n/n8n.service.js', () => ({
  N8nService: vi.fn().mockImplementation(() => ({
    executeWorkflow: vi.fn(),
  })),
}));

describe('PublicChatService', () => {
  const originalMarketingBaseUrl = process.env.MARKETING_PUBLIC_BASE_URL;
  const originalAppBaseUrl = process.env.APP_PUBLIC_BASE_URL;
  const originalApiBaseUrl = process.env.API_PUBLIC_BASE_URL;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalWorkflowId = process.env.PUBLIC_CHAT_N8N_WORKFLOW_ID;

  beforeEach(() => {
    vi.resetModules();
    mockSearch.mockReset();
    process.env.NODE_ENV = 'production';
    process.env.MARKETING_PUBLIC_BASE_URL = 'https://agentmou.io';
    process.env.APP_PUBLIC_BASE_URL = 'https://app.agentmou.io';
    process.env.API_PUBLIC_BASE_URL = 'https://api.agentmou.io';
    delete process.env.PUBLIC_CHAT_N8N_WORKFLOW_ID;
  });

  afterEach(() => {
    process.env.MARKETING_PUBLIC_BASE_URL = originalMarketingBaseUrl;
    process.env.APP_PUBLIC_BASE_URL = originalAppBaseUrl;
    process.env.API_PUBLIC_BASE_URL = originalApiBaseUrl;
    process.env.NODE_ENV = originalNodeEnv;
    process.env.PUBLIC_CHAT_N8N_WORKFLOW_ID = originalWorkflowId;
  });

  it('returns canonical absolute actions for pricing questions', async () => {
    mockSearch.mockResolvedValue([
      {
        id: 'pricing-1',
        title: 'Pricing',
        href: 'https://agentmou.io/pricing',
        excerpt: 'Starter is $29/month.',
        sourcePath: 'apps/web/app/(marketing)/pricing/page.tsx',
        score: 8,
      },
    ]);

    const { PublicChatService } = await import('./public-chat.service.js');
    const service = new PublicChatService();

    const response = await service.reply({
      messages: [{ role: 'user', content: 'How does pricing work?' }],
    });

    expect(response.actions).toEqual([
      { label: 'View Pricing', href: 'https://agentmou.io/pricing' },
      {
        label: 'Open Demo Workspace',
        href: 'https://app.agentmou.io/app/demo-workspace/dashboard',
      },
    ]);
  });

  it('keeps default public actions on canonical origins when retrieval has no matches', async () => {
    mockSearch.mockResolvedValue([]);

    const { PublicChatService } = await import('./public-chat.service.js');
    const service = new PublicChatService();

    const response = await service.reply({
      messages: [{ role: 'user', content: 'Tell me something obscure' }],
    });

    expect(response.actions).toEqual([
      {
        label: 'Open Demo Workspace',
        href: 'https://app.agentmou.io/app/demo-workspace/dashboard',
      },
      { label: 'View Docs', href: 'https://agentmou.io/docs' },
    ]);
  });
});
