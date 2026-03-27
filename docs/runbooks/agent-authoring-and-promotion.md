# Agent Authoring and Promotion

Use this runbook when creating or updating an installable product-agent
template that should become a real Agentmou asset.

## Outcome

At the end of this procedure you should have:

- one canonical agent template committed to Git
- one `manifest.yaml` with explicit runtime and catalog metadata
- one `prompt.md` describing runtime behavior
- one `policy.yaml` describing permissions and safety controls
- optional workflow linkage when the agent hands work to deterministic n8n
  procedures
- at least one disposable-tenant validation run

## Operating Rules

- Git is the canonical source of agent definitions.
- Do not store tenant-specific installs, credentials, or HITL state in the
  repo.
- Default to `platform_managed` credentials through tenant connectors and
  platform services.
- Default to `runtimeOwner: agent_engine` for installable product agents.
- Treat `services/agents` as a narrow helper service unless the template truly
  depends on that runtime path and the README documents the reason.

## Inputs

You need:

- a target agent ID
- the intended triggers
- the list of required connectors
- the runtime owner and credential strategy
- at least one disposable validation tenant

## Procedure

### 1. Start From The Right Skeleton

Use one of these references as your starting point:

- `templates/product-agent-simple/`
- `templates/agent-workflow-hybrid/agent/` when the agent should dispatch a
  deterministic workflow companion

Copy the files out of `templates/` before editing them.

### 2. Author The Files

Create or update:

- `catalog/agents/<agent-id>/manifest.yaml`
- `catalog/agents/<agent-id>/prompt.md`
- `catalog/agents/<agent-id>/policy.yaml`
- `catalog/agents/<agent-id>/README.md`

The README should explain runtime ownership, credential strategy, and any
helper-service or workflow dependency.

### 3. Declare Runtime Metadata

In `manifest.yaml`, set the runtime section explicitly:

- `requiredConnectors`
- `credentialStrategy`
- `installStrategy`
- `runtimeOwner`
- `linkedWorkflows` when the agent coordinates deterministic workflow
  companions

For the current platform model:

- use `runtimeOwner: agent_engine` for installable product agents
- use `installStrategy: platform_managed_installation` for tenant installs

### 4. Declare Catalog Metadata

Populate the nested `catalog` block so the API can map the operational manifest
to the shared marketplace contract.

At minimum, define:

- outcome
- domain
- inputs
- outputs
- risk level
- HITL mode
- KPIs
- complexity
- release channel
- setup time estimate

### 5. Write The Prompt And Policy Deliberately

Keep `prompt.md` focused on agent behavior:

- role
- instructions
- output shape
- operating constraints

Keep `policy.yaml` focused on operational controls:

- permissions per integration
- rate limits
- confidence or review thresholds
- audit expectations

### 6. Link Workflows Instead Of Duplicating Logic

If the agent hands off work to a deterministic workflow:

- create or reference the workflow as its own repo-tracked asset
- point to it through `runtime.linkedWorkflows`
- document the contract in the agent README

Do not duplicate workflow JSON or tenant-specific workflow copies inside the
agent template.

### 7. Validate Locally

Run the relevant checks for manifest loading and agent runtime behavior:

```bash
pnpm --filter @agentmou/contracts test
pnpm --filter @agentmou/catalog-sdk test
pnpm --filter @agentmou/agent-engine test
pnpm --filter @agentmou/api test
```

Add or update tests if the new asset introduces mapping or runtime behavior
that is not already covered.

### 8. Install Into A Disposable Tenant

Validate the promotion path end to end:

1. install the agent through the platform
2. confirm one `agent_installations` row is created
3. confirm the installation points back to the template by `templateId`
4. trigger at least one run
5. inspect run status, logs, and any approval requests

### 9. Validate Cleanup

Uninstall the agent or use the guarded validation-fixture cleanup path.

Confirm:

- the installation row is removed only after any external cleanup completes
- related schedules are removed if present
- no tenant-specific credentials or runtime artifacts remain in Git

## Promotion Checklist

- `manifest.yaml` includes explicit runtime metadata
- `prompt.md` describes the actual runtime behavior
- `policy.yaml` declares real permissions and review gates
- `README.md` documents runtime ownership and dependencies
- no tenant-specific values were committed
- validation covered install, run, and cleanup

## Notes

- Treat Git as canonical even when the first prompt draft was created with a
  coding assistant.
- Prefer explicit workflow linkage over hidden orchestration.
- If the agent depends on a narrow helper service such as
  `services/agents`, document that dependency directly in the README.
