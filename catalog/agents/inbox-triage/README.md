# Inbox Triage Agent

Automatically categorize, prioritize, and label incoming Gmail messages using the platform agent runtime.

## Runtime Shape

- The versioned definition lives in `catalog/agents/inbox-triage/`.
- Tenant installs create `agent_installations` rows that point back to this template by `templateId`.
- `services/worker` loads `prompt.md` and `policy.yaml`, then runs the template through `@agentmou/agent-engine`.
- `services/agents` is not the main runtime for this product agent. It is a narrow helper service currently used for the LLM-backed email classification step.

## Configuration

See `manifest.yaml` for the operational manifest, `prompt.md` for the runtime instructions, and `policy.yaml` for the permission model.

## Usage

The agent can run on a schedule or from event/webhook fan-out depending on the installation. The template in Git is canonical; tenant-specific state lives in installations, connectors, runs, approvals, and logs.

## Development

To validate the template locally:

```bash
pnpm --filter @agentmou/catalog-sdk test
pnpm --filter @agentmou/agent-engine test
```

## Notes

- This template defaults to `platform_managed` credentials through tenant connectors.
- Link any deterministic workflow companions through `runtime.linkedWorkflows` in the manifest instead of creating tenant-specific copies in Git.
