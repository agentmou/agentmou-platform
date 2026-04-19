import { db, secretEnvelopes } from '@agentmou/db';
import { eq, and, inArray } from 'drizzle-orm';

const AI_SECRET_KEYS = [
  'openai_api_key',
  'retell_api_key',
  'retell_agent_id',
  'retell_webhook_secret',
  'elevenlabs_voice_id',
] as const;

export type AiSecretKey = (typeof AI_SECRET_KEYS)[number];

export interface AiSecrets {
  openaiApiKey: string | null;
  retellApiKey: string | null;
  retellAgentId: string | null;
  retellWebhookSecret: string | null;
  elevenlabsVoiceId: string | null;
}

export async function loadAiSecrets(tenantId: string): Promise<AiSecrets> {
  const rows = await db
    .select({
      key: secretEnvelopes.key,
      encryptedValue: secretEnvelopes.encryptedValue,
    })
    .from(secretEnvelopes)
    .where(
      and(eq(secretEnvelopes.tenantId, tenantId), inArray(secretEnvelopes.key, [...AI_SECRET_KEYS]))
    );

  const byKey = new Map(rows.map((r) => [r.key, r.encryptedValue]));

  return {
    openaiApiKey: byKey.get('openai_api_key') ?? process.env.OPENAI_API_KEY ?? null,
    retellApiKey: byKey.get('retell_api_key') ?? process.env.RETELL_API_KEY ?? null,
    retellAgentId: byKey.get('retell_agent_id') ?? process.env.RETELL_AGENT_ID_DEFAULT ?? null,
    retellWebhookSecret:
      byKey.get('retell_webhook_secret') ?? process.env.RETELL_WEBHOOK_SECRET ?? null,
    elevenlabsVoiceId: byKey.get('elevenlabs_voice_id') ?? null,
  };
}
