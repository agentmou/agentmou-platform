# ADR-007 — n8n Workflow Provisioning Strategy

**Status**: accepted
**Date**: 2026-03-09

## Context

When a tenant installs a workflow (e.g. "Auto Label Gmail"), the platform
needs to create a real n8n workflow in the shared n8n instance so it can
actually execute. We need a strategy for mapping tenant installations to
n8n workflows.

## Decision

One n8n workflow per tenant-installation. When a tenant installs a workflow
template, the API:

1. Inserts a `workflow_installations` row in Postgres.
2. Calls the n8n REST API (`POST /workflows`) to import the workflow JSON
   from the catalog, prefixed with the tenant ID for disambiguation.
3. Stores the returned `n8nWorkflowId` on the installation row.

The `@agentmou/n8n-client` package encapsulates all n8n API calls.
The API service (not the worker) handles provisioning synchronously
during installation — this keeps the flow simple for MVP.

## Alternatives Considered

### Shared workflow with tenant routing

One n8n workflow per template, with tenant context passed at execution
time. Rejected because n8n credentials are per-workflow and we cannot
dynamically switch Gmail tokens at runtime without custom nodes.

### Worker-based async provisioning

Queue a job and let the worker create the workflow. This adds latency
and complexity for the user (installation is not immediately usable).
Acceptable for large-scale but overkill for MVP.

## Consequences

- Each tenant-installation creates a separate n8n workflow. At scale this
  means N_tenants × N_templates workflows — acceptable for MVP but will
  need cleanup automation later.
- `N8N_API_URL` and `N8N_API_KEY` must be configured on the API service.
- If the n8n call fails, the installation is marked as `error` and can
  be retried manually.
- n8n must be reachable from the API container on the internal network.
