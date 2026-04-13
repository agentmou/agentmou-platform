import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { settingsPageMock } = vi.hoisted(() => ({
  settingsPageMock: vi.fn(() => <div>shared-tenant-settings-page</div>),
}));

vi.mock('@/components/settings/tenant-settings-page', () => ({
  TenantSettingsPage: settingsPageMock,
}));

import ConfigurationPage from './configuracion/page';
import SettingsPage from './settings/page';

describe('tenant settings route wrappers', () => {
  beforeEach(() => {
    settingsPageMock.mockClear();
  });

  it('reuses the shared settings page for /configuracion', () => {
    const html = renderToStaticMarkup(<ConfigurationPage />);

    expect(settingsPageMock).toHaveBeenCalledTimes(1);
    expect(html).toContain('shared-tenant-settings-page');
  });

  it('reuses the shared settings page for /settings', () => {
    const html = renderToStaticMarkup(<SettingsPage />);

    expect(settingsPageMock).toHaveBeenCalledTimes(1);
    expect(html).toContain('shared-tenant-settings-page');
  });
});
