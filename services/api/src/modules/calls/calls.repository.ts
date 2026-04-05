import { callSessions, conversationThreads, db } from '@agentmou/db';
import type { CallFilters, CallbackCallBody, ResolveCallBody } from '@agentmou/contracts';
import { and, desc, eq } from 'drizzle-orm';

import { ClinicReadModelsRepository } from '../clinic-shared/clinic-read-models.repository.js';

type DatabaseClient = typeof db;

export class CallsRepository {
  private readonly readModels: ClinicReadModelsRepository;

  constructor(private readonly database: DatabaseClient = db) {
    this.readModels = new ClinicReadModelsRepository(database);
  }

  async listCalls(tenantId: string, filters: CallFilters) {
    const rows = await this.database
      .select()
      .from(callSessions)
      .where(eq(callSessions.tenantId, tenantId))
      .orderBy(desc(callSessions.startedAt));

    const calls = rows.filter((row) => matchesCallFilters(row, filters));

    return {
      calls: calls.slice(0, filters.limit ?? 50).map((row) => row),
      total: calls.length,
    };
  }

  async getCall(tenantId: string, callId: string) {
    const [call] = await this.database
      .select()
      .from(callSessions)
      .where(and(eq(callSessions.tenantId, tenantId), eq(callSessions.id, callId)))
      .limit(1);

    if (!call) {
      return null;
    }

    return this.readModels.loadCallDetail(tenantId, call);
  }

  async scheduleCallback(tenantId: string, callId: string, body: CallbackCallBody) {
    const [call] = await this.database
      .update(callSessions)
      .set({
        status: 'callback_required',
        requiresHumanReview: true,
        resolution: body.notes ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(callSessions.tenantId, tenantId), eq(callSessions.id, callId)))
      .returning();

    if (!call) {
      return null;
    }

    if (call.threadId) {
      await this.database
        .update(conversationThreads)
        .set({
          status: 'pending_human',
          requiresHumanReview: true,
          updatedAt: new Date(),
        })
        .where(
          and(eq(conversationThreads.tenantId, tenantId), eq(conversationThreads.id, call.threadId))
        );
    }

    return call;
  }

  async resolveCall(tenantId: string, callId: string, body: ResolveCallBody) {
    const [call] = await this.database
      .update(callSessions)
      .set({
        status: 'closed',
        resolution: body.resolution,
        requiresHumanReview: body.requiresHumanReview ?? false,
        updatedAt: new Date(),
      })
      .where(and(eq(callSessions.tenantId, tenantId), eq(callSessions.id, callId)))
      .returning();

    return call ?? null;
  }
}

function matchesCallFilters(row: typeof callSessions.$inferSelect, filters: CallFilters) {
  if (filters.channelType && filters.channelType !== 'voice') {
    return false;
  }

  if (filters.status && row.status !== filters.status) {
    return false;
  }

  if (filters.patientId && row.patientId !== filters.patientId) {
    return false;
  }

  if (filters.from && row.startedAt.toISOString() < filters.from) {
    return false;
  }

  if (filters.to && row.startedAt.toISOString() > filters.to) {
    return false;
  }

  return true;
}
