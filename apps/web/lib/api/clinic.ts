import {
  type AppointmentDetail,
  type AppointmentFilters,
  type AppointmentResponse,
  type AppointmentsResponse,
  type AssignConversationBody,
  type CallbackCallBody,
  type CallFilters,
  type CallSessionDetail,
  type CallsResponse,
  type CampaignFilters,
  type CancelAppointmentBody,
  type ClinicChannel,
  type ClinicDashboard,
  type ClinicExperience,
  ClinicFeatureUnavailableErrorSchema,
  type ClinicFeatureUnavailableError as ClinicFeatureUnavailablePayload,
  type ClinicListQuery,
  type ClinicProfile,
  type CloseGapBody,
  type CompleteIntakeFormSubmissionBody,
  type ConfirmationFilters,
  type ConfirmationRequest,
  type ConversationMessage,
  type ConversationThreadDetail,
  type ConversationsResponse,
  type ConfirmAppointmentBody,
  type CreateAppointmentBody,
  type CreatePatientBody,
  type CreateReactivationCampaignBody,
  type CreateWaitlistRequestBody,
  type EscalateConfirmationBody,
  type EscalateConversationBody,
  type GapOpportunityDetail,
  type GapFilters,
  type IntakeFormSubmission,
  type IntakeFormTemplate,
  type ClinicModuleEntitlement,
  type ModuleKey,
  type OfferGapBody,
  type PatientFilters,
  type PatientResponse,
  type PatientsResponse,
  type PauseReactivationCampaignBody,
  type ReactivatePatientBody,
  type ReactivationCampaignDetail,
  type ReactivationCampaignsResponse,
  type ReactivationRecipient,
  type ReminderJob,
  type RescheduleAppointmentBody,
  type RemindConfirmationBody,
  type ReplyConversationBody,
  type ResolveCallBody,
  type ResolveConversationBody,
  type ResumeReactivationCampaignBody,
  type SendIntakeFormSubmissionBody,
  type StartReactivationCampaignBody,
  type UpdateAppointmentBody,
  type UpdateClinicChannelBody,
  type UpdateClinicProfileBody,
  type UpdatePatientBody,
  type UpdateTenantModuleBody,
  type WaiveIntakeFormSubmissionBody,
  type WaitlistRequest,
  AppointmentResponseSchema,
  AppointmentsResponseSchema,
  CallResponseSchema,
  CallsResponseSchema,
  ClinicChannelResponseSchema,
  ClinicChannelsResponseSchema,
  ClinicDashboardResponseSchema,
  ClinicExperienceResponseSchema,
  ClinicModulesResponseSchema,
  ClinicProfileResponseSchema,
  ConfirmationRequestResponseSchema,
  ConfirmationRequestsResponseSchema,
  ConversationMessagesResponseSchema,
  ConversationResponseSchema,
  ConversationsResponseSchema,
  GapOpportunitiesResponseSchema,
  GapOpportunityResponseSchema,
  IntakeFormSubmissionResponseSchema,
  IntakeFormSubmissionsResponseSchema,
  IntakeFormTemplatesResponseSchema,
  PatientResponseSchema,
  PatientsResponseSchema,
  ReactivationCampaignResponseSchema,
  ReactivationCampaignsResponseSchema,
  ReactivationRecipientsResponseSchema,
  ReminderJobResponseSchema,
  ReminderJobsResponseSchema,
  TenantModuleResponseSchema,
  WaitlistRequestResponseSchema,
} from '@agentmou/contracts';

import { ApiError, buildQueryString, requestParsed } from './core';

export class ClinicFeatureUnavailableApiError extends ApiError {
  constructor(public feature: ClinicFeatureUnavailablePayload) {
    super(409, feature.detail ?? feature.error, feature);
    this.name = 'ClinicFeatureUnavailableApiError';
  }
}

async function clinicRequestParsed<TSchema>(
  path: string,
  schema: TSchema,
  options?: RequestInit
): Promise<TSchema extends { _output: infer TOutput } ? TOutput : never> {
  try {
    return await requestParsed(path, schema as never, options);
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      const parsed = ClinicFeatureUnavailableErrorSchema.safeParse(error.body);
      if (parsed.success) {
        throw new ClinicFeatureUnavailableApiError(parsed.data);
      }
    }

    throw error;
  }
}

function clinicTenantPath(tenantId: string, path: string) {
  return `/api/v1/tenants/${tenantId}${path}`;
}

function toQueryString(query?: Record<string, string | number | boolean | null | undefined>) {
  return buildQueryString(query ?? {});
}

function toJsonBody(body: unknown) {
  return {
    method: 'POST',
    body: JSON.stringify(body),
  } as const;
}

function toPutJsonBody(body: unknown) {
  return {
    method: 'PUT',
    body: JSON.stringify(body),
  } as const;
}

export async function fetchClinicDashboard(tenantId: string): Promise<ClinicDashboard> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, '/clinic/dashboard'),
    ClinicDashboardResponseSchema
  );
  return data.dashboard;
}

export async function fetchClinicExperience(tenantId: string): Promise<ClinicExperience> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, '/clinic/experience'),
    ClinicExperienceResponseSchema
  );
  return data.experience;
}

export async function fetchClinicProfile(tenantId: string): Promise<ClinicProfile> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, '/clinic/profile'),
    ClinicProfileResponseSchema
  );
  return data.profile;
}

export async function updateClinicProfile(
  tenantId: string,
  body: UpdateClinicProfileBody
): Promise<ClinicProfile> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, '/clinic/profile'),
    ClinicProfileResponseSchema,
    toPutJsonBody(body)
  );
  return data.profile;
}

export async function fetchClinicModules(tenantId: string): Promise<ClinicModuleEntitlement[]> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, '/clinic/modules'),
    ClinicModulesResponseSchema
  );
  return data.modules;
}

export async function updateClinicModule(
  tenantId: string,
  moduleKey: ModuleKey,
  body: UpdateTenantModuleBody
): Promise<ClinicModuleEntitlement> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/clinic/modules/${moduleKey}`),
    TenantModuleResponseSchema,
    toPutJsonBody(body)
  );
  return data.module;
}

export async function fetchClinicChannels(tenantId: string): Promise<ClinicChannel[]> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, '/clinic/channels'),
    ClinicChannelsResponseSchema
  );
  return data.channels;
}

export async function updateClinicChannel(
  tenantId: string,
  channelType: 'whatsapp' | 'voice',
  body: UpdateClinicChannelBody
): Promise<ClinicChannel> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/clinic/channels/${channelType}`),
    ClinicChannelResponseSchema,
    toPutJsonBody(body)
  );
  return data.channel;
}

export async function fetchPatients(
  tenantId: string,
  filters: PatientFilters = {}
): Promise<PatientsResponse> {
  return clinicRequestParsed(
    clinicTenantPath(tenantId, `/patients${toQueryString(filters)}`),
    PatientsResponseSchema
  );
}

export async function fetchPatient(tenantId: string, patientId: string): Promise<PatientResponse> {
  return clinicRequestParsed(
    clinicTenantPath(tenantId, `/patients/${patientId}`),
    PatientResponseSchema
  );
}

export async function createPatient(
  tenantId: string,
  body: CreatePatientBody
): Promise<PatientResponse> {
  return clinicRequestParsed(
    clinicTenantPath(tenantId, '/patients'),
    PatientResponseSchema,
    toJsonBody(body)
  );
}

export async function updatePatient(
  tenantId: string,
  patientId: string,
  body: UpdatePatientBody
): Promise<PatientResponse> {
  return clinicRequestParsed(
    clinicTenantPath(tenantId, `/patients/${patientId}`),
    PatientResponseSchema,
    toPutJsonBody(body)
  );
}

export async function reactivatePatient(
  tenantId: string,
  patientId: string,
  body: ReactivatePatientBody
): Promise<PatientResponse> {
  return clinicRequestParsed(
    clinicTenantPath(tenantId, `/patients/${patientId}/reactivate`),
    PatientResponseSchema,
    toJsonBody(body)
  );
}

export async function createWaitlistRequest(
  tenantId: string,
  patientId: string,
  body: CreateWaitlistRequestBody
): Promise<WaitlistRequest> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/patients/${patientId}/waitlist`),
    WaitlistRequestResponseSchema,
    toJsonBody(body)
  );
  return data.waitlistRequest;
}

export async function fetchConversations(
  tenantId: string,
  filters: Record<string, string | number | boolean | null | undefined> = {}
): Promise<ConversationsResponse> {
  return clinicRequestParsed(
    clinicTenantPath(tenantId, `/conversations${toQueryString(filters)}`),
    ConversationsResponseSchema
  );
}

export async function fetchConversation(
  tenantId: string,
  threadId: string
): Promise<ConversationThreadDetail> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/conversations/${threadId}`),
    ConversationResponseSchema
  );
  return data.thread;
}

export async function fetchConversationMessages(
  tenantId: string,
  threadId: string
): Promise<ConversationMessage[]> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/conversations/${threadId}/messages`),
    ConversationMessagesResponseSchema
  );
  return data.messages;
}

export async function assignConversation(
  tenantId: string,
  threadId: string,
  body: AssignConversationBody
): Promise<ConversationThreadDetail> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/conversations/${threadId}/assign`),
    ConversationResponseSchema,
    toJsonBody(body)
  );
  return data.thread;
}

export async function escalateConversation(
  tenantId: string,
  threadId: string,
  body: EscalateConversationBody
): Promise<ConversationThreadDetail> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/conversations/${threadId}/escalate`),
    ConversationResponseSchema,
    toJsonBody(body)
  );
  return data.thread;
}

export async function resolveConversation(
  tenantId: string,
  threadId: string,
  body: ResolveConversationBody
): Promise<ConversationThreadDetail> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/conversations/${threadId}/resolve`),
    ConversationResponseSchema,
    toJsonBody(body)
  );
  return data.thread;
}

export async function replyConversation(
  tenantId: string,
  threadId: string,
  body: ReplyConversationBody
): Promise<ConversationThreadDetail> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/conversations/${threadId}/reply`),
    ConversationResponseSchema,
    toJsonBody(body)
  );
  return data.thread;
}

export async function fetchCalls(
  tenantId: string,
  filters: CallFilters = {}
): Promise<CallsResponse> {
  return clinicRequestParsed(
    clinicTenantPath(tenantId, `/calls${toQueryString(filters)}`),
    CallsResponseSchema
  );
}

export async function fetchCall(tenantId: string, callId: string): Promise<CallSessionDetail> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/calls/${callId}`),
    CallResponseSchema
  );
  return data.call;
}

export async function requestCallCallback(
  tenantId: string,
  callId: string,
  body: CallbackCallBody
): Promise<CallSessionDetail> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/calls/${callId}/callback`),
    CallResponseSchema,
    toJsonBody(body)
  );
  return data.call;
}

export async function resolveCall(
  tenantId: string,
  callId: string,
  body: ResolveCallBody
): Promise<CallSessionDetail> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/calls/${callId}/resolve`),
    CallResponseSchema,
    toJsonBody(body)
  );
  return data.call;
}

export async function fetchAppointments(
  tenantId: string,
  filters: AppointmentFilters = {}
): Promise<AppointmentsResponse> {
  return clinicRequestParsed(
    clinicTenantPath(tenantId, `/appointments${toQueryString(filters)}`),
    AppointmentsResponseSchema
  );
}

export async function fetchAppointment(
  tenantId: string,
  appointmentId: string
): Promise<AppointmentDetail> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/appointments/${appointmentId}`),
    AppointmentResponseSchema
  );
  return data.appointment;
}

export async function createAppointment(tenantId: string, body: CreateAppointmentBody) {
  return clinicRequestParsed(
    clinicTenantPath(tenantId, '/appointments'),
    AppointmentResponseSchema,
    toJsonBody(body)
  );
}

export async function updateAppointment(
  tenantId: string,
  appointmentId: string,
  body: UpdateAppointmentBody
): Promise<AppointmentResponse> {
  return clinicRequestParsed(
    clinicTenantPath(tenantId, `/appointments/${appointmentId}`),
    AppointmentResponseSchema,
    toPutJsonBody(body)
  );
}

export async function rescheduleAppointment(
  tenantId: string,
  appointmentId: string,
  body: RescheduleAppointmentBody
): Promise<AppointmentResponse> {
  return clinicRequestParsed(
    clinicTenantPath(tenantId, `/appointments/${appointmentId}/reschedule`),
    AppointmentResponseSchema,
    toJsonBody(body)
  );
}

export async function cancelAppointment(
  tenantId: string,
  appointmentId: string,
  body: CancelAppointmentBody
): Promise<AppointmentResponse> {
  return clinicRequestParsed(
    clinicTenantPath(tenantId, `/appointments/${appointmentId}/cancel`),
    AppointmentResponseSchema,
    toJsonBody(body)
  );
}

export async function confirmAppointment(
  tenantId: string,
  appointmentId: string,
  body: ConfirmAppointmentBody
): Promise<AppointmentResponse> {
  return clinicRequestParsed(
    clinicTenantPath(tenantId, `/appointments/${appointmentId}/confirm`),
    AppointmentResponseSchema,
    toJsonBody(body)
  );
}

export async function fetchFormTemplates(tenantId: string): Promise<IntakeFormTemplate[]> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, '/forms/templates'),
    IntakeFormTemplatesResponseSchema
  );
  return data.templates;
}

export async function fetchFormSubmissions(tenantId: string): Promise<IntakeFormSubmission[]> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, '/forms/submissions'),
    IntakeFormSubmissionsResponseSchema
  );
  return data.submissions;
}

export async function fetchFormSubmission(
  tenantId: string,
  submissionId: string
): Promise<IntakeFormSubmission> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/forms/submissions/${submissionId}`),
    IntakeFormSubmissionResponseSchema
  );
  return data.submission;
}

export async function sendFormSubmission(
  tenantId: string,
  submissionId: string,
  body: SendIntakeFormSubmissionBody
): Promise<IntakeFormSubmission> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/forms/submissions/${submissionId}/send`),
    IntakeFormSubmissionResponseSchema,
    toJsonBody(body)
  );
  return data.submission;
}

export async function markFormSubmissionComplete(
  tenantId: string,
  submissionId: string,
  body: CompleteIntakeFormSubmissionBody
): Promise<IntakeFormSubmission> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/forms/submissions/${submissionId}/mark-complete`),
    IntakeFormSubmissionResponseSchema,
    toJsonBody(body)
  );
  return data.submission;
}

export async function waiveFormSubmission(
  tenantId: string,
  submissionId: string,
  body: WaiveIntakeFormSubmissionBody
): Promise<IntakeFormSubmission> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/forms/submissions/${submissionId}/waive`),
    IntakeFormSubmissionResponseSchema,
    toJsonBody(body)
  );
  return data.submission;
}

export async function fetchReminders(
  tenantId: string,
  query: ClinicListQuery = {}
): Promise<ReminderJob[]> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/follow-up/reminders${toQueryString(query)}`),
    ReminderJobsResponseSchema
  );
  return data.reminders;
}

export async function fetchConfirmations(
  tenantId: string,
  filters: ConfirmationFilters = {}
): Promise<ConfirmationRequest[]> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/follow-up/confirmations${toQueryString(filters)}`),
    ConfirmationRequestsResponseSchema
  );
  return data.confirmations;
}

export async function remindConfirmation(
  tenantId: string,
  confirmationId: string,
  body: RemindConfirmationBody
): Promise<ReminderJob> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/follow-up/confirmations/${confirmationId}/remind`),
    ReminderJobResponseSchema,
    toJsonBody(body)
  );
  return data.reminder;
}

export async function escalateConfirmation(
  tenantId: string,
  confirmationId: string,
  body: EscalateConfirmationBody
): Promise<ConfirmationRequest> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/follow-up/confirmations/${confirmationId}/escalate`),
    ConfirmationRequestResponseSchema,
    toJsonBody(body)
  );
  return data.confirmation;
}

export async function fetchGaps(
  tenantId: string,
  filters: GapFilters = {}
): Promise<GapOpportunityDetail[]> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/follow-up/gaps${toQueryString(filters)}`),
    GapOpportunitiesResponseSchema
  );
  return data.gaps;
}

export async function offerGap(
  tenantId: string,
  gapId: string,
  body: OfferGapBody
): Promise<GapOpportunityDetail> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/follow-up/gaps/${gapId}/offer`),
    GapOpportunityResponseSchema,
    toJsonBody(body)
  );
  return data.gap;
}

export async function closeGap(
  tenantId: string,
  gapId: string,
  body: CloseGapBody
): Promise<GapOpportunityDetail> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/follow-up/gaps/${gapId}/close`),
    GapOpportunityResponseSchema,
    toJsonBody(body)
  );
  return data.gap;
}

export async function fetchReactivationCampaigns(
  tenantId: string,
  filters: CampaignFilters = {}
): Promise<ReactivationCampaignsResponse> {
  return clinicRequestParsed(
    clinicTenantPath(tenantId, `/reactivation/campaigns${toQueryString(filters)}`),
    ReactivationCampaignsResponseSchema
  );
}

export async function fetchReactivationCampaign(
  tenantId: string,
  campaignId: string
): Promise<ReactivationCampaignDetail> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/reactivation/campaigns/${campaignId}`),
    ReactivationCampaignResponseSchema
  );
  return data.campaign;
}

export async function createReactivationCampaign(
  tenantId: string,
  body: CreateReactivationCampaignBody
): Promise<ReactivationCampaignDetail> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, '/reactivation/campaigns'),
    ReactivationCampaignResponseSchema,
    toJsonBody(body)
  );
  return data.campaign;
}

export async function startReactivationCampaign(
  tenantId: string,
  campaignId: string,
  body: StartReactivationCampaignBody = {}
): Promise<ReactivationCampaignDetail> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/reactivation/campaigns/${campaignId}/start`),
    ReactivationCampaignResponseSchema,
    toJsonBody(body)
  );
  return data.campaign;
}

export async function pauseReactivationCampaign(
  tenantId: string,
  campaignId: string,
  body: PauseReactivationCampaignBody = {}
): Promise<ReactivationCampaignDetail> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/reactivation/campaigns/${campaignId}/pause`),
    ReactivationCampaignResponseSchema,
    toJsonBody(body)
  );
  return data.campaign;
}

export async function resumeReactivationCampaign(
  tenantId: string,
  campaignId: string,
  body: ResumeReactivationCampaignBody = {}
): Promise<ReactivationCampaignDetail> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/reactivation/campaigns/${campaignId}/resume`),
    ReactivationCampaignResponseSchema,
    toJsonBody(body)
  );
  return data.campaign;
}

export async function fetchReactivationRecipients(
  tenantId: string,
  query: ClinicListQuery = {}
): Promise<ReactivationRecipient[]> {
  const data = await clinicRequestParsed(
    clinicTenantPath(tenantId, `/reactivation/recipients${toQueryString(query)}`),
    ReactivationRecipientsResponseSchema
  );
  return data.recipients;
}
