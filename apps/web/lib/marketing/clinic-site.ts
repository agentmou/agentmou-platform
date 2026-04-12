export interface MarketingStat {
  value: string;
  label: string;
}

export interface MarketingPainPoint {
  title: string;
  description: string;
  impact: string;
}

export interface MarketingBenchmarkMetric {
  value: string;
  label: string;
  explanation: string;
  note?: string;
}

export interface MarketingJobSection {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
}

export interface MarketingHowItWorksCard {
  title: string;
  description: string;
  bullets: string[];
}

export interface MarketingFlowPath {
  title: string;
  description: string;
  steps: string[];
  accent: string;
}

export interface MarketingJourneyOutcome {
  label: string;
  value: string;
}

export interface MarketingPatientJourney {
  title: string;
  description: string;
  steps: string[];
  outcomes: MarketingJourneyOutcome[];
}

export interface MarketingShowcaseCard {
  title: string;
  badge: string;
  body: string;
  detail: string;
}

export interface MarketingProofPanel {
  eyebrow: string;
  title: string;
  description: string;
  stats: readonly MarketingStat[];
  highlights: string[];
}

export interface MarketingRecoveryCapability {
  title: string;
  description: string;
  outcome: string;
}

export interface MarketingModuleCard {
  name: string;
  eyebrow: string;
  description: string;
  capabilities: string[];
  fit: string;
  highlight?: boolean;
}

export interface MarketingTrustCard {
  title: string;
  description: string;
}

export interface MarketingBeforeAfterColumn {
  title: string;
  items: string[];
}

export interface MarketingOnboardingStep {
  title: string;
  description: string;
}

export interface PricingPlan {
  name: string;
  price: string;
  subtitle: string;
  modules: string[];
  features: string[];
  bestFor: string;
  ctaLabel: string;
  highlight?: boolean;
}

export interface PlatformCapability {
  title: string;
  description: string;
}

export const clinicMarketingStats: readonly MarketingStat[] = [
  { value: '24/7', label: 'atencion fuera de horario' },
  { value: '2 canales', label: 'WhatsApp y llamadas en la misma bandeja' },
  { value: '1 flujo', label: 'nuevo y existente sin friccion para recepcion' },
  { value: 'Agenda viva', label: 'recordatorios, confirmaciones y reactivacion' },
] as const;

export const clinicPainPoints: readonly MarketingPainPoint[] = [
  {
    title: 'Llamadas sin contestar',
    description:
      'Cuando la recepcion esta en silla o en mostrador, las primeras visitas y los callbacks se enfrien solos.',
    impact: 'Cada llamada perdida es una opcion menos de llenar agenda.',
  },
  {
    title: 'WhatsApp sin responder',
    description:
      'Los mensajes se acumulan mientras el equipo atiende dentro de la clinica y la conversacion llega tarde.',
    impact: 'La espera erosiona confianza y multiplica el ida y vuelta manual.',
  },
  {
    title: 'Huecos que se pierden',
    description:
      'Cancelaciones, no-shows y pacientes inactivos dejan sillones vacios si nadie activa seguimiento a tiempo.',
    impact: 'Los ingresos se escapan aunque la demanda ya exista.',
  },
] as const;

export const clinicCostOfInactionMetrics: readonly MarketingBenchmarkMetric[] = [
  {
    value: '23%',
    label: 'llamadas perdidas',
    explanation: 'El telefono sigue absorbiendo demanda nueva aunque la clinica ya trabaje por WhatsApp.',
    note: 'Benchmark comercial editable para clinics SMB; ajustar por canal y especialidad cuando haga falta.',
  },
  {
    value: '15%',
    label: 'citas que terminan en no-show',
    explanation: 'Sin confirmaciones y seguimiento operativo, los huecos del dia se convierten en tiempo muerto.',
    note: 'Referencia editorial para marketing publico, no promesa contractual.',
  },
  {
    value: 'EUR400+',
    label: 'ingresos semanales que se evaporan',
    explanation: 'Una sola cancelacion no recolocada ya pesa en una agenda dental ajustada.',
    note: 'Ejemplo conservador para clinica pequena; mantener configurable.',
  },
] as const;

export const clinicMarketingJobs: readonly MarketingJobSection[] = [
  {
    eyebrow: 'Atender',
    title: 'Atiende cada contacto sin dejar conversaciones colgadas',
    description:
      'La recepcion IA responde WhatsApp y llamadas, cubre fuera de horario y deriva a humano cuando la situacion lo pide.',
    bullets: [
      'WhatsApp inbound con contexto del paciente',
      'Llamadas entrantes y resumen operativo visible',
      'Derivacion a recepcion humana con trazabilidad',
      'Misma logica para preguntas simples, cambios y cancelaciones',
    ],
  },
  {
    eyebrow: 'Agendar',
    title: 'Agenda sin friccion para pacientes nuevos y existentes',
    description:
      'Diferencia si la persona ya es paciente, recoge datos cuando hace falta y ayuda a cerrar, mover o cancelar citas desde el mismo canal.',
    bullets: [
      'Paciente existente: identifica y propone huecos',
      'Paciente nuevo: recoge datos y envia formulario si hace falta',
      'Reserva, reprogramacion y cancelacion con menos ida y vuelta',
      'Preparada para sincronizar con agenda o PMS cuando aplique',
    ],
  },
  {
    eyebrow: 'Recuperar agenda',
    title: 'Mantiene la agenda llena y reduce huecos vacios',
    description:
      'Convierte el seguimiento operativo en un sistema continuo: recordatorios, confirmaciones, huecos liberados y reactivacion.',
    bullets: [
      'Recordatorios y confirmaciones por WhatsApp',
      'Alertas y priorizacion de cancelaciones del dia',
      'Huecos liberados y lista de espera para recuperarlos',
      'Reactivacion de pacientes inactivos y recalls',
    ],
  },
] as const;

export const clinicHowItWorksCards: readonly MarketingHowItWorksCard[] = [
  {
    title: 'WhatsApp entrante',
    description:
      'La recepcion IA responde, identifica si ya existe paciente y recoge el contexto antes de mover agenda.',
    bullets: [
      'Consulta, cambio o cancelacion en el mismo hilo',
      'Deteccion de paciente nuevo frente a existente',
    ],
  },
  {
    title: 'Llamadas entrantes',
    description:
      'El canal voz capta primeras visitas, dudas urgentes y callbacks sin depender de que recepcion descuelgue al instante.',
    bullets: [
      'Resumen operativo visible',
      'Callback programado o derivacion a humano',
    ],
  },
  {
    title: 'Mensajes salientes',
    description:
      'Confirmaciones, recordatorios, formularios y recuperacion de huecos salen de forma proactiva cuando toca.',
    bullets: [
      'Recordatorios y confirmaciones',
      'Formularios y outreach de recuperacion',
    ],
  },
  {
    title: 'Centro de recepcion',
    description:
      'Todo aterriza en la misma superficie: conversaciones, llamadas, agenda, huecos y acciones de growth.',
    bullets: [
      'Bandeja priorizada y agenda del dia',
      'KPIs y decisiones visibles para la clinica',
    ],
  },
] as const;

export const clinicFlowPaths: readonly MarketingFlowPath[] = [
  {
    title: 'Ruta A - Paciente existente',
    description:
      'Se identifica rapido, consulta disponibilidad y cambia o confirma su cita sin volver a explicar todo.',
    steps: [
      'Reconoce telefono e historial',
      'Propone huecos o cambios disponibles',
      'Confirma, mueve o cancela la cita',
      'Actualiza agenda y seguimiento',
    ],
    accent: 'bg-[color-mix(in_srgb,var(--accent)_18%,white)]',
  },
  {
    title: 'Ruta B - Paciente nuevo',
    description:
      'Recoge los datos minimos, envia formulario si hace falta y deja la ficha lista para recepcion y agenda.',
    steps: [
      'Califica si es primera visita',
      'Solicita datos clinicos y administrativos',
      'Envia formulario o checklist previo',
      'Cierra la cita con contexto completo',
    ],
    accent: 'bg-[color-mix(in_srgb,var(--primary)_6%,white)]',
  },
] as const;

export const clinicPatientJourney: MarketingPatientJourney = {
  title: 'Del primer WhatsApp a la cita confirmada, sin perder control',
  description:
    'Un nuevo paciente pregunta por una primera visita, comparte la informacion necesaria y la clinica ve el resultado listo para operar.',
  steps: [
    'Contacto por WhatsApp',
    'Identificacion y recogida de datos',
    'Formulario o checklist previo',
    'Agenda de la cita',
    'Seguimiento y recordatorio programado',
  ],
  outcomes: [
    { label: 'Paciente creado', value: 'Ficha abierta con contexto y motivo de consulta' },
    { label: 'Cita registrada', value: 'Hueco reservado y visible para recepcion' },
    { label: 'Formulario completado', value: 'Checklist previo resuelto en el mismo recorrido' },
    { label: 'Recordatorio programado', value: 'Seguimiento listo sin llamada manual extra' },
  ],
};

export const clinicShowcaseCards: readonly MarketingShowcaseCard[] = [
  {
    title: 'WhatsApp en curso',
    badge: 'Bandeja',
    body: 'Paciente existente pide adelantar su limpieza del jueves. La recepcion IA detecta un hueco liberado a las 13:10 y propone el cambio.',
    detail: 'Thread priorizado + hueco recuperable',
  },
  {
    title: 'Resumen de llamada',
    badge: 'Voice',
    body: 'Nueva paciente pregunta por primera visita. La llamada queda resumida, con devolucion pendiente y checklist previo listo para enviar.',
    detail: 'Call summary + callback sugerido',
  },
  {
    title: 'Agenda del dia',
    badge: 'Agenda',
    body: 'Confirmaciones pendientes, dos reprogramaciones y un hueco abierto antes de comer. Todo visible en la misma superficie operativa.',
    detail: 'Agenda + confirmaciones + gap',
  },
  {
    title: 'Formulario pendiente',
    badge: 'Seguimiento',
    body: 'El formulario de nueva paciente sigue abierto. Se programa un recordatorio antes de la cita para evitar llamadas manuales.',
    detail: 'Nudge automatico + bloqueo controlado',
  },
  {
    title: 'Hueco recuperado',
    badge: 'Growth',
    body: 'Una cancelacion del mismo dia activa outreach sobre la lista de espera y confirma una recolocacion en menos de una hora.',
    detail: 'Gap fill + outreach + confirmacion',
  },
  {
    title: 'Pacientes a reactivar',
    badge: 'Reactivacion',
    body: 'La clinica ve quienes llevan meses sin volver y lanza una campana para revisiones, higienes y tratamientos pendientes.',
    detail: 'Campana activa + citas generadas',
  },
] as const;

export const clinicProofPanels: readonly MarketingProofPanel[] = [
  {
    eyebrow: 'Control center',
    title: 'Bandeja, agenda y KPIs que se entienden en un vistazo',
    description:
      'La clinica ve que esta pasando hoy: conversaciones abiertas, citas del dia, confirmaciones pendientes y huecos recuperables.',
    stats: [
      { value: '18', label: 'conversaciones activas hoy' },
      { value: '12', label: 'citas confirmadas para esta tarde' },
      { value: '3', label: 'callbacks pendientes de priorizar' },
    ],
    highlights: [
      'Bandeja priorizada por urgencia y valor operativo',
      'Agenda con confirmaciones, reprogramaciones y cancelaciones en contexto',
      'KPIs listos para recepcion sin abrir otra herramienta',
    ],
  },
  {
    eyebrow: 'Snapshot operativo',
    title: 'Prueba de producto, no solo promesa comercial',
    description:
      'Formularios pendientes, huecos recuperados, reactivaciones lanzadas y mensajes salientes viven dentro del mismo sistema.',
    stats: [
      { value: '2', label: 'formularios pendientes con nudge activo' },
      { value: '1', label: 'hueco recuperado en menos de una hora' },
      { value: '6', label: 'pacientes en campana de reactivacion' },
    ],
    highlights: [
      'Confirmaciones y nudges sin perseguir al paciente a mano',
      'Gap fill conectado con lista de espera y outreach',
      'Growth visible como agenda sana, no como modulo abstracto',
    ],
  },
] as const;

export const clinicRecoveryCapabilities: readonly MarketingRecoveryCapability[] = [
  {
    title: 'Confirmaciones automaticas',
    description:
      'Reduce no-shows y aclara el dia antes de que la recepcion tenga que perseguir respuestas.',
    outcome: 'Menos agenda incierta antes de abrir la clinica.',
  },
  {
    title: 'Relleno inteligente de huecos',
    description:
      'Cuando una cita cae, Agentmou activa candidatos compatibles y propone recolocacion por el canal adecuado.',
    outcome: 'Huecos del dia convertidos en oportunidad recuperable.',
  },
  {
    title: 'Reactivacion de pacientes',
    description:
      'Pacientes inactivos y recalls pendientes pasan a una campana con seguimiento y resultado visible.',
    outcome: 'Ingresos dormidos convertidos en conversaciones y citas nuevas.',
  },
  {
    title: 'Formularios por WhatsApp',
    description:
      'La clinica no tiene que perseguir datos previos por telefono antes de agendar una primera visita.',
    outcome: 'Menos friccion administrativa y menos trabajo repetitivo.',
  },
] as const;

export const clinicBeforeAfter: readonly MarketingBeforeAfterColumn[] = [
  {
    title: 'Sin Agentmou',
    items: [
      'Llamadas perdidas cuando recepcion esta ocupada',
      'WhatsApps que esperan horas',
      'Huecos que se quedan vacios',
      'No-shows sin seguimiento consistente',
      'Pacientes inactivos sin recuperar',
      'Recepcion saturada con tareas repetitivas',
    ],
  },
  {
    title: 'Con Agentmou',
    items: [
      'Atencion 24/7 sobre WhatsApp y voz',
      'Respuesta inmediata con contexto',
      'Huecos ofrecidos a pacientes compatibles',
      'Confirmaciones y recordatorios automaticos',
      'Reactivaciones lanzadas desde la misma operacion',
      'Equipo enfocado en casos que si requieren humano',
    ],
  },
] as const;

export const clinicModules: readonly MarketingModuleCard[] = [
  {
    name: 'Core Reception',
    eyebrow: 'Base operativa',
    description:
      'La capa central de recepcion: WhatsApp, agenda, pacientes, formularios y seguimiento del dia a dia.',
    capabilities: [
      'Bandeja unificada',
      'Agenda, cambios y cancelaciones',
      'Nuevo vs existente',
      'Formularios, recordatorios y confirmaciones',
    ],
    fit: 'El punto de partida habitual para clinicas que quieren ordenar recepcion y agenda.',
    highlight: true,
  },
  {
    name: 'Voice',
    eyebrow: 'Canal adicional',
    description:
      'Activa llamadas entrantes y callbacks salientes para que telefono y WhatsApp trabajen como una sola recepcion.',
    capabilities: [
      'Resumen de llamada',
      'Devoluciones pendientes',
      'Escalado a humano',
      'Visibilidad por canal',
    ],
    fit: 'Para clinicas donde el telefono sigue generando primeras visitas y callbacks diarios.',
  },
  {
    name: 'Growth',
    eyebrow: 'Agenda llena',
    description:
      'Convierte huecos, no-shows y pacientes inactivos en acciones de recuperacion con criterio operativo.',
    capabilities: [
      'Huecos liberados',
      'Lista de espera',
      'Reactivacion y recall',
      'Campanas y resultados',
    ],
    fit: 'Para equipos que ya resuelven recepcion y quieren proteger ingresos de la agenda.',
  },
  {
    name: 'Enterprise',
    eyebrow: 'Clinicas complejas',
    description:
      'Para grupos, sedes multiples y necesidades avanzadas de permisos, control, reporting y soporte.',
    capabilities: [
      'Permisos y trazabilidad ampliados',
      'Configuracion avanzada',
      'Aislamiento por clinica',
      'Soporte y despliegue guiado',
    ],
    fit: 'Para grupos, varias sedes o despliegues con reglas operativas mas complejas.',
  },
] as const;

export const clinicIntegrations: readonly string[] = [
  'WhatsApp Business',
  'Telefonia cloud',
  'Agenda y PMS',
  'Google Calendar',
  'Email operativo',
] as const;

export const clinicTrustCards: readonly MarketingTrustCard[] = [
  {
    title: 'Seguridad y privacidad',
    description:
      'Aislamiento por clinica, canales protegidos y visibilidad controlada para que cada tenant opere con su propio contexto.',
  },
  {
    title: 'Derivacion a humano',
    description:
      'Los casos sensibles, callbacks y excepciones pasan a recepcion con contexto, no como automatizacion ciega.',
  },
  {
    title: 'Tu clinica, tus reglas',
    description:
      'Permisos, handoff y comportamiento operativo se adaptan al flujo real de la clinica sin exponer complejidad tecnica.',
  },
  {
    title: 'Disenado para dental',
    description:
      'Habla el lenguaje de recepcion dental: primeras visitas, confirmaciones, huecos, recalls y seguimiento del dia.',
  },
] as const;

export const clinicOnboardingSteps: readonly MarketingOnboardingStep[] = [
  {
    title: 'Demo personalizada',
    description:
      'Partimos de tu recepcion actual, tus canales y el punto donde hoy se pierden mas llamadas, mensajes o citas.',
  },
  {
    title: 'Configuracion guiada',
    description:
      'Ajustamos modulos, reglas, handoff humano y contexto operativo para que la clinica no tenga que improvisar el despliegue.',
  },
  {
    title: 'Tu recepcion IA activa',
    description:
      'La clinica entra con una operacion visible: bandeja, agenda, confirmaciones, growth y control sobre el siguiente paso.',
  },
] as const;

export const clinicPricingPlans: readonly PricingPlan[] = [
  {
    name: 'Reception',
    price: 'Custom',
    subtitle: 'Para clinicas que quieren resolver recepcion y agenda sin friccion.',
    modules: ['Core Reception'],
    features: [
      'WhatsApp inbound y outbound operativo',
      'Agenda, cambios y cancelaciones',
      'Pacientes nuevos vs existentes',
      'Formularios, recordatorios y confirmaciones',
    ],
    bestFor: 'Clinicas pequenas o medianas que necesitan ordenar recepcion antes de ampliar canales.',
    ctaLabel: 'Solicitar demo',
  },
  {
    name: 'Reception + Voice',
    price: 'Custom',
    subtitle: 'Suma llamadas entrantes y callbacks al mismo centro de recepcion.',
    modules: ['Core Reception', 'Voice'],
    features: [
      'Todo lo de Reception',
      'Resumen y estado de llamadas',
      'Callbacks programados',
      'Cola operativa por canal',
    ],
    bestFor: 'Clinicas donde telefono y WhatsApp compiten a diario por el tiempo de recepcion.',
    ctaLabel: 'Hablar con ventas',
    highlight: true,
  },
  {
    name: 'Reception + Growth',
    price: 'Custom',
    subtitle: 'Activa recuperacion de huecos y reactivacion para proteger ingresos.',
    modules: ['Core Reception', 'Growth'],
    features: [
      'Todo lo de Reception',
      'Huecos liberados y lista de espera',
      'Reactivacion de pacientes',
      'Campanas y reporting operativo',
    ],
    bestFor: 'Clinicas con agenda ya tensionada que quieren recuperar ingresos y recalls.',
    ctaLabel: 'Ver modulos',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    subtitle: 'Para grupos, sedes multiples y despliegues con requisitos especiales.',
    modules: ['Core Reception', 'Voice', 'Growth', 'Enterprise'],
    features: [
      'Permisos avanzados y control ampliado',
      'Acompanamiento de despliegue',
      'Configuracion para operaciones complejas',
      'Soporte prioritario',
    ],
    bestFor: 'Grupos, cadenas o operaciones con varias sedes y procesos mas exigentes.',
    ctaLabel: 'Solicitar demo',
  },
] as const;

export const clinicSecurityPillars: readonly MarketingTrustCard[] = [
  {
    title: 'Privacidad y aislamiento por clinica',
    description:
      'Cada clinica trabaja con su propio espacio, sus canales y sus permisos sin mezclas entre tenants.',
  },
  {
    title: 'Canales protegidos y acceso controlado',
    description:
      'WhatsApp, voz e integraciones se operan con permisos acotados y trazabilidad de cambios sobre la actividad real.',
  },
  {
    title: 'Trazabilidad operativa completa',
    description:
      'Mensajes, llamadas, confirmaciones y acciones humanas quedan registradas para soporte, revision y mejora continua.',
  },
  {
    title: 'Revision humana y fallback visible',
    description:
      'Si algo no puede cerrarse solo, el equipo ve el contexto y retoma el caso sin perder informacion.',
  },
] as const;

export const platformCapabilities: readonly PlatformCapability[] = [
  {
    title: 'Motor interno de automatizacion',
    description:
      'Detras de la experiencia clinica vive el engine de Agentmou: approvals, observability, orchestration y control plane.',
  },
  {
    title: 'n8n, colas y ejecucion controlada',
    description:
      'Workflows, colas y workers siguen operativos para el equipo interno sin contaminar la narrativa publica principal.',
  },
  {
    title: 'Marketplace y catalogo como capa secundaria',
    description:
      'El catalogo tecnico sigue existiendo para operaciones internas, partners y despliegues avanzados.',
  },
] as const;
