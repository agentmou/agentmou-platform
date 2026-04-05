import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

function buildRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/contact-sales', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

const validLead = {
  fullName: 'Ana Perez',
  clinicName: 'Clinica Dental Centro',
  workEmail: 'recepcion@clinicadental.com',
  phone: '+34 600 000 000',
  interestedModules: ['core_reception', 'voice'],
  message: 'Queremos ver una demo con recepcion, voz y agenda.',
  sourcePath: '/contact-sales',
};

describe('POST /api/contact-sales', () => {
  const originalFetch = globalThis.fetch;
  const env = process.env as Record<string, string | undefined>;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalWebhookUrl = process.env.CONTACT_SALES_WEBHOOK_URL;
  const originalWebhookToken = process.env.CONTACT_SALES_WEBHOOK_TOKEN;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    env.NODE_ENV = 'test';
    env.CONTACT_SALES_WEBHOOK_URL = undefined;
    env.CONTACT_SALES_WEBHOOK_TOKEN = undefined;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    env.NODE_ENV = originalNodeEnv;
    env.CONTACT_SALES_WEBHOOK_URL = originalWebhookUrl;
    env.CONTACT_SALES_WEBHOOK_TOKEN = originalWebhookToken;
    vi.restoreAllMocks();
  });

  it('validates the input payload', async () => {
    const { POST } = await import('./route');
    const response = await POST(
      buildRequest({
        ...validLead,
        workEmail: 'not-an-email',
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      message: 'Revisa los campos del formulario.',
    });
  });

  it('forwards the lead to the configured webhook with bearer auth', async () => {
    env.NODE_ENV = 'production';
    env.CONTACT_SALES_WEBHOOK_URL = 'https://hooks.example.com/contact-sales';
    env.CONTACT_SALES_WEBHOOK_TOKEN = 'top-secret-token';
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response('ok', { status: 200 })) as typeof fetch;

    const { POST } = await import('./route');
    const response = await POST(buildRequest(validLead));

    expect(response.status).toBe(200);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://hooks.example.com/contact-sales',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer top-secret-token',
        }),
      })
    );

    const [, init] = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(JSON.parse(String(init?.body))).toMatchObject({
      clinicName: validLead.clinicName,
      sourcePath: '/contact-sales',
      source: 'agentmou_web_contact_sales',
    });
  });

  it('returns a controlled success in non-production when no webhook is configured', async () => {
    env.NODE_ENV = 'development';
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {});
    const { POST } = await import('./route');
    const response = await POST(buildRequest(validLead));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      message: 'Solicitud recibida. En desarrollo la dejamos registrada sin webhook.',
    });
    expect(consoleInfo).toHaveBeenCalledWith(
      '[contact-sales] webhook not configured, accepting lead in non-production',
      expect.objectContaining({
        clinicName: validLead.clinicName,
        sourcePath: '/contact-sales',
      })
    );
  });

  it('fails cleanly in production when the webhook is missing', async () => {
    env.NODE_ENV = 'production';
    const { POST } = await import('./route');
    const response = await POST(buildRequest(validLead));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      message: 'El canal comercial no esta configurado todavia.',
    });
  });
});
