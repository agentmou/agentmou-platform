# 009 — AI Surface Boundaries

**Status**: accepted
**Date**: 2026-03-21

## Context

The repository already contains several things that the team casually calls
"agents":

- developer agents and skills used to work on the codebase
- installable product agents for tenants
- n8n-backed workflow templates
- the narrow Python helper service under `services/agents`

Without explicit boundaries, these surfaces blur together. That causes design
confusion around:

- where the source of truth lives
- whether n8n is a builder, a runtime, or both
- whether workflow JSON should be duplicated per tenant in Git
- where credentials are supposed to live
- whether `services/agents` is the main product runtime

The existing ADRs already establish that n8n is internal and that workflow
provisioning is tenant-scoped, but they do not fully separate developer-agent
tooling from product runtime concepts, and they overstate the credential model
for current n8n-backed workflows.

## Decision

### Source of truth

Git is the canonical source of truth for workflow and agent definitions.

- Agent definitions live under `catalog/agents/`.
- Workflow definitions live under `workflows/`.
- Runtime systems store installations, credentials, runs, approvals, logs, and
  external IDs.

### n8n role

n8n remains an internal deterministic workflow runtime.

- It is not the control plane.
- It is not a tenant-facing builder surface.
- It is not the canonical source of workflow definitions.

### Tenant model

Workflow installs use one runtime copy per tenant installation in the shared
n8n instance.

- The repo stores one canonical workflow template.
- Installing that template creates a tenant-scoped `workflow_installations`
  row plus a concrete `n8nWorkflowId`.
- We do not commit one workflow JSON per tenant.

### Credential strategy

The default credential strategy is `platform_managed`.

- Platform connectors and services should own tenant credentials when the
  runtime path supports it.
- Workflows that still require n8n-native credentials are allowed only as
  documented exceptions.
- Those exceptions must be declared in operational manifest metadata via
  `runtime.credentialStrategy`.

This narrows ADR-003 in a practical way: platform-managed credentials remain
the default architecture, but current n8n node constraints can justify an
explicit exception.

### Product agents vs developer agents

Developer agents and product agents are separate concepts.

- Developer agents: Codex, Cursor, repo skills, and developer MCP tooling used
  to build the repository.
- Product agents: tenant-installable templates executed through the platform
  runtime.

Developer-agent tooling must not be treated as part of the customer-facing SaaS
runtime model.

### Runtime ownership

- `@agentmou/agent-engine` is the primary runtime for installable product
  agents.
- `services/agents` is currently a narrow helper service, not the main product
  runtime.
- n8n owns deterministic workflow execution.

## Alternatives Considered

### Make n8n the canonical builder and source of truth

Rejected because it would move product truth into a runtime system and weaken
reviewability, version control, and repo-local testing.

### Commit one workflow JSON per tenant

Rejected because tenant variance belongs in installations and runtime state,
not in versioned source assets.

### Collapse developer-agent tooling into the product runtime model

Rejected because workspace instructions, skills, and developer MCP configs are
implementation tooling, not tenant-facing runtime components.

## Consequences

- Operational manifests now need explicit runtime metadata such as
  `requiredConnectors`, `credentialStrategy`, `installStrategy`, and
  `runtimeOwner`.
- The API catalog layer must map operational manifests to shared UI contracts
  instead of returning raw manifests directly.
- Runbooks and docs must describe authoring as:
  prototype -> sanitize -> commit -> install -> validate -> clean up.
- Workflows that remain n8n-native credential exceptions must document that
  exception in their README and manifest.
