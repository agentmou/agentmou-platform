import {
  appointments,
  clinicProfiles,
  confirmationRequests,
  db,
  intakeFormSubmissions,
  reactivationCampaigns,
  reminderJobs,
  schedules,
} from '@agentmou/db';
import {
  getClinicChannelEventJobId,
  getClinicFormFollowUpJobId,
  getClinicGapOutreachJobId,
  getClinicReactivationCampaignJobId,
  getClinicReminderJobId,
  getClinicSendMessageJobId,
  getClinicVoiceCallbackJobId,
  getQueue,
  getScheduleTriggerJobId,
  QUEUE_NAMES,
  SCHEDULE_TRIGGER_JOB_NAME,
  type ClinicReactivationCampaignPayload,
} from '@agentmou/queue';
import type { ChannelType } from '@agentmou/contracts';
import { and, desc, eq } from 'drizzle-orm';

type TriggeredBy = ClinicReactivationCampaignPayload['triggeredBy'];

function toDate(value?: string | Date | null) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value : new Date(value);
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

export class ClinicAutomationService {
  async enqueueChannelEvent(webhookEventId: string) {
    const queue = getQueue(QUEUE_NAMES.CLINIC_CHANNEL_EVENT);
    await queue.add(
      'clinic-channel-event',
      { webhookEventId },
      {
        jobId: getClinicChannelEventJobId(webhookEventId),
      }
    );
  }

  async queueConversationReplyDelivery(tenantId: string, messageId: string) {
    const queue = getQueue(QUEUE_NAMES.CLINIC_SEND_MESSAGE);
    await queue.add(
      'clinic-send-message',
      {
        tenantId,
        messageId,
        automationKind: 'conversation_reply',
      },
      {
        jobId: getClinicSendMessageJobId(messageId),
      }
    );
  }

  async scheduleReminderExecution(tenantId: string, reminderId: string, scheduledFor: Date) {
    await this.replaceDelayedJob(
      QUEUE_NAMES.CLINIC_REMINDER,
      'clinic-reminder',
      getClinicReminderJobId(reminderId),
      {
        tenantId,
        reminderId,
      },
      scheduledFor
    );
  }

  async scheduleFormSubmissionFollowUp(
    tenantId: string,
    submissionId: string,
    params: {
      channelType: ChannelType;
      messageTemplateKey?: string;
      scheduledFor?: Date;
    }
  ) {
    const runAt = params.scheduledFor ?? new Date();

    await this.replaceDelayedJob(
      QUEUE_NAMES.CLINIC_FORM_FOLLOW_UP,
      'clinic-form-follow-up',
      getClinicFormFollowUpJobId(submissionId),
      {
        tenantId,
        submissionId,
        channelType: params.channelType,
        messageTemplateKey: params.messageTemplateKey,
      },
      runAt
    );
  }

  async scheduleGapOutreach(tenantId: string, attemptId: string, scheduledFor?: Date) {
    await this.replaceDelayedJob(
      QUEUE_NAMES.CLINIC_GAP_OUTREACH,
      'clinic-gap-outreach',
      getClinicGapOutreachJobId(attemptId),
      {
        tenantId,
        attemptId,
      },
      scheduledFor ?? new Date()
    );
  }

  async scheduleVoiceCallback(tenantId: string, callId: string, scheduledAt: Date) {
    await this.replaceDelayedJob(
      QUEUE_NAMES.CLINIC_VOICE_CALLBACK,
      'clinic-voice-callback',
      getClinicVoiceCallbackJobId(callId),
      {
        tenantId,
        callId,
        scheduledAt: scheduledAt.toISOString(),
      },
      scheduledAt
    );
  }

  async scheduleCampaignDispatch(
    tenantId: string,
    campaignId: string,
    params: {
      scheduledAt?: Date | null;
      recipientId?: string;
      triggeredBy: TriggeredBy;
    }
  ) {
    await this.replaceDelayedJob(
      QUEUE_NAMES.CLINIC_REACTIVATION_CAMPAIGN,
      'clinic-reactivation-campaign',
      getClinicReactivationCampaignJobId(campaignId, params.recipientId),
      {
        tenantId,
        campaignId,
        recipientId: params.recipientId,
        triggeredBy: params.triggeredBy,
      },
      params.scheduledAt ?? new Date()
    );
  }

  async syncCampaignRecurringSchedule(tenantId: string, campaignId: string) {
    const [campaign] = await db
      .select()
      .from(reactivationCampaigns)
      .where(
        and(eq(reactivationCampaigns.tenantId, tenantId), eq(reactivationCampaigns.id, campaignId))
      )
      .limit(1);

    if (!campaign) {
      return;
    }

    const channelPolicy = toRecord(campaign.channelPolicy);
    const recurringCron =
      typeof channelPolicy.recurringCron === 'string'
        ? channelPolicy.recurringCron
        : typeof channelPolicy.scheduleCron === 'string'
          ? channelPolicy.scheduleCron
          : null;

    const [existingSchedule] = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.tenantId, tenantId),
          eq(schedules.installationId, campaignId),
          eq(schedules.targetType, 'clinic_reactivation_campaign')
        )
      )
      .limit(1);

    if (!recurringCron) {
      if (existingSchedule) {
        await this.removeRepeatableSchedule(existingSchedule.id, existingSchedule.cron);
        await db.delete(schedules).where(eq(schedules.id, existingSchedule.id));
      }
      return;
    }

    const queue = getQueue(QUEUE_NAMES.SCHEDULE_TRIGGER);

    if (existingSchedule) {
      if (existingSchedule.cron !== recurringCron) {
        await this.removeRepeatableSchedule(existingSchedule.id, existingSchedule.cron);
      }

      await db
        .update(schedules)
        .set({
          cron: recurringCron,
          enabled: true,
        })
        .where(eq(schedules.id, existingSchedule.id));

      await queue.add(
        SCHEDULE_TRIGGER_JOB_NAME,
        {
          tenantId,
          scheduleId: existingSchedule.id,
          targetType: 'clinic_reactivation_campaign',
          installationId: campaignId,
        },
        {
          repeat: { pattern: recurringCron },
          jobId: getScheduleTriggerJobId(existingSchedule.id),
        }
      );

      return;
    }

    const [created] = await db
      .insert(schedules)
      .values({
        tenantId,
        installationId: campaignId,
        targetType: 'clinic_reactivation_campaign',
        cron: recurringCron,
        enabled: true,
      })
      .returning();

    await queue.add(
      SCHEDULE_TRIGGER_JOB_NAME,
      {
        tenantId,
        scheduleId: created.id,
        targetType: 'clinic_reactivation_campaign',
        installationId: campaignId,
      },
      {
        repeat: { pattern: recurringCron },
        jobId: getScheduleTriggerJobId(created.id),
      }
    );
  }

  async removeCampaignAutomation(tenantId: string, campaignId: string) {
    const queue = getQueue(QUEUE_NAMES.CLINIC_REACTIVATION_CAMPAIGN);
    const pending = await queue.getJobs(['delayed', 'waiting', 'prioritized', 'active']);

    await Promise.all(
      pending
        .filter((job) => {
          const data = job.data as { campaignId?: string; tenantId?: string };
          return data.campaignId === campaignId && data.tenantId === tenantId;
        })
        .map((job) => job.remove())
    );

    const [existingSchedule] = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.tenantId, tenantId),
          eq(schedules.installationId, campaignId),
          eq(schedules.targetType, 'clinic_reactivation_campaign')
        )
      )
      .limit(1);

    if (existingSchedule) {
      await this.removeRepeatableSchedule(existingSchedule.id, existingSchedule.cron);
      await db.delete(schedules).where(eq(schedules.id, existingSchedule.id));
    }
  }

  async cancelAppointmentAutomation(tenantId: string, appointmentId: string, reason: string) {
    const rows = await db
      .select()
      .from(reminderJobs)
      .where(and(eq(reminderJobs.tenantId, tenantId), eq(reminderJobs.appointmentId, appointmentId)))
      .orderBy(desc(reminderJobs.updatedAt));

    for (const reminder of rows) {
      await this.removeDelayedJob(QUEUE_NAMES.CLINIC_REMINDER, getClinicReminderJobId(reminder.id));
    }

    await db
      .update(reminderJobs)
      .set({
        status: 'completed',
        lastError: reason,
        updatedAt: new Date(),
      })
      .where(and(eq(reminderJobs.tenantId, tenantId), eq(reminderJobs.appointmentId, appointmentId)));

    await db
      .update(confirmationRequests)
      .set({
        status: 'expired',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(confirmationRequests.tenantId, tenantId),
          eq(confirmationRequests.appointmentId, appointmentId),
          eq(confirmationRequests.status, 'pending')
        )
      );
  }

  async syncAppointmentAutomation(tenantId: string, appointmentId: string) {
    const [appointment] = await db
      .select()
      .from(appointments)
      .where(and(eq(appointments.tenantId, tenantId), eq(appointments.id, appointmentId)))
      .limit(1);

    if (!appointment) {
      return;
    }

    if (
      ['cancelled', 'completed', 'no_show'].includes(appointment.status) ||
      appointment.confirmationStatus === 'confirmed'
    ) {
      await this.cancelAppointmentAutomation(
        tenantId,
        appointmentId,
        appointment.confirmationStatus === 'confirmed'
          ? 'appointment_confirmed'
          : 'appointment_inactive'
      );
      return;
    }

    const [profile] = await db
      .select()
      .from(clinicProfiles)
      .where(eq(clinicProfiles.tenantId, tenantId))
      .limit(1);

    const confirmationLeadHours =
      typeof toRecord(profile?.confirmationPolicy).leadHours === 'number'
        ? Number(toRecord(profile?.confirmationPolicy).leadHours)
        : 24;
    const confirmationEnabled = toRecord(profile?.confirmationPolicy).enabled !== false;

    if (!confirmationEnabled) {
      return;
    }

    const reminderChannel =
      typeof profile?.defaultInboundChannel === 'string' ? profile.defaultInboundChannel : 'whatsapp';
    const dueAt = appointment.startsAt;
    const scheduledFor = new Date(
      Math.max(dueAt.getTime() - confirmationLeadHours * 60 * 60 * 1000, Date.now())
    );

    const [existingConfirmation] = await db
      .select()
      .from(confirmationRequests)
      .where(
        and(
          eq(confirmationRequests.tenantId, tenantId),
          eq(confirmationRequests.appointmentId, appointmentId)
        )
      )
      .orderBy(desc(confirmationRequests.updatedAt))
      .limit(1);

    if (existingConfirmation) {
      await db
        .update(confirmationRequests)
        .set({
          channelType: reminderChannel,
          status: 'pending',
          dueAt,
          updatedAt: new Date(),
        })
        .where(eq(confirmationRequests.id, existingConfirmation.id));
    } else {
      await db.insert(confirmationRequests).values({
        tenantId,
        appointmentId,
        channelType: reminderChannel,
        status: 'pending',
        requestedAt: new Date(),
        dueAt,
      });
    }

    const [existingReminder] = await db
      .select()
      .from(reminderJobs)
      .where(and(eq(reminderJobs.tenantId, tenantId), eq(reminderJobs.appointmentId, appointmentId)))
      .orderBy(desc(reminderJobs.updatedAt))
      .limit(1);

    let reminderId = existingReminder?.id ?? null;

    if (existingReminder) {
      await db
        .update(reminderJobs)
        .set({
          channelType: reminderChannel,
          status: 'scheduled',
          scheduledFor,
          templateKey: existingReminder.templateKey || 'confirmation-reminder',
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(reminderJobs.id, existingReminder.id));
      reminderId = existingReminder.id;
    } else {
      const [reminder] = await db
        .insert(reminderJobs)
        .values({
          tenantId,
          appointmentId,
          channelType: reminderChannel,
          status: 'scheduled',
          scheduledFor,
          templateKey: 'confirmation-reminder',
          attemptCount: 0,
        })
        .returning();
      reminderId = reminder.id;
    }

    await db
      .update(appointments)
      .set({
        reminderStatus: 'scheduled',
        confirmationStatus: 'pending',
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointmentId));

    if (reminderId) {
      await this.scheduleReminderExecution(tenantId, reminderId, scheduledFor);
    }
  }

  private async replaceDelayedJob<TPayload>(
    queueName: string,
    jobName: string,
    jobId: string,
    payload: TPayload,
    runAt: Date
  ) {
    await this.removeDelayedJob(queueName, jobId);

    const queue = getQueue(queueName);
    const delay = Math.max(runAt.getTime() - Date.now(), 0);

    await queue.add(jobName, payload, {
      jobId,
      delay,
    });
  }

  private async removeDelayedJob(queueName: string, jobId: string) {
    const queue = getQueue(queueName);
    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }

  private async removeRepeatableSchedule(scheduleId: string, cron: string) {
    const queue = getQueue(QUEUE_NAMES.SCHEDULE_TRIGGER);
    await queue.removeRepeatable(
      SCHEDULE_TRIGGER_JOB_NAME,
      { pattern: cron },
      getScheduleTriggerJobId(scheduleId)
    );
  }
}
