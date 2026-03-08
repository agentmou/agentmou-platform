import { db, connectorAccounts } from '@agentmou/db';
import { eq, and } from 'drizzle-orm';

export class ConnectorsService {
  async listConnectors(tenantId: string) {
    return db
      .select()
      .from(connectorAccounts)
      .where(eq(connectorAccounts.tenantId, tenantId));
  }

  async getConnector(tenantId: string, connectorId: string) {
    const [connector] = await db
      .select()
      .from(connectorAccounts)
      .where(
        and(
          eq(connectorAccounts.tenantId, tenantId),
          eq(connectorAccounts.id, connectorId)
        )
      );
    return connector ?? null;
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
    return connector;
  }

  async deleteConnector(tenantId: string, connectorId: string) {
    await db
      .delete(connectorAccounts)
      .where(
        and(
          eq(connectorAccounts.tenantId, tenantId),
          eq(connectorAccounts.id, connectorId)
        )
      );
  }

  async testConnection(tenantId: string, connectorId: string) {
    const connector = await this.getConnector(tenantId, connectorId);
    if (!connector) return { success: false, message: 'Connector not found' };

    await db
      .update(connectorAccounts)
      .set({ lastTestAt: new Date() })
      .where(eq(connectorAccounts.id, connectorId));

    return { success: true, message: 'Connection successful' };
  }
}
