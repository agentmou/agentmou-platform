# ADR-004 — TypeScript Runtime First

**Status**: accepted
**Date**: 2026-03-08

## Context

The platform needs a runtime for the agent engine, API server, and worker
jobs. The two primary language candidates are TypeScript and Python.

The existing frontend is TypeScript (Next.js 16, React 19). Sharing types
and contracts across frontend and backend is a significant productivity
advantage in a monorepo.

## Decision

TypeScript is the primary language for all platform code: frontend, API,
worker, agent engine, and shared packages.

Python is acceptable only if a clear, justified need arises — for example,
specialized ML pipelines or OCR that have no viable TS equivalent.

## Alternatives Considered

1. **Python for backend**: rejected because it fragments the type system,
   requires separate contract definitions, and doubles the tooling surface.
2. **Hybrid from day one**: rejected because the added complexity is not
   justified at this stage.

## Consequences

- All packages use TypeScript with the shared `tsconfig.base.json`.
- Zod schemas in `@agentmou/contracts` serve as the single type source of
  truth.
- The agent engine (`packages/agent-engine`) is implemented in TypeScript,
  using TypeScript-native LLM client libraries.
- Python services may be introduced later as isolated containers if a
  justified need appears.
