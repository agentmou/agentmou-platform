import type { FastifyRequest } from 'fastify';
import { clinicChannels, db, webhookEvents } from '@agentmou/db';
import { eq } from 'drizzle-orm';
import { normalizePhoneAddress, resolveClinicChannelAdapter } from '@agentmou/connectors';

import { ClinicAutomationService } from '../clinic-shared/clinic-automation.service.js';

function toRecord(value: unknown): Record<string, string | number | boolean | null | undefined> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return { ...(value as Record<string, string | number | boolean | null | undefined>) };
}

function mapChannel(row: typeof clinicChannels.$inferSelect) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    channelType: row.channelType as 'whatsapp' | 'voice',
    directionPolicy: (typeof row.directionPolicy === 'object' && row.directionPolicy !== null
      ? { ...(row.directionPolicy as Record<string, unknown>) }
      : {}) as Record<string, unknown>,
    provider: row.provider,
    connectorAccountId: row.connectorAccountId ?? null,
    status: row.status as 'active' | 'inactive' | 'error',
    phoneNumber: row.phoneNumber ?? null,
    config:
      typeof row.config === 'object' && row.config !== null
        ? { ...(row.config as Record<string, unknown>) }
        : {},
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function getRequestUrl(request: FastifyRequest) {
  const host = request.headers.host ?? 'localhost';
  const protocol = request.protocol ?? 'http';
  return `${protocol}://${host}${request.url}`;
}

export class ClinicWebhooksService {
  constructor(private readonly automation = new ClinicAutomationService()) {}

  async handleTwilioWebhook(
    channelType: 'whatsapp' | 'voice',
    request: FastifyRequest,
    signature?: string | null
  ) {
    const payload = toRecord(request.body);
    const channel = await this.resolveChannel(channelType, payload);
    const adapter = resolveClinicChannelAdapter(
      channel
        ? mapChannel(channel)
        : {
            id: `fallback-${channelType}`,
            tenantId: 'unknown',
            channelType,
            directionPolicy: {},
            provider: channelType === 'voice' ? 'mock_voice' : 'mock_whatsapp',
            connectorAccountId: null,
            status: 'active',
            phoneNumber: this.extractLookupPhone(payload),
            config: {},
            createdAt: new Date(0).toISOString(),
            updatedAt: new Date(0).toISOString(),
          },
      {
        allowMockFallback: process.env.NODE_ENV !== 'production' || !channel,
      }
    );

    if (channel && !adapter.validateWebhookSignature({ url: getRequestUrl(request), payload, signature })) {
      throw Object.assign(new Error('Invalid Twilio webhook signature'), {
        statusCode: 401,
      });
    }

    const normalized = adapter.parseWebhookEvent({
      url: getRequestUrl(request),
      payload,
      signature,
    });

    const [existing] = await db
      .select()
      .from(webhookEvents)
      .where(eq(webhookEvents.providerEventId, normalized.eventId))
      .limit(1);

    if (existing) {
      return { ok: true, duplicate: true };
    }

    const [created] = await db
      .insert(webhookEvents)
      .values({
        provider: normalized.provider,
        providerEventId: normalized.eventId,
        tenantId: channel?.tenantId ?? null,
        type: `${channelType}.${normalized.eventKind}`,
        signature: signature ?? null,
        payload: {
          raw: payload,
          normalized,
        },
      })
      .returning();

    if (channel?.tenantId) {
      await this.automation.enqueueChannelEvent(created.id);
    }

    return {
      ok: true,
      duplicate: false,
      ignored: !channel?.tenantId,
    };
  }

  private extractLookupPhone(payload: Record<string, string | number | boolean | null | undefined>) {
    return normalizePhoneAddress(
      typeof payload.To === 'string'
        ? payload.To
        : typeof payload.From === 'string'
          ? payload.From
          : undefined
    );
  }

  private async resolveChannel(
    channelType: 'whatsapp' | 'voice',
    payload: Record<string, string | number | boolean | null | undefined>
  ) {
    const targetNumbers = [
      typeof payload.To === 'string' ? normalizePhoneAddress(payload.To) : null,
      typeof payload.From === 'string' ? normalizePhoneAddress(payload.From) : null,
    ].filter((value): value is string => Boolean(value));

    if (targetNumbers.length === 0) {
      return null;
    }

    const channels = await db.select().from(clinicChannels).where(eq(clinicChannels.channelType, channelType));
    const matching = channels.filter((candidate) => {
      const phone = normalizePhoneAddress(candidate.phoneNumber ?? undefined);
      return Boolean(phone && targetNumbers.includes(phone));
    });

    if (matching.length === 0) {
      return null;
    }

    return (
      matching.find((candidate) => candidate.status === 'active') ??
      [...matching].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0]
    );
  }
}
