# PR-06: Admin UI polish

## Objetivo

Aplicar los tokens semánticos de PR-05 a las pantallas de admin. Elevar la jerarquía
visual, consistencia y densidad, sin cambio funcional. Esta PR es la que convierte
el admin de "funcional" a "profesional".

## Contexto

**URLs ya canónicas**: `/admin/tenants/...` está en sitio tras PR-04. Esta PR solo
toca look & feel, no routing.

Audit de pantallas del área admin (ver `00-audit.md`, sección 7):
- `admin-tenants-page.tsx`: 11/20. Tabla plana, filtros sin agrupar, 3 cards
  informativas al final que son deadweight.
- `admin-tenant-detail-page.tsx`: 10/20. Dialogs amontonados, cards de usuarios
  repetitivas sin jerarquía, sin panel lateral.

## Alcance

### Sí entra
- Rediseño de layout de lista de tenants (header, filtros, tabla, estado vacío).
- Rediseño de detalle de tenant con layout 2-cols desktop / stacked mobile.
- Skeleton loaders donde hoy hay texto "Cargando...".
- a11y pass: todos los icon-only buttons con `aria-label`, focus rings consistentes.
- Impersonation banner elevado con `--warning-subtle` y CTA claro.
- Eliminación de las 3 cards informativas al pie de la lista (son repetición).

### No entra
- Cambios funcionales (endpoints, lógica de filtros, nuevas columnas).
- Features page (ya entregada en PR-04).
- Clinic shell (PR-07).

## Cambios técnicos

### `apps/web/components/admin/admin-tenants-page.tsx`

Estructura objetivo:

```
┌─────────────────────────────────────────────────────┐
│ Breadcrumb: Admin > Tenants                         │
│ H1 Tenants                                          │
│ Subtitle muted                                      │
├─────────────────────────────────────────────────────┤
│ [Search input]   [Plan] [Vertical] [Type]  [Clear]  │
├─────────────────────────────────────────────────────┤
│ Name / ID             Plan   Vertical   Users  Tags │
│ ─────────────────────────────────────────────────── │
│ Acme Clinic           Pro    clinic     12     👑   │
│ acme-clinic-xxxx                                    │
│ ...                                                 │
└─────────────────────────────────────────────────────┘
```

Cambios:
- Header con `--text-3xl` y breadcrumb con `--text-secondary`.
- Filtros agrupados en `Card variant="subtle" padding="sm"` con gap consistent.
- Botón "Clear filters" cuando hay alguno activo.
- Tabla con `Card variant="default"`, filas con `hover:bg-card-hover`.
- IDs en `<code>` con `font-mono text-xs text-muted-foreground`.
- Badges tonales:
  - Plan → `tone="neutral" variant="outline"`.
  - Vertical → `tone="info"`.
  - Admin tenant → `tone="warning"` con icono crown.
- Empty state con icono + frase corta + CTA "Clear filters".
- Skeleton rows (4 filas) cuando `isLoading`.
- Quitar las 3 Cards informativas del pie (llevan a nada accionable).

### `apps/web/components/admin/admin-tenant-detail-page.tsx`

Estructura objetivo (desktop):

```
Breadcrumb: Admin > Tenants > Acme Clinic
[H1 Acme Clinic]   [Start impersonation]  [Change vertical]
┌─────────────────────────┬───────────────────────────────┐
│ Users                   │ Tenant info                   │
│  ┌───────────────────┐  │ Plan: Pro                     │
│  │ User row          │  │ Vertical: clinic (edit)       │
│  │ User row          │  │ Created: ...                  │
│  │ User row          │  │                               │
│  └───────────────────┘  │ Features                      │
│  + Add user             │ (link to features tab)        │
│                         │                               │
│                         │ Impersonation sessions        │
│                         │ (last 5)                      │
└─────────────────────────┴───────────────────────────────┘
```

Cambios:
- Header con tenant name + acciones primarias visibles (no solo en menús).
- 2 columnas grid (`grid-cols-1 lg:grid-cols-[2fr_1fr]`).
- User list como tabla con hover row actions (edit/delete con `DropdownMenu`).
- Panel lateral: info + shortcuts a features + impersonation history (si aplica).
- Dialog de create/edit user con `Card variant="overlay"` padding consistent.
- Alert de activación más tonal (`tone="success-subtle"`).

### Componentes reutilizables nuevos (si procede)

- `components/admin/tenants-table.tsx` — extracto de la tabla si gana independiente.
- `components/admin/tenant-info-panel.tsx` — panel lateral.

Mantener scope razonable: si el PR se infla > 400 líneas, partir.

### a11y pass

- `<Button variant="ghost" size="icon">` de notificaciones, user menu, etc: añadir
  `aria-label`.
- Focus rings con `focus-visible:ring-2 focus-visible:ring-ring` consistent (viene
  del token nuevo `--ring`).
- Impersonation banner con `role="alert"` y `aria-live="polite"`.

### Skeletons

- Reemplazar `"Cargando tenants..."` y `"Cargando..."` por `<Skeleton>` filas.
  `components/ui/skeleton.tsx` ya existe.

## Decisiones de diseño

### ¿Eliminar las 3 Cards informativas al pie de la lista?

**Decisión: sí.** Son descriptivas, no accionables. Repiten información que el header
y los badges ya transmiten. Si se necesita documentación, va en el subtitle.

**Alternativa:** moverlas a un `<HelpPopover>`. Descartada por ahora; YAGNI.

### ¿Acciones primarias en header o en row actions?

**Decisión: ambos.** "Start impersonation" y "Change vertical" son las dos acciones
principales del detalle → botones visibles. Edit/delete de usuarios son secundarias
→ dropdown por row.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| PR grande, review difícil | Commits separados por pantalla (list → detail → dialogs) |
| Dialog de create-user rompe con nuevo padding | Tests manuales tanto alta como edición |
| Impersonation banner regresa un detalle crítico | No tocar el `impersonation-banner.tsx` en esta PR más allá del tone |

## Criterios de aceptación

- [ ] Lista de tenants con header + breadcrumb + filtros agrupados + tabla con jerarquía.
- [ ] Detalle con 2 columnas en desktop y layout stacked en mobile.
- [ ] Badges tonales aplicados según la semántica (plan/vertical/admin).
- [ ] Skeleton loaders visibles en estados de carga.
- [ ] Todos los icon-buttons tienen `aria-label`.
- [ ] Screenshot antes/después adjunto en el PR body.
- [ ] Modo dark visual OK.

## Plan de pruebas

**Visual:**
- Screenshots comparativos: lista (light+dark), detalle (light+dark), dialogs.

**Manual:**
- Alta de usuario → alert verde.
- Editar rol de usuario → update inline.
- Cambiar vertical → refleja en la tabla al volver.
- Start/stop impersonation → banner cambia estado.
- Mobile (iPhone SE): layout stacked usable.

**a11y:**
- Tab navigation por la pantalla; focus ring visible.
- VoiceOver / NVDA announce tabs y row actions.

## Rollback plan

- Revert. No hay migración de datos ni cambio de API.
