/**
 * run-agent job processor.
 *
 * Loads the agent installation and catalog assets (prompt, policy),
 * then delegates execution to AgentEngine which handles planning,
 * policy checks, tool calls, and step-level DB logging.
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as yaml from 'yaml';
import type { Job } from 'bullmq';
import type { RunAgentPayload } from '@agentmou/queue';
import { db, agentInstallations } from '@agentmou/db';
import { eq } from 'drizzle-orm';
import { AgentEngine, type AgentPolicyConfig } from '@agentmou/agent-engine';
import { resolveRepoRoot } from '@agentmou/catalog-sdk';
import { loadTenantConnectors } from '@agentmou/connectors';

import { logJobMessage } from '../shared/job-log.js';
import { recordRunUsage } from '../shared/metering.js';
import { syncInternalExecutionRunResult } from '../internal-work-order/internal-execution-sync.js';
import { errorRuntimeMessage } from '../shared/job-log.js';

const REPO_ROOT = resolveRepoRoot(import.meta.dirname, ['catalog/agents']);
const CATALOG_DIR = path.join(REPO_ROOT, 'catalog');

export async function processRunAgent(job: Job<RunAgentPayload>) {
  const { tenantId, agentInstallationId, runId, input } = job.data;

  await logJobMessage(
    job,
    `[run-agent] Running agent ${agentInstallationId} for tenant ${tenantId} [${runId}]`
  );

  await job.updateProgress(10);

  // 1. Load installation
  const [installation] = await db
    .select()
    .from(agentInstallations)
    .where(eq(agentInstallations.id, agentInstallationId));

  if (!installation) {
    throw new Error(`Agent installation ${agentInstallationId} not found`);
  }

  await job.updateProgress(20);

  // 2. Load catalog assets (prompt + policy)
  const templateId = installation.templateId;
  const agentDir = path.join(CATALOG_DIR, 'agents', templateId);

  const systemPrompt = await loadFileOrDefault(
    path.join(agentDir, 'prompt.md'),
    `You are an AI assistant executing the "${templateId}" agent.`
  );

  const policyConfig = await loadPolicyConfig(
    path.join(agentDir, 'policy.yaml')
  );

  await job.updateProgress(30);

  // 3. Load tenant connectors (decrypted from DB)
  let connectors;
  try {
    connectors = await loadTenantConnectors(tenantId);
  } catch {
    connectors = new Map();
  }

  await job.updateProgress(40);

  // 4. Execute via AgentEngine
  const engine = new AgentEngine({
    openaiApiKey: process.env.OPENAI_API_KEY,
    agentsApiUrl: process.env.AGENTS_API_URL || 'http://agents:8000',
    agentsApiKey: process.env.AGENTS_API_KEY,
  });

  const result = await engine.execute({
    runId,
    tenantId,
    templateId,
    systemPrompt,
    input,
    connectors,
    policyConfig: policyConfig ?? undefined,
  });

  const completedAt = new Date();
  await db
    .update(agentInstallations)
    .set({
      lastRunAt: completedAt,
      runsTotal: (installation.runsTotal || 0) + 1,
      runsSuccess: (installation.runsSuccess || 0) + (result.success ? 1 : 0),
    })
    .where(eq(agentInstallations.id, installation.id));

  await recordRunUsage({
    tenantId,
    runId,
    status: result.success ? 'success' : 'failed',
    source: 'agent_run',
    tokensUsed: result.tokensUsed?.total,
    costEstimate: result.cost,
    recordedAt: completedAt,
  });

  await syncInternalExecutionRunResult({
    runId,
    status: result.success ? 'success' : 'failed',
    source: 'agent_installation',
    summary: result.success
      ? `Agent installation ${templateId} completed ${result.stepsCompleted} step(s).`
      : result.error ?? 'Agent execution failed.',
    metadata: {
      templateId,
      stepsCompleted: result.stepsCompleted,
      durationMs: result.duration,
      tokensUsed: result.tokensUsed?.total,
      costEstimate: result.cost,
    },
  });

  await job.updateProgress(100);

  if (!result.success) {
    errorRuntimeMessage(
      `[run-agent] Failed run ${runId}: ${result.error ?? 'unknown error'}`,
    );
    throw new Error(result.error ?? 'Agent execution failed');
  }

  await logJobMessage(
    job,
    `[run-agent] Completed run ${runId} in ${result.duration}ms (${result.stepsCompleted} steps)`
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loadFileOrDefault(
  filePath: string,
  fallback: string
): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch {
    return fallback;
  }
}

async function loadPolicyConfig(
  filePath: string
): Promise<AgentPolicyConfig | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return yaml.parse(content) as AgentPolicyConfig;
  } catch {
    return null;
  }
}
