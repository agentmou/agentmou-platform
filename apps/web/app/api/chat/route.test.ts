import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { PUBLIC_DEMO_CLINIC_HREF } from '@/lib/marketing/public-links';

const mockGenerateResponse = vi.fn();

vi.mock('@/lib/chat/engine', () => ({
  generateResponse: mockGenerateResponse,
}));

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/chat', () => {
  const originalFetch = globalThis.fetch;
  const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const env = process.env as Record<string, string | undefined>;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    env.NEXT_PUBLIC_API_URL = originalApiUrl;
    vi.restoreAllMocks();
  });

  it('returns cited public chat responses when the upstream service succeeds', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          reply: 'Pricing starts at Starter.',
          citations: [
            {
              id: 'pricing-1',
              title: 'Pricing',
              href: 'http://localhost:3000/pricing',
              excerpt: 'Starter is $29/month.',
              sourcePath: 'apps/web/app/(marketing)/pricing/page.tsx',
            },
          ],
          actions: [{ label: 'View Pricing', href: 'http://localhost:3000/pricing' }],
          provider: 'retrieval',
          fallback: false,
        }),
        { status: 200 }
      )
    ) as typeof fetch;

    const { POST } = await import('./route');
    const response = await POST(
      buildRequest({
        mode: 'public',
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'How does pricing work?',
            timestamp: '2026-03-19T00:00:00.000Z',
          },
        ],
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      message: {
        role: 'assistant',
        content: 'Pricing starts at Starter.',
        actions: [{ label: 'View Pricing', href: 'http://localhost:3000/pricing' }],
        citations: [
          {
            id: 'pricing-1',
            title: 'Pricing',
          },
        ],
      },
    });
    expect(mockGenerateResponse).not.toHaveBeenCalled();
  });

  it('falls back to the local public assistant when the upstream service fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED')) as typeof fetch;
    mockGenerateResponse.mockReturnValue({
      content: 'Local public fallback answer.',
      actions: [{ label: 'Open Demo Workspace', href: PUBLIC_DEMO_CLINIC_HREF }],
    });

    const { POST } = await import('./route');
    const response = await POST(
      buildRequest({
        mode: 'public',
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'hola como funciona?',
            timestamp: '2026-03-19T00:00:00.000Z',
          },
        ],
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      message: {
        role: 'assistant',
        content: 'Local public fallback answer.',
        actions: [{ label: 'Open Demo Workspace', href: PUBLIC_DEMO_CLINIC_HREF }],
      },
    });
    expect(mockGenerateResponse).toHaveBeenCalledWith({
      mode: 'public',
      userMessage: 'hola como funciona?',
      context: undefined,
    });
  });

  it('keeps copilot mode on the local engine without calling the public backend', async () => {
    globalThis.fetch = vi.fn() as typeof fetch;
    mockGenerateResponse.mockReturnValue({
      content: 'Copilot preview answer.',
      actions: [{ label: 'Review Fleet', href: '/app/tenant-acme/fleet' }],
    });

    const { POST } = await import('./route');
    const response = await POST(
      buildRequest({
        mode: 'copilot',
        contextSnapshot: {
          workspaceId: 'tenant-acme',
          workspaceName: 'Acme',
          workspaceStatus: 'GO_LIVE_READY',
          workspaceReasons: [],
          checklistProgress: 4,
          checklistTotal: 4,
          pendingTasks: [],
          installedAgents: [],
          integrations: [],
          pendingApprovalsCount: 0,
          recentErrors: [],
        },
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'What is my readiness status?',
            timestamp: '2026-03-19T00:00:00.000Z',
          },
        ],
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      message: {
        role: 'assistant',
        content: 'Copilot preview answer.',
      },
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(mockGenerateResponse).toHaveBeenCalledWith({
      mode: 'copilot',
      userMessage: 'What is my readiness status?',
      context: expect.objectContaining({
        workspaceId: 'tenant-acme',
      }),
    });
  });
});
