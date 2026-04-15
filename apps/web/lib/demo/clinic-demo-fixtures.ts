import type {
  AppointmentDetail,
  CallSessionDetail,
  ClinicChannel,
  ClinicDashboard,
  ClinicExperience,
  ClinicLocation,
  ClinicModuleEntitlement,
  ClinicProfile,
  ClinicService,
  ConfirmationRequest,
  ConversationMessage,
  ConversationThreadDetail,
  ConversationThreadListItem,
  GapOpportunityDetail,
  IntakeFormSubmission,
  IntakeFormTemplate,
  Patient,
  PatientIdentity,
  PatientListItem,
  Practitioner,
  ReactivationCampaign,
  ReactivationCampaignDetail,
  ReactivationRecipient,
  ReminderJob,
  TenantExperience,
  WaitlistRequest,
} from '@agentmou/contracts';

export const CLINIC_DEMO_TENANT_ID = 'demo-workspace';

export interface ClinicDemoFixtureSummary {
  counts: {
    patients: number;
    whatsappThreads: number;
    voiceThreads: number;
    calls: number;
    forms: number;
    appointments: number;
    confirmationsPending: number;
    activeGaps: number;
    activeCampaigns: number;
  };
  journeys: {
    newPatient: {
      patientId: string;
      threadId: string;
      submissionId: string;
      appointmentId: string;
    };
    reschedule: {
      patientId: string;
      whatsappThreadId: string;
      voiceThreadId: string;
      appointmentId: string;
    };
    confirmation: {
      pendingAppointmentIds: string[];
      confirmedAppointmentIds: string[];
    };
    gapRecovery: {
      gapId: string;
      cancelledAppointmentId: string;
      candidatePatientId: string;
      outreachAttemptId: string;
    };
    reactivation: {
      campaignId: string;
      bookedRecipientId: string;
      contactedRecipientId: string;
      failedRecipientId: string;
      generatedAppointmentId: string;
    };
    internalMode: {
      demoWorkspaceInternalVisible: boolean;
    };
  };
}

export interface ClinicDemoDataset {
  tenantId: string;
  generatedAt: string;
  profile: ClinicProfile;
  modules: ClinicModuleEntitlement[];
  channels: ClinicChannel[];
  services: ClinicService[];
  practitioners: Practitioner[];
  locations: ClinicLocation[];
  patients: Patient[];
  patientListItems: PatientListItem[];
  patientIdentities: Record<string, PatientIdentity[]>;
  threads: ConversationThreadDetail[];
  threadListItems: ConversationThreadListItem[];
  messages: ConversationMessage[];
  calls: CallSessionDetail[];
  formTemplates: IntakeFormTemplate[];
  formSubmissions: IntakeFormSubmission[];
  appointments: AppointmentDetail[];
  waitlistRequests: WaitlistRequest[];
  reminders: ReminderJob[];
  confirmations: ConfirmationRequest[];
  gaps: GapOpportunityDetail[];
  campaigns: ReactivationCampaign[];
  campaignDetails: ReactivationCampaignDetail[];
  recipients: ReactivationRecipient[];
  dashboard: ClinicDashboard;
  tenantExperience: TenantExperience;
  experience: ClinicExperience;
  summary: ClinicDemoFixtureSummary;
}

const PRIORITY_WEIGHT: Record<string, number> = {
  urgent: 4,
  high: 3,
  normal: 2,
  low: 1,
};

const NEXT_ACTION_BY_THREAD: Record<string, string> = {
  'thread-ana-whatsapp': 'Confirmar llegada y revisar formulario completo',
  'thread-lucia-whatsapp': 'Cerrar nueva hora por WhatsApp',
  'thread-lucia-voice': 'Llamar antes de las 12:00',
  'thread-marta-whatsapp': 'Enviar recordatorio de confirmacion',
  'thread-javier-whatsapp': 'Ofrecer el hueco liberado a waitlist',
  'thread-elena-whatsapp': 'Esperar respuesta a la oferta del hueco',
  'thread-sofia-whatsapp': 'Nudge para completar formulario',
  'thread-pablo-whatsapp': 'Enviar primer recordatorio de formulario',
  'thread-diego-voice': 'Sin accion pendiente',
  'thread-marta-voice': 'Seguimiento cerrado',
};

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

function iso(value: Date) {
  return value.toISOString();
}

function isSameDay(left: string, right: Date) {
  const leftDate = new Date(left);
  return (
    leftDate.getUTCFullYear() === right.getUTCFullYear() &&
    leftDate.getUTCMonth() === right.getUTCMonth() &&
    leftDate.getUTCDate() === right.getUTCDate()
  );
}

function buildPatientIdentities(tenantId: string, patients: Patient[]) {
  const identities: Record<string, PatientIdentity[]> = {};

  for (const patient of patients) {
    const next: PatientIdentity[] = [];
    if (patient.phone) {
      next.push({
        id: `${patient.id}-phone`,
        tenantId,
        patientId: patient.id,
        identityType: 'phone',
        identityValue: patient.phone,
        isPrimary: true,
        confidenceScore: 1,
        createdAt: patient.createdAt,
      });
    }
    if (patient.email) {
      next.push({
        id: `${patient.id}-email`,
        tenantId,
        patientId: patient.id,
        identityType: 'email',
        identityValue: patient.email,
        isPrimary: false,
        confidenceScore: 0.94,
        createdAt: patient.createdAt,
      });
    }
    identities[patient.id] = next;
  }

  return identities;
}

function buildPatientListItems(
  patients: Patient[],
  appointments: AppointmentDetail[],
  formSubmissions: IntakeFormSubmission[]
) {
  const appointmentCount = new Map<string, number>();
  for (const appointment of appointments) {
    if (appointment.status === 'cancelled' || appointment.status === 'completed') {
      continue;
    }
    appointmentCount.set(
      appointment.patientId,
      (appointmentCount.get(appointment.patientId) ?? 0) + 1
    );
  }

  const pendingFormPatients = new Set(
    formSubmissions
      .filter((submission) => submission.status !== 'completed' && submission.status !== 'waived')
      .map((submission) => submission.patientId)
  );

  return patients.map(
    (patient): PatientListItem => ({
      ...patient,
      upcomingAppointmentCount: appointmentCount.get(patient.id) ?? 0,
      hasPendingForm: pendingFormPatients.has(patient.id),
      isReactivationCandidate: patient.status === 'inactive',
    })
  );
}

function buildThreadListItems(
  threads: ConversationThreadDetail[],
  patientListItems: PatientListItem[]
) {
  const patientMap = new Map(patientListItems.map((patient) => [patient.id, patient]));

  return threads.map((thread): ConversationThreadListItem => {
    const lastMessage = thread.messages.at(-1);
    const unreadCount = thread.messages.filter((message) => {
      if (message.direction !== 'inbound') return false;
      if (!thread.lastOutboundAt) return true;
      return message.createdAt > thread.lastOutboundAt;
    }).length;

    return {
      id: thread.id,
      tenantId: thread.tenantId,
      patientId: thread.patientId,
      channelType: thread.channelType,
      status: thread.status,
      intent: thread.intent,
      priority: thread.priority,
      source: thread.source,
      assignedUserId: thread.assignedUserId,
      lastMessageAt: thread.lastMessageAt,
      lastInboundAt: thread.lastInboundAt,
      lastOutboundAt: thread.lastOutboundAt,
      requiresHumanReview: thread.requiresHumanReview,
      resolution: thread.resolution,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      patient: thread.patientId ? (patientMap.get(thread.patientId) ?? null) : null,
      lastMessagePreview: lastMessage?.body ?? '',
      nextSuggestedAction: NEXT_ACTION_BY_THREAD[thread.id] ?? 'Revisar conversacion',
      unreadCount,
    };
  });
}

function sortThreadListItems(items: ConversationThreadListItem[]) {
  return [...items].sort((left, right) => {
    const priorityDiff =
      (PRIORITY_WEIGHT[right.priority] ?? 0) - (PRIORITY_WEIGHT[left.priority] ?? 0);
    if (priorityDiff !== 0) return priorityDiff;
    return (right.lastMessageAt ?? '').localeCompare(left.lastMessageAt ?? '');
  });
}

function stripThread(thread: ConversationThreadDetail) {
  const { messages: _messages, patient: _patient, ...base } = thread;
  return base;
}

function buildDashboard(
  tenantId: string,
  generatedAt: string,
  patientListItems: PatientListItem[],
  threadListItems: ConversationThreadListItem[],
  appointments: AppointmentDetail[],
  formSubmissions: IntakeFormSubmission[],
  confirmations: ConfirmationRequest[],
  gaps: GapOpportunityDetail[],
  campaigns: ReactivationCampaign[]
): ClinicDashboard {
  const activeThreads = threadListItems.filter(
    (thread) => !['resolved', 'closed'].includes(thread.status)
  );
  const agenda = appointments
    .filter(
      (appointment) =>
        appointment.status !== 'cancelled' && isSameDay(appointment.startsAt, new Date(generatedAt))
    )
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  const pendingForms = formSubmissions.filter(
    (submission) => submission.status !== 'completed' && submission.status !== 'waived'
  );
  const pendingConfirmations = confirmations.filter(
    (confirmation) => confirmation.status === 'pending'
  );
  const activeGaps = gaps.filter((gap) => gap.status === 'open' || gap.status === 'offered');
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === 'running');

  return {
    tenantId,
    generatedAt,
    kpis: {
      openThreads: activeThreads.length,
      pendingConfirmations: pendingConfirmations.length,
      pendingForms: pendingForms.length,
      activeGaps: activeGaps.length,
      activeCampaigns: activeCampaigns.length,
      todaysAppointments: agenda.length,
      patientsNew: patientListItems.filter((patient) => !patient.isExisting).length,
      patientsExisting: patientListItems.filter((patient) => patient.isExisting).length,
    },
    prioritizedInbox: sortThreadListItems(activeThreads),
    agenda,
    pendingForms,
    pendingConfirmations,
    activeGaps,
    activeCampaigns,
    patientMix: {
      newPatients: patientListItems.filter((patient) => !patient.isExisting).length,
      existingPatients: patientListItems.filter((patient) => patient.isExisting).length,
    },
  };
}

export function buildClinicDemoDataset(
  tenantId = CLINIC_DEMO_TENANT_ID,
  now = new Date()
): ClinicDemoDataset {
  const anchor = setTime(now, 9, 0);
  const generatedAt = iso(anchor);
  const yesterday = addDays(anchor, -1);
  const twoDaysAgo = addDays(anchor, -2);
  const lastWeek = addDays(anchor, -7);
  const nextWeek = addDays(anchor, 7);

  const clinicProfile: ClinicProfile = {
    id: 'clinic-profile-demo',
    tenantId,
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
    createdAt: iso(addDays(anchor, -180)),
    updatedAt: generatedAt,
  };

  const clinicModules: ClinicModuleEntitlement[] = [
    {
      id: 'module-core',
      tenantId,
      moduleKey: 'core_reception',
      status: 'enabled',
      visibleToClient: true,
      planLevel: 'enterprise',
      config: { primaryNav: true },
      createdAt: iso(addDays(anchor, -120)),
      updatedAt: generatedAt,
      enabled: true,
      beta: false,
      displayName: 'Core Reception',
      description: 'Resumen, bandeja, agenda y pacientes.',
      requiresConfig: false,
      visibilityState: 'visible',
      visibilityReason: 'active',
    },
    {
      id: 'module-voice',
      tenantId,
      moduleKey: 'voice',
      status: 'enabled',
      visibleToClient: true,
      planLevel: 'enterprise',
      config: { callbacks: true },
      createdAt: iso(addDays(anchor, -120)),
      updatedAt: generatedAt,
      enabled: true,
      beta: false,
      displayName: 'Voice',
      description: 'Llamadas entrantes, callbacks y resumenes.',
      requiresConfig: false,
      visibilityState: 'visible',
      visibilityReason: 'active',
    },
    {
      id: 'module-growth',
      tenantId,
      moduleKey: 'growth',
      status: 'enabled',
      visibleToClient: true,
      planLevel: 'enterprise',
      config: { smartGapFill: true, reactivation: true },
      createdAt: iso(addDays(anchor, -120)),
      updatedAt: generatedAt,
      enabled: true,
      beta: false,
      displayName: 'Growth',
      description: 'Confirmaciones, huecos y reactivacion.',
      requiresConfig: false,
      visibilityState: 'visible',
      visibilityReason: 'active',
    },
    {
      id: 'module-advanced',
      tenantId,
      moduleKey: 'advanced_mode',
      status: 'hidden',
      visibleToClient: false,
      planLevel: 'enterprise',
      config: {},
      createdAt: iso(addDays(anchor, -120)),
      updatedAt: generatedAt,
      enabled: false,
      beta: false,
      displayName: 'Advanced Mode',
      description: 'Configuraciones expertas para el equipo interno.',
      requiresConfig: false,
      visibilityState: 'hidden',
      visibilityReason: 'disabled_by_tenant',
    },
    {
      id: 'module-internal',
      tenantId,
      moduleKey: 'internal_platform',
      status: 'enabled',
      visibleToClient: false,
      planLevel: 'enterprise',
      config: { internalOnly: true },
      createdAt: iso(addDays(anchor, -120)),
      updatedAt: generatedAt,
      enabled: true,
      beta: false,
      displayName: 'Internal Platform',
      description: 'Marketplace, runs y approvals solo para usuarios internos.',
      requiresConfig: false,
      visibilityState: 'internal_only',
      visibilityReason: 'hidden_internal_only',
    },
  ];

  const clinicChannels: ClinicChannel[] = [
    {
      id: 'channel-whatsapp',
      tenantId,
      channelType: 'whatsapp',
      directionPolicy: {
        inboundEnabled: true,
        outboundEnabled: true,
        fallbackToHuman: true,
      },
      provider: 'twilio_whatsapp',
      connectorAccountId: 'connector-whatsapp-demo',
      status: 'active',
      phoneNumber: '+34910000001',
      config: { displayName: 'Recepcion WhatsApp' },
      createdAt: iso(addDays(anchor, -90)),
      updatedAt: generatedAt,
    },
    {
      id: 'channel-voice',
      tenantId,
      channelType: 'voice',
      directionPolicy: {
        inboundEnabled: true,
        outboundEnabled: true,
        fallbackToHuman: true,
        recordCalls: true,
        afterHoursVoicemail: true,
      },
      provider: 'twilio_voice',
      connectorAccountId: 'connector-voice-demo',
      status: 'active',
      phoneNumber: '+34910000002',
      config: { ivrProfile: 'front-desk' },
      createdAt: iso(addDays(anchor, -90)),
      updatedAt: generatedAt,
    },
  ];

  const services: ClinicService[] = [
    {
      id: 'service-first-visit',
      tenantId,
      externalServiceId: 'svc-first-visit',
      slug: 'primera-visita',
      name: 'Primera visita',
      durationMinutes: 45,
      active: true,
      metadata: { category: 'diagnostico' },
      createdAt: iso(addDays(anchor, -180)),
      updatedAt: generatedAt,
    },
    {
      id: 'service-hygiene',
      tenantId,
      externalServiceId: 'svc-hygiene',
      slug: 'higiene-dental',
      name: 'Higiene dental',
      durationMinutes: 45,
      active: true,
      metadata: { category: 'hygiene' },
      createdAt: iso(addDays(anchor, -180)),
      updatedAt: generatedAt,
    },
    {
      id: 'service-ortho',
      tenantId,
      externalServiceId: 'svc-ortho-control',
      slug: 'control-ortodoncia',
      name: 'Control de ortodoncia',
      durationMinutes: 30,
      active: true,
      metadata: { category: 'ortho' },
      createdAt: iso(addDays(anchor, -180)),
      updatedAt: generatedAt,
    },
  ];

  const practitioners: Practitioner[] = [
    {
      id: 'practitioner-ruiz',
      tenantId,
      externalPractitionerId: 'practitioner-ruiz',
      name: 'Dra. Elena Ruiz',
      specialty: 'Odontologia general',
      active: true,
      metadata: { languages: ['es', 'en'] },
      createdAt: iso(addDays(anchor, -180)),
      updatedAt: generatedAt,
    },
    {
      id: 'practitioner-solis',
      tenantId,
      externalPractitionerId: 'practitioner-solis',
      name: 'Dr. Marta Solis',
      specialty: 'Ortodoncia',
      active: true,
      metadata: { days: ['monday', 'wednesday', 'friday'] },
      createdAt: iso(addDays(anchor, -180)),
      updatedAt: generatedAt,
    },
  ];

  const locations: ClinicLocation[] = [
    {
      id: 'location-centro',
      tenantId,
      externalLocationId: 'location-centro',
      name: 'Madrid Centro',
      address: 'Calle Alcala 120, Madrid',
      phone: '+34910000003',
      active: true,
      metadata: { floor: '2A' },
      createdAt: iso(addDays(anchor, -180)),
      updatedAt: generatedAt,
    },
    {
      id: 'location-norte',
      tenantId,
      externalLocationId: 'location-norte',
      name: 'Chamartin',
      address: 'Avenida de Burgos 18, Madrid',
      phone: '+34910000004',
      active: true,
      metadata: { parking: true },
      createdAt: iso(addDays(anchor, -180)),
      updatedAt: generatedAt,
    },
  ];

  const patients: Patient[] = [
    {
      id: 'patient-ana-garcia',
      tenantId,
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
      lastInteractionAt: iso(addMinutes(anchor, -15)),
      nextSuggestedActionAt: iso(addMinutes(anchor, 45)),
      createdAt: iso(addDays(anchor, -1)),
      updatedAt: generatedAt,
    },
    {
      id: 'patient-lucia-perez',
      tenantId,
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
      lastInteractionAt: iso(addMinutes(anchor, -50)),
      nextSuggestedActionAt: iso(addHours(anchor, 1)),
      createdAt: iso(addDays(anchor, -180)),
      updatedAt: generatedAt,
    },
    {
      id: 'patient-carmen-lopez',
      tenantId,
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
      lastInteractionAt: iso(addHours(anchor, -12)),
      nextSuggestedActionAt: iso(addDays(anchor, 7)),
      createdAt: iso(addDays(anchor, -280)),
      updatedAt: generatedAt,
    },
    {
      id: 'patient-diego-martin',
      tenantId,
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
      lastInteractionAt: iso(addMinutes(anchor, 5)),
      nextSuggestedActionAt: null,
      createdAt: iso(addDays(anchor, -400)),
      updatedAt: generatedAt,
    },
    {
      id: 'patient-marta-sanchez',
      tenantId,
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
      lastInteractionAt: iso(addMinutes(anchor, -25)),
      nextSuggestedActionAt: iso(addHours(anchor, 2)),
      createdAt: iso(addDays(anchor, -120)),
      updatedAt: generatedAt,
    },
    {
      id: 'patient-javier-torres',
      tenantId,
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
      lastInteractionAt: iso(addMinutes(anchor, -40)),
      nextSuggestedActionAt: iso(addMinutes(anchor, 20)),
      createdAt: iso(addDays(anchor, -240)),
      updatedAt: generatedAt,
    },
    {
      id: 'patient-elena-diaz',
      tenantId,
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
      lastInteractionAt: iso(addMinutes(anchor, -10)),
      nextSuggestedActionAt: iso(addHours(anchor, 1)),
      createdAt: iso(addDays(anchor, -90)),
      updatedAt: generatedAt,
    },
    {
      id: 'patient-sofia-romero',
      tenantId,
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
      lastInteractionAt: iso(addMinutes(anchor, -30)),
      nextSuggestedActionAt: iso(addHours(anchor, 1)),
      createdAt: iso(addDays(anchor, -2)),
      updatedAt: generatedAt,
    },
    {
      id: 'patient-pablo-ortiz',
      tenantId,
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
      lastInteractionAt: iso(addMinutes(anchor, -32)),
      nextSuggestedActionAt: iso(addHours(anchor, 2)),
      createdAt: iso(addDays(anchor, -1)),
      updatedAt: generatedAt,
    },
    {
      id: 'patient-laura-gomez',
      tenantId,
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
      lastInteractionAt: iso(addDays(anchor, -210)),
      nextSuggestedActionAt: iso(addDays(anchor, 1)),
      createdAt: iso(addDays(anchor, -420)),
      updatedAt: generatedAt,
    },
    {
      id: 'patient-raul-ibanez',
      tenantId,
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
      lastInteractionAt: iso(addDays(anchor, -300)),
      nextSuggestedActionAt: iso(addDays(anchor, 3)),
      createdAt: iso(addDays(anchor, -500)),
      updatedAt: generatedAt,
    },
  ];

  const patientMap = new Map(patients.map((patient) => [patient.id, patient]));
  const patientIdentities = buildPatientIdentities(tenantId, patients);

  const formTemplates: IntakeFormTemplate[] = [
    {
      id: 'template-new-patient',
      tenantId,
      name: 'Formulario nuevo paciente',
      slug: 'nuevo-paciente',
      version: '1.0.0',
      schema: {
        sections: [
          { id: 'medical-history', title: 'Antecedentes' },
          { id: 'contact-preferences', title: 'Preferencias de contacto' },
        ],
      },
      isActive: true,
      createdAt: iso(addDays(anchor, -90)),
      updatedAt: generatedAt,
    },
  ];

  const appointmentDetails: AppointmentDetail[] = [];
  const waitlistRequests: WaitlistRequest[] = [
    {
      id: 'waitlist-elena',
      tenantId,
      patientId: 'patient-elena-diaz',
      serviceId: 'service-hygiene',
      practitionerId: 'practitioner-ruiz',
      locationId: 'location-centro',
      preferredWindows: [
        { start: '09:00', end: '12:00', label: 'mananas' },
        { start: '16:00', end: '18:00', label: 'tardes' },
      ],
      status: 'active',
      priorityScore: 92,
      notes: 'Puede venir hoy mismo si se abre hueco.',
      createdAt: iso(addDays(anchor, -4)),
      updatedAt: generatedAt,
    },
  ];

  const formSubmissions: IntakeFormSubmission[] = [
    {
      id: 'submission-ana',
      tenantId,
      templateId: 'template-new-patient',
      patientId: 'patient-ana-garcia',
      threadId: 'thread-ana-whatsapp',
      status: 'completed',
      answers: {
        allergies: 'Ninguna',
        medications: 'Ninguna',
      },
      sentAt: iso(addMinutes(anchor, -38)),
      openedAt: iso(addMinutes(anchor, -32)),
      completedAt: iso(addMinutes(anchor, -18)),
      expiresAt: iso(addDays(anchor, 2)),
      requiredForBooking: true,
      createdAt: iso(addMinutes(anchor, -38)),
      updatedAt: iso(addMinutes(anchor, -18)),
    },
    {
      id: 'submission-sofia',
      tenantId,
      templateId: 'template-new-patient',
      patientId: 'patient-sofia-romero',
      threadId: 'thread-sofia-whatsapp',
      status: 'opened',
      answers: {
        allergies: 'Pendiente de confirmar',
      },
      sentAt: iso(addMinutes(anchor, -75)),
      openedAt: iso(addMinutes(anchor, -30)),
      completedAt: null,
      expiresAt: iso(addDays(anchor, 1)),
      requiredForBooking: true,
      createdAt: iso(addMinutes(anchor, -75)),
      updatedAt: iso(addMinutes(anchor, -30)),
    },
    {
      id: 'submission-pablo',
      tenantId,
      templateId: 'template-new-patient',
      patientId: 'patient-pablo-ortiz',
      threadId: 'thread-pablo-whatsapp',
      status: 'sent',
      answers: {},
      sentAt: iso(addMinutes(anchor, -48)),
      openedAt: null,
      completedAt: null,
      expiresAt: iso(addDays(anchor, 2)),
      requiredForBooking: true,
      createdAt: iso(addMinutes(anchor, -48)),
      updatedAt: iso(addMinutes(anchor, -48)),
    },
  ];

  const patientListItems = buildPatientListItems(patients, appointmentDetails, formSubmissions);
  const patientListMap = new Map(patientListItems.map((patient) => [patient.id, patient]));

  appointmentDetails.push(
    {
      id: 'appointment-ana',
      tenantId,
      patientId: 'patient-ana-garcia',
      externalAppointmentId: 'APPT-001',
      serviceId: 'service-first-visit',
      practitionerId: 'practitioner-ruiz',
      locationId: 'location-centro',
      threadId: 'thread-ana-whatsapp',
      status: 'scheduled',
      source: 'whatsapp',
      startsAt: iso(setTime(anchor, 10, 15)),
      endsAt: iso(setTime(anchor, 11, 0)),
      bookedAt: iso(addMinutes(anchor, -15)),
      confirmationStatus: 'pending',
      reminderStatus: 'scheduled',
      cancellationReason: null,
      metadata: { journey: 'new_patient_whatsapp' },
      createdAt: iso(addMinutes(anchor, -15)),
      updatedAt: generatedAt,
      patient: patientListMap.get('patient-ana-garcia') ?? null,
      service: services[0],
      practitioner: practitioners[0],
      location: locations[0],
      events: [
        {
          id: 'event-ana-created',
          tenantId,
          appointmentId: 'appointment-ana',
          eventType: 'created',
          actorType: 'ai',
          payload: { source: 'whatsapp' },
          createdAt: iso(addMinutes(anchor, -15)),
        },
      ],
    },
    {
      id: 'appointment-lucia',
      tenantId,
      patientId: 'patient-lucia-perez',
      externalAppointmentId: 'APPT-002',
      serviceId: 'service-ortho',
      practitionerId: 'practitioner-solis',
      locationId: 'location-centro',
      threadId: 'thread-lucia-whatsapp',
      status: 'rescheduled',
      source: 'whatsapp',
      startsAt: iso(setTime(addDays(anchor, 1), 13, 0)),
      endsAt: iso(setTime(addDays(anchor, 1), 13, 30)),
      bookedAt: iso(addDays(anchor, -10)),
      confirmationStatus: 'confirmed',
      reminderStatus: 'sent',
      cancellationReason: null,
      metadata: { journey: 'existing_patient_reschedule' },
      createdAt: iso(addDays(anchor, -10)),
      updatedAt: iso(addMinutes(anchor, -45)),
      patient: patientListMap.get('patient-lucia-perez') ?? null,
      service: services[2],
      practitioner: practitioners[1],
      location: locations[0],
      events: [
        {
          id: 'event-lucia-created',
          tenantId,
          appointmentId: 'appointment-lucia',
          eventType: 'created',
          actorType: 'human',
          payload: {},
          createdAt: iso(addDays(anchor, -10)),
        },
        {
          id: 'event-lucia-rescheduled',
          tenantId,
          appointmentId: 'appointment-lucia',
          eventType: 'rescheduled',
          actorType: 'patient',
          payload: { via: 'whatsapp' },
          createdAt: iso(addMinutes(anchor, -45)),
        },
      ],
    },
    {
      id: 'appointment-diego',
      tenantId,
      patientId: 'patient-diego-martin',
      externalAppointmentId: 'APPT-003',
      serviceId: 'service-hygiene',
      practitionerId: 'practitioner-ruiz',
      locationId: 'location-norte',
      threadId: null,
      status: 'confirmed',
      source: 'manual',
      startsAt: iso(setTime(anchor, 12, 0)),
      endsAt: iso(setTime(anchor, 12, 45)),
      bookedAt: iso(lastWeek),
      confirmationStatus: 'confirmed',
      reminderStatus: 'sent',
      cancellationReason: null,
      metadata: { journey: 'confirmed_same_day' },
      createdAt: iso(lastWeek),
      updatedAt: iso(addMinutes(anchor, -10)),
      patient: patientListMap.get('patient-diego-martin') ?? null,
      service: services[1],
      practitioner: practitioners[0],
      location: locations[1],
      events: [],
    },
    {
      id: 'appointment-marta',
      tenantId,
      patientId: 'patient-marta-sanchez',
      externalAppointmentId: 'APPT-004',
      serviceId: 'service-hygiene',
      practitionerId: 'practitioner-ruiz',
      locationId: 'location-centro',
      threadId: 'thread-marta-whatsapp',
      status: 'scheduled',
      source: 'manual',
      startsAt: iso(setTime(anchor, 16, 30)),
      endsAt: iso(setTime(anchor, 17, 15)),
      bookedAt: iso(twoDaysAgo),
      confirmationStatus: 'pending',
      reminderStatus: 'scheduled',
      cancellationReason: null,
      metadata: { journey: 'pending_confirmation' },
      createdAt: iso(twoDaysAgo),
      updatedAt: generatedAt,
      patient: patientListMap.get('patient-marta-sanchez') ?? null,
      service: services[1],
      practitioner: practitioners[0],
      location: locations[0],
      events: [],
    },
    {
      id: 'appointment-javier',
      tenantId,
      patientId: 'patient-javier-torres',
      externalAppointmentId: 'APPT-005',
      serviceId: 'service-hygiene',
      practitionerId: 'practitioner-ruiz',
      locationId: 'location-centro',
      threadId: 'thread-javier-whatsapp',
      status: 'cancelled',
      source: 'manual',
      startsAt: iso(setTime(anchor, 11, 30)),
      endsAt: iso(setTime(anchor, 12, 15)),
      bookedAt: iso(addDays(anchor, -8)),
      confirmationStatus: 'declined',
      reminderStatus: 'completed',
      cancellationReason: 'Viaje de trabajo',
      metadata: { journey: 'cancelled_gap_origin' },
      createdAt: iso(addDays(anchor, -8)),
      updatedAt: iso(addMinutes(anchor, -42)),
      patient: patientListMap.get('patient-javier-torres') ?? null,
      service: services[1],
      practitioner: practitioners[0],
      location: locations[0],
      events: [
        {
          id: 'event-javier-cancelled',
          tenantId,
          appointmentId: 'appointment-javier',
          eventType: 'cancelled',
          actorType: 'patient',
          payload: { reason: 'travel' },
          createdAt: iso(addMinutes(anchor, -42)),
        },
      ],
    },
    {
      id: 'appointment-carmen',
      tenantId,
      patientId: 'patient-carmen-lopez',
      externalAppointmentId: 'APPT-006',
      serviceId: 'service-hygiene',
      practitionerId: 'practitioner-ruiz',
      locationId: 'location-norte',
      threadId: null,
      status: 'scheduled',
      source: 'campaign',
      startsAt: iso(setTime(nextWeek, 10, 0)),
      endsAt: iso(setTime(nextWeek, 10, 45)),
      bookedAt: iso(addHours(yesterday, 18)),
      confirmationStatus: 'pending',
      reminderStatus: 'pending',
      cancellationReason: null,
      metadata: { journey: 'reactivation_booked' },
      createdAt: iso(addHours(yesterday, 18)),
      updatedAt: generatedAt,
      patient: patientListMap.get('patient-carmen-lopez') ?? null,
      service: services[1],
      practitioner: practitioners[0],
      location: locations[1],
      events: [
        {
          id: 'event-carmen-booked',
          tenantId,
          appointmentId: 'appointment-carmen',
          eventType: 'booked_from_campaign',
          actorType: 'ai',
          payload: { campaignId: 'campaign-hygiene-recall' },
          createdAt: iso(addHours(yesterday, 18)),
        },
      ],
    }
  );

  const refreshedPatientListItems = buildPatientListItems(
    patients,
    appointmentDetails,
    formSubmissions
  );
  const refreshedPatientListMap = new Map(
    refreshedPatientListItems.map((patient) => [patient.id, patient])
  );
  for (const appointment of appointmentDetails) {
    appointment.patient = refreshedPatientListMap.get(appointment.patientId) ?? null;
  }

  const messages: ConversationMessage[] = [
    {
      id: 'message-ana-1',
      tenantId,
      threadId: 'thread-ana-whatsapp',
      patientId: 'patient-ana-garcia',
      direction: 'inbound',
      channelType: 'whatsapp',
      messageType: 'text',
      body: 'Hola, soy nueva paciente y necesito una revision esta semana.',
      payload: {},
      deliveryStatus: 'received',
      providerMessageId: 'wa-ana-1',
      sentAt: null,
      receivedAt: iso(addMinutes(anchor, -40)),
      createdAt: iso(addMinutes(anchor, -40)),
    },
    {
      id: 'message-ana-2',
      tenantId,
      threadId: 'thread-ana-whatsapp',
      patientId: 'patient-ana-garcia',
      direction: 'outbound',
      channelType: 'whatsapp',
      messageType: 'form_link',
      body: 'Te envio el formulario de nuevo paciente para avanzar la reserva.',
      payload: {},
      deliveryStatus: 'delivered',
      providerMessageId: 'wa-ana-2',
      sentAt: iso(addMinutes(anchor, -38)),
      receivedAt: null,
      createdAt: iso(addMinutes(anchor, -38)),
    },
    {
      id: 'message-ana-3',
      tenantId,
      threadId: 'thread-ana-whatsapp',
      patientId: 'patient-ana-garcia',
      direction: 'inbound',
      channelType: 'whatsapp',
      messageType: 'text',
      body: 'Listo, ya lo complete.',
      payload: {},
      deliveryStatus: 'read',
      providerMessageId: 'wa-ana-3',
      sentAt: null,
      receivedAt: iso(addMinutes(anchor, -18)),
      createdAt: iso(addMinutes(anchor, -18)),
    },
    {
      id: 'message-ana-4',
      tenantId,
      threadId: 'thread-ana-whatsapp',
      patientId: 'patient-ana-garcia',
      direction: 'outbound',
      channelType: 'whatsapp',
      messageType: 'text',
      body: 'Perfecto, te reservo hoy a las 10:15 con la Dra. Elena Ruiz.',
      payload: {},
      deliveryStatus: 'sent',
      providerMessageId: 'wa-ana-4',
      sentAt: iso(addMinutes(anchor, -15)),
      receivedAt: null,
      createdAt: iso(addMinutes(anchor, -15)),
    },
    {
      id: 'message-lucia-1',
      tenantId,
      threadId: 'thread-lucia-whatsapp',
      patientId: 'patient-lucia-perez',
      direction: 'inbound',
      channelType: 'whatsapp',
      messageType: 'text',
      body: 'Necesito mover mi control de ortodoncia a manana.',
      payload: {},
      deliveryStatus: 'received',
      providerMessageId: 'wa-lucia-1',
      sentAt: null,
      receivedAt: iso(addMinutes(anchor, -64)),
      createdAt: iso(addMinutes(anchor, -64)),
    },
    {
      id: 'message-lucia-2',
      tenantId,
      threadId: 'thread-lucia-whatsapp',
      patientId: 'patient-lucia-perez',
      direction: 'outbound',
      channelType: 'whatsapp',
      messageType: 'text',
      body: 'Puedo ofrecerte manana a las 13:00. Si quieres, tambien te llamo.',
      payload: {},
      deliveryStatus: 'delivered',
      providerMessageId: 'wa-lucia-2',
      sentAt: iso(addMinutes(anchor, -58)),
      receivedAt: null,
      createdAt: iso(addMinutes(anchor, -58)),
    },
    {
      id: 'message-lucia-3',
      tenantId,
      threadId: 'thread-lucia-whatsapp',
      patientId: 'patient-lucia-perez',
      direction: 'inbound',
      channelType: 'whatsapp',
      messageType: 'text',
      body: 'Si puedes llamarme mejor, voy entrando a consulta.',
      payload: {},
      deliveryStatus: 'read',
      providerMessageId: 'wa-lucia-3',
      sentAt: null,
      receivedAt: iso(addMinutes(anchor, -50)),
      createdAt: iso(addMinutes(anchor, -50)),
    },
    {
      id: 'message-marta-1',
      tenantId,
      threadId: 'thread-marta-whatsapp',
      patientId: 'patient-marta-sanchez',
      direction: 'outbound',
      channelType: 'whatsapp',
      messageType: 'template',
      body: 'Te recordamos tu revision de hoy a las 16:30. Confirmanos si vienes.',
      payload: {},
      deliveryStatus: 'delivered',
      providerMessageId: 'wa-marta-1',
      sentAt: iso(addMinutes(anchor, -25)),
      receivedAt: null,
      createdAt: iso(addMinutes(anchor, -25)),
    },
    {
      id: 'message-javier-1',
      tenantId,
      threadId: 'thread-javier-whatsapp',
      patientId: 'patient-javier-torres',
      direction: 'inbound',
      channelType: 'whatsapp',
      messageType: 'text',
      body: 'Hoy no llego a la higiene. Si se libera otro hueco esta semana me viene bien.',
      payload: {},
      deliveryStatus: 'received',
      providerMessageId: 'wa-javier-1',
      sentAt: null,
      receivedAt: iso(addMinutes(anchor, -44)),
      createdAt: iso(addMinutes(anchor, -44)),
    },
    {
      id: 'message-javier-2',
      tenantId,
      threadId: 'thread-javier-whatsapp',
      patientId: 'patient-javier-torres',
      direction: 'outbound',
      channelType: 'whatsapp',
      messageType: 'text',
      body: 'Entendido. Te avisamos si aparece una opcion parecida esta misma semana.',
      payload: {},
      deliveryStatus: 'delivered',
      providerMessageId: 'wa-javier-2',
      sentAt: iso(addMinutes(anchor, -42)),
      receivedAt: null,
      createdAt: iso(addMinutes(anchor, -42)),
    },
    {
      id: 'message-elena-1',
      tenantId,
      threadId: 'thread-elena-whatsapp',
      patientId: 'patient-elena-diaz',
      direction: 'outbound',
      channelType: 'whatsapp',
      messageType: 'template',
      body: 'Se acaba de liberar hoy a las 11:30 una higiene. Te interesa?',
      payload: {},
      deliveryStatus: 'sent',
      providerMessageId: 'wa-elena-1',
      sentAt: iso(addMinutes(anchor, -8)),
      receivedAt: null,
      createdAt: iso(addMinutes(anchor, -8)),
    },
    {
      id: 'message-sofia-1',
      tenantId,
      threadId: 'thread-sofia-whatsapp',
      patientId: 'patient-sofia-romero',
      direction: 'outbound',
      channelType: 'whatsapp',
      messageType: 'form_link',
      body: 'Te comparto el formulario medico para cerrar la primera visita.',
      payload: {},
      deliveryStatus: 'delivered',
      providerMessageId: 'wa-sofia-1',
      sentAt: iso(addMinutes(anchor, -75)),
      receivedAt: null,
      createdAt: iso(addMinutes(anchor, -75)),
    },
    {
      id: 'message-sofia-2',
      tenantId,
      threadId: 'thread-sofia-whatsapp',
      patientId: 'patient-sofia-romero',
      direction: 'inbound',
      channelType: 'whatsapp',
      messageType: 'text',
      body: 'Lo empece, pero me falta revisar la parte del seguro.',
      payload: {},
      deliveryStatus: 'read',
      providerMessageId: 'wa-sofia-2',
      sentAt: null,
      receivedAt: iso(addMinutes(anchor, -30)),
      createdAt: iso(addMinutes(anchor, -30)),
    },
    {
      id: 'message-pablo-1',
      tenantId,
      threadId: 'thread-pablo-whatsapp',
      patientId: 'patient-pablo-ortiz',
      direction: 'inbound',
      channelType: 'whatsapp',
      messageType: 'text',
      body: 'Quiero valorar un implante. Que necesitais para darme cita?',
      payload: {},
      deliveryStatus: 'received',
      providerMessageId: 'wa-pablo-1',
      sentAt: null,
      receivedAt: iso(addMinutes(anchor, -49)),
      createdAt: iso(addMinutes(anchor, -49)),
    },
    {
      id: 'message-pablo-2',
      tenantId,
      threadId: 'thread-pablo-whatsapp',
      patientId: 'patient-pablo-ortiz',
      direction: 'outbound',
      channelType: 'whatsapp',
      messageType: 'form_link',
      body: 'Con este formulario ya te dejamos preparada la primera valoracion.',
      payload: {},
      deliveryStatus: 'delivered',
      providerMessageId: 'wa-pablo-2',
      sentAt: iso(addMinutes(anchor, -48)),
      receivedAt: null,
      createdAt: iso(addMinutes(anchor, -48)),
    },
    {
      id: 'message-lucia-voice-1',
      tenantId,
      threadId: 'thread-lucia-voice',
      patientId: 'patient-lucia-perez',
      direction: 'inbound',
      channelType: 'voice',
      messageType: 'call_summary',
      body: 'Llamada de Lucia Perez: solicita callback para cerrar la nueva hora.',
      payload: {},
      deliveryStatus: 'received',
      providerMessageId: 'voice-lucia-1',
      sentAt: null,
      receivedAt: iso(addMinutes(anchor, -42)),
      createdAt: iso(addMinutes(anchor, -42)),
    },
    {
      id: 'message-diego-voice-1',
      tenantId,
      threadId: 'thread-diego-voice',
      patientId: 'patient-diego-martin',
      direction: 'inbound',
      channelType: 'voice',
      messageType: 'call_summary',
      body: 'Llamada resuelta: dudas sobre seguro y acceso al parking.',
      payload: {},
      deliveryStatus: 'received',
      providerMessageId: 'voice-diego-1',
      sentAt: null,
      receivedAt: iso(addMinutes(anchor, 5)),
      createdAt: iso(addMinutes(anchor, 5)),
    },
    {
      id: 'message-marta-voice-1',
      tenantId,
      threadId: 'thread-marta-voice',
      patientId: 'patient-marta-sanchez',
      direction: 'outbound',
      channelType: 'voice',
      messageType: 'call_summary',
      body: 'Callback completado: Marta confirma que intentara responder por WhatsApp.',
      payload: {},
      deliveryStatus: 'sent',
      providerMessageId: 'voice-marta-1',
      sentAt: iso(addMinutes(anchor, -20)),
      receivedAt: null,
      createdAt: iso(addMinutes(anchor, -20)),
    },
  ];

  const threadMessages = new Map<string, ConversationMessage[]>();
  for (const message of messages) {
    const current = threadMessages.get(message.threadId) ?? [];
    current.push(message);
    current.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    threadMessages.set(message.threadId, current);
  }

  const threads: ConversationThreadDetail[] = [
    {
      id: 'thread-ana-whatsapp',
      tenantId,
      patientId: 'patient-ana-garcia',
      channelType: 'whatsapp',
      status: 'in_progress',
      intent: 'new_patient',
      priority: 'high',
      source: 'whatsapp',
      assignedUserId: null,
      lastMessageAt: iso(addMinutes(anchor, -15)),
      lastInboundAt: iso(addMinutes(anchor, -18)),
      lastOutboundAt: iso(addMinutes(anchor, -15)),
      requiresHumanReview: false,
      resolution: null,
      createdAt: iso(addMinutes(anchor, -40)),
      updatedAt: generatedAt,
      patient: patientMap.get('patient-ana-garcia') ?? null,
      messages: threadMessages.get('thread-ana-whatsapp') ?? [],
    },
    {
      id: 'thread-lucia-whatsapp',
      tenantId,
      patientId: 'patient-lucia-perez',
      channelType: 'whatsapp',
      status: 'in_progress',
      intent: 'reschedule_appointment',
      priority: 'urgent',
      source: 'whatsapp',
      assignedUserId: 'staff-front-desk',
      lastMessageAt: iso(addMinutes(anchor, -50)),
      lastInboundAt: iso(addMinutes(anchor, -50)),
      lastOutboundAt: iso(addMinutes(anchor, -58)),
      requiresHumanReview: false,
      resolution: null,
      createdAt: iso(addMinutes(anchor, -64)),
      updatedAt: generatedAt,
      patient: patientMap.get('patient-lucia-perez') ?? null,
      messages: threadMessages.get('thread-lucia-whatsapp') ?? [],
    },
    {
      id: 'thread-lucia-voice',
      tenantId,
      patientId: 'patient-lucia-perez',
      channelType: 'voice',
      status: 'pending_human',
      intent: 'human_handoff',
      priority: 'urgent',
      source: 'voice',
      assignedUserId: 'staff-front-desk',
      lastMessageAt: iso(addMinutes(anchor, -42)),
      lastInboundAt: iso(addMinutes(anchor, -42)),
      lastOutboundAt: null,
      requiresHumanReview: true,
      resolution: null,
      createdAt: iso(addMinutes(anchor, -42)),
      updatedAt: generatedAt,
      patient: patientMap.get('patient-lucia-perez') ?? null,
      messages: threadMessages.get('thread-lucia-voice') ?? [],
    },
    {
      id: 'thread-marta-whatsapp',
      tenantId,
      patientId: 'patient-marta-sanchez',
      channelType: 'whatsapp',
      status: 'pending_human',
      intent: 'existing_patient',
      priority: 'normal',
      source: 'confirmation_queue',
      assignedUserId: 'staff-front-desk',
      lastMessageAt: iso(addMinutes(anchor, -25)),
      lastInboundAt: null,
      lastOutboundAt: iso(addMinutes(anchor, -25)),
      requiresHumanReview: true,
      resolution: null,
      createdAt: iso(addHours(anchor, -2)),
      updatedAt: generatedAt,
      patient: patientMap.get('patient-marta-sanchez') ?? null,
      messages: threadMessages.get('thread-marta-whatsapp') ?? [],
    },
    {
      id: 'thread-javier-whatsapp',
      tenantId,
      patientId: 'patient-javier-torres',
      channelType: 'whatsapp',
      status: 'pending_human',
      intent: 'cancel_appointment',
      priority: 'high',
      source: 'whatsapp',
      assignedUserId: 'staff-front-desk',
      lastMessageAt: iso(addMinutes(anchor, -42)),
      lastInboundAt: iso(addMinutes(anchor, -44)),
      lastOutboundAt: iso(addMinutes(anchor, -42)),
      requiresHumanReview: true,
      resolution: null,
      createdAt: iso(addMinutes(anchor, -44)),
      updatedAt: generatedAt,
      patient: patientMap.get('patient-javier-torres') ?? null,
      messages: threadMessages.get('thread-javier-whatsapp') ?? [],
    },
    {
      id: 'thread-elena-whatsapp',
      tenantId,
      patientId: 'patient-elena-diaz',
      channelType: 'whatsapp',
      status: 'in_progress',
      intent: 'request_gap_fill',
      priority: 'high',
      source: 'gap_fill',
      assignedUserId: null,
      lastMessageAt: iso(addMinutes(anchor, -8)),
      lastInboundAt: null,
      lastOutboundAt: iso(addMinutes(anchor, -8)),
      requiresHumanReview: false,
      resolution: null,
      createdAt: iso(addMinutes(anchor, -8)),
      updatedAt: generatedAt,
      patient: patientMap.get('patient-elena-diaz') ?? null,
      messages: threadMessages.get('thread-elena-whatsapp') ?? [],
    },
    {
      id: 'thread-sofia-whatsapp',
      tenantId,
      patientId: 'patient-sofia-romero',
      channelType: 'whatsapp',
      status: 'pending_form',
      intent: 'new_patient',
      priority: 'normal',
      source: 'whatsapp',
      assignedUserId: null,
      lastMessageAt: iso(addMinutes(anchor, -30)),
      lastInboundAt: iso(addMinutes(anchor, -30)),
      lastOutboundAt: iso(addMinutes(anchor, -75)),
      requiresHumanReview: false,
      resolution: null,
      createdAt: iso(addMinutes(anchor, -75)),
      updatedAt: generatedAt,
      patient: patientMap.get('patient-sofia-romero') ?? null,
      messages: threadMessages.get('thread-sofia-whatsapp') ?? [],
    },
    {
      id: 'thread-pablo-whatsapp',
      tenantId,
      patientId: 'patient-pablo-ortiz',
      channelType: 'whatsapp',
      status: 'pending_form',
      intent: 'new_patient',
      priority: 'normal',
      source: 'whatsapp',
      assignedUserId: null,
      lastMessageAt: iso(addMinutes(anchor, -48)),
      lastInboundAt: iso(addMinutes(anchor, -49)),
      lastOutboundAt: iso(addMinutes(anchor, -48)),
      requiresHumanReview: false,
      resolution: null,
      createdAt: iso(addMinutes(anchor, -49)),
      updatedAt: generatedAt,
      patient: patientMap.get('patient-pablo-ortiz') ?? null,
      messages: threadMessages.get('thread-pablo-whatsapp') ?? [],
    },
    {
      id: 'thread-diego-voice',
      tenantId,
      patientId: 'patient-diego-martin',
      channelType: 'voice',
      status: 'resolved',
      intent: 'faq',
      priority: 'low',
      source: 'voice',
      assignedUserId: null,
      lastMessageAt: iso(addMinutes(anchor, 5)),
      lastInboundAt: iso(addMinutes(anchor, 5)),
      lastOutboundAt: null,
      requiresHumanReview: false,
      resolution: 'AI resolvio dudas operativas',
      createdAt: iso(addMinutes(anchor, 5)),
      updatedAt: generatedAt,
      patient: patientMap.get('patient-diego-martin') ?? null,
      messages: threadMessages.get('thread-diego-voice') ?? [],
    },
    {
      id: 'thread-marta-voice',
      tenantId,
      patientId: 'patient-marta-sanchez',
      channelType: 'voice',
      status: 'closed',
      intent: 'human_handoff',
      priority: 'normal',
      source: 'voice',
      assignedUserId: 'staff-front-desk',
      lastMessageAt: iso(addMinutes(anchor, -20)),
      lastInboundAt: null,
      lastOutboundAt: iso(addMinutes(anchor, -20)),
      requiresHumanReview: false,
      resolution: 'Callback completado',
      createdAt: iso(addMinutes(anchor, -20)),
      updatedAt: generatedAt,
      patient: patientMap.get('patient-marta-sanchez') ?? null,
      messages: threadMessages.get('thread-marta-voice') ?? [],
    },
  ];

  const threadListItems = buildThreadListItems(threads, refreshedPatientListItems);
  const threadMap = new Map(threads.map((thread) => [thread.id, thread]));

  const calls: CallSessionDetail[] = [
    {
      id: 'call-lucia',
      tenantId,
      patientId: 'patient-lucia-perez',
      threadId: 'thread-lucia-voice',
      direction: 'inbound',
      status: 'callback_required',
      providerCallId: 'voice-call-lucia',
      fromNumber: '+34600101011',
      toNumber: '+34910000002',
      startedAt: iso(addMinutes(anchor, -43)),
      endedAt: iso(addMinutes(anchor, -40)),
      durationSeconds: 180,
      summary: 'Lucia necesita reprogramar y pide llamada de vuelta para confirmar la hora.',
      transcript: 'Hola, entro a una reunion. Si me llamais en un rato cierro la nueva cita.',
      resolution: 'Pendiente de callback por el equipo.',
      requiresHumanReview: true,
      createdAt: iso(addMinutes(anchor, -43)),
      updatedAt: generatedAt,
      patient: patientMap.get('patient-lucia-perez') ?? null,
      thread: stripThread(threadMap.get('thread-lucia-voice')!),
    },
    {
      id: 'call-diego',
      tenantId,
      patientId: 'patient-diego-martin',
      threadId: 'thread-diego-voice',
      direction: 'inbound',
      status: 'handled_by_ai',
      providerCallId: 'voice-call-diego',
      fromNumber: '+34600101013',
      toNumber: '+34910000002',
      startedAt: iso(addMinutes(anchor, 2)),
      endedAt: iso(addMinutes(anchor, 5)),
      durationSeconds: 190,
      summary: 'Consulta breve resuelta por IA sobre parking y seguro.',
      transcript: 'Queria confirmar si puedo aparcar cerca y si aceptais el seguro dental.',
      resolution: 'Resolved by AI',
      requiresHumanReview: false,
      createdAt: iso(addMinutes(anchor, 2)),
      updatedAt: generatedAt,
      patient: patientMap.get('patient-diego-martin') ?? null,
      thread: stripThread(threadMap.get('thread-diego-voice')!),
    },
    {
      id: 'call-marta',
      tenantId,
      patientId: 'patient-marta-sanchez',
      threadId: 'thread-marta-voice',
      direction: 'outbound',
      status: 'closed',
      providerCallId: 'voice-call-marta',
      fromNumber: '+34910000002',
      toNumber: '+34600101014',
      startedAt: iso(addMinutes(anchor, -23)),
      endedAt: iso(addMinutes(anchor, -20)),
      durationSeconds: 175,
      summary: 'Callback de seguimiento tras no responder al recordatorio.',
      transcript: 'Te llamamos para confirmar la revision. Nos dices que responderas por WhatsApp.',
      resolution: 'Follow-up closed',
      requiresHumanReview: false,
      createdAt: iso(addMinutes(anchor, -23)),
      updatedAt: generatedAt,
      patient: patientMap.get('patient-marta-sanchez') ?? null,
      thread: stripThread(threadMap.get('thread-marta-voice')!),
    },
  ];

  const reminders: ReminderJob[] = [
    {
      id: 'reminder-ana',
      tenantId,
      appointmentId: 'appointment-ana',
      channelType: 'whatsapp',
      status: 'scheduled',
      scheduledFor: iso(addMinutes(anchor, 10)),
      sentAt: null,
      templateKey: 'appointment-reminder-1h',
      attemptCount: 0,
      lastError: null,
      createdAt: generatedAt,
      updatedAt: generatedAt,
    },
    {
      id: 'reminder-marta',
      tenantId,
      appointmentId: 'appointment-marta',
      channelType: 'whatsapp',
      status: 'scheduled',
      scheduledFor: iso(addHours(anchor, 3)),
      sentAt: null,
      templateKey: 'appointment-reminder-4h',
      attemptCount: 0,
      lastError: null,
      createdAt: generatedAt,
      updatedAt: generatedAt,
    },
  ];

  const confirmations: ConfirmationRequest[] = [
    {
      id: 'confirmation-ana',
      tenantId,
      appointmentId: 'appointment-ana',
      channelType: 'whatsapp',
      status: 'pending',
      requestedAt: iso(addMinutes(anchor, -10)),
      dueAt: iso(addHours(anchor, 3)),
      respondedAt: null,
      responsePayload: {},
      createdAt: iso(addMinutes(anchor, -10)),
      updatedAt: generatedAt,
    },
    {
      id: 'confirmation-lucia',
      tenantId,
      appointmentId: 'appointment-lucia',
      channelType: 'whatsapp',
      status: 'confirmed',
      requestedAt: iso(addHours(yesterday, 11)),
      dueAt: iso(addHours(yesterday, 18)),
      respondedAt: iso(addHours(yesterday, 12)),
      responsePayload: { reply: 'confirm' },
      createdAt: iso(addHours(yesterday, 11)),
      updatedAt: iso(addHours(yesterday, 12)),
    },
    {
      id: 'confirmation-diego',
      tenantId,
      appointmentId: 'appointment-diego',
      channelType: 'whatsapp',
      status: 'confirmed',
      requestedAt: iso(addHours(yesterday, 9)),
      dueAt: iso(addHours(yesterday, 19)),
      respondedAt: iso(addHours(yesterday, 10)),
      responsePayload: { reply: 'confirm' },
      createdAt: iso(addHours(yesterday, 9)),
      updatedAt: iso(addHours(yesterday, 10)),
    },
    {
      id: 'confirmation-marta',
      tenantId,
      appointmentId: 'appointment-marta',
      channelType: 'whatsapp',
      status: 'pending',
      requestedAt: iso(addMinutes(anchor, -25)),
      dueAt: iso(addHours(anchor, 4)),
      respondedAt: null,
      responsePayload: {},
      createdAt: iso(addMinutes(anchor, -25)),
      updatedAt: generatedAt,
    },
  ];

  const gaps: GapOpportunityDetail[] = [
    {
      id: 'gap-javier',
      tenantId,
      originAppointmentId: 'appointment-javier',
      serviceId: 'service-hygiene',
      practitionerId: 'practitioner-ruiz',
      locationId: 'location-centro',
      startsAt: iso(setTime(anchor, 11, 30)),
      endsAt: iso(setTime(anchor, 12, 15)),
      status: 'open',
      origin: 'cancellation',
      createdAt: iso(addMinutes(anchor, -42)),
      updatedAt: generatedAt,
      outreachAttempts: [
        {
          id: 'gap-outreach-elena',
          tenantId,
          gapOpportunityId: 'gap-javier',
          patientId: 'patient-elena-diaz',
          channelType: 'whatsapp',
          status: 'sent',
          sentAt: iso(addMinutes(anchor, -8)),
          respondedAt: null,
          result: 'Awaiting reply',
          metadata: { waitlistRequestId: 'waitlist-elena' },
          createdAt: iso(addMinutes(anchor, -8)),
        },
      ],
    },
  ];

  const campaigns: ReactivationCampaign[] = [
    {
      id: 'campaign-hygiene-recall',
      tenantId,
      name: 'Revisiones de higiene de primavera',
      campaignType: 'hygiene_recall',
      status: 'running',
      audienceDefinition: { inactivityDays: 180, channel: 'whatsapp' },
      messageTemplate: {
        body: 'Hola {{firstName}}, se acerca tu revision de higiene. Quieres que te propongamos huecos?',
      },
      channelPolicy: { primaryChannel: 'whatsapp', fallbackChannel: 'email' },
      scheduledAt: iso(yesterday),
      startedAt: iso(addHours(yesterday, 7)),
      completedAt: null,
      createdAt: iso(twoDaysAgo),
      updatedAt: generatedAt,
    },
  ];

  const recipients: ReactivationRecipient[] = [
    {
      id: 'recipient-carmen',
      tenantId,
      campaignId: 'campaign-hygiene-recall',
      patientId: 'patient-carmen-lopez',
      status: 'booked',
      lastContactAt: iso(addHours(yesterday, 8)),
      lastResponseAt: iso(addHours(yesterday, 18)),
      result: 'Booked hygiene visit',
      generatedAppointmentId: 'appointment-carmen',
      metadata: { channelType: 'whatsapp' },
      createdAt: iso(addHours(yesterday, 7)),
    },
    {
      id: 'recipient-laura',
      tenantId,
      campaignId: 'campaign-hygiene-recall',
      patientId: 'patient-laura-gomez',
      status: 'contacted',
      lastContactAt: iso(addHours(yesterday, 9)),
      lastResponseAt: null,
      result: 'Awaiting reply',
      generatedAppointmentId: null,
      metadata: { channelType: 'whatsapp' },
      createdAt: iso(addHours(yesterday, 7)),
    },
    {
      id: 'recipient-raul',
      tenantId,
      campaignId: 'campaign-hygiene-recall',
      patientId: 'patient-raul-ibanez',
      status: 'failed',
      lastContactAt: iso(addHours(yesterday, 9)),
      lastResponseAt: null,
      result: 'Number unreachable',
      generatedAppointmentId: null,
      metadata: { channelType: 'whatsapp' },
      createdAt: iso(addHours(yesterday, 7)),
    },
  ];

  const campaignDetails: ReactivationCampaignDetail[] = campaigns.map((campaign) => ({
    ...campaign,
    recipients: recipients.filter((recipient) => recipient.campaignId === campaign.id),
  }));

  const tenantExperience: TenantExperience = {
    tenantId,
    activeVertical: 'clinic',
    shellKey: 'clinic',
    defaultRoute: `/app/${tenantId}/dashboard`,
    role: 'admin',
    normalizedRole: 'admin',
    permissions: [
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
    ],
    allowedNavigation: [
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
      'configuration',
    ],
    modules: clinicModules,
    flags: {
      activeVertical: 'clinic',
      isPlatformAdminTenant: false,
      adminConsoleEnabled: false,
      verticalClinicUi: true,
      clinicDentalMode: true,
      voiceInboundEnabled: true,
      voiceOutboundEnabled: true,
      whatsappOutboundEnabled: true,
      intakeFormsEnabled: true,
      appointmentConfirmationsEnabled: true,
      smartGapFillEnabled: true,
      reactivationEnabled: true,
      advancedClinicModeEnabled: false,
      internalPlatformVisible: false,
    },
    featureDecisions: {
      voiceInboundEnabled: {
        enabled: true,
        source: 'readiness',
        moduleKey: 'voice',
        channelType: 'voice',
      },
      voiceOutboundEnabled: {
        enabled: true,
        source: 'readiness',
        moduleKey: 'voice',
        channelType: 'voice',
      },
      whatsappOutboundEnabled: {
        enabled: true,
        source: 'readiness',
        moduleKey: 'core_reception',
        channelType: 'whatsapp',
      },
      intakeFormsEnabled: {
        enabled: true,
        source: 'readiness',
        moduleKey: 'core_reception',
      },
      appointmentConfirmationsEnabled: {
        enabled: true,
        source: 'readiness',
        moduleKey: 'core_reception',
      },
      smartGapFillEnabled: {
        enabled: true,
        source: 'readiness',
        moduleKey: 'growth',
      },
      reactivationEnabled: {
        enabled: true,
        source: 'readiness',
        moduleKey: 'growth',
      },
      advancedClinicModeEnabled: {
        enabled: false,
        source: 'entitlement',
        reason: 'not_in_plan',
        moduleKey: 'advanced_mode',
      },
      internalPlatformVisible: {
        enabled: false,
        source: 'internal_access',
        reason: 'hidden_internal_only',
        moduleKey: 'internal_platform',
      },
      adminConsoleEnabled: {
        enabled: false,
        source: 'internal_access',
        reason: 'hidden_internal_only',
      },
    },
    settingsSections: [
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
    ],
    canAccessInternalPlatform: false,
    canAccessAdminConsole: false,
  };

  const experience: ClinicExperience = {
    tenantId,
    isClinicTenant: true,
    defaultMode: 'clinic',
    role: 'admin',
    normalizedRole: 'admin',
    isInternalUser: false,
    permissions: tenantExperience.permissions.filter(
      (permission): permission is ClinicExperience['permissions'][number] =>
        permission !== 'view_admin_console'
    ),
    flags: {
      verticalClinicUi: tenantExperience.flags.verticalClinicUi,
      clinicDentalMode: tenantExperience.flags.clinicDentalMode,
      voiceInboundEnabled: tenantExperience.flags.voiceInboundEnabled,
      voiceOutboundEnabled: tenantExperience.flags.voiceOutboundEnabled,
      whatsappOutboundEnabled: tenantExperience.flags.whatsappOutboundEnabled,
      intakeFormsEnabled: tenantExperience.flags.intakeFormsEnabled,
      appointmentConfirmationsEnabled: tenantExperience.flags.appointmentConfirmationsEnabled,
      smartGapFillEnabled: tenantExperience.flags.smartGapFillEnabled,
      reactivationEnabled: tenantExperience.flags.reactivationEnabled,
      advancedClinicModeEnabled: tenantExperience.flags.advancedClinicModeEnabled,
      internalPlatformVisible: tenantExperience.flags.internalPlatformVisible,
    },
    modules: tenantExperience.modules,
    allowedNavigation: tenantExperience.allowedNavigation.filter(
      (key): key is ClinicExperience['allowedNavigation'][number] => key !== 'admin_console'
    ),
  };

  const dashboard = buildDashboard(
    tenantId,
    generatedAt,
    refreshedPatientListItems,
    threadListItems,
    appointmentDetails,
    formSubmissions,
    confirmations,
    gaps,
    campaigns
  );

  const summary: ClinicDemoFixtureSummary = {
    counts: {
      patients: patients.length,
      whatsappThreads: threads.filter((thread) => thread.channelType === 'whatsapp').length,
      voiceThreads: threads.filter((thread) => thread.channelType === 'voice').length,
      calls: calls.length,
      forms: formSubmissions.length,
      appointments: appointmentDetails.length,
      confirmationsPending: confirmations.filter(
        (confirmation) => confirmation.status === 'pending'
      ).length,
      activeGaps: gaps.filter((gap) => gap.status === 'open' || gap.status === 'offered').length,
      activeCampaigns: campaigns.filter((campaign) => campaign.status === 'running').length,
    },
    journeys: {
      newPatient: {
        patientId: 'patient-ana-garcia',
        threadId: 'thread-ana-whatsapp',
        submissionId: 'submission-ana',
        appointmentId: 'appointment-ana',
      },
      reschedule: {
        patientId: 'patient-lucia-perez',
        whatsappThreadId: 'thread-lucia-whatsapp',
        voiceThreadId: 'thread-lucia-voice',
        appointmentId: 'appointment-lucia',
      },
      confirmation: {
        pendingAppointmentIds: ['appointment-ana', 'appointment-marta'],
        confirmedAppointmentIds: ['appointment-lucia', 'appointment-diego'],
      },
      gapRecovery: {
        gapId: 'gap-javier',
        cancelledAppointmentId: 'appointment-javier',
        candidatePatientId: 'patient-elena-diaz',
        outreachAttemptId: 'gap-outreach-elena',
      },
      reactivation: {
        campaignId: 'campaign-hygiene-recall',
        bookedRecipientId: 'recipient-carmen',
        contactedRecipientId: 'recipient-laura',
        failedRecipientId: 'recipient-raul',
        generatedAppointmentId: 'appointment-carmen',
      },
      internalMode: {
        demoWorkspaceInternalVisible: false,
      },
    },
  };

  return {
    tenantId,
    generatedAt,
    profile: clinicProfile,
    modules: clinicModules,
    channels: clinicChannels,
    services,
    practitioners,
    locations,
    patients,
    patientListItems: refreshedPatientListItems,
    patientIdentities,
    threads,
    threadListItems,
    messages,
    calls,
    formTemplates,
    formSubmissions,
    appointments: appointmentDetails,
    waitlistRequests,
    reminders,
    confirmations,
    gaps,
    campaigns,
    campaignDetails,
    recipients,
    dashboard,
    tenantExperience,
    experience,
    summary,
  };
}
