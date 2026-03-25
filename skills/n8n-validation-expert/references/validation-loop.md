# Validation Loop

Use this loop whenever validation starts failing repeatedly.

## Loop

1. Validate the current node or workflow.
2. Fix blocking errors first.
3. Revalidate.
4. Re-check warnings.
5. Only then continue building.

## What To Fix First

- missing required properties
- invalid node references
- invalid expressions
- incompatible operation values

## What To Treat Carefully

- best-practice warnings
- performance suggestions
- advisory notes that do not block runtime execution

## AgentMou Reminder

Validation is about runtime correctness in n8n.

Promotion into Git has extra requirements:

- sanitized `workflow.json`
- runtime metadata in `manifest.yaml`
- documented credential strategy
- no tenant-specific values
