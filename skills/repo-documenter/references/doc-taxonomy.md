# Documentation Taxonomy and Audit

Use this guide when auditing what documentation exists and what should be added
next.

## Categories

| Category | Purpose | Common homes |
| --- | --- | --- |
| Functional docs | Explain what the product or feature does | `README.md`, feature docs, user-facing docs |
| Technical docs | Explain code structure and implementation details | `docs/`, package READMEs, inline docs |
| Architecture docs | Explain boundaries, flows, dependencies, and tradeoffs | `docs/architecture*`, ADRs |
| Operational docs | Explain how to run, recover, deploy, and observe the system | runbooks, deployment docs, troubleshooting |
| Onboarding docs | Help new contributors become productive | onboarding guides, contributor guides |
| Testing docs | Explain how to validate changes and read the test suite | testing docs, quality docs |
| Conventions docs | Explain repo norms and standards | contributing docs, style guides |
| ADRs | Capture decisions with durable tradeoffs | `docs/adr/` |

## Audit checklist

1. Is there a root orientation doc?
2. Is the repo structure explained in a navigable way?
3. Are important modules or services documented where they live?
4. Are architecture boundaries and main flows described?
5. Can a new engineer run, test, and debug the project locally?
6. Are deployment and operational expectations documented?
7. Are major decisions captured in ADRs when the repo has durable tradeoffs?
8. Are there stale docs that conflict with the code?

## High-value gaps first

Prioritize fixes in this order unless the user narrows the scope:

1. Root orientation and repo map
2. Architecture overview for multi-module or multi-runtime repos
3. Module or service docs for the most important code areas
4. Testing, onboarding, and local run instructions
5. Deployment, runbooks, and troubleshooting
6. Glossary and ADR backfill

## What strong documentation should answer

- What does this repo do?
- How is it organized?
- Where does a request or event enter?
- Which modules own which responsibilities?
- What depends on what?
- Which config is critical?
- What should a newcomer read first?
- What is still unclear?

## Red flags

- Multiple docs explain the same thing differently
- README files that only list commands without context
- Architecture docs with no path references
- Operational docs that omit failure modes or recovery triggers
- Large modules with code but no local docs
- Build or deployment automation with no written explanation
