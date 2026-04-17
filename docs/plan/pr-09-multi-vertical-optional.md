# PR-09: (Opcional) Soporte multi-vertical por tenant

## Objetivo

Permitir que un tenant tenga dos o más verticales activas simultáneamente
(ej. un grupo sanitario que opera dental + fisio bajo la misma razón social).

## Contexto

- `tenant_vertical_configs` ya existe en el schema
  (`packages/db/src/schema.ts:48`) pero no se usa.
- El frontend consume `verticalConfig.active` + `verticalConfig.enabled` tras
  PR-02, pero hoy `enabled = [active]` siempre.
- No hay cliente que pida esto todavía → PR parqueada hasta demanda real.

## ⚠️ Criterio de arranque

**No arrancar hasta que haya un cliente piloto comprometido.** Construir
multi-vertical sin uso real es deuda de producto — las decisiones de UX
(qué se comparte entre verticales, qué no) se hacen mejor con un caso concreto
delante.

## Alcance

### Sí entra
- Escrituras en `tenant_vertical_configs` — fuente de verdad de las verticales
  enabled por tenant.
- `GET /api/v1/tenants/:id/verticals` devuelve `{ enabled: [...], active }`
  con `enabled.length >= 1`.
- Admin UI para **añadir/quitar verticales enabled** a un tenant (desde el
  detalle).
- Selector de vertical activa en el topbar (cuando el tenant tiene 2+).
- Persistencia de la vertical activa por usuario (preferencia local o en
  memberships).

### No entra
- Migración de datos de tenants existentes (todos tienen 1 vertical — no
  hay que mover nada).
- Interoperabilidad cross-vertical (ej. compartir pacientes entre dental y
  fisio). Eso sería otra PR grande.
- Fisio-specific product features.

## Cambios técnicos

### Backend

- `services/api/src/modules/tenants/tenants.routes.ts`:
  - `GET /:id/verticals` lee de `tenant_vertical_configs` con fallback a
    `settings.activeVertical` → `enabled = [active]`.
  - `PATCH /:id/verticals/enable` (admin only) añade una vertical a la lista.
  - `PATCH /:id/verticals/disable` quita (con validación: no puedes quitar
    la active; cámbiala primero).
  - `PATCH /:id/verticals/active` cambia la active (solo si está en enabled).
- Escrituras van a `tenant_vertical_configs` con upsert.
- `services/api/src/modules/admin/admin.routes.ts`:
  - Endpoints admin-scoped para las mismas operaciones, con logging de
    actor.

### Frontend

- `apps/web/components/clinic/clinic-topbar.tsx` + `control-plane/app-shell.tsx`:
  - Nuevo selector de vertical cuando `enabled.length > 1`.
  - UI: dropdown "Cambiar experiencia" con las verticales enabled.
  - Persiste preferencia en localStorage (`activeVerticalByTenant[tenantId]`).
- `apps/web/lib/tenant-experience.tsx`:
  - `useResolvedTenantExperience` toma la vertical activa del localStorage
    si está; si no, fallback a `verticalConfig.active` del backend.
- `apps/web/components/admin/admin-tenant-detail-page.tsx`:
  - Sección "Verticales enabled" con checkboxes por vertical, indicador de
    active.
- Route guard: si el user intenta navegar a `/app/t/<vertical-route>` y la
  vertical no está enabled, redirige al `defaultRoute` de la active.

### DB

- Sin cambios de schema.
- Escrituras en `tenant_vertical_configs` con seed-on-write (crear row si no
  existe para cada verticalKey enabled).

## Decisiones de diseño

### ¿Una fila por vertical enabled o una columna booleana?

**Decisión: una fila por vertical enabled** (como ya está el schema). Permite
`config` por vertical (ej. timezone, business hours por vertical cuando haga
falta).

### ¿Vertical activa per-user o per-tenant?

**Decisión: per-user** (localStorage inicialmente). Razón: un owner puede
operar dental y fisio alternando; forzar un "active" a nivel tenant es rígido.
Fallback al default del tenant si no hay preferencia.

**Alternativa:** persistir en `memberships.settings`. Más robusto a cambio de
device pero más código. Diferir.

### ¿Qué se comparte entre verticales del mismo tenant?

- Identidad (nombre, razón social, admins).
- Configuración de canales (si una clínica tiene WhatsApp compartido entre
  dental y fisio → sí; si quiere separados → columnas `verticalKey` en
  `clinic_channels`).

Esta decisión requiere producto (Q6).

## Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| UX confusa si el selector de vertical no es evidente | Validar con usuarios del piloto antes de generalizar |
| Datos de dental filtrados en UI fisio (o viceversa) | Todas las queries scopean por vertical — audit completo de queries clínicas |
| Permissions crosseados | Role+vertical en `memberships` — si se implementa, añadir scope. Para MVP asumimos same role en todas las verticales |

## Criterios de aceptación

- [ ] `GET /verticals` devuelve enabled real de DB.
- [ ] Admin UI permite añadir/quitar verticales (con validación).
- [ ] Topbar muestra selector cuando hay 2+ enabled.
- [ ] Navegación a una vertical no enabled redirige al default.
- [ ] Tests: casos con 1, 2, 3 verticales enabled.
- [ ] Doc `docs/product/multi-vertical.md`.

## Plan de pruebas

**Integration:**
- Enable fisio + clinic en un tenant → usuario ve selector → cambiar → UI pivota.
- Disable active → backend debe rechazar (error claro).

**Manual piloto:**
- Onboarding guiado para el primer cliente.
- Feedback loop de 2-4 semanas antes de generalizar.

## Rollback plan

- Revert del PR. `tenant_vertical_configs` queda con filas huérfanas inofensivas.
- Posible migración down: borrar rows creadas durante el piloto si se desecha
  la feature.
