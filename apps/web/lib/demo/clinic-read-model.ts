import type {
  AppointmentDetail,
  AppointmentFilters,
  AppointmentsResponse,
  AppointmentSummary,
  CallFilters,
  CallSessionDetail,
  CallsResponse,
  CampaignFilters,
  ClinicChannel,
  ClinicDashboard,
  ClinicLocation,
  ClinicProfile,
  ClinicService,
  ConfirmationFilters,
  ConfirmationRequest,
  ConversationMessage,
  ConversationThreadDetail,
  ConversationThreadListItem,
  ConversationsResponse,
  GapFilters,
  GapOpportunityDetail,
  IntakeFormSubmission,
  IntakeFormTemplate,
  PatientFilters,
  PatientIdentity,
  PatientListItem,
  PatientResponse,
  PatientsResponse,
  Practitioner,
  ReactivationCampaign,
  ReactivationCampaignDetail,
  ReactivationCampaignsResponse,
  ReactivationRecipient,
  ReminderJob,
  TenantModule,
  WaitlistRequest,
} from '@agentmou/contracts';

const ISO_NOW = '2025-01-15T09:00:00.000Z';
const DEFAULT_TENANT_ID = 'demo-workspace';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const clinicProfile: ClinicProfile = {
  id: 'clinic-profile-1',
  tenantId: DEFAULT_TENANT_ID,
  vertical: 'clinic_dental',
  specialty: 'Odontologia general',
  displayName: 'Clinica Dental Sonrisa',
  timezone: 'Europe/Madrid',
  businessHours: {
    monday: [{ start: '09:00', end: '18:00' }],
    tuesday: [{ start: '09:00', end: '18:00' }],
    wednesday: [{ start: '09:00', end: '18:00' }],
    thursday: [{ start: '09:00', end: '18:00' }],
    friday: [{ start: '09:00', end: '15:00' }],
  },
  defaultInboundChannel: 'whatsapp',
  requiresNewPatientForm: true,
  confirmationPolicy: {
    enabled: true,
    leadHours: 24,
    escalationDelayHours: 4,
    autoCancelOnDecline: false,
  },
  gapRecoveryPolicy: {
    enabled: true,
    lookaheadHours: 72,
    maxOffersPerGap: 6,
    prioritizeWaitlist: true,
  },
  reactivationPolicy: {
    enabled: true,
    inactivityThresholdDays: 180,
    cooldownDays: 30,
    defaultCampaignType: 'recall',
  },
  createdAt: ISO_NOW,
  updatedAt: ISO_NOW,
};

const clinicModules: TenantModule[] = [
  {
    id: 'module-core',
    tenantId: DEFAULT_TENANT_ID,
    moduleKey: 'core_reception',
    status: 'enabled',
    visibleToClient: true,
    planLevel: 'enterprise',
    config: {},
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
  {
    id: 'module-voice',
    tenantId: DEFAULT_TENANT_ID,
    moduleKey: 'voice',
    status: 'enabled',
    visibleToClient: true,
    planLevel: 'enterprise',
    config: {},
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
  {
    id: 'module-growth',
    tenantId: DEFAULT_TENANT_ID,
    moduleKey: 'growth',
    status: 'enabled',
    visibleToClient: true,
    planLevel: 'enterprise',
    config: {},
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
  {
    id: 'module-advanced',
    tenantId: DEFAULT_TENANT_ID,
    moduleKey: 'advanced_mode',
    status: 'hidden',
    visibleToClient: false,
    planLevel: 'enterprise',
    config: {},
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
  {
    id: 'module-internal',
    tenantId: DEFAULT_TENANT_ID,
    moduleKey: 'internal_platform',
    status: 'enabled',
    visibleToClient: false,
    planLevel: 'enterprise',
    config: {},
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
];

const clinicChannels: ClinicChannel[] = [
  {
    id: 'channel-wa',
    tenantId: DEFAULT_TENANT_ID,
    channelType: 'whatsapp',
    directionPolicy: {
      inboundEnabled: true,
      outboundEnabled: true,
      fallbackToHuman: true,
    },
    provider: 'twilio_whatsapp',
    connectorAccountId: 'connector-wa',
    status: 'active',
    phoneNumber: '+34910000001',
    config: {},
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
  {
    id: 'channel-voice',
    tenantId: DEFAULT_TENANT_ID,
    channelType: 'voice',
    directionPolicy: {
      inboundEnabled: true,
      outboundEnabled: true,
      fallbackToHuman: true,
      recordCalls: true,
      afterHoursVoicemail: true,
    },
    provider: 'twilio_voice',
    connectorAccountId: 'connector-voice',
    status: 'active',
    phoneNumber: '+34910000002',
    config: {},
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
];

const patients: PatientListItem[] = [
  {
    id: 'patient-1',
    tenantId: DEFAULT_TENANT_ID,
    externalPatientId: null,
    status: 'new_lead',
    isExisting: false,
    firstName: 'Ana',
    lastName: 'Garcia',
    fullName: 'Ana Garcia',
    phone: '+34123456789',
    email: 'ana@example.com',
    dateOfBirth: null,
    notes: 'Primera visita por sensibilidad dental',
    consentFlags: { whatsapp: true, sms: false, voice: true, email: true },
    source: 'whatsapp',
    lastInteractionAt: '2025-01-15T08:50:00.000Z',
    nextSuggestedActionAt: '2025-01-15T09:15:00.000Z',
    createdAt: '2025-01-14T15:00:00.000Z',
    updatedAt: ISO_NOW,
    upcomingAppointmentCount: 1,
    hasPendingForm: true,
    isReactivationCandidate: false,
  },
  {
    id: 'patient-2',
    tenantId: DEFAULT_TENANT_ID,
    externalPatientId: 'pms-002',
    status: 'existing',
    isExisting: true,
    firstName: 'Luis',
    lastName: 'Martinez',
    fullName: 'Luis Martinez',
    phone: '+34111222333',
    email: 'luis@example.com',
    dateOfBirth: '1988-02-10',
    notes: 'Seguimiento de ortodoncia',
    consentFlags: { whatsapp: true, sms: true, voice: true, email: true },
    source: 'manual',
    lastInteractionAt: '2025-01-14T17:20:00.000Z',
    nextSuggestedActionAt: null,
    createdAt: '2024-11-10T10:00:00.000Z',
    updatedAt: ISO_NOW,
    upcomingAppointmentCount: 1,
    hasPendingForm: false,
    isReactivationCandidate: false,
  },
  {
    id: 'patient-3',
    tenantId: DEFAULT_TENANT_ID,
    externalPatientId: 'pms-003',
    status: 'inactive',
    isExisting: true,
    firstName: 'Carmen',
    lastName: 'Lopez',
    fullName: 'Carmen Lopez',
    phone: '+34666777888',
    email: 'carmen@example.com',
    dateOfBirth: '1979-07-19',
    notes: 'Sin revision en 8 meses',
    consentFlags: { whatsapp: true, sms: false, voice: false, email: true },
    source: 'reactivation_campaign',
    lastInteractionAt: '2024-06-01T10:00:00.000Z',
    nextSuggestedActionAt: '2025-01-16T10:00:00.000Z',
    createdAt: '2024-04-02T10:00:00.000Z',
    updatedAt: ISO_NOW,
    upcomingAppointmentCount: 0,
    hasPendingForm: false,
    isReactivationCandidate: true,
  },
];

const patientIdentities: Record<string, PatientIdentity[]> = {
  'patient-1': [
    {
      id: 'identity-1',
      tenantId: DEFAULT_TENANT_ID,
      patientId: 'patient-1',
      identityType: 'phone',
      identityValue: '+34123456789',
      isPrimary: true,
      confidenceScore: 0.98,
      createdAt: ISO_NOW,
    },
  ],
  'patient-2': [
    {
      id: 'identity-2',
      tenantId: DEFAULT_TENANT_ID,
      patientId: 'patient-2',
      identityType: 'phone',
      identityValue: '+34111222333',
      isPrimary: true,
      confidenceScore: 0.94,
      createdAt: ISO_NOW,
    },
  ],
};

const services: ClinicService[] = [
  {
    id: 'service-1',
    tenantId: DEFAULT_TENANT_ID,
    externalServiceId: null,
    slug: 'revision-general',
    name: 'Revision general',
    durationMinutes: 30,
    active: true,
    metadata: {},
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
];

const practitioners: Practitioner[] = [
  {
    id: 'practitioner-1',
    tenantId: DEFAULT_TENANT_ID,
    externalPractitionerId: null,
    name: 'Dra. Elena Ruiz',
    specialty: 'Odontologia general',
    active: true,
    metadata: {},
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
];

const locations: ClinicLocation[] = [
  {
    id: 'location-1',
    tenantId: DEFAULT_TENANT_ID,
    externalLocationId: null,
    name: 'Sede Centro',
    address: 'Calle Alcala 100, Madrid',
    phone: '+34910000001',
    active: true,
    metadata: {},
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
];

const appointmentDetails: AppointmentDetail[] = [
  {
    id: 'appointment-1',
    tenantId: DEFAULT_TENANT_ID,
    patientId: 'patient-1',
    externalAppointmentId: null,
    serviceId: 'service-1',
    practitionerId: 'practitioner-1',
    locationId: 'location-1',
    threadId: 'thread-1',
    status: 'scheduled',
    source: 'whatsapp',
    startsAt: '2025-01-15T10:00:00.000Z',
    endsAt: '2025-01-15T10:30:00.000Z',
    bookedAt: ISO_NOW,
    confirmationStatus: 'pending',
    reminderStatus: 'pending',
    cancellationReason: null,
    metadata: {},
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
    patient: patients[0],
    service: services[0],
    practitioner: practitioners[0],
    location: locations[0],
    events: [
      {
        id: 'event-1',
        tenantId: DEFAULT_TENANT_ID,
        appointmentId: 'appointment-1',
        eventType: 'created',
        actorType: 'ai',
        payload: { source: 'whatsapp' },
        createdAt: ISO_NOW,
      },
    ],
  },
  {
    id: 'appointment-2',
    tenantId: DEFAULT_TENANT_ID,
    patientId: 'patient-2',
    externalAppointmentId: 'pms-a2',
    serviceId: 'service-1',
    practitionerId: 'practitioner-1',
    locationId: 'location-1',
    threadId: null,
    status: 'confirmed',
    source: 'manual',
    startsAt: '2025-01-15T11:30:00.000Z',
    endsAt: '2025-01-15T12:00:00.000Z',
    bookedAt: '2025-01-10T09:00:00.000Z',
    confirmationStatus: 'confirmed',
    reminderStatus: 'sent',
    cancellationReason: null,
    metadata: {},
    createdAt: '2025-01-10T09:00:00.000Z',
    updatedAt: ISO_NOW,
    patient: patients[1],
    service: services[0],
    practitioner: practitioners[0],
    location: locations[0],
    events: [],
  },
  {
    id: 'appointment-3',
    tenantId: DEFAULT_TENANT_ID,
    patientId: 'patient-3',
    externalAppointmentId: null,
    serviceId: 'service-1',
    practitionerId: 'practitioner-1',
    locationId: 'location-1',
    threadId: null,
    status: 'cancelled',
    source: 'manual',
    startsAt: '2025-01-14T16:00:00.000Z',
    endsAt: '2025-01-14T16:30:00.000Z',
    bookedAt: '2025-01-02T09:00:00.000Z',
    confirmationStatus: 'declined',
    reminderStatus: 'sent',
    cancellationReason: 'Paciente fuera de la ciudad',
    metadata: {},
    createdAt: '2025-01-02T09:00:00.000Z',
    updatedAt: ISO_NOW,
    patient: patients[2],
    service: services[0],
    practitioner: practitioners[0],
    location: locations[0],
    events: [],
  },
];

const waitlistRequests: WaitlistRequest[] = [
  {
    id: 'waitlist-1',
    tenantId: DEFAULT_TENANT_ID,
    patientId: 'patient-2',
    serviceId: 'service-1',
    practitionerId: 'practitioner-1',
    locationId: 'location-1',
    preferredWindows: [{ start: '09:00', end: '13:00', label: 'Mananas laborables' }],
    status: 'active',
    priorityScore: 86,
    notes: 'Puede venir con poca antelacion',
    createdAt: '2025-01-12T12:00:00.000Z',
    updatedAt: ISO_NOW,
  },
];

const messages: ConversationMessage[] = [
  {
    id: 'message-1',
    tenantId: DEFAULT_TENANT_ID,
    threadId: 'thread-1',
    patientId: 'patient-1',
    direction: 'inbound',
    channelType: 'whatsapp',
    messageType: 'text',
    body: 'Hola, me gustaria una cita para esta semana',
    payload: {},
    deliveryStatus: 'delivered',
    providerMessageId: null,
    sentAt: null,
    receivedAt: '2025-01-15T08:50:00.000Z',
    createdAt: '2025-01-15T08:50:00.000Z',
  },
  {
    id: 'message-2',
    tenantId: DEFAULT_TENANT_ID,
    threadId: 'thread-1',
    patientId: 'patient-1',
    direction: 'outbound',
    channelType: 'whatsapp',
    messageType: 'text',
    body: 'Claro, te propongo hoy a las 10:00. Te enviamos el formulario ahora mismo.',
    payload: {},
    deliveryStatus: 'sent',
    providerMessageId: null,
    sentAt: ISO_NOW,
    receivedAt: null,
    createdAt: '2025-01-15T09:00:00.000Z',
  },
];

const conversationDetails: ConversationThreadDetail[] = [
  {
    id: 'thread-1',
    tenantId: DEFAULT_TENANT_ID,
    patientId: 'patient-1',
    channelType: 'whatsapp',
    status: 'pending_form',
    intent: 'book_appointment',
    priority: 'high',
    source: 'whatsapp',
    assignedUserId: null,
    lastMessageAt: ISO_NOW,
    lastInboundAt: '2025-01-15T08:50:00.000Z',
    lastOutboundAt: ISO_NOW,
    requiresHumanReview: false,
    resolution: null,
    createdAt: '2025-01-15T08:50:00.000Z',
    updatedAt: ISO_NOW,
    patient: patients[0],
    messages,
  },
  {
    id: 'thread-2',
    tenantId: DEFAULT_TENANT_ID,
    patientId: 'patient-2',
    channelType: 'voice',
    status: 'escalated',
    intent: 'reschedule_appointment',
    priority: 'urgent',
    source: 'voice',
    assignedUserId: 'user-1',
    lastMessageAt: '2025-01-15T08:30:00.000Z',
    lastInboundAt: '2025-01-15T08:30:00.000Z',
    lastOutboundAt: null,
    requiresHumanReview: true,
    resolution: null,
    createdAt: '2025-01-15T08:25:00.000Z',
    updatedAt: '2025-01-15T08:30:00.000Z',
    patient: patients[1],
    messages: [],
  },
];

const calls: CallSessionDetail[] = [
  {
    id: 'call-1',
    tenantId: DEFAULT_TENANT_ID,
    patientId: 'patient-2',
    threadId: 'thread-2',
    direction: 'inbound',
    status: 'callback_required',
    providerCallId: 'call-provider-1',
    fromNumber: '+34111222333',
    toNumber: '+34910000002',
    startedAt: '2025-01-15T08:25:00.000Z',
    endedAt: '2025-01-15T08:30:00.000Z',
    durationSeconds: 320,
    summary: 'Paciente solicita adelantar la cita de ortodoncia',
    transcript: null,
    resolution: null,
    requiresHumanReview: true,
    createdAt: '2025-01-15T08:25:00.000Z',
    updatedAt: '2025-01-15T08:30:00.000Z',
    patient: patients[1],
    thread: clone({
      id: 'thread-2',
      tenantId: DEFAULT_TENANT_ID,
      patientId: 'patient-2',
      channelType: 'voice',
      status: 'escalated',
      intent: 'reschedule_appointment',
      priority: 'urgent',
      source: 'voice',
      assignedUserId: 'user-1',
      lastMessageAt: '2025-01-15T08:30:00.000Z',
      lastInboundAt: '2025-01-15T08:30:00.000Z',
      lastOutboundAt: null,
      requiresHumanReview: true,
      resolution: null,
      createdAt: '2025-01-15T08:25:00.000Z',
      updatedAt: '2025-01-15T08:30:00.000Z',
    }),
  },
];

const formTemplates: IntakeFormTemplate[] = [
  {
    id: 'template-1',
    tenantId: DEFAULT_TENANT_ID,
    name: 'Formulario nuevo paciente',
    slug: 'nuevo-paciente',
    version: '1',
    schema: {
      sections: [{ id: 'medical-history', title: 'Antecedentes' }],
    },
    isActive: true,
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
];

const formSubmissions: IntakeFormSubmission[] = [
  {
    id: 'submission-1',
    tenantId: DEFAULT_TENANT_ID,
    templateId: 'template-1',
    patientId: 'patient-1',
    threadId: 'thread-1',
    status: 'sent',
    answers: {},
    sentAt: ISO_NOW,
    openedAt: null,
    completedAt: null,
    expiresAt: '2025-01-16T09:00:00.000Z',
    requiredForBooking: true,
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
];

const reminders: ReminderJob[] = [
  {
    id: 'reminder-1',
    tenantId: DEFAULT_TENANT_ID,
    appointmentId: 'appointment-1',
    channelType: 'whatsapp',
    status: 'scheduled',
    scheduledFor: '2025-01-15T09:30:00.000Z',
    sentAt: null,
    templateKey: 'confirmation-reminder',
    attemptCount: 0,
    lastError: null,
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
];

const confirmations: ConfirmationRequest[] = [
  {
    id: 'confirmation-1',
    tenantId: DEFAULT_TENANT_ID,
    appointmentId: 'appointment-1',
    channelType: 'whatsapp',
    status: 'pending',
    requestedAt: ISO_NOW,
    dueAt: '2025-01-15T13:00:00.000Z',
    respondedAt: null,
    responsePayload: {},
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
  },
  {
    id: 'confirmation-2',
    tenantId: DEFAULT_TENANT_ID,
    appointmentId: 'appointment-2',
    channelType: 'whatsapp',
    status: 'confirmed',
    requestedAt: '2025-01-14T10:00:00.000Z',
    dueAt: '2025-01-14T18:00:00.000Z',
    respondedAt: '2025-01-14T10:20:00.000Z',
    responsePayload: { response: 'confirm' },
    createdAt: '2025-01-14T10:00:00.000Z',
    updatedAt: '2025-01-14T10:20:00.000Z',
  },
];

const gaps: GapOpportunityDetail[] = [
  {
    id: 'gap-1',
    tenantId: DEFAULT_TENANT_ID,
    originAppointmentId: 'appointment-3',
    serviceId: 'service-1',
    practitionerId: 'practitioner-1',
    locationId: 'location-1',
    startsAt: '2025-01-16T11:00:00.000Z',
    endsAt: '2025-01-16T11:30:00.000Z',
    status: 'open',
    origin: 'cancellation',
    createdAt: ISO_NOW,
    updatedAt: ISO_NOW,
    outreachAttempts: [
      {
        id: 'gap-attempt-1',
        tenantId: DEFAULT_TENANT_ID,
        gapOpportunityId: 'gap-1',
        patientId: 'patient-2',
        channelType: 'whatsapp',
        status: 'pending',
        sentAt: null,
        respondedAt: null,
        result: null,
        metadata: {},
        createdAt: ISO_NOW,
      },
    ],
  },
];

const campaigns: ReactivationCampaign[] = [
  {
    id: 'campaign-1',
    tenantId: DEFAULT_TENANT_ID,
    name: 'Revision semestral enero',
    campaignType: 'recall',
    status: 'running',
    audienceDefinition: { inactivityDays: 180 },
    messageTemplate: {
      body: 'Hola {{firstName}}, te ayudamos a reservar tu revision.',
    },
    channelPolicy: { whatsappFirst: true },
    scheduledAt: null,
    startedAt: '2025-01-15T07:00:00.000Z',
    completedAt: null,
    createdAt: '2025-01-14T18:00:00.000Z',
    updatedAt: ISO_NOW,
  },
];

const reactivationRecipients: ReactivationRecipient[] = [
  {
    id: 'recipient-1',
    tenantId: DEFAULT_TENANT_ID,
    campaignId: 'campaign-1',
    patientId: 'patient-3',
    status: 'responded',
    lastContactAt: '2025-01-15T07:05:00.000Z',
    lastResponseAt: '2025-01-15T07:40:00.000Z',
    result: 'responded',
    generatedAppointmentId: null,
    metadata: { channelType: 'whatsapp' },
    createdAt: '2025-01-15T07:00:00.000Z',
  },
];

const dashboard: ClinicDashboard = {
  tenantId: DEFAULT_TENANT_ID,
  generatedAt: ISO_NOW,
  kpis: {
    openThreads: 2,
    pendingConfirmations: 1,
    pendingForms: 1,
    activeGaps: 1,
    activeCampaigns: 1,
    todaysAppointments: 2,
    patientsNew: 1,
    patientsExisting: 2,
  },
  prioritizedInbox: conversationDetails.map((thread): ConversationThreadListItem => ({
    ...thread,
    patient: thread.patient ? patients.find((patient) => patient.id === thread.patientId) : null,
    lastMessagePreview:
      thread.id === 'thread-1'
        ? 'Te enviamos el formulario ahora mismo'
        : 'Necesita llamada de vuelta hoy',
    nextSuggestedAction:
      thread.id === 'thread-1' ? 'Revisar formulario enviado' : 'Llamar antes de las 12:00',
    unreadCount: thread.id === 'thread-1' ? 1 : 0,
  })),
  agenda: appointmentDetails.slice(0, 2),
  pendingForms: formSubmissions,
  pendingConfirmations: confirmations.filter((item) => item.status === 'pending'),
  activeGaps: gaps,
  activeCampaigns: campaigns,
  patientMix: {
    newPatients: 1,
    existingPatients: 2,
  },
};

const campaignDetails: ReactivationCampaignDetail[] = campaigns.map((campaign) => ({
  ...campaign,
  recipients: reactivationRecipients.filter((recipient) => recipient.campaignId === campaign.id),
}));

function filterPatients(filters: PatientFilters = {}) {
  return patients.filter((patient) => {
    if (filters.search) {
      const query = filters.search.toLowerCase();
      const haystack = `${patient.fullName} ${patient.phone ?? ''} ${patient.email ?? ''}`.toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }

    if (filters.status && patient.status !== filters.status) {
      return false;
    }

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
}

export function getClinicDashboard(_tenantId: string): ClinicDashboard {
  return clone(dashboard);
}

export function getClinicProfile(_tenantId: string): ClinicProfile {
  return clone(clinicProfile);
}

export function listClinicModules(_tenantId: string): TenantModule[] {
  return clone(clinicModules);
}

export function listClinicChannels(_tenantId: string): ClinicChannel[] {
  return clone(clinicChannels);
}

export function listClinicPatients(_tenantId: string, filters: PatientFilters = {}): PatientsResponse {
  const items = filterPatients(filters);
  return clone({
    patients: items,
    total: items.length,
  });
}

export function getClinicPatient(_tenantId: string, patientId: string): PatientResponse | null {
  const patient = patients.find((item) => item.id === patientId);
  if (!patient) {
    return null;
  }

  return clone({
    patient,
    identities: patientIdentities[patientId] ?? [],
    upcomingAppointments: appointmentDetails
      .filter((appointment) => appointment.patientId === patientId && appointment.status !== 'cancelled')
      .map(({ events: _events, ...appointment }): AppointmentSummary => appointment),
    waitlistRequests: waitlistRequests.filter((request) => request.patientId === patientId),
  });
}

export function listClinicConversations(_tenantId: string): ConversationsResponse {
  return clone({
    threads: dashboard.prioritizedInbox,
    total: dashboard.prioritizedInbox.length,
  });
}

export function getClinicConversation(_tenantId: string, threadId: string): ConversationThreadDetail | null {
  return clone(conversationDetails.find((thread) => thread.id === threadId) ?? null);
}

export function listClinicConversationMessages(_tenantId: string, threadId: string): ConversationMessage[] {
  return clone(messages.filter((message) => message.threadId === threadId));
}

export function listClinicCalls(_tenantId: string, filters: CallFilters = {}): CallsResponse {
  const items = calls.filter((call) => {
    if (filters.status && call.status !== filters.status) {
      return false;
    }

    if (filters.channelType && call.thread?.channelType !== filters.channelType) {
      return false;
    }

    if (filters.patientId && call.patientId !== filters.patientId) {
      return false;
    }

    if (filters.from && call.fromNumber !== filters.from) {
      return false;
    }

    if (filters.to && call.toNumber !== filters.to) {
      return false;
    }

    return true;
  });

  return clone({ calls: items, total: items.length });
}

export function getClinicCall(_tenantId: string, callId: string): CallSessionDetail | null {
  return clone(calls.find((call) => call.id === callId) ?? null);
}

export function listClinicAppointments(
  _tenantId: string,
  filters: AppointmentFilters = {}
): AppointmentsResponse {
  const items = appointmentDetails.filter((appointment) => {
    if (filters.status && appointment.status !== filters.status) {
      return false;
    }
    if (filters.confirmationStatus && appointment.confirmationStatus !== filters.confirmationStatus) {
      return false;
    }
    if (filters.reminderStatus && appointment.reminderStatus !== filters.reminderStatus) {
      return false;
    }
    return true;
  });

  return clone({
    appointments: items.map(({ events: _events, ...appointment }) => appointment),
    total: items.length,
  });
}

export function getClinicAppointment(_tenantId: string, appointmentId: string): AppointmentDetail | null {
  return clone(appointmentDetails.find((appointment) => appointment.id === appointmentId) ?? null);
}

export function listClinicFormTemplates(_tenantId: string): IntakeFormTemplate[] {
  return clone(formTemplates);
}

export function listClinicFormSubmissions(_tenantId: string): IntakeFormSubmission[] {
  return clone(formSubmissions);
}

export function getClinicFormSubmission(
  _tenantId: string,
  submissionId: string
): IntakeFormSubmission | null {
  return clone(formSubmissions.find((submission) => submission.id === submissionId) ?? null);
}

export function listClinicReminders(_tenantId: string): ReminderJob[] {
  return clone(reminders);
}

export function listClinicConfirmations(
  _tenantId: string,
  filters: ConfirmationFilters = {}
): ConfirmationRequest[] {
  return clone(
    confirmations.filter((confirmation) => {
      if (filters.status && confirmation.status !== filters.status) {
        return false;
      }

      if (filters.channelType && confirmation.channelType !== filters.channelType) {
        return false;
      }

      return true;
    })
  );
}

export function listClinicGaps(_tenantId: string, filters: GapFilters = {}): GapOpportunityDetail[] {
  return clone(
    gaps.filter((gap) => {
      if (filters.status && gap.status !== filters.status) {
        return false;
      }

      if (filters.serviceId && gap.serviceId !== filters.serviceId) {
        return false;
      }

      if (filters.practitionerId && gap.practitionerId !== filters.practitionerId) {
        return false;
      }

      if (filters.locationId && gap.locationId !== filters.locationId) {
        return false;
      }

      return true;
    })
  );
}

export function listClinicReactivationCampaigns(
  _tenantId: string,
  filters: CampaignFilters = {}
): ReactivationCampaignsResponse {
  const items = campaigns.filter((campaign) => {
    if (filters.status && campaign.status !== filters.status) {
      return false;
    }

    if (filters.campaignType && campaign.campaignType !== filters.campaignType) {
      return false;
    }

    return true;
  });

  return clone({ campaigns: items, total: items.length });
}

export function getClinicReactivationCampaign(
  _tenantId: string,
  campaignId: string
): ReactivationCampaignDetail | null {
  return clone(campaignDetails.find((campaign) => campaign.id === campaignId) ?? null);
}

export function listClinicReactivationRecipients(_tenantId: string): ReactivationRecipient[] {
  return clone(reactivationRecipients);
}
