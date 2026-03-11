import { v4 as uuidv4 } from 'uuid';

/**
 * Lightweight trace metadata that can be attached to logs and async work.
 */
export interface TraceContext {
  traceId: string;
  spanId?: string;
  parentId?: string;
}

/**
 * Create a new root trace/span pair for a unit of work.
 */
export function createTraceContext(): TraceContext {
  return {
    traceId: uuidv4(),
    spanId: uuidv4(),
  };
}

/**
 * Create a child span that preserves the trace ID and links to the parent span.
 */
export function createChildSpan(parent: TraceContext): TraceContext {
  return {
    traceId: parent.traceId,
    spanId: uuidv4(),
    parentId: parent.spanId,
  };
}
