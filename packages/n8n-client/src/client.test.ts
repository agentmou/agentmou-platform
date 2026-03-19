import { describe, expect, it } from 'vitest';

import { sanitizeWorkflowForCreate } from './client.js';

describe('sanitizeWorkflowForCreate', () => {
  it('strips top-level read-only fields before workflow creation', () => {
    const sanitized = sanitizeWorkflowForCreate({
      id: 'wf-01-auto-label-gmail',
      createdAt: '2026-03-20T00:00:00.000Z',
      updatedAt: '2026-03-20T00:00:01.000Z',
      versionId: 'v1',
      isArchived: false,
      name: 'Auto Label Gmail Messages',
      active: false,
      nodes: [{ id: 'node-1', name: 'Node 1' }],
      connections: {},
    });

    expect(sanitized).toEqual({
      name: 'Auto Label Gmail Messages',
      active: false,
      nodes: [{ id: 'node-1', name: 'Node 1' }],
      connections: {},
    });
  });
});
