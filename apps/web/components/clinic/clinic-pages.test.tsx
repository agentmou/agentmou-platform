import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useProviderQueryMock, useTenantExperienceMock } = vi.hoisted(() => ({
  useProviderQueryMock: vi.fn(),
  useTenantExperienceMock: vi.fn(),
}));

vi.mock('@/lib/data/use-provider-query', () => ({
  useProviderQuery: useProviderQueryMock,
}));

vi.mock('@/lib/tenant-experience', () => ({
  hasClinicNavigationAccess: () => true,
  useTenantExperience: useTenantExperienceMock,
}));

import { ClinicFormsPage, ClinicPerformancePage, ClinicReactivationPage } from './clinic-pages';

const baseExperience = {
  tenantId: 'demo-workspace',
  activeVertical: 'clinic',
  tenant: {
    id: 'demo-workspace',
    settings: {
      timezone: 'Europe/Madrid',
    },
  },
  profile: {
    timezone: 'Europe/Madrid',
  },
  capabilities: {
    formsEnabled: true,
    confirmationsEnabled: true,
    gapsEnabled: true,
    reactivationEnabled: true,
    voiceEnabled: true,
  },
};

describe('clinic pages', () => {
  beforeEach(() => {
    useProviderQueryMock.mockReset();
    useTenantExperienceMock.mockReturnValue(baseExperience);
  });

  it('renders honest operational KPIs without invented revenue estimates', () => {
    useProviderQueryMock
      .mockReturnValueOnce({
        data: {
          tenantId: 'demo-workspace',
          generatedAt: '2026-01-15T08:00:00.000Z',
          kpis: {
            openThreads: 12,
            pendingConfirmations: 4,
            pendingForms: 2,
            activeGaps: 3,
            activeCampaigns: 1,
            todaysAppointments: 9,
            patientsNew: 3,
            patientsExisting: 6,
          },
        },
      })
      .mockReturnValueOnce({
        data: {
          calls: [],
          total: 0,
        },
      });

    const html = renderToStaticMarkup(<ClinicPerformancePage />);

    expect(html).toContain('Conversaciones abiertas');
    expect(html).toContain('Confirmaciones pendientes');
    expect(html).not.toContain('Ingresos recuperados');
    expect(html).not.toContain('No-shows evitados');
    expect(html).not.toContain('180');
  });

  it('shows a contextual empty state for pending forms', () => {
    useProviderQueryMock.mockReturnValueOnce({
      data: [],
    });

    const html = renderToStaticMarkup(<ClinicFormsPage />);

    expect(html).toContain('No hay formularios pendientes');
    expect(html).toContain('bloqueo de reserva');
  });

  it('shows contextual reactivation empty states when there is no campaign activity', () => {
    useProviderQueryMock
      .mockReturnValueOnce({
        data: {
          campaigns: [],
          total: 0,
        },
      })
      .mockReturnValueOnce({
        data: [],
      });

    const html = renderToStaticMarkup(<ClinicReactivationPage />);

    expect(html).toContain('No hay campañas activas');
    expect(html).toContain('Sin respuestas recientes');
  });
});
