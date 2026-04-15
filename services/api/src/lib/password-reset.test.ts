import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockTxWhere = vi.fn();
const mockTxSet = vi.fn();
const mockTxValues = vi.fn();
const mockTransaction = vi.fn();
const mockGetApiConfig = vi.fn();

vi.mock('@agentmou/db', () => ({
  db: {
    transaction: mockTransaction,
  },
  passwordResetTokens: {
    userId: 'passwordResetTokens.userId',
    consumedAt: 'passwordResetTokens.consumedAt',
  },
}));

vi.mock('../config.js', () => ({
  getApiConfig: mockGetApiConfig,
}));

describe('issuePasswordResetToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetApiConfig.mockReturnValue({
      appPublicBaseUrl: 'https://app.agentmou.io',
    });
    mockTxSet.mockReturnValue({ where: mockTxWhere });
    mockTxWhere.mockResolvedValue(undefined);
    mockTxValues.mockResolvedValue(undefined);
    mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<void>) =>
      callback({
        update: vi.fn(() => ({
          set: mockTxSet,
        })),
        insert: vi.fn(() => ({
          values: mockTxValues,
        })),
      })
    );
  });

  it('invalidates previous unused tokens before inserting a new one', async () => {
    const { issuePasswordResetToken } = await import('./password-reset.js');

    const issued = await issuePasswordResetToken('user-1');

    expect(mockTxSet).toHaveBeenCalledWith({ consumedAt: expect.any(Date) });
    expect(mockTxValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      })
    );
    expect(issued.link).toContain('https://app.agentmou.io/reset-password?token=');
    expect(issued.token).toHaveLength(64);
  });
});
