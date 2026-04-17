# 00 — Auditoría del repo (estado real, 2026-04-17)

> **Alcance.** Esta auditoría cubre `apps/web` (Next 16 + App Router), `services/api`
> (Fastify), `packages/db` (Drizzle), y los docs existentes. No cubre `services/worker`
> ni `services/agents` más allá de inventariarlos, porque el trabajo pedido es frontend,
> auth, verticales, admin, Reflag y estética.
>
> **Fuente de verdad.** Cada afirmación sobre el código actual va con `file:line`.
> Cada asunción sin evidencia directa en el repo se marca `ASUNCIÓN:` explícitamente.

---

## 1. Arquitectura y stack real

### Monorepo (no lo que dice el README, lo que ve la CI)

- `pnpm@9.15.0` con workspaces en `apps/*`, `packages/*`, `services/*` (`pnpm-workspace.yaml`).
- Turborepo (`turbo.json`) orquesta `dev|build|lint|typecheck|test`.
- **Lint**: Biome (`biome.json`) + ESLint (`eslint.config.js`) + validación de infra (shell + compose).
- **Tests**: Vitest en TS (`vitest.config.ts`) + `unittest` en Python para `services/agents`.
- **Commits**: Conventional Commits (hay `.claude/rules/git-commit-standards.md`).

### apps/web (el foco de esta auditoría)

- **Next 16.2.3 + React 19.2.4**. Build con `next build --webpack` (no Turbopack).
- **Tailwind v4 + PostCSS** (`postcss.config.mjs`), sin `tailwind.config.ts`. Tokens en
  [`apps/web/app/globals.css`](apps/web/app/globals.css).
- **shadcn/ui**: estilo `new-york`, baseColor `neutral`, RSC on, ~55 componentes en
  [`apps/web/components/ui/`](apps/web/components/ui/). Registrada también la registry
  de `@react-bits` ([`apps/web/components.json`](apps/web/components.json)).
- **Middleware**: Next 16 llama al fichero `proxy.ts` (no `middleware.ts`). Vive en
  [`apps/web/proxy.ts`](apps/web/proxy.ts) y gestiona canonical hosts + gating auth.
- **Auth cliente**: Zustand store en [`apps/web/lib/auth/store.ts`](apps/web/lib/auth/store.ts)
  hidratado vía SSR con [`server-session.ts:9`](apps/web/lib/auth/server-session.ts:9).
  El flujo es cookie `agentmou-session` (HttpOnly) emitida por la API.
- **Routing del area autenticada**: todo cuelga de `/app/[tenantId]/…` con un layout
  que resuelve experiencia y shell por vertical
  ([`apps/web/app/app/[tenantId]/layout.tsx`](apps/web/app/app/[tenantId]/layout.tsx)).

### services/api

- Fastify modular. Módulos relevantes para este plan:
  - `modules/auth/*` — email+password y OAuth Google/Microsoft (ver
    [ADR-011](docs/adr/011-enterprise-auth-strategy.md)).
  - `modules/admin/*` — listing de tenants, cambio de vertical, users, impersonation
    ([`admin.routes.ts`](services/api/src/modules/admin/admin.routes.ts)).
  - `modules/feature-flags/*` — **Reflag ya integrado server-side**
    ([`reflag-provider.ts`](services/api/src/modules/feature-flags/reflag-provider.ts)).
  - `modules/clinic-shared/*` — resuelve entitlements + experience + permissions por tenant.
  - `modules/tenants/*`, `modules/memberships/*`, `modules/clinic-modules/*`,
    `modules/clinic-channels/*`, `modules/clinic-profile/*`.
- Middleware de acceso: `auth.ts`, `tenant-access.ts`, `platform-admin-access.ts`,
  `internal-platform-access.ts` (varios niveles de guardia).

### packages

- `contracts` — Zod + TS types compartidos (tenant, vertical, permissions, admin API).
- `db` — Drizzle schema y migraciones 0000..0007.
- `auth` — helpers JWT.
- `queue` — nombres y payloads de BullMQ.
- `observability` — logger compartido.
- `connectors`, `catalog-sdk`, `agent-engine`, `n8n-client`.

---

## 2. Modelo de datos actual: tenants, users, verticales, entitlements

### Tabla `tenants` ([`packages/db/src/schema.ts:34`](packages/db/src/schema.ts:34))

```ts
tenants = pgTable('tenants', {
  id, name, type, plan ('free'|...|'enterprise'),
  ownerId -> users.id,
  settings: jsonb('settings').default({})    // << aquí vive el contrato semántico
})
```

El `settings` jsonb guarda (vistos en contratos y fallback en auth store):

- `activeVertical: 'internal' | 'clinic' | 'fisio'`
- `isPlatformAdminTenant: boolean`
- `verticalClinicUi`, `clinicDentalMode`, `internalPlatformVisible` — flags **legacy**
  que el front ya no debería usar como fuente principal
  ([`tenant-vertical.ts:5`](apps/web/lib/tenant-vertical.ts:5) sigue soportándolos por
  compatibilidad).
- `timezone`, `defaultHITL`, `logRetentionDays`, `memoryRetentionDays`, `settingsVersion`.

**Hallazgo crítico**: `activeVertical` es un **único valor**, no un array. El
modelo actual asume **una vertical activa por tenant**.

### Tabla `tenant_vertical_configs` ([`packages/db/src/schema.ts:48`](packages/db/src/schema.ts:48))

```ts
tenantVerticalConfigs = pgTable('tenant_vertical_configs', {
  id, tenantId, verticalKey, config: jsonb, ...
  uniqueIndex on (tenantId, verticalKey)
})
```

Existe un placeholder para **config N-por-vertical**, pero el front no lo usa todavía
(grep: 0 referencias en `apps/web`). Es la semilla para soportar N verticales por tenant
en el futuro sin migrar datos. **No hay ninguna lectura ni escritura activa de esta tabla**.

### `tenant_modules` ([`schema.ts:319`](packages/db/src/schema.ts:319))

Modules activables por tenant: `core_reception`, `voice`, `growth`, `advanced_mode`,
`internal_platform`. Con `planLevel`, `status`, `visibleToClient`, `config`.

La combinación plan + módulo + channel activo se resuelve server-side en
[`services/api/src/modules/clinic-shared/clinic-entitlements.ts`](services/api/src/modules/clinic-shared/clinic-entitlements.ts)
mezclando con los **rollouts Reflag** del catálogo
([`feature-flags/catalog.ts`](services/api/src/modules/feature-flags/catalog.ts)).

### Users / memberships / impersonation

- `users` (email+passwordHash), `memberships (tenant, user, role)`, `auth_sessions`,
  `admin_impersonation_sessions` — todos presentes
  ([`schema.ts:20..209`](packages/db/src/schema.ts:20)).
- SSO pre-cableado (`tenant_sso_connections`) pero no implementado (ADR-011 Fase 2).

### Ejes "vertical" vs "entitlement" en el código hoy

El código actual **ya tiene los dos ejes separados**, pero no de forma limpia:

1. **Vertical** = `tenant.settings.activeVertical` (`internal|clinic|fisio`) — guía el
   shell, la navegación y la copy. El registro está hard-coded en
   [`vertical-registry.ts:46`](apps/web/lib/vertical-registry.ts:46).
2. **Entitlements/plan features** = `tenant.plan` × `tenant_modules` × Reflag rollouts
   → `FeatureFlagService.resolveClinicExperience()` → `TenantExperience.flags`
   consumidos por la UI en
   [`tenant-experience.tsx:184`](apps/web/lib/tenant-experience.tsx:184).

**La ortogonalidad que pides ya existe conceptualmente**, pero el frontend mezcla ambos
ejes en `ClinicUiCapabilities` (un objeto con `coreReceptionEnabled`, `voiceEnabled`,
etc. que depende tanto de la vertical como del plan). Para añadir fisio o otra vertical
hay que editar `vertical-registry.ts`, `tenant-routing.ts`, y varios puntos de lógica
(ver §7 hallazgos).

---

## 3. Sistema de rutas actual y sus problemas

### Mapa real

```
Public / Marketing        (agentmou.io)       (apps/web/app/(marketing)/)
  /                       homepage clinic
  /pricing                plan tiers
  /security, /terms, /privacy, /contact-sales, /docs/engine

Auth                      (app.agentmou.io)   (apps/web/app/(auth)/)
  /login
  /register
  /reset-password
  /auth/callback          OAuth return

Autenticado               (app.agentmou.io)   (apps/web/app/app/)
  /app                    bootstrap → redirige al default del primer tenant
  /app/[tenantId]/…       shell por vertical (clinic | internal | fisio)

Admin (dentro de tenant admin)                (apps/web/app/app/[tenantId]/admin/)
  /app/[tenantId]/admin/                      redirige a /admin/tenants
  /app/[tenantId]/admin/tenants/              listado
  /app/[tenantId]/admin/tenants/[managedId]/  detalle (users + impersonation + vertical)
```

### Problemas concretos

1. **El admin está "dentro" del tenant admin** (`/app/[tenantId]/admin/...`), no en
   una raíz `/admin/...`. Funciona, pero:
   - La URL es muy larga.
   - Si el admin cambia de tenant, el `tenantId` en la URL queda inconsistente.
   - Impide impersonar desde una URL limpia (`/admin/...` sería más natural).
2. **`/platform/*` sigue activo como compat alias** (ver
   [`tenant-routing.ts:86..107`](apps/web/lib/tenant-routing.ts:86) y
   [`app/app/[tenantId]/platform/`](apps/web/app/app/[tenantId]/platform/)) —
   más deuda: duplica rutas para internal tenants.
3. **Rutas mixtas EN/ES**: `dashboard`, `approvals`, `settings` en inglés; `agenda`,
   `pacientes`, `bandeja`, `configuracion`, `seguimiento`, `reactivacion`, `rendimiento`
   en español. Es correcto (la vertical es ES) pero no hay criterio explícito y para la
   próxima vertical va a ser un problema.
4. **Filtros de `/admin/tenants` se guardan como React state**, no en la URL
   ([`admin-tenants-page.tsx:43..59`](apps/web/components/admin/admin-tenants-page.tsx:43)).
   Perdemos deeplink/compartir filtros.

### Root de logout → `/app` blank (bug reportado)

Instrumentación de los dos puntos de logout:

| Componente | Fichero:línea | Handler |
|---|---|---|
| Clinic topbar | [`clinic-topbar.tsx:112-117`](apps/web/components/clinic/clinic-topbar.tsx:112) | `await logout(); router.push('/login');` |
| Control-plane shell | [`app-shell.tsx:475-484`](apps/web/components/control-plane/app-shell.tsx:475) | `await logout(); window.location.href = '/login';` |

El `logout()` del store ([`store.ts:158`](apps/web/lib/auth/store.ts:158)) limpia el
estado en el `finally`, por lo que aunque `logoutApi()` falle, el cliente queda sin
user/tenants/session.

**Hipótesis de causa raíz (ordenadas por probabilidad):**

- **H1 — `router.push('/login')` es soft-nav y NO invoca a `proxy.ts`.** La request
  RSC sí va por HTTP y `proxy.ts:41-44` redirige `/login` → `/app` **si el cookie
  sigue presente**. Si el cookie no se limpió en el borrador del browser (p.ej. Set-Cookie
  cross-subdomain no coincide exactamente en `Domain` / `Path` / `SameSite`), el browser
  sigue mandándolo al RSC fetch de `/login`, proxy lo captura, y rebota a `/app`. En
  `/app/page.tsx:24-31` el page devuelve `null` mientras `isHydrated=false` → pantalla
  en blanco percibida.
- **H2 — Race entre el `useEffect` del tenant layout y el `router.push` del handler.**
  [`app/app/[tenantId]/layout.tsx:47`](apps/web/app/app/[tenantId]/layout.tsx:47) hace
  `router.replace(authUser ? '/app' : '/login')` cuando `hasTenantAccess=false`.
  Si por un render intermedio `authUser` todavía era truthy mientras `authTenants=[]`,
  redirige a `/app` antes de que el handler haga el push. El store hace el reset
  atómico, pero la combinación con `useResolvedTenantExperience` puede introducir
  pasos intermedios.
- **H3 — Inconsistencia entre los dos handlers.** `window.location.href` (forzado, hace
  full reload y pasa por proxy con cookie ya limpiado) vs `router.push` (soft).
  El usuario es, por su propio flujo, clínica → `router.push`. Si este camino falla
  silenciosamente y el otro no, esto apunta a H1/H2.

**Plan de fix propuesto (detallado en `pr-01-logout-and-routing.md`):**
rutas `/logout` dedicada (route handler) que invalida cookie + redirige server-side,
handlers uniformes en ambos shells, y endurecimiento del `proxy.ts`.

---

## 4. Sistema de auth actual

- B2C first por ADR-011, cookie `agentmou-session` HttpOnly.
- Backend: `services/api/src/modules/auth/*` (email+password, Google, Microsoft).
- Frontend:
  - [`lib/auth/api.ts`](apps/web/lib/auth/api.ts): `login / register / me / logout /
    oauth`.
  - [`lib/auth/store.ts`](apps/web/lib/auth/store.ts): Zustand, hidratable desde SSR
    vía [`AuthStoreBootstrap`](apps/web/components/auth/auth-store-bootstrap.tsx).
  - [`proxy.ts:32-45`](apps/web/proxy.ts:32): gate en `/app/*` y `/login|/register`.
- Impersonation: tabla `admin_impersonation_sessions` + cookie session tipo
  `impersonation`. UI de banner en
  [`components/admin/impersonation-banner.tsx`](apps/web/components/admin/impersonation-banner.tsx).

**Ok en general**, pero:

- **No hay `/logout` route handler dedicada** en `apps/web/app/`. Todo se hace client-side.
  Un `POST /logout` server-side facilitaría limpieza determinista, soporte de impersonation
  stop-all, y evita H1/H2.
- **No hay refresh token rotation** (los JWT son de 7d, ver ADR-011). No es crítico
  hoy, pero conviene documentarlo.
- **`authRequest` del front usa `credentials: 'include'` contra API cross-subdomain.**
  Requiere `SameSite=None; Secure` y CORS allowlist. Check `AUTH_WEB_ORIGIN_ALLOWLIST`
  en `.env`. Funciona pero es frágil ante cambios de dominio.

---

## 5. Estado de la sección Admin

### Lo que ya existe

- **Backend**: endpoints REST completos en
  [`admin.routes.ts`](services/api/src/modules/admin/admin.routes.ts):
  - `GET /tenants`, `GET /tenants/:id`, `PATCH /tenants/:id/vertical`
  - `GET/POST/PATCH/DELETE /tenants/:id/users/:userId`
  - `POST /tenants/:id/impersonation` y `POST /impersonation/stop`
- **Frontend**: dos pantallas principales
  - Lista: [`admin-tenants-page.tsx`](apps/web/components/admin/admin-tenants-page.tsx)
    — filtros por plan, vertical, tipo (admin/cliente), búsqueda. Estado en React, no
    en URL.
  - Detalle: [`admin-tenant-detail-page.tsx`](apps/web/components/admin/admin-tenant-detail-page.tsx)
    — listado de usuarios, alta/baja/edición, cambio de vertical, arranque de
    impersonation.
- Banner de impersonation visible para el actor.

### Lo que falta (para cerrar la sección Admin que pides)

1. **Sin pantalla de features/entitlements por tenant**. No hay UI para ver los
   flags resueltos de Reflag + plan + módulos. Sí existe el cómputo server-side
   en `clinic-entitlements.ts`, pero el admin no lo expone. → necesitamos
   `/admin/tenants/:id/features`.
2. **Sin pantalla de módulos (tenant_modules)** editable desde admin. El backend
   tiene endpoints (`clinic-modules`) pero no hay UI admin-side para overridear.
3. **Sin filtros en URL** (no deeplinkables). La pauta que pides (`?sortBy=id&…`)
   no está implementada.
4. **Sin soporte multi-vertical por tenant** (hoy es `activeVertical` single).
5. **Admin vive bajo `/app/[tenantId]/admin/*`** — se puede mantener por pragmatismo
   o mover a `/admin/*` (ver `02-open-questions.md`, Q1).

---

## 6. Estado de integración con Reflag

**YA ESTÁ INTEGRADO server-side.** Correcciones a lo que dice el briefing original:

- SDK: `@reflag/node-sdk`, wrapper en
  [`reflag-provider.ts`](services/api/src/modules/feature-flags/reflag-provider.ts).
- Contexto pasado a Reflag (company/other):
  - `company.id = tenantId`
  - `company.activeVertical`, `company.isPlatformAdminTenant`, `company.plan`
  - `other.activeModules`, `other.activeChannels`, `other.hasClinicProfile`,
    `other.environment`
- Catálogo de flags: 7 keys de rollout clínico en
  [`catalog.ts`](services/api/src/modules/feature-flags/catalog.ts):
  `rollout.clinic.voice.inbound/outbound`, `forms`, `confirmations`, `gap_recovery`,
  `reactivation`, `advanced_settings`.
- **Env vars**: `REFLAG_SDK_KEY`, `REFLAG_ENVIRONMENT`, `REFLAG_BASE_URL`,
  `REFLAG_LOCAL_OVERRIDES_JSON` (ver
  [`infra/compose/.env.example:99-106`](infra/compose/.env.example)).
  El **SDK key actual es de server** (secretKey en `reflag-provider.ts:38`) — **no hay
  publishable/client key separada ni uso en el bundle web**.

### Lo que falta

1. **No hay Reflag client-side**. Actualmente los flags llegan a la UI solo vía
   `TenantExperience.flags` (resuelto server en `/api/v1/tenants/:id/experience`).
   Eso está bien para gating por pantalla, pero **no permite A/B por usuario real-time
   sin round-trip**.
2. **No hay env vars publishable** (`NEXT_PUBLIC_REFLAG_*`). Si queremos UI admin en
   Reflag-console o edición visual, hará falta.
3. **El catálogo Reflag no conoce planes comerciales**. Los nombres actuales son
   `rollout.*` (estrategia de rollout), no `plan.*` (entitlement de plan). Para
   mapear Reception/Voice/Growth/Enterprise necesitamos un **nuevo espacio de keys**
   (propuesta en PR-03).
4. **`REFLAG_LOCAL_OVERRIDES_JSON` es un JSON blob en env**, útil en dev, pero no
   documentado en el README frontend.

---

## 7. Uso actual de shadcn/ui y tokens de diseño

### shadcn/ui

- Instalados en [`apps/web/components/ui/`](apps/web/components/ui/) (~55 componentes).
  Primitivas importantes: `card`, `button`, `table`, `sheet`, `sidebar`, `dropdown-menu`,
  `dialog`, `alert`, `badge`, `tabs`, `form`, `input`, `select`, `command`, `skeleton`,
  `sonner` (toasts).
- **Uso correcto**: el admin ya usa `Card`, `Table`, `Badge`, `Select`. La clinic shell
  usa `Sidebar` y `Sheet` (mobile). Form validation con `react-hook-form` +
  `@hookform/resolvers` + `zod`.
- **Uso problemático**:
  - Varios componentes custom que duplican shadcn: `badges.tsx` (11.7KB en
    `apps/web/components/`), `status-badge.tsx`, `risk-badge.tsx`,
    `minimal-button.tsx`. Posible consolidación.
  - "READ-ONLY" pills probablemente vienen de `honest-ui/` (no leído aún, pero usado en
    demo). Repetidos en multiple pantallas demo.

### Tokens actuales ([`apps/web/app/globals.css`](apps/web/app/globals.css))

Dos modos (light + dark) con estas capas:

- Paleta core: `--background`, `--foreground`, `--surface-content`, `--card`,
  `--card-hover`, `--popover`.
- Primary/Secondary/Muted/Accent/Destructive/Success/Warning.
- **Charts**: `--chart-1..5`.
- **Sidebar**: set propio (`--sidebar-*`).
- **Radius**: `0.375rem` (sm/md/lg/xl derivados).

Utilidades editoriales:

- `text-editorial-headline`, `text-editorial-subhead`, `text-editorial-tiny`,
  `text-editorial-label`.
- `halftone-bg`, `halftone-dots`, `divider-editorial`, `card-editorial`.

Surface scoping con atributos: `[data-surface="marketing"]` y `[data-surface="app"]`
cambian fondos + tipografía (`page-title`, `section-title`, `table-header`, etc.).

### Carencias de tokens

1. **No hay nivel semántico de superficie** (surface/subsurface/elevated), solo `card`,
   `card-hover`, `muted`. Se nota: el admin usa `border-border/60` a mano.
2. **No hay tokens de "warning-subtle", "info", "info-foreground"**. Todo lo que no
   es "success" o "destructive" vive como mezclas inline.
3. **Radius único** — no permite diferenciar un `dialog` grande (`rounded-2xl`) de
   una `card` de 4 líneas (`rounded-md`). Se usa ad-hoc en las pantallas (`rounded-[26px]`
   en pricing, `rounded-xl` en sidebar, etc.).
4. **Tipografía sin scale documentado**. Los `text-editorial-*` son utilitarios,
   pero el resto es `text-3xl tracking-tight`, `text-lg`, mezclado según intuición.
   Falta un `type-scale.md` o tokens `--text-xs/sm/md/lg/xl`.
5. **Modo dark incompleto** — `--surface-card` solo definido en `.dark` (línea 77), no
   en `:root`. Es una fuga: componentes que lo usen en light verán `undefined` →
   fallback ambiguo.

### Audit de 5 pantallas visibles (puntuación 1-5)

| Pantalla | Jerarquía | Densidad | Consistencia | Polish | Total |
|---|---|---|---|---|---|
| `/app/[t]/admin/tenants` | 3 | 3 | 3 | 2 | **11/20** — tabla plana, filtros sin `—`, cards informativas redundantes |
| `/app/[t]/admin/tenants/[id]` | 3 | 3 | 2 | 2 | **10/20** — muchos dialogs, cards de usuarios repetitivas, sin panel lateral |
| `/app/[t]/dashboard` (clinic) | 3 | 3 | 3 | 3 | **12/20** — mejor jerarquía, pero stats cards uniformes y frías |
| `/app/[t]/bandeja` (inbox) | 2 | 3 | 3 | 2 | **10/20** — "READ-ONLY" pills repetidos, columnas sin weight tipográfico |
| `/pricing` (marketing) | 4 | 3 | 4 | 3 | **14/20** — la mejor; pero TiltedCard + Accordion mezclados rompen tono |

Promedio global: **11.4/20**. Coincide con tu diagnóstico ("funcional pero no
profesional"). La marketing está más cuidada que el área app.

---

## 8. Planes de la web de marketing

**Encontrados en** [`apps/web/lib/marketing/clinic-site.ts:505-564`](apps/web/lib/marketing/clinic-site.ts:505).

Cuatro tiers (todos `price: 'Custom'`):

| Tier | Modules | Mejor para |
|---|---|---|
| **Reception** | `core_reception` | Clínicas que quieren ordenar recepción |
| **Reception + Voice** (highlight) | `core_reception`, `voice` | Clínicas donde teléfono y WhatsApp compiten |
| **Reception + Growth** | `core_reception`, `growth` | Clínicas con agenda tensionada |
| **Enterprise** | `core_reception`, `voice`, `growth`, `enterprise` | Grupos y operaciones complejas |

**Coherencia comercial**: buena; la granularidad Voice/Growth permite upsell y encaja
con los `ModuleKey` reales. **Coherencia técnica**: buena — los módulos del pricing
coinciden exactamente con `ModuleKey` en contratos.

**Problemas detectados:**

1. **Los nombres de tier ("Reception + Voice") no están en DB** — `tenant.plan` actualmente
   es `'free'|'starter'|'pro'|'scale'|'enterprise'` (ver plan baselines en
   `clinic-entitlements.ts:76-82`). No hay mapping explícito `pricingTier → (plan,
   modules[])`.
2. **`price: 'Custom'` en los 4 tiers** — OK para enterprise, pero poco útil para
   ventas SMB. Sugiero documentar precios internamente aunque no se muestren.
3. **Tabla comparativa está hard-coded** (`comparisonRows` en `pricing/page.tsx:25-55`)
   **separada del array de plans**. Si alguien añade un plan, hay dos sitios para tocar.
4. **No hay mapping 1:1 a Reflag feature keys**. Hoy los rollouts Reflag son
   `rollout.clinic.voice.inbound`, `rollout.clinic.forms`, etc. Propuesta en PR-03:
   introducir un **segundo espacio de keys** `plan.<vertical>.<capability>` para
   entitlements de plan (no rollouts).

### Mapping propuesto (detallado en PR-03)

| Pricing tier | `tenant.plan` DB | Modules habilitados | Feature keys Reflag |
|---|---|---|---|
| Reception | `starter` | `core_reception` | `plan.clinic.core_reception`, `plan.clinic.forms`, `plan.clinic.confirmations` |
| Reception+Voice | `pro` | `core_reception`, `voice` | + `plan.clinic.voice.inbound`, `plan.clinic.voice.outbound` |
| Reception+Growth | `scale` | `core_reception`, `growth` | + `plan.clinic.gap_recovery`, `plan.clinic.reactivation`, `plan.clinic.waitlist` |
| Enterprise | `enterprise` | todos + `advanced_mode` | + `plan.clinic.multi_location`, `plan.clinic.advanced_settings`, `plan.clinic.priority_support` |

---

## 9. Hallazgos adicionales (fuera del briefing)

Los clasifico por severidad.

### 🔴 Alto — arreglar en las primeras 2 PRs

1. **`/platform/*` compat** en
   [`app/app/[tenantId]/platform/`](apps/web/app/app/[tenantId]/platform/) + rutas canónicas
   duplicadas. Es deuda visible. Plan: mantener redirects server-side permanentes, borrar
   las páginas duplicadas.
2. **Filtros del admin no están en URL** — problema real para compartir estados.
3. **`setIsLoading(true)` se dispara en cada cambio de authTenants** en
   [`tenant-experience.tsx:278`](apps/web/lib/tenant-experience.tsx:278), incluso cuando el
   usuario no ha cambiado de tenant. Hace parpadear loaders innecesariamente.
4. **No hay CSP / `next.config.mjs` con security headers** — revisar. `next.config.mjs`
   es de 388 bytes, seguramente mínimo.
5. **CORS origin allowlist** (`AUTH_WEB_ORIGIN_ALLOWLIST`) es coma-separada manual,
   fácil de equivocar. Hoy no es prioridad pero debe documentarse.

### 🟡 Medio — próximas 3-5 PRs

6. **Componentes custom que duplican shadcn**: `badges.tsx`, `status-badge.tsx`,
   `risk-badge.tsx`, `stat-card.tsx`, `minimal-button.tsx`. Consolidar.
7. **`useResolvedTenantExperience` acumula estado local** (tenant, profile, modules,
   channels, experience) en 5 useStates independientes. Refactor a `useReducer`
   o query con cache (`@tanstack/react-query` ya no está, pero sería candidato).
8. **No hay telemetry / error boundary global** en el área app. `<Analytics />` del
   root layout no captura errores de render.
9. **i18n implícito** — todo el clinic shell está en ES a pelo, sin `next-intl` ni
   equivalente. Cuando llegue la 3ª vertical o el mercado no-ES esto duele.
10. **Tests de rutas cubren redirects básicos** (
    [`tenant-routing.test.ts`](apps/web/lib/tenant-routing.test.ts),
    [`redirects.test.ts`](apps/web/app/(marketing)/redirects.test.ts)
    ) pero **no cubren el flujo de logout** ni el bug `/app` blank. Añadir.
11. **Modo dark**: no hay toggle visible desde auth (sí desde app). El layout root
    usa `defaultTheme="system"`, pero la página de login en blanco sobre bg claro sin
    theme toggle es incómoda.
12. **Accesibilidad**: `Button variant="ghost" size="icon"` sin `aria-label` en
    topbar (`clinic-topbar.tsx:92-94`, campana de notifs).
13. **Logs**: `console.log` en varios sitios. `packages/observability` existe pero
    no se usa en `apps/web` (el `console` sigue siendo la API).

### 🟢 Bajo — cuando haya margen

14. **`.env.example` de `infra/compose`** mezcla auth + reflag + n8n + VPS. Conviene
    dividirlo o al menos un TOC.
15. **`components.json` registra `@react-bits`** pero solo hay 12 archivos en
    `apps/web/components/reactbits/`. Si no es central al producto, evaluar retirar.
16. **`DarkVeil.tsx` (11.8KB)** en `components/`. Sin saber qué hace huele a landing
    decorativa pesada. Auditar bundle.
17. **Imagen/assets**: `public/` tiene isotipos 32x32 y 180x180 — falta un favicon
    maskable 192/512 para PWA/Android.
18. **Tests Python**: `test_main.py` en `services/agents/`. Bien; pero no hay Docker
    healthcheck verificado en CI.

### Recap del "dolor" que más perjudica UX percibida

- Cards uniformes sin jerarquía (todas misma border, misma padding, mismo weight).
- Tipografía en área app sin un `page-title`/`section-title`/`body` claros y
  discriminados.
- Badges y pills repetidos ("READ-ONLY", "Demo", "Preview") sin un sistema de
  severidad/tono.
- Inbox (`bandeja`) con tabla densa pero sin `monospace` en IDs, sin `muted-foreground`
  consistente en metadata.

Todo arreglable con tokens semánticos + refactor de Card + refactor de Badge, no hace
falta rehacer pantallas.
