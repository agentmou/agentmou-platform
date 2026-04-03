# Glossary

Domain terminology, acronyms, and abbreviations used in [project name].

---

## Acronyms

| Acronym | Full Form | Definition |
| --------- | ----------- | ----------- |
| API | Application Programming Interface | Interface for communication between software components |
| HTTP | HyperText Transfer Protocol | Protocol for transferring web data |
| REST | Representational State Transfer | API architecture style using HTTP |
| JSON | JavaScript Object Notation | Data format for APIs and configuration |
| JWT | JSON Web Token | Token-based authentication mechanism |
| ORM | Object-Relational Mapping | Library that maps code objects to database tables |
| SQL | Structured Query Language | Language for querying databases |
| CRUD | Create, Read, Update, Delete | Basic database operations |
| CI/CD | Continuous Integration / Continuous Deployment | Automated testing and deployment pipeline |
| PR | Pull Request | Code review mechanism on GitHub |
| SLA | Service Level Agreement | Guaranteed uptime/performance |
| RTO | Recovery Time Objective | Time to restore service after failure |
| RPO | Recovery Point Objective | Acceptable data loss in disaster recovery |
| P95 | 95th Percentile | 95% of requests are this fast or faster |
| SRE | Site Reliability Engineering | Engineering discipline for operations |
| DB | Database | Persistent data storage |
| ORM | Object-Relational Mapping | Code abstraction for database access |

[Add more acronyms as needed]

---

## Technical Terminology

### Architecture Terms

**Microservices**
Splitting application into small, independently deployable services. See [Architecture Overview](ARCHITECTURE.md).

**Monolith**
Single, unified codebase and deployment. Opposite of microservices.

**Load Balancer**
Distributes incoming requests across multiple servers to prevent overload.

**API Gateway**
Single entry point for all API requests; handles routing, authentication, rate limiting.

### Database Terms

**Schema**
Structure of database tables, columns, and relationships. Defined in migrations.

**Migration**
Version-controlled database schema change. See `src/db/migrations/`.

**Index**
Data structure for fast lookups. Example: `CREATE INDEX idx_user_email ON users(email);`

**Foreign Key**
Reference to another table's primary key. Ensures data integrity.

**ACID**
Atomicity, Consistency, Isolation, Durability. Properties of reliable transactions.

**Denormalization**
Duplicating data for performance (opposite of normalization).

### API Terms

**Endpoint**
Specific URL path that does something. Example: `GET /api/users/123`

**Request**
What you send to the API (method, URL, headers, body).

**Response**
What the API sends back (status code, headers, body).

**Status Code**
Number indicating request outcome:
- 2xx — Success
- 3xx — Redirect
- 4xx — Client error (bad request, not found, unauthorized, etc.)
- 5xx — Server error (internal error, service unavailable, etc.)

**Payload**
Data sent in request/response body, usually JSON.

**Authentication**
Verifying who you are (username/password, token, etc.).

**Authorization**
Checking if you're allowed to do something (permissions, roles).

### Testing Terms

**Unit Test**
Test a single function in isolation, with mocked dependencies.

**Integration Test**
Test multiple components working together with real (test) dependencies.

**E2E Test** (End-to-End)
Test full user workflow from UI to database.

**Mocking**
Replacing real dependency with fake for testing purposes.

**Fixture**
Pre-defined test data used in tests.

**Coverage**
Percentage of code that's tested. Goal: 80%+

### Performance Terms

**Latency**
How long a request takes to complete.

**Throughput**
How many requests per second the system handles.

**Bottleneck**
Component that limits overall performance (usually database or CPU).

**Caching**
Storing frequently-used data in memory for fast access.

**N+1 Query Problem**
Making 1 initial query then N additional queries in a loop (inefficient).

### Deployment Terms

**Staging**
Pre-production environment; mirrors production for testing.

**Production**
Live environment where real users access the system.

**Rollback**
Reverting to previous version after bad deployment.

**Hotfix**
Urgent fix deployed outside normal process for critical production issues.

**Blue-Green Deployment**
Running two identical productions; switch traffic between them.

**Canary Deployment**
Deploy to small subset of servers; monitor before full rollout.

---

## Domain-Specific Terms

[Add terms specific to your business domain]

**Example (Task Management App):**

**Task**
Unit of work. Has title, description, assignee, due date, status.

**Status**
Current state of task: Todo, In Progress, Done, Blocked.

**Assignee**
User responsible for completing the task.

**Sprint**
Time-boxed iteration (usually 1-2 weeks) of work.

**Story Point**
Estimate of task complexity (1, 2, 3, 5, 8, 13).

---

## Common Phrases

| Phrase | Meaning |
| -------- | --------- |
| "Ship it" | Deploy to production |
| "Break the build" | Commit code that breaks CI/CD |
| "Hotfix" | Urgent fix for production |
| "Rollback" | Revert to previous version |
| "Tech debt" | Code that works but is poorly designed |
| "Dark zone" | Poorly documented or understood code |
| "Stale docs" | Documentation that's out of date |
| "Code review" | Team review of pull request |
| "Merge conflict" | Git conflict when merging branches |
| "Rebase" | Reorganizing git commits |

---

## Tools & Services

| Tool | Purpose |
| ------ | --------- |
| **GitHub** | Code repository and collaboration |
| **Jest** | JavaScript testing framework |
| **Sequelize** | ORM for Node.js |
| **Express** | Web framework for Node.js |
| **React** | Frontend JavaScript library |
| **PostgreSQL** | Relational database |
| **Redis** | In-memory cache and message queue |
| **Docker** | Container platform |
| **Kubernetes** | Container orchestration |
| **Datadog** | Monitoring and observability |

---

## Related Documentation

- [Architecture Overview](ARCHITECTURE.md) — System design
- [Repository Map](REPO_MAP.md) — Code organization
- [API Reference](API.md) — Endpoint documentation

---

**Last updated:** [DATE]

**Questions?** Ask in #project-support or update this glossary!
