import {
  appointments,
  appointmentEvents,
  auditEvents,
  callSessions,
  clinicChannels,
  confirmationRequests,
  conversationMessages,
  conversationThreads,
  db,
  gapOpportunities,
  gapOutreachAttempts,
  intakeFormSubmissions,
  patients,
  patientIdentities,
  reactivationCampaigns,
  reactivationRecipients,
  reminderJobs,
  webhookEvents,
} from '@agentmou/db';
import {
  getQueue,
  QUEUE_NAMES,
  getClinicSendMessageJobId,
  type ClinicChannelEventPayload,
  type ClinicFormFollowUpPayload,
  type ClinicGapOutreachPayload,
  type ClinicReactivationCampaignPayload,
  type ClinicReminderPayload,
  type ClinicSendMessagePayload,
  type ClinicVoiceCallbackPayload,
} from '@agentmou/queue';
import { normalizePhoneAddress, resolveClinicChannelAdapter } from '@agentmou/connectors';
import { and, desc, eq, inArray, notInArray } from 'drizzle-orm';

type ChannelType = 'whatsapp' | 'voice';
type NormalizedClinicWebhookEvent = {
  provider: string;
  channelType: ChannelType;
  eventKind: 'message_inbound' | 'message_status' | 'call_inbound' | 'call_status' | 'call_ai_completed';
  eventId: string;
  occurredAt?: string;
  phoneNumber?: string;
  from?: string;
  to?: string;
  body?: string;
  providerMessageId?: string;
  providerCallId?: string;
  providerStatus?: string;
  profileName?: string;
  payload: Record<string, unknown>;
};

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? { ...(value as Record<string, unknown>) }
    : {};
}

function normalizePublicBaseUrl(
  value: string | undefined,
  fallback: string,
  envName: string,
  isProduction: boolean
) {
  const normalized = value?.trim();
  if (normalized) {
    try {
      const url = new URL(normalized);
      const normalizedPathname = url.pathname.replace(/\/+$/, '');
      return `${url.origin}${normalizedPathname === '/' ? '' : normalizedPathname}`;
    } catch {
      throw new Error(`${envName} must be a valid absolute URL`);
    }
  }

  if (isProduction) {
    throw new Error(`${envName} must be set in production`);
  }

  return fallback;
}

function getApiPublicBaseUrl() {
  return normalizePublicBaseUrl(
    process.env.API_PUBLIC_BASE_URL,
    'http://localhost:3001',
    'API_PUBLIC_BASE_URL',
    process.env.NODE_ENV === 'production'
  );
}

function getStatusCallbackUrl(channelType: ChannelType) {
  const baseUrl = getApiPublicBaseUrl();
  if (!baseUrl) {
    return undefined;
  }

  return `${baseUrl}/api/v1/webhooks/twilio/${channelType}`;
}

function mapChannel(row: typeof clinicChannels.$inferSelect) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    channelType: row.channelType as ChannelType,
    directionPolicy: toRecord(row.directionPolicy),
    provider: row.provider,
    connectorAccountId: row.connectorAccountId ?? null,
    status: row.status as 'active' | 'inactive' | 'error',
    phoneNumber: row.phoneNumber ?? null,
    config: toRecord(row.config),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function parseNormalizedWebhookEvent(value: unknown): NormalizedClinicWebhookEvent {
  const record = toRecord(value);

  if (
    typeof record.provider !== 'string' ||
    (record.channelType !== 'whatsapp' && record.channelType !== 'voice') ||
    !['message_inbound', 'message_status', 'call_inbound', 'call_status'].includes(
      String(record.eventKind)
    ) ||
    typeof record.eventId !== 'string'
  ) {
    throw new Error('Invalid normalized clinic webhook event payload');
  }

  return {
    provider: record.provider,
    channelType: record.channelType as ChannelType,
    eventKind: record.eventKind as NormalizedClinicWebhookEvent['eventKind'],
    eventId: record.eventId,
    occurredAt: typeof record.occurredAt === 'string' ? record.occurredAt : undefined,
    phoneNumber: typeof record.phoneNumber === 'string' ? record.phoneNumber : undefined,
    from: typeof record.from === 'string' ? record.from : undefined,
    to: typeof record.to === 'string' ? record.to : undefined,
    body: typeof record.body === 'string' ? record.body : undefined,
    providerMessageId:
      typeof record.providerMessageId === 'string' ? record.providerMessageId : undefined,
    providerCallId: typeof record.providerCallId === 'string' ? record.providerCallId : undefined,
    providerStatus: typeof record.providerStatus === 'string' ? record.providerStatus : undefined,
    profileName: typeof record.profileName === 'string' ? record.profileName : undefined,
    payload: toRecord(record.payload),
  };
}

async function recordWorkerAuditEvent(input: {
  tenantId: string;
  action: string;
  category: string;
  details?: Record<string, unknown>;
}) {
  await db.insert(auditEvents).values({
    tenantId: input.tenantId,
    action: input.action,
    category: input.category,
    details: input.details ?? {},
  });
}

async function getActiveChannel(tenantId: string, channelType: ChannelType) {
  const rows = await db
    .select()
    .from(clinicChannels)
    .where(and(eq(clinicChannels.tenantId, tenantId), eq(clinicChannels.channelType, channelType)))
    .orderBy(desc(clinicChannels.updatedAt));

  return rows.find((row) => row.status === 'active') ?? rows[0] ?? null;
}

async function markThreadForHumanReview(
  tenantId: string,
  threadId?: string | null,
  detail?: string
) {
  if (!threadId) {
    return;
  }

  await db
    .update(conversationThreads)
    .set({
      status: 'pending_human',
      requiresHumanReview: true,
      resolution: detail ?? 'automation_failed',
      updatedAt: new Date(),
    })
    .where(and(eq(conversationThreads.tenantId, tenantId), eq(conversationThreads.id, threadId)));
}

async function getOrCreateThread(params: {
  tenantId: string;
  patientId: string;
  channelType: ChannelType;
  source: string;
  requiresHumanReview?: boolean;
}) {
  const [existing] = await db
    .select()
    .from(conversationThreads)
    .where(
      and(
        eq(conversationThreads.tenantId, params.tenantId),
        eq(conversationThreads.patientId, params.patientId),
        eq(conversationThreads.channelType, params.channelType),
        notInArray(conversationThreads.status, ['resolved', 'closed'])
      )
    )
    .orderBy(desc(conversationThreads.updatedAt))
    .limit(1);

  if (existing) {
    return existing;
  }

  const now = new Date();
  const [created] = await db
    .insert(conversationThreads)
    .values({
      tenantId: params.tenantId,
      patientId: params.patientId,
      channelType: params.channelType,
      status: params.requiresHumanReview ? 'pending_human' : 'new',
      intent: 'general_inquiry',
      priority: 'normal',
      source: params.source,
      requiresHumanReview: params.requiresHumanReview ?? false,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return created;
}

async function getPatientByPhone(tenantId: string, phone: string) {
  const normalized = normalizePhoneAddress(phone);
  if (!normalized) {
    return null;
  }

  const [identity] = await db
    .select()
    .from(patientIdentities)
    .where(
      and(
        eq(patientIdentities.tenantId, tenantId),
        eq(patientIdentities.identityType, 'phone'),
        eq(patientIdentities.identityValue, normalized)
      )
    )
    .limit(1);

  if (identity) {
    const [patient] = await db
      .select()
      .from(patients)
      .where(and(eq(patients.tenantId, tenantId), eq(patients.id, identity.patientId)))
      .limit(1);
    return patient ?? null;
  }

  const [patient] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.tenantId, tenantId), eq(patients.phone, normalized)))
    .limit(1);

  return patient ?? null;
}

async function findOrCreatePatientFromInbound(params: {
  tenantId: string;
  phone?: string | null;
  profileName?: string;
  source: string;
}) {
  const normalizedPhone = normalizePhoneAddress(params.phone ?? undefined);
  if (!normalizedPhone) {
    return null;
  }

  const existing = await getPatientByPhone(params.tenantId, normalizedPhone);
  if (existing) {
    await db
      .update(patients)
      .set({
        lastInteractionAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(patients.tenantId, params.tenantId), eq(patients.id, existing.id)));

    return existing;
  }

  const [firstName, ...rest] = (params.profileName ?? 'Paciente Nuevo').split(' ');
  const lastName = rest.join(' ') || 'Inbound';

  const [created] = await db
    .insert(patients)
    .values({
      tenantId: params.tenantId,
      status: 'new_lead',
      isExisting: false,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      phone: normalizedPhone,
      source: params.source,
      lastInteractionAt: new Date(),
    })
    .returning();

  await db.insert(patientIdentities).values({
    tenantId: params.tenantId,
    patientId: created.id,
    identityType: 'phone',
    identityValue: normalizedPhone,
    isPrimary: true,
    confidenceScore: 1,
  });

  return created;
}

function mapDeliveryStatus(providerStatus: string | undefined) {
  const normalized = providerStatus?.toLowerCase();
  if (!normalized) {
    return 'sent' as const;
  }

  if (normalized.includes('deliver')) {
    return 'delivered' as const;
  }

  if (normalized.includes('read')) {
    return 'read' as const;
  }

  if (
    normalized.includes('fail') ||
    normalized.includes('undeliver') ||
    normalized.includes('error')
  ) {
    return 'failed' as const;
  }

  if (normalized.includes('receive')) {
    return 'received' as const;
  }

  return 'sent' as const;
}

async function syncAutomationForMessageDispatch(
  message: typeof conversationMessages.$inferSelect,
  ok: boolean,
  detail?: string
) {
  const payload = toRecord(message.payload);
  const reminderId = typeof payload.reminderId === 'string' ? payload.reminderId : null;
  const attemptId = typeof payload.attemptId === 'string' ? payload.attemptId : null;
  const recipientId = typeof payload.recipientId === 'string' ? payload.recipientId : null;

  if (reminderId) {
    await db
      .update(reminderJobs)
      .set({
        status: ok ? 'sent' : 'failed',
        sentAt: ok ? new Date() : null,
        lastError: ok ? null : (detail ?? 'delivery_failed'),
        attemptCount: ok ? 1 : 1,
        updatedAt: new Date(),
      })
      .where(and(eq(reminderJobs.tenantId, message.tenantId), eq(reminderJobs.id, reminderId)));

    const status = ok ? 'sent' : 'failed';
    if (payload.appointmentId && typeof payload.appointmentId === 'string') {
      await db
        .update(appointments)
        .set({
          reminderStatus: status,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(appointments.tenantId, message.tenantId),
            eq(appointments.id, payload.appointmentId)
          )
        );
    }
  }

  if (attemptId) {
    await db
      .update(gapOutreachAttempts)
      .set({
        status: ok ? 'sent' : 'failed',
        sentAt: ok ? new Date() : null,
        result: ok ? 'gap_offer_sent' : (detail ?? 'delivery_failed'),
      })
      .where(
        and(
          eq(gapOutreachAttempts.tenantId, message.tenantId),
          eq(gapOutreachAttempts.id, attemptId)
        )
      );
  }

  if (recipientId) {
    await db
      .update(reactivationRecipients)
      .set({
        status: ok ? 'contacted' : 'failed',
        lastContactAt: ok ? new Date() : null,
        result: ok ? 'message_sent' : (detail ?? 'delivery_failed'),
      })
      .where(
        and(
          eq(reactivationRecipients.tenantId, message.tenantId),
          eq(reactivationRecipients.id, recipientId)
        )
      );
  }
}

export async function dispatchClinicMessage(payload: ClinicSendMessagePayload) {
  const [message] = await db
    .select()
    .from(conversationMessages)
    .where(
      and(
        eq(conversationMessages.tenantId, payload.tenantId),
        eq(conversationMessages.id, payload.messageId)
      )
    )
    .limit(1);

  if (!message || !['queued', 'failed'].includes(message.deliveryStatus)) {
    return;
  }

  const [thread] = await db
    .select()
    .from(conversationThreads)
    .where(
      and(
        eq(conversationThreads.tenantId, payload.tenantId),
        eq(conversationThreads.id, message.threadId)
      )
    )
    .limit(1);

  const patientId = message.patientId ?? thread?.patientId ?? null;
  const [patient] = patientId
    ? await db
        .select()
        .from(patients)
        .where(and(eq(patients.tenantId, payload.tenantId), eq(patients.id, patientId)))
        .limit(1)
    : [null];

  const channel = await getActiveChannel(payload.tenantId, message.channelType as ChannelType);
  if (!channel || channel.status !== 'active' || !patient?.phone) {
    const detail = !channel
      ? 'channel_missing'
      : patient?.phone
        ? 'channel_inactive'
        : 'patient_missing_phone';
    await db
      .update(conversationMessages)
      .set({
        deliveryStatus: 'failed',
        payload: {
          ...toRecord(message.payload),
          lastError: detail,
        },
      })
      .where(eq(conversationMessages.id, message.id));
    await syncAutomationForMessageDispatch(message, false, detail);
    await markThreadForHumanReview(payload.tenantId, thread?.id, detail);
    return;
  }

  const adapter = resolveClinicChannelAdapter(mapChannel(channel), {
    allowMockFallback: process.env.NODE_ENV !== 'production',
  });

  if (!adapter.sendMessage) {
    await db
      .update(conversationMessages)
      .set({
        deliveryStatus: 'failed',
        payload: {
          ...toRecord(message.payload),
          lastError: 'provider_send_not_supported',
        },
      })
      .where(eq(conversationMessages.id, message.id));
    await syncAutomationForMessageDispatch(message, false, 'provider_send_not_supported');
    await markThreadForHumanReview(payload.tenantId, thread?.id, 'provider_send_not_supported');
    return;
  }

  const result = await adapter.sendMessage({
    to: patient.phone,
    body: message.body,
    statusCallbackUrl: getStatusCallbackUrl(message.channelType as ChannelType),
    metadata: toRecord(message.payload),
  });

  const now = new Date();
  const ok = result.status !== 'failed';
  await db
    .update(conversationMessages)
    .set({
      deliveryStatus: ok ? 'sent' : 'failed',
      providerMessageId: result.providerMessageId ?? message.providerMessageId,
      sentAt: ok ? now : message.sentAt,
      payload: {
        ...toRecord(message.payload),
        providerResult: result.payload,
        lastError: ok ? null : (result.detail ?? result.failureReason ?? 'delivery_failed'),
      },
    })
    .where(eq(conversationMessages.id, message.id));

  if (thread) {
    await db
      .update(conversationThreads)
      .set({
        status: ok ? 'in_progress' : 'pending_human',
        requiresHumanReview: ok ? false : true,
        lastMessageAt: now,
        lastOutboundAt: ok ? now : thread.lastOutboundAt,
        updatedAt: now,
      })
      .where(eq(conversationThreads.id, thread.id));
  }

  await syncAutomationForMessageDispatch(message, ok, result.detail ?? result.failureReason);

  if (!ok) {
    await markThreadForHumanReview(
      payload.tenantId,
      thread?.id,
      result.detail ?? result.failureReason
    );
  }

  await recordWorkerAuditEvent({
    tenantId: payload.tenantId,
    action: ok ? 'clinic.message.delivered' : 'clinic.message.delivery_failed',
    category: 'connector',
    details: {
      messageId: message.id,
      provider: channel.provider,
      providerMessageId: result.providerMessageId,
      detail: result.detail,
    },
  });
}

function renderAutomationMessageBody(input: {
  kind: 'form_submission' | 'confirmation_reminder' | 'gap_outreach' | 'reactivation_campaign';
  templateKey?: string | null;
  patientName?: string | null;
  appointmentStartsAt?: Date | null;
  gapStartsAt?: Date | null;
  campaignName?: string | null;
}) {
  if (input.templateKey) {
    return input.templateKey;
  }

  if (input.kind === 'form_submission') {
    return `Hola${input.patientName ? ` ${input.patientName}` : ''}, por favor completa tu formulario antes de la cita.`;
  }

  if (input.kind === 'confirmation_reminder') {
    return `Te recordamos tu cita${input.appointmentStartsAt ? ` del ${input.appointmentStartsAt.toISOString()}` : ''}. Responde SI para confirmar.`;
  }

  if (input.kind === 'gap_outreach') {
    return `Se ha liberado un hueco${input.gapStartsAt ? ` para ${input.gapStartsAt.toISOString()}` : ''}. Responde SI si te interesa.`;
  }

  return `Hola${input.patientName ? ` ${input.patientName}` : ''}, ${input.campaignName ?? 'tenemos una oportunidad de reservar tu proxima cita'}.`;
}

async function enqueueMessageJob(
  tenantId: string,
  messageId: string,
  automationKind: ClinicSendMessagePayload['automationKind']
) {
  const queue = getQueue(QUEUE_NAMES.CLINIC_SEND_MESSAGE);
  await queue.add(
    'clinic-send-message',
    {
      tenantId,
      messageId,
      automationKind,
    } satisfies ClinicSendMessagePayload,
    {
      jobId: getClinicSendMessageJobId(messageId),
    }
  );
}

export async function processClinicReminder(payload: ClinicReminderPayload) {
  const [reminder] = await db
    .select()
    .from(reminderJobs)
    .where(
      and(eq(reminderJobs.tenantId, payload.tenantId), eq(reminderJobs.id, payload.reminderId))
    )
    .limit(1);

  if (!reminder || !['pending', 'scheduled'].includes(reminder.status)) {
    return;
  }

  const [appointment] = await db
    .select()
    .from(appointments)
    .where(
      and(eq(appointments.tenantId, payload.tenantId), eq(appointments.id, reminder.appointmentId))
    )
    .limit(1);

  if (!appointment || ['cancelled', 'completed', 'no_show'].includes(appointment.status)) {
    await db
      .update(reminderJobs)
      .set({
        status: 'completed',
        lastError: 'appointment_inactive',
        updatedAt: new Date(),
      })
      .where(eq(reminderJobs.id, payload.reminderId));
    return;
  }

  const [patient] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.tenantId, payload.tenantId), eq(patients.id, appointment.patientId)))
    .limit(1);

  if (!patient) {
    return;
  }

  const thread = appointment.threadId
    ? (
        await db
          .select()
          .from(conversationThreads)
          .where(
            and(
              eq(conversationThreads.tenantId, payload.tenantId),
              eq(conversationThreads.id, appointment.threadId)
            )
          )
          .limit(1)
      )[0]
    : await getOrCreateThread({
        tenantId: payload.tenantId,
        patientId: patient.id,
        channelType: reminder.channelType as ChannelType,
        source: 'confirmation_reminder',
      });

  const [message] = await db
    .insert(conversationMessages)
    .values({
      tenantId: payload.tenantId,
      threadId: thread.id,
      patientId: patient.id,
      direction: 'outbound',
      channelType: reminder.channelType,
      messageType: 'template',
      body: renderAutomationMessageBody({
        kind: 'confirmation_reminder',
        templateKey: reminder.templateKey,
        patientName: patient.firstName,
        appointmentStartsAt: appointment.startsAt,
      }),
      payload: {
        automationKind: 'confirmation_reminder',
        reminderId: reminder.id,
        appointmentId: appointment.id,
      },
      deliveryStatus: 'queued',
    })
    .returning();

  await enqueueMessageJob(payload.tenantId, message.id, 'confirmation_reminder');
}

export async function processClinicFormFollowUp(payload: ClinicFormFollowUpPayload) {
  const [submission] = await db
    .select()
    .from(intakeFormSubmissions)
    .where(
      and(
        eq(intakeFormSubmissions.tenantId, payload.tenantId),
        eq(intakeFormSubmissions.id, payload.submissionId)
      )
    )
    .limit(1);

  if (!submission || ['completed', 'waived', 'expired'].includes(submission.status)) {
    return;
  }

  if (!submission.patientId) {
    return;
  }

  const [patient] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.tenantId, payload.tenantId), eq(patients.id, submission.patientId)))
    .limit(1);

  if (!patient) {
    return;
  }

  const thread = submission.threadId
    ? (
        await db
          .select()
          .from(conversationThreads)
          .where(
            and(
              eq(conversationThreads.tenantId, payload.tenantId),
              eq(conversationThreads.id, submission.threadId)
            )
          )
          .limit(1)
      )[0]
    : await getOrCreateThread({
        tenantId: payload.tenantId,
        patientId: patient.id,
        channelType: payload.channelType,
        source: 'intake_form_follow_up',
      });

  const [message] = await db
    .insert(conversationMessages)
    .values({
      tenantId: payload.tenantId,
      threadId: thread.id,
      patientId: patient.id,
      direction: 'outbound',
      channelType: payload.channelType,
      messageType: 'form_link',
      body: renderAutomationMessageBody({
        kind: 'form_submission',
        templateKey: payload.messageTemplateKey,
        patientName: patient.firstName,
      }),
      payload: {
        automationKind: 'form_submission',
        submissionId: submission.id,
      },
      deliveryStatus: 'queued',
    })
    .returning();

  await db
    .update(intakeFormSubmissions)
    .set({
      status: 'sent',
      sentAt: submission.sentAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(eq(intakeFormSubmissions.id, submission.id));

  await db
    .update(conversationThreads)
    .set({
      status: 'pending_form',
      lastMessageAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(conversationThreads.id, thread.id));

  await enqueueMessageJob(payload.tenantId, message.id, 'form_submission');
}

export async function processClinicGapOutreach(payload: ClinicGapOutreachPayload) {
  const [attempt] = await db
    .select()
    .from(gapOutreachAttempts)
    .where(
      and(
        eq(gapOutreachAttempts.tenantId, payload.tenantId),
        eq(gapOutreachAttempts.id, payload.attemptId)
      )
    )
    .limit(1);

  if (!attempt || !['pending', 'failed'].includes(attempt.status)) {
    return;
  }

  const [gap] = await db
    .select()
    .from(gapOpportunities)
    .where(
      and(
        eq(gapOpportunities.tenantId, payload.tenantId),
        eq(gapOpportunities.id, attempt.gapOpportunityId)
      )
    )
    .limit(1);
  const [patient] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.tenantId, payload.tenantId), eq(patients.id, attempt.patientId)))
    .limit(1);

  if (!gap || !patient || !['open', 'offered'].includes(gap.status)) {
    await db
      .update(gapOutreachAttempts)
      .set({
        status: 'failed',
        result: 'gap_inactive',
      })
      .where(eq(gapOutreachAttempts.id, payload.attemptId));
    return;
  }

  const thread = await getOrCreateThread({
    tenantId: payload.tenantId,
    patientId: patient.id,
    channelType: attempt.channelType as ChannelType,
    source: 'gap_outreach',
  });

  const [message] = await db
    .insert(conversationMessages)
    .values({
      tenantId: payload.tenantId,
      threadId: thread.id,
      patientId: patient.id,
      direction: 'outbound',
      channelType: attempt.channelType,
      messageType: 'template',
      body: renderAutomationMessageBody({
        kind: 'gap_outreach',
        templateKey: attempt.result,
        patientName: patient.firstName,
        gapStartsAt: gap.startsAt,
      }),
      payload: {
        automationKind: 'gap_outreach',
        attemptId: attempt.id,
        gapId: gap.id,
      },
      deliveryStatus: 'queued',
    })
    .returning();

  await db
    .update(gapOpportunities)
    .set({
      status: 'offered',
      updatedAt: new Date(),
    })
    .where(eq(gapOpportunities.id, gap.id));

  await enqueueMessageJob(payload.tenantId, message.id, 'gap_outreach');
}

async function materializeCampaignRecipients(tenantId: string, campaignId: string) {
  const [campaign] = await db
    .select()
    .from(reactivationCampaigns)
    .where(
      and(eq(reactivationCampaigns.tenantId, tenantId), eq(reactivationCampaigns.id, campaignId))
    )
    .limit(1);

  if (!campaign) {
    return [];
  }

  const audience = toRecord(campaign.audienceDefinition);
  const allPatients = await db.select().from(patients).where(eq(patients.tenantId, tenantId));
  const statuses = Array.isArray(audience.statuses)
    ? audience.statuses.filter((value): value is string => typeof value === 'string')
    : ['inactive'];
  const isExisting = typeof audience.isExisting === 'boolean' ? audience.isExisting : undefined;
  const limit = typeof audience.limit === 'number' ? audience.limit : undefined;
  const explicitPatientIds = Array.isArray(audience.patientIds)
    ? audience.patientIds.filter((value): value is string => typeof value === 'string')
    : [];

  const existingRecipients = await db
    .select()
    .from(reactivationRecipients)
    .where(
      and(
        eq(reactivationRecipients.tenantId, tenantId),
        eq(reactivationRecipients.campaignId, campaignId)
      )
    );
  const existingPatientIds = new Set(existingRecipients.map((recipient) => recipient.patientId));

  const selected = (
    explicitPatientIds.length > 0
      ? allPatients.filter((patient) => explicitPatientIds.includes(patient.id))
      : allPatients.filter((patient) => {
          if (!statuses.includes(patient.status)) {
            return false;
          }
          if (typeof isExisting === 'boolean' && patient.isExisting !== isExisting) {
            return false;
          }
          return true;
        })
  ).filter((patient) => !existingPatientIds.has(patient.id));

  const limited = typeof limit === 'number' ? selected.slice(0, limit) : selected;
  if (limited.length === 0) {
    return existingRecipients;
  }

  await db.insert(reactivationRecipients).values(
    limited.map((patient) => ({
      tenantId,
      campaignId,
      patientId: patient.id,
      status: 'pending',
      metadata: {},
    }))
  );

  return db
    .select()
    .from(reactivationRecipients)
    .where(
      and(
        eq(reactivationRecipients.tenantId, tenantId),
        eq(reactivationRecipients.campaignId, campaignId)
      )
    );
}

export async function processClinicReactivationCampaign(
  payload: ClinicReactivationCampaignPayload
) {
  const [campaign] = await db
    .select()
    .from(reactivationCampaigns)
    .where(
      and(
        eq(reactivationCampaigns.tenantId, payload.tenantId),
        eq(reactivationCampaigns.id, payload.campaignId)
      )
    )
    .limit(1);

  if (!campaign || ['draft', 'paused', 'completed', 'failed'].includes(campaign.status)) {
    return;
  }

  if (!campaign.startedAt) {
    await db
      .update(reactivationCampaigns)
      .set({
        status: 'running',
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(reactivationCampaigns.id, campaign.id));
  }

  const recipients = payload.recipientId
    ? await db
        .select()
        .from(reactivationRecipients)
        .where(
          and(
            eq(reactivationRecipients.tenantId, payload.tenantId),
            eq(reactivationRecipients.id, payload.recipientId)
          )
        )
    : await materializeCampaignRecipients(payload.tenantId, payload.campaignId);

  const pendingRecipients = recipients.filter((recipient) =>
    ['pending', 'failed'].includes(recipient.status)
  );

  for (const recipient of pendingRecipients) {
    const [patient] = await db
      .select()
      .from(patients)
      .where(and(eq(patients.tenantId, payload.tenantId), eq(patients.id, recipient.patientId)))
      .limit(1);

    if (!patient) {
      continue;
    }

    const preferredChannel =
      typeof toRecord(campaign.channelPolicy).preferredChannel === 'string'
        ? (toRecord(campaign.channelPolicy).preferredChannel as ChannelType)
        : 'whatsapp';

    const thread = await getOrCreateThread({
      tenantId: payload.tenantId,
      patientId: patient.id,
      channelType: preferredChannel,
      source: 'reactivation_campaign',
    });

    const [message] = await db
      .insert(conversationMessages)
      .values({
        tenantId: payload.tenantId,
        threadId: thread.id,
        patientId: patient.id,
        direction: 'outbound',
        channelType: preferredChannel,
        messageType: 'template',
        body: renderAutomationMessageBody({
          kind: 'reactivation_campaign',
          templateKey:
            typeof toRecord(campaign.messageTemplate).body === 'string'
              ? String(toRecord(campaign.messageTemplate).body)
              : null,
          patientName: patient.firstName,
          campaignName: campaign.name,
        }),
        payload: {
          automationKind: 'reactivation_campaign',
          campaignId: campaign.id,
          recipientId: recipient.id,
        },
        deliveryStatus: 'queued',
      })
      .returning();

    await enqueueMessageJob(payload.tenantId, message.id, 'reactivation_campaign');
  }
}

export async function processClinicVoiceCallback(payload: ClinicVoiceCallbackPayload) {
  const [call] = await db
    .select()
    .from(callSessions)
    .where(and(eq(callSessions.tenantId, payload.tenantId), eq(callSessions.id, payload.callId)))
    .limit(1);

  if (!call || call.status === 'closed') {
    return;
  }

  const channel = await getActiveChannel(payload.tenantId, 'voice');
  if (!channel) {
    await markThreadForHumanReview(payload.tenantId, call.threadId, 'voice_channel_missing');
    return;
  }

  const adapter = resolveClinicChannelAdapter(mapChannel(channel), {
    allowMockFallback: process.env.NODE_ENV !== 'production',
  });

  if (!adapter.scheduleCallback) {
    await markThreadForHumanReview(payload.tenantId, call.threadId, 'voice_callback_not_supported');
    return;
  }

  const result = await adapter.scheduleCallback({
    to: call.fromNumber,
    note: call.resolution ?? 'Tenemos una devolucion de llamada pendiente.',
    statusCallbackUrl: getStatusCallbackUrl('voice'),
  });

  await db
    .update(callSessions)
    .set({
      status: result.status === 'failed' ? 'callback_required' : 'in_progress',
      providerCallId: result.providerCallId ?? call.providerCallId,
      requiresHumanReview: result.status === 'failed',
      updatedAt: new Date(),
    })
    .where(eq(callSessions.id, call.id));

  if (result.status === 'failed') {
    await markThreadForHumanReview(
      payload.tenantId,
      call.threadId,
      result.detail ?? 'voice_callback_failed'
    );
  }
}

async function updateAutomationFromInboundMessage(
  tenantId: string,
  patientId: string,
  body: string
) {
  const normalized = body.trim().toLowerCase();
  const isPositive = /\b(si|sí|confirm|ok|vale|yes)\b/i.test(normalized);
  const isNegative = /\b(no|cancel|decline|rechazo)\b/i.test(normalized);
  const isOptOut = /\b(stop|baja|unsubscribe|opt out)\b/i.test(normalized);
  const now = new Date();

  const pendingConfirmationRows = await db
    .select({
      confirmationId: confirmationRequests.id,
      appointmentId: appointments.id,
    })
    .from(confirmationRequests)
    .innerJoin(appointments, eq(appointments.id, confirmationRequests.appointmentId))
    .where(
      and(
        eq(confirmationRequests.tenantId, tenantId),
        eq(appointments.patientId, patientId),
        inArray(confirmationRequests.status, ['pending', 'escalated'])
      )
    )
    .orderBy(desc(confirmationRequests.createdAt))
    .limit(1);

  if (pendingConfirmationRows[0]) {
    if (isPositive || isNegative) {
      await db
        .update(confirmationRequests)
        .set({
          status: isPositive ? 'confirmed' : 'declined',
          respondedAt: now,
          responsePayload: {
            channel: 'whatsapp',
            body,
          },
          updatedAt: now,
        })
        .where(eq(confirmationRequests.id, pendingConfirmationRows[0].confirmationId));

      await db
        .update(appointments)
        .set({
          confirmationStatus: isPositive ? 'confirmed' : 'declined',
          status: isPositive ? 'confirmed' : undefined,
          updatedAt: now,
        })
        .where(eq(appointments.id, pendingConfirmationRows[0].appointmentId));

      await db.insert(appointmentEvents).values({
        tenantId,
        appointmentId: pendingConfirmationRows[0].appointmentId,
        eventType: isPositive ? 'confirmed_via_whatsapp' : 'declined_via_whatsapp',
        actorType: 'system',
        payload: {
          body,
        },
      });
    }
  }

  const [gapAttempt] = await db
    .select()
    .from(gapOutreachAttempts)
    .where(
      and(
        eq(gapOutreachAttempts.tenantId, tenantId),
        eq(gapOutreachAttempts.patientId, patientId),
        inArray(gapOutreachAttempts.status, ['pending', 'sent'])
      )
    )
    .orderBy(desc(gapOutreachAttempts.createdAt))
    .limit(1);

  if (gapAttempt && (isPositive || isNegative)) {
    await db
      .update(gapOutreachAttempts)
      .set({
        status: isPositive ? 'accepted' : 'declined',
        respondedAt: now,
        result: isPositive ? 'accepted' : 'declined',
      })
      .where(eq(gapOutreachAttempts.id, gapAttempt.id));

    await db
      .update(gapOpportunities)
      .set({
        status: isPositive ? 'claimed' : 'open',
        updatedAt: now,
      })
      .where(eq(gapOpportunities.id, gapAttempt.gapOpportunityId));
  }

  const [recipient] = await db
    .select()
    .from(reactivationRecipients)
    .where(
      and(
        eq(reactivationRecipients.tenantId, tenantId),
        eq(reactivationRecipients.patientId, patientId),
        inArray(reactivationRecipients.status, ['pending', 'contacted'])
      )
    )
    .orderBy(desc(reactivationRecipients.createdAt))
    .limit(1);

  if (recipient && (isOptOut || isPositive || isNegative)) {
    await db
      .update(reactivationRecipients)
      .set({
        status: isOptOut ? 'opted_out' : 'responded',
        lastResponseAt: now,
        result: body.slice(0, 200),
      })
      .where(eq(reactivationRecipients.id, recipient.id));
  }
}

async function tryAiReceptionistTurn(params: {
  tenantId: string;
  threadId: string;
  threadStatus: string;
  patientId: string;
  inboundBody: string;
  channelType: ChannelType;
}): Promise<boolean> {
  if (params.threadStatus === 'pending_human' || params.threadStatus === 'escalated') {
    return false;
  }

  try {
    const { runReceptionistTurn } = await import('../../ai/receptionist/orchestrator.js');

    const result = await runReceptionistTurn({
      tenantId: params.tenantId,
      threadId: params.threadId,
      patientId: params.patientId,
      inboundMessage: params.inboundBody,
      channelType: params.channelType,
    });

    if (result.handoff || !result.assistantText) {
      return false;
    }

    const [message] = await db
      .insert(conversationMessages)
      .values({
        tenantId: params.tenantId,
        threadId: params.threadId,
        patientId: params.patientId,
        direction: 'outbound',
        channelType: params.channelType,
        messageType: 'text',
        body: result.assistantText,
        payload: {
          aiGenerated: true,
          model: result.model,
          tokensUsed: result.tokensUsed,
          toolCalls: result.toolCalls.map((tc) => tc.name),
        },
        deliveryStatus: 'queued',
      })
      .returning({ id: conversationMessages.id });

    await enqueueMessageJob(params.tenantId, message.id, undefined);

    return true;
  } catch {
    return false;
  }
}

async function processInboundMessageEvent(
  tenantId: string,
  normalizedEvent: NormalizedClinicWebhookEvent
) {
  const patient = await findOrCreatePatientFromInbound({
    tenantId,
    phone: normalizedEvent.from,
    profileName: normalizedEvent.profileName,
    source: normalizedEvent.channelType === 'voice' ? 'voice_inbound' : 'whatsapp_inbound',
  });

  if (!patient) {
    return;
  }

  const thread = await getOrCreateThread({
    tenantId,
    patientId: patient.id,
    channelType: normalizedEvent.channelType,
    source: normalizedEvent.channelType === 'voice' ? 'voice_inbound' : 'whatsapp_inbound',
  });

  const [existingMessage] = normalizedEvent.providerMessageId
    ? await db
        .select()
        .from(conversationMessages)
        .where(
          and(
            eq(conversationMessages.tenantId, tenantId),
            eq(conversationMessages.providerMessageId, normalizedEvent.providerMessageId)
          )
        )
        .limit(1)
    : [null];

  if (!existingMessage) {
    await db.insert(conversationMessages).values({
      tenantId,
      threadId: thread.id,
      patientId: patient.id,
      direction: 'inbound',
      channelType: normalizedEvent.channelType,
      messageType: 'text',
      body: normalizedEvent.body ?? '',
      payload: normalizedEvent.payload,
      deliveryStatus: 'received',
      providerMessageId: normalizedEvent.providerMessageId ?? null,
      receivedAt: new Date(),
    });
  }

  const now = new Date();
  await db
    .update(conversationThreads)
    .set({
      status:
        thread.status === 'pending_human' || thread.status === 'escalated'
          ? thread.status
          : 'in_progress',
      lastMessageAt: now,
      lastInboundAt: now,
      updatedAt: now,
    })
    .where(eq(conversationThreads.id, thread.id));

  const aiHandled = await tryAiReceptionistTurn({
    tenantId,
    threadId: thread.id,
    threadStatus: thread.status,
    patientId: patient.id,
    inboundBody: normalizedEvent.body ?? '',
    channelType: normalizedEvent.channelType,
  });

  if (!aiHandled) {
    await updateAutomationFromInboundMessage(tenantId, patient.id, normalizedEvent.body ?? '');
  }
}

async function processMessageStatusEvent(
  tenantId: string,
  normalizedEvent: NormalizedClinicWebhookEvent
) {
  if (!normalizedEvent.providerMessageId) {
    return;
  }

  const [message] = await db
    .select()
    .from(conversationMessages)
    .where(
      and(
        eq(conversationMessages.tenantId, tenantId),
        eq(conversationMessages.providerMessageId, normalizedEvent.providerMessageId)
      )
    )
    .limit(1);

  if (!message) {
    return;
  }

  await db
    .update(conversationMessages)
    .set({
      deliveryStatus: mapDeliveryStatus(normalizedEvent.providerStatus),
      payload: {
        ...toRecord(message.payload),
        providerStatus: normalizedEvent.providerStatus,
        statusPayload: normalizedEvent.payload,
      },
    })
    .where(eq(conversationMessages.id, message.id));
}

function mapCallStatus(providerStatus?: string) {
  const normalized = providerStatus?.toLowerCase();
  if (!normalized) {
    return 'received';
  }

  if (normalized.includes('complete')) {
    return 'handled_by_ai';
  }

  if (normalized.includes('in-progress') || normalized.includes('ringing')) {
    return 'in_progress';
  }

  if (
    normalized.includes('busy') ||
    normalized.includes('failed') ||
    normalized.includes('no-answer')
  ) {
    return 'unresolved';
  }

  return 'received';
}

async function processCallEvent(tenantId: string, normalizedEvent: NormalizedClinicWebhookEvent) {
  const patient = await findOrCreatePatientFromInbound({
    tenantId,
    phone: normalizedEvent.from,
    profileName: normalizedEvent.profileName,
    source: 'voice_inbound',
  });

  const thread = patient
    ? await getOrCreateThread({
        tenantId,
        patientId: patient.id,
        channelType: 'voice',
        source: 'voice_inbound',
      })
    : null;

  const [existing] = normalizedEvent.providerCallId
    ? await db
        .select()
        .from(callSessions)
        .where(
          and(
            eq(callSessions.tenantId, tenantId),
            eq(callSessions.providerCallId, normalizedEvent.providerCallId)
          )
        )
        .limit(1)
    : [null];

  const now = new Date();
  const status = mapCallStatus(normalizedEvent.providerStatus);
  const transcript =
    typeof normalizedEvent.payload.TranscriptionText === 'string'
      ? String(normalizedEvent.payload.TranscriptionText)
      : (normalizedEvent.body ?? null);

  if (existing) {
    await db
      .update(callSessions)
      .set({
        patientId: patient?.id ?? existing.patientId,
        threadId: thread?.id ?? existing.threadId,
        status,
        endedAt: status === 'handled_by_ai' ? now : existing.endedAt,
        durationSeconds:
          typeof normalizedEvent.payload.CallDuration === 'string'
            ? Number(normalizedEvent.payload.CallDuration)
            : existing.durationSeconds,
        transcript: transcript ?? existing.transcript,
        summary: transcript ? transcript.slice(0, 200) : existing.summary,
        requiresHumanReview: status === 'unresolved',
        updatedAt: now,
      })
      .where(eq(callSessions.id, existing.id));
  } else {
    await db.insert(callSessions).values({
      tenantId,
      patientId: patient?.id ?? null,
      threadId: thread?.id ?? null,
      direction: 'inbound',
      status,
      providerCallId: normalizedEvent.providerCallId ?? null,
      fromNumber: normalizePhoneAddress(normalizedEvent.from) ?? 'unknown',
      toNumber: normalizePhoneAddress(normalizedEvent.to) ?? 'unknown',
      startedAt: now,
      endedAt: status === 'handled_by_ai' ? now : null,
      durationSeconds:
        typeof normalizedEvent.payload.CallDuration === 'string'
          ? Number(normalizedEvent.payload.CallDuration)
          : 0,
      transcript,
      summary: transcript ? transcript.slice(0, 200) : null,
      requiresHumanReview: status === 'unresolved',
    });
  }

  if (thread) {
    await db
      .update(conversationThreads)
      .set({
        status: status === 'unresolved' ? 'pending_human' : 'in_progress',
        requiresHumanReview: status === 'unresolved',
        lastMessageAt: now,
        lastInboundAt: now,
        updatedAt: now,
      })
      .where(eq(conversationThreads.id, thread.id));
  }
}

export async function processClinicChannelEvent(payload: ClinicChannelEventPayload) {
  const [webhookEvent] = await db
    .select()
    .from(webhookEvents)
    .where(eq(webhookEvents.id, payload.webhookEventId))
    .limit(1);

  if (!webhookEvent || webhookEvent.status === 'processed') {
    return;
  }

  const payloadRecord = toRecord(webhookEvent.payload);
  const normalized = parseNormalizedWebhookEvent(
    'normalized' in payloadRecord ? payloadRecord.normalized : payloadRecord
  );
  const tenantId = webhookEvent.tenantId;

  if (!tenantId) {
    await db
      .update(webhookEvents)
      .set({
        status: 'ignored',
        processedAt: new Date(),
      })
      .where(eq(webhookEvents.id, webhookEvent.id));
    return;
  }

  if (normalized.eventKind === 'message_inbound') {
    await processInboundMessageEvent(tenantId, normalized);
  } else if (normalized.eventKind === 'message_status') {
    await processMessageStatusEvent(tenantId, normalized);
  } else {
    await processCallEvent(tenantId, normalized);
  }

  await db
    .update(webhookEvents)
    .set({
      status: 'processed',
      processedAt: new Date(),
    })
    .where(eq(webhookEvents.id, webhookEvent.id));
}
