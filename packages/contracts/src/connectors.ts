import { z } from 'zod';

// ---------------------------------------------------------------------------
// Integration / Connector
// ---------------------------------------------------------------------------

export const IntegrationStatusSchema = z.enum(['connected', 'disconnected', 'error']);
export type IntegrationStatus = z.infer<typeof IntegrationStatusSchema>;

export const IntegrationCategorySchema = z.enum([
  'communication',
  'crm',
  'productivity',
  'storage',
  'payment',
  'dev',
]);
export type IntegrationCategory = z.infer<typeof IntegrationCategorySchema>;

export const IntegrationSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  category: IntegrationCategorySchema,
  status: IntegrationStatusSchema,
  scopes: z.array(z.string()),
  requiredScopes: z.array(z.string()),
  lastTestAt: z.string().nullable(),
  oauthUrl: z.string().optional(),
});

export type Integration = z.infer<typeof IntegrationSchema>;

export const ConnectorsResponseSchema = z.object({
  connectors: z.array(IntegrationSchema),
});

export type ConnectorsResponse = z.infer<typeof ConnectorsResponseSchema>;

export const ConnectorResponseSchema = z.object({
  connector: IntegrationSchema,
});

export type ConnectorResponse = z.infer<typeof ConnectorResponseSchema>;

// ---------------------------------------------------------------------------
// n8n Connection
// ---------------------------------------------------------------------------

export const N8nConnectionStatusSchema = z.enum(['success', 'failed']);

export const N8nConnectionSchema = z.object({
  tenantId: z.string(),
  baseUrl: z.string(),
  apiKeySet: z.boolean(),
  lastTestAt: z.string().optional(),
  lastTestStatus: N8nConnectionStatusSchema.optional(),
  executionCount: z.number(),
  availability: z
    .enum(['online', 'offline', 'not_configured'])
    .optional(),
  installedWorkflows: z.number().optional(),
  activeWorkflows: z.number().optional(),
  lastProvisionedAt: z.string().optional(),
  lastExecutionAt: z.string().optional(),
  platformManaged: z.boolean().optional(),
});

export type N8nConnection = z.infer<typeof N8nConnectionSchema>;

export const WorkflowEngineAvailabilitySchema = z.enum([
  'online',
  'offline',
  'not_configured',
]);

export const WorkflowEngineStatusSchema = z.object({
  tenantId: z.string(),
  availability: WorkflowEngineAvailabilitySchema,
  baseUrl: z.string(),
  apiKeySet: z.boolean(),
  lastTestAt: z.string().optional(),
  lastTestStatus: N8nConnectionStatusSchema.optional(),
  installedWorkflows: z.number(),
  activeWorkflows: z.number(),
  executionCount: z.number(),
  lastProvisionedAt: z.string().optional(),
  lastExecutionAt: z.string().optional(),
  platformManaged: z.boolean(),
});

export type WorkflowEngineStatus = z.infer<typeof WorkflowEngineStatusSchema>;

export const WorkflowEngineStatusResponseSchema = z.object({
  status: WorkflowEngineStatusSchema,
});
