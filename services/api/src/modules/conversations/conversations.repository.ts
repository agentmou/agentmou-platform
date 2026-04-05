import { conversationMessages, conversationThreads, db } from '@agentmou/db';
import type {
  AssignConversationBody,
  ConversationFilters,
  EscalateConversationBody,
  ReplyConversationBody,
  ResolveConversationBody,
} from '@agentmou/contracts';
import { and, desc, eq } from 'drizzle-orm';

import { ClinicReadModelsRepository } from '../clinic-shared/clinic-read-models.repository.js';

type DatabaseClient = typeof db;

export class ConversationsRepository {
  private readonly readModels: ClinicReadModelsRepository;

  constructor(private readonly database: DatabaseClient = db) {
    this.readModels = new ClinicReadModelsRepository(database);
  }

  async listThreads(tenantId: string, filters: ConversationFilters) {
    const rows = await this.database
      .select()
      .from(conversationThreads)
      .where(eq(conversationThreads.tenantId, tenantId))
      .orderBy(desc(conversationThreads.lastMessageAt), desc(conversationThreads.createdAt));

    const filtered = rows.filter((row) => matchesConversationFilters(row, filters));
    const threads = await this.readModels.loadConversationListItems(tenantId, filtered);

    return {
      threads: threads.slice(0, filters.limit ?? 50),
      total: threads.length,
    };
  }

  async getThread(tenantId: string, threadId: string) {
    const [thread] = await this.database
      .select()
      .from(conversationThreads)
      .where(and(eq(conversationThreads.tenantId, tenantId), eq(conversationThreads.id, threadId)))
      .limit(1);

    if (!thread) {
      return null;
    }

    return this.readModels.loadConversationDetail(tenantId, thread);
  }

  async listMessages(tenantId: string, threadId: string) {
    const rows = await this.database
      .select()
      .from(conversationMessages)
      .where(
        and(eq(conversationMessages.tenantId, tenantId), eq(conversationMessages.threadId, threadId))
      )
      .orderBy(conversationMessages.createdAt);

    return rows;
  }

  async assignThread(tenantId: string, threadId: string, body: AssignConversationBody) {
    const [thread] = await this.database
      .update(conversationThreads)
      .set({
        assignedUserId: body.assignedUserId,
        status: 'pending_human',
        requiresHumanReview: true,
        updatedAt: new Date(),
      })
      .where(and(eq(conversationThreads.tenantId, tenantId), eq(conversationThreads.id, threadId)))
      .returning();

    return thread ?? null;
  }

  async escalateThread(tenantId: string, threadId: string, body: EscalateConversationBody) {
    const [thread] = await this.database
      .update(conversationThreads)
      .set({
        assignedUserId: body.assignedUserId ?? null,
        status: 'escalated',
        requiresHumanReview: true,
        updatedAt: new Date(),
      })
      .where(and(eq(conversationThreads.tenantId, tenantId), eq(conversationThreads.id, threadId)))
      .returning();

    return thread ?? null;
  }

  async resolveThread(tenantId: string, threadId: string, body: ResolveConversationBody) {
    const [thread] = await this.database
      .update(conversationThreads)
      .set({
        status: 'resolved',
        resolution: body.resolution,
        requiresHumanReview: body.requiresHumanReview ?? false,
        updatedAt: new Date(),
      })
      .where(and(eq(conversationThreads.tenantId, tenantId), eq(conversationThreads.id, threadId)))
      .returning();

    return thread ?? null;
  }

  async replyToThread(tenantId: string, threadId: string, body: ReplyConversationBody) {
    const [thread] = await this.database
      .select()
      .from(conversationThreads)
      .where(and(eq(conversationThreads.tenantId, tenantId), eq(conversationThreads.id, threadId)))
      .limit(1);

    if (!thread) {
      return null;
    }

    const now = new Date();

    const [message] = await this.database.insert(conversationMessages).values({
      tenantId,
      threadId,
      patientId: thread.patientId,
      direction: 'outbound',
      channelType: body.channelType ?? thread.channelType,
      messageType: body.messageType ?? 'text',
      body: body.body,
      payload: {
        ...(body.payload ?? {}),
        automationKind: 'conversation_reply',
      },
      deliveryStatus: 'queued',
    }).returning();

    const [updatedThread] = await this.database
      .update(conversationThreads)
      .set({
        status: 'in_progress',
        lastMessageAt: now,
        updatedAt: now,
      })
      .where(and(eq(conversationThreads.tenantId, tenantId), eq(conversationThreads.id, threadId)))
      .returning();

    if (!updatedThread || !message) {
      return null;
    }

    return {
      thread: updatedThread,
      messageId: message.id,
    };
  }
}

function matchesConversationFilters(
  row: typeof conversationThreads.$inferSelect,
  filters: ConversationFilters
) {
  if (filters.channelType && row.channelType !== filters.channelType) {
    return false;
  }

  if (filters.status && row.status !== filters.status) {
    return false;
  }

  if (filters.priority && row.priority !== filters.priority) {
    return false;
  }

  if (filters.intent && row.intent !== filters.intent) {
    return false;
  }

  if (filters.assignedUserId && row.assignedUserId !== filters.assignedUserId) {
    return false;
  }

  if (
    typeof filters.requiresHumanReview === 'boolean' &&
    row.requiresHumanReview !== filters.requiresHumanReview
  ) {
    return false;
  }

  if (filters.search) {
    const needle = filters.search.toLowerCase();
    const haystack = [row.intent, row.source, row.resolution ?? ''].join(' ').toLowerCase();
    if (!haystack.includes(needle)) {
      return false;
    }
  }

  return true;
}
