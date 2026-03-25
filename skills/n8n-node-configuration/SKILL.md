---
name: n8n-node-configuration
description: AgentMou-adapted operation-aware guidance for configuring n8n nodes. Use when required fields depend on the chosen operation, when property visibility changes dynamically, or when standard node detail is not enough to finish a node correctly.
---

# n8n Node Configuration

Use this skill when the challenge is operation-aware field configuration.

## Configuration Strategy

### 1. Start Minimal

Configure only the fields required for the chosen resource and operation first.

### 2. Respect Operation Dependencies

Required fields often change when you switch:

- resource
- operation
- method
- authentication mode
- optional toggles such as “send body”

### 3. Validate Between Steps

Do not fill every visible field at once. Configure a minimal valid version,
validate it, then add optional complexity.

## Recommended Discovery Flow

1. inspect the node with standard detail
2. choose the correct resource and operation
3. fill the required fields for that operation
4. validate
5. inspect deeper only if a hidden dependency is still unclear

## HTTP-Style Nodes

Be especially careful with:

- request method
- authentication mode
- body toggles
- headers vs query vs body fields

Changing one of these often reveals a second set of required properties.

## AgentMou Guardrail

Node configuration work is still prototype work until the workflow is stable in
n8n.

If the user wants the workflow versioned:

- export only after the node shapes are stable
- sanitize the workflow JSON
- follow the promotion runbook

## Related References

- `references/configuration-strategy.md`
