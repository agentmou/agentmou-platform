import { z } from 'zod';

// ---------------------------------------------------------------------------
// Integration / Connector
// ---------------------------------------------------------------------------

/** Connection states exposed for installed integrations. */
export const IntegrationStatusSchema = z.enum(['connected', 'disconnected', 'error']);

/** TypeScript view of integration connection states. */
export type IntegrationStatus = z.infer<typeof IntegrationStatusSchema>;

/** Connector categories used for marketplace and settings grouping. */
export const IntegrationCategorySchema = z.enum([
  'communication',
  'crm',
  'productivity',
  'storage',
  'payment',
  'dev',
]);

/** TypeScript view of integration categories. */
export type IntegrationCategory = z.infer<typeof IntegrationCategorySchema>;

/** Public connector record returned by the API. */
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

/** TypeScript shape for a connector record. */
export type Integration = z.infer<typeof IntegrationSchema>;

/** Response payload for listing tenant connectors. */
export const ConnectorsResponseSchema = z.object({
  connectors: z.array(IntegrationSchema),
});

/** TypeScript shape for the connector list response. */
export type ConnectorsResponse = z.infer<typeof ConnectorsResponseSchema>;

/** Response payload for a single connector lookup. */
export const ConnectorResponseSchema = z.object({
  connector: IntegrationSchema,
});

/** TypeScript shape for a single connector response. */
export type ConnectorResponse = z.infer<typeof ConnectorResponseSchema>;

// ---------------------------------------------------------------------------
// n8n Connection
// ---------------------------------------------------------------------------

/** Health states recorded for n8n connectivity checks. */
export const N8nConnectionStatusSchema = z.enum(['success', 'failed']);

/** n8n connection summary exposed to tenant-facing settings pages. */
export const N8nConnectionSchema = z.object({
  tenantId: z.string(),
  baseUrl: z.string(),
  apiKeySet: z.boolean(),
  lastTestAt: z.string().optional(),
  lastTestStatus: N8nConnectionStatusSchema.optional(),
  executionCount: z.number(),
  availability: z.enum(['online', 'offline', 'not_configured']).optional(),
  installedWorkflows: z.number().optional(),
  activeWorkflows: z.number().optional(),
  lastProvisionedAt: z.string().optional(),
  lastExecutionAt: z.string().optional(),
  platformManaged: z.boolean().optional(),
});

/** TypeScript shape for the n8n connection summary. */
export type N8nConnection = z.infer<typeof N8nConnectionSchema>;

/** Availability states for the workflow engine integration. */
export const WorkflowEngineAvailabilitySchema = z.enum(['online', 'offline', 'not_configured']);

/** Detailed workflow engine status payload for a tenant. */
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

/** TypeScript shape for the workflow engine status payload. */
export type WorkflowEngineStatus = z.infer<typeof WorkflowEngineStatusSchema>;

/** Response payload for workflow engine status reads. */
export const WorkflowEngineStatusResponseSchema = z.object({
  status: WorkflowEngineStatusSchema,
});
