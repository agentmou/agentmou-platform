import type { Job } from 'bullmq';
import type { ClinicReactivationCampaignPayload } from '@agentmou/queue';

import { processClinicReactivationCampaign } from '../clinic-runtime/clinic-runtime.js';

export async function processClinicReactivationCampaignJob(
  job: Job<ClinicReactivationCampaignPayload>
) {
  await processClinicReactivationCampaign(job.data);
}
