import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GmailConnector, type GmailConfig } from '../gmail';

// ---------------------------------------------------------------------------
// Mock googleapis
// ---------------------------------------------------------------------------
const mockMessagesList = vi.fn();
const mockMessagesGet = vi.fn();
const mockMessagesModify = vi.fn();
const mockGetProfile = vi.fn();

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({
        setCredentials: vi.fn(),
        credentials: { access_token: 'mock-token', expiry_date: Date.now() + 3600_000 },
      })),
    },
    gmail: vi.fn(() => ({
      users: {
        getProfile: mockGetProfile,
        messages: {
          list: mockMessagesList,
          get: mockMessagesGet,
          modify: mockMessagesModify,
        },
      },
    })),
  },
}));

function createConfig(): GmailConfig {
  return {
    name: 'test-gmail',
    credentials: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      accessToken: 'ya29.test-access-token',
      refreshToken: '1//test-refresh-token',
      tokenExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
    },
  };
}

describe('GmailConnector', () => {
  let connector: GmailConnector;

  beforeEach(async () => {
    vi.clearAllMocks();
    connector = new GmailConnector(createConfig());
    await connector.connect();
  });

  describe('connect / disconnect', () => {
    it('should connect without throwing', async () => {
      const c = new GmailConnector(createConfig());
      await expect(c.connect()).resolves.not.toThrow();
    });

    it('should disconnect without throwing', async () => {
      await expect(connector.disconnect()).resolves.not.toThrow();
    });

    it('should throw if calling methods before connect', async () => {
      const c = new GmailConnector(createConfig());
      await expect(c.listMessages()).rejects.toThrow('not connected');
    });
  });

  describe('healthCheck', () => {
    it('should return true when profile call succeeds', async () => {
      mockGetProfile.mockResolvedValue({ status: 200, data: { emailAddress: 'test@gmail.com' } });

      const result = await connector.healthCheck();

      expect(result).toBe(true);
      expect(mockGetProfile).toHaveBeenCalledWith({ userId: 'me' });
    });

    it('should return false when profile call fails', async () => {
      mockGetProfile.mockRejectedValue(new Error('auth error'));

      const result = await connector.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('listMessages', () => {
    it('should return message stubs from the API', async () => {
      mockMessagesList.mockResolvedValue({
        data: {
          messages: [
            { id: 'msg-1', threadId: 'thread-1' },
            { id: 'msg-2', threadId: 'thread-2' },
          ],
        },
      });

      const messages = await connector.listMessages({ maxResults: 10 });

      expect(messages).toHaveLength(2);
      expect(messages[0].id).toBe('msg-1');
      expect(mockMessagesList).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'me', maxResults: 10 })
      );
    });

    it('should return empty array when no messages', async () => {
      mockMessagesList.mockResolvedValue({ data: {} });

      const messages = await connector.listMessages();

      expect(messages).toEqual([]);
    });

    it('should pass query parameter', async () => {
      mockMessagesList.mockResolvedValue({ data: { messages: [] } });

      await connector.listMessages({ query: 'is:unread' });

      expect(mockMessagesList).toHaveBeenCalledWith(
        expect.objectContaining({ q: 'is:unread' })
      );
    });
  });

  describe('getMessage', () => {
    it('should return a parsed message with headers and body', async () => {
      mockMessagesGet.mockResolvedValue({
        data: {
          id: 'msg-1',
          threadId: 'thread-1',
          snippet: 'Hello world',
          labelIds: ['INBOX', 'UNREAD'],
          payload: {
            mimeType: 'text/plain',
            headers: [
              { name: 'From', value: 'sender@example.com' },
              { name: 'To', value: 'recipient@example.com' },
              { name: 'Subject', value: 'Test Subject' },
              { name: 'Date', value: 'Mon, 09 Mar 2026 10:00:00 +0000' },
            ],
            body: {
              data: Buffer.from('Hello, this is the body!').toString('base64url'),
            },
          },
        },
      });

      const msg = await connector.getMessage('msg-1');

      expect(msg.id).toBe('msg-1');
      expect(msg.from).toBe('sender@example.com');
      expect(msg.to).toBe('recipient@example.com');
      expect(msg.subject).toBe('Test Subject');
      expect(msg.body).toBe('Hello, this is the body!');
      expect(msg.labelIds).toContain('INBOX');
    });

    it('should extract body from multipart messages', async () => {
      mockMessagesGet.mockResolvedValue({
        data: {
          id: 'msg-2',
          threadId: 'thread-2',
          snippet: '',
          labelIds: [],
          payload: {
            mimeType: 'multipart/alternative',
            headers: [],
            parts: [
              {
                mimeType: 'text/plain',
                body: { data: Buffer.from('Plain text body').toString('base64url') },
              },
              {
                mimeType: 'text/html',
                body: { data: Buffer.from('<p>HTML body</p>').toString('base64url') },
              },
            ],
          },
        },
      });

      const msg = await connector.getMessage('msg-2');

      expect(msg.body).toBe('Plain text body');
    });
  });

  describe('addLabels', () => {
    it('should call modify with addLabelIds', async () => {
      mockMessagesModify.mockResolvedValue({ data: {} });

      await connector.addLabels('msg-1', ['Label_1', 'Label_2']);

      expect(mockMessagesModify).toHaveBeenCalledWith({
        userId: 'me',
        id: 'msg-1',
        requestBody: { addLabelIds: ['Label_1', 'Label_2'] },
      });
    });
  });

  describe('removeLabels', () => {
    it('should call modify with removeLabelIds', async () => {
      mockMessagesModify.mockResolvedValue({ data: {} });

      await connector.removeLabels('msg-1', ['UNREAD']);

      expect(mockMessagesModify).toHaveBeenCalledWith({
        userId: 'me',
        id: 'msg-1',
        requestBody: { removeLabelIds: ['UNREAD'] },
      });
    });
  });

  describe('getCredentials', () => {
    it('should return current credentials from OAuth2 client', () => {
      const creds = connector.getCredentials();

      expect(creds).toHaveProperty('accessToken');
      expect(creds).toHaveProperty('expiryDate');
    });
  });
});
