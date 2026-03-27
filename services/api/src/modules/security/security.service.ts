import { FastifyInstance } from 'fastify';
import {
  approvalRequests,
  auditEvents,
  connectorAccounts,
  db,
  memberships,
  secretEnvelopes,
  tenants,
  users,
} from '@agentmou/db';
import type {
  AuditEvent,
  SecurityAlert,
  SecurityFinding,
  SecurityOverview,
  SecurityPolicy,
} from '@agentmou/contracts';
import { and, desc, eq } from 'drizzle-orm';

import { normalizeTenantSettings } from '../tenants/tenants.mapper.js';

export class SecurityService {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  async getSecuritySettings(tenantId: string) {
    const [tenant] = await db
      .select({
        settings: tenants.settings,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    const settings = normalizeTenantSettings(tenant?.settings);

    return {
      twoFactorEnabled: false,
      ssoEnabled: false,
      ipWhitelist: [],
      sessionTimeout: 3600,
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
      },
      readOnly: true,
      workspaceDefaults: {
        timezone: settings.timezone,
        defaultHITL: settings.defaultHITL,
      },
    };
  }

  async updateSecuritySettings(tenantId: string, settings: unknown) {
    const current = await this.getSecuritySettings(tenantId);
    return {
      ...current,
      attemptedSettings: settings,
      readOnly: true,
      updatedAt: new Date(),
      message:
        'Security settings remain read-only until enforcement-backed controls are implemented.',
    };
  }

  async getAuditLogs(tenantId: string, filters?: { category?: string }): Promise<AuditEvent[]> {
    const query = db
      .select({
        id: auditEvents.id,
        tenantId: auditEvents.tenantId,
        actorId: auditEvents.actorId,
        action: auditEvents.action,
        category: auditEvents.category,
        details: auditEvents.details,
        timestamp: auditEvents.timestamp,
        actorEmail: users.email,
        actorName: users.name,
      })
      .from(auditEvents)
      .leftJoin(users, eq(auditEvents.actorId, users.id))
      .where(
        filters?.category && filters.category !== 'all'
          ? and(eq(auditEvents.tenantId, tenantId), eq(auditEvents.category, filters.category))
          : eq(auditEvents.tenantId, tenantId)
      )
      .orderBy(desc(auditEvents.timestamp));

    const rows = await query;

    return rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      actorId: row.actorId ?? undefined,
      actorLabel: row.actorName ?? row.actorEmail ?? row.actorId ?? 'system',
      action: row.action,
      category: normalizeAuditCategory(row.category),
      details: isRecord(row.details) ? row.details : {},
      timestamp: row.timestamp.toISOString(),
    }));
  }

  async exportAuditLogs(tenantId: string) {
    const logs = await this.getAuditLogs(tenantId);
    return {
      tenantId,
      count: logs.length,
      exportedAt: new Date().toISOString(),
      format: 'json',
      logs,
    };
  }

  async listFindings(tenantId: string): Promise<SecurityFinding[]> {
    const [secrets, connectors, members, pendingApprovals, recentAuditLogs] = await Promise.all([
      db.select().from(secretEnvelopes).where(eq(secretEnvelopes.tenantId, tenantId)),
      db.select().from(connectorAccounts).where(eq(connectorAccounts.tenantId, tenantId)),
      db.select().from(memberships).where(eq(memberships.tenantId, tenantId)),
      db
        .select()
        .from(approvalRequests)
        .where(
          and(eq(approvalRequests.tenantId, tenantId), eq(approvalRequests.status, 'pending'))
        ),
      this.getAuditLogs(tenantId),
    ]);

    const findings: SecurityFinding[] = [];
    const now = Date.now();

    const staleSecrets = secrets.filter((secret) => {
      const rotatedAt = secret.rotatedAt ?? secret.createdAt;
      return now - rotatedAt.getTime() > 1000 * 60 * 60 * 24 * 90;
    });

    if (staleSecrets.length > 0) {
      findings.push({
        id: `stale-secrets-${tenantId}`,
        tenantId,
        severity: 'medium',
        title: 'Credential rotation is overdue',
        description: `${staleSecrets.length} secret(s) have not been rotated in the last 90 days.`,
        remediation: 'Rotate old credentials and verify each dependent connector still works.',
        detectedAt: new Date(now).toISOString(),
        category: 'credentials',
      });
    }

    const expiredConnectors = connectors.filter(
      (connector) => connector.tokenExpiresAt && connector.tokenExpiresAt.getTime() < now
    );
    if (expiredConnectors.length > 0) {
      findings.push({
        id: `expired-connectors-${tenantId}`,
        tenantId,
        severity: 'high',
        title: 'Connector credentials have expired',
        description: `${expiredConnectors.length} connector(s) need re-authentication before runs can rely on them.`,
        remediation: 'Reconnect the affected providers and confirm required scopes are present.',
        detectedAt: new Date(now).toISOString(),
        category: 'credentials',
      });
    }

    const unhealthyConnectors = connectors.filter(
      (connector) => connector.status === 'disconnected' || connector.status === 'error'
    );
    if (unhealthyConnectors.length > 0) {
      findings.push({
        id: `connector-coverage-${tenantId}`,
        tenantId,
        severity: 'medium',
        title: 'Connector coverage needs review',
        description: `${unhealthyConnectors.length} connector(s) are disconnected or reporting errors.`,
        remediation:
          'Review connector scopes and reconnect the integrations required by active agents.',
        detectedAt: new Date(now).toISOString(),
        category: 'permissions',
      });
    }

    const overdueApprovals = pendingApprovals.filter(
      (approval) => now - approval.requestedAt.getTime() > 1000 * 60 * 60 * 24
    );
    if (overdueApprovals.length > 0) {
      findings.push({
        id: `approval-backlog-${tenantId}`,
        tenantId,
        severity: 'low',
        title: 'Approval backlog can delay safe execution',
        description: `${overdueApprovals.length} approval request(s) have been pending for more than 24 hours.`,
        remediation:
          'Review pending approvals or tune the workflow so HITL checkpoints stay actionable.',
        detectedAt: new Date(now).toISOString(),
        category: 'hitl',
      });
    }

    const privilegedMembers = members.filter(
      (member) => member.role === 'owner' || member.role === 'admin'
    );
    if (privilegedMembers.length === 0) {
      findings.push({
        id: `privileged-access-${tenantId}`,
        tenantId,
        severity: 'high',
        title: 'No privileged workspace owner or admin detected',
        description:
          'This workspace currently has no owner/admin membership available for operational controls.',
        remediation:
          'Assign at least one owner or admin role so connector and billing incidents can be handled safely.',
        detectedAt: new Date(now).toISOString(),
        category: 'permissions',
      });
    }

    if (recentAuditLogs.length === 0) {
      findings.push({
        id: `audit-trail-${tenantId}`,
        tenantId,
        severity: 'info',
        title: 'Security-specific audit activity is still sparse',
        description: 'No security audit events have been recorded yet for this workspace.',
        remediation:
          'Review integrations, secrets, and memberships to confirm audit coverage is reaching the expected paths.',
        detectedAt: new Date(now).toISOString(),
        category: 'permissions',
      });
    }

    return findings;
  }

  async listPolicies(tenantId: string): Promise<SecurityPolicy[]> {
    const [tenant, members, approvals, logs] = await Promise.all([
      db
        .select({
          settings: tenants.settings,
        })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1),
      db.select().from(memberships).where(eq(memberships.tenantId, tenantId)),
      db.select().from(approvalRequests).where(eq(approvalRequests.tenantId, tenantId)),
      this.getAuditLogs(tenantId),
    ]);

    const settings = normalizeTenantSettings(tenant[0]?.settings);

    return [
      {
        id: `policy-rbac-${tenantId}`,
        tenantId,
        name: 'Role-based workspace access',
        description: 'Membership roles are enforced through tenant access checks.',
        enabled: members.length > 0,
        category: 'auth',
      },
      {
        id: `policy-secrets-${tenantId}`,
        tenantId,
        name: 'Encrypted secret storage',
        description: 'Secrets are stored in tenant-scoped envelopes instead of plain-text config.',
        enabled: true,
        category: 'data',
      },
      {
        id: `policy-hitl-${tenantId}`,
        tenantId,
        name: 'Human-in-the-loop approvals',
        description: 'Sensitive workflows can pause for approval instead of auto-executing.',
        enabled: settings.defaultHITL || approvals.length > 0,
        category: 'hitl',
      },
      {
        id: `policy-audit-${tenantId}`,
        tenantId,
        name: 'Operational audit trail',
        description: 'Security-relevant actions write tenant-scoped audit events.',
        enabled: logs.length > 0,
        category: 'logging',
      },
    ];
  }

  async getSecurityAlerts(tenantId: string): Promise<SecurityAlert[]> {
    const findings = await this.listFindings(tenantId);

    return findings
      .filter((finding) => finding.severity !== 'info')
      .map((finding) => ({
        id: `alert-${finding.id}`,
        tenantId,
        severity: finding.severity,
        category: finding.category,
        title: finding.title,
        message: finding.description,
        detectedAt: finding.detectedAt,
        relatedResource: finding.id,
      }));
  }

  async dismissAlert(tenantId: string, alertId: string) {
    return {
      id: alertId,
      tenantId,
      dismissed: true,
      dismissedAt: new Date(),
      note: 'Alerts are derived from current operational state and will reappear if the underlying issue persists.',
    };
  }

  async rotateApiKeys(tenantId: string) {
    return {
      tenantId,
      rotated: false,
      message: 'Workspace API key rotation is not wired to a live secret manager yet.',
    };
  }

  async getOverview(tenantId: string): Promise<SecurityOverview> {
    const [findings, policies, alerts, logs] = await Promise.all([
      this.listFindings(tenantId),
      this.listPolicies(tenantId),
      this.getSecurityAlerts(tenantId),
      this.getAuditLogs(tenantId),
    ]);

    return {
      tenantId,
      findings,
      policies,
      alerts,
      logs,
      updatedAt: new Date().toISOString(),
    };
  }
}

function normalizeAuditCategory(category: string): AuditEvent['category'] {
  if (
    category === 'auth' ||
    category === 'agent' ||
    category === 'workflow' ||
    category === 'security' ||
    category === 'connector' ||
    category === 'membership' ||
    category === 'approval' ||
    category === 'billing'
  ) {
    return category;
  }

  return 'security';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
