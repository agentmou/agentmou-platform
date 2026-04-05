import type { Job } from 'bullmq';
import type { ClinicVoiceCallbackPayload } from '@agentmou/queue';

import { processClinicVoiceCallback } from '../clinic-runtime/clinic-runtime.js';

export async function processClinicVoiceCallbackJob(job: Job<ClinicVoiceCallbackPayload>) {
  await processClinicVoiceCallback(job.data);
}
