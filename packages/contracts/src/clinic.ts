import { z } from 'zod';
import { TenantPlanSchema, UserRoleSchema } from './tenancy';
import { TenantVerticalConfigSchema, VerticalKeySchema } from './verticals';

const DateTimeStringSchema = z.string();
const JsonRecordSchema = z.record(z.unknown());
const NullableStringSchema = z.string().nullable();

// ---------------------------------------------------------------------------
// Shared policy and enum schemas
// ---------------------------------------------------------------------------

/** Supported visible clinic verticals. */
export const VerticalTypeSchema = z.enum(['clinic_dental', 'clinic_generic']);
export type VerticalType = z.infer<typeof VerticalTypeSchema>;

/** Product modules that can be toggled per tenant. */
export const ModuleKeySchema = z.enum([
  'core_reception',
  'voice',
  'growth',
  'advanced_mode',
  'internal_platform',
]);
export type ModuleKey = z.infer<typeof ModuleKeySchema>;

/** Availability states for tenant modules. */
export const ModuleStatusSchema = z.enum(['enabled', 'disabled', 'hidden', 'beta']);
export type ModuleStatus = z.infer<typeof ModuleStatusSchema>;

/** High-level shell modes supported by clinic-aware tenants. */
export const ExperienceModeSchema = z.enum(['clinic', 'platform_internal']);
export type ExperienceMode = z.infer<typeof ExperienceModeSchema>;

/** Derived clinic permissions exposed to backend and web consumers. */
export const ClinicPermissionSchema = z.enum([
  'view_dashboard',
  'view_inbox',
  'manage_inbox',
  'view_appointments',
  'manage_appointments',
  'view_patients',
  'manage_patients',
  'view_follow_up',
  'manage_follow_up',
  'view_reactivation',
  'manage_reactivation',
  'view_reports',
  'manage_clinic_settings',
  'view_internal_platform',
]);
export type ClinicPermission = z.infer<typeof ClinicPermissionSchema>;

/** Supported clinic communication channels. */
export const ChannelTypeSchema = z.enum(['whatsapp', 'voice']);
export type ChannelType = z.infer<typeof ChannelTypeSchema>;

/** Known channel providers used by the clinic runtime. */
export const ClinicChannelProviderSchema = z.enum([
  'mock_whatsapp',
  'mock_voice',
  'twilio_whatsapp',
  'twilio_voice',
  'retell_voice',
]);
export type ClinicChannelProvider = z.infer<typeof ClinicChannelProviderSchema>;

/** Operational states for a configured clinic channel. */
export const ChannelStatusSchema = z.enum(['active', 'inactive', 'error']);
export type ChannelStatus = z.infer<typeof ChannelStatusSchema>;

/** Message or call direction. */
export const DirectionSchema = z.enum(['inbound', 'outbound']);
export type Direction = z.infer<typeof DirectionSchema>;

/** Status values for patient records. */
export const PatientStatusSchema = z.enum([
  'new_lead',
  'intake_pending',
  'existing',
  'waiting',
  'inactive',
  'reactivated',
  'do_not_contact',
]);
export type PatientStatus = z.infer<typeof PatientStatusSchema>;

/** Identity types used to match a patient from inbound traffic. */
export const PatientIdentityTypeSchema = z.enum([
  'phone',
  'email',
  'external_id',
  'name_dob',
  'other',
]);
export type PatientIdentityType = z.infer<typeof PatientIdentityTypeSchema>;

/** Lifecycle states for inbox threads. */
export const ThreadStatusSchema = z.enum([
  'new',
  'in_progress',
  'pending_form',
  'pending_human',
  'resolved',
  'escalated',
  'closed',
]);
export type ThreadStatus = z.infer<typeof ThreadStatusSchema>;

/** Canonical intents inferred from clinic conversations. */
export const ConversationIntentSchema = z.enum([
  'book_appointment',
  'reschedule_appointment',
  'cancel_appointment',
  'request_gap_fill',
  'new_patient',
  'existing_patient',
  'faq',
  'billing_question',
  'human_handoff',
  'general_inquiry',
]);
export type ConversationIntent = z.infer<typeof ConversationIntentSchema>;

/** Priority tiers for inbox items and follow-up tasks. */
export const PrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);
export type Priority = z.infer<typeof PrioritySchema>;

/** Message-level payload types tracked in threads. */
export const MessageTypeSchema = z.enum([
  'text',
  'template',
  'call_summary',
  'system',
  'form_link',
  'note',
]);
export type MessageType = z.infer<typeof MessageTypeSchema>;

/** Delivery states for outbound and inbound message records. */
export const MessageDeliveryStatusSchema = z.enum([
  'queued',
  'sent',
  'delivered',
  'failed',
  'received',
  'read',
]);
export type MessageDeliveryStatus = z.infer<typeof MessageDeliveryStatusSchema>;

/** Provider-level send/update states shared by channel adapters and workers. */
export const ClinicDeliveryProviderStatusSchema = z.enum([
  'queued',
  'accepted',
  'sent',
  'delivered',
  'failed',
]);
export type ClinicDeliveryProviderStatus = z.infer<typeof ClinicDeliveryProviderStatusSchema>;

/** Failure classes used when a provider cannot complete a clinic action. */
export const ClinicDeliveryFailureReasonSchema = z.enum([
  'provider_rejected',
  'provider_unavailable',
  'channel_misconfigured',
  'channel_inactive',
  'unknown',
]);
export type ClinicDeliveryFailureReason = z.infer<typeof ClinicDeliveryFailureReasonSchema>;

/** Call handling states surfaced to the UI. */
export const CallStatusSchema = z.enum([
  'received',
  'in_progress',
  'handled_by_ai',
  'forwarded',
  'unresolved',
  'callback_required',
  'closed',
]);
export type CallStatus = z.infer<typeof CallStatusSchema>;

/** Form submission lifecycle states. */
export const IntakeSubmissionStatusSchema = z.enum([
  'pending',
  'sent',
  'opened',
  'completed',
  'waived',
  'expired',
]);
export type IntakeSubmissionStatus = z.infer<typeof IntakeSubmissionStatusSchema>;

/** Appointment status values exposed to clinic users. */
export const AppointmentStatusSchema = z.enum([
  'draft',
  'pending_form',
  'scheduled',
  'confirmed',
  'rescheduled',
  'cancelled',
  'completed',
  'no_show',
]);
export type AppointmentStatus = z.infer<typeof AppointmentStatusSchema>;

/** Sources that can create or modify appointments. */
export const AppointmentSourceSchema = z.enum([
  'manual',
  'whatsapp',
  'voice',
  'campaign',
  'import',
  'api',
]);
export type AppointmentSource = z.infer<typeof AppointmentSourceSchema>;

/** Reminder execution states. */
export const ReminderStatusSchema = z.enum(['pending', 'scheduled', 'sent', 'failed', 'completed']);
export type ReminderStatus = z.infer<typeof ReminderStatusSchema>;

/** Confirmation response states. */
export const ConfirmationStatusSchema = z.enum([
  'pending',
  'confirmed',
  'declined',
  'no_response',
  'expired',
  'escalated',
]);
export type ConfirmationStatus = z.infer<typeof ConfirmationStatusSchema>;

/** Waitlist states for patients interested in earlier slots. */
export const WaitlistStatusSchema = z.enum(['active', 'paused', 'matched', 'expired', 'cancelled']);
export type WaitlistStatus = z.infer<typeof WaitlistStatusSchema>;

/** Gap lifecycle states used for smart gap fill. */
export const GapStatusSchema = z.enum([
  'open',
  'offered',
  'claimed',
  'filled',
  'expired',
  'discarded',
]);
export type GapStatus = z.infer<typeof GapStatusSchema>;

/** Origins of a gap in the schedule. */
export const GapOriginSchema = z.enum([
  'cancellation',
  'reschedule',
  'manual',
  'schedule_optimization',
]);
export type GapOrigin = z.infer<typeof GapOriginSchema>;

/** Status values for individual gap outreach attempts. */
export const OutreachStatusSchema = z.enum([
  'pending',
  'sent',
  'responded',
  'accepted',
  'declined',
  'expired',
  'failed',
]);
export type OutreachStatus = z.infer<typeof OutreachStatusSchema>;

/** Reactivation campaign states. */
export const CampaignStatusSchema = z.enum([
  'draft',
  'scheduled',
  'running',
  'paused',
  'completed',
  'failed',
]);
export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;

/** Supported reactivation campaign families. */
export const CampaignTypeSchema = z.enum([
  'recall',
  'hygiene_recall',
  'unfinished_treatment',
  'winback',
  'custom',
]);
export type CampaignType = z.infer<typeof CampaignTypeSchema>;

/** Recipient-level delivery states for reactivation outreach. */
export const CampaignRecipientStatusSchema = z.enum([
  'pending',
  'contacted',
  'responded',
  'booked',
  'opted_out',
  'failed',
]);
export type CampaignRecipientStatus = z.infer<typeof CampaignRecipientStatusSchema>;

/** Actors recorded on appointment events. */
export const AppointmentActorTypeSchema = z.enum(['ai', 'human', 'patient', 'system']);
export type AppointmentActorType = z.infer<typeof AppointmentActorTypeSchema>;

/** Clinic weekly operating windows by weekday key. */
export const BusinessHoursWindowSchema = z.object({
  start: z.string(),
  end: z.string(),
});
export type BusinessHoursWindow = z.infer<typeof BusinessHoursWindowSchema>;

/** Structured business hours used by the clinic profile. */
export const BusinessHoursSchema = z.record(z.array(BusinessHoursWindowSchema));
export type BusinessHours = z.infer<typeof BusinessHoursSchema>;

/** Channel-level routing controls. */
export const DirectionPolicySchema = z.object({
  inboundEnabled: z.boolean().optional(),
  outboundEnabled: z.boolean().optional(),
  fallbackToHuman: z.boolean().optional(),
  recordCalls: z.boolean().optional(),
  afterHoursVoicemail: z.boolean().optional(),
});
export type DirectionPolicy = z.infer<typeof DirectionPolicySchema>;

/** Clinic-wide confirmation settings. */
export const ConfirmationPolicySchema = z.object({
  enabled: z.boolean().optional(),
  leadHours: z.number().optional(),
  escalationDelayHours: z.number().optional(),
  autoCancelOnDecline: z.boolean().optional(),
});
export type ConfirmationPolicy = z.infer<typeof ConfirmationPolicySchema>;

/** Gap recovery defaults configured at the clinic level. */
export const GapRecoveryPolicySchema = z.object({
  enabled: z.boolean().optional(),
  lookaheadHours: z.number().optional(),
  maxOffersPerGap: z.number().optional(),
  prioritizeWaitlist: z.boolean().optional(),
});
export type GapRecoveryPolicy = z.infer<typeof GapRecoveryPolicySchema>;

/** Default settings for reactivation campaigns. */
export const ReactivationPolicySchema = z.object({
  enabled: z.boolean().optional(),
  inactivityThresholdDays: z.number().optional(),
  cooldownDays: z.number().optional(),
  defaultCampaignType: CampaignTypeSchema.optional(),
});
export type ReactivationPolicy = z.infer<typeof ReactivationPolicySchema>;

/** Contact consent and outreach preferences attached to a patient. */
export const ConsentFlagsSchema = z.object({
  whatsapp: z.boolean().optional(),
  voice: z.boolean().optional(),
  email: z.boolean().optional(),
  marketing: z.boolean().optional(),
  sms: z.boolean().optional(),
});
export type ConsentFlags = z.infer<typeof ConsentFlagsSchema>;

/** Preferred time window for waitlist or outreach logic. */
export const PreferredWindowSchema = z.object({
  start: z.string(),
  end: z.string(),
  label: z.string().optional(),
});
export type PreferredWindow = z.infer<typeof PreferredWindowSchema>;

/** Free-form message template payload with optional structured metadata. */
export const MessageTemplateSchema = z
  .object({
    title: z.string().optional(),
    body: z.string().optional(),
    variables: z.record(z.string()).optional(),
  })
  .catchall(z.unknown());
export type MessageTemplate = z.infer<typeof MessageTemplateSchema>;

/** Twilio WhatsApp configuration stored in clinic channel config payloads. */
export const TwilioWhatsAppConfigSchema = z.object({
  accountSid: z.string().optional(),
  messagingServiceSid: z.string().optional(),
  from: z.string().optional(),
  statusCallbackPath: z.string().optional(),
});
export type TwilioWhatsAppConfig = z.infer<typeof TwilioWhatsAppConfigSchema>;

/** Twilio voice configuration stored in clinic channel config payloads. */
export const TwilioVoiceConfigSchema = z.object({
  accountSid: z.string().optional(),
  applicationSid: z.string().optional(),
  from: z.string().optional(),
  statusCallbackPath: z.string().optional(),
  answerUrl: z.string().optional(),
});
export type TwilioVoiceConfig = z.infer<typeof TwilioVoiceConfigSchema>;

/** Retell voice configuration stored in clinic channel config payloads. */
export const RetellVoiceConfigSchema = z.object({
  agentId: z.string().optional(),
  fromNumber: z.string().optional(),
  signingSecret: z.string().optional(),
  language: z.string().optional(),
});
export type RetellVoiceConfig = z.infer<typeof RetellVoiceConfigSchema>;

/** Raw Twilio WhatsApp webhook payload subset used by the backend runtime. */
export const TwilioWhatsAppWebhookPayloadSchema = z
  .object({
    AccountSid: z.string().optional(),
    Body: z.string().optional(),
    From: z.string().optional(),
    To: z.string().optional(),
    MessageSid: z.string(),
    MessageStatus: z.string().optional(),
    SmsStatus: z.string().optional(),
    ProfileName: z.string().optional(),
    WaId: z.string().optional(),
  })
  .catchall(z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()]));
export type TwilioWhatsAppWebhookPayload = z.infer<typeof TwilioWhatsAppWebhookPayloadSchema>;

/** Raw Twilio voice webhook payload subset used by the backend runtime. */
export const TwilioVoiceWebhookPayloadSchema = z
  .object({
    AccountSid: z.string().optional(),
    CallSid: z.string(),
    CallStatus: z.string().optional(),
    CallDuration: z.string().optional(),
    Direction: z.string().optional(),
    From: z.string().optional(),
    To: z.string().optional(),
    SpeechResult: z.string().optional(),
    RecordingUrl: z.string().optional(),
    TranscriptionText: z.string().optional(),
  })
  .catchall(z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()]));
export type TwilioVoiceWebhookPayload = z.infer<typeof TwilioVoiceWebhookPayloadSchema>;

/** Retell tool-call webhook payload received during a live voice call. */
export const RetellToolCallWebhookPayloadSchema = z.object({
  call_id: z.string(),
  event: z.literal('tool_call').optional(),
  tool_name: z.string(),
  args: z.record(z.unknown()).default({}),
});
export type RetellToolCallWebhookPayload = z.infer<typeof RetellToolCallWebhookPayloadSchema>;

/** Retell post-call webhook payload sent after call analysis completes. */
export const RetellPostCallWebhookPayloadSchema = z.object({
  event: z.string(),
  call_id: z.string(),
  call_type: z.string().optional(),
  from_number: z.string().optional(),
  to_number: z.string().optional(),
  duration_ms: z.number().optional(),
  transcript: z.string().optional(),
  call_summary: z.string().optional(),
  custom_analysis: z.record(z.unknown()).optional(),
});
export type RetellPostCallWebhookPayload = z.infer<typeof RetellPostCallWebhookPayloadSchema>;

/** Normalized webhook event kinds produced by clinic channel adapters. */
export const ClinicWebhookEventKindSchema = z.enum([
  'message_inbound',
  'message_status',
  'call_inbound',
  'call_status',
  'call_ai_completed',
]);
export type ClinicWebhookEventKind = z.infer<typeof ClinicWebhookEventKindSchema>;

/** Adapter-normalized webhook event shared by API, worker, and tests. */
export const NormalizedClinicWebhookEventSchema = z.object({
  provider: ClinicChannelProviderSchema,
  channelType: ChannelTypeSchema,
  eventKind: ClinicWebhookEventKindSchema,
  eventId: z.string(),
  occurredAt: DateTimeStringSchema.optional(),
  phoneNumber: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  body: z.string().optional(),
  providerMessageId: z.string().optional(),
  providerCallId: z.string().optional(),
  providerStatus: z.string().optional(),
  profileName: z.string().optional(),
  payload: JsonRecordSchema.default({}),
});
export type NormalizedClinicWebhookEvent = z.infer<typeof NormalizedClinicWebhookEventSchema>;

/** Result returned by outbound channel adapters after send/call attempts. */
export const ClinicDeliveryResultSchema = z.object({
  provider: ClinicChannelProviderSchema,
  channelType: ChannelTypeSchema,
  status: ClinicDeliveryProviderStatusSchema,
  providerMessageId: z.string().optional(),
  providerCallId: z.string().optional(),
  failureReason: ClinicDeliveryFailureReasonSchema.optional(),
  detail: z.string().optional(),
  payload: JsonRecordSchema.default({}),
});
export type ClinicDeliveryResult = z.infer<typeof ClinicDeliveryResultSchema>;

// ---------------------------------------------------------------------------
// Base entities
// ---------------------------------------------------------------------------

/** Tenant-scoped clinic configuration entity. */
export const ClinicProfileSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  vertical: VerticalTypeSchema,
  specialty: NullableStringSchema,
  displayName: z.string(),
  timezone: z.string(),
  businessHours: BusinessHoursSchema.default({}),
  defaultInboundChannel: ChannelTypeSchema.nullable().optional(),
  requiresNewPatientForm: z.boolean(),
  confirmationPolicy: ConfirmationPolicySchema.default({}),
  gapRecoveryPolicy: GapRecoveryPolicySchema.default({}),
  reactivationPolicy: ReactivationPolicySchema.default({}),
  createdAt: DateTimeStringSchema,
  updatedAt: DateTimeStringSchema,
});
export type ClinicProfile = z.infer<typeof ClinicProfileSchema>;

/** Module entitlement entity. */
export const TenantModuleSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  moduleKey: ModuleKeySchema,
  status: ModuleStatusSchema,
  visibleToClient: z.boolean(),
  planLevel: TenantPlanSchema,
  config: JsonRecordSchema.default({}),
  createdAt: DateTimeStringSchema,
  updatedAt: DateTimeStringSchema,
});
export type TenantModule = z.infer<typeof TenantModuleSchema>;

/** UI-facing visibility state for a clinic module entitlement. */
export const ModuleVisibilityStateSchema = z.enum([
  'visible',
  'hidden',
  'internal_only',
  'requires_configuration',
]);
export type ModuleVisibilityState = z.infer<typeof ModuleVisibilityStateSchema>;

/** Machine-readable explanation for why a module is or is not visible. */
export const ModuleVisibilityReasonSchema = z.enum([
  'active',
  'not_in_plan',
  'hidden_internal_only',
  'disabled_by_tenant',
  'requires_configuration',
]);
export type ModuleVisibilityReason = z.infer<typeof ModuleVisibilityReasonSchema>;

/** Resolved clinic module metadata used by the web shell and settings UI. */
export const ClinicModuleEntitlementSchema = TenantModuleSchema.extend({
  enabled: z.boolean(),
  beta: z.boolean(),
  displayName: z.string(),
  description: z.string(),
  requiresConfig: z.boolean(),
  visibilityState: ModuleVisibilityStateSchema,
  visibilityReason: ModuleVisibilityReasonSchema,
});
export type ClinicModuleEntitlement = z.infer<typeof ClinicModuleEntitlementSchema>;

/** Channel configuration entity. */
export const ClinicChannelSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  channelType: ChannelTypeSchema,
  directionPolicy: DirectionPolicySchema.default({}),
  provider: z.string(),
  connectorAccountId: NullableStringSchema.optional(),
  status: ChannelStatusSchema,
  phoneNumber: NullableStringSchema.optional(),
  config: JsonRecordSchema.default({}),
  createdAt: DateTimeStringSchema,
  updatedAt: DateTimeStringSchema,
});
export type ClinicChannel = z.infer<typeof ClinicChannelSchema>;

/** Canonical patient record entity. */
export const PatientSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  externalPatientId: NullableStringSchema.optional(),
  status: PatientStatusSchema,
  isExisting: z.boolean(),
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string(),
  phone: NullableStringSchema.optional(),
  email: NullableStringSchema.optional(),
  dateOfBirth: NullableStringSchema.optional(),
  notes: NullableStringSchema.optional(),
  consentFlags: ConsentFlagsSchema.default({}),
  source: z.string(),
  lastInteractionAt: NullableStringSchema.optional(),
  nextSuggestedActionAt: NullableStringSchema.optional(),
  createdAt: DateTimeStringSchema,
  updatedAt: DateTimeStringSchema,
});
export type Patient = z.infer<typeof PatientSchema>;

/** Alternate patient identity entity. */
export const PatientIdentitySchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  patientId: z.string(),
  identityType: PatientIdentityTypeSchema,
  identityValue: z.string(),
  isPrimary: z.boolean(),
  confidenceScore: z.number(),
  createdAt: DateTimeStringSchema,
});
export type PatientIdentity = z.infer<typeof PatientIdentitySchema>;

/** Conversation thread entity. */
export const ConversationThreadSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  patientId: NullableStringSchema.optional(),
  channelType: ChannelTypeSchema,
  status: ThreadStatusSchema,
  intent: ConversationIntentSchema,
  priority: PrioritySchema,
  source: z.string(),
  assignedUserId: NullableStringSchema.optional(),
  lastMessageAt: NullableStringSchema.optional(),
  lastInboundAt: NullableStringSchema.optional(),
  lastOutboundAt: NullableStringSchema.optional(),
  requiresHumanReview: z.boolean(),
  resolution: NullableStringSchema.optional(),
  createdAt: DateTimeStringSchema,
  updatedAt: DateTimeStringSchema,
});
export type ConversationThread = z.infer<typeof ConversationThreadSchema>;

/** Conversation message entity. */
export const ConversationMessageSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  threadId: z.string(),
  patientId: NullableStringSchema.optional(),
  direction: DirectionSchema,
  channelType: ChannelTypeSchema,
  messageType: MessageTypeSchema,
  body: z.string(),
  payload: JsonRecordSchema.default({}),
  deliveryStatus: MessageDeliveryStatusSchema,
  providerMessageId: NullableStringSchema.optional(),
  sentAt: NullableStringSchema.optional(),
  receivedAt: NullableStringSchema.optional(),
  createdAt: DateTimeStringSchema,
});
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>;

/** Call session entity. */
export const CallSessionSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  patientId: NullableStringSchema.optional(),
  threadId: NullableStringSchema.optional(),
  direction: DirectionSchema,
  status: CallStatusSchema,
  providerCallId: NullableStringSchema.optional(),
  fromNumber: z.string(),
  toNumber: z.string(),
  startedAt: DateTimeStringSchema,
  endedAt: NullableStringSchema.optional(),
  durationSeconds: z.number(),
  summary: NullableStringSchema.optional(),
  transcript: NullableStringSchema.optional(),
  resolution: NullableStringSchema.optional(),
  requiresHumanReview: z.boolean(),
  createdAt: DateTimeStringSchema,
  updatedAt: DateTimeStringSchema,
});
export type CallSession = z.infer<typeof CallSessionSchema>;

/** Intake form template entity. */
export const IntakeFormTemplateSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  slug: z.string(),
  version: z.string(),
  schema: JsonRecordSchema.default({}),
  isActive: z.boolean(),
  createdAt: DateTimeStringSchema,
  updatedAt: DateTimeStringSchema,
});
export type IntakeFormTemplate = z.infer<typeof IntakeFormTemplateSchema>;

/** Intake form submission entity. */
export const IntakeFormSubmissionSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  templateId: z.string(),
  patientId: NullableStringSchema.optional(),
  threadId: NullableStringSchema.optional(),
  status: IntakeSubmissionStatusSchema,
  answers: JsonRecordSchema.default({}),
  sentAt: NullableStringSchema.optional(),
  openedAt: NullableStringSchema.optional(),
  completedAt: NullableStringSchema.optional(),
  expiresAt: NullableStringSchema.optional(),
  requiredForBooking: z.boolean(),
  createdAt: DateTimeStringSchema,
  updatedAt: DateTimeStringSchema,
});
export type IntakeFormSubmission = z.infer<typeof IntakeFormSubmissionSchema>;

/** Clinic service catalog entity. */
export const ClinicServiceSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  externalServiceId: NullableStringSchema.optional(),
  name: z.string(),
  slug: z.string(),
  durationMinutes: z.number(),
  active: z.boolean(),
  metadata: JsonRecordSchema.default({}),
  createdAt: DateTimeStringSchema,
  updatedAt: DateTimeStringSchema,
});
export type ClinicService = z.infer<typeof ClinicServiceSchema>;

/** Practitioner entity. */
export const PractitionerSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  externalPractitionerId: NullableStringSchema.optional(),
  name: z.string(),
  specialty: NullableStringSchema.optional(),
  active: z.boolean(),
  metadata: JsonRecordSchema.default({}),
  createdAt: DateTimeStringSchema,
  updatedAt: DateTimeStringSchema,
});
export type Practitioner = z.infer<typeof PractitionerSchema>;

/** Clinic location entity. */
export const ClinicLocationSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  externalLocationId: NullableStringSchema.optional(),
  name: z.string(),
  address: NullableStringSchema.optional(),
  phone: NullableStringSchema.optional(),
  active: z.boolean(),
  metadata: JsonRecordSchema.default({}),
  createdAt: DateTimeStringSchema,
  updatedAt: DateTimeStringSchema,
});
export type ClinicLocation = z.infer<typeof ClinicLocationSchema>;

/** Appointment entity. */
export const AppointmentSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  patientId: z.string(),
  externalAppointmentId: NullableStringSchema.optional(),
  serviceId: NullableStringSchema.optional(),
  practitionerId: NullableStringSchema.optional(),
  locationId: NullableStringSchema.optional(),
  threadId: NullableStringSchema.optional(),
  status: AppointmentStatusSchema,
  source: AppointmentSourceSchema,
  startsAt: DateTimeStringSchema,
  endsAt: DateTimeStringSchema,
  bookedAt: DateTimeStringSchema,
  confirmationStatus: ConfirmationStatusSchema,
  reminderStatus: ReminderStatusSchema,
  cancellationReason: NullableStringSchema.optional(),
  metadata: JsonRecordSchema.default({}),
  createdAt: DateTimeStringSchema,
  updatedAt: DateTimeStringSchema,
});
export type Appointment = z.infer<typeof AppointmentSchema>;

/** Appointment event entity. */
export const AppointmentEventSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  appointmentId: z.string(),
  eventType: z.string(),
  actorType: AppointmentActorTypeSchema,
  payload: JsonRecordSchema.default({}),
  createdAt: DateTimeStringSchema,
});
export type AppointmentEvent = z.infer<typeof AppointmentEventSchema>;

/** Reminder job entity. */
export const ReminderJobSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  appointmentId: z.string(),
  channelType: ChannelTypeSchema,
  status: ReminderStatusSchema,
  scheduledFor: DateTimeStringSchema,
  sentAt: NullableStringSchema.optional(),
  templateKey: z.string(),
  attemptCount: z.number(),
  lastError: NullableStringSchema.optional(),
  createdAt: DateTimeStringSchema,
  updatedAt: DateTimeStringSchema,
});
export type ReminderJob = z.infer<typeof ReminderJobSchema>;

/** Confirmation request entity. */
export const ConfirmationRequestSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  appointmentId: z.string(),
  channelType: ChannelTypeSchema,
  status: ConfirmationStatusSchema,
  requestedAt: DateTimeStringSchema,
  dueAt: DateTimeStringSchema,
  respondedAt: NullableStringSchema.optional(),
  responsePayload: JsonRecordSchema.default({}),
  createdAt: DateTimeStringSchema,
  updatedAt: DateTimeStringSchema,
});
export type ConfirmationRequest = z.infer<typeof ConfirmationRequestSchema>;

/** Waitlist request entity. */
export const WaitlistRequestSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  patientId: z.string(),
  serviceId: NullableStringSchema.optional(),
  practitionerId: NullableStringSchema.optional(),
  locationId: NullableStringSchema.optional(),
  preferredWindows: z.array(PreferredWindowSchema).default([]),
  status: WaitlistStatusSchema,
  priorityScore: z.number(),
  notes: NullableStringSchema.optional(),
  createdAt: DateTimeStringSchema,
  updatedAt: DateTimeStringSchema,
});
export type WaitlistRequest = z.infer<typeof WaitlistRequestSchema>;

/** Gap opportunity entity. */
export const GapOpportunitySchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  originAppointmentId: NullableStringSchema.optional(),
  serviceId: NullableStringSchema.optional(),
  practitionerId: NullableStringSchema.optional(),
  locationId: NullableStringSchema.optional(),
  startsAt: DateTimeStringSchema,
  endsAt: DateTimeStringSchema,
  status: GapStatusSchema,
  origin: GapOriginSchema,
  createdAt: DateTimeStringSchema,
  updatedAt: DateTimeStringSchema,
});
export type GapOpportunity = z.infer<typeof GapOpportunitySchema>;

/** Gap outreach attempt entity. */
export const GapOutreachAttemptSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  gapOpportunityId: z.string(),
  patientId: z.string(),
  channelType: ChannelTypeSchema,
  status: OutreachStatusSchema,
  sentAt: NullableStringSchema.optional(),
  respondedAt: NullableStringSchema.optional(),
  result: NullableStringSchema.optional(),
  metadata: JsonRecordSchema.default({}),
  createdAt: DateTimeStringSchema,
});
export type GapOutreachAttempt = z.infer<typeof GapOutreachAttemptSchema>;

/** Reactivation campaign entity. */
export const ReactivationCampaignSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  name: z.string(),
  campaignType: CampaignTypeSchema,
  status: CampaignStatusSchema,
  audienceDefinition: JsonRecordSchema.default({}),
  messageTemplate: MessageTemplateSchema.default({}),
  channelPolicy: JsonRecordSchema.default({}),
  scheduledAt: NullableStringSchema.optional(),
  startedAt: NullableStringSchema.optional(),
  completedAt: NullableStringSchema.optional(),
  createdAt: DateTimeStringSchema,
  updatedAt: DateTimeStringSchema,
});
export type ReactivationCampaign = z.infer<typeof ReactivationCampaignSchema>;

/** Reactivation campaign recipient entity. */
export const ReactivationRecipientSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  campaignId: z.string(),
  patientId: z.string(),
  status: CampaignRecipientStatusSchema,
  lastContactAt: NullableStringSchema.optional(),
  lastResponseAt: NullableStringSchema.optional(),
  result: NullableStringSchema.optional(),
  generatedAppointmentId: NullableStringSchema.optional(),
  metadata: JsonRecordSchema.default({}),
  createdAt: DateTimeStringSchema,
});
export type ReactivationRecipient = z.infer<typeof ReactivationRecipientSchema>;

/** Tenant-scoped AI receptionist configuration. */
export const ClinicAiConfigSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  enabled: z.boolean(),
  persona: NullableStringSchema.optional(),
  languages: z.array(z.string()).default(['es']),
  businessRules: JsonRecordSchema.default({}),
  toolsPolicy: JsonRecordSchema.default({}),
  modelWhatsapp: z.string().default('gpt-4.1-mini'),
  modelVoice: z.string().default('gpt-4.1-mini'),
  retellAgentId: NullableStringSchema.optional(),
  knowledgeBaseEnabled: z.boolean().default(false),
  handoffRules: JsonRecordSchema.default({}),
  dailyTokenBudget: z.number().default(500000),
  createdAt: DateTimeStringSchema,
  updatedAt: DateTimeStringSchema,
});
export type ClinicAiConfig = z.infer<typeof ClinicAiConfigSchema>;

/** AI tool invocation status values. */
export const AiToolInvocationStatusSchema = z.enum(['success', 'error', 'timeout']);
export type AiToolInvocationStatus = z.infer<typeof AiToolInvocationStatusSchema>;

/** Audit record for an AI receptionist tool invocation. */
export const ClinicAiToolInvocationSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  threadId: NullableStringSchema.optional(),
  runId: NullableStringSchema.optional(),
  toolName: z.string(),
  args: JsonRecordSchema.default({}),
  result: JsonRecordSchema.default({}),
  status: AiToolInvocationStatusSchema,
  durationMs: z.number(),
  tokensUsed: z.number().default(0),
  createdAt: DateTimeStringSchema,
});
export type ClinicAiToolInvocation = z.infer<typeof ClinicAiToolInvocationSchema>;

// ---------------------------------------------------------------------------
// Read models and envelopes
// ---------------------------------------------------------------------------

/** Lightweight patient card for list views. */
export const PatientListItemSchema = PatientSchema.extend({
  upcomingAppointmentCount: z.number().optional(),
  hasPendingForm: z.boolean().optional(),
  isReactivationCandidate: z.boolean().optional(),
});
export type PatientListItem = z.infer<typeof PatientListItemSchema>;

/** Thread list item ready for the control-center inbox. */
export const ConversationThreadListItemSchema = ConversationThreadSchema.extend({
  patient: PatientListItemSchema.nullable().optional(),
  lastMessagePreview: z.string().optional(),
  nextSuggestedAction: z.string().optional(),
  unreadCount: z.number().optional(),
});
export type ConversationThreadListItem = z.infer<typeof ConversationThreadListItemSchema>;

/** Detailed inbox thread with embedded patient and messages. */
export const ConversationThreadDetailSchema = ConversationThreadSchema.extend({
  patient: PatientSchema.nullable().optional(),
  messages: z.array(ConversationMessageSchema).default([]),
});
export type ConversationThreadDetail = z.infer<typeof ConversationThreadDetailSchema>;

/** Appointment row enriched for agenda and calendar screens. */
export const AppointmentSummarySchema = AppointmentSchema.extend({
  patient: PatientListItemSchema.nullable().optional(),
  service: ClinicServiceSchema.nullable().optional(),
  practitioner: PractitionerSchema.nullable().optional(),
  location: ClinicLocationSchema.nullable().optional(),
});
export type AppointmentSummary = z.infer<typeof AppointmentSummarySchema>;

/** Detailed appointment read model. */
export const AppointmentDetailSchema = AppointmentSummarySchema.extend({
  events: z.array(AppointmentEventSchema).default([]),
});
export type AppointmentDetail = z.infer<typeof AppointmentDetailSchema>;

/** Detailed call read model. */
export const CallSessionDetailSchema = CallSessionSchema.extend({
  patient: PatientSchema.nullable().optional(),
  thread: ConversationThreadSchema.nullable().optional(),
});
export type CallSessionDetail = z.infer<typeof CallSessionDetailSchema>;

/** Gap read model including outreach attempts. */
export const GapOpportunityDetailSchema = GapOpportunitySchema.extend({
  outreachAttempts: z.array(GapOutreachAttemptSchema).default([]),
});
export type GapOpportunityDetail = z.infer<typeof GapOpportunityDetailSchema>;

/** Detailed campaign read model with recipients. */
export const ReactivationCampaignDetailSchema = ReactivationCampaignSchema.extend({
  recipients: z.array(ReactivationRecipientSchema).default([]),
});
export type ReactivationCampaignDetail = z.infer<typeof ReactivationCampaignDetailSchema>;

/** Clinic dashboard KPI group. */
export const ClinicDashboardKpisSchema = z.object({
  openThreads: z.number(),
  pendingConfirmations: z.number(),
  pendingForms: z.number(),
  activeGaps: z.number(),
  activeCampaigns: z.number(),
  todaysAppointments: z.number(),
  patientsNew: z.number(),
  patientsExisting: z.number(),
  aiTurnsToday: z.number().optional(),
  aiHandoffRate: z.number().optional(),
  aiAvgLatencyMs: z.number().optional(),
});
export type ClinicDashboardKpis = z.infer<typeof ClinicDashboardKpisSchema>;

/** Aggregate dashboard payload used by the clinic control center. */
export const ClinicDashboardSchema = z.object({
  tenantId: z.string(),
  generatedAt: DateTimeStringSchema,
  kpis: ClinicDashboardKpisSchema,
  prioritizedInbox: z.array(ConversationThreadListItemSchema),
  agenda: z.array(AppointmentSummarySchema),
  pendingForms: z.array(IntakeFormSubmissionSchema),
  pendingConfirmations: z.array(ConfirmationRequestSchema),
  activeGaps: z.array(GapOpportunityDetailSchema),
  activeCampaigns: z.array(ReactivationCampaignSchema),
  patientMix: z.object({
    newPatients: z.number(),
    existingPatients: z.number(),
  }),
});
export type ClinicDashboard = z.infer<typeof ClinicDashboardSchema>;

/** Resolved clinic feature flags surfaced to the client shell. Legacy booleans
 * remain for compatibility reads only; new behavior should rely on the
 * resolved capability decisions that accompany this payload.
 */
export const ClinicResolvedFlagsSchema = z.object({
  verticalClinicUi: z.boolean(),
  clinicDentalMode: z.boolean(),
  voiceInboundEnabled: z.boolean(),
  voiceOutboundEnabled: z.boolean(),
  whatsappOutboundEnabled: z.boolean(),
  intakeFormsEnabled: z.boolean(),
  appointmentConfirmationsEnabled: z.boolean(),
  smartGapFillEnabled: z.boolean(),
  reactivationEnabled: z.boolean(),
  advancedClinicModeEnabled: z.boolean(),
  internalPlatformVisible: z.boolean(),
  aiReceptionistEnabled: z.boolean(),
  aiVoiceReceptionistEnabled: z.boolean(),
  aiOutboundEnabled: z.boolean(),
});
export type ClinicResolvedFlags = z.infer<typeof ClinicResolvedFlagsSchema>;

/** Source of truth layer that decided a resolved tenant capability. */
export const TenantFeatureDecisionSourceSchema = z.enum([
  'entitlement',
  'readiness',
  'rollout',
  'internal_access',
  'legacy_fallback',
]);
export type TenantFeatureDecisionSource = z.infer<typeof TenantFeatureDecisionSourceSchema>;

/** Reasons surfaced when a resolved tenant capability is disabled or degraded. */
export const TenantFeatureDecisionReasonSchema = z.enum([
  'not_in_plan',
  'hidden_internal_only',
  'disabled_by_tenant',
  'disabled_by_feature_flag',
  'requires_configuration',
  'channel_inactive',
  'channel_missing',
  'insufficient_role',
  'not_admin_tenant',
  'legacy_compatibility',
]);
export type TenantFeatureDecisionReason = z.infer<typeof TenantFeatureDecisionReasonSchema>;

/** Decision trace for a single resolved tenant capability. `legacyField` exists
 * only to explain compatibility fallbacks while old payloads are still parsed.
 */
export const TenantFeatureDecisionSchema = z.object({
  enabled: z.boolean(),
  source: TenantFeatureDecisionSourceSchema,
  reason: TenantFeatureDecisionReasonSchema.optional(),
  moduleKey: ModuleKeySchema.optional(),
  channelType: ChannelTypeSchema.optional(),
  rolloutKey: z.string().optional(),
  legacyField: z
    .enum(['verticalClinicUi', 'clinicDentalMode', 'internalPlatformVisible'])
    .optional(),
  detail: z.string().optional(),
});
export type TenantFeatureDecision = z.infer<typeof TenantFeatureDecisionSchema>;

/** Structured trace for resolved tenant capabilities shown in product UI. */
export const TenantFeatureDecisionsSchema = z.object({
  voiceInboundEnabled: TenantFeatureDecisionSchema,
  voiceOutboundEnabled: TenantFeatureDecisionSchema,
  whatsappOutboundEnabled: TenantFeatureDecisionSchema,
  intakeFormsEnabled: TenantFeatureDecisionSchema,
  appointmentConfirmationsEnabled: TenantFeatureDecisionSchema,
  smartGapFillEnabled: TenantFeatureDecisionSchema,
  reactivationEnabled: TenantFeatureDecisionSchema,
  advancedClinicModeEnabled: TenantFeatureDecisionSchema,
  aiReceptionistEnabled: TenantFeatureDecisionSchema,
  aiVoiceReceptionistEnabled: TenantFeatureDecisionSchema,
  aiOutboundEnabled: TenantFeatureDecisionSchema,
  internalPlatformVisible: TenantFeatureDecisionSchema,
  adminConsoleEnabled: TenantFeatureDecisionSchema,
});
export type TenantFeatureDecisions = z.infer<typeof TenantFeatureDecisionsSchema>;

/** Permissions shared by tenant experience resolvers across verticals. */
export const TenantPermissionSchema = z.enum([
  'view_dashboard',
  'view_inbox',
  'manage_inbox',
  'view_appointments',
  'manage_appointments',
  'view_patients',
  'manage_patients',
  'view_follow_up',
  'manage_follow_up',
  'view_reactivation',
  'manage_reactivation',
  'view_reports',
  'manage_clinic_settings',
  'manage_ai_assistant',
  'view_internal_platform',
  'view_admin_console',
]);
export type TenantPermission = z.infer<typeof TenantPermissionSchema>;

/** Navigation sections the clinic web shell can safely expose. */
export const ClinicNavigationKeySchema = z.enum([
  'dashboard',
  'inbox',
  'appointments',
  'patients',
  'follow_up',
  'forms',
  'confirmations',
  'gaps',
  'reactivation',
  'reports',
  'ai_assistant',
  'configuration',
  'platform_internal',
]);
export type ClinicNavigationKey = z.infer<typeof ClinicNavigationKeySchema>;

/** Navigation sections surfaced by the generic tenant experience model. */
export const TenantNavigationKeySchema = z.enum([
  'dashboard',
  'inbox',
  'appointments',
  'patients',
  'follow_up',
  'forms',
  'confirmations',
  'gaps',
  'reactivation',
  'reports',
  'ai_assistant',
  'configuration',
  'platform_internal',
  'admin_console',
]);
export type TenantNavigationKey = z.infer<typeof TenantNavigationKeySchema>;

/** High-level shell families exposed by the tenant experience resolver. */
export const TenantShellKeySchema = z.enum(['clinic', 'platform_internal', 'fisio']);
export type TenantShellKey = z.infer<typeof TenantShellKeySchema>;

/** Settings sections that a tenant can safely configure in-product. */
export const TenantSettingsSectionSchema = z.enum([
  'general',
  'team',
  'integrations',
  'plan',
  'security',
  'care_profile',
  'care_schedule',
  'care_services',
  'care_forms',
  'care_confirmations',
  'care_gap_recovery',
  'care_reactivation',
  'care_ai_assistant',
  'internal_defaults',
  'internal_approvals',
]);
export type TenantSettingsSection = z.infer<typeof TenantSettingsSectionSchema>;

/** Generic resolved flags exposed to web and API consumers across verticals. */
export const TenantResolvedFlagsSchema = ClinicResolvedFlagsSchema.extend({
  activeVertical: VerticalKeySchema,
  isPlatformAdminTenant: z.boolean(),
  adminConsoleEnabled: z.boolean(),
});
export type TenantResolvedFlags = z.infer<typeof TenantResolvedFlagsSchema>;

/** Generic tenant experience payload that normalizes shell resolution. */
export const TenantExperienceSchema = z.object({
  tenantId: z.string(),
  activeVertical: VerticalKeySchema,
  /**
   * Identity of the tenant's verticals (active + enabled list). Optional
   * for backward compatibility with pre-2026-04 payloads that predate the
   * explicit vertical/entitlement split; consumers should derive it from
   * `activeVertical` when the field is missing.
   */
  verticalConfig: TenantVerticalConfigSchema.optional(),
  shellKey: TenantShellKeySchema,
  defaultRoute: z.string(),
  role: z.string().optional(),
  normalizedRole: UserRoleSchema.optional(),
  permissions: z.array(TenantPermissionSchema),
  allowedNavigation: z.array(TenantNavigationKeySchema),
  modules: z.array(ClinicModuleEntitlementSchema),
  flags: TenantResolvedFlagsSchema,
  featureDecisions: TenantFeatureDecisionsSchema.optional(),
  settingsSections: z.array(TenantSettingsSectionSchema),
  canAccessInternalPlatform: z.boolean(),
  canAccessAdminConsole: z.boolean(),
});
export type TenantExperience = z.infer<typeof TenantExperienceSchema>;

/** Single resolved tenant experience payload for clinic-aware tenants. */
export const ClinicExperienceSchema = z.object({
  tenantId: z.string(),
  isClinicTenant: z.boolean(),
  defaultMode: ExperienceModeSchema,
  role: z.string().optional(),
  normalizedRole: UserRoleSchema.optional(),
  isInternalUser: z.boolean(),
  permissions: z.array(ClinicPermissionSchema),
  flags: ClinicResolvedFlagsSchema,
  modules: z.array(ClinicModuleEntitlementSchema),
  allowedNavigation: z.array(ClinicNavigationKeySchema),
});
export type ClinicExperience = z.infer<typeof ClinicExperienceSchema>;

export const ClinicDashboardResponseSchema = z.object({
  dashboard: ClinicDashboardSchema,
});
export type ClinicDashboardResponse = z.infer<typeof ClinicDashboardResponseSchema>;

export const ClinicExperienceResponseSchema = z.object({
  experience: ClinicExperienceSchema,
});
export type ClinicExperienceResponse = z.infer<typeof ClinicExperienceResponseSchema>;

export const TenantExperienceResponseSchema = z.object({
  experience: TenantExperienceSchema,
});
export type TenantExperienceResponse = z.infer<typeof TenantExperienceResponseSchema>;

export const ClinicProfileResponseSchema = z.object({
  profile: ClinicProfileSchema,
});
export type ClinicProfileResponse = z.infer<typeof ClinicProfileResponseSchema>;

export const ClinicModulesResponseSchema = z.object({
  modules: z.array(ClinicModuleEntitlementSchema),
});
export type ClinicModulesResponse = z.infer<typeof ClinicModulesResponseSchema>;

export const TenantModuleResponseSchema = z.object({
  module: ClinicModuleEntitlementSchema,
});
export type TenantModuleResponse = z.infer<typeof TenantModuleResponseSchema>;

export const ClinicChannelsResponseSchema = z.object({
  channels: z.array(ClinicChannelSchema),
});
export type ClinicChannelsResponse = z.infer<typeof ClinicChannelsResponseSchema>;

export const ClinicChannelResponseSchema = z.object({
  channel: ClinicChannelSchema,
});
export type ClinicChannelResponse = z.infer<typeof ClinicChannelResponseSchema>;

export const PatientsResponseSchema = z.object({
  patients: z.array(PatientListItemSchema),
  total: z.number().optional(),
});
export type PatientsResponse = z.infer<typeof PatientsResponseSchema>;

export const PatientResponseSchema = z.object({
  patient: PatientSchema,
  identities: z.array(PatientIdentitySchema).default([]),
  upcomingAppointments: z.array(AppointmentSummarySchema).default([]),
  waitlistRequests: z.array(WaitlistRequestSchema).default([]),
});
export type PatientResponse = z.infer<typeof PatientResponseSchema>;

export const ConversationsResponseSchema = z.object({
  threads: z.array(ConversationThreadListItemSchema),
  total: z.number().optional(),
});
export type ConversationsResponse = z.infer<typeof ConversationsResponseSchema>;

export const ConversationResponseSchema = z.object({
  thread: ConversationThreadDetailSchema,
});
export type ConversationResponse = z.infer<typeof ConversationResponseSchema>;

export const ConversationMessagesResponseSchema = z.object({
  messages: z.array(ConversationMessageSchema),
});
export type ConversationMessagesResponse = z.infer<typeof ConversationMessagesResponseSchema>;

export const CallsResponseSchema = z.object({
  calls: z.array(CallSessionSchema),
  total: z.number().optional(),
});
export type CallsResponse = z.infer<typeof CallsResponseSchema>;

export const CallResponseSchema = z.object({
  call: CallSessionDetailSchema,
});
export type CallResponse = z.infer<typeof CallResponseSchema>;

export const IntakeFormTemplatesResponseSchema = z.object({
  templates: z.array(IntakeFormTemplateSchema),
});
export type IntakeFormTemplatesResponse = z.infer<typeof IntakeFormTemplatesResponseSchema>;

export const IntakeFormSubmissionsResponseSchema = z.object({
  submissions: z.array(IntakeFormSubmissionSchema),
  total: z.number().optional(),
});
export type IntakeFormSubmissionsResponse = z.infer<typeof IntakeFormSubmissionsResponseSchema>;

export const IntakeFormSubmissionResponseSchema = z.object({
  submission: IntakeFormSubmissionSchema,
});
export type IntakeFormSubmissionResponse = z.infer<typeof IntakeFormSubmissionResponseSchema>;

export const AppointmentsResponseSchema = z.object({
  appointments: z.array(AppointmentSummarySchema),
  total: z.number().optional(),
});
export type AppointmentsResponse = z.infer<typeof AppointmentsResponseSchema>;

export const AppointmentResponseSchema = z.object({
  appointment: AppointmentDetailSchema,
});
export type AppointmentResponse = z.infer<typeof AppointmentResponseSchema>;

export const ReminderJobsResponseSchema = z.object({
  reminders: z.array(ReminderJobSchema),
});
export type ReminderJobsResponse = z.infer<typeof ReminderJobsResponseSchema>;

export const ReminderJobResponseSchema = z.object({
  reminder: ReminderJobSchema,
});
export type ReminderJobResponse = z.infer<typeof ReminderJobResponseSchema>;

export const ConfirmationRequestsResponseSchema = z.object({
  confirmations: z.array(ConfirmationRequestSchema),
});
export type ConfirmationRequestsResponse = z.infer<typeof ConfirmationRequestsResponseSchema>;

export const ConfirmationRequestResponseSchema = z.object({
  confirmation: ConfirmationRequestSchema,
});
export type ConfirmationRequestResponse = z.infer<typeof ConfirmationRequestResponseSchema>;

export const WaitlistRequestsResponseSchema = z.object({
  waitlist: z.array(WaitlistRequestSchema),
});
export type WaitlistRequestsResponse = z.infer<typeof WaitlistRequestsResponseSchema>;

export const WaitlistRequestResponseSchema = z.object({
  waitlistRequest: WaitlistRequestSchema,
});
export type WaitlistRequestResponse = z.infer<typeof WaitlistRequestResponseSchema>;

export const GapOpportunitiesResponseSchema = z.object({
  gaps: z.array(GapOpportunityDetailSchema),
});
export type GapOpportunitiesResponse = z.infer<typeof GapOpportunitiesResponseSchema>;

export const GapOpportunityResponseSchema = z.object({
  gap: GapOpportunityDetailSchema,
});
export type GapOpportunityResponse = z.infer<typeof GapOpportunityResponseSchema>;

export const ReactivationCampaignsResponseSchema = z.object({
  campaigns: z.array(ReactivationCampaignSchema),
  total: z.number().optional(),
});
export type ReactivationCampaignsResponse = z.infer<typeof ReactivationCampaignsResponseSchema>;

export const ReactivationCampaignResponseSchema = z.object({
  campaign: ReactivationCampaignDetailSchema,
});
export type ReactivationCampaignResponse = z.infer<typeof ReactivationCampaignResponseSchema>;

export const ReactivationRecipientsResponseSchema = z.object({
  recipients: z.array(ReactivationRecipientSchema),
});
export type ReactivationRecipientsResponse = z.infer<typeof ReactivationRecipientsResponseSchema>;

export const ClinicFeatureUnavailableReasonSchema = z.enum([
  'not_in_plan',
  'hidden_internal_only',
  'disabled_by_tenant',
  'disabled_by_feature_flag',
  'requires_configuration',
  'channel_inactive',
  'channel_missing',
]);
export type ClinicFeatureUnavailableReason = z.infer<typeof ClinicFeatureUnavailableReasonSchema>;

export const ClinicFeatureUnavailableErrorSchema = z.object({
  error: z.string(),
  code: z.literal('clinic_feature_unavailable'),
  reason: ClinicFeatureUnavailableReasonSchema,
  moduleKey: ModuleKeySchema.optional(),
  channelType: ChannelTypeSchema.optional(),
  detail: z.string().optional(),
});
export type ClinicFeatureUnavailableError = z.infer<typeof ClinicFeatureUnavailableErrorSchema>;

// ---------------------------------------------------------------------------
// Filters and query shapes
// ---------------------------------------------------------------------------

/** Shared limit cursor shape for clinic list endpoints. */
export const ClinicListQuerySchema = z.object({
  limit: z.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
});
export type ClinicListQuery = z.infer<typeof ClinicListQuerySchema>;

/** Filters for patient list endpoints. */
export const PatientFiltersSchema = ClinicListQuerySchema.extend({
  search: z.string().optional(),
  status: PatientStatusSchema.optional(),
  isExisting: z.boolean().optional(),
  isReactivationCandidate: z.boolean().optional(),
  hasPendingForm: z.boolean().optional(),
  hasUpcomingAppointment: z.boolean().optional(),
});
export type PatientFilters = z.infer<typeof PatientFiltersSchema>;

/** Filters for conversation list endpoints. */
export const ConversationFiltersSchema = ClinicListQuerySchema.extend({
  search: z.string().optional(),
  channelType: ChannelTypeSchema.optional(),
  status: ThreadStatusSchema.optional(),
  priority: PrioritySchema.optional(),
  intent: ConversationIntentSchema.optional(),
  assignedUserId: z.string().optional(),
  requiresHumanReview: z.boolean().optional(),
});
export type ConversationFilters = z.infer<typeof ConversationFiltersSchema>;

/** Filters for call list endpoints. */
export const CallFiltersSchema = ClinicListQuerySchema.extend({
  channelType: ChannelTypeSchema.optional(),
  status: CallStatusSchema.optional(),
  patientId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
export type CallFilters = z.infer<typeof CallFiltersSchema>;

/** Filters for appointment list endpoints. */
export const AppointmentFiltersSchema = ClinicListQuerySchema.extend({
  date: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  locationId: z.string().optional(),
  practitionerId: z.string().optional(),
  serviceId: z.string().optional(),
  status: AppointmentStatusSchema.optional(),
  confirmationStatus: ConfirmationStatusSchema.optional(),
  reminderStatus: ReminderStatusSchema.optional(),
});
export type AppointmentFilters = z.infer<typeof AppointmentFiltersSchema>;

/** Filters for follow-up confirmation queues. */
export const ConfirmationFiltersSchema = ClinicListQuerySchema.extend({
  status: ConfirmationStatusSchema.optional(),
  channelType: ChannelTypeSchema.optional(),
  dueBefore: z.string().optional(),
  appointmentId: z.string().optional(),
});
export type ConfirmationFilters = z.infer<typeof ConfirmationFiltersSchema>;

/** Filters for smart gap-fill lists. */
export const GapFiltersSchema = ClinicListQuerySchema.extend({
  status: GapStatusSchema.optional(),
  serviceId: z.string().optional(),
  practitionerId: z.string().optional(),
  locationId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
export type GapFilters = z.infer<typeof GapFiltersSchema>;

/** Filters for campaign list endpoints. */
export const CampaignFiltersSchema = ClinicListQuerySchema.extend({
  status: CampaignStatusSchema.optional(),
  campaignType: CampaignTypeSchema.optional(),
  scheduledAfter: z.string().optional(),
  scheduledBefore: z.string().optional(),
});
export type CampaignFilters = z.infer<typeof CampaignFiltersSchema>;

// ---------------------------------------------------------------------------
// Action payloads for API phase 05
// ---------------------------------------------------------------------------

/** Body for updating clinic profile settings. */
export const UpdateClinicProfileBodySchema = z.object({
  vertical: VerticalTypeSchema.optional(),
  specialty: z.string().nullable().optional(),
  displayName: z.string().optional(),
  timezone: z.string().optional(),
  businessHours: BusinessHoursSchema.optional(),
  defaultInboundChannel: ChannelTypeSchema.nullable().optional(),
  requiresNewPatientForm: z.boolean().optional(),
  confirmationPolicy: ConfirmationPolicySchema.optional(),
  gapRecoveryPolicy: GapRecoveryPolicySchema.optional(),
  reactivationPolicy: ReactivationPolicySchema.optional(),
});
export type UpdateClinicProfileBody = z.infer<typeof UpdateClinicProfileBodySchema>;

/** Body for toggling a module entitlement. */
export const UpdateTenantModuleBodySchema = z.object({
  status: ModuleStatusSchema.optional(),
  visibleToClient: z.boolean().optional(),
  planLevel: TenantPlanSchema.optional(),
  config: JsonRecordSchema.optional(),
});
export type UpdateTenantModuleBody = z.infer<typeof UpdateTenantModuleBodySchema>;

/** Body for updating a clinic channel. */
export const UpdateClinicChannelBodySchema = z.object({
  directionPolicy: DirectionPolicySchema.optional(),
  provider: z.string().optional(),
  connectorAccountId: z.string().nullable().optional(),
  status: ChannelStatusSchema.optional(),
  phoneNumber: z.string().nullable().optional(),
  config: JsonRecordSchema.optional(),
});
export type UpdateClinicChannelBody = z.infer<typeof UpdateClinicChannelBodySchema>;

/** Body for creating a patient. */
export const CreatePatientBodySchema = z.object({
  externalPatientId: z.string().optional(),
  status: PatientStatusSchema.optional(),
  isExisting: z.boolean().optional(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().optional(),
  email: z.string().optional(),
  dateOfBirth: z.string().optional(),
  notes: z.string().optional(),
  consentFlags: ConsentFlagsSchema.optional(),
  source: z.string().optional(),
});
export type CreatePatientBody = z.infer<typeof CreatePatientBodySchema>;

/** Body for updating a patient. */
export const UpdatePatientBodySchema = CreatePatientBodySchema.partial().extend({
  nextSuggestedActionAt: z.string().nullable().optional(),
});
export type UpdatePatientBody = z.infer<typeof UpdatePatientBodySchema>;

/** Body for explicitly reactivating a patient. */
export const ReactivatePatientBodySchema = z.object({
  source: z.string().default('manual'),
  note: z.string().optional(),
  campaignId: z.string().optional(),
});
export type ReactivatePatientBody = z.infer<typeof ReactivatePatientBodySchema>;

/** Body for creating a waitlist request. */
export const CreateWaitlistRequestBodySchema = z.object({
  serviceId: z.string().optional(),
  practitionerId: z.string().optional(),
  locationId: z.string().optional(),
  preferredWindows: z.array(PreferredWindowSchema).default([]),
  priorityScore: z.number().optional(),
  notes: z.string().optional(),
});
export type CreateWaitlistRequestBody = z.infer<typeof CreateWaitlistRequestBodySchema>;

/** Body for assigning a conversation thread. */
export const AssignConversationBodySchema = z.object({
  assignedUserId: z.string(),
  note: z.string().optional(),
});
export type AssignConversationBody = z.infer<typeof AssignConversationBodySchema>;

/** Body for escalating a thread. */
export const EscalateConversationBodySchema = z.object({
  reason: z.string().optional(),
  assignedUserId: z.string().optional(),
});
export type EscalateConversationBody = z.infer<typeof EscalateConversationBodySchema>;

/** Body for resolving a thread. */
export const ResolveConversationBodySchema = z.object({
  resolution: z.string(),
  requiresHumanReview: z.boolean().optional(),
});
export type ResolveConversationBody = z.infer<typeof ResolveConversationBodySchema>;

/** Body for replying to a thread. */
export const ReplyConversationBodySchema = z.object({
  body: z.string(),
  channelType: ChannelTypeSchema.optional(),
  messageType: MessageTypeSchema.optional(),
  payload: JsonRecordSchema.optional(),
});
export type ReplyConversationBody = z.infer<typeof ReplyConversationBodySchema>;

/** Body for scheduling a callback. */
export const CallbackCallBodySchema = z.object({
  scheduledAt: z.string(),
  notes: z.string().optional(),
});
export type CallbackCallBody = z.infer<typeof CallbackCallBodySchema>;

/** Body for resolving a call outcome. */
export const ResolveCallBodySchema = z.object({
  resolution: z.string(),
  requiresHumanReview: z.boolean().optional(),
});
export type ResolveCallBody = z.infer<typeof ResolveCallBodySchema>;

/** Body for creating an appointment. */
export const CreateAppointmentBodySchema = z.object({
  patientId: z.string(),
  serviceId: z.string().optional(),
  practitionerId: z.string().optional(),
  locationId: z.string().optional(),
  threadId: z.string().optional(),
  status: AppointmentStatusSchema.optional(),
  source: AppointmentSourceSchema.optional(),
  startsAt: z.string(),
  endsAt: z.string(),
  bookedAt: z.string().optional(),
  confirmationStatus: ConfirmationStatusSchema.optional(),
  reminderStatus: ReminderStatusSchema.optional(),
  metadata: JsonRecordSchema.optional(),
});
export type CreateAppointmentBody = z.infer<typeof CreateAppointmentBodySchema>;

/** Body for updating core appointment fields. */
export const UpdateAppointmentBodySchema = CreateAppointmentBodySchema.partial().omit({
  patientId: true,
});
export type UpdateAppointmentBody = z.infer<typeof UpdateAppointmentBodySchema>;

/** Body for rescheduling an appointment. */
export const RescheduleAppointmentBodySchema = z.object({
  startsAt: z.string(),
  endsAt: z.string(),
  reason: z.string().optional(),
});
export type RescheduleAppointmentBody = z.infer<typeof RescheduleAppointmentBodySchema>;

/** Body for cancelling an appointment. */
export const CancelAppointmentBodySchema = z.object({
  cancellationReason: z.string(),
});
export type CancelAppointmentBody = z.infer<typeof CancelAppointmentBodySchema>;

/** Body for confirming an appointment. */
export const ConfirmAppointmentBodySchema = z.object({
  channelType: ChannelTypeSchema.optional(),
  respondedAt: z.string().optional(),
  responsePayload: JsonRecordSchema.optional(),
});
export type ConfirmAppointmentBody = z.infer<typeof ConfirmAppointmentBodySchema>;

/** Body for sending a form submission to a patient. */
export const SendIntakeFormSubmissionBodySchema = z.object({
  channelType: ChannelTypeSchema,
  messageTemplateKey: z.string().optional(),
});
export type SendIntakeFormSubmissionBody = z.infer<typeof SendIntakeFormSubmissionBodySchema>;

/** Body for marking a form complete. */
export const CompleteIntakeFormSubmissionBodySchema = z.object({
  answers: JsonRecordSchema.optional(),
  completedAt: z.string().optional(),
});
export type CompleteIntakeFormSubmissionBody = z.infer<
  typeof CompleteIntakeFormSubmissionBodySchema
>;

/** Body for waiving a required form. */
export const WaiveIntakeFormSubmissionBodySchema = z.object({
  reason: z.string(),
});
export type WaiveIntakeFormSubmissionBody = z.infer<typeof WaiveIntakeFormSubmissionBodySchema>;

/** Body for reminding a confirmation request. */
export const RemindConfirmationBodySchema = z.object({
  scheduledFor: z.string().optional(),
  templateKey: z.string().optional(),
});
export type RemindConfirmationBody = z.infer<typeof RemindConfirmationBodySchema>;

/** Body for escalating a confirmation request. */
export const EscalateConfirmationBodySchema = z.object({
  assignedUserId: z.string().optional(),
  reason: z.string().optional(),
});
export type EscalateConfirmationBody = z.infer<typeof EscalateConfirmationBodySchema>;

/** Body for offering an open gap to patients. */
export const OfferGapBodySchema = z.object({
  patientIds: z.array(z.string()).min(1),
  channelType: ChannelTypeSchema,
  templateKey: z.string().optional(),
});
export type OfferGapBody = z.infer<typeof OfferGapBodySchema>;

/** Body for closing a gap workflow. */
export const CloseGapBodySchema = z.object({
  status: z.enum(['filled', 'expired', 'discarded']),
  note: z.string().optional(),
});
export type CloseGapBody = z.infer<typeof CloseGapBodySchema>;

/** Body for creating a reactivation campaign. */
export const CreateReactivationCampaignBodySchema = z.object({
  name: z.string(),
  campaignType: CampaignTypeSchema,
  audienceDefinition: JsonRecordSchema,
  messageTemplate: MessageTemplateSchema,
  channelPolicy: JsonRecordSchema,
  scheduledAt: z.string().optional(),
});
export type CreateReactivationCampaignBody = z.infer<typeof CreateReactivationCampaignBodySchema>;

/** Body for starting a campaign. */
export const StartReactivationCampaignBodySchema = z.object({
  startedAt: z.string().optional(),
});
export type StartReactivationCampaignBody = z.infer<typeof StartReactivationCampaignBodySchema>;

/** Body for pausing a campaign. */
export const PauseReactivationCampaignBodySchema = z.object({
  reason: z.string().optional(),
});
export type PauseReactivationCampaignBody = z.infer<typeof PauseReactivationCampaignBodySchema>;

/** Body for resuming a campaign. */
export const ResumeReactivationCampaignBodySchema = z.object({
  scheduledAt: z.string().optional(),
});
export type ResumeReactivationCampaignBody = z.infer<typeof ResumeReactivationCampaignBodySchema>;
