import type { CallFilters, CallbackCallBody, ResolveCallBody } from '@agentmou/contracts';

import { recordAuditEvent } from '../../lib/audit.js';
import {
  assertClinicChannelAvailable,
  assertClinicModuleAvailable,
  assertClinicRole,
  getClinicListLimit,
} from '../clinic-shared/clinic-access.js';
import { mapCallSession } from '../clinic-shared/clinic.mapper.js';
import { CallsRepository } from './calls.repository.js';

export class CallsService {
  constructor(private readonly repository = new CallsRepository()) {}

  async listCalls(tenantId: string, filters: CallFilters, tenantRole?: string) {
    assertClinicRole(tenantRole, 'read');
    await assertClinicModuleAvailable(tenantId, 'voice');
    await assertClinicChannelAvailable(tenantId, 'voice');
    const result = await this.repository.listCalls(tenantId, {
      ...filters,
      limit: getClinicListLimit(filters.limit),
    });

    return {
      calls: result.calls.map(mapCallSession),
      total: result.total,
    };
  }

  async getCall(tenantId: string, callId: string, tenantRole?: string) {
    assertClinicRole(tenantRole, 'read');
    await assertClinicModuleAvailable(tenantId, 'voice');
    await assertClinicChannelAvailable(tenantId, 'voice');
    return this.repository.getCall(tenantId, callId);
  }

  async scheduleCallback(
    tenantId: string,
    callId: string,
    body: CallbackCallBody,
    actorId?: string,
    tenantRole?: string
  ) {
    assertClinicRole(tenantRole, 'operate');
    await assertClinicModuleAvailable(tenantId, 'voice');
    await assertClinicChannelAvailable(tenantId, 'voice');
    const call = await this.repository.scheduleCallback(tenantId, callId, body);
    if (!call) {
      return null;
    }

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'clinic.call.callback_requested',
      category: 'connector',
      details: {
        callId,
        scheduledAt: body.scheduledAt,
        notes: body.notes,
      },
    });

    return this.repository.getCall(tenantId, callId);
  }

  async resolveCall(
    tenantId: string,
    callId: string,
    body: ResolveCallBody,
    actorId?: string,
    tenantRole?: string
  ) {
    assertClinicRole(tenantRole, 'operate');
    await assertClinicModuleAvailable(tenantId, 'voice');
    await assertClinicChannelAvailable(tenantId, 'voice');
    const call = await this.repository.resolveCall(tenantId, callId, body);
    if (!call) {
      return null;
    }

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'clinic.call.resolved',
      category: 'connector',
      details: {
        callId,
        resolution: body.resolution,
      },
    });

    return this.repository.getCall(tenantId, callId);
  }
}
