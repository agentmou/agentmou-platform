import { z } from 'zod';
import {
  AdminChangeTenantVerticalSchema,
  AdminCreateTenantUserSchema,
  AdminStartImpersonationSchema,
  AdminStopImpersonationSchema,
  AdminTenantListFiltersSchema,
  AdminUpdateTenantEnabledVerticalsSchema,
  AdminUpdateTenantUserSchema,
} from '@agentmou/contracts';

function coerceQueryInput(
  input: unknown,
  options: {
    booleans?: string[];
    numbers?: string[];
  }
) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return input;
  }

  const values = { ...(input as Record<string, unknown>) };

  for (const key of options.booleans ?? []) {
    if (values[key] === 'true') {
      values[key] = true;
    } else if (values[key] === 'false') {
      values[key] = false;
    }
  }

  for (const key of options.numbers ?? []) {
    const value = values[key];
    if (typeof value === 'string' && value.length > 0) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        values[key] = parsed;
      }
    }
  }

  return values;
}

export const adminTenantParamsSchema = z.object({
  tenantId: z.string().uuid(),
});

export const adminTenantUserParamsSchema = adminTenantParamsSchema.extend({
  userId: z.string().uuid(),
});

export const adminTenantListQuerySchema = z.preprocess(
  (input) =>
    coerceQueryInput(input, {
      booleans: ['isPlatformAdminTenant'],
      numbers: ['limit'],
    }),
  AdminTenantListFiltersSchema
);

export const adminCreateTenantUserSchema = AdminCreateTenantUserSchema;
export const adminUpdateTenantUserSchema = AdminUpdateTenantUserSchema;
export const adminChangeTenantVerticalSchema = AdminChangeTenantVerticalSchema;
export const adminUpdateTenantEnabledVerticalsSchema = AdminUpdateTenantEnabledVerticalsSchema;
export const adminStartImpersonationSchema = AdminStartImpersonationSchema;
export const adminStopImpersonationSchema = AdminStopImpersonationSchema;
