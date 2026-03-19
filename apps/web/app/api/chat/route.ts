import { NextRequest, NextResponse } from 'next/server'
import {
  PublicChatRequestSchema,
  PublicChatResponseSchema,
} from '@agentmou/contracts'

import { generateResponse } from '@/lib/chat/engine'
import type { ChatRequest, ChatResponse, ChatMessage } from '@/lib/chat/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:3001'

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { mode, messages, contextSnapshot } = body

    const userMessages = messages.filter((message) => message.role === 'user')
    const lastUserMessage = userMessages[userMessages.length - 1]

    if (!lastUserMessage) {
      return NextResponse.json(
        { error: 'No user message provided' },
        { status: 400 },
      )
    }

    if (mode !== 'public') {
      const engineResponse = generateResponse({
        mode,
        userMessage: lastUserMessage.content,
        context: contextSnapshot,
      })

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'assistant',
        content: engineResponse.content,
        actions: engineResponse.actions,
        timestamp: new Date().toISOString(),
      }

      const response: ChatResponse = { message: assistantMessage }
      return NextResponse.json(response)
    }

    const publicRequest = PublicChatRequestSchema.parse({
      messages: messages
        .filter(
          (message) =>
            message.role === 'user' || message.role === 'assistant',
        )
        .map((message) => ({
          role: message.role,
          content: message.content,
        })),
    })

    const upstream = await fetch(`${API_URL}/api/v1/public/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(publicRequest),
      cache: 'no-store',
    })

    if (!upstream.ok) {
      const text = await upstream.text()
      throw new Error(`Public chat upstream failed: ${upstream.status} ${text}`)
    }

    const publicResponse = PublicChatResponseSchema.parse(await upstream.json())

    const assistantMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'assistant',
      content: publicResponse.reply,
      actions: publicResponse.actions,
      citations: publicResponse.citations,
      timestamp: new Date().toISOString(),
    }

    const response: ChatResponse = { message: assistantMessage }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 },
    )
  }
}
