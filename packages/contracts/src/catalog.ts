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

/** Availability labels shown for catalog assets. */
export const AvailabilitySchema = z.enum(['available', 'planned']);

/** TypeScript view of asset availability labels. */
export type Availability = z.infer<typeof AvailabilitySchema>;

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

// ---------------------------------------------------------------------------
// Agent Template
// ---------------------------------------------------------------------------

/** KPI definition shared by agent and pack marketing surfaces. */
export const KpiDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
});

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

// ---------------------------------------------------------------------------
// Workflow Template
// ---------------------------------------------------------------------------

/** Summary of a workflow node shown in the catalog UI. */
export const WorkflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

/** TypeScript shape for a workflow node summary. */
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;

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
});

/** TypeScript shape for a pack template. */
export type PackTemplate = z.infer<typeof PackTemplateSchema>;

/** Backward-compatible alias for grouping catalog assets by category. */
export type CatalogGroup = Category;

/** Backward-compatible alias for the pack vertical category. */
export type PackVertical = Category;
