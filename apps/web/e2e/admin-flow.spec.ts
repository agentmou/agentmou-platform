import { expect, test } from '@playwright/test';

import { primeSession } from './fixtures/mock-api';

/**
 * Admin console smoke tests.
 *
 * Goal: catch regressions in the canonical /admin/* routes that PR-04
 * introduced and PR-06 polished. Anything UI-side that breaks
 * navigation between list → detail → features should fail here before
 * reaching the next clinic-polish PR.
 *
 * Locator note: the tenant name appears twice per row (once in the
 * first cell as display text, once inside the "Ver detalle de <name>"
 * action-button aria-label). Tests scope the assertion to the row
 * instead of the cell so strict-mode matching stays unambiguous.
 */

test.describe('admin console', () => {
  test.beforeEach(async ({ context, baseURL }) => {
    if (!baseURL) throw new Error('baseURL not configured');
    await primeSession(context, baseURL);
  });

  test('tenants list renders the mocked tenants and updates the URL on filter change', async ({
    page,
  }) => {
    await page.goto('/admin/tenants');

    await expect(page.getByRole('heading', { name: 'Tenants' })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'Clínica Sonrisa' })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'Centro Norte' })).toBeVisible();

    await page.getByLabel('Buscar tenants').fill('Sonrisa');

    // The page debounces URL writes by 300ms; wait for the querystring
    // to settle, then assert the filtered view.
    await page.waitForURL(/q=Sonrisa/);
    await expect(page.getByRole('row').filter({ hasText: 'Clínica Sonrisa' })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: 'Centro Norte' })).not.toBeVisible();

    // The "Limpiar filtros" CTA appears when at least one filter is set.
    await page
      .getByRole('button', { name: /limpiar filtros/i })
      .first()
      .click();
    await page.waitForURL((url) => !url.search.includes('q='));
    await expect(page.getByRole('row').filter({ hasText: 'Centro Norte' })).toBeVisible();
  });

  test('navigates from the list through the detail to the features page', async ({ page }) => {
    await page.goto('/admin/tenants');
    await expect(page.getByRole('row').filter({ hasText: 'Clínica Sonrisa' })).toBeVisible();

    await page.getByRole('link', { name: /ver detalle de clínica sonrisa/i }).click();

    await expect(page).toHaveURL(/\/admin\/tenants\/managed-tenant-1$/);
    await expect(page.getByRole('heading', { name: 'Clínica Sonrisa' })).toBeVisible();
    await expect(page.getByText('Tenant summary')).toBeVisible();

    await page.getByRole('link', { name: /ver features/i }).click();

    await expect(page).toHaveURL(/\/admin\/tenants\/managed-tenant-1\/features$/);
    await expect(page.getByRole('heading', { name: 'Resolución de features' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Decisiones por capability comercial' })
    ).toBeVisible();
    await expect(page.getByRole('tab', { name: /plan baseline/i })).toBeVisible();
  });
});
