import { z } from 'zod';
import {
  CampaignFiltersSchema,
  CallFiltersSchema,
  ChannelTypeSchema,
  ClinicListQuerySchema,
  ConfirmationFiltersSchema,
  ConversationFiltersSchema,
  GapFiltersSchema,
  ModuleKeySchema,
  PatientFiltersSchema,
  AppointmentFiltersSchema,
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

function buildClinicQuerySchema<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  options: {
    booleans?: string[];
    numbers?: string[];
  }
) {
  return z.preprocess((input) => coerceQueryInput(input, options), schema);
}

export const tenantScopedParamsSchema = z.object({
  tenantId: z.string().min(1),
});

export const tenantModuleParamsSchema = tenantScopedParamsSchema.extend({
  moduleKey: ModuleKeySchema,
});

export const tenantChannelParamsSchema = tenantScopedParamsSchema.extend({
  channelType: ChannelTypeSchema,
});

export const patientParamsSchema = tenantScopedParamsSchema.extend({
  patientId: z.string().min(1),
});

export const conversationParamsSchema = tenantScopedParamsSchema.extend({
  threadId: z.string().min(1),
});

export const callParamsSchema = tenantScopedParamsSchema.extend({
  callId: z.string().min(1),
});

export const appointmentParamsSchema = tenantScopedParamsSchema.extend({
  appointmentId: z.string().min(1),
});

export const formSubmissionParamsSchema = tenantScopedParamsSchema.extend({
  submissionId: z.string().min(1),
});

export const confirmationParamsSchema = tenantScopedParamsSchema.extend({
  confirmationId: z.string().min(1),
});

export const gapParamsSchema = tenantScopedParamsSchema.extend({
  gapId: z.string().min(1),
});

export const campaignParamsSchema = tenantScopedParamsSchema.extend({
  campaignId: z.string().min(1),
});

export const patientFiltersSchema = buildClinicQuerySchema(PatientFiltersSchema, {
  booleans: ['isExisting', 'isReactivationCandidate', 'hasPendingForm', 'hasUpcomingAppointment'],
  numbers: ['limit'],
});
export const conversationFiltersSchema = buildClinicQuerySchema(ConversationFiltersSchema, {
  booleans: ['requiresHumanReview'],
  numbers: ['limit'],
});
export const callFiltersSchema = buildClinicQuerySchema(CallFiltersSchema, {
  numbers: ['limit'],
});
export const appointmentFiltersSchema = buildClinicQuerySchema(AppointmentFiltersSchema, {
  numbers: ['limit'],
});
export const confirmationFiltersSchema = buildClinicQuerySchema(ConfirmationFiltersSchema, {
  numbers: ['limit'],
});
export const gapFiltersSchema = buildClinicQuerySchema(GapFiltersSchema, {
  numbers: ['limit'],
});
export const campaignFiltersSchema = buildClinicQuerySchema(CampaignFiltersSchema, {
  numbers: ['limit'],
});
export const clinicListQuerySchema = buildClinicQuerySchema(ClinicListQuerySchema, {
  numbers: ['limit'],
});

export const reactivationRecipientsQuerySchema = clinicListQuerySchema;
