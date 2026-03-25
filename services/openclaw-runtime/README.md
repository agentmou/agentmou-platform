# @agentmou/openclaw-runtime

Remote reasoning runtime for the private AgentMou internal operating system.

## Purpose

`services/openclaw-runtime` is the deployable OpenClaw-compatible HTTP service
that powers `services/internal-ops`. It stores tenant agent registries, keeps
minimal remote session state, plans the next turn, and exposes trace retrieval
for auditability.

The service is meant to run on a separate VPS from the main AgentMou stack.
`services/internal-ops` remains the control plane and this service remains the
reasoning runtime.

## HTTP Surface

| Route                                                  | Purpose                                                   |
| ------------------------------------------------------ | --------------------------------------------------------- |
| `GET /health`                                          | Liveness check                                            |
| `POST /v1/internal-ops/agent-profiles/register`        | Store the latest internal org chart for a tenant          |
| `POST /v1/internal-ops/capabilities/register`          | Store the latest internal capability catalog for a tenant |
| `POST /v1/internal-ops/turns/start`                    | Start a new remote reasoning session                      |
| `POST /v1/internal-ops/turns/continue`                 | Continue an existing remote reasoning session             |
| `POST /v1/internal-ops/objectives/:objectiveId/cancel` | Cancel a remote session for an objective                  |
| `GET /v1/internal-ops/objectives/:objectiveId/trace`   | Fetch the stored trace for a remote session               |

## Configuration

| Variable             | Purpose                                                                             |
| -------------------- | ----------------------------------------------------------------------------------- |
| `OPENCLAW_API_KEY`   | Optional bearer token expected from `services/internal-ops`                         |
| `OPENAI_API_KEY`     | Enables model-backed turn planning; without it the runtime falls back to heuristics |
| `OPENCLAW_MODEL`     | Optional model name; defaults to `gpt-4o-mini`                                      |
| `OPENCLAW_STATE_DIR` | Local directory used to persist tenant registries and remote sessions               |
| `PORT`               | HTTP port; defaults to `3003`                                                       |
| `HOST`               | Bind host; defaults to `0.0.0.0`                                                    |
| `LOG_LEVEL`          | Fastify logger level                                                                |

## Local Usage

```bash
pnpm --filter @agentmou/openclaw-runtime dev
```

```bash
pnpm --filter @agentmou/openclaw-runtime build
pnpm --filter @agentmou/openclaw-runtime start
```

Health check:

```bash
curl http://localhost:3003/health
```

## Runtime Notes

- Session and trace state is persisted to `OPENCLAW_STATE_DIR`.
- If `OPENAI_API_KEY` is missing or the model response is invalid, the runtime
  falls back to a deterministic planner that still produces valid
  `OpenClawTurnResult` payloads.
- The service uses the shared schemas in
  `packages/contracts/src/internal-ops.ts` as the source of truth for the wire
  contract.
