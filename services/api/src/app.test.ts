import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { buildApp } from './app.js';

describe('buildApp', () => {
  it('builds routes without schema compilation errors', async () => {
    const app = buildApp();
    await app.ready();

    await app.close();
  });

  it('responds 200 on GET /health', async () => {
    const app = buildApp();
    await app.ready();

    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok' });

    await app.close();
  });

  it('returns 400 for invalid payload on zod-backed route schema', async () => {
    const app = buildApp();

    app.post(
      '/_test/zod',
      {
        schema: {
          body: z.object({
            name: z.string().min(1),
          }),
        },
      },
      async () => ({ ok: true }),
    );

    await app.ready();

    const response = await app.inject({
      method: 'POST',
      url: '/_test/zod',
      payload: {},
    });

    expect(response.statusCode).toBe(400);

    await app.close();
  });
});
