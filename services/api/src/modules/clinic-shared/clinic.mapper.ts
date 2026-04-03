import {
  AppointmentDetailSchema,
  AppointmentEventSchema,
  AppointmentSchema,
  AppointmentSummarySchema,
  CallSessionDetailSchema,
  CallSessionSchema,
  ClinicChannelSchema,
  ClinicLocationSchema,
  ClinicProfileSchema,
  ClinicServiceSchema,
  ConfirmationRequestSchema,
  ConversationMessageSchema,
  ConversationThreadDetailSchema,
  ConversationThreadListItemSchema,
  ConversationThreadSchema,
  GapOpportunityDetailSchema,
  GapOpportunitySchema,
  GapOutreachAttemptSchema,
  IntakeFormSubmissionSchema,
  IntakeFormTemplateSchema,
  PatientIdentitySchema,
  PatientListItemSchema,
  PatientSchema,
  PractitionerSchema,
  ReactivationCampaignDetailSchema,
  ReactivationCampaignSchema,
  ReactivationRecipientSchema,
  ReminderJobSchema,
  TenantModuleSchema,
  WaitlistRequestSchema,
  type Appointment,
  type AppointmentDetail,
  type AppointmentSummary,
  type CallSession,
  type CallSessionDetail,
  type ClinicChannel,
  type ClinicLocation,
  type ClinicProfile,
  type ClinicService,
  type ConfirmationRequest,
  type ConversationMessage,
  type ConversationThread,
  type ConversationThreadDetail,
  type ConversationThreadListItem,
  type GapOpportunity,
  type GapOpportunityDetail,
  type GapOutreachAttempt,
  type IntakeFormSubmission,
  type IntakeFormTemplate,
  type Patient,
  type PatientIdentity,
  type PatientListItem,
  type Practitioner,
  type ReactivationCampaign,
  type ReactivationCampaignDetail,
  type ReactivationRecipient,
  type ReminderJob,
  type TenantModule,
  type WaitlistRequest,
} from '@agentmou/contracts';
import type {
  appointmentEvents,
  appointments,
  callSessions,
  clinicChannels,
  clinicLocations,
  clinicProfiles,
  clinicServices,
  confirmationRequests,
  conversationMessages,
  conversationThreads,
  gapOpportunities,
  gapOutreachAttempts,
  intakeFormSubmissions,
  intakeFormTemplates,
  patientIdentities,
  patients,
  practitioners,
  reactivationCampaigns,
  reactivationRecipients,
  reminderJobs,
  tenantModules,
  waitlistRequests,
} from '@agentmou/db';

type ClinicProfileRow = typeof clinicProfiles.$inferSelect;
type TenantModuleRow = typeof tenantModules.$inferSelect;
type ClinicChannelRow = typeof clinicChannels.$inferSelect;
type PatientRow = typeof patients.$inferSelect;
type PatientIdentityRow = typeof patientIdentities.$inferSelect;
type ConversationThreadRow = typeof conversationThreads.$inferSelect;
type ConversationMessageRow = typeof conversationMessages.$inferSelect;
type CallSessionRow = typeof callSessions.$inferSelect;
type IntakeFormTemplateRow = typeof intakeFormTemplates.$inferSelect;
type IntakeFormSubmissionRow = typeof intakeFormSubmissions.$inferSelect;
type ClinicServiceRow = typeof clinicServices.$inferSelect;
type PractitionerRow = typeof practitioners.$inferSelect;
type ClinicLocationRow = typeof clinicLocations.$inferSelect;
type AppointmentRow = typeof appointments.$inferSelect;
type AppointmentEventRow = typeof appointmentEvents.$inferSelect;
type ReminderJobRow = typeof reminderJobs.$inferSelect;
type ConfirmationRequestRow = typeof confirmationRequests.$inferSelect;
type WaitlistRequestRow = typeof waitlistRequests.$inferSelect;
type GapOpportunityRow = typeof gapOpportunities.$inferSelect;
type GapOutreachAttemptRow = typeof gapOutreachAttempts.$inferSelect;
type ReactivationCampaignRow = typeof reactivationCampaigns.$inferSelect;
type ReactivationRecipientRow = typeof reactivationRecipients.$inferSelect;

function toDateTimeString(value: Date | string | null | undefined) {
  if (!value) {
    return null;
  }

  return typeof value === 'string' ? value : value.toISOString();
}

function toJsonRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  return { ...(value as Record<string, unknown>) };
}

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function mapClinicProfile(row: ClinicProfileRow): ClinicProfile {
  return ClinicProfileSchema.parse({
    id: row.id,
    tenantId: row.tenantId,
    vertical: row.vertical,
    specialty: row.specialty,
    displayName: row.displayName,
    timezone: row.timezone,
    businessHours: toJsonRecord(row.businessHours),
    defaultInboundChannel: row.defaultInboundChannel,
    requiresNewPatientForm: row.requiresNewPatientForm,
    confirmationPolicy: toJsonRecord(row.confirmationPolicy),
    gapRecoveryPolicy: toJsonRecord(row.gapRecoveryPolicy),
    reactivationPolicy: toJsonRecord(row.reactivationPolicy),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function mapTenantModule(row: TenantModuleRow): TenantModule {
  return TenantModuleSchema.parse({
    id: row.id,
    tenantId: row.tenantId,
    moduleKey: row.moduleKey,
    status: row.status,
    visibleToClient: row.visibleToClient,
    planLevel: row.planLevel,
    config: toJsonRecord(row.config),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function mapClinicChannel(row: ClinicChannelRow): ClinicChannel {
  return ClinicChannelSchema.parse({
    id: row.id,
    tenantId: row.tenantId,
    channelType: row.channelType,
    directionPolicy: toJsonRecord(row.directionPolicy),
    provider: row.provider,
    connectorAccountId: row.connectorAccountId,
    status: row.status,
    phoneNumber: row.phoneNumber,
    config: toJsonRecord(row.config),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function mapPatient(row: PatientRow): Patient {
  return PatientSchema.parse({
    id: row.id,
    tenantId: row.tenantId,
    externalPatientId: row.externalPatientId,
    status: row.status,
    isExisting: row.isExisting,
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: row.fullName,
    phone: row.phone,
    email: row.email,
    dateOfBirth: row.dateOfBirth,
    notes: row.notes,
    consentFlags: toJsonRecord(row.consentFlags),
    source: row.source,
    lastInteractionAt: toDateTimeString(row.lastInteractionAt),
    nextSuggestedActionAt: toDateTimeString(row.nextSuggestedActionAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function mapPatientIdentity(row: PatientIdentityRow): PatientIdentity {
  return PatientIdentitySchema.parse({
    id: row.id,
    tenantId: row.tenantId,
    patientId: row.patientId,
    identityType: row.identityType,
    identityValue: row.identityValue,
    isPrimary: row.isPrimary,
    confidenceScore: row.confidenceScore,
    createdAt: row.createdAt.toISOString(),
  });
}

export function mapPatientListItem(
  row: PatientRow,
  extras: {
    upcomingAppointmentCount?: number;
    hasPendingForm?: boolean;
    isReactivationCandidate?: boolean;
  } = {}
): PatientListItem {
  return PatientListItemSchema.parse({
    ...mapPatient(row),
    upcomingAppointmentCount: extras.upcomingAppointmentCount ?? 0,
    hasPendingForm: extras.hasPendingForm ?? false,
    isReactivationCandidate: extras.isReactivationCandidate ?? row.status === 'inactive',
  });
}

export function mapConversationThread(row: ConversationThreadRow): ConversationThread {
  return ConversationThreadSchema.parse({
    id: row.id,
    tenantId: row.tenantId,
    patientId: row.patientId,
    channelType: row.channelType,
    status: row.status,
    intent: row.intent,
    priority: row.priority,
    source: row.source,
    assignedUserId: row.assignedUserId,
    lastMessageAt: toDateTimeString(row.lastMessageAt),
    lastInboundAt: toDateTimeString(row.lastInboundAt),
    lastOutboundAt: toDateTimeString(row.lastOutboundAt),
    requiresHumanReview: row.requiresHumanReview,
    resolution: row.resolution,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function mapConversationMessage(row: ConversationMessageRow): ConversationMessage {
  return ConversationMessageSchema.parse({
    id: row.id,
    tenantId: row.tenantId,
    threadId: row.threadId,
    patientId: row.patientId,
    direction: row.direction,
    channelType: row.channelType,
    messageType: row.messageType,
    body: row.body,
    payload: toJsonRecord(row.payload),
    deliveryStatus: row.deliveryStatus,
    providerMessageId: row.providerMessageId,
    sentAt: toDateTimeString(row.sentAt),
    receivedAt: toDateTimeString(row.receivedAt),
    createdAt: row.createdAt.toISOString(),
  });
}

export function mapConversationThreadListItem(
  row: ConversationThreadRow,
  options: {
    patient?: PatientListItem | null;
    lastMessagePreview?: string;
    nextSuggestedAction?: string;
    unreadCount?: number;
  } = {}
): ConversationThreadListItem {
  return ConversationThreadListItemSchema.parse({
    ...mapConversationThread(row),
    patient: options.patient ?? null,
    lastMessagePreview: options.lastMessagePreview,
    nextSuggestedAction: options.nextSuggestedAction,
    unreadCount: options.unreadCount ?? 0,
  });
}

export function mapConversationThreadDetail(
  row: ConversationThreadRow,
  options: {
    patient?: Patient | null;
    messages?: ConversationMessage[];
  } = {}
): ConversationThreadDetail {
  return ConversationThreadDetailSchema.parse({
    ...mapConversationThread(row),
    patient: options.patient ?? null,
    messages: options.messages ?? [],
  });
}

export function mapCallSession(row: CallSessionRow): CallSession {
  return CallSessionSchema.parse({
    id: row.id,
    tenantId: row.tenantId,
    patientId: row.patientId,
    threadId: row.threadId,
    direction: row.direction,
    status: row.status,
    providerCallId: row.providerCallId,
    fromNumber: row.fromNumber,
    toNumber: row.toNumber,
    startedAt: row.startedAt.toISOString(),
    endedAt: toDateTimeString(row.endedAt),
    durationSeconds: row.durationSeconds,
    summary: row.summary,
    transcript: row.transcript,
    resolution: row.resolution,
    requiresHumanReview: row.requiresHumanReview,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function mapCallSessionDetail(
  row: CallSessionRow,
  options: {
    patient?: Patient | null;
    thread?: ConversationThread | null;
  } = {}
): CallSessionDetail {
  return CallSessionDetailSchema.parse({
    ...mapCallSession(row),
    patient: options.patient ?? null,
    thread: options.thread ?? null,
  });
}

export function mapIntakeFormTemplate(row: IntakeFormTemplateRow): IntakeFormTemplate {
  return IntakeFormTemplateSchema.parse({
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    slug: row.slug,
    version: row.version,
    schema: toJsonRecord(row.schema),
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function mapIntakeFormSubmission(row: IntakeFormSubmissionRow): IntakeFormSubmission {
  return IntakeFormSubmissionSchema.parse({
    id: row.id,
    tenantId: row.tenantId,
    templateId: row.templateId,
    patientId: row.patientId,
    threadId: row.threadId,
    status: row.status,
    answers: toJsonRecord(row.answers),
    sentAt: toDateTimeString(row.sentAt),
    openedAt: toDateTimeString(row.openedAt),
    completedAt: toDateTimeString(row.completedAt),
    expiresAt: toDateTimeString(row.expiresAt),
    requiredForBooking: row.requiredForBooking,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function mapClinicService(row: ClinicServiceRow): ClinicService {
  return ClinicServiceSchema.parse({
    id: row.id,
    tenantId: row.tenantId,
    externalServiceId: row.externalServiceId,
    name: row.name,
    slug: row.slug,
    durationMinutes: row.durationMinutes,
    active: row.active,
    metadata: toJsonRecord(row.metadata),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function mapPractitioner(row: PractitionerRow): Practitioner {
  return PractitionerSchema.parse({
    id: row.id,
    tenantId: row.tenantId,
    externalPractitionerId: row.externalPractitionerId,
    name: row.name,
    specialty: row.specialty,
    active: row.active,
    metadata: toJsonRecord(row.metadata),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function mapClinicLocation(row: ClinicLocationRow): ClinicLocation {
  return ClinicLocationSchema.parse({
    id: row.id,
    tenantId: row.tenantId,
    externalLocationId: row.externalLocationId,
    name: row.name,
    address: row.address,
    phone: row.phone,
    active: row.active,
    metadata: toJsonRecord(row.metadata),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function mapAppointment(row: AppointmentRow): Appointment {
  return AppointmentSchema.parse({
    id: row.id,
    tenantId: row.tenantId,
    patientId: row.patientId,
    externalAppointmentId: row.externalAppointmentId,
    serviceId: row.serviceId,
    practitionerId: row.practitionerId,
    locationId: row.locationId,
    threadId: row.threadId,
    status: row.status,
    source: row.source,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    bookedAt: row.bookedAt.toISOString(),
    confirmationStatus: row.confirmationStatus,
    reminderStatus: row.reminderStatus,
    cancellationReason: row.cancellationReason,
    metadata: toJsonRecord(row.metadata),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function mapAppointmentEvent(row: AppointmentEventRow) {
  return AppointmentEventSchema.parse({
    id: row.id,
    tenantId: row.tenantId,
    appointmentId: row.appointmentId,
    eventType: row.eventType,
    actorType: row.actorType,
    payload: toJsonRecord(row.payload),
    createdAt: row.createdAt.toISOString(),
  });
}

export function mapAppointmentSummary(
  row: AppointmentRow,
  options: {
    patient?: PatientListItem | null;
    service?: ClinicService | null;
    practitioner?: Practitioner | null;
    location?: ClinicLocation | null;
  } = {}
): AppointmentSummary {
  return AppointmentSummarySchema.parse({
    ...mapAppointment(row),
    patient: options.patient ?? null,
    service: options.service ?? null,
    practitioner: options.practitioner ?? null,
    location: options.location ?? null,
  });
}

export function mapAppointmentDetail(
  row: AppointmentRow,
  options: {
    patient?: PatientListItem | null;
    service?: ClinicService | null;
    practitioner?: Practitioner | null;
    location?: ClinicLocation | null;
    events?: ReturnType<typeof mapAppointmentEvent>[];
  } = {}
): AppointmentDetail {
  return AppointmentDetailSchema.parse({
    ...mapAppointmentSummary(row, options),
    events: options.events ?? [],
  });
}

export function mapReminderJob(row: ReminderJobRow): ReminderJob {
  return ReminderJobSchema.parse({
    id: row.id,
    tenantId: row.tenantId,
    appointmentId: row.appointmentId,
    channelType: row.channelType,
    status: row.status,
    scheduledFor: row.scheduledFor.toISOString(),
    sentAt: toDateTimeString(row.sentAt),
    templateKey: row.templateKey,
    attemptCount: row.attemptCount,
    lastError: row.lastError,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function mapConfirmationRequest(row: ConfirmationRequestRow): ConfirmationRequest {
  return ConfirmationRequestSchema.parse({
    id: row.id,
    tenantId: row.tenantId,
    appointmentId: row.appointmentId,
    channelType: row.channelType,
    status: row.status,
    requestedAt: row.requestedAt.toISOString(),
    dueAt: row.dueAt.toISOString(),
    respondedAt: toDateTimeString(row.respondedAt),
    responsePayload: toJsonRecord(row.responsePayload),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function mapWaitlistRequest(row: WaitlistRequestRow): WaitlistRequest {
  return WaitlistRequestSchema.parse({
    id: row.id,
    tenantId: row.tenantId,
    patientId: row.patientId,
    serviceId: row.serviceId,
    practitionerId: row.practitionerId,
    locationId: row.locationId,
    preferredWindows: toArray(row.preferredWindows),
    status: row.status,
    priorityScore: row.priorityScore,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function mapGapOpportunity(row: GapOpportunityRow): GapOpportunity {
  return GapOpportunitySchema.parse({
    id: row.id,
    tenantId: row.tenantId,
    originAppointmentId: row.originAppointmentId,
    serviceId: row.serviceId,
    practitionerId: row.practitionerId,
    locationId: row.locationId,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    status: row.status,
    origin: row.origin,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function mapGapOutreachAttempt(row: GapOutreachAttemptRow): GapOutreachAttempt {
  return GapOutreachAttemptSchema.parse({
    id: row.id,
    tenantId: row.tenantId,
    gapOpportunityId: row.gapOpportunityId,
    patientId: row.patientId,
    channelType: row.channelType,
    status: row.status,
    sentAt: toDateTimeString(row.sentAt),
    respondedAt: toDateTimeString(row.respondedAt),
    result: row.result,
    metadata: toJsonRecord(row.metadata),
    createdAt: row.createdAt.toISOString(),
  });
}

export function mapGapOpportunityDetail(
  row: GapOpportunityRow,
  attempts: GapOutreachAttempt[] = []
): GapOpportunityDetail {
  return GapOpportunityDetailSchema.parse({
    ...mapGapOpportunity(row),
    outreachAttempts: attempts,
  });
}

export function mapReactivationCampaign(row: ReactivationCampaignRow): ReactivationCampaign {
  return ReactivationCampaignSchema.parse({
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    campaignType: row.campaignType,
    status: row.status,
    audienceDefinition: toJsonRecord(row.audienceDefinition),
    messageTemplate: toJsonRecord(row.messageTemplate),
    channelPolicy: toJsonRecord(row.channelPolicy),
    scheduledAt: toDateTimeString(row.scheduledAt),
    startedAt: toDateTimeString(row.startedAt),
    completedAt: toDateTimeString(row.completedAt),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export function mapReactivationRecipient(row: ReactivationRecipientRow): ReactivationRecipient {
  return ReactivationRecipientSchema.parse({
    id: row.id,
    tenantId: row.tenantId,
    campaignId: row.campaignId,
    patientId: row.patientId,
    status: row.status,
    lastContactAt: toDateTimeString(row.lastContactAt),
    lastResponseAt: toDateTimeString(row.lastResponseAt),
    result: row.result,
    generatedAppointmentId: row.generatedAppointmentId,
    metadata: toJsonRecord(row.metadata),
    createdAt: row.createdAt.toISOString(),
  });
}

export function mapReactivationCampaignDetail(
  row: ReactivationCampaignRow,
  recipients: ReactivationRecipient[] = []
): ReactivationCampaignDetail {
  return ReactivationCampaignDetailSchema.parse({
    ...mapReactivationCampaign(row),
    recipients,
  });
}
