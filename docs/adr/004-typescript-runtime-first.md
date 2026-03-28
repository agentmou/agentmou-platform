# ADR-004: TypeScript as Primary Runtime, Python for Specialized Tasks

**Status**: accepted
**Date**: 2024-01-15

## Context

The platform has multiple runtime requirements:
- Web frontend: JavaScript/TypeScript is mandatory
- API and worker: Need fast, strongly-typed execution with good observability
- AI agents: May benefit from Python libraries (transformers, sklearn, spaCy)

The team has strong TypeScript expertise. Adding multiple runtimes increases deployment complexity, requires polyglot operational skills, and makes shared code harder.

A focused runtime strategy allows:
- Shared type definitions across frontend, API, and worker
- Consistent logging, error handling, and observability
- Simpler Docker images and CI/CD
- Fewer tool chains to maintain

## Decision

**TypeScript (Node.js) is the primary runtime** for all services except specialized AI tasks:
- `apps/web`: Next.js (TypeScript)
- `services/api`: Fastify (TypeScript)
- `services/worker`: BullMQ worker (TypeScript)

**Python is limited to the agents sidecar** (`services/agents`) for specialized AI workloads:
- Email analysis and feature extraction
- Advanced NLP processing
- Integration with Python-specific AI libraries (OpenAI SDK, LangChain, etc.)

The agents sidecar is:
- Isolated from the main platform
- Accessed via FastAPI REST endpoint from services/api and services/worker
- Deployed as a separate Docker image
- Does not share types or code with other services (communication is JSON over HTTP)

## Alternatives Considered

1. **Python-first across all services**:
   - Pros: Strong AI/ML ecosystem, batteries-included
   - Cons: Weak typing (without mypy discipline), slower, harder to match frontend types

2. **Go or Rust for API and worker**:
   - Pros: Performance, strong typing, concurrency
   - Cons: Steep learning curve, compilation overhead, unfamiliar to team, harder to integrate with n8n

3. **Polyglot (TypeScript + Python + Go)** across all services:
   - Pros: Use best tool for each job
   - Cons: Operational burden, multiple deployment pipelines, type mismatches at service boundaries

4. **All Python** (including frontend):
   - Pros: Unified runtime
   - Cons: Python is weak for web frontends; Pyodide/Transcrypt are immature

## Consequences

- **Shared types across web, API, and worker**: All TypeScript code imports from @agentmou/contracts. Frontend and backend are type-safe.
- **Single build toolchain**: All TypeScript builds use the same TypeScript config, ESLint rules, and Turbo tasks.
- **Node.js deployment**: API and worker run on Node.js; simple Docker Compose setup, no JVM or Python REPL overhead.
- **Python isolation**: The agents sidecar is a separate service. If it crashes, the main platform continues operating.
- **JSON boundaries**: Agent requests/responses cross service boundaries as JSON. Type safety is ensured by contracts, not language types.
- **AI library trade-offs**: The agents sidecar can use Python AI libraries (spaCy, OpenAI SDK, etc.) but cannot share internal types with TypeScript services.

Most features are implemented in TypeScript. Python is used sparingly for tasks that genuinely require Python libraries; email processing, deep NLP, and specialized agent logic are candidates.
