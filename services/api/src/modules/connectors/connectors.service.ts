import { db, connectorAccounts } from '@agentmou/db';
import { eq, and, or } from 'drizzle-orm';
import { mapConnector } from './connectors.mapper.js';

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
    scopes?: string[]
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
    return mapConnector(connector, tenantId);
  }

  async deleteConnector(tenantId: string, connectorId: string) {
    const connector = await this.getConnectorRow(tenantId, connectorId);
    if (!connector) {
      return;
    }

    await db
      .delete(connectorAccounts)
      .where(eq(connectorAccounts.id, connector.id));
  }

  async testConnection(tenantId: string, connectorId: string) {
    const connector = await this.getConnectorRow(tenantId, connectorId);
    if (!connector) return { success: false, message: 'Connector not found' };

    await db
      .update(connectorAccounts)
      .set({ lastTestAt: new Date() })
      .where(eq(connectorAccounts.id, connector.id));

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
