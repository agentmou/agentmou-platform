# MCP Tooling Reference

Use this quick reference when authoring workflows through `n8n-mcp`.

## Core Loop

1. Search for the right node.
2. Inspect the node with standard detail.
3. Configure the node minimally.
4. Validate the node.
5. Create or update the workflow.
6. Validate the full workflow.

## Practical Defaults

- Prefer search first, not guesswork.
- Prefer standard detail first, not maximum schema depth.
- Prefer partial updates when a workflow already exists.
- Prefer runtime-style validation before calling the workflow ready.

## Escalate To Other Skills

- Use `n8n-node-configuration` when the operation-specific field logic is
  unclear.
- Use `n8n-validation-expert` when validation errors become the main blocker.
- Use `n8n-expression-syntax` when the issue is really about expressions.

## AgentMou Promotion Boundary

MCP-driven workflow editing is for prototyping and refinement in n8n.

When the user wants the workflow versioned in the repo, switch to:

- `docs/runbooks/workflow-authoring-and-promotion.md`
- `docs/template-library.md`
