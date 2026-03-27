import { z } from 'zod';

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------

/** Top-level catalog categories used by agents, packs, and workflows. */
export const CategorySchema = z.enum([
  'core',
  'support',
  'sales',
  'research',
  'marketing',
  'finance',
  'ops',
  'personal',
]);

/** TypeScript view of the supported catalog categories. */
export type Category = z.infer<typeof CategorySchema>;

/** Ordered list of catalog categories for filters and seeded UI displays. */
export const CATEGORIES: Category[] = CategorySchema.options as unknown as Category[];

// ---------------------------------------------------------------------------
// Shared enums used across catalog entities
// ---------------------------------------------------------------------------

/** Risk levels used when describing templates and actions. */
export const RiskLevelSchema = z.enum(['low', 'medium', 'high']);

/** TypeScript view of supported risk levels. */
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

/**
 * Listing readiness for catalog templates in the UI and catalog APIs.
 *
 * - `planned` — Not backed by an operational manifest (roadmap-only, demo-only
 *   fiction outside the operational tree), or workflow manifests under planning
 *   status.
 * - `preview` — Operational manifest exists (eligible for the same lists as the
 *   catalog API) but **not** cleared as generally available via product checklist.
 * - `available` — Operational **and** explicitly marked generally available in
 *   manifest `catalog.availability`.
 */
export const AvailabilitySchema = z.enum(['planned', 'preview', 'available']);

/** TypeScript view of asset availability labels. */
export type Availability = z.infer<typeof AvailabilitySchema>;

/**
 * Default listing tier when an operational manifest omits `catalog.availability`.
 * Prefer this over assuming `available`, which implies GA / checklist sign-off.
 */
export const DEFAULT_OPERATIONAL_LISTING_AVAILABILITY: Availability = 'preview';

/** Audience labels for templates and packs. */
export const AudienceSchema = z.enum(['business', 'personal', 'both']);

/** TypeScript view of audience labels. */
export type Audience = z.infer<typeof AudienceSchema>;

/** Human-in-the-loop recommendation levels for agents. */
export const HITLModeSchema = z.enum(['optional', 'recommended', 'required']);

/** TypeScript view of HITL recommendation levels. */
export type HITLMode = z.infer<typeof HITLModeSchema>;

/** T-shirt sizing used for template complexity. */
export const ComplexitySchema = z.enum(['S', 'M', 'L']);

/** TypeScript view of template complexity values. */
export type Complexity = z.infer<typeof ComplexitySchema>;

/** Release channels for catalog assets. */
export const VersionChannelSchema = z.enum(['stable', 'beta']);

/** TypeScript view of asset release channels. */
export type VersionChannel = z.infer<typeof VersionChannelSchema>;

/** Visibility states for agent templates. */
export const VisibilitySchema = z.enum(['public', 'variant', 'hidden', 'deprecated']);

/** TypeScript view of agent template visibility states. */
export type Visibility = z.infer<typeof VisibilitySchema>;

/** Visibility states for workflow templates. */
export const WorkflowVisibilitySchema = z.enum(['public', 'utility', 'hidden', 'deprecated']);

/** TypeScript view of workflow template visibility states. */
export type WorkflowVisibility = z.infer<typeof WorkflowVisibilitySchema>;

/** Domains used to classify agent templates. */
export const AgentDomainSchema = z.enum([
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

/** TypeScript view of agent template domains. */
export type AgentDomain = z.infer<typeof AgentDomainSchema>;

/** Trigger types supported by workflow templates. */
export const WorkflowTriggerTypeSchema = z.enum([
  'webhook',
  'cron',
  'manual',
  'email',
  'event',
]);

/** TypeScript view of workflow trigger types. */
export type WorkflowTriggerType = z.infer<typeof WorkflowTriggerTypeSchema>;

/** KPI definition shared by agent and pack marketing surfaces. */
export const KpiDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
});

/** Summary of a workflow node shown in the catalog UI. */
export const WorkflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

/** TypeScript shape for a workflow node summary. */
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;

// ---------------------------------------------------------------------------
// Operational manifest metadata
// ---------------------------------------------------------------------------

/** Runtime owner responsible for executing an installed catalog asset. */
export const RuntimeOwnerSchema = z.enum([
  'agent_engine',
  'n8n',
  'agents_service',
  'platform_api',
]);

/** TypeScript view of supported runtime owners. */
export type RuntimeOwner = z.infer<typeof RuntimeOwnerSchema>;

/** Strategy describing where runtime credentials are expected to live. */
export const CredentialStrategySchema = z.enum([
  'platform_managed',
  'n8n_native_exception',
]);

/** TypeScript view of supported credential strategies. */
export type CredentialStrategy = z.infer<typeof CredentialStrategySchema>;

/** Strategy describing how installs are materialized at runtime. */
export const InstallStrategySchema = z.enum([
  'shared_n8n_per_installation',
  'platform_managed_installation',
]);

/** TypeScript view of supported install strategies. */
export type InstallStrategy = z.infer<typeof InstallStrategySchema>;

/** Shared runtime metadata attached to operational manifests. */
export const RuntimeMetadataSchema = z.object({
  requiredConnectors: z.array(z.string()).default([]),
  credentialStrategy: CredentialStrategySchema.default('platform_managed'),
  installStrategy: InstallStrategySchema.default('platform_managed_installation'),
  runtimeOwner: RuntimeOwnerSchema,
});

/** TypeScript shape for shared runtime manifest metadata. */
export type RuntimeMetadata = z.infer<typeof RuntimeMetadataSchema>;

/** Minimal trigger declaration used by operational agent manifests. */
export const AgentManifestTriggerSchema = z.object({
  type: z.string(),
  cron: z.string().optional(),
  event: z.string().optional(),
});

/** TypeScript shape for an operational agent trigger declaration. */
export type AgentManifestTrigger = z.infer<typeof AgentManifestTriggerSchema>;

/** Minimal operational workflow step declaration. */
export const WorkflowManifestStepSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  type: z.string(),
  node: z.string().optional(),
  agent: z.string().optional(),
  action: z.string().optional(),
  condition: z.string().optional(),
});

/** TypeScript shape for an operational workflow step. */
export type WorkflowManifestStep = z.infer<typeof WorkflowManifestStepSchema>;

/** Trigger declaration used by operational workflow manifests. */
export const WorkflowManifestTriggerSchema = z.object({
  type: z.string(),
  event: z.string().optional(),
  config: z.record(z.unknown()).optional(),
});

/** TypeScript shape for an operational workflow trigger declaration. */
export type WorkflowManifestTrigger = z.infer<typeof WorkflowManifestTriggerSchema>;

/** UI-oriented metadata nested inside an operational agent manifest. */
export const AgentCatalogMetadataSchema = z.object({
  outcome: z.string(),
  domain: AgentDomainSchema,
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
  riskLevel: RiskLevelSchema,
  hitl: HITLModeSchema,
  kpis: z.array(KpiDefinitionSchema),
  complexity: ComplexitySchema,
  channel: VersionChannelSchema,
  setupTimeMinutes: z.number(),
  monthlyPrice: z.number().nullable(),
  availability: AvailabilitySchema.optional(),
  audience: AudienceSchema.optional(),
  statusNote: z.string().optional(),
  source: z.string().optional(),
  catalogGroup: CategorySchema.optional(),
  family: z.string().optional(),
  subdomain: z.string().optional(),
  tags: z.array(z.string()).optional(),
  featured: z.boolean().optional(),
  visibility: VisibilitySchema.optional(),
  variantOf: z.string().optional(),
  replacedBy: z.string().optional(),
});

/** TypeScript shape for nested agent catalog metadata. */
export type AgentCatalogMetadata = z.infer<typeof AgentCatalogMetadataSchema>;

/** UI-oriented metadata nested inside an operational workflow manifest. */
export const WorkflowCatalogMetadataSchema = z.object({
  summary: z.string(),
  integrations: z.array(z.string()),
  output: z.string(),
  useCase: z.string(),
  riskLevel: RiskLevelSchema,
  changelog: z.array(z.string()),
  nodesOverview: z.array(WorkflowNodeSchema),
  availability: AvailabilitySchema.optional(),
  source: z.string().optional(),
  statusNote: z.string().optional(),
  catalogGroups: z.array(CategorySchema).optional(),
  family: z.string().optional(),
  tags: z.array(z.string()).optional(),
  featured: z.boolean().optional(),
  visibility: WorkflowVisibilitySchema.optional(),
  replacedBy: z.string().optional(),
});

/** TypeScript shape for nested workflow catalog metadata. */
export type WorkflowCatalogMetadata = z.infer<typeof WorkflowCatalogMetadataSchema>;

/** UI-oriented metadata nested inside an operational pack manifest. */
export const PackCatalogMetadataSchema = z.object({
  slug: z.string(),
  vertical: CategorySchema,
  includedCategories: z.array(CategorySchema),
  setupTimeEstimate: z.string(),
  kpis: z.array(z.string()),
  riskProfile: RiskLevelSchema,
  monthlyPrice: z.number().nullable(),
  featured: z.boolean().optional(),
  catalogGroup: CategorySchema.optional(),
  tags: z.array(z.string()).optional(),
  availability: AvailabilitySchema.optional(),
});

/** TypeScript shape for nested pack catalog metadata. */
export type PackCatalogMetadata = z.infer<typeof PackCatalogMetadataSchema>;

// ---------------------------------------------------------------------------
// Agent Template
// ---------------------------------------------------------------------------

/** Canonical agent template contract used in the catalog UI and API. */
export const AgentTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  outcome: z.string(),
  domain: AgentDomainSchema,
  description: z.string(),
  inputs: z.array(z.string()),
  outputs: z.array(z.string()),
  requiredIntegrations: z.array(z.string()),
  workflows: z.array(z.string()),
  riskLevel: RiskLevelSchema,
  hitl: HITLModeSchema,
  kpis: z.array(KpiDefinitionSchema),
  complexity: ComplexitySchema,
  version: z.string(),
  channel: VersionChannelSchema,
  setupTimeMinutes: z.number(),
  monthlyPrice: z.number().nullable(),
  availability: AvailabilitySchema.optional(),
  audience: AudienceSchema.optional(),
  statusNote: z.string().optional(),
  source: z.string().optional(),
  catalogGroup: CategorySchema.optional(),
  family: z.string().optional(),
  subdomain: z.string().optional(),
  tags: z.array(z.string()).optional(),
  featured: z.boolean().optional(),
  visibility: VisibilitySchema.optional(),
  variantOf: z.string().optional(),
  replacedBy: z.string().optional(),
});

/** TypeScript shape for an agent template. */
export type AgentTemplate = z.infer<typeof AgentTemplateSchema>;

/** Operational manifest schema for `catalog/agents/<slug>/manifest.yaml`. */
export const OperationalAgentManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  category: CategorySchema.optional(),
  author: z.string().optional(),
  tags: z.array(z.string()).optional(),
  capabilities: z.array(z.record(z.unknown())).optional(),
  triggers: z.array(AgentManifestTriggerSchema).optional(),
  runtime: RuntimeMetadataSchema.extend({
    linkedWorkflows: z.array(z.string()).default([]),
  }).optional(),
  catalog: AgentCatalogMetadataSchema.optional(),
  metadata: z
    .object({
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
    })
    .optional(),
});

/** TypeScript shape for an operational agent manifest. */
export type OperationalAgentManifest = z.infer<typeof OperationalAgentManifestSchema>;

// ---------------------------------------------------------------------------
// Workflow Template
// ---------------------------------------------------------------------------

/** Canonical workflow template contract used in the catalog UI and API. */
export const WorkflowTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  summary: z.string(),
  trigger: WorkflowTriggerTypeSchema,
  integrations: z.array(z.string()),
  output: z.string(),
  useCase: z.string(),
  riskLevel: RiskLevelSchema,
  version: z.string(),
  changelog: z.array(z.string()),
  nodesOverview: z.array(WorkflowNodeSchema),
  availability: AvailabilitySchema.optional(),
  source: z.string().optional(),
  statusNote: z.string().optional(),
  catalogGroups: z.array(CategorySchema).optional(),
  family: z.string().optional(),
  tags: z.array(z.string()).optional(),
  featured: z.boolean().optional(),
  visibility: WorkflowVisibilitySchema.optional(),
  replacedBy: z.string().optional(),
});

/** TypeScript shape for a workflow template. */
export type WorkflowTemplate = z.infer<typeof WorkflowTemplateSchema>;

/** Operational manifest schema for `workflows/public/<slug>/manifest.yaml`. */
export const OperationalWorkflowManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  type: z.string().optional(),
  status: z.string().optional(),
  category: CategorySchema.optional(),
  trigger: WorkflowManifestTriggerSchema.optional(),
  steps: z.array(WorkflowManifestStepSchema).optional(),
  runtime: RuntimeMetadataSchema.optional(),
  catalog: WorkflowCatalogMetadataSchema.optional(),
  metadata: z
    .object({
      author: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      executionCount: z.number().optional(),
      avgExecutionTime: z.string().optional(),
    })
    .optional(),
});

/** TypeScript shape for an operational workflow manifest. */
export type OperationalWorkflowManifest = z.infer<typeof OperationalWorkflowManifestSchema>;

// ---------------------------------------------------------------------------
// Pack Template
// ---------------------------------------------------------------------------

/** Pack template contract for grouped agent and workflow installations. */
export const PackTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  vertical: CategorySchema,
  description: z.string(),
  includedCategories: z.array(CategorySchema),
  includedAgents: z.array(z.string()),
  includedWorkflows: z.array(z.string()),
  setupTimeEstimate: z.string(),
  kpis: z.array(z.string()),
  riskProfile: RiskLevelSchema,
  monthlyPrice: z.number().nullable(),
  featured: z.boolean().optional(),
  catalogGroup: CategorySchema.optional(),
  tags: z.array(z.string()).optional(),
  availability: AvailabilitySchema.optional(),
  statusNote: z.string().optional(),
});

/** TypeScript shape for a pack template. */
export type PackTemplate = z.infer<typeof PackTemplateSchema>;

/** Operational manifest schema for `catalog/packs/<slug>.yaml`. */
export const OperationalPackManifestSchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  description: z.string(),
  category: CategorySchema.optional(),
  agents: z.array(z.string()),
  workflows: z.array(z.string()).optional(),
  connectors: z.array(z.string()).optional(),
  recommended_settings: z.record(z.unknown()).optional(),
  catalog: PackCatalogMetadataSchema.optional(),
});

/** TypeScript shape for an operational pack manifest. */
export type OperationalPackManifest = z.infer<typeof OperationalPackManifestSchema>;

/** Catalog response envelope for agent template lists. */
export const AgentTemplatesResponseSchema = z.object({
  agents: z.array(AgentTemplateSchema),
});

/** Catalog response envelope for a single agent template. */
export const AgentTemplateResponseSchema = z.object({
  agent: AgentTemplateSchema,
});

/** Catalog response envelope for workflow template lists. */
export const WorkflowTemplatesResponseSchema = z.object({
  workflows: z.array(WorkflowTemplateSchema),
});

/** Catalog response envelope for a single workflow template. */
export const WorkflowTemplateResponseSchema = z.object({
  workflow: WorkflowTemplateSchema,
});

/** Catalog response envelope for pack template lists. */
export const PackTemplatesResponseSchema = z.object({
  packs: z.array(PackTemplateSchema),
});

/** Catalog response envelope for a single pack template. */
export const PackTemplateResponseSchema = z.object({
  pack: PackTemplateSchema,
});

/** Backward-compatible alias for grouping catalog assets by category. */
export type CatalogGroup = Category;

/** Backward-compatible alias for the pack vertical category. */
export type PackVertical = Category;
