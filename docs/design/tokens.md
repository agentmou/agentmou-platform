# Design Tokens

The Agentmou design system lives in
[`apps/web/app/globals.css`](../../apps/web/app/globals.css). PR-05
layered a **semantic token set** on top of the existing palette so new
work can describe intent (`surface-raised`, `border-subtle`,
`text-secondary`, `info-subtle`) rather than reaching for raw colour
classes. Every legacy token (`--card`, `--muted`, `--border`, `--accent`,
…) is preserved unchanged — the new tokens are additive.

## How to use

| You want | Token | Tailwind utility |
| --- | --- | --- |
| Default page card | `--surface-raised` | `bg-surface-raised` |
| Filter bar inside a card | `--surface-subtle` | `bg-surface-subtle` |
| Dialog / popover top layer | `--surface-overlay` | `bg-surface-overlay` |
| Neutral list border | `--border-default` | `border-border-default` |
| Soft separator | `--border-subtle` | `border-border-subtle` |
| Elevated separator (table headers) | `--border-strong` | `border-border-strong` |
| Headline copy | `--text-primary` | `text-text-primary` |
| Body copy | `--text-secondary` | `text-text-secondary` |
| Metadata, captions | `--text-muted` | `text-text-muted` |
| Info badge / banner | `--info`, `--info-subtle` | `bg-info-subtle text-info` |
| Success badge / banner | `--success`, `--success-subtle` | `bg-success-subtle text-success` |
| Warning badge / banner | `--warning`, `--warning-subtle` | `bg-warning-subtle text-warning-foreground` |
| Destructive badge / alert | `--destructive`, `--destructive-subtle` | `bg-destructive-subtle text-destructive` |
| Pill radius | `--radius-pill` | `rounded-pill` |

## Card variants

[`Card`](../../apps/web/components/ui/card.tsx) accepts two new optional
props:

```tsx
<Card variant="raised" padding="md" />   // bg-surface-raised + shadow
<Card variant="subtle" padding="sm" />   // bg-surface-subtle, no shadow
<Card variant="outline" />               // transparent fill, default border
<Card variant="ghost" />                 // no chrome at all
<Card />                                 // identical to today's default
```

Padding maps to: `none` → `py-0`, `sm` → `py-4`, `md` → `py-6`,
`lg` → `py-8`. The legacy `py-6` is the default.

## Badge tones

[`Badge`](../../apps/web/components/ui/badge.tsx) keeps its `variant`
prop (`default`, `secondary`, `destructive`, `outline`) and adds a
`tone` prop (`neutral`, `info`, `success`, `warning`, `destructive`).

```tsx
<Badge tone="success">Activo</Badge>          // bg-success-subtle text-success
<Badge tone="warning">Pendiente</Badge>       // bg-warning-subtle text-warning-foreground
<Badge tone="info">Nuevo</Badge>              // bg-info-subtle text-info
<Badge variant="outline" tone="info">Beta</Badge>  // transparent fill, tonal border
<Badge>Default</Badge>                        // unchanged from today
```

When `tone` is `neutral` (the default), the badge looks identical to its
pre-PR-05 self.

## Anti-patterns

- **Don't** introduce a new shade (`bg-blue-50`, `border-amber-300`, …)
  inline. Pick the closest semantic token; if none fits, propose a new
  one in this file.
- **Don't** mix `bg-card` and `bg-surface-raised` in the same screen —
  they currently resolve to the same colour but the semantic name is
  what survives a future palette swap.
- **Don't** build a one-off `<StatusBadge>` / `<RiskBadge>` /
  `<StatusPill>` component for the next state name. The legacy
  `apps/web/components/badges.tsx` family is scheduled for
  consolidation in PR-07; new code should use `<Badge tone="…">` from
  `@/components/ui/badge` directly.

## Migration plan

PR-05 ships the foundation only — no consumer screens were rewritten in
this PR. The first wave of migration lands in:

- **PR-06** (Admin polish) — admin tenants list + detail + features.
- **PR-07** (Clinic dashboard polish) — stats cards, inbox, agenda, sidebar.

Each of those PRs will move 4–6 surfaces to the new tokens, validate
visually, and shrink `apps/web/components/badges.tsx` accordingly.

## Related

- [`apps/web/components/ui/card.tsx`](../../apps/web/components/ui/card.tsx)
- [`apps/web/components/ui/badge.tsx`](../../apps/web/components/ui/badge.tsx)
- [PR-05 plan](../plan/pr-05-design-tokens-and-primitives.md)
- [Audit §7 — tokens carencias](../plan/00-audit.md)
