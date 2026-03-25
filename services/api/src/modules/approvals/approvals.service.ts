import { db, approvalRequests, agentInstallations } from '@agentmou/db';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { mapApproval } from './approvals.mapper.js';
import type {
  ApprovalDecisionBody,
  CreateApprovalBody,
} from './approvals.schema.js';

import { recordAuditEvent } from '../../lib/audit.js';

export class ApprovalsService {
  async listApprovals(tenantId: string, filters?: { status?: string }) {
    const query = db
      .select()
      .from(approvalRequests)
      .where(eq(approvalRequests.tenantId, tenantId))
      .orderBy(desc(approvalRequests.requestedAt));

    const approvals = filters?.status
      ? await db
        .select()
        .from(approvalRequests)
        .where(
          and(
            eq(approvalRequests.tenantId, tenantId),
            eq(approvalRequests.status, filters.status)
          )
        )
        .orderBy(desc(approvalRequests.requestedAt))
      : await query;

    const agentIds = await resolveAgentTemplateIds(approvals);
    return approvals.map((approval) =>
      mapApproval(
        approval,
        approval.agentInstallationId
          ? agentIds.get(approval.agentInstallationId)
          : undefined,
      ),
    );
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
    if (!approval) {
      return null;
    }

    const agentIds = await resolveAgentTemplateIds([approval]);
    return mapApproval(
      approval,
      approval.agentInstallationId
        ? agentIds.get(approval.agentInstallationId)
        : undefined,
    );
  }

  async approve(
    tenantId: string,
    approvalId: string,
    decidedBy: string,
    reason?: ApprovalDecisionBody['reason'],
  ) {
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
    if (!updated) {
      return null;
    }

    await recordAuditEvent({
      tenantId,
      actorId: decidedBy,
      action: 'approval.approved',
      category: 'approval',
      details: {
        approvalId,
        runId: updated.runId,
      },
    });

    const agentIds = await resolveAgentTemplateIds([updated]);
    return mapApproval(
      updated,
      updated.agentInstallationId
        ? agentIds.get(updated.agentInstallationId)
        : undefined,
    );
  }

  async reject(
    tenantId: string,
    approvalId: string,
    decidedBy: string,
    reason?: ApprovalDecisionBody['reason'],
  ) {
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
    if (!updated) {
      return null;
    }

    await recordAuditEvent({
      tenantId,
      actorId: decidedBy,
      action: 'approval.rejected',
      category: 'approval',
      details: {
        approvalId,
        runId: updated.runId,
      },
    });

    const agentIds = await resolveAgentTemplateIds([updated]);
    return mapApproval(
      updated,
      updated.agentInstallationId
        ? agentIds.get(updated.agentInstallationId)
        : undefined,
    );
  }

  async requestApproval(
    tenantId: string,
    data: CreateApprovalBody,
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
        source: data.source,
        sourceMetadata: data.sourceMetadata || {},
        resumeToken: data.resumeToken,
        objectiveId: data.objectiveId,
        workOrderId: data.workOrderId,
        status: 'pending',
      })
      .returning();

    await recordAuditEvent({
      tenantId,
      action: 'approval.requested',
      category: 'approval',
      details: {
        approvalId: approval.id,
        runId: approval.runId,
        actionType: approval.actionType,
        riskLevel: approval.riskLevel,
        source: approval.source,
      },
    });

    const agentIds = await resolveAgentTemplateIds([approval]);
    return mapApproval(
      approval,
      approval.agentInstallationId
        ? agentIds.get(approval.agentInstallationId)
        : undefined,
    );
  }
}

async function resolveAgentTemplateIds(
  approvals: Array<typeof approvalRequests.$inferSelect>,
) {
  const installationIds = [
    ...new Set(
      approvals
        .map((approval) => approval.agentInstallationId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (installationIds.length === 0) {
    return new Map<string, string>();
  }

  const installations = await db
    .select({
      id: agentInstallations.id,
      templateId: agentInstallations.templateId,
    })
    .from(agentInstallations)
    .where(inArray(agentInstallations.id, installationIds));

  return new Map(
    installations.map((installation) => [installation.id, installation.templateId]),
  );
}
