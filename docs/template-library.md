# Template Library

Use this guide when you need a repo-backed starting point for a new product
agent, n8n workflow, or hybrid agent-plus-workflow asset.

These templates are reference material, not installable assets.

## Why These Templates Live Outside `catalog/` And `workflows/`

- `catalog/agents/` and `workflows/` contain real operational assets.
- `services/api/src/modules/catalog` discovers those directories at runtime.
- `templates/` exists so humans and future skills can copy proven file shapes
  without accidentally publishing demo assets to the real catalog.

If you leave a reference skeleton under `catalog/` or `workflows/public/`, the
platform may treat it as a real asset.

## How To Choose A Template

| Use case                                                | Template                           | Runtime owner          |
| ------------------------------------------------------- | ---------------------------------- | ---------------------- |
| The model decides the next step dynamically             | `templates/product-agent-simple/`  | `agent_engine`         |
| The steps are deterministic and n8n should execute them | `templates/n8n-workflow-simple/`   | `n8n`                  |
| The agent decides, then hands a fixed procedure to n8n  | `templates/agent-workflow-hybrid/` | `agent_engine` + `n8n` |

## Placeholder Rules

The templates use two placeholder styles on purpose:

- Angle brackets such as `<agent-id>` or `<connector-name>`
- Marker values such as `REPLACE_ME_CHANNEL` or `RUNTIME_STUB`

Before promoting a template into a real asset, replace every placeholder and
re-read the matching runbook.

## Template Inventory

- [Product Agent Skeleton](../templates/product-agent-simple/README.md)
- [n8n Workflow Skeleton](../templates/n8n-workflow-simple/README.md)
- [Hybrid Agent + Workflow Skeleton](../templates/agent-workflow-hybrid/README.md)

## Required Files By Asset Type

### Product Agent

- `manifest.yaml`
- `prompt.md`
- `policy.yaml`
- `README.md`

### n8n Workflow

- `manifest.yaml`
- `workflow.json`
- `README.md`

### Hybrid Reference

- `agent/manifest.yaml`
- `agent/prompt.md`
- `agent/policy.yaml`
- `workflow/manifest.yaml`
- `workflow/workflow.json`
- root `README.md` describing the contract between both halves

## Runtime Defaults

Use these defaults unless you have a documented reason not to:

| Asset type      | `credentialStrategy` | `installStrategy`               | `runtimeOwner` |
| --------------- | -------------------- | ------------------------------- | -------------- |
| Product agent   | `platform_managed`   | `platform_managed_installation` | `agent_engine` |
| n8n workflow    | `platform_managed`   | `shared_n8n_per_installation`   | `n8n`          |
| Hybrid agent    | `platform_managed`   | `platform_managed_installation` | `agent_engine` |
| Hybrid workflow | `platform_managed`   | `shared_n8n_per_installation`   | `n8n`          |

Document exceptions explicitly. The current main exception class is
`n8n_native_exception` for workflows whose nodes still require native n8n
credentials at runtime.

## Promotion Path

1. Copy the matching skeleton out of `templates/`.
2. Rename IDs, names, connectors, and other placeholders.
3. Add real catalog metadata and runtime metadata.
4. Promote the finished asset to the real location:
   - agent: `catalog/agents/<id>/`
   - workflow: `workflows/public/<id>/`
5. Validate the asset with the corresponding runbook.

## Matching Runbooks

- [Agent Authoring and Promotion](./runbooks/agent-authoring-and-promotion.md)
- [Workflow Authoring and Promotion](./runbooks/workflow-authoring-and-promotion.md)
- [AI Surfaces](./architecture/ai-surfaces.md) for repo-truth vs runtime-truth
  boundaries

## What Not To Do

- Do not edit the reference templates in place and then assume they became real
  assets.
- Do not commit tenant-specific workflow copies.
- Do not embed tenant credentials in example manifests or workflow JSON.
- Do not treat `services/agents` as the default runtime for installable product
  agents. The default runtime is `@agentmou/agent-engine`.
