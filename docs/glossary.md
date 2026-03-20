# Glossary

## Terms

- Agent template
  - Versioned catalog asset that describes a reusable agent capability before a
    tenant installs it.
- Workflow template
  - Versioned n8n-backed workflow definition that can be installed for a
    tenant.
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
- HITL
  - Human in the loop; a gate that requires user approval before risky actions
    continue.
- Current State
  - The code-verified architecture and operations snapshot documented in
    `docs/architecture/current-state.md`.
