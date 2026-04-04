import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

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
        description="Activa el modulo para gestionar llamadas."
      >
        <div>Contenido habilitado</div>
      </ModuleVisibilityGuard>
    );

    expect(html).toContain('Voice');
    expect(html).toContain('Activa el modulo para gestionar llamadas.');
    expect(html).toContain('Ver modulos activos');
  });
});
