# PR-05: Design tokens semánticos + refactor Card/Badge

## Objetivo

Ampliar `globals.css` con tokens **semánticos** (surface, border, text, radius, type
scale, estados subtle), arreglar la fuga `--surface-card` solo en `.dark`, y
refactorizar `Card` y `Badge` para consumirlos. Consolidar los componentes custom
duplicados (`status-badge`, `risk-badge`, parte de `badges.tsx`).

## Contexto

Análisis de tokens en el audit:
- Solo 3 capas de superficie (`background`, `card`, `muted`) sin `raised`/`subtle`/
  `overlay`.
- Borders únicos (`--border`) usados con modificadores inline (`/60`, `/30`).
- Radius `0.375rem` derivado por suma (sm, md, lg, xl) — insuficiente para distinguir
  dialog vs card vs input.
- Tipografía mixta — existe `.text-editorial-*` pero el resto es ad-hoc.
- `--surface-card` solo definido en `.dark` (`globals.css:77`), ausente en `:root`.

Componentes problemáticos:
- `components/badges.tsx` (11.8 KB).
- `components/status-badge.tsx` (2.5 KB).
- `components/ui/risk-badge.tsx` (2.6 KB).
- `components/honest-surface.tsx` (2.3 KB) — usa `--surface-card` en dark.

## Alcance

### Sí entra
- Tokens nuevos en `globals.css` (light + dark, paridad completa).
- Refactor `Card` (`components/ui/card.tsx`) con `variant` prop.
- Refactor `Badge` (`components/ui/badge.tsx`) con `tone` prop.
- Consolidación: `status-badge`, `risk-badge` reemplazados por `<Badge tone="...">`;
  `badges.tsx` reducido a exports re-routed al nuevo Badge.
- Doc `docs/design/tokens.md`.
- Migración mínima de 5-6 pantallas que ya consuman.

### No entra
- Rediseño de pantallas (PR-06/07).
- Cambio de paleta base (gris + mint se mantiene; son tokens, no colores nuevos).
- Custom iconos / ilustraciones.

## Cambios técnicos

### `apps/web/app/globals.css`

Añadir en `:root` y `.dark`:

```css
:root {
  /* Surfaces — jerarquía de profundidad */
  --surface-base: var(--background);
  --surface-subtle: #f8f9fb;       /* entre card y background */
  --surface-raised: var(--card);   /* card actual */
  --surface-overlay: #ffffff;      /* popover/dialog */

  /* Borders — por contraste */
  --border-subtle: #e5e7eb;
  --border-default: var(--border);
  --border-strong: #9ca3af;

  /* Text roles */
  --text-primary: var(--foreground);
  --text-secondary: #374151;
  --text-muted: var(--muted-foreground);
  --text-inverse: var(--primary-foreground);

  /* Radius — explícitos, no derivados */
  --radius-xs: 0.25rem;
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
  --radius-2xl: 1.25rem;
  --radius-pill: 9999px;

  /* Estados subtle (backgrounds) */
  --info: #3b82f6;
  --info-foreground: #ffffff;
  --info-subtle: #eff6ff;
  --success-subtle: #ecfdf5;
  --warning-subtle: #fffbeb;
  --destructive-subtle: #fef2f2;

  /* Type scale */
  --text-xs:  0.75rem / 1.1rem;
  --text-sm:  0.875rem / 1.3rem;
  --text-base: 1rem / 1.5rem;
  --text-md:  1.125rem / 1.6rem;
  --text-lg:  1.25rem / 1.75rem;
  --text-xl:  1.5rem / 2rem;
  --text-2xl: 1.875rem / 2.25rem;
  --text-3xl: 2.25rem / 2.5rem;
}

.dark {
  --surface-base: var(--background);
  --surface-subtle: #13161b;
  --surface-raised: var(--card);         /* fix — estaba solo aquí antes pero inconsistente */
  --surface-overlay: var(--popover);

  --border-subtle: #22262e;
  --border-default: var(--border);
  --border-strong: #3a414d;

  --text-primary: var(--foreground);
  --text-secondary: #d1d5db;
  --text-muted: var(--muted-foreground);
  --text-inverse: var(--primary-foreground);

  --info: #60a5fa;
  --info-foreground: #0f1115;
  --info-subtle: #1e293b;
  --success-subtle: #064e3b;
  --warning-subtle: #78350f;
  --destructive-subtle: #450a0a;
}
```

Y extender `@theme inline` con los nuevos colors.

### `apps/web/components/ui/card.tsx`

Variantes con CVA:

```tsx
const cardVariants = cva('rounded-lg border transition-colors', {
  variants: {
    variant: {
      default: 'bg-surface-raised border-border-default',
      raised:  'bg-surface-raised border-border-default shadow-sm',
      subtle:  'bg-surface-subtle border-border-subtle',
      outline: 'bg-transparent border-border-default',
      ghost:   'bg-transparent border-transparent',
    },
    padding: {
      none: 'p-0',
      sm:   'p-4',
      md:   'p-6',
      lg:   'p-8',
    },
  },
  defaultVariants: { variant: 'default', padding: 'md' },
});
```

API público no rompe (props existentes siguen funcionando). Nuevos consumidores
usan `variant`.

### `apps/web/components/ui/badge.tsx`

```tsx
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      tone: {
        neutral:    'bg-muted text-muted-foreground',
        info:       'bg-info-subtle text-info',
        success:    'bg-success-subtle text-success',
        warning:    'bg-warning-subtle text-warning',
        destructive:'bg-destructive-subtle text-destructive',
      },
      variant: {
        solid:   '',
        outline: 'border bg-transparent',
      },
    },
    defaultVariants: { tone: 'neutral', variant: 'solid' },
  }
);
```

### Consolidación

- `components/status-badge.tsx` — **borrar**. Sus usos pasan a
  `<Badge tone="..." />`.
- `components/ui/risk-badge.tsx` — **borrar**. Idem.
- `components/badges.tsx` — reducir a re-exports legacy que usan el nuevo Badge bajo
  el capó. Deprecación soft con `@deprecated` JSDoc.
- `components/honest-surface.tsx` — usa nuevos tokens.

### Doc `docs/design/tokens.md`

Tabla con todos los tokens, ejemplo de uso, antipatterns.

## Decisiones de diseño

### ¿Tokens CSS o valores hardcodeados en Tailwind config?

**Decisión: CSS custom properties.** Next+Tailwind v4 ya usa `@theme inline` y
Agentmou ya tiene tokens así. Mantiene paridad light/dark trivial y es lo que shadcn
usa.

### ¿Variante Card `raised` siempre con shadow?

**Decisión: sí.** El uso real en admin pinta `Card` planas sin jerarquía, lo que
ocurre con todas a la misma altura visual. `raised` aporta elevation obvia.

### ¿Eliminar `status-badge.tsx` o mantener como deprecated wrapper?

**Decisión: eliminar tras migración inline.** 4 usos en el repo (grep rápido; a
verificar en el PR). Menos riesgo eliminar limpio que mantener un wrapper zombi.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Cambio de token de `--surface-card` rompe componentes existentes | Mantener `--card` y `--card-foreground` como alias |
| Radius nuevos rompen alineación ad-hoc en pricing page | Testear la pricing page manualmente; los `rounded-[26px]` ad-hoc siguen vivos |
| Migración de 5-6 pantallas trae muchas líneas al diff | Partir en PR-05a (tokens + primitives) + PR-05b (migración) si excede 400 líneas |

## Criterios de aceptación

- [ ] `globals.css` con los nuevos tokens en `:root` y `.dark`.
- [ ] `--surface-card` existe en ambos modos (bug del audit corregido).
- [ ] `Card` y `Badge` exponen nuevas variants sin romper API existente.
- [ ] `status-badge.tsx` y `risk-badge.tsx` eliminados.
- [ ] 5-6 pantallas visibles consumen los nuevos tokens (admin list + detail,
  clinic dashboard, clinic inbox, pricing).
- [ ] Modo dark visualmente coherente (sin lavado de fondos).
- [ ] `docs/design/tokens.md` publicado.
- [ ] Bundle size no crece más de +2KB gzip.

## Plan de pruebas

**Unit:**
- Tests existentes pasan.
- Snapshot de Card y Badge variants.

**Visual:**
- Storybook (si existe) o screenshots antes/después subidos al PR body.

**Manual:**
- Toggle light/dark en cada pantalla consumidora.
- Scrollar en tenant detail y verificar jerarquía visible.

## Rollback plan

- Revert PR. Los tokens viejos siguen en el CSS (no los borro, solo añado).
