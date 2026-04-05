import { afterEach, describe, expect, it } from 'vitest';
import type { ClinicChannel } from '@agentmou/contracts';

import {
  normalizePhoneAddress,
  resolveClinicChannelAdapter,
  validateTwilioWebhookSignature,
} from '../channels.js';

const originalEnv = { ...process.env };

function createChannel(overrides: Partial<ClinicChannel> = {}): ClinicChannel {
  return {
    id: 'channel-1',
    tenantId: 'tenant-1',
    channelType: 'whatsapp',
    directionPolicy: {
      inboundEnabled: true,
      outboundEnabled: true,
    },
    provider: 'twilio_whatsapp',
    connectorAccountId: null,
    status: 'active',
    phoneNumber: '+34911122334',
    config: {},
    createdAt: '2025-01-15T09:00:00.000Z',
    updatedAt: '2025-01-15T09:00:00.000Z',
    ...overrides,
  };
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('clinic channel adapters', () => {
  it('normalizes Twilio phone addresses', () => {
    expect(normalizePhoneAddress('whatsapp:+34911122334')).toBe('+34911122334');
    expect(normalizePhoneAddress('+34911122334')).toBe('+34911122334');
  });

  it('validates Twilio webhook signatures from form payloads', () => {
    const url = 'https://api.example.com/api/v1/webhooks/twilio/whatsapp';
    const payload = {
      Body: 'Hola',
      From: 'whatsapp:+34600111222',
      To: 'whatsapp:+34911122334',
      MessageSid: 'SM123',
    };
    const authToken = 'twilio-secret';
    const signature = 'NogOEqWzqZYllurKiOd1P45UKZA=';

    expect(
      validateTwilioWebhookSignature({
        url,
        payload,
        signature,
        authToken,
      })
    ).toBe(true);
  });

  it('parses normalized WhatsApp events and falls back to mock adapters when Twilio creds are absent', async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;

    const adapter = resolveClinicChannelAdapter(createChannel(), {
      allowMockFallback: true,
    });
    const event = adapter.parseWebhookEvent({
      url: 'https://api.example.com/api/v1/webhooks/twilio/whatsapp',
      payload: {
        MessageSid: 'SM123',
        Body: 'Confirmo la cita',
        From: 'whatsapp:+34600111222',
        To: 'whatsapp:+34911122334',
        MessageStatus: 'received',
        ProfileName: 'Lucia Perez',
      },
    });

    expect(adapter.provider).toBe('mock_whatsapp');
    expect(event.eventKind).toBe('message_inbound');
    expect(event.providerMessageId).toBe('SM123');

    const result = await adapter.sendMessage?.({
      to: '+34600111222',
      body: 'Te llamamos enseguida',
    });

    expect(result?.status).toBe('accepted');
    expect(result?.providerMessageId).toContain('mock-message-');
  });

  it('parses voice status callbacks with the Twilio adapter', () => {
    process.env.TWILIO_ACCOUNT_SID = 'AC123';
    process.env.TWILIO_AUTH_TOKEN = 'secret';

    const adapter = resolveClinicChannelAdapter(
      createChannel({
        channelType: 'voice',
        provider: 'twilio_voice',
        phoneNumber: '+34911122334',
      })
    );
    const event = adapter.parseWebhookEvent({
      url: 'https://api.example.com/api/v1/webhooks/twilio/voice',
      payload: {
        CallSid: 'CA123',
        CallStatus: 'completed',
        Direction: 'outbound-api',
        From: '+34911122334',
        To: '+34600111222',
        TranscriptionText: 'Necesito mover mi cita',
      },
    });

    expect(event.channelType).toBe('voice');
    expect(event.providerCallId).toBe('CA123');
    expect(event.eventKind).toBe('call_status');
  });
});
