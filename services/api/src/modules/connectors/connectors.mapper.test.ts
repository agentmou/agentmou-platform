import { describe, expect, it } from 'vitest';

import { mapConnector } from './connectors.mapper.js';

describe('connectors.mapper', () => {
  it('maps known providers to the shared integration contract', () => {
    const connector = mapConnector(
      {
        id: 'connector-row-1',
        tenantId: 'tenant-1',
        provider: 'gmail',
        status: 'connected',
        scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        externalAccountId: 'user@example.com',
        connectedAt: new Date('2024-01-01T00:00:00Z'),
        lastTestAt: new Date('2024-01-02T00:00:00Z'),
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
      },
      'tenant-1',
    );

    expect(connector).toMatchObject({
      id: 'gmail',
      name: 'Gmail',
      icon: 'mail',
      category: 'communication',
      status: 'connected',
      requiredScopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.labels',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      oauthUrl: '/api/v1/tenants/tenant-1/connectors/oauth/gmail/authorize',
    });
  });

  it('falls back safely for unknown providers', () => {
    const connector = mapConnector(
      {
        id: 'connector-row-2',
        tenantId: 'tenant-1',
        provider: 'custom-crm',
        status: 'disconnected',
        scopes: ['read', 123] as unknown,
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        externalAccountId: null,
        connectedAt: null,
        lastTestAt: null,
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      },
      'tenant-1',
    );

    expect(connector).toMatchObject({
      id: 'custom-crm',
      name: 'Custom Crm',
      icon: 'plug',
      category: 'dev',
      status: 'disconnected',
      scopes: ['read'],
      requiredScopes: ['read'],
      lastTestAt: null,
    });
    expect(connector.oauthUrl).toBeUndefined();
  });
});
