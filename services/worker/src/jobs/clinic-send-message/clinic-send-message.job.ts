import type { Job } from 'bullmq';
import type { ClinicSendMessagePayload } from '@agentmou/queue';

import { dispatchClinicMessage } from '../clinic-runtime/clinic-runtime.js';

export async function processClinicSendMessage(job: Job<ClinicSendMessagePayload>) {
  await dispatchClinicMessage(job.data);
}
