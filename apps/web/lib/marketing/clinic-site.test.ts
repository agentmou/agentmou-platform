import { describe, expect, it } from 'vitest';
import {
  clinicFlowPaths,
  clinicMarketingJobs,
  clinicPricingPlans,
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

  it('models new and existing patient flows separately', () => {
    expect(clinicFlowPaths.map((path) => path.title)).toEqual([
      'Ruta A - Paciente existente',
      'Ruta B - Paciente nuevo',
    ]);
    expect(clinicFlowPaths.every((path) => path.steps.length === 4)).toBe(true);
  });

  it('exposes the clinic control center surfaces highlighted on the homepage', () => {
    expect(clinicShowcaseCards.map((card) => card.badge)).toEqual([
      'Bandeja',
      'Voice',
      'Agenda',
      'Seguimiento',
      'Growth',
      'Reactivacion',
    ]);
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
  });

  it('keeps trust messaging grounded in clinic operations', () => {
    expect(clinicSecurityPillars).toHaveLength(4);
    expect(JSON.stringify(clinicSecurityPillars)).toContain('tenant');
  });
});
