import { createHmac, randomUUID } from 'node:crypto';
import {
  ClinicDeliveryResultSchema,
  NormalizedClinicWebhookEventSchema,
  RetellPostCallWebhookPayloadSchema,
  RetellVoiceConfigSchema,
  TwilioVoiceConfigSchema,
  TwilioVoiceWebhookPayloadSchema,
  TwilioWhatsAppConfigSchema,
  TwilioWhatsAppWebhookPayloadSchema,
  type ChannelType,
  type ClinicChannel,
  type ClinicDeliveryResult,
  type NormalizedClinicWebhookEvent,
} from '@agentmou/contracts';

export type RawWebhookPayload = Record<string, string | number | boolean | null | undefined>;

export interface ClinicWebhookParseInput {
  url: string;
  signature?: string | null;
  payload: RawWebhookPayload;
}

export interface OutboundClinicMessageRequest {
  to: string;
  body: string;
  statusCallbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface VoiceCallbackRequest {
  to: string;
  note?: string;
  answerUrl?: string;
  statusCallbackUrl?: string;
}

export interface ClinicChannelAdapter {
  readonly provider: string;
  readonly channelType: ChannelType;

  validateWebhookSignature(input: ClinicWebhookParseInput): boolean;
  parseWebhookEvent(input: ClinicWebhookParseInput): NormalizedClinicWebhookEvent;
  sendMessage?(input: OutboundClinicMessageRequest): Promise<ClinicDeliveryResult>;
  scheduleCallback?(input: VoiceCallbackRequest): Promise<ClinicDeliveryResult>;
}

export interface ResolveClinicChannelAdapterOptions {
  allowMockFallback?: boolean;
}

type TwilioCredentials = {
  accountSid?: string;
  authToken?: string;
};

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

function toWebhookStringRecord(payload: RawWebhookPayload) {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (value == null) {
      continue;
    }

    normalized[key] = String(value);
  }

  return normalized;
}

function buildTwilioSignaturePayload(url: string, payload: Record<string, string>) {
  return Object.keys(payload)
    .sort()
    .reduce((buffer, key) => `${buffer}${key}${payload[key]}`, url);
}

function computeTwilioSignature(url: string, payload: Record<string, string>, authToken: string) {
  return createHmac('sha1', authToken)
    .update(buildTwilioSignaturePayload(url, payload), 'utf8')
    .digest('base64');
}

function isTwilioConfigured(channelType: ChannelType, channel: ClinicChannel) {
  const config = getTwilioConfig(channelType, channel);
  const accountSid = config.accountSid ?? process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  return Boolean(accountSid && authToken);
}

function getTwilioConfig(channelType: ChannelType, channel: ClinicChannel) {
  return channelType === 'voice'
    ? TwilioVoiceConfigSchema.parse(channel.config ?? {})
    : TwilioWhatsAppConfigSchema.parse(channel.config ?? {});
}

function getTwilioCredentials(channelType: ChannelType, channel: ClinicChannel): TwilioCredentials {
  const config = getTwilioConfig(channelType, channel);
  return {
    accountSid: config.accountSid ?? process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
  };
}

function normalizePhoneAddress(value?: string | null) {
  if (!value) {
    return null;
  }

  return value.replace(/^whatsapp:/i, '').trim();
}

function toWhatsAppAddress(value: string) {
  return value.startsWith('whatsapp:') ? value : `whatsapp:${value}`;
}

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function createMockDeliveryResult(params: {
  provider: 'mock_whatsapp' | 'mock_voice';
  channelType: ChannelType;
  providerMessageId?: string;
  providerCallId?: string;
  payload?: Record<string, unknown>;
}) {
  return ClinicDeliveryResultSchema.parse({
    provider: params.provider,
    channelType: params.channelType,
    status: 'accepted',
    providerMessageId: params.providerMessageId,
    providerCallId: params.providerCallId,
    payload: params.payload ?? {},
  });
}

class MockWhatsAppAdapter implements ClinicChannelAdapter {
  readonly provider = 'mock_whatsapp';
  readonly channelType = 'whatsapp' as const;

  constructor(private readonly channel: ClinicChannel) {}

  validateWebhookSignature() {
    return true;
  }

  parseWebhookEvent(input: ClinicWebhookParseInput) {
    const payload = TwilioWhatsAppWebhookPayloadSchema.parse(input.payload);
    const providerStatus = payload.MessageStatus ?? payload.SmsStatus ?? 'received';
    const eventKind = payload.Body ? 'message_inbound' : 'message_status';

    return NormalizedClinicWebhookEventSchema.parse({
      provider: this.provider,
      channelType: this.channelType,
      eventKind,
      eventId: `mock-whatsapp:${payload.MessageSid}:${providerStatus}`,
      occurredAt: new Date().toISOString(),
      phoneNumber: normalizePhoneAddress(payload.To ?? this.channel.phoneNumber),
      from: payload.From,
      to: payload.To,
      body: payload.Body,
      providerMessageId: payload.MessageSid,
      providerStatus,
      profileName: payload.ProfileName,
      payload: toRecord(payload),
    });
  }

  async sendMessage(input: OutboundClinicMessageRequest) {
    return createMockDeliveryResult({
      provider: this.provider,
      channelType: this.channelType,
      providerMessageId: `mock-message-${randomUUID()}`,
      payload: {
        to: input.to,
        body: input.body,
      },
    });
  }
}

class MockVoiceAdapter implements ClinicChannelAdapter {
  readonly provider = 'mock_voice';
  readonly channelType = 'voice' as const;

  constructor(private readonly channel: ClinicChannel) {}

  validateWebhookSignature() {
    return true;
  }

  parseWebhookEvent(input: ClinicWebhookParseInput) {
    const payload = TwilioVoiceWebhookPayloadSchema.parse(input.payload);
    const providerStatus = payload.CallStatus ?? 'received';
    const eventKind = isInboundVoiceEvent(payload.Direction, providerStatus)
      ? 'call_inbound'
      : 'call_status';

    return NormalizedClinicWebhookEventSchema.parse({
      provider: this.provider,
      channelType: this.channelType,
      eventKind,
      eventId: `mock-voice:${payload.CallSid}:${providerStatus}`,
      occurredAt: new Date().toISOString(),
      phoneNumber: normalizePhoneAddress(payload.To ?? this.channel.phoneNumber),
      from: payload.From,
      to: payload.To,
      body: payload.TranscriptionText ?? payload.SpeechResult,
      providerCallId: payload.CallSid,
      providerStatus,
      payload: toRecord(payload),
    });
  }

  async scheduleCallback(input: VoiceCallbackRequest) {
    return createMockDeliveryResult({
      provider: this.provider,
      channelType: this.channelType,
      providerCallId: `mock-call-${randomUUID()}`,
      payload: {
        to: input.to,
        note: input.note,
      },
    });
  }
}

abstract class BaseTwilioAdapter {
  protected readonly credentials: TwilioCredentials;

  constructor(protected readonly channel: ClinicChannel) {
    this.credentials = getTwilioCredentials(this.channel.channelType, channel);
  }

  protected validateTwilioSignature(input: ClinicWebhookParseInput) {
    if (!this.credentials.authToken) {
      return true;
    }

    if (!input.signature) {
      return false;
    }

    const payload = toWebhookStringRecord(input.payload);
    return (
      computeTwilioSignature(input.url, payload, this.credentials.authToken) === input.signature
    );
  }

  protected getApiUrl(path: string) {
    if (!this.credentials.accountSid) {
      throw new Error('Twilio account SID is not configured');
    }

    return `https://api.twilio.com/2010-04-01/Accounts/${this.credentials.accountSid}${path}`;
  }

  protected getBasicAuthHeader() {
    if (!this.credentials.accountSid || !this.credentials.authToken) {
      throw new Error('Twilio credentials are not configured');
    }

    const token = Buffer.from(
      `${this.credentials.accountSid}:${this.credentials.authToken}`,
      'utf8'
    ).toString('base64');
    return `Basic ${token}`;
  }

  protected async postForm(
    path: string,
    body: Record<string, string | undefined>
  ): Promise<Record<string, unknown>> {
    const form = new URLSearchParams();
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string' && value.length > 0) {
        form.set(key, value);
      }
    }

    const response = await fetch(this.getApiUrl(path), {
      method: 'POST',
      headers: {
        authorization: this.getBasicAuthHeader(),
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: form,
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      const detail =
        typeof payload.message === 'string'
          ? payload.message
          : `Twilio request failed with status ${response.status}`;
      return {
        __failed: true,
        detail,
        payload,
      };
    }

    return payload;
  }
}

class TwilioWhatsAppAdapter extends BaseTwilioAdapter implements ClinicChannelAdapter {
  readonly provider = 'twilio_whatsapp';
  readonly channelType = 'whatsapp' as const;
  private readonly config = TwilioWhatsAppConfigSchema.parse(this.channel.config ?? {});

  validateWebhookSignature(input: ClinicWebhookParseInput) {
    return this.validateTwilioSignature(input);
  }

  parseWebhookEvent(input: ClinicWebhookParseInput) {
    const payload = TwilioWhatsAppWebhookPayloadSchema.parse(input.payload);
    const providerStatus = payload.MessageStatus ?? payload.SmsStatus ?? 'received';
    const eventKind = payload.Body ? 'message_inbound' : 'message_status';

    return NormalizedClinicWebhookEventSchema.parse({
      provider: this.provider,
      channelType: this.channelType,
      eventKind,
      eventId: `twilio-whatsapp:${payload.MessageSid}:${providerStatus}`,
      occurredAt: new Date().toISOString(),
      phoneNumber: normalizePhoneAddress(payload.To ?? payload.From ?? this.channel.phoneNumber),
      from: payload.From,
      to: payload.To,
      body: payload.Body,
      providerMessageId: payload.MessageSid,
      providerStatus,
      profileName: payload.ProfileName,
      payload: toRecord(payload),
    });
  }

  async sendMessage(input: OutboundClinicMessageRequest) {
    const from =
      this.config.from ?? process.env.TWILIO_WHATSAPP_FROM ?? this.channel.phoneNumber ?? undefined;
    const messagingServiceSid =
      this.config.messagingServiceSid ?? process.env.TWILIO_WHATSAPP_MESSAGING_SERVICE_SID;

    if (!from && !messagingServiceSid) {
      return ClinicDeliveryResultSchema.parse({
        provider: this.provider,
        channelType: this.channelType,
        status: 'failed',
        failureReason: 'channel_misconfigured',
        detail: 'Twilio WhatsApp requires either a from number or messaging service SID.',
        payload: {},
      });
    }

    const response = await this.postForm('/Messages.json', {
      To: toWhatsAppAddress(input.to),
      From: from ? toWhatsAppAddress(from) : undefined,
      MessagingServiceSid: messagingServiceSid,
      Body: input.body,
      StatusCallback: input.statusCallbackUrl,
    });

    if (response.__failed) {
      return ClinicDeliveryResultSchema.parse({
        provider: this.provider,
        channelType: this.channelType,
        status: 'failed',
        failureReason: 'provider_rejected',
        detail: typeof response.detail === 'string' ? response.detail : 'Twilio send failed.',
        payload: response,
      });
    }

    return ClinicDeliveryResultSchema.parse({
      provider: this.provider,
      channelType: this.channelType,
      status: 'accepted',
      providerMessageId: typeof response.sid === 'string' ? response.sid : undefined,
      payload: response,
    });
  }
}

class TwilioVoiceAdapter extends BaseTwilioAdapter implements ClinicChannelAdapter {
  readonly provider = 'twilio_voice';
  readonly channelType = 'voice' as const;
  private readonly config = TwilioVoiceConfigSchema.parse(this.channel.config ?? {});

  validateWebhookSignature(input: ClinicWebhookParseInput) {
    return this.validateTwilioSignature(input);
  }

  parseWebhookEvent(input: ClinicWebhookParseInput) {
    const payload = TwilioVoiceWebhookPayloadSchema.parse(input.payload);
    const providerStatus = payload.CallStatus ?? 'received';
    const eventKind = isInboundVoiceEvent(payload.Direction, providerStatus)
      ? 'call_inbound'
      : 'call_status';

    return NormalizedClinicWebhookEventSchema.parse({
      provider: this.provider,
      channelType: this.channelType,
      eventKind,
      eventId: `twilio-voice:${payload.CallSid}:${providerStatus}`,
      occurredAt: new Date().toISOString(),
      phoneNumber: normalizePhoneAddress(payload.To ?? payload.From ?? this.channel.phoneNumber),
      from: payload.From,
      to: payload.To,
      body: payload.TranscriptionText ?? payload.SpeechResult,
      providerCallId: payload.CallSid,
      providerStatus,
      payload: toRecord(payload),
    });
  }

  async scheduleCallback(input: VoiceCallbackRequest) {
    const from =
      this.config.from ?? process.env.TWILIO_VOICE_FROM ?? this.channel.phoneNumber ?? undefined;
    if (!from) {
      return ClinicDeliveryResultSchema.parse({
        provider: this.provider,
        channelType: this.channelType,
        status: 'failed',
        failureReason: 'channel_misconfigured',
        detail: 'Twilio voice requires a configured from number.',
        payload: {},
      });
    }

    const response = await this.postForm('/Calls.json', {
      To: normalizePhoneAddress(input.to) ?? undefined,
      From: normalizePhoneAddress(from) ?? undefined,
      Url: input.answerUrl ?? this.config.answerUrl,
      StatusCallback: input.statusCallbackUrl,
      Twiml: `<Response><Say voice="alice">${escapeXml(
        input.note ?? 'Tenemos una devolucion de llamada pendiente de la clinica.'
      )}</Say></Response>`,
    });

    if (response.__failed) {
      return ClinicDeliveryResultSchema.parse({
        provider: this.provider,
        channelType: this.channelType,
        status: 'failed',
        failureReason: 'provider_rejected',
        detail: typeof response.detail === 'string' ? response.detail : 'Twilio callback failed.',
        payload: response,
      });
    }

    return ClinicDeliveryResultSchema.parse({
      provider: this.provider,
      channelType: this.channelType,
      status: 'accepted',
      providerCallId: typeof response.sid === 'string' ? response.sid : undefined,
      payload: response,
    });
  }
}

class RetellVoiceAdapter implements ClinicChannelAdapter {
  readonly provider = 'retell_voice';
  readonly channelType = 'voice' as const;
  private readonly config = RetellVoiceConfigSchema.parse(this.channel.config ?? {});

  constructor(private readonly channel: ClinicChannel) {}

  validateWebhookSignature(input: ClinicWebhookParseInput): boolean {
    const secret = this.config.signingSecret ?? process.env.RETELL_WEBHOOK_SECRET;
    if (!secret) {
      return true;
    }
    if (!input.signature) {
      return false;
    }
    const rawBody = JSON.stringify(input.payload);
    const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
    return expected === input.signature;
  }

  parseWebhookEvent(input: ClinicWebhookParseInput): NormalizedClinicWebhookEvent {
    const payload = RetellPostCallWebhookPayloadSchema.parse(input.payload);
    const eventKind = payload.event === 'call_analyzed' ? 'call_ai_completed' : 'call_status';

    return NormalizedClinicWebhookEventSchema.parse({
      provider: this.provider,
      channelType: this.channelType,
      eventKind,
      eventId: `retell-voice:${payload.call_id}:${payload.event}`,
      occurredAt: new Date().toISOString(),
      phoneNumber: normalizePhoneAddress(
        payload.to_number ?? payload.from_number ?? this.channel.phoneNumber
      ),
      from: payload.from_number,
      to: payload.to_number,
      body: payload.call_summary,
      providerCallId: payload.call_id,
      providerStatus: payload.event,
      payload: {
        transcript: payload.transcript,
        callSummary: payload.call_summary,
        customAnalysis: payload.custom_analysis,
        durationMs: payload.duration_ms,
        callType: payload.call_type,
      },
    });
  }

  async scheduleCallback(input: VoiceCallbackRequest): Promise<ClinicDeliveryResult> {
    const apiKey = process.env.RETELL_API_KEY;
    const agentId = this.config.agentId ?? process.env.RETELL_AGENT_ID_DEFAULT;

    if (!apiKey || !agentId) {
      return ClinicDeliveryResultSchema.parse({
        provider: this.provider,
        channelType: this.channelType,
        status: 'failed',
        failureReason: 'channel_misconfigured',
        detail: 'Retell API key or agent ID not configured.',
        payload: {},
      });
    }

    const fromNumber =
      this.config.fromNumber ?? this.channel.phoneNumber ?? undefined;

    const response = await fetch('https://api.retellai.com/v2/create-phone-call', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from_number: fromNumber,
        to_number: input.to,
        agent_id: agentId,
        metadata: { note: input.note },
      }),
    });

    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      return ClinicDeliveryResultSchema.parse({
        provider: this.provider,
        channelType: this.channelType,
        status: 'failed',
        failureReason: 'provider_rejected',
        detail: typeof data.message === 'string' ? data.message : 'Retell call failed.',
        payload: data,
      });
    }

    return ClinicDeliveryResultSchema.parse({
      provider: this.provider,
      channelType: this.channelType,
      status: 'accepted',
      providerCallId: typeof data.call_id === 'string' ? data.call_id : undefined,
      payload: data,
    });
  }
}

export function resolveClinicChannelAdapter(
  channel: ClinicChannel,
  options: ResolveClinicChannelAdapterOptions = {}
): ClinicChannelAdapter {
  const allowMockFallback = options.allowMockFallback ?? false;

  if (channel.provider === 'mock_whatsapp') {
    return new MockWhatsAppAdapter(channel);
  }

  if (channel.provider === 'mock_voice') {
    return new MockVoiceAdapter(channel);
  }

  if (channel.provider === 'twilio_whatsapp') {
    if (!isTwilioConfigured('whatsapp', channel) && allowMockFallback) {
      return new MockWhatsAppAdapter(channel);
    }
    return new TwilioWhatsAppAdapter(channel);
  }

  if (channel.provider === 'twilio_voice') {
    if (!isTwilioConfigured('voice', channel) && allowMockFallback) {
      return new MockVoiceAdapter(channel);
    }
    return new TwilioVoiceAdapter(channel);
  }

  if (channel.provider === 'retell_voice') {
    return new RetellVoiceAdapter(channel);
  }

  if (allowMockFallback) {
    return channel.channelType === 'voice'
      ? new MockVoiceAdapter(channel)
      : new MockWhatsAppAdapter(channel);
  }

  throw new Error(`Unsupported clinic channel provider "${channel.provider}"`);
}

export function validateTwilioWebhookSignature(params: {
  url: string;
  payload: RawWebhookPayload;
  signature?: string | null;
  authToken: string;
}) {
  if (!params.signature) {
    return false;
  }

  return (
    computeTwilioSignature(params.url, toWebhookStringRecord(params.payload), params.authToken) ===
    params.signature
  );
}

export { normalizePhoneAddress };

function isInboundVoiceEvent(direction?: string, providerStatus?: string) {
  const normalizedStatus = providerStatus?.toLowerCase();
  if (!direction?.startsWith('inbound')) {
    return false;
  }

  return !['completed', 'busy', 'failed', 'no-answer'].includes(normalizedStatus ?? '');
}
