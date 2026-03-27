import {
  db,
  internalConversationSessions,
  internalDecisions,
  internalTelegramMessages,
} from '@agentmou/db';
import { and, eq } from 'drizzle-orm';

export interface DecisionRecordInput {
  objectiveId: string;
  workOrderId?: string;
  agentId: string;
  outcome: 'queued' | 'approved' | 'rejected' | 'completed' | 'blocked';
  summary: string;
  rationale: string;
  metadata?: Record<string, unknown>;
}

export interface TelegramMessageRecordInput {
  sessionId?: string;
  objectiveId?: string;
  direction: 'inbound' | 'outbound';
  mode: 'ack' | 'status' | 'approval' | 'summary' | 'callback';
  chatId: string;
  userId?: string;
  updateId?: number;
  messageId?: number;
  callbackQueryId?: string;
  dedupeKey: string;
  payload: Record<string, unknown>;
  deliveredAt?: Date;
}

export class InternalOpsPersistence {
  constructor(private readonly tenantId: string) {}

  async resolveSession(
    externalChatId: string,
    externalUserId: string,
    messageText: string,
  ) {
    const [session] = await db
      .select()
      .from(internalConversationSessions)
      .where(
        and(
          eq(internalConversationSessions.tenantId, this.tenantId),
          eq(internalConversationSessions.channel, 'telegram'),
          eq(internalConversationSessions.externalChatId, externalChatId),
          eq(internalConversationSessions.externalUserId, externalUserId),
        ),
      );

    if (session) {
      await db
        .update(internalConversationSessions)
        .set({
          lastMessage: messageText,
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(internalConversationSessions.id, session.id));

      return session;
    }

    const [created] = await db
      .insert(internalConversationSessions)
      .values({
        tenantId: this.tenantId,
        channel: 'telegram',
        externalChatId,
        externalUserId,
        status: 'active',
        lastMessage: messageText,
      })
      .returning();

    return created;
  }

  async findTelegramMessage(dedupeKey: string) {
    const [message] = await db
      .select()
      .from(internalTelegramMessages)
      .where(eq(internalTelegramMessages.dedupeKey, dedupeKey));

    return message;
  }

  async recordTelegramMessage(input: TelegramMessageRecordInput) {
    await db.insert(internalTelegramMessages).values({
      tenantId: this.tenantId,
      sessionId: input.sessionId,
      objectiveId: input.objectiveId,
      direction: input.direction,
      mode: input.mode,
      chatId: input.chatId,
      userId: input.userId,
      updateId: input.updateId,
      messageId: input.messageId,
      callbackQueryId: input.callbackQueryId,
      dedupeKey: input.dedupeKey,
      payload: input.payload,
      deliveredAt: input.deliveredAt,
    });
  }

  async recordDecision(input: DecisionRecordInput) {
    await db.insert(internalDecisions).values({
      tenantId: this.tenantId,
      objectiveId: input.objectiveId,
      workOrderId: input.workOrderId,
      agentId: input.agentId,
      outcome: input.outcome,
      summary: input.summary,
      rationale: input.rationale,
      metadata: input.metadata ?? {},
    });
  }
}
