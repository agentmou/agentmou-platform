/**
 * DataProvider interface — unified data access for the tenant control-plane UI.
 *
 * Two implementations exist:
 *   - MockProvider: wraps read-model.ts (sync mock data, instant)
 *   - ApiProvider:  wraps lib/api/client.ts (real API calls)
 *
 * Marketing routes use MockProvider (full demo catalog).
 * App routes use ApiProvider (real tenant data).
 */

import {
  AdminChangeTenantVerticalInput,
  AdminDeleteTenantUserResponse,
  AdminStartImpersonationInput,
  AdminStartImpersonationResponse,
  AdminStopImpersonationInput,
  AdminStopImpersonationResponse,
  AdminTenantDetail,
  AdminTenantFeatureResolution,
  AdminTenantListFilters,
  AdminTenantListResponse,
  AdminTenantUser,
  AdminTenantUserMutationResponse,
  AdminCreateTenantUserInput,
  AdminUpdateTenantUserInput,
  Tenant,
  TenantExperience,
  TenantMember,
  AgentTemplate,
  WorkflowTemplate,
  PackTemplate,
  Integration,
  InstalledAgent,
  InstalledWorkflow,
  ApprovalRequest,
  ExecutionRun,
  SecurityFinding,
  SecurityPolicy,
  N8nConnection,
  Invoice,
  DashboardMetrics,
  type AppointmentDetail,
  type AppointmentFilters,
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
  type ClinicModuleEntitlement,
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
  type ModuleKey,
  type OfferGapBody,
  type PatientFilters,
  type PatientResponse,
  type PatientsResponse,
  type PauseReactivationCampaignBody,
  type ReactivatePatientBody,
  type ReactivationCampaign,
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
} from '@agentmou/contracts';

export type DataProviderMode = 'api' | 'demo' | 'mock';

export interface FleetSecret {
  id: string;
  key: string;
  value: string;
  createdAt: string;
  lastRotated: string;
  usedBy: string[];
}

export interface FleetAuditEvent {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  category: 'agent' | 'workflow' | 'security' | 'billing' | 'admin';
  details: string;
}

export interface FleetBillingInfo {
  plan: string;
  monthlySpend: number;
  agentsInstalled: number;
  runsThisMonth: number;
  includedRuns?: number | null;
  overageRuns?: number;
  overageAmount?: number;
  subscriptionStatus?: string;
  currency?: string;
  currentPeriodEnd?: string;
  paymentMethodSummary?: string;
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export interface CatalogMethods {
  listCatalogAgentTemplates(): Promise<AgentTemplate[]>;
  listMarketplaceAgentTemplates(): Promise<AgentTemplate[]>;
  getAgentTemplate(agentId: string): Promise<AgentTemplate | null>;

  listCatalogWorkflowTemplates(): Promise<WorkflowTemplate[]>;
  listMarketplaceWorkflowTemplates(): Promise<WorkflowTemplate[]>;
  getWorkflowTemplate(workflowId: string): Promise<WorkflowTemplate | null>;

  listPackTemplates(): Promise<PackTemplate[]>;
  getPackTemplate(packIdOrSlug: string): Promise<PackTemplate | null>;

  listIntegrations(): Promise<Integration[]>;
}

// ---------------------------------------------------------------------------
// Tenancy
// ---------------------------------------------------------------------------

export interface TenancyMethods {
  listTenants(): Promise<Tenant[]>;
  getTenant(tenantId: string): Promise<Tenant | null>;
  getTenantExperience(tenantId: string): Promise<TenantExperience | null>;
  listTenantMembers(tenantId: string): Promise<TenantMember[]>;
}

export interface AdminMethods {
  listAdminTenants(
    adminTenantId: string,
    filters?: AdminTenantListFilters
  ): Promise<AdminTenantListResponse>;
  getAdminTenantDetail(
    adminTenantId: string,
    managedTenantId: string
  ): Promise<AdminTenantDetail | null>;
  listAdminTenantUsers(adminTenantId: string, managedTenantId: string): Promise<AdminTenantUser[]>;
  getAdminTenantFeatureResolution(
    adminTenantId: string,
    managedTenantId: string
  ): Promise<AdminTenantFeatureResolution | null>;
  createAdminTenantUser(
    adminTenantId: string,
    managedTenantId: string,
    body: AdminCreateTenantUserInput
  ): Promise<AdminTenantUserMutationResponse>;
  updateAdminTenantUser(
    adminTenantId: string,
    managedTenantId: string,
    userId: string,
    body: AdminUpdateTenantUserInput
  ): Promise<AdminTenantUserMutationResponse>;
  deleteAdminTenantUser(
    adminTenantId: string,
    managedTenantId: string,
    userId: string
  ): Promise<AdminDeleteTenantUserResponse>;
  changeAdminTenantVertical(
    adminTenantId: string,
    managedTenantId: string,
    body: AdminChangeTenantVerticalInput
  ): Promise<AdminTenantDetail>;
  startAdminImpersonation(
    adminTenantId: string,
    managedTenantId: string,
    body: AdminStartImpersonationInput
  ): Promise<AdminStartImpersonationResponse>;
  stopAdminImpersonation(
    body: AdminStopImpersonationInput
  ): Promise<AdminStopImpersonationResponse>;
}

// ---------------------------------------------------------------------------
// Installations
// ---------------------------------------------------------------------------

export interface InstallationMethods {
  listTenantInstalledAgents(tenantId: string): Promise<InstalledAgent[]>;
  listTenantInstalledWorkflows(tenantId: string): Promise<InstalledWorkflow[]>;
  installAgent(
    tenantId: string,
    templateId: string,
    config?: Record<string, unknown>
  ): Promise<unknown>;
  installPack(tenantId: string, packId: string, config?: Record<string, unknown>): Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Execution
// ---------------------------------------------------------------------------

export interface ExecutionMethods {
  listTenantRuns(tenantId: string): Promise<ExecutionRun[]>;
  getTenantRun(tenantId: string, runId: string): Promise<ExecutionRun | null>;
}

// ---------------------------------------------------------------------------
// Approvals
// ---------------------------------------------------------------------------

export interface ApprovalMethods {
  listTenantApprovals(tenantId: string): Promise<ApprovalRequest[]>;
  approveRequest(tenantId: string, approvalId: string, reason?: string): Promise<unknown>;
  rejectRequest(tenantId: string, approvalId: string, reason?: string): Promise<unknown>;
}

// ---------------------------------------------------------------------------
// Security & Compliance (stubs in API, full in mock)
// ---------------------------------------------------------------------------

export interface SecurityMethods {
  listTenantSecurityFindings(tenantId: string): Promise<SecurityFinding[]>;
  listTenantSecurityPolicies(tenantId: string): Promise<SecurityPolicy[]>;
  listTenantSecrets(tenantId: string): Promise<FleetSecret[]>;
  listTenantAuditEvents(tenantId: string): Promise<FleetAuditEvent[]>;
}

// ---------------------------------------------------------------------------
// Billing (stub in API)
// ---------------------------------------------------------------------------

export interface BillingMethods {
  listTenantInvoices(tenantId: string): Promise<Invoice[]>;
  getTenantBillingInfo(tenantId: string): Promise<FleetBillingInfo>;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface DashboardMethods {
  getTenantDashboardMetrics(
    tenantId: string,
    period?: DashboardMetrics['period']
  ): Promise<DashboardMetrics>;
}

// ---------------------------------------------------------------------------
// Connectors / n8n
// ---------------------------------------------------------------------------

export interface ConnectorMethods {
  listTenantIntegrations(tenantId: string): Promise<Integration[]>;
  getTenantN8nConnection(tenantId: string): Promise<N8nConnection | null>;
}

// ---------------------------------------------------------------------------
// Clinic
// ---------------------------------------------------------------------------

export interface ClinicConfigurationMethods {
  getClinicDashboard(tenantId: string): Promise<ClinicDashboard>;
  getClinicExperience(tenantId: string): Promise<ClinicExperience | null>;
  getClinicProfile(tenantId: string): Promise<ClinicProfile | null>;
  updateClinicProfile(tenantId: string, body: UpdateClinicProfileBody): Promise<ClinicProfile>;
  listClinicModules(tenantId: string): Promise<ClinicModuleEntitlement[]>;
  updateClinicModule(
    tenantId: string,
    moduleKey: ModuleKey,
    body: UpdateTenantModuleBody
  ): Promise<ClinicModuleEntitlement>;
  listClinicChannels(tenantId: string): Promise<ClinicChannel[]>;
  updateClinicChannel(
    tenantId: string,
    channelType: 'whatsapp' | 'voice',
    body: UpdateClinicChannelBody
  ): Promise<ClinicChannel>;
}

export interface ClinicPatientMethods {
  listClinicPatients(tenantId: string, filters?: PatientFilters): Promise<PatientsResponse>;
  getClinicPatient(tenantId: string, patientId: string): Promise<PatientResponse>;
  createClinicPatient(tenantId: string, body: CreatePatientBody): Promise<PatientResponse>;
  updateClinicPatient(
    tenantId: string,
    patientId: string,
    body: UpdatePatientBody
  ): Promise<PatientResponse>;
  reactivateClinicPatient(
    tenantId: string,
    patientId: string,
    body: ReactivatePatientBody
  ): Promise<PatientResponse>;
  createClinicWaitlistRequest(
    tenantId: string,
    patientId: string,
    body: CreateWaitlistRequestBody
  ): Promise<WaitlistRequest>;
}

export interface ClinicConversationMethods {
  listClinicConversations(
    tenantId: string,
    filters?: Record<string, string | number | boolean | null | undefined>
  ): Promise<ConversationsResponse>;
  getClinicConversation(tenantId: string, threadId: string): Promise<ConversationThreadDetail>;
  listClinicConversationMessages(
    tenantId: string,
    threadId: string
  ): Promise<ConversationMessage[]>;
  assignClinicConversation(
    tenantId: string,
    threadId: string,
    body: AssignConversationBody
  ): Promise<ConversationThreadDetail>;
  escalateClinicConversation(
    tenantId: string,
    threadId: string,
    body: EscalateConversationBody
  ): Promise<ConversationThreadDetail>;
  resolveClinicConversation(
    tenantId: string,
    threadId: string,
    body: ResolveConversationBody
  ): Promise<ConversationThreadDetail>;
  replyClinicConversation(
    tenantId: string,
    threadId: string,
    body: ReplyConversationBody
  ): Promise<ConversationThreadDetail>;
}

export interface ClinicCallMethods {
  listClinicCalls(tenantId: string, filters?: CallFilters): Promise<CallsResponse>;
  getClinicCall(tenantId: string, callId: string): Promise<CallSessionDetail>;
  requestClinicCallCallback(
    tenantId: string,
    callId: string,
    body: CallbackCallBody
  ): Promise<CallSessionDetail>;
  resolveClinicCall(
    tenantId: string,
    callId: string,
    body: ResolveCallBody
  ): Promise<CallSessionDetail>;
}

export interface ClinicAppointmentMethods {
  listClinicAppointments(
    tenantId: string,
    filters?: AppointmentFilters
  ): Promise<AppointmentsResponse>;
  getClinicAppointment(tenantId: string, appointmentId: string): Promise<AppointmentDetail>;
  createClinicAppointment(
    tenantId: string,
    body: CreateAppointmentBody
  ): Promise<AppointmentDetail>;
  updateClinicAppointment(
    tenantId: string,
    appointmentId: string,
    body: UpdateAppointmentBody
  ): Promise<AppointmentDetail>;
  rescheduleClinicAppointment(
    tenantId: string,
    appointmentId: string,
    body: RescheduleAppointmentBody
  ): Promise<AppointmentDetail>;
  cancelClinicAppointment(
    tenantId: string,
    appointmentId: string,
    body: CancelAppointmentBody
  ): Promise<AppointmentDetail>;
  confirmClinicAppointment(
    tenantId: string,
    appointmentId: string,
    body: ConfirmAppointmentBody
  ): Promise<AppointmentDetail>;
}

export interface ClinicFormMethods {
  listClinicFormTemplates(tenantId: string): Promise<IntakeFormTemplate[]>;
  listClinicFormSubmissions(tenantId: string): Promise<IntakeFormSubmission[]>;
  getClinicFormSubmission(tenantId: string, submissionId: string): Promise<IntakeFormSubmission>;
  sendClinicFormSubmission(
    tenantId: string,
    submissionId: string,
    body: SendIntakeFormSubmissionBody
  ): Promise<IntakeFormSubmission>;
  completeClinicFormSubmission(
    tenantId: string,
    submissionId: string,
    body: CompleteIntakeFormSubmissionBody
  ): Promise<IntakeFormSubmission>;
  waiveClinicFormSubmission(
    tenantId: string,
    submissionId: string,
    body: WaiveIntakeFormSubmissionBody
  ): Promise<IntakeFormSubmission>;
}

export interface ClinicFollowUpMethods {
  listClinicReminders(
    tenantId: string,
    query?: Record<string, string | number | boolean | null | undefined>
  ): Promise<ReminderJob[]>;
  listClinicConfirmations(
    tenantId: string,
    filters?: ConfirmationFilters
  ): Promise<ConfirmationRequest[]>;
  remindClinicConfirmation(
    tenantId: string,
    confirmationId: string,
    body: RemindConfirmationBody
  ): Promise<ReminderJob>;
  escalateClinicConfirmation(
    tenantId: string,
    confirmationId: string,
    body: EscalateConfirmationBody
  ): Promise<ConfirmationRequest>;
  listClinicGaps(tenantId: string, filters?: GapFilters): Promise<GapOpportunityDetail[]>;
  offerClinicGap(
    tenantId: string,
    gapId: string,
    body: OfferGapBody
  ): Promise<GapOpportunityDetail>;
  closeClinicGap(
    tenantId: string,
    gapId: string,
    body: CloseGapBody
  ): Promise<GapOpportunityDetail>;
}

export interface ClinicReactivationMethods {
  listClinicReactivationCampaigns(
    tenantId: string,
    filters?: CampaignFilters
  ): Promise<ReactivationCampaignsResponse>;
  getClinicReactivationCampaign(
    tenantId: string,
    campaignId: string
  ): Promise<ReactivationCampaignDetail>;
  createClinicReactivationCampaign(
    tenantId: string,
    body: CreateReactivationCampaignBody
  ): Promise<ReactivationCampaign>;
  startClinicReactivationCampaign(
    tenantId: string,
    campaignId: string,
    body: StartReactivationCampaignBody
  ): Promise<ReactivationCampaign>;
  pauseClinicReactivationCampaign(
    tenantId: string,
    campaignId: string,
    body: PauseReactivationCampaignBody
  ): Promise<ReactivationCampaign>;
  resumeClinicReactivationCampaign(
    tenantId: string,
    campaignId: string,
    body: ResumeReactivationCampaignBody
  ): Promise<ReactivationCampaign>;
  listClinicReactivationRecipients(
    tenantId: string,
    query?: Record<string, string | number | boolean | null | undefined>
  ): Promise<ReactivationRecipient[]>;
}

export interface ProviderMetadata {
  providerMode: DataProviderMode;
}

// ---------------------------------------------------------------------------
// Composite DataProvider
// ---------------------------------------------------------------------------

export interface DataProvider
  extends ProviderMetadata,
    CatalogMethods,
    TenancyMethods,
    AdminMethods,
    InstallationMethods,
    ExecutionMethods,
    ApprovalMethods,
    SecurityMethods,
    BillingMethods,
    DashboardMethods,
    ConnectorMethods,
    ClinicConfigurationMethods,
    ClinicPatientMethods,
    ClinicConversationMethods,
    ClinicCallMethods,
    ClinicAppointmentMethods,
    ClinicFormMethods,
    ClinicFollowUpMethods,
    ClinicReactivationMethods {}
