# ADR-005: PostgreSQL with pgvector for Relational and Vector Storage, Redis for Queues and Caching

**Status**: accepted
**Date**: 2024-01-15

## Context

The platform needs:
- **Relational storage**: Users, tenants, installations, credentials, audit logs, workflow definitions
- **Vector storage**: Embeddings for semantic search and AI agent memory
- **Job queues**: Background task execution with reliability guarantees
- **Caching**: Session data, frequently accessed config, rate-limit counters

Multiple standalone services (MongoDB, Pinecone, RabbitMQ, Memcached) create operational overhead: more systems to deploy, monitor, backup, and secure. Each requires separate credentials and failover strategy.

A simpler approach uses fewer systems:
- PostgreSQL + pgvector for both relational and vector data
- Redis for queues (via BullMQ) and caching

This reduces operational burden while maintaining performance for the expected scale.

## Decision

**Single relational database**: PostgreSQL with pgvector extension for vector search.

PostgreSQL stores:
- Relational schema: tenants, users, installations, workflow definitions, credentials
- Vector embeddings: Agent memory, semantic search indexes, indexed content
- Audit logs and execution history

Vector queries via pgvector:
```sql
SELECT * FROM agent_memory
WHERE embedding <-> '[0.1, 0.2, ...]'::vector
ORDER BY embedding <-> '[0.1, 0.2, ...]'::vector
LIMIT 10;
```

**Job queues**: Redis + BullMQ for reliable background work.

BullMQ jobs:
- Agent execution
- Workflow provisioning/teardown
- Approval timeout handling
- Scheduled tasks and cron jobs

Jobs are stored in Redis with automatic retries, exponential backoff, and dead-letter queues.

**Caching**: Redis for session data, tokens, and rate-limit state.

```typescript
// Store session
await redis.setex('session:' + sessionId, 3600, JSON.stringify(user));

// Rate limit
await redis.incr('ratelimit:' + userId + ':' + minute);
```

## Alternatives Considered

1. **MongoDB** (relational) + **Pinecone** (vectors) + **RabbitMQ** (queues):
   - Pros: Best-in-class for each role
   - Cons: Three separate systems, three credential sets, no transactional guarantees across systems

2. **DynamoDB** + **RDS for vectors** + **SQS**:
   - Pros: Managed AWS services, no ops
   - Cons: Vendor lock-in, AWS-specific quirks, higher cost at scale, DynamoDB is less flexible for relational queries

3. **Elasticsearch** (relational + vectors) + **Kafka** (queues):
   - Pros: Elasticsearch supports both; Kafka is highly reliable
   - Cons: Elasticsearch is expensive and heavy; not optimal for relational queries

4. **Single-system vector DB** (Weaviate, Qdrant, Milvus):
   - Pros: Optimized for vectors
   - Cons: Weak at relational queries, requires separate databases for transactional data, adds complexity

## Consequences

- **Single source of truth**: PostgreSQL is the authoritative store for all data (relational, vector, and audit trail).
- **Vector operations on relational data**: Embeddings are columns in tables alongside relational data, simplifying JOINs and transactions.
- **pgvector performance**: Vector search is fast (using IVFFlat or HNSW indexes) but slower than specialized vector databases. Acceptable for the expected data volume.
- **Redis ephemeral**: Redis is not persistent (RDB snapshots are periodic). Loss of Redis does not corrupt data; queues are replayed from PostgreSQL job history.
- **BullMQ reliability**: Jobs are persisted in Redis with configurable TTL. Failed jobs retry with exponential backoff; dead-letter queues capture permanent failures.
- **Backup strategy**: PostgreSQL backups include all relational and vector data. Redis snapshots are optional (data can be reconstructed from queue logs).
- **Scaling**: PostgreSQL vertical scaling is simpler than horizontal (replication adds complexity); suitable for medium scale. Vector indexes may require periodic REINDEX.

This stack is simpler to deploy (Docker Compose with two services), easier to backup and recover, and sufficient for the platform's initial scale. Vector DB specialization can be added later if vector performance becomes a bottleneck.
