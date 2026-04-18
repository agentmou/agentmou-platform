import { describe, expect, it } from 'vitest';
import {
  buildPricingComparisonRows,
  clinicBeforeAfter,
  clinicCostOfInactionMetrics,
  clinicFlowPaths,
  clinicHowItWorksCards,
  clinicMarketingJobs,
  clinicOnboardingSteps,
  clinicPainPoints,
  clinicPatientJourney,
  clinicPricingPlans,
  clinicProofPanels,
  clinicRecoveryCapabilities,
  clinicSecurityPillars,
  clinicShowcaseCards,
  clinicModules,
  pricingCapabilities,
  pricingComparisonPlanOrder,
} from './clinic-site';

describe('clinic marketing content', () => {
  it('keeps the three core jobs visible on the homepage', () => {
    expect(clinicMarketingJobs.map((job) => job.eyebrow)).toEqual([
      'Atender',
      'Agendar',
      'Recuperar agenda',
    ]);
  });

  it('models the pain and cost-of-inaction blocks as configurable content', () => {
    expect(clinicPainPoints).toHaveLength(3);
    expect(clinicCostOfInactionMetrics).toHaveLength(3);
    expect(clinicCostOfInactionMetrics.every((metric) => 'note' in metric)).toBe(false);
  });

  it('describes how the clinic experience works across four operational surfaces', () => {
    expect(clinicHowItWorksCards.map((card) => card.title)).toEqual([
      'WhatsApp entrante',
      'Llamadas entrantes',
      'Mensajes salientes',
      'Centro de recepción',
    ]);
  });

  it('models new and existing patient flows separately', () => {
    expect(clinicFlowPaths.map((path) => path.title)).toEqual([
      'Ruta A - Paciente existente',
      'Ruta B - Paciente nuevo',
    ]);
    expect(clinicFlowPaths.every((path) => path.steps.length === 4)).toBe(true);
    expect(clinicPatientJourney.steps).toHaveLength(5);
    expect(clinicPatientJourney.outcomes.map((outcome) => outcome.label)).toEqual([
      'Paciente creado',
      'Cita registrada',
      'Formulario completado',
      'Recordatorio programado',
    ]);
  });

  it('exposes the clinic control center surfaces highlighted on the homepage', () => {
    expect(clinicShowcaseCards.map((card) => card.badge)).toEqual([
      'Bandeja',
      'Voice',
      'Agenda',
      'Seguimiento',
      'Growth',
      'Reactivación',
    ]);
    expect(clinicProofPanels).toHaveLength(2);
    expect(clinicRecoveryCapabilities).toHaveLength(4);
    expect(clinicBeforeAfter).toHaveLength(2);
  });

  it('keeps packaging and pricing organized around clinic modules, not runs', () => {
    expect(clinicModules.map((module) => module.name)).toEqual([
      'Core Reception',
      'Voice',
      'Growth',
      'Enterprise',
    ]);
    expect(clinicPricingPlans.map((plan) => plan.name)).toEqual([
      'Reception',
      'Reception + Voice',
      'Reception + Growth',
      'Enterprise',
    ]);
    expect(JSON.stringify(clinicPricingPlans).toLowerCase()).not.toContain('runs');
    expect(clinicPricingPlans.every((plan) => plan.bestFor.length > 0)).toBe(true);
  });

  it('derives the comparison table from pricingCapabilities in plan-card order', () => {
    const rows = buildPricingComparisonRows();

    // Every capability contributes exactly one row.
    expect(rows).toHaveLength(pricingCapabilities.length);

    // Each row has one value per plan column — no drift possible.
    for (const row of rows) {
      expect(row.values).toHaveLength(pricingComparisonPlanOrder.length);
    }

    // The column order matches the plan-card array so the visual blocks
    // tell the same story from left to right.
    expect(pricingComparisonPlanOrder).toEqual(clinicPricingPlans.map((plan) => plan.planKey));
  });

  it('flag-backed pricing capabilities defer to comparisonValue for per-plan text', () => {
    const voiceRow = buildPricingComparisonRows().find((row) => row.label === 'Voice');
    expect(voiceRow).toBeDefined();
    // Voice is "Opcional" on starter+scale and "Incluido" on pro+enterprise.
    expect(voiceRow!.values).toEqual(['Opcional', 'Incluido', 'Opcional', 'Incluido']);
  });

  it('narrative rows (no flagKey) are driven entirely by comparisonValue', () => {
    const deploymentRow = buildPricingComparisonRows().find((row) => row.label === 'Despliegue');
    expect(deploymentRow).toBeDefined();
    expect(deploymentRow!.values).toEqual([
      'Guiado',
      'Guiado',
      'Guiado',
      'Acompañamiento dedicado',
    ]);
  });

  it('every pricing capability references a plan the product actually offers', () => {
    const validPlans = new Set(pricingComparisonPlanOrder);
    for (const capability of pricingCapabilities) {
      for (const plan of capability.includedIn) {
        expect(validPlans.has(plan)).toBe(true);
      }
    }
  });

  it('maps each pricing tier to a programmatic plan, module, and flag contract', () => {
    // Every card must reference a real TenantPlan and at least one module +
    // one plan flag. The type-check already enforces the key strings; the
    // runtime assertions here keep the cardinality honest.
    expect(clinicPricingPlans.map((plan) => plan.planKey)).toEqual([
      'starter',
      'pro',
      'scale',
      'enterprise',
    ]);
    expect(
      clinicPricingPlans.every((plan) => plan.moduleKeys.length > 0 && plan.planFlags.length > 0)
    ).toBe(true);
    // Enterprise must strictly supersede lower tiers in both modules and flags.
    const enterprise = clinicPricingPlans.find((plan) => plan.planKey === 'enterprise');
    const scale = clinicPricingPlans.find((plan) => plan.planKey === 'scale');
    const pro = clinicPricingPlans.find((plan) => plan.planKey === 'pro');
    expect(enterprise && scale && pro).toBeTruthy();
    for (const module of scale!.moduleKeys) {
      expect(enterprise!.moduleKeys).toContain(module);
    }
    for (const flag of pro!.planFlags) {
      expect(enterprise!.planFlags).toContain(flag);
    }
  });

  it('keeps trust messaging grounded in clinic operations and closes with onboarding steps', () => {
    expect(clinicSecurityPillars).toHaveLength(4);
    expect(JSON.stringify(clinicSecurityPillars)).toContain('tenant');
    expect(clinicOnboardingSteps.map((step) => step.title)).toEqual([
      'Demo personalizada',
      'Configuración guiada',
      'Tu recepción IA activa',
    ]);
  });
});
