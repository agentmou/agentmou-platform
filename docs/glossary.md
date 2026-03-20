# Glossary

## Terms

- Agent template
  - Versioned catalog asset that describes a reusable agent capability before a
    tenant installs it.
- Product agent
  - A tenant-installable runtime template executed by the platform, usually
    through `@agentmou/agent-engine`.
- Developer agent
  - A coding or repo-automation assistant such as Codex, Cursor, repo skills,
    or developer MCP tooling. This is not a tenant-facing runtime asset.
- Workflow template
  - Versioned n8n-backed workflow definition that can be installed for a
    tenant.
- Operational manifest
  - The repo-tracked definition used to validate, install, and reason about an
    agent, workflow, or pack before it is mapped to UI contracts.
- Pack
  - Bundled set of agents, workflows, and default configuration intended for a
    common use case.
- Installation
  - Tenant-scoped record created when a template is installed and configured.
- Control plane
  - The UI and API surfaces that manage tenants, catalog data, installations,
    connectors, and governance.
- Data plane
  - The worker, agent engine, and execution infrastructure that performs runs.
- Repo truth
  - The canonical versioned definition stored in Git.
- Runtime truth
  - The live state stored in installations, connectors, external workflow IDs,
    schedules, runs, approvals, and logs.
- HITL
  - Human in the loop; a gate that requires user approval before risky actions
    continue.
- Current State
  - The code-verified architecture and operations snapshot documented in
    `docs/architecture/current-state.md`.
