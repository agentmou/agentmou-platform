import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FileStateStore } from './file-state-store.js';
import { OpenClawPlanner } from './openclaw-planner.js';
import { OpenClawRuntimeService } from './openclaw-runtime.service.js';

describe('OpenClawRuntimeService', () => {
  let stateDir: string;
  let service: OpenClawRuntimeService;

  beforeEach(async () => {
    stateDir = await mkdtemp(path.join(tmpdir(), 'openclaw-runtime-'));
    service = new OpenClawRuntimeService({
      store: new FileStateStore(stateDir),
      planner: new OpenClawPlanner({ apiKey: '' }),
    });
  });

  afterEach(async () => {
    await rm(stateDir, { recursive: true, force: true });
  });

  it('stores registries and persists a remote session trace', async () => {
    const tenantId = '00000000-0000-0000-0000-000000000001';
    const sessionId = '00000000-0000-0000-0000-000000000002';
    const objectiveId = '00000000-0000-0000-0000-000000000003';

    await service.registerAgentProfiles(tenantId, [
      {
        id: 'ceo',
        roleTitle: 'CEO',
        department: 'executive',
        mission: 'Own company direction.',
        kpis: [],
        allowedTools: [],
        allowedCapabilities: ['internal.prepare_brief'],
        allowedWorkflowTags: [],
        memoryScope: 'session',
        riskBudget: 'high',
        participantBudget: 4,
        maxDelegationDepth: 3,
        escalationPolicy: 'Escalate when required.',
        playbooks: [],
      },
      {
        id: 'chief-of-staff',
        roleTitle: 'Chief of Staff',
        department: 'executive',
        parentAgentId: 'ceo',
        mission: 'Coordinate execution.',
        kpis: [],
        allowedTools: [],
        allowedCapabilities: ['internal.prepare_brief'],
        allowedWorkflowTags: [],
        memoryScope: 'objective',
        riskBudget: 'medium',
        participantBudget: 3,
        maxDelegationDepth: 2,
        escalationPolicy: 'Escalate when unclear.',
        playbooks: [],
      },
    ]);

    await service.registerCapabilities(tenantId, [
      {
        capabilityKey: 'internal.prepare_brief',
        title: 'Prepare Brief',
        description: 'Prepare structured briefs.',
        executionTarget: 'native',
        bindingRequired: false,
      },
    ]);

    const result = await service.startTurn({
      tenantId,
      sessionId,
      objectiveId,
      trigger: 'telegram_message',
      activeAgentId: 'ceo',
      operatorMessage: 'Prepare a company brief',
      agentProfiles: [],
      capabilities: [],
      memory: [],
      context: {},
    });

    expect(result.remoteSessionId).toBeTruthy();
    expect(result.summary.length).toBeGreaterThan(0);

    const trace = await service.fetchTrace({
      tenantId,
      objectiveId,
      remoteSessionId: result.remoteSessionId,
    });

    expect(trace.remoteSessionId).toBe(result.remoteSessionId);
    expect(trace.events.length).toBeGreaterThanOrEqual(2);
  });
});
