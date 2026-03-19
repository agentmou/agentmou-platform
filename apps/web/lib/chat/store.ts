'use client'

import { useState, useEffect, useCallback } from 'react'
import type { ChatMessage, ChatConversation, ChatMode } from './types'

const STORAGE_KEY_PUBLIC = 'chat_public'
const STORAGE_KEY_WORKSPACE_PREFIX = 'chat_workspace_'

function generateId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function getStorageKey(mode: ChatMode, workspaceId?: string): string {
  return mode === 'public' ? STORAGE_KEY_PUBLIC : `${STORAGE_KEY_WORKSPACE_PREFIX}${workspaceId || 'default'}`
}

function loadConversation(mode: ChatMode, workspaceId?: string): ChatConversation | null {
  if (typeof window === 'undefined') return null
  try {
    const key = getStorageKey(mode, workspaceId)
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function saveConversation(conversation: ChatConversation): void {
  if (typeof window === 'undefined') return
  try {
    const key = getStorageKey(conversation.mode, conversation.workspaceId)
    localStorage.setItem(key, JSON.stringify(conversation))
  } catch {
    // Ignore storage errors
  }
}

function createEmptyConversation(mode: ChatMode, workspaceId?: string): ChatConversation {
  const now = new Date().toISOString()
  return {
    id: `conv-${Date.now()}`,
    mode,
    workspaceId,
    messages: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function useChatStore(mode: ChatMode, workspaceId?: string) {
  const [conversation, setConversation] = useState<ChatConversation>(() => {
    return createEmptyConversation(mode, workspaceId)
  })
  const [isLoading, setIsLoading] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const loaded = loadConversation(mode, workspaceId)
    if (loaded) {
      setConversation(loaded)
    } else {
      setConversation(createEmptyConversation(mode, workspaceId))
    }
  }, [mode, workspaceId])

  // Save to localStorage on change
  useEffect(() => {
    if (conversation.messages.length > 0) {
      saveConversation(conversation)
    }
  }, [conversation])

  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: generateId(),
      timestamp: new Date().toISOString(),
    }
    setConversation(prev => ({
      ...prev,
      messages: [...prev.messages, newMessage],
      updatedAt: new Date().toISOString(),
    }))
    return newMessage
  }, [])

  const updateLastAssistantMessage = useCallback((
    content: string,
    actions?: ChatMessage['actions'],
    citations?: ChatMessage['citations'],
  ) => {
    setConversation(prev => {
      const messages = [...prev.messages]
      const lastIdx = messages.length - 1
      if (lastIdx >= 0 && messages[lastIdx].role === 'assistant') {
        messages[lastIdx] = { ...messages[lastIdx], content, actions, citations }
      }
      return { ...prev, messages, updatedAt: new Date().toISOString() }
    })
  }, [])

  const resetConversation = useCallback(() => {
    const newConv = createEmptyConversation(mode, workspaceId)
    setConversation(newConv)
    // Also clear from storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(getStorageKey(mode, workspaceId))
    }
  }, [mode, workspaceId])

  return {
    messages: conversation.messages,
    isLoading,
    setIsLoading,
    addMessage,
    updateLastAssistantMessage,
    resetConversation,
  }
}
