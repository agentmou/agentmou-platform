---
name: n8n-mcp-tools-expert
description: AgentMou-adapted guide for using n8n MCP tools effectively. Use when choosing the right MCP tool, searching for nodes, inspecting node details, validating configurations, or iterating on workflows inside n8n.
---

# n8n MCP Tools Expert

Use this skill when the main problem is _how_ to use the MCP toolset well.

## Operating Model

The normal path is:

1. discover the right node
2. inspect its operations and fields
3. configure the node minimally
4. validate it
5. create or update the workflow
6. validate the workflow again

## Recommended Tool Order

### Node Discovery

Use the MCP search and inspection tools before configuring:

1. search for the node by capability or keyword
2. inspect the chosen node with standard detail
3. only request deeper detail when standard detail is insufficient

Typical path:

```text
search_nodes -> get_node -> validate_node
```

### Workflow Editing

When a workflow already exists in n8n, prefer incremental updates over full
rebuilds.

Typical path:

```text
create workflow once -> update partially -> validate workflow
```

### Validation

Validate early with minimal checks, then use runtime-level validation before
calling the workflow complete.

## Node Type Guardrail

`n8n-mcp` commonly uses different node type formats for discovery/validation vs
workflow editing.

If you hit a “node not found” or schema mismatch problem, inspect the MCP tool
docs or the tool response carefully instead of assuming the same `nodeType`
format works everywhere.

## Detail-Level Guardrail

Default to the lighter node-inspection mode first.

Only request full schema detail when:

- the operation-specific fields are still unclear
- nested field visibility is blocking progress
- validation errors point to fields not visible in the standard response

## AgentMou Rules

- Keep the prototype in n8n until the workflow shape is stable.
- Do not convert a rough prototype straight into repo-tracked `workflow.json`.
- If the user wants versioning, switch to the promotion flow in
  `docs/runbooks/workflow-authoring-and-promotion.md`.
- Keep n8n as runtime infrastructure, not source of truth.

## Related References

- `references/mcp-tooling-reference.md`
- `docs/runbooks/workflow-authoring-and-promotion.md`
