import { describe, expect, it } from 'vitest';

import { buildClinicDemoDataset } from './clinic-demo-fixtures';

describe('buildClinicDemoDataset', () => {
  it('covers the full dental demo dataset with the required journey inventory', () => {
    const dataset = buildClinicDemoDataset('demo-workspace', new Date('2026-04-05T09:00:00.000Z'));

    expect(dataset.summary.counts).toMatchObject({
      patients: 11,
      whatsappThreads: 7,
      voiceThreads: 3,
      calls: 3,
      forms: 3,
      appointments: 6,
      confirmationsPending: 2,
      activeGaps: 1,
      activeCampaigns: 1,
    });

    expect(dataset.summary.journeys.newPatient).toEqual({
      patientId: 'patient-ana-garcia',
      threadId: 'thread-ana-whatsapp',
      submissionId: 'submission-ana',
      appointmentId: 'appointment-ana',
    });
    expect(dataset.summary.journeys.reactivation.generatedAppointmentId).toBe('appointment-carmen');
    expect(dataset.experience.flags.internalPlatformVisible).toBe(false);
  });

  it('keeps the key clinic journeys readable through statuses and relations', () => {
    const dataset = buildClinicDemoDataset('demo-workspace', new Date('2026-04-05T09:00:00.000Z'));
    const newPatientSubmission = dataset.formSubmissions.find(
      (submission) => submission.id === dataset.summary.journeys.newPatient.submissionId
    );
    const rescheduledAppointment = dataset.appointments.find(
      (appointment) => appointment.id === dataset.summary.journeys.reschedule.appointmentId
    );
    const gap = dataset.gaps.find((item) => item.id === dataset.summary.journeys.gapRecovery.gapId);
    const campaign = dataset.campaignDetails.find(
      (item) => item.id === dataset.summary.journeys.reactivation.campaignId
    );

    expect(newPatientSubmission?.status).toBe('completed');
    expect(rescheduledAppointment?.status).toBe('rescheduled');
    expect(gap?.outreachAttempts[0]).toMatchObject({
      id: dataset.summary.journeys.gapRecovery.outreachAttemptId,
      patientId: dataset.summary.journeys.gapRecovery.candidatePatientId,
      status: 'sent',
    });
    expect(campaign?.recipients.map((recipient) => recipient.status)).toEqual(
      expect.arrayContaining(['booked', 'contacted', 'failed'])
    );
  });
});
