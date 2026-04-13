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

export interface AdminAuditLogInput {
  actorId?: string | null;
  actorTenantId: string;
  targetTenantId: string;
  action: string;
  details?: Record<string, unknown>;
}

export async function recordAdminAuditEvent(input: AdminAuditLogInput) {
  const details = {
    targetTenantId: input.targetTenantId,
    ...(input.details ?? {}),
  };

  await recordAuditEvent({
    tenantId: input.targetTenantId,
    actorId: input.actorId,
    action: input.action,
    category: 'admin',
    details,
  });

  if (input.actorTenantId === input.targetTenantId) {
    return;
  }

  await recordAuditEvent({
    tenantId: input.actorTenantId,
    actorId: input.actorId,
    action: input.action,
    category: 'admin',
    details,
  });
}
