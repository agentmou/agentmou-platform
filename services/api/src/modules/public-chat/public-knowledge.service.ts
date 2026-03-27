import { createHash } from 'node:crypto';

import { CatalogService } from '../catalog/catalog.service.js';
import {
  db,
  publicKnowledgeChunks,
  publicKnowledgeDocuments,
} from '@agentmou/db';
import { eq } from 'drizzle-orm';

interface KnowledgeDocumentInput {
  slug: string;
  title: string;
  sourcePath: string;
  sourceType: string;
  summary: string;
  keywords: string[];
  content: string;
}

export interface KnowledgeMatch {
  id: string;
  title: string;
  href: string;
  excerpt: string;
  sourcePath: string;
  score: number;
}

const catalogService = new CatalogService();
let syncPromise: Promise<void> | null = null;

export class PublicKnowledgeService {
  async search(query: string, limit = 4): Promise<KnowledgeMatch[]> {
    await this.ensureSynced();

    const rows = await db
      .select({
        chunkId: publicKnowledgeChunks.id,
        title: publicKnowledgeDocuments.title,
        slug: publicKnowledgeDocuments.slug,
        sourcePath: publicKnowledgeDocuments.sourcePath,
        chunkContent: publicKnowledgeChunks.content,
        chunkKeywords: publicKnowledgeChunks.keywords,
      })
      .from(publicKnowledgeChunks)
      .innerJoin(
        publicKnowledgeDocuments,
        eq(publicKnowledgeChunks.documentId, publicKnowledgeDocuments.id),
      );

    const tokens = tokenize(query);

    return rows
      .map((row) => {
        const score = scoreMatch(
          tokens,
          row.title,
          row.chunkContent,
          normalizeStringArray(row.chunkKeywords),
        );

        return {
          id: row.chunkId,
          title: row.title,
          href: hrefForDocument(row.slug),
          excerpt: excerptForMatch(row.chunkContent, tokens),
          sourcePath: row.sourcePath,
          score,
        };
      })
      .filter((row) => row.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  async ensureSynced() {
    if (!syncPromise) {
      syncPromise = this.syncCorpus().finally(() => {
        syncPromise = null;
      });
    }

    await syncPromise;
  }

  private async syncCorpus() {
    const documents = await buildKnowledgeDocuments();

    for (const document of documents) {
      const checksum = hashContent(document.content);
      const [existing] = await db
        .select()
        .from(publicKnowledgeDocuments)
        .where(eq(publicKnowledgeDocuments.slug, document.slug))
        .limit(1);

      if (existing && existing.checksum === checksum) {
        continue;
      }

      const record = existing
        ? (
            await db
              .update(publicKnowledgeDocuments)
              .set({
                title: document.title,
                sourcePath: document.sourcePath,
                sourceType: document.sourceType,
                summary: document.summary,
                keywords: document.keywords,
                content: document.content,
                checksum,
                updatedAt: new Date(),
              })
              .where(eq(publicKnowledgeDocuments.id, existing.id))
              .returning()
          )[0]
        : (
            await db
              .insert(publicKnowledgeDocuments)
              .values({
                slug: document.slug,
                title: document.title,
                sourcePath: document.sourcePath,
                sourceType: document.sourceType,
                summary: document.summary,
                keywords: document.keywords,
                content: document.content,
                checksum,
              })
              .returning()
          )[0];

      if (!record) {
        continue;
      }

      if (existing) {
        await db
          .delete(publicKnowledgeChunks)
          .where(eq(publicKnowledgeChunks.documentId, record.id));
      }

      const chunks = chunkDocument(document.content);
      if (chunks.length === 0) {
        continue;
      }

      await db.insert(publicKnowledgeChunks).values(
        chunks.map((chunk, index) => ({
          documentId: record.id,
          chunkIndex: index,
          heading: chunk.heading,
          content: chunk.content,
          keywords: [...document.keywords, ...chunk.keywords],
          tokenCount: tokenize(chunk.content).length,
          embeddingModel: null,
          embedding: [],
        })),
      );
    }
  }
}

async function buildKnowledgeDocuments(): Promise<KnowledgeDocumentInput[]> {
  const [agents, workflows, packs] = await Promise.all([
    catalogService.listOperationalAgents(),
    catalogService.listOperationalWorkflows(),
    catalogService.listOperationalPacks(),
  ]);

  return [
    {
      slug: 'public-pricing',
      title: 'Agentmou pricing',
      sourcePath: 'apps/web/app/(marketing)/pricing/page.tsx',
      sourceType: 'marketing',
      summary: 'Starter and Pro plans with included runs plus soft overage.',
      keywords: ['pricing', 'plans', 'billing', 'starter', 'pro', 'scale'],
      content: [
        'Agentmou pricing is plan-based rather than pass-through LLM billing.',
        'Starter is $29/month and includes 3 agents, 1,000 runs per month, 5 integrations, email support, basic analytics, and 7-day log retention.',
        'Pro is $99/month and includes 10 agents, 10,000 runs per month, unlimited integrations, priority support, advanced analytics, and 30-day log retention.',
        'Scale is custom and intended for enterprise requirements, including SSO/SAML, SLA commitments, and unlimited runs.',
        'When a customer exceeds the run limit, Starter overage is billed at $0.01 per run and Pro overage is billed at $0.005 per run.',
      ].join('\n\n'),
    },
    {
      slug: 'public-product-overview',
      title: 'Agentmou product overview',
      sourcePath: 'apps/web/app/(marketing)/docs/page.tsx',
      sourceType: 'marketing',
      summary: 'AI agent fleet plus n8n orchestration with observability and approvals.',
      keywords: ['product', 'overview', 'agents', 'workflows', 'observability', 'approvals'],
      content: [
        'Agentmou combines installable AI agents, workflow packs, integrations, and n8n-backed orchestration.',
        'The product emphasizes human-in-the-loop approvals, observability for runs and token usage, and a catalog of reusable operational automations.',
        'The marketing site and demo workspace explain the current product shape, while tenant surfaces are explicitly labeled when they are preview, read-only, or not yet available.',
      ].join('\n\n'),
    },
    {
      slug: 'public-security',
      title: 'Agentmou security messaging',
      sourcePath: 'apps/web/app/(marketing)/security/page.tsx',
      sourceType: 'marketing',
      summary: 'Public security claims focus on approvals, access, and operational transparency.',
      keywords: ['security', 'privacy', 'data', 'approvals', 'audit', 'access'],
      content: [
        'Agentmou presents role-based access patterns, human-in-the-loop approvals, and observability as part of its operating model.',
        'Public security messaging should be read together with honest UI labels so unsupported enterprise claims are not implied before the backend exists.',
        'Tenant security pages are expected to show real secret inventory, audit activity, team membership, and operational connector issues rather than placeholder enterprise claims.',
      ].join('\n\n'),
    },
    ...agents.map((agent) => ({
      slug: `agent-${agent.id}`,
      title: `${agent.name} agent`,
      sourcePath: `catalog/agents/${agent.id}/manifest.yaml`,
      sourceType: 'catalog',
      summary: agent.description,
      keywords: [agent.id, agent.name, ...(agent.tags ?? [])],
      content: [
        `${agent.name} is an Agentmou catalog agent.`,
        `Description: ${agent.description}`,
        agent.category ? `Category: ${agent.category}` : '',
        agent.tags?.length ? `Tags: ${agent.tags.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
    })),
    ...workflows.map((workflow) => ({
      slug: `workflow-${workflow.id}`,
      title: `${workflow.name} workflow`,
      sourcePath: `workflows/public/${workflow.id}/manifest.yaml`,
      sourceType: 'catalog',
      summary: workflow.description,
      keywords: [workflow.id, workflow.name, workflow.category ?? 'workflow'],
      content: [
        `${workflow.name} is an Agentmou workflow template powered by n8n.`,
        `Description: ${workflow.description}`,
        workflow.category ? `Category: ${workflow.category}` : '',
        workflow.status ? `Status: ${workflow.status}` : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
    })),
    ...packs.map((pack) => ({
      slug: `pack-${pack.id}`,
      title: `${pack.name} pack`,
      sourcePath: `catalog/packs/${pack.id}.yaml`,
      sourceType: 'catalog',
      summary: pack.description,
      keywords: [pack.id, pack.name, ...(pack.connectors ?? [])],
      content: [
        `${pack.name} bundles Agentmou agents and workflows for a shared outcome.`,
        `Description: ${pack.description}`,
        pack.agents.length ? `Agents: ${pack.agents.join(', ')}` : '',
        pack.workflows?.length
          ? `Workflows: ${pack.workflows.join(', ')}`
          : '',
        pack.connectors?.length
          ? `Connectors: ${pack.connectors.join(', ')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
    })),
  ];
}

function chunkDocument(content: string) {
  return content
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part, index) => ({
      heading: index === 0 ? 'overview' : `section-${index + 1}`,
      content: part,
      keywords: tokenize(part).slice(0, 10),
    }));
}

function hrefForDocument(slug: string) {
  if (slug === 'public-pricing') return '/pricing';
  if (slug === 'public-security') return '/security';
  if (slug === 'public-product-overview') return '/docs';
  if (slug.startsWith('agent-')) {
    return `/app/demo-workspace/marketplace/agents/${slug.replace('agent-', '')}`;
  }
  if (slug.startsWith('workflow-')) {
    return `/app/demo-workspace/marketplace/workflows/${slug.replace('workflow-', '')}`;
  }
  if (slug.startsWith('pack-')) {
    return `/app/demo-workspace/marketplace/packs/${slug.replace('pack-', '')}`;
  }
  return '/docs';
}

function scoreMatch(
  tokens: string[],
  title: string,
  content: string,
  keywords: string[],
) {
  const haystack = `${title} ${content}`.toLowerCase();
  let score = 0;

  for (const token of tokens) {
    if (title.toLowerCase().includes(token)) score += 5;
    if (keywords.some((keyword) => keyword.toLowerCase().includes(token))) score += 4;
    if (haystack.includes(token)) score += 1;
  }

  return score;
}

function excerptForMatch(content: string, tokens: string[]) {
  const sentences = content
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const bestSentence =
    sentences.find((sentence) =>
      tokens.some((token) => sentence.toLowerCase().includes(token)),
    ) ?? sentences[0] ?? content;

  return bestSentence.length > 220
    ? `${bestSentence.slice(0, 217)}...`
    : bestSentence;
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((part) => part.length > 2);
}

function hashContent(content: string) {
  return createHash('sha256').update(content).digest('hex');
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}
