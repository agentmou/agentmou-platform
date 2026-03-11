import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { BaseConnector, ConnectorConfig } from './base';

/**
 * OAuth and connector settings required to access a Gmail account.
 */
export interface GmailConfig extends ConnectorConfig {
  credentials: {
    clientId: string;
    clientSecret: string;
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt?: string;
  };
}

/**
 * Normalized Gmail message shape returned by connector read operations.
 */
export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  labelIds: string[];
  date: string;
}

/**
 * Gmail connector backed by the Google APIs client library.
 *
 * Handles OAuth2 token refresh transparently — if the access token is
 * expired the client uses the refresh token before the next API call.
 */
export class GmailConnector extends BaseConnector {
  private oauth2Client!: OAuth2Client;
  private gmail!: gmail_v1.Gmail;
  private connected = false;

  constructor(config: GmailConfig) {
    super(config);
  }

  private get gmailConfig(): GmailConfig {
    return this.config as GmailConfig;
  }

  async connect(): Promise<void> {
    const { clientId, clientSecret, accessToken, refreshToken, tokenExpiresAt } =
      this.gmailConfig.credentials;

    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret);

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: tokenExpiresAt ? new Date(tokenExpiresAt).getTime() : undefined,
    });

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async healthCheck(): Promise<boolean> {
    this.ensureConnected();
    try {
      const res = await this.gmail.users.getProfile({ userId: 'me' });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Lists messages matching the given query.
   *
   * @param options.query - Gmail search query (e.g. "is:unread label:inbox")
   * @param options.labelIds - Filter by label IDs
   * @param options.maxResults - Max messages to return (default 20)
   */
  async listMessages(options?: {
    query?: string;
    labelIds?: string[];
    maxResults?: number;
  }): Promise<Array<{ id: string; threadId: string; snippet: string }>> {
    this.ensureConnected();

    const res = await this.gmail.users.messages.list({
      userId: 'me',
      q: options?.query,
      labelIds: options?.labelIds,
      maxResults: options?.maxResults ?? 20,
    });

    if (!res.data.messages) return [];

    return res.data.messages.map((m) => ({
      id: m.id!,
      threadId: m.threadId!,
      snippet: '',
    }));
  }

  /**
   * Fetches a full message by ID with headers and body parsed.
   */
  async getMessage(messageId: string): Promise<GmailMessage> {
    this.ensureConnected();

    const res = await this.gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    const headers = res.data.payload?.headers ?? [];
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';

    return {
      id: res.data.id!,
      threadId: res.data.threadId!,
      snippet: res.data.snippet ?? '',
      from: getHeader('From'),
      to: getHeader('To'),
      subject: getHeader('Subject'),
      body: this.extractBody(res.data.payload),
      labelIds: res.data.labelIds ?? [],
      date: getHeader('Date'),
    };
  }

  /**
   * Adds labels to a message.
   */
  async addLabels(messageId: string, labelIds: string[]): Promise<void> {
    this.ensureConnected();

    await this.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: { addLabelIds: labelIds },
    });
  }

  /**
   * Removes labels from a message.
   */
  async removeLabels(messageId: string, labelIds: string[]): Promise<void> {
    this.ensureConnected();

    await this.gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: { removeLabelIds: labelIds },
    });
  }

  /**
   * Returns the current credentials (useful after a token refresh).
   * The access_token may have changed if the client refreshed it.
   */
  getCredentials(): { accessToken?: string | null; expiryDate?: number | null } {
    const creds = this.oauth2Client.credentials;
    return {
      accessToken: creds.access_token,
      expiryDate: creds.expiry_date,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error('GmailConnector is not connected. Call connect() first.');
    }
  }

  /**
   * Extracts the plain-text body from a Gmail message payload,
   * traversing MIME parts recursively.
   */
  private extractBody(payload?: gmail_v1.Schema$MessagePart | null): string {
    if (!payload) return '';

    if (payload.mimeType === 'text/plain' && payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64url').toString('utf-8');
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        const body = this.extractBody(part);
        if (body) return body;
      }
    }

    return '';
  }
}
