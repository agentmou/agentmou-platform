---
name: n8n-workflow-builder
description: Default AgentMou entry skill for creating, updating, debugging, and promoting n8n workflows from natural language. Use when the user wants an n8n workflow built or fixed and the existing n8n MCP connection should be the first tool path.
---

# n8n Workflow Builder

Use this as the default front door for n8n workflow work in AgentMou.

## Goal

Turn a natural-language workflow request into the best next action:

- prototype in n8n via MCP
- refine node choices and configuration
- validate iteratively
- promote to Git only when the workflow should become a real AgentMou asset

## Default Workflow

### 1. Start In MCP, Not In JSON

When the user asks to build or change a workflow, prefer the existing
`n8n-mcp` connection first.

Do **not** start by hand-authoring `workflow.json` unless:

- MCP is blocked or unavailable
- the user explicitly wants a repo-side template draft
- you are documenting the final promoted asset after the prototype is stable

### 2. Choose The Right Pattern

Before building, classify the request:

- webhook/event processing
- HTTP/API integration
- scheduled task
- deterministic operational workflow
- hybrid agent-plus-workflow pattern

Use `$n8n-workflow-patterns` when the architecture is not obvious.

### 3. Discover Before Configuring

Prefer this order:

1. search for the right nodes
2. inspect the node and its operations
3. configure the node minimally
4. validate
5. iterate

Use `$n8n-mcp-tools-expert` and `$n8n-node-configuration` when you need deeper
help with tool choice or operation-aware fields.

### 4. Validate Early And Often

Treat validation as iterative, not one-shot.

Use `$n8n-validation-expert` when:

- node validation fails
- workflow validation fails
- a warning looks suspicious
- MCP returns a false positive or confusing operator error

### 5. Use Expressions Deliberately

Use `$n8n-expression-syntax` when the workflow needs dynamic field references,
webhook payload access, or cross-node expressions.

### 6. Promote Only On Purpose

If the user wants the workflow versioned in AgentMou:

1. export the stable workflow from n8n
2. sanitize the JSON
3. place it under `workflows/public/<id>/`
4. add or update `manifest.yaml`
5. document runtime ownership and credential strategy

Follow:

- `docs/runbooks/workflow-authoring-and-promotion.md`
- `docs/template-library.md`

## AgentMou Rules

- Git is the canonical source of workflow definitions.
- Do not commit tenant-specific workflow copies.
- Do not commit tenant secrets or live credential values.
- Prefer deterministic workflows in n8n.
- If the problem is primarily agentic, use the hybrid pattern from
  `templates/agent-workflow-hybrid/` instead of forcing everything into n8n.

## When To Stay In n8n Only

It is acceptable to stop at an n8n prototype if the user only wants a working
runtime flow and has not asked to version it in the repo.

## Related Skills

- `$n8n-mcp-tools-expert`
- `$n8n-workflow-patterns`
- `$n8n-validation-expert`
- `$n8n-expression-syntax`
- `$n8n-node-configuration`
