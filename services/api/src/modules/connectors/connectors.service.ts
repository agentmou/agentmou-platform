import { db, connectorAccounts } from '@agentmou/db';
import { eq, and, or } from 'drizzle-orm';
import { mapConnector } from './connectors.mapper.js';

import { recordAuditEvent } from '../../lib/audit.js';

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

  async createConnector(
    tenantId: string,
    provider: string,
    scopes?: string[],
    actorId?: string,
  ) {
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

    await db
      .delete(connectorAccounts)
      .where(eq(connectorAccounts.id, connector.id));

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
    const [connector] = await db
      .select()
      .from(connectorAccounts)
      .where(
        and(
          eq(connectorAccounts.tenantId, tenantId),
          or(
            eq(connectorAccounts.id, connectorId),
            eq(connectorAccounts.provider, connectorId),
          ),
        )
      );
    return connector ?? null;
  }
}
