import type { ChannelType, UpdateClinicChannelBody } from '@agentmou/contracts';

import { recordAuditEvent } from '../../lib/audit.js';
import { assertClinicRole } from '../clinic-shared/clinic-access.js';
import { mapClinicChannel } from '../clinic-shared/clinic.mapper.js';
import { ClinicChannelsRepository } from './clinic-channels.repository.js';

export class ClinicChannelsService {
  constructor(private readonly repository = new ClinicChannelsRepository()) {}

  async listChannels(tenantId: string, tenantRole?: string) {
    assertClinicRole(tenantRole, 'read');
    const channels = await this.repository.listChannels(tenantId);
    return channels.map(mapClinicChannel);
  }

  async updateChannel(
    tenantId: string,
    channelType: ChannelType,
    body: UpdateClinicChannelBody,
    actorId?: string,
    tenantRole?: string
  ) {
    assertClinicRole(tenantRole, 'manage');
    const channel = await this.repository.updateChannel(tenantId, channelType, body);

    if (!channel) {
      return null;
    }

    await recordAuditEvent({
      tenantId,
      actorId,
      action: 'clinic.channel.updated',
      category: 'connector',
      details: {
        channelType,
        status: channel.status,
        provider: channel.provider,
      },
    });

    return mapClinicChannel(channel);
  }
}
