# Architecture Overview

## Purpose

[What the system or subsystem exists to do.]

## Boundaries

- `[path or module]`: [responsibility]
- `[path or module]`: [responsibility]

## Runtime Surfaces

- Requests: [entrypoints]
- Background work: [workers, jobs, cron]
- External integrations: [providers, services, queues]

## Main Flow

1. [Entry]
2. [Validation or routing]
3. [Business logic]
4. [Persistence or external call]
5. [Output, event, or side effect]

## Dependencies

- Internal: [module -> module]
- External: [database, queue, provider, cloud service]

## Critical Configuration

- `[file or env var]`: [why it matters]

## Failure-Sensitive Areas

- [risk]: [what can go wrong and where]
