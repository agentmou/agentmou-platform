import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @agentmou/db
// ---------------------------------------------------------------------------
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

const mockFrom = vi.fn().mockReturnThis();
const mockWhere = vi.fn().mockReturnThis();
const mockLimit = vi.fn();
const mockValues = vi.fn().mockReturnThis();
const mockReturning = vi.fn();
const mockSet = vi.fn().mockReturnThis();

vi.mock('@agentmou/db', () => ({
  db: {
    select: () => ({ from: mockFrom }),
    insert: (table: unknown) => {
      mockInsert(table);
      return { values: mockValues };
    },
    update: (table: unknown) => {
      mockUpdate(table);
      return { set: mockSet };
    },
    delete: (table: unknown) => {
      mockDelete(table);
      return { where: mockWhere };
    },
  },
  connectorAccounts: { tenantId: 'tenantId', provider: 'provider', id: 'id' },
  connectorOauthStates: { state: 'state', id: 'id' },
  eq: vi.fn((a, b) => ({ field: a, value: b })),
  and: vi.fn((...args: unknown[]) => args),
}));

// ---------------------------------------------------------------------------
// Mock @agentmou/connectors (encrypt)
// ---------------------------------------------------------------------------
vi.mock('@agentmou/connectors', () => ({
  encrypt: vi.fn((value: string) => `encrypted:${value}`),
}));

// ---------------------------------------------------------------------------
// Env vars
// ---------------------------------------------------------------------------
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.GOOGLE_REDIRECT_URI = 'https://api.test.io/api/v1/oauth/callback';
process.env.CONNECTOR_ENCRYPTION_KEY = 'a'.repeat(64);

// Import after mocks
import { OAuthService, OAuthError } from '../oauth.service';

describe('OAuthService', () => {
  let service: OAuthService;

  beforeEach(() => {
    service = new OAuthService();
    vi.clearAllMocks();

    // Default mock chain setup
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValue([]);
    mockValues.mockReturnValue({ returning: mockReturning });
    mockReturning.mockResolvedValue([{}]);
    mockSet.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAuthorizeUrl', () => {
    it('should return a Google OAuth URL with correct parameters', async () => {
      mockValues.mockResolvedValue(undefined);

      const url = await service.getAuthorizeUrl('tenant-123', 'gmail');

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('response_type=code');
      expect(url).toContain('access_type=offline');
      expect(url).toContain('prompt=consent');
      expect(url).toContain('state=');
    });

    it('should store the state in connector_oauth_states', async () => {
      mockValues.mockResolvedValue(undefined);

      await service.getAuthorizeUrl('tenant-123', 'gmail');

      expect(mockInsert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-123',
          provider: 'gmail',
          state: expect.any(String),
          expiresAt: expect.any(Date),
        })
      );
    });

    it('should throw for unsupported providers', async () => {
      await expect(
        service.getAuthorizeUrl('tenant-123', 'slack')
      ).rejects.toThrow('Unsupported OAuth provider');
    });

    it('should include redirect_url when provided', async () => {
      mockValues.mockResolvedValue(undefined);

      await service.getAuthorizeUrl(
        'tenant-123',
        'gmail',
        'https://app.test.io/settings'
      );

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          redirectUrl: 'https://app.test.io/settings',
        })
      );
    });
  });

  describe('handleCallback', () => {
    const validState = {
      id: 'state-id-1',
      tenantId: 'tenant-123',
      provider: 'gmail',
      state: 'valid-state-token',
      redirectUrl: null,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 600_000),
    };

    const tokenResponse = {
      access_token: 'ya29.real-access-token',
      refresh_token: '1//real-refresh-token',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'https://www.googleapis.com/auth/gmail.readonly',
    };

    const userInfoResponse = {
      id: '12345',
      email: 'user@gmail.com',
      name: 'Test User',
    };

    beforeEach(() => {
      // State lookup returns a valid state
      mockLimit.mockResolvedValue([validState]);
      // Delete state succeeds
      mockWhere.mockResolvedValue(undefined);
      // No existing connector account
      mockFrom.mockReturnValue({ where: mockWhere });
      mockWhere.mockImplementation(() => ({
        limit: vi.fn().mockResolvedValueOnce([validState]).mockResolvedValueOnce([]),
      }));
    });

    it('should throw OAuthError for invalid state', async () => {
      mockFrom.mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) });

      await expect(
        service.handleCallback('some-code', 'invalid-state')
      ).rejects.toThrow(OAuthError);
    });

    it('should throw OAuthError for expired state', async () => {
      const expiredState = {
        ...validState,
        expiresAt: new Date(Date.now() - 1000),
      };

      mockFrom.mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([expiredState]),
        }),
      });

      await expect(
        service.handleCallback('some-code', 'expired-state')
      ).rejects.toThrow('expired');
    });

    it('should exchange code for tokens and call fetch', async () => {
      // Setup sequential mock calls
      let callCount = 0;
      mockFrom.mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) return Promise.resolve([validState]);
            return Promise.resolve([]); // no existing connector
          }),
        }),
      });

      const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
        async (url) => {
          const urlStr = typeof url === 'string' ? url : url.toString();
          if (urlStr.includes('oauth2.googleapis.com/token')) {
            return new Response(JSON.stringify(tokenResponse), { status: 200 });
          }
          if (urlStr.includes('googleapis.com/oauth2/v2/userinfo')) {
            return new Response(JSON.stringify(userInfoResponse), { status: 200 });
          }
          return new Response('Not found', { status: 404 });
        }
      );

      const result = await service.handleCallback('auth-code', 'valid-state-token');

      expect(result.tenantId).toBe('tenant-123');
      expect(result.provider).toBe('gmail');
      expect(fetchMock).toHaveBeenCalledTimes(2);

      fetchMock.mockRestore();
    });
  });
});
