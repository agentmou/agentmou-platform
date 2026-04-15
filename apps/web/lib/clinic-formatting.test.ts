import { describe, expect, it } from 'vitest';

import {
  formatClinicDate,
  formatClinicDateTime,
  formatClinicLabel,
  formatClinicTime,
  resolveClinicTimezone,
} from './clinic-formatting';

describe('clinic formatting', () => {
  it('prefers profile timezone over tenant timezone', () => {
    expect(
      resolveClinicTimezone({
        profileTimezone: 'America/Bogota',
        tenantTimezone: 'Europe/Madrid',
      })
    ).toBe('America/Bogota');
  });

  it('falls back to tenant timezone and then UTC', () => {
    expect(resolveClinicTimezone({ tenantTimezone: 'Europe/Madrid' })).toBe('Europe/Madrid');
    expect(resolveClinicTimezone({})).toBe('UTC');
  });

  it('formats clinic dates and times deterministically', () => {
    const iso = '2026-01-15T10:30:00.000Z';

    expect(formatClinicDate(iso, 'Europe/Madrid')).toBe('15/01/2026');
    expect(formatClinicTime(iso, 'Europe/Madrid')).toBe('11:30');
    expect(formatClinicDateTime(iso, 'Europe/Madrid')).toBe('15/01/2026 · 11:30');
  });

  it('humanizes common clinic labels', () => {
    expect(formatClinicLabel('pending_form')).toBe('Pendiente de formulario');
    expect(formatClinicLabel('whatsapp')).toBe('WhatsApp');
    expect(formatClinicLabel('reactivation_campaign')).toBe('Reactivation campaign');
  });
});
