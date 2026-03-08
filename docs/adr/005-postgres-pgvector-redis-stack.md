# ADR-005 — Postgres + pgvector + Redis Stack

**Status**: accepted
**Date**: 2026-03-08

## Context

The platform needs persistent storage for domain data, a vector store for
future knowledge/memory retrieval, and a queue/cache layer for job
processing and rate limiting.

## Decision

- **PostgreSQL 16** is the primary database and source of truth for all
  domain data (tenants, installations, runs, approvals, audit, usage).
- **pgvector** (Postgres extension) is the initial vector store for
  knowledge base embeddings and agent memory retrieval. This avoids
  introducing a separate vector database at this stage.
- **Redis 7** provides:
  - Job queues via BullMQ.
  - Distributed locks.
  - Rate limiting.
  - Short-lived caches.

## Alternatives Considered

1. **Qdrant or Pinecone for vectors**: rejected for now — pgvector is
   sufficient for initial RAG and avoids operational overhead.
2. **RabbitMQ instead of Redis/BullMQ**: rejected because Redis serves
   multiple purposes (queue + cache + locks) and BullMQ has excellent
   TypeScript support.
3. **Separate vector DB from day one**: rejected — premature optimization.
   Can be migrated later if pgvector becomes a bottleneck.

## Consequences

- Drizzle ORM is used for all Postgres access (`@agentmou/db`).
- BullMQ is used for all job processing (`services/worker`).
- pgvector extension will be enabled when knowledge/memory features are
  implemented (Phase 3).
- The Docker Compose stack includes Postgres and Redis as required services.
- Object storage (R2/B2/S3) will be added later for documents and
  attachments.
