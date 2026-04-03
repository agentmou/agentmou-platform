import type {
  AppointmentDetail,
  AppointmentSummary,
  CallSessionDetail,
  ClinicDashboard,
  ConfirmationRequest,
  ConversationMessage,
  ConversationThreadDetail,
  ConversationThreadListItem,
  GapOpportunityDetail,
  IntakeFormSubmission,
  Patient,
  PatientIdentity,
  PatientListItem,
  ReactivationCampaign,
  ReactivationCampaignDetail,
  ReactivationRecipient,
  WaitlistRequest,
} from '@agentmou/contracts';

const ISO_NOW = '2025-01-15T09:00:00.000Z';
const ISO_LATER = '2025-01-15T10:00:00.000Z';

export function createPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'patient-1',
    tenantId: 'tenant-1',
    externalPatientId: null,
    status: 'new_lead',
    isExisting: false,
    firstName: 'Ana',
    lastName: 'Garcia',
    fullName: 'Ana Garcia',
    phone: '+34123456789',
    email: 'ana@example.com',
    dateOfBirth: null,
    notes: null,
    consentFlags: {},
    source: 'manual',
    lastInteractionAt: null,
    nextSuggestedActionAt: null,
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
    ...overrides,
  };
}

export function createPatientListItem(
  overrides: Partial<PatientListItem> = {}
): PatientListItem {
  return {
    ...createPatient(),
    upcomingAppointmentCount: 1,
    hasPendingForm: false,
    isReactivationCandidate: false,
    ...overrides,
  };
}

export function createPatientIdentity(
  overrides: Partial<PatientIdentity> = {}
): PatientIdentity {
  return {
    id: 'identity-1',
    tenantId: 'tenant-1',
    patientId: 'patient-1',
    identityType: 'phone',
    identityValue: '+34123456789',
    isPrimary: true,
    confidenceScore: 1,
    createdAt: ISO_NOW,
    ...overrides,
  };
}

export function createConversationMessage(
  overrides: Partial<ConversationMessage> = {}
): ConversationMessage {
  return {
    id: 'message-1',
    tenantId: 'tenant-1',
    threadId: 'thread-1',
    patientId: 'patient-1',
    direction: 'inbound',
    channelType: 'whatsapp',
    messageType: 'text',
    body: 'Hola, necesito una cita',
    payload: {},
    deliveryStatus: 'delivered',
    providerMessageId: null,
    sentAt: null,
    receivedAt: ISO_NOW,
    createdAt: ISO_NOW,
    ...overrides,
  };
}

export function createConversationThreadListItem(
  overrides: Partial<ConversationThreadListItem> = {}
): ConversationThreadListItem {
  return {
    id: 'thread-1',
    tenantId: 'tenant-1',
    patientId: 'patient-1',
    channelType: 'whatsapp',
    status: 'in_progress',
    intent: 'book_appointment',
    priority: 'high',
    source: 'whatsapp',
    assignedUserId: null,
    lastMessageAt: ISO_NOW,
    lastInboundAt: ISO_NOW,
    lastOutboundAt: null,
    requiresHumanReview: false,
    resolution: null,
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
    patient: createPatientListItem(),
    lastMessagePreview: 'Hola, necesito una cita',
    nextSuggestedAction: 'Responder disponibilidad',
    unreadCount: 1,
    ...overrides,
  };
}

export function createConversationThreadDetail(
  overrides: Partial<ConversationThreadDetail> = {}
): ConversationThreadDetail {
  return {
    ...createConversationThreadListItem(),
    patient: createPatient(),
    messages: [createConversationMessage()],
    ...overrides,
  };
}

export function createAppointmentSummary(
  overrides: Partial<AppointmentSummary> = {}
): AppointmentSummary {
  return {
    id: 'appointment-1',
    tenantId: 'tenant-1',
    patientId: 'patient-1',
    externalAppointmentId: null,
    serviceId: null,
    practitionerId: null,
    locationId: null,
    threadId: null,
    status: 'scheduled',
    source: 'manual',
    startsAt: ISO_NOW,
    endsAt: ISO_LATER,
    bookedAt: ISO_NOW,
    confirmationStatus: 'pending',
    reminderStatus: 'pending',
    cancellationReason: null,
    metadata: {},
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
    patient: createPatientListItem(),
    service: null,
    practitioner: null,
    location: null,
    ...overrides,
  };
}

export function createAppointmentDetail(
  overrides: Partial<AppointmentDetail> = {}
): AppointmentDetail {
  return {
    ...createAppointmentSummary(),
    events: [
      {
        id: 'event-1',
        tenantId: 'tenant-1',
        appointmentId: 'appointment-1',
        eventType: 'created',
        actorType: 'human',
        payload: {},
        createdAt: ISO_NOW,
      },
    ],
    ...overrides,
  };
}

export function createWaitlistRequest(
  overrides: Partial<WaitlistRequest> = {}
): WaitlistRequest {
  return {
    id: 'waitlist-1',
    tenantId: 'tenant-1',
    patientId: 'patient-1',
    serviceId: null,
    practitionerId: null,
    locationId: null,
    preferredWindows: [],
    status: 'active',
    priorityScore: 50,
    notes: null,
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
    ...overrides,
  };
}

export function createPatientDetailResponse() {
  return {
    patient: createPatient(),
    identities: [createPatientIdentity()],
    upcomingAppointments: [createAppointmentSummary()],
    waitlistRequests: [createWaitlistRequest()],
  };
}

export function createCallDetail(
  overrides: Partial<CallSessionDetail> = {}
): CallSessionDetail {
  return {
    id: 'call-1',
    tenantId: 'tenant-1',
    patientId: 'patient-1',
    threadId: 'thread-1',
    direction: 'inbound',
    status: 'received',
    providerCallId: null,
    fromNumber: '+34123456789',
    toNumber: '+34987654321',
    startedAt: ISO_NOW,
    endedAt: null,
    durationSeconds: 0,
    summary: null,
    transcript: null,
    resolution: null,
    requiresHumanReview: false,
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
    patient: createPatient(),
    thread: {
      id: 'thread-1',
      tenantId: 'tenant-1',
      patientId: 'patient-1',
      channelType: 'voice',
      status: 'new',
      intent: 'book_appointment',
      priority: 'high',
      source: 'voice',
      assignedUserId: null,
      lastMessageAt: ISO_NOW,
      lastInboundAt: ISO_NOW,
      lastOutboundAt: null,
      requiresHumanReview: false,
      resolution: null,
      createdAt: ISO_NOW,
      updatedAt: ISO_NOW,
    },
    ...overrides,
  };
}

export function createConfirmationRequest(
  overrides: Partial<ConfirmationRequest> = {}
): ConfirmationRequest {
  return {
    id: 'confirmation-1',
    tenantId: 'tenant-1',
    appointmentId: 'appointment-1',
    channelType: 'whatsapp',
    status: 'pending',
    requestedAt: ISO_NOW,
    dueAt: ISO_LATER,
    respondedAt: null,
    responsePayload: {},
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
    ...overrides,
  };
}

export function createPendingForm(
  overrides: Partial<IntakeFormSubmission> = {}
): IntakeFormSubmission {
  return {
    id: 'submission-1',
    tenantId: 'tenant-1',
    templateId: 'template-1',
    patientId: 'patient-1',
    threadId: 'thread-1',
    status: 'sent',
    answers: {},
    sentAt: ISO_NOW,
    openedAt: null,
    completedAt: null,
    expiresAt: null,
    requiredForBooking: true,
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
    ...overrides,
  };
}

export function createGapDetail(
  overrides: Partial<GapOpportunityDetail> = {}
): GapOpportunityDetail {
  return {
    id: 'gap-1',
    tenantId: 'tenant-1',
    originAppointmentId: 'appointment-1',
    serviceId: null,
    practitionerId: null,
    locationId: null,
    startsAt: ISO_NOW,
    endsAt: ISO_LATER,
    status: 'open',
    origin: 'cancellation',
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
    outreachAttempts: [],
    ...overrides,
  };
}

export function createCampaign(
  overrides: Partial<ReactivationCampaign> = {}
): ReactivationCampaign {
  return {
    id: 'campaign-1',
    tenantId: 'tenant-1',
    name: 'Recall Abril',
    campaignType: 'recall',
    status: 'running',
    audienceDefinition: {},
    messageTemplate: {
      body: 'Hola, te ayudamos a reservar tu revision',
    },
    channelPolicy: {},
    scheduledAt: null,
    startedAt: ISO_NOW,
    completedAt: null,
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
    ...overrides,
  };
}

export function createRecipient(
  overrides: Partial<ReactivationRecipient> = {}
): ReactivationRecipient {
  return {
    id: 'recipient-1',
    tenantId: 'tenant-1',
    campaignId: 'campaign-1',
    patientId: 'patient-1',
    status: 'pending',
    lastContactAt: null,
    lastResponseAt: null,
    result: null,
    generatedAppointmentId: null,
    metadata: {},
    createdAt: ISO_NOW,
    ...overrides,
  };
}

export function createCampaignDetail(
  overrides: Partial<ReactivationCampaignDetail> = {}
): ReactivationCampaignDetail {
  return {
    ...createCampaign(),
    recipients: [createRecipient()],
    ...overrides,
  };
}

export function createDashboard(
  overrides: Partial<ClinicDashboard> = {}
): ClinicDashboard {
  return {
    tenantId: 'tenant-1',
    generatedAt: ISO_NOW,
    kpis: {
      openThreads: 1,
      pendingConfirmations: 1,
      pendingForms: 1,
      activeGaps: 1,
      activeCampaigns: 1,
      todaysAppointments: 1,
      patientsNew: 1,
      patientsExisting: 0,
    },
    prioritizedInbox: [createConversationThreadListItem()],
    agenda: [createAppointmentSummary()],
    pendingForms: [createPendingForm()],
    pendingConfirmations: [createConfirmationRequest()],
    activeGaps: [createGapDetail()],
    activeCampaigns: [createCampaign()],
    patientMix: {
      newPatients: 1,
      existingPatients: 0,
    },
    ...overrides,
  };
}
