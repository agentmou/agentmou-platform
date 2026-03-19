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

export const AuditEventCategorySchema = z.enum([
  'auth',
  'agent',
  'workflow',
  'security',
  'connector',
  'membership',
  'approval',
  'billing',
]);

export type AuditEventCategory = z.infer<typeof AuditEventCategorySchema>;

export const AuditEventSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  actorId: z.string().optional(),
  actorLabel: z.string(),
  action: z.string(),
  category: AuditEventCategorySchema,
  details: z.record(z.unknown()).default({}),
  timestamp: z.string(),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

export const SecurityAlertSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  severity: FindingSeveritySchema,
  category: FindingCategorySchema,
  title: z.string(),
  message: z.string(),
  detectedAt: z.string(),
  relatedResource: z.string().optional(),
});

export type SecurityAlert = z.infer<typeof SecurityAlertSchema>;

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

export const SecurityOverviewSchema = z.object({
  tenantId: z.string(),
  findings: z.array(SecurityFindingSchema),
  policies: z.array(SecurityPolicySchema),
  alerts: z.array(SecurityAlertSchema),
  logs: z.array(AuditEventSchema),
  updatedAt: z.string(),
});

export type SecurityOverview = z.infer<typeof SecurityOverviewSchema>;

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

export const SecurityFindingsResponseSchema = z.object({
  findings: z.array(SecurityFindingSchema),
});

export const SecurityPoliciesResponseSchema = z.object({
  policies: z.array(SecurityPolicySchema),
});

export const SecurityAlertsResponseSchema = z.object({
  alerts: z.array(SecurityAlertSchema),
});

export const AuditEventsResponseSchema = z.object({
  logs: z.array(AuditEventSchema),
});

export const SecurityOverviewResponseSchema = z.object({
  overview: SecurityOverviewSchema,
});
