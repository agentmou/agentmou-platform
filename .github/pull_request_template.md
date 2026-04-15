## Summary

<!-- What changed and why (1–3 short paragraphs). -->

## Scope

<!-- Which workspaces or surfaces are affected (e.g. apps/web, services/api, infra). -->

## Risks / regressions

<!-- What could break, rollout notes, feature flags, backwards compatibility. -->

## Operational impact

<!-- Check all that apply and add details in comments or below. -->

- [ ] Env vars (`docs/environment-variables.md`)
- [ ] Hosts / redirects / CORS / cookies (marketing vs app vs API)
- [ ] Auth / sessions / OAuth callbacks
- [ ] Feature flags / Reflag / entitlements
- [ ] Database migrations or seeds
- [ ] Infra / Compose / deploy scripts

## How to test

<!-- Manual steps and/or test commands reviewers can run. -->

## Screenshots / recordings

<!-- Required for user-visible UI changes; otherwise write N/A. -->

## Checklist

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `make validate-content` (when docs/YAML under validation paths change)
- [ ] No secrets, tokens, or production URLs committed
- [ ] PR title follows Conventional Commits (see [Contributing](docs/contributing.md))

## Notes for reviewers

<!-- Optional: design trade-offs, follow-ups, links to issues. -->
