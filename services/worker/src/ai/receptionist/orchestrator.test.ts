import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./secrets.js', () => ({
  loadAiSecrets: vi.fn().mockResolvedValue({
    openaiApiKey: 'test-key',
    retellApiKey: null,
    retellAgentId: null,
    retellWebhookSecret: null,
    elevenlabsVoiceId: null,
  }),
}));

vi.mock('./context.js', () => ({
  loadReceptionistContext: vi.fn().mockResolvedValue({
    tenantId: 'test-tenant',
    threadId: 'test-thread',
    clinicName: 'Test Clinic',
    specialty: 'dental',
    timezone: 'Europe/Madrid',
    businessHoursSummary: 'L-V 9:00-18:00',
    patientName: 'Juan',
    patientId: 'patient-1',
    isExistingPatient: true,
    availableSlotsSummary: 'Lun 10:00, Mar 11:00',
    persona: null,
    modelWhatsapp: 'gpt-4.1-mini',
    modelVoice: 'gpt-4.1-mini',
    aiEnabled: true,
    dailyTokenBudget: 500000,
    recentMessages: [],
  }),
}));

vi.mock('@agentmou/db', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: 'inv-1' }]),
  },
  clinicAiToolInvocations: {},
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('runReceptionistTurn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns handoff when AI config is disabled', async () => {
    const { loadReceptionistContext } = await import('./context.js');
    (loadReceptionistContext as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      tenantId: 'test-tenant',
      threadId: 'test-thread',
      clinicName: 'Test Clinic',
      specialty: null,
      timezone: 'Europe/Madrid',
      businessHoursSummary: '',
      patientName: null,
      patientId: null,
      isExistingPatient: false,
      availableSlotsSummary: '',
      persona: null,
      modelWhatsapp: 'gpt-4.1-mini',
      modelVoice: 'gpt-4.1-mini',
      aiEnabled: false,
      dailyTokenBudget: 500000,
      recentMessages: [],
    });

    const { runReceptionistTurn } = await import('./orchestrator.js');
    const result = await runReceptionistTurn({
      tenantId: 'test-tenant',
      threadId: 'test-thread',
      inboundMessage: 'Hola',
      channelType: 'whatsapp',
    });

    expect(result.handoff).toBe(true);
    expect(result.handoffReason).toBe('ai_config_disabled');
  });

  it('returns handoff when OpenAI key is missing', async () => {
    const { loadAiSecrets } = await import('./secrets.js');
    (loadAiSecrets as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      openaiApiKey: null,
      retellApiKey: null,
      retellAgentId: null,
      retellWebhookSecret: null,
      elevenlabsVoiceId: null,
    });

    const { runReceptionistTurn } = await import('./orchestrator.js');
    const result = await runReceptionistTurn({
      tenantId: 'test-tenant',
      threadId: 'test-thread',
      inboundMessage: 'Hola',
      channelType: 'whatsapp',
    });

    expect(result.handoff).toBe(true);
    expect(result.handoffReason).toBe('openai_api_key_missing');
  });

  it('returns assistant text on successful completion', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          choices: [
            {
              finish_reason: 'stop',
              message: { role: 'assistant', content: 'Hola Juan, en que puedo ayudarte?' },
            },
          ],
          usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
        }),
    });

    const { runReceptionistTurn } = await import('./orchestrator.js');
    const result = await runReceptionistTurn({
      tenantId: 'test-tenant',
      threadId: 'test-thread',
      inboundMessage: 'Hola',
      channelType: 'whatsapp',
    });

    expect(result.handoff).toBe(false);
    expect(result.assistantText).toContain('Hola Juan');
    expect(result.tokensUsed).toBe(120);
    expect(result.model).toBe('gpt-4.1-mini');
  });
});
