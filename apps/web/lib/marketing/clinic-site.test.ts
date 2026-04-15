import { describe, expect, it } from 'vitest';
import {
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
