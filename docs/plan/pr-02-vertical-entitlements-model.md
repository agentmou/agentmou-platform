# PR-02: Modelo "vertical × entitlements" explícito

## Objetivo

Separar conceptualmente **vertical (identidad de dominio)** de **entitlements
(features del plan comercial)** en contratos, DB y código. Preparar el terreno para
N verticales por tenant sin obligarnos a implementarlo todavía.

## Contexto

Hoy en `apps/web/lib/vertical-registry.ts:46` y `apps/web/lib/tenant-experience.tsx`
ambos ejes se entremezclan en `ClinicUiCapabilities`. El backend sí los tiene separados
(`clinic-entitlements.ts` + `vertical-registry` implícito en el `shellKey`), pero el
contrato público es confuso.

## Alcance

### Sí entra
- Nuevos Zod schemas en `packages/contracts`:
  - `TenantVerticalConfigSchema` — `{ active: VerticalKey, enabled: VerticalKey[] }`.
  - `TenantEntitlementsSchema` — resultado explícito del resolver del plan.
- Endpoint `GET /api/v1/tenants/:id/verticals` (Fastify) — devuelve `{ active, enabled }`.
  Para todo tenant no-migrado, `enabled = [active]`.
- Refactor `services/api/src/modules/clinic-shared/clinic-entitlements.ts`:
  - Partir en `entitlement-resolver.ts` (plan + modules + reflag → features) y
    `vertical-resolver.ts` (qué vertical está activa y cuáles están enabled).
  - La función pública `resolveTenantExperience()` compone ambos.
- Refactor `apps/web/lib/tenant-vertical.ts` y `vertical-registry.ts`:
  - `resolveActiveVertical()` queda solo para identidad.
  - Se añade `resolveEntitlements()` explícito (trae los flags resueltos,
    independiente de vertical).
- `docs/architecture/verticals-and-entitlements.md` con diagrama conceptual.

### No entra
- Implementar multi-vertical en UI (viene en PR-09 si se decide).
- Lecturas/escrituras de `tenant_vertical_configs` (la tabla queda como placeholder).
- Cambios en Reflag catálogo (PR-03).

## Cambios técnicos

### Contratos (`packages/contracts/src/`)
- `tenants.ts` (o donde viva `Tenant`): añadir
  ```ts
  export const TenantVerticalConfigSchema = z.object({
    active: VerticalKeySchema,
    enabled: z.array(VerticalKeySchema).min(1),
  });
  export type TenantVerticalConfig = z.infer<typeof TenantVerticalConfigSchema>;
  ```
- Eliminar las dependencias de `TenantSettings.verticalClinicUi`, `clinicDentalMode`,
  `internalPlatformVisible` del contrato público. Mantener como campos internos
  marcados `@deprecated`, no se exponen en la API externa.
- `AdminTenantDetailResponseSchema` y `TenantExperienceSchema` pasan a incluir
  `verticalConfig: TenantVerticalConfigSchema`.

### Backend (`services/api/src/modules/`)
- `clinic-shared/` → renombrar lib interna:
  - `clinic-entitlements.ts` → `entitlement-resolver.ts` (foco: plan/modules/reflag).
  - Nuevo `vertical-resolver.ts` — resuelve `{ active, enabled }` con fallback al
    settings jsonb si `tenant_vertical_configs` está vacío.
  - `clinic-experience.service.ts` (existe) compone ambos y devuelve el payload
    consumido por el front.
- `tenants/tenants.routes.ts` — nuevo endpoint `GET /:id/verticals`.

### Frontend (`apps/web/lib/`)
- `tenant-vertical.ts`:
  - `resolveActiveVertical()` mantiene la firma.
  - Nueva función `resolveEnabledVerticals(tenant)` que devuelve array (hoy siempre
    length=1).
- `tenant-experience.tsx`:
  - `ClinicUiCapabilities` queda como helper de UI solo para la vertical `clinic`.
    Las otras verticales (`fisio`, `internal`) no usan esto.
  - `useResolvedTenantExperience` pasa a leer `verticalConfig` del payload si viene.
- `vertical-registry.ts`: no cambia el contrato público, solo añade un método
  `getVerticalsForTenant(config)` que hoy devuelve `[config.active]`.

### DB
- **Sin cambios de schema**. La tabla `tenant_vertical_configs` ya existe (ver
  `packages/db/src/schema.ts:48`). Esta PR no la usa para escritura; queda lista.

## Decisiones de diseño

### ¿Por qué no empezar a usar `tenant_vertical_configs` ya?

Porque el front no está preparado para multi-vertical (PR-09) y si la API empieza a
devolver `enabled.length > 1` sin soporte de UI, veríamos bugs. Mejor flujo:
contrato listo → UI sigue siendo single → cuando llegue PR-09, backfill de la tabla
y switch de flag.

### ¿Por qué deprecar `verticalClinicUi` y `clinicDentalMode` en vez de borrarlos?

Son lecturas defensivas en varios sitios
([`tenant-vertical.ts:14`](apps/web/lib/tenant-vertical.ts:14),
[`tenant-experience.tsx:154`](apps/web/lib/tenant-experience.tsx:154)).
Borrarlos en la misma PR es riesgo grande. Deprecamos y eliminamos en una PR posterior
de limpieza.

### ¿Por qué un endpoint nuevo (`/verticals`) en vez de extender `/experience`?

Porque `/experience` ya carga mucho (profile, modules, channels, flags). Separar la
identidad de vertical permite cachearlo diferente (identidad cambia muy rara vez,
features cambian mucho).

## Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Cambios de contrato en `TenantExperience` rompen tests existentes | Mantener retrocompatibilidad — `verticalConfig` opcional, con fallback derivado |
| Refactor del resolver mueve lógica y introduce bugs sutiles | Tests golden del resolver con payloads grabados de prod |
| El frontend empieza a leer un campo que el backend aún no envía (durante despliegue) | Opcional en el schema; fallback a `settings.activeVertical` |

## Criterios de aceptación

- [ ] `packages/contracts` exporta `TenantVerticalConfigSchema` y `TenantVerticalConfig`.
- [ ] `GET /api/v1/tenants/:id/verticals` responde `{ active, enabled: [active] }` para tenant existente.
- [ ] Resolver server-side separado en dos archivos con responsabilidades claras.
- [ ] Frontend compila; `activeVertical` se lee de `verticalConfig.active` con fallback.
- [ ] Ningún `verticalClinicUi` nuevo en código; los existentes marcados `@deprecated`.
- [ ] Tests: golden del resolver ≥ 6 casos (internal / clinic free / clinic pro / clinic scale / clinic enterprise / fisio).
- [ ] Doc `docs/architecture/verticals-and-entitlements.md` con diagrama.

## Plan de pruebas

**Unit:**
- `vertical-resolver.test.ts` — casos de fallback cuando `tenant_vertical_configs` está vacío.
- `entitlement-resolver.test.ts` — ampliar `clinic-entitlements` tests existentes
  con los nuevos nombres.

**Integration:**
- Fastify test del endpoint `/verticals` con tenant free, pro, enterprise.

**Manual:**
- Demo tenant sigue viendo clinic shell.
- Cambio de vertical desde admin → detail page sigue funcionando.
- Tenant admin sigue viendo el console interno.

## Rollback plan

- Revert del PR; no hay migración DB ni cambio irreversible.
- Deploy compatible hacia atrás: backend acepta que frontend no lea `verticalConfig`
  aún.
