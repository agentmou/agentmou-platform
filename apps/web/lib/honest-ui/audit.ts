export type HonestSurfaceClassification =
  | 'real'
  | 'read-only'
  | 'empty-default-backed'
  | 'stub-backed'
  | 'client-simulated'
  | 'mock'
  | 'not-exposed-platform-managed'
  | 'mixed-real-read-only-stubbed-actions';

export type HonestSurfaceTreatment =
  | 'keep-real'
  | 'preview'
  | 'read-only'
  | 'not-yet-available'
  | 'demo';

export interface HonestSurfaceAuditEntry {
  surface: string;
  section: string;
  classification: HonestSurfaceClassification;
  currentSource: string;
  currentTruth: string;
  honestTreatment: HonestSurfaceTreatment;
  followOnDependencies: string[];
}

export const HONEST_UI_FOLLOW_ON_DEPENDENCIES = {
  dashboardMetrics:
    'Add a real tenant dashboard metrics endpoint instead of apiProvider empty defaults.',
  securityUi:
    'Wire secrets, audit, policies, and team-management actions to real backend behavior.',
  billingUi:
    'Wire billing and usage screens to real billing data instead of stub modules.',
  n8nProductDecision:
    'Decide whether tenants ever need a first-class n8n surface beyond platform-managed status.',
} as const;

export const honestSurfaceAudit: HonestSurfaceAuditEntry[] = [
  {
    surface: 'dashboard',
    section: 'metrics',
    classification: 'empty-default-backed',
    currentSource: 'apiProvider.getTenantDashboardMetrics()',
    currentTruth:
      'Authenticated tenants render zeroed KPI and chart data when no real metrics endpoint exists.',
    honestTreatment: 'preview',
    followOnDependencies: [HONEST_UI_FOLLOW_ON_DEPENDENCIES.dashboardMetrics],
  },
  {
    surface: 'observability',
    section: 'analytics',
    classification: 'empty-default-backed',
    currentSource: 'apiProvider.getTenantDashboardMetrics() + derived run lists',
    currentTruth:
      'Analytics cards and charts rely on synthetic defaults, while recent runs remain real.',
    honestTreatment: 'preview',
    followOnDependencies: [HONEST_UI_FOLLOW_ON_DEPENDENCIES.dashboardMetrics],
  },
  {
    surface: 'security',
    section: 'tenant surface',
    classification: 'mixed-real-read-only-stubbed-actions',
    currentSource: 'listTenantMembers() + empty security defaults + local component state',
    currentTruth:
      'Membership data is real, but secrets, audit, and management actions are empty-default backed or client-only.',
    honestTreatment: 'read-only',
    followOnDependencies: [HONEST_UI_FOLLOW_ON_DEPENDENCIES.securityUi],
  },
  {
    surface: 'settings',
    section: 'general',
    classification: 'read-only',
    currentSource: 'getTenant()',
    currentTruth:
      'Workspace identity is real, but the screen does not persist edits yet.',
    honestTreatment: 'read-only',
    followOnDependencies: [],
  },
  {
    surface: 'settings',
    section: 'billing',
    classification: 'stub-backed',
    currentSource: 'getTenantBillingInfo() + static invoice/payment placeholders',
    currentTruth:
      'Billing status is powered by stub data and placeholder cards, not real billing state.',
    honestTreatment: 'not-yet-available',
    followOnDependencies: [HONEST_UI_FOLLOW_ON_DEPENDENCIES.billingUi],
  },
  {
    surface: 'settings',
    section: 'n8n connection',
    classification: 'not-exposed-platform-managed',
    currentSource: 'getTenantN8nConnection()',
    currentTruth:
      'The provider supports a connection shape, but tenant UI does not expose a real management surface today.',
    honestTreatment: 'not-yet-available',
    followOnDependencies: [HONEST_UI_FOLLOW_ON_DEPENDENCIES.n8nProductDecision],
  },
  {
    surface: 'installer',
    section: 'tenant activation flow',
    classification: 'client-simulated',
    currentSource: 'local component state + timeout-driven toasts',
    currentTruth:
      'Install and connect steps can look successful without performing tenant-side backend work.',
    honestTreatment: 'preview',
    followOnDependencies: [],
  },
  {
    surface: 'command palette',
    section: 'quick actions',
    classification: 'client-simulated',
    currentSource: 'client-side toast handlers',
    currentTruth:
      'Retry, approve-next, and smoke-test actions imply execution but only navigate or toast.',
    honestTreatment: 'preview',
    followOnDependencies: [],
  },
  {
    surface: 'chat',
    section: 'assistant',
    classification: 'mock',
    currentSource: 'lib/chat/engine.ts and app/api/chat/route.ts',
    currentTruth:
      'Responses come from the mock chat engine and can imply capabilities that do not exist yet.',
    honestTreatment: 'demo',
    followOnDependencies: [],
  },
];

export function findHonestSurfaceAuditEntry(
  surface: string,
  section: string,
): HonestSurfaceAuditEntry | undefined {
  return honestSurfaceAudit.find(
    (entry) => entry.surface === surface && entry.section === section,
  );
}
