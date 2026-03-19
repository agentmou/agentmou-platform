import { randomBytes } from 'node:crypto';
import { db, connectorAccounts, connectorOauthStates } from '@agentmou/db';
import { encrypt } from '@agentmou/connectors';
import { eq, and } from 'drizzle-orm';

import { recordAuditEvent } from '../../lib/audit.js';

// ---------------------------------------------------------------------------
// Config — read lazily so env vars can be set after module load (tests)
// ---------------------------------------------------------------------------

function getConfig() {
  return {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri: process.env.GOOGLE_REDIRECT_URI!,
    encryptionKey: process.env.CONNECTOR_ENCRYPTION_KEY!,
  };
}

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels',
  'https://www.googleapis.com/auth/userinfo.email',
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  name?: string;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class OAuthService {
  /**
   * Generates a Google OAuth2 authorization URL for a tenant.
   * Stores a random state token for CSRF protection.
   *
   * @returns The URL to redirect the user to
   */
  async getAuthorizeUrl(
    tenantId: string,
    provider: string,
    redirectUrl?: string
  ): Promise<string> {
    if (provider !== 'gmail') {
      throw new Error(`Unsupported OAuth provider: ${provider}`);
    }

    const state = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + STATE_TTL_MS);

    await db.insert(connectorOauthStates).values({
      tenantId,
      provider,
      state,
      redirectUrl: redirectUrl ?? null,
      expiresAt,
    });

    const cfg = getConfig();
    const params = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: cfg.redirectUri,
      response_type: 'code',
      scope: GMAIL_SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Handles the OAuth callback from Google.
   * Validates state, exchanges code for tokens, encrypts and stores them.
   *
   * @returns The tenantId and redirectUrl for the final redirect
   */
  async handleCallback(
    code: string,
    state: string
  ): Promise<{ tenantId: string; redirectUrl: string | null; provider: string }> {
    const oauthState = await this.validateAndConsumeState(state);

    const tokens = await this.exchangeCodeForTokens(code);
    const userInfo = await this.fetchUserInfo(tokens.access_token);

    await this.storeTokens(oauthState.tenantId, oauthState.provider, tokens, userInfo);

    return {
      tenantId: oauthState.tenantId,
      redirectUrl: oauthState.redirectUrl,
      provider: oauthState.provider,
    };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private async validateAndConsumeState(state: string) {
    const [oauthState] = await db
      .select()
      .from(connectorOauthStates)
      .where(eq(connectorOauthStates.state, state))
      .limit(1);

    if (!oauthState) {
      throw new OAuthError('Invalid OAuth state parameter', 'INVALID_STATE');
    }

    if (oauthState.expiresAt < new Date()) {
      await db
        .delete(connectorOauthStates)
        .where(eq(connectorOauthStates.id, oauthState.id));
      throw new OAuthError('OAuth state has expired', 'STATE_EXPIRED');
    }

    // Consume the state (one-time use)
    await db
      .delete(connectorOauthStates)
      .where(eq(connectorOauthStates.id, oauthState.id));

    return oauthState;
  }

  private async exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
    const cfg = getConfig();
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        redirect_uri: cfg.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new OAuthError(
        `Token exchange failed: ${response.status} ${body}`,
        'TOKEN_EXCHANGE_FAILED'
      );
    }

    return response.json() as Promise<GoogleTokenResponse>;
  }

  private async fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new OAuthError(
        `Failed to fetch user info: ${response.status}`,
        'USERINFO_FAILED'
      );
    }

    return response.json() as Promise<GoogleUserInfo>;
  }

  private async storeTokens(
    tenantId: string,
    provider: string,
    tokens: GoogleTokenResponse,
    userInfo: GoogleUserInfo
  ): Promise<void> {
    const { encryptionKey } = getConfig();
    const encryptedAccessToken = encrypt(tokens.access_token, encryptionKey);
    const encryptedRefreshToken = tokens.refresh_token
      ? encrypt(tokens.refresh_token, encryptionKey)
      : null;

    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Upsert: find existing disconnected connector or create one
    const [existing] = await db
      .select()
      .from(connectorAccounts)
      .where(
        and(
          eq(connectorAccounts.tenantId, tenantId),
          eq(connectorAccounts.provider, provider)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(connectorAccounts)
        .set({
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken ?? existing.refreshToken,
          tokenExpiresAt,
          externalAccountId: userInfo.email,
          status: 'connected',
          connectedAt: new Date(),
          scopes: GMAIL_SCOPES,
          updatedAt: new Date(),
        })
        .where(eq(connectorAccounts.id, existing.id));
    } else {
      await db
        .insert(connectorAccounts)
        .values({
          tenantId,
          provider,
          accessToken: encryptedAccessToken,
          refreshToken: encryptedRefreshToken,
          tokenExpiresAt,
          externalAccountId: userInfo.email,
          status: 'connected',
          connectedAt: new Date(),
          scopes: GMAIL_SCOPES,
        });
    }

    await recordAuditEvent({
      tenantId,
      action: 'connector.oauth_connected',
      category: 'connector',
      details: {
        provider,
        externalAccountId: userInfo.email,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Typed error for OAuth failures
// ---------------------------------------------------------------------------

export class OAuthError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'INVALID_STATE'
      | 'STATE_EXPIRED'
      | 'TOKEN_EXCHANGE_FAILED'
      | 'USERINFO_FAILED'
      | 'UNSUPPORTED_PROVIDER'
  ) {
    super(message);
    this.name = 'OAuthError';
  }
}
