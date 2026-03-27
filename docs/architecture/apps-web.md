# `apps/web` Architecture

This document describes the current `apps/web` structure after the product,
demo, and mock-boundary cleanup.

## Purpose

`apps/web` is a single Next.js app with three explicit surface families:

- marketing pages under `app/(marketing)`
- auth flows under `app/(auth)` plus standalone callback/reset routes
- tenant-scoped control-plane pages under `app/app/[tenantId]`

The app is intentionally a UI/control-plane client. It does not execute agents
or workflows itself.

## Contract Boundary

`apps/web` depends on `@agentmou/contracts` for shared domain types. The local
entrypoint for those types is `lib/control-plane/types.ts`, which re-exports
the canonical contracts for UI consumers.

The web-side API boundary is intentionally defensive:

- `lib/api/client.ts` fetches the API
- responses are parsed through shared contract schemas
- tenant pages consume transport-neutral `DataProvider` methods rather than raw
  fetch calls

## Routing Structure

- `app/(marketing)/...`
  - public product narrative, docs, pricing, and security pages
- `app/(auth)/...`
  - login and registration UI
- `app/auth/callback`
  - OAuth return handling
- `app/reset-password`
  - password reset deep link
- `app/app/[tenantId]/...`
  - tenant dashboard, marketplace, installer, fleet, runs, approvals,
    observability, security, and settings
- `app/api/chat/route.ts`
  - explicitly mock-backed assistant route

## Data Provider Architecture

The active app no longer routes product pages through a generic
`control-plane/read-model` layer. The current split is:

- `lib/data/provider.ts`
  - transport-neutral `DataProvider` interface for product pages
- `lib/data/api-provider.ts`
  - real API-backed implementation for authenticated tenants
- `lib/data/demo-provider.ts`
  - demo-workspace overlay that forces non-operational assets to
    `availability: planned`
- `lib/data/mock-provider.ts`
  - async wrapper over demo read-model selectors for marketing/demo-only flows
- `lib/providers/*`
  - route-facing provider selection (`apiProvider`, `demoProvider`,
    `mockProvider`, `getTenantDataProvider`)
- `lib/demo/read-model.ts`
  - synchronous demo/mock selectors used only behind `mockProvider`

This split keeps demo data explicit and prevents product pages from importing
demo catalog fixtures directly.

## Demo, Marketing, And Honest UI

- `lib/demo-catalog/*` holds the broad demo inventory used for marketing and
  `demo-workspace`
- `lib/marketing/*` builds homepage/public-catalog payloads from the curated
  featured set
- `lib/honest-ui/*` is the audit map for surfaces that are preview,
  read-only, demo, or otherwise not fully backed by the platform

The main product rule is: demo inventory is allowed, but only through explicit
demo or marketing boundaries.

## Component And Folder Guidance

- `components/ui/*`
  - current shared UI primitive layer for the app
- `components/auth/*`
  - login, registration, password reset, and OAuth-adjacent UI
- `components/control-plane/*`
  - app shell and command palette
- `components/brand/*`
  - marketing-only visual system
- `components/chat/*`
  - mock assistant UI
- `lib/auth/*`
  - browser auth API calls, cookie helpers, Zustand auth state
- `lib/chat/*`
  - mock assistant behavior and state
- `lib/catalog/*`
  - catalog-specific UI helpers such as listing availability
- `lib/search-index.ts`, `lib/saved-views.ts`, `lib/utils.ts`
  - local UI support modules

There is no live `packages/ui` boundary right now. Reusable UI primitives live
in `apps/web/components/ui/`.

## Patterns To Follow

- Keep product, demo, and marketing concerns in their explicit folders.
- Prefer `DataProvider` methods in pages and route-facing components.
- Import shared domain types through `@/lib/control-plane/types`.
- Keep tenant awareness explicit in route params and provider selection.
- Use the honest-surface audit when a screen is backed by preview or synthetic
  behavior.

## Anti-Patterns To Avoid

- Importing `lib/demo-catalog/*` directly from authenticated tenant pages
- Reintroducing a generic `shared` or `control-plane/read-model` bucket for
  unrelated concerns
- Building new product flows on top of `mockProvider`
- Recreating a shared UI workspace package before there is a real second
  consumer
- Defining local copies of types that already exist in `@agentmou/contracts`
