# @agentmou/contracts

Shared Zod schemas and TypeScript types for the AgentMou platform.

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

| Module | Entities |
| --- | --- |
| `catalog` | Category, AgentTemplate, WorkflowTemplate, PackTemplate, WorkflowNode, enums (RiskLevel, HITLMode, Complexity, etc.) |
| `tenancy` | Tenant, TenantMember, UserRole, TenantType, TenantPlan |
| `installations` | InstalledAgent, InstalledWorkflow, InstallStep, InstallRun |
| `execution` | ExecutionRun, ExecutionStep, ExecutionStatus |
| `approvals` | ApprovalRequest, ApprovalActionType |
| `connectors` | Integration, N8nConnection |
| `security` | SecurityFinding, SecurityPolicy, TenantSecurityScore |
| `billing` | Invoice, UsageMetric |
| `dashboard` | DashboardMetrics |

### Barrel Exports

- `schemas.ts` — re-exports all Zod schemas.
- `types.ts` — re-exports all inferred TypeScript types.
- `index.ts` — re-exports everything from all domain modules.

## Development

```bash
pnpm --filter @agentmou/contracts typecheck
pnpm --filter @agentmou/contracts lint
```
