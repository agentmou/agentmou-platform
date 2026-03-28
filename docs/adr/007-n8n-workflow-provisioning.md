# ADR-007: One n8n Workflow Instance Per Tenant, Provisioned via REST API

**Status**: accepted
**Date**: 2024-01-15

## Context

When a tenant installs a workflow-based agent, a workflow instance must be created in n8n. The architecture needs to decide:

1. **Shared workflow with tenant parameters**: One workflow template serves all tenants via variables
2. **Isolated workflow per tenant**: Each tenant gets a dedicated workflow instance
3. **Custom engine** in-house instead of n8n

Shared workflows reduce n8n resource usage but create coupling:
- One workflow bug affects all tenants
- Credential isolation becomes complex (each tenant's credentials must be passed as params)
- Debugging is harder (mixed tenant state in logs)

Isolated workflows per tenant provide:
- Clean tenant isolation (one workflow = one customer)
- Simpler credential management (credentials stored in n8n per tenant)
- Easier debugging and testing
- Straightforward uninstall (delete the workflow, cleanup credentials)

## Decision

**One n8n workflow instance per tenant installation**, provisioned and managed via n8n REST API.

When a tenant installs a workflow-based agent:
1. Control plane API creates a workflow definition in PostgreSQL
2. Worker picks up the installation job
3. Worker calls n8n REST API to create a workflow
4. Workflow ID is stored in PostgreSQL alongside the installation
5. All tenant credentials are created as n8n secrets specific to that workflow

When the tenant uninstalls:
1. Worker calls n8n REST API to delete the workflow
2. Credentials stored in n8n for that workflow are removed
3. Installation record is deleted from PostgreSQL

Workflow lifecycle:
```
Tenant Install Agent
  ↓
Control Plane API creates installation record
  ↓
Worker picks up "provision-workflow" job
  ↓
Worker calls n8n REST API to create workflow
  ↓
Worker stores workflow ID in PostgreSQL
  ↓
n8n workflow is ready; executions begin
  ↓
[Tenant runs workflow via API]
  ↓
Tenant uninstalls agent
  ↓
Worker calls n8n REST API to delete workflow
  ↓
Installation deleted from PostgreSQL
```

The workflow definition (JSON) is stored in both PostgreSQL and n8n, providing a fallback source of truth.

## Alternatives Considered

1. **Shared workflow with parameters**:
   - Pros: Fewer n8n resources
   - Cons: Credential isolation is complex, one tenant's actions affect all, harder debugging

2. **Custom deterministic engine** in-house:
   - Pros: Full control, tailored to needs
   - Cons: High maintenance, security risk, duplicate of n8n functionality

3. **Tenant chooses workflow via UI**: Expose n8n builder UI directly to tenants (Zapier-like):
   - Pros: Flexible for end users
   - Cons: Support burden, security risk (tenants can access other workflows), not aligned with current product

## Consequences

- **Resource efficiency**: Each tenant workflow consumes n8n resources (memory, CPU). At scale, n8n clusters become necessary.
  - Mitigation: n8n can be deployed on Kubernetes for auto-scaling
- **Straightforward isolation**: Tenant A's workflow does not see tenant B's data or credentials.
- **Credential management**: Each tenant's OAuth tokens are stored as secrets in n8n, encrypted at rest.
- **Clean uninstall**: Deleting a workflow removes all associated data and credentials. No residual state.
- **Workflow versioning**: Workflows are stored in PostgreSQL; versions can be tracked (e.g., "customer updated workflow on March 15").
- **Execution logs**: n8n logs all executions per workflow, keyed by workflow ID. Audit trail is clear.
- **API provisioning**: No manual UI interaction required. Installation and deletion are automated, reproducible, and atomic.

This approach aligns with n8n's intended use (internal automation) and avoids the complexity of shared state or custom engines.
