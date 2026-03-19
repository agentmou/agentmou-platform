import type { DataProviderMode } from '@/lib/data/provider';

export type HonestSurfaceId =
  | 'dashboard-metrics'
  | 'observability-analytics'
  | 'security-secrets'
  | 'security-team'
  | 'security-audit'
  | 'settings-general'
  | 'settings-notifications'
  | 'settings-billing'
  | 'settings-danger-zone'
  | 'n8n-connection'
  | 'installer-flow'
  | 'marketplace-install-cta'
  | 'marketplace-connect-cta'
  | 'command-palette-quick-actions'
  | 'chat-assistant';

export type HonestSurfaceTone =
  | 'preview'
  | 'read-only'
  | 'not-yet-available'
  | 'demo';

export interface HonestSurfaceContext {
  providerMode: DataProviderMode;
  tenantId?: string;
}

export interface HonestSurfaceState {
  tone: HonestSurfaceTone;
  label: string;
  title: string;
  description: string;
  disabled: boolean;
}

function createState(
  tone: HonestSurfaceTone,
  title: string,
  description: string,
  disabled = true,
): HonestSurfaceState {
  return {
    tone,
    label:
      tone === 'preview'
        ? 'Preview'
        : tone === 'read-only'
          ? 'Read-only'
          : tone === 'not-yet-available'
            ? 'Not yet available'
            : 'Demo',
    title,
    description,
    disabled,
  };
}

const tenantStates: Record<HonestSurfaceId, HonestSurfaceState> = {
  'dashboard-metrics': createState(
    'preview',
    'Metrics preview',
    'These KPI cards and charts are placeholder-backed until a real dashboard metrics endpoint exists.',
    false,
  ),
  'observability-analytics': createState(
    'preview',
    'Analytics preview',
    'Analytics cards and charts are placeholder-backed. Recent runs below still reflect real tenant activity.',
  ),
  'security-secrets': createState(
    'read-only',
    'Secrets inventory is read-only',
    'Secret metadata is visible from real tenant records, but create and rotate actions still stay disabled from this screen.',
  ),
  'security-team': createState(
    'read-only',
    'Team access is read-only',
    'Membership data is visible, but invites and role changes are not available from this screen yet.',
  ),
  'security-audit': createState(
    'read-only',
    'Audit history is read-only',
    'Audit entries now reflect real tenant events, while export and dismissal controls remain disabled from this screen.',
  ),
  'settings-general': createState(
    'read-only',
    'Settings are read-only',
    'Workspace identity is shown from real tenant data, but edits are not persisted from this screen yet.',
  ),
  'settings-notifications': createState(
    'preview',
    'Notification preferences preview',
    'Notification controls are shown for planning purposes and are not wired to delivery settings yet.',
  ),
  'settings-billing': createState(
    'read-only',
    'Billing is read-only',
    'Billing cards now reflect real usage, plan, and invoice data when configured, while plan changes and payment updates remain constrained by backend setup.',
  ),
  'settings-danger-zone': createState(
    'not-yet-available',
    'Danger zone not yet available',
    'Destructive workspace actions stay disabled until there is a verified backend flow behind them.',
  ),
  'n8n-connection': createState(
    'read-only',
    'Workflow engine is platform-managed',
    'n8n is managed internally by Agentmou today. This surface exposes status only and remains read-only for tenants.',
  ),
  'installer-flow': createState(
    'preview',
    'Installer preview',
    'This installer flow is visible for planning and review, but authenticated tenant actions are fenced until the remaining wiring is real.',
  ),
  'marketplace-install-cta': createState(
    'preview',
    'Install flow preview',
    'Installation CTAs stay disabled in authenticated workspaces until the UI wiring is fully aligned with real install behavior.',
  ),
  'marketplace-connect-cta': createState(
    'preview',
    'Connection flow preview',
    'Integration connection prompts stay informational until the tenant-facing flow is backed by real behavior.',
  ),
  'command-palette-quick-actions': createState(
    'preview',
    'Quick actions preview',
    'Execution-style quick actions are limited to honest navigation until they are backed by real tenant behavior.',
  ),
  'chat-assistant': createState(
    'preview',
    'Assistant preview',
    'Workspace copilot remains preview-only, and the public assistant is limited to curated product knowledge rather than live tenant execution.',
  ),
};

const demoStates: Record<HonestSurfaceId, HonestSurfaceState> = {
  'dashboard-metrics': createState(
    'demo',
    'Demo metrics',
    'These metrics come from the demo workspace so you can explore the surface without treating it as live tenant telemetry.',
    false,
  ),
  'observability-analytics': createState(
    'demo',
    'Demo analytics',
    'Charts and summaries below are demo data for exploration, while the workspace remains read-only.',
  ),
  'security-secrets': createState(
    'demo',
    'Demo secrets',
    'Sample secrets are visible for orientation only. The demo workspace does not allow changes.',
  ),
  'security-team': createState(
    'demo',
    'Demo team access',
    'Team data is shown as a read-only demo of the access surface.',
  ),
  'security-audit': createState(
    'demo',
    'Demo audit history',
    'Audit entries are sample data so you can inspect the layout without affecting a live workspace.',
  ),
  'settings-general': createState(
    'demo',
    'Demo workspace settings',
    'The demo workspace shows example values only and stays read-only.',
  ),
  'settings-notifications': createState(
    'demo',
    'Demo notification settings',
    'Notification controls are shown as part of the demo and do not persist changes.',
  ),
  'settings-billing': createState(
    'demo',
    'Demo billing',
    'Billing cards below are demo-only and do not reflect a live subscription.',
  ),
  'settings-danger-zone': createState(
    'demo',
    'Demo safety controls',
    'Destructive actions stay disabled in the demo workspace.',
  ),
  'n8n-connection': createState(
    'demo',
    'Demo workflow engine',
    'The demo workspace shows a sample workflow engine connection and remains read-only.',
  ),
  'installer-flow': createState(
    'demo',
    'Demo installer',
    'This installer simulates the setup flow for exploration and does not activate a live tenant workspace.',
  ),
  'marketplace-install-cta': createState(
    'demo',
    'Demo install flow',
    'This action opens the demo setup flow so you can inspect the experience without installing live assets.',
    false,
  ),
  'marketplace-connect-cta': createState(
    'demo',
    'Demo connection flow',
    'This action points to demo connection details instead of a live tenant connection flow.',
    false,
  ),
  'command-palette-quick-actions': createState(
    'demo',
    'Demo quick actions',
    'Quick actions in the demo workspace navigate or simulate the experience instead of executing tenant work.',
  ),
  'chat-assistant': createState(
    'demo',
    'Assistant demo',
    'Assistant replies are generated by the mock engine and stay in demo mode for this workspace.',
  ),
};

function isDemoContext(context: HonestSurfaceContext): boolean {
  return (
    context.providerMode === 'demo' ||
    context.providerMode === 'mock' ||
    context.tenantId === 'demo-workspace'
  );
}

export function resolveHonestSurfaceState(
  surfaceId: HonestSurfaceId,
  context: HonestSurfaceContext,
): HonestSurfaceState {
  return isDemoContext(context) ? demoStates[surfaceId] : tenantStates[surfaceId];
}
