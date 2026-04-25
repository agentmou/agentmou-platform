import type {
  ClinicDashboard,
  ConfirmationRequest,
  ConversationThreadListItem,
  GapOpportunityDetail,
  IntakeFormSubmission,
} from '@agentmou/contracts';
import { describe, expect, it } from 'vitest';

import { deriveClinicNotifications } from './clinic-notifications';

function makeDashboard(overrides: Partial<ClinicDashboard> = {}): ClinicDashboard {
  return {
    tenantId: 't1',
    generatedAt: '2026-04-25T10:00:00.000Z',
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
    patientMix: { newPatients: 0, existingPatients: 0 },
    ...overrides,
  };
}

function makeThread(
  id: string,
  overrides: Partial<ConversationThreadListItem> = {}
): ConversationThreadListItem {
  return {
    id,
    tenantId: 't1',
    channelType: 'whatsapp',
    status: 'in_progress',
    intent: 'general_inquiry',
    priority: 'normal',
    source: 'whatsapp:+34',
    requiresHumanReview: false,
    unreadCount: 0,
    createdAt: '2026-04-25T08:00:00.000Z',
    updatedAt: '2026-04-25T09:00:00.000Z',
    ...overrides,
  };
}

function makeConfirmation(id: string): ConfirmationRequest {
  return {
    id,
    tenantId: 't1',
    appointmentId: 'apt1',
    channelType: 'whatsapp',
    status: 'pending',
    requestedAt: '2026-04-25T07:00:00.000Z',
    dueAt: '2026-04-25T13:00:00.000Z',
    responsePayload: {},
    createdAt: '2026-04-25T07:00:00.000Z',
    updatedAt: '2026-04-25T07:00:00.000Z',
  };
}

function makeForm(id: string): IntakeFormSubmission {
  return {
    id,
    tenantId: 't1',
    templateId: 'tpl1',
    status: 'pending',
    answers: {},
    requiredForBooking: true,
    createdAt: '2026-04-25T06:00:00.000Z',
    updatedAt: '2026-04-25T06:00:00.000Z',
  };
}

function makeGap(id: string): GapOpportunityDetail {
  return {
    id,
    tenantId: 't1',
    startsAt: '2026-04-25T15:00:00.000Z',
    endsAt: '2026-04-25T15:30:00.000Z',
    status: 'open',
    origin: 'cancellation',
    outreachAttempts: [],
    createdAt: '2026-04-25T05:00:00.000Z',
    updatedAt: '2026-04-25T05:00:00.000Z',
  };
}

describe('deriveClinicNotifications', () => {
  it('returns an empty list when the dashboard has no actionable items', () => {
    expect(deriveClinicNotifications(makeDashboard())).toEqual([]);
  });

  it('only emits escalated threads (requiresHumanReview = true)', () => {
    const dashboard = makeDashboard({
      prioritizedInbox: [
        makeThread('thread-quiet', { requiresHumanReview: false }),
        makeThread('thread-loud', {
          channelType: 'voice',
          status: 'escalated',
          intent: 'reschedule_appointment',
          priority: 'high',
          requiresHumanReview: true,
          unreadCount: 2,
          lastMessagePreview: 'Cliente molesto',
          patient: {
            id: 'p1',
            tenantId: 't1',
            status: 'existing',
            isExisting: true,
            firstName: 'Ana',
            lastName: 'Pérez',
            fullName: 'Ana Pérez',
            consentFlags: {},
            source: 'whatsapp',
            createdAt: '2026-04-20T08:00:00.000Z',
            updatedAt: '2026-04-25T09:00:00.000Z',
            isReactivationCandidate: false,
            hasPendingForm: false,
            upcomingAppointmentCount: 0,
          },
        }),
      ],
    });

    const notifications = deriveClinicNotifications(dashboard);
    expect(notifications.map((n) => n.id)).toEqual(['thread:thread-loud']);
    expect(notifications[0].title).toContain('Ana Pérez');
    expect(notifications[0].body).toContain('Llamada');
  });

  it('preserves bucket order (escalated → confirmations → forms → gaps) under the limit', () => {
    const dashboard = makeDashboard({
      prioritizedInbox: [
        makeThread('esc', {
          status: 'escalated',
          intent: 'reschedule_appointment',
          priority: 'high',
          requiresHumanReview: true,
        }),
      ],
      pendingConfirmations: [makeConfirmation('c1')],
      pendingForms: [makeForm('f1')],
      activeGaps: [makeGap('g1')],
    });

    const notifications = deriveClinicNotifications(dashboard);
    expect(notifications.map((n) => n.id)).toEqual([
      'thread:esc',
      'confirmation:c1',
      'form:f1',
      'gap:g1',
    ]);
  });

  it('respects the limit option, keeping the highest-priority buckets', () => {
    const escalated = Array.from({ length: 3 }, (_, idx) =>
      makeThread(`e${idx}`, {
        status: 'escalated',
        intent: 'reschedule_appointment',
        priority: 'high',
        requiresHumanReview: true,
      })
    );
    const dashboard = makeDashboard({
      prioritizedInbox: escalated,
      pendingConfirmations: [makeConfirmation('c1')],
    });

    const notifications = deriveClinicNotifications(dashboard, { limit: 2 });
    expect(notifications).toHaveLength(2);
    expect(notifications.map((n) => n.id)).toEqual(['thread:e0', 'thread:e1']);
  });

  it('uses the supplied formatter for timestamps', () => {
    const dashboard = makeDashboard({
      pendingConfirmations: [makeConfirmation('c1')],
    });

    const notifications = deriveClinicNotifications(dashboard, {
      formatTimestamp: () => 'AYER',
    });
    expect(notifications[0].timestamp).toBe('AYER');
    expect(notifications[0].body).toContain('AYER');
  });
});
