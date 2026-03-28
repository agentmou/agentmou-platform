#!/usr/bin/env tsx
/**
 * API-driven end-to-end validation for the Gmail inbox triage vertical slice.
 *
 * Validates the full flow: register → login → queue pack install → poll for
 * installations → check Gmail OAuth URL → trigger a run → verify the run is
 * listed.
 *
 * Usage:
 *   API_URL=http://localhost:3001 tsx scripts/test-e2e-triage.ts
 *   API_URL=http://localhost:3001 DATABASE_URL=postgres://... \
 *     tsx scripts/test-e2e-triage.ts --cleanup
 *
 * Notes:
 * - `--cleanup` is opt-in and removes the validation fixture after the run.
 * - `DATABASE_URL` is required only when `--cleanup` is used.
 */

import { parseArgs } from 'node:util';

const API_URL = process.env.API_URL || 'http://localhost:3001';
const DEFAULT_PASSWORD = 'Test1234!';
const INSTALLATION_POLL_INTERVAL_MS = 1_000;
const INSTALLATION_POLL_TIMEOUT_MS = 20_000;
const RUN_POLL_INTERVAL_MS = 1_000;
const RUN_POLL_TIMEOUT_MS = 10_000;
const usage = `Usage:
  API_URL=http://localhost:3001 tsx scripts/test-e2e-triage.ts
  API_URL=http://localhost:3001 DATABASE_URL=postgres://... \\
    tsx scripts/test-e2e-triage.ts --cleanup`;

const { values } = parseArgs({
  options: {
    cleanup: { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
  strict: true,
  allowPositionals: false,
});

if (values.help) {
  console.log(usage);
  process.exit(0);
}

if (values.cleanup && !process.env.DATABASE_URL) {
  throw new Error('--cleanup requires DATABASE_URL so the validation fixture can be deleted.');
}

interface Step {
  name: string;
  fn: () => Promise<unknown>;
}

interface InstallationsPayload {
  installations?: {
    agents?: Array<{ id: string }>;
    workflows?: Array<{ id: string }>;
  };
}

interface RunsPayload {
  runs?: Array<{ id: string }>;
}

const state = {
  cleanupRequested: values.cleanup,
  email: '',
  password: DEFAULT_PASSWORD,
  token: '',
  tenantId: '',
  agentInstallationId: '',
  runId: '',
};

const steps: Step[] = [
  {
    name: '1. Health check',
    fn: async () => {
      const res = await fetch(`${API_URL}/health`);
      assert(res.ok, `Health check failed: ${res.status}`);
      const body = await res.json();
      console.log('   →', body.status);
      return body;
    },
  },
  {
    name: '2. Register new user',
    fn: async () => {
      state.email = `e2e-${Date.now()}@test.agentmou.io`;
      const res = await fetch(`${API_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: state.email,
          password: state.password,
          name: 'E2E Tester',
          tenantName: 'E2E Test Workspace',
        }),
      });
      assert(res.status === 201, `Register failed: ${res.status}`);
      const body = await res.json();
      state.token = body.token;
      state.tenantId = body.tenant.id;
      console.log(`   → user registered, tenantId=${state.tenantId}`);
      return body;
    },
  },
  {
    name: '3. Login with the created credentials',
    fn: async () => {
      assert(state.email.length > 0, 'Missing registered email for login step');
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: state.email,
          password: state.password,
        }),
      });
      assert(res.ok, `Login failed: ${res.status}`);
      const body = await res.json();
      state.token = body.token;
      console.log('   → login token issued');
      return { token: `${state.token.substring(0, 20)}...` };
    },
  },
  {
    name: '4. Queue Support Starter pack installation',
    fn: async () => {
      const res = await fetch(`${API_URL}/api/v1/tenants/${state.tenantId}/installations/packs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.token}`,
        },
        body: JSON.stringify({ packId: 'support-starter' }),
      });
      assert(res.status === 202, `Install pack failed: expected 202, received ${res.status}`);
      const body = await res.json();
      assert(body.status === 'queued', `Install pack returned unexpected status: ${body.status}`);
      console.log(`   → pack install queued (jobId=${body.jobId})`);
      return body;
    },
  },
  {
    name: '5. Poll for installed agents',
    fn: async () => {
      const installations = await pollForInstallations();
      const agents = installations.installations?.agents ?? [];
      const workflows = installations.installations?.workflows ?? [];
      assert(agents.length > 0, 'No agent installations found after pack install');
      state.agentInstallationId = agents[0]!.id;
      console.log(
        `   → ${agents.length} agent(s), ${workflows.length} workflow(s); using ${state.agentInstallationId}`
      );
      return installations;
    },
  },
  {
    name: '6. Check Gmail OAuth authorize URL',
    fn: async () => {
      const res = await fetch(
        `${API_URL}/api/v1/tenants/${state.tenantId}/connectors/oauth/gmail/authorize`,
        { headers: { Authorization: `Bearer ${state.token}` } }
      );
      assert(res.ok, `OAuth authorize failed: ${res.status}`);
      const body = await res.json();
      assert(body.url?.includes('accounts.google.com'), 'Invalid OAuth URL');
      console.log('   → OAuth URL generated correctly');
      return { url: `${body.url.substring(0, 80)}...` };
    },
  },
  {
    name: '7. Trigger manual run',
    fn: async () => {
      assert(state.agentInstallationId.length > 0, 'Missing agentInstallationId for manual run');
      const res = await fetch(`${API_URL}/api/v1/tenants/${state.tenantId}/runs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${state.token}`,
        },
        body: JSON.stringify({
          agentInstallationId: state.agentInstallationId,
        }),
      });
      assert(res.status === 201, `Trigger run failed: expected 201, received ${res.status}`);
      const body = await res.json();
      state.runId = body.run?.id || body.id || '';
      assert(state.runId.length > 0, 'Run creation response did not include a run id');
      console.log(`   → run created: ${state.runId}`);
      return body;
    },
  },
  {
    name: '8. Verify the run appears in the runs list',
    fn: async () => {
      const runs = await pollForRun(state.runId);
      console.log(`   → run ${state.runId} visible (${runs.length} run(s) listed)`);
      return runs;
    },
  },
  {
    name: '9. List connectors',
    fn: async () => {
      const res = await fetch(`${API_URL}/api/v1/tenants/${state.tenantId}/connectors`, {
        headers: { Authorization: `Bearer ${state.token}` },
      });
      assert(res.ok, `List connectors failed: ${res.status}`);
      const body = await res.json();
      console.log(`   → ${body.connectors?.length ?? 0} connector(s)`);
      return body;
    },
  },
];

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log(' Agentmou E2E Test — Gmail Inbox Triage Vertical Slice');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`API: ${API_URL}`);
  console.log(`Cleanup: ${state.cleanupRequested ? 'enabled' : 'disabled'}\n`);

  let passed = 0;
  let failed = 0;

  try {
    for (const step of steps) {
      try {
        console.log(`▶ ${step.name}`);
        await step.fn();
        passed++;
      } catch (err) {
        failed++;
        console.error('  ✗ FAILED:', err instanceof Error ? err.message : err);
      }
    }
  } finally {
    try {
      if (state.cleanupRequested) {
        await cleanupFixture();
      } else {
        printManualCleanupHint();
      }
    } catch (error) {
      failed++;
      console.error('  ✗ CLEANUP FAILED:', error instanceof Error ? error.message : String(error));
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(` Results: ${passed} passed, ${failed} failed, ${steps.length} total`);
  console.log('═══════════════════════════════════════════════════════════');

  process.exit(failed > 0 ? 1 : 0);
}

async function pollForInstallations() {
  const deadline = Date.now() + INSTALLATION_POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const res = await fetch(`${API_URL}/api/v1/tenants/${state.tenantId}/installations`, {
      headers: { Authorization: `Bearer ${state.token}` },
    });
    assert(res.ok, `List installations failed: ${res.status}`);

    const body = (await res.json()) as InstallationsPayload;
    const agents = body.installations?.agents ?? [];

    if (agents.length > 0) {
      return body;
    }

    await sleep(INSTALLATION_POLL_INTERVAL_MS);
  }

  throw new Error(
    `Timed out waiting ${INSTALLATION_POLL_TIMEOUT_MS}ms for installed agents to appear`
  );
}

async function pollForRun(runId: string) {
  assert(runId.length > 0, 'Missing run id for verification step');
  const deadline = Date.now() + RUN_POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const res = await fetch(`${API_URL}/api/v1/tenants/${state.tenantId}/runs`, {
      headers: { Authorization: `Bearer ${state.token}` },
    });
    assert(res.ok, `List runs failed: ${res.status}`);

    const body = (await res.json()) as RunsPayload;
    const runs = body.runs ?? [];
    if (runs.some((run) => run.id === runId)) {
      return runs;
    }

    await sleep(RUN_POLL_INTERVAL_MS);
  }

  throw new Error(`Timed out waiting ${RUN_POLL_TIMEOUT_MS}ms for run ${runId} to appear`);
}

async function cleanupFixture() {
  if (!state.tenantId || !state.email) {
    console.log('\nCleanup skipped: no validation fixture was created.');
    return;
  }

  const [{ createDb }, { executeValidationFixtureCleanup }] = await Promise.all([
    import('@agentmou/db'),
    import('../services/api/src/lib/validation-fixture-cleanup.js'),
  ]);

  const { db, close } = createDb();

  try {
    const plan = await executeValidationFixtureCleanup(db, {
      tenantId: state.tenantId,
      userEmail: state.email,
    });

    console.log('\nCleanup completed successfully');
    console.log(`   → tenant removed: ${plan.tenant.id}`);
    console.log(`   → user removed: ${plan.user.email}`);
    console.log(`   → rows removed: ${plan.totalRows}`);
  } finally {
    await close();
  }
}

function printManualCleanupHint() {
  if (!state.tenantId || !state.email) {
    return;
  }

  console.log('\nFixture cleanup command:');
  console.log(
    `  pnpm cleanup:validation-tenant --tenant-id ${state.tenantId} --user-email ${state.email} --execute`
  );
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

void main();
