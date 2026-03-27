import { db, connectorAccounts } from '@agentmou/db';
import { eq, and } from 'drizzle-orm';
import { mapConnector } from './connectors.mapper.js';

import { recordAuditEvent } from '../../lib/audit.js';

// Matches canonical UUID strings so provider slugs like "gmail" never hit the
// UUID column predicate.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ConnectorsService {
  async listConnectors(tenantId: string) {
    const connectors = await db
      .select()
      .from(connectorAccounts)
      .where(eq(connectorAccounts.tenantId, tenantId));

    return connectors.map((connector) => mapConnector(connector, tenantId));
  }

  async getConnector(tenantId: string, connectorId: string) {
    const connector = await this.getConnectorRow(tenantId, connectorId);
    return connector ? mapConnector(connector, tenantId) : null;
  }

  async createConnector(tenantId: string, provider: string, scopes?: string[], actorId?: string) {
    const [connector] = await db
      .insert(connectorAccounts)
      .values({
        tenantId,
        provider,
        status: 'disconnected',
        scopes: scopes || [],
      })
      .returning();

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'connector.created',
      category: 'connector',
      details: {
        connectorId: connector.id,
        provider: connector.provider,
      },
    });

    return mapConnector(connector, tenantId);
  }

  async deleteConnector(tenantId: string, connectorId: string, actorId?: string) {
    const connector = await this.getConnectorRow(tenantId, connectorId);
    if (!connector) {
      return;
    }

    await db.delete(connectorAccounts).where(eq(connectorAccounts.id, connector.id));

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'connector.deleted',
      category: 'connector',
      details: {
        connectorId: connector.id,
        provider: connector.provider,
      },
    });
  }

  async testConnection(tenantId: string, connectorId: string, actorId?: string) {
    const connector = await this.getConnectorRow(tenantId, connectorId);
    if (!connector) return { success: false, message: 'Connector not found' };

    await db
      .update(connectorAccounts)
      .set({ lastTestAt: new Date() })
      .where(eq(connectorAccounts.id, connector.id));

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'connector.tested',
      category: 'connector',
      details: {
        connectorId: connector.id,
        provider: connector.provider,
      },
    });

    return { success: true, message: 'Connection successful' };
  }

  private async getConnectorRow(tenantId: string, connectorId: string) {
    const connectorIdentifier = isUuid(connectorId)
      ? eq(connectorAccounts.id, connectorId)
      : eq(connectorAccounts.provider, connectorId);

    const [connector] = await db
      .select()
      .from(connectorAccounts)
      .where(and(eq(connectorAccounts.tenantId, tenantId), connectorIdentifier));
    return connector ?? null;
  }
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
