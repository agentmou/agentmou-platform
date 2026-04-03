# @agentmou/contracts

Shared Zod schemas and TypeScript types for the Agentmou platform.

## Purpose

This package is the **single source of truth** for domain types shared
across all workspaces in the monorepo (web, API, worker, and other
packages). See [ADR-002](../../docs/adr/002-shared-contracts-type-system.md).

## Usage

```typescript
import type { AgentTemplate, ExecutionRun, Tenant } from '@agentmou/contracts';
import { AgentTemplateSchema, ExecutionRunSchema } from '@agentmou/contracts';

// Runtime validation
const parsed = AgentTemplateSchema.parse(rawData);
```

## Key Exports

### Domain Modules

- `catalog`: Category, AgentTemplate, WorkflowTemplate, PackTemplate,
  WorkflowNode, and enums such as `RiskLevel`, `HITLMode`, and `Complexity`
- `tenancy`: Tenant, TenantMember, UserRole, TenantType, TenantPlan
- `installations`: InstalledAgent, InstalledWorkflow, InstallStep, InstallRun
- `execution`: ExecutionRun, ExecutionStep, ExecutionStatus
- `approvals`: ApprovalRequest, ApprovalActionType
- `connectors`: Integration, N8nConnection
- `security`: SecurityFinding, SecurityPolicy, TenantSecurityScore
- `billing`: Invoice, UsageMetric
- `dashboard`: DashboardMetrics
- `chat`: PublicChatRequest, PublicChatResponse, citations, and actions
- `clinic`: ClinicProfile, TenantModule, Patient, ConversationThread,
  Appointment, dashboard/read models, list/detail envelopes, mutation wrappers,
  filters, clinic action bodies, and `clinic_feature_unavailable` errors

### Barrel Exports

- `schemas.ts` — re-exports all Zod schemas.
- `types.ts` — re-exports all inferred TypeScript types.
- `index.ts` — re-exports everything from all domain modules.

The clinic module is the shared contract surface for the vertical data layer:
it exposes clinic entities, dashboard payloads, list/detail envelopes, singular
mutation wrappers for module/channel/reminder/confirmation/waitlist/gap
operations, filter schemas, request bodies, and the structured feature
unavailable error used by the backend and typed web clients.

## Development

Production Docker images for Node services in this monorepo that bundle
workspace-linked dependencies typically run the service entrypoint with `tsx`
so TypeScript package entrypoints (this package’s `main` points at `src`) load
correctly inside the container. See `services/api/Dockerfile` and
`services/worker/Dockerfile` for examples.

```bash
pnpm --filter @agentmou/contracts typecheck
pnpm --filter @agentmou/contracts lint
```

## Related Docs

- [Architecture Overview](../../docs/architecture/overview.md)
- [Repository Map](../../docs/repo-map.md)
- [ADR-002: Shared Contracts](../../docs/adr/002-shared-contracts-type-system.md)
