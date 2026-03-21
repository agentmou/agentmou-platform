# Repo Skills

This repository contains repo-local skills for Codex and adjacent AI coding
tools.

## Available Repo Skills

- `repo-documenter`
  - Map the repository, explain architecture, and improve docs.
- `frontend-product-design`
  - Refine UI and frontend polish with product-design guidance.
- `n8n-workflow-builder`
  - Default entry skill for natural-language n8n workflow creation, debugging,
    and promotion in AgentMou.
- `n8n-mcp-tools-expert`
  - Use the `n8n-mcp` toolset effectively for discovery, editing, and
    validation.
- `n8n-workflow-patterns`
  - Choose the right workflow architecture pattern before building.
- `n8n-validation-expert`
  - Fix n8n validation errors and interpret warnings or false positives.
- `n8n-expression-syntax`
  - Write and debug n8n expressions safely.
- `n8n-node-configuration`
  - Configure nodes operation-by-operation with the right required fields.

## n8n Bundle Purpose

The n8n skill bundle exists to make natural-language workflow authoring much
more reliable when using the existing `n8n-mcp` server from
`/.cursor/mcp.json`.

The intended default flow is:

1. Prototype in n8n through MCP.
2. Iterate with validation until the workflow is stable.
3. Promote to Git only when the workflow should become a real AgentMou asset.

## AgentMou-Specific Guardrails

- Git is the canonical source of versioned workflow definitions.
- Do not commit one workflow JSON per tenant.
- Do not embed tenant secrets or credential values in workflow JSON.
- Treat n8n as runtime infrastructure, not the product control plane.
- Prefer deterministic workflows in n8n. If the task is truly agentic, use the
  hybrid pattern documented in `docs/template-library.md`.

## Related Docs

- [Template Library](../docs/template-library.md)
- [Workflow Authoring and Promotion](../docs/runbooks/workflow-authoring-and-promotion.md)
- [AI Surfaces](../docs/architecture/ai-surfaces.md)
- [n8n Adapted Attribution](./n8n-adapted-attribution.md)

## Tooling Notes

- Codex reads repo-local skill instructions through `AGENTS.md`.
- Cursor gets a parallel guardrail from
  `/.cursor/rules/n8n-workflow-authoring.mdc`.
- After adding or updating skills, reload Codex and Cursor so they pick up the
  new files.
