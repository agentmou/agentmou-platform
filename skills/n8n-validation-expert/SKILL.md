---
name: n8n-validation-expert
description: AgentMou-adapted guide for interpreting and fixing n8n validation errors. Use when validation fails, warnings are confusing, operator structures look wrong, or the workflow needs iterative cleanup before it is considered stable.
---

# n8n Validation Expert

Use this skill when validation feedback becomes the main blocker.

## Validation Philosophy

Validation is iterative:

1. configure
2. validate
3. read the error carefully
4. fix one class of issue at a time
5. validate again

Do not expect a complex workflow to validate cleanly on the first pass.

## Severity Model

### Errors

Treat these as blocking:

- missing required fields
- invalid values
- type mismatches
- broken references
- invalid expressions

### Warnings

Treat these as review items:

- best-practice warnings
- deprecated configuration
- performance concerns

### Suggestions

Treat these as optional improvements unless they expose a real runtime risk.

## Typical Fix Loop

- validate a node with a realistic profile
- fix the smallest set of blocking issues
- revalidate before changing anything else
- validate the full workflow after node-level fixes

## AgentMou Guardrail

Passing n8n validation is necessary but not sufficient for promotion into Git.

A workflow is only repo-ready when it is also:

- sanitized
- documented
- aligned with runtime metadata
- free of tenant-specific values

Follow `docs/runbooks/workflow-authoring-and-promotion.md` for that second
gate.

## When To Suspect A False Positive

Pause and inspect more closely when:

- the warning is about a tradeoff you intentionally chose
- MCP validation complains after auto-sanitization of operators or conditions
- a node appears valid in n8n but the MCP warning is advisory rather than
  blocking

## Related References

- `references/validation-loop.md`
