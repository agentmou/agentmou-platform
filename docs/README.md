# Agentmou Platform Documentation

Welcome to the Agentmou Platform documentation. This hub organizes everything
you need to understand, develop, and operate the AI agents platform.

## Getting Started

**New to Agentmou?** Start here:

- **[Onboarding Guide](./onboarding.md)** — Prerequisites, local setup, key concepts, and first tasks.
- **[Glossary](./glossary.md)** — Domain terms and concepts used throughout the platform.

## Architecture

Understand how Agentmou is structured and why:

- **[Architecture Overview](./architecture/overview.md)** — System topology, control plane vs data plane, communication patterns, auth model.
- **[apps/web Architecture](./architecture/apps-web.md)** — Route groups, provider modes, auth callback flow, and tenant UI boundaries.
- **[Repository Map](./repo-map.md)** — Every app, service, package, and config file explained.
- **[Data Model](./architecture/data-model.md)** — Database schema, entity relationships, migrations, encryption at rest.
- **[Agent Engine](./architecture/agent-engine.md)** — Planner, PolicyEngine, Toolkit, execution flow, HITL approvals.
- **[Catalog System](./architecture/catalog-system.md)** — Catalog layers, availability tiers, manifest structure, templates, promotion flow.
- **[Catalog, Demo, and Marketing](./catalog-and-demo.md)** — Operational manifests vs demo inventory vs curated marketing surfaces.
- **[Conventions](./architecture/conventions.md)** — Naming, imports, data modeling, error handling, typing guardrails.

## Development

Guidelines for contributing:

- **[Testing Guide](./testing.md)** — Vitest patterns, test categories, AAA pattern, mocking, coverage expectations.
- **[API Routes](./api-routes.md)** — REST API endpoint reference for all 15 route modules.
- **[Environment Variables](./environment-variables.md)** — Complete configuration reference.

Commit, branching, and PR conventions live in `.cursor/rules/` and `.codex/rules/`
(applied automatically by AI assistants).

## Operations

Guides for running Agentmou in production:

- **[Runbooks Index](./runbooks/README.md)** — Quick reference for all operational runbooks.
- **[Local Development](./runbooks/local-development.md)** — Setup, hot reload, database operations, running tests.
- **[Deployment](./runbooks/deployment.md)** — VPS requirements, deploy procedure, health verification, rollback.
- **[VPS Operations](./runbooks/vps-operations.md)** — Server management, backups, certificates, monitoring.
- **[Agent Authoring](./runbooks/agent-authoring.md)** — Creating agents and workflows from templates to production.
- **[Security & Dependencies](./runbooks/security-dependencies.md)** — Auditing, dependency updates, secrets management.

## Troubleshooting

- **[Troubleshooting Guide](./troubleshooting.md)** — Common problems and solutions for Docker, database, auth, build, queues, n8n, and Python services.

## Architecture Decision Records

Decisions that shaped the platform:

| ADR | Title |
| --- | --- |
| [001](./adr/001-monorepo-structure.md) | Monorepo with pnpm + Turborepo |
| [002](./adr/002-shared-contracts-type-system.md) | Shared contracts type system (Zod) |
| [003](./adr/003-n8n-role.md) | n8n as internal workflow engine |
| [004](./adr/004-typescript-runtime-first.md) | TypeScript runtime first |
| [005](./adr/005-postgres-pgvector-redis.md) | PostgreSQL + pgvector + Redis |
| [006](./adr/006-vps-deployment.md) | Docker Compose on VPS |
| [007](./adr/007-n8n-workflow-provisioning.md) | One n8n workflow per tenant installation |
| [008](./adr/008-connector-oauth-token-storage.md) | AES-256-GCM token encryption |
| [009](./adr/009-ai-surface-boundaries.md) | AI surface boundaries |
| [010](./adr/010-catalog-availability-tiers.md) | Catalog availability tiers |
| [011](./adr/011-enterprise-auth-strategy.md) | Enterprise auth strategy |

## Quick Navigation by Role

**Frontend** — [Onboarding](./onboarding.md) → [apps/web Architecture](./architecture/apps-web.md) → [Repo Map](./repo-map.md) → [Testing](./testing.md)

**Backend** — [Onboarding](./onboarding.md) → [Architecture](./architecture/overview.md) → [API Routes](./api-routes.md) → [Data Model](./architecture/data-model.md) → [Agent Engine](./architecture/agent-engine.md)

**DevOps** — [Local Dev](./runbooks/local-development.md) → [Deployment](./runbooks/deployment.md) → [VPS Ops](./runbooks/vps-operations.md) → [Environment Variables](./environment-variables.md)

**Product** — [Glossary](./glossary.md) → [Catalog, Demo, and Marketing](./catalog-and-demo.md) → [Catalog System](./architecture/catalog-system.md)

## Key Commands

```bash
pnpm install                # Install dependencies
pnpm dev                    # Start all services in dev mode
pnpm test                   # Run all tests
pnpm lint                   # Lint all code
pnpm typecheck              # TypeScript type checking
pnpm format                 # Auto-format code
pnpm db:generate            # Generate migrations
pnpm db:migrate             # Run migrations
pnpm db:seed                # Seed test data
```

For the complete list, see the root [README.md](../README.md).
