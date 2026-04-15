// Chat Types for Agentmou Assistant

import type { PublicChatCitation } from '@agentmou/contracts';

export type ChatMode = 'public' | 'copilot';

export interface ActionSuggestion {
  label: string;
  href: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  actions?: ActionSuggestion[];
  citations?: PublicChatCitation[];
  timestamp: string;
}

export interface ChatConversation {
  id: string;
  mode: ChatMode;
  workspaceId?: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

// Context snapshot for copilot mode
export interface WorkspaceContextSnapshot {
  workspaceId: string;
  workspaceName: string;
  workspaceStatus: string;
  workspaceReasons: Array<{ type: string; [key: string]: unknown }>;
  checklistProgress: number;
  checklistTotal: number;
  pendingTasks: Array<{ label: string; description: string; completed: boolean }>;
  installedAgents: Array<{
    id: string;
    name: string;
    status: string;
    reasons: Array<{ type: string; [key: string]: unknown }>;
  }>;
  integrations: Array<{ id: string; name: string; status: string; missingScopes: string[] }>;
  pendingApprovalsCount: number;
  recentErrors: Array<{ agentName: string; error: string; timestamp: string }>;
}

// API request/response
export interface ChatRequest {
  mode: ChatMode;
  messages: ChatMessage[];
  contextSnapshot?: WorkspaceContextSnapshot;
}

export interface ChatResponse {
  message: ChatMessage;
}

// Quick prompts by mode
export const QUICK_PROMPTS: Record<ChatMode, string[]> = {
  public: [
    '¿Cómo funciona la recepción IA para clínicas?',
    '¿Qué incluye Pricing y qué módulos existen?',
    '¿Cómo tratamos seguridad y privacidad?',
    'Quiero solicitar una demo o ver el producto',
  ],
  copilot: [
    "What's next for this workspace?",
    'Why is this workspace still blocked?',
    'Recommend agents for this use case',
    'What is my readiness status?',
  ],
};
