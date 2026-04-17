# PR-03: Reflag — espacio de keys `plan.*` y mapping al pricing

## Objetivo

Modelar los **entitlements comerciales** (lo que compras en cada tier del pricing)
como feature flags Reflag, distintos del catálogo actual de `rollout.*` (estrategia
de deploy). Documentar los límites entre server-side (autorización) y client-side
(UI hints / A/B). Exponer el mapping desde `clinicPricingPlans` a `(plan, modules,
flags)` para consumo admin y marketing.

## Contexto

Hoy:
- Reflag server-side ya funciona (`services/api/src/modules/feature-flags/reflag-provider.ts`).
- Solo 7 flags `rollout.*` en `feature-flags/catalog.ts`.
- No hay cliente Reflag en el browser — la UI solo conoce flags a través de
  `TenantExperience.flags` resuelto server-side.
- No hay publishable key separada; `REFLAG_SDK_KEY` es secret (`secretKey` en
  `reflag-provider.ts:38`).
- `clinicPricingPlans` (marketing) usa nombres de módulo en strings libres
  (`'Core Reception'`, `'Voice'`); no hay referencia programática a `ModuleKey` ni
  a flags.

## Alcance

### Sí entra
- Nuevo espacio de keys `plan.clinic.*` en el catálogo Reflag.
- Contrato explícito server: `rollout.*` = fase de despliegue; `plan.*` = entitlement.
- Env var `NEXT_PUBLIC_REFLAG_PUBLISHABLE_KEY` con placeholder.
- Cliente ligero en `apps/web/lib/feature-flags/client.ts` para UI hints (no autz).
- Mapping `pricingTier → (plan, modules, flags)` en `lib/marketing/clinic-site.ts`.
- Doc `docs/architecture/feature-flags.md` con la taxonomía.

### No entra
- Cambiar el resolver server-side para que los `plan.*` override el plan baseline
  (eso es PR-04 parcialmente y puede necesitar su propia PR).
- UI admin de features (PR-04).
- Eliminar `rollout.*` keys (siguen siendo válidas; son ortogonales).

## Cambios técnicos

### Backend (`services/api/src/modules/feature-flags/`)

- `catalog.ts` — añadir segundo objeto `PLAN_FLAG_KEYS` y `PLAN_FLAG_CATALOG`:
  ```ts
  export const PLAN_FLAG_KEYS = {
    clinicCoreReception:   'plan.clinic.core_reception',
    clinicVoiceInbound:    'plan.clinic.voice.inbound',
    clinicVoiceOutbound:   'plan.clinic.voice.outbound',
    clinicForms:           'plan.clinic.forms',
    clinicConfirmations:   'plan.clinic.confirmations',
    clinicGapRecovery:     'plan.clinic.gap_recovery',
    clinicReactivation:    'plan.clinic.reactivation',
    clinicWaitlist:        'plan.clinic.waitlist',
    clinicMultiLocation:   'plan.clinic.multi_location',
    clinicAdvancedSettings:'plan.clinic.advanced_settings',
    clinicPrioritySupport: 'plan.clinic.priority_support',
  } as const;
  ```
- Header doc-comment que fija la convención:
  `rollout.<vertical>.<feature>` = fase de deploy.
  `plan.<vertical>.<capability>` = entitlement de plan.
- `feature-flag.service.ts` — mantener API existente; añadir método
  `resolvePlanEntitlements(ctx)` que devuelve `Record<PlanFlagKey, boolean>` y es el
  **único** consumidor autorizado de esta familia de keys.
- Los decisions trace distinguen fuente: `plan-baseline | module-override |
  reflag-rollout | reflag-plan-override`.

### Envs

- `infra/compose/.env.example`:
  ```
  # Reflag — SERVER secret. Usado por services/api.
  REFLAG_SDK_KEY=
  REFLAG_ENVIRONMENT=development
  REFLAG_BASE_URL=
  REFLAG_LOCAL_OVERRIDES_JSON=

  # Reflag — CLIENT publishable. Exposed to browser. Solo para UI hints.
  NEXT_PUBLIC_REFLAG_PUBLISHABLE_KEY=
  NEXT_PUBLIC_REFLAG_ENVIRONMENT=development
  ```
- `apps/web/.env.example` (si no existe, crear con lectura de `NEXT_PUBLIC_*`).

### Frontend (`apps/web/lib/feature-flags/`)

- Nuevo archivo `client.ts`:
  - Si la publishable key no está, exporta stubs que devuelven `false` y emiten
    `console.warn` una sola vez en dev.
  - Si está, instancia el SDK browser y expone:
    ```ts
    export function useFeatureFlag(key: FlagKey): boolean;
    export function useFeatureFlagDebug(key: FlagKey): { value: boolean; source: string };
    ```
- **Reglas de uso** documentadas:
  - Para **autorización**, leer siempre de `TenantExperience.flags` (server-resolved).
  - `useFeatureFlag` **solo** para UI hints no críticos (ejemplo: mostrar un banner,
    ordenar items).
  - **ESLint rule custom (Q3-B confirmado)** — `no-client-flags-in-authz`:
    prohíbe `useFeatureFlag` / `getClientFeatureFlag` en archivos bajo:
    - `apps/web/lib/auth/**`
    - `apps/web/lib/providers/**` (provider de datos, crítico para autz)
    - `apps/web/proxy.ts`
    - `services/api/src/middleware/**`
    - `services/api/src/modules/*/**-access.ts`
    La regla vive en `eslint.config.js` como `no-restricted-imports` por path
    pattern (suficiente para el caso). Si hace falta algo más fino, se escala a
    plugin custom.

### Marketing (`apps/web/lib/marketing/clinic-site.ts`)

Refactor de `clinicPricingPlans` a tipo explícito:

```ts
export interface PricingPlan {
  name: string;
  subtitle: string;
  planKey: TenantPlan;                    // starter | pro | scale | enterprise
  modules: readonly ModuleKey[];
  planFlags: readonly PlanFlagKey[];
  features: readonly string[];            // label de venta
  bestFor: string;
  ctaLabel: string;
  highlight?: boolean;
  price: string;
}

export const clinicPricingPlans: readonly PricingPlan[] = [
  {
    name: 'Reception',
    planKey: 'starter',
    modules: ['core_reception'],
    planFlags: ['plan.clinic.core_reception', 'plan.clinic.forms', 'plan.clinic.confirmations'],
    // ...
  },
  // ...
];
```

El type-check garantiza que solo se referencian `ModuleKey` y `PlanFlagKey` válidos.

### Archivos nuevos / modificados

- `services/api/src/modules/feature-flags/catalog.ts` (+ ~60 líneas)
- `services/api/src/modules/feature-flags/feature-flag.service.ts` (+ método)
- `apps/web/lib/feature-flags/client.ts` (nuevo, ~80 líneas)
- `apps/web/lib/feature-flags/keys.ts` (nuevo — re-export type-safe de `PlanFlagKey`)
- `apps/web/lib/marketing/clinic-site.ts` (refactor de `clinicPricingPlans`)
- `packages/contracts/src/*` — si `PlanFlagKey` debe vivir aquí (sí, para que admin UI
  lo pueda tipar)
- `infra/compose/.env.example` y `apps/web/.env.example`
- `docs/architecture/feature-flags.md` (nuevo)

## Decisiones de diseño

### ¿Dos espacios de keys o uno solo?

**Decisión: dos espacios (`rollout.*` y `plan.*`).** Razón: tienen lifecycle muy
distintos. Un rollout se activa gradualmente y se borra cuando 100%. Un entitlement
de plan vive siempre mientras exista el plan comercial. Mezclarlos lleva a keys
con nombres confusos y a decisiones de autz basadas en flags pensados para A/B.

**Alternativa:** namespace único con sufijos. Descartada — las taxonomías limpias
envejecen mejor.

### ¿Client-side flags para autorización?

**Decisión: NO.** Las decisiones de autorización se toman server-side con
`FeatureFlagService.resolvePlanEntitlements()` y viajan en `TenantExperience.flags`.
El cliente los consume ya resueltos. El SDK browser es solo para UX.

**Razón:** el cliente puede ser manipulado, el server no. Además evita dobles llamadas
y cache-inconsistency.

### ¿Dónde vive el mapping `pricingTier → (plan, modules, flags)`?

**Decisión: en `apps/web/lib/marketing/clinic-site.ts`.** Porque marketing ya es su
dueño lógico y el admin UI lo importa (no al revés). Al estar en TS con tipos fuertes,
cualquier inconsistencia revienta el typecheck.

**Alternativa:** YAML en `catalog/`. Descartada — sumaría otro nivel de mapping sin
beneficio claro hoy.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Keys Reflag duplicadas entre `rollout.*` y `plan.*` | Linter simple en el catálogo: key única y que empiece por uno de los dos prefijos |
| SDK browser añade peso al bundle si se deja instanciado innecesariamente | Lazy-load solo en pantallas que lo consuman |
| Configurar publishable key en prod por error como secret key | Validador en boot del backend + README claro |
| Marketing page y admin UI leyendo el mapping y desincronizándose | Exportar una sola fuente en `clinic-site.ts` |

## Criterios de aceptación

- [ ] `PLAN_FLAG_KEYS` definidos en `services/api` y re-exportados en `packages/contracts`.
- [ ] `FeatureFlagService.resolvePlanEntitlements(ctx)` devuelve `Record<PlanFlagKey, boolean>`.
- [ ] `NEXT_PUBLIC_REFLAG_PUBLISHABLE_KEY` documentada en `.env.example`.
- [ ] Cliente browser funcional con fallback seguro cuando no hay key.
- [ ] `clinicPricingPlans` tipado fuerte, referencia solo `ModuleKey`/`PlanFlagKey` válidos.
- [ ] `docs/architecture/feature-flags.md` con ejemplos.
- [ ] Tests unit del `resolvePlanEntitlements` con los 4 tiers comerciales.
- [ ] ESLint rule activa: un import de `useFeatureFlag` desde un archivo de `lib/auth/`
  o `*-access.ts` falla el lint.

## Plan de pruebas

**Unit:**
- `feature-flag.service.test.ts` — ampliar con casos `plan.*`.
- `client.test.ts` — fallback cuando no hay key.
- `marketing/clinic-site.test.ts` — snapshot del mapping.

**Manual:**
- En admin UI (tras PR-04), cambiar el plan de un tenant demo y verificar que los
  flags `plan.*` cambian coherentemente.
- Toggle desde Reflag dashboard un `plan.*` → refrescar admin UI → reflejo correcto.

## Rollback plan

- Revert PR. El espacio `rollout.*` sigue funcionando. Marketing vuelve a tener strings libres.
