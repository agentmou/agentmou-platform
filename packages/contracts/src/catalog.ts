import { z } from 'zod';

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------

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

export type Category = z.infer<typeof CategorySchema>;

export const CATEGORIES: Category[] = CategorySchema.options as unknown as Category[];

// ---------------------------------------------------------------------------
// Shared enums used across catalog entities
// ---------------------------------------------------------------------------

export const RiskLevelSchema = z.enum(['low', 'medium', 'high']);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const AvailabilitySchema = z.enum(['available', 'planned']);
export type Availability = z.infer<typeof AvailabilitySchema>;

export const AudienceSchema = z.enum(['business', 'personal', 'both']);
export type Audience = z.infer<typeof AudienceSchema>;

export const HITLModeSchema = z.enum(['optional', 'recommended', 'required']);
export type HITLMode = z.infer<typeof HITLModeSchema>;

export const ComplexitySchema = z.enum(['S', 'M', 'L']);
export type Complexity = z.infer<typeof ComplexitySchema>;

export const VersionChannelSchema = z.enum(['stable', 'beta']);
export type VersionChannel = z.infer<typeof VersionChannelSchema>;

export const VisibilitySchema = z.enum(['public', 'variant', 'hidden', 'deprecated']);
export type Visibility = z.infer<typeof VisibilitySchema>;

export const WorkflowVisibilitySchema = z.enum(['public', 'utility', 'hidden', 'deprecated']);
export type WorkflowVisibility = z.infer<typeof WorkflowVisibilitySchema>;

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
export type AgentDomain = z.infer<typeof AgentDomainSchema>;

export const WorkflowTriggerTypeSchema = z.enum([
  'webhook',
  'cron',
  'manual',
  'email',
  'event',
]);
export type WorkflowTriggerType = z.infer<typeof WorkflowTriggerTypeSchema>;

// ---------------------------------------------------------------------------
// Agent Template
// ---------------------------------------------------------------------------

export const KpiDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
});

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

export type AgentTemplate = z.infer<typeof AgentTemplateSchema>;

// ---------------------------------------------------------------------------
// Workflow Template
// ---------------------------------------------------------------------------

export const WorkflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;

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

export type WorkflowTemplate = z.infer<typeof WorkflowTemplateSchema>;

// ---------------------------------------------------------------------------
// Pack Template
// ---------------------------------------------------------------------------

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

export type PackTemplate = z.infer<typeof PackTemplateSchema>;

// Backward-compatible aliases
export type CatalogGroup = Category;
export type PackVertical = Category;
