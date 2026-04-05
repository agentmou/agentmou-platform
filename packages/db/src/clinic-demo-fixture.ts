export interface ClinicDemoSeedSummary {
  counts: {
    patients: number;
    whatsappThreads: number;
    voiceThreads: number;
    calls: number;
    formSubmissions: number;
    appointments: number;
    pendingConfirmations: number;
    activeGaps: number;
    activeCampaigns: number;
  };
  journeys: {
    newPatient: {
      patientKey: string;
      threadKey: string;
      submissionKey: string;
      appointmentKey: string;
    };
    reschedule: {
      patientKey: string;
      whatsappThreadKey: string;
      voiceThreadKey: string;
      appointmentKey: string;
    };
    confirmation: {
      pendingAppointmentKeys: string[];
      confirmedAppointmentKeys: string[];
    };
    gapRecovery: {
      gapKey: string;
      cancelledAppointmentKey: string;
      candidatePatientKey: string;
      outreachKey: string;
    };
    reactivation: {
      campaignKey: string;
      bookedRecipientKey: string;
      contactedRecipientKey: string;
      failedRecipientKey: string;
      generatedAppointmentKey: string;
    };
  };
}

export interface ClinicDemoSeedBlueprint {
  tenantSettings: {
    timezone: string;
    defaultHITL: boolean;
    logRetentionDays: number;
    memoryRetentionDays: number;
    verticalClinicUi: boolean;
    clinicDentalMode: boolean;
    internalPlatformVisible: boolean;
  };
  connectorAccounts: Array<{
    key: 'whatsapp' | 'voice';
    provider: 'twilio_whatsapp' | 'twilio_voice';
    externalAccountId: string;
    scopes: string[];
    connectedAt: Date;
  }>;
  clinicProfile: {
    vertical: 'clinic_dental';
    specialty: string;
    displayName: string;
    timezone: string;
    businessHours: Record<string, Array<{ start: string; end: string }>>;
    defaultInboundChannel: 'whatsapp';
    requiresNewPatientForm: boolean;
    confirmationPolicy: Record<string, unknown>;
    gapRecoveryPolicy: Record<string, unknown>;
    reactivationPolicy: Record<string, unknown>;
  };
  modules: Array<{
    moduleKey: 'core_reception' | 'voice' | 'growth' | 'advanced_mode' | 'internal_platform';
    status: 'enabled' | 'hidden';
    visibleToClient: boolean;
    planLevel: 'starter' | 'pro' | 'scale' | 'enterprise';
    config: Record<string, unknown>;
  }>;
  channels: Array<{
    key: 'whatsapp' | 'voice';
    channelType: 'whatsapp' | 'voice';
    provider: 'twilio_whatsapp' | 'twilio_voice';
    phoneNumber: string;
    status: 'active';
    directionPolicy: Record<string, unknown>;
    config: Record<string, unknown>;
  }>;
  services: Array<{
    key: string;
    externalServiceId: string;
    name: string;
    slug: string;
    durationMinutes: number;
    metadata: Record<string, unknown>;
  }>;
  practitioners: Array<{
    key: string;
    externalPractitionerId: string;
    name: string;
    specialty: string;
    metadata: Record<string, unknown>;
  }>;
  locations: Array<{
    key: string;
    externalLocationId: string;
    name: string;
    address: string;
    phone: string;
    metadata: Record<string, unknown>;
  }>;
  patients: Array<{
    key: string;
    externalPatientId: string;
    status: string;
    isExisting: boolean;
    firstName: string;
    lastName: string;
    fullName: string;
    phone: string;
    email: string;
    dateOfBirth: string | null;
    notes: string | null;
    consentFlags: Record<string, unknown>;
    source: string;
    lastInteractionAt: Date | null;
    nextSuggestedActionAt: Date | null;
  }>;
  patientIdentities: Array<{
    patientKey: string;
    identityType: 'phone' | 'email';
    identityValue: string;
    isPrimary: boolean;
    confidenceScore: number;
  }>;
  threads: Array<{
    key: string;
    patientKey: string;
    channelType: 'whatsapp' | 'voice';
    status: string;
    intent: string;
    priority: string;
    source: string;
    assignedUserId: string | null;
    lastMessageAt: Date | null;
    lastInboundAt: Date | null;
    lastOutboundAt: Date | null;
    requiresHumanReview: boolean;
    resolution: string | null;
  }>;
  messages: Array<{
    key: string;
    threadKey: string;
    patientKey: string;
    direction: 'inbound' | 'outbound';
    channelType: 'whatsapp' | 'voice';
    messageType: string;
    body: string;
    payload: Record<string, unknown>;
    deliveryStatus: string;
    providerMessageId: string;
    sentAt: Date | null;
    receivedAt: Date | null;
  }>;
  calls: Array<{
    key: string;
    patientKey: string;
    threadKey: string;
    direction: 'inbound' | 'outbound';
    status: string;
    providerCallId: string;
    fromNumber: string;
    toNumber: string;
    startedAt: Date;
    endedAt: Date | null;
    durationSeconds: number;
    summary: string | null;
    transcript: string | null;
    resolution: string | null;
    requiresHumanReview: boolean;
  }>;
  formTemplates: Array<{
    key: string;
    name: string;
    slug: string;
    version: string;
    schema: Record<string, unknown>;
  }>;
  formSubmissions: Array<{
    key: string;
    templateKey: string;
    patientKey: string;
    threadKey: string;
    status: string;
    answers: Record<string, unknown>;
    sentAt: Date | null;
    openedAt: Date | null;
    completedAt: Date | null;
    expiresAt: Date | null;
    requiredForBooking: boolean;
  }>;
  appointments: Array<{
    key: string;
    externalAppointmentId: string;
    patientKey: string;
    serviceKey: string;
    practitionerKey: string;
    locationKey: string;
    threadKey: string | null;
    status: string;
    source: string;
    startsAt: Date;
    endsAt: Date;
    bookedAt: Date;
    confirmationStatus: string;
    reminderStatus: string;
    cancellationReason: string | null;
    metadata: Record<string, unknown>;
  }>;
  appointmentEvents: Array<{
    appointmentKey: string;
    eventType: string;
    actorType: 'ai' | 'human' | 'patient' | 'system';
    payload: Record<string, unknown>;
  }>;
  reminders: Array<{
    appointmentKey: string;
    channelType: 'whatsapp' | 'voice';
    status: string;
    scheduledFor: Date;
    sentAt: Date | null;
    templateKey: string;
    attemptCount: number;
    lastError: string | null;
  }>;
  confirmations: Array<{
    appointmentKey: string;
    channelType: 'whatsapp' | 'voice';
    status: string;
    requestedAt: Date;
    dueAt: Date;
    respondedAt: Date | null;
    responsePayload: Record<string, unknown>;
  }>;
  waitlistRequests: Array<{
    key: string;
    patientKey: string;
    serviceKey: string;
    practitionerKey: string;
    locationKey: string;
    preferredWindows: Array<{ start: string; end: string; label: string }>;
    status: string;
    priorityScore: number;
    notes: string | null;
  }>;
  gaps: Array<{
    key: string;
    originAppointmentKey: string;
    serviceKey: string;
    practitionerKey: string;
    locationKey: string;
    startsAt: Date;
    endsAt: Date;
    status: string;
    origin: string;
  }>;
  gapOutreachAttempts: Array<{
    key: string;
    gapKey: string;
    patientKey: string;
    channelType: 'whatsapp' | 'voice';
    status: string;
    sentAt: Date | null;
    respondedAt: Date | null;
    result: string | null;
    metadata: Record<string, unknown>;
  }>;
  campaigns: Array<{
    key: string;
    name: string;
    campaignType: string;
    status: string;
    audienceDefinition: Record<string, unknown>;
    messageTemplate: Record<string, unknown>;
    channelPolicy: Record<string, unknown>;
    scheduledAt: Date | null;
    startedAt: Date | null;
    completedAt: Date | null;
  }>;
  recipients: Array<{
    key: string;
    campaignKey: string;
    patientKey: string;
    status: string;
    lastContactAt: Date | null;
    lastResponseAt: Date | null;
    result: string | null;
    generatedAppointmentKey: string | null;
    metadata: Record<string, unknown>;
  }>;
  summary: ClinicDemoSeedSummary;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addHours(date: Date, hours: number) {
  return addMinutes(date, hours * 60);
}

function addDays(date: Date, days: number) {
  return addHours(date, days * 24);
}

function setTime(date: Date, hours: number, minutes = 0) {
  const value = new Date(date);
  value.setHours(hours, minutes, 0, 0);
  return value;
}

export function buildClinicDemoSeedFixture(now = new Date()): ClinicDemoSeedBlueprint {
  const anchor = setTime(now, 9, 0);
  const yesterday = addDays(anchor, -1);
  const twoDaysAgo = addDays(anchor, -2);
  const lastWeek = addDays(anchor, -7);
  const nextWeek = addDays(anchor, 7);

  const patients = [
    {
      key: 'ana',
      externalPatientId: 'DENTAL-001',
      status: 'new_lead',
      isExisting: false,
      firstName: 'Ana',
      lastName: 'Garcia',
      fullName: 'Ana Garcia',
      phone: '+34600101010',
      email: 'ana@demo-clinic.test',
      dateOfBirth: '1992-03-14',
      notes: 'Nueva paciente por sensibilidad dental y primera revision.',
      consentFlags: { whatsapp: true, voice: true, email: true },
      source: 'whatsapp_inbound',
      lastInteractionAt: addMinutes(anchor, -15),
      nextSuggestedActionAt: addMinutes(anchor, 45),
    },
    {
      key: 'lucia',
      externalPatientId: 'DENTAL-002',
      status: 'existing',
      isExisting: true,
      firstName: 'Lucia',
      lastName: 'Perez',
      fullName: 'Lucia Perez',
      phone: '+34600101011',
      email: 'lucia@demo-clinic.test',
      dateOfBirth: '1989-05-16',
      notes: 'Paciente de ortodoncia; prefiere primera hora.',
      consentFlags: { whatsapp: true, voice: true, email: true, sms: true },
      source: 'import',
      lastInteractionAt: addMinutes(anchor, -50),
      nextSuggestedActionAt: addHours(anchor, 1),
    },
    {
      key: 'carmen',
      externalPatientId: 'DENTAL-003',
      status: 'reactivated',
      isExisting: true,
      firstName: 'Carmen',
      lastName: 'Lopez',
      fullName: 'Carmen Lopez',
      phone: '+34600101012',
      email: 'carmen@demo-clinic.test',
      dateOfBirth: '1979-07-19',
      notes: 'Volvio por campana de higiene semestral.',
      consentFlags: { whatsapp: true, voice: false, email: true, marketing: true },
      source: 'reactivation_campaign',
      lastInteractionAt: addHours(anchor, -12),
      nextSuggestedActionAt: addDays(anchor, 7),
    },
    {
      key: 'diego',
      externalPatientId: 'DENTAL-004',
      status: 'existing',
      isExisting: true,
      firstName: 'Diego',
      lastName: 'Martin',
      fullName: 'Diego Martin',
      phone: '+34600101013',
      email: 'diego@demo-clinic.test',
      dateOfBirth: '1985-01-22',
      notes: 'Paciente frecuente para higiene y urgencias leves.',
      consentFlags: { whatsapp: true, voice: true, email: true },
      source: 'manual',
      lastInteractionAt: addMinutes(anchor, 5),
      nextSuggestedActionAt: null,
    },
    {
      key: 'marta',
      externalPatientId: 'DENTAL-005',
      status: 'existing',
      isExisting: true,
      firstName: 'Marta',
      lastName: 'Sanchez',
      fullName: 'Marta Sanchez',
      phone: '+34600101014',
      email: 'marta@demo-clinic.test',
      dateOfBirth: '1990-11-03',
      notes: 'Pendiente de confirmar revision de esta tarde.',
      consentFlags: { whatsapp: true, voice: true, email: true },
      source: 'manual',
      lastInteractionAt: addMinutes(anchor, -25),
      nextSuggestedActionAt: addHours(anchor, 2),
    },
    {
      key: 'javier',
      externalPatientId: 'DENTAL-006',
      status: 'existing',
      isExisting: true,
      firstName: 'Javier',
      lastName: 'Torres',
      fullName: 'Javier Torres',
      phone: '+34600101015',
      email: 'javier@demo-clinic.test',
      dateOfBirth: '1981-08-29',
      notes: 'Cancelo su higiene de hoy por viaje de trabajo.',
      consentFlags: { whatsapp: true, voice: false, email: true },
      source: 'manual',
      lastInteractionAt: addMinutes(anchor, -40),
      nextSuggestedActionAt: addMinutes(anchor, 20),
    },
    {
      key: 'elena',
      externalPatientId: 'DENTAL-007',
      status: 'waiting',
      isExisting: true,
      firstName: 'Elena',
      lastName: 'Diaz',
      fullName: 'Elena Diaz',
      phone: '+34600101016',
      email: 'elena@demo-clinic.test',
      dateOfBirth: '1994-02-17',
      notes: 'Puede venir con poca antelacion si aparece un hueco.',
      consentFlags: { whatsapp: true, voice: true, email: true },
      source: 'waitlist',
      lastInteractionAt: addMinutes(anchor, -10),
      nextSuggestedActionAt: addHours(anchor, 1),
    },
    {
      key: 'sofia',
      externalPatientId: 'DENTAL-008',
      status: 'intake_pending',
      isExisting: false,
      firstName: 'Sofia',
      lastName: 'Romero',
      fullName: 'Sofia Romero',
      phone: '+34600101017',
      email: 'sofia@demo-clinic.test',
      dateOfBirth: null,
      notes: 'Formulario abierto con antecedentes incompletos.',
      consentFlags: { whatsapp: true, voice: true, email: true },
      source: 'whatsapp_inbound',
      lastInteractionAt: addMinutes(anchor, -30),
      nextSuggestedActionAt: addHours(anchor, 1),
    },
    {
      key: 'pablo',
      externalPatientId: 'DENTAL-009',
      status: 'intake_pending',
      isExisting: false,
      firstName: 'Pablo',
      lastName: 'Ortiz',
      fullName: 'Pablo Ortiz',
      phone: '+34600101018',
      email: 'pablo@demo-clinic.test',
      dateOfBirth: null,
      notes: 'Pidio informacion de implantes y tiene formulario pendiente.',
      consentFlags: { whatsapp: true, voice: true, email: true },
      source: 'whatsapp_inbound',
      lastInteractionAt: addMinutes(anchor, -32),
      nextSuggestedActionAt: addHours(anchor, 2),
    },
    {
      key: 'laura',
      externalPatientId: 'DENTAL-010',
      status: 'inactive',
      isExisting: true,
      firstName: 'Laura',
      lastName: 'Gomez',
      fullName: 'Laura Gomez',
      phone: '+34600101019',
      email: 'laura@demo-clinic.test',
      dateOfBirth: '1987-10-09',
      notes: 'Recibio reactivacion y aun no responde.',
      consentFlags: { whatsapp: true, voice: false, email: true, marketing: true },
      source: 'import',
      lastInteractionAt: addDays(anchor, -210),
      nextSuggestedActionAt: addDays(anchor, 1),
    },
    {
      key: 'raul',
      externalPatientId: 'DENTAL-011',
      status: 'inactive',
      isExisting: true,
      firstName: 'Raul',
      lastName: 'Ibanez',
      fullName: 'Raul Ibanez',
      phone: '+34600101020',
      email: 'raul@demo-clinic.test',
      dateOfBirth: '1975-12-01',
      notes: 'Campana fallida por numero no disponible.',
      consentFlags: { whatsapp: true, voice: false, email: false, marketing: true },
      source: 'import',
      lastInteractionAt: addDays(anchor, -300),
      nextSuggestedActionAt: addDays(anchor, 3),
    },
  ] as const;

  return {
    tenantSettings: {
      timezone: 'Europe/Madrid',
      defaultHITL: true,
      logRetentionDays: 60,
      memoryRetentionDays: 30,
      verticalClinicUi: true,
      clinicDentalMode: true,
      internalPlatformVisible: true,
    },
    connectorAccounts: [
      {
        key: 'whatsapp',
        provider: 'twilio_whatsapp',
        externalAccountId: 'seed-whatsapp-account',
        scopes: ['messages:read', 'messages:write'],
        connectedAt: addDays(anchor, -30),
      },
      {
        key: 'voice',
        provider: 'twilio_voice',
        externalAccountId: 'seed-voice-account',
        scopes: ['calls:read', 'calls:write'],
        connectedAt: addDays(anchor, -30),
      },
    ],
    clinicProfile: {
      vertical: 'clinic_dental',
      specialty: 'odontologia general y ortodoncia',
      displayName: 'Sonrisa Norte Dental',
      timezone: 'Europe/Madrid',
      businessHours: {
        monday: [{ start: '09:00', end: '18:30' }],
        tuesday: [{ start: '09:00', end: '18:30' }],
        wednesday: [{ start: '09:00', end: '18:30' }],
        thursday: [{ start: '09:00', end: '18:30' }],
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
        defaultCampaignType: 'hygiene_recall',
      },
    },
    modules: [
      {
        moduleKey: 'core_reception',
        status: 'enabled',
        visibleToClient: true,
        planLevel: 'starter',
        config: { primaryNav: true },
      },
      {
        moduleKey: 'voice',
        status: 'enabled',
        visibleToClient: true,
        planLevel: 'pro',
        config: { callbacks: true },
      },
      {
        moduleKey: 'growth',
        status: 'enabled',
        visibleToClient: true,
        planLevel: 'scale',
        config: { smartGapFill: true, reactivation: true },
      },
      {
        moduleKey: 'advanced_mode',
        status: 'hidden',
        visibleToClient: false,
        planLevel: 'enterprise',
        config: {},
      },
      {
        moduleKey: 'internal_platform',
        status: 'enabled',
        visibleToClient: false,
        planLevel: 'enterprise',
        config: { internalOnly: true },
      },
    ],
    channels: [
      {
        key: 'whatsapp',
        channelType: 'whatsapp',
        provider: 'twilio_whatsapp',
        phoneNumber: '+34910000001',
        status: 'active',
        directionPolicy: {
          inboundEnabled: true,
          outboundEnabled: true,
          fallbackToHuman: true,
        },
        config: { displayName: 'Recepcion WhatsApp' },
      },
      {
        key: 'voice',
        channelType: 'voice',
        provider: 'twilio_voice',
        phoneNumber: '+34910000002',
        status: 'active',
        directionPolicy: {
          inboundEnabled: true,
          outboundEnabled: true,
          fallbackToHuman: true,
          recordCalls: true,
        },
        config: { ivrProfile: 'front-desk' },
      },
    ],
    services: [
      {
        key: 'first-visit',
        externalServiceId: 'svc-first-visit',
        name: 'Primera visita',
        slug: 'primera-visita',
        durationMinutes: 45,
        metadata: { category: 'diagnostico' },
      },
      {
        key: 'hygiene',
        externalServiceId: 'svc-hygiene',
        name: 'Higiene dental',
        slug: 'higiene-dental',
        durationMinutes: 45,
        metadata: { category: 'hygiene' },
      },
      {
        key: 'ortho',
        externalServiceId: 'svc-ortho-control',
        name: 'Control de ortodoncia',
        slug: 'control-ortodoncia',
        durationMinutes: 30,
        metadata: { category: 'ortho' },
      },
    ],
    practitioners: [
      {
        key: 'ruiz',
        externalPractitionerId: 'practitioner-ruiz',
        name: 'Dra. Elena Ruiz',
        specialty: 'Odontologia general',
        metadata: { languages: ['es', 'en'] },
      },
      {
        key: 'solis',
        externalPractitionerId: 'practitioner-solis',
        name: 'Dr. Marta Solis',
        specialty: 'Ortodoncia',
        metadata: { days: ['monday', 'wednesday', 'friday'] },
      },
    ],
    locations: [
      {
        key: 'centro',
        externalLocationId: 'location-centro',
        name: 'Madrid Centro',
        address: 'Calle Alcala 120, Madrid',
        phone: '+34910000003',
        metadata: { floor: '2A' },
      },
      {
        key: 'norte',
        externalLocationId: 'location-norte',
        name: 'Chamartin',
        address: 'Avenida de Burgos 18, Madrid',
        phone: '+34910000004',
        metadata: { parking: true },
      },
    ],
    patients: patients.map((patient) => ({ ...patient })),
    patientIdentities: patients.flatMap((patient) => [
      {
        patientKey: patient.key,
        identityType: 'phone' as const,
        identityValue: patient.phone,
        isPrimary: true,
        confidenceScore: 1,
      },
      {
        patientKey: patient.key,
        identityType: 'email' as const,
        identityValue: patient.email,
        isPrimary: false,
        confidenceScore: 0.94,
      },
    ]),
    threads: [
      {
        key: 'thread-ana-whatsapp',
        patientKey: 'ana',
        channelType: 'whatsapp',
        status: 'in_progress',
        intent: 'new_patient',
        priority: 'high',
        source: 'seed_thread_ana_whatsapp',
        assignedUserId: null,
        lastMessageAt: addMinutes(anchor, -15),
        lastInboundAt: addMinutes(anchor, -18),
        lastOutboundAt: addMinutes(anchor, -15),
        requiresHumanReview: false,
        resolution: null,
      },
      {
        key: 'thread-lucia-whatsapp',
        patientKey: 'lucia',
        channelType: 'whatsapp',
        status: 'in_progress',
        intent: 'reschedule_appointment',
        priority: 'urgent',
        source: 'seed_thread_lucia_whatsapp',
        assignedUserId: null,
        lastMessageAt: addMinutes(anchor, -50),
        lastInboundAt: addMinutes(anchor, -50),
        lastOutboundAt: addMinutes(anchor, -58),
        requiresHumanReview: false,
        resolution: null,
      },
      {
        key: 'thread-lucia-voice',
        patientKey: 'lucia',
        channelType: 'voice',
        status: 'pending_human',
        intent: 'human_handoff',
        priority: 'urgent',
        source: 'seed_thread_lucia_voice',
        assignedUserId: null,
        lastMessageAt: addMinutes(anchor, -42),
        lastInboundAt: addMinutes(anchor, -42),
        lastOutboundAt: null,
        requiresHumanReview: true,
        resolution: null,
      },
      {
        key: 'thread-marta-whatsapp',
        patientKey: 'marta',
        channelType: 'whatsapp',
        status: 'pending_human',
        intent: 'existing_patient',
        priority: 'normal',
        source: 'seed_thread_marta_whatsapp',
        assignedUserId: null,
        lastMessageAt: addMinutes(anchor, -25),
        lastInboundAt: null,
        lastOutboundAt: addMinutes(anchor, -25),
        requiresHumanReview: true,
        resolution: null,
      },
      {
        key: 'thread-javier-whatsapp',
        patientKey: 'javier',
        channelType: 'whatsapp',
        status: 'pending_human',
        intent: 'cancel_appointment',
        priority: 'high',
        source: 'seed_thread_javier_whatsapp',
        assignedUserId: null,
        lastMessageAt: addMinutes(anchor, -42),
        lastInboundAt: addMinutes(anchor, -44),
        lastOutboundAt: addMinutes(anchor, -42),
        requiresHumanReview: true,
        resolution: null,
      },
      {
        key: 'thread-elena-whatsapp',
        patientKey: 'elena',
        channelType: 'whatsapp',
        status: 'in_progress',
        intent: 'request_gap_fill',
        priority: 'high',
        source: 'seed_thread_elena_whatsapp',
        assignedUserId: null,
        lastMessageAt: addMinutes(anchor, -8),
        lastInboundAt: null,
        lastOutboundAt: addMinutes(anchor, -8),
        requiresHumanReview: false,
        resolution: null,
      },
      {
        key: 'thread-sofia-whatsapp',
        patientKey: 'sofia',
        channelType: 'whatsapp',
        status: 'pending_form',
        intent: 'new_patient',
        priority: 'normal',
        source: 'seed_thread_sofia_whatsapp',
        assignedUserId: null,
        lastMessageAt: addMinutes(anchor, -30),
        lastInboundAt: addMinutes(anchor, -30),
        lastOutboundAt: addMinutes(anchor, -75),
        requiresHumanReview: false,
        resolution: null,
      },
      {
        key: 'thread-pablo-whatsapp',
        patientKey: 'pablo',
        channelType: 'whatsapp',
        status: 'pending_form',
        intent: 'new_patient',
        priority: 'normal',
        source: 'seed_thread_pablo_whatsapp',
        assignedUserId: null,
        lastMessageAt: addMinutes(anchor, -48),
        lastInboundAt: addMinutes(anchor, -49),
        lastOutboundAt: addMinutes(anchor, -48),
        requiresHumanReview: false,
        resolution: null,
      },
      {
        key: 'thread-diego-voice',
        patientKey: 'diego',
        channelType: 'voice',
        status: 'resolved',
        intent: 'faq',
        priority: 'low',
        source: 'seed_thread_diego_voice',
        assignedUserId: null,
        lastMessageAt: addMinutes(anchor, 5),
        lastInboundAt: addMinutes(anchor, 5),
        lastOutboundAt: null,
        requiresHumanReview: false,
        resolution: 'AI resolvio dudas operativas',
      },
      {
        key: 'thread-marta-voice',
        patientKey: 'marta',
        channelType: 'voice',
        status: 'closed',
        intent: 'human_handoff',
        priority: 'normal',
        source: 'seed_thread_marta_voice',
        assignedUserId: null,
        lastMessageAt: addMinutes(anchor, -20),
        lastInboundAt: null,
        lastOutboundAt: addMinutes(anchor, -20),
        requiresHumanReview: false,
        resolution: 'Callback completado',
      },
    ],
    messages: [
      {
        key: 'message-ana-1',
        threadKey: 'thread-ana-whatsapp',
        patientKey: 'ana',
        direction: 'inbound',
        channelType: 'whatsapp',
        messageType: 'text',
        body: 'Hola, soy nueva paciente y necesito una revision esta semana.',
        payload: {},
        deliveryStatus: 'received',
        providerMessageId: 'seed-msg-ana-1',
        sentAt: null,
        receivedAt: addMinutes(anchor, -40),
      },
      {
        key: 'message-ana-2',
        threadKey: 'thread-ana-whatsapp',
        patientKey: 'ana',
        direction: 'outbound',
        channelType: 'whatsapp',
        messageType: 'form_link',
        body: 'Te envio el formulario de nuevo paciente para avanzar la reserva.',
        payload: {},
        deliveryStatus: 'delivered',
        providerMessageId: 'seed-msg-ana-2',
        sentAt: addMinutes(anchor, -38),
        receivedAt: null,
      },
      {
        key: 'message-ana-3',
        threadKey: 'thread-ana-whatsapp',
        patientKey: 'ana',
        direction: 'inbound',
        channelType: 'whatsapp',
        messageType: 'text',
        body: 'Listo, ya lo complete.',
        payload: {},
        deliveryStatus: 'read',
        providerMessageId: 'seed-msg-ana-3',
        sentAt: null,
        receivedAt: addMinutes(anchor, -18),
      },
      {
        key: 'message-ana-4',
        threadKey: 'thread-ana-whatsapp',
        patientKey: 'ana',
        direction: 'outbound',
        channelType: 'whatsapp',
        messageType: 'text',
        body: 'Perfecto, te reservo hoy a las 10:15 con la Dra. Elena Ruiz.',
        payload: {},
        deliveryStatus: 'sent',
        providerMessageId: 'seed-msg-ana-4',
        sentAt: addMinutes(anchor, -15),
        receivedAt: null,
      },
      {
        key: 'message-lucia-1',
        threadKey: 'thread-lucia-whatsapp',
        patientKey: 'lucia',
        direction: 'inbound',
        channelType: 'whatsapp',
        messageType: 'text',
        body: 'Necesito mover mi control de ortodoncia a manana.',
        payload: {},
        deliveryStatus: 'received',
        providerMessageId: 'seed-msg-lucia-1',
        sentAt: null,
        receivedAt: addMinutes(anchor, -64),
      },
      {
        key: 'message-lucia-2',
        threadKey: 'thread-lucia-whatsapp',
        patientKey: 'lucia',
        direction: 'outbound',
        channelType: 'whatsapp',
        messageType: 'text',
        body: 'Puedo ofrecerte manana a las 13:00. Si quieres, tambien te llamo.',
        payload: {},
        deliveryStatus: 'delivered',
        providerMessageId: 'seed-msg-lucia-2',
        sentAt: addMinutes(anchor, -58),
        receivedAt: null,
      },
      {
        key: 'message-lucia-3',
        threadKey: 'thread-lucia-whatsapp',
        patientKey: 'lucia',
        direction: 'inbound',
        channelType: 'whatsapp',
        messageType: 'text',
        body: 'Si puedes llamarme mejor, voy entrando a consulta.',
        payload: {},
        deliveryStatus: 'read',
        providerMessageId: 'seed-msg-lucia-3',
        sentAt: null,
        receivedAt: addMinutes(anchor, -50),
      },
      {
        key: 'message-marta-1',
        threadKey: 'thread-marta-whatsapp',
        patientKey: 'marta',
        direction: 'outbound',
        channelType: 'whatsapp',
        messageType: 'template',
        body: 'Te recordamos tu revision de hoy a las 16:30. Confirmanos si vienes.',
        payload: {},
        deliveryStatus: 'delivered',
        providerMessageId: 'seed-msg-marta-1',
        sentAt: addMinutes(anchor, -25),
        receivedAt: null,
      },
      {
        key: 'message-javier-1',
        threadKey: 'thread-javier-whatsapp',
        patientKey: 'javier',
        direction: 'inbound',
        channelType: 'whatsapp',
        messageType: 'text',
        body: 'Hoy no llego a la higiene. Si se libera otro hueco esta semana me viene bien.',
        payload: {},
        deliveryStatus: 'received',
        providerMessageId: 'seed-msg-javier-1',
        sentAt: null,
        receivedAt: addMinutes(anchor, -44),
      },
      {
        key: 'message-javier-2',
        threadKey: 'thread-javier-whatsapp',
        patientKey: 'javier',
        direction: 'outbound',
        channelType: 'whatsapp',
        messageType: 'text',
        body: 'Entendido. Te avisamos si aparece una opcion parecida esta misma semana.',
        payload: {},
        deliveryStatus: 'delivered',
        providerMessageId: 'seed-msg-javier-2',
        sentAt: addMinutes(anchor, -42),
        receivedAt: null,
      },
      {
        key: 'message-elena-1',
        threadKey: 'thread-elena-whatsapp',
        patientKey: 'elena',
        direction: 'outbound',
        channelType: 'whatsapp',
        messageType: 'template',
        body: 'Se acaba de liberar hoy a las 11:30 una higiene. Te interesa?',
        payload: {},
        deliveryStatus: 'sent',
        providerMessageId: 'seed-msg-elena-1',
        sentAt: addMinutes(anchor, -8),
        receivedAt: null,
      },
      {
        key: 'message-sofia-1',
        threadKey: 'thread-sofia-whatsapp',
        patientKey: 'sofia',
        direction: 'outbound',
        channelType: 'whatsapp',
        messageType: 'form_link',
        body: 'Te comparto el formulario medico para cerrar la primera visita.',
        payload: {},
        deliveryStatus: 'delivered',
        providerMessageId: 'seed-msg-sofia-1',
        sentAt: addMinutes(anchor, -75),
        receivedAt: null,
      },
      {
        key: 'message-sofia-2',
        threadKey: 'thread-sofia-whatsapp',
        patientKey: 'sofia',
        direction: 'inbound',
        channelType: 'whatsapp',
        messageType: 'text',
        body: 'Lo empece, pero me falta revisar la parte del seguro.',
        payload: {},
        deliveryStatus: 'read',
        providerMessageId: 'seed-msg-sofia-2',
        sentAt: null,
        receivedAt: addMinutes(anchor, -30),
      },
      {
        key: 'message-pablo-1',
        threadKey: 'thread-pablo-whatsapp',
        patientKey: 'pablo',
        direction: 'inbound',
        channelType: 'whatsapp',
        messageType: 'text',
        body: 'Quiero valorar un implante. Que necesitais para darme cita?',
        payload: {},
        deliveryStatus: 'received',
        providerMessageId: 'seed-msg-pablo-1',
        sentAt: null,
        receivedAt: addMinutes(anchor, -49),
      },
      {
        key: 'message-pablo-2',
        threadKey: 'thread-pablo-whatsapp',
        patientKey: 'pablo',
        direction: 'outbound',
        channelType: 'whatsapp',
        messageType: 'form_link',
        body: 'Con este formulario ya te dejamos preparada la primera valoracion.',
        payload: {},
        deliveryStatus: 'delivered',
        providerMessageId: 'seed-msg-pablo-2',
        sentAt: addMinutes(anchor, -48),
        receivedAt: null,
      },
      {
        key: 'message-lucia-voice-1',
        threadKey: 'thread-lucia-voice',
        patientKey: 'lucia',
        direction: 'inbound',
        channelType: 'voice',
        messageType: 'call_summary',
        body: 'Llamada de Lucia Perez: solicita callback para cerrar la nueva hora.',
        payload: {},
        deliveryStatus: 'received',
        providerMessageId: 'seed-msg-lucia-voice-1',
        sentAt: null,
        receivedAt: addMinutes(anchor, -42),
      },
      {
        key: 'message-diego-voice-1',
        threadKey: 'thread-diego-voice',
        patientKey: 'diego',
        direction: 'inbound',
        channelType: 'voice',
        messageType: 'call_summary',
        body: 'Llamada resuelta: dudas sobre seguro y acceso al parking.',
        payload: {},
        deliveryStatus: 'received',
        providerMessageId: 'seed-msg-diego-voice-1',
        sentAt: null,
        receivedAt: addMinutes(anchor, 5),
      },
      {
        key: 'message-marta-voice-1',
        threadKey: 'thread-marta-voice',
        patientKey: 'marta',
        direction: 'outbound',
        channelType: 'voice',
        messageType: 'call_summary',
        body: 'Callback completado: Marta confirma que intentara responder por WhatsApp.',
        payload: {},
        deliveryStatus: 'sent',
        providerMessageId: 'seed-msg-marta-voice-1',
        sentAt: addMinutes(anchor, -20),
        receivedAt: null,
      },
    ],
    calls: [
      {
        key: 'call-lucia',
        patientKey: 'lucia',
        threadKey: 'thread-lucia-voice',
        direction: 'inbound',
        status: 'callback_required',
        providerCallId: 'seed-call-lucia',
        fromNumber: '+34600101011',
        toNumber: '+34910000002',
        startedAt: addMinutes(anchor, -43),
        endedAt: addMinutes(anchor, -40),
        durationSeconds: 180,
        summary: 'Lucia necesita reprogramar y pide llamada de vuelta para confirmar la hora.',
        transcript: 'Hola, entro a una reunion. Si me llamais en un rato cierro la nueva cita.',
        resolution: 'Pendiente de callback por el equipo.',
        requiresHumanReview: true,
      },
      {
        key: 'call-diego',
        patientKey: 'diego',
        threadKey: 'thread-diego-voice',
        direction: 'inbound',
        status: 'handled_by_ai',
        providerCallId: 'seed-call-diego',
        fromNumber: '+34600101013',
        toNumber: '+34910000002',
        startedAt: addMinutes(anchor, 2),
        endedAt: addMinutes(anchor, 5),
        durationSeconds: 190,
        summary: 'Consulta breve resuelta por IA sobre parking y seguro.',
        transcript: 'Queria confirmar si puedo aparcar cerca y si aceptais el seguro dental.',
        resolution: 'Resolved by AI',
        requiresHumanReview: false,
      },
      {
        key: 'call-marta',
        patientKey: 'marta',
        threadKey: 'thread-marta-voice',
        direction: 'outbound',
        status: 'closed',
        providerCallId: 'seed-call-marta',
        fromNumber: '+34910000002',
        toNumber: '+34600101014',
        startedAt: addMinutes(anchor, -23),
        endedAt: addMinutes(anchor, -20),
        durationSeconds: 175,
        summary: 'Callback de seguimiento tras no responder al recordatorio.',
        transcript: 'Te llamamos para confirmar la revision. Nos dices que responderas por WhatsApp.',
        resolution: 'Follow-up closed',
        requiresHumanReview: false,
      },
    ],
    formTemplates: [
      {
        key: 'new-patient',
        name: 'Formulario nuevo paciente',
        slug: 'nuevo-paciente',
        version: '1.0.0',
        schema: {
          sections: [
            { id: 'medical-history', title: 'Antecedentes' },
            { id: 'contact-preferences', title: 'Preferencias de contacto' },
          ],
        },
      },
    ],
    formSubmissions: [
      {
        key: 'submission-ana',
        templateKey: 'new-patient',
        patientKey: 'ana',
        threadKey: 'thread-ana-whatsapp',
        status: 'completed',
        answers: { allergies: 'Ninguna', medications: 'Ninguna' },
        sentAt: addMinutes(anchor, -38),
        openedAt: addMinutes(anchor, -32),
        completedAt: addMinutes(anchor, -18),
        expiresAt: addDays(anchor, 2),
        requiredForBooking: true,
      },
      {
        key: 'submission-sofia',
        templateKey: 'new-patient',
        patientKey: 'sofia',
        threadKey: 'thread-sofia-whatsapp',
        status: 'opened',
        answers: { allergies: 'Pendiente de confirmar' },
        sentAt: addMinutes(anchor, -75),
        openedAt: addMinutes(anchor, -30),
        completedAt: null,
        expiresAt: addDays(anchor, 1),
        requiredForBooking: true,
      },
      {
        key: 'submission-pablo',
        templateKey: 'new-patient',
        patientKey: 'pablo',
        threadKey: 'thread-pablo-whatsapp',
        status: 'sent',
        answers: {},
        sentAt: addMinutes(anchor, -48),
        openedAt: null,
        completedAt: null,
        expiresAt: addDays(anchor, 2),
        requiredForBooking: true,
      },
    ],
    appointments: [
      {
        key: 'appointment-ana',
        externalAppointmentId: 'APPT-001',
        patientKey: 'ana',
        serviceKey: 'first-visit',
        practitionerKey: 'ruiz',
        locationKey: 'centro',
        threadKey: 'thread-ana-whatsapp',
        status: 'scheduled',
        source: 'whatsapp',
        startsAt: setTime(anchor, 10, 15),
        endsAt: setTime(anchor, 11, 0),
        bookedAt: addMinutes(anchor, -15),
        confirmationStatus: 'pending',
        reminderStatus: 'scheduled',
        cancellationReason: null,
        metadata: { journey: 'new_patient_whatsapp' },
      },
      {
        key: 'appointment-lucia',
        externalAppointmentId: 'APPT-002',
        patientKey: 'lucia',
        serviceKey: 'ortho',
        practitionerKey: 'solis',
        locationKey: 'centro',
        threadKey: 'thread-lucia-whatsapp',
        status: 'rescheduled',
        source: 'whatsapp',
        startsAt: setTime(addDays(anchor, 1), 13, 0),
        endsAt: setTime(addDays(anchor, 1), 13, 30),
        bookedAt: addDays(anchor, -10),
        confirmationStatus: 'confirmed',
        reminderStatus: 'sent',
        cancellationReason: null,
        metadata: { journey: 'existing_patient_reschedule' },
      },
      {
        key: 'appointment-diego',
        externalAppointmentId: 'APPT-003',
        patientKey: 'diego',
        serviceKey: 'hygiene',
        practitionerKey: 'ruiz',
        locationKey: 'norte',
        threadKey: null,
        status: 'confirmed',
        source: 'manual',
        startsAt: setTime(anchor, 12, 0),
        endsAt: setTime(anchor, 12, 45),
        bookedAt: lastWeek,
        confirmationStatus: 'confirmed',
        reminderStatus: 'sent',
        cancellationReason: null,
        metadata: { journey: 'confirmed_same_day' },
      },
      {
        key: 'appointment-marta',
        externalAppointmentId: 'APPT-004',
        patientKey: 'marta',
        serviceKey: 'hygiene',
        practitionerKey: 'ruiz',
        locationKey: 'centro',
        threadKey: 'thread-marta-whatsapp',
        status: 'scheduled',
        source: 'manual',
        startsAt: setTime(anchor, 16, 30),
        endsAt: setTime(anchor, 17, 15),
        bookedAt: twoDaysAgo,
        confirmationStatus: 'pending',
        reminderStatus: 'scheduled',
        cancellationReason: null,
        metadata: { journey: 'pending_confirmation' },
      },
      {
        key: 'appointment-javier',
        externalAppointmentId: 'APPT-005',
        patientKey: 'javier',
        serviceKey: 'hygiene',
        practitionerKey: 'ruiz',
        locationKey: 'centro',
        threadKey: 'thread-javier-whatsapp',
        status: 'cancelled',
        source: 'manual',
        startsAt: setTime(anchor, 11, 30),
        endsAt: setTime(anchor, 12, 15),
        bookedAt: addDays(anchor, -8),
        confirmationStatus: 'declined',
        reminderStatus: 'completed',
        cancellationReason: 'Viaje de trabajo',
        metadata: { journey: 'cancelled_gap_origin' },
      },
      {
        key: 'appointment-carmen',
        externalAppointmentId: 'APPT-006',
        patientKey: 'carmen',
        serviceKey: 'hygiene',
        practitionerKey: 'ruiz',
        locationKey: 'norte',
        threadKey: null,
        status: 'scheduled',
        source: 'campaign',
        startsAt: setTime(nextWeek, 10, 0),
        endsAt: setTime(nextWeek, 10, 45),
        bookedAt: addHours(yesterday, 18),
        confirmationStatus: 'pending',
        reminderStatus: 'pending',
        cancellationReason: null,
        metadata: { journey: 'reactivation_booked' },
      },
    ],
    appointmentEvents: [
      {
        appointmentKey: 'appointment-ana',
        eventType: 'created',
        actorType: 'ai',
        payload: { source: 'whatsapp' },
      },
      {
        appointmentKey: 'appointment-lucia',
        eventType: 'rescheduled',
        actorType: 'patient',
        payload: { via: 'whatsapp' },
      },
      {
        appointmentKey: 'appointment-javier',
        eventType: 'cancelled',
        actorType: 'patient',
        payload: { reason: 'travel' },
      },
      {
        appointmentKey: 'appointment-carmen',
        eventType: 'booked_from_campaign',
        actorType: 'ai',
        payload: { campaignKey: 'campaign-hygiene-recall' },
      },
    ],
    reminders: [
      {
        appointmentKey: 'appointment-ana',
        channelType: 'whatsapp',
        status: 'scheduled',
        scheduledFor: addMinutes(anchor, 10),
        sentAt: null,
        templateKey: 'appointment-reminder-1h',
        attemptCount: 0,
        lastError: null,
      },
      {
        appointmentKey: 'appointment-marta',
        channelType: 'whatsapp',
        status: 'scheduled',
        scheduledFor: addHours(anchor, 3),
        sentAt: null,
        templateKey: 'appointment-reminder-4h',
        attemptCount: 0,
        lastError: null,
      },
    ],
    confirmations: [
      {
        appointmentKey: 'appointment-ana',
        channelType: 'whatsapp',
        status: 'pending',
        requestedAt: addMinutes(anchor, -10),
        dueAt: addHours(anchor, 3),
        respondedAt: null,
        responsePayload: {},
      },
      {
        appointmentKey: 'appointment-lucia',
        channelType: 'whatsapp',
        status: 'confirmed',
        requestedAt: addHours(yesterday, 11),
        dueAt: addHours(yesterday, 18),
        respondedAt: addHours(yesterday, 12),
        responsePayload: { reply: 'confirm' },
      },
      {
        appointmentKey: 'appointment-diego',
        channelType: 'whatsapp',
        status: 'confirmed',
        requestedAt: addHours(yesterday, 9),
        dueAt: addHours(yesterday, 19),
        respondedAt: addHours(yesterday, 10),
        responsePayload: { reply: 'confirm' },
      },
      {
        appointmentKey: 'appointment-marta',
        channelType: 'whatsapp',
        status: 'pending',
        requestedAt: addMinutes(anchor, -25),
        dueAt: addHours(anchor, 4),
        respondedAt: null,
        responsePayload: {},
      },
    ],
    waitlistRequests: [
      {
        key: 'waitlist-elena',
        patientKey: 'elena',
        serviceKey: 'hygiene',
        practitionerKey: 'ruiz',
        locationKey: 'centro',
        preferredWindows: [
          { start: '09:00', end: '12:00', label: 'mananas' },
          { start: '16:00', end: '18:00', label: 'tardes' },
        ],
        status: 'active',
        priorityScore: 92,
        notes: 'Puede venir hoy mismo si se abre hueco.',
      },
    ],
    gaps: [
      {
        key: 'gap-javier',
        originAppointmentKey: 'appointment-javier',
        serviceKey: 'hygiene',
        practitionerKey: 'ruiz',
        locationKey: 'centro',
        startsAt: setTime(anchor, 11, 30),
        endsAt: setTime(anchor, 12, 15),
        status: 'open',
        origin: 'cancellation',
      },
    ],
    gapOutreachAttempts: [
      {
        key: 'gap-outreach-elena',
        gapKey: 'gap-javier',
        patientKey: 'elena',
        channelType: 'whatsapp',
        status: 'sent',
        sentAt: addMinutes(anchor, -8),
        respondedAt: null,
        result: 'Awaiting reply',
        metadata: { waitlistKey: 'waitlist-elena' },
      },
    ],
    campaigns: [
      {
        key: 'campaign-hygiene-recall',
        name: 'Revisiones de higiene de primavera',
        campaignType: 'hygiene_recall',
        status: 'running',
        audienceDefinition: { inactivityDays: 180, channel: 'whatsapp' },
        messageTemplate: {
          body: 'Hola {{firstName}}, se acerca tu revision de higiene. Quieres que te propongamos huecos?',
        },
        channelPolicy: { primaryChannel: 'whatsapp', fallbackChannel: 'email' },
        scheduledAt: yesterday,
        startedAt: addHours(yesterday, 7),
        completedAt: null,
      },
    ],
    recipients: [
      {
        key: 'recipient-carmen',
        campaignKey: 'campaign-hygiene-recall',
        patientKey: 'carmen',
        status: 'booked',
        lastContactAt: addHours(yesterday, 8),
        lastResponseAt: addHours(yesterday, 18),
        result: 'Booked hygiene visit',
        generatedAppointmentKey: 'appointment-carmen',
        metadata: { channelType: 'whatsapp' },
      },
      {
        key: 'recipient-laura',
        campaignKey: 'campaign-hygiene-recall',
        patientKey: 'laura',
        status: 'contacted',
        lastContactAt: addHours(yesterday, 9),
        lastResponseAt: null,
        result: 'Awaiting reply',
        generatedAppointmentKey: null,
        metadata: { channelType: 'whatsapp' },
      },
      {
        key: 'recipient-raul',
        campaignKey: 'campaign-hygiene-recall',
        patientKey: 'raul',
        status: 'failed',
        lastContactAt: addHours(yesterday, 9),
        lastResponseAt: null,
        result: 'Number unreachable',
        generatedAppointmentKey: null,
        metadata: { channelType: 'whatsapp' },
      },
    ],
    summary: {
      counts: {
        patients: patients.length,
        whatsappThreads: 7,
        voiceThreads: 3,
        calls: 3,
        formSubmissions: 3,
        appointments: 6,
        pendingConfirmations: 2,
        activeGaps: 1,
        activeCampaigns: 1,
      },
      journeys: {
        newPatient: {
          patientKey: 'ana',
          threadKey: 'thread-ana-whatsapp',
          submissionKey: 'submission-ana',
          appointmentKey: 'appointment-ana',
        },
        reschedule: {
          patientKey: 'lucia',
          whatsappThreadKey: 'thread-lucia-whatsapp',
          voiceThreadKey: 'thread-lucia-voice',
          appointmentKey: 'appointment-lucia',
        },
        confirmation: {
          pendingAppointmentKeys: ['appointment-ana', 'appointment-marta'],
          confirmedAppointmentKeys: ['appointment-lucia', 'appointment-diego'],
        },
        gapRecovery: {
          gapKey: 'gap-javier',
          cancelledAppointmentKey: 'appointment-javier',
          candidatePatientKey: 'elena',
          outreachKey: 'gap-outreach-elena',
        },
        reactivation: {
          campaignKey: 'campaign-hygiene-recall',
          bookedRecipientKey: 'recipient-carmen',
          contactedRecipientKey: 'recipient-laura',
          failedRecipientKey: 'recipient-raul',
          generatedAppointmentKey: 'appointment-carmen',
        },
      },
    },
  };
}
