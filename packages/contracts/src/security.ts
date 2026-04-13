import { z } from 'zod';

// ---------------------------------------------------------------------------
// Security findings
// ---------------------------------------------------------------------------

/** Severity levels used by security findings and alerts. */
export const FindingSeveritySchema = z.enum(['critical', 'high', 'medium', 'low', 'info']);

/** TypeScript view of security finding severities. */
export type FindingSeverity = z.infer<typeof FindingSeveritySchema>;

/** Security categories used by findings and alerts. */
export const FindingCategorySchema = z.enum([
  'credentials',
  'webhook',
  'hitl',
  'pii',
  'permissions',
]);

/** Security finding record returned by tenant security endpoints. */
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

/** TypeScript shape for a security finding. */
export type SecurityFinding = z.infer<typeof SecurityFindingSchema>;

/** Audit event categories used by the security and governance UI. */
export const AuditEventCategorySchema = z.enum([
  'auth',
  'agent',
  'workflow',
  'security',
  'connector',
  'membership',
  'approval',
  'billing',
  'admin',
]);

/** TypeScript view of audit event categories. */
export type AuditEventCategory = z.infer<typeof AuditEventCategorySchema>;

/** Audit event record shared with the tenant audit log UI. */
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

/** TypeScript shape for an audit event. */
export type AuditEvent = z.infer<typeof AuditEventSchema>;

/** Security alert payload surfaced for urgent tenant issues. */
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

/** TypeScript shape for a security alert. */
export type SecurityAlert = z.infer<typeof SecurityAlertSchema>;

// ---------------------------------------------------------------------------
// Security policies
// ---------------------------------------------------------------------------

/** Security policy categories available to tenants. */
export const PolicyCategorySchema = z.enum(['auth', 'data', 'hitl', 'logging']);

/** Configurable tenant security policy record. */
export const SecurityPolicySchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  description: z.string(),
  enabled: z.boolean(),
  category: PolicyCategorySchema,
});

/** TypeScript shape for a security policy. */
export type SecurityPolicy = z.infer<typeof SecurityPolicySchema>;

/** Aggregate security overview returned to the tenant UI. */
export const SecurityOverviewSchema = z.object({
  tenantId: z.string(),
  findings: z.array(SecurityFindingSchema),
  policies: z.array(SecurityPolicySchema),
  alerts: z.array(SecurityAlertSchema),
  logs: z.array(AuditEventSchema),
  updatedAt: z.string(),
});

/** TypeScript shape for the security overview payload. */
export type SecurityOverview = z.infer<typeof SecurityOverviewSchema>;

// ---------------------------------------------------------------------------
// Tenant security score (derived)
// ---------------------------------------------------------------------------

/** Derived tenant security score and supporting context. */
export const TenantSecurityScoreSchema = z.object({
  tenantId: z.string(),
  score: z.number().min(0).max(100),
  findings: z.array(SecurityFindingSchema),
  policies: z.array(SecurityPolicySchema),
  lastScanAt: z.string(),
});

/** TypeScript shape for a tenant security score payload. */
export type TenantSecurityScore = z.infer<typeof TenantSecurityScoreSchema>;

/** Response payload for security finding list endpoints. */
export const SecurityFindingsResponseSchema = z.object({
  findings: z.array(SecurityFindingSchema),
});

/** Response payload for security policy list endpoints. */
export const SecurityPoliciesResponseSchema = z.object({
  policies: z.array(SecurityPolicySchema),
});

/** Response payload for security alert list endpoints. */
export const SecurityAlertsResponseSchema = z.object({
  alerts: z.array(SecurityAlertSchema),
});

/** Response payload for audit event list endpoints. */
export const AuditEventsResponseSchema = z.object({
  logs: z.array(AuditEventSchema),
});

/** Response payload for the tenant security overview endpoint. */
export const SecurityOverviewResponseSchema = z.object({
  overview: SecurityOverviewSchema,
});
