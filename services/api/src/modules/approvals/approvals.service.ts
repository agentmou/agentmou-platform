import { db, approvalRequests } from '@agentmou/db';
import { eq, and, desc } from 'drizzle-orm';

export class ApprovalsService {
  async listApprovals(tenantId: string, filters?: { status?: string }) {
    const query = db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.tenantId, tenantId))
      .orderBy(desc(approvalRequests.requestedAt));

    if (filters?.status) {
      return db
        .select()
        .from(approvalRequests)
        .where(
          and(
            eq(approvalRequests.tenantId, tenantId),
            eq(approvalRequests.status, filters.status)
          )
        )
        .orderBy(desc(approvalRequests.requestedAt));
    }

    return query;
  }

  async getApproval(tenantId: string, approvalId: string) {
    const [approval] = await db
      .select()
      .from(approvalRequests)
      .where(
        and(
          eq(approvalRequests.tenantId, tenantId),
          eq(approvalRequests.id, approvalId)
        )
      );
    return approval ?? null;
  }

  async approve(tenantId: string, approvalId: string, decidedBy: string, reason?: string) {
    const [updated] = await db
      .update(approvalRequests)
      .set({
        status: 'approved',
        decidedAt: new Date(),
        decidedBy,
        decisionReason: reason,
      })
      .where(
        and(
          eq(approvalRequests.tenantId, tenantId),
          eq(approvalRequests.id, approvalId)
        )
      )
      .returning();
    return updated ?? null;
  }

  async reject(tenantId: string, approvalId: string, decidedBy: string, reason?: string) {
    const [updated] = await db
      .update(approvalRequests)
      .set({
        status: 'rejected',
        decidedAt: new Date(),
        decidedBy,
        decisionReason: reason,
      })
      .where(
        and(
          eq(approvalRequests.tenantId, tenantId),
          eq(approvalRequests.id, approvalId)
        )
      )
      .returning();
    return updated ?? null;
  }

  async requestApproval(
    tenantId: string,
    data: {
      runId: string;
      agentInstallationId?: string;
      actionType: string;
      riskLevel: string;
      title: string;
      description?: string;
      payloadPreview?: Record<string, unknown>;
      context?: Record<string, unknown>;
    }
  ) {
    const [approval] = await db
      .insert(approvalRequests)
      .values({
        tenantId,
        runId: data.runId,
        agentInstallationId: data.agentInstallationId,
        actionType: data.actionType,
        riskLevel: data.riskLevel,
        title: data.title,
        description: data.description,
        payloadPreview: data.payloadPreview || {},
        context: data.context || {},
        status: 'pending',
      })
      .returning();
    return approval;
  }
}
