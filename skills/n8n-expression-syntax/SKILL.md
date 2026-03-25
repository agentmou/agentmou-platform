---
name: n8n-expression-syntax
description: AgentMou-adapted guide for writing correct n8n expressions. Use when building expressions with {{$json}}, {{$node}}, webhook payloads, environment variables, or when debugging invalid-expression errors in workflows.
---

# n8n Expression Syntax

Use this skill when the hard part is expression correctness, not general node
configuration.

## Core Rules

- Dynamic values use `{{ ... }}`.
- Cross-node references use `$node["Node Name"]`.
- Current-node values use `$json`.
- In webhook-triggered workflows, user payload data often lives under
  `$json.body`.

## Common Safe Patterns

### Current Node

```javascript
{
  {
    $json.email;
  }
}
{
  {
    $json.body.name;
  }
}
{
  {
    $json.user.id;
  }
}
```

### Other Nodes

```javascript
{
  {
    $node['HTTP Request'].json.data;
  }
}
{
  {
    $node['Webhook'].json.body.email;
  }
}
```

### Dates And Environment

```javascript
{
  {
    $now.toFormat('yyyy-MM-dd');
  }
}
{
  {
    $env.API_KEY;
  }
}
```

## Common Mistakes

- forgetting `{{ }}`
- using the wrong node name or wrong casing
- reading webhook fields from `$json` instead of `$json.body`
- using expression syntax inside places that expect static configuration or
  credentials

## Code Node Guardrail

Do not use n8n expression syntax inside Code nodes as if it were regular
parameter configuration.

Inside Code nodes, use the Code node APIs and direct JavaScript access instead.

## AgentMou Guardrail

When a workflow is meant for promotion into Git:

- keep expressions environment-agnostic where possible
- do not hardcode tenant-specific URLs, IDs, or secrets
- keep runtime credentials out of the exported JSON

## Related References

- `references/expression-cheatsheet.md`
