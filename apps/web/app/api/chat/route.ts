import { NextRequest, NextResponse } from 'next/server';
import { PublicChatRequestSchema, PublicChatResponseSchema } from '@agentmou/contracts';

import { generateResponse } from '@/lib/chat/engine';
import type { ChatRequest, ChatResponse, ChatMessage } from '@/lib/chat/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:3001';

function createAssistantMessage(
  content: string,
  actions?: ChatMessage['actions'],
  citations?: ChatMessage['citations']
): ChatMessage {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    role: 'assistant',
    content,
    actions,
    citations,
    timestamp: new Date().toISOString(),
  };
}

function createLocalAssistantMessage(
  mode: ChatRequest['mode'],
  userMessage: string,
  contextSnapshot?: ChatRequest['contextSnapshot']
): ChatMessage {
  const engineResponse = generateResponse({
    mode,
    userMessage,
    context: contextSnapshot,
  });

  return createAssistantMessage(engineResponse.content, engineResponse.actions);
}

async function createPublicAssistantMessage(
  messages: ChatRequest['messages'],
  userMessage: string
): Promise<ChatMessage> {
  const publicRequest = PublicChatRequestSchema.parse({
    messages: messages
      .filter((message) => message.role === 'user' || message.role === 'assistant')
      .map((message) => ({
        role: message.role,
        content: message.content,
      })),
  });

  try {
    const upstream = await fetch(`${API_URL}/api/v1/public/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(publicRequest),
      cache: 'no-store',
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      throw new Error(`Public chat upstream failed: ${upstream.status} ${text}`);
    }

    const publicResponse = PublicChatResponseSchema.parse(await upstream.json());

    return createAssistantMessage(
      publicResponse.reply,
      publicResponse.actions,
      publicResponse.citations
    );
  } catch (error) {
    console.warn('Public chat upstream failed, using local fallback.', error);
    return createLocalAssistantMessage('public', userMessage);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { mode, messages, contextSnapshot } = body;

    const userMessages = messages.filter((message) => message.role === 'user');
    const lastUserMessage = userMessages[userMessages.length - 1];

    if (!lastUserMessage) {
      return NextResponse.json({ error: 'No user message provided' }, { status: 400 });
    }

    if (mode !== 'public') {
      const assistantMessage = createLocalAssistantMessage(
        mode,
        lastUserMessage.content,
        contextSnapshot
      );

      const response: ChatResponse = { message: assistantMessage };
      return NextResponse.json(response);
    }

    const assistantMessage = await createPublicAssistantMessage(messages, lastUserMessage.content);
    const response: ChatResponse = { message: assistantMessage };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Failed to process chat request' }, { status: 500 });
  }
}
