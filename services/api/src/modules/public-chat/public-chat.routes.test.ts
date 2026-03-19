import Fastify from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { zodValidatorCompiler } from '../../routes/zod-validator.js';

const mockService = {
  reply: vi.fn(),
};

vi.mock('./public-chat.service.js', () => ({
  PublicChatService: vi.fn().mockImplementation(() => mockService),
}));

async function buildPublicChatApp() {
  const app = Fastify();
  app.setValidatorCompiler(zodValidatorCompiler);

  const { publicChatRoutes } = await import('./public-chat.routes.js');
  await app.register(publicChatRoutes);
  await app.ready();

  return app;
}

describe('publicChatRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates public chat payloads', async () => {
    const app = await buildPublicChatApp();

    const response = await app.inject({
      method: 'POST',
      url: '/public/chat',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(mockService.reply).not.toHaveBeenCalled();

    await app.close();
  });

  it('returns contract-shaped chat responses', async () => {
    mockService.reply.mockResolvedValue({
      reply: 'Here is what I can confirm publicly.',
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

    const app = await buildPublicChatApp();

    const response = await app.inject({
      method: 'POST',
      url: '/public/chat',
      payload: {
        messages: [
          {
            role: 'user',
            content: 'How does pricing work?',
          },
        ],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      reply: 'Here is what I can confirm publicly.',
      provider: 'retrieval',
    });

    await app.close();
  });
});
