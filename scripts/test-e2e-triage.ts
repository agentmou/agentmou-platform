#!/usr/bin/env tsx
/**
 * API-driven end-to-end validation for the Gmail inbox triage vertical slice.
 *
 * Validates the full flow: login -> resolve tenant -> queue pack install ->
 * poll for installations -> check Gmail OAuth URL -> trigger a run ->
 * verify the run is listed.
 *
 * Usage:
 *   API_URL=http://localhost:3001 \
 *   E2E_EMAIL=ops-smoke@agentmou.io \
 *   E2E_PASSWORD='...' \
 *   E2E_TENANT_ID=<optional-internal-tenant-id> \
 *   tsx scripts/test-e2e-triage.ts
 *
 * Notes:
 * - Uses a pre-provisioned, verified smoke user. It does not register
 *   users or create disposable tenants.
 * - `E2E_TENANT_ID` is optional. When omitted, the script auto-selects the
 *   first internal/platform-admin tenant, or the sole tenant if only one
 *   membership exists.
 * - The selected tenant must expose the internal platform routes used by
 *   the install/run portion of this smoke.
 */

import { AuthMeResponseSchema, type AuthMeResponse } from '@agentmou/contracts';
import { parseArgs } from 'node:util';

const API_URL = process.env.API_URL || 'http://localhost:3001';
const E2E_EMAIL = process.env.E2E_EMAIL?.trim() ?? '';
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? '';
const E2E_TENANT_ID = process.env.E2E_TENANT_ID?.trim() ?? '';
const INSTALLATION_POLL_INTERVAL_MS = 1_000;
const INSTALLATION_POLL_TIMEOUT_MS = 20_000;
const RUN_POLL_INTERVAL_MS = 1_000;
const RUN_POLL_TIMEOUT_MS = 10_000;
const AUTH_SESSION_COOKIE_NAME = 'agentmou-session';
const usage = `Usage:
  API_URL=http://localhost:3001 \\
  E2E_EMAIL=ops-smoke@agentmou.io \\
  E2E_PASSWORD='...' \\
  E2E_TENANT_ID=<optional-internal-tenant-id> \\
  tsx scripts/test-e2e-triage.ts`;

const { values } = parseArgs({
  options: {
    help: { type: 'boolean', default: false },
  },
  strict: true,
  allowPositionals: false,
});

if (values.help) {
  console.log(usage);
  process.exit(0);
}

if (!E2E_EMAIL || !E2E_PASSWORD) {
  throw new Error(
    'E2E_EMAIL and E2E_PASSWORD must be set so the smoke can log in with a verified user.'
  );
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
  email: E2E_EMAIL,
  password: E2E_PASSWORD,
  sessionCookie: '',
  tenantId: E2E_TENANT_ID,
  tenantName: '',
  agentInstallationId: '',
  runId: '',
};

function extractSessionCookie(res: Response): string {
  const raw =
    typeof (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === 'function'
      ? (res.headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
      : res.headers.get('set-cookie')
        ? [res.headers.get('set-cookie') as string]
        : [];

  for (const value of raw) {
    const match = value.match(new RegExp(`${AUTH_SESSION_COOKIE_NAME}=([^;]+)`));
    if (match?.[1]) {
      return match[1];
    }
  }

  return '';
}

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  assert(state.sessionCookie.length > 0, 'Missing session cookie for authenticated request');
  return {
    Cookie: `${AUTH_SESSION_COOKIE_NAME}=${state.sessionCookie}`,
    ...extra,
  };
}

function selectTenant(payload: AuthMeResponse): AuthMeResponse['user']['tenants'][number] {
  const memberships = payload.user.tenants ?? [];
  assert(memberships.length > 0, 'The smoke user has no tenant memberships.');

  if (state.tenantId) {
    const explicit = memberships.find((tenant) => tenant.id === state.tenantId);
    assert(
      Boolean(explicit),
      `E2E_TENANT_ID=${state.tenantId} is not present in the smoke user's memberships.`
    );
    return explicit!;
  }

  const internalTenant =
    memberships.find(
      (tenant) =>
        tenant.settings?.activeVertical === 'internal' ||
        tenant.settings?.isPlatformAdminTenant === true
    ) ?? (memberships.length === 1 ? memberships[0] : undefined);

  assert(
    Boolean(internalTenant),
    'Unable to auto-select an internal tenant. Set E2E_TENANT_ID explicitly.'
  );

  return internalTenant!;
}

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
    name: '2. Login with the smoke credentials',
    fn: async () => {
      const res = await fetch(`${API_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: state.email,
          password: state.password,
        }),
      });
      assert(res.ok, `Login failed: ${res.status}`);
      const cookie = extractSessionCookie(res);
      assert(cookie.length > 0, 'Login did not set the agentmou-session cookie');
      state.sessionCookie = cookie;
      console.log('   → login session cookie issued');
      return { cookiePrefix: `${cookie.substring(0, 20)}...` };
    },
  },
  {
    name: '3. Resolve the internal smoke tenant',
    fn: async () => {
      const res = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: authHeaders(),
      });
      assert(res.ok, `/auth/me failed: ${res.status}`);
      const body = AuthMeResponseSchema.parse(await res.json());
      const tenant = selectTenant(body);

      assert(
        tenant.status !== 'frozen',
        `Selected tenant ${tenant.name} (${tenant.id}) is frozen and cannot be used for smoke tests.`
      );
      assert(
        tenant.settings?.activeVertical === 'internal' ||
          tenant.settings?.isPlatformAdminTenant === true,
        `Selected tenant ${tenant.name} (${tenant.id}) does not expose the internal platform routes required by the triage smoke.`
      );

      state.tenantId = tenant.id;
      state.tenantName = tenant.name;
      console.log(`   → using tenant ${tenant.name} (${tenant.id})`);
      return tenant;
    },
  },
  {
    name: '4. Queue Support Starter pack installation',
    fn: async () => {
      const res = await fetch(`${API_URL}/api/v1/tenants/${state.tenantId}/installations/packs`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
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
        { headers: authHeaders() }
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
        headers: authHeaders({ 'Content-Type': 'application/json' }),
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
        headers: authHeaders(),
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
  console.log(`Smoke user: ${state.email}`);
  if (state.tenantId) {
    console.log(`Requested tenant: ${state.tenantId}`);
  }
  console.log('');

  let passed = 0;
  let failed = 0;

  for (const step of steps) {
    try {
      console.log(`▶ ${step.name}`);
      await step.fn();
      passed++;
    } catch (err) {
      failed++;
      console.error('  ✗ FAILED:', err instanceof Error ? err.message : err);
      break;
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
      headers: authHeaders(),
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
      headers: authHeaders(),
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

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

void main();
