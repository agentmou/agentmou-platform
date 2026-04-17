# PR-08: Pricing — mapping visible + enforcement de coherencia

## Objetivo

Que la tabla pública de pricing (`/pricing`) muestre exactamente los módulos y features
que el código aplica internamente, sin fuente de verdad duplicada. Que añadir un
módulo o feature nuevo no requiera tocar dos sitios.

## Contexto

Hoy:
- `clinicPricingPlans` en `apps/web/lib/marketing/clinic-site.ts:505-564` define
  los 4 tiers con strings libres de features.
- `comparisonRows` en `apps/web/app/(marketing)/pricing/page.tsx:25-55` define
  una tabla comparativa con strings duplicados.
- No hay referencia cruzada entre `clinicPricingPlans` y `ModuleKey` o las flags
  Reflag (viene en PR-03 como `planKey`, `modules`, `planFlags`).

## Alcance

### Sí entra
- Generar `comparisonRows` a partir del mapping de PR-03 (sin hard-code separado).
- Añadir `pricingCapabilities` (un array de capabilities con label + featureKey +
  los planes que lo incluyen) como SoT única.
- Test de snapshot que rompe si diverge el orden o el contenido.
- Copy review ligero (solo ajustes de consistencia de tiempo verbal y estilo).

### No entra
- Cambios de precio (quedan `'Custom'` los 4).
- Rediseño visual del `/pricing` (está bien, 14/20 en audit).
- Nuevos tiers o nuevos módulos.

## Cambios técnicos

### `apps/web/lib/marketing/clinic-site.ts`

Nueva estructura:

```ts
interface PricingCapability {
  label: string;               // "WhatsApp inbound/outbound"
  flagKey: PlanFlagKey;        // 'plan.clinic.core_reception'
  includedIn: TenantPlan[];    // ['starter', 'pro', 'scale', 'enterprise']
  comparisonValue?: (plan: TenantPlan) => string;  // para la tabla, p.ej. "Incluido" / "Opcional"
}

export const pricingCapabilities: readonly PricingCapability[] = [
  {
    label: 'Core Reception',
    flagKey: 'plan.clinic.core_reception',
    includedIn: ['starter', 'pro', 'scale', 'enterprise'],
  },
  {
    label: 'Voice',
    flagKey: 'plan.clinic.voice.inbound',
    includedIn: ['pro', 'enterprise'],
    comparisonValue: (plan) =>
      plan === 'pro' || plan === 'enterprise' ? 'Incluido' : 'Opcional',
  },
  {
    label: 'Growth',
    flagKey: 'plan.clinic.gap_recovery',
    includedIn: ['scale', 'enterprise'],
    comparisonValue: (plan) =>
      plan === 'scale' || plan === 'enterprise' ? 'Incluido' : 'Opcional',
  },
  // ... 10 más
];
```

`clinicPricingPlans` se mantiene (consumido por las cards de la pricing page), pero
el array `features` de cada plan pasa a derivarse:

```ts
function featuresForPlan(planKey: TenantPlan): readonly string[] {
  return pricingCapabilities
    .filter((c) => c.includedIn.includes(planKey))
    .map((c) => c.label);
}
```

### `apps/web/app/(marketing)/pricing/page.tsx`

- `comparisonRows` se genera:

```ts
const comparisonRows = pricingCapabilities.map((capability) => ({
  label: capability.label,
  values: pricingPlansOrder.map((plan) =>
    capability.comparisonValue?.(plan) ??
    (capability.includedIn.includes(plan) ? 'Incluido' : '—')
  ),
}));
```

- Ya no hay array `comparisonRows` hardcodeado.

### Tests

- `lib/marketing/clinic-site.test.ts`:
  - Snapshot de `pricingCapabilities`.
  - Snapshot de `clinicPricingPlans` derivado.
  - Check: cada `planFlag` referenciado existe en `PlanFlagKey` catalog.

### Admin consumption

- Admin UI de features (PR-04) puede ahora leer `pricingCapabilities` para mostrar
  "este tenant está en plan `pro`, incluye Voice por contrato comercial".

## Decisiones de diseño

### ¿Fuente única en marketing o en `packages/contracts`?

**Decisión: marketing.** Porque es el dueño comercial y lo consume la pricing page.
Los contratos deben ser neutrales a comercial (un backend de admin no debe saber
cómo se llama el tier comercial; sí el plan interno).

**Alternativa:** en contracts. Descartada.

### ¿`comparisonValue` callback o enum?

**Decisión: callback.** Permite casos como "Opcional" que no caben en binario
incluido/no-incluido.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Cambio de `features[]` en plan cards confunde al cliente por cambio de orden | Mantener orden manual por plan en `pricingCapabilities` |
| Test de snapshot rompe tras edit legítimo | Update snapshot explícito en el PR |
| Nombres de `label` entre card list y comparison table divergen | Usar la misma propiedad `label` — divergencia imposible por construcción |

## Criterios de aceptación

- [ ] `pricingCapabilities` en `clinic-site.ts` como SoT única.
- [ ] `clinicPricingPlans.features` derivado de `pricingCapabilities`.
- [ ] `comparisonRows` generado, no hardcodeado.
- [ ] Snapshot test que cubre pricing page con el mapping.
- [ ] La pricing page se ve igual que antes (screenshot comparativo en PR body).
- [ ] Ninguna referencia a string libre de módulo/feature en la UI fuera de
  `clinic-site.ts`.

## Plan de pruebas

**Unit:**
- `clinic-site.test.ts` con snapshots.

**Manual:**
- Visual comparison antes/después en `/pricing`.

## Rollback plan

- Revert. Arrays hardcodeados vuelven a su sitio.
