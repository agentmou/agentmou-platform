import { describe, expect, it } from 'vitest';

import { resolveInternalNavigation } from './internal-navigation';

describe('internal navigation', () => {
  it('keeps the default internal groups in the expected order', () => {
    const navigation = resolveInternalNavigation({
      allowedNavigation: ['platform_internal'],
      canAccessAdminConsole: false,
    });

    expect(navigation.sections.map((section) => section.label)).toEqual([
      'Overview',
      'Agents',
      'Operations',
      'Security',
    ]);
    expect(navigation.footerItem?.href).toBe('/settings');
  });

  it('shows the admin block only when the tenant can access the admin console', () => {
    const navigation = resolveInternalNavigation({
      allowedNavigation: ['platform_internal', 'admin_console'],
      canAccessAdminConsole: true,
    });

    expect(navigation.sections.at(-1)?.label).toBe('Admin');
    expect(navigation.sections.at(-1)?.items[0]?.href).toBe('/admin/tenants');
  });

  it('drops the admin block when the tenant lacks the admin navigation key', () => {
    const navigation = resolveInternalNavigation({
      allowedNavigation: ['platform_internal'],
      canAccessAdminConsole: true,
    });

    expect(navigation.sections.some((section) => section.label === 'Admin')).toBe(false);
  });

  it('drops the admin block when the resolved experience disables the admin console', () => {
    const navigation = resolveInternalNavigation({
      allowedNavigation: ['platform_internal', 'admin_console'],
      canAccessAdminConsole: false,
    });

    expect(navigation.sections.some((section) => section.label === 'Admin')).toBe(false);
  });

  it('keeps dashboard and settings visible when only shared access is available', () => {
    const navigation = resolveInternalNavigation({
      allowedNavigation: [],
      canAccessAdminConsole: false,
    });

    expect(navigation.sections[0]?.items[0]?.href).toBe('/dashboard');
    expect(navigation.footerItem?.href).toBe('/settings');
  });
});
