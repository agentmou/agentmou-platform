/**
 * ApiProvider — wraps the real API clients for authenticated app routes.
 *
 * Platform surfaces keep using the existing control-plane endpoints while the
 * clinic control center delegates to the typed clinic client.
 */

import type { DataProvider } from './provider';
import {
  approveRequest as apiApprove,
  fetchBillingOverview,
  fetchCatalogAgent,
  fetchCatalogAgents,
  fetchCatalogPack,
  fetchCatalogPacks,
  fetchCatalogWorkflows,
  fetchConnectors,
  fetchInstalledAgents,
  fetchInstalledWorkflows,
  fetchTenant,
  fetchTenantApprovals,
  fetchTenantAuditLogs,
  fetchTenantInvoices,
  fetchTenantMembers,
  fetchTenantRun,
  fetchTenantRuns,
  fetchTenantSecrets,
  fetchTenantSecurityFindings,
  fetchTenantSecurityPolicies,
  fetchTenants,
  fetchWorkflowEngineStatus,
  installAgent as apiInstallAgent,
  installPack as apiInstallPack,
  rejectRequest as apiReject,
} from '@/lib/api/client';
import {
  assignConversation,
  cancelAppointment,
  closeGap,
  confirmAppointment,
  createAppointment,
  createPatient,
  createReactivationCampaign,
  createWaitlistRequest,
  escalateConfirmation,
  escalateConversation,
  fetchAppointment,
  fetchAppointments,
  fetchCall,
  fetchCalls,
  fetchClinicChannels,
  fetchClinicDashboard,
  fetchClinicModules,
  fetchClinicProfile,
  fetchConfirmations,
  fetchConversation,
  fetchConversationMessages,
  fetchConversations,
  fetchFormSubmission,
  fetchFormSubmissions,
  fetchFormTemplates,
  fetchGaps,
  fetchPatient,
  fetchPatients,
  fetchReactivationCampaign,
  fetchReactivationCampaigns,
  fetchReactivationRecipients,
  fetchReminders,
  markFormSubmissionComplete,
  offerGap,
  pauseReactivationCampaign,
  reactivatePatient,
  remindConfirmation,
  replyConversation,
  requestCallCallback,
  rescheduleAppointment,
  resolveCall,
  resolveConversation,
  resumeReactivationCampaign,
  sendFormSubmission,
  startReactivationCampaign,
  updateAppointment,
  updateClinicChannel,
  updateClinicModule,
  updateClinicProfile,
  updatePatient,
  waiveFormSubmission,
} from '@/lib/api/clinic';

import { buildDashboardMetrics } from './dashboard-metrics';

export const apiProvider: DataProvider = {
  providerMode: 'api',

  // Catalog
  listCatalogAgentTemplates: () => fetchCatalogAgents(),
  listMarketplaceAgentTemplates: () => fetchCatalogAgents(),
  getAgentTemplate: (id) => fetchCatalogAgent(id),
  listCatalogWorkflowTemplates: () => fetchCatalogWorkflows(),
  listMarketplaceWorkflowTemplates: () => fetchCatalogWorkflows(),
  getWorkflowTemplate: async (id) => {
    const all = await fetchCatalogWorkflows();
    return all.find((workflow) => workflow.id === id) ?? null;
  },
  listPackTemplates: () => fetchCatalogPacks(),
  getPackTemplate: (id) => fetchCatalogPack(id),
  listIntegrations: async (tenantId?: string) => {
    if (!tenantId) {
      return [];
    }

    return fetchConnectors(tenantId);
  },

  // Tenancy
  listTenants: () => fetchTenants(),
  getTenant: (id) => fetchTenant(id),
  listTenantMembers: (id) => fetchTenantMembers(id),

  // Installations
  listTenantInstalledAgents: (id) => fetchInstalledAgents(id),
  listTenantInstalledWorkflows: (id) => fetchInstalledWorkflows(id),
  installAgent: (tenantId, templateId, config) => apiInstallAgent(tenantId, templateId, config),
  installPack: (tenantId, packId, config) => apiInstallPack(tenantId, packId, config),

  // Execution
  listTenantRuns: (id) => fetchTenantRuns(id),
  getTenantRun: (tenantId, runId) => fetchTenantRun(tenantId, runId),

  // Approvals
  listTenantApprovals: (id) => fetchTenantApprovals(id),
  approveRequest: (tenantId, approvalId, reason) => apiApprove(tenantId, approvalId, reason),
  rejectRequest: (tenantId, approvalId, reason) => apiReject(tenantId, approvalId, reason),

  // Security
  listTenantSecurityFindings: (id) => fetchTenantSecurityFindings(id),
  listTenantSecurityPolicies: (id) => fetchTenantSecurityPolicies(id),
  listTenantSecrets: async (id) => {
    const secrets = await fetchTenantSecrets(id);
    return secrets.map((secret) => ({
      id: secret.id,
      key: secret.key,
      value: 'redacted',
      createdAt: secret.createdAt,
      lastRotated: secret.rotatedAt ?? secret.createdAt,
      usedBy: secret.connectorAccountId ? [secret.connectorAccountId] : [],
    }));
  },
  listTenantAuditEvents: async (id) => {
    const logs = await fetchTenantAuditLogs(id);
    return logs.map((log) => ({
      id: log.id,
      timestamp: log.timestamp,
      action: log.action,
      actor: log.actorLabel,
      category:
        log.category === 'membership' || log.category === 'connector'
          ? 'security'
          : log.category === 'approval'
            ? 'workflow'
            : log.category === 'auth'
              ? 'security'
              : log.category,
      details: Object.entries(log.details)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(', '),
    }));
  },

  // Billing
  listTenantInvoices: (id) => fetchTenantInvoices(id),
  getTenantBillingInfo: async (id) => {
    const [overview, agents] = await Promise.all([fetchBillingOverview(id), fetchInstalledAgents(id)]);
    const primaryPaymentMethod = overview.paymentMethods.find((method) => method.isDefault);

    return {
      plan: overview.subscription.plan,
      monthlySpend: overview.subscription.monthlyBaseAmount,
      agentsInstalled: agents.length,
      runsThisMonth: overview.usage.billableRuns,
      includedRuns: overview.usage.includedRuns,
      overageRuns: overview.usage.overageRuns,
      overageAmount: overview.usage.overageAmount,
      subscriptionStatus: overview.subscription.status,
      currency: overview.subscription.currency,
      currentPeriodEnd: overview.subscription.currentPeriodEnd,
      paymentMethodSummary: primaryPaymentMethod?.last4
        ? `${primaryPaymentMethod.brand?.toUpperCase() || 'CARD'} •••• ${primaryPaymentMethod.last4}`
        : undefined,
    };
  },

  // Dashboard
  getTenantDashboardMetrics: async (tenantId, period) => {
    const runs = await fetchTenantRuns(tenantId);
    return buildDashboardMetrics(tenantId, runs, period);
  },

  // Connectors
  listTenantIntegrations: (id) => fetchConnectors(id),
  getTenantN8nConnection: async (id) => {
    const status = await fetchWorkflowEngineStatus(id);
    return {
      tenantId: status.tenantId,
      baseUrl: status.baseUrl,
      apiKeySet: status.apiKeySet,
      lastTestAt: status.lastTestAt,
      lastTestStatus: status.lastTestStatus,
      executionCount: status.executionCount,
      availability: status.availability,
      installedWorkflows: status.installedWorkflows,
      activeWorkflows: status.activeWorkflows,
      lastProvisionedAt: status.lastProvisionedAt,
      lastExecutionAt: status.lastExecutionAt,
      platformManaged: status.platformManaged,
    };
  },

  // Clinic configuration
  getClinicDashboard: (tenantId) => fetchClinicDashboard(tenantId),
  getClinicProfile: async (tenantId) => {
    try {
      return await fetchClinicProfile(tenantId);
    } catch {
      return null;
    }
  },
  updateClinicProfile: (tenantId, body) => updateClinicProfile(tenantId, body),
  listClinicModules: (tenantId) => fetchClinicModules(tenantId),
  updateClinicModule: (tenantId, moduleKey, body) => updateClinicModule(tenantId, moduleKey, body),
  listClinicChannels: (tenantId) => fetchClinicChannels(tenantId),
  updateClinicChannel: (tenantId, channelType, body) =>
    updateClinicChannel(tenantId, channelType, body),

  // Clinic patients
  listClinicPatients: (tenantId, filters) => fetchPatients(tenantId, filters),
  getClinicPatient: (tenantId, patientId) => fetchPatient(tenantId, patientId),
  createClinicPatient: (tenantId, body) => createPatient(tenantId, body),
  updateClinicPatient: (tenantId, patientId, body) => updatePatient(tenantId, patientId, body),
  reactivateClinicPatient: (tenantId, patientId, body) =>
    reactivatePatient(tenantId, patientId, body),
  createClinicWaitlistRequest: (tenantId, patientId, body) =>
    createWaitlistRequest(tenantId, patientId, body),

  // Clinic conversations
  listClinicConversations: (tenantId, filters) => fetchConversations(tenantId, filters),
  getClinicConversation: (tenantId, threadId) => fetchConversation(tenantId, threadId),
  listClinicConversationMessages: (tenantId, threadId) =>
    fetchConversationMessages(tenantId, threadId),
  assignClinicConversation: (tenantId, threadId, body) =>
    assignConversation(tenantId, threadId, body),
  escalateClinicConversation: (tenantId, threadId, body) =>
    escalateConversation(tenantId, threadId, body),
  resolveClinicConversation: (tenantId, threadId, body) =>
    resolveConversation(tenantId, threadId, body),
  replyClinicConversation: (tenantId, threadId, body) => replyConversation(tenantId, threadId, body),

  // Clinic calls
  listClinicCalls: (tenantId, filters) => fetchCalls(tenantId, filters),
  getClinicCall: (tenantId, callId) => fetchCall(tenantId, callId),
  requestClinicCallCallback: (tenantId, callId, body) =>
    requestCallCallback(tenantId, callId, body),
  resolveClinicCall: (tenantId, callId, body) => resolveCall(tenantId, callId, body),

  // Clinic appointments
  listClinicAppointments: (tenantId, filters) => fetchAppointments(tenantId, filters),
  getClinicAppointment: (tenantId, appointmentId) => fetchAppointment(tenantId, appointmentId),
  createClinicAppointment: async (tenantId, body) => (await createAppointment(tenantId, body)).appointment,
  updateClinicAppointment: (tenantId, appointmentId, body) =>
    updateAppointment(tenantId, appointmentId, body).then((response) => response.appointment),
  rescheduleClinicAppointment: (tenantId, appointmentId, body) =>
    rescheduleAppointment(tenantId, appointmentId, body).then((response) => response.appointment),
  cancelClinicAppointment: (tenantId, appointmentId, body) =>
    cancelAppointment(tenantId, appointmentId, body).then((response) => response.appointment),
  confirmClinicAppointment: (tenantId, appointmentId, body) =>
    confirmAppointment(tenantId, appointmentId, body).then((response) => response.appointment),

  // Clinic forms
  listClinicFormTemplates: (tenantId) => fetchFormTemplates(tenantId),
  listClinicFormSubmissions: (tenantId) => fetchFormSubmissions(tenantId),
  getClinicFormSubmission: (tenantId, submissionId) => fetchFormSubmission(tenantId, submissionId),
  sendClinicFormSubmission: (tenantId, submissionId, body) =>
    sendFormSubmission(tenantId, submissionId, body),
  completeClinicFormSubmission: (tenantId, submissionId, body) =>
    markFormSubmissionComplete(tenantId, submissionId, body),
  waiveClinicFormSubmission: (tenantId, submissionId, body) =>
    waiveFormSubmission(tenantId, submissionId, body),

  // Clinic follow-up
  listClinicReminders: (tenantId, query) => fetchReminders(tenantId, query),
  listClinicConfirmations: (tenantId, filters) => fetchConfirmations(tenantId, filters),
  remindClinicConfirmation: (tenantId, confirmationId, body) =>
    remindConfirmation(tenantId, confirmationId, body),
  escalateClinicConfirmation: (tenantId, confirmationId, body) =>
    escalateConfirmation(tenantId, confirmationId, body),
  listClinicGaps: (tenantId, filters) => fetchGaps(tenantId, filters),
  offerClinicGap: (tenantId, gapId, body) => offerGap(tenantId, gapId, body),
  closeClinicGap: (tenantId, gapId, body) => closeGap(tenantId, gapId, body),

  // Clinic reactivation
  listClinicReactivationCampaigns: (tenantId, filters) =>
    fetchReactivationCampaigns(tenantId, filters),
  getClinicReactivationCampaign: (tenantId, campaignId) =>
    fetchReactivationCampaign(tenantId, campaignId),
  createClinicReactivationCampaign: (tenantId, body) => createReactivationCampaign(tenantId, body),
  startClinicReactivationCampaign: (tenantId, campaignId, body) =>
    startReactivationCampaign(tenantId, campaignId, body),
  pauseClinicReactivationCampaign: (tenantId, campaignId, body) =>
    pauseReactivationCampaign(tenantId, campaignId, body),
  resumeClinicReactivationCampaign: (tenantId, campaignId, body) =>
    resumeReactivationCampaign(tenantId, campaignId, body),
  listClinicReactivationRecipients: (tenantId, query) =>
    fetchReactivationRecipients(tenantId, query),
};
