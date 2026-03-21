# Template Skeletons

This directory contains reference skeletons for new product agents and
workflows.

These files are intentionally outside `catalog/` and `workflows/` so the
platform does not treat them as installable assets.

## Available Skeletons

- `product-agent-simple/`
- `n8n-workflow-simple/`
- `agent-workflow-hybrid/`

## How To Use This Directory

1. Copy the matching skeleton out of `templates/`.
2. Rename IDs, names, connectors, and all placeholders.
3. Promote the finished asset to the real path only when it is ready:
   - `catalog/agents/<id>/`
   - `workflows/public/<id>/`
4. Validate it with the matching runbook under `docs/runbooks/`.

## Related Docs

- [Template Library](../docs/template-library.md)
- [Agent Authoring and Promotion](../docs/runbooks/agent-authoring-and-promotion.md)
- [Workflow Authoring and Promotion](../docs/runbooks/workflow-authoring-and-promotion.md)
