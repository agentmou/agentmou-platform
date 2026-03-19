import { db, secretEnvelopes } from '@agentmou/db';
import { eq, and } from 'drizzle-orm';

import { recordAuditEvent } from '../../lib/audit.js';

export class SecretsService {
  async listSecrets(tenantId: string) {
    const rows = await db
      .select({
        id: secretEnvelopes.id,
        tenantId: secretEnvelopes.tenantId,
        key: secretEnvelopes.key,
        connectorAccountId: secretEnvelopes.connectorAccountId,
        createdAt: secretEnvelopes.createdAt,
        rotatedAt: secretEnvelopes.rotatedAt,
      })
      .from(secretEnvelopes)
      .where(eq(secretEnvelopes.tenantId, tenantId));
    return rows;
  }

  async createSecret(
    tenantId: string,
    body: { key: string; encryptedValue: string; connectorAccountId?: string },
    actorId?: string,
  ) {
    const [secret] = await db
      .insert(secretEnvelopes)
      .values({
        tenantId,
        key: body.key,
        encryptedValue: body.encryptedValue,
        connectorAccountId: body.connectorAccountId,
      })
      .returning();

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'secret.created',
      category: 'security',
      details: {
        secretId: secret.id,
        key: secret.key,
        connectorAccountId: secret.connectorAccountId,
      },
    });

    return secret;
  }

  async deleteSecret(tenantId: string, secretId: string, actorId?: string) {
    const [secret] = await db
      .select({
        id: secretEnvelopes.id,
        key: secretEnvelopes.key,
      })
      .from(secretEnvelopes)
      .where(
        and(
          eq(secretEnvelopes.tenantId, tenantId),
          eq(secretEnvelopes.id, secretId)
        )
      );

    await db
      .delete(secretEnvelopes)
      .where(
        and(
          eq(secretEnvelopes.tenantId, tenantId),
          eq(secretEnvelopes.id, secretId)
        )
      );

    if (secret) {
      await recordAuditEvent({
        tenantId,
        actorId,
        action: 'secret.deleted',
        category: 'security',
        details: {
          secretId: secret.id,
          key: secret.key,
        },
      });
    }
  }
}
