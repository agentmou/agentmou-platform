import type {
  AppointmentDetail,
  AppointmentFilters,
  AppointmentsResponse,
  CallFilters,
  CallSessionDetail,
  CallsResponse,
  CampaignFilters,
  ClinicChannel,
  ClinicDashboard,
  ClinicExperience,
  ClinicModuleEntitlement,
  ClinicProfile,
  ConfirmationFilters,
  ConfirmationRequest,
  ConversationFilters,
  ConversationMessage,
  ConversationThreadDetail,
  ConversationsResponse,
  GapFilters,
  GapOpportunityDetail,
  IntakeFormSubmission,
  IntakeFormTemplate,
  PatientFilters,
  PatientResponse,
  PatientsResponse,
  ReactivationCampaignDetail,
  ReactivationCampaignsResponse,
  ReactivationRecipient,
  ReminderJob,
} from '@agentmou/contracts';

import {
  buildClinicDemoDataset,
  CLINIC_DEMO_TENANT_ID,
  type ClinicDemoFixtureSummary,
} from './clinic-demo-fixtures';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getDataset(tenantId = CLINIC_DEMO_TENANT_ID) {
  return buildClinicDemoDataset(tenantId);
}

function matchesSearch(haystacks: Array<string | null | undefined>, query?: string) {
  if (!query) return true;
  const normalized = query.toLowerCase();
  return haystacks.some((value) => value?.toLowerCase().includes(normalized));
}

function isSameDay(left: string, right: string) {
  const leftDate = new Date(left);
  const rightDate = new Date(right);
  return (
    leftDate.getUTCFullYear() === rightDate.getUTCFullYear() &&
    leftDate.getUTCMonth() === rightDate.getUTCMonth() &&
    leftDate.getUTCDate() === rightDate.getUTCDate()
  );
}

function isOnOrAfter(left: string, right?: string) {
  if (!right) return true;
  return new Date(left).getTime() >= new Date(right).getTime();
}

function isOnOrBefore(left: string, right?: string) {
  if (!right) return true;
  return new Date(left).getTime() <= new Date(right).getTime();
}

export function getClinicDemoFixtureSummary(
  tenantId = CLINIC_DEMO_TENANT_ID
): ClinicDemoFixtureSummary {
  return clone(getDataset(tenantId).summary);
}

export function getClinicDashboard(tenantId: string): ClinicDashboard {
  return clone(getDataset(tenantId).dashboard);
}

export function getClinicProfile(tenantId: string): ClinicProfile {
  return clone(getDataset(tenantId).profile);
}

export function getClinicExperience(tenantId: string): ClinicExperience {
  return clone(getDataset(tenantId).experience);
}

export function listClinicModules(tenantId: string): ClinicModuleEntitlement[] {
  return clone(getDataset(tenantId).modules);
}

export function listClinicChannels(tenantId: string): ClinicChannel[] {
  return clone(getDataset(tenantId).channels);
}

export function listClinicPatients(
  tenantId: string,
  filters: PatientFilters = {}
): PatientsResponse {
  const items = getDataset(tenantId).patientListItems.filter((patient) => {
    if (
      !matchesSearch([patient.fullName, patient.phone ?? null, patient.email ?? null], filters.search)
    ) {
      return false;
    }
    if (filters.status && patient.status !== filters.status) return false;
    if (typeof filters.isExisting === 'boolean' && patient.isExisting !== filters.isExisting) {
      return false;
    }
    if (
      typeof filters.hasPendingForm === 'boolean' &&
      Boolean(patient.hasPendingForm) !== filters.hasPendingForm
    ) {
      return false;
    }
    if (
      typeof filters.isReactivationCandidate === 'boolean' &&
      Boolean(patient.isReactivationCandidate) !== filters.isReactivationCandidate
    ) {
      return false;
    }
    if (
      typeof filters.hasUpcomingAppointment === 'boolean' &&
      Boolean(patient.upcomingAppointmentCount) !== filters.hasUpcomingAppointment
    ) {
      return false;
    }
    return true;
  });

  return clone({ patients: items, total: items.length });
}

export function getClinicPatient(tenantId: string, patientId: string): PatientResponse | null {
  const dataset = getDataset(tenantId);
  const patient = dataset.patients.find((item) => item.id === patientId);
  if (!patient) return null;

  return clone({
    patient,
    identities: dataset.patientIdentities[patientId] ?? [],
    upcomingAppointments: dataset.appointments
      .filter(
        (appointment) => appointment.patientId === patientId && appointment.status !== 'cancelled'
      )
      .map(({ events: _events, ...appointment }) => appointment),
    waitlistRequests: dataset.waitlistRequests.filter((request) => request.patientId === patientId),
  });
}

export function listClinicConversations(
  tenantId: string,
  filters: ConversationFilters = {}
): ConversationsResponse {
  const items = getDataset(tenantId).threadListItems.filter((thread) => {
    if (
      !matchesSearch(
        [
          thread.patient?.fullName ?? null,
          thread.patient?.phone ?? null,
          thread.patient?.email ?? null,
          thread.lastMessagePreview ?? null,
        ],
        filters.search
      )
    ) {
      return false;
    }
    if (filters.channelType && thread.channelType !== filters.channelType) return false;
    if (filters.status && thread.status !== filters.status) return false;
    if (filters.priority && thread.priority !== filters.priority) return false;
    if (filters.intent && thread.intent !== filters.intent) return false;
    if (filters.assignedUserId && thread.assignedUserId !== filters.assignedUserId) return false;
    if (
      typeof filters.requiresHumanReview === 'boolean' &&
      thread.requiresHumanReview !== filters.requiresHumanReview
    ) {
      return false;
    }
    return true;
  });

  return clone({ threads: items, total: items.length });
}

export function getClinicConversation(
  tenantId: string,
  threadId: string
): ConversationThreadDetail | null {
  return clone(getDataset(tenantId).threads.find((thread) => thread.id === threadId) ?? null);
}

export function listClinicConversationMessages(
  tenantId: string,
  threadId: string
): ConversationMessage[] {
  return clone(
    getDataset(tenantId).messages.filter((message) => message.threadId === threadId)
  );
}

export function listClinicCalls(tenantId: string, filters: CallFilters = {}): CallsResponse {
  const items = getDataset(tenantId).calls.filter((call) => {
    if (filters.status && call.status !== filters.status) return false;
    if (filters.channelType && (call.thread?.channelType ?? 'voice') !== filters.channelType) {
      return false;
    }
    if (filters.patientId && call.patientId !== filters.patientId) return false;
    if (filters.from && call.fromNumber !== filters.from) return false;
    if (filters.to && call.toNumber !== filters.to) return false;
    return true;
  });

  return clone({ calls: items, total: items.length });
}

export function getClinicCall(tenantId: string, callId: string): CallSessionDetail | null {
  return clone(getDataset(tenantId).calls.find((call) => call.id === callId) ?? null);
}

export function listClinicAppointments(
  tenantId: string,
  filters: AppointmentFilters = {}
): AppointmentsResponse {
  const items = getDataset(tenantId).appointments.filter((appointment) => {
    if (filters.status && appointment.status !== filters.status) return false;
    if (
      filters.confirmationStatus &&
      appointment.confirmationStatus !== filters.confirmationStatus
    ) {
      return false;
    }
    if (filters.reminderStatus && appointment.reminderStatus !== filters.reminderStatus) {
      return false;
    }
    if (filters.locationId && appointment.locationId !== filters.locationId) return false;
    if (filters.practitionerId && appointment.practitionerId !== filters.practitionerId) {
      return false;
    }
    if (filters.serviceId && appointment.serviceId !== filters.serviceId) return false;
    if (filters.date && !isSameDay(appointment.startsAt, filters.date)) return false;
    if (!isOnOrAfter(appointment.startsAt, filters.from)) return false;
    if (!isOnOrBefore(appointment.startsAt, filters.to)) return false;
    return true;
  });

  return clone({
    appointments: items.map(({ events: _events, ...appointment }) => appointment),
    total: items.length,
  });
}

export function getClinicAppointment(
  tenantId: string,
  appointmentId: string
): AppointmentDetail | null {
  return clone(
    getDataset(tenantId).appointments.find((appointment) => appointment.id === appointmentId) ??
      null
  );
}

export function listClinicFormTemplates(tenantId: string): IntakeFormTemplate[] {
  return clone(getDataset(tenantId).formTemplates);
}

export function listClinicFormSubmissions(tenantId: string): IntakeFormSubmission[] {
  return clone(getDataset(tenantId).formSubmissions);
}

export function getClinicFormSubmission(
  tenantId: string,
  submissionId: string
): IntakeFormSubmission | null {
  return clone(
    getDataset(tenantId).formSubmissions.find((submission) => submission.id === submissionId) ??
      null
  );
}

export function listClinicReminders(tenantId: string): ReminderJob[] {
  return clone(getDataset(tenantId).reminders);
}

export function listClinicConfirmations(
  tenantId: string,
  filters: ConfirmationFilters = {}
): ConfirmationRequest[] {
  return clone(
    getDataset(tenantId).confirmations.filter((confirmation) => {
      if (filters.status && confirmation.status !== filters.status) return false;
      if (filters.channelType && confirmation.channelType !== filters.channelType) return false;
      if (filters.appointmentId && confirmation.appointmentId !== filters.appointmentId) {
        return false;
      }
      if (!isOnOrBefore(confirmation.dueAt, filters.dueBefore)) return false;
      return true;
    })
  );
}

export function listClinicGaps(
  tenantId: string,
  filters: GapFilters = {}
): GapOpportunityDetail[] {
  return clone(
    getDataset(tenantId).gaps.filter((gap) => {
      if (filters.status && gap.status !== filters.status) return false;
      if (filters.serviceId && gap.serviceId !== filters.serviceId) return false;
      if (filters.practitionerId && gap.practitionerId !== filters.practitionerId) return false;
      if (filters.locationId && gap.locationId !== filters.locationId) return false;
      if (!isOnOrAfter(gap.startsAt, filters.from)) return false;
      if (!isOnOrBefore(gap.startsAt, filters.to)) return false;
      return true;
    })
  );
}

export function listClinicReactivationCampaigns(
  tenantId: string,
  filters: CampaignFilters = {}
): ReactivationCampaignsResponse {
  const items = getDataset(tenantId).campaigns.filter((campaign) => {
    if (filters.status && campaign.status !== filters.status) return false;
    if (filters.campaignType && campaign.campaignType !== filters.campaignType) return false;
    if (!isOnOrAfter(campaign.scheduledAt ?? campaign.startedAt ?? campaign.createdAt, filters.scheduledAfter)) {
      return false;
    }
    if (!isOnOrBefore(campaign.scheduledAt ?? campaign.startedAt ?? campaign.createdAt, filters.scheduledBefore)) {
      return false;
    }
    return true;
  });

  return clone({ campaigns: items, total: items.length });
}

export function getClinicReactivationCampaign(
  tenantId: string,
  campaignId: string
): ReactivationCampaignDetail | null {
  return clone(
    getDataset(tenantId).campaignDetails.find((campaign) => campaign.id === campaignId) ?? null
  );
}

export function listClinicReactivationRecipients(tenantId: string): ReactivationRecipient[] {
  return clone(getDataset(tenantId).recipients);
}
