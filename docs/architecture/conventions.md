# Codebase Conventions & Patterns

## Overview

This document standardizes naming, organization, and implementation patterns across the Agentmou monorepo. Consistency improves developer velocity, code reviews, and onboarding.

---

## Naming Conventions

### Files and Directories

**PascalCase for component files** (React, classes):
```
components/
├── UserCard.tsx
├── ApprovalDialog.tsx
└── InstallationForm.tsx
```

**kebab-case for modules** (utilities, services):
```
services/
├── auth-service.ts
├── connector-oauth.ts
└── run-logger.ts
```

**Index files** (always `index.ts`, never `_index` or custom names):
```
packages/agent-engine/src/
├── tools/
│   ├── tools.ts
│   └── index.ts        ← re-exports
├── planner/
│   ├── planner.ts
│   └── index.ts
```

**Test files** (colocated with source):
```
src/
├── planner.ts
├── planner.test.ts     ← Same directory, .test.ts suffix
```

**YAML catalog manifests** (lowercase, hyphenated ID):
```
catalog/agents/inbox-triage/manifest.yaml
catalog/agents/sales-pipeline-analyzer/manifest.yaml
```

---

### TypeScript Variables & Functions

**camelCase for variables, functions, and properties**:
```typescript
const userEmail = 'user@example.com';
const tenantId = 'tenant-123';
function parseExecutionPlan(raw: unknown) {}

interface User {
  userId: string;
  userName: string;
  createdAt: Date;
}
```

**PascalCase for classes, interfaces, and types**:
```typescript
class AgentEngine {}
interface ExecuteOptions {}
type PolicyEvaluation = { allowed: boolean };
```

**UPPER_SNAKE_CASE for constants**:
```typescript
const DEFAULT_TIMEOUT_MS = 30000;
const QUEUE_NAMES = {
  INSTALL_PACK: 'install-pack',
  RUN_AGENT: 'run-agent',
};
const MAX_BATCH_SIZE = 100;
```

**Prefix boolean variables with `is`, `has`, `can`, `should`**:
```typescript
const isRunning = true;
const hasApproval = false;
const canRetry = true;
const shouldWait = true;
```

**Prefix errors with `error` or `is` + error name**:
```typescript
const authError = new Error('Unauthorized');
const isAuthError = error instanceof AuthError;
```

---

### Database & Schema

**snake_case for database columns** (Drizzle/PostgreSQL convention):
```typescript
export const users = pgTable('users', {
  user_id: uuid('user_id').primaryKey(),        // Column: user_id
  email_address: text('email_address'),         // Column: email_address
  created_at: timestamp('created_at'),          // Column: created_at
  is_active: boolean('is_active'),              // Column: is_active
});
```

**However, TypeScript property names use camelCase** (via Drizzle mappings):
```typescript
// Usage in code
const user = {
  userId: row.user_id,      // ← camelCase in TS
  emailAddress: row.email_address,
  createdAt: row.created_at,
};
```

**Foreign keys end with `_id`**:
```typescript
tenant_id: uuid('tenant_id').references(() => tenants.id),
user_id: uuid('user_id').references(() => users.id),
```

**Boolean columns prefixed with `is_` or `has_`**:
```typescript
is_active: boolean('is_active'),
has_approval: boolean('has_approval'),
```

---

### API Endpoints

**Kebab-case for URL paths**:
```
GET /api/agent-installations/{id}
POST /api/approval-requests/{id}/decide
GET /api/connector-accounts
```

**Verb-based for actions**:
```
POST /api/installations/{id}/run              ← Trigger a run
POST /api/approvals/{id}/decide                ← Make a decision
DELETE /api/secrets/{id}                       ← Delete secret
```

**Use plural nouns for collections**:
```
GET /api/runs                                  ← List runs (not /run)
GET /api/agents                                ← List agents
POST /api/installations/{id}/runs              ← Sub-resource
```

**Version API (if needed) with header, not path**:
```
GET /api/runs
Accept-Version: 2.0  ← Not /api/v2/runs
```

---

### Enums & Union Types

**PascalCase for enum definitions**:
```typescript
enum ExecutionStatus {
  Running = 'running',
  Success = 'success',
  Failed = 'failed',
  PendingApproval = 'pending_approval',
}

enum RiskLevel {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
}
```

**String literals when enum not needed** (more flexible for JSON):
```typescript
type ToolType = 'tool_call' | 'condition' | 'loop';
type TriggerType = 'manual' | 'cron' | 'webhook' | 'api';
```

**Union types for discrim unions**:
```typescript
type PlanStep =
  | { type: 'tool_call'; toolName: string; toolInput?: unknown }
  | { type: 'condition'; condition: string }
  | { type: 'loop'; iterations: number };
```

---

## Import Patterns

### Workspace Imports (pnpm)

**Always use `@agentmou/` prefix** (defined in tsconfig):
```typescript
// ✓ Good
import { AgentEngine } from '@agentmou/agent-engine';
import { db, schema } from '@agentmou/db';
import { validateZod } from '@agentmou/contracts';

// ✗ Bad
import { AgentEngine } from '../../packages/agent-engine/src';
import { db } from '../../../packages/db/src';
```

**Benefits**:
- Works from any location in monorepo
- Symlinked in node_modules
- Tree-shakeable (direct imports)

### Import Organization

**Within a file, order as:**
1. Node.js built-ins
2. External packages
3. Workspace packages (@agentmou/*)
4. Local relative imports
5. Type imports (group at top)

**Example**:
```typescript
// 1. Node builtins
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

// 2. External packages
import { z } from 'zod';
import { eq } from 'drizzle-orm';

// 3. Workspace packages
import { AgentEngine } from '@agentmou/agent-engine';
import type { ExecuteOptions } from '@agentmou/agent-engine';
import { db, schema } from '@agentmou/db';

// 4. Local imports
import { policyConfig } from './policies';
import { createLogger } from './logging';

// 5. Types (after regular imports)
import type { Config } from '@agentmou/contracts';
```

### Index Files

**Use `export * as` for namespaced re-exports**:
```typescript
// packages/agent-engine/src/index.ts
export { AgentEngine } from './agent-engine';
export { Planner, type PlannerConfig } from './planner';
export { PolicyEngine, type PolicyRule } from './policies';
export { Toolkit, type Tool } from './tools';
```

**Never export defaults** (ambiguous, breaks tree-shaking):
```typescript
// ✓ Good
export { AgentEngine };

// ✗ Bad
export default AgentEngine;
```

---

## Data Modeling Patterns

### Zod as Source of Truth

**Define Zod schemas first; derive types from them**:
```typescript
// contracts/src/execution.ts

// 1. Zod schema (source of truth, validates at runtime)
export const ExecuteOptionsSchema = z.object({
  runId: z.string().uuid(),
  tenantId: z.string().uuid(),
  templateId: z.string(),
  systemPrompt: z.string(),
  input: z.unknown().optional(),
  policyConfig: AgentPolicyconfigSchema.optional(),
});

// 2. TypeScript type (derived from Zod)
export type ExecuteOptions = z.infer<typeof ExecuteOptionsSchema>;

// 3. Use both in code
function validate(data: unknown): ExecuteOptions {
  return ExecuteOptionsSchema.parse(data);  // Runtime validation
}

async function execute(options: ExecuteOptions) {
  // TypeScript compile-time safety
}
```

**Benefits**:
- Single source of truth
- Runtime validation (API inputs, queue payloads)
- Compile-time type safety
- Clear contract definitions

### Drizzle Schema

**Define schema once; use type inference**:
```typescript
// packages/db/src/schema.ts
export const executionRuns = pgTable('execution_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  status: text('status').notNull().default('running'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
});

// Type inference (don't define separate interface)
export type ExecutionRun = typeof executionRuns.$inferSelect;
export type NewExecutionRun = typeof executionRuns.$inferInsert;
```

**Usage**:
```typescript
const run: ExecutionRun = await db
  .select()
  .from(executionRuns)
  .where(eq(executionRuns.id, runId))
  .then(rows => rows[0]);
```

---

## Error Handling Patterns

### Custom Error Classes

**Extend Error with context**:
```typescript
export class PolicyViolationError extends Error {
  constructor(
    public action: string,
    public reason: string,
    public riskLevel?: 'low' | 'medium' | 'high'
  ) {
    super(`Policy violation: ${action} - ${reason}`);
    this.name = 'PolicyViolationError';
  }
}

// Usage
if (!evaluation.allowed) {
  throw new PolicyViolationError(
    action,
    evaluation.reason,
    evaluation.riskLevel
  );
}
```

### Typed Error Handling

**Use discriminated unions for error types**:
```typescript
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: AppError };

type AppError =
  | { type: 'auth'; code: 'unauthorized' | 'forbidden' }
  | { type: 'validation'; field: string; message: string }
  | { type: 'external'; service: string; statusCode: number }
  | { type: 'internal'; message: string };

// Usage
const result = await execute(options);
if (!result.ok) {
  if (result.error.type === 'auth') {
    // Handle auth error
  } else if (result.error.type === 'validation') {
    // Handle validation error
  }
}
```

### Async Error Handling

**Always wrap async in try-catch; use typed errors**:
```typescript
async function safeExecute(options: ExecuteOptions): Promise<AgentExecutionResult> {
  try {
    const result = await engine.execute(options);
    return result;
  } catch (error) {
    logger.error('Agent execution failed', {
      runId: options.runId,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      runId: options.runId,
      error: error instanceof Error ? error.message : 'Unknown error',
      output: null,
      duration: 0,
      stepsCompleted: 0,
    };
  }
}
```

---

## Typing Guardrails

### Strict Mode Enabled

All TypeScript configs have strict mode enabled:
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### No `any` Type

**Never use `any`** (use `unknown` instead if truly dynamic):
```typescript
// ✗ Bad
function process(data: any) {
  return data.field;  // Unsafe!
}

// ✓ Good
function process(data: unknown) {
  if (typeof data === 'object' && data !== null && 'field' in data) {
    return data.field;
  }
  throw new Error('Invalid data shape');
}
```

### Generic Constraints

**Use generics with constraints for reusable code**:
```typescript
// ✓ Good: Constrained generic
function getValue<T extends Record<string, unknown>>(obj: T, key: keyof T): unknown {
  return obj[key];
}

// ✓ Usage type-safe
const user = { name: 'Alice', age: 30 };
const name = getValue(user, 'name');  // ✓ Valid
// getValue(user, 'invalid');  // ✗ Compile error
```

---

## Package Boundary Rules

### What Goes Where?

| Package | Purpose | Examples |
|---------|---------|----------|
| **contracts** | Shared types & schemas | Zod types, API contracts, execution models |
| **db** | Database schema & queries | Drizzle schema, migrations, seeders |
| **queue** | Job definitions & payloads | BullMQ queue names, typed payloads |
| **auth** | Authentication & JWT | Token generation, verification, JWKS |
| **connectors** | External system integrations | Gmail OAuth, Gmail API client |
| **agent-engine** | Runtime for agents | Planner, PolicyEngine, Toolkit |
| **n8n-client** | n8n HTTP adapter | Workflow dispatch, credential sync |
| **catalog-sdk** | Catalog loading & validation | Manifest parsing, template resolution |
| **observability** | Logging & metrics | Pino logger, tracing |

### Dependency Direction

**Allowed**:
- services → packages (e.g., API uses @agentmou/db)
- packages → other packages (e.g., agent-engine uses @agentmou/db)
- contracts ← any (universal)

**Forbidden**:
- packages → services (circular dependency)
- services → apps (frontend is UI, not backend dependency)

**Visualized**:
```
apps/web ──→ services/api ──→ packages/*
             ↓
             services/worker ──→ packages/*
             ↓
             services/agents (Python, separate process)
```

---

## Testing Patterns

### Test Structure

**Colocate tests with source** (same directory, `.test.ts` suffix):
```
packages/agent-engine/src/
├── planner.ts
├── planner.test.ts     ← Test in same directory
├── policies.ts
├── policies.test.ts
```

### Test Organization

**Describe → It pattern**:
```typescript
describe('Planner', () => {
  describe('createPlan', () => {
    it('should generate a plan with valid steps', async () => {
      const planner = new Planner({ openaiApiKey: 'test' });
      const plan = await planner.createPlan('...', { input: {} });

      expect(plan.steps).toHaveLength(3);
      expect(plan.steps[0].type).toBe('tool_call');
    });

    it('should fail if openai api is unavailable', async () => {
      const planner = new Planner({ openaiApiKey: 'invalid' });

      await expect(planner.createPlan(...)).rejects.toThrow();
    });
  });
});
```

### Fixtures & Mocks

**Use factory functions for test data**:
```typescript
// __fixtures__/execution.ts
export function createMockExecuteOptions(overrides?: Partial<ExecuteOptions>): ExecuteOptions {
  return {
    runId: 'run-123',
    tenantId: 'tenant-123',
    templateId: 'test-agent',
    systemPrompt: 'You are a test agent',
    ...overrides,
  };
}

// test
const options = createMockExecuteOptions({ templateId: 'custom' });
```

---

## Logging Patterns

### Structured Logging (Pino)

**Use structured logs with context** (avoid string concatenation):
```typescript
// ✓ Good: Structured
logger.info('Agent execution started', {
  runId,
  tenantId,
  agentId: templateId,
  timestamp: new Date().toISOString(),
});

// ✗ Bad: String concatenation
logger.info(`Agent ${templateId} started for tenant ${tenantId}`);
```

### Log Levels

| Level | When | Example |
|-------|------|---------|
| **debug** | Internal details, verbose | Policy evaluation result, plan steps |
| **info** | Important events | Agent started, step completed |
| **warn** | Recoverable issues | Retry attempt, quota approaching |
| **error** | Failures, exceptions | Policy violation, API timeout |

**Example**:
```typescript
logger.debug('Policy evaluated', { action, allowed, reason });
logger.info('Run completed', { runId, status: 'success', duration: 1250 });
logger.warn('Retry attempt', { runId, attempt: 2, nextBackoff: 5000 });
logger.error('Tool execution failed', { stepId, toolName, error: err.message });
```

---

## Code Style

### Formatting

**Use Biome** (configured in `biome.json`):
```bash
pnpm format              # Auto-format all files
pnpm lint               # Check for issues
```

**Key rules**:
- 2-space indentation
- Single quotes for strings
- Trailing commas in multiline objects/arrays
- No semicolons (implicit ASI)

### Comments

**Document WHY, not WHAT** (code should be clear enough for WHAT):
```typescript
// ✓ Good: Explains the why
// Exponential backoff prevents overwhelming the API when it's under load
const backoff = Math.min(1000 * Math.pow(2, attempt), 30000);

// ✗ Bad: Just repeats the code
// Multiply 1000 by 2 to the power of attempt, max 30000
const backoff = Math.min(1000 * Math.pow(2, attempt), 30000);
```

**Use JSDoc for public APIs**:
```typescript
/**
 * Execute an agent run end-to-end.
 *
 * @param options - Execution parameters including run ID, tenant, template
 * @returns Result with success status, output, metrics
 * @throws {PolicyViolationError} if policy blocks the execution
 *
 * @example
 * ```typescript
 * const result = await engine.execute({
 *   runId: 'run-123',
 *   tenantId: 'tenant-abc',
 *   templateId: 'inbox-triage',
 * });
 * ```
 */
async execute(options: ExecuteOptions): Promise<AgentExecutionResult>
```

---

## Performance Patterns

### Avoid N+1 Queries

**Load related data in single query**:
```typescript
// ✗ Bad: N+1 queries
const runs = await db.select().from(executionRuns);
for (const run of runs) {
  const steps = await db.select().from(executionSteps).where(eq(executionSteps.runId, run.id));
  // ... process
}

// ✓ Good: Single query with join
const runsWithSteps = await db
  .select()
  .from(executionRuns)
  .leftJoin(executionSteps, eq(executionRuns.id, executionSteps.runId));
```

### Batch Operations

**Use batch inserts for multiple records**:
```typescript
// ✗ Bad: Multiple inserts
for (const step of steps) {
  await db.insert(executionSteps).values(step);
}

// ✓ Good: Batch insert
await db.insert(executionSteps).values(steps);
```

---

## Related Documentation

- **[Architecture Overview](./overview.md)**: System design principles
- **[Data Model](./data-model.md)**: Schema patterns
- **[Agent Engine](./agent-engine.md)**: Component responsibilities
- **[Repository Map](../repo-map.md)**: Directory structure
