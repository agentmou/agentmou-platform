# 01 — Plan maestro

## Resumen ejecutivo

El repo está **más maduro de lo que sugería el briefing**: Reflag server-side ya funciona,
el sistema de verticales existe (`internal`, `clinic`, `fisio`), y hay consola admin con
cambio de vertical + impersonation. Lo que hay que hacer es **endurecer lo existente
y cerrar huecos UX**, no construir desde cero.

## Filosofía del plan

1. **Primero, contratos y datos** — si cambiamos el modelo de vertical, hagámoslo pronto
   para no pagar migraciones tarde.
2. **Después, infraestructura de UI** — tokens y primitives, antes de rediseñar pantallas.
3. **Al final, pantallas concretas** — admin → clinic dashboard → marketing, por orden de
   visibilidad al usuario real.
4. **Cada PR ≤ 400 líneas de diff productivo**, encaja con
   [`rules/pull-request-standards.md`](.claude/rules/pull-request-standards.md).
5. **Cada PR entrega valor observable** — nada de refactors puros sin una pantalla/flujo
   que los consuma.

## Orden propuesto y justificación

Tu orden tentativo era: fixes de routing+logout → modelo vertical y admin → Reflag →
sección Admin UI → rediseño.

**Mi propuesta — ligeras modificaciones:**

1. PR-01 Fix logout + routing hardening (hotfix)
2. PR-02 Modelo "vertical × entitlements" explícito en contratos + DB (preparación)
3. PR-03 Reflag: segundo espacio de keys `plan.*` y mapping al pricing
4. PR-04 Admin UI — features page + URL state filtros + migración `/admin/*` canonical (Q1-C)
5. PR-05 Design tokens semánticos + refactor Card/Badge
6. PR-05.5 Playwright e2e smoke (Q7-A) — blindaje antes de PR-06/07
7. PR-06 Admin UI polish (tenants list + detail rediseño)
8. PR-07 Clinic dashboard polish
9. PR-08 Marketing pricing — mapping visible a modules + enforcement de coherencia
10. PR-09 (opcional) Soporte multi-vertical por tenant (activar `tenant_vertical_configs`)

**Diferencias con tu orden:**

- Meto **PR-02 (modelo de datos)** ANTES de Reflag y Admin UI porque si endurezco el
  modelo después, tengo que reescribir UI y SQL dos veces.
- **PR-05 (tokens)** va entre Admin funcional (PR-04) y Admin pulido (PR-06): así
  PR-04 se beneficia poco y PR-06 ya puede consumir los tokens. No es ideal hacer PR-06
  sin tokens, pero los tokens son demasiado invasivos para meterlos antes de nada.
- **PR-09 multi-vertical** al final y marcado opcional — depende de decisión de negocio
  (ver `02-open-questions.md` Q2).

---

## PR-01 — Fix logout + routing hardening

- **Objetivo**: resolver el bug de logout que deja al usuario en `/app` (pantalla blanca)
  y endurecer el gating de `/app/*` vs `/login`.
- **Criterios de aceptación**:
  - [ ] Tras logout desde clinic-topbar **y** desde control-plane app-shell, el usuario
    acaba en `/login` con el form cargado.
  - [ ] Si el browser tiene cookie stale, al abrir `/app` sin token válido redirige
    a `/login` (testeado en proxy.ts).
  - [ ] Existe una ruta `/logout` (route handler) que hace `POST /api/v1/auth/logout`,
    responde `Set-Cookie` para borrar la cookie aun si el API falla, y `redirect('/login')`.
  - [ ] Ambos shells (clinic-topbar y control-plane) apuntan `<form action="/logout"
    method="post">` o `<a href="/logout">` en vez de `router.push`.
  - [ ] Tests nuevos: un vitest para el store (ya existe, ampliar) y uno e2e/smoke del flujo.
- **Complejidad**: S. **Riesgo**: bajo.
- **Dependencias**: ninguna.
- **Decisión previa**: ninguna.
- **Notas**: también quito el alias `/platform/*` aquí o al menos meto 301 server-side
  (ver PR-01 detalle).

## PR-02 — Modelo "vertical × entitlements" explícito

- **Objetivo**: separar conceptualmente **vertical (identidad)** de **entitlements
  (plan features)** en contratos y DB; preparar el terreno para N verticales por tenant.
- **Criterios de aceptación**:
  - [ ] Zod schema en `packages/contracts` define `TenantVertical` y
    `TenantEntitlements` como tipos separados.
  - [ ] `tenants.settings.activeVertical` queda como fuente de verdad **single-vertical**
    por ahora, pero un nuevo endpoint `GET /api/v1/tenants/:id/verticals` devuelve
    `{ active: VerticalKey, enabled: VerticalKey[] }` (igual a `[active]` hoy; soporta
    N mañana).
  - [ ] Frontend consume `enabled` pero solo renderiza `active`. Todos los `activeVertical`
    en código pasan por un helper central.
  - [ ] La `clinic-entitlements.ts` se renombra y se separa en:
    `vertical-resolver.ts` (identidad) + `entitlement-resolver.ts` (qué features tiene
    el plan/modules/reflag).
  - [ ] Documentación en `docs/architecture/verticals-and-entitlements.md` con diagrama.
- **Complejidad**: M. **Riesgo**: medio — toca contratos usados por clinic UI.
- **Dependencias**: PR-01 (no, técnicamente).
- **Decisión previa**: Q1 (dónde vive admin) y Q2 (multi-vertical sí/no).

## PR-03 — Reflag: espacio de keys `plan.*` y mapping al pricing

- **Objetivo**: modelar entitlements de plan comercial como feature flags Reflag,
  distintos del catálogo actual de `rollout.*`.
- **Criterios de aceptación**:
  - [ ] Nuevas keys en `feature-flags/catalog.ts`:
    `plan.clinic.core_reception`, `plan.clinic.voice.inbound`,
    `plan.clinic.voice.outbound`, `plan.clinic.forms`,
    `plan.clinic.confirmations`, `plan.clinic.gap_recovery`,
    `plan.clinic.reactivation`, `plan.clinic.waitlist`,
    `plan.clinic.multi_location`, `plan.clinic.advanced_settings`,
    `plan.clinic.priority_support`.
  - [ ] Contrato explícito: `rollout.*` = estrategia de deploy (A/B, canary, etc.);
    `plan.*` = entitlement comercial. Documentado en el header de `catalog.ts`.
  - [ ] `.env.example` separa `REFLAG_SDK_KEY` (server, secreto) de
    `NEXT_PUBLIC_REFLAG_PUBLISHABLE_KEY` (cliente, no secreto).
  - [ ] Server-side sigue siendo la fuente de verdad — el client SDK solo se usa para
    A/B test **visual** (no para decisiones de autorización).
  - [ ] Lib cliente `apps/web/lib/feature-flags/client.ts` con hook
    `useFeatureFlag(key)` que usa el publishable key con `@reflag/browser-sdk` o
    equivalente. Si la key no está, el hook devuelve `false` con warning de consola
    en dev.
  - [ ] Mapping `clinicPricingPlans[n] → { plan: TenantPlan, modules[], flags[] }`
    expuesto desde `lib/marketing/clinic-site.ts` para consumo por admin UI (PR-04).
- **Complejidad**: M. **Riesgo**: medio — decisión de UX sobre cliente vs server.
- **Dependencias**: PR-02 (necesita el resolver limpio).
- **Decisión previa**: Q3 (client-side flags sí/no).
- **Notas**: **no romper** el flujo server-first actual. Esto **suma** capacidad,
  no reemplaza.

## PR-04 — Admin UI: features page + URL state filtros

- **Objetivo**: cerrar los huecos funcionales del admin. Sin rediseño estético aún.
- **Criterios de aceptación**:
  - [ ] Nueva ruta `/app/[tenantId]/admin/tenants/[managedId]/features`:
    - Lista los flags (`plan.*` y `rollout.*`) resueltos para el tenant managed.
    - Muestra: plan baseline, override de `tenant_modules`, override de Reflag,
      decisión final.
    - Links externos: abrir el flag en Reflag UI (si publishable key/URL están
      configurados).
  - [ ] Filtros de `/admin/tenants` **serializan a querystring** (`?q=...&plan=pro&vertical=clinic`).
    Al pegar URL, los filtros se aplican. Se usa `useSearchParams` + `router.replace`
    con `{ scroll: false }`.
  - [ ] (Opcional) Columna "Plan → Tier comercial" (derivada del mapping de PR-03).
- **Complejidad**: M. **Riesgo**: bajo.
- **Dependencias**: PR-03.
- **Decisión previa**: ninguna.

## PR-05 — Design tokens semánticos + refactor Card/Badge

- **Objetivo**: ampliar `globals.css` con tokens de superficie, estados y tipografía;
  refactorizar `Card` y `Badge` para consumirlos.
- **Criterios de aceptación**:
  - [ ] Nuevos tokens en `globals.css`:
    - Surfaces: `--surface-base`, `--surface-raised`, `--surface-subtle`,
      `--surface-overlay`.
    - Borders: `--border-default`, `--border-subtle`, `--border-strong`.
    - Text: `--text-primary`, `--text-secondary`, `--text-muted`, `--text-inverse`.
    - Radius: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-2xl`
      (valores distintos, no derivados por suma).
    - Estados: `info`, `info-foreground`, `warning-subtle`, `success-subtle`,
      `destructive-subtle`.
    - Type scale: `--font-size-xs..3xl` con `line-height` emparejado.
  - [ ] `--surface-card` se declara también en `:root` (bug detectado en audit).
  - [ ] `Card` pasa a soportar `variant: 'default' | 'raised' | 'subtle' | 'outline'`
    mapeado a los nuevos tokens. No se cambia el API público (backward-compat).
  - [ ] `Badge` añade `tone: 'neutral' | 'info' | 'success' | 'warning' | 'destructive'`.
    Se eliminan duplicados: `status-badge.tsx`, `risk-badge.tsx`, la mayoría de
    `badges.tsx`.
  - [ ] Documentado en `docs/design/tokens.md`.
- **Complejidad**: L. **Riesgo**: medio-alto — toca prácticamente todas las pantallas
  porque los componentes son widely-used.
- **Dependencias**: ninguna (lanzable en paralelo a PR-03/04, pero mejor secuencial
  para no ensuciar review).
- **Decisión previa**: Q4 (quién valida la paleta final).

## PR-06 — Admin UI polish

- **Objetivo**: aplicar los tokens de PR-05 a las pantallas admin. Visualmente
  profesional, sin cambio funcional.
- **Criterios de aceptación**:
  - [ ] Lista de tenants con jerarquía: nombre grande + ID monospace gris,
    plan/vertical con badges tonal, flags en columna derecha con severity tone.
  - [ ] Detalle tenant con **layout de 2 columnas** en desktop: usuarios (izq) +
    metadata/vertical/features (der).
  - [ ] Dialogs de crear/editar usuario con `--surface-overlay` y consistent spacing.
  - [ ] Impersonation banner con tono `warning-subtle` + CTA de stop visible.
  - [ ] Skeleton loaders en vez de "Cargando tenants..." de texto plano.
  - [ ] a11y: todos los icon-only buttons tienen `aria-label`.
- **Complejidad**: M. **Riesgo**: bajo.
- **Dependencias**: PR-05.

## PR-07 — Clinic dashboard polish

- **Objetivo**: aplicar tokens y fix de jerarquía a la experiencia principal del
  usuario cliente (tenant clínica).
- **Criterios de aceptación**:
  - [ ] Dashboard con `stat-card` consolidado (no varias variantes).
  - [ ] Bandeja (inbox) con columnas tipográficas coherentes (monospace para IDs,
    muted para metadata, primary para cuerpo).
  - [ ] Agenda con chips de estado tonal (scheduled/confirmed/cancelled).
  - [ ] Sidebar con indicadores de módulo disabled vs enabled tonalmente clara.
- **Complejidad**: M. **Riesgo**: bajo.
- **Dependencias**: PR-05.

## PR-08 — Marketing pricing: mapping visible + enforcement

- **Objetivo**: que la tabla de pricing pública muestre exactamente los módulos y
  features que el código aplica, sin duplicación de fuente de verdad.
- **Criterios de aceptación**:
  - [ ] `clinicPricingPlans` y `comparisonRows` se unifican en una sola estructura en
    `lib/marketing/clinic-site.ts`.
  - [ ] `comparisonRows` se genera a partir del mapping de PR-03.
  - [ ] Si añades un módulo nuevo en el mapping, la tabla se actualiza sola.
  - [ ] Test de snapshot de la pricing page que rompe si la lista de features
    comerciales diverge del mapping.
- **Complejidad**: S. **Riesgo**: bajo.
- **Dependencias**: PR-03.

## PR-09 — (Opcional) Soporte multi-vertical por tenant

- **Objetivo**: permitir que un tenant tenga dos o más verticales activas (p.ej. una
  red que opera dental + fisio).
- **Criterios de aceptación**:
  - [ ] `tenant_vertical_configs` se activa para lecturas (hoy está vacío pero la
    tabla existe).
  - [ ] `GET /tenants/:id/verticals` devuelve `{ enabled: VerticalKey[], active:
    VerticalKey }` con `enabled.length > 1` posible.
  - [ ] UI: selector en topbar que permite cambiar entre verticales enabled del mismo
    tenant (switcher de workspace pero dentro de un tenant).
  - [ ] Admin UI permite añadir/quitar verticales enabled al tenant.
- **Complejidad**: XL. **Riesgo**: alto — toca `useResolvedTenantExperience`, la
  shell-registry, y los hooks clínicos.
- **Dependencias**: PR-02, PR-06.
- **Decisión previa**: Q2 sí.
- **Notas**: **No arrancar hasta que haya un cliente piloto que lo pague/use**.

---

## Cadencia sugerida

| Semana | PRs en vuelo | Observación |
| --- | --- | --- |
| S1 | PR-01 | Hotfix logout |
| S2 | PR-02 | Contratos + refactor server |
| S3 | PR-03, PR-04 en paralelo | 03 hace backend, 04 hace UI admin + `/admin/*` |
| S4 | PR-05 | Tokens — foundational |
| S4 | PR-05.5 | Playwright e2e smoke (blindaje antes de UI polish) |
| S5 | PR-06, PR-07 en paralelo | Pulido admin y clinic |
| S6 | PR-08 | Pricing marketing |
| S7+ | PR-09 opcional | Solo si hay demanda |

## Riesgo transversal: tests

Hoy hay tests unit (`tenant-routing.test.ts`, `tenant-experience.test.ts`, etc.) pero
**no hay un e2e real** del flujo completo auth+admin+impersonation. **Decisión tomada
(Q7-A): PR-05.5 añade Playwright con los 4 escenarios críticos** (login, cambio de
vertical, impersonation start/stop, logout) antes de arrancar PR-06/07.

Eso evita que PR-05/06/07 (tocan mucha UI) rompan flujos críticos sin darse cuenta.
