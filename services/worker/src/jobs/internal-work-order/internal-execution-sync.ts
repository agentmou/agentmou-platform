import { getQueue, QUEUE_NAMES } from '@agentmou/queue';
import {
  db,
  executionRuns,
  internalArtifacts,
  internalConversationSessions,
  internalDecisions,
  internalObjectives,
  internalWorkOrders,
} from '@agentmou/db';
import { and, eq } from 'drizzle-orm';

export async function syncInternalExecutionRunResult(input: {
  runId: string;
  status: 'success' | 'failed';
  source: 'agent_installation' | 'workflow_installation';
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  const [run] = await db
    .select()
    .from(executionRuns)
    .where(eq(executionRuns.id, input.runId));

  if (!run) {
    return;
  }

  const context = parseInternalExecutionTags(run.tags);
  if (!context?.objectiveId || !context.workOrderId) {
    return;
  }

  const [objective] = await db
    .select()
    .from(internalObjectives)
    .where(eq(internalObjectives.id, context.objectiveId));
  const [workOrder] = await db
    .select()
    .from(internalWorkOrders)
    .where(eq(internalWorkOrders.id, context.workOrderId));

  if (!objective || !workOrder) {
    return;
  }

  const artifactTitle =
    input.source === 'agent_installation'
      ? `Agent run summary for ${objective.title}`
      : `Workflow run summary for ${objective.title}`;

  await db.insert(internalArtifacts).values({
    tenantId: objective.tenantId,
    objectiveId: objective.id,
    workOrderId: workOrder.id,
    executionRunId: input.runId,
    agentId: workOrder.agentId,
    artifactType: 'execution_run_summary',
    title: artifactTitle,
    content: input.summary,
    metadata: input.metadata ?? {},
  });

  await db.insert(internalDecisions).values({
    tenantId: objective.tenantId,
    objectiveId: objective.id,
    workOrderId: workOrder.id,
    agentId: workOrder.agentId,
    outcome: input.status === 'success' ? 'completed' : 'blocked',
    summary: artifactTitle,
    rationale: input.summary.slice(0, 500),
    metadata: input.metadata ?? {},
  });

  await db
    .update(internalWorkOrders)
    .set({
      status: input.status === 'success' ? 'completed' : 'blocked',
      updatedAt: new Date(),
      completedAt: new Date(),
    })
    .where(eq(internalWorkOrders.id, workOrder.id));

  if (input.status === 'failed') {
    await db
      .update(internalObjectives)
      .set({
        status: 'blocked',
        updatedAt: new Date(),
      })
      .where(eq(internalObjectives.id, objective.id));
  }

  await queueSummaryNotification({
    tenantId: objective.tenantId,
    objectiveId: objective.id,
    agentId: workOrder.agentId,
    openclawSessionId: workOrder.openclawSessionId ?? undefined,
    text:
      input.status === 'success'
        ? `La ejecución externa terminó bien. ${input.summary}`
        : `La ejecución externa falló. ${input.summary}`,
  });
}

function parseInternalExecutionTags(rawTags: unknown) {
  if (!Array.isArray(rawTags)) {
    return null;
  }

  const tags = rawTags.filter((item): item is string => typeof item === 'string');
  const objectiveTag = tags.find((tag) => tag.startsWith('internal-objective:'));
  const workOrderTag = tags.find((tag) => tag.startsWith('internal-work-order:'));

  if (!objectiveTag || !workOrderTag) {
    return null;
  }

  return {
    objectiveId: objectiveTag.replace('internal-objective:', ''),
    workOrderId: workOrderTag.replace('internal-work-order:', ''),
  };
}

async function queueSummaryNotification(input: {
  tenantId: string;
  objectiveId: string;
  agentId: string;
  openclawSessionId?: string;
  text: string;
}) {
  const [objective] = await db
    .select()
    .from(internalObjectives)
    .where(eq(internalObjectives.id, input.objectiveId));

  if (!objective) {
    return;
  }

  const dedupeTitle = 'Telegram status';

  const [existingNotification] = await db
    .select()
    .from(internalWorkOrders)
    .where(
      and(
        eq(internalWorkOrders.objectiveId, input.objectiveId),
        eq(internalWorkOrders.workType, 'notify_telegram'),
        eq(internalWorkOrders.title, dedupeTitle),
      ),
    );

  const [session] = await db
    .select()
    .from(internalConversationSessions)
    .where(eq(internalConversationSessions.id, objective.sessionId));

  if (!session) {
    return;
  }

  if (existingNotification) {
    return;
  }

  const [workOrder] = await db
    .insert(internalWorkOrders)
    .values({
      tenantId: input.tenantId,
      objectiveId: input.objectiveId,
      agentId: input.agentId,
      workType: 'notify_telegram',
      status: 'queued',
      executionTarget: 'telegram',
      openclawSessionId: input.openclawSessionId,
      title: dedupeTitle,
      summary: input.text,
      requiresApproval: false,
      payload: {
        mode: 'status',
        text: input.text,
        chatId: session.externalChatId,
        userId: session.externalUserId,
        buttons: [],
      },
    })
    .returning();

  await getQueue(QUEUE_NAMES.INTERNAL_WORK_ORDER).add(
    `internal-work-order:${workOrder.id}`,
    {
      tenantId: input.tenantId,
      objectiveId: input.objectiveId,
      workOrderId: workOrder.id,
      workType: 'notify_telegram',
    },
  );
}
