'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { Bot, RotateCcw, X, Sparkles, Zap, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useChatStore } from '@/lib/chat/store'
import { generateResponseStream } from '@/lib/chat/engine'
import type { ChatMode, WorkspaceContextSnapshot } from '@/lib/chat/types'
import { ChatMessageBubble } from './chat-message-bubble'
import { ChatComposer } from './chat-composer'
import { ChatTypingIndicator } from './chat-typing-indicator'

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
  const [showChatHistory, setShowChatHistory] = useState(false)

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
      // Stream response
      const stream = generateResponseStream({
        mode,
        userMessage: content,
        context: contextSnapshot,
      })

      for await (const chunk of stream) {
        updateLastAssistantMessage(chunk.content, chunk.actions)
      }
    } catch (error) {
      console.error('Chat error:', error)
      updateLastAssistantMessage('Sorry, I encountered an error. Please try again.')
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
    }
  }, [mode, contextSnapshot, isLoading, addMessage, setIsLoading, updateLastAssistantMessage])

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
            {/* Online indicator */}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
            </span>
          </div>
          
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-semibold">Agentmou AI</h3>
              <Sparkles className="h-3 w-3 text-emerald-500" />
            </div>
            <p className="text-xs text-muted-foreground">
              Ask me anything
            </p>
          </div>
        </div>
        
        <div className="relative flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-muted"
            onClick={() => setShowChatHistory(!showChatHistory)}
            title="Chat history"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-muted"
            onClick={resetConversation}
            title="New chat"
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
                {mode === 'public' ? 'Welcome to Agentmou' : 'Hey there!'}
              </h4>
              <p className="text-sm text-muted-foreground text-center max-w-[280px]">
                {mode === 'public'
                  ? "I'm here to help you discover how AI agents can transform your workflows."
                  : "I can help you set up agents, troubleshoot issues, or navigate your workspace."}
              </p>
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
      <ChatComposer onSend={handleSend} disabled={isLoading} />
    </div>
  )
}
