# Documentation Standards

Use this reference when the task includes repo documentation updates that should
stay aligned with code, API surfaces, and operational ownership.

## Required Artifacts

| Artifact | Location | Requirement |
| --- | --- | --- |
| Public API | TSDoc on exports | Always for exported functions, classes, and types in `packages/` |
| REST endpoints | OpenAPI + JSDoc | Always for HTTP endpoints |
| Architecture decisions | `docs/adr/NNNN-title.md` | When making hard-to-reverse or cross-package decisions |
| Runbooks | `docs/runbooks/` | For any operational procedure or recovery workflow |
| Package purpose | `README.md` in each package root | For every app, service, and package |
| Environment variables | `infra/compose/.env.example` plus comments | When adding or changing env vars |

## Writing Rules

- Use American English.
- Write for a reader with zero context.
- Explain what the component does, how it fits into the system, and how to use
  or operate it.
- Prefer co-located docs over central documentation.
- Update documentation in the same change as the code.
- Remove stale text immediately when behavior changes.
- Keep examples grounded in real code paths, commands, and file names.

## Public API Documentation

Add TSDoc to exported functions, classes, interfaces, types, enums, and
constants in `packages/` when the export is part of the package's public
surface.

Cover:

- Purpose in one clear sentence
- Parameters and important option fields
- Return value or produced side effect
- Thrown errors when callers must handle them
- Important invariants or lifecycle behavior

Use comments when they add information the type system does not already reveal.

### Comments that must exist

- Non-obvious business rules or domain logic
- Workarounds with a link to the upstream issue
- Performance-sensitive code where the rationale matters
- Regex patterns, including what they match and why

### Comments that should not exist

- Comments that simply restate the code
- Comments that only repeat the type signature
- Change-log style comments in code

## REST Endpoint Documentation

Document REST endpoints with OpenAPI 3.1 annotations and endpoint-adjacent
JSDoc.

Use these rules:

- Treat Zod schemas in `@agentmou/contracts` as the source of truth when
  available
- Keep request and response examples inside the OpenAPI spec, not in separate
  prose files
- Document authentication, required inputs, success responses, and failure
  modes
- Update endpoint docs whenever behavior, validation, or payload shapes change

## ADR Template

Use ADRs for decisions that affect multiple packages, constrain future work, or
are expensive to reverse.

```markdown
# NNNN - Title

**Status**: proposed | accepted | deprecated | superseded by NNNN
**Date**: YYYY-MM-DD

## Context
What problem or question triggered this decision?

## Decision
What did we decide and why?

## Alternatives Considered
What else was evaluated and why was it rejected?

## Consequences
What are the trade-offs? What must change as a result?
```

## Package README Template

Every package under `packages/`, `services/`, and `apps/` should have a
`README.md` with these sections when relevant:

1. One-line purpose
2. Responsibilities or feature scope
3. How it fits into the wider system
4. Usage example or local entry point
5. Key exports, routes, jobs, or UI surfaces
6. Configuration and required environment variables
7. Development workflow: build, test, lint, run locally
8. Links to related docs

## Runbook Template

Use this structure for operational procedures:

```markdown
# Runbook Title

## Purpose
What this procedure solves and when to use it.

## Preconditions
Required access, tools, secrets, and system state.

## Signals
How to recognize the issue or the moment to run the procedure.

## Procedure
Ordered recovery or operational steps.

## Verification
How to confirm the system is healthy again.

## Rollback or Escalation
What to do if the procedure fails.
```

## Documentation Checklist

Before considering the work complete, confirm that:

- The document answers what, why, and how
- Terminology is consistent with the codebase
- Examples are minimal but real
- Commands can be run as written
- Internal links point to existing files
- The level of detail is enough for a newcomer to follow without guessing
