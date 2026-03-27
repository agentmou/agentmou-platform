import { describe, expect, it } from 'vitest';

import { mapAgentInstallation, mapWorkflowInstallation } from './installations.mapper.js';

describe('installations.mapper', () => {
  it('maps agent installations to the shared contract shape', () => {
    const installation = mapAgentInstallation({
      id: 'install-1',
      tenantId: 'tenant-1',
      templateId: 'agent-1',
      status: 'active',
      config: null,
      hitlEnabled: true,
      installedAt: new Date('2024-01-01T00:00:00Z'),
      lastRunAt: new Date('2024-01-02T00:00:00Z'),
      runsTotal: 10,
      runsSuccess: 8,
    });

    expect(installation).toEqual({
      id: 'install-1',
      tenantId: 'tenant-1',
      templateId: 'agent-1',
      status: 'active',
      installedAt: '2024-01-01T00:00:00.000Z',
      config: {},
      hitlEnabled: true,
      lastRunAt: '2024-01-02T00:00:00.000Z',
      runsTotal: 10,
      runsSuccess: 8,
      kpiValues: {},
    });
  });

  it('maps workflow installations to the shared contract shape', () => {
    const installation = mapWorkflowInstallation({
      id: 'workflow-install-1',
      tenantId: 'tenant-1',
      templateId: 'workflow-1',
      status: 'configuring',
      config: { retries: 3 },
      n8nWorkflowId: 'wf-real-1',
      installedAt: new Date('2024-01-01T00:00:00Z'),
      lastRunAt: null,
      runsTotal: 0,
      runsSuccess: 0,
    });

    expect(installation).toEqual({
      id: 'workflow-install-1',
      tenantId: 'tenant-1',
      templateId: 'workflow-1',
      status: 'configuring',
      installedAt: '2024-01-01T00:00:00.000Z',
      config: { retries: 3 },
      lastRunAt: null,
      runsTotal: 0,
      runsSuccess: 0,
    });
  });
});
