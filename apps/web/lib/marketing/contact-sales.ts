import { z } from 'zod';

export const contactSalesModuleOptions = [
  { value: 'core_reception', label: 'Core Reception' },
  { value: 'voice', label: 'Voice' },
  { value: 'growth', label: 'Growth' },
  { value: 'enterprise', label: 'Enterprise' },
] as const;

export const ContactSalesModuleSchema = z.enum([
  'core_reception',
  'voice',
  'growth',
  'enterprise',
]);

export const ContactSalesLeadSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  clinicName: z.string().trim().min(2).max(160),
  workEmail: z.string().trim().email().max(160),
  phone: z.string().trim().min(7).max(40),
  interestedModules: z.array(ContactSalesModuleSchema).min(1).max(4),
  message: z.string().trim().min(10).max(2000),
  sourcePath: z.string().trim().min(1).max(200).default('/contact-sales'),
});

export type ContactSalesLeadInput = z.infer<typeof ContactSalesLeadSchema>;
