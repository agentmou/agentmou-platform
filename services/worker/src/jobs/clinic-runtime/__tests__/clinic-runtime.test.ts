import { beforeEach, describe, expect, it, vi } from 'vitest';

const selectQueue: unknown[] = [];
const updateCalls: Array<{ table: unknown; values: Record<string, unknown> }> = [];

const tables = vi.hoisted(() => ({
  conversationMessages: { name: 'conversation_messages' },
  conversationThreads: { name: 'conversation_threads' },
  patients: { name: 'patients' },
  clinicChannels: { name: 'clinic_channels' },
  reminderJobs: { name: 'reminder_jobs' },
  appointments: { name: 'appointments' },
  gapOutreachAttempts: { name: 'gap_outreach_attempts' },
  reactivationRecipients: { name: 'reactivation_recipients' },
  auditEvents: { name: 'audit_events' },
}));

function nextSelectResult() {
  return selectQueue.shift() ?? [];
}

vi.mock('@agentmou/db', () => ({
  db: {
    select: () => ({
      from: (table: unknown) => {
        if (table === tables.clinicChannels) {
          return {
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(nextSelectResult()),
            }),
          };
        }

        return {
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(nextSelectResult()),
          }),
        };
      },
    }),
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => {
        updateCalls.push({ table, values });
        return {
          where: vi.fn().mockResolvedValue(undefined),
        };
      },
    }),
    insert: () => ({
      values: vi.fn().mockResolvedValue(undefined),
    }),
  },
  appointments: tables.appointments,
  appointmentEvents: { name: 'appointment_events' },
  auditEvents: tables.auditEvents,
  callSessions: { name: 'call_sessions' },
  clinicChannels: tables.clinicChannels,
  clinicProfiles: { name: 'clinic_profiles' },
  confirmationRequests: { name: 'confirmation_requests' },
  conversationMessages: tables.conversationMessages,
  conversationThreads: tables.conversationThreads,
  gapOpportunities: { name: 'gap_opportunities' },
  gapOutreachAttempts: tables.gapOutreachAttempts,
  intakeFormSubmissions: { name: 'intake_form_submissions' },
  patients: tables.patients,
  patientIdentities: { name: 'patient_identities' },
  reactivationCampaigns: { name: 'reactivation_campaigns' },
  reactivationRecipients: tables.reactivationRecipients,
  reminderJobs: tables.reminderJobs,
  webhookEvents: { name: 'webhook_events' },
}));

vi.mock('@agentmou/connectors', () => ({
  normalizePhoneAddress: (value?: string | null) => value ?? null,
  resolveClinicChannelAdapter: vi.fn(),
}));

vi.mock('@agentmou/queue', () => ({
  getQueue: vi.fn(() => ({
    add: vi.fn().mockResolvedValue(undefined),
    getJobs: vi.fn().mockResolvedValue([]),
    removeRepeatableByKey: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  })),
  QUEUE_NAMES: {},
  getClinicSendMessageJobId: vi.fn((id: string) => `clinic-send-message-${id}`),
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn(() => Symbol('and')),
  desc: vi.fn(() => Symbol('desc')),
  eq: vi.fn(() => Symbol('eq')),
  inArray: vi.fn(() => Symbol('inArray')),
  notInArray: vi.fn(() => Symbol('notInArray')),
  or: vi.fn(() => Symbol('or')),
}));

import { dispatchClinicMessage } from '../clinic-runtime.js';

describe('dispatchClinicMessage', () => {
  beforeEach(() => {
    selectQueue.length = 0;
    updateCalls.length = 0;
    vi.clearAllMocks();
  });

  it('marks the thread for human review when no active channel is available', async () => {
    selectQueue.push(
      [
        {
          id: 'message-1',
          tenantId: 'tenant-1',
          threadId: 'thread-1',
          patientId: 'patient-1',
          channelType: 'whatsapp',
          body: 'Hola',
          payload: {},
          deliveryStatus: 'queued',
          providerMessageId: null,
          sentAt: null,
        },
      ],
      [
        {
          id: 'thread-1',
          tenantId: 'tenant-1',
          patientId: 'patient-1',
          channelType: 'whatsapp',
          status: 'new',
          lastOutboundAt: null,
        },
      ],
      [
        {
          id: 'patient-1',
          tenantId: 'tenant-1',
          phone: '+34600000000',
        },
      ],
      []
    );

    await dispatchClinicMessage({
      tenantId: 'tenant-1',
      messageId: 'message-1',
      automationKind: 'conversation_reply',
    });

    expect(updateCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          table: tables.conversationMessages,
          values: expect.objectContaining({
            deliveryStatus: 'failed',
            payload: expect.objectContaining({
              lastError: 'channel_missing',
            }),
          }),
        }),
        expect.objectContaining({
          table: tables.conversationThreads,
          values: expect.objectContaining({
            status: 'pending_human',
            requiresHumanReview: true,
            resolution: 'channel_missing',
          }),
        }),
      ])
    );
  });
});
