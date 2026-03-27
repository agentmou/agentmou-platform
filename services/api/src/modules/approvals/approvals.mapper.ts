import { ApprovalRequestSchema, type ApprovalRequest } from '@agentmou/contracts';
import { approvalRequests } from '@agentmou/db';

type ApprovalRow = typeof approvalRequests.$inferSelect;

export function mapApproval(approval: ApprovalRow, resolvedAgentId?: string): ApprovalRequest {
  return ApprovalRequestSchema.parse({
    id: approval.id,
    tenantId: approval.tenantId,
    runId: approval.runId,
    agentInstallationId: approval.agentInstallationId ?? undefined,
    agentId: resolvedAgentId,
    actionType: approval.actionType,
    riskLevel: approval.riskLevel,
    title: approval.title,
    description: approval.description ?? '',
    payloadPreview: approval.payloadPreview ?? {},
    context: normalizeContext(approval.context),
    status: approval.status,
    source: approval.source ?? undefined,
    sourceMetadata: normalizeMetadata(approval.sourceMetadata),
    resumeToken: approval.resumeToken ?? undefined,
    objectiveId: approval.objectiveId ?? undefined,
    workOrderId: approval.workOrderId ?? undefined,
    requestedAt: approval.requestedAt.toISOString(),
    decidedAt: approval.decidedAt?.toISOString(),
    decidedBy: approval.decidedBy ?? undefined,
    decisionReason: approval.decisionReason ?? undefined,
  });
}

function normalizeMetadata(context: unknown): Record<string, unknown> | undefined {
  if (!isRecord(context)) {
    return undefined;
  }

  return { ...context };
}

function normalizeContext(context: unknown): Record<string, unknown> {
  if (!isRecord(context)) {
    return {};
  }

  const normalized: Record<string, unknown> = { ...context };

  if ('inputs' in normalized && !isRecord(normalized.inputs)) {
    delete normalized.inputs;
  }

  if ('sources' in normalized) {
    normalized.sources = Array.isArray(normalized.sources)
      ? normalized.sources.filter(isString)
      : undefined;
  }

  if ('previousMessages' in normalized) {
    normalized.previousMessages = Array.isArray(normalized.previousMessages)
      ? normalized.previousMessages.filter(isString)
      : undefined;
  }

  return Object.fromEntries(Object.entries(normalized).filter(([, value]) => value !== undefined));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}
