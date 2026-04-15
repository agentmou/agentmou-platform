import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const { useTenantExperienceMock } = vi.hoisted(() => ({
  useTenantExperienceMock: vi.fn(() => ({
    tenantId: 'demo-workspace',
  })),
}));

vi.mock('@/lib/tenant-experience', () => ({
  useTenantExperience: useTenantExperienceMock,
}));

import { ModuleVisibilityGuard } from './module-visibility-guard';

describe('ModuleVisibilityGuard', () => {
  it('renders children when the feature is enabled', () => {
    const html = renderToStaticMarkup(
      <ModuleVisibilityGuard enabled title="Voice" description="Calls">
        <div>Contenido habilitado</div>
      </ModuleVisibilityGuard>
    );

    expect(html).toContain('Contenido habilitado');
  });

  it('renders the locked empty state when the feature is disabled', () => {
    const html = renderToStaticMarkup(
      <ModuleVisibilityGuard
        enabled={false}
        title="Voice"
        description="Activa el módulo para gestionar llamadas."
      >
        <div>Contenido habilitado</div>
      </ModuleVisibilityGuard>
    );

    expect(html).toContain('Voice');
    expect(html).toContain('Activa el módulo para gestionar llamadas.');
    expect(html).toContain('Ir a Configuración');
    expect(html).toContain('/app/demo-workspace/configuracion?section=plan');
  });
});
