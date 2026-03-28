# ADR-003: n8n as Internal Deterministic Workflow Engine

**Status**: accepted
**Date**: 2024-01-15

## Context

Agentmou tenants need to define multi-step workflows for AI agents:
- Receive email → extract information → update CRM → notify user
- Fetch data from source → format → send to destination
- Long-running approval processes with human gates

A workflow engine could be:
1. An external managed service (Zapier, Make, n8n Cloud)
2. Custom-built in-house
3. A self-hosted orchestrator (Temporal, n8n, Airflow)
4. Exposed directly to end users (Zapier-like builder UI)

The architecture must support:
- Deterministic workflow execution (reproducible, debuggable)
- One workflow per tenant installation (isolated state and credentials)
- Connector integration (n8n nodes for OAuth-connected services)
- Provisioning via API (not manual UI interaction)
- Invisible to end users (infrastructure, not a product feature)

## Decision

Use **n8n as internal deterministic workflow engine**, provisioned via its REST API. Each tenant installation gets exactly one workflow instance in n8n, provisioned automatically when the tenant installs a workflow-based agent.

n8n's role is narrowly defined:
- Execute deterministic, multi-step workflows with connectors
- Store OAuth credentials securely (n8n encryption at rest)
- Provide execution logs and audit trail
- Support human approval nodes (pause/resume)

n8n's role is **not**:
- User-facing workflow builder (tenants cannot see n8n UI)
- Control plane (n8n is not the source of truth for workflows)
- Distributed event processor (use Redis/BullMQ for queues instead)

Architecture:
- `services/api` defines workflows as JSON stored in PostgreSQL, keyed by tenant
- `services/worker` orchestrates agent execution; when a workflow step is needed, it calls the n8n REST API
- n8n stores one workflow instance per tenant; updates are made via API
- Credentials (OAuth tokens) are stored in n8n's encrypted vault
- Execution state is queried via n8n API for logging and debugging

## Alternatives Considered

1. **Temporal** (CNCF distributed workflow engine):
   - Pros: Highly scalable, strong consistency, rich SDK
   - Cons: Complex deployment, steep learning curve, overkill for single-tenant use case

2. **Custom workflow engine in-house**:
   - Pros: Full control, tailored to exact needs
   - Cons: High maintenance burden, duplicate work (n8n already does this), security risk

3. **Expose n8n UI directly to tenants** (Zapier-like):
   - Pros: Powerful flexibility for end users
   - Cons: Support burden, security (tenants can access other tenants' workflows), not matching current product vision

4. **AWS Step Functions or similar managed service**:
   - Pros: Serverless, integrates with AWS ecosystem
   - Cons: Vendor lock-in, less flexible for complex multi-step workflows, additional AWS costs

## Consequences

- **Infrastructure complexity**: n8n must be deployed, scaled, and monitored separately from the API and worker.
- **One workflow per tenant**: Tenant isolation is strong but resource-intensive (n8n is memory-hungry). Each tenant workflow is independent.
- **API-first provisioning**: Tenants never interact with n8n UI; workflows are provisioned programmatically. Setup and teardown are clean and reproducible.
- **Connector library**: n8n nodes (Google Sheets, Slack, GitHub, etc.) are available out of the box; custom connectors require n8n node development.
- **Debugging via API**: Workflow execution is inspected via n8n API, not UI. Operational tools must query n8n for logs and status.
- **State management**: n8n manages workflow state (paused, completed, etc.). The control plane API must query n8n to report status to tenants.
- **Credential security**: OAuth tokens are encrypted in n8n's vault. Token rotation and revocation are handled by n8n security model.

n8n is treated as infrastructure similar to PostgreSQL or Redis: essential, invisible to end users, managed centrally by operations.
