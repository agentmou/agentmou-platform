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
});

export type N8nConnection = z.infer<typeof N8nConnectionSchema>;
