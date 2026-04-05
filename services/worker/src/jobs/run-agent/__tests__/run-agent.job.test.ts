import type { Job } from 'bullmq';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @agentmou/db
// ---------------------------------------------------------------------------
const mockInsert = vi.fn();
const mockInsertValues = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@agentmou/db', () => ({
  db: {
    select: () => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: 'install-1',
            templateId: 'inbox-triage',
            tenantId: 'tenant-1',
            status: 'active',
            config: {},
          },
        ]),
      }),
    }),
    insert: (table: unknown) => {
      mockInsert(table);
      return { values: mockInsertValues };
    },
    update: (table: unknown) => {
      mockUpdate(table);
      return { set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) };
    },
  },
  agentInstallations: {},
  usageEvents: {},
  billableUsageLedger: {},
  eq: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock @agentmou/connectors
// ---------------------------------------------------------------------------
vi.mock('@agentmou/connectors', () => ({
  loadTenantConnectors: vi.fn().mockResolvedValue(new Map()),
}));

// ---------------------------------------------------------------------------
// Mock @agentmou/agent-engine
// ---------------------------------------------------------------------------
const mockExecute = vi.fn();

vi.mock('@agentmou/agent-engine', () => ({
  AgentEngine: vi.fn().mockImplementation(() => ({
    execute: mockExecute,
  })),
}));

// ---------------------------------------------------------------------------
// Mock fs/yaml for catalog loading
// ---------------------------------------------------------------------------
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn().mockImplementation((filePath: string) => {
    if (filePath.includes('prompt.md')) {
      return Promise.resolve('You are an email triage assistant.');
    }
    if (filePath.includes('policy.yaml')) {
      return Promise.resolve('permissions:\n  gmail:\n    read: true\n    write: true');
    }
    return Promise.reject(new Error('File not found'));
  }),
}));

vi.mock('yaml', () => ({
  parse: vi.fn().mockReturnValue({
    permissions: { gmail: { read: true, write: true } },
  }),
}));

// Import after mocks
import type { RunAgentPayload } from '@agentmou/queue';
import { processRunAgent } from '../run-agent.job';

function createMockJob(data: RunAgentPayload): Job<RunAgentPayload> {
  return {
    data,
    updateProgress: vi.fn(),
  } as unknown as Job<RunAgentPayload>;
}

describe('processRunAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsertValues.mockResolvedValue(undefined);
  });

  it('should execute the agent via AgentEngine and succeed', async () => {
    mockExecute.mockResolvedValue({
      success: true,
      output: { result: 'emails classified' },
      runId: 'run-1',
      duration: 1500,
      stepsCompleted: 3,
    });

    const job = createMockJob({
      tenantId: 'tenant-1',
      agentInstallationId: 'install-1',
      runId: 'run-1',
      input: { test: true },
      triggeredBy: 'manual',
    });

    await processRunAgent(job);

    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-1',
        tenantId: 'tenant-1',
        templateId: 'inbox-triage',
        systemPrompt: 'You are an email triage assistant.',
      })
    );
    expect(job.updateProgress).toHaveBeenCalledWith(100);
  });

  it('should throw when engine execution fails', async () => {
    mockExecute.mockResolvedValue({
      success: false,
      error: 'Policy denied gmail.delete',
      runId: 'run-2',
      duration: 200,
      stepsCompleted: 0,
    });

    const job = createMockJob({
      tenantId: 'tenant-1',
      agentInstallationId: 'install-1',
      runId: 'run-2',
      input: {},
      triggeredBy: 'cron',
    });

    await expect(processRunAgent(job)).rejects.toThrow('Policy denied');
  });

  it('should load connectors and pass them to the engine', async () => {
    const { loadTenantConnectors } = await import('@agentmou/connectors');

    mockExecute.mockResolvedValue({
      success: true,
      output: {},
      runId: 'run-3',
      duration: 100,
      stepsCompleted: 1,
    });

    const job = createMockJob({
      tenantId: 'tenant-1',
      agentInstallationId: 'install-1',
      runId: 'run-3',
      input: {},
      triggeredBy: 'manual',
    });

    await processRunAgent(job);

    expect(loadTenantConnectors).toHaveBeenCalledWith('tenant-1');
    expect(mockExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        connectors: expect.any(Map),
      })
    );
  });
});
