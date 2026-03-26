import operationalIdsJson from './operational-ids.gen.json';
import {
  demoAgentIdToOperationalId,
  demoPackIdToOperationalId,
  demoWorkflowIdToOperationalId,
} from './operational-refs';

export type OperationalIdsFile = {
  agents: string[];
  workflowsPublic: string[];
  workflowsPlanned: string[];
  packs: string[];
};

const operationalIds = operationalIdsJson as OperationalIdsFile;

export function getOperationalIds(): OperationalIdsFile {
  return operationalIds;
}

export function resolveOperationalAgentId(demoAgentId: string): string {
  return demoAgentIdToOperationalId[demoAgentId] ?? demoAgentId;
}

export function resolveOperationalWorkflowId(demoWorkflowId: string): string {
  return demoWorkflowIdToOperationalId[demoWorkflowId] ?? demoWorkflowId;
}

export function resolveOperationalPackId(demoPackId: string): string {
  return demoPackIdToOperationalId[demoPackId] ?? demoPackId;
}

/** True when this demo agent maps to a real agent manifest on disk. */
export function isOperationalAgent(demoAgentId: string): boolean {
  const op = resolveOperationalAgentId(demoAgentId);
  return operationalIds.agents.includes(op);
}

/** True when this demo workflow maps to a real public workflow manifest. */
export function isOperationalWorkflow(demoWorkflowId: string): boolean {
  const op = resolveOperationalWorkflowId(demoWorkflowId);
  return operationalIds.workflowsPublic.includes(op);
}

/** True when this demo pack maps to a real pack manifest on disk. */
export function isOperationalPack(demoPackId: string): boolean {
  const op = resolveOperationalPackId(demoPackId);
  return operationalIds.packs.includes(op);
}
