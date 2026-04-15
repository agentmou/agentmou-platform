import type { PublicChatAction, PublicChatRequest, PublicChatResponse } from '@agentmou/contracts';

import { N8nService } from '../n8n/n8n.service.js';
import { PublicKnowledgeService, type KnowledgeMatch } from './public-knowledge.service.js';
import {
  getPublicDemoWorkspaceUrl,
  getPublicDocsUrl,
  getPublicPricingUrl,
  getPublicSecurityUrl,
} from './public-links.js';

const publicKnowledgeService = new PublicKnowledgeService();
const n8nService = new N8nService();
const PUBLIC_CHAT_WORKFLOW_ID = process.env.PUBLIC_CHAT_N8N_WORKFLOW_ID;

export class PublicChatService {
  async reply(body: PublicChatRequest): Promise<PublicChatResponse> {
    const lastUserMessage = [...body.messages].reverse().find((message) => message.role === 'user');

    if (!lastUserMessage) {
      return {
        reply:
          'I need a question to answer. Ask about pricing, security, agents, workflows, or the demo workspace.',
        citations: [],
        actions: defaultActions(),
        provider: 'retrieval',
        fallback: true,
      };
    }

    const matches = await publicKnowledgeService.search(lastUserMessage.content, 4);

    if (matches.length === 0) {
      return {
        reply:
          'I could not find enough public evidence for that in the current Agentmou marketing and catalog corpus. Try asking about pricing, supported workflows, integrations, or the demo workspace.',
        citations: [],
        actions: defaultActions(),
        provider: 'retrieval',
        fallback: true,
      };
    }

    if (PUBLIC_CHAT_WORKFLOW_ID) {
      const n8nReply = await this.tryN8nReply(body, matches);
      if (n8nReply) {
        return n8nReply;
      }
    }

    return {
      reply: buildRetrievalReply(lastUserMessage.content, matches),
      citations: matches.map((match) => ({
        id: match.id,
        title: match.title,
        href: match.href,
        excerpt: match.excerpt,
        sourcePath: match.sourcePath,
      })),
      actions: actionsForQuestion(lastUserMessage.content),
      provider: 'retrieval',
      fallback: false,
    };
  }

  private async tryN8nReply(
    body: PublicChatRequest,
    matches: KnowledgeMatch[]
  ): Promise<PublicChatResponse | null> {
    try {
      const result = await n8nService.executeWorkflow(PUBLIC_CHAT_WORKFLOW_ID!, {
        question: body.messages[body.messages.length - 1]?.content,
        messages: body.messages.slice(-6),
        context: matches.map((match) => ({
          title: match.title,
          excerpt: match.excerpt,
          href: match.href,
          sourcePath: match.sourcePath,
        })),
        sessionId: body.sessionId,
      });

      const reply = extractN8nReply(result);
      if (!reply) {
        return null;
      }

      return {
        reply,
        citations: matches.map((match) => ({
          id: match.id,
          title: match.title,
          href: match.href,
          excerpt: match.excerpt,
          sourcePath: match.sourcePath,
        })),
        actions: actionsForQuestion(body.messages[body.messages.length - 1]?.content ?? ''),
        provider: 'n8n',
        fallback: false,
      };
    } catch {
      return null;
    }
  }
}

function buildRetrievalReply(question: string, matches: KnowledgeMatch[]) {
  const intro = intentIntro(question);
  const bullets = matches
    .slice(0, 3)
    .map((match) => `- **${match.title}:** ${match.excerpt}`)
    .join('\n');

  return `${intro}\n\n${bullets}\n\nI am only using the public Agentmou corpus here, so I will say when something is not documented publicly.`;
}

function extractN8nReply(result: unknown) {
  if (!isRecord(result)) {
    return null;
  }

  if (typeof result.reply === 'string') {
    return result.reply;
  }

  if (isRecord(result.data) && typeof result.data.reply === 'string') {
    return result.data.reply;
  }

  if (
    Array.isArray(result.data) &&
    result.data.length > 0 &&
    isRecord(result.data[0]) &&
    typeof result.data[0].reply === 'string'
  ) {
    return result.data[0].reply;
  }

  return null;
}

function intentIntro(question: string) {
  const value = question.toLowerCase();

  if (/\b(price|pricing|plan|billing|cost)\b/.test(value)) {
    return 'Here is what Agentmou publishes today about pricing and billing:';
  }

  if (/\b(security|privacy|data|compliance)\b/.test(value)) {
    return 'Here is what the public Agentmou corpus confirms about security and product boundaries:';
  }

  if (/\b(agent|workflow|pack|catalog|integration)\b/.test(value)) {
    return 'Here is what the public catalog says today:';
  }

  return 'Here is what I can confirm from Agentmou’s public product corpus:';
}

function actionsForQuestion(question: string): PublicChatAction[] {
  const value = question.toLowerCase();

  if (/\b(price|pricing|plan|billing|cost)\b/.test(value)) {
    return [
      { label: 'View Pricing', href: getPublicPricingUrl() },
      { label: 'Open Demo Workspace', href: getPublicDemoWorkspaceUrl() },
    ];
  }

  if (/\b(security|privacy|data)\b/.test(value)) {
    return [
      { label: 'Security Details', href: getPublicSecurityUrl() },
      { label: 'Open Demo Workspace', href: getPublicDemoWorkspaceUrl() },
    ];
  }

  return defaultActions();
}

function defaultActions(): PublicChatAction[] {
  return [
    { label: 'Open Demo Workspace', href: getPublicDemoWorkspaceUrl() },
    { label: 'View Docs', href: getPublicDocsUrl() },
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
