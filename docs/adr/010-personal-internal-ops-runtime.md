# 010 — Personal Internal Ops Runtime

**Status**: accepted
**Date**: 2026-03-25

## Context

AgentMou now includes a private multi-agent operating system for running the
company itself. This created several architectural questions that are hard to
reverse later:

- whether the internal operating system should live in a separate repository or
  in the main monorepo
- whether Telegram or a web admin UI should be the human operator surface
- whether OpenClaw should be embedded in-process or treated as a remote runtime
- whether the internal system should directly expose the full product execution
  surface or use curated bindings
- how `hc-coherence` artifacts should be stored relative to business-level
  delegation data

The internal system is intentionally personal and single-operator. It is not a
tenant-facing feature today.

## Decision

### Repository and service placement

The personal internal operating system lives in this monorepo as
`services/internal-ops`.

- It shares contracts, schema, queue infrastructure, approvals, and worker
  execution paths with the rest of the platform.
- It remains a separate bounded context with its own tables, docs, and
  service-level README.

### Human operator surface

Telegram is the only human operator interface.

- `POST /telegram/webhook` is the primary entrypoint.
- Inline approval buttons are the primary approval interface.
- Any internal callback route is a system-to-system resumption surface, not the
  human entrypoint.

### Reasoning/runtime boundary

OpenClaw is treated as a remote runtime and reached through a typed HTTP
adapter.

- The orchestrator owns persistence, governance, and objective state.
- OpenClaw owns turn planning and multi-agent reasoning.
- The monorepo does not need to embed the OpenClaw runtime process to remain
  the source of truth for the subsystem.

### Governance model

`hc-coherence` artifacts are stored separately from the internal business
envelope.

- The internal business contract uses
  `contract.system = "agentmou-internal-ops"`.
- Official coherence artifacts are stored in `internal_protocol_events` as raw
  cycle outputs tied to a real OpenClaw turn.

### Execution model

The internal operating system follows:

`OpenClaw decides -> internal-ops governs -> worker/API/n8n execute`

- `services/internal-ops` does not directly perform side effects.
- Worker-executable work orders are the contract for deterministic execution.
- Optional use of the main AgentMou tenant substrate is controlled through
  `internal_capability_bindings`.

### Product-surface boundary

The internal operating system is not a product catalog feature.

- It owns a private org chart and internal objectives.
- It may reuse installed product agents and workflows from the internal tenant.
- That reuse happens through curated capability bindings rather than by exposing
  the whole tenant surface to the internal org chart.

## Alternatives Considered

### Separate repository for the internal operating system

Rejected because it would duplicate contracts, schema knowledge, worker
handoffs, and operational context that already exist in this monorepo.

### Local in-process OpenClaw runtime

Rejected because it would blur the governance boundary and make deployment
coupling tighter than necessary for the current system shape.

### Web UI as the primary operator interface

Rejected because the intended operator behavior is lightweight conversational
control, approval handling, and proactive requests from Telegram.

### Expose the full AgentMou tenant surface directly

Rejected because the internal org chart needs bounded execution surfaces and
auditable capability routing, not implicit access to everything installed in the
tenant.

## Consequences

- `services/internal-ops` needs its own documentation, env-var guidance, and
  runbook.
- The worker must keep supporting the `internal-work-order` queue and Telegram
  delivery path.
- OpenClaw deployment is a separate operational concern even though its adapter
  lives in this repo.
- Internal capability bindings become the control point for reusing AgentMou's
  own tenant substrate.
- Docs must explicitly distinguish:
  - developer agents
  - tenant-facing product agents
  - internal operating-system agents
