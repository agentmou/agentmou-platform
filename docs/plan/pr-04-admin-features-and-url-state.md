# PR-04: Admin UI — features page + URL state filtros + migración `/admin/*`

## Objetivo

Cerrar tres huecos a la vez — todos tocan routing admin, así que van juntos:

1. Añadir una pantalla `features` por tenant (ver entitlements resueltos: plan + modules
   + Reflag + decisión final).
2. Serializar los filtros de `/admin/tenants` a querystring (deeplinkable).
3. **Migrar admin a URLs canónicas** `/admin/*` con redirects desde
   `/app/[tenantId]/admin/*` (Q1-C confirmado).

Sin rediseño estético — eso llega en PR-06.

## Contexto

+ `admin-tenants-page.tsx:43-59` tiene los filtros en `React.useState` (no URL).
+ No existe ninguna vista que muestre los flags resueltos. Un operador que quiere saber
  "¿este tenant tiene voz?" tiene que mirar plan + tenant_modules + Reflag dashboard
  manualmente. No escala.
+ `admin-tenant-detail-page.tsx` solo tiene sección de usuarios + cambio de vertical.

## Alcance

### Sí entra
+ **Nuevo árbol de rutas `/admin/*`** (top-level, no scoped al tenantId):
  + `/admin` → redirige a `/admin/tenants`
  + `/admin/tenants` → lista (mismo componente que hoy).
  + `/admin/tenants/[managedId]` → detalle.
  + `/admin/tenants/[managedId]/features` → nueva pantalla features.
+ Guard en `proxy.ts`: `/admin/*` requiere session con `actorTenant.isPlatformAdminTenant`.
+ **Redirects 301** permanentes `/app/[tenantId]/admin/*` → `/admin/*` (preserva
  deeplinks externos). Quita las rutas físicas bajo `[tenantId]/admin/` tras migrar
  los componentes.
+ Nuevo endpoint `GET /api/v1/admin/tenants/:id/feature-resolution`:
  + Devuelve `{ plan, modules, flags, decisions[] }` donde `decisions` contiene el
    trace completo (fuente, razón).
+ Filtros URL-synced en `admin-tenants-page.tsx`.
+ Nueva columna opcional "Tier comercial" derivada del mapping de PR-03.

### No entra
+ Editar flags/módulos desde admin (solo view).
+ Rediseño visual (PR-06).

## Cambios técnicos

### Backend

+ `services/api/src/modules/admin/admin.routes.ts`:
  + Nuevo endpoint `GET /tenants/:tenantId/feature-resolution`.
  + Llama a `FeatureFlagService.resolveClinicExperience()` (ya existe) y la enriquece
    con el detail del decision trace que ya se expone en `clinic-entitlements`.
+ `services/api/src/modules/admin/admin.schema.ts`:
  + `AdminTenantFeatureResolutionResponseSchema` con plan, modules, planFlags,
    rolloutFlags, decisions[].
+ `packages/contracts/src/admin.ts`:
  + Types + Zod del response.

### Frontend

+ `apps/web/app/app/[tenantId]/admin/tenants/[managedTenantId]/features/page.tsx` (nuevo):
  + 3 secciones en `<Tabs>`:
    1. **Plan baseline** — qué da el `tenant.plan` por defecto.
    2. **Overrides** — qué cambia `tenant_modules` por tenant.
    3. **Reflag decisions** — qué vuelca Reflag (rollout + plan).
  + Tabla final "Decisión efectiva por feature" con tono (verde/rojo).
  + Link externo a Reflag dashboard si `NEXT_PUBLIC_REFLAG_APP_URL` está configurado.
+ `apps/web/app/app/[tenantId]/admin/tenants/[managedTenantId]/layout.tsx` (nuevo o
  existente actualizado): añade `<Tabs>` horizontales con `Users` / `Features`.
+ `apps/web/components/admin/admin-tenant-features-page.tsx` (nuevo ~200 líneas):
  el componente real.
+ `apps/web/lib/providers/*` o `apps/web/lib/api/client.ts`:
  + `listAdminTenantFeatureResolution(tenantId, managedTenantId)` añadido al provider.
  + Query hook `useProviderQuery` ya existe.

### Filtros URL-synced

+ `apps/web/components/admin/admin-tenants-page.tsx`:
  + Estado local sustituido por `useSearchParams` + `router.replace` con `{ scroll: false }`.
  + Parsing + serialización centralizada en un helper `buildAdminTenantsUrl({ q,
    plan, vertical, adminFilter, sortBy, sortDir })`.
  + Nueva ordenación por columnas (sortBy=id|name|plan|vertical|userCount, sortDir=asc|desc)
    — backend ya acepta filtros básicos; ampliar query si es necesario.
+ Mantener filtros controlados pero con debounce 300ms para `q` (no spamear el push).

## Decisiones de diseño

### Dos niveles (Users/Features) vs una sola página larga

**Decisión: Tabs.** Reduce scroll y permite deeplinks (`#users`, `#features`).
Tabs existentes en shadcn/ui.

### ¿Exponer endpoint nuevo o piggyback en `/tenants/:id`?

**Decisión: endpoint nuevo.** `/tenants/:id` hoy devuelve detail sin el trace.
Meter el trace ahí lo haría heavyweight. Mejor endpoint dedicado que solo admin
llama.

### Filtros URL — SPA-style vs server-rendered

**Decisión: SPA.** `useSearchParams` + `router.replace`. No redirecciona, solo
actualiza URL. Consistent con Next 16 App Router patterns.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Endpoint `feature-resolution` pesado si lista mucho | Cachear 30s server-side, paginar si >20 keys |
| URL state con filtros opuestos en ambos lados (cliente y server) | Helper único de parsing |
| `router.replace` scroll al cambiar filtros | `{ scroll: false }` explícito |

## Criterios de aceptación

+ [ ] `GET /api/v1/admin/tenants/:id/feature-resolution` responde Zod-validated.
+ [ ] Pantalla `features` muestra plan baseline, overrides, Reflag, y decisión final.
+ [ ] Filtros de `/admin/tenants` viven en URL. Copiar+pegar URL en otra pestaña
  reproduce el filtrado.
+ [ ] Ordenación por columnas funciona (al menos name + plan).
+ [ ] Link a Reflag dashboard presente si env var configurada.
+ [ ] Tests: response schema del endpoint, helper de URL parsing, componente
  snapshot mínimo.
+ [ ] `/admin/*` requiere `isPlatformAdminTenant`; `/admin/*` sin session → `/login`.
+ [ ] `/app/[tenantId]/admin/*` responde 301 a `/admin/*` preservando path y query.
+ [ ] Impersonation sigue accesible desde `/admin/tenants/:managedId` (no depende
  del tenantId en URL — usa `actorTenantId` de la session cookie).

## Plan de pruebas

**Unit:**
+ `buildAdminTenantsUrl.test.ts` — todas las combinaciones serializan/parsean OK.
+ Feature resolver endpoint — response schema test.

**Integration:**
+ Admin detail navigation — tab switch preserva tenantId.

**Manual:**
+ Cambiar plan de un tenant demo → abrir features page → ver cambios.
+ Pegar URL con filtros → pestañaa nueva muestra mismo set.

## Rollback plan

+ Revert. El endpoint queda inactivo, la pantalla desaparece; filtros vuelven a state.
