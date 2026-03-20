# Repo Map Guide

Use this guide when building a navigable map of the repository or answering
questions like "where does X live?"

## A good repo map includes

- Short repo purpose statement when supported by evidence
- Top-level folder map with responsibilities
- Key modules with likely ownership and entrypoints
- Internal dependency signals
- External systems and infrastructure surfaces
- Critical configuration files
- Weakly documented or high-risk areas

## Recommended repo map sections

1. Overview
2. Top-level structure
3. Key modules
4. Entrypoints and runtime surfaces
5. Dependencies and shared layers
6. Critical configuration
7. Dark zones and uncertainties

## Folder responsibility language

Prefer concise, evidence-based descriptions:

- `apps/`: user-facing applications or deployable app units
- `services/`: runtime services or APIs
- `packages/` or `libs/`: shared libraries and reusable modules
- `workers/`, `jobs/`, `cron/`: background execution surfaces
- `infra/`, `terraform/`, `helm/`, `k8s/`: deployment and infrastructure code
- `docs/`: long-form written context
- `scripts/`, `bin/`, `tools/`: developer or operational automation

If the folder naming is ambiguous, say so instead of forcing a narrative.

## Module table fields

| Field | Meaning |
| --- | --- |
| Path | Where the module lives |
| Kind | App, service, package, worker, infra, docs, or probable variant |
| Responsibility | Best concise explanation supported by the evidence |
| Entrypoints | Files or directories that appear to start or expose behavior |
| Depends on | Known or probable internal dependencies |
| Notes | Gaps, uncertainty, or operational importance |

## Dark zones

Call out areas that would slow down a newcomer:

- big folders with little or no docs
- modules with obvious runtime importance but unclear ownership
- deployment or infra code without nearby explanation
- workers, jobs, or queues with unclear triggers
- auth or data layers with no written map
