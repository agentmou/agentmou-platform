'use client';

import * as React from 'react';
import Link from 'next/link';
import { Activity, CalendarDays, MessageCircleMore, Search } from 'lucide-react';
import type { ConversationThreadDetail } from '@agentmou/contracts';

import {
  AppointmentBoard,
  CallActivityCard,
  ClinicKpiCard,
  ConfirmationQueueTable,
  FormProgressCard,
  GapOpportunityCard,
  InboxThreadDetail,
  InboxThreadList,
  ModuleVisibilityGuard,
  PatientStatusBadge,
  ReactivationCampaignCard,
} from '@/components/clinic';
import { TenantSettingsPage } from '@/components/settings/tenant-settings-page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useProviderQuery } from '@/lib/data/use-provider-query';
import { hasClinicNavigationAccess, useTenantExperience } from '@/lib/tenant-experience';

const emptyDashboard = {
  tenantId: '',
  generatedAt: '',
  kpis: {
    openThreads: 0,
    pendingConfirmations: 0,
    pendingForms: 0,
    activeGaps: 0,
    activeCampaigns: 0,
    todaysAppointments: 0,
    patientsNew: 0,
    patientsExisting: 0,
  },
  prioritizedInbox: [],
  agenda: [],
  pendingForms: [],
  pendingConfirmations: [],
  activeGaps: [],
  activeCampaigns: [],
  patientMix: {
    newPatients: 0,
    existingPatients: 0,
  },
};

export function ClinicOverviewPage() {
  const experience = useTenantExperience();
  const { data: dashboard } = useProviderQuery(
    (provider) => provider.getClinicDashboard(experience.tenantId),
    emptyDashboard,
    [experience.tenantId]
  );
  const [selectedThreadId, setSelectedThreadId] = React.useState<string | undefined>(undefined);
  const [selectedThreadDetail, setSelectedThreadDetail] =
    React.useState<ConversationThreadDetail | null>(null);

  React.useEffect(() => {
    setSelectedThreadId((current) => current ?? dashboard.prioritizedInbox[0]?.id);
  }, [dashboard.prioritizedInbox]);

  const { data: threadDetail } = useProviderQuery(
    (provider) =>
      selectedThreadId
        ? provider.getClinicConversation(experience.tenantId, selectedThreadId)
        : Promise.resolve(null),
    null,
    [experience.tenantId, selectedThreadId]
  );

  React.useEffect(() => {
    setSelectedThreadDetail(threadDetail ?? null);
  }, [threadDetail]);

  return (
    <div className="space-y-8 p-6 lg:p-8">
      <div className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-[0.12em] text-muted-foreground">
          Centro de recepcion
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Resumen</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Seguimiento operativo del dia: bandeja, agenda, confirmaciones y oportunidades de
          recuperacion.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <ClinicKpiCard
          label="Contactos atendidos hoy"
          value={dashboard.kpis.openThreads}
          helper="Conversaciones con actividad reciente"
        />
        <ClinicKpiCard
          label="Citas agendadas hoy"
          value={dashboard.kpis.todaysAppointments}
          helper="Agenda confirmada y pendiente"
          tone="success"
        />
        <ClinicKpiCard
          label="Confirmaciones pendientes"
          value={dashboard.kpis.pendingConfirmations}
          helper="Requieren seguimiento hoy"
          tone="warning"
        />
        <ClinicKpiCard
          label="Huecos por cubrir"
          value={dashboard.kpis.activeGaps}
          helper="Cancelaciones y reacomodos abiertos"
          tone="warning"
        />
        <ClinicKpiCard
          label="Pacientes a reactivar"
          value={dashboard.kpis.activeCampaigns}
          helper="Campanas activas en curso"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr,0.85fr]">
        <InboxThreadList
          threads={dashboard.prioritizedInbox}
          selectedThreadId={selectedThreadId}
          onSelect={(thread) => setSelectedThreadId(thread.id)}
        />
        <InboxThreadDetail thread={selectedThreadDetail} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <AppointmentBoard appointments={dashboard.agenda} title="Agenda del dia" />
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Seguimiento rapido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.pendingForms.map((submission) => (
              <FormProgressCard key={submission.id} submission={submission} />
            ))}
            {dashboard.pendingForms.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay formularios pendientes.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-border/60 xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Confirmaciones pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <ConfirmationQueueTable confirmations={dashboard.pendingConfirmations} />
          </CardContent>
        </Card>
        <Card className="border-border/60 xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Huecos activos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.activeGaps.map((gap) => (
              <GapOpportunityCard key={gap.id} gap={gap} />
            ))}
          </CardContent>
        </Card>
        <Card className="border-border/60 xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Campanas con movimiento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {dashboard.activeCampaigns.map((campaign) => (
              <ReactivationCampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ClinicInboxPage() {
  const experience = useTenantExperience();
  const { data: conversations } = useProviderQuery(
    (provider) => provider.listClinicConversations(experience.tenantId),
    { threads: [], total: 0 },
    [experience.tenantId]
  );
  const { data: calls } = useProviderQuery(
    (provider) =>
      experience.capabilities.voiceEnabled
        ? provider.listClinicCalls(experience.tenantId)
        : Promise.resolve({ calls: [], total: 0 }),
    { calls: [], total: 0 },
    [experience.capabilities.voiceEnabled, experience.tenantId]
  );
  const [selectedThreadId, setSelectedThreadId] = React.useState<string | undefined>(undefined);
  const { data: selectedThread } = useProviderQuery(
    (provider) =>
      selectedThreadId
        ? provider.getClinicConversation(experience.tenantId, selectedThreadId)
        : Promise.resolve(null),
    null,
    [experience.tenantId, selectedThreadId]
  );

  React.useEffect(() => {
    setSelectedThreadId((current) => current ?? conversations.threads[0]?.id);
  }, [conversations.threads]);

  const pendingThreads = conversations.threads.filter((thread) => thread.status === 'pending_form');
  const escalatedThreads = conversations.threads.filter((thread) => thread.requiresHumanReview);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Bandeja</h1>
        <p className="text-sm text-muted-foreground">
          WhatsApp, llamadas, pendientes y escalados en una sola cola de trabajo.
        </p>
      </div>

      <Tabs defaultValue="todo" className="space-y-6">
        <TabsList className="flex h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
          <TabsTrigger value="todo">Todo</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="llamadas">Llamadas</TabsTrigger>
          <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
          <TabsTrigger value="escalados">Escalados</TabsTrigger>
        </TabsList>

        <TabsContent value="todo" className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <InboxThreadList
            threads={conversations.threads}
            selectedThreadId={selectedThreadId}
            onSelect={(thread) => setSelectedThreadId(thread.id)}
          />
          <InboxThreadDetail thread={selectedThread} />
        </TabsContent>
        <TabsContent value="whatsapp">
          <InboxThreadList
            threads={conversations.threads.filter((thread) => thread.channelType === 'whatsapp')}
            selectedThreadId={selectedThreadId}
            onSelect={(thread) => setSelectedThreadId(thread.id)}
          />
        </TabsContent>
        <TabsContent value="llamadas" className="space-y-4">
          <ModuleVisibilityGuard
            enabled={experience.capabilities.voiceEnabled}
            title="Modulo de voz no activo"
            description="Activa Voz para recibir llamadas y callbacks dentro de la bandeja."
          >
            {calls.calls.map((call) => (
              <CallActivityCard key={call.id} call={call} />
            ))}
          </ModuleVisibilityGuard>
        </TabsContent>
        <TabsContent value="pendientes">
          <InboxThreadList
            threads={pendingThreads}
            onSelect={(thread) => setSelectedThreadId(thread.id)}
          />
        </TabsContent>
        <TabsContent value="escalados">
          <InboxThreadList
            threads={escalatedThreads}
            onSelect={(thread) => setSelectedThreadId(thread.id)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function ClinicAgendaPage() {
  const experience = useTenantExperience();
  const { data: appointments } = useProviderQuery(
    (provider) => provider.listClinicAppointments(experience.tenantId),
    { appointments: [], total: 0 },
    [experience.tenantId]
  );
  const { data: gaps } = useProviderQuery(
    (provider) =>
      experience.capabilities.gapsEnabled
        ? provider.listClinicGaps(experience.tenantId)
        : Promise.resolve([]),
    [],
    [experience.capabilities.gapsEnabled, experience.tenantId]
  );

  const activeAppointments = appointments.appointments.filter(
    (appointment) => appointment.status !== 'cancelled'
  );
  const cancelledAppointments = appointments.appointments.filter(
    (appointment) => appointment.status === 'cancelled'
  );

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Agenda</h1>
        <p className="text-sm text-muted-foreground">
          Citas del dia y de la semana, cambios recientes, cancelaciones y oportunidades de
          reubicacion.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <AppointmentBoard appointments={activeAppointments} title="Citas programadas" />
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Cambios recientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cancelledAppointments.map((appointment) => (
              <div key={appointment.id} className="rounded-xl border border-border/60 p-3">
                <p className="font-medium">{appointment.patient?.fullName ?? 'Paciente'}</p>
                <p className="text-sm text-muted-foreground">
                  Cancelada · {appointment.cancellationReason ?? 'Sin motivo'}
                </p>
              </div>
            ))}
            {cancelledAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hubo cancelaciones recientes.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <ModuleVisibilityGuard
        enabled={experience.capabilities.gapsEnabled}
        title="Huecos no disponibles"
        description="Activa Growth para gestionar huecos visibles y propuestas de relleno."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {gaps.map((gap) => (
            <GapOpportunityCard key={gap.id} gap={gap} />
          ))}
        </div>
      </ModuleVisibilityGuard>
    </div>
  );
}

export function ClinicPatientsPage() {
  const experience = useTenantExperience();
  const [search, setSearch] = React.useState('');
  const { data: patients } = useProviderQuery(
    (provider) => provider.listClinicPatients(experience.tenantId, { search, limit: 50 }),
    { patients: [], total: 0 },
    [experience.tenantId, search]
  );
  const [selectedPatientId, setSelectedPatientId] = React.useState<string | undefined>(undefined);
  const { data: selectedPatient } = useProviderQuery(
    (provider) =>
      selectedPatientId
        ? provider.getClinicPatient(experience.tenantId, selectedPatientId)
        : Promise.resolve(null),
    null,
    [experience.tenantId, selectedPatientId]
  );

  React.useEffect(() => {
    setSelectedPatientId((current) => current ?? patients.patients[0]?.id);
  }, [patients.patients]);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Pacientes</h1>
          <p className="text-sm text-muted-foreground">
            Nuevos y existentes, con proxima cita, formularios, ultima interaccion y oportunidades
            de reactivacion.
          </p>
        </div>
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar paciente, telefono o email"
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
        <Card className="border-border/60">
          <CardContent className="p-0">
            <div className="divide-y divide-border/60">
              {patients.patients.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => setSelectedPatientId(patient.id)}
                  className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-muted/40"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{patient.fullName}</p>
                    <p className="text-sm text-muted-foreground">
                      {patient.email ?? patient.phone ?? 'Sin contacto principal'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <PatientStatusBadge status={patient.status} isExisting={patient.isExisting} />
                      {patient.hasPendingForm ? (
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">
                          Pendiente de formulario
                        </span>
                      ) : null}
                      {patient.isReactivationCandidate ? (
                        <span className="rounded-full bg-sky-100 px-2 py-1 text-xs text-sky-700">
                          Reactivacion
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{patient.upcomingAppointmentCount ?? 0} cita(s)</p>
                    <p>
                      {patient.lastInteractionAt
                        ? new Date(patient.lastInteractionAt).toLocaleDateString()
                        : 'Sin actividad'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">
              {selectedPatient?.patient.fullName ?? 'Detalle del paciente'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedPatient ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <PatientStatusBadge
                    status={selectedPatient.patient.status}
                    isExisting={selectedPatient.patient.isExisting}
                  />
                  {selectedPatient.patient.status === 'intake_pending' ||
                  selectedPatient.upcomingAppointments.some(
                    (appointment) => appointment.status === 'pending_form'
                  ) ? (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">
                      Pendiente de formulario
                    </span>
                  ) : null}
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Email: {selectedPatient.patient.email ?? 'Sin email'}</p>
                  <p>Telefono: {selectedPatient.patient.phone ?? 'Sin telefono'}</p>
                  <p>Notas: {selectedPatient.patient.notes ?? 'Sin notas'}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Proximas citas</p>
                  {selectedPatient.upcomingAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="rounded-xl border border-border/60 p-3 text-sm"
                    >
                      {new Date(appointment.startsAt).toLocaleString()} ·{' '}
                      {appointment.service?.name ?? 'Cita'}
                    </div>
                  ))}
                  {selectedPatient.upcomingAppointments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No hay citas futuras.</p>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Selecciona un paciente para ver su contexto y proxima actividad.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ClinicFollowUpPage() {
  const experience = useTenantExperience();

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Seguimiento</h1>
        <p className="text-sm text-muted-foreground">
          Formularios, confirmaciones y huecos reunidos en un solo espacio operativo.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {hasClinicNavigationAccess(experience, 'forms') ? (
          <FollowUpShortcut
            href="seguimiento/formularios"
            icon={MessageCircleMore}
            title="Formularios"
            description="Revisa envios pendientes y desbloqueos de reserva."
          />
        ) : null}
        {hasClinicNavigationAccess(experience, 'confirmations') ? (
          <FollowUpShortcut
            href="seguimiento/confirmaciones"
            icon={CalendarDays}
            title="Confirmaciones"
            description="Citas pendientes de confirmar y seguimientos manuales."
          />
        ) : null}
        {hasClinicNavigationAccess(experience, 'gaps') ? (
          <FollowUpShortcut
            href="seguimiento/huecos"
            icon={Activity}
            title="Huecos"
            description="Cancelaciones y oportunidades para recuperar agenda."
          />
        ) : null}
      </div>
    </div>
  );
}

export function ClinicFormsPage() {
  const experience = useTenantExperience();
  const { data: submissions } = useProviderQuery(
    (provider) =>
      experience.capabilities.formsEnabled
        ? provider.listClinicFormSubmissions(experience.tenantId)
        : Promise.resolve([]),
    [],
    [experience.capabilities.formsEnabled, experience.tenantId]
  );

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Formularios</h1>
        <p className="text-sm text-muted-foreground">
          Formularios enviados, expiraciones y casos que necesitan intervencion manual.
        </p>
      </div>
      <ModuleVisibilityGuard
        enabled={experience.capabilities.formsEnabled}
        title="Formularios no activos"
        description="La clinica no tiene activado el flujo de formularios de nuevo paciente."
      >
        <div className="space-y-3">
          {submissions.map((submission) => (
            <FormProgressCard key={submission.id} submission={submission} />
          ))}
        </div>
      </ModuleVisibilityGuard>
    </div>
  );
}

export function ClinicConfirmationsPage() {
  const experience = useTenantExperience();
  const { data: confirmations } = useProviderQuery(
    (provider) =>
      experience.capabilities.confirmationsEnabled
        ? provider.listClinicConfirmations(experience.tenantId)
        : Promise.resolve([]),
    [],
    [experience.capabilities.confirmationsEnabled, experience.tenantId]
  );

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Confirmaciones</h1>
        <p className="text-sm text-muted-foreground">
          Citas pendientes de respuesta, ultimo intento y vencimientos activos.
        </p>
      </div>
      <ModuleVisibilityGuard
        enabled={experience.capabilities.confirmationsEnabled}
        title="Confirmaciones no activas"
        description="La politica actual no tiene confirmaciones automaticas activas."
      >
        <ConfirmationQueueTable confirmations={confirmations} />
      </ModuleVisibilityGuard>
    </div>
  );
}

export function ClinicGapsPage() {
  const experience = useTenantExperience();
  const { data: gaps } = useProviderQuery(
    (provider) =>
      experience.capabilities.gapsEnabled
        ? provider.listClinicGaps(experience.tenantId)
        : Promise.resolve([]),
    [],
    [experience.capabilities.gapsEnabled, experience.tenantId]
  );

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Huecos</h1>
        <p className="text-sm text-muted-foreground">
          Huecos abiertos, origen del hueco y estado de las ofertas enviadas.
        </p>
      </div>
      <ModuleVisibilityGuard
        enabled={experience.capabilities.gapsEnabled}
        title="Growth no activo"
        description="Activa Growth para gestionar huecos y waitlist desde esta pantalla."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {gaps.map((gap) => (
            <GapOpportunityCard key={gap.id} gap={gap} />
          ))}
        </div>
      </ModuleVisibilityGuard>
    </div>
  );
}

export function ClinicReactivationPage() {
  const experience = useTenantExperience();
  const { data: campaigns } = useProviderQuery(
    (provider) =>
      experience.capabilities.reactivationEnabled
        ? provider.listClinicReactivationCampaigns(experience.tenantId)
        : Promise.resolve({ campaigns: [], total: 0 }),
    { campaigns: [], total: 0 },
    [experience.capabilities.reactivationEnabled, experience.tenantId]
  );
  const { data: recipients } = useProviderQuery(
    (provider) =>
      experience.capabilities.reactivationEnabled
        ? provider.listClinicReactivationRecipients(experience.tenantId)
        : Promise.resolve([]),
    [],
    [experience.capabilities.reactivationEnabled, experience.tenantId]
  );

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Reactivacion</h1>
        <p className="text-sm text-muted-foreground">
          Campanas activas, cohortes, respuestas y pacientes ya recuperados.
        </p>
      </div>
      <ModuleVisibilityGuard
        enabled={experience.capabilities.reactivationEnabled}
        title="Reactivacion no disponible"
        description="Activa Growth para lanzar campanas y medir pacientes recuperados."
      >
        <div className="grid gap-6 xl:grid-cols-[1fr,0.9fr]">
          <div className="grid gap-4 md:grid-cols-2">
            {campaigns.campaigns.map((campaign) => (
              <ReactivationCampaignCard key={campaign.id} campaign={campaign} />
            ))}
          </div>
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Respuestas recientes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recipients.map((recipient) => (
                <div key={recipient.id} className="rounded-xl border border-border/60 p-3">
                  <p className="font-medium">{recipient.patientId}</p>
                  <p className="text-sm text-muted-foreground">
                    {recipient.result ?? recipient.status}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </ModuleVisibilityGuard>
    </div>
  );
}

export function ClinicPerformancePage() {
  const experience = useTenantExperience();
  const { data: dashboard } = useProviderQuery(
    (provider) => provider.getClinicDashboard(experience.tenantId),
    emptyDashboard,
    [experience.tenantId]
  );
  const { data: calls } = useProviderQuery(
    (provider) =>
      experience.capabilities.voiceEnabled
        ? provider.listClinicCalls(experience.tenantId)
        : Promise.resolve({ calls: [], total: 0 }),
    { calls: [], total: 0 },
    [experience.capabilities.voiceEnabled, experience.tenantId]
  );

  const recoveredRevenueEstimate = dashboard.activeCampaigns.length * 180;

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Rendimiento</h1>
        <p className="text-sm text-muted-foreground">
          Metricas operativas por canal, conversiones y recuperacion estimada de agenda.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ClinicKpiCard
          label="Atencion por canal"
          value={dashboard.kpis.openThreads}
          helper="Interacciones gestionadas"
        />
        <ClinicKpiCard
          label="Llamadas gestionadas"
          value={calls.total ?? 0}
          helper="Callbacks y llamadas entrantes"
        />
        <ClinicKpiCard
          label="No-shows evitados"
          value={dashboard.kpis.pendingConfirmations}
          helper="Confirmaciones en curso"
        />
        <ClinicKpiCard
          label="Ingresos recuperados"
          value={`${recoveredRevenueEstimate} €`}
          helper="Estimacion a partir de reactivaciones activas"
          tone="success"
        />
      </div>
    </div>
  );
}

export function ClinicSettingsPage() {
  return <TenantSettingsPage />;
}

function FollowUpShortcut({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  const experience = useTenantExperience();

  return (
    <Link href={`/app/${experience.tenantId}/${href}`}>
      <Card className="h-full border-border/60 transition-colors hover:bg-muted/20">
        <CardContent className="flex h-full items-start gap-3 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Icon className="h-4 w-4" />
          </span>
          <div className="space-y-1">
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
