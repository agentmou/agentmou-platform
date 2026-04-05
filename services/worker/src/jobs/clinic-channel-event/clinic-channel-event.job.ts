import type { Job } from 'bullmq';
import type { ClinicChannelEventPayload } from '@agentmou/queue';

import { processClinicChannelEvent } from '../clinic-runtime/clinic-runtime.js';

export async function processClinicChannelEventJob(job: Job<ClinicChannelEventPayload>) {
  await processClinicChannelEvent(job.data);
}
