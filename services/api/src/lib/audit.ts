import { db, auditEvents } from '@agentmou/db';

import type { AuditEventCategory } from '@agentmou/contracts';

export interface AuditLogInput {
  tenantId: string;
  actorId?: string | null;
  action: string;
  category: AuditEventCategory;
  details?: Record<string, unknown>;
}

export async function recordAuditEvent(input: AuditLogInput) {
  await db.insert(auditEvents).values({
    tenantId: input.tenantId,
    actorId: input.actorId ?? null,
    action: input.action,
    category: input.category,
    details: input.details ?? {},
  });
}
