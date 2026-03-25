# AI Surfaces

Use this document when you need to understand how AgentMou talks about
"agents," workflows, MCP, and runtime ownership without mixing together
developer tooling and customer-facing product behavior.

## Two Agent Worlds

### Developer Agents

Developer agents help us build the repository. Examples include Codex, Cursor,
repo-local `AGENTS.md` instructions, skills, and developer MCP connections.

- Their job is repo authoring, analysis, and local automation.
- Their context lives in workspace instructions, skill folders, prompts, and
  developer-local tooling config.
- They are not customer-facing product runtime components.
- They should never be treated as tenant-installable assets or as part of the
  SaaS control plane.

### Product Agents

Product agents are installable templates for tenants.

- Their canonical definitions live in `catalog/agents/<id>/`.
- Tenant installs create `agent_installations` rows keyed by `templateId`.
- `services/worker` runs them through `@agentmou/agent-engine`.
- `services/agents` is currently a narrow helper service for one LLM-backed
  capability, not the primary product runtime.

## Core Terms

- `Operational manifest`: the repo-tracked definition used by the platform to
  load, validate, install, and reason about an asset.
- `Catalog template`: the UI/API shape exposed to product surfaces after the
  operational manifest is mapped to shared contracts.
- `Installation`: the tenant-scoped runtime record created from a template.
- `Run`: a concrete execution created from an installation.

The important distinction is:

- `Manifest` is repo truth.
- `Template contract` is product presentation.
- `Installation` is tenant runtime state.

## Repo Truth vs Runtime Truth

### Repo Truth

Git is the canonical source for:

- agent manifests, prompts, and policies
- workflow manifests and sanitized workflow JSON
- pack manifests
- documentation, ADRs, runbooks, and tests

The repository does not store one workflow JSON per tenant.

### Runtime Truth

Runtime systems hold:

- tenant connector records and encrypted tokens
- workflow installations and their `n8nWorkflowId`
- agent installations and their config/HITL state
- BullMQ schedules and queued jobs
- executions, approvals, logs, and metrics

This means:

- `repo = definition`
- `runtime = live state`

## Where Things Live

### Product Agent Templates

- `catalog/agents/<id>/manifest.yaml`
- `catalog/agents/<id>/prompt.md`
- `catalog/agents/<id>/policy.yaml`
- optional README and supporting assets

### Workflow Templates

- `workflows/public/<id>/manifest.yaml`
- `workflows/public/<id>/workflow.json`
- optional README

### Packs

- `catalog/packs/<id>.yaml`

### Runtime Execution

- `services/api` handles control-plane install/provision requests
- `services/worker` runs agent/workflow jobs
- `@agentmou/agent-engine` owns product-agent planning and tool execution
- `@agentmou/n8n-client` talks to the shared n8n runtime

## n8n Role

n8n is an internal deterministic workflow engine.

- It is not the control plane.
- It is not the canonical source of workflow definitions.
- It is not a tenant-facing builder surface.

The current workflow model is:

- one workflow template in Git
- one runtime copy per tenant installation in shared n8n

This aligns with `workflow_installations.templateId + n8nWorkflowId`.

## Credentials and Runtime Ownership

The default rule is `platform_managed` credentials.

- Tenant connector records and platform services should own credentials when
  the runtime path supports it.
- n8n-native credentials are allowed only as a documented exception when node
  constraints require them.
- Exception status must be explicit in the workflow manifest via
  `runtime.credentialStrategy`.

Current runtime ownership examples:

- `agent_engine`: primary runtime for installable product agents
- `n8n`: runtime owner for deterministic workflow templates
- `agents_service`: narrow helper service for specific LLM-backed actions

## Manifest vs Catalog Contract

Operational manifests and UI contracts are intentionally different.

- Operational manifests contain repo-facing runtime metadata such as
  `runtime.requiredConnectors`, `credentialStrategy`, `installStrategy`, and
  `runtimeOwner`.
- Nested `catalog` metadata holds the UI-facing fields needed by marketplace
  contracts.
- `services/api/src/modules/catalog` maps operational manifests to the shared
  `@agentmou/contracts` catalog shapes before returning API responses.

Do not return raw manifests directly to product UIs unless the consumer is
explicitly manifest-aware.

## Lifecycle

1. Author or prototype the agent/workflow.
2. Commit the canonical manifest and any sanitized workflow JSON to Git.
3. Expose the asset through catalog mapping.
4. Install into a tenant, creating installation rows.
5. Provision runtime resources such as n8n workflow copies and schedules.
6. Connect tenant credentials or document an explicit runtime exception.
7. Execute, observe, approve, retry, and clean up from runtime systems.
8. Uninstall by deleting runtime resources before local rows.

## What Not To Do

- Do not commit tenant-specific workflow copies.
- Do not treat developer MCP configs as product runtime assets.
- Do not make n8n the source of truth for product behavior.
- Do not hide credential strategy exceptions in workflow JSON or tribal
  knowledge. Declare them in manifests and docs.
