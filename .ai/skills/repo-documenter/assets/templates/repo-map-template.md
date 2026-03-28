# Repository Map

A guided tour of the codebase. Find code, understand responsibility, see how components relate.

**Last updated:** [DATE]

## Overview

[What does this repo do? One sentence. Then one paragraph explaining the purpose and main architecture.]

## Architecture at a Glance

[High-level structure: layers, main concerns, how things relate]

Example:
```
Frontend (React)
    ↓
API Gateway / Express
    ↓
Business Logic (Services)
    ↓
Data Layer (ORM + Database)
```

## Top-Level Folders

[List with responsibility]

- **`src/`** — Main application code, organized by concern
- **`test/`** — Test files, structure mirrors src/
- **`infra/`** — Deployment config (Docker, Kubernetes, Terraform)
- **`docs/`** — Architecture, API, deployment, troubleshooting
- **`scripts/`** — Build and utility scripts
- **`public/` or `static/`** — Static assets (if frontend)

## Key Modules

| Module | Responsibility | Public Exports | Configuration | Entry Point |
|--------|-----------------|----------------|----------------|-------------|
| `src/api/` | HTTP request handlers and routing | Route handlers, middleware | None | `src/api/index.ts` |
| `src/services/` | Business logic and validation | Service classes/functions | None | `src/services/index.ts` |
| `src/db/` | Database models and queries | Sequelize models, queries | DATABASE_URL | `src/db/index.ts` |
| `src/auth/` | Authentication and authorization | authenticate(), authorize() | JWT_SECRET | `src/auth/index.ts` |
| `src/utils/` | Shared utilities and helpers | Logger, helpers, types | LOG_LEVEL | `src/utils/index.ts` |

[Add more modules as needed]

## Entry Points

Where code starts running:

- **API Server:** `src/index.ts` — Starts Express on PORT (default 3000)
- **CLI Tool:** `bin/cli.js` — Command-line interface (if applicable)
- **Background Worker:** `src/workers/index.ts` — Processes jobs from queue
- **Database Migrations:** `src/db/migrations/` — Schema changes
- **Frontend:** `web/src/index.js` — React app (if applicable)

## Critical Configuration

Environment variables and their purpose:

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| DATABASE_URL | Yes | none | PostgreSQL connection string |
| PORT | No | 3000 | HTTP server port |
| JWT_SECRET | No | random | Secret for signing JWT tokens |
| LOG_LEVEL | No | info | Logging verbosity (error, warn, info, debug) |
| NODE_ENV | No | development | Environment (development, staging, production) |

See [Environment Variables Guide](ENV_VARIABLES.md) for complete list.

## Key Dependencies

Important external libraries and their role:

- **Express** (web framework) — HTTP routing and middleware
- **Sequelize** (ORM) — Database abstraction layer
- **jsonwebtoken** — JWT authentication
- **Redis** — Caching and message queues (if applicable)
- **Jest** — Testing framework

## Request Data Flow

How a typical request flows through the system:

```
HTTP Request
  ↓
Express Routing (api/routes/)
  ↓
Authentication Middleware (auth/)
  ↓
Request Handler (api/handlers/)
  ↓
Business Logic (services/)
  ↓
Database Query (db/ + models)
  ↓
PostgreSQL
  ↓
Response
  ↓
Client
```

**Concrete example: User logs in**
```
POST /api/auth/login
  ↓ AuthService.login(email, password)
  ↓ Query User in database
  ↓ Validate password
  ↓ Generate JWT
  ↓ Return token
```

## Cross-Module Dependencies

How modules depend on each other:

```
api/          → services/ ↓
              → auth/     ↓
services/     → db/       ↓
auth/         → db/       ↓
db/           → (nothing, lowest layer)
utils/        → (used by everything)
```

**Dependency rules:**
- api/ depends on services/ (handlers call business logic)
- services/ depends on db/ (business logic queries data)
- db/ is at the bottom (no upstream dependencies)
- utils/ is used everywhere

## Folder Structure in Detail

### `src/api/`
HTTP request handlers and routing.

- `routes/` — Route definitions (which path calls which handler)
- `handlers/` — Request handlers (business logic converted to HTTP responses)
- `middleware/` — Express middleware (auth, logging, error handling)
- `index.ts` — Express app setup and start

**Key files:** `routes/users.ts`, `handlers/auth.ts`, `middleware/auth.ts`

**Public exports:** route handlers, middleware

### `src/services/`
Business logic and validation, separated from HTTP.

- `users/` — User management (create, update, find)
- `auth/` — Authentication logic
- `tasks/` — Task management (if applicable)
- `validation/` — Input validation schemas

**Key files:** `services/users.ts`, `services/auth.ts`

**Public exports:** business logic functions

### `src/db/`
Database models, migrations, and queries.

- `models/` — Sequelize/ORM models (User, Task, etc.)
- `migrations/` — Database schema changes
- `queries/` — Helper functions for common queries
- `index.ts` — Database setup and initialization

**Key files:** `models/user.ts`, `migrations/001-create-users.js`

**Configuration:** DATABASE_URL

### `src/auth/`
Authentication and authorization.

- `jwt.ts` — JWT generation and validation
- `middleware.ts` — Authentication middleware for Express
- `guards.ts` — Authorization guards for routes

**Key files:** `jwt.ts`, `middleware.ts`

**Configuration:** JWT_SECRET, TOKEN_EXPIRY

### `src/utils/`
Shared utilities and helpers.

- `logger.ts` — Logging setup
- `errors.ts` — Custom error classes
- `helpers.ts` — Common utility functions
- `types.ts` — Shared TypeScript types

**Public exports:** all utilities

## Dark Zones

Areas that are poorly documented, complex, or only understood by certain people:

- **`src/utils/cache.ts` (medium dark)** — Caching strategy not documented. Expiry logic is complex. Only [Person] understands.
- **`src/workers/job-processor.ts` (dark)** — Critical but undocumented. Uses Bull queue with retry logic. See issue #1234.

[Mark each with severity: Light, Medium, Dark, Very Dark]

## Example: Adding a New Feature

Let's say you want to add a "favorites" feature for tasks.

**1. Database schema**
- Add `favorited: boolean` column to Task model in `src/db/models/task.ts`
- Create migration `src/db/migrations/XXX-add-favorited-to-tasks.js`
- Run `npm run db:migrate` to apply

**2. Business logic**
- Add `toggleFavorite(taskId, userId)` to `src/services/tasks.ts`
- Handle validation and permissions

**3. API endpoints**
- Add `POST /api/tasks/:id/favorite` route in `src/api/routes/tasks.ts`
- Add handler in `src/api/handlers/tasks.ts` that calls TaskService

**4. Tests**
- Add unit tests in `test/services/tasks.test.ts`
- Add integration tests in `test/api/tasks.test.ts`

**5. Documentation**
- Update `src/services/tasks/README.md` if exports changed
- Update `docs/API.md` with new endpoints

See [PR #2345](../pull/2345) for a similar example (starred tasks).

## How Components Talk

### Within a Module
Modules export functions/classes from `index.ts`, others import them.

```typescript
// src/services/tasks/index.ts
export { TaskService } from './tasks';

// src/api/handlers/tasks.ts
import { TaskService } from '../../services/tasks';
const task = await TaskService.create(data);
```

### HTTP Communication
Frontend calls API via REST:

```javascript
// Frontend
const response = await fetch('/api/tasks', { method: 'POST', body: JSON.stringify(data) });

// Backend
api/routes/ → api/handlers/ → services/
```

### Database Communication
Services use ORM models:

```typescript
// src/services/tasks.ts
import { Task } from '../db/models';
const task = await Task.create(data);
```

## Testing Structure

Tests mirror the `src/` structure:

```
test/
├── services/       → tests for src/services/
├── api/            → tests for src/api/
├── db/             → tests for src/db/
└── unit/           → tests for utils/ and helpers
```

**Test commands:**
- `npm test` — Run all tests
- `npm test -- --watch` — Watch mode
- `npm run test:coverage` — Coverage report

**Coverage targets:**
- Services: 80%+
- API handlers: 80%+
- Utils: 90%+
- Database: 70%+

## Deployment & DevOps

### Local Development
```bash
npm install
npm run dev
# Listens on http://localhost:3000
```

### Deployment to Production
See [Deployment Guide](../DEPLOYMENT.md).

### Infrastructure
`infra/` contains:
- `Dockerfile` — Container image
- `docker-compose.yml` — Local dev environment with PostgreSQL, Redis
- `kubernetes/` — K8s manifests for production
- `terraform/` — IaC for cloud resources

## Related Documentation

- [Architecture Overview](ARCHITECTURE.md) — System design and layers
- [API Reference](API.md) — REST endpoint documentation
- [Deployment Guide](DEPLOYMENT.md) — How to deploy and operate
- [Troubleshooting](TROUBLESHOOTING.md) — Common issues
- [Contributing Guide](../CONTRIBUTING.md) — Development workflow

## Quick Reference

**"I need to..."**

| Task | Where to Look |
|------|----------------|
| Add a new API endpoint | `src/api/routes/` then `src/api/handlers/` |
| Add business logic | `src/services/` |
| Add a database model | `src/db/models/` then migration |
| Fix authentication | `src/auth/` |
| Add a utility | `src/utils/` |
| View dependencies | `package.json` |
| Change configuration | `.env` or `docs/ENV_VARIABLES.md` |
| Understand data flow | See "Request Data Flow" section above |
| Add a test | `test/` matching `src/` structure |
| Deploy to production | `docs/DEPLOYMENT.md` |

---

**Maintained by:** [Team/Person]

**Questions?** Ask in #project-support or see the [FAQ](FAQ.md)
