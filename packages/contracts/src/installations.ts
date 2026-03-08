import { z } from 'zod';

// ---------------------------------------------------------------------------
// Installation status
// ---------------------------------------------------------------------------

export const InstalledStatusSchema = z.enum(['active', 'paused', 'error', 'configuring']);
export type InstalledStatus = z.infer<typeof InstalledStatusSchema>;

// ---------------------------------------------------------------------------
// Installed Agent
// ---------------------------------------------------------------------------

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
  kpiValues: z.record(z.number()),
});

export type InstalledAgent = z.infer<typeof InstalledAgentSchema>;

// ---------------------------------------------------------------------------
// Installed Workflow
// ---------------------------------------------------------------------------

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

export type InstalledWorkflow = z.infer<typeof InstalledWorkflowSchema>;

// ---------------------------------------------------------------------------
// Installation process
// ---------------------------------------------------------------------------

export const InstallStepStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'failed',
  'skipped',
]);
export type InstallStepStatus = z.infer<typeof InstallStepStatusSchema>;

export const InstallStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  status: InstallStepStatusSchema,
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  error: z.string().optional(),
});

export type InstallStep = z.infer<typeof InstallStepSchema>;

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

export type InstallRun = z.infer<typeof InstallRunSchema>;
