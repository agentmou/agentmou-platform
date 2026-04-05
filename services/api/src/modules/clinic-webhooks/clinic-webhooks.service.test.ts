import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  channels: [] as Array<Record<string, unknown>>,
  events: [] as Array<Record<string, unknown>>,
}));

const mockEq = vi.hoisted(() => vi.fn((field, value) => ({ field, value })));

vi.mock('drizzle-orm', () => ({
  eq: mockEq,
}));

vi.mock('@agentmou/db', () => {
  const clinicChannels = {
    id: 'id',
    tenantId: 'tenantId',
    channelType: 'channelType',
    phoneNumber: 'phoneNumber',
    status: 'status',
    updatedAt: 'updatedAt',
  };

  const webhookEvents = {
    id: 'id',
    providerEventId: 'providerEventId',
  };

  return {
    clinicChannels,
    webhookEvents,
    db: {
      select: () => ({
        from: (table: unknown) => ({
          where: (condition: { value: string }) => {
            if (table === clinicChannels) {
              return Promise.resolve(
                state.channels.filter((row) => row.channelType === condition.value)
              );
            }

            if (table === webhookEvents) {
              return {
                limit: vi
                  .fn()
                  .mockResolvedValue(
                    state.events.filter((row) => row.providerEventId === condition.value).slice(0, 1)
                  ),
              };
            }

            return {
              limit: vi.fn().mockResolvedValue([]),
            };
          },
        }),
      }),
      insert: (table: unknown) => ({
        values: (value: Record<string, unknown>) => ({
          returning: vi.fn().mockImplementation(async () => {
            if (table === webhookEvents) {
              const created = {
                id: `event-${state.events.length + 1}`,
                ...value,
              };
              state.events.push(created);
              return [created];
            }

            return [value];
          }),
        }),
      }),
    },
  };
});

vi.mock('@agentmou/connectors', () => ({
  normalizePhoneAddress: (value?: string | null) =>
    typeof value === 'string' ? value.replace(/^whatsapp:/, '') : null,
  resolveClinicChannelAdapter: vi.fn(() => ({
    validateWebhookSignature: vi.fn(() => true),
    parseWebhookEvent: vi.fn(({ payload }: { payload: Record<string, unknown> }) => ({
      provider: 'twilio_whatsapp',
      channelType: 'whatsapp',
      eventKind: payload.Body ? 'message_inbound' : 'message_status',
      eventId: `twilio-whatsapp:${payload.MessageSid}:${payload.MessageStatus ?? 'received'}`,
      phoneNumber: '+34911122334',
      from: payload.From,
      to: payload.To,
      body: payload.Body,
      providerMessageId: payload.MessageSid,
      providerStatus: payload.MessageStatus ?? 'received',
      profileName: payload.ProfileName,
      payload,
    })),
  })),
}));

import { ClinicWebhooksService } from './clinic-webhooks.service.js';

describe('ClinicWebhooksService', () => {
  const automation = {
    enqueueChannelEvent: vi.fn(),
  };

  beforeEach(() => {
    state.channels = [
      {
        id: 'channel-1',
        tenantId: 'tenant-1',
        channelType: 'whatsapp',
        directionPolicy: {},
        provider: 'twilio_whatsapp',
        connectorAccountId: null,
        status: 'active',
        phoneNumber: '+34911122334',
        config: {},
        createdAt: new Date('2025-01-15T09:00:00.000Z'),
        updatedAt: new Date('2025-01-15T09:00:00.000Z'),
      },
    ];
    state.events = [];
    automation.enqueueChannelEvent.mockReset();
    mockEq.mockClear();
  });

  it('persists and enqueues Twilio webhook events exactly once', async () => {
    const service = new ClinicWebhooksService(automation as never);

    const result = await service.handleTwilioWebhook(
      'whatsapp',
      {
        body: {
          MessageSid: 'SM123',
          Body: 'Hola',
          From: 'whatsapp:+34600111222',
          To: 'whatsapp:+34911122334',
          MessageStatus: 'received',
        },
        headers: { host: 'api.example.com' },
        protocol: 'https',
        url: '/api/v1/webhooks/twilio/whatsapp',
      } as never,
      'signature'
    );

    expect(result).toEqual({
      ok: true,
      duplicate: false,
      ignored: false,
    });
    expect(state.events).toHaveLength(1);
    expect(automation.enqueueChannelEvent).toHaveBeenCalledWith('event-1');
  });

  it('marks duplicate webhook events without enqueuing twice', async () => {
    state.events = [
      {
        id: 'event-1',
        providerEventId: 'twilio-whatsapp:SM123:received',
      },
    ];

    const service = new ClinicWebhooksService(automation as never);

    const result = await service.handleTwilioWebhook(
      'whatsapp',
      {
        body: {
          MessageSid: 'SM123',
          Body: 'Hola',
          From: 'whatsapp:+34600111222',
          To: 'whatsapp:+34911122334',
          MessageStatus: 'received',
        },
        headers: { host: 'api.example.com' },
        protocol: 'https',
        url: '/api/v1/webhooks/twilio/whatsapp',
      } as never,
      'signature'
    );

    expect(result).toEqual({
      ok: true,
      duplicate: true,
    });
    expect(automation.enqueueChannelEvent).not.toHaveBeenCalled();
  });
});
