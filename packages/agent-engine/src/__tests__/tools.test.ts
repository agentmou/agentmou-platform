import { afterEach, describe, expect, it, vi } from 'vitest';

import { analyzeEmailTool } from '../tools/tools.js';

describe('analyzeEmailTool', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('calls the agents helper service with the expected header and payload shape', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        priority: 'high',
        category: 'support',
        action: 'flag',
        suggested_labels: ['urgent'],
      }),
    } as Response) as typeof fetch;

    const result = await analyzeEmailTool.execute(
      {
        emails: [
          {
            id: 'email-1',
            from: 'ops@example.com',
            subject: 'Server issue',
            body: 'Production is down',
          },
        ],
      },
      {
        tenantId: 'tenant-1',
        runId: 'run-1',
        agentsApiUrl: 'http://agents:8000',
        agentsApiKey: 'secret-key',
      },
    );

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://agents:8000/analyze-email',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'x-api-key': 'secret-key',
        }),
      }),
    );

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://agents:8000/analyze-email',
      expect.objectContaining({
        body: JSON.stringify({
          sender: 'ops@example.com',
          subject: 'Server issue',
          content: 'Production is down',
        }),
      }),
    );

    expect(result).toEqual({
      analyses: [
        expect.objectContaining({
          emailId: 'email-1',
          priority: 'high',
          category: 'support',
        }),
      ],
    });
  });
});
