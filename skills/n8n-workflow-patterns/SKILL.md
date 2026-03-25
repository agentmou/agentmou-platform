---
name: n8n-workflow-patterns
description: AgentMou-adapted workflow architecture patterns for n8n. Use when choosing how to structure a workflow, selecting between webhook, API, scheduled, or hybrid patterns, or deciding whether n8n is the right runtime at all.
---

# n8n Workflow Patterns

Use this skill when the challenge is architectural rather than purely
configurational.

## Preferred Pattern Set For AgentMou

### 1. Webhook Or Event Processing

Use when the workflow reacts to inbound events or external system callbacks.

Typical shape:

```text
Trigger -> Validate -> Transform -> Action -> Notify/Respond
```

### 2. HTTP/API Integration

Use when the workflow fetches from or writes to external APIs.

Typical shape:

```text
Trigger -> HTTP Request -> Transform -> Action -> Error Handling
```

### 3. Scheduled Task

Use when the workflow runs periodically.

Typical shape:

```text
Schedule -> Fetch -> Process -> Deliver -> Log
```

### 4. Deterministic Internal Orchestration

Use when the steps are known ahead of time and should remain stable across
tenant installs.

This is the default pattern for installable n8n workflows in AgentMou.

### 5. Hybrid Agent -> Workflow Handoff

Use when the decision is dynamic but the execution path should still be
deterministic.

In AgentMou this usually means:

- an installable product agent decides
- a linked n8n workflow executes the fixed operational steps

See `templates/agent-workflow-hybrid/`.

## Pattern Selection Rules

- If the path is known and repeatable, use n8n.
- If the next step depends on reasoning, use a product agent or hybrid pattern.
- Do not default to n8n AI-agent nodes for product-agent behavior in this repo.
  They can be acceptable for isolated prototypes, but they are not the default
  AgentMou product-runtime model.

## Common Workflow Building Blocks

- triggers: webhook, event, schedule, manual
- sources: HTTP requests, service nodes, databases
- transforms: Set, IF, Switch, Code, Merge
- outputs: API calls, notifications, storage, service actions
- error handling: Continue On Fail, explicit branches, dedicated fallback paths

## Promotion Boundary

If the resulting workflow should become a real AgentMou asset, promote it only
after the pattern and runtime shape are stable.

Use:

- `docs/runbooks/workflow-authoring-and-promotion.md`
- `docs/template-library.md`

## Related References

- `references/pattern-selection.md`
