# Engineering Conventions

These conventions codify the decisions used across refactors.

## Naming

- Use `tenantId` consistently for tenant-scoped routes and selectors.
- Use `*Template` for catalog entities (e.g., `AgentTemplate`,
  `WorkflowTemplate`, `PackTemplate`).
- Use `Installed*` for tenant activation state (e.g., `InstalledAgent`,
  `InstalledWorkflow`).
- Use `Execution*` for run-time execution records (e.g., `ExecutionRun`,
  `ExecutionStep`).
- Use `*Schema` suffix for Zod schemas (e.g., `AgentTemplateSchema`).

## Data Modeling

Always preserve these boundaries:

- **Template**: what is listed in catalog/marketplace.
- **Installation**: what a tenant has activated.
- **Execution**: what actually ran.

Do not collapse these into a single model.

## Shared Types (Contracts)

- All domain types shared across workspaces must be defined in
  `packages/contracts`.
- Use Zod schemas as the primary definition; infer TypeScript types from
  them.
- Organize schemas by bounded context (`catalog.ts`, `tenancy.ts`,
  `execution.ts`, etc.).
- Consumer packages import from `@agentmou/contracts`:

```typescript
import type { AgentTemplate, ExecutionRun } from '@agentmou/contracts';
import { AgentTemplateSchema } from '@agentmou/contracts';
```

- UI-only concerns (filter options, display helpers) stay local to the
  web app.

## Imports and Layering

- Page/components in `apps/web` should consume product data through
  `lib/data/*` plus `lib/providers/*`.
- Demo-only selectors belong in `lib/demo/read-model.ts`; do not import
  `lib/demo-catalog/*` directly from product pages.
- Marketing and `demo-workspace` can use `mockProvider` / `demoProvider`, but
  authenticated tenant pages must stay on `apiProvider`.
- Domain types are imported from `@/lib/control-plane/types` (which
  re-exports from `@agentmou/contracts`).
- Keep cross-domain imports explicit and minimal.

## Frontend Boundaries

- `apps/web/components/ui/*` is the current home for reusable UI primitives.
- Do not recreate a `packages/ui` placeholder until there is a real shared UI
  contract with more than one consumer.
- Keep product, demo, and marketing concerns explicit in folder names:
  `lib/providers/*`, `lib/demo/*`, `lib/demo-catalog/*`, and
  `lib/marketing/*`.

## Routing

- Tenant app routes must always include `/app/[tenantId]/...`.
- Avoid hard-coded legacy routes.
- Ensure query parameter names are stable and shared between
  source/target pages.

## Server vs Client

- Prefer server components for static/read-mostly rendering when backend
  integration is real.
- Keep client components for interaction-heavy flows (filters, dialogs,
  local editing state).
- Route handlers should remain thin adapters over domain services.

## Shared vs Local Logic

- Put reusable mock/demo selectors in `lib/demo/read-model.ts`.
- Put transport-neutral tenant data contracts in `lib/data/provider.ts`.
- Keep one-off page formatting/filter details local to the page.
- Only extract when logic is reused or central to domain correctness.

## Backend Naming

- Prefer role-based names over generic buckets such as `shared`.
- Use names like `runtime-support`, `mapper`, `orchestrator`, `client`, and
  `persistence` when they describe the file's actual responsibility.
- Do not keep placeholder job or queue modules in active runtime folders if
  they are not started by the service entrypoint.

## Type Safety

- Keep domain unions in sync with real data (status values, action types,
  step types).
- Avoid loose `any` in domain boundaries.
- Prefer narrow runtime guards when reading dynamic payloads
  (`Record<string, unknown>`).
- API mappers should parse shared contracts before returning them.
- Web API clients should parse contract envelopes at the boundary so drift
  fails loudly.

## Linting

- ESLint flat config at workspace root (`eslint.config.js`).
- All packages use `eslint .` as their lint command.
- `no-console` is set to warn (allows `console.warn` and
  `console.error`).
- Unused variables prefixed with `_` are allowed.
- Root `pnpm lint` must remain a real gate for infrastructure too:
  `pnpm lint:infra` syntax-checks `infra/scripts/*.sh` and validates every
  tracked Compose file with `docker compose config` against the example env
  files.

## Documentation

- Every architectural change must update docs under `/docs` and root
  `README.md`.
- Document current reality, not aspirational architecture only.
- Keep refactor logs for each significant change session.
