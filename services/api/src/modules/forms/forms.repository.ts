import {
  conversationMessages,
  conversationThreads,
  db,
  intakeFormSubmissions,
  intakeFormTemplates,
} from '@agentmou/db';
import type {
  CompleteIntakeFormSubmissionBody,
  SendIntakeFormSubmissionBody,
  WaiveIntakeFormSubmissionBody,
} from '@agentmou/contracts';
import { and, desc, eq } from 'drizzle-orm';

type DatabaseClient = typeof db;

export class FormsRepository {
  constructor(private readonly database: DatabaseClient = db) {}

  async listTemplates(tenantId: string) {
    return this.database
      .select()
      .from(intakeFormTemplates)
      .where(eq(intakeFormTemplates.tenantId, tenantId))
      .orderBy(desc(intakeFormTemplates.updatedAt));
  }

  async listSubmissions(tenantId: string) {
    return this.database
      .select()
      .from(intakeFormSubmissions)
      .where(eq(intakeFormSubmissions.tenantId, tenantId))
      .orderBy(desc(intakeFormSubmissions.createdAt));
  }

  async getSubmission(tenantId: string, submissionId: string) {
    const [submission] = await this.database
      .select()
      .from(intakeFormSubmissions)
      .where(
        and(
          eq(intakeFormSubmissions.tenantId, tenantId),
          eq(intakeFormSubmissions.id, submissionId)
        )
      )
      .limit(1);

    return submission ?? null;
  }

  async sendSubmission(
    tenantId: string,
    submissionId: string,
    body: SendIntakeFormSubmissionBody
  ) {
    const now = new Date();
    const [submission] = await this.database
      .update(intakeFormSubmissions)
      .set({
        status: 'sent',
        sentAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(intakeFormSubmissions.tenantId, tenantId),
          eq(intakeFormSubmissions.id, submissionId)
        )
      )
      .returning();

    if (!submission) {
      return null;
    }

    if (submission.threadId) {
      await this.database.insert(conversationMessages).values({
        tenantId,
        threadId: submission.threadId,
        patientId: submission.patientId,
        direction: 'outbound',
        channelType: body.channelType,
        messageType: 'form_link',
        body: body.messageTemplateKey ?? 'Please complete your intake form.',
        payload: {},
        deliveryStatus: 'sent',
        sentAt: now,
      });

      await this.database
        .update(conversationThreads)
        .set({
          status: 'pending_form',
          lastMessageAt: now,
          lastOutboundAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(conversationThreads.tenantId, tenantId),
            eq(conversationThreads.id, submission.threadId)
          )
        );
    }

    return submission;
  }

  async completeSubmission(
    tenantId: string,
    submissionId: string,
    body: CompleteIntakeFormSubmissionBody
  ) {
    const completedAt = body.completedAt ? new Date(body.completedAt) : new Date();
    const [submission] = await this.database
      .update(intakeFormSubmissions)
      .set({
        status: 'completed',
        answers: body.answers ?? {},
        completedAt,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(intakeFormSubmissions.tenantId, tenantId),
          eq(intakeFormSubmissions.id, submissionId)
        )
      )
      .returning();

    if (!submission) {
      return null;
    }

    await this.clearPendingFormThread(tenantId, submission.threadId);
    return submission;
  }

  async waiveSubmission(tenantId: string, submissionId: string, body: WaiveIntakeFormSubmissionBody) {
    const [submission] = await this.database
      .update(intakeFormSubmissions)
      .set({
        status: 'waived',
        answers: {
          waivedReason: body.reason,
        },
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(intakeFormSubmissions.tenantId, tenantId),
          eq(intakeFormSubmissions.id, submissionId)
        )
      )
      .returning();

    if (!submission) {
      return null;
    }

    await this.clearPendingFormThread(tenantId, submission.threadId);
    return submission;
  }

  private async clearPendingFormThread(tenantId: string, threadId?: string | null) {
    if (!threadId) {
      return;
    }

    await this.database
      .update(conversationThreads)
      .set({
        status: 'in_progress',
        requiresHumanReview: false,
        updatedAt: new Date(),
      })
      .where(and(eq(conversationThreads.tenantId, tenantId), eq(conversationThreads.id, threadId)));
  }
}
