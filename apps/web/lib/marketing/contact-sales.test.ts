import { describe, expect, it } from 'vitest';
import {
  ContactSalesLeadSchema,
  contactSalesModuleOptions,
  ContactSalesModuleSchema,
} from './contact-sales';

describe('contact sales marketing helpers', () => {
  it('offers the expected clinic module options', () => {
    expect(contactSalesModuleOptions.map((option) => option.value)).toEqual([
      'core_reception',
      'voice',
      'growth',
      'enterprise',
    ]);
  });

  it('validates a complete contact sales lead', () => {
    const parsed = ContactSalesLeadSchema.parse({
      fullName: 'Ana Perez',
      clinicName: 'Clinica Dental Centro',
      workEmail: 'recepcion@clinicadental.com',
      phone: '+34 600 000 000',
      interestedModules: [
        ContactSalesModuleSchema.enum.core_reception,
        ContactSalesModuleSchema.enum.voice,
      ],
      message: 'Queremos mejorar recepcion, no-shows y callbacks.',
      sourcePath: '/contact-sales',
    });

    expect(parsed.interestedModules).toEqual(['core_reception', 'voice']);
  });
});
