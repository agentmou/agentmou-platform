# Discovery Checklist for Unfamiliar Codebases

Use this checklist to rapidly understand a new repository's structure, stack, and purpose without reading all the code.

---

## 1. Root-Level Artifacts

These files at the repo root reveal the most about what the repo does and how it's built.

### Entry Points & Purpose
- [ ] **README.md** — Does it exist? Is it current? What's the elevator pitch?
- [ ] **CONTRIBUTING.md** — How do people contribute? Development setup?
- [ ] **LICENSE** — What's the license (MIT, Apache, proprietary)?
- [ ] **CHANGELOG.md** — What changed recently? Version history?
- [ ] **TODO.md** or **ROADMAP.md** — What's coming?

### Build & Dependency Files
- [ ] **package.json / package-lock.json** (Node.js)
  - [ ] main/exports fields → what's the entry point?
  - [ ] scripts → what's the dev/build/test flow?
  - [ ] dependencies → what frameworks, libraries?
  - [ ] version → how mature is this project?

- [ ] **go.mod / go.sum** (Go)
- [ ] **requirements.txt / Pipfile / pyproject.toml** (Python)
- [ ] **Cargo.toml / Cargo.lock** (Rust)
- [ ] **pom.xml / build.gradle** (Java)
- [ ] **Gemfile / Gemfile.lock** (Ruby)

### Build System & Scripts
- [ ] **Makefile** — What are the top targets (build, test, deploy)?
- [ ] **scripts/** folder — What helper scripts exist?
- [ ] **./build.sh / ./test.sh / ./deploy.sh** — Common automation?
- [ ] **webpack.config / vite.config / tsconfig** — Build configuration?

### Development Setup
- [ ] **.env.example / .env.template** — What environment variables are needed?
- [ ] **docker-compose.yml / docker-compose.dev.yml** — Local dev environment?
- [ ] **.editorconfig / .prettierrc / .eslintrc** — Code style and linting?
- [ ] **.gitignore** — What's excluded? (reveals temp dirs, secrets patterns)

### CI/CD & Automation
- [ ] **.github/workflows/** (GitHub Actions)
  - [ ] What tests run on PR?
  - [ ] What deploys on merge to main?
  - [ ] Any scheduled jobs?

- [ ] **.gitlab-ci.yml** (GitLab)
- [ ] **Jenkinsfile** (Jenkins)
- [ ] **.circleci/config.yml** (CircleCI)

### Container & Infrastructure
- [ ] **Dockerfile** — What language, base image, entry point?
- [ ] **docker-compose.yml** — Multi-container local setup?
- [ ] **kubernetes/** or **.kube/** — K8s manifests, Helm charts?
- [ ] **terraform/ / cloudformation/** — Infrastructure as code?
- [ ] **.dockerignore** — What's excluded from image?

### Documentation Root
- [ ] **/docs/** folder — Architecture, guides, API docs?
- [ ] **/docs/adr/** — Architecture Decision Records?
- [ ] **/docs/runbooks/** — Operations guides?
- [ ] **/docs/onboarding.md** — Getting started?

---

## 2. Language & Framework Detection

Quickly identify the tech stack without reading source code.

### Language Signals
| File | Language |
| ------ | ---------- |
| package.json | Node.js (JavaScript/TypeScript) |
| go.mod | Go |
| requirements.txt, pyproject.toml | Python |
| Cargo.toml | Rust |
| pom.xml, build.gradle | Java |
| Gemfile | Ruby |
| composer.json | PHP |
| .swift-version, Package.swift | Swift |
| Dockerfile (FROM node:) | See FROM line |

### Framework & Build System Signals
| File | Framework/System |
| ------ | ----------------- |
| vite.config.js, webpack.config.js | JavaScript build tool |
| tsconfig.json | TypeScript |
| next.json, nuxt.config | Next.js / Nuxt.js |
| nest-cli.json | NestJS |
| Makefile | Build automation (Go, C, etc.) |
| setup.py | Python setuptools |
| go.mod | Go module system |

### Database & Persistence
| Artifact | Indicates |
| ---------- | ----------- |
| docker-compose with postgres/mysql service | SQL database |
| mongodb in docker-compose | NoSQL (MongoDB) |
| .prisma/ folder | Prisma ORM |
| migrations/ folder | Database migrations |
| schema.sql | Schema definition |

---

## 3. Folder Structure Patterns

Scan top-level directories to understand separation of concerns.

### Common Patterns (Node.js)
```
src/               Main source code
├── api/           API routes/handlers
├── db/            Database models, migrations
├── services/      Business logic
├── utils/         Utilities
├── web/           Frontend code
└── types/         Shared TypeScript types

test/ or __tests__/     Test files
docs/                   Documentation
infra/ or ops/          Infrastructure/deployment
scripts/                Build and utility scripts
node_modules/           Dependencies (generated)
dist/ or build/         Build output (generated)
```

### Common Patterns (Python)
```
src/                Main package
├── models/        Data models
├── views/         Handlers (Flask) or Views (Django)
├── services/      Business logic
└── utils/         Utilities

tests/                  Test files
docs/                   Documentation
requirements.txt        Dependencies
setup.py or pyproject.toml   Package config
```

### Common Patterns (Go)
```
cmd/               Executable entry points
├── myapp/        Main application
└── myapp-cli/    CLI tool

internal/          Private packages (Go convention)
├── handlers/
├── models/
└── services/

pkg/               Public packages (if applicable)
api/               API definitions or OpenAPI specs
docs/              Documentation
```

### Multi-Repo or Monorepo Patterns
```
apps/
├── web/           Frontend app
├── api/           Backend service
└── cli/           CLI tool

packages/
├── shared-types/
├── utils/
└── db-models/

libs/
├── auth/
└── logging/
```

---

## 4. Entry Points & How Code Runs

Find where execution starts.

### Node.js/JavaScript
- [ ] Check `package.json` → `"main"` field (entry point)
- [ ] Check `package.json` → `"scripts.start"` (how to run)
- [ ] Look for `index.js`, `index.ts`, `server.ts`, `app.ts` in src/
- [ ] If web app: look for `index.html` in public/ or src/
- [ ] Check for CLI entry point in `bin/` or scripts

### Python
- [ ] Check `__main__.py` in package root or src/
- [ ] Check `setup.py` or `pyproject.toml` → `entry-points`
- [ ] Look for `main()` function
- [ ] Check if it's a web app (Flask/Django) → `app.py` or `manage.py`

### Go
- [ ] Check `cmd/*/main.go` files (common entry points)
- [ ] Check for multiple binaries in cmd/

### Java
- [ ] Look for `public static void main()` method
- [ ] Check Spring Boot application class

### General
- [ ] Does it respond to HTTP? Find the port, handler, or router setup.
- [ ] Does it process messages/events? Find the consumer, listener, or queue handler.
- [ ] Is it a library? Find the exported API in the main/index file.

---

## 5. Key Configuration & Secrets

Understand how the app is configured at runtime.

- [ ] **.env.example / .env.template** — What vars are needed?
- [ ] **config/ folder** — Static configuration files?
- [ ] **src/config.ts or config.py** — How are settings loaded?
- [ ] **docker-compose.yml** — What env vars for local dev?
- [ ] **Dockerfile** — Any ENV defaults?
- [ ] **CI workflow files** — What secrets are referenced? (GITHUB_TOKEN, API_KEY, etc.)

Create a table:
| Variable | Required | Default | Purpose |
| ---------- | ---------- | --------- | --------- |
| DATABASE_URL | Yes | none | PostgreSQL connection |
| PORT | No | 3000 | Server listen port |
| LOG_LEVEL | No | info | Logging verbosity |

---

## 6. Testing & Quality

How is code validated?

- [ ] **test/ or __tests__/** — What's the testing structure?
- [ ] **jest.config / vitest.config / pytest.ini** — Test framework config?
- [ ] **.github/workflows/test.yml** — What tests run on CI?
- [ ] **coverage/** — Is there coverage reporting?
- [ ] **.eslintrc / .pylintrc / .golangci.yml** — Linting config?
- [ ] **package.json → scripts** — What are test commands?
  - `npm test`
  - `npm run test:unit`
  - `npm run test:integration`
  - `npm run lint`

---

## 7. Database & Data Layer

How is data persisted?

- [ ] **migrations/ or sql/** — Database schema definitions?
- [ ] **orms/ or models/** — ORM models or schema?
- [ ] **docker-compose.yml** — What database service?
- [ ] **db/init.sql** — Seed data or schema?
- [ ] **.prisma/schema.prisma** — Prisma schema?
- [ ] **.sqlc.yaml** — SQLC config (Go + SQL)?

---

## 8. API & Integration Points

What does this service expose or depend on?

### External APIs
- [ ] Does the code call external services? (grep for http.get, fetch, requests.get)
- [ ] What APIs? (weather, payment, analytics, etc.)
- [ ] Are API keys configured via env vars?

### Public API (REST, GraphQL, gRPC)
- [ ] **src/routes/ or src/handlers/** — API routes?
- [ ] **openapi.yaml / swagger.json** — API spec?
- [ ] **src/graphql/** — GraphQL schema and resolvers?
- [ ] **proto/** — gRPC definitions?

### Message Queues & Events
- [ ] **src/workers/** — Background job processors?
- [ ] **docker-compose.yml** — Redis, RabbitMQ, Kafka service?
- [ ] **src/events/** — Event publishers/subscribers?

---

## 9. Deployment & Operations

How does this get deployed and operated?

- [ ] **Dockerfile** — Container image definition?
- [ ] **kubernetes/ or helm/** — K8s deployment manifests?
- [ ] **.github/workflows/deploy.yml** — Deployment automation?
- [ ] **terraform/ or cloudformation/** — Infrastructure code?
- [ ] **docs/DEPLOYMENT.md** — Deployment guide?
- [ ] **docs/RUNBOOK.md** — Operations runbook?
- [ ] **scripts/deploy.sh** — Manual deployment script?

### Monitoring & Logs
- [ ] Does the code export metrics? (Prometheus, Datadog, etc.)
- [ ] Is logging configured? (Winston, Pino, Python logging, etc.)
- [ ] Are health check endpoints defined? (/health, /ping, etc.)

---

## 10. Dependencies & External Services

What does this repo depend on?

### Direct Dependencies
- [ ] List top 5-10 most important dependencies from package manager
- [ ] Are there pinned versions (stable) or floating versions (risky)?
- [ ] How old is the latest version? (outdated or current?)

### Transitive (Implicit) Dependencies
- [ ] Any surprise deep chains? (A depends on B depends on C)
- [ ] Duplicate/conflicting versions?

### External Services
- [ ] What microservices does this call? (Auth service, payment processor, etc.)
- [ ] What databases does it connect to?
- [ ] What third-party APIs or SaaS? (Slack, SendGrid, Stripe, etc.)

---

## 11. Existing Documentation

What's already documented?

- [ ] **README.md** — Exists? How detailed? Current?
- [ ] **docs/ARCHITECTURE.md** — Architecture overview?
- [ ] **docs/adr/** — Architecture Decision Records?
- [ ] **docs/ONBOARDING.md** — Getting started guide?
- [ ] **docs/RUNBOOK.md** — Deployment & operations?
- [ ] **docs/TROUBLESHOOTING.md** — Common issues?
- [ ] **CONTRIBUTING.md** — Development guidelines?
- [ ] Package/module READMEs — Documented at source?
- [ ] Code comments — Abundant, sparse, stale?

### Documentation Quality Assessment
For each doc that exists, note:
- **Current?** (Last updated recently? Evidence of staleness?)
- **Clear?** (Can a newcomer understand it?)
- **Complete?** (Does it cover what you need to know?)
- **Discoverable?** (Easy to find from the README?)

---

## 12. Tech Maturity & Project State

Signals about the project's stage.

- [ ] **Version number** (in package.json, git tags) — 0.x.y (experimental), 1.x.y+ (stable)?
- [ ] **Commit frequency** — Active development or maintenance mode?
- [ ] **CI/CD maturity** — Full pipelines or bare minimum?
- [ ] **Test coverage** — High, medium, low?
- [ ] **Documentation** — Comprehensive, sparse, absent?
- [ ] **Issue/PR velocity** — Quick turnaround or backlog accumulating?

---

## 13. Quick Checklist Summary

**High-Signal Items (do these first):**
- [ ] Root README.md — Does it explain the repo?
- [ ] package.json or equivalent — What's built, what's the stack?
- [ ] Folder structure — How is code organized?
- [ ] Entry point — Where does code start running?
- [ ] docker-compose.yml or equivalent — What are dependencies?
- [ ] CI/CD file (.github/workflows) — What's automated?

**Medium-Signal Items:**
- [ ] .env.example — What configuration?
- [ ] test scripts — How is code validated?
- [ ] Existing docs in /docs/ — What's documented?

**Lower-Priority Items (dive deeper if needed):**
- [ ] Individual source files — Read only if discovery above isn't clear
- [ ] Deep dependency analysis — Usually not needed early
- [ ] Detailed Git history — Usually not needed early

---

## Output: Discovery Summary

After running this checklist, write a quick summary:

```
## Discovery Summary

**Repo Purpose:** [One sentence what this does]

**Tech Stack:** [Language, frameworks, key libraries]

**Entry Point:** [How code starts running]

**Key Dependencies:** [Database, external APIs, services]

**Folder Organization:** [How code is organized]

**Testing:** [What test framework, CI integration]

**Deployment:** [Container, K8s, Cloud, manual?]

**Documentation State:** [What exists, what's missing]

**Open Questions:** [What's unclear, what needs clarification?]
```

---

*Use this checklist every time you encounter an unfamiliar codebase. It scales from 5 minutes (high-signal items) to 30 minutes (thorough) depending on urgency.*
