import { db, conversationMessages, conversationThreads, clinicAiToolInvocations } from '@agentmou/db';
import { eq, and } from 'drizzle-orm';
import { getOpenAiToolDefinitions, toolRegistry } from '@agentmou/agent-engine';

import { loadAiSecrets } from './secrets.js';
import { loadReceptionistContext, type ReceptionistContext } from './context.js';
import { buildWhatsAppSystemPrompt } from './prompts.js';

const MAX_TOOL_ITERATIONS = 5;

type OpenAiToolCall = {
  id: string;
  type: string;
  function: { name: string; arguments: string };
};

type OpenAiRequestMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content?: string; tool_calls?: OpenAiToolCall[] }
  | { role: 'tool'; content: string; tool_call_id: string };

export interface ReceptionistTurnInput {
  tenantId: string;
  threadId: string;
  patientId?: string | null;
  inboundMessage: string;
  channelType: 'whatsapp' | 'voice';
}

export interface ReceptionistTurnResult {
  assistantText: string;
  handoff: boolean;
  handoffReason?: string;
  toolCalls: Array<{ name: string; result: string }>;
  tokensUsed: number;
  model: string;
}

export async function runReceptionistTurn(
  input: ReceptionistTurnInput
): Promise<ReceptionistTurnResult> {
  const secrets = await loadAiSecrets(input.tenantId);
  if (!secrets.openaiApiKey) {
    return {
      assistantText: '',
      handoff: true,
      handoffReason: 'openai_api_key_missing',
      toolCalls: [],
      tokensUsed: 0,
      model: 'none',
    };
  }

  const ctx = await loadReceptionistContext({
    tenantId: input.tenantId,
    threadId: input.threadId,
    patientId: input.patientId,
  });

  if (!ctx.aiEnabled) {
    return {
      assistantText: '',
      handoff: true,
      handoffReason: 'ai_config_disabled',
      toolCalls: [],
      tokensUsed: 0,
      model: 'none',
    };
  }

  const model = input.channelType === 'voice' ? ctx.modelVoice : ctx.modelWhatsapp;
  const systemPrompt = buildWhatsAppSystemPrompt(ctx);
  const tools = getOpenAiToolDefinitions();

  const messages: OpenAiRequestMessage[] = [
    { role: 'system', content: systemPrompt },
    ...ctx.recentMessages,
    { role: 'user', content: input.inboundMessage },
  ];

  let totalTokens = 0;
  const toolCallResults: Array<{ name: string; result: string }> = [];
  let handoff = false;
  let handoffReason: string | undefined;

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await callOpenAi({
      apiKey: secrets.openaiApiKey,
      model,
      messages,
      tools,
    });

    totalTokens += response.usage?.total_tokens ?? 0;

    const choice = response.choices?.[0];
    if (!choice) {
      break;
    }

    if (choice.finish_reason === 'tool_calls' && choice.message?.tool_calls?.length) {
      messages.push({
        role: 'assistant',
        content: choice.message.content,
        tool_calls: choice.message.tool_calls,
      });

      for (const tc of choice.message.tool_calls) {
        const toolName = tc.function.name;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments);
        } catch { /* empty */ }

        const tool = toolRegistry[toolName];
        let result = 'Herramienta no encontrada.';
        const start = Date.now();

        if (tool) {
          try {
            result = await tool.handler({
              tenantId: input.tenantId,
              args,
              threadId: input.threadId,
            });
          } catch (err) {
            result = 'Error ejecutando la herramienta.';
          }
        }

        const durationMs = Date.now() - start;

        await db.insert(clinicAiToolInvocations).values({
          tenantId: input.tenantId,
          threadId: input.threadId,
          toolName,
          args,
          result: { text: result },
          status: tool ? 'success' : 'error',
          durationMs,
          tokensUsed: 0,
        });

        toolCallResults.push({ name: toolName, result });

        if (toolName === 'transferir_humano') {
          handoff = true;
          handoffReason = 'patient_requested_handoff';
        }

        messages.push({
          role: 'tool',
          content: result,
          tool_call_id: tc.id,
        });
      }

      continue;
    }

    const assistantText = choice.message?.content ?? '';
    return {
      assistantText,
      handoff,
      handoffReason,
      toolCalls: toolCallResults,
      tokensUsed: totalTokens,
      model,
    };
  }

  return {
    assistantText: '',
    handoff: true,
    handoffReason: 'max_tool_iterations',
    toolCalls: toolCallResults,
    tokensUsed: totalTokens,
    model,
  };
}

async function callOpenAi(params: {
  apiKey: string;
  model: string;
  messages: OpenAiRequestMessage[];
  tools: Array<Record<string, unknown>>;
}) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${params.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      tools: params.tools.length > 0 ? params.tools : undefined,
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`OpenAI API error ${response.status}: ${body.slice(0, 200)}`);
  }

  return response.json() as Promise<OpenAiChatResponse>;
}

interface OpenAiChatResponse {
  choices: Array<{
    finish_reason: string;
    message: {
      role: string;
      content?: string;
      tool_calls?: OpenAiToolCall[];
    };
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}
