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

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = fetchMock as typeof fetch;
    fetchMock.mockReset();
    process.stdout.write = stdoutWriteMock as typeof process.stdout.write;
    mockGetApiConfig.mockReturnValue({
      appPublicBaseUrl: 'https://app.agentmou.io',
      resendApiKey: undefined,
      resendFromEmail: undefined,
    });
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    globalThis.fetch = originalFetch;
    process.stdout.write = originalStdoutWrite;
  });

  it('logs the reset link in non-production when Resend is not configured', async () => {
    process.env.NODE_ENV = 'development';

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

  it('posts the auth email payload to Resend', async () => {
    process.env.NODE_ENV = 'production';
    mockGetApiConfig.mockReturnValue({
      appPublicBaseUrl: 'https://app.agentmou.io',
      resendApiKey: 're_test_key',
      resendFromEmail: 'no-reply@agentmou.io',
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

    expect(result).toEqual({ delivery: 'resend' });
    expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer re_test_key',
      },
      body: expect.any(String),
    });
    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(requestInit.body))).toMatchObject({
      from: 'no-reply@agentmou.io',
      to: 'owner@example.com',
      subject: 'Restablece tu contrasena de Agentmou',
    });
  });

  it('throws when Resend delivery fails', async () => {
    process.env.NODE_ENV = 'production';
    mockGetApiConfig.mockReturnValue({
      appPublicBaseUrl: 'https://app.agentmou.io',
      resendApiKey: 're_test_key',
      resendFromEmail: 'no-reply@agentmou.io',
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
    ).rejects.toThrow('Auth email delivery failed');
  });
});
