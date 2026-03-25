import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import { telegramRoutes } from './telegram.routes.js';

describe('telegramRoutes', () => {
  it('returns the service response for valid webhook bodies', async () => {
    const service = {
      handleTelegramUpdate: vi.fn().mockResolvedValue({
        ok: true,
        summary: 'queued',
        approvalRequired: false,
        queuedWorkOrderIds: [],
      }),
    };

    const app = Fastify();
    await app.register(telegramRoutes, {
      service: service as never,
    });
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/telegram/webhook',
      payload: {
        update_id: 1,
        message: {
          message_id: 1,
          from: { id: 10, first_name: 'Tim' },
          chat: { id: 10, type: 'private' },
          date: 1740000000,
          text: 'Prepare the launch brief',
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(service.handleTelegramUpdate).toHaveBeenCalledTimes(1);

    await app.close();
  });

  it('fails visibly on invalid webhook bodies', async () => {
    const service = {
      handleTelegramUpdate: vi.fn().mockRejectedValue(new Error('bad payload')),
    };

    const app = Fastify();
    await app.register(telegramRoutes, {
      service: service as never,
    });
    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/telegram/webhook',
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ ok: false });

    await app.close();
  });
});
