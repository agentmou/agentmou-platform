import { createHmac, timingSafeEqual } from 'node:crypto';

import {
  ApprovalIntentSchema,
  InternalOpsResponseSchema,
  OpenClawTurnResultSchema,
  TelegramUpdateSchema,
  type InternalOpsResponse,
  type TelegramUpdate,
  type WorkOrderKind,
} from '@agentmou/contracts';
import {
  approvalRequests,
  db,
  executionRuns,
  internalConversationSessions,
  internalObjectives,
  internalOpenClawSessions,
  internalWorkOrders,
} from '@agentmou/db';
import { getQueue, QUEUE_NAMES, type InternalWorkOrderPayload } from '@agentmou/queue';
import { and, desc, eq } from 'drizzle-orm';

import { getInternalOpsServiceConfig, type InternalOpsServiceConfig } from '../config.js';
import {
  HttpOpenClawAdapter,
  type OpenClawRunner,
} from '../openclaw/openclaw-runner.js';
import {
  InternalOpsPersistence,
  type DecisionRecordInput,
} from './internal-ops-persistence.js';
import { InternalOpsRegistrySynchronizer } from './internal-ops-registry.js';
import { InternalOpsTurnManager } from './internal-ops-turns.js';

interface TelegramRequestMeta {
  secretToken?: string;
}

interface ApprovalCallbackInput {
  approvalId: string;
  decision: 'approved' | 'rejected' | 'postponed' | 'reformulate';
  reason?: string;
  actorLabel?: string;
}

interface InternalOpsServiceOptions {
  config?: InternalOpsServiceConfig;
  tenantId?: string;
  runner?: OpenClawRunner;
  enqueueWorkOrder?: (payload: InternalWorkOrderPayload) => Promise<void>;
  telegramBotToken?: string;
  telegramWebhookSecret?: string;
  callbackSecret?: string;
  allowedChatIds?: string[];
  allowedUserIds?: string[];
}

export class InternalOpsService {
  private readonly tenantId: string;
  private readonly runner: OpenClawRunner;
  private readonly enqueueWorkOrder: (payload: InternalWorkOrderPayload) => Promise<void>;
  private readonly telegramBotToken?: string;
  private readonly telegramWebhookSecret?: string;
  private readonly callbackSecret?: string;
  private readonly allowedChatIds: Set<string>;
  private readonly allowedUserIds: Set<string>;
  private readonly persistence: InternalOpsPersistence;
  private readonly registry: InternalOpsRegistrySynchronizer;
  private readonly turns: InternalOpsTurnManager;

  constructor(options: InternalOpsServiceOptions = {}) {
    const config = options.config ?? getInternalOpsServiceConfig();
    this.tenantId = options.tenantId ?? config.tenantId;
    this.runner =
      options.runner ??
      new HttpOpenClawAdapter({
        baseUrl: config.openClawApiUrl,
        apiKey: config.openClawApiKey,
        timeoutMs: config.openClawTimeoutMs,
      });
    this.enqueueWorkOrder =
      options.enqueueWorkOrder ??
      (async (payload) => {
        await getQueue(QUEUE_NAMES.INTERNAL_WORK_ORDER).add(
          `internal-work-order:${payload.workOrderId}`,
          payload,
        );
      });
    this.telegramBotToken = options.telegramBotToken ?? config.telegramBotToken;
    this.telegramWebhookSecret =
      options.telegramWebhookSecret ?? config.telegramWebhookSecret;
    this.callbackSecret = options.callbackSecret ?? config.callbackSecret;
    this.allowedChatIds = new Set(options.allowedChatIds ?? config.allowedChatIds);
    this.allowedUserIds = new Set(options.allowedUserIds ?? config.allowedUserIds);

    this.persistence = new InternalOpsPersistence(this.tenantId);
    this.registry = new InternalOpsRegistrySynchronizer(this.tenantId, this.runner);
    this.turns = new InternalOpsTurnManager({
      tenantId: this.tenantId,
      enqueueWorkOrder: this.enqueueWorkOrder,
      recordDecision: async (input: DecisionRecordInput) =>
        this.persistence.recordDecision(input),
    });
  }

  async handleTelegramUpdate(
    updateInput: unknown,
    meta: TelegramRequestMeta = {},
  ): Promise<InternalOpsResponse> {
    this.ensureTenantId();
    this.assertTelegramSecret(meta.secretToken);
    await this.registry.sync();

    const update = TelegramUpdateSchema.parse(updateInput);

    if (update.callback_query?.data) {
      return this.handleTelegramCallback(update);
    }

    const text = update.message?.text?.trim();
    const chatId = update.message?.chat.id;
    const userId = update.message?.from?.id;

    if (!text || chatId === undefined || userId === undefined) {
      return InternalOpsResponseSchema.parse({
        ok: true,
        summary: 'Webhook accepted but no actionable Telegram message was found.',
      });
    }

    this.assertTelegramOperator(String(chatId), String(userId));

    const dedupeKey = `telegram:update:${update.update_id}`;
    const existingMessage = await this.persistence.findTelegramMessage(dedupeKey);
    if (existingMessage) {
      return InternalOpsResponseSchema.parse({
        ok: true,
        summary: 'Duplicate Telegram update ignored.',
      });
    }

    const session = await this.persistence.resolveSession(
      String(chatId),
      String(userId),
      text,
    );
    await this.persistence.recordTelegramMessage({
      sessionId: session.id,
      direction: 'inbound',
      mode: 'ack',
      chatId: String(chatId),
      userId: String(userId),
      updateId: update.update_id,
      messageId: update.message?.message_id,
      dedupeKey,
      payload: update,
    });

    const [rootRun] = await db
      .insert(executionRuns)
      .values({
        tenantId: this.tenantId,
        status: 'running',
        triggeredBy: 'agent',
        tags: [
          'internal-ops',
          'telegram',
          `chat:${chatId}`,
          `operator:${userId}`,
        ],
      })
      .returning();

    const [objective] = await db
      .insert(internalObjectives)
      .values({
        tenantId: this.tenantId,
        sessionId: session.id,
        runId: rootRun.id,
        ownerAgentId: 'ceo',
        rootAgentId: 'ceo',
        title: summarizeTitle(text),
        summary: text,
        status: 'active',
        requestedBy: String(userId),
        sourceMessage: text,
        coherenceSummary: {},
      })
      .returning();

    const turnInput = await this.turns.buildTurnInput({
      sessionId: session.id,
      objectiveId: objective.id,
      activeAgentId: 'ceo',
      operatorMessage: text,
      trigger: 'telegram_message',
    });
    const turnResult = OpenClawTurnResultSchema.parse(
      await this.runner.startTurn(turnInput),
    );

    const persistedTurn = await this.turns.persistTurn({
      sessionId: session.id,
      objectiveId: objective.id,
      rootRunId: rootRun.id,
      remoteSessionId: turnResult.remoteSessionId,
      turnResult,
      operatorMessageText: text,
      eventKey: dedupeKey,
      source: 'telegram',
      sourceEventId: String(update.update_id),
    });

    const queuedWorkOrderIds = await this.turns.queueTurnOutputs({
      sessionId: session.id,
      objectiveId: objective.id,
      openclawSessionId: turnResult.remoteSessionId,
      turnResult,
      coherence: persistedTurn.coherence,
      operatorChatId: String(chatId),
      operatorUserId: String(userId),
    });

    return InternalOpsResponseSchema.parse({
      ok: true,
      sessionId: session.id,
      objectiveId: objective.id,
      summary: turnResult.summary,
      approvalRequired: persistedTurn.coherence.reviewRequired,
      queuedWorkOrderIds,
    });
  }

  async handleApprovalCallback(
    input: ApprovalCallbackInput,
  ): Promise<InternalOpsResponse> {
    this.ensureTenantId();

    const [approval] = await db
      .select()
      .from(approvalRequests)
      .where(
        and(
          eq(approvalRequests.id, input.approvalId),
          eq(approvalRequests.tenantId, this.tenantId),
        ),
      );

    if (!approval) {
      return InternalOpsResponseSchema.parse({
        ok: false,
        summary: `Approval ${input.approvalId} was not found.`,
      });
    }

    if (!approval.objectiveId || !approval.workOrderId) {
      return InternalOpsResponseSchema.parse({
        ok: false,
        summary: `Approval ${approval.id} is missing its linked objective or work order.`,
      });
    }

    const [objective] = await db
      .select()
      .from(internalObjectives)
      .where(eq(internalObjectives.id, approval.objectiveId));
    const [workOrder] = await db
      .select()
      .from(internalWorkOrders)
      .where(eq(internalWorkOrders.id, approval.workOrderId));
    const [session] = objective
      ? await db
          .select()
          .from(internalConversationSessions)
          .where(eq(internalConversationSessions.id, objective.sessionId))
      : [];
    const [openclawSession] = objective
      ? await db
          .select()
          .from(internalOpenClawSessions)
          .where(eq(internalOpenClawSessions.objectiveId, objective.id))
          .orderBy(desc(internalOpenClawSessions.createdAt))
      : [];

    if (!objective || !workOrder || !session) {
      return InternalOpsResponseSchema.parse({
        ok: false,
        summary: 'Approval cannot be resolved because the linked state is incomplete.',
      });
    }

    const now = new Date();
    const status =
      input.decision === 'approved'
        ? 'approved'
        : input.decision === 'postponed'
          ? 'pending'
          : 'rejected';

    await db
      .update(approvalRequests)
      .set({
        status,
        decidedAt: input.decision === 'postponed' ? approval.decidedAt : now,
        decisionReason: input.reason,
      })
      .where(eq(approvalRequests.id, approval.id));

    if (input.decision === 'postponed') {
      const notificationId = await this.turns.createNotifyTelegramWorkOrder({
        objectiveId: objective.id,
        sessionId: session.id,
        openclawSessionId:
          objective.openclawSessionId ?? openclawSession?.remoteSessionId,
        agentId: workOrder.agentId,
        chatId: session.externalChatId,
        userId: session.externalUserId,
        mode: 'status',
        text: 'La aprobación queda pospuesta. El sistema mantiene el objetivo en espera.',
      });

      return InternalOpsResponseSchema.parse({
        ok: true,
        sessionId: session.id,
        objectiveId: objective.id,
        summary: `Approval ${input.decision} processed for work order ${workOrder.id}.`,
        approvalRequired: true,
        queuedWorkOrderIds: [notificationId],
      });
    }

    if (input.decision === 'approved') {
      const resumeWorkOrderId =
        workOrder.workType === 'request_human_approval'
          ? workOrder.resumeFromWorkOrderId
          : workOrder.id;

      await db
        .update(internalWorkOrders)
        .set({
          status:
            workOrder.workType === 'request_human_approval'
              ? 'completed'
              : 'queued',
          updatedAt: now,
          completedAt:
            workOrder.workType === 'request_human_approval' ? now : undefined,
        })
        .where(eq(internalWorkOrders.id, workOrder.id));

      await db
        .update(internalObjectives)
        .set({
          status: 'active',
          updatedAt: now,
        })
        .where(eq(internalObjectives.id, objective.id));

      await db
        .update(internalConversationSessions)
        .set({
          status: 'active',
          updatedAt: now,
        })
        .where(eq(internalConversationSessions.id, session.id));

      if (resumeWorkOrderId) {
        const [resumeWorkOrder] = await db
          .select()
          .from(internalWorkOrders)
          .where(eq(internalWorkOrders.id, resumeWorkOrderId));

        if (resumeWorkOrder) {
          await this.enqueueWorkOrder({
            tenantId: this.tenantId,
            objectiveId: objective.id,
            workOrderId: resumeWorkOrder.id,
            workType: resumeWorkOrder.workType as WorkOrderKind,
          });
        }
      }

      const notificationId = await this.turns.createNotifyTelegramWorkOrder({
        objectiveId: objective.id,
        sessionId: session.id,
        openclawSessionId:
          objective.openclawSessionId ?? openclawSession?.remoteSessionId,
        agentId: workOrder.agentId,
        chatId: session.externalChatId,
        userId: session.externalUserId,
        mode: 'status',
        text: 'Aprobación recibida. Reanudo exactamente el work order bloqueado.',
      });

      await this.persistence.recordDecision({
        objectiveId: objective.id,
        workOrderId: workOrder.id,
        agentId: workOrder.agentId,
        outcome: 'approved',
        summary: `Approval ${input.decision}`,
        rationale: input.reason ?? `Decision from ${input.actorLabel ?? 'telegram'}`,
        metadata: { approvalId: approval.id, actorLabel: input.actorLabel },
      });

      return InternalOpsResponseSchema.parse({
        ok: true,
        sessionId: session.id,
        objectiveId: objective.id,
        summary: `Approval ${input.decision} processed for work order ${workOrder.id}.`,
        approvalRequired: false,
        queuedWorkOrderIds: [
          ...(resumeWorkOrderId ? [resumeWorkOrderId] : []),
          notificationId,
        ],
      });
    }

    await db
      .update(internalWorkOrders)
      .set({
        status: 'blocked',
        updatedAt: now,
        completedAt: now,
      })
      .where(eq(internalWorkOrders.id, workOrder.id));

    if (input.decision === 'rejected') {
      await db
        .update(internalObjectives)
        .set({
          status: 'blocked',
          updatedAt: now,
        })
        .where(eq(internalObjectives.id, objective.id));

      await db
        .update(internalConversationSessions)
        .set({
          status: 'blocked',
          updatedAt: now,
        })
        .where(eq(internalConversationSessions.id, session.id));

      await db
        .update(executionRuns)
        .set({
          status: 'failed',
          completedAt: now,
        })
        .where(eq(executionRuns.id, objective.runId));

      if (openclawSession) {
        await this.runner.cancelObjective({
          tenantId: this.tenantId,
          objectiveId: objective.id,
          remoteSessionId: openclawSession.remoteSessionId,
          reason: input.reason ?? 'Operator rejected the action.',
        });
      }

      const notificationId = await this.turns.createNotifyTelegramWorkOrder({
        objectiveId: objective.id,
        sessionId: session.id,
        openclawSessionId:
          objective.openclawSessionId ?? openclawSession?.remoteSessionId,
        agentId: workOrder.agentId,
        chatId: session.externalChatId,
        userId: session.externalUserId,
        mode: 'summary',
        text: 'He detenido el objetivo porque rechazaste la acción crítica.',
      });

      await this.persistence.recordDecision({
        objectiveId: objective.id,
        workOrderId: workOrder.id,
        agentId: workOrder.agentId,
        outcome: 'rejected',
        summary: `Approval ${input.decision}`,
        rationale: input.reason ?? `Decision from ${input.actorLabel ?? 'telegram'}`,
        metadata: { approvalId: approval.id, actorLabel: input.actorLabel },
      });

      return InternalOpsResponseSchema.parse({
        ok: true,
        sessionId: session.id,
        objectiveId: objective.id,
        summary: `Approval ${input.decision} processed for work order ${workOrder.id}.`,
        approvalRequired: false,
        queuedWorkOrderIds: [notificationId],
      });
    }

    const turnInput = await this.turns.buildTurnInput({
      sessionId: session.id,
      objectiveId: objective.id,
      activeAgentId: openclawSession?.activeAgentId ?? objective.ownerAgentId,
      operatorMessage:
        input.reason?.trim() ||
        'Reformulate the plan and produce a safer alternative.',
      trigger: 'approval_resolution',
      remoteSessionId:
        objective.openclawSessionId ?? openclawSession?.remoteSessionId,
      approvalIntent: ApprovalIntentSchema.parse({
        objectiveId: objective.id,
        workOrderId: workOrder.id,
        sessionId: session.id,
        openclawSessionId:
          objective.openclawSessionId ?? openclawSession?.remoteSessionId,
        source: 'telegram',
        requestedAction: 'Reformulate the blocked action.',
        resumeToken: approval.resumeToken ?? `internal-work-order:${workOrder.id}`,
        resumeTarget: 'turn',
        sourceMetadata: {
          approvalId: approval.id,
          actorLabel: input.actorLabel,
        },
      }),
    });

    const turnResult = OpenClawTurnResultSchema.parse(
      await this.runner.continueTurn(turnInput),
    );
    const persistedTurn = await this.turns.persistTurn({
      sessionId: session.id,
      objectiveId: objective.id,
      rootRunId: objective.runId,
      remoteSessionId: turnResult.remoteSessionId,
      turnResult,
      operatorMessageText: input.reason ?? 'Reformulate the blocked action.',
      eventKey: `approval:${approval.id}:reformulate:${Date.now()}`,
      source: 'internal_callback',
      sourceEventId: approval.id,
    });
    const queuedWorkOrderIds = await this.turns.queueTurnOutputs({
      sessionId: session.id,
      objectiveId: objective.id,
      openclawSessionId: turnResult.remoteSessionId,
      turnResult,
      coherence: persistedTurn.coherence,
      operatorChatId: session.externalChatId,
      operatorUserId: session.externalUserId,
    });

    await this.persistence.recordDecision({
      objectiveId: objective.id,
      workOrderId: workOrder.id,
      agentId: workOrder.agentId,
      outcome: 'blocked',
      summary: 'Approval reformulate',
      rationale: input.reason ?? `Decision from ${input.actorLabel ?? 'telegram'}`,
      metadata: { approvalId: approval.id, actorLabel: input.actorLabel },
    });

    return InternalOpsResponseSchema.parse({
      ok: true,
      sessionId: session.id,
      objectiveId: objective.id,
      summary: turnResult.summary,
      approvalRequired: persistedTurn.coherence.reviewRequired,
      queuedWorkOrderIds,
    });
  }

  private async handleTelegramCallback(
    update: TelegramUpdate,
  ): Promise<InternalOpsResponse> {
    const callback = parseSignedApprovalCallback(
      update.callback_query?.data,
      this.callbackSecret,
    );

    if (!callback) {
      await this.answerCallbackQuery(
        update.callback_query?.id,
        'Callback no valida.',
      );
      return InternalOpsResponseSchema.parse({
        ok: false,
        summary: 'Invalid callback payload.',
      });
    }

    const chatId = update.callback_query?.message?.chat.id;
    const userId = update.callback_query?.from.id;

    if (chatId === undefined || userId === undefined) {
      return InternalOpsResponseSchema.parse({
        ok: false,
        summary: 'Callback payload is missing operator context.',
      });
    }

    this.assertTelegramOperator(String(chatId), String(userId));

    const dedupeKey = `telegram:callback:${update.callback_query?.id}`;
    const existingMessage = await this.persistence.findTelegramMessage(dedupeKey);
    if (existingMessage) {
      await this.answerCallbackQuery(update.callback_query?.id, 'Decision already received.');
      return InternalOpsResponseSchema.parse({
        ok: true,
        summary: 'Duplicate Telegram callback ignored.',
      });
    }

    const [approval] = await db
      .select({
        objectiveId: approvalRequests.objectiveId,
      })
      .from(approvalRequests)
      .where(eq(approvalRequests.id, callback.approvalId));
    const objectiveId = approval?.objectiveId ?? undefined;
    const [objective] = objectiveId
      ? await db
          .select()
          .from(internalObjectives)
          .where(eq(internalObjectives.id, objectiveId))
      : [];

    await this.persistence.recordTelegramMessage({
      sessionId: objective?.sessionId,
      objectiveId,
      direction: 'inbound',
      mode: 'callback',
      chatId: String(chatId),
      userId: String(userId),
      callbackQueryId: update.callback_query?.id,
      messageId: update.callback_query?.message?.message_id,
      dedupeKey,
      payload: update,
    });

    await this.answerCallbackQuery(update.callback_query?.id, 'Decision received.');

    return this.handleApprovalCallback({
      approvalId: callback.approvalId,
      decision: callback.decision,
      actorLabel:
        update.callback_query?.from.username ??
        update.callback_query?.from.first_name ??
        String(update.callback_query?.from.id),
    });
  }

  private async answerCallbackQuery(
    callbackQueryId: string | undefined,
    text: string,
  ) {
    if (!callbackQueryId || !this.telegramBotToken) {
      return;
    }

    await fetch(
      `https://api.telegram.org/bot${this.telegramBotToken}/answerCallbackQuery`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          callback_query_id: callbackQueryId,
          text,
          show_alert: false,
        }),
      },
    );
  }

  private assertTelegramSecret(secretToken?: string) {
    if (
      this.telegramWebhookSecret &&
      secretToken !== this.telegramWebhookSecret
    ) {
      throw new Error('Invalid Telegram webhook secret.');
    }
  }

  private assertTelegramOperator(chatId: string, userId: string) {
    if (this.allowedChatIds.size > 0 && !this.allowedChatIds.has(chatId)) {
      throw new Error(`Chat ${chatId} is not authorized for internal ops.`);
    }

    if (this.allowedUserIds.size > 0 && !this.allowedUserIds.has(userId)) {
      throw new Error(`User ${userId} is not authorized for internal ops.`);
    }
  }

  private ensureTenantId() {
    if (!this.tenantId) {
      throw new Error(
        'INTERNAL_OPS_TENANT_ID must be configured to use the internal ops service.',
      );
    }
  }
}

function summarizeTitle(messageText: string) {
  const collapsed = messageText.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= 80) {
    return collapsed;
  }
  return `${collapsed.slice(0, 77)}...`;
}

function parseSignedApprovalCallback(
  data: string | undefined,
  secret: string | undefined,
): {
  approvalId: string;
  decision: 'approved' | 'rejected' | 'postponed' | 'reformulate';
} | null {
  if (!data || !secret) {
    return null;
  }

  const match = /^ap:([a-f0-9-]+):(approve|reject|postpone|reformulate):([a-f0-9]{12})$/i.exec(
    data,
  );

  if (!match) {
    return null;
  }

  const payload = `ap:${match[1]}:${match[2]}`;
  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
    .slice(0, 12);

  const received = Buffer.from(match[3], 'utf8');
  const expected = Buffer.from(expectedSignature, 'utf8');

  if (received.length !== expected.length) {
    return null;
  }

  if (!timingSafeEqual(received, expected)) {
    return null;
  }

  return {
    approvalId: match[1],
    decision:
      match[2] === 'approve'
        ? 'approved'
        : match[2] === 'reject'
          ? 'rejected'
          : match[2] === 'postpone'
            ? 'postponed'
            : 'reformulate',
  };
}
