# n8n Workflow Skeleton

Use this skeleton when the path is deterministic and n8n should execute the
runtime copy for each tenant installation.

## Files

- `manifest.yaml` defines the operational metadata
- `workflow.json` is the sanitized n8n export shape to copy and refine

## Runtime Defaults

- `runtimeOwner: n8n`
- `credentialStrategy: platform_managed`
- `installStrategy: shared_n8n_per_installation`

If a real workflow still requires native n8n credentials, document the reason
and switch to `credentialStrategy: n8n_native_exception` only in the promoted
asset.

## How Skills Should Use This Template

1. Copy this directory out of `templates/`.
2. Replace `<workflow-id>`, names, connectors, tags, and endpoint placeholders.
3. Keep `workflow.json` sanitized: no tenant IDs, no real credentials, no
   environment-specific timestamps or archive fields.
4. Promote the finished files to `workflows/public/<id>/` only when the
   workflow is ready to be installable.

## Promotion Path

Follow [Workflow Authoring and Promotion](../../docs/runbooks/workflow-authoring-and-promotion.md)
before turning this reference into a real asset.
