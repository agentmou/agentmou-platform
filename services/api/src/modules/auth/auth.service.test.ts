import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSelectWhere = vi.fn();
const mockSelectLimit = vi.fn();
const mockTransaction = vi.fn();
const mockTxSet = vi.fn();
const mockTxWhere = vi.fn();

const mockIssuePasswordResetToken = vi.fn();
const mockSendPasswordResetEmail = vi.fn();
const mockRevokeUserAuthSessions = vi.fn();
const mockHashPassword = vi.fn((password: string) => `hashed:${password}`);

vi.mock('@agentmou/db', () => ({
  db: {
    select: () => ({
      from: vi.fn(() => ({
        where: mockSelectWhere,
      })),
    }),
    transaction: mockTransaction,
  },
  users: {
    id: 'users.id',
    email: 'users.email',
    passwordHash: 'users.passwordHash',
    updatedAt: 'users.updatedAt',
  },
  passwordResetTokens: {
    id: 'passwordResetTokens.id',
    userId: 'passwordResetTokens.userId',
    tokenHash: 'passwordResetTokens.tokenHash',
    consumedAt: 'passwordResetTokens.consumedAt',
    expiresAt: 'passwordResetTokens.expiresAt',
  },
  memberships: {},
  tenants: {},
  adminImpersonationSessions: {},
}));

vi.mock('@agentmou/auth', () => ({
  hashPassword: mockHashPassword,
  verifyPassword: vi.fn(),
  verifyToken: vi.fn(),
}));

vi.mock('../../lib/auth-sessions.js', () => ({
  createAuthSession: vi.fn(),
  getActiveAuthSessionByToken: vi.fn(),
  getAuthSessionTokenFromCookie: vi.fn(),
  revokeAuthSessionById: vi.fn(),
  revokeUserAuthSessions: mockRevokeUserAuthSessions,
}));

vi.mock('../../lib/password-reset.js', () => ({
  issuePasswordResetToken: mockIssuePasswordResetToken,
}));

vi.mock('../../lib/password-reset-email.js', () => ({
  sendPasswordResetEmail: mockSendPasswordResetEmail,
}));

vi.mock('../../lib/tenant-roles.js', () => ({
  normalizeTenantMembershipRole: vi.fn((role: string) => role),
}));

vi.mock('../tenants/tenants.mapper.js', () => ({
  normalizeTenantSettings: vi.fn((value: unknown) => value),
}));

describe('AuthService password reset flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectWhere.mockReset();
    mockSelectLimit.mockReset();
    mockIssuePasswordResetToken.mockReset();
    mockSendPasswordResetEmail.mockReset();
    mockRevokeUserAuthSessions.mockReset();
    mockHashPassword.mockClear();

    mockSelectWhere.mockReturnValue({ limit: mockSelectLimit });
    mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<void>) =>
      callback({
        update: vi.fn(() => ({
          set: mockTxSet,
        })),
      })
    );
    mockTxSet.mockReturnValue({ where: mockTxWhere });
    mockTxWhere.mockResolvedValue(undefined);
    mockRevokeUserAuthSessions.mockResolvedValue([]);
  });

  it('returns ok and sends a password reset email when the user exists', async () => {
    mockSelectLimit.mockResolvedValueOnce([{ id: 'user-1', email: 'owner@example.com' }]);
    mockIssuePasswordResetToken.mockResolvedValue({
      token: 'token-123',
      link: 'https://app.agentmou.io/reset-password?token=token-123',
      expiresAt: new Date('2026-04-15T18:00:00.000Z'),
    });

    const { AuthService } = await import('./auth.service.js');
    const service = new AuthService();

    await expect(service.forgotPassword('Owner@Example.com')).resolves.toEqual({ ok: true });
    expect(mockIssuePasswordResetToken).toHaveBeenCalledWith('user-1');
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith({
      email: 'owner@example.com',
      link: 'https://app.agentmou.io/reset-password?token=token-123',
      expiresAt: new Date('2026-04-15T18:00:00.000Z'),
    });
  });

  it('returns ok and does nothing when the email is unknown', async () => {
    mockSelectLimit.mockResolvedValueOnce([]);

    const { AuthService } = await import('./auth.service.js');
    const service = new AuthService();

    await expect(service.forgotPassword('missing@example.com')).resolves.toEqual({ ok: true });
    expect(mockIssuePasswordResetToken).not.toHaveBeenCalled();
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('keeps the client response generic if email delivery fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSelectLimit.mockResolvedValueOnce([{ id: 'user-1', email: 'owner@example.com' }]);
    mockIssuePasswordResetToken.mockResolvedValue({
      token: 'token-123',
      link: 'https://app.agentmou.io/reset-password?token=token-123',
      expiresAt: new Date('2026-04-15T18:00:00.000Z'),
    });
    mockSendPasswordResetEmail.mockRejectedValue(new Error('webhook failed'));

    const { AuthService } = await import('./auth.service.js');
    const service = new AuthService();

    await expect(service.forgotPassword('owner@example.com')).resolves.toEqual({ ok: true });
    expect(errorSpy).toHaveBeenCalledWith(
      '[auth] password reset delivery failed',
      expect.objectContaining({
        userId: 'user-1',
        error: 'webhook failed',
      })
    );

    errorSpy.mockRestore();
  });

  it('resets the password, consumes the token, and revokes active sessions', async () => {
    const future = new Date(Date.now() + 60_000);
    mockSelectLimit.mockResolvedValueOnce([
      {
        id: 'reset-token-1',
        userId: 'user-1',
        consumedAt: null,
        expiresAt: future,
      },
    ]);

    const { AuthService } = await import('./auth.service.js');
    const service = new AuthService();

    await expect(service.resetPassword('plain-reset-token', 'new-password-123')).resolves.toEqual({
      ok: true,
    });
    expect(mockHashPassword).toHaveBeenCalledWith('new-password-123');
    expect(mockRevokeUserAuthSessions).toHaveBeenCalledWith('user-1', expect.any(Date));
  });

  it('rejects invalid or expired reset tokens', async () => {
    mockSelectLimit.mockResolvedValueOnce([]);

    const { AuthService } = await import('./auth.service.js');
    const service = new AuthService();

    await expect(service.resetPassword('bad-token', 'new-password-123')).rejects.toMatchObject({
      message: 'Invalid or expired reset token',
      statusCode: 400,
    });
  });
});
