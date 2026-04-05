import type { Job } from 'bullmq';
import type { ClinicGapOutreachPayload } from '@agentmou/queue';

import { processClinicGapOutreach } from '../clinic-runtime/clinic-runtime.js';

export async function processClinicGapOutreachJob(job: Job<ClinicGapOutreachPayload>) {
  await processClinicGapOutreach(job.data);
}
