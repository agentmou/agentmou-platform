import {
  agentInstallations,
  approvalRequests,
  auditEvents,
  billingAccounts,
  billingInvoices,
  billingSubscriptions,
  billableUsageLedger,
  connectorAccounts,
  connectorOauthStates,
  db as database,
  executionRuns,
  executionSteps,
  memberships,
  schedules,
  secretEnvelopes,
  tenants,
  usageEvents,
  users,
  webhookEvents,
  workflowInstallations,
} from '@agentmou/db';
import { and, eq, inArray, ne } from 'drizzle-orm';
import {
  cleanupInstallationExternalResources,
  type ExternalInstallationCleanupPlan,
} from './external-installation-cleanup.js';

export interface ValidationFixtureCleanupInput {
  tenantId: string;
  userEmail?: string;
  userId?: string;
}

export interface ValidationFixtureCleanupPlan {
  tenant: {
    id: string;
    name: string;
    ownerId: string;
  };
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  externalOperations: Array<{
    label: string;
    count: number;
  }>;
  operations: Array<{
    label: string;
    count: number;
  }>;
  userDeletion: {
    willDelete: boolean;
    blockers: Array<{
      label: string;
      count: number;
    }>;
  };
  totalExternalResources: number;
  totalRows: number;
}

export interface ValidationFixtureCleanupResult {
  mode: 'dry-run' | 'execute';
  plan: ValidationFixtureCleanupPlan;
}

interface ValidationFixtureIdentity {
  tenantName: string;
  tenantPlan: string;
  userEmail: string;
  userName: string | null;
}

interface ValidationFixtureCleanupContext {
  externalCleanupPlan: ExternalInstallationCleanupPlan;
  plan: ValidationFixtureCleanupPlan;
  runIds: string[];
  userId: string;
  tenantId: string;
}

type CleanupDb = typeof database;
type CleanupTransaction = Parameters<Parameters<CleanupDb['transaction']>[0]>[0];

// These patterns intentionally only match known temporary fixture identities,
// such as March 19 OAuth validation users and local e2e-style accounts.
const TEST_FIXTURE_EMAIL_PATTERNS = [
  /^(oauth-check|e2e)-\d+@example\.com$/i,
  /^(oauth-check|e2e)-\d+@test\.agentmou\.io$/i,
];

// These markers cover the temporary workspace and owner names used during
// validation without allowing ordinary production customer names through.
const TEST_FIXTURE_NAME_PATTERNS = [/\boauth\b/i, /\be2e\b/i, /\btest\b/i, /\bvalidation\b/i];

export class ValidationFixtureCleanupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationFixtureCleanupError';
  }
}

export class ValidationFixturePartialCleanupError extends ValidationFixtureCleanupError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = 'ValidationFixturePartialCleanupError';
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

export function isValidationFixtureCandidate(identity: ValidationFixtureIdentity): boolean {
  const { userName } = identity;
  const hasFixtureEmail = TEST_FIXTURE_EMAIL_PATTERNS.some((pattern) =>
    pattern.test(identity.userEmail)
  );
  const hasFixtureName =
    TEST_FIXTURE_NAME_PATTERNS.some((pattern) => pattern.test(identity.tenantName)) ||
    (userName !== null && TEST_FIXTURE_NAME_PATTERNS.some((pattern) => pattern.test(userName)));

  return hasFixtureEmail && hasFixtureName && identity.tenantPlan === 'free';
}

export function buildUserDeletionDecision(referenceCounts: {
  otherOwnedTenants: number;
  otherMemberships: number;
  otherAuditEvents: number;
  otherApprovalDecisions: number;
}): ValidationFixtureCleanupPlan['userDeletion'] {
  const blockers = [
    {
      label: 'other owned tenants',
      count: referenceCounts.otherOwnedTenants,
    },
    {
      label: 'other memberships',
      count: referenceCounts.otherMemberships,
    },
    {
      label: 'other audit events',
      count: referenceCounts.otherAuditEvents,
    },
    {
      label: 'other approval decisions',
      count: referenceCounts.otherApprovalDecisions,
    },
  ].filter((blocker) => blocker.count > 0);

  return {
    willDelete: blockers.length === 0,
    blockers,
  };
}

export async function planValidationFixtureCleanup(
  db: CleanupDb,
  input: ValidationFixtureCleanupInput
): Promise<ValidationFixtureCleanupPlan> {
  const context = await buildValidationFixtureCleanupContext(db, input);
  return context.plan;
}

export async function executeValidationFixtureCleanup(
  db: CleanupDb,
  input: ValidationFixtureCleanupInput
): Promise<ValidationFixtureCleanupPlan> {
  const context = await buildValidationFixtureCleanupContext(db, input);

  await cleanupInstallationExternalResources(context.externalCleanupPlan);

  try {
    await db.transaction(async (tx) => {
      await deleteRowsForTenant(tx, context);
    });
  } catch (error) {
    throw new ValidationFixturePartialCleanupError(
      `External cleanup succeeded but database deletion failed for tenant ${context.tenantId}. Rerun is safe because missing external resources are treated as already cleaned.`,
      { cause: error }
    );
  }

  return context.plan;
}

async function buildValidationFixtureCleanupContext(
  db: CleanupDb,
  input: ValidationFixtureCleanupInput
): Promise<ValidationFixtureCleanupContext> {
  if (!input.userEmail && !input.userId) {
    throw new ValidationFixtureCleanupError('Provide USER_EMAIL or USER_ID alongside TENANT_ID.');
  }

  const [tenant] = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      plan: tenants.plan,
      ownerId: tenants.ownerId,
    })
    .from(tenants)
    .where(eq(tenants.id, input.tenantId));

  if (!tenant) {
    throw new ValidationFixtureCleanupError(`Tenant ${input.tenantId} was not found.`);
  }

  const user = await resolveCleanupUser(db, input);
  if (tenant.ownerId !== user.id) {
    throw new ValidationFixtureCleanupError(
      `Tenant ${tenant.id} is owned by ${tenant.ownerId}, not ${user.id}.`
    );
  }

  if (
    !isValidationFixtureCandidate({
      tenantName: tenant.name,
      tenantPlan: tenant.plan,
      userEmail: user.email,
      userName: user.name,
    })
  ) {
    throw new ValidationFixtureCleanupError(
      `Tenant ${tenant.id} and ${user.email} do not look like a disposable validation fixture.`
    );
  }

  const membershipRows = await db
    .select({
      id: memberships.id,
      userId: memberships.userId,
    })
    .from(memberships)
    .where(eq(memberships.tenantId, tenant.id));

  if (membershipRows.length !== 1 || membershipRows[0]?.userId !== user.id) {
    throw new ValidationFixtureCleanupError(
      `Tenant ${tenant.id} has ${membershipRows.length} memberships; cleanup is only supported for single-owner validation fixtures.`
    );
  }

  const connectorOauthStateRows = await db
    .select({ id: connectorOauthStates.id })
    .from(connectorOauthStates)
    .where(eq(connectorOauthStates.tenantId, tenant.id));

  const connectorAccountRows = await db
    .select({ id: connectorAccounts.id })
    .from(connectorAccounts)
    .where(eq(connectorAccounts.tenantId, tenant.id));

  const secretEnvelopeRows = await db
    .select({ id: secretEnvelopes.id })
    .from(secretEnvelopes)
    .where(eq(secretEnvelopes.tenantId, tenant.id));

  const auditEventRows = await db
    .select({ id: auditEvents.id })
    .from(auditEvents)
    .where(eq(auditEvents.tenantId, tenant.id));

  const approvalRequestRows = await db
    .select({ id: approvalRequests.id })
    .from(approvalRequests)
    .where(eq(approvalRequests.tenantId, tenant.id));

  const executionRunRows = await db
    .select({ id: executionRuns.id })
    .from(executionRuns)
    .where(eq(executionRuns.tenantId, tenant.id));
  const runIds = executionRunRows.map((row) => row.id);

  const executionStepRows =
    runIds.length === 0
      ? []
      : await db
          .select({ id: executionSteps.id })
          .from(executionSteps)
          .where(inArray(executionSteps.runId, runIds));

  const agentInstallationRows = await db
    .select({ id: agentInstallations.id })
    .from(agentInstallations)
    .where(eq(agentInstallations.tenantId, tenant.id));

  const workflowInstallationRows = await db
    .select({
      id: workflowInstallations.id,
      templateId: workflowInstallations.templateId,
      n8nWorkflowId: workflowInstallations.n8nWorkflowId,
    })
    .from(workflowInstallations)
    .where(eq(workflowInstallations.tenantId, tenant.id));

  const scheduleRows = await db
    .select({
      id: schedules.id,
      installationId: schedules.installationId,
      targetType: schedules.targetType,
      cron: schedules.cron,
    })
    .from(schedules)
    .where(eq(schedules.tenantId, tenant.id));

  const usageEventRows = await db
    .select({ id: usageEvents.id })
    .from(usageEvents)
    .where(eq(usageEvents.tenantId, tenant.id));

  const billingAccountRows = await db
    .select({ id: billingAccounts.id })
    .from(billingAccounts)
    .where(eq(billingAccounts.tenantId, tenant.id));

  const billingSubscriptionRows = await db
    .select({ id: billingSubscriptions.id })
    .from(billingSubscriptions)
    .where(eq(billingSubscriptions.tenantId, tenant.id));

  const billingInvoiceRows = await db
    .select({ id: billingInvoices.id })
    .from(billingInvoices)
    .where(eq(billingInvoices.tenantId, tenant.id));

  const billableUsageLedgerRows = await db
    .select({ id: billableUsageLedger.id })
    .from(billableUsageLedger)
    .where(eq(billableUsageLedger.tenantId, tenant.id));

  const webhookEventRows = await db
    .select({ id: webhookEvents.id })
    .from(webhookEvents)
    .where(eq(webhookEvents.tenantId, tenant.id));

  const otherOwnedTenantRows = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(and(eq(tenants.ownerId, user.id), ne(tenants.id, tenant.id)));

  const otherMembershipRows = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.userId, user.id), ne(memberships.tenantId, tenant.id)));

  const otherAuditEventRows = await db
    .select({ id: auditEvents.id })
    .from(auditEvents)
    .where(and(eq(auditEvents.actorId, user.id), ne(auditEvents.tenantId, tenant.id)));

  const otherApprovalDecisionRows = await db
    .select({ id: approvalRequests.id })
    .from(approvalRequests)
    .where(and(eq(approvalRequests.decidedBy, user.id), ne(approvalRequests.tenantId, tenant.id)));

  const userDeletion = buildUserDeletionDecision({
    otherOwnedTenants: otherOwnedTenantRows.length,
    otherMemberships: otherMembershipRows.length,
    otherAuditEvents: otherAuditEventRows.length,
    otherApprovalDecisions: otherApprovalDecisionRows.length,
  });

  const externalCleanupPlan = {
    workflows: workflowInstallationRows.map((workflow) => ({
      installationId: workflow.id,
      templateId: workflow.templateId,
      n8nWorkflowId: workflow.n8nWorkflowId,
    })),
    schedules: scheduleRows.map((schedule) => ({
      id: schedule.id,
      installationId: schedule.installationId,
      targetType: schedule.targetType,
      cron: schedule.cron,
    })),
  } satisfies ExternalInstallationCleanupPlan;

  const externalOperations = [
    {
      label: 'n8n_workflows',
      count: externalCleanupPlan.workflows.filter((workflow) => Boolean(workflow.n8nWorkflowId))
        .length,
    },
    {
      label: 'schedule_repeatables',
      count: externalCleanupPlan.schedules.length,
    },
  ];

  const operations = [
    {
      label: 'connector_oauth_states',
      count: connectorOauthStateRows.length,
    },
    {
      label: 'secret_envelopes',
      count: secretEnvelopeRows.length,
    },
    {
      label: 'approval_requests',
      count: approvalRequestRows.length,
    },
    {
      label: 'billable_usage_ledger',
      count: billableUsageLedgerRows.length,
    },
    {
      label: 'execution_steps',
      count: executionStepRows.length,
    },
    {
      label: 'execution_runs',
      count: executionRunRows.length,
    },
    {
      label: 'agent_installations',
      count: agentInstallationRows.length,
    },
    {
      label: 'workflow_installations',
      count: workflowInstallationRows.length,
    },
    {
      label: 'schedules',
      count: scheduleRows.length,
    },
    {
      label: 'usage_events',
      count: usageEventRows.length,
    },
    {
      label: 'billing_invoices',
      count: billingInvoiceRows.length,
    },
    {
      label: 'billing_subscriptions',
      count: billingSubscriptionRows.length,
    },
    {
      label: 'billing_accounts',
      count: billingAccountRows.length,
    },
    {
      label: 'connector_accounts',
      count: connectorAccountRows.length,
    },
    {
      label: 'audit_events',
      count: auditEventRows.length,
    },
    {
      label: 'webhook_events',
      count: webhookEventRows.length,
    },
    {
      label: 'memberships',
      count: membershipRows.length,
    },
    {
      label: 'tenants',
      count: 1,
    },
  ];

  return {
    tenantId: tenant.id,
    userId: user.id,
    runIds,
    plan: {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        ownerId: tenant.ownerId,
      },
      user,
      externalOperations,
      operations,
      userDeletion,
      totalExternalResources: externalOperations.reduce(
        (total, operation) => total + operation.count,
        0
      ),
      totalRows:
        operations.reduce((total, operation) => total + operation.count, 0) +
        (userDeletion.willDelete ? 1 : 0),
    },
    externalCleanupPlan,
  };
}

async function resolveCleanupUser(
  db: CleanupDb,
  input: ValidationFixtureCleanupInput
): Promise<ValidationFixtureCleanupPlan['user']> {
  const userByEmail = input.userEmail
    ? await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
        })
        .from(users)
        .where(eq(users.email, input.userEmail))
    : [];

  const userById = input.userId
    ? await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
        })
        .from(users)
        .where(eq(users.id, input.userId))
    : [];

  const emailMatch = userByEmail[0];
  const idMatch = userById[0];

  if (input.userEmail && !emailMatch) {
    throw new ValidationFixtureCleanupError(`User ${input.userEmail} was not found.`);
  }

  if (input.userId && !idMatch) {
    throw new ValidationFixtureCleanupError(`User ${input.userId} was not found.`);
  }

  if (emailMatch && idMatch && emailMatch.id !== idMatch.id) {
    throw new ValidationFixtureCleanupError(
      `USER_EMAIL ${input.userEmail} and USER_ID ${input.userId} do not refer to the same user.`
    );
  }

  const user = emailMatch ?? idMatch;
  if (!user) {
    throw new ValidationFixtureCleanupError('Provide USER_EMAIL or USER_ID alongside TENANT_ID.');
  }

  return user;
}

async function deleteRowsForTenant(
  tx: CleanupTransaction,
  context: ValidationFixtureCleanupContext
) {
  await tx.delete(connectorOauthStates).where(eq(connectorOauthStates.tenantId, context.tenantId));

  await tx.delete(secretEnvelopes).where(eq(secretEnvelopes.tenantId, context.tenantId));

  await tx.delete(approvalRequests).where(eq(approvalRequests.tenantId, context.tenantId));

  await tx.delete(billableUsageLedger).where(eq(billableUsageLedger.tenantId, context.tenantId));

  if (context.runIds.length > 0) {
    await tx.delete(executionSteps).where(inArray(executionSteps.runId, context.runIds));
  }

  await tx.delete(executionRuns).where(eq(executionRuns.tenantId, context.tenantId));

  await tx.delete(agentInstallations).where(eq(agentInstallations.tenantId, context.tenantId));

  await tx
    .delete(workflowInstallations)
    .where(eq(workflowInstallations.tenantId, context.tenantId));

  await tx.delete(schedules).where(eq(schedules.tenantId, context.tenantId));

  await tx.delete(usageEvents).where(eq(usageEvents.tenantId, context.tenantId));

  await tx.delete(billingInvoices).where(eq(billingInvoices.tenantId, context.tenantId));

  await tx.delete(billingSubscriptions).where(eq(billingSubscriptions.tenantId, context.tenantId));

  await tx.delete(billingAccounts).where(eq(billingAccounts.tenantId, context.tenantId));

  await tx.delete(connectorAccounts).where(eq(connectorAccounts.tenantId, context.tenantId));

  await tx.delete(auditEvents).where(eq(auditEvents.tenantId, context.tenantId));

  await tx.delete(webhookEvents).where(eq(webhookEvents.tenantId, context.tenantId));

  await tx.delete(memberships).where(eq(memberships.tenantId, context.tenantId));

  await tx.delete(tenants).where(eq(tenants.id, context.tenantId));

  if (context.plan.userDeletion.willDelete) {
    await tx.delete(users).where(eq(users.id, context.userId));
  }
}
