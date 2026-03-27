import {
  InstallationRecordSchema,
  InstalledAgentSchema,
  InstalledWorkflowSchema,
  type InstallationRecord,
  type InstalledAgent,
  type InstalledWorkflow,
} from '@agentmou/contracts';
import { agentInstallations, workflowInstallations } from '@agentmou/db';

type AgentInstallationRow = typeof agentInstallations.$inferSelect;
type WorkflowInstallationRow = typeof workflowInstallations.$inferSelect;

export function mapAgentInstallation(installation: AgentInstallationRow): InstalledAgent {
  return InstalledAgentSchema.parse({
    id: installation.id,
    tenantId: installation.tenantId,
    templateId: installation.templateId,
    status: installation.status,
    installedAt: installation.installedAt.toISOString(),
    config: normalizeRecord(installation.config),
    hitlEnabled: installation.hitlEnabled,
    lastRunAt: installation.lastRunAt?.toISOString() ?? null,
    runsTotal: installation.runsTotal,
    runsSuccess: installation.runsSuccess,
    kpiValues: {},
  });
}

export function mapWorkflowInstallation(installation: WorkflowInstallationRow): InstalledWorkflow {
  return InstalledWorkflowSchema.parse({
    id: installation.id,
    tenantId: installation.tenantId,
    templateId: installation.templateId,
    status: installation.status,
    installedAt: installation.installedAt.toISOString(),
    config: normalizeRecord(installation.config),
    lastRunAt: installation.lastRunAt?.toISOString() ?? null,
    runsTotal: installation.runsTotal,
    runsSuccess: installation.runsSuccess,
  });
}

export function mapInstallationRecord(
  installation:
    | (AgentInstallationRow & { type: 'agent' })
    | (WorkflowInstallationRow & { type: 'workflow' })
): InstallationRecord {
  if (installation.type === 'agent') {
    return InstallationRecordSchema.parse({
      ...mapAgentInstallation(installation),
      type: 'agent',
    });
  }

  return InstallationRecordSchema.parse({
    ...mapWorkflowInstallation(installation),
    type: 'workflow',
  });
}

function normalizeRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}
