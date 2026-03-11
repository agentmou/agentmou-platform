# @agentmou/observability

Shared logging and trace-context utilities for backend services.

## Purpose

`@agentmou/observability` provides a common place for runtime diagnostics so
services do not each invent their own logging or trace ID format.

The package is intentionally small right now:
- `logger.ts` exports a shared Pino logger.
- `tracer.ts` exports lightweight trace and child-span helpers.

## Usage

```typescript
import {
  logger,
  createChildLogger,
  createTraceContext,
  createChildSpan,
} from '@agentmou/observability';

const trace = createTraceContext();
const span = createChildSpan(trace);
const log = createChildLogger({ traceId: trace.traceId, spanId: span.spanId });

log.info('worker started');
```

## Key Exports

- `logger`
- `createChildLogger(context)`
- `TraceContext`
- `createTraceContext()`
- `createChildSpan(parent)`

## Configuration

| Variable | Purpose |
| --- | --- |
| `LOG_LEVEL` | Pino log level; defaults to `info` |

## Development

```bash
pnpm --filter @agentmou/observability typecheck
pnpm --filter @agentmou/observability lint
```

## Related Docs

- [Engineering Conventions](../../docs/architecture/conventions.md)
- [Current Implementation vs Target Plan](../../docs/architecture/current-implementation.md)
