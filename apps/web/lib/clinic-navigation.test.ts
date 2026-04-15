import { describe, expect, it } from 'vitest';

import { resolveClinicSidebarNavigation } from './clinic-navigation';

function createCapabilities(overrides: Partial<ReturnType<typeof defaultCapabilities>> = {}) {
  return {
    ...defaultCapabilities(),
    ...overrides,
  };
}

function defaultCapabilities() {
  return {
    coreReceptionEnabled: true,
    voiceEnabled: true,
    growthEnabled: true,
    formsEnabled: true,
    confirmationsEnabled: true,
    gapsEnabled: true,
    reactivationEnabled: true,
    multiLocationEnabled: false,
    whatsappAvailable: true,
    voiceChannelAvailable: true,
    internalPlatformEnabled: false,
    canAccessInternalPlatform: false,
  };
}

describe('clinic navigation', () => {
  it('groups clinic navigation in the expected order and moves configuration to the footer', () => {
    const navigation = resolveClinicSidebarNavigation({
      allowedNavigation: [
        'dashboard',
        'inbox',
        'appointments',
        'patients',
        'follow_up',
        'reactivation',
        'reports',
        'configuration',
      ],
      capabilities: createCapabilities(),
    });

    expect(navigation.sections.map((section) => section.label)).toEqual([
      'Inicio',
      'Operación',
      'Seguimiento',
      'Análisis',
    ]);
    expect(navigation.sections[0]?.items.map((item) => item.label)).toEqual(['Resumen']);
    expect(navigation.sections[1]?.items.map((item) => item.label)).toEqual([
      'Bandeja',
      'Agenda',
      'Pacientes',
    ]);
    expect(navigation.sections[2]?.items.map((item) => item.label)).toEqual([
      'Seguimiento',
      'Reactivación',
    ]);
    expect(navigation.sections[3]?.items.map((item) => item.label)).toEqual(['Rendimiento']);
    expect(navigation.footerItem?.label).toBe('Configuración');
  });

  it('drops empty sections when only dashboard and configuration are available', () => {
    const navigation = resolveClinicSidebarNavigation({
      allowedNavigation: ['dashboard', 'configuration'],
      capabilities: createCapabilities(),
    });

    expect(navigation.sections).toHaveLength(1);
    expect(navigation.sections[0]?.label).toBe('Inicio');
    expect(navigation.sections[0]?.items.map((item) => item.label)).toEqual(['Resumen']);
    expect(navigation.footerItem?.label).toBe('Configuración');
  });

  it('falls back to capability-driven visibility when allowed navigation is empty', () => {
    const navigation = resolveClinicSidebarNavigation({
      allowedNavigation: [],
      capabilities: createCapabilities({
        coreReceptionEnabled: false,
        reactivationEnabled: false,
      }),
    });

    expect(navigation.sections.map((section) => section.label)).toEqual(['Inicio']);
    expect(navigation.sections[0]?.items.map((item) => item.label)).toEqual(['Resumen']);
    expect(navigation.footerItem?.label).toBe('Configuración');
  });
});
