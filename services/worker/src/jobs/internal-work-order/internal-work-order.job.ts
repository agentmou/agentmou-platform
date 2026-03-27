import { createHmac } from 'node:crypto';

import type { Job } from 'bullmq';
import type {
  InternalWorkOrderPayload,
  RunAgentPayload,
  RunWorkflowPayload,
} from '@agentmou/queue';
import { getQueue, QUEUE_NAMES } from '@agentmou/queue';
import {
  approvalRequests,
  db,
  executionRuns,
  internalArtifacts,
  internalConversationSessions,
  internalDecisions,
  internalMemoryEntries,
  internalObjectives,
  internalTelegramMessages,
  internalWorkOrders,
} from '@agentmou/db';
import { and, eq } from 'drizzle-orm';

import { logJobMessage } from '../runtime-support/job-log.js';

type WorkOrderRow = typeof internalWorkOrders.$inferSelect;
type ObjectiveRow = typeof internalObjectives.$inferSelect;
type SessionRow = typeof internalConversationSessions.$inferSelect;

const TELEGRAM_API_BASE = 'https://api.telegram.org';

export async function processInternalWorkOrder(
  job: Job<InternalWorkOrderPayload>,
) {
  const { tenantId, workOrderId } = job.data;

  const [workOrder] = await db
    .select()
    .from(internalWorkOrders)
    .where(
      and(
        eq(internalWorkOrders.id, workOrderId),
        eq(internalWorkOrders.tenantId, tenantId),
      ),
    );

  if (!workOrder) {
    throw new Error(`Internal work order ${workOrderId} not found`);
  }

  const [objective] = await db
    .select()
    .from(internalObjectives)
    .where(eq(internalObjectives.id, workOrder.objectiveId));

  if (!objective) {
    throw new Error(`Objective ${workOrder.objectiveId} not found`);
  }

  const [session] = await db
    .select()
    .from(internalConversationSessions)
    .where(eq(internalConversationSessions.id, objective.sessionId));

  if (!session) {
    throw new Error(`Session ${objective.sessionId} not found`);
  }

  if (['completed', 'cancelled', 'blocked'].includes(workOrder.status)) {
    await logJobMessage(
      job,
      `[internal-work-order] Skipping ${workOrder.id}; already ${workOrder.status}`,
    );
    return;
  }

  if (workOrder.status === 'waiting_approval') {
    await logJobMessage(
      job,
      `[internal-work-order] Work order ${workOrder.id} waiting for approval`,
    );
    return;
  }

  if (workOrder.status === 'dispatched') {
    await logJobMessage(
      job,
      `[internal-work-order] Work order ${workOrder.id} already dispatched`,
    );
    return;
  }

  await job.updateProgress(15);

  if (shouldCreateApproval(workOrder)) {
    await createApprovalGate({ job, tenantId, workOrder, objective, session });
    await job.updateProgress(100);
    return;
  }

  await db
    .update(internalWorkOrders)
    .set({
      status: 'in_progress',
      updatedAt: new Date(),
    })
    .where(eq(internalWorkOrders.id, workOrder.id));

  await db
    .update(internalObjectives)
    .set({
      status: 'in_progress',
      updatedAt: new Date(),
    })
    .where(eq(internalObjectives.id, objective.id));

  await job.updateProgress(45);

  switch (workOrder.workType) {
    case 'run_agent_installation':
      await dispatchAgentInstallation({ job, tenantId, workOrder, objective });
      break;
    case 'run_workflow_installation':
      await dispatchWorkflowInstallation({ job, tenantId, workOrder, objective });
      break;
    case 'notify_telegram':
      await sendTelegramNotification({ workOrder, objective, session });
      break;
    case 'sync_internal_state':
      await completeWithArtifact({
        objective,
        workOrder,
        artifactType: 'decision_log',
        title: `Internal state sync for ${objective.title}`,
        content: [
          `# Internal State Sync`,
          ``,
          `Objective: ${objective.title}`,
          `Summary: ${workOrder.summary}`,
          `State has been synchronized and recorded.`,
        ].join('\n'),
        metadata: normalizePayload(workOrder.payload),
      });
      break;
    case 'request_human_approval':
      await createApprovalGate({ job, tenantId, workOrder, objective, session });
      break;
    case 'prepare_artifact':
    default:
      await completeWithArtifact({
        objective,
        workOrder,
        artifactType: 'brief',
        title: `Executive brief for ${objective.title}`,
        content: [
          `# Executive Brief`,
          ``,
          `Objective: ${objective.title}`,
          `Owner agent: ${objective.ownerAgentId}`,
          `Delivery agent: ${workOrder.agentId}`,
          `Summary: ${workOrder.summary}`,
          `Recommended next action: ${String(
            normalizePayload(workOrder.payload).recommendedAction ??
              'Review and continue',
          )}`,
        ].join('\n'),
        metadata: normalizePayload(workOrder.payload),
      });
      break;
  }

  await job.updateProgress(100);
  await logJobMessage(
    job,
    `[internal-work-order] Completed ${workOrder.id} as ${workOrder.workType}`,
  );
}

async function createApprovalGate(input: {
  job: Job<InternalWorkOrderPayload>;
  tenantId: string;
  workOrder: WorkOrderRow;
  objective: ObjectiveRow;
  session: SessionRow;
}) {
  const payload = normalizePayload(input.workOrder.payload);
  const existingApproval = input.workOrder.approvalRequestId
    ? await db
        .select()
        .from(approvalRequests)
        .where(eq(approvalRequests.id, input.workOrder.approvalRequestId))
        .then((rows) => rows[0] ?? null)
    : null;

  if (existingApproval?.status === 'pending') {
    await logJobMessage(
      input.job,
      `[internal-work-order] Approval already pending for ${input.workOrder.id}`,
    );
    return;
  }

  const [approval] = await db
    .insert(approvalRequests)
    .values({
      tenantId: input.tenantId,
      runId: input.objective.runId,
      agentInstallationId: asUuid(payload.agentInstallationId),
      actionType: approvalActionFor(input.workOrder),
      riskLevel: String(payload.riskLevel ?? 'medium'),
      title: input.workOrder.title,
      description: input.workOrder.summary,
      payloadPreview: payload,
      context: {
        objectiveId: input.objective.id,
        workOrderId: input.workOrder.id,
        agentId: input.workOrder.agentId,
      },
      status: 'pending',
      source: 'telegram',
      sourceMetadata: {
        channel: 'telegram',
        workType: input.workOrder.workType,
      },
      resumeToken: `internal-work-order:${input.workOrder.resumeFromWorkOrderId ?? input.workOrder.id}`,
      objectiveId: input.objective.id,
      workOrderId: input.workOrder.id,
    })
    .returning();

  await db
    .update(internalWorkOrders)
    .set({
      status: 'waiting_approval',
      approvalRequestId: approval.id,
      updatedAt: new Date(),
    })
    .where(eq(internalWorkOrders.id, input.workOrder.id));

  await db
    .update(internalObjectives)
    .set({
      status: 'waiting_approval',
      updatedAt: new Date(),
    })
    .where(eq(internalObjectives.id, input.objective.id));

  await db
    .update(internalConversationSessions)
    .set({
      status: 'waiting_approval',
      updatedAt: new Date(),
    })
    .where(eq(internalConversationSessions.id, input.session.id));

  const notificationId = await createTelegramNotificationWorkOrder({
    tenantId: input.tenantId,
    objectiveId: input.objective.id,
    sessionId: input.session.id,
    openclawSessionId: input.workOrder.openclawSessionId ?? undefined,
    agentId: input.workOrder.agentId,
    chatId: input.session.externalChatId,
    userId: input.session.externalUserId,
    mode: 'approval',
    text: buildApprovalPrompt(input.workOrder, approval.id),
    buttons: buildApprovalButtons(approval.id),
  });

  await logJobMessage(
    input.job,
    `[internal-work-order] Approval requested for ${input.workOrder.id} -> ${approval.id} (notify ${notificationId})`,
  );
}

async function dispatchAgentInstallation(input: {
  job: Job<InternalWorkOrderPayload>;
  tenantId: string;
  workOrder: WorkOrderRow;
  objective: ObjectiveRow;
}) {
  const payload = normalizePayload(input.workOrder.payload);
  const agentInstallationId = asUuid(payload.agentInstallationId);

  if (!agentInstallationId) {
    throw new Error(
      `Work order ${input.workOrder.id} is missing agentInstallationId`,
    );
  }

  const [run] = await db
    .insert(executionRuns)
    .values({
      tenantId: input.tenantId,
      agentInstallationId,
      status: 'running',
      triggeredBy: 'agent',
      tags: buildInternalExecutionTags(input.objective.id, input.workOrder.id),
    })
    .returning();

  await getQueue(QUEUE_NAMES.RUN_AGENT).add('run-agent', {
    tenantId: input.tenantId,
    agentInstallationId,
    runId: run.id,
    input: normalizeExternalExecutionInput(payload, input.objective.id),
    triggeredBy: 'agent',
  } satisfies RunAgentPayload);

  await db
    .update(internalWorkOrders)
    .set({
      status: 'dispatched',
      executionRunId: run.id,
      updatedAt: new Date(),
    })
    .where(eq(internalWorkOrders.id, input.workOrder.id));
}

async function dispatchWorkflowInstallation(input: {
  job: Job<InternalWorkOrderPayload>;
  tenantId: string;
  workOrder: WorkOrderRow;
  objective: ObjectiveRow;
}) {
  const payload = normalizePayload(input.workOrder.payload);
  const workflowInstallationId = asUuid(payload.workflowInstallationId);

  if (!workflowInstallationId) {
    throw new Error(
      `Work order ${input.workOrder.id} is missing workflowInstallationId`,
    );
  }

  const [run] = await db
    .insert(executionRuns)
    .values({
      tenantId: input.tenantId,
      workflowInstallationId,
      status: 'running',
      triggeredBy: 'agent',
      tags: buildInternalExecutionTags(input.objective.id, input.workOrder.id),
    })
    .returning();

  await getQueue(QUEUE_NAMES.RUN_WORKFLOW).add('run-workflow', {
    tenantId: input.tenantId,
    workflowInstallationId,
    runId: run.id,
    input: normalizeExternalExecutionInput(payload, input.objective.id),
    triggeredBy: 'api',
  } satisfies RunWorkflowPayload);

  await db
    .update(internalWorkOrders)
    .set({
      status: 'dispatched',
      executionRunId: run.id,
      updatedAt: new Date(),
    })
    .where(eq(internalWorkOrders.id, input.workOrder.id));
}

async function sendTelegramNotification(input: {
  workOrder: WorkOrderRow;
  objective: ObjectiveRow;
  session: SessionRow;
}) {
  const payload = normalizePayload(input.workOrder.payload);
  const token = process.env.INTERNAL_OPS_TELEGRAM_BOT_TOKEN;
  const chatId = String(payload.chatId ?? input.session.externalChatId);

  if (!token) {
    throw new Error('INTERNAL_OPS_TELEGRAM_BOT_TOKEN is required for Telegram notifications.');
  }

  const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: String(payload.text ?? input.workOrder.summary),
      reply_markup: buildInlineKeyboard(payload.buttons),
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Telegram sendMessage failed (${response.status} ${response.statusText})`,
    );
  }

  const responseBody = (await response.json()) as {
    result?: { message_id?: number };
  };

  await db.insert(internalTelegramMessages).values({
    tenantId: input.workOrder.tenantId,
    sessionId: input.objective.sessionId,
    objectiveId: input.objective.id,
    direction: 'outbound',
    mode: String(payload.mode ?? 'status'),
    chatId,
    userId: asString(payload.userId) ?? input.session.externalUserId,
    messageId: responseBody.result?.message_id,
    dedupeKey: `telegram:out:${input.workOrder.id}`,
    payload,
    deliveredAt: new Date(),
  });

  await completeWithArtifact({
    objective: input.objective,
    workOrder: input.workOrder,
    artifactType: 'telegram_delivery',
    title: `Telegram ${String(payload.mode ?? 'status')} delivery`,
    content: String(payload.text ?? input.workOrder.summary),
    metadata: {
      ...payload,
      messageId: responseBody.result?.message_id,
    },
  });
}

async function completeWithArtifact(input: {
  objective: ObjectiveRow;
  workOrder: WorkOrderRow;
  artifactType:
    | 'brief'
    | 'workflow_handoff'
    | 'decision_log'
    | 'execution_run_summary'
    | 'telegram_delivery';
  title: string;
  content: string;
  metadata: Record<string, unknown>;
}) {
  await db.insert(internalArtifacts).values({
    tenantId: input.workOrder.tenantId,
    objectiveId: input.objective.id,
    workOrderId: input.workOrder.id,
    executionRunId: input.workOrder.executionRunId ?? undefined,
    agentId: input.workOrder.agentId,
    artifactType: input.artifactType,
    title: input.title,
    content: input.content,
    metadata: input.metadata,
  });

  await db.insert(internalDecisions).values({
    tenantId: input.workOrder.tenantId,
    objectiveId: input.objective.id,
    workOrderId: input.workOrder.id,
    agentId: input.workOrder.agentId,
    outcome: 'completed',
    summary: input.title,
    rationale: input.content.slice(0, 500),
    metadata: input.metadata,
  });

  await db
    .update(internalWorkOrders)
    .set({
      status: 'completed',
      updatedAt: new Date(),
      completedAt: new Date(),
    })
    .where(eq(internalWorkOrders.id, input.workOrder.id));

  await finalizeObjectiveIfSettled(input.objective.id);
}

async function finalizeObjectiveIfSettled(objectiveId: string) {
  const workOrders = await db
    .select()
    .from(internalWorkOrders)
    .where(eq(internalWorkOrders.objectiveId, objectiveId));

  if (
    workOrders.length === 0 ||
    workOrders.some((workOrder) =>
      ['queued', 'in_progress', 'waiting_approval', 'dispatched'].includes(
        workOrder.status,
      ),
    )
  ) {
    return;
  }

  const [objective] = await db
    .select()
    .from(internalObjectives)
    .where(eq(internalObjectives.id, objectiveId));

  if (!objective) {
    return;
  }

  const [session] = await db
    .select()
    .from(internalConversationSessions)
    .where(eq(internalConversationSessions.id, objective.sessionId));

  const [existingSummaryNotification] = await db
    .select()
    .from(internalWorkOrders)
    .where(
      and(
        eq(internalWorkOrders.objectiveId, objectiveId),
        eq(internalWorkOrders.workType, 'notify_telegram'),
        eq(internalWorkOrders.title, 'Telegram summary'),
      ),
    );

  const summaryText = await buildObjectiveSummary(objectiveId, objective.title);

  if (objective.status === 'blocked') {
    await db
      .update(executionRuns)
      .set({
        status: 'failed',
        completedAt: new Date(),
      })
      .where(eq(executionRuns.id, objective.runId));

    if (session) {
      await db
        .update(internalConversationSessions)
        .set({
          status: 'blocked',
          updatedAt: new Date(),
        })
        .where(eq(internalConversationSessions.id, objective.sessionId));
    }

    return;
  }

  await db
    .update(internalObjectives)
    .set({
      status: 'completed',
      updatedAt: new Date(),
      completedAt: new Date(),
    })
    .where(eq(internalObjectives.id, objectiveId));

  await db
    .update(executionRuns)
    .set({
      status: 'success',
      completedAt: new Date(),
    })
    .where(eq(executionRuns.id, objective.runId));

  await db
    .update(internalConversationSessions)
    .set({
      status: 'completed',
      updatedAt: new Date(),
    })
    .where(eq(internalConversationSessions.id, objective.sessionId));

  await db.insert(internalMemoryEntries).values({
    tenantId: objective.tenantId,
    objectiveId,
    sessionId: objective.sessionId,
    agentId: objective.ownerAgentId,
    scope: 'objective',
    title: `Objective summary: ${objective.title}`,
    summary: summaryText,
    details: {
      objectiveTitle: objective.title,
    },
  });

  if (!existingSummaryNotification && session) {
    await createTelegramNotificationWorkOrder({
      tenantId: objective.tenantId,
      objectiveId,
      sessionId: session.id,
      openclawSessionId: objective.openclawSessionId ?? undefined,
      agentId: objective.ownerAgentId,
      chatId: session.externalChatId,
      userId: session.externalUserId,
      mode: 'summary',
      text: summaryText,
      buttons: [],
    });
  }
}

async function buildObjectiveSummary(objectiveId: string, objectiveTitle: string) {
  const artifacts = await db
    .select()
    .from(internalArtifacts)
    .where(eq(internalArtifacts.objectiveId, objectiveId));

  const latestTitles = artifacts
    .slice(-3)
    .map((artifact) => `- ${artifact.title}`)
    .join('\n');

  return [
    `Objetivo completado: ${objectiveTitle}`,
    latestTitles ? '\nResultados clave:\n' + latestTitles : '',
  ]
    .filter(Boolean)
    .join('\n');
}

async function createTelegramNotificationWorkOrder(input: {
  tenantId: string;
  objectiveId: string;
  sessionId: string;
  openclawSessionId?: string;
  agentId: string;
  chatId: string;
  userId: string;
  mode: 'ack' | 'status' | 'approval' | 'summary' | 'callback';
  text: string;
  buttons: Array<{ action: string; label: string; callbackData?: string }>;
}) {
  const [created] = await db
    .insert(internalWorkOrders)
    .values({
      tenantId: input.tenantId,
      objectiveId: input.objectiveId,
      agentId: input.agentId,
      workType: 'notify_telegram',
      status: 'queued',
      executionTarget: 'telegram',
      openclawSessionId: input.openclawSessionId,
      title: input.mode === 'summary' ? 'Telegram summary' : `Telegram ${input.mode}`,
      summary: input.text,
      requiresApproval: false,
      payload: {
        mode: input.mode,
        text: input.text,
        chatId: input.chatId,
        userId: input.userId,
        buttons: input.buttons,
      },
    })
    .returning();

  await getQueue(QUEUE_NAMES.INTERNAL_WORK_ORDER).add(
    `internal-work-order:${created.id}`,
    {
      tenantId: input.tenantId,
      objectiveId: input.objectiveId,
      workOrderId: created.id,
      workType: 'notify_telegram',
    },
  );

  return created.id;
}

function shouldCreateApproval(workOrder: WorkOrderRow) {
  return (
    workOrder.workType === 'request_human_approval' ||
    (workOrder.requiresApproval && !workOrder.approvalRequestId)
  );
}

function approvalActionFor(workOrder: WorkOrderRow) {
  switch (workOrder.workType) {
    case 'run_agent_installation':
      return 'run_agent_installation';
    case 'run_workflow_installation':
      return 'run_workflow_installation';
    case 'sync_internal_state':
      return 'sync_internal_state';
    default:
      return 'notify_operator';
  }
}

function buildApprovalPrompt(workOrder: WorkOrderRow, approvalId: string) {
  return [
    `Aprobación requerida`,
    ``,
    `Objetivo: ${workOrder.title}`,
    `Acción: ${workOrder.summary}`,
    `Approval ID: ${approvalId}`,
  ].join('\n');
}

function buildApprovalButtons(approvalId: string) {
  return [
    {
      action: 'approve',
      label: 'Approve',
      callbackData: signApprovalCallback(approvalId, 'approve'),
    },
    {
      action: 'reject',
      label: 'Reject',
      callbackData: signApprovalCallback(approvalId, 'reject'),
    },
    {
      action: 'postpone',
      label: 'Postpone',
      callbackData: signApprovalCallback(approvalId, 'postpone'),
    },
    {
      action: 'reformulate',
      label: 'Reformulate',
      callbackData: signApprovalCallback(approvalId, 'reformulate'),
    },
  ];
}

function buildInlineKeyboard(
  buttons: unknown,
):
  | {
      inline_keyboard: Array<Array<{ text: string; callback_data: string }>>;
    }
  | undefined {
  if (!Array.isArray(buttons) || buttons.length === 0) {
    return undefined;
  }

  return {
    inline_keyboard: [
      buttons
        .filter((button): button is { label: string; callbackData: string } =>
          Boolean(
            button &&
              typeof button === 'object' &&
              'label' in button &&
              'callbackData' in button,
          ),
        )
        .map((button) => ({
          text: button.label,
          callback_data: button.callbackData,
        })),
    ],
  };
}

function signApprovalCallback(
  approvalId: string,
  action: 'approve' | 'reject' | 'postpone' | 'reformulate',
) {
  const secret = process.env.INTERNAL_OPS_CALLBACK_SECRET;
  if (!secret) {
    throw new Error('INTERNAL_OPS_CALLBACK_SECRET is required for Telegram approval buttons.');
  }

  const payload = `ap:${approvalId}:${action}`;
  const signature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
    .slice(0, 12);

  return `${payload}:${signature}`;
}

function normalizeExternalExecutionInput(
  payload: Record<string, unknown>,
  objectiveId: string,
) {
  const input =
    payload.input && typeof payload.input === 'object' && !Array.isArray(payload.input)
      ? { ...(payload.input as Record<string, unknown>) }
      : {};

  return {
    objectiveId,
    ...input,
  };
}

function buildInternalExecutionTags(objectiveId: string, workOrderId: string) {
  return [
    'internal-ops',
    `internal-objective:${objectiveId}`,
    `internal-work-order:${workOrderId}`,
  ];
}

function normalizePayload(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

function asUuid(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asString(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
