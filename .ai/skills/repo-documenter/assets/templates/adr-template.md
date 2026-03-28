# ADR-[YYYYMMDD]: [Decision Title]

**Date:** [YYYY-MM-DD]

**Status:** [Proposed | Accepted | Rejected | Deprecated | Superseded by ADR-YYYYMMDD]

**Author:** [Name]

**Reviewers:** [Names]

---

## Context

[Describe the problem you're trying to solve. What business or technical requirements are driving this decision? What constraints do you have?]

**Problem Statement:**
[In 1-2 sentences, what's the core problem?]

**Background:**
[Any relevant history or context that led to this decision?]

**Constraints:**
- [Constraint 1: e.g., Must support 10k concurrent users]
- [Constraint 2: e.g., Migration must not require downtime]
- [Constraint 3: e.g., Budget limited to $X per month]

**Stakeholders:**
- [Who cares about this decision?]
- [Who needs to be involved in approval?]

---

## Decision

[What did you decide to do? Why this option? Be clear and specific.]

**Option Chosen:** [Name of decision]

**Rationale:**
[Why is this the best option? What makes it better than alternatives?]

[Example: "We chose PostgreSQL because it provides ACID guarantees, supports complex queries, and has mature tooling. The team has deep expertise with PostgreSQL, reducing learning curve and time-to-productivity."]

**Implementation Approach:**
[How will you implement this? Any phases or steps?]

[Example:
1. Phase 1 (Week 1-2): Set up PostgreSQL cluster with replication
2. Phase 2 (Week 3-4): Migrate data from MySQL
3. Phase 3 (Week 5): Update application code
4. Phase 4 (Week 6): Validation and testing
]

---

## Consequences

### Positive Consequences
[Good things that result from this decision]

- [Benefit 1]: [Why it's good]
- [Benefit 2]: [Why it's good]

[Example:
- Better performance: ACID compliance and indexing allow faster queries
- Reduced errors: Schema validation at database level catches more bugs early
- Improved reliability: Transaction support ensures data consistency
]

### Negative Consequences
[Tradeoffs and downsides]

- [Downside 1]: [Mitigations if applicable]
- [Downside 2]: [Mitigations if applicable]

[Example:
- Higher operational complexity: Requires DBA expertise for backups, replication
  - Mitigation: Hire/train DevOps engineer; use managed PostgreSQL service
- Increased infrastructure cost: Higher CPU/memory requirements
  - Mitigation: Optimize queries; use connection pooling to reduce resource usage
]

### Long-term Implications
[What does this mean for the future of the system?]

[Example: This decision makes it easier to adopt microservices later, since PostgreSQL is database-agnostic. However, we're locked into relational model; if we need graph or document storage, we'd need to add another database type.]

---

## Alternatives Considered

### Alternative 1: [Option Name]
**Description:** [What would this approach do?]

**Pros:**
- [Advantage 1]
- [Advantage 2]

**Cons:**
- [Disadvantage 1]
- [Disadvantage 2]

**Why rejected:** [Why this wasn't chosen]

[Example:
**Alternative 1: MySQL**
- Pros: More lightweight, faster writes, cheaper hosting
- Cons: No true transactions, schema changes are slow, less flexible
- Why rejected: We need ACID guarantees; MySQL replication is less reliable; team has less expertise
]

### Alternative 2: [Option Name]
[Repeat above structure]

---

## Validation & Metrics

[How will you know this decision was the right one?]

**Success Criteria:**
- [Measurable metric 1]: [Target value] by [date]
- [Measurable metric 2]: [Target value] by [date]

[Example:
- Query latency p95 < 100ms by end of Q2
- No data loss incidents in 12 months
- System uptime > 99.9%
]

**Monitoring:**
[How will you track these metrics?]

[Example:
- Monitor query latency in Datadog
- Track error rates and data consistency checks
- Weekly SLA review
]

---

## Migration Plan (if applicable)

[If this decision requires migration or rollout, describe the plan]

**Timeline:**
- [Phase 1]: [Timeline, scope]
- [Phase 2]: [Timeline, scope]
- [Rollback plan]: [How to undo if things go wrong]

[Example:
- Week 1-2: PostgreSQL setup, replication, backups
- Week 3-4: Data migration from MySQL (using ETL scripts)
- Week 5-6: Test data accuracy, performance
- Week 7: Cutover to PostgreSQL (during maintenance window)
- Week 8: Monitor for issues, keep MySQL as fallback for 2 weeks
- Rollback: Revert DNS, use pre-migration MySQL backup
]

---

## Open Questions

[Things that are still unclear or need follow-up]

- [Question 1]: [Status / owner]
- [Question 2]: [Status / owner]

[Example:
- How do we handle timezone-aware data? (Answer needed by 2024-01-20, owner: @alice)
- Should we use connection pooling or native connections? (Requires testing, owner: @bob)
]

---

## References

[Links to related decisions, documentation, RFCs, specifications, issues]

- [Related ADR-20240101]: Why we chose Node.js
- [RFC-3339]: Timestamp format specification
- [GitHub Issue #1234]: Original discussion about database choice
- [Database comparison spreadsheet](https://docs.google.com/spreadsheets/...)
- [Proof-of-concept code](https://github.com/org/project/pull/2345)

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Decision Maker | [Name] | [Date] | Approved / Pending |
| Tech Lead | [Name] | [Date] | Approved / Pending |
| Architect | [Name] | [Date] | Approved / Pending |

---

## Implementation Tracking

- [ ] Planning complete
- [ ] Resources allocated
- [ ] Phase 1 complete (date: __)
- [ ] Phase 2 complete (date: __)
- [ ] Metrics validated (date: __)
- [ ] Documentation updated (date: __)

---

## Example ADR (Task Management App)

# ADR-20240315: Use PostgreSQL Instead of MongoDB

**Date:** 2024-03-15

**Status:** Accepted

**Author:** Alice

**Reviewers:** Bob, Carol

---

## Context

We're building the backend for a task management application. We need to choose between a relational (PostgreSQL) and document (MongoDB) database.

**Requirements:**
- Support complex queries (filtering by multiple fields, sorting)
- Ensure data consistency (tasks can't be assigned to non-existent users)
- Scale to 100k users
- Minimize operational overhead

**Constraints:**
- Budget: $500/month max for database
- Team expertise: More comfortable with SQL
- Timeline: Need to start development next week

---

## Decision

**Option Chosen:** PostgreSQL

**Rationale:**
PostgreSQL provides ACID compliance, strong schema validation, and complex query support. We have team expertise. Managed services (AWS RDS) reduce operational burden.

**Implementation:**
1. Set up AWS RDS PostgreSQL instance (t3.medium)
2. Create schema for users, tasks, projects
3. Use Sequelize ORM for type safety
4. Configure automated daily backups

---

## Consequences

### Positive
- Data consistency: Foreign keys prevent orphaned tasks
- Flexible queries: Can filter by status, assignee, due date without extra code
- Team comfort: SQL is familiar, faster development
- Cost: ~$200/month with AWS RDS (within budget)

### Negative
- Scaling complexity: Will need to shard if we exceed 1M rows (unlikely near-term)
- Learning DevOps: Backups, replication require DBA knowledge
  - Mitigation: Use AWS RDS (managed service) to handle this

---

## Alternatives Considered

### MongoDB
- Pros: Flexible schema, horizontal scaling, good for prototype
- Cons: No transactions, no foreign keys, team has less expertise
- Rejected: Need data consistency; SQL queries are simpler for our use case

### Firebase
- Pros: No ops, fast setup, built-in auth
- Cons: Vendor lock-in, limited query flexibility, more expensive ($100+ queries)
- Rejected: Cost; need complex filtering

---

## Success Criteria

- Query latency p95 < 50ms
- Data consistency: Zero foreign key violations in production
- Uptime: 99.95%

---

## References

- [Task Management Data Model](https://docs.google.com/spreadsheets/...)
- [PoC with Sequelize](https://github.com/org/project/pull/123)
- [Database Comparison](https://db-engines.com/en/ranking)

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Tech Lead | Bob | 2024-03-16 | Approved |
| CTO | Carol | 2024-03-16 | Approved |

---

*This is an example ADR. Use it as a template for your own decisions.*
