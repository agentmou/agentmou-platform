import {
  AgentTemplateSchema,
  DEFAULT_OPERATIONAL_LISTING_AVAILABILITY,
  PackTemplateSchema,
  WorkflowTemplateSchema,
  type AgentDomain,
  type AgentTemplate,
  type Category,
  type OperationalAgentManifest,
  type OperationalPackManifest,
  type OperationalWorkflowManifest,
  type WorkflowTemplate,
  type WorkflowTriggerType,
  type PackTemplate,
} from '@agentmou/contracts';

const CATEGORY_SET = new Set<Category>([
  'core',
  'support',
  'sales',
  'research',
  'marketing',
  'finance',
  'ops',
  'personal',
]);

const AGENT_DOMAIN_SET = new Set<AgentDomain>([
  'support',
  'sales',
  'research',
  'core',
  'marketing',
  'ops',
  'finance',
  'productivity',
  'creator',
  'education',
  'personal',
]);

export function mapAgentManifest(manifest: OperationalAgentManifest): AgentTemplate {
  const category = toCategory(manifest.catalog?.catalogGroup ?? manifest.category);
  const tags = manifest.catalog?.tags ?? manifest.tags;

  return AgentTemplateSchema.parse({
    id: manifest.id,
    name: manifest.name,
    outcome: manifest.catalog?.outcome ?? manifest.description,
    domain: manifest.catalog?.domain ?? toAgentDomain(manifest.category) ?? 'core',
    description: manifest.description,
    inputs: manifest.catalog?.inputs ?? [],
    outputs: manifest.catalog?.outputs ?? [],
    requiredIntegrations: manifest.runtime?.requiredConnectors ?? [],
    workflows: manifest.runtime?.linkedWorkflows ?? [],
    riskLevel: manifest.catalog?.riskLevel ?? 'low',
    hitl: manifest.catalog?.hitl ?? 'optional',
    kpis: manifest.catalog?.kpis ?? [],
    complexity: manifest.catalog?.complexity ?? 'M',
    version: manifest.version,
    channel: manifest.catalog?.channel ?? 'stable',
    setupTimeMinutes: manifest.catalog?.setupTimeMinutes ?? 15,
    monthlyPrice: manifest.catalog?.monthlyPrice ?? null,
    availability: manifest.catalog?.availability ?? DEFAULT_OPERATIONAL_LISTING_AVAILABILITY,
    audience: manifest.catalog?.audience,
    statusNote: manifest.catalog?.statusNote,
    source: manifest.catalog?.source ?? 'manifest',
    catalogGroup: category ?? undefined,
    family: manifest.catalog?.family,
    subdomain: manifest.catalog?.subdomain,
    tags,
    featured: manifest.catalog?.featured,
    visibility: manifest.catalog?.visibility,
    variantOf: manifest.catalog?.variantOf,
    replacedBy: manifest.catalog?.replacedBy,
  });
}

export function mapWorkflowManifest(manifest: OperationalWorkflowManifest): WorkflowTemplate {
  const category = toCategory(manifest.category);
  const derivedNodesOverview =
    manifest.steps?.map((step) => ({
      id: String(step.id),
      type: step.type,
      name: step.name,
      description: [step.node, step.action, step.agent].filter(Boolean).join(' · ') || undefined,
    })) ?? [];

  return WorkflowTemplateSchema.parse({
    id: manifest.id,
    name: manifest.name,
    summary: manifest.catalog?.summary ?? manifest.description,
    trigger: normalizeWorkflowTrigger(manifest.trigger?.type),
    integrations: manifest.catalog?.integrations ?? manifest.runtime?.requiredConnectors ?? [],
    output: manifest.catalog?.output ?? manifest.description,
    useCase: manifest.catalog?.useCase ?? manifest.description,
    riskLevel: manifest.catalog?.riskLevel ?? 'low',
    version: manifest.version,
    changelog: manifest.catalog?.changelog ?? [
      `${manifest.version}: Initial manifest-backed release`,
    ],
    nodesOverview: manifest.catalog?.nodesOverview.length
      ? manifest.catalog.nodesOverview
      : derivedNodesOverview,
    availability:
      manifest.status === 'planned'
        ? 'planned'
        : (manifest.catalog?.availability ?? DEFAULT_OPERATIONAL_LISTING_AVAILABILITY),
    source: manifest.catalog?.source ?? 'manifest',
    statusNote: manifest.catalog?.statusNote,
    catalogGroups: manifest.catalog?.catalogGroups ?? (category ? [category] : undefined),
    family: manifest.catalog?.family,
    tags: manifest.catalog?.tags,
    featured: manifest.catalog?.featured,
    visibility: manifest.catalog?.visibility,
    replacedBy: manifest.catalog?.replacedBy,
  });
}

export function mapPackManifest(manifest: OperationalPackManifest): PackTemplate {
  const vertical = manifest.catalog?.vertical ?? toCategory(manifest.category) ?? 'core';

  return PackTemplateSchema.parse({
    id: manifest.id,
    name: manifest.name,
    slug: manifest.catalog?.slug ?? manifest.id,
    vertical,
    description: manifest.description,
    includedCategories: manifest.catalog?.includedCategories ?? [vertical],
    includedAgents: manifest.agents,
    includedWorkflows: manifest.workflows ?? [],
    setupTimeEstimate: manifest.catalog?.setupTimeEstimate ?? '30 minutes',
    kpis: manifest.catalog?.kpis ?? [],
    riskProfile: manifest.catalog?.riskProfile ?? 'low',
    monthlyPrice: manifest.catalog?.monthlyPrice ?? null,
    featured: manifest.catalog?.featured,
    catalogGroup: manifest.catalog?.catalogGroup ?? toCategory(manifest.category) ?? undefined,
    tags: manifest.catalog?.tags,
    availability: manifest.catalog?.availability ?? DEFAULT_OPERATIONAL_LISTING_AVAILABILITY,
  });
}

function normalizeWorkflowTrigger(value: string | undefined): WorkflowTriggerType {
  switch (value) {
    case 'schedule':
      return 'cron';
    case 'gmail':
      return 'email';
    case 'webhook':
      return 'webhook';
    case 'event':
      return 'event';
    case 'manual':
      return 'manual';
    default:
      return 'manual';
  }
}

function toCategory(value: string | undefined): Category | null {
  if (!value) {
    return null;
  }

  return CATEGORY_SET.has(value as Category) ? (value as Category) : null;
}

function toAgentDomain(value: string | undefined): AgentDomain | null {
  if (!value) {
    return null;
  }

  return AGENT_DOMAIN_SET.has(value as AgentDomain) ? (value as AgentDomain) : null;
}
