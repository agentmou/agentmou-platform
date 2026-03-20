# Architecture Documentation Guide

Use this guide when the user wants architecture docs, system overviews, or flow
explanations.

## Cover these elements

1. Purpose
   - What the system or subsystem exists to do
2. Boundaries
   - Which folders, services, or packages belong to each concern
3. Entrypoints
   - HTTP requests, CLI commands, events, schedulers, workers, jobs
4. Main flows
   - Request path, event path, or data-processing path
5. Dependencies
   - Internal module dependencies
   - External services, data stores, queues, and providers
6. Critical configuration
   - Runtime config, secrets, feature flags, or deployment config
7. Failure-sensitive areas
   - Auth, database writes, retries, idempotency, background work

## How to describe a main flow

Use a short sequence:

1. Entry point
2. Validation or routing layer
3. Business logic layer
4. Persistence, messaging, or external call
5. Side effects and observability

Keep the explanation anchored to concrete paths.

## Dependency guidance

- Distinguish internal dependencies from third-party dependencies.
- Call out dependency direction when it matters:
  - UI -> API -> worker
  - package A -> package B
  - service -> database
- If a complete graph is not available, describe only what the evidence supports.

## Cross-cutting concerns to look for

| Concern | What to document |
| --- | --- |
| Auth | entrypoints, guards, providers, token/session ownership |
| Data | schemas, migrations, repositories, ORM layers, ownership |
| Jobs and queues | producers, consumers, retry rules, schedules |
| Events | emitters, subscribers, contracts, idempotency expectations |
| Config | source files, env vars, config precedence |
| Infra | Docker, orchestration, Terraform, Helm, cloud bindings |
| Observability | logs, metrics, tracing, alerts |

## When to create which doc

- Architecture overview:
  - use when the repo has multiple major modules or runtimes
- Repo map:
  - use when folder navigation is a major pain point
- Module or service doc:
  - use when one area needs deeper explanation than the repo-wide overview
- ADR:
  - use when a durable technical decision needs context and tradeoffs
- Runbook:
  - use when someone may need to operate or recover the system
