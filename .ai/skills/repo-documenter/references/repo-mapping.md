# Building Navigable Repository Maps

A good repository map helps developers find code quickly and understand responsibility boundaries. This guide explains how to build one.

---

## Purpose of a Repository Map

A repository map is a navigable document that answers:
- What code is where?
- What is each folder/module responsible for?
- Where are the entry points?
- How do key components relate?
- What are the "dark zones" (poorly documented or understood)?

It's not a file tree (that's less useful); it's a **guided tour** of the codebase with context and responsibility language.

---

## Structure of a Good Repo Map

### 1. Overview Section

Start with 2-3 sentences describing the repo's purpose and main architecture:

```markdown
## Overview

This is the task management API backend. It provides REST endpoints for creating, updating, and tracking tasks. The system is a three-tier architecture: API layer (Express), business logic (services), and data layer (Sequelize + PostgreSQL).
```

### 2. Top-Level Structure

Show the main folders and their responsibility in plain English:

```markdown
## Top-Level Structure

- **src/** — Main application code
- **test/** — Test files, organized to mirror src/
- **infra/** — Docker, Kubernetes, Terraform definitions
- **docs/** — Architecture, deployment, and operational guides
- **scripts/** — Build and utility scripts
```

Don't just list; explain responsibility:

```markdown
## Top-Level Structure

- **src/** — All application code organized by concern
- **src/api/** — HTTP request handlers and route definitions
- **src/services/** — Business logic (separate from HTTP layer)
- **src/db/** — Database models, migrations, and queries
- **src/types/** — Shared TypeScript type definitions
- **src/utils/** — Utility functions and helpers
- **test/** — Test files mirroring src/ structure
- **infra/** — Deployment configuration (Docker, K8s, Terraform)
- **docs/** — Architecture and operational documentation
```

### 3. Module/Package Table

For mid-level modules, create a table showing name, responsibility, public exports, and configuration:

```markdown
## Key Modules

| Module | Responsibility | Public Exports | Configuration | Entry Point |
|--------|-----------------|----------------|----------------|-------------|
| `src/api/` | HTTP request handlers and routing | Middleware, route handlers | None | `src/api/index.ts` |
| `src/services/tasks/` | Task creation, updates, queries | `createTask`, `updateTask`, `getTasks` | None | `src/services/tasks/index.ts` |
| `src/db/` | Database models and queries | Sequelize models (User, Task, etc.) | DATABASE_URL | `src/db/index.ts` |
| `src/auth/` | User authentication and JWT | `authenticate`, `authorize` | JWT_SECRET, TOKEN_EXPIRY | `src/auth/index.ts` |
| `src/utils/logging/` | Structured logging | `logger`, `withTimer` | LOG_LEVEL | `src/utils/logging/index.ts` |
```

### 4. Entrypoints Section

Show where execution starts:

```markdown
## Entry Points

- **API Server:** `src/index.ts` → Express app listening on PORT (default 3000)
- **CLI Tool:** `bin/cli.js` → Command-line interface for admin tasks
- **Worker:** `src/workers/index.ts` → Background job processor (Redis queue)
- **Migrations:** `src/db/migrations/` → Database schema changes
```

### 5. Dependencies Section

Show the external dependencies and how they flow:

```markdown
## Key Dependencies

- **Express:** HTTP framework, handles routing and middleware
- **Sequelize:** ORM for PostgreSQL interactions
- **JWT:** Authentication tokens (jsonwebtoken library)
- **Redis:** Message queue for background jobs
- **Winston:** Structured logging
- **PostgreSQL:** Primary data store

### Dependency Flow
```
HTTP Request
  → Express Middleware (auth, logging)
  → Route Handler (api/)
  → Service Layer (services/)
  → Database Layer (db/ with Sequelize)
  → PostgreSQL
```

### 6. Critical Configuration

Show configuration points and their purpose:

```markdown
## Critical Configuration

| Variable | Required | Default | Purpose |
| ---------- | ---------- | --------- | --------- |
| DATABASE_URL | Yes | none | PostgreSQL connection string |
| JWT_SECRET | Yes | none | Secret for signing authentication tokens |
| PORT | No | 3000 | HTTP server port |
| LOG_LEVEL | No | info | Logging verbosity (error, warn, info, debug) |
| REDIS_URL | No | redis://localhost:6379 | Redis connection for job queue |
| NODE_ENV | No | development | Environment (development, staging, production) |

See [Environment Variables](../ENV_VARIABLES.md) for complete list.
```

### 7. Data Flow Diagrams (Optional but Helpful)

Use ASCII or Mermaid diagrams for complex flows:

```markdown
## Request Data Flow

```
User Creates Task
  ↓
POST /api/tasks (api/handlers/tasks.ts)
  ↓
authenticate middleware (auth/middleware.ts)
  ↓
TaskService.create() (services/tasks.ts)
  ↓
Task.create() via Sequelize (db/models/task.ts)
  ↓
PostgreSQL INSERT
  ↓
Task object returned to client
```

Or use Mermaid if rendering is available:

```markdown
\`\`\`mermaid
graph TD
  A[HTTP Request] --> B[Express Router]
  B --> C[Auth Middleware]
  C --> D[Handler]
  D --> E[Service Layer]
  E --> F[Database Models]
  F --> G[PostgreSQL]
\`\`\`
```

### 8. Dark Zones

Call out areas that are poorly documented or understood:

```markdown
## Dark Zones (Areas Needing Clarification)

- **`src/migrations/` (medium dark)** — Database migration strategy is unclear. When do we run old vs new migrations? Need to document. (Related: ADR-20240315-db-strategy)
- **`src/workers/` (dark)** — Job retry logic is undocumented. Only [name] understands this. See issue #2345.
- **`lib/calculations.ts` (very dark)** — Complex math for fee calculations. No comments, no tests. Critical for accounting. Needs refactor + docs. (Blocking: #1234)
```

### 9. Cross-Module Dependencies

If modules talk to each other, show the relationships:

```markdown
## Cross-Module Dependencies

- **api/** depends on **services/** (handlers call business logic)
- **services/** depends on **db/** (business logic queries data)
- **services/** depends on **auth/** (authorization checks)
- **auth/** depends on **db/** (user lookups)
- **db/** depends on nothing (lowest layer)

### Dependency Graph
```
api/ → services/ ↓
       ↓          db/
       auth/ ----↑
```

### 10. How to Add a New Feature

Provide a concrete example:

```markdown
## Example: Adding a New Feature

Say you want to add a "favorite tasks" feature.

1. **Define the schema** (db/)
   - Add `favorited: boolean` field to Task model in `src/db/models/task.ts`
   - Create migration `src/db/migrations/add-favorited-to-tasks.ts`

2. **Implement the service** (services/)
   - Add `favoriteTask(taskId)` and `unfavoriteTask(taskId)` to `src/services/tasks.ts`

3. **Add API endpoints** (api/)
   - Add POST `/api/tasks/:id/favorite` in `src/api/handlers/tasks.ts`
   - Add POST `/api/tasks/:id/unfavorite`

4. **Test**
   - Add tests to `test/services/tasks.test.ts`
   - Add integration tests to `test/api/tasks.test.ts`

5. **Document** (docs/)
   - Update `src/services/tasks/README.md` if exports changed
   - Update `docs/API.md` with new endpoints

See PR #2345 for a similar feature (dark mode).
```

---

## Folder Responsibility Language

Use clear, concise language to describe what each folder does:

**Good responsibility language:**
- "Handles HTTP requests and routing"
- "Contains business logic and validation"
- "Manages data access patterns"
- "Provides utilities and helpers"
- "Defines type safety"
- "Coordinates external API calls"
- "Manages authentication and authorization"
- "Runs background jobs"

**Vague responsibility language (avoid):**
- "Stuff"
- "Utilities"
- "Helpers"
- "Core"
- "Main"
- "Code"

---

## Module Table Fields

When creating module tables, these fields are useful:

| Field | Purpose | Example |
| ------- | --------- | --------- |
| **Module** | Folder name | `src/services/tasks/` |
| **Responsibility** | What it does | "Task creation, updates, deletion" |
| **Public Exports** | Functions/classes visible to other modules | `createTask`, `updateTask`, `deleteTask` |
| **Configuration** | Environment variables or config it needs | `DATABASE_URL` |
| **Entry Point** | Main file to import from | `src/services/tasks/index.ts` |
| **Key Files** | Important files in the module | `tasks.ts`, `validation.ts` |
| **Dependencies** | What it depends on | `db`, `auth`, `utils/logging` |
| **Tests** | Test location | `test/services/tasks/` |

---

## Repository Map Template

Use this structure as a starting point:

```markdown
# Repository Map

## Overview
[What is this repo? 1-2 sentences]

## Architecture at a Glance
[High-level structure: layers, main concerns]

## Top-Level Folders

[List with responsibility]

## Key Modules

[Table with module, responsibility, exports, config, entry point]

## Entry Points

[How code starts running: API server, CLI, workers, etc.]

## Critical Configuration

[Table of env vars, required/optional, purpose]

## Key Dependencies

[Important libraries and their role]

## Request Data Flow

[How a typical request flows through the system]

## Cross-Module Dependencies

[How modules relate]

## Dark Zones

[Areas that are unclear, undocumented, or complex]

## Adding a New Feature

[Concrete example of feature flow]

## Related Documentation

- [Architecture Overview](../ARCHITECTURE.md)
- [Module READMEs](../../src/)
- [API Documentation](../API.md)
- [Contributing Guide](../../CONTRIBUTING.md)
```

---

## Dark Zone Identification

Dark zones are areas of the codebase that are:
- Poorly documented
- Complex but unexplained
- Only understood by one person
- Haven't been touched in months
- Have no tests

**Identify dark zones by:**
1. Reading code comments — sparse = dark
2. Looking at test coverage — low = dark
3. Asking the team — "What's hard to understand here?"
4. Finding unmaintained code — no recent commits = dark
5. Checking for TODO/FIXME comments — many = dark

**Mark dark zones in the repo map with severity:**
- **Light** — Documented but could be clearer
- **Medium** — Poorly documented, complex
- **Dark** — Undocumented, only one person understands
- **Very Dark** — Critical code with no documentation, tests, or understanding

**For each dark zone, note:**
- What's unclear?
- Who might know about it?
- What issue/ADR is related?
- Priority to improve?

**Example:**
```markdown
## Dark Zones

- **src/utils/cache.ts (medium dark)** — Caching strategy isn't documented. When is data invalidated? Expiry logic is complex. Needs documentation or refactor.
- **src/workers/batch-processor.ts (very dark)** — Core business logic for batch processing. No tests, no documentation, only [name] understands. BLOCKING: needs refactor.
```

---

## Repository Map Maintenance

- **Update when:** Code structure changes, major modules added/removed, critical bugs found in undocumented areas
- **Review when:** New team members join (let them test the map), quarterly architecture review
- **Keep current:** Map should be 100% accurate to actual code

---

## Example: Complete Small Repository Map

```markdown
# Repository Map

## Overview
This is a Node.js + React web application for managing personal finances. Users can track expenses, categorize spending, and view reports. The backend provides REST APIs, the frontend is a single-page React app.

## Architecture at a Glance
Three-tier architecture:
- **Presentation:** React frontend in `web/`
- **API:** Express backend in `api/`
- **Data:** PostgreSQL with Sequelize ORM

## Top-Level Folders

- **api/** — Node.js/Express backend
- **web/** — React frontend (created with Create React App)
- **infra/** — Docker and Kubernetes configs
- **docs/** — Documentation
- **scripts/** — Build and deployment automation

## Key Modules

| Module | Responsibility | Public Exports | Config | Entry Point |
| -------- | ----------------- | ---------------- | -------- | ------------- |
| api/routes/ | HTTP endpoint definitions | Express Router | None | api/index.ts |
| api/services/ | Business logic (expenses, categories, reports) | createExpense, getReport, etc. | DATABASE_URL | api/services/index.ts |
| api/db/ | Database models (User, Expense, Category) | Sequelize models | DATABASE_URL | api/db/index.ts |
| web/src/ | React components and pages | React app | REACT_APP_API_URL | web/src/index.js |

## Entry Points

- **API Server:** api/index.ts → Listens on PORT (default 5000)
- **Web App:** web/src/index.js → Built by React, served on 3000

## Critical Configuration

| Variable | Required | Default | Purpose |
| ---------- | ---------- | --------- | --------- |
| DATABASE_URL | Yes | none | PostgreSQL connection |
| PORT | No | 5000 | API server port |
| REACT_APP_API_URL | No | http://localhost:5000 | API endpoint for frontend |
| NODE_ENV | No | development | Environment mode |

## Key Dependencies

- **Express** — API framework
- **Sequelize** — ORM for PostgreSQL
- **React** — Frontend framework
- **Axios** — HTTP client for frontend

## Request Data Flow

```
User clicks "Add Expense" (web/)
  ↓
Form submits POST /api/expenses (api/routes/)
  ↓
ExpenseService.create() (api/services/expenses.ts)
  ↓
Expense.create() via Sequelize (api/db/models/expense.ts)
  ↓
PostgreSQL INSERT
  ↓
JSON response to frontend
  ↓
React updates state and UI
```

## Dark Zones

- **api/utils/calculations.ts (medium)** — Tax calculation logic is complex and undocumented. Only [name] understands the edge cases.
- **web/src/state/ (light)** — State management works but should use Redux or Zustand. Lots of prop drilling.

## Adding a New Feature

Example: Add expense categories.

1. **Database** (api/db/)
   - Create Category model in models/
   - Create migration

2. **API** (api/)
   - Add `/api/categories` routes
   - Add `CategoryService` with CRUD operations

3. **Frontend** (web/src/)
   - Add `CategoriesPage` component
   - Add category list and form

4. **Tests & Docs**
   - Add test for API endpoints
   - Update API documentation

## Related Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Getting Started](docs/ONBOARDING.md)
- [API Reference](docs/API.md)
- [Deployment](docs/DEPLOYMENT.md)
```

---

*Last updated: 2026*
*Author: Repository Mapping Guide*
