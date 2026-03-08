import { NextRequest, NextResponse } from 'next/server'
import { generateResponse } from '@/lib/chat/engine'
import type { ChatRequest, ChatResponse, ChatMessage } from '@/lib/chat/types'

// POST /api/chat
// This route is structured to be easily replaced with OpenAI integration
export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { mode, messages, contextSnapshot } = body

    // Get the last user message
    const userMessages = messages.filter(m => m.role === 'user')
    const lastUserMessage = userMessages[userMessages.length - 1]

    if (!lastUserMessage) {
      return NextResponse.json(
        { error: 'No user message provided' },
        { status: 400 }
      )
    }

    // Generate response using mock engine
    // TODO: Replace this with OpenAI call when ready:
    // const openai = new OpenAI()
    // const completion = await openai.chat.completions.create({
    //   model: 'gpt-4',
    //   messages: messages.map(m => ({ role: m.role, content: m.content })),
    //   // Include contextSnapshot in system message for copilot mode
    // })
    // const assistantContent = completion.choices[0].message.content

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
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}
