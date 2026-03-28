# ADR-010: Three-Tier Catalog Availability with Multiple Inventory Layers

**Status**: accepted
**Date**: 2024-01-15

## Context

As the Agentmou catalog grows, agents and workflows progress through different states:
- **Planned**: Roadmap-only (coming soon, no code yet)
- **Preview**: Functional but may have limitations (beta, feedback-driven)
- **Available**: Production-ready (tested, documented, supported)

Simultaneously, the catalog serves multiple audiences:
- **Tenants**: See installable agents (operational + preview)
- **Marketing site**: Shows featured agents and roadmap (all tiers)
- **Internal demo**: Full inventory for testing (all agents and workflows)

A single binary available/unavailable flag is too coarse; this ADR defines a multi-tier system.

## Decision

**Three availability tiers** for catalog items:
1. **Planned**: Roadmap-only, not buildable or testable
2. **Preview**: Functional, available for beta testing, may have limitations
3. **Available**: Production-ready, stable, supported

**Three inventory layers** that surface different subsets:
1. **Operational catalog**: Installable by tenants (available + preview agents/workflows)
2. **Demo catalog**: Full inventory for internal testing and demo purposes (all tiers)
3. **Marketing catalog**: Featured agents and roadmap items for marketing site (carefully curated)

Each agent or workflow has:
```yaml
# manifest.yaml
metadata:
  name: email-classifier
  availability:
    tier: available
    releasedAt: 2024-01-15
  inventory:
    operational: true    # Appears in tenant catalog
    demo: true           # Appears in internal demo
    marketing: true      # Can be featured on marketing site
```

Frontend respects the tier:
```typescript
// apps/web
if (agent.metadata.availability.tier === 'available') {
  // Show in main catalog with full support badge
} else if (agent.metadata.availability.tier === 'preview') {
  // Show with "beta" badge and feedback form
} else if (agent.metadata.availability.tier === 'planned') {
  // Show in roadmap section, "coming soon"
}
```

Inventory layers:
- `operational: true` → Available for tenants to install
- `demo: true` → Available in internal demo (engineers, QA)
- `marketing: true` → Can be featured on public marketing site (CEO's choice)

An agent can be:
- Planned + demo + marketing = Roadmap item on public site
- Preview + operational + demo = Beta agent available to tenants
- Available + operational + demo + marketing = GA agent available everywhere

## Alternatives Considered

1. **Binary available/unavailable**:
   - Pros: Simple to implement
   - Cons: No room for preview/beta, hard to coordinate marketing and product

2. **Feature flags per platform**:
   - Pros: Maximum flexibility
   - Cons: Complex config, hard to understand which combination is correct

3. **Separate catalogs** (beta.agentmou.io, demo.agentmou.io):
   - Pros: Clear separation
   - Cons: Fragmented user experience, harder to migrate agents between catalogs

## Consequences

- **Gradual rollout**: Agents can be "previewed" to a subset of tenants while the team gathers feedback.
- **Marketing flexibility**: Product managers can feature roadmap items on the marketing site without agents being installable.
- **Demo independence**: Engineering can test agents in the full inventory without exposing them to customers.
- **Clear communication**: Tiers signal maturity to tenants ("beta" vs "production-ready").
- **Inventory config**: Each agent must declare its tier and inventory participation in manifest.yaml.
- **Tooling**: Dashboard or CLI tool to manage tier and inventory flags (mark agent as GA, remove from preview, etc.).

This approach supports a product-driven launch strategy: test with a preview tier, gather feedback, then promote to available with confidence.
