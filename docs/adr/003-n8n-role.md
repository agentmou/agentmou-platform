# ADR-003 — n8n Role: Deterministic Workflow Engine

**Status**: accepted
**Date**: 2026-03-08

## Context

n8n is already deployed on the VPS and provides a powerful workflow automation
engine. The question is what role it plays in the platform architecture.

The risk is that n8n becomes the de facto control plane — owning catalog,
tenancy, secrets, and scheduling — which would make the platform dependent
on n8n internals for product logic.

## Decision

n8n is a **deterministic workflow execution engine** invoked by the platform,
not a control plane.

Specifically:

- n8n executes versioned workflows triggered by the platform worker.
- Workflows are defined as assets in `workflows/` and deployed to n8n via
  the `@agentmou/n8n-client` adapter.
- n8n does **not** own the catalog, tenant model, secrets, or scheduling.
- n8n is internal — not exposed as a public-facing UI for end users.
- Credentials for integrations live in the platform's secret envelopes,
  not in n8n's credential store.

## Alternatives Considered

1. **n8n as the primary runtime**: rejected because it couples product logic
   to n8n's internal models and makes multi-tenant isolation harder.
2. **Replace n8n entirely**: rejected because n8n provides battle-tested
   workflow orchestration that is expensive to rebuild.

## Consequences

- The worker invokes n8n workflows via its REST API.
- Workflow definitions are versioned in git and registered/updated in n8n
  programmatically.
- n8n should be pinned to a specific version and kept on an internal
  network.
- The platform maintains its own scheduling, retries, and approval gates.
