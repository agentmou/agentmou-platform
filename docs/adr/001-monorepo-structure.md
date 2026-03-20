# ADR-001 — Monorepo Structure

**Status**: accepted
**Date**: 2026-03-08

## Context

We need to decide on the project structure for the AgentMou Platform. The platform consists of multiple applications, services, and shared packages that need to work together.

## Decision

We will use a monorepo structure with the following characteristics:

- **pnpm workspaces** for package management
- **Turborepo** for build orchestration and caching
- Clear separation between apps, services, and packages

### Structure

```
agentmou-platform/
├─ apps/          # Applications (Next.js web app)
├─ services/      # Backend services (API, workers)
├─ packages/      # Shared internal packages
├─ catalog/       # Agent and workflow definitions
├─ workflows/     # n8n workflow configurations
└─ infra/         # Infrastructure as code
```

### Package Organization

Each internal package follows this structure:
- `src/index.ts` - Main entry point
- `src/*.ts` - Implementation files
- `package.json` - Package configuration
- `tsconfig.json` - TypeScript configuration

## Consequences

### Positive

- Code sharing across applications and services
- Single source of truth for types and contracts
- Easier refactoring and maintenance
- Consistent tooling and configuration
- Atomic commits across packages

### Negative

- Larger repository size
- More complex CI/CD pipeline
- Need for careful dependency management

## Compliance

All new code must follow this structure. Existing code should be migrated
gradually.
