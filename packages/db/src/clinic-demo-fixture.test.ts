import { describe, expect, it } from 'vitest';

import { buildClinicDemoSeedFixture } from './clinic-demo-fixture';

describe('buildClinicDemoSeedFixture', () => {
  it('captures the required clinic demo inventory and journey coverage', () => {
    const fixture = buildClinicDemoSeedFixture(new Date('2026-04-05T09:00:00.000Z'));

    expect(fixture.summary.counts).toEqual({
      patients: 11,
      whatsappThreads: 7,
      voiceThreads: 3,
      calls: 3,
      formSubmissions: 3,
      appointments: 6,
      pendingConfirmations: 2,
      activeGaps: 1,
      activeCampaigns: 1,
    });
    expect(fixture.tenantSettings.activeVertical).toBe('clinic');
    expect(fixture.tenantSettings.isPlatformAdminTenant).toBe(false);
    expect(fixture.tenantSettings.settingsVersion).toBe(2);
    expect(fixture.tenantSettings.internalPlatformVisible).toBe(true);
    expect(fixture.verticalConfigs[0]).toMatchObject({
      verticalKey: 'clinic',
    });
    expect(fixture.summary.journeys.newPatient.appointmentKey).toBe('appointment-ana');
    expect(fixture.summary.journeys.reactivation.generatedAppointmentKey).toBe(
      'appointment-carmen'
    );
  });

  it('keeps the demo tenant journeys relationally coherent for seed insertion', () => {
    const fixture = buildClinicDemoSeedFixture(new Date('2026-04-05T09:00:00.000Z'));
    const patientKeys = new Set(fixture.patients.map((patient) => patient.key));
    const threadKeys = new Set(fixture.threads.map((thread) => thread.key));
    const appointmentKeys = new Set(fixture.appointments.map((appointment) => appointment.key));
    const campaignKeys = new Set(fixture.campaigns.map((campaign) => campaign.key));

    expect(
      fixture.formSubmissions.every(
        (submission) =>
          patientKeys.has(submission.patientKey) && threadKeys.has(submission.threadKey)
      )
    ).toBe(true);
    expect(
      fixture.gapOutreachAttempts.every(
        (attempt) => patientKeys.has(attempt.patientKey) && attempt.status === 'sent'
      )
    ).toBe(true);
    expect(
      fixture.recipients.every(
        (recipient) =>
          patientKeys.has(recipient.patientKey) &&
          campaignKeys.has(recipient.campaignKey) &&
          (recipient.generatedAppointmentKey === null ||
            appointmentKeys.has(recipient.generatedAppointmentKey))
      )
    ).toBe(true);
  });
});
