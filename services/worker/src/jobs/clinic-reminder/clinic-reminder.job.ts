import type { Job } from 'bullmq';
import type { ClinicReminderPayload } from '@agentmou/queue';

import { processClinicReminder } from '../clinic-runtime/clinic-runtime.js';

export async function processClinicReminderJob(job: Job<ClinicReminderPayload>) {
  await processClinicReminder(job.data);
}
