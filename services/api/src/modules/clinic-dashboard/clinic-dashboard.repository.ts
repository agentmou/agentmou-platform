import {
  appointments,
  confirmationRequests,
  conversationThreads,
  db,
  gapOpportunities,
  intakeFormSubmissions,
  patients,
  reactivationCampaigns,
} from '@agentmou/db';
import { and, asc, desc, eq, gte, inArray, ne } from 'drizzle-orm';

import { ClinicReadModelsRepository } from '../clinic-shared/clinic-read-models.repository.js';

type DatabaseClient = typeof db;

const OPEN_THREAD_STATUSES = ['new', 'in_progress', 'pending_form', 'pending_human', 'escalated'];
const PENDING_FORM_STATUSES = ['pending', 'sent', 'opened'];
const ACTIVE_GAP_STATUSES = ['open', 'offered', 'claimed'];
const ACTIVE_CAMPAIGN_STATUSES = ['running', 'scheduled', 'paused'];
const OPEN_CONFIRMATION_STATUSES = ['pending', 'no_response', 'escalated'];

const PRIORITY_RANK: Record<string, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export class ClinicDashboardRepository {
  private readonly readModels: ClinicReadModelsRepository;

  constructor(private readonly database: DatabaseClient = db) {
    this.readModels = new ClinicReadModelsRepository(database);
  }

  async getDashboard(tenantId: string) {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);

    const [
      threadRows,
      patientRows,
      formRows,
      confirmationRows,
      gapRows,
      campaignRows,
      todaysAppointmentRows,
    ] = await Promise.all([
      this.database
        .select()
        .from(conversationThreads)
        .where(eq(conversationThreads.tenantId, tenantId))
        .orderBy(desc(conversationThreads.lastMessageAt), desc(conversationThreads.createdAt)),
      this.database
        .select()
        .from(patients)
        .where(eq(patients.tenantId, tenantId)),
      this.database
        .select()
        .from(intakeFormSubmissions)
        .where(eq(intakeFormSubmissions.tenantId, tenantId))
        .orderBy(desc(intakeFormSubmissions.createdAt)),
      this.database
        .select()
        .from(confirmationRequests)
        .where(eq(confirmationRequests.tenantId, tenantId))
        .orderBy(asc(confirmationRequests.dueAt)),
      this.database
        .select()
        .from(gapOpportunities)
        .where(eq(gapOpportunities.tenantId, tenantId))
        .orderBy(asc(gapOpportunities.startsAt)),
      this.database
        .select()
        .from(reactivationCampaigns)
        .where(eq(reactivationCampaigns.tenantId, tenantId))
        .orderBy(desc(reactivationCampaigns.updatedAt)),
      this.database
        .select()
        .from(appointments)
        .where(
          and(
            eq(appointments.tenantId, tenantId),
            gte(appointments.startsAt, dayStart),
            ne(appointments.status, 'cancelled')
          )
        )
        .orderBy(asc(appointments.startsAt)),
    ]);

    const openThreads = threadRows.filter((thread) => OPEN_THREAD_STATUSES.includes(thread.status));
    const pendingForms = formRows.filter((form) => PENDING_FORM_STATUSES.includes(form.status));
    const pendingConfirmations = confirmationRows.filter((confirmation) =>
      OPEN_CONFIRMATION_STATUSES.includes(confirmation.status)
    );
    const activeGaps = gapRows.filter((gap) => ACTIVE_GAP_STATUSES.includes(gap.status));
    const activeCampaigns = campaignRows.filter((campaign) =>
      ACTIVE_CAMPAIGN_STATUSES.includes(campaign.status)
    );
    const todaysAppointments = todaysAppointmentRows.filter(
      (appointment) => appointment.startsAt <= dayEnd
    );

    const prioritizedInbox = await this.readModels.loadConversationListItems(
      tenantId,
      [...openThreads]
        .sort((left, right) => {
          const priorityDelta = (PRIORITY_RANK[left.priority] ?? 99) - (PRIORITY_RANK[right.priority] ?? 99);
          if (priorityDelta !== 0) {
            return priorityDelta;
          }

          return (right.lastMessageAt?.getTime() ?? 0) - (left.lastMessageAt?.getTime() ?? 0);
        })
        .slice(0, 10)
    );

    return {
      tenantId,
      generatedAt: new Date().toISOString(),
      kpis: {
        openThreads: openThreads.length,
        pendingConfirmations: pendingConfirmations.length,
        pendingForms: pendingForms.length,
        activeGaps: activeGaps.length,
        activeCampaigns: activeCampaigns.length,
        todaysAppointments: todaysAppointments.length,
        patientsNew: patientRows.filter((patient) => !patient.isExisting).length,
        patientsExisting: patientRows.filter((patient) => patient.isExisting).length,
      },
      prioritizedInbox,
      agenda: await this.readModels.loadAppointmentSummaries(tenantId, todaysAppointments.slice(0, 10)),
      pendingForms: pendingForms.slice(0, 10),
      pendingConfirmations: pendingConfirmations.slice(0, 10),
      activeGaps: await this.readModels.loadGapDetails(tenantId, activeGaps.slice(0, 10)),
      activeCampaigns: activeCampaigns.slice(0, 10),
      patientMix: {
        newPatients: patientRows.filter((patient) => !patient.isExisting).length,
        existingPatients: patientRows.filter((patient) => patient.isExisting).length,
      },
    };
  }
}
