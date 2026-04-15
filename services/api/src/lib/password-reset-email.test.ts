import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();
const originalFetch = globalThis.fetch;
const mockGetApiConfig = vi.fn();
const stdoutWriteMock = vi.fn();
const originalStdoutWrite = process.stdout.write.bind(process.stdout);

vi.stubGlobal('fetch', fetchMock);

vi.mock('../config.js', () => ({
  getApiConfig: mockGetApiConfig,
}));

describe('sendPasswordResetEmail', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalLogResetLink = process.env.LOG_PASSWORD_RESET_LINK;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = fetchMock as typeof fetch;
    fetchMock.mockReset();
    process.stdout.write = stdoutWriteMock as typeof process.stdout.write;
    mockGetApiConfig.mockReturnValue({
      appPublicBaseUrl: 'https://app.agentmou.io',
      passwordResetWebhookUrl: undefined,
      passwordResetWebhookToken: undefined,
    });
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.LOG_PASSWORD_RESET_LINK = originalLogResetLink;
    globalThis.fetch = originalFetch;
    process.stdout.write = originalStdoutWrite;
  });

  it('logs the reset link in non-production when no webhook is configured', async () => {
    process.env.NODE_ENV = 'development';
    process.env.LOG_PASSWORD_RESET_LINK = '0';

    const { sendPasswordResetEmail } = await import('./password-reset-email.js');
    const result = await sendPasswordResetEmail({
      email: 'owner@example.com',
      link: 'https://app.agentmou.io/reset-password?token=test-token',
      expiresAt: new Date('2026-04-15T18:00:00.000Z'),
    });

    expect(result).toEqual({ delivery: 'logged' });
    expect(stdoutWriteMock).toHaveBeenCalledWith(
      expect.stringContaining('https://app.agentmou.io/reset-password?token=test-token')
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts a password reset payload to the configured webhook', async () => {
    process.env.NODE_ENV = 'production';
    mockGetApiConfig.mockReturnValue({
      appPublicBaseUrl: 'https://app.agentmou.io',
      passwordResetWebhookUrl: 'https://hooks.example.com/password-reset',
      passwordResetWebhookToken: 'webhook-secret',
    });
    fetchMock.mockResolvedValue({
      ok: true,
    });

    const { sendPasswordResetEmail } = await import('./password-reset-email.js');
    const expiresAt = new Date('2026-04-15T18:00:00.000Z');
    const result = await sendPasswordResetEmail({
      email: 'owner@example.com',
      link: 'https://app.agentmou.io/reset-password?token=test-token',
      expiresAt,
    });

    expect(result).toEqual({ delivery: 'webhook' });
    expect(fetchMock).toHaveBeenCalledWith('https://hooks.example.com/password-reset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer webhook-secret',
      },
      body: expect.any(String),
    });
    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(requestInit.body))).toMatchObject({
      event: 'password_reset',
      to: 'owner@example.com',
      resetLink: 'https://app.agentmou.io/reset-password?token=test-token',
      expiresAt: expiresAt.toISOString(),
      source: 'agentmou_api_auth',
    });
  });

  it('throws when webhook delivery fails', async () => {
    process.env.NODE_ENV = 'production';
    mockGetApiConfig.mockReturnValue({
      appPublicBaseUrl: 'https://app.agentmou.io',
      passwordResetWebhookUrl: 'https://hooks.example.com/password-reset',
      passwordResetWebhookToken: undefined,
    });
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => 'upstream failure',
    });

    const { sendPasswordResetEmail } = await import('./password-reset-email.js');

    await expect(
      sendPasswordResetEmail({
        email: 'owner@example.com',
        link: 'https://app.agentmou.io/reset-password?token=test-token',
        expiresAt: new Date('2026-04-15T18:00:00.000Z'),
      })
    ).rejects.toThrow('Password reset email delivery failed');
  });
});
