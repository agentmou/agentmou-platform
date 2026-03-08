import { v4 as uuidv4 } from 'uuid';

export interface TraceContext {
  traceId: string;
  spanId?: string;
  parentId?: string;
}

export function createTraceContext(): TraceContext {
  return {
    traceId: uuidv4(),
    spanId: uuidv4(),
  };
}

export function createChildSpan(parent: TraceContext): TraceContext {
  return {
    traceId: parent.traceId,
    spanId: uuidv4(),
    parentId: parent.spanId,
  };
}
