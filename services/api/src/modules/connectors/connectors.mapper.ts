import {
  IntegrationSchema,
  type Integration,
  type IntegrationCategory,
} from '@agentmou/contracts';
import { connectorAccounts } from '@agentmou/db';

type ConnectorRow = typeof connectorAccounts.$inferSelect;

interface ConnectorMetadata {
  name: string;
  icon: string;
  category: IntegrationCategory;
  requiredScopes: string[];
  oauthSupported?: boolean;
}

const CONNECTOR_METADATA: Record<string, ConnectorMetadata> = {
  gmail: {
    name: 'Gmail',
    icon: 'mail',
    category: 'communication',
    requiredScopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.labels',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    oauthSupported: true,
  },
  slack: {
    name: 'Slack',
    icon: 'message-square',
    category: 'communication',
    requiredScopes: ['channels:read', 'chat:write', 'users:read', 'reactions:read'],
  },
  notion: {
    name: 'Notion',
    icon: 'file-text',
    category: 'productivity',
    requiredScopes: ['read_content', 'update_content', 'insert_content'],
  },
  'google-calendar': {
    name: 'Google Calendar',
    icon: 'calendar',
    category: 'productivity',
    requiredScopes: ['calendar.readonly', 'calendar.events'],
  },
  'google-sheets': {
    name: 'Google Sheets',
    icon: 'table',
    category: 'productivity',
    requiredScopes: ['spreadsheets'],
  },
  'google-drive': {
    name: 'Google Drive',
    icon: 'hard-drive',
    category: 'storage',
    requiredScopes: ['drive.file', 'drive.readonly'],
  },
  linear: {
    name: 'Linear',
    icon: 'git-branch',
    category: 'dev',
    requiredScopes: ['read', 'write', 'issues:create'],
  },
  openai: {
    name: 'OpenAI',
    icon: 'brain',
    category: 'dev',
    requiredScopes: ['chat', 'embeddings'],
  },
};

export function mapConnector(
  connector: ConnectorRow,
  tenantId: string,
): Integration {
  const scopes = normalizeScopes(connector.scopes);
  const metadata = CONNECTOR_METADATA[connector.provider] ?? buildFallbackMetadata(
    connector.provider,
    scopes,
  );

  return IntegrationSchema.parse({
    id: connector.provider,
    name: metadata.name,
    icon: metadata.icon,
    category: metadata.category,
    status: connector.status,
    scopes,
    requiredScopes: metadata.requiredScopes,
    lastTestAt: connector.lastTestAt?.toISOString() ?? null,
    oauthUrl: metadata.oauthSupported
      ? `/api/v1/tenants/${tenantId}/connectors/oauth/${connector.provider}/authorize`
      : undefined,
  });
}

function buildFallbackMetadata(
  provider: string,
  scopes: string[],
): ConnectorMetadata {
  return {
    name: provider
      .split(/[-_]/)
      .filter(Boolean)
      .map((segment) => segment[0]?.toUpperCase() + segment.slice(1))
      .join(' '),
    icon: 'plug',
    category: 'dev',
    requiredScopes: scopes,
  };
}

function normalizeScopes(scopes: unknown): string[] {
  if (!Array.isArray(scopes)) {
    return [];
  }

  return scopes.filter((scope): scope is string => typeof scope === 'string');
}
