/**
 * MockProvider — wraps the synchronous read-model functions with async signatures.
 *
 * Used by marketing/demo routes to show the full mock catalog.
 */

import type { DataProvider } from './provider';
import {
  listTenants as _listTenants,
  getTenant as _getTenant,
  listCatalogAgentTemplates as _listCatalogAgentTemplates,
  listMarketplaceAgentTemplates as _listMarketplaceAgentTemplates,
  getAgentTemplate as _getAgentTemplate,
  listCatalogWorkflowTemplates as _listCatalogWorkflowTemplates,
  listMarketplaceWorkflowTemplates as _listMarketplaceWorkflowTemplates,
  getWorkflowTemplate as _getWorkflowTemplate,
  listPackTemplates as _listPackTemplates,
  getPackTemplate as _getPackTemplate,
  listIntegrations as _listIntegrations,
  listTenantIntegrations as _listTenantIntegrations,
  listTenantInstalledAgents as _listTenantInstalledAgents,
  listTenantInstalledWorkflows as _listTenantInstalledWorkflows,
  listTenantApprovals as _listTenantApprovals,
  listTenantRuns as _listTenantRuns,
  getTenantRun as _getTenantRun,
  listTenantSecurityFindings as _listTenantSecurityFindings,
  listTenantSecurityPolicies as _listTenantSecurityPolicies,
  listTenantMembers as _listTenantMembers,
  listTenantInvoices as _listTenantInvoices,
  getTenantN8nConnection as _getTenantN8nConnection,
  listTenantSecrets as _listTenantSecrets,
  listTenantAuditEvents as _listTenantAuditEvents,
  getTenantBillingInfo as _getTenantBillingInfo,
  getTenantDashboardMetrics as _getTenantDashboardMetrics,
} from '@/lib/demo/read-model';
import {
  getClinicAppointment as _getClinicAppointment,
  getClinicCall as _getClinicCall,
  getClinicConversation as _getClinicConversation,
  getClinicDashboard as _getClinicDashboard,
  getClinicFormSubmission as _getClinicFormSubmission,
  getClinicPatient as _getClinicPatient,
  getClinicProfile as _getClinicProfile,
  getClinicReactivationCampaign as _getClinicReactivationCampaign,
  listClinicAppointments as _listClinicAppointments,
  listClinicCalls as _listClinicCalls,
  listClinicChannels as _listClinicChannels,
  listClinicConfirmations as _listClinicConfirmations,
  listClinicConversations as _listClinicConversations,
  listClinicConversationMessages as _listClinicConversationMessages,
  listClinicFormSubmissions as _listClinicFormSubmissions,
  listClinicFormTemplates as _listClinicFormTemplates,
  listClinicGaps as _listClinicGaps,
  listClinicModules as _listClinicModules,
  listClinicPatients as _listClinicPatients,
  listClinicReactivationCampaigns as _listClinicReactivationCampaigns,
  listClinicReactivationRecipients as _listClinicReactivationRecipients,
  listClinicReminders as _listClinicReminders,
} from '@/lib/demo/clinic-read-model';

export const mockProvider: DataProvider = {
  providerMode: 'mock',
  // Catalog
  listCatalogAgentTemplates: async () => _listCatalogAgentTemplates(),
  listMarketplaceAgentTemplates: async () => _listMarketplaceAgentTemplates(),
  getAgentTemplate: async (id) => _getAgentTemplate(id) ?? null,
  listCatalogWorkflowTemplates: async () => _listCatalogWorkflowTemplates(),
  listMarketplaceWorkflowTemplates: async () => _listMarketplaceWorkflowTemplates(),
  getWorkflowTemplate: async (id) => _getWorkflowTemplate(id) ?? null,
  listPackTemplates: async () => _listPackTemplates(),
  getPackTemplate: async (id) => _getPackTemplate(id) ?? null,
  listIntegrations: async () => _listIntegrations(),

  // Tenancy
  listTenants: async () => _listTenants(),
  getTenant: async (id) => _getTenant(id),
  listTenantMembers: async (id) => _listTenantMembers(id),

  // Installations
  listTenantInstalledAgents: async (id) => _listTenantInstalledAgents(id),
  listTenantInstalledWorkflows: async (id) => _listTenantInstalledWorkflows(id),
  installAgent: async () => ({ ok: true }),
  installPack: async () => ({ ok: true }),

  // Execution
  listTenantRuns: async (id) => _listTenantRuns(id),
  getTenantRun: async (tenantId, runId) => _getTenantRun(tenantId, runId) ?? null,

  // Approvals
  listTenantApprovals: async (id) => _listTenantApprovals(id),
  approveRequest: async () => ({ ok: true }),
  rejectRequest: async () => ({ ok: true }),

  // Security
  listTenantSecurityFindings: async (id) => _listTenantSecurityFindings(id),
  listTenantSecurityPolicies: async (id) => _listTenantSecurityPolicies(id),
  listTenantSecrets: async (id) => _listTenantSecrets(id),
  listTenantAuditEvents: async (id) => _listTenantAuditEvents(id),

  // Billing
  listTenantInvoices: async (id) => _listTenantInvoices(id),
  getTenantBillingInfo: async (id) => _getTenantBillingInfo(id),

  // Dashboard
  getTenantDashboardMetrics: async (id, period) => _getTenantDashboardMetrics(id, period),

  // Connectors
  listTenantIntegrations: async (id) => _listTenantIntegrations(id),
  getTenantN8nConnection: async (id) => _getTenantN8nConnection(id) ?? null,

  // Clinic configuration
  getClinicDashboard: async (tenantId) => _getClinicDashboard(tenantId),
  getClinicProfile: async (tenantId) => _getClinicProfile(tenantId),
  updateClinicProfile: async (tenantId) => _getClinicProfile(tenantId),
  listClinicModules: async (tenantId) => _listClinicModules(tenantId),
  updateClinicModule: async (_tenantId, moduleKey) =>
    _listClinicModules('demo-workspace').find((module) => module.moduleKey === moduleKey)!,
  listClinicChannels: async (tenantId) => _listClinicChannels(tenantId),
  updateClinicChannel: async (tenantId, channelType) =>
    _listClinicChannels(tenantId).find((channel) => channel.channelType === channelType)!,

  // Clinic patients
  listClinicPatients: async (tenantId, filters) => _listClinicPatients(tenantId, filters),
  getClinicPatient: async (tenantId, patientId) => _getClinicPatient(tenantId, patientId)!,
  createClinicPatient: async (tenantId, body) =>
    ({
      patient: {
        id: 'patient-created',
        tenantId,
        externalPatientId: null,
        status: 'new_lead',
        isExisting: false,
        firstName: body.firstName,
        lastName: body.lastName,
        fullName: `${body.firstName} ${body.lastName}`,
        phone: body.phone ?? null,
        email: body.email ?? null,
        dateOfBirth: body.dateOfBirth ?? null,
        notes: body.notes ?? null,
        consentFlags: body.consentFlags ?? {},
        source: 'manual',
        lastInteractionAt: null,
        nextSuggestedActionAt: null,
        createdAt: ISODateString(),
        updatedAt: ISODateString(),
      },
      identities: [],
      upcomingAppointments: [],
      waitlistRequests: [],
    }),
  updateClinicPatient: async (tenantId, patientId) => _getClinicPatient(tenantId, patientId)!,
  reactivateClinicPatient: async (tenantId, patientId) => _getClinicPatient(tenantId, patientId)!,
  createClinicWaitlistRequest: async (tenantId, patientId) =>
    _getClinicPatient(tenantId, patientId)!.waitlistRequests[0] ?? {
      id: 'waitlist-created',
      tenantId,
      patientId,
      serviceId: null,
      practitionerId: null,
      locationId: null,
      preferredWindows: [],
      status: 'active',
      priorityScore: 50,
      notes: null,
      createdAt: ISODateString(),
      updatedAt: ISODateString(),
    },

  // Clinic conversations
  listClinicConversations: async (tenantId, filters) => _listClinicConversations(tenantId),
  getClinicConversation: async (tenantId, threadId) => _getClinicConversation(tenantId, threadId)!,
  listClinicConversationMessages: async (tenantId, threadId) =>
    _listClinicConversationMessages(tenantId, threadId),
  assignClinicConversation: async (tenantId, threadId) => _getClinicConversation(tenantId, threadId)!,
  escalateClinicConversation: async (tenantId, threadId) =>
    _getClinicConversation(tenantId, threadId)!,
  resolveClinicConversation: async (tenantId, threadId) =>
    _getClinicConversation(tenantId, threadId)!,
  replyClinicConversation: async (tenantId, threadId) => _getClinicConversation(tenantId, threadId)!,

  // Clinic calls
  listClinicCalls: async (tenantId, filters) => _listClinicCalls(tenantId, filters),
  getClinicCall: async (tenantId, callId) => _getClinicCall(tenantId, callId)!,
  requestClinicCallCallback: async (tenantId, callId) => _getClinicCall(tenantId, callId)!,
  resolveClinicCall: async (tenantId, callId) => _getClinicCall(tenantId, callId)!,

  // Clinic appointments
  listClinicAppointments: async (tenantId, filters) => _listClinicAppointments(tenantId, filters),
  getClinicAppointment: async (tenantId, appointmentId) =>
    _getClinicAppointment(tenantId, appointmentId)!,
  createClinicAppointment: async (tenantId) => _getClinicAppointment(tenantId, 'appointment-1')!,
  updateClinicAppointment: async (tenantId, appointmentId) =>
    _getClinicAppointment(tenantId, appointmentId)!,
  rescheduleClinicAppointment: async (tenantId, appointmentId) =>
    _getClinicAppointment(tenantId, appointmentId)!,
  cancelClinicAppointment: async (tenantId, appointmentId) =>
    _getClinicAppointment(tenantId, appointmentId)!,
  confirmClinicAppointment: async (tenantId, appointmentId) =>
    _getClinicAppointment(tenantId, appointmentId)!,

  // Clinic forms
  listClinicFormTemplates: async (tenantId) => _listClinicFormTemplates(tenantId),
  listClinicFormSubmissions: async (tenantId) => _listClinicFormSubmissions(tenantId),
  getClinicFormSubmission: async (tenantId, submissionId) =>
    _getClinicFormSubmission(tenantId, submissionId)!,
  sendClinicFormSubmission: async (tenantId, submissionId) =>
    _getClinicFormSubmission(tenantId, submissionId)!,
  completeClinicFormSubmission: async (tenantId, submissionId) =>
    _getClinicFormSubmission(tenantId, submissionId)!,
  waiveClinicFormSubmission: async (tenantId, submissionId) =>
    _getClinicFormSubmission(tenantId, submissionId)!,

  // Clinic follow-up
  listClinicReminders: async (tenantId) => _listClinicReminders(tenantId),
  listClinicConfirmations: async (tenantId, filters) => _listClinicConfirmations(tenantId, filters),
  remindClinicConfirmation: async (tenantId) => _listClinicReminders(tenantId)[0]!,
  escalateClinicConfirmation: async (tenantId) => _listClinicConfirmations(tenantId)[0]!,
  listClinicGaps: async (tenantId, filters) => _listClinicGaps(tenantId, filters),
  offerClinicGap: async (tenantId) => _listClinicGaps(tenantId)[0]!,
  closeClinicGap: async (tenantId) => _listClinicGaps(tenantId)[0]!,

  // Clinic reactivation
  listClinicReactivationCampaigns: async (tenantId, filters) =>
    _listClinicReactivationCampaigns(tenantId, filters),
  getClinicReactivationCampaign: async (tenantId, campaignId) =>
    _getClinicReactivationCampaign(tenantId, campaignId)!,
  createClinicReactivationCampaign: async (tenantId) =>
    _getClinicReactivationCampaign(tenantId, 'campaign-1')!,
  startClinicReactivationCampaign: async (tenantId) =>
    _listClinicReactivationCampaigns(tenantId).campaigns[0]!,
  pauseClinicReactivationCampaign: async (tenantId) =>
    _listClinicReactivationCampaigns(tenantId).campaigns[0]!,
  resumeClinicReactivationCampaign: async (tenantId) =>
    _listClinicReactivationCampaigns(tenantId).campaigns[0]!,
  listClinicReactivationRecipients: async (tenantId) => _listClinicReactivationRecipients(tenantId),
};

function ISODateString() {
  return new Date('2025-01-15T09:00:00.000Z').toISOString();
}
