import { describe, expect, it } from 'vitest';
import operationalIdsJson from '../operational-ids.gen.json';
import {
  demoAgentIdToOperationalId,
  demoPackIdToOperationalId,
  demoWorkflowIdToOperationalId,
} from '../operational-refs';

const operationalIds = operationalIdsJson as {
  agents: string[];
  workflowsPublic: string[];
  packs: string[];
};

describe('operational ref maps', () => {
  it('maps every demo agent ref to an id present in operational-ids.gen.json', () => {
    for (const opId of Object.values(demoAgentIdToOperationalId)) {
      expect(operationalIds.agents, `agent ${opId}`).toContain(opId);
    }
  });

  it('maps every demo workflow ref to a public workflow id in operational-ids.gen.json', () => {
    for (const opId of Object.values(demoWorkflowIdToOperationalId)) {
      expect(operationalIds.workflowsPublic, `workflow ${opId}`).toContain(opId);
    }
  });

  it('maps every demo pack ref to a pack id in operational-ids.gen.json', () => {
    for (const opId of Object.values(demoPackIdToOperationalId)) {
      expect(operationalIds.packs, `pack ${opId}`).toContain(opId);
    }
  });
});
