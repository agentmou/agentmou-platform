export interface MarketingStat {
  value: string;
  label: string;
}

export interface MarketingJobSection {
  eyebrow: string;
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

export interface MarketingShowcaseCard {
  title: string;
  badge: string;
  body: string;
  detail: string;
}

export interface MarketingModuleCard {
  name: string;
  eyebrow: string;
  description: string;
  capabilities: string[];
  highlight?: boolean;
}

export interface MarketingTrustCard {
  title: string;
  description: string;
}

export interface PricingPlan {
  name: string;
  price: string;
  subtitle: string;
  modules: string[];
  features: string[];
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
    title: 'Revision humana cuando importa',
    description:
      'La clinica mantiene control sobre los casos sensibles, callbacks pendientes y decisiones que requieren supervision.',
  },
  {
    title: 'Permisos y trazabilidad',
    description:
      'Cada cambio queda registrado y la visibilidad se controla por rol, modulo y tenant sin exponer complejidad tecnica al equipo.',
  },
  {
    title: 'Seguridad por clinica',
    description:
      'Separacion multi-tenant, canales protegidos e integraciones seguras para que cada clinica opere con su propio contexto.',
  },
  {
    title: 'Continuidad operativa',
    description:
      'Cuando una automatizacion no puede cerrar sola, la recepcion humana ve que ha pasado y cual es el siguiente paso.',
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
