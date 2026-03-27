# @agentmou/observability

Shared logging and trace-context utilities for backend services.

## Purpose

`@agentmou/observability` provides a common place for runtime diagnostics so
services do not each invent their own logging or trace ID format.

The package is intentionally small right now:
- `logger.ts` exports a shared Pino logger.
- `logger.ts` also exports `createServiceLogger()` and
  `isTestEnvironment()` for runtime code that should avoid ad hoc logger setup.
- `tracer.ts` exports lightweight trace and child-span helpers.

## Usage

```typescript
import {
  createServiceLogger,
  createTraceContext,
  createChildSpan,
} from '@agentmou/observability';

const trace = createTraceContext();
const span = createChildSpan(trace);
const log = createServiceLogger('worker', {
  traceId: trace.traceId,
  spanId: span.spanId,
});

log.info('worker started');
```

## Key Exports

- `logger`
- `createChildLogger(context)`
- `createServiceLogger(service, context?)`
- `isTestEnvironment()`
- `TraceContext`
- `createTraceContext()`
- `createChildSpan(parent)`

## Configuration

| Variable | Purpose |
| --- | --- |
| `LOG_LEVEL` | Pino log level; defaults to `info` |

Pretty-print transport is enabled only for interactive TTY sessions outside
`NODE_ENV=test`, so CI and tests do not pay the readability overhead.

## Development

```bash
pnpm --filter @agentmou/observability typecheck
pnpm --filter @agentmou/observability lint
```

## Related Docs

- [Engineering Conventions](../../docs/architecture/conventions.md)
- [Current State](../../docs/architecture/current-state.md)
