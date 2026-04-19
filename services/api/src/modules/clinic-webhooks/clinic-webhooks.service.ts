import type { FastifyRequest } from 'fastify';
import { clinicChannels, db, webhookEvents } from '@agentmou/db';
import { eq } from 'drizzle-orm';
import { normalizePhoneAddress, resolveClinicChannelAdapter } from '@agentmou/connectors';
import type { RetellToolCallWebhookPayload } from '@agentmou/contracts';

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

    if (
      channel &&
      !adapter.validateWebhookSignature({ url: getRequestUrl(request), payload, signature })
    ) {
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

  private extractLookupPhone(
    payload: Record<string, string | number | boolean | null | undefined>
  ) {
    return normalizePhoneAddress(
      typeof payload.To === 'string'
        ? payload.To
        : typeof payload.From === 'string'
          ? payload.From
          : undefined
    );
  }

  async handleRetellToolCall(
    body: RetellToolCallWebhookPayload,
    _signature?: string | null
  ): Promise<{ result: string }> {
    const channel = await this.resolveRetellChannel(body.call_id);
    if (!channel?.tenantId) {
      return { result: 'Canal no configurado.' };
    }

    // Delegate to the shared tool registry. The import is dynamic to avoid
    // a hard dependency from API on the worker tool modules at startup.
    try {
      const { executeReceptionistTool } = await import('../../lib/ai-tool-bridge.js');
      const toolResult = await executeReceptionistTool({
        tenantId: channel.tenantId,
        toolName: body.tool_name,
        args: body.args as Record<string, unknown>,
        callId: body.call_id,
      });
      return { result: toolResult };
    } catch {
      return { result: 'Error procesando la solicitud.' };
    }
  }

  async handleRetellPostCall(request: FastifyRequest, signature?: string | null) {
    const payload = toRecord(request.body);
    const callId = typeof payload.call_id === 'string' ? payload.call_id : undefined;
    const channel = callId ? await this.resolveRetellChannel(callId) : null;

    const adapter = resolveClinicChannelAdapter(
      channel
        ? mapChannel(channel)
        : {
            id: 'fallback-retell',
            tenantId: 'unknown',
            channelType: 'voice',
            directionPolicy: {},
            provider: 'retell_voice',
            connectorAccountId: null,
            status: 'active',
            phoneNumber: null,
            config: {},
            createdAt: new Date(0).toISOString(),
            updatedAt: new Date(0).toISOString(),
          },
      { allowMockFallback: process.env.NODE_ENV !== 'production' }
    );

    if (
      channel &&
      !adapter.validateWebhookSignature({
        url: getRequestUrl(request),
        payload,
        signature,
      })
    ) {
      throw Object.assign(new Error('Invalid Retell webhook signature'), {
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
        type: `voice.${normalized.eventKind}`,
        signature: signature ?? null,
        payload: { raw: payload, normalized },
      })
      .returning();

    if (channel?.tenantId) {
      await this.automation.enqueueChannelEvent(created.id);
    }

    return { ok: true, duplicate: false, ignored: !channel?.tenantId };
  }

  private async resolveRetellChannel(_callId: string) {
    const channels = await db
      .select()
      .from(clinicChannels)
      .where(eq(clinicChannels.provider, 'retell_voice'));

    if (channels.length === 0) return null;
    return (
      channels.find((c) => c.status === 'active') ??
      [...channels].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]
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

    const channels = await db
      .select()
      .from(clinicChannels)
      .where(eq(clinicChannels.channelType, channelType));
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
