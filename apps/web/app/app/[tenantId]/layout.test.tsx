import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  authState,
  replaceMock,
  useAuthStoreMock,
  useParamsMock,
  usePathnameMock,
  useResolvedTenantExperienceMock,
} = vi.hoisted(() => ({
  authState: {
    user: null,
    tenants: [] as Array<{ id: string; settings: Record<string, unknown> }>,
  },
  replaceMock: vi.fn(),
  useAuthStoreMock: vi.fn(),
  useParamsMock: vi.fn(() => ({ tenantId: 'demo-workspace' })),
  usePathnameMock: vi.fn(() => '/app/demo-workspace/dashboard'),
  useResolvedTenantExperienceMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: useParamsMock,
  usePathname: usePathnameMock,
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock('@/lib/auth/store', () => ({
  useAuthStore: useAuthStoreMock,
}));

vi.mock('@/lib/providers/tenant', () => ({
  getTenantDataProvider: () => ({ providerMode: 'mock' }),
}));

vi.mock('@/lib/shell-registry', () => ({
  getShellComponent:
    () =>
    ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/lib/tenant-routing', () => ({
  resolveTenantRouteRedirect: () => null,
}));

vi.mock('@/lib/tenant-experience', () => ({
  TenantExperienceProvider: ({ children }: { children: ReactNode }) => children,
  useResolvedTenantExperience: useResolvedTenantExperienceMock,
}));

import TenantLayout from './layout';

describe('tenant layout loading shell', () => {
  beforeEach(() => {
    replaceMock.mockReset();
    useAuthStoreMock.mockImplementation((selector: (state: typeof authState) => unknown) =>
      selector(authState)
    );
  });

  it('renders the clinic loading shell when the tenant is a care vertical', () => {
    authState.tenants = [
      {
        id: 'demo-workspace',
        settings: { activeVertical: 'clinic', verticalClinicUi: true },
      },
    ];
    useResolvedTenantExperienceMock.mockReturnValue({
      isLoading: true,
      hasTenantAccess: true,
      fallbackTenantId: null,
      resolvedExperience: null,
      shellKey: 'clinic',
    });

    const html = renderToStaticMarkup(
      <TenantLayout>
        <div>child</div>
      </TenantLayout>
    );

    expect(html).toContain('data-testid="tenant-workspace-loading-shell"');
    expect(html).toContain('data-variant="clinic"');
    expect(html).toContain('Operación');
    expect(html).not.toContain('Loading workspace');
  });

  it('falls back to the generic loading shell for non-clinic tenants', () => {
    authState.tenants = [
      {
        id: 'demo-workspace',
        settings: { activeVertical: 'internal', verticalClinicUi: false },
      },
    ];
    useResolvedTenantExperienceMock.mockReturnValue({
      isLoading: true,
      hasTenantAccess: true,
      fallbackTenantId: null,
      resolvedExperience: null,
      shellKey: 'platform_internal',
    });

    const html = renderToStaticMarkup(
      <TenantLayout>
        <div>child</div>
      </TenantLayout>
    );

    expect(html).toContain('data-variant="generic"');
    expect(html).toContain('Espacios');
  });
});
