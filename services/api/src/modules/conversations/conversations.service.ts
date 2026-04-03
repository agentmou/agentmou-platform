import type {
  AssignConversationBody,
  ConversationFilters,
  EscalateConversationBody,
  ReplyConversationBody,
  ResolveConversationBody,
} from '@agentmou/contracts';

import { recordAuditEvent } from '../../lib/audit.js';
import { assertClinicModuleAvailable, assertClinicRole, getClinicListLimit } from '../clinic-shared/clinic-access.js';
import { mapConversationMessage } from '../clinic-shared/clinic.mapper.js';
import { ConversationsRepository } from './conversations.repository.js';

export class ConversationsService {
  constructor(private readonly repository = new ConversationsRepository()) {}

  async listThreads(tenantId: string, filters: ConversationFilters, tenantRole?: string) {
    assertClinicRole(tenantRole, 'read');
    await assertClinicModuleAvailable(tenantId, 'core_reception');
    return this.repository.listThreads(tenantId, {
      ...filters,
      limit: getClinicListLimit(filters.limit),
    });
  }

  async getThread(tenantId: string, threadId: string, tenantRole?: string) {
    assertClinicRole(tenantRole, 'read');
    await assertClinicModuleAvailable(tenantId, 'core_reception');
    return this.repository.getThread(tenantId, threadId);
  }

  async listMessages(tenantId: string, threadId: string, tenantRole?: string) {
    assertClinicRole(tenantRole, 'read');
    await assertClinicModuleAvailable(tenantId, 'core_reception');
    const messages = await this.repository.listMessages(tenantId, threadId);
    return messages.map(mapConversationMessage);
  }

  async assignThread(
    tenantId: string,
    threadId: string,
    body: AssignConversationBody,
    actorId?: string,
    tenantRole?: string
  ) {
    assertClinicRole(tenantRole, 'operate');
    await assertClinicModuleAvailable(tenantId, 'core_reception');
    const thread = await this.repository.assignThread(tenantId, threadId, body);
    if (!thread) {
      return null;
    }

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'clinic.conversation.assigned',
      category: 'approval',
      details: {
        threadId,
        assignedUserId: body.assignedUserId,
        note: body.note,
      },
    });

    return this.repository.getThread(tenantId, threadId);
  }

  async escalateThread(
    tenantId: string,
    threadId: string,
    body: EscalateConversationBody,
    actorId?: string,
    tenantRole?: string
  ) {
    assertClinicRole(tenantRole, 'operate');
    await assertClinicModuleAvailable(tenantId, 'core_reception');
    const thread = await this.repository.escalateThread(tenantId, threadId, body);
    if (!thread) {
      return null;
    }

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'clinic.conversation.escalated',
      category: 'approval',
      details: {
        threadId,
        assignedUserId: body.assignedUserId,
        reason: body.reason,
      },
    });

    return this.repository.getThread(tenantId, threadId);
  }

  async resolveThread(
    tenantId: string,
    threadId: string,
    body: ResolveConversationBody,
    actorId?: string,
    tenantRole?: string
  ) {
    assertClinicRole(tenantRole, 'operate');
    await assertClinicModuleAvailable(tenantId, 'core_reception');
    const thread = await this.repository.resolveThread(tenantId, threadId, body);
    if (!thread) {
      return null;
    }

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'clinic.conversation.resolved',
      category: 'approval',
      details: {
        threadId,
        resolution: body.resolution,
      },
    });

    return this.repository.getThread(tenantId, threadId);
  }

  async replyToThread(
    tenantId: string,
    threadId: string,
    body: ReplyConversationBody,
    actorId?: string,
    tenantRole?: string
  ) {
    assertClinicRole(tenantRole, 'operate');
    await assertClinicModuleAvailable(tenantId, 'core_reception');
    const thread = await this.repository.replyToThread(tenantId, threadId, body);
    if (!thread) {
      return null;
    }

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'clinic.conversation.replied',
      category: 'approval',
      details: {
        threadId,
        channelType: body.channelType,
        messageType: body.messageType,
      },
    });

    return this.repository.getThread(tenantId, threadId);
  }
}
