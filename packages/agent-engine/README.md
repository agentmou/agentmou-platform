# @agentmou/agent-engine

Runtime engine for planning, governing, and executing Agentmou agent runs.

## Purpose

`@agentmou/agent-engine` packages the control logic required to execute an
installed agent end-to-end. It owns plan creation, policy evaluation, tool
execution, approval coordination, workflow dispatch scaffolding, in-memory
memory primitives, and run logging.

## How It Fits Into The System

The worker imports this package when it handles `run-agent` jobs. At runtime it
connects several other workspaces:
- `@agentmou/connectors` provides tenant-specific connector instances.
- `@agentmou/db` is used by `RunLogger` to persist steps and run metrics.
- `@agentmou/observability` can be layered on top of the execution flow.
- The Python agents service is called indirectly by the built-in
  `analyze-email` tool.

## Usage

```typescript
import { AgentEngine } from '@agentmou/agent-engine';

const engine = new AgentEngine({
  openaiApiKey: process.env.OPENAI_API_KEY,
  agentsApiUrl: process.env.AGENTS_API_URL,
  agentsApiKey: process.env.AGENTS_API_KEY,
});

const result = await engine.execute({
  runId: 'run_123',
  tenantId: 'tenant_123',
  templateId: 'inbox-triage',
  systemPrompt: 'Process unread inbox messages safely.',
  input: { source: 'gmail' },
});
```

## Key Exports

| Export | Purpose |
| --- | --- |
| `AgentEngine` | High-level runtime that orchestrates the whole execution flow |
| `Planner` | Creates structured execution plans, optionally via OpenAI |
| `PolicyEngine` | Enforces permission and approval rules from `policy.yaml` |
| `Toolkit` and `builtinTools` | Registers and executes tools such as `gmail-read`, `gmail-label`, and `analyze-email` |
| `RunLogger` | Persists step- and run-level execution data |
| `ApprovalGateManager` | Manages approval requests and response tracking |
| `WorkflowDispatcher` | Scaffold for deterministic workflow execution |
| `TemplatesManager` | Stores and renders reusable agent prompt templates |
| `MemoryManager` | Stores short-term and long-term execution memory primitives |

## Execution Model

A typical `AgentEngine.execute()` run does this:
1. Load the policy config for the agent.
2. Build or fall back to an execution plan.
3. For each plan step, check policy and then execute the tool if allowed.
4. Persist step and run progress through `RunLogger`.
5. Return aggregated output, timing, and token/cost metadata.

## Configuration

Important environment variables used directly or by built-in tools:

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Enables LLM-backed planning via `Planner` |
| `AGENTS_API_URL` | Base URL for the Python agents service used by `analyze-email` |
| `AGENTS_API_KEY` | Optional auth key for the Python agents service |

## Development

```bash
pnpm --filter @agentmou/agent-engine typecheck
pnpm --filter @agentmou/agent-engine lint
pnpm --filter @agentmou/agent-engine test
```

## Related Docs

- [Architecture Overview](../../docs/architecture/overview.md)
- [ADR-003: n8n Role](../../docs/adr/003-n8n-role.md)
