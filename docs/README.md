# Documentation Hub

Use this directory as the canonical entrypoint for repository documentation.
The docs below are organized so newcomers can find one source of truth per
topic instead of bouncing between architecture notes, planning artifacts, and
historical logs.

## Start Here

- [Onboarding](./onboarding.md) for the recommended reading order, local setup,
  and first-day workflow.
- [Architecture Overview](./architecture/overview.md) for the short map of the
  system and the most important supporting docs.
- [AI Surfaces](./architecture/ai-surfaces.md) for the boundary between
  developer agents, product agents, workflows, and runtime ownership.
- [Catalog, demo, and marketing](./catalog-and-demo.md) for operational vs
  demo inventory, marketing featured cards, and ID sync.
- [Template Library](./template-library.md) for reference skeletons that show
  how to start new agents, workflows, and hybrid assets without polluting the
  live catalog.
- [Repository Map](./repo-map.md) for the current workspace layout and runtime
  boundaries.
- [Testing Guide](./testing.md) for validation commands and where tests live.
- [Deployment Guide](./deployment.md) for the deployment entrypoint and links
  to detailed runbooks.
- [Troubleshooting Guide](./troubleshooting.md) for common failures and the
  first checks to run.

## Architecture

- [Current State](./architecture/current-state.md) is the code-verified
  architecture and operations snapshot.
- [Architecture Overview](./architecture/overview.md) is the short landing page
  for architecture readers.
- [AI Surfaces](./architecture/ai-surfaces.md) explains where workflows,
  product agents, developer agents, manifests, and runtime state belong.
- [Internal Ops Personal Operating System](./architecture/internal-ops-personal-os.md)
  documents the private Telegram/OpenClaw orchestration layer used to run
  AgentMou itself.
- [Web App Architecture](./architecture/apps-web.md) describes the current
  `apps/web` structure and constraints.
- [Engineering Conventions](./architecture/conventions.md) captures repo-wide
  implementation rules.
- [ADRs](./adr/) contains hard-to-reverse architectural decisions.

## Operations

- [Deployment Guide](./deployment.md) explains which procedure to use in local
  development versus on the VPS.
- [Runbooks](./runbooks/README.md) indexes detailed operational procedures.
- [Agent Authoring and Promotion](./runbooks/agent-authoring-and-promotion.md)
  explains how to promote a reference skeleton into a real product-agent
  template.
- [Internal Ops Operations](./runbooks/internal-ops-operations.md) explains how
  to run the private Telegram/OpenClaw operating system and how it reuses the
  main worker and optional tenant substrate.
- [OpenClaw Runtime Operations](./runbooks/openclaw-runtime-operations.md)
  explains how to deploy and verify the separate reasoning-runtime VPS.
- [Workflow Authoring and Promotion](./runbooks/workflow-authoring-and-promotion.md)
  explains how to promote a sanitized n8n workflow template into a real asset.
- [Infrastructure Overview](../infra/README.md) explains the files under
  `infra/` and where to make production changes.

## Planning

- [Roadmap](./planning/roadmap.md) is the only planning document that stays in
  the main navigation.
