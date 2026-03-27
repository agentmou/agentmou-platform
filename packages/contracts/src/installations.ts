import { z } from 'zod';

// ---------------------------------------------------------------------------
// Installation status
// ---------------------------------------------------------------------------

/** Lifecycle states for installed agents and workflows. */
export const InstalledStatusSchema = z.enum(['active', 'paused', 'error', 'configuring']);

/** TypeScript view of installation lifecycle states. */
export type InstalledStatus = z.infer<typeof InstalledStatusSchema>;

// ---------------------------------------------------------------------------
// Installed Agent
// ---------------------------------------------------------------------------

/** Tenant-scoped installed agent record. */
export const InstalledAgentSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  templateId: z.string(),
  status: InstalledStatusSchema,
  installedAt: z.string(),
  config: z.record(z.unknown()),
  hitlEnabled: z.boolean(),
  lastRunAt: z.string().nullable(),
  runsTotal: z.number(),
  runsSuccess: z.number(),
  kpiValues: z.record(z.number()).default({}),
});

/** TypeScript shape for an installed agent. */
export type InstalledAgent = z.infer<typeof InstalledAgentSchema>;

// ---------------------------------------------------------------------------
// Installed Workflow
// ---------------------------------------------------------------------------

/** Tenant-scoped installed workflow record. */
export const InstalledWorkflowSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  templateId: z.string(),
  status: InstalledStatusSchema,
  installedAt: z.string(),
  config: z.record(z.unknown()),
  lastRunAt: z.string().nullable(),
  runsTotal: z.number(),
  runsSuccess: z.number(),
});

/** TypeScript shape for an installed workflow. */
export type InstalledWorkflow = z.infer<typeof InstalledWorkflowSchema>;

/** Grouped installation payload returned by the API. */
export const InstallationCollectionSchema = z.object({
  agents: z.array(InstalledAgentSchema),
  workflows: z.array(InstalledWorkflowSchema),
});

/** TypeScript shape for grouped installations. */
export type InstallationCollection = z.infer<typeof InstallationCollectionSchema>;

/** Response payload for installation listing endpoints. */
export const InstallationsResponseSchema = z.object({
  installations: InstallationCollectionSchema,
});

/** TypeScript shape for the installations response. */
export type InstallationsResponse = z.infer<typeof InstallationsResponseSchema>;

export const InstallationKindSchema = z.enum(['agent', 'workflow']);

export const AgentInstallationRecordSchema = InstalledAgentSchema.extend({
  type: z.literal('agent'),
});

export const WorkflowInstallationRecordSchema = InstalledWorkflowSchema.extend({
  type: z.literal('workflow'),
});

export const InstallationRecordSchema = z.discriminatedUnion('type', [
  AgentInstallationRecordSchema,
  WorkflowInstallationRecordSchema,
]);

export type InstallationRecord = z.infer<typeof InstallationRecordSchema>;

export const InstallationResponseSchema = z.object({
  installation: InstallationRecordSchema,
});

export type InstallationResponse = z.infer<typeof InstallationResponseSchema>;

export const InstallPackQueuedResponseSchema = z.object({
  jobId: z.union([z.string(), z.number()]),
  status: z.literal('queued'),
  message: z.string(),
});

export type InstallPackQueuedResponse = z.infer<
  typeof InstallPackQueuedResponseSchema
>;

// ---------------------------------------------------------------------------
// Installation process
// ---------------------------------------------------------------------------

/** Per-step lifecycle states for an install run. */
export const InstallStepStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'failed',
  'skipped',
]);

/** TypeScript view of install step lifecycle states. */
export type InstallStepStatus = z.infer<typeof InstallStepStatusSchema>;

/** Single step inside an installation run. */
export const InstallStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: InstallStepStatusSchema,
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  error: z.string().optional(),
});

/** TypeScript shape for an installation step. */
export type InstallStep = z.infer<typeof InstallStepSchema>;

/** End-to-end installation run payload shared with the UI. */
export const InstallRunSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  packId: z.string().optional(),
  selectedAgents: z.array(z.string()),
  selectedWorkflows: z.array(z.string()),
  status: z.enum(['draft', 'in_progress', 'completed', 'failed']),
  steps: z.array(InstallStepSchema),
  config: z.object({
    outcome: z.string().optional(),
    integrations: z.record(z.boolean()),
    variables: z.record(z.string()),
    hitlSettings: z.record(z.boolean()),
  }),
  createdAt: z.string(),
  completedAt: z.string().optional(),
});

/** TypeScript shape for an installation run. */
export type InstallRun = z.infer<typeof InstallRunSchema>;
