# Agentmou Runbooks

Runbooks are step-by-step guides for common operational and development tasks. Select a runbook based on what you need to do.

## Development

- **[Local Development Setup](./local-development.md)**: Complete guide to set up your development environment, start services, and run the platform locally.
- **[Agent Authoring](./agent-authoring.md)**: Create new agents or workflows, test them locally, and promote them to the catalog.
- **[Security and Dependencies](./security-dependencies.md)**: Audit and update dependencies, manage security vulnerabilities, and review dependency overrides.

## Operations and Deployment

- **[Deployment to Production](./deployment.md)**: Deploy the platform to production on a VPS. Covers initial setup, standard deployment procedures, health verification, and rollback.
- **[VPS Operations](./vps-operations.md)**: Manage the production VPS after deployment. Covers server configuration, networking, backups, monitoring, and certificate management.

---

## Quick Reference

| Task | Runbook | Audience |
| ------ | --------- | ---------- |
| Set up local dev environment | [Local Development](./local-development.md) | Engineers, contributors |
| Run tests locally | [Local Development](./local-development.md) | Engineers |
| Create a new agent | [Agent Authoring](./agent-authoring.md) | Product, engineers |
| Test an agent before promotion | [Agent Authoring](./agent-authoring.md) | Engineers, QA |
| Deploy a new release to production | [Deployment](./deployment.md) | DevOps, engineers |
| Check production health | [Deployment](./deployment.md) | On-call, DevOps |
| Verify certificates are renewing | [VPS Operations](./vps-operations.md) | DevOps |
| Restore from backup | [VPS Operations](./vps-operations.md) | DevOps |
| Audit dependencies for vulnerabilities | [Security and Dependencies](./security-dependencies.md) | Engineers, DevOps |
| Rotate OAuth encryption key | [VPS Operations](./vps-operations.md) | DevOps, engineers |
| Debug production issue | [Deployment](./deployment.md) and [VPS Operations](./vps-operations.md) | On-call engineer |

---

## When to Use Each Runbook

### Are you developing locally?
Start with **[Local Development Setup](./local-development.md)**.

### Are you creating or testing agents?
Use **[Agent Authoring](./agent-authoring.md)**.

### Are you deploying to production?
Use **[Deployment to Production](./deployment.md)** for the deployment procedure and **[VPS Operations](./vps-operations.md)** for post-deployment management.

### Are you managing the production server?
Use **[VPS Operations](./vps-operations.md)** for networking, backups, monitoring, and maintenance.

### Are you reviewing or updating dependencies?
Use **[Security and Dependencies](./security-dependencies.md)**.

---

## Related Documentation

- [Architecture Overview](../architecture/overview.md): High-level design of the platform
- [Architectural Decision Records (ADRs)](../adr/): Key decisions and their rationale
- [Main README](../../README.md): Project overview and quick start
