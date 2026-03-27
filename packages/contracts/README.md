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

| Module          | Entities                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `catalog`       | Category, AgentTemplate, WorkflowTemplate, PackTemplate, WorkflowNode, enums (RiskLevel, HITLMode, Complexity, etc.)                       |
| `tenancy`       | Tenant, TenantMember, UserRole, TenantType, TenantPlan                                                                                     |
| `installations` | InstalledAgent, InstalledWorkflow, InstallStep, InstallRun                                                                                 |
| `execution`     | ExecutionRun, ExecutionStep, ExecutionStatus                                                                                               |
| `approvals`     | ApprovalRequest, ApprovalActionType                                                                                                        |
| `connectors`    | Integration, N8nConnection                                                                                                                 |
| `security`      | SecurityFinding, SecurityPolicy, TenantSecurityScore                                                                                       |
| `billing`       | Invoice, UsageMetric                                                                                                                       |
| `dashboard`     | DashboardMetrics                                                                                                                           |
| `chat`          | PublicChatRequest, PublicChatResponse, citations, and actions                                                                              |
| `internal-ops`  | Internal agent profiles, objectives, delegations, Telegram updates, OpenClaw turn contracts, capability bindings, and internal work orders |

### Barrel Exports

- `schemas.ts` — re-exports all Zod schemas.
- `types.ts` — re-exports all inferred TypeScript types.
- `index.ts` — re-exports everything from all domain modules.

## Development

Production Docker images for Node services in this monorepo that bundle
workspace-linked dependencies typically run the service entrypoint with `tsx`
so TypeScript package entrypoints (this package’s `main` points at `src`) load
correctly inside the container. See `services/openclaw-runtime/Dockerfile` and
`services/internal-ops/Dockerfile` for examples.

```bash
pnpm --filter @agentmou/contracts typecheck
pnpm --filter @agentmou/contracts lint
```

## Related Docs

- [Current State](../../docs/architecture/current-state.md)
- [Repository Map](../../docs/repo-map.md)
- [Internal Ops Architecture](../../docs/architecture/internal-ops-personal-os.md)
- [ADR-002: Shared Contracts](../../docs/adr/002-shared-contracts-type-system.md)
