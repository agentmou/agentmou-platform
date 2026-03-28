# ADR-002: Shared Contracts and Type System with Zod

**Status**: accepted
**Date**: 2024-01-15

## Context

The platform consists of multiple services (API, worker, agents, web frontend) that communicate via HTTP and message queues. Without a shared contract layer, these services drift over time:

- Changes to an API endpoint are not reflected in the frontend until manually synced
- Database schema migrations must be manually coordinated across services
- Queue message types are not validated until runtime
- Type mismatches between frontend and backend cause bugs at the edges

A shared contracts package allows all services to import the same TypeScript types, ensuring compile-time safety and consistency across the entire platform.

## Decision

Create `@agentmou/contracts` as a single source of truth for all shared data types and API contracts. Use **Zod** for schema definition and runtime validation.

Zod provides:
- **Declarative schemas**: Single definition for both TypeScript types and runtime validators
- **Automatic type inference**: TypeScript types are derived from schemas with `z.infer<typeof schema>`
- **Runtime validation**: All external inputs (HTTP requests, queue messages, OAuth tokens) are validated against Zod schemas
- **Error reporting**: Clear, actionable validation errors

Structure of `@agentmou/contracts`:
- `src/api/`: API request/response types (shared between services/api and apps/web)
- `src/queues/`: BullMQ job payload types (shared between services/api and services/worker)
- `src/db/`: Database entity types (derived from Drizzle schema in @agentmou/db)
- `src/connectors/`: Connector configuration and OAuth token types
- `src/agents/`: Agent execution types (shared between services/api, services/worker, and services/agents)

All services import from `@agentmou/contracts` and validate inputs:
```typescript
import { z } from 'zod';
import { schemas } from '@agentmou/contracts';

// In API endpoint
const result = schemas.api.CreateInstallRequest.parse(req.body);

// In Worker
const job = await queue.getJob(jobId);
const payload = schemas.queues.ExecuteAgentJob.parse(job.data);
```

## Alternatives Considered

1. **Protocol Buffers (protobuf)**:
   - Pros: Language-agnostic, strong typing, compact serialization
   - Cons: Requires code generation, unfamiliar to frontend developers, adds tooling complexity

2. **JSON Schema**:
   - Pros: Standard format, tooling support
   - Cons: No automatic TypeScript inference, verbose for complex types, runtime validation is a separate library

3. **Manual type definitions**:
   - Pros: Simple initial setup
   - Cons: No runtime validation, types easily drift from actual API behavior, no single source of truth

## Consequences

- **Single import path**: All services use `import { schemas } from '@agentmou/contracts'`. Changes to contracts propagate immediately during build.
- **Compile-time safety**: TypeScript catches mismatches between services at build time, not in production.
- **API-first development**: New features require updating the contract first, then implementing in each service.
- **Runtime safety**: All external inputs are validated; invalid data is rejected early with clear errors.
- **Type inference**: Developers do not manually maintain separate type definitions; they emerge from schemas.
- **Changes require coordination**: Modifying a contract impacts all consuming services; breaking changes must be handled carefully (e.g., with versioning or deprecation windows).

The contracts package is lightweight and has no runtime dependencies (Zod is the only external dependency), so it can be imported everywhere without bloat.
