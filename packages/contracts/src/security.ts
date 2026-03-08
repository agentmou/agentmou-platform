import { z } from 'zod';

// ---------------------------------------------------------------------------
// Security findings
// ---------------------------------------------------------------------------

export const FindingSeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'info']);
export type FindingSeverity = z.infer<typeof FindingSeveritySchema>;

export const FindingCategorySchema = z.enum([
  'credentials',
  'webhook',
  'hitl',
  'pii',
  'permissions',
]);

export const SecurityFindingSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  severity: FindingSeveritySchema,
  title: z.string(),
  description: z.string(),
  remediation: z.string(),
  detectedAt: z.string(),
  resolvedAt: z.string().optional(),
  category: FindingCategorySchema,
});

export type SecurityFinding = z.infer<typeof SecurityFindingSchema>;

// ---------------------------------------------------------------------------
// Security policies
// ---------------------------------------------------------------------------

export const PolicyCategorySchema = z.enum(['auth', 'data', 'hitl', 'logging']);

export const SecurityPolicySchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  category: PolicyCategorySchema,
});

export type SecurityPolicy = z.infer<typeof SecurityPolicySchema>;

// ---------------------------------------------------------------------------
// Tenant security score (derived)
// ---------------------------------------------------------------------------

export const TenantSecurityScoreSchema = z.object({
  tenantId: z.string(),
  score: z.number().min(0).max(100),
  findings: z.array(SecurityFindingSchema),
  policies: z.array(SecurityPolicySchema),
  lastScanAt: z.string(),
});

export type TenantSecurityScore = z.infer<typeof TenantSecurityScoreSchema>;
