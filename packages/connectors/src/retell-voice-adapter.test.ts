import { describe, it, expect, vi } from 'vitest';
import { resolveClinicChannelAdapter } from './channels';
import type { ClinicChannel } from '@agentmou/contracts';

const BASE_RETELL_CHANNEL: ClinicChannel = {
  id: 'ch-retell',
  tenantId: 'tenant-1',
  channelType: 'voice',
  directionPolicy: { inboundEnabled: true, outboundEnabled: true },
  provider: 'retell_voice',
  connectorAccountId: null,
  status: 'active',
  phoneNumber: '+34910000003',
  config: {
    agentId: 'agent-123',
    fromNumber: '+34910000003',
    signingSecret: 'test-secret',
    language: 'es',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('RetellVoiceAdapter', () => {
  it('resolves from resolveClinicChannelAdapter', () => {
    const adapter = resolveClinicChannelAdapter(BASE_RETELL_CHANNEL);
    expect(adapter.provider).toBe('retell_voice');
    expect(adapter.channelType).toBe('voice');
  });

  it('parses a post-call webhook payload', () => {
    const adapter = resolveClinicChannelAdapter(BASE_RETELL_CHANNEL);
    const event = adapter.parseWebhookEvent({
      url: 'https://api.example.com/webhooks/retell/post-call',
      payload: {
        event: 'call_analyzed',
        call_id: 'call_abc',
        from_number: '+34600123456',
        to_number: '+34910000003',
        duration_ms: 120000,
        transcript: 'Hola, quiero agendar una cita...',
        call_summary: 'Paciente quiere agendar primera visita.',
      } as Record<string, string | number | boolean | null | undefined>,
    });

    expect(event.provider).toBe('retell_voice');
    expect(event.channelType).toBe('voice');
    expect(event.eventKind).toBe('call_ai_completed');
    expect(event.providerCallId).toBe('call_abc');
    expect(event.body).toBe('Paciente quiere agendar primera visita.');
  });

  it('validates signature with correct secret', () => {
    const { createHmac } = require('node:crypto');
    const adapter = resolveClinicChannelAdapter(BASE_RETELL_CHANNEL);
    const payload = { event: 'call_analyzed', call_id: 'call_abc' };
    const rawBody = JSON.stringify(payload);
    const expected = createHmac('sha256', 'test-secret').update(rawBody, 'utf8').digest('hex');

    const result = adapter.validateWebhookSignature({
      url: 'https://example.com/webhook',
      payload: payload as Record<string, string | number | boolean | null | undefined>,
      signature: expected,
    });

    expect(result).toBe(true);
  });

  it('rejects invalid signature', () => {
    const adapter = resolveClinicChannelAdapter(BASE_RETELL_CHANNEL);

    const result = adapter.validateWebhookSignature({
      url: 'https://example.com/webhook',
      payload: { event: 'call_analyzed', call_id: 'call_abc' } as Record<
        string,
        string | number | boolean | null | undefined
      >,
      signature: 'invalid-hex',
    });

    expect(result).toBe(false);
  });
});
