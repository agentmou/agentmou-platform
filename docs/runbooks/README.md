# Runbooks

Runbooks are the detailed operational procedures for the repository. Start
here, then open the procedure that matches the task you need to perform.

## Available Runbooks

- [Agent Authoring and Promotion](./agent-authoring-and-promotion.md) for
  turning a reference product-agent skeleton into a canonical Git-tracked
  template and validating its tenant install path.
- [Deployment Runbook](./deployment.md) for local stack setup, VPS deploys,
  health verification, fixture cleanup, and provider-backed secret rotation.
- [Workflow Authoring and Promotion](./workflow-authoring-and-promotion.md) for
  turning an n8n prototype into a canonical Git-tracked workflow template and
  validating its tenant install path.
- [VPS Operations](./vps-operations.md) for host-level operational knowledge
  and longer-lived production procedures.
- [Postgres Credential Rename](./postgres-rename-to-agentmou.md) for the
  destructive migration that renames the production Postgres user and
  database from `n8n` to `agentmou`.

## Runbook Rules

- Prefer the runbook over ad hoc terminal commands when production data or
  infrastructure is involved.
- Record any step that changes the safe operating procedure in the relevant
  runbook in the same PR.
- Link back to the [Deployment Guide](../deployment.md) when you need the
  top-level entrypoint.
