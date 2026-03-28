# Product Agent Skeleton

Use this skeleton when the model should decide the next step dynamically and
the installable runtime should live in `@agentmou/agent-engine`.

## Files

- `manifest.yaml` defines the operational manifest
- `prompt.md` defines runtime behavior
- `policy.yaml` defines permissions and review gates

## Runtime Defaults

- `runtimeOwner: agent_engine`
- `credentialStrategy: platform_managed`
- `installStrategy: platform_managed_installation`

## How Skills Should Use This Template

1. Copy this directory out of `templates/`.
2. Rename `<agent-id>`, display names, tags, connectors, and events.
3. Replace every `<...>` placeholder before promotion.
4. Add a real `README.md` in the promoted asset directory describing runtime
   ownership and dependencies.
5. Move the finished files to `catalog/agents/<id>/` only when the asset is
   ready to be installable.

## Promotion Path

Follow [Agent Authoring](../../docs/runbooks/agent-authoring.md)
before turning this reference into a real asset.
