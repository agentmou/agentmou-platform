import { db, connectorAccounts } from '@agentmou/db';
import { eq, and } from 'drizzle-orm';
import { GmailConnector } from './gmail';
import { decrypt } from './crypto';

const GOOGLE_CLIENT_ID = () => process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = () => process.env.GOOGLE_CLIENT_SECRET!;
const CONNECTOR_ENCRYPTION_KEY = () => process.env.CONNECTOR_ENCRYPTION_KEY!;

/**
 * Loads a connected GmailConnector from the database.
 *
 * Decrypts stored OAuth tokens and returns a ready-to-use connector
 * (with `connect()` already called).
 *
 * @throws If the connector is not found, not connected, or missing tokens
 */
export async function loadGmailConnector(
  tenantId: string,
  connectorAccountId?: string
): Promise<GmailConnector> {
  const conditions = connectorAccountId
    ? and(eq(connectorAccounts.id, connectorAccountId), eq(connectorAccounts.tenantId, tenantId))
    : and(eq(connectorAccounts.tenantId, tenantId), eq(connectorAccounts.provider, 'gmail'));

  const [account] = await db.select().from(connectorAccounts).where(conditions).limit(1);

  if (!account) {
    throw new ConnectorLoadError('Gmail connector account not found');
  }

  if (account.status !== 'connected') {
    throw new ConnectorLoadError(`Gmail connector is not connected (status: ${account.status})`);
  }

  if (!account.accessToken || !account.refreshToken) {
    throw new ConnectorLoadError('Gmail connector is missing OAuth tokens');
  }

  const key = CONNECTOR_ENCRYPTION_KEY();
  const accessToken = decrypt(account.accessToken, key);
  const refreshToken = decrypt(account.refreshToken, key);

  const connector = new GmailConnector({
    name: `gmail-${account.id}`,
    credentials: {
      clientId: GOOGLE_CLIENT_ID(),
      clientSecret: GOOGLE_CLIENT_SECRET(),
      accessToken,
      refreshToken,
      tokenExpiresAt: account.tokenExpiresAt?.toISOString(),
    },
  });

  await connector.connect();
  return connector;
}

/**
 * Loads all connected connectors for a tenant, keyed by provider.
 */
export async function loadTenantConnectors(tenantId: string): Promise<Map<string, GmailConnector>> {
  const accounts = await db
    .select()
    .from(connectorAccounts)
    .where(
      and(eq(connectorAccounts.tenantId, tenantId), eq(connectorAccounts.status, 'connected'))
    );

  const connectors = new Map<string, GmailConnector>();

  for (const account of accounts) {
    if (account.provider === 'gmail' && account.accessToken && account.refreshToken) {
      try {
        const connector = await loadGmailConnector(tenantId, account.id);
        connectors.set('gmail', connector);
      } catch {
        // Skip connectors that fail to load — log but don't break
      }
    }
  }

  return connectors;
}

/**
 * Error raised when a connector cannot be turned into a usable runtime client.
 */
export class ConnectorLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConnectorLoadError';
  }
}
