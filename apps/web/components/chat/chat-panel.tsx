'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { Bot, RotateCcw, X, Sparkles, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useChatStore } from '@/lib/chat/store'
import { generateResponseStream } from '@/lib/chat/engine'
import type { ChatMode, ChatResponse, WorkspaceContextSnapshot } from '@/lib/chat/types'
import { ChatMessageBubble } from './chat-message-bubble'
import { ChatComposer } from './chat-composer'
import { ChatQuickPrompts } from './chat-quick-prompts'
import { ChatTypingIndicator } from './chat-typing-indicator'
import { HonestSurfaceBadge, HonestSurfaceNotice } from '@/components/honest-surface'
import { resolveHonestSurfaceState } from '@/lib/honest-ui'

interface ChatPanelProps {
  mode: ChatMode
  workspaceId?: string
  contextSnapshot?: WorkspaceContextSnapshot
  onClose: () => void
}

export function ChatPanel({ mode, workspaceId, contextSnapshot, onClose }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { messages, isLoading, setIsLoading, addMessage, updateLastAssistantMessage, resetConversation } = useChatStore(mode, workspaceId)
  const [isStreaming, setIsStreaming] = useState(false)
  const assistantState = resolveHonestSurfaceState('chat-assistant', {
    providerMode: 'api',
    tenantId: workspaceId,
  })

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isStreaming])

  const handleSend = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    // Add user message
    addMessage({ role: 'user', content })
    setIsLoading(true)
    setIsStreaming(true)

    // Add placeholder for assistant message
    addMessage({ role: 'assistant', content: '' })

    try {
      if (mode === 'public') {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mode,
            messages: [
              ...messages.map((message) => ({
                role: message.role,
                content: message.content,
              })),
              { role: 'user', content },
            ],
          }),
        })

        if (!response.ok) {
          throw new Error(`Chat request failed: ${response.status}`)
        }

        const data = await response.json() as ChatResponse
        updateLastAssistantMessage(
          data.message.content,
          data.message.actions,
          data.message.citations,
        )
      } else {
        const stream = generateResponseStream({
          mode,
          userMessage: content,
          context: contextSnapshot,
        })

        for await (const chunk of stream) {
          updateLastAssistantMessage(chunk.content, chunk.actions)
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      updateLastAssistantMessage(
        'The assistant preview hit an error. Please try again in a moment.',
      )
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
    }
  }, [mode, contextSnapshot, isLoading, messages, addMessage, setIsLoading, updateLastAssistantMessage])

  const handleQuickPrompt = useCallback((prompt: string) => {
    handleSend(prompt)
  }, [handleSend])

  return (
    <div className="fixed bottom-24 right-6 z-50 flex h-[520px] w-[380px] flex-col overflow-hidden rounded-2xl border border-border/50 bg-background/95 shadow-2xl backdrop-blur-xl sm:h-[580px] sm:w-[420px]">
      {/* Header with gradient */}
      <div className="relative flex items-center justify-between px-4 py-4">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-emerald-500/50 via-border to-transparent" />
        
        <div className="relative flex items-center gap-3">
          {/* Animated avatar */}
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/20">
              <Bot className="h-5 w-5 text-white" />
            </div>
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Agentmou Assistant</h3>
              <HonestSurfaceBadge state={assistantState} />
              <Sparkles className="h-3 w-3 text-emerald-500" />
            </div>
            <p className="text-xs text-muted-foreground">
              {mode === 'public'
                ? 'Public product assistant with cited answers'
                : 'Preview guidance for this workspace'}
            </p>
          </div>
        </div>
        
        <div className="relative flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-muted"
            onClick={resetConversation}
            title="Reset preview chat"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-muted"
            onClick={onClose}
            title="Close chat"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages with custom scrollbar */}
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="px-4 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              {/* Animated welcome */}
              <div className="relative mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 ring-1 ring-emerald-500/20">
                  <Zap className="h-8 w-8 text-emerald-500" />
                </div>
                <div className="absolute -inset-1 rounded-2xl bg-emerald-500/10 blur-xl" />
              </div>
              
              <h4 className="text-base font-semibold mb-1">
                {mode === 'public'
                  ? 'Ask the public product assistant'
                  : 'Review this workspace with the assistant preview'}
              </h4>
              <p className="text-sm text-muted-foreground text-center max-w-[280px]">
                {mode === 'public'
                  ? "I answer from AgentMou's public product corpus with citations and won't expose tenant-only data."
                  : "I can summarize blockers, readiness, and available surfaces, but I will not change tenant state from chat."}
              </p>
              <div className="mt-4 w-full max-w-[320px]">
                <HonestSurfaceNotice state={assistantState} />
              </div>
              <div className="mt-4 w-full max-w-[320px]">
                <ChatQuickPrompts mode={mode} onSelect={handleQuickPrompt} />
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))
          )}
          {isStreaming && messages.length > 0 && messages[messages.length - 1].content === '' && (
            <ChatTypingIndicator />
          )}
        </div>
      </ScrollArea>

      {/* Composer */}
      <ChatComposer
        onSend={handleSend}
        disabled={isLoading}
        placeholder={
          mode === 'public'
            ? 'Ask about pricing, security, workflows, or the demo workspace...'
            : 'Ask about blockers, readiness, or preview surfaces...'
        }
        footerHint={
          mode === 'public'
            ? 'Public product answers only. Press Enter to send, Shift+Enter for new line.'
            : 'Preview replies only. Press Enter to send, Shift+Enter for new line.'
        }
      />
    </div>
  )
}
