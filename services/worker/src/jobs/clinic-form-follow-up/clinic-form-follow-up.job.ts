import type { Job } from 'bullmq';
import type { ClinicFormFollowUpPayload } from '@agentmou/queue';

import { processClinicFormFollowUp } from '../clinic-runtime/clinic-runtime.js';

export async function processClinicFormFollowUpJob(job: Job<ClinicFormFollowUpPayload>) {
  await processClinicFormFollowUp(job.data);
}
